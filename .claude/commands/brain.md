---
name: brain
description: |
  Founder-facing surface for gbrain operational brain (Type 4 Semantic
  Memory). Thin orchestrator over `mcp__gbrain__*` MCP tools. 10 subcommands
  covering search/read/write/link/promote/status/doctor/cost — pattern
  parallel to /wiki and /cla.

  Use when you want to: ask the brain a question, write a page, link two
  entities, see what's mature for weekly promotion, check spend vs $100/mo
  cap, or run health check.

  Capability: gbrain-operational-brain v1.0.1 (Sprint 7 follow-up filling
  the UX gap caught by founder feedback post-v1.0 ship).
---

# /brain — Operational Brain Interface

> Project-scoped command for ritsu-works. Front-end for gbrain (capability `gbrain-operational-brain` v1.0). Thin orchestrator — every subcommand maps directly to one or more `mcp__gbrain__*` MCP tools, with founder-friendly syntax + defaults + Tier B HITL discipline per `SOP-AIOPS-GBRAIN-001-write-discipline`.

## Subcommands

### Read (Tier A — autonomous, log to ops.cost_attributions)

| Invocation | Maps to | Output |
|---|---|---|
| `/brain` (no args) | help menu | Lists all subcommands + current spend/cap status |
| `/brain search "<query>"` | `mcp__gbrain__search` | Top 5 semantic matches with snippet + slug |
| `/brain page <slug>` | `mcp__gbrain__get_page` | Full page body + frontmatter |
| `/brain list [type=<page_type>] [state=<state>]` | `mcp__gbrain__list_pages` | Paginated list (default 20); filter by page_type (people/companies/meetings/ideas/concepts/decisions) and/or state (draft/published/mature/etc.) |
| `/brain backlinks <slug>` | `mcp__gbrain__get_backlinks` | All pages linking TO this slug |
| `/brain graph <slug> [--depth=2]` | `mcp__gbrain__traverse_graph` | Local graph traversal from anchor slug |
| `/brain experts "<topic>"` | `mcp__gbrain__find_experts` | People pages with most expertise on topic |
| `/brain status` | composed: `get_brain_info` + cost RPC + ops.kpi_snapshots | Page count + recent writes + rolling 30d spend + cap headroom |
| `/brain doctor` | `mcp__gbrain__get_health` + shells `gbrain doctor` | Connection + RLS + schema + embedding provider check |
| `/brain cost [<days_back>]` | `metrics.sum_gbrain_cost_rolling(N)` + per-role + per-op breakdown | Rolling N-day spend (default 30) split by role + op |

### Write (Tier B — notify-first-then-batch per SOP-AIOPS-GBRAIN-001)

| Invocation | Maps to | HITL |
|---|---|---|
| `/brain put <slug> "<body>"` | `mcp__gbrain__put_page` | B — writes immediately + emits `ritsu.gbrain.write_committed` event + daily Telegram digest |
| `/brain update <slug> "<diff>"` | `mcp__gbrain__update_page` | B — same |
| `/brain link <slug-a> -> <slug-b> [type=<link-type>]` | `mcp__gbrain__add_link` | B |
| `/brain unlink <slug-a> -> <slug-b>` | `mcp__gbrain__remove_link` | B |
| `/brain archive <slug>` | `mcp__gbrain__archive_page` | B — soft delete (state=archived, 90d to purged) |

### Workflow (orchestrate other skills)

| Invocation | Workflow | HITL |
|---|---|---|
| `/brain promote <slug>` | invokes `06-ai-ops/skills/brain-promotion/SKILL.md` — drafts wiki/ destination + opens Tier C PR | C |
| `/brain review` | reads `state=mature where state_since > 30d`; presents weekly promotion candidates via `AskUserQuestion` | A → C per pick |
| `/brain dream` | manual trigger: `mcp__gbrain__dream_cycle_manual` — gbrain-maintainer dedup + citation fix + synthesis | C |

## Help menu (`/brain` no args)

```
🧠 /brain — Operational Brain Interface

CAPABILITY:    gbrain-operational-brain v1.0 (operating since 2026-05-25)
CAP STATUS:    $X.XX / $100 monthly (rolling 30d)   [pulled live]
PAGE COUNT:    N pages (target: 500 by 2026-09-30)
LAST WRITE:    <slug> by <role> <Nh ago>

📖 READ
  /brain search "<query>"      — semantic search top 5
  /brain page <slug>            — read single page
  /brain list [type=X]          — paginated list, optional filter
  /brain backlinks <slug>       — what links here
  /brain graph <slug>           — local graph traversal (depth=2)
  /brain experts "<topic>"      — people with topic expertise
  /brain status                 — overview + spend
  /brain doctor                 — health check
  /brain cost [30]              — rolling N-day spend breakdown

✍️  WRITE (Tier B — daily digest review)
  /brain put <slug> "<body>"    — create or update page
  /brain update <slug> "<diff>" — in-place edit
  /brain link <a> -> <b>        — add link between pages
  /brain unlink <a> -> <b>      — remove link
  /brain archive <slug>         — soft-delete (recoverable 90d)

🔄 WORKFLOW
  /brain promote <slug>         — gbrain → wiki/ promotion (Tier C PR)
  /brain review                 — weekly promotion candidates
  /brain dream                  — manual dream cycle trigger (Tier C)
```

## Workflow per subcommand

### `/brain search "<query>"`

1. **Invoke** `mcp__gbrain__search` with `query` arg, top_k=5.
2. **Render** results as table: `# | slug | page_type | similarity | snippet (first 100 chars)`.
3. **Suggest** `/brain page <slug>` for top hit if user wants deep-dive.

Cost: ~$0.005 (`gbrain.shared.search`).

### `/brain put <slug> "<body>"`

1. **Parse** slug (validate `<page_type>/<entity-slug>` format).
2. **Check existing** via `mcp__gbrain__get_page <slug>` — if exists, ask via `AskUserQuestion`: "Update existing OR create new with `-v2` suffix?"
3. **Write** via `mcp__gbrain__put_page` with frontmatter `{ created_by_command: '/brain', created_by_role: <MCP_CALLER_ROLE> }`.
4. **Emit event** `ritsu.gbrain.write_committed` for hitl-router batching.
5. **Confirm** to founder: "✓ wrote `<slug>`; Tier B daily digest will show this tonight."

Cost: ~$0.02 (`gbrain.<role>.put_page` task_kind).

### `/brain status`

1. **Query** `mcp__gbrain__get_brain_info` → page count, embedding count, schema version.
2. **Query** `metrics.sum_gbrain_cost_rolling(30)` → rolling 30d spend.
3. **Query** `ops.kpi_snapshots WHERE kpi_id LIKE 'brain.%' ORDER BY ts DESC LIMIT 5` → recent KPI snapshots.
4. **Render** summary table with cap headroom %, top-3 write roles last 7d, oldest mature page (promotion candidate).

Cost: ~$0.01 (3 reads + ops query).

### `/brain doctor`

1. **MCP path** — `mcp__gbrain__get_health` (preferred; doesn't need terminal).
2. **CLI fallback** — if MCP health check returns degraded, suggest `gbrain doctor` in terminal for detailed RLS/schema/extension report.
3. **Reference** `06-ai-ops/gbrain/runbooks/runbook-gbrain-doctor-failure.md` for symptom matrix (S1-S6).

Cost: $0 (gbrain MCP read tool).

### `/brain cost [<days_back>]`

1. **Default** `days_back=30`.
2. **Query** `metrics.sum_gbrain_cost_rolling(<days_back>)` for total.
3. **Query** `metrics.gbrain_cost_daily WHERE day > current_date - <N> days ORDER BY day DESC` for per-day per-role per-op breakdown.
4. **Render** summary: total + per-role table + per-op table + cap status.
5. **Alert** inline if approaching threshold (80% / 100% / 150%).

Cost: $0 (ops query only).

### `/brain promote <slug>`

1. **Invoke** `06-ai-ops/skills/brain-promotion/SKILL.md` with `brain_slug=<slug>`.
2. **Skill drafts** wiki/ destination file + opens Tier C PR via gh CLI.
3. **Founder reviews** PR + merges → skill updates source gbrain page state.

This is the manual aid path. Cron-driven auto-promotion is v1.1+ (Phase 3 future capability).

### `/brain review`

1. **Query** `mcp__gbrain__list_pages` with filter `state=mature AND state_since > 30d`.
2. **For each candidate**, `AskUserQuestion`: "Keep / Promote to wiki / Archive?"
3. **Dispatch** based on answer:
   - Keep → no-op
   - Promote → invoke `/brain promote <slug>`
   - Archive → invoke `/brain archive <slug>`
4. **Log** to `ops.events` per decision.

Run cadence: weekly (founder Sunday review window per `SOP-AIOPS-GBRAIN-002-promotion-workflow`).

## HITL discipline

Maps to `governance/HITL.md` Appendix A tier classification:

- **Tier A** (search, page, list, backlinks, graph, experts, status, doctor, cost): autonomous, log to `ops.agent_runs` with cost-attribution row
- **Tier B** (put, update, link, unlink, archive): notify-first-then-batch via `hitl-router` → daily Telegram digest
- **Tier C** (promote, dream, mass-anything): full ceremony per HITL.md — dry-run preview + founder approval

## Role guards

- 8 WRITE-enabled roles per `governance/ROLES.md` v1.1 brain_affinity matrix: `founder`, `cofounder`, `gbrain-maintainer`, `customer-lead`, `feedback-aggregator`, `gtm-orchestrator`, `cs-coach`, `product-orchestrator`, `eval-evo-orchestrator`
- READ-only roles (17 others): can invoke search/page/list/etc. but `put`/`update`/`link` return 403 with helpful message
- `etl-runner` (brain_affinity=none): all subcommands return 403

Role determined from `MCP_CALLER_ROLE` env (set in `.mcp.json` gbrain entry).

## Cost-bucket attribution

Every gbrain MCP call attributed to `ops.cost_attributions` with:
- `agent_role` = MCP_CALLER_ROLE
- `task_kind` = `gbrain.<op>` (e.g. `gbrain.put_page`, `gbrain.search`)
- `cost_usd` = per-call cost from gbrain MCP server response

Aggregation surfaced via `metrics.gbrain_cost_daily` view + `metrics.sum_gbrain_cost_rolling(N)` RPC (Sprint 3 migration 00037).

## Hard-cap behavior

Per `scripts/pre-budget-check.sh` (Sprint 5):
- $80-100: alert tier (this command shows ⚠ in `/brain status`)
- $100-150: graceful degrade (write subcommands return error; read subcommands work)
- ≥$150: MCP fails to load entirely (subcommands return "MCP not available")

When write blocked, `/brain` prints: "Cap reached. Use `/cla extend gbrain-operational-brain` to raise cap, OR wait month rollover."

## When to use `@brain` subagent instead

Use `@brain` for delegated multi-step brain work without leaving current session:

- `@brain summarize what we know about <customer>` — composes get_page + traverse_graph + find_experts
- `@brain what concepts contradict the wedge?` — composes find_contradictions + traverse_graph
- `@brain draft a companies/<vendor> page from this email` — extract entities + put_page

`/brain` = explicit founder-typed commands; `@brain` = delegated reasoning that returns a synthesized answer.

## Defensive notes

- This command does NOT replace the per-skill `## Brain context` sections (Sprint 2). Those skills auto-fire brain reads transparently; `/brain` is for EXPLICIT founder operations.
- Slug grammar: enforce `<page_type>/<entity-slug>` where `page_type IN (people, companies, meetings, ideas, concepts, decisions, sources, inbox, archive)`. Reject if missing prefix.
- Mass operations (>10 pages) automatically escalate Tier C → D-Std per HITL Appendix A — refuse + suggest `/cla fix` path.

## References

- Capability spec: `wiki/capabilities/gbrain-operational-brain/spec.md`
- Retrospective: `wiki/capabilities/gbrain-operational-brain/retrospective-v1.0.0.md`
- HITL tier classification: `governance/HITL.md` Appendix A
- Role grants: `governance/ROLES.md` v1.1 (`brain_affinity` matrix)
- Cost convention: `knowledge/economic-architecture.md` v1.1 addendum
- Failure runbook: `06-ai-ops/gbrain/runbooks/runbook-gbrain-doctor-failure.md`
- Sub-pillar overview: `06-ai-ops/gbrain/README.md`
