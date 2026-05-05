# Bài #10 — Real-Time Visibility & Alerting (DRAFT)

**Status:** DRAFT — derived from G4 walkthrough, not yet brainstormed/decided
**Walkthrough:** `_build/notes/phase-a2/walkthroughs/G4-dashboard.md`
**Dependencies:** Bài #1 (Tier 1), #2 (HITL), #5 (orchestration), #7 (cost), #8 DRAFT (scheduling), #9 DRAFT (SOP — investigations as SOPs)

## Why
Founder TH3: *"Build dashboard về tình hình kinh doanh thời gian thực."*
~5 issues directly + many indirect (every business workflow needs visibility).

Phase A explicitly deferred dashboard (Bài #6 sub-domain B). Phase A.2 reveals trigger condition met:
- Founder concrete need (TH3)
- Real-time visibility blocks daily ops
- Mobile mobility constraint surfaced

Without Bài #10:
- Founder context-switches Telegram → Supabase SQL → CSV → spreadsheet
- 4-hour incident detection latency (Stripe stuck payments scenario)
- Daily cognitive load unsustainable

## Decisions (tentative)

### Axis 1 — Data Layer
**Choice:** Supabase Realtime + materialized views + ops.* extensions
- ops.external_events ingests webhook data (Stripe, Sentry, GA, Vercel, GitHub)
- ops.metrics time-series KPI snapshots
- ops.alerts unified alert table
- Materialized views (mv_*) refresh 1m hot / 1h cohort
- Defer ClickHouse to v1.x

### Axis 2 — Frontend Infrastructure
**Choice:** Next.js 15 PWA at `dashboard.ritsu.ai`
- Vercel hosting
- Supabase Auth
- Recharts charts library
- Mobile-first (320px baseline)
- Pre-built widget library
- Page structure: workforce / business / operations / alerts / settings

### Axis 3 — Anomaly Detection + Alerting
**Choice:** Hybrid threshold + statistical
- `knowledge/alert-rules.yaml` Tier 1 declarative threshold rules
- `anomaly-detect` skill scheduled 15min (Bài #8)
- Statistical (z-score, IQR, change-point) → ops.alerts severity:info
- Threshold rules → ops.alerts severity:warning|critical
- Graduation workflow: stat-detected → threshold rule (founder approves)
- Cooldown per rule prevents fatigue

### Axis 4 — Integration + Bidirectional Workflow
**Choice:** New pillar `08-integrations/` + drill-down→action
- Webhook receivers (Edge Functions) per source
- Dashboard alert click → spawn ops.tasks investigation
- Investigation can be SOP (Bài #9 integration)
- ops.alerts.acknowledged_at + resolved_at audit trail
- KPI registry `knowledge/kpi-registry.yaml` Tier 1

## Schema additions (Tier 2)

```sql
CREATE TABLE ops.external_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL,
  event_type      text NOT NULL,
  external_id     text,
  payload         jsonb NOT NULL,
  occurred_at     timestamptz NOT NULL,
  ingested_at     timestamptz DEFAULT now()
);
CREATE INDEX ON ops.external_events (source, occurred_at DESC);
CREATE INDEX ON ops.external_events (event_type, occurred_at DESC);

CREATE TABLE ops.metrics (
  metric_id       text NOT NULL,
  value           numeric NOT NULL,
  measured_at     timestamptz NOT NULL,
  dimensions      jsonb,
  PRIMARY KEY (metric_id, measured_at, dimensions)
);
CREATE INDEX ON ops.metrics (metric_id, measured_at DESC);

CREATE TABLE ops.alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id        text NOT NULL,
  severity        text NOT NULL,
  title           text NOT NULL,
  description     text,
  triggered_at    timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by text,
  resolved_at     timestamptz,
  related_metrics jsonb
);
CREATE INDEX ON ops.alerts (severity, acknowledged_at) WHERE resolved_at IS NULL;
```

## KPI Registry schema

```yaml
# knowledge/kpi-registry.yaml
kpis:
  - id: <slug>
    name: <human readable>
    unit: USD | percentage | count | duration
    refresh_cadence: <interval>
    source: materialized_view | direct_query | computed
    view_name: <mv name if applicable>
    target: <number>
    target_direction: above | below
    description: <markdown>
```

## Alert Rules schema

```yaml
# knowledge/alert-rules.yaml
rules:
  - id: <slug>
    metric: <kpi-id from registry>
    condition: <expression>
    severity: info | warning | critical
    notify: [<role-list>]
    channels: [telegram, dashboard, email]
    cooldown_min: <int>
    description: <markdown>
```

## New components (17)

| ID | Component | Type | Phase |
|---|---|---|---|
| CN10.1 | `dashboard.ritsu.ai` Next.js PWA | Frontend | Phase B/C |
| CN10.2 | `ops.external_events` table | Tier 2 | Phase B |
| CN10.3 | `ops.metrics` table | Tier 2 | Phase B |
| CN10.4 | `ops.alerts` table | Tier 2 | Phase B |
| CN10.5 | Materialized views library (mv_*) | Tier 2 SQL | Phase B |
| CN10.6 | `knowledge/alert-rules.yaml` | Tier 1 | A.2 |
| CN10.7 | `knowledge/kpi-registry.yaml` | Tier 1 | A.2 |
| CN10.8 | Pillar `08-integrations/` | Pillar | A.2 |
| CN10.9 | Webhook receivers (Edge Functions) | Runtime | Phase B/C |
| CN10.10 | Skill `anomaly-detect` | Procedural | Phase C |
| CN10.11 | Skill `alert-dispatch` | Procedural | Phase C |
| CN10.12 | Dashboard widget template library | Meta | A.2 |
| CN10.13 | Recipe `add-kpi.md` | Meta | A.2 |
| CN10.14 | Recipe `add-alert-rule.md` | Meta | A.2 |
| CN10.15 | Recipe `add-webhook-receiver.md` | Meta | A.2 |
| CN10.16 | Bài #6 sub-domain B update | Governance update | A.2 |
| CN10.17 | Brainstorm note `problem-10-real-time-visibility.md` | Meta | A.2 |

## Open questions

- OQ10.1: Multi-tenant dashboard (first operator)?
- OQ10.2: Public status page?
- OQ10.3: Alert fatigue auto-tuning?
- OQ10.4: Custom dashboard per role?
- OQ10.5: Embed iframes vs custom UI?
- OQ10.6: Push notifications (web/native)?

## Anti-patterns

- ❌ Separate analytics DB for v1.0
- ❌ Static dashboard, no drill-down
- ❌ Push every metric change
- ❌ Hard-code KPI definitions in widgets
- ❌ Skip mobile responsive
- ❌ Auto-resolve alerts via ML
- ❌ Pre-build 50 pages

## Ritsu uses (platform primitives)

| Need | Platform |
|---|---|
| Realtime DB | Supabase Realtime |
| Materialized views | Postgres |
| Auth | Supabase Auth (existing for product) |
| Edge compute | Supabase Edge Functions |
| Hosting | Vercel |
| Charts | Recharts |
| PWA | Next.js |

## Ritsu adds (Outer Harness)

1. KPI registry format (knowledge/kpi-registry.yaml)
2. Alert rules format (knowledge/alert-rules.yaml)
3. ops.external_events / metrics / alerts schemas
4. Dashboard frontend at dashboard.ritsu.ai
5. Webhook receivers per source
6. Anomaly detection skill
7. Bidirectional dashboard → workforce action
8. Pillar `08-integrations/` for external data

## Lessons captured

1. "Defer to v1.x" needs revisit triggers documented.
2. Dashboard ≠ static viz. Drill-down → action = operational loop closure.
3. Materialized views > separate analytics DB at v1.0 scale.
4. Threshold + statistical hybrid mitigates each's weakness.
5. KPI registry = single source of truth.
6. External integration earns own pillar (08-integrations/).
7. Bidirectional dashboard = cockpit pattern.
8. Mobile-first = founder mobility constraint.
