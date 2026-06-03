# Agent Roles & Permissions

> Defines the agent roles operating in `ritsu-works`, what each is permitted to do, and how roles map to skills, tools, and secrets.

**Owner:** founder
**Last updated:** 2026-05-02
**Change policy:** PR + founder review. Tier C per `governance/HITL.md`.

---

## Why roles exist

Without role separation, the only choice is "the agent can do everything" or "the agent can do nothing." Both are wrong.

Roles let us answer questions like:
- *Why can a content drafter read public docs but not query the customer database?*
- *Why can the ETL runner read Product Supabase but never write?*
- *Why does the support agent get a different LLM budget than the growth orchestrator?*

The answer is always: **principle of least privilege.** Each role has the minimum capabilities to do its job. Everything else is denied.

## How a role is defined

Every role has the following attributes:

```yaml
role: <slug>
purpose: <one-sentence description>
home_pillar: <00-core | 01-growth | 02-product | 03-delivery | 04-backoffice | 05-ai-ops | 06-trust-safety | cross-cutting>
permissions:
  tier1_paths:           # which paths in this repo it can edit (PR-only)
  tier2_schemas_read:    # which Supabase schemas it can SELECT
  tier2_schemas_write:   # which schemas it can INSERT/UPDATE
  tier3_buckets:         # which storage buckets it can read/write
  tier4_namespaces:      # which vector namespaces
  mcp_servers:           # which MCP servers it can use (by name from mcp/servers.yaml)
  skills:                # which skills it may invoke
  secrets:               # which secret keys it may access (by name from SECRETS.md)
hitl_max_tier: <A | B | C | D-Std | D-MAX>  # highest tier this role may attempt without escalation
budget:
  monthly_token_usd: <number>      # legacy field; equivalent to economic_budget.monthly_cap_usd
  monthly_tool_calls: <number>     # operational ceiling, separate from cost
economic_budget:
  monthly_cap_usd: <number>        # hard monthly $ cap; budget enforcement uses this
  alert_at_pct: 0.80               # default — Telegram alert at 80%
  escalate_at_pct: 1.00            # default — founder approval at 100%
  hard_block_at_pct: 1.50          # default — block until ROLES.md PR raises cap
  per_task_kind_caps:              # optional; per-instance soft caps for this role's task_kinds
    # v1.1 tagged form (preferred — capability evolve v1.1, 2026-05-27):
    <task_kind_usd>:      {unit: usd, cap: <number>}       # USD cap; pre-llm-call-budget hook compares against current_task_cost + estimated_call
    <task_kind_messages>: {unit: messages, cap: <number>}  # session-message count cap for this task_kind (subagent dispatches via Task)
    # Bare-number legacy is still accepted (auto-treated as {unit: usd, cap: N}; logs ritsu.budget.legacy_cap_format once per role/task_kind/month):
    <task_kind_legacy>:   <usd_per_instance>
  preferred_models:                # optional; recommended model for this role's tasks
    default: <model_id>
    expensive_tasks: <model_id>    # for blog drafts, deep research
    light_tasks: <model_id>        # for routine reads, classifications
context_budget:
  preamble_tokens: <number>      # max tokens for session-start preamble (CLAUDE.md + role + pillar README)
  working_tokens: <number>       # max accumulated working context before /compact is mandatory
  trigger_compact_at: <0..1>     # fraction of working_tokens at which agent self-invokes /compact
memory_config:
  memory_tool_enabled: <bool>    # Anthropic memory_20250818 tool API; v1.0 default false (Strategy E)
  episodic_recall_enabled: <bool>  # invoke `episodic-recall` skill at task start
  recall_window_days: <int>      # how far back ops.agent_runs is queried
  recall_max_runs: <int>         # how many past runs to load as context (~200 tokens each)
  emit_run_summary: <bool>       # write to ops.run_summaries on completion
  accept_corrections: <bool>     # writes to ops.corrections when founder rejects/edits
notify_on_completion: <bool>     # default Telegram ping after Tier B+ actions
escalation_role: <role slug>     # who to fallback to if this role can't proceed
```

See "Context budget guidance" section below for how to set these values.

Roles are defined as files in `.claude/agents/<role>.md` (Claude Code agent format). This file is the policy reference; the agent file is the runtime instantiation.

---

## The roles, v0.1

These are the initial roles. More will be added as pillars come online. Status: ◐ defined here, ○ runtime file `.claude/agents/<role>.md` not yet created.

### `gps` — General Purpose Steward (Chief of Staff)

The orchestrator. Routes work to specialist roles. The role that interfaces with the founder by default.

```yaml
role: gps
purpose: Receive founder requests, decompose into tasks, route to specialist roles, report back.
home_pillar: cross-cutting
personas_bound: [ceo]    # CEO persona façade resolves to this role (knowledge/workforce-personas.yaml)
permissions:
  tier1_paths:
    - "wiki/**"        # can write reference notes
    - ".archives/**"   # scratch space
    # NO write to 00-core, governance, pillar SOPs, skills, .claude
  tier2_schemas_read:
    - ops.*            # full read of ops state
    - metrics.*        # full read of mirrored product metrics
  tier2_schemas_write:
    - ops.tasks        # to enqueue work for specialists
    - ops.agent_runs   # to log own actions
  tier3_buckets:
    - ops-transcripts (read+write)
    - ops-artifacts (read)
    - ops-agent-logs (write only — append)
  tier4_namespaces:
    - charter_embeddings (read)
    - skills_embeddings (read)
    - transcripts_embeddings (read)
  mcp_servers:
    - github (read+comment, no merge)
    - telegram (send to founder)
    - supabase-ops (limited to schemas above)
  skills:
    - "*"              # may invoke any skill, but specialists do the work
  secrets:
    - ANTHROPIC_API_KEY
    - GITHUB_TOKEN_READONLY
    - TELEGRAM_BOT_TOKEN
    - SUPABASE_OPS_ANON_KEY  # NOT service key
hitl_max_tier: C
budget:
  monthly_token_usd: 200    # GPS thinks a lot, decomposing
  monthly_tool_calls: 5000
economic_budget:
  monthly_cap_usd: 200
  alert_at_pct: 0.80
  escalate_at_pct: 1.00
  hard_block_at_pct: 1.50
  per_task_kind_caps:
    # v1.1 tagged form (capability evolve v1.1, 2026-05-27). USD caps.
    parent-orchestration: {unit: usd, cap: 0.50}    # GPS itself shouldn't cost much per orchestration; subagents do the work
    cost-report-query:    {unit: usd, cap: 0.05}
    # capability book-to-capability (/forge) v0.1 Sprint 2 — gps is /forge's bound role (router, not worker)
    forge-orchestration:  {unit: usd, cap: 0.50}    # /forge loop: assemble + frame + funnel + classify + record (delegates the build to /update//cla)
    forge-funnel-gate:    {unit: usd, cap: 0.15}    # 5-gate selection-funnel (gate-1 distill is the main spend)
    forge-route-classify: {unit: usd, cap: 0.10}    # resolver_find + deterministic route-classify.cjs
    # capability design-system-styling v1.0 (Sprint 3) — cost-bucket ai-ops-design-system
    design-system-build:   {unit: usd, cap: 0.50}    # build --from=<repo> → DESIGN.md generation (LLM token extraction + rationale)
    design-system-resolve: {unit: usd, cap: 0.02}    # --style resolution (mostly deterministic; parse-design-md)
    design-system-add:     {unit: usd, cap: 0.05}    # add <name> (getdesign fetch / metadata register)
    # capability deepask v1.1 (image formats) — gps-bucketed (cost-bucket ai-ops-deepask); gpt-image-2 spend
    deepask-image-gen:     {unit: usd, cap: 0.50}    # /deepask --format=infographics|img-slide image generation; soft monthly ceiling beyond the per-run --max-cost-usd breaker
    # capability image-platform v0.1 (Sprint 2) — cost-bucket ai-ops-image; /image gpt-image-2 spend
    image-gen:     {unit: usd, cap: 0.50}    # /image out-of-band gpt-image-2 generation. ADVISORY (MF1): out-of-band → invisible to the budget hook; the per-run --max-cost-usd breaker is the real enforcement. Hook/cross-run enforcement arrives with a future ops.image_runs /cla extend.
    image-enhance: {unit: usd, cap: 0.10}    # /image --enhance in-session prompt refinement (subscription; hook-enforced — the one /image stage the budget hook sees)
  preferred_models:
    default: claude-sonnet-4-6     # GPS reasoning is cheap; use Sonnet
    expensive_tasks: claude-opus-4-7  # complex multi-pillar decomposition
    light_tasks: claude-haiku-4-5
notify_on_completion: true
escalation_role: founder
```

> **Why GPS doesn't have direct write to most things:** it's a router, not a worker. If GPS itself starts editing 00-core or running migrations, the role boundaries blur. GPS proposes; specialists execute (or PR).

### `growth-orchestrator` — Marketing & Sales lead

```yaml
role: growth-orchestrator
purpose: Plan and execute SEO content, social, email outreach, partnerships, ads. Track funnel.
home_pillars: [01-marketing, 02-sales]    # Updated v1.0.1 (was: 01-growth; split per pillar architecture)
permissions:
  tier1_paths:
    - "01-marketing/**"
    - "02-sales/**"
    - "wiki/competitors/**"
    - "wiki/market/**"
    - ".archives/**"
  tier2_schemas_read:
    - ops.*
    - metrics.*       # needs DAU, signup, conversion data
  tier2_schemas_write:
    - ops.campaigns
    - ops.content_drafts
    - ops.outreach_log
    - ops.agent_runs
  tier3_buckets:
    - ops-artifacts (write — generated content lives here as drafts)
    - ops-agent-logs (write append)
  tier4_namespaces:
    - charter_embeddings (read — needs brand voice + product positioning)
    - transcripts_embeddings (read — for customer language)
  mcp_servers:
    - github (PR creation for blog posts that publish via repo)
    - email-sender (Resend / SendGrid — see SECRETS)
    - twitter (post to @ritsu)
    - linkedin (post to company page)
    - youtube (read analytics; upload requires founder)
    - google-search-console (read)
    - google-analytics (read)
    - posthog (read)
  skills: []   # planned, not yet built — add as `- <name>` when each ships: seo-research, blog-post-drafting, social-post-drafting, email-campaign-design, landing-page-copywriting, ad-copy-iteration
  secrets:
    - ANTHROPIC_API_KEY
    - GITHUB_TOKEN_GROWTH
    - RESEND_API_KEY
    - TWITTER_BOT_TOKEN
    - LINKEDIN_BOT_TOKEN
    - GA_READ_TOKEN
    - POSTHOG_READ_KEY
hitl_max_tier: C   # all multi-recipient sends + public posts gate at C
budget:
  monthly_token_usd: 500
  monthly_tool_calls: 20000
notify_on_completion: true
escalation_role: gps
```

### `support-agent` — Tier-1 customer support

```yaml
role: support-agent
purpose: Handle FAQ-categorized support tickets. Triage and tag non-FAQ for human or escalation.
home_pillar: 05-customer/support     # Updated v1.0.1 (was: 03-delivery)
permissions:
  tier1_paths:
    - "05-customer/support/**"        # PR-only as always
    - "wiki/customer/**"
    - ".archives/**"
  tier2_schemas_read:
    - metrics.product_dau_snapshot   # to check user's account state in ETL'd snapshot
    - ops.*
    # NO direct read of product Supabase — must use mirror
  tier2_schemas_write:
    - ops.support_tickets (state transitions)
    - ops.support_replies
    - ops.agent_runs
  tier3_buckets:
    - ops-artifacts (read — to fetch generated reply drafts)
    - ops-agent-logs (write append)
  mcp_servers:
    - intercom OR helpscout (TBD — depends on chosen support tool)
    - email-sender (single-recipient transactional only)
    - github (read product changelog only)
  skills: []   # planned, not yet built — add as `- <name>` when each ships: faq-classification, reply-drafting, escalation-routing
  secrets:
    - ANTHROPIC_API_KEY
    - SUPPORT_TOOL_API_KEY
    - RESEND_API_KEY (transactional scope only)
hitl_max_tier: C   # non-FAQ replies = C; FAQ-categorized = B
budget:
  monthly_token_usd: 300
  monthly_tool_calls: 30000   # support is high-volume
notify_on_completion: true     # for B-tier FAQ replies, batched daily summary
escalation_role: gps
```

> **Why no direct Product Supabase access:** support might need to look up a user's subscription state. The right answer is to expand the ETL into `metrics.*` to include the relevant fields, not to hand support-agent direct read. Direct read = blast radius up.

### `content-drafter` — Pure-text draft generation

```yaml
role: content-drafter
purpose: Generate text drafts (blog, email, social, support reply, doc) on request. NEVER ships.
home_pillar: cross-cutting (called by other roles)
permissions:
  tier1_paths:
    - ".archives/drafts/**"   # writes here, others read & decide
    - "wiki/**" (read only)
  tier2_schemas_read:
    - ops.content_drafts
    - metrics.product_dau_snapshot (to ground content in real numbers when needed)
  tier2_schemas_write:
    - ops.content_drafts
    - ops.agent_runs
  tier3_buckets:
    - ops-artifacts (write — draft attachments)
    - ops-agent-logs (write append)
  tier4_namespaces:
    - charter_embeddings (read — voice consistency)
  mcp_servers:
    # NONE that can publish. Only read-only research.
    - web-fetch (read public URLs)
  skills: []   # planned, not yet built — add as `- <name>` when each ships: blog-post-drafting, email-drafting, social-post-drafting, support-reply-drafting
  secrets:
    - ANTHROPIC_API_KEY
hitl_max_tier: A    # drafting is internal
budget:
  monthly_token_usd: 400
  monthly_tool_calls: 50000
notify_on_completion: false
escalation_role: gps
```

> **The "never ships" boundary is enforced.** content-drafter has no access to email-sender, Twitter, GitHub merge, or any publishing MCP. Whatever it produces ends up in `.archives/drafts/` or `ops.content_drafts`. Another role with publishing permission must explicitly pick it up and ship.

### `code-reviewer` — Code review on PRs

```yaml
role: code-reviewer
purpose: Review PRs in this repo and the product repo. Suggest changes, flag risks. NEVER merges.
home_pillar: 06-ai-ops    # Updated v1.0.1 (was: 05-ai-ops)
personas_bound: [cto]    # CTO persona façade resolves to this role (knowledge/workforce-personas.yaml)
permissions:
  tier1_paths: []        # read-only across the repo
  tier2_schemas_read:
    - ops.agent_runs (for context on what changed)
  tier2_schemas_write:
    - ops.agent_runs (own log)
  mcp_servers:
    - github (read repos, post review comments — NOT approve, NOT merge)
  skills: []   # planned, not yet built — add as `- <name>` when each ships: code-review, security-review, test-coverage-check
  secrets:
    - ANTHROPIC_API_KEY
    - GITHUB_TOKEN_REVIEWER   # scope: pull_requests:write but not approve/merge
hitl_max_tier: B
budget:
  monthly_token_usd: 200
  monthly_tool_calls: 5000
economic_budget:
  monthly_cap_usd: 200
  alert_at_pct: 0.80
  escalate_at_pct: 1.00
  hard_block_at_pct: 1.50
  per_task_kind_caps:
    # docs-engine capability (Sprint 1 PR-3) — per spec.md §5 cost projection.
    # v1.1 tagged form (capability evolve v1.1, 2026-05-27). USD caps.
    docs-scaffold:               {unit: usd, cap: 0.50}    # one-time Next.js + Fumadocs scaffold
    docs-sync-full-walk:         {unit: usd, cap: 1.00}    # full corpus walk (~215 sources)
    docs-nav-edit:               {unit: usd, cap: 0.10}    # meta.json edit
    # docs-check: $0 (deterministic; no LLM)
    phase-7-implementation-pr:   {unit: usd, cap: 2.00}
notify_on_completion: false
escalation_role: gps
```

### `etl-runner` — Cross-tier data plumbing

```yaml
role: etl-runner
purpose: Run scheduled ETL jobs that move data between tiers. Read product, write ops mirror, rebuild embeddings.
home_pillar: 06-ai-ops (cross-cutting infra)    # Updated v1.0.1 (was: 05-ai-ops)
permissions:
  tier1_paths: []
  tier2_schemas_read:
    - ops.*
    # plus: read-only foreign data wrapper into product.* via dedicated views
  tier2_schemas_write:
    - metrics.*           # the ONLY role that writes to metrics.*
    - ops.agent_runs
    - ops.tier3_index
    # Added v3.0 wiki-sync (migration 00031 — fixes pre-existing drift from v2.0
    # where etl-runner had implicit ops.knowledge_* writes via supabase-ops MCP
    # but never had explicit grant. CTO Phase 5 review flagged.):
    - ops.knowledge_pages          # source RECORD pages + derived entity pages
    - ops.knowledge_links          # regex-extracted + extracted_* link_types
    - ops.knowledge_embeddings     # pgvector embeddings on entity pages
    - ops.knowledge_extractions    # v3.0 citation spine (migration 00031)
    - ops.ingestion_jobs           # pipeline state + parent/child via parent_job_id
  tier3_buckets:
    - ops-transcripts (read+write)
    - ops-artifacts (read)
    - ops-agent-logs (read — to embed)
  tier4_namespaces:
    - "*" (write, rebuild)
  mcp_servers:
    - supabase-ops (full)
    - supabase-product (read-only, via dedicated read role)
    - vector-store (write)
  skills: []   # planned, not yet built — add as `- <name>` when each ships: schema-migration, embedding-rebuild, cross-tier-sync
  secrets:
    - ANTHROPIC_API_KEY
    - SUPABASE_OPS_SERVICE_KEY
    - SUPABASE_PRODUCT_READONLY_ETL_KEY      # the ONE role that holds this
    - VECTOR_STORE_WRITE_KEY
hitl_max_tier: B    # routine ETL is autonomous; schema changes are PR (Tier C)
budget:
  monthly_token_usd: 100   # mostly mechanical
  monthly_tool_calls: 50000
notify_on_completion: false  # logs only; daily summary
escalation_role: gps
```

> **Critical:** etl-runner is the **only** role that holds `SUPABASE_PRODUCT_READONLY_ETL_KEY`. Any other role that needs product data must request it via metrics.* tables that etl-runner populates. This is the single most important access boundary in the company.

### `trust-safety` — T&S triage and policy

```yaml
role: trust-safety
purpose: Review user-flagged content, DMCA notices, ToS violations, hallucination reports. Apply policy.
home_pillar: 07-trust-safety    # Updated v1.0.1 (was: 06-trust-safety)
permissions:
  tier1_paths:
    - "07-trust-safety/**"      # PR-only as always
    - "wiki/customer/**"
    - ".archives/**"
  tier2_schemas_read:
    - ops.*
    - metrics.*
  tier2_schemas_write:
    - ops.ts_cases
    - ops.ts_decisions
    - ops.agent_runs
  tier3_buckets:
    - ops-artifacts (read — flagged content)
    - ops-agent-logs (write append)
  mcp_servers:
    - github (PR for policy updates)
    - email-sender (single-recipient — DMCA counter-notices, ToS notifications)
    - support-tool (to interact with ticket holders)
  skills: []   # planned, not yet built — add as `- <name>` when each ships: dmca-evaluation, tos-violation-classification, copyright-fair-use-analysis, hallucination-incident-triage
  secrets:
    - ANTHROPIC_API_KEY
    - GITHUB_TOKEN_TS
    - SUPPORT_TOOL_API_KEY
    - RESEND_API_KEY (transactional scope)
hitl_max_tier: C    # all user-affecting decisions go to founder for now
budget:
  monthly_token_usd: 150
  monthly_tool_calls: 5000
notify_on_completion: true
escalation_role: founder    # NOT gps; T&S goes direct
```

> T&S has direct escalation to founder, bypassing GPS. T&S decisions affect users' rights — the routing must be unambiguous.

### `backoffice-clerk` — Finance & admin

```yaml
role: backoffice-clerk
purpose: Categorize transactions, draft invoices, prepare tax filings (Vietnam-specific), manage SaaS subscriptions.
home_pillar: 08-finance    # Updated v1.0.1 (was: 04-backoffice; pillar renamed)
permissions:
  tier1_paths:
    - "08-finance/**"           # PR-only
    - ".archives/**"
  tier2_schemas_read:
    - ops.*
  tier2_schemas_write:
    - ops.transactions
    - ops.invoices_drafts
    - ops.expenses
    - ops.agent_runs
  tier3_buckets:
    - ops-artifacts (read+write — receipts, invoices)
    - ops-agent-logs (write append)
  mcp_servers:
    - stripe (READ-ONLY — payments, customers, subs; no charges, no refunds)
    - bank (READ-ONLY — Vietnam banking integration when available)
    - accounting-tool (TBD — Misa, Bravo, or international like Xero)
    - email-sender (single recipient — invoice delivery)
  skills: []   # planned, not yet built — add as `- <name>` when each ships: transaction-categorization, invoice-drafting, vat-classification-vn, vendor-payment-prep
  secrets:
    - ANTHROPIC_API_KEY
    - STRIPE_READ_KEY                  # NOT secret key
    - ACCOUNTING_TOOL_API_KEY
    - RESEND_API_KEY (transactional)
hitl_max_tier: C    # any actual money movement is Tier C or D
budget:
  monthly_token_usd: 100
  monthly_tool_calls: 3000
notify_on_completion: true
escalation_role: founder
```

> **Stripe is READ-ONLY for backoffice-clerk.** Issuing a charge or refund requires founder action via Tier C/D ceremony. This is intentional — money out is the highest-blast-radius action category.

### `founder` (the human role)

```yaml
role: founder
purpose: The human operator. Decision authority for all Tier C/D actions. Source of override.
home_pillar: cross-cutting
permissions:
  tier1_paths: ["**"]      # PR-author
  tier2_schemas_read: "*"
  tier2_schemas_write: "*"
  tier3_buckets: "*"
  tier4_namespaces: "*"
  mcp_servers: "*"
  skills: "*"
  secrets: "*"
hitl_max_tier: D-MAX
budget: unlimited
escalation_role: none
```

The founder role is documented for completeness, but its policy is "everything." The constraints on the founder are organizational, not technical:

- Even the founder should follow the override ceremony when bypassing rules — it creates the audit trail.
- The founder should not directly perform actions that an agent role is configured for; this defeats observability.
- When in doubt, the founder routes through `gps` to maintain pattern consistency.

---

## Context budget guidance

Each role above carries a `context_budget`. This section explains how to set the three numbers.

**Why context budgets exist.** The Anthropic platform provides progressive disclosure (Skills + subagents) and compaction (`/compact`, server-side). The platform CANNOT decide for Ritsu *how aggressively* each role should manage context — that's a Ritsu policy decision. Light, high-volume roles (e.g. `support-agent`) need different settings than heavy, deep-reasoning roles (e.g. `gps`).

**Default budgets by role archetype:**

| Archetype | preamble_tokens | working_tokens | trigger_compact_at | Rationale |
|---|---|---|---|---|
| Orchestrator (gps, growth-orchestrator) | 6000 | 80000 | 0.6 | reads full pillar context; long sessions |
| Specialist drafter (content-drafter) | 3000 | 30000 | 0.7 | narrow task; should compact aggressively |
| High-volume responder (support-agent) | 3000 | 25000 | 0.7 | many short tickets; restart often |
| ETL / data plumbing (etl-runner) | 2000 | 20000 | 0.8 | mostly tool calls; minimal reasoning context |
| T&S triage (trust-safety) | 5000 | 50000 | 0.6 | needs full charter + policy refs |
| Backoffice (backoffice-clerk) | 4000 | 40000 | 0.65 | structured workflows; medium horizon |
| Code reviewer | 4000 | 50000 | 0.65 | reads diffs; medium-long sessions |
| Founder | unlimited | unlimited | 0.85 | human discretion; trigger only at near-limit |

**How `trigger_compact_at` works.** When agent's working context reaches `working_tokens × trigger_compact_at`, the agent self-invokes `/compact` with role-appropriate instructions. Example for a content-drafter at 30000 × 0.7 = 21000 tokens working:

```
/compact Preserve: the active draft, the brand_voice citations,
any open HITL approvals. Drop: tool result transcripts, file-search
intermediate steps.
```

**How to tune.** First-month settings are conservative defaults from this table. After 4 weeks of `ops.agent_runs` data:

- If a role rarely hits `trigger_compact_at`, raise `working_tokens` (allow longer sessions before compact)
- If a role's quality degrades before compact triggers, lower `trigger_compact_at` (compact earlier)
- If preamble is consistently within 50% of `preamble_tokens`, the role isn't reading enough context — investigate
- If preamble blows past `preamble_tokens`, role is reading too much — split context, use subagents

These values are part of governance and change via PR.

## Memory configuration guidance

Each role's `memory_config` sets the role's posture toward learning across sessions. The full architecture is documented in `knowledge/memory-architecture.md` — this section is the operational guidance for filling in role values.

**Strategy E baseline (v1.0):** all roles use episodic recall (Type 2 memory: `ops.agent_runs`); no role uses the memory tool API (Type 3 file memory). Rationale and decision detail are in `_build/notes/problem-4-memory-learning-loop.md`.

**Default values by role archetype:**

| Archetype | memory_tool | recall_window_days | recall_max_runs | emit_run_summary |
|---|---|---|---|---|
| Orchestrator (gps, growth-orchestrator) | false | 90 | 5 | true |
| Specialist drafter (content-drafter) | false | 60 | 3 | true |
| High-volume responder (support-agent) | false | 30 | 5 | true |
| ETL / data plumbing (etl-runner) | false | 7 | 2 | true |
| T&S triage (trust-safety) | false | 180 | 5 | true |
| Backoffice (backoffice-clerk) | false | 90 | 3 | true |
| Code reviewer | false | 60 | 3 | true |
| Founder (human) | n/a | n/a | n/a | n/a |

**`memory_tool_enabled: true` is a D-Std change** — requires PR ceremony plus a documented use case for multi-day file-based state that episodic recall cannot serve. As of v1.0 specification, no role meets this bar. Re-evaluate when Bài #5 (Multi-Agent Orchestration) brainstorm completes.

**`recall_window_days` tuning.** Start with the default. After 4 weeks of `ops.agent_runs` data:
- If a role's recalls consistently surface only the past 7 days of runs (older runs irrelevant), shrink `recall_window_days`
- If recalls return < 3 results often (sparse history), grow `recall_window_days`
- If a role frequently faces novel situations not covered by recalls, recalibrate `recall_max_runs` upward — but cost-watch (each recall costs ~200 tokens × max_runs)

**`recall_max_runs` budget impact.** Each recall row is ~200 tokens including the run_summary. 5 recalls = ~1K tokens added to every task's preamble. Across thousands of tasks/month, this is real cost. Set conservatively; raise only when value is demonstrated.

**`emit_run_summary: true`** is the default for almost all roles. The ~150-token post-hoc summary is what makes episodic recall useful for OTHER sessions later. Disabling it only makes sense for very high-frequency roles where summary cost exceeds learning value (revisit if etl-runner runs > 1000 times/day, for example).

**`accept_corrections: true`** is the default. When the founder rejects or edits an agent's output, the runtime writes the reason to `ops.corrections`. Future recalls surface these. Disable only for roles where correction is meaningless (e.g., pure-read ETL).

These values are part of governance and change via PR.



| Role | T1 write | ops.* read | ops.* write | Product DB | Public post | Money in/out | Max HITL |
|---|---|---|---|---|---|---|---|
| `gps` | wiki only | full | tasks/runs | none | no | no | C |
| `growth-orchestrator` | 01-growth | full | growth tables | metrics only | yes (with HITL) | no | C |
| `support-agent` | 03-delivery | partial | support tables | metrics only | no | no | C |
| `content-drafter` | drafts only | partial | drafts | none | **never** | no | A |
| `code-reviewer` | none | partial | runs only | none | no | no | B |
| `etl-runner` | none | full | metrics+sync | **read only** | no | no | B |
| `trust-safety` | 06-T&S | full | TS tables | metrics only | direct comms | no | C |
| `backoffice-clerk` | 04-back | partial | finance tables | none | no | **read-only** | C |
| `founder` | all | all | all | all | all | all | D-MAX |

> The **only** role with any access to product Supabase is `etl-runner`, and that access is read-only via dedicated read keys. Every other role gets product data through `metrics.*` tables. This is the firewall.

## Role lifecycle

When a new role is needed:

1. Open a PR adding to this file (Tier C action).
2. Add the runtime config in `.claude/agents/<role>.md`.
3. If new secrets needed, update `governance/SECRETS.md`.
4. If new MCP servers needed, update `mcp/servers.yaml` (Tier C action).
5. If new tables/buckets needed, update `knowledge/manifest.yaml` and `knowledge/schemas/`.
6. Founder approval required (HITL Tier C).

When deprecating a role:

1. Remove from active rotation by editing `.claude/agents/<role>.md` to `status: deprecated`.
2. **Do not delete** for ≥ 90 days — past `agent_runs` reference the role; deletion breaks audit traceability.
3. After 90 days, archive the agent file to `.archives/deprecated-roles/<role>-<date>.md` and remove from active config.

## When a role hits its budget

Per `knowledge/economic-architecture.md` Axis 2, the `pre-llm-call-budget` hook enforces a 3-tier escalation against `economic_budget.monthly_cap_usd`:

- **80% (`alert_at_pct`)** — first breach posts Telegram heads-up: "Growth-orchestrator at 80% monthly budget ($240 of $300). 6 days remain in month." Subsequent calls in the same month allowed without re-alerting (no notification fatigue).

- **100% (`escalate_at_pct`)** — every additional LLM call is HELD; founder approval required via Telegram. Founder may approve individually, or temporarily raise the cap for the rest of the month via inline command.

- **150% (`hard_block_at_pct`)** — hard ceiling. No founder approval option from the hook itself. To exceed 150%, founder must open a PR to this file (Tier C ceremony per HITL.md) raising `monthly_cap_usd`. This protects against approval fatigue and forces investigation when usage is structurally off-target.

Per-task-kind soft caps (`per_task_kind_caps`) act independently: even if monthly budget is healthy, a single task instance whose estimated cost exceeds its task_kind cap will escalate. This catches the "single bug looped task" failure mode.

Budgets reset on the 1st of each month at 00:00 UTC.

For ad-hoc legitimate spikes (launch event, content campaign), founder may pre-raise the cap via Tier C PR before the spike starts. This is preferred over reactive approvals during the spike.

The 30-day calibration period (post-v1.0 launch) sets enforcement to alert-only initially. Full 3-tier enforcement activates day 14. See `knowledge/economic-architecture.md` "30-day calibration discipline" for the exact schedule.

## v1.0.1 pillar architecture roles (added 2026-05-15)

Added per pillar architecture v1.0.1 restructure (`.archives/pillars/PLAN.md`). Detailed role definitions and full permissions matrices to be authored as each pillar's first SOPs land. These stubs establish the role contract.

### `cofounder` (the second human role)

```yaml
role: cofounder
purpose: Co-equal operator alongside founder. Same permissions as founder for all pillars.
home_pillar: cross-cutting
permissions:
  tier1_paths: ["**"]
  tier2_schemas_read: "*"
  tier2_schemas_write: "*"
  tier3_buckets: "*"
  tier4_namespaces: "*"
  mcp_servers: "*"
  skills: "*"
  secrets: "*"
hitl_max_tier: D-MAX        # Per CEO Finding 8: cofounder is co-equal founder
budget: unlimited
escalation_role: founder    # for tie-breaks when both online
```

> **HITL note:** Either founder OR cofounder may issue Tier C/D-Std overrides. D-MAX requires both magic phrase AND PR `/founder-approved-irreversible` from either GitHub account, plus the standard 1-hour cooldown.

### `gtm-orchestrator` (NEW v1.0.1)

```yaml
role: gtm-orchestrator
purpose: Drive customer funnel orchestration toward "100 paying who love" (PMF goal). Compose Marketing+Sales+Product+Customer modules.
home_pillar: 03-gtm
personas_bound: [cgo]    # CGO persona façade resolves to this role (knowledge/workforce-personas.yaml)
permissions:
  tier1_paths: ["03-gtm/**", "wiki/competitors/**", ".archives/**"]
  tier2_schemas_read: [ops.*, metrics.*]
  tier2_schemas_write: [ops.campaigns, ops.tasks, ops.agent_runs]
hitl_max_tier: C            # public posts + multi-recipient sends gate at C
escalation_role: founder
```

### `product-orchestrator` (NEW v1.0.1)

```yaml
role: product-orchestrator
purpose: Own weekly product review, feature prioritization, wedge-discovery audits. Drives 04-product/.
home_pillar: 04-product
personas_bound: [cpo]    # CPO persona façade resolves to this role (knowledge/workforce-personas.yaml)
permissions:
  tier1_paths: ["04-product/**", ".archives/**"]
  tier2_schemas_read: [ops.*, metrics.product_dau_snapshot]
  tier2_schemas_write: [ops.tasks, ops.agent_runs]
hitl_max_tier: C
escalation_role: gps
```

### `customer-lead` (NEW v1.0.1)

```yaml
role: customer-lead
purpose: Own weekly customer health review across success/onboarding/support/retention/feedback. Drives 05-customer/.
home_pillar: 05-customer
permissions:
  tier1_paths: ["05-customer/**", "wiki/customer/**", ".archives/**"]
  tier2_schemas_read: [ops.*, metrics.product_dau_snapshot, public.mv_customer_360]
  tier2_schemas_write: [ops.tasks, ops.agent_runs]
hitl_max_tier: C
escalation_role: gps
```

### `cs-coach` (NEW v1.0.1)

```yaml
role: cs-coach
purpose: Activation funnel ownership — surfaces stuck users, runs Collison install protocol, codifies onboarding scripts.
home_pillar: 05-customer/success
permissions:
  tier1_paths: ["05-customer/success/**", "05-customer/onboarding/**", ".archives/**"]
  tier2_schemas_read: [ops.*, metrics.product_dau_snapshot]
  tier2_schemas_write: [ops.tasks, ops.agent_runs]
hitl_max_tier: B            # routine outreach = B; new onboarding script = C
escalation_role: customer-lead
```

### `retention-watcher` (NEW v1.0.1)

```yaml
role: retention-watcher
purpose: Monitor silence-after-activation; trigger reactivation flows; escalate at-risk cohorts.
home_pillar: 05-customer/retention
permissions:
  tier1_paths: ["05-customer/retention/**", ".archives/**"]
  tier2_schemas_read: [ops.*, metrics.product_dau_snapshot]
  tier2_schemas_write: [ops.tasks, ops.agent_runs]
hitl_max_tier: B
escalation_role: customer-lead
```

### `escalation-router` (NEW v1.0.1)

```yaml
role: escalation-router
purpose: Decide which support tickets reach founder vs which stay in AI handling. Implements escalation criteria from SOP-CUSTOMER-012.
home_pillar: 05-customer/support
permissions:
  tier1_paths: ["05-customer/support/**", ".archives/**"]
  tier2_schemas_read: [ops.*]
  tier2_schemas_write: [ops.tasks, ops.support_tickets, ops.agent_runs]
hitl_max_tier: A            # routing decisions are reversible
escalation_role: customer-lead
```

### `feedback-aggregator` (NEW v1.0.1)

```yaml
role: feedback-aggregator
purpose: Pull NPS, cancel-flow feedback, user interviews, social mentions into product feedback pipeline.
home_pillar: 05-customer/feedback-and-research
permissions:
  tier1_paths: ["05-customer/feedback-and-research/**", ".archives/**"]
  tier2_schemas_read: [ops.*]
  tier2_schemas_write: [ops.tasks, ops.agent_runs]
hitl_max_tier: A
escalation_role: customer-lead
```

### `founder-coach` (NEW v1.0.1)

```yaml
role: founder-coach
purpose: Surface top-idea drift in founder's attention, prompt weekly review, run Nile Perch detection.
home_pillar: 09-founder/cognition
permissions:
  tier1_paths: ["09-founder/**", ".archives/**"]
  tier2_schemas_read: [ops.*, ops.attention_log]
  tier2_schemas_write: [ops.attention_log, ops.tasks, ops.agent_runs]
hitl_max_tier: A
escalation_role: founder
```

### `hitl-router` (NEW v1.0.1)

```yaml
role: hitl-router
purpose: Telegram bot logic for tier B/C/D approvals. Routes messages, validates magic-phrase format, enforces D-MAX cooldown.
home_pillar: 09-founder/hitl-flow
permissions:
  tier1_paths: ["09-founder/hitl-flow/**", ".archives/**"]
  tier2_schemas_read: [ops.*]
  tier2_schemas_write: [ops.hitl_runs, ops.agent_runs]
hitl_max_tier: A            # the router itself routes; it doesn't authorize
escalation_role: founder
```

### `health-tracker` (NEW v1.0.1)

```yaml
role: health-tracker
purpose: Weekly founder energy tracking, mandatory rest enforcement, burnout early-warning. 1-person company = 1-person SPOF.
home_pillar: 09-founder/health
permissions:
  tier1_paths: ["09-founder/health/**", ".archives/**"]
  tier2_schemas_read: [ops.*, ops.attention_log]
  tier2_schemas_write: [ops.tasks, ops.agent_runs]
hitl_max_tier: A
escalation_role: founder
```

### `metrics-curator` (NEW v1.0.1)

```yaml
role: metrics-curator
purpose: Own KPI registry, weekly dashboard refresh, KPI ownership map (knowledge/kpi-ownership.yaml).
home_pillar: 10-metrics/kpi-registry
permissions:
  tier1_paths: ["10-metrics/**", "knowledge/kpi-ownership.yaml", ".archives/**"]
  tier2_schemas_read: [ops.*, metrics.*]
  tier2_schemas_write: [ops.kpi_snapshots, ops.tasks, ops.agent_runs]
hitl_max_tier: B            # routine dashboards = B; new alert rule = C
escalation_role: founder
```

### `alert-router` (NEW v1.0.1)

```yaml
role: alert-router
purpose: Receive ops.alerts rows, route per knowledge/alert-rules.yaml severity. P0 → Telegram immediate; P1 → daily digest.
home_pillar: 10-metrics/alerting
permissions:
  tier1_paths: ["10-metrics/alerting/**", "knowledge/alert-rules.yaml", ".archives/**"]
  tier2_schemas_read: [ops.alerts, ops.kpi_snapshots]
  tier2_schemas_write: [ops.alerts (state transitions), ops.agent_runs]
  mcp_servers: [telegram (send to founder)]
hitl_max_tier: A
escalation_role: metrics-curator
```

### `experiment-analyst` (NEW v1.0.1)

```yaml
role: experiment-analyst
purpose: Analyze A/B experiments — significance + lift calculation, stop-and-decide protocol. Called by Product/GTM.
home_pillar: 10-metrics/experiment-measurement
permissions:
  tier1_paths: ["10-metrics/experiment-measurement/**", ".archives/**"]
  tier2_schemas_read: [ops.*, metrics.*]
  tier2_schemas_write: [ops.tasks, ops.agent_runs]
hitl_max_tier: B
escalation_role: metrics-curator
```

### `eval-evo-orchestrator` (NEW 2026-05-22 — capability `evolve` v1.0)

```yaml
role: eval-evo-orchestrator
purpose: Run /evolve iteration loops on ritsu-works leaf entities (skill, command, agent, hook, SOP). Score → propose → apply → re-score → keep-or-revert per Karpathy K4. Goodhart-mitigated via 4-layer stack.
home_pillar: 06-ai-ops/eval-evo
permissions:
  tier1_paths:
    - "06-ai-ops/skills/<entity-name>/**"        # Tier B leaf-entity edits
    - ".claude/commands/<entity-name>.md"        # Tier B leaf-entity edits
    - ".claude/agents/<entity-name>.md"          # Tier B leaf-entity edits
    - ".archives/eval-evo-runs/**"               # local-only run artifacts
    # Tier C+ entities (hooks, SOPs, Tier 1) go through PR path; not direct write
  tier2_schemas_read: [ops.*, metrics.product_dau_snapshot]
  tier2_schemas_write: [ops.agent_runs, ops.run_summaries, ops.events, ops.corrections]
  mcp_servers:
    - supabase-ops      # for ops.* writes
    # codex CLI subprocess used for outside-voice (Tier C+ only); separate from MCP
  skills:
    - eval-evo/orchestrator
    - eval-evo/score-{skill,command,agent,hook,sop}
    - eval-evo/propose-improvement
    - eval-evo/install-improvement
    - eval-evo/outside-voice
    - episodic-recall  # cross-iter memory load
  secrets:
    - ANTHROPIC_API_KEY
    - SUPABASE_ACCESS_TOKEN
    # OPENAI_API_KEY consumed by codex CLI binary (not by this role directly)
hitl_max_tier: C        # hooks + sops require PR (Tier C). leaf types are Tier B.
budget:
  monthly_token_usd: 50  # legacy field
  monthly_tool_calls: 5000
economic_budget:
  monthly_cap_usd: 50
  alert_at_pct: 0.80
  escalate_at_pct: 1.00
  hard_block_at_pct: 1.50
  per_task_kind_caps:
    # v1.0 task kinds (capability evolve v1.0) — migrated to tagged form in v1.1.
    eval-evo-iteration:                  {unit: usd, cap: 0.50}    # one full iter: memory + judge + propose + install + drift
    eval-evo-evaluation:                 {unit: usd, cap: 0.10}    # judge persona dispatch
    eval-evo-outside-voice:              {unit: usd, cap: 0.30}    # codex / subagent independent challenge (Tier C+ only)
    # v1.1 task kinds (capability evolve v1.1 SkillOpt integration, 2026-05-27).
    # Unit: session-message counts (subagent dispatches tagged with this task_kind).
    # See wiki/capabilities/evolve/spec.md §19.9 for derivation.
    eval-evo-skillopt-rollout-batch:     {unit: messages, cap: 25}     # per-iteration parallel rollouts via skillopt-target-rollout
    eval-evo-skillopt-reflect-batch:     {unit: messages, cap: 4}      # per-iteration reflect dispatches via skillopt-optimizer-reflect
    eval-evo-skillopt-val-gate-batch:    {unit: messages, cap: 25}     # validation gate rollouts on held-out split
    eval-evo-skillopt-meta:              {unit: messages, cap: 10}     # meta-skill updates (optimizer-side accumulated lessons)
    eval-evo-skillopt-iteration-total:   {unit: messages, cap: 500}    # hard ceiling per /evolve skillopt run
  preferred_models:
    default: claude-sonnet-4-6    # proposer + orchestrator
    expensive_tasks: claude-opus-4-7   # not used in v1.0; reserved
    light_tasks: claude-haiku-4-5      # not used in v1.0; reserved
context_budget:
  preamble_tokens: 3000
  working_tokens: 30000
  trigger_compact_at: 0.7
memory_config:
  memory_tool_enabled: false  # episodic recall via ops.run_summaries
  episodic_recall_enabled: true
  recall_window_days: 90
  recall_max_runs: 3
  emit_run_summary: true
  accept_corrections: true   # ops.corrections feeds back as negative signal
notify_on_completion: false  # in-session command; founder sees output live
escalation_role: founder
```

> Per capability `evolve` v1.0 (spec: `wiki/capabilities/evolve/spec.md`).
> Honest throughput: ~20-25 /evolve runs/month at $50 cap. Falsifiable
> day-30 efficacy gate at `scripts/eval-evo/calibrate-efficacy.cjs`.
> Hold-out validation at `scripts/eval-evo/playbook-validate.cjs`.

### `entity-update-orchestrator` (NEW 2026-05-26 — capability `update` v1.0)

```yaml
role: entity-update-orchestrator
purpose: Run /update <type> <name> --refs=<refs> refs-driven entity refresh loops on ritsu-works leaf entities (skill | command | agent | sop). Companion to eval-evo-orchestrator: /update ingests external truth via refs; /evolve self-improves via memory. Both share 100% infrastructure (universal lock, ops.evolve_extractions citation spine, eval-evo skill suite).
home_pillar: 06-ai-ops/skill-library
permissions:
  tier1_paths:
    - "06-ai-ops/skills/<entity-name>/**"   # leaf skill edits (Tier B per playbook allowed_paths)
    - ".claude/commands/<entity-name>.md"   # leaf command edits (Tier B)
    - ".claude/agents/<entity-name>.md"     # leaf agent edits (Tier B)
    - "06-ai-ops/sops/<entity-name>/**"     # leaf SOP edits (Tier C — sops are higher stakes)
    # v1.1 (Sprint 1 + Sprint 2) additions:
    - ".claude/hooks/<entity-name>.md"      # v1.1 hook edits (Tier C minimum + D-Std magic-phrase ceremony)
    - "<pillar>/README.md"                  # v1.1 pillar README only
    - "<pillar>/CLAUDE.md"                  # v1.1 pillar CLAUDE.md only
    # v1.1.1 additions — Tier 1 content fixes via D-Std ceremony:
    - "00-core/**"                          # v1.1.1 tier1-file (D-Std; PR-only)
    - "governance/HITL.md"                  # v1.1.1 tier1-file (HITL refinements; D-Std)
    - "governance/ROLES.md"                 # v1.1.1 tier1-file
    - "governance/IDENTITY.md"              # v1.1.1 tier1-file
    - "governance/BUDGET.md"                # v1.1.1 tier1-file
    - "knowledge/manifest.yaml"             # v1.1.1 tier1-file (content fixes only; schema changes still /cla extend)
    - "knowledge/cross-tier-invariants.yaml"  # v1.1.1 tier1-file
    # STILL REFUSED even under D-Std (require D-MAX or separate discipline):
    #   governance/SECRETS.md                — D-MAX always
    #   supabase/migrations/**               — schema discipline (/cla propose)
    #   .mcp.json                            — D-MAX (security-critical)
    # File mode (v1.1 Sprint 2): path-tier classified via knowledge/update-file-paths.yaml.
    # Concrete glob list lives there (Tier 1 paths refused; pillar docs Tier C; tests/scripts Tier B).
    - ".archives/update-runs/**"            # local-only run artifacts
    # Tier 1 entities (00-core/, governance/, supabase/migrations/, .mcp.json) STILL refused;
    # founder must use /cla extend or direct PR per HITL.md.
  tier2_schemas_read: [ops.*, metrics.product_dau_snapshot]
  tier2_schemas_write:
    - ops.agent_runs       # own log (agent_slug='update')
    - ops.run_summaries
    - ops.events
    - ops.corrections      # founder rejection feedback loop
    - ops.evolve_extractions  # citation spine writes (distill phase)
    - ops.entity_edit_locks   # acquire/release via the universal lock functions
    - ops.audit_log        # Tier C audit override events (--force-pr, --skip-drift-check, --allow-untrusted-refs)
  mcp_servers:
    - supabase-ops         # for ops.* writes
    - gbrain               # READ-only (mcp__gbrain__search for prior framings; ~$0.005/run); NO writes v1.0
  skills:
    - entity-update/orchestrator
    - eval-evo/distill-from-refs    # /update Phase 0.5 (Sprint 2)
    - eval-evo/review-extractions   # /update review verb (Sprint 2)
    - eval-evo/test-gen             # /update Phase 6 (Sprint 3; All-Edge-Cases-Test verbatim)
    - eval-evo/propose-improvement  # /update Phase 3 (Sprint 1 extension: extractions_context)
    - eval-evo/install-improvement  # /update Phase 4
    - eval-evo/score-{skill,command,agent,sop}   # Phase 2 + 5 (pre + post scoring; K4 ratchet)
    - episodic-recall
  secrets:
    - ANTHROPIC_API_KEY
    - SUPABASE_ACCESS_TOKEN
    # OPENAI_API_KEY NOT used (distill uses Anthropic Haiku/Sonnet only)
hitl_max_tier: C        # sops + agent type structural diffs require Tier C; trivial/medium skill/command apply in-place
budget:
  monthly_token_usd: 30  # legacy field
  monthly_tool_calls: 3000
economic_budget:
  monthly_cap_usd: 30
  alert_at_pct: 0.80
  escalate_at_pct: 1.00
  hard_block_at_pct: 1.50
  per_task_kind_caps:
    # v1.1 tagged form (capability evolve v1.1, 2026-05-27). All USD caps; no
    # message-count units in entity-update flow.
    # Distill phase (per spec §8). 4 task_kinds matching the 4 entity types.
    entity-update-distill-skill:        {unit: usd, cap: 0.20}
    entity-update-distill-command:      {unit: usd, cap: 0.15}
    entity-update-distill-agent:        {unit: usd, cap: 0.20}
    entity-update-distill-sop:          {unit: usd, cap: 0.30}
    # v1.1 distill caps (Sprint 1 + Sprint 2 + Sprint 3)
    entity-update-distill-hook:         {unit: usd, cap: 0.20}    # v1.1 — hook markdown ≈ skill density
    entity-update-distill-pillar:       {unit: usd, cap: 0.30}    # v1.1 — pillar README/CLAUDE can be dense
    entity-update-distill-file:         {unit: usd, cap: 0.30}    # v1.1 — generic file mode; Sonnet
    entity-update-distill-workflow:     {unit: usd, cap: 0.25}    # v1.1 stub (REFUSED at runtime until workflows/ ships)
    entity-update-distill-tier1-file:   {unit: usd, cap: 0.30}    # v1.1.1 — 00-core/, governance/, knowledge/manifest+invariants under D-Std ceremony
    # Score / propose / test-gen are entity-type-agnostic (single cap each).
    entity-update-score-any:            {unit: usd, cap: 0.15}
    entity-update-propose-any:          {unit: usd, cap: 0.25}
    entity-update-test-gen-any:         {unit: usd, cap: 0.25}
    # Path classify is deterministic (no LLM call).
    entity-update-path-classify:        {unit: usd, cap: 0.00}    # v1.1 — Sprint 2 (file + folder)
    # Hard total cap per /update run (sum of all phases).
    entity-update-iteration:            {unit: usd, cap: 1.50}
  preferred_models:
    default: claude-sonnet-4-6        # distill (skill/agent/sop), score, propose
    light_tasks: claude-haiku-4-5     # distill (command), classify-diff prompts (none in v1.0)
context_budget:
  preamble_tokens: 3000
  working_tokens: 30000
  trigger_compact_at: 0.7
memory_config:
  memory_tool_enabled: false  # episodic recall via ops.run_summaries (Strategy E)
  episodic_recall_enabled: true
  recall_window_days: 90
  recall_max_runs: 3
  emit_run_summary: true
  accept_corrections: true   # ops.corrections from /update reject feeds back as negative signal
notify_on_completion: false  # in-session command; founder sees output live
escalation_role: founder
```

> Per capability `update` v1.0 (spec: `wiki/capabilities/update/spec.md`
> after Phase 8 promotion; draft `.archives/cla/update/spec.md`).
> Tier C decision: `ops.decisions[a683a371-0611-49c7-9650-53503027d60e]`.
> Projected throughput: 15-30 /update runs/month at $30 cap. Honest median
> per-run cost: ~$0.70 (distill $0.10-0.20 + score + propose + test-gen).
> v1.0 scope: 4 entity types (skill/command/agent/sop). Deferred to v1.1+:
> hook (D-Std safety), pillar/folder/workflow (semantic gaps).

> **Default permission posture for new roles (per CEO review Finding 6):** read-only across pillar boundaries; explicit write only to own pillar's `ops.*` tables. Cross-pillar writes require explicit grant in role definition above (eg metrics-curator writes to `ops.kpi_snapshots` because that IS the metrics pillar's domain table).

---

## v1.1 gbrain integration (added 2026-05-25 — capability `gbrain-operational-brain` v1.0)

> Tier C decision id `5014456d-7526-4ba2-9c58-005166193864`. Adds 1 NEW role (`gbrain-maintainer`) and a `brain_affinity` matrix mapping all 24 existing roles to gbrain access levels, plus `mcp_servers: [gbrain]` grants for 6 WRITE-enabled roles. Per-role definitions above remain authoritative for everything else; this section is the v1.1 ADDITIVE delta for gbrain access only. Pillar spec: `wiki/capabilities/gbrain-operational-brain/spec.md` (after Phase 8 promotion; currently `.archives/cla/gbrain-operational-brain/spec.md`).

### NEW role: `gbrain-maintainer`

```yaml
role: gbrain-maintainer
purpose: Nightly gbrain dream cycle (dedup, citation fix, contradiction detection, synthesis). Maintain brain health autonomously.
home_pillar: 06-ai-ops/gbrain
personas_bound: []      # autonomous worker; no C-suite persona binding
permissions:
  tier1_paths: []
  tier2_schemas_read:
    - ops.cost_attributions (own writes)
    - ops.agent_runs (own writes only)
  tier2_schemas_write:
    - ops.agent_runs (own log)
    - ops.cost_attributions (cost_bucket: gbrain.gbrain-maintainer.*)
  tier3_buckets: []
  tier4_namespaces:
    - gbrain (full read+write via MCP)
  mcp_servers:
    - gbrain (full)
  skills:
    - brain-write-discipline
    - brain-promotion (read-only consumer of promotion candidates)
  secrets:
    - ANTHROPIC_API_KEY         # for synthesize phase
    - OPENAI_API_KEY            # for text-embedding-3-small regenerate
hitl_max_tier: A                # autonomous (nightly cron only)
budget:
  monthly_token_usd: 30
  monthly_tool_calls: 200
economic_budget:
  monthly_cap_usd: 30
  alert_at_pct: 0.80
  escalate_at_pct: 1.00
  hard_block_at_pct: 1.50
  per_task_kind_caps:
    # v1.1 tagged form (capability evolve v1.1, 2026-05-27). USD caps.
    dream-cycle-dedup:                   {unit: usd, cap: 0.20}
    dream-cycle-citation-fix:            {unit: usd, cap: 0.15}
    dream-cycle-contradiction-detection: {unit: usd, cap: 0.30}
    dream-cycle-synthesis:               {unit: usd, cap: 0.50}
context_budget:
  preamble_tokens: 2000
  working_tokens: 15000
  trigger_compact_at: 0.80
memory_config:
  memory_tool_enabled: false
  episodic_recall_enabled: false  # dream cycle is per-night, no cross-night learning needed v1.0
  recall_window_days: 0
  recall_max_runs: 0
  emit_run_summary: true
  accept_corrections: false       # no founder corrections expected; pure mechanical brain ops
notify_on_completion: false       # silent nightly; only failure → Tier B alert via cron handler
escalation_role: founder
```

### `brain_affinity` matrix (24 existing roles + new role = 25 total)

Field semantics:
- `high` — role REGULARLY reads + writes brain
- `medium` — role occasionally reads brain; may write in narrow circumstances
- `low` — role rarely reads brain; never writes
- `none` — role does not access brain (etl-runner case)

| Role | brain_affinity | mcp_servers gbrain grant | Per-role gbrain monthly cap |
|---|---|:---:|---|
| `founder` | high | ✅ (subject to global $100 cap) | unlimited |
| `cofounder` | high | ✅ (subject to global $100 cap) | unlimited |
| `gbrain-maintainer` (NEW) | high | ✅ | $30 |
| `customer-lead` | high | ✅ | $10 |
| `feedback-aggregator` | high | ✅ | $15 |
| `gtm-orchestrator` | high | ✅ | $10 |
| `cs-coach` | high | ✅ | $10 |
| `product-orchestrator` | high | ✅ | $15 |
| `eval-evo-orchestrator` | medium | ✅ | $5 |
| `founder-coach` | high | ❌ (READ-only via MCP read tools) | $3 |
| `gps` | medium | ❌ | $3 |
| `support-agent` | medium | ❌ | $3 |
| `content-drafter` | low | ❌ | $3 |
| `trust-safety` | low | ❌ | $3 |
| `backoffice-clerk` | low | ❌ | $3 |
| `code-reviewer` (@cto) | low | ❌ | $3 |
| `growth-orchestrator` | medium | ❌ | $3 |
| `hitl-router` | low | ❌ | $3 |
| `health-tracker` | low | ❌ | $3 |
| `retention-watcher` | medium | ❌ | $3 |
| `escalation-router` | low | ❌ | $3 |
| `metrics-curator` | medium | ❌ | $3 |
| `alert-router` | low | ❌ | $3 |
| `experiment-analyst` | low | ❌ | $3 |
| `etl-runner` | **none** | ❌ | $0 |

**Total advisory caps:** ~$146/mo (sum). **HARD global cap:** $100/mo enforced by `.mcp.json` wrapper `scripts/pre-budget-check.sh` per Hard-cap Option B graceful degrade. See `knowledge/economic-architecture.md` v1.1 addendum.

### `mcp_servers: [gbrain]` grant expansion

The 8 roles with `mcp_servers: [gbrain]` grant (gbrain-maintainer + founder + cofounder + 5 customer-facing WRITE-enabled + product-orchestrator + eval-evo-orchestrator) gain full MCP tool access subject to per-tool HITL tier (see `governance/HITL.md` Appendix A). The 17 READ-only roles can invoke gbrain READ tools (Tier A: search, get_page, list_pages, traverse_graph, find_*, code_*, etc.) without an explicit `mcp_servers` grant — READ tools have permissive default allowlists per `knowledge/mcp-tools.yaml`. WRITE tools (Tier B/C/D-Std) require the explicit role allowlist match.

### Activation

These role configurations are CONTRACT-level (this file is policy). The runtime `.claude/agents/<role>.md` config files are updated in Sprint 2 PR to mirror this contract. Until Sprint 2 lands, the contract is canonical and the runtime is being aligned. L2 validator `gbrain-l2-role-allowlist-consistency` (registered in `knowledge/cross-tier-invariants.yaml`) catches drift between this contract and `knowledge/mcp-roles.yaml`.

---

## v1.2 analytics integration (added 2026-06-03 — capability `product-db-readonly-access` Sprint 2)

> Tier-C decision `0647e301-4ad2-495f-806e-d17c3b130072`. Door 2: read-only ops access to **pseudonymized** Product behavioral data through the isolated `ritsu-analytics` project + the `supabase-analytics` MCP (Sprint 1, PR #220). This section is the v1.2 ADDITIVE delta for analytics access only. Contract: `knowledge/analytics-sync-contract.yaml`; runtime: `SOP-AIOPS-009`.

### NEW DB role (not an agent role): `analytics_reader`

`analytics_reader` is a **Postgres role on ritsu-analytics**, not a workforce agent role — so it has no `.claude/agents/<role>.md`. It is the principal the `supabase-analytics` MCP connects as: `LOGIN`, `SELECT` on `live.*` ONLY (no writes, no `ext`/`staging`/FDW, no PII), plus role-level `default_transaction_read_only=on` + `statement_timeout`. The DB role IS the security boundary (mirror-image of supabase-ops, which fronts `service_role` with an app-layer guard). Its connection string is `ANALYTICS_READER_DB_URL` (local-only `.env.local`; documented in `governance/SECRETS.md` — founder D-MAX follow-up).

### `analytics_affinity` — which workforce roles may query the analytics MCP

Default-deny. The consumer allowlist is the SAME 6 roles encoded in `mcp-server-analytics/src/governance/role-allowlist.ts` (kept in lockstep by the L2 invariant `analytics-allowlist-no-drift`):

| Role | analytics MCP access | Rationale |
|---|---|---|
| `founder` / `cofounder` | ✅ query + list_tables | full operator access |
| `customer-lead` | ✅ | retention / activation / churn questions |
| `product-orchestrator` | ✅ | feature-usage / wedge / behavioral analysis |
| `gtm-orchestrator` | ✅ | funnel / cohort / unit-economics |
| `feedback-aggregator` | ✅ | behavioral signal for the feedback pipeline |
| **all other roles** | ❌ default-deny | not granted; the MCP returns `role_not_allowed` |

The 17 READ-only-elsewhere roles get NO analytics access (default-deny is the point — product-derived behavioral data is more sensitive than ops state). `etl-runner` is **excluded** (it already holds the Product read key; analytics is a different, narrower surface).

### `mcp_servers: [supabase-analytics]` grant

The 6 allowlisted roles above gain `supabase-analytics` MCP access. All tools are read-only (Tier A): `query` (SELECT over `live.*`), `list_tables`. The L0 firewall (`pre-tool-supabase-product.cjs` v1.2) already treats `mcp__supabase-analytics__*` as `safe-mcp`. No WRITE tools exist on this MCP.

### Activation

CONTRACT-level (this file is policy). Runtime gate is `mcp-server-analytics/src/governance/role-allowlist.ts`; the L2 validator `validate-analytics-readonly.cjs` + invariant `analytics-allowlist-no-drift` catch drift between this contract and that runtime. The `.mcp.json` registration (D-MAX) lands in the Sprint 2 PR.

---

## What this file is NOT

- Not the runtime config — that's `.claude/agents/<role>.md`
- Not the secret store — values live in the secret manager (see `SECRETS.md`)
- Not the workflow definition — that's `workflows/`
- Not the skill implementation — that's `skills/<skill>/SKILL.md`

This file is the **policy contract**. The runtime artifacts must conform to it.

---

*A role is a promise. It says "this is exactly what I am allowed to do — and nothing more." Without that promise written down, every agent is a god, and gods make for terrible employees.*
