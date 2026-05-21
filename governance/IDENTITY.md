# Identity & Service Account Mapping

> Operational governance for Ritsu's per-role service identities across external systems. The implementation reference for the strategy in `knowledge/identity-architecture.md` sub-domain D.

**Status:** v1.0 spec
**Tier:** D-Std (changes require magic phrase + PR + 30s confirm — adding/removing identities is high-risk)
**Last updated:** 2026-05-02
**Related:** `knowledge/identity-architecture.md`, `governance/SECRETS.md`, `governance/ROLES.md`

---

## Why this file exists

Per `knowledge/identity-architecture.md` sub-domain D, Ritsu uses **per-role service identities for external attribution systems** and **shared internal identities** otherwise. This file is the canonical mapping: which role uses which identity on which system. Without it, drift between roles and identities is silent and dangerous.

This file is policy. Implementation lives in:
- Secret manager (per Bài #2 SECRETS.md) — actual credentials
- `.claude/agents/<role>.md` — per-agent runtime config that reads this mapping
- Hooks (`pre-tool-secrets`, `pre-tool-publish`) — runtime enforcement

## How to use this file

When creating a new role, adding a new external system, or auditing existing identities:

1. **Read this file first** — see what already exists
2. **Cross-check `governance/ROLES.md`** — does the role exist? Is it active?
3. **Cross-check `governance/SECRETS.md`** — does the secret exist with correct rotation policy?
4. **Update this file** — add/modify the mapping
5. **Open PR** with all 3 files changed in one diff (atomic update)

## The mapping

### GitHub identities

Per role, one GitHub bot account. Founder owns each account; service tokens rotate per `governance/SECRETS.md` (90-day default for git tokens).

| Role | GitHub username | Email of bot owner | Permissions scope | Secret name |
|---|---|---|---|---|
| `gps` | `ritsu-gps-bot` | `gps@ritsu.ai` | repo:write on `ritsu-works` only | `GITHUB_GPS_BOT_TOKEN` |
| `growth-orchestrator` | `ritsu-growth-bot` | `growth@ritsu.ai` | repo:write on `ritsu-works`, `ritsu-content` | `GITHUB_GROWTH_BOT_TOKEN` |
| `support-agent` | `ritsu-support-bot` | `support@ritsu.ai` | repo:read on all, issues:write on `ritsu-works` | `GITHUB_SUPPORT_BOT_TOKEN` |
| `content-drafter` | `ritsu-content-bot` | `content@ritsu.ai` | repo:write on `ritsu-content` only | `GITHUB_CONTENT_BOT_TOKEN` |
| `code-reviewer` | `ritsu-codereview-bot` | `codereview@ritsu.ai` | repo:read + PR comment on `ritsu-works` | `GITHUB_CODEREVIEW_BOT_TOKEN` |
| `etl-runner` | `ritsu-etl-bot` | `etl@ritsu.ai` | repo:read on `ritsu-works` only | `GITHUB_ETL_BOT_TOKEN` |
| `trust-safety` | `ritsu-ts-bot` | `ts@ritsu.ai` | repo:read all + issues:write | `GITHUB_TS_BOT_TOKEN` |
| `backoffice-clerk` | `ritsu-backoffice-bot` | `backoffice@ritsu.ai` | none (no GitHub use case at v1.0) | n/a |
| `founder` | (founder's personal account) | (founder's email) | full | n/a (uses personal token) |

Bot profile bio template (must match for all 8 bots):

```
AI agent operating as part of Ritsu workforce, role: {role-slug}.
Commits and actions are attributable to this role per:
https://ritsu.ai/transparency
Owner: founder@ritsu.ai
```

Profile picture: monochrome Ritsu logo. NO human face. NO custom illustrations that imply individuality.

### Email sending identities

Per role, one sending email address. All addresses are aliases routing to founder inbox (catch-all). Sending happens via Resend (or chosen provider) with SPF/DKIM configured per address.

| Role | Sending address | Display name | DKIM key | Secret name |
|---|---|---|---|---|
| `gps` | `gps@ritsu.ai` | "Ritsu Assistant" | configured | `RESEND_GPS_SEND_KEY` |
| `growth-orchestrator` | `growth@ritsu.ai` | "Ritsu" (marketing) | configured | `RESEND_GROWTH_MARKETING_KEY` |
| `support-agent` | `support@ritsu.ai` | "Ritsu Assistant" | configured | `RESEND_SUPPORT_TRANSACTIONAL_KEY` |
| `content-drafter` | (no send capability) | n/a | n/a | n/a |
| `code-reviewer` | (no send capability) | n/a | n/a | n/a |
| `etl-runner` | (no send capability) | n/a | n/a | n/a |
| `trust-safety` | `ts@ritsu.ai` | "Ritsu Trust & Safety" | configured | `RESEND_TS_KEY` |
| `backoffice-clerk` | `billing@ritsu.ai` | "Ritsu Billing" | configured | `RESEND_BILLING_KEY` |
| `founder` | `founder@ritsu.ai` | (founder name) | configured | uses founder's primary key |

**Important:** the **display name** customers see is "Ritsu Assistant" or a similar branded name — NOT the role slug. Even though the email comes from `support@ritsu.ai`, the From header reads "Ritsu Assistant <support@ritsu.ai>". This is the unified external persona pattern from sub-domain C.

The role attribution is preserved in:
- The sending address subdomain (audit trail)
- The DKIM signature (cryptographic proof)
- `ops.agent_runs.agent_role` (internal log)

But customer-visible "from" name is unified.

### Anthropic API keys

Per role, one Claude API key. Enables per-role usage tracking, rate limit isolation, separate budget caps.

| Role | Key name | Monthly budget cap | Model access |
|---|---|---|---|
| `gps` | `ANTHROPIC_GPS_KEY` | $200 | opus, sonnet, haiku |
| `growth-orchestrator` | `ANTHROPIC_GROWTH_KEY` | $300 | opus, sonnet, haiku |
| `support-agent` | `ANTHROPIC_SUPPORT_KEY` | $400 | sonnet, haiku |
| `content-drafter` | `ANTHROPIC_CONTENT_KEY` | $200 | sonnet, opus |
| `code-reviewer` | `ANTHROPIC_CODEREVIEW_KEY` | $100 | sonnet |
| `etl-runner` | `ANTHROPIC_ETL_KEY` | $50 | haiku |
| `trust-safety` | `ANTHROPIC_TS_KEY` | $100 | opus, sonnet |
| `backoffice-clerk` | `ANTHROPIC_BACKOFFICE_KEY` | $50 | sonnet, haiku |
| `founder` | (founder's personal key) | (no cap, founder direct) | all |

Budgets here are caps at the API provider level. Per-role budget tracking inside `ops.agent_runs` is for fine-grained accounting (per Bài #7 — Economic Unit, upcoming brainstorm). API-level cap is the hard ceiling; ops-level tracking is the observability layer.

### Supabase identities

| Role | Supabase identity | Project | Secret name |
|---|---|---|---|
| All non-`etl-runner` roles | `ritsu-ops` anon role | `ritsu-ops` | `SUPABASE_OPS_ANON_KEY` (read), `SUPABASE_OPS_SERVICE_KEY` (write, restricted) |
| `etl-runner` | `ritsu-ops` service role | `ritsu-ops` | `SUPABASE_OPS_FULL_SERVICE_KEY` |
| `etl-runner` (read-only product) | `ritsu` etl-readonly role | `ritsu` (Product) | `SUPABASE_PRODUCT_READONLY_ETL_KEY` |
| All other roles → Product | NO ACCESS | n/a | enforced by `pre-tool-supabase-product` hook |

Per-role write capability within `ritsu-ops` is enforced via Postgres RLS policies (per Bài #2 SECRETS.md). Service key is the same physical credential, but RLS limits each role's effective write surface.

### Slack (when activated, post-v1.0)

Reserved per-role bot mapping. Not yet provisioned.

| Role | Bot username | App name | Status |
|---|---|---|---|
| `gps` | `ritsu-gps` | "Ritsu GPS Bot" | reserved, not provisioned |
| `growth-orchestrator` | `ritsu-growth` | "Ritsu Growth Bot" | reserved |
| `support-agent` | `ritsu-support` | "Ritsu Support Bot" | reserved |
| `trust-safety` | `ritsu-ts` | "Ritsu T&S Bot" | reserved |

Provisioning happens when Slack channel becomes operational (post-v1.0). Until then, no Slack identities exist.

### Telegram

Single bot for founder ↔ workforce abstraction. Founder talks to "the workforce" via this bot; the bot routes messages to specific agents internally per the orchestration layer (Bài #5).

| Identity | Token name | Purpose |
|---|---|---|
| `@RitsuWorkforceBot` (or chosen name) | `TELEGRAM_FOUNDER_BOT_TOKEN` | Founder ↔ workforce private bot |

Customer-facing Telegram (if ever activated) would use a SEPARATE bot identity with separate token. Not provisioned at v1.0.

### Stripe

No agent identity. Stripe access requires founder approval per `governance/HITL.md` Tier D-Std for any non-read action. Per Bài #2 SECRETS.md:

- `STRIPE_PROD_READ_ONLY_KEY` — accessible to `backoffice-clerk` for reporting only
- All write actions on Stripe = founder-only, no agent identity exists

This is intentional. Money movement does not have agent attribution because no agent has authority.

### Other systems (reserved)

When any of the following systems become operational, this file gets updated via PR:

- HubSpot (CRM) — per-role API tokens
- Notion (internal docs) — per-role workspace integrations
- Linear (issue tracking) — per-role API tokens
- Twitter/X (social posting) — single brand account, founder-controlled
- LinkedIn (social posting) — single brand page, founder-controlled
- YouTube — single brand channel, founder-controlled
- Webflow / Vercel (website hosting) — founder-controlled

Pattern: **internal tools** get per-role identities; **brand-owned external presence** stays founder-controlled (see "Why brand-owned channels stay founder-only" below).

## Why brand-owned channels stay founder-only

Twitter/LinkedIn/YouTube etc. are brand-owned channels with reputation accumulation. A compromise on these affects company brand directly — different blast radius than internal GitHub bots.

For v1.0:
- Agent (e.g., growth-orchestrator) DRAFTS the post in `.archives/drafts/`
- Founder reviews via Telegram (Tier C HITL per `governance/HITL.md`)
- Founder posts manually using founder's own credential
- ops.agent_runs records the draft authorship

Post-v1.0, when patterns prove safe, automated posting may be added with separate per-channel bots. Each addition = D-Std PR per this file.

## Identity provisioning checklist (when adding a new role)

Per the role-add ceremony in Bài #2:

1. ☐ GitHub bot account created by founder (`ritsu-{role}-bot`)
2. ☐ Email forwarder created (`{role}@ritsu.ai`)
3. ☐ Anthropic API key created with budget cap
4. ☐ Supabase RLS policy added if role has DB write
5. ☐ All secrets stored in secret manager per `governance/SECRETS.md`
6. ☐ This file (`IDENTITY.md`) updated with new mapping
7. ☐ `governance/ROLES.md` updated with role definition
8. ☐ `governance/SECRETS.md` updated with secret names
9. ☐ `.claude/agents/{role}.md` runtime file created
10. ☐ Hooks tests pass (`pre-tool-secrets` recognizes new role)

PR includes ALL of the above changes. Atomic.

## Identity decommission checklist (when deprecating a role)

1. ☐ Mark role `status: deprecated` in `governance/ROLES.md`
2. ☐ Revoke all secrets at secret manager
3. ☐ Archive (do NOT delete) GitHub bot account — preserves commit history
4. ☐ Disable email forwarder (existing emails route to founder)
5. ☐ Set Anthropic API key to disabled state
6. ☐ Update this file marking row as `status: deprecated YYYY-MM-DD`
7. ☐ After 90 days, audit-clear: confirm no references in code/skills, then strike row (preserve in git history)

Deprecation is D-Std PR.

## Audit cadence

Quarterly (per `governance/SECRETS.md`):

1. **Reconciliation:** every secret in this file exists in secret manager? Every secret in manager has an entry here?
2. **Activity check:** every per-role bot has had recent activity per its expected use? Dormant bots flagged.
3. **Permission check:** GitHub bot scopes match table? Email DKIM still valid?
4. **Compromise sweep:** any unusual activity in `ops.agent_runs.secrets_accessed`? Any role accessing secrets it shouldn't?

Output: quarterly audit report in `.archives/audits/identity-{YYYY-Q}.md`. Failed items become PRs.

## Anti-patterns to refuse

- **"Reuse one GitHub bot for two new roles."** No — defeats the per-role attribution purpose. Add a new bot.
- **"Skip provisioning email for `code-reviewer`, it doesn't send anyway."** Correct — but still document the "no send capability" in this file as `n/a`. Future agents looking up the table need to see "explicitly nothing."
- **"Founder posts to Twitter via agent in v1.0 to save time."** No — brand channels stay founder-controlled until proven safe pattern. Re-evaluate post-v1.0.
- **"Customer-facing email shows `support-agent` as sender."** No — display name is "Ritsu Assistant" per sub-domain C. Internal attribution preserved separately.
- **"Add new system access without updating this file."** No — atomic PR or rollback. Drift between mapping and reality is the core failure mode this file prevents.

## Cross-reference summary

| Concern | This file | Cross-ref |
|---|---|---|
| Which secret a role can use | (this file) | `governance/SECRETS.md` `used_by` |
| Which role exists | n/a | `governance/ROLES.md` |
| Runtime enforcement | n/a | `.claude/hooks/pre-tool-secrets` |
| Customer-facing identity | mention | `knowledge/identity-architecture.md` sub-domain C |
| Disclosure compliance | mention | `00-core/transparency.md` |

---

*Identity is the substrate of attribution. This file is the substrate of identity. Keep it accurate; the rest depends on it.*
