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

> Added 2026-05-25 via capability `gbrain-operational-brain` v1.0 (Tier C decision `5014456d-7526-4ba2-9c58-005166193864`). Classifies all ~70 `mcp__gbrain__*` MCP tools per the 4-tier policy above. Mass-purge threshold rule applies orthogonally.

### Tier A — Autonomous (gbrain READ + low-stakes inspection, ~35 tools)

These are reads against the brain DB; no state changes, no external surface. Log to `ops.agent_runs` with cost-bucket `gbrain.<role>.<op>`.

```
mcp__gbrain__search                  (semantic search across pages)
mcp__gbrain__recall                  (recall pages by criteria)
mcp__gbrain__query                   (SQL-style query)
mcp__gbrain__get_page                (single page by slug/id)
mcp__gbrain__list_pages              (paginated page list)
mcp__gbrain__get_chunks              (chunks for a page)
mcp__gbrain__traverse_graph          (graph traversal)
mcp__gbrain__get_links               (forward links from a page)
mcp__gbrain__get_backlinks           (backlinks to a page)
mcp__gbrain__think                   (LLM-based brain reflection)
mcp__gbrain__find_anomalies          (statistical pattern detection)
mcp__gbrain__find_contradictions     (logical inconsistency detection)
mcp__gbrain__find_experts            (people pages with most expertise on topic)
mcp__gbrain__find_trajectory         (entity evolution over time)
mcp__gbrain__code_callees            (code graph: who does X call?)
mcp__gbrain__code_callers            (code graph: who calls X?)
mcp__gbrain__code_def                (code graph: where is X defined?)
mcp__gbrain__code_refs               (code graph: references to X)
mcp__gbrain__code_blast              (code graph: impact analysis)
mcp__gbrain__code_flow               (code graph: data/control flow)
mcp__gbrain__file_url                (signed URL for a file blob)
mcp__gbrain__list_jobs               (background job list)
mcp__gbrain__get_brain_info          (brain DB stats)
mcp__gbrain__whoami                  (current role + grants)
mcp__gbrain__get_health              (health check)
(... ~10 more read-only / introspection tools — see knowledge/mcp-tools.yaml for the canonical list)
```

### Tier B — Notify-after (gbrain WRITES + low-stakes mutations, ~14 tools)

Writes to brain DB. Notify-first-then-batch per `06-ai-ops/gbrain/sops/SOP-AIOPS-GBRAIN-001-write-discipline/flow.yaml` — agent drafts the write; Telegram daily batch shows founder Tier B summary; founder presses [Undo] within 1h to revert. Log to `ops.agent_runs` + emit `ritsu.gbrain.write_committed` event.

```
mcp__gbrain__put_page                (create OR update page)
mcp__gbrain__update_page             (in-place page edit)
mcp__gbrain__add_link                (link between two pages)
mcp__gbrain__remove_link             (remove a single link)
mcp__gbrain__archive_page            (state: published → archived; soft delete)
mcp__gbrain__file_upload             (upload a file blob attached to a page)
mcp__gbrain__file_list               (list blobs for a page; read but page-mutating side effect of view tracking)
mcp__gbrain__submit_job              (enqueue a background job)
mcp__gbrain__retry_job               (retry a failed job)
mcp__gbrain__pause_job               (pause a running job)
mcp__gbrain__upload_image            (attach image to a page)
mcp__gbrain__put_page_with_chunks    (chunked page write)
mcp__gbrain__bulk_link               (≤ 10 links at once; >10 escalates to C)
mcp__gbrain__bulk_unlink             (≤ 10 unlinks at once; >10 escalates to C)
```

### Tier C — Approve-before (gbrain mutations affecting many pages OR semantic regen, ~6 tools)

Dry-run preview + founder approval via Telegram inline buttons. Log to `ops.agent_runs` with `was_override` field if applicable.

```
mcp__gbrain__mass_update_pages       (>10 pages updated in one operation)
mcp__gbrain__bulk_link               (>10 links — escalates from B)
mcp__gbrain__schema_migrate          (gbrain DB schema migration)
mcp__gbrain__embedding_regenerate_all (re-embed ALL pages; cost-heavy)
mcp__gbrain__dream_cycle_manual      (manually trigger dream cycle outside nightly cron)
mcp__gbrain__archive_purge_now       (move all archived pages older than 90d to purged; >100 pages escalates to D-Std)
```

### Tier D-Std — Forbidden by default (gbrain destructive operations, ~3 tools)

Magic phrase + 30s cooldown. Repair via founder PR if cap exceeded.

```
mcp__gbrain__mass_purge              (>100 pages purged in one operation; one-way)
mcp__gbrain__drop_all_links          (clear all link edges; semi-destructive)
mcp__gbrain__reset_brain             (full brain DB reset; effectively a re-install)
```

### Orthogonal rules

- **Mass-purge threshold:** any operation affecting >100 pages is automatically elevated to Tier D-Std regardless of starting tier. Example: `bulk_unlink` of 150 links → D-Std.
- **GDPR DSR exception:** the "never hard-delete except archive → purge 90d" rule has an EXPLICIT exception. `SOP-CUSTOMER-023-gdpr-account-deletion` (Tier D-Std) may invoke `mcp__gbrain__archive_purge_now` or `mcp__gbrain__mass_purge` on `people/<email-slug>` pages without the 90-day archive window. Required: founder magic phrase + GitHub PR with `/founder-approved-irreversible` per Tier D-MAX ceremony adapted for the specific GDPR case.
- **PII-bearing tools:** `put_page` and `update_page` that touch `people/` or `companies/` pages carry an extra discipline — the `post-stripe-customer-created` hook writes a PLACEHOLDER email field; founder must Tier B confirm to replace with real email. The `gbrain.l3.pii-no-email-in-companies-pages-unconfirmed` invariant (in `knowledge/cross-tier-invariants.yaml`) catches placeholders sitting >7d unconfirmed.

### Cost-bucket integration

Every gbrain MCP call logs to `ops.cost_attributions` with `cost_bucket = gbrain.<role>.<op>`. The `.mcp.json` gbrain entry's wrapper script (`scripts/pre-budget-check.sh`) enforces the $100/mo HARD cap per Hard-cap Option B (graceful degrade: WRITES + dream cycle disabled at cap; READS continue). See `knowledge/economic-architecture.md` v1.1 addendum.

### Per-role allowlist

Per `knowledge/mcp-tools.yaml`, each tool entry lists `allowed_roles`. Roles not in the allowlist receive `403 Forbidden` at MCP call time. The 6 WRITE-enabled roles (`customer-lead`, `feedback-aggregator`, `gtm-orchestrator`, `cs-coach`, `product-orchestrator`, `eval-evo-orchestrator`) plus `gbrain-maintainer` are the only roles in Tier B/C/D-Std allowlists. All other roles have READ-only access (Tier A tools only).

---

*This file is sacred. The hooks in `.claude/hooks/` will eventually enforce it in code. Until then, every agent reading this file is on the honor system. Treat it accordingly.*
