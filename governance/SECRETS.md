# Secrets — Access Matrix & Management Policy

> Maps every secret in the company stack to the roles that may use it, the scope of use, and the rotation/incident response procedures.
> **Secret values never appear in this file or anywhere in this repo.** This file is the map; values live in the secret manager.

**Owner:** founder
**Last updated:** 2026-06-03
**Change policy:** D-MAX (per `governance/HITL.md`). Every change to this file requires founder approval via PR + override ceremony.

---

## Core principles

1. **No secret values in git.** Ever. Not in code, not in config, not in PR descriptions, not in commit messages, not in agent logs. The secret manager is the only place values live.
2. **One secret per purpose.** If two systems need to talk to the same external service, they get different keys with different scopes. This makes rotation surgical.
3. **Least-privilege scopes.** Where the upstream service offers scoped tokens (GitHub PATs, Stripe restricted keys, Resend domain-scoped keys), use them. A "full access" key is a code smell.
4. **Roles read secrets, not humans.** When a role needs a secret, the secret manager injects it as an env var at runtime. Founder rarely reads secret values; usually only during initial setup or rotation.
5. **Every secret is rotatable.** Without rotation, leak = forever-compromise. Every secret in this matrix has a rotation cadence and a runbook.

---

## Secret manager — the source of truth

**Provider:** TBD. Candidates and trade-offs:

| Option | Pros | Cons | Note |
|---|---|---|---|
| **1Password Service Accounts** | Mature, scoped tokens, CLI good for agents, audit log | Paid (~$8/user/mo), requires online | Recommended default |
| **Doppler** | Built for app secrets, env injection, free tier | Vendor lock-in for env structure | Strong if budget tight |
| **Supabase Vault** | Already in stack, no new vendor | Less mature, scoped to PG functions | Useful for DB-internal secrets only |
| **HashiCorp Vault (self-hosted)** | Maximum control, enterprise-grade | Operational overhead — kills "1-person company" promise | Don't, this is overkill for current scale |

**Recommendation:** start with **1Password Service Accounts** for app/agent secrets, plus **Supabase Vault** for DB-internal secrets that never need to leave Postgres. Move away later only if 1Password becomes a bottleneck.

> **Decision required from founder before any agent runs in production.** Until decided, every secret below has status `provider_pending`.

## Secret naming convention

```
<SERVICE>_<ENVIRONMENT>_<SCOPE>_<KEY_TYPE>
```

Examples:
- `SUPABASE_OPS_FULL_SERVICE_KEY`
- `SUPABASE_PRODUCT_READONLY_ETL_KEY`
- `RESEND_PROD_TRANSACTIONAL_KEY`
- `RESEND_PROD_MARKETING_KEY`
- `STRIPE_PROD_READ_ONLY_KEY`
- `STRIPE_PROD_SECRET_KEY`  ← founder-only, agent-forbidden
- `GITHUB_PAT_GROWTH_PR_CREATE`
- `GITHUB_PAT_REVIEWER_COMMENT`
- `TELEGRAM_BOT_FOUNDER`
- `ANTHROPIC_API_KEY_OPS`
- `ANTHROPIC_API_KEY_PRODUCT`   ← belongs to product repo, not here

The convention enforces clarity: reading a secret name tells you the service, environment, scope, and key type without opening anything.

---

## Secret access matrix

This is the canonical mapping. Every secret listed must:
- Have an entry in the secret manager with the same name
- Be referenced by at least one role (or the founder)
- Have a defined rotation cadence
- Have a defined incident response (in `governance/incident-runbooks/` — TODO)

### LLM provider keys

| Secret | Used by roles | Scope | Rotation |
|---|---|---|---|
| `ANTHROPIC_API_KEY_OPS` | all agent roles in this repo | LLM calls only; budget capped per role | 90d |
| `OPENAI_API_KEY_OPS` | (none initially) | reserved if multi-provider added | 90d |

> **Note:** `ANTHROPIC_API_KEY_PRODUCT` (used by the Ritsu product itself) lives in the product repo's secret store, not here. Operating AI never holds it.

### Supabase

| Secret | Used by roles | Scope | Rotation |
|---|---|---|---|
| `SUPABASE_OPS_FULL_SERVICE_KEY` | `etl-runner` only | Full access to `ritsu-ops` project | 60d |
| `SUPABASE_OPS_ANON_KEY` | `gps`, all agent roles | RLS-protected anon key for `ritsu-ops` | 90d |
| `SUPABASE_PRODUCT_READONLY_ETL_KEY` | `etl-runner` ONLY | Read-only on dedicated views in `ritsu` project | 60d |

> **Critical access boundary.** Only `etl-runner` holds `SUPABASE_PRODUCT_READONLY_ETL_KEY`. This is the firewall between Operating AI and Product. If this key is granted to any other role, the firewall is broken — recovery requires a key rotation and a postmortem.
>
> **Equally critical:** `SUPABASE_PRODUCT_FULL_SERVICE_KEY` is **NOT** in this matrix because no role in `ritsu-works` may hold it. It belongs to the product repo. Any role that "needs" it should instead request data through `metrics.*` ETL.

### Analytics — Door 2 (capability `product-db-readonly-access`)

The pseudonymized analytics path (added 2026-06-03, capability `product-db-readonly-access` Sprint 2; Tier-C decision `0647e301`). These are **infrastructure / connection** secrets consumed by the `supabase-analytics` MCP wrapper + the in-DB FDW — **not** per-role grants. The 6 allowlisted roles use them *indirectly* via the MCP.

| Secret | Used by | Scope | Rotation |
|---|---|---|---|
| `ANALYTICS_READER_DB_URL` | `supabase-analytics` MCP (allowlist: founder, cofounder, customer-lead, product-orchestrator, gtm-orchestrator, feedback-aggregator) | Connection string for the least-priv `analytics_reader` role on `ritsu-analytics` — `SELECT` on `live.*` ONLY (role-level read-only txn). Pseudonymized data; NEVER Product, NEVER raw PII. | 90d |
| `ANALYTICS_EXPORT_RO_PASSWORD` | in-DB FDW on `ritsu-analytics` (user mapping → Product pooler) | Password for the product-side `analytics_export_ro` role — `SELECT` on the PII-stripped `analytics_export.*` views only. Held by no ops agent role. | 60d |
| `PRODUCT_POOLER_HOST` | in-DB FDW on `ritsu-analytics` | The Product Session-pooler hostname (FDW target). A hostname, not strictly secret; kept in `.env.local` for completeness. | rotate-on-change |

> **Conn-string-with-password exception.** `ANALYTICS_READER_DB_URL` is a full connection string with an embedded password — normally avoided per "What's NOT in this file". It is an **accepted exception** for this MCP: `pg` needs a `connectionString`, the embedded credential is the **least-priv** `analytics_reader` (`SELECT` on pseudonymized `live.*` only, no writes), and the value lives only in local-only `.env.local`. Low blast-radius. The HMAC **salt** that makes the data pseudonymous lives ONLY product-side (`analytics_secret.config`, RLS) and is **never** in this stack — see invariant `analytics-salt-product-only`.

### Email

| Secret | Used by roles | Scope | Rotation |
|---|---|---|---|
| `RESEND_PROD_TRANSACTIONAL_KEY` | `support-agent`, `backoffice-clerk`, `trust-safety` | Domain `support.ritsu.ai`, single-recipient transactional only | 60d |
| `RESEND_PROD_MARKETING_KEY` | `growth-orchestrator` | Domain `mail.ritsu.ai`, list-broadcast capable | 30d |

> Two separate keys for transactional vs marketing **on different sending subdomains**. If the marketing key leaks, transactional flow keeps working. If transactional leaks, marketing is unaffected. Different rotation cadences match different risk levels.

### Social platforms

| Secret | Used by roles | Scope | Rotation |
|---|---|---|---|
| `TWITTER_BOT_TOKEN_RITSU` | `growth-orchestrator` | Post + read on @ritsu | 90d |
| `LINKEDIN_BOT_TOKEN_RITSU` | `growth-orchestrator` | Post on Ritsu company page | 90d |
| `YOUTUBE_API_KEY_READONLY` | `growth-orchestrator` | Read analytics; no upload | 180d |

> YouTube uploads explicitly require founder action — the API key is read-only. Posting a public video is a Tier C/D action that benefits from human ceremony.

### Payments

| Secret | Used by roles | Scope | Rotation |
|---|---|---|---|
| `STRIPE_PROD_READ_ONLY_KEY` | `backoffice-clerk` | Read customers, subscriptions, charges | 90d |
| `STRIPE_PROD_RESTRICTED_REFUND_KEY` | (none initially — founder-only) | Refunds up to $200 (matches Tier C) | 30d, on-demand |
| `STRIPE_PROD_SECRET_KEY` | **none — founder-only** | Full account access | 30d |

> Stripe's "restricted keys" feature lets us scope a key to specific actions. If we ever automate Tier C refunds (we don't yet), we'd issue `STRIPE_PROD_RESTRICTED_REFUND_KEY` to `backoffice-clerk` with a daily $-cap. As of v0.1, **no agent holds any Stripe key that can move money**.

### GitHub

| Secret | Used by roles | Scope | Rotation |
|---|---|---|---|
| `GITHUB_PAT_GROWTH_PR_CREATE` | `growth-orchestrator` | `contents:write` on this repo only; PR create | 90d |
| `GITHUB_PAT_REVIEWER_COMMENT` | `code-reviewer` | `pull_requests:write` (comment); no approve, no merge | 90d |
| `GITHUB_PAT_TS_PR` | `trust-safety` | PR create on this repo only | 90d |
| `GITHUB_PAT_GPS_READONLY` | `gps` | Read repos, comment on issues | 90d |
| `GITHUB_TOKEN_FOUNDER` | founder only | Full access; used for D-MAX `/founder-approved-irreversible` comments | 30d |

> Every PAT is scoped to the **specific repo** it needs. The "growth" PAT cannot touch product code. The "TS" PAT cannot create PRs in unrelated org repos.

### Telegram (HITL channel)

| Secret | Used by roles | Scope | Rotation |
|---|---|---|---|
| `TELEGRAM_BOT_FOUNDER` | HITL infrastructure (all roles indirectly) | Send messages to founder's chat ID; receive messages from same | 30d |
| `TELEGRAM_FOUNDER_CHAT_ID` | HITL infrastructure | The founder's chat ID — not strictly secret but treat as PII | rotate when revoked |
| `TELEGRAM_OVERRIDE_HMAC_KEY` | HITL infrastructure | Used to sign override receipts for audit | 60d |

> The Telegram bot is the most-used channel and the most-attacked surface. Tight rotation. If `TELEGRAM_BOT_FOUNDER` is suspected compromised → all D-Std and D-MAX actions freeze until a new bot is provisioned and verified by founder via a backup channel.

### Vector store

| Secret | Used by roles | Scope | Rotation |
|---|---|---|---|
| `VECTOR_STORE_WRITE_KEY` | `etl-runner` only | Write namespace-scoped | 90d |
| `VECTOR_STORE_READ_KEY` | `gps`, `growth-orchestrator`, `support-agent`, `trust-safety` | Read all namespaces | 90d |

### Analytics

| Secret | Used by roles | Scope | Rotation |
|---|---|---|---|
| `GA_READ_TOKEN` | `growth-orchestrator` | Read GA properties for ritsu.ai | 180d |
| `GOOGLE_SEARCH_CONSOLE_TOKEN` | `growth-orchestrator` | Read GSC for ritsu.ai | 180d |
| `POSTHOG_READ_KEY` | `growth-orchestrator`, `support-agent`, `trust-safety` | Read product events | 180d |

### Accounting & finance

| Secret | Used by roles | Scope | Rotation |
|---|---|---|---|
| `ACCOUNTING_TOOL_API_KEY` | `backoffice-clerk` | Read+write transactions, invoices in chosen tool | 90d |
| `BANK_API_TOKEN_VN_READ` | `backoffice-clerk` (when available) | Read Vietnam business account txns | 60d |

### Support tools

| Secret | Used by roles | Scope | Rotation |
|---|---|---|---|
| `SUPPORT_TOOL_API_KEY` | `support-agent`, `trust-safety` | Read+write tickets in chosen tool (Intercom or Helpscout) | 90d |

---

## Per-role identity secrets

Per `governance/IDENTITY.md` (canonical mapping) and `knowledge/identity-architecture.md` sub-domain D, roles use **per-role service identities** for external attribution systems (GitHub, Email send, Anthropic API). This means many secrets in the access matrix above are actually per-role variants.

Naming pattern: `<SERVICE>_<ROLE>_<PURPOSE>_<TYPE>`. Examples:

- `GITHUB_GPS_BOT_TOKEN` — GitHub PAT for `ritsu-gps-bot`
- `GITHUB_GROWTH_BOT_TOKEN` — GitHub PAT for `ritsu-growth-bot`
- `RESEND_SUPPORT_TRANSACTIONAL_KEY` — Resend API key sending from `support@ritsu.ai`
- `ANTHROPIC_GPS_KEY` — Claude API key with budget cap for `gps` role

**Source of truth for the full mapping:** `governance/IDENTITY.md`. That file has the complete table (which role uses which token on which system). This file (`SECRETS.md`) has the rotation policy, naming convention, and access matrix.

When adding a new role:

1. Define the role in `governance/ROLES.md` per its schema
2. Add the role's service identities to `governance/IDENTITY.md`
3. Generate per-role secrets, store in secret manager
4. Add each new secret to the access matrix table above (or to a new service section if it's a new service)
5. Each secret's `used_by` field lists ONLY the new role (per-role secrets are not shared)
6. Atomic PR with all 3 files (D-Std ceremony for SECRETS.md per HITL.md)

When deprecating a role:

1. Mark role `status: deprecated` in `governance/ROLES.md` and `governance/IDENTITY.md`
2. Revoke ALL per-role secrets at secret manager
3. Mark each secret as deprecated in this file
4. After 90 days, remove deprecated entries from access matrix (preserve in git history)

**Cross-reference enforcement:** `pre-tool-secrets` hook (per `.claude/hooks/`) does a two-sided check:
- ROLES.md says role X may use secret Y → check
- SECRETS.md `used_by` for Y includes role X → check
- IDENTITY.md mapping confirms Y is the right credential for X on this system → check

If any of three disagrees, hook blocks. Drift detection is automatic.

---



### Cadence categories

- **30-day rotation:** marketing email, primary auth, founder-only keys, override HMAC, Telegram bot
- **60-day rotation:** Supabase service keys, Stripe read-only, Vector write, transactional email, bank read
- **90-day rotation:** all standard agent API keys, social platform tokens, GitHub PATs, Anthropic
- **180-day rotation:** read-only analytics keys, low-risk reporting tokens

### Rotation procedure

For every secret:

1. **Calendar reminder fires** in founder's calendar 7 days before rotation due date
2. Founder generates new value at the upstream provider
3. Updates value in secret manager (1Password Service Account vault)
4. Verifies all dependent roles can fetch the new value
5. Revokes old value at upstream provider
6. Logs rotation event to `ops.secret_rotations` table (immutable)
7. If any role fails to fetch new value → founder rolls back to old value (not yet revoked) and investigates

> **Rotation failures cascade.** If a role can't fetch a new key for 5 minutes, work using that role pauses, alerts founder via Telegram, and waits. This is preferable to silently using a stale key or proceeding without auth.

### On-demand rotation triggers

Rotate immediately, regardless of cadence, when:

- Suspected leak (key shown in screenshot, log, error message, or paste)
- Operator with access leaves the team or changes role
- Any successful unauthorized action observed
- Upstream provider announces breach
- Any P0/P1 security incident in `ritsu-ops` or `ritsu` projects

---

## Incident response — when a secret is suspected leaked

Time-critical procedure. Founder runs this; agents do not.

```
T+0       Founder declares incident in Telegram: "incident: secret-leak <SECRET_NAME>"
T+0:01    Bot acknowledges, creates GitHub issue tagged "incident-active"
T+0:05    Founder revokes the leaked secret at upstream provider
T+0:10    Founder generates new secret, updates secret manager
T+0:15    Founder verifies all dependent roles fetch new secret
          OR pauses dependent roles until verified
T+1:00    Founder writes 1-page postmortem in 06-trust-safety/incidents/<date>-<id>.md
T+24:00   Postmortem published (PR), root cause identified, prevention added
```

The 5-minute mark to revoke is the most important. Every minute beyond that the leaked secret is in the wild, blast radius grows.

---

## What's NOT in this file

- **Actual secret values.** Ever. If you see a value here, it's a bug — file an incident.
- **Database connection strings with embedded passwords.** Use the secret manager to inject components separately.
- **Private keys for SSH/SSL.** Those have their own management (cloud provider key management).
- **Secrets for the Ritsu product itself.** Those live in the product repo's secret manager, separate stack.

---

## Audit & verification

Quarterly (every 90d), founder runs this checklist:

- [ ] Every secret in `manifest.yaml` `secrets_map` is listed in this file
- [ ] Every role file (`.claude/agents/<role>.md`) lists only secrets that role is granted here
- [ ] Every secret in the secret manager has at least one role using it (no orphans)
- [ ] No secret has been used by a role not granted access (check `ops.agent_runs.secrets_accessed`)
- [ ] All rotations on cadence; any overdue → action this week
- [ ] No secret values appear in the last 90 days of `ops.agent_runs` payload hashes (a leak canary)

This audit is a Tier C action: opens a PR with the checklist completion, founder signs off.

---

*A leaked secret is a fire. The first hour determines whether it's a small fire or a five-alarm fire. This document is the fire-evacuation plan: it doesn't prevent fires, but it makes the response automatic.*
