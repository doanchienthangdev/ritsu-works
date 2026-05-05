# Bài #16 — Customer Data Architecture & Privacy (DRAFT)

**Status:** DRAFT — derived from G8 walkthrough, not yet brainstormed/decided
**Walkthrough:** `_build/notes/phase-a2/walkthroughs/G8-customer-data.md`
**Dependencies:** Bài #1, #2, #4, #7, #9 DRAFT, #10 DRAFT, #11 DRAFT, #12 DRAFT, #13 DRAFT, #14 DRAFT

## Why
~10 issues directly + GDPR/EU AI Act compliance scope (per founder facts).

Phase A defers customer data to per-pillar Phase B. Phase A.2 reveals defer = wrong:
- Customer entity = cross-cutting (8+ pillars touch)
- B2C/B2B separate schemas = drift, GDPR machinery duplicated
- PII scattered = encryption inconsistent, audit hard

Without Bài #16:
- GDPR deletion misses tables → €20M / 4% global revenue fine risk
- B2B onboarding blocked (no company entity)
- Consent untracked → can't answer "what did user consent to"
- Customer context-switching across 5 systems
- EU AI Act compliance unhandled

## Decisions (tentative)

### Axis 1 — Unified Entity Schema
**Choice:** Single customers table với segment discriminator + companion companies + persons tables
- customers = billing entity (B2C: 1 person; B2B: company với multiple persons)
- companies = optional B2B detail
- persons = humans (separate for PII isolation)
- company_persons = B2B relationships
- Knowledge graph (Bài #14) auto-extracts edges

### Axis 2 — Consent + Privacy Architecture
**Choice:** Per-purpose consent JSON + PII isolation + Tier 1 retention registry
- consent_status JSONB với legal_basis per purpose (GDPR Article 6)
- PII column encryption (pgcrypto) — phone, metadata
- Encryption key in Supabase Vault
- ops.audit_log every PII read
- knowledge/data-retention.yaml Tier 1 registry

### Axis 3 — GDPR Machinery
**Choice:** 3 SOPs (deletion/access/rectification) + automated scan skill
- SOP-COMPLIANCE-002-gdpr-deletion (SLA 30 days)
- SOP-COMPLIANCE-003-gdpr-access (Article 15)
- SOP-COMPLIANCE-004-gdpr-rectification (Article 16)
- customer-data-scan skill = deterministic → ops.minion_jobs (Minions pattern)
- Tier C HITL gate for deletion plan approval
- Anonymize vs hard-delete routing per category

### Axis 4 — Customer 360 + Integrations
**Choice:** Materialized view + dashboard page + MCP tool
- mv_customer_360 refreshed hourly
- /business/customers/360/<id> dashboard
- ritsu.customer.profile MCP tool (PII redaction per role)
- Cross-bài-toán updates (#7, #10, #11, #12, #13, #14, #15)

## Schema additions (Tier 2)

```sql
CREATE TABLE customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment         text NOT NULL,
  display_name    text NOT NULL,
  primary_email   text NOT NULL UNIQUE,
  tier            text NOT NULL,
  stripe_customer_id text UNIQUE,
  state           text NOT NULL,
  state_since     timestamptz NOT NULL DEFAULT now(),
  state_payload   jsonb,
  state_version   text NOT NULL DEFAULT '1.0.0',
  locale          text NOT NULL DEFAULT 'en',
  timezone        text,
  data_region     text NOT NULL,         -- 'eu' | 'us' | 'apac'
  consent_version text,
  consent_accepted_at timestamptz,
  deletion_requested_at timestamptz,
  deletion_completed_at timestamptz,
  is_anonymized   boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  CONSTRAINT customers_segment_valid CHECK (segment IN ('b2c', 'b2b', 'partner'))
);

CREATE TABLE companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid REFERENCES customers(id) ON DELETE CASCADE,
  legal_name      text NOT NULL,
  display_name    text NOT NULL,
  domain          text,
  size_category   text,
  industry        text,
  hq_country      text,
  metadata        jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE persons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_email   text NOT NULL UNIQUE,
  display_name    text NOT NULL,
  customer_id_as_billing uuid REFERENCES customers(id) ON DELETE CASCADE,
  phone           text,                  -- encrypted at rest
  metadata        jsonb,                  -- encrypted
  consent_status  jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE company_persons (
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  person_id       uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  role            text NOT NULL,
  is_primary_contact boolean DEFAULT false,
  added_at        timestamptz DEFAULT now(),
  PRIMARY KEY (company_id, person_id, role)
);

CREATE TABLE ops.audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id       text NOT NULL,
  action          text NOT NULL,         -- 'read_pii' | 'export' | 'delete' | etc.
  target_table    text NOT NULL,
  target_id       uuid,
  data_categories text[],
  legal_basis     text,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  context         jsonb
);

CREATE INDEX ON ops.audit_log (target_id, occurred_at DESC);
CREATE INDEX ON ops.audit_log (caller_id, occurred_at DESC);
```

## YAML schemas

```yaml
# knowledge/data-retention.yaml
categories:
  - id: <slug>
    description: <markdown>
    legal_basis: contract | consent | legitimate_interest | legal_obligation
    retention_active: <duration | indefinite>
    retention_post_termination: <duration>
    legal_hold_exception: <bool>
    deletion_method: hard_delete | anonymize

inventory:
  - location: <table-or-path>
    categories: [<category-ids>]
    retention_override: <optional duration>
```

## Customer 360 materialized view

```sql
CREATE MATERIALIZED VIEW mv_customer_360 AS
SELECT
  c.id, c.segment, c.display_name, c.primary_email, c.tier, c.state, c.state_since,
  c.locale, c.data_region, c.created_at,
  s.lifetime_value_usd, s.last_payment_at, s.churn_risk_score,
  COALESCE(usage.events_count, 0) AS events_last_30d,
  usage.last_login_at,
  COALESCE(support.open_tickets, 0) AS open_tickets,
  graph.related_companies, graph.related_campaigns, graph.referrals_count
FROM customers c
LEFT JOIN LATERAL (...) s ON true
LEFT JOIN LATERAL (...) usage ON true
LEFT JOIN LATERAL (...) support ON true
LEFT JOIN LATERAL (
  SELECT 
    array_agg(DISTINCT target_slug) FILTER (WHERE link_type = 'works_at') AS related_companies,
    count(*) FILTER (WHERE link_type = 'referred') AS referrals_count
  FROM ops.knowledge_links
  WHERE source_slug = 'customer/' || c.id::text
) graph ON true
WHERE c.deletion_completed_at IS NULL;
```

## New components (28)

28 components — schema (4 tables + audit_log + materialized view) + Tier 1 retention + 3 GDPR SOPs + skills + dashboard + MCP tools + 7 cross-bài-toán updates + meta.

## GDPR SOPs

- **SOP-COMPLIANCE-002-gdpr-deletion** — Article 17, SLA 30 days, Tier C HITL
- **SOP-COMPLIANCE-003-gdpr-access** — Article 15, data export
- **SOP-COMPLIANCE-004-gdpr-rectification** — Article 16, data correction

All leverage Bài #9 SOP architecture: HITL gating, SLA tracking, audit log built-in.

## Open questions

- OQ16.1: Cross-region residency enforcement?
- OQ16.2: Multi-tenant B2B isolation?
- OQ16.3: Export format (Article 20)?
- OQ16.4: Dual-control deletion for high-LTV?
- OQ16.5: Backup deletion strategy?
- OQ16.6: Consent preference center UI?
- OQ16.7: Cookies/analytics consent flow?
- OQ16.8: ML model export (Article 20)?
- OQ16.9: EU AI Act high-risk classification?
- OQ16.10: DPA chain với vendors?

## Anti-patterns

- ❌ Two separate B2C/B2B schemas
- ❌ Skip consent tracking
- ❌ PII without isolation
- ❌ Skip data inventory
- ❌ Hard-delete legal-retention data
- ❌ Replace PII với NULL (use REDACTED-<uuid>)
- ❌ No customer 360
- ❌ Boolean consent (per-purpose required)
- ❌ Skip audit logging
- ❌ Pre-checked consent boxes
- ❌ Customer data sprawl
- ❌ Skip cross-region residency
- ❌ Manual GDPR deletion

## GBrain integration notes

- person/company entity types match GBrain schema
- Compiled-truth + timeline format (Bài #14)
- Auto-link extraction handles person↔company relationships
- customer-data-scan = Minions pattern (deterministic, parallel jobs for bulk)

## Ritsu uses (platform primitives)

| Need | Platform |
|---|---|
| PII encryption | Postgres pgcrypto |
| Vault | Supabase Vault |
| Materialized views | Postgres |
| Audit logging | Postgres ops.audit_log |
| GDPR SOPs | Bài #9 architecture |
| Customer scan | Minions queue |

## Ritsu adds (Outer Harness)

1. Unified customer schema (B2C + B2B)
2. PII isolation pattern (persons table)
3. data-retention.yaml Tier 1 registry
4. 3 GDPR SOPs (deletion/access/rectification)
5. customer-data-scan skill
6. mv_customer_360 materialized view
7. Customer 360 dashboard + MCP tool
8. ops.audit_log convention
9. Consent schema (per-purpose với legal basis)
10. Cross-bài-toán updates (#7, #10, #11, #12, #13, #14, #15)

## Lessons captured

1. Customer entity = cross-cutting, not per-pillar.
2. Unified schema với discriminator handles B2C + B2B.
3. PII isolation through dedicated persons table.
4. Consent per-purpose, not blanket.
5. Data retention registry as Tier 1.
6. Customer-data inventory critical for GDPR.
7. Anonymization vs deletion routing.
8. Audit logging for PII access.
9. Customer 360 = materialized view + MCP tool.
10. EU AI Act adds layer (ai_personalization consent + retention).
11. Knowledge graph reveals B2B relationships.
12. GDPR SOPs leverage Bài #9 architecture.
