# Human-in-the-Loop (HITL) Policy

> **The single most important policy in this repo.**
> Read before any action that touches the world outside `.archives/` or `raw/`.

**Owner:** founder
**Last updated:** 2026-05-02
**Change policy:** PR + founder review only. No agent may amend this file directly.

---

## What this document does

Classifies every action an agent (or human) can take into **four tiers** based on blast radius — the size of damage if the action goes wrong. Each tier has a different policy for who must approve, when, how, and what evidence must be logged.

If you find yourself wondering "do I need to ask before doing this?" — the answer is in this file. If the action isn't listed, default to **one tier higher** than the closest match.

## The four tiers at a glance

| Tier | Name | Policy | Channel | Audit |
|---|---|---|---|---|
| **A** | Autonomous | Just do it | None | Log to `ops.agent_runs` |
| **B** | Notify-after | Do it, then ping | Telegram | Log + Telegram event |
| **C** | Approve-before | Dry-run + ask, wait | Telegram inline buttons | Log + dry-run preview + approval record |
| **D** | Forbidden by default | Magic phrase + cooldown | Telegram + GitHub PR | Full audit trail; immutable |

## The three questions that determine tier

For every action, answer in order:

1. **Is it reversible?** (Can I `Ctrl+Z` within 5 minutes with no side effect?)
2. **Who sees the effect?** (Internal-only / external-1-person / external-many)
3. **What's the worst-case damage?** (Low / medium / high / catastrophic)

```
Reversible + Internal + Low                                → Tier A
Reversible + Internal + Medium                             → Tier A or B
Reversible + External-1                                    → Tier B
Irreversible + Internal + Low                              → Tier B
Irreversible + Internal + Medium                           → Tier C
Irreversible + External-1 + Medium                         → Tier C
Irreversible + External-many                               → Tier C or D
Irreversible + External-many + High damage                 → Tier D
Anything involving money out, secrets, user data deletion  → Tier D
```

When in doubt, **escalate one tier up**. The cost of asking when you didn't need to is small. The cost of not asking when you should have is unbounded.

---

## Tier A — Autonomous

**Policy:** Agent does it. No approval. Logs to `ops.agent_runs`.

**Required for every Tier A action:**
- Log entry in `ops.agent_runs`: agent role, action name, inputs hash, outcome, cost
- No human notification (founder can browse logs anytime)

**Examples for Ritsu operations:**

*Knowledge & internal repo:*
- Create or edit a file in `wiki/` (synced or `_`-prefixed)
- Create or edit a file in `.archives/` (any subfolder)
- Read any file in this repo
- Read Tier 2 data (`ops.*` schema) via SELECT
- Read `metrics.product_dau_snapshot` (the read-only mirror of product data)
- Generate embeddings for new content in `wiki/` or `tier3` storage
- Run a dry-run of any tool (preview without execute)
- Run `/wiki sync <path>` to ingest a ref into wiki/ (writes wiki Markdown + ops.ingestion_jobs row + ops.knowledge_pages row + embeddings) — escalates to B if estimated cost > per-task-kind cap
- Run `/wiki ask "<question>"` (read-only retrieval over wiki + ops.knowledge_embeddings)
- Run `/wiki audit` (read-only integrity scan; writes report to `.archives/wiki-audits/`)
- Call `mcp__wiki__ask`, `mcp__wiki__list_pages`, `mcp__wiki__get_page` from any agent (read-only retrieval surface)

*Search & research:*
- Web search, fetch public URLs
- Query external APIs in read-only mode (GitHub repos, public docs)
- Crawl public competitor sites and save to `raw/`

*Self-management:*
- Pull latest manifest, charter, SOPs before acting
- Update agent's own session memory or scratch notes
- Open a draft PR (NOT marked ready for review) for human inspection

*Internal communication:*
- Comment on a GitHub issue you opened
- Comment on a PR you opened (self-discussion)
- Update task status in `ops.tasks`

> Rule of thumb for Tier A: if every other operator (and an attacker who got Telegram for 1 minute) pressing this button would cause ≤ 5 minutes of cleanup, it's Tier A.

---

## Tier B — Notify-after

**Policy:** Agent does it. Immediately after, sends a Telegram message: "Done X. [Undo] [OK]".

**Required for every Tier B action:**
- Telegram notification with action summary + Undo button (if technically possible)
- Log entry in `ops.agent_runs` with `tier: 'B'`
- If Undo is pressed within 1h, agent rolls back and posts "Reverted X."

**Examples:**

*Internal-but-external-shaped:*
- Comment on a GitHub issue or PR opened by someone else
- Add labels to GitHub issues/PRs
- Tag a PR for review (assigning a reviewer)
- Apply auto-formatting / lint fixes via PR
- Open a non-draft PR for changes outside `00-core/` and `governance/`

*Customer-facing low-stakes:*
- Reply to a support ticket classified as **FAQ-handled** (categories pre-listed in `03-delivery/SOP-DEL-XXX-faq-categories.md` — TODO)
- Send a single transactional email triggered by user action (e.g. password reset, but ONLY if pre-approved templates)
- Update an in-app status banner (e.g. "Maintenance complete")

*Operational:*
- Trigger a cron job that's already in the workflow registry
- Restart a non-prod worker
- Create a feature branch
- Run a database migration on `ritsu-ops` (NOT product) that's been pre-approved by being merged to main

*Single-recipient external:*
- Send a Slack DM to a single internal contact
- Send a single email to ONE external person from a pre-approved template

> Rule of thumb for Tier B: external surface, but if it goes wrong, you can fix it before anyone outside the company notices the mess.

---

## Tier C — Approve-before

**Policy:** Agent prepares action, runs dry-run, sends Telegram approval request with preview, **waits**.

**Required for every Tier C action:**
- **Dry-run is mandatory.** Agent must produce a preview of the exact action.
- Telegram message includes:
  - Action summary
  - Dry-run preview (rendered output)
  - Cost estimate (tokens, money, recipients reached)
  - Inline buttons: `[Approve & Execute]` `[Reject]` `[View details]`
- "View details" links to a GitHub PR (for code/content changes) or dashboard URL (for ops actions) with full diff
- Wait for approval. Apply timeout policy (see below).
- After execution: Telegram confirmation + log entry with `tier: 'C'`, `approved_by`, `approved_at`

**Timeout policy for Tier C:**
```
0–1h    Wait silently
1–4h    Re-ping Telegram (gentle)
4–8h    Re-ping with "Defer to tomorrow?" option
8–24h   Auto-defer 24h. Agent moves on to other work.
>24h    Escalate to backup operator (when configured); else create
        a GitHub issue tagged "decision-pending" and drop the task.
```

**Examples:**

*External multi-recipient communication:*
- Send an email to **>1 recipient** outside the company (any campaign, even tiny)
- Post on any public Ritsu social account (X, LinkedIn, Facebook, IG, YouTube)
- Publish a blog post to ritsu.ai/blog
- Send a Discord announcement to the Ritsu community
- Post in a Slack channel that includes external members

*Tier 1 changes:*
- Open a non-draft PR that changes `00-core/`, `governance/`, or any pillar SOP
- Open a PR that adds a new `skills/` definition
- Edit `knowledge/manifest.yaml`

*Customer-facing medium-stakes:*
- Reply to a support ticket NOT in the FAQ-handled category
- Issue a refund up to $200 (anything more → Tier D)
- Apply a discount code to a single user account
- Suspend a user account for ToS violation (up to a 7-day suspension)

*Code & infra:*
- Merge a PR (any PR — merging is always Tier C minimum)
- Deploy to staging
- Add a new MCP server to `mcp/servers.yaml`
- Update production environment variables (non-secret)
- Open a security-related dependency upgrade PR

*Money in/out:*
- Charge a customer ad-hoc (outside subscription billing)
- Issue a refund $50–$200
- Pay a vendor invoice up to $500
- Sign up for a new SaaS subscription up to $50/mo

*Roadmap & strategy:*
- Update `02-product/` with a new roadmap item
- Change pricing on the public ritsu.ai/pricing page
- Update the public changelog

> Rule of thumb for Tier C: if a stranger could see this go wrong, you need preview + approval. Never trust your own first draft when external surface is involved.

---

## Tier D — Forbidden by default

**Policy:** Agent **refuses** by default, even when asked through normal channels. The only way to authorize is the founder override mechanism (below).

**Required for every Tier D action:**
- **Magic phrase from founder** in Telegram: `override: <reason in 5+ words>`
- Telegram bot replies: "Override registered. Executing in 30s. Reply STOP to cancel."
- 30-second cancellation window
- For sub-category D-MAX (see below): also requires GitHub PR with explicit `/founder-approved-irreversible` comment from founder's GitHub account, plus a 1-hour cooldown
- Immutable log entry in `ops.agent_runs` with `tier: 'D'`, `was_override: true`, `override_reason`, `override_via_channel`, `cooldown_seconds`

### Tier D categories

**D-Standard** (magic phrase + 30s confirm):
- Send email to >50 recipients in one batch
- Send any external communication to a journalist, regulator, or legal counsel
- Post any apology or incident statement publicly
- Refund $200–$2,000
- Suspend a user account for >7 days
- Charge a customer >$500 ad-hoc
- Pay a vendor invoice $500–$5,000
- Sign a SaaS contract or recurring spend >$50/mo
- Add a new domain to email-sending infrastructure
- Grant another user access to the Ops Supabase or this repo
- Add a new MCP server with **write** capabilities to a third-party service
- Sign up for or change identity providers (Google Workspace, GitHub org)

**D-MAX** (magic phrase + 30s confirm + GitHub PR + 1h cooldown):
- **Anything touching the Product Supabase (`ritsu`).** Even reads outside the pre-approved ETL.
- Delete data in any environment (staging or production), including `ritsu-ops`
- Drop a database table or column
- Force-merge a PR bypassing CI checks
- Force-push to `main` of any repo
- Refund >$2,000 (single transaction)
- Pay a vendor >$5,000 (single transaction)
- Sign any legal document
- Make any public statement claiming product safety, security, or compliance certifications
- Issue a press release or media statement
- Layoff/termination communication (when team exists)
- Disable any safety hook in `.claude/hooks/`
- Edit `governance/HITL.md` or `governance/SECRETS.md`
- Provision a new server, cluster, or production environment
- Modify DNS records on ritsu.ai
- Rotate primary auth secrets

> Rule of thumb for Tier D: if reading the action description gives you anxiety, it's at least D. If it would make a journalist's headline, it's D-MAX.

---

## How agents must reason about tier

**Algorithm every agent must run before any external/persistent action:**

1. Fetch this file (`governance/HITL.md`) at session start. Re-read if session > 1 hour old.
2. For your planned action, find the closest example. If exact match, use that tier.
3. If no exact match, run the three questions (reversible / who-sees / damage).
4. **If unsure between two tiers, choose the higher one.**
5. Compose the action.
6. Apply the tier's policy:
   - Tier A: execute → log
   - Tier B: execute → log → Telegram notify
   - Tier C: dry-run → approval request → wait → execute or abort → log
   - Tier D: refuse unless override registered → if registered, follow ceremony → log

**Never skip step 1.** A stale memory of HITL is the single most likely cause of a Tier-misclassification incident.

## Founder override mechanism (full spec)

### Magic phrase

```
override: <reason 5 words minimum>
```

Format rules (enforced by Telegram bot):
- Literal lowercase `override:` prefix
- Followed by space and reason
- Reason must contain ≥ 5 words (whitespace-separated tokens, ≥ 2 chars each)
- Reasons that look like boilerplate (e.g. all 1-letter words, repeated words) are rejected by the bot

Examples:
- ✅ `override: security incident need notify all users now`
- ✅ `override: founder approves friday newsletter to all subscribers`
- ❌ `override: yes` (too short)
- ❌ `override: a a a a a` (boilerplate detection)
- ❌ `Override: send it now please please` (case wrong)

### What happens when override is registered

1. Agent receives the `override:` message in Telegram
2. Agent verifies pattern; if invalid, replies "Override format invalid. See governance/HITL.md."
3. If valid, agent posts: "Override registered for action '{action_name}'. Reason: '{reason}'. Executing in 30s. Reply STOP to cancel."
4. 30-second timer starts
5. If `STOP` received, agent aborts: "Override cancelled."
6. Else, agent executes
7. **Immutable log entry** written with all override metadata
8. Agent posts: "Override executed. Action '{action_name}' completed at {ts}. Log: {url}."

### Tier D-MAX additional ceremony

For D-MAX actions, magic phrase alone is not enough. Required sequence:

1. Magic phrase in Telegram (registers intent)
2. Bot creates a GitHub PR (or issue) with full action description
3. Founder must comment `/founder-approved-irreversible` on the PR from founder's GitHub account
4. Bot waits **1 hour** (the regret window)
5. After 1h, bot posts to Telegram: "Cooldown complete. Type EXECUTE to confirm, or STOP to cancel."
6. Founder types `EXECUTE` (literal) → action runs
7. Or types `STOP` → action cancelled

**Why 1 hour:** D-MAX actions destroy data, money, or reputation in ways that don't recover. The cooldown is regret-protection. If you still want it after an hour of doing other things, you probably actually want it.

### Override audit

Every override creates an immutable record:
```
ops.agent_runs entry:
  tier: 'D' | 'D-MAX'
  was_override: true
  override_reason: <text>
  override_method: 'telegram' | 'telegram+github'
  override_authorized_by: 'founder'  -- by Telegram user ID hash
  authorized_at: <timestamp>
  cooldown_seconds: 30 | 3600
  executed_at: <timestamp>
  action_payload_hash: <sha256>
  approval_message_url: <telegram permalink or github comment url>
```

The DB constraint `BEFORE UPDATE` trigger raises if anyone tries to modify a row where `was_override = true`. If an override row needs correction, write a new entry with `correcting_run_id` pointing back.

## What if the override mechanism itself is compromised?

If founder's Telegram is taken over, attacker can issue D-Standard. Mitigations:

- D-MAX requires GitHub identity (additional factor)
- Telegram bot rate-limits override frequency: max 3 overrides per hour, max 10 per day
- Bot posts daily summary to founder email at 9am: "Yesterday's overrides: ..."
- Founder can revoke Telegram bot session via a `revoke` command sent from a pre-registered backup channel (when configured)

When a backup operator is added to the company, override authority becomes joint for D-MAX (either operator can issue, the other gets immediate notification with revoke option).

---

## Tier classification quick reference (printable)

```
WHEN AGENT WANTS TO...                              TIER
─────────────────────────────────────────────────────────
Edit a wiki note (any file in wiki/)                A
Read any data (Tier 1, ops.*, metrics.*)            A
Web search, fetch public page                       A
Save to .archives/ or raw/                          A
Open a draft PR                                     A
Comment on own issue/PR                             A
Run /wiki sync (ingest a ref into wiki/)            A
Run /wiki ask (read-only RAG query)                 A
Run /wiki audit (read-only integrity check)         A
Call mcp__wiki__ask from any agent                  A

Open a non-draft PR (non-Tier-1)                    B
Reply to FAQ-categorized support ticket             B
Comment on someone else's PR                        B
Run a pre-approved cron job                         B
Send transactional email (pre-approved template)    B

Open PR touching 00-core/, governance/, SOPs     C
Merge any PR                                        C
Send email to >1 external recipient                 C
Post anywhere public (blog, social, Discord)        C
Reply to non-FAQ support ticket                     C
Refund up to $200                                   C
Deploy to staging                                   C
Update pricing page                                 C
Add new MCP server (read-only)                      C

Send email to >50 recipients                        D-Std
Refund $200–$2000                                   D-Std
Pay vendor $500–$5000                               D-Std
Suspend user >7 days                                D-Std
Add MCP server with write to 3rd party              D-Std
Add new operator to repo or Supabase                D-Std

Touch Product Supabase (ritsu) at all               D-MAX
Delete production data                              D-MAX
Drop DB table/column                                D-MAX
Force-merge or force-push                           D-MAX
Refund >$2000                                       D-MAX
Sign legal doc                                      D-MAX
Public statement on safety/security/compliance      D-MAX
Edit HITL.md or SECRETS.md                          D-MAX
Disable any safety hook                             D-MAX
Modify DNS                                          D-MAX
Rotate primary auth secrets                         D-MAX
```

## When this document is wrong

If you (the founder) find that an action is classified into a tier that's making operations slow without adding safety, or that's leaving a real risk uncovered:

1. Don't bypass the rule first. Operate under the current rule until changed.
2. Open a PR to this file proposing the change.
3. Wait 24 hours after opening before merging (regret window for the rule itself).
4. Merge with a brief note in the file's changelog.

This document protects you from your own future bad decisions as much as from agent failures. Slow it down to keep it honest.

---

## Appendix A — Gbrain operation tier classification

> Added 2026-05-25 via capability `gbrain-operational-brain` v1.0 (Tier C decision `5014456d-7526-4ba2-9c58-005166193864`). **Reconciled 2026-05-30 (PR #162) against the LIVE gbrain v0.40 surface — 74 MCP tools.** The prior version classified **13 tools the binary does NOT expose** (`mass_purge`, `reset_brain`, `drop_all_links`, `mass_update_pages`, `embedding_regenerate_all`, `schema_migrate`, `dream_cycle_manual`, `archive_purge_now`, `get_brain_info`, `update_page`, `archive_page`, `bulk_link`, `bulk_unlink` — all removed below) and **omitted ~33 real tools** (incl. the destructive `delete_page` / `purge_deleted_pages` / `sources_remove`), now classified.
>
> **Single source of truth for per-tool tier + `role_scope` is `knowledge/mcp-tools.yaml`**, regenerated from the live binary by `scripts/resolver-v3/gen-gbrain-catalog.cjs`, validated against it by `scripts/resolver-v3/mcp-runtime-reconcile.cjs`, and kept internally coherent by `scripts/cross-tier/validate-mcp-catalog-coherence.cjs` (runs in `check-drift` + pre-commit). This appendix states the **classification policy** and enumerates the **high-stakes (Tier C) tools explicitly**; the routine read/write bulk follows the rule (NOT re-enumerated here — an inline list is exactly what drifted, and nothing validates HITL.md's enumeration). When gbrain upgrades: refresh `mcp-tools.yaml` via the generator (reconcile catches drift); touch this appendix only if the *policy* or the *C/D set* changes.

### Classification policy (the rule)

| Tool shape | Tier | Rationale |
|---|---|---|
| **Read / introspection** — `search`/`query`/`recall`/`search_by_image`, `get_*`, `list_*`, `find_*`, `traverse_graph`, `resolve_slugs`, `code_*`, `takes_*` (calibration reads), `sources_list`/`sources_status`, `think` (read-only synthesis), `whoami`, `run_doctor`, `file_url`/`file_list` | **A** Autonomous | no state change; reads brain DB. Auto-run. |
| **Single-item write / mutation** — `put_page`, `delete_page` (soft), `restore_page`, `add_*`/`remove_*` (link/tag/timeline), `extract_facts`/`forget_fact`, `log_ingest`/`put_raw_data`, `file_upload`, `sources_add`, `revert_version`, `sync_brain`, `code_traversal_cache_clear`, job-control (`submit_job`/`submit_agent`/`retry_job`/`pause_job`/`resume_job`/`cancel_job`/`replay_job`/`send_job_message`) | **B** Notify-after | reversible brain-DB write; daily Telegram batch + 1h Undo. |
| **Hard delete (irreversible, scoped)** — the Tier C list below | **C** Approve-before | dry-run + founder approval. |

**v0.40 counts: A = 47, B = 25, C = 2, D-Std = 0** (= 74). Per-tool assignment is in `mcp-tools.yaml` (`tier_default`).

### Tier A — Autonomous (READ + introspection, 47 tools)

Reads against the brain DB; no state change, no external surface. Auto-run; log to `ops.agent_runs` with cost-bucket `gbrain.<role>.<op>`. Full list = `mcp-tools.yaml` entries with `tier_default: A`. Covers semantic/keyword/image search, recall, page/chunk/link/backlink/timeline/tag/version reads, graph + code-graph traversal, health/stats/doctor/identity diagnostics, job inspection, takes-calibration reads, source status, and `think` (multi-hop synthesis — read-only; higher LLM cost but no write).

### Tier B — Notify-after (single-item WRITES, 25 tools)

Reversible writes. Notify-first-then-batch per `06-ai-ops/gbrain/sops/SOP-AIOPS-GBRAIN-001-write-discipline/flow.yaml` — agent drafts the write; Telegram daily batch shows the Tier B summary; founder presses [Undo] within 1h. Log to `ops.agent_runs` + emit `ritsu.gbrain.write_committed`. Full list = `mcp-tools.yaml` entries with `tier_default: B`. Notes:
- `put_page` is **create-or-update** — there is no separate `update_page` (removed).
- `delete_page` is a **SOFT delete**, recoverable via `restore_page` within the retention window — hence B, not C.
- **`submit_agent`** enqueues an autonomous LLM agent job. It is a cost risk (not data-destruction), gated only by the `$100/mo` `pre-budget-check.sh` cap with no per-invocation HITL. FOUNDER: confirm B is acceptable, or elevate to C if per-job approval is wanted.

### Tier C — Approve-before (irreversible scoped hard-deletes, 2 tools)

Dry-run preview + founder approval via Telegram inline buttons. Log to `ops.agent_runs` with `was_override` if applicable. These are the **only hard-delete tools the v0.40 binary exposes**:

```
mcp__gbrain__purge_deleted_pages   (admin-only: HARD-deletes pages whose deleted_at is older than older_than_hours — irreversible)
mcp__gbrain__sources_remove        (HARD-removes a source, cascading its pages/chunks/embeddings — irreversible; refuses the auto-managed clone)
```

> FOUNDER NOTE: both are scoped (one source / aged soft-deleted pages), hence **C, not D-Std**. The C-vs-D-Std line for these two is a judgment call — confirm or elevate. If either touches >100 pages it auto-escalates to D-Std per the orthogonal rule.

### Tier D-Std — Forbidden by default (0 tools in v0.40)

**The live gbrain v0.40 binary exposes NO D-Std gbrain tools.** The previously-listed `mass_purge` / `drop_all_links` / `reset_brain` are **not implemented** (removed 2026-05-30). The brain-wide-destruction tier is therefore empty; the orthogonal >100-page rule below pre-classifies any such tool if one ever ships.

### Orthogonal rules

- **Mass threshold (forward guard):** any single operation affecting >100 pages auto-elevates to Tier D-Std regardless of starting tier. No current v0.40 tool batches at that scale (the imagined `mass_*` / `bulk_*` tools do not exist); this guard pre-classifies any future bulk tool the day it ships.
- **GDPR DSR exception:** the "never hard-delete except via the soft-delete → purge path" rule has an EXPLICIT exception. `SOP-CUSTOMER-023-gdpr-account-deletion` (Tier D-Std) may invoke `mcp__gbrain__delete_page` then `mcp__gbrain__purge_deleted_pages` on `people/<email-slug>` pages without the normal retention window. Required: founder magic phrase + GitHub PR with `/founder-approved-irreversible` per the Tier D-MAX ceremony adapted for the GDPR case.
- **PII-bearing tools:** `put_page` (create-or-update), `delete_page`, and `restore_page` touching `people/` or `companies/` pages carry extra discipline — the `post-stripe-customer-created` hook writes a PLACEHOLDER email; founder must Tier B confirm before replacing it with a real email. Invariant `gbrain.l3.pii-no-email-in-companies-pages-unconfirmed` (`knowledge/cross-tier-invariants.yaml`) catches placeholders sitting >7d unconfirmed.

### Cost-bucket integration

Every gbrain MCP call logs to `ops.cost_attributions` with `cost_bucket = gbrain.<role>.<op>`. The `.mcp.json` gbrain entry's wrapper script (`scripts/pre-budget-check.sh`) enforces the $100/mo HARD cap per Hard-cap Option B (graceful degrade: WRITES + dream cycle disabled at cap; READS continue). See `knowledge/economic-architecture.md` v1.1 addendum.

### Per-role allowlist

Per `knowledge/mcp-tools.yaml`, each tool entry lists `allowed_roles`. Roles not in the allowlist receive `403 Forbidden` at MCP call time. The 6 WRITE-enabled roles (`customer-lead`, `feedback-aggregator`, `gtm-orchestrator`, `cs-coach`, `product-orchestrator`, `eval-evo-orchestrator`) plus `gbrain-maintainer` are the only roles in Tier B/C/D-Std allowlists. All other roles have READ-only access (Tier A tools only).

### Per-human tier gate (orthogonal — capability multi-user-auth, Sprint 2, added 2026-06-26)

The per-tool tiers above (A/B/C) classify *what HITL ceremony a gbrain operation needs* and are orthogonal to *which human tier may use gbrain at all*. When `RITSU_AUTH_MODE=per-human`, a **PreToolUse hook** (`pre-tool-gbrain-tier`, registered in `.claude/settings.json` on `mcp__gbrain.*`) enforces the `knowledge/operator-tiers.yaml` contract: **`owner` + `admin` may use gbrain; `user` is denied** every `mcp__gbrain__*` tool; a null/unknown/expired tier is denied (fail-closed). It reads the operator tier from the access token the supabase-ops MCP persists to the credential file (read-only — no token-rotation race). gbrain is an external bun binary that can't be RLS-gated, so this hook is **local least-privilege defense-in-depth** — a malicious laptop owner could disable it; the REAL gbrain bounds remain the `$100/mo` cost cap (`scripts/pre-budget-check.sh`) + gbrain holding no money/Product/secret credentials. In the default service-key mode the hook is a no-op (the `allowed_roles` + per-tool tiers above are unchanged).

---

*This file is sacred. The hooks in `.claude/hooks/` will eventually enforce it in code. Until then, every agent reading this file is on the honor system. Treat it accordingly.*
