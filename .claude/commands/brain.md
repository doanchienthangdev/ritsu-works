---
name: brain
description: |
  Founder-facing surface for gbrain operational brain (Type 4 Semantic
  Memory). Thin orchestrator over `mcp__gbrain__*` MCP tools. ~30 subcommands
  covering search/recall/think/write/lifecycle/tags/timeline/facts/versions/
  sources/takes/files/diagnostics — full coverage of gbrain v0.40 surface.

  Capability: gbrain-operational-brain v1.0.2 (verified against live gbrain
  schema; supersedes v1.0.1 which had 4 naming errors based on brainstorm
  guesses). v1.0.4 adds `/brain integrations` — codebase integration map.

  Use when you want explicit founder ops on gbrain. For delegated multi-step
  reasoning, use @brain subagent. For automatic brain context in skills,
  rely on the 12 skills with `## Brain context` sections (Sprint 2).
---

# /brain — Operational Brain Interface (v1.0.4)

> Project-scoped command for ritsu-works. Front-end for gbrain (capability `gbrain-operational-brain` v1.0). Thin orchestrator — every subcommand maps directly to one or more `mcp__gbrain__*` MCP tools verified against live gbrain v0.40.2.0 schema. Founder-friendly syntax + defaults + Tier B HITL discipline per `SOP-AIOPS-GBRAIN-001-write-discipline`.

## Subcommand catalog

### Group 1 — READ search & retrieval

| Subcommand | Maps to | Notes |
|---|---|---|
| `/brain` / `/brain help` / `/brain ?` | (help menu) | All three render the help menu with LIVE brain status (page count, breakdown, spend, cap headroom). v1.0.3 formalizes `help` + `?` as aliases. |
| `/brain <unknown-subcommand>` | (suggest + help) | Surface closest match (e.g. `/brain serch` → "Did you mean `search`?") then render help menu. |
| `/brain search "<query>"` | `mcp__gbrain__search` | Default semantic search top 5 |
| `/brain query "<query>" [--detail=low\|medium\|high] [--lang=X] [--symbol=Y] [--since=7d]` | `mcp__gbrain__query` | **More powerful than search** — hybrid vector + keyword + multi-query expansion + cross-modal + recency/salience tuning |
| `/brain recall [--entity=<slug>] [--session=X] [--since=8h] [--grep=Y] [--include-expired] [--include-pending]` | `mcp__gbrain__recall` | **Different from search** — per-source HOT MEMORY facts table (v0.31 personal-knowledge layer) |
| `/brain page <slug>` | `mcp__gbrain__get_page` | Full page body + frontmatter |
| `/brain list [type=<page_type>]` | `mcp__gbrain__list_pages` | Paginated list, optional filter (note/person/company/meeting/idea/concept) |
| `/brain chunks <slug>` | `mcp__gbrain__get_chunks` | Detailed chunks for one page |
| `/brain backlinks <slug>` | `mcp__gbrain__get_backlinks` | What links here |
| `/brain links <slug>` | `mcp__gbrain__get_links` | Outgoing links |
| `/brain graph <slug> [--depth=2]` | `mcp__gbrain__traverse_graph` | Local graph traversal |
| `/brain resolve <text>` | `mcp__gbrain__resolve_slugs` | Slug disambiguation (free-text → canonical slug) |

### Group 2 — READ reflection & diagnostics

| Subcommand | Maps to | Notes |
|---|---|---|
| `/brain think "<question>" [--anchor=<slug>] [--since=YYYY-MM-DD] [--until=YYYY-MM-DD] [--rounds=1]` | `mcp__gbrain__think` | **⭐ Multi-hop synthesis with citations** — gbrain's killer feature. Pulls evidence from pages + takes + graph |
| `/brain experts "<topic>"` | `mcp__gbrain__find_experts` | People pages with most expertise on topic |
| `/brain anomalies [--days=30] [--sigma=3]` | `mcp__gbrain__find_anomalies` | Statistical anomalies in recent page activity, grouped by tag/type cohort |
| `/brain contradictions [--severity=high\|medium\|low] [--slug=X]` | `mcp__gbrain__find_contradictions` | Reads CACHED probe run; founder must first run `gbrain eval suspected-contradictions` CLI to populate |
| `/brain orphans [--include-pseudo]` | `mcp__gbrain__find_orphans` | Pages with no inbound links (content enrichment candidates) |
| `/brain trajectory <slug> [--metric=mrr] [--kind=metric\|event\|all] [--since=YYYY-MM-DD]` | `mcp__gbrain__find_trajectory` | Time-series view of an entity's typed claims + regression detection + drift score |
| `/brain salience [--limit=20]` | `mcp__gbrain__get_recent_salience` | Recent emotionally-weighted pages — best for "what's notable / on my mind" |
| `/brain transcripts [--limit=20]` | `mcp__gbrain__get_recent_transcripts` | Recent conversation transcripts |

### Group 3 — READ entity context

| Subcommand | Maps to | Notes |
|---|---|---|
| `/brain tags <slug>` | `mcp__gbrain__get_tags` | List tags on a page |
| `/brain timeline <slug>` | `mcp__gbrain__get_timeline` | Chronological timeline entries for a page |
| `/brain versions <slug>` | `mcp__gbrain__get_versions` | Page edit history |
| `/brain status` | composed: `get_brain_identity` + `get_stats` + cost RPC | Overview: version + page/chunk/link/tag/timeline counts + per-type breakdown + rolling 30d spend |
| `/brain doctor` | `mcp__gbrain__run_doctor` | Structured DoctorReport — 18 checks (connection/schema/brain-score/sync/queue/subagent/eval-drift/reranker/brainstorm/etc.) |
| `/brain health` | `mcp__gbrain__get_health` | Brain health dashboard (embed coverage, stale pages, orphans) |
| `/brain cost [<days_back>]` | `metrics.sum_gbrain_cost_rolling(N)` + per-role+per-op breakdown | Rolling N-day gbrain spend (default 30) split by role + op |

### Group 4 — WRITE pages (Tier B — notify-first-then-batch per SOP-AIOPS-GBRAIN-001)

| Subcommand | Maps to | Notes |
|---|---|---|
| `/brain put <slug> "<markdown>"` | `mcp__gbrain__put_page` | **Idempotent — create OR update**. Frontmatter auto-extracted. Auto-link + auto-timeline extraction when enabled |
| `/brain delete <slug>` | `mcp__gbrain__delete_page` | **Soft-delete** (72h recovery window via `restore`, then auto-purged). Hides from search + get_page + list_pages |
| `/brain restore <slug>` | `mcp__gbrain__restore_page` | Undo soft-delete within 72h |
| `/brain purge [--hours=72]` | `mcp__gbrain__purge_deleted_pages` | **Admin** — hard-delete soft-deleted pages older than N hours. Local CLI only (not over HTTP MCP) |

### Group 5 — WRITE links + tags + timeline (Tier B)

| Subcommand | Maps to | Notes |
|---|---|---|
| `/brain link <slug-a> -> <slug-b>` | `mcp__gbrain__add_link` | Add link between two pages |
| `/brain unlink <slug-a> -> <slug-b>` | `mcp__gbrain__remove_link` | Remove a single link |
| `/brain tag <slug> +<tag>` | `mcp__gbrain__add_tag` | Add tag (prefix `+`) |
| `/brain tag <slug> -<tag>` | `mcp__gbrain__remove_tag` | Remove tag (prefix `-`) |
| `/brain timeline-add <slug> <YYYY-MM-DD> "<summary>" [--detail=X] [--source=Y]` | `mcp__gbrain__add_timeline_entry` | Append timeline entry to a page (great for meeting/person history) |

### Group 6 — WRITE facts + versions (Tier B)

| Subcommand | Maps to | Notes |
|---|---|---|
| `/brain fact-extract <slug> "<turn-text>" [--entity-hints=A,B] [--session=X] [--visibility=private\|world]` | `mcp__gbrain__extract_facts` | Extract structured facts (events/preferences/commitments/beliefs) from a conversation turn via Haiku. Sanitizes injection patterns |
| `/brain fact-forget <id> [--reason="X"]` | `mcp__gbrain__forget_fact` | Mark fact id as expired (strikes through page Facts fence) |
| `/brain revert <slug> <version_id>` | `mcp__gbrain__revert_version` | Restore page to a previous version |

### Group 7 — Sources management (Tier C — destructive options)

| Subcommand | Maps to | Notes |
|---|---|---|
| `/brain source add <id> [--path=X \| --url=Y] [--federated] [--name="<display>"]` | `mcp__gbrain__sources_add` | Register source: local --path OR git --url (SSRF-gated clone) |
| `/brain source list [--include-archived]` | `mcp__gbrain__sources_list` | List registered sources with page counts |
| `/brain source remove <id> --confirm [--dry-run] [--keep-storage]` | `mcp__gbrain__sources_remove` | **Hard-remove** — cascades pages/chunks/embeddings. Refuses without --confirm if source has data |
| `/brain source status <id>` | `mcp__gbrain__sources_status` | Per-source diagnostic: clone_state (healthy/missing/no-git/url-drift/corrupted) |

### Group 8 — Takes (predictions, bets, hunches — calibration system)

| Subcommand | Maps to | Notes |
|---|---|---|
| `/brain takes search "<query>"` | `mcp__gbrain__takes_search` | Keyword search over takes |
| `/brain takes list [--holder=world\|garry\|brain\|<slug>] [--kind=fact\|take\|bet\|hunch] [--active] [--resolved]` | `mcp__gbrain__takes_list` | List typed/weighted/attributed claims |
| `/brain takes scorecard [--holder=X] [--domain=companies/] [--since=YYYY-MM-DD]` | `mcp__gbrain__takes_scorecard` | Calibration scorecard for resolved bets: counts + accuracy + Brier + partial_rate |
| `/brain takes calibration [--bucket=0.1] [--holder=X]` | `mcp__gbrain__takes_calibration` | Calibration curve: observed vs predicted per bucket |

### Group 9 — Files

| Subcommand | Maps to | Notes |
|---|---|---|
| `/brain file upload <path> [--page=<slug>]` | `mcp__gbrain__file_upload` | Upload file to storage; optionally associate with a page |
| `/brain file list [--page=<slug>]` | `mcp__gbrain__file_list` | List stored files (optional filter by page slug) |
| `/brain file url <slug>` | `mcp__gbrain__file_url` | Get signed URL for a file blob |

### Group 10 — Workflow + administration

| Subcommand | Maps to | Notes |
|---|---|---|
| `/brain promote <slug>` | invokes `06-ai-ops/skills/brain-promotion/SKILL.md` | gbrain → wiki/ promotion (Tier C PR) |
| `/brain review` | composes `list_pages WHERE state=mature AND state_since > 30d` + AskUserQuestion per candidate | Weekly promotion review window |
| `/brain integrations [--category=<cat>]` | Bash `grep -rn "gbrain"` + categorized render | **Codebase integration map** — all files/dirs with gbrain integration, categorized by type. Optional `--category` filter (tier1-yaml\|governance\|agent\|skill\|sop\|migration\|script\|wiki\|other). No MCP call needed. |
| `/brain agent "<prompt>" [--model=X] [--max-turns=20] [--allowed-tools=A,B] [--queue=default]` | `mcp__gbrain__submit_agent` | **⭐ Submit autonomous LLM agent job** — gateway-native tool loop with bound tools/sources/slug-prefixes/budget. Requires `agent` OAuth scope |
| `/brain sync [--dry-run] [--full] [--no-embed] [--no-pull] [--repo=X]` | `mcp__gbrain__sync_brain` | Git repo → brain incremental sync (different from "dream cycle" — gbrain has no manual dream trigger; cycle runs autopilot) |
| `/brain jobs` | `mcp__gbrain__list_jobs` | List background jobs |
| `/brain job <id> [--progress]` | `mcp__gbrain__get_job` / `get_job_progress` | Job detail OR progress stream |

## Help menu (`/brain` / `/brain help` / `/brain ?`)

> All three triggers render the same menu below with LIVE status pulled from
> `get_brain_identity` + `get_stats` + `metrics.sum_gbrain_cost_rolling(30)`.
> Subcommand-specific help: type `/brain <subcommand>` without args to see
> usage for just that subcommand (e.g. `/brain think` → think-only usage).

```
🧠 /brain — Operational Brain Interface (v1.0.4)

CAPABILITY:    gbrain-operational-brain v1.0 (operating since 2026-05-25)
ENGINE:        gbrain v0.40.2.0 (postgres)
PAGES:         N (by type: M note, P person, Q company, ...)
BRAIN SCORE:   X/100   HEALTH: status
CAP STATUS:    USD X.XX / USD 100 monthly (rolling 30d)

📖 READ — search & retrieval (10)
  /brain search "<q>"            — semantic search top 5
  /brain query "<q>"             — hybrid vector+keyword (more power than search)
  /brain recall [--entity=X]     — per-source hot memory (facts table)
  /brain page <slug>              — read single page
  /brain list [type=X]            — paginated list
  /brain chunks <slug>            — page chunks detail
  /brain backlinks <slug>         — what links here
  /brain links <slug>             — outgoing links
  /brain graph <slug>             — local graph traversal
  /brain resolve <text>           — free-text → canonical slug

🤔 READ — reflection & diagnostics (8)
  /brain think "<q>" [--anchor=X] — ⭐ multi-hop synthesis with citations
  /brain experts "<topic>"        — topic experts (people pages)
  /brain anomalies                — recent statistical anomalies
  /brain contradictions           — cached suspected-contradictions probe
  /brain orphans                  — pages with no inbound links
  /brain trajectory <slug>        — entity time-series + regressions
  /brain salience                 — recent emotionally-weighted pages
  /brain transcripts              — recent conversation transcripts

🏷️  READ — entity context (7)
  /brain tags <slug>              — list tags
  /brain timeline <slug>          — chronological entries
  /brain versions <slug>          — page edit history
  /brain status                   — overview + counts + spend
  /brain doctor                   — structured DoctorReport (18 checks)
  /brain health                   — embed coverage + stale + orphans
  /brain cost [N]                 — rolling N-day spend breakdown

✍️  WRITE — pages (Tier B, daily digest review)
  /brain put <slug> "<md>"        — create or update (idempotent)
  /brain delete <slug>             — soft-delete (72h recovery)
  /brain restore <slug>            — undo delete within 72h
  /brain purge [--hours=72]        — admin hard-delete old soft-deletes

🔗 WRITE — links + tags + timeline (Tier B)
  /brain link <a> -> <b>          — add link
  /brain unlink <a> -> <b>        — remove link
  /brain tag <slug> +<tag>        — add tag
  /brain tag <slug> -<tag>        — remove tag
  /brain timeline-add <slug> ...  — append timeline entry

💡 WRITE — facts + versions (Tier B)
  /brain fact-extract <slug> ...  — extract facts via Haiku
  /brain fact-forget <id>         — mark fact expired
  /brain revert <slug> <version>  — restore prior version

📦 SOURCES (Tier C)
  /brain source add <id>          — register local --path or git --url
  /brain source list              — list with page counts
  /brain source remove <id>       — hard-remove (cascades)
  /brain source status <id>       — clone health diagnostic

🎯 TAKES (predictions, bets, hunches)
  /brain takes search "<q>"       — keyword search
  /brain takes list               — filtered list
  /brain takes scorecard          — calibration scorecard
  /brain takes calibration        — observed vs predicted

📎 FILES
  /brain file upload <path>       — upload to storage
  /brain file list                — list stored files
  /brain file url <slug>          — signed URL

🔄 WORKFLOW + ADMIN
  /brain promote <slug>           — gbrain → wiki/ (Tier C PR)
  /brain review                   — weekly promotion candidates
  /brain integrations             — codebase integration map (all gbrain touch-points)
  /brain agent "<prompt>"         — ⭐ submit autonomous LLM agent job
  /brain sync [--dry-run] [--full] — git repo → brain incremental sync
  /brain jobs                     — list background jobs
  /brain job <id> [--progress]    — job detail
```

## Workflow per critical subcommand

### `/brain think "<question>" [--anchor=<slug>]` ⭐ KILLER FEATURE

1. **Invoke** `mcp__gbrain__think` with `question` (+ optional `anchor` slug to scope to one entity's subgraph; + optional `since`/`until` time window).
2. **gbrain orchestrates** multi-hop retrieval: pulls evidence from pages + takes + graph.
3. **Returns** cited answer with conflict + gap analysis.
4. **Cost** depends on `model` override (default Opus). Typical USD 0.10-0.50 per call.
5. **Display** answer + citations table.

This is the highest-value brain operation. Use when a single search isn't enough — you need composition across multiple pages with reasoning.

### `/brain status` (composed)

1. `mcp__gbrain__get_brain_identity` → version + page/chunk counts + last_sync
2. `mcp__gbrain__get_stats` → page_count + chunk_count + embedded_count + link_count + tag_count + timeline_entry_count + pages_by_type breakdown
3. `metrics.sum_gbrain_cost_rolling(30)` → rolling 30d spend
4. **Render** unified summary table with cap headroom %, top-3 page types, recent activity hints.

### `/brain doctor`

1. **Invoke** `mcp__gbrain__run_doctor` → structured `DoctorReport` with `schema_version`, `status`, `health_score`, `checks[]`.
2. **Display** as table: `name | status | message`. Highlight any `warn`/`fail` rows in red.
3. **For each fail/warn**, surface the runbook section reference (`06-ai-ops/gbrain/runbooks/runbook-gbrain-doctor-failure.md` S1-S6).

Sample output structure (live verified):
- 18 checks: connection, schema_version, brain_score, sync_failures, queue_health, subagent_capability, sync_freshness, schema_pack_active, schema_pack_consistency, search_mode, eval_drift, reranker_health, brainstorm_health, abandoned_threads, calibration_freshness, grade_confidence_drift, voice_gate_health, schema_pack_source_drift

### `/brain put <slug> "<markdown>"`

1. **Parse** slug; validate format (`<page_type>/<entity-slug>`).
2. **Optional dedup check** via `mcp__gbrain__get_page <slug>` — if exists, ask: "Update existing OR cancel?" (no `-v2` suffix anymore — `put_page` is idempotent by design).
3. **Write** via `mcp__gbrain__put_page` with content arg (full markdown + frontmatter).
4. **gbrain auto-extracts** frontmatter + tags + chunks; runs auto-link + auto-timeline extraction when enabled in source config.
5. **Cost-attribute** to `ops.cost_attributions` with `agent_role=<MCP_CALLER_ROLE>` + `task_kind='gbrain.put_page'`.
6. **Emit event** `ritsu.gbrain.write_committed` for `hitl-router` batching.
7. **Confirm**: "✓ wrote `<slug>`; daily digest tonight."

### `/brain delete <slug>` + lifecycle correction

**Important correction vs v1.0:** gbrain uses **72-hour recovery window**, NOT 90 days. Spec docs from Sprint 1-6 say "90d archive→purge" — that was wrong; actual:

| Old (wrong v1.0 spec) | Actual gbrain behavior |
|---|---|
| `archive_page` | tool doesn't exist; use `delete_page` |
| 90d archive → purge | **72h soft-delete → hard-purge** via `purge_deleted_pages` |
| State machine: archived → purged after 90d | State: deleted_at IS NOT NULL; purged after 72h via autopilot |

Workflow:
1. `mcp__gbrain__delete_page <slug>` — sets `deleted_at`; hidden from search + get_page + list_pages
2. Within 72h: `mcp__gbrain__restore_page <slug>` — clears `deleted_at`; page reappears
3. After 72h: autopilot purge phase OR manual `mcp__gbrain__purge_deleted_pages` — hard-deletes cascading content_chunks + page_links + chunk_relations

Tier C (per v1.0 governance/HITL.md Appendix A) for purge >100 pages.

### `/brain agent "<prompt>"` ⭐ AUTONOMOUS AGENT

This is the right path for autonomous brain work (replaces the wrong `/brain dream` from v1.0.1).

1. **Invoke** `mcp__gbrain__submit_agent` with `prompt` + optional `model`, `max_turns` (default 20, cap 100), `allowed_tools` subset, `allowed_slug_prefixes` subset, `queue`.
2. **gbrain dispatches** via gateway-native tool loop. Bound tools/sources/slug-prefixes/budget come from OAuth client registration.
3. **Returns** job id immediately; founder polls via `/brain job <id> --progress`.
4. **Requires** `agent` OAuth scope on caller credentials.

Use cases:
- "Find all companies we've engaged with this quarter and write a summary page"
- "For each idea page state=draft, suggest a concept tag"
- "Reconcile any tag duplicates (e.g., 'pricing' vs 'pricing-strategy')"

## Role guards + HITL discipline

Per `governance/ROLES.md` v1.1 `brain_affinity` matrix + `governance/HITL.md` Appendix A:

- **8 WRITE-enabled roles** (`founder`, `cofounder`, `gbrain-maintainer`, `customer-lead`, `feedback-aggregator`, `gtm-orchestrator`, `cs-coach`, `product-orchestrator`, `eval-evo-orchestrator`) can use all subcommands subject to per-tool tier
- **17 READ-only roles**: search/page/list/chunks/backlinks/links/graph/resolve/think/experts/anomalies/contradictions/orphans/trajectory/salience/transcripts/tags/timeline/versions/status/doctor/health/cost/recall/query/jobs/job/file-list/file-url → all OK
- **etl-runner** (brain_affinity=none): 403 on everything
- **Tier B** writes: put/delete/restore/link/unlink/tag/timeline-add/fact-extract/fact-forget/revert/file-upload
- **Tier C** ops: promote/agent (autonomous LLM)/source add/source remove
- **Admin only** (local CLI, not over HTTP MCP): purge

Role determined from `MCP_CALLER_ROLE` env (set in `.mcp.json` gbrain entry).

## Cost-bucket attribution

Every gbrain MCP call attributed to `ops.cost_attributions` with:
- `agent_role` = `MCP_CALLER_ROLE` env
- `task_kind` = `gbrain.<tool_name>` (e.g. `gbrain.put_page`, `gbrain.search`, `gbrain.think`)
- `cost_usd` = per-call cost from gbrain MCP response

Aggregation: `metrics.gbrain_cost_daily` view + `metrics.sum_gbrain_cost_rolling(N)` RPC (Sprint 3 migration 00037, hotfixed v1.0.1).

## Hard-cap behavior (Hard-cap Option B graceful degrade)

Per `scripts/pre-budget-check.sh` (Sprint 5, v1.0.1 hotfix):
- USD 80-100: alert tier — `/brain status` shows ⚠
- USD 100-150: graceful degrade — WRITE subcommands return error; READ continues
- ≥USD 150: MCP fails to load — subcommands return "MCP not available"

When write blocked: "Cap reached. Use `/cla extend gbrain-operational-brain` to raise OR wait month rollover."

## When to use `@brain` subagent instead

| Pattern | Use |
|---|---|
| `/brain <verb> <args>` | Explicit founder-typed single op |
| `@brain <prompt>` | Delegated reasoning; composes 3-7 brain calls + returns synthesis |
| Skill auto-fire (12 brain-aware skills, Sprint 2) | Transparent during normal skill execution |

### `/brain integrations [--category=<cat>]`

Lists every file and directory in the ritsu-works repo that has gbrain integration — the complete codebase integration map.

**Implementation** (pure Bash, no MCP call needed):

```bash
grep -rn "gbrain" /path/to/ritsu-works \
  --include="*.md" --include="*.yaml" \
  --include="*.json" --include="*.sh" --include="*.cjs" \
  -l | sort
```

Results are categorized and displayed as a table:

| Category | What's here |
|---|---|
| `tier1-yaml` | `knowledge/*.yaml` files declaring gbrain integration (manifest, mcp-tools, mcp-roles, kpi-registry, kpi-ownership, capability-registry, cross-tier-invariants, event-subscriptions, state-machines, schedules, external-sources, feature-flags) |
| `governance` | `governance/ROLES.md` (brain_affinity matrix, gbrain-maintainer role), `governance/HITL.md` (Appendix A tier classification) |
| `architecture` | `knowledge/memory-architecture.md`, `knowledge/economic-architecture.md`, `notes/bai-*.md` (design notes) |
| `agent` | `.claude/agents/brain.md`, `.claude/agents/gbrain-maintainer.md` |
| `command` | `.claude/commands/brain.md` (this file) |
| `hook` | `.claude/hooks/post-stripe-customer-created.md`, `.claude/hooks/post-tier1-rename.md` |
| `skill` | `06-ai-ops/gbrain/` sub-pillar (README + 3 SOPs + runbook + 2 new skills), 12 brain-aware skills with `## Brain context` section |
| `migration` | `supabase/migrations/00036_gbrain_cla_cross_links.sql`, `supabase/migrations/00037_metrics_gbrain_cost_daily_view.sql` |
| `script` | `scripts/pre-budget-check.sh`, `scripts/cross-tier/validate-gbrain-invariant-handlers.cjs`, `scripts/cross-tier/validate-mcp-json-tools-consistency.cjs` |
| `wiki` | `wiki/capabilities/gbrain-operational-brain/spec.md`, `wiki/capabilities/gbrain-operational-brain/retrospective-v1.0.0.md`, `knowledge/recipients/external-sources.md` (gbrain-mcp entry) |
| `.mcp.json` | Root `.mcp.json` gbrain stdio entry with pre-budget-check.sh wrapper |

**Optional `--category` filter** (returns only that category's files):
```
/brain integrations --category=migration   → just the 2 migration files
/brain integrations --category=skill       → all brain-aware skill files
/brain integrations --category=tier1-yaml  → all knowledge/*.yaml with gbrain
```

**Use case**: When you want to audit what gbrain touches before a `/cla extend` or `/cla revise`, or before upgrading gbrain itself.

---

## v1.0.4 changes vs v1.0.3

**Added `/brain integrations` subcommand** — codebase integration map.

Ships as a pure-grep operation (no MCP call): scans the ritsu-works repo for all `gbrain` references across `.md`, `.yaml`, `.json`, `.sh`, `.cjs` files and renders a categorized integration map. Optional `--category` filter for targeted auditing.

Motivation: as gbrain integration grows across 60+ files in 9 categories, there was no single command to answer "where does gbrain touch the codebase?" — now there is.

---

## v1.0.3 changes vs v1.0.2

**Formalized help aliases** (no behavior change; previously handled via model interpretation):
- `/brain help` and `/brain ?` now officially documented as triggers for the help menu
- `/brain <unknown-subcommand>` documented as suggest-closest-match + show help

Small UX polish caught by founder feedback.

## v1.0.2 changes vs v1.0.1

**Fixed 4 naming errors** (caught by live schema verification):
- ~~`update_page`~~ → drop (use `put_page` idempotent)
- ~~`archive_page` / 90d~~ → `delete_page` / `restore_page` / `purge_deleted_pages` / **72h** window
- ~~`get_brain_info`~~ → `get_brain_identity` + `get_stats`
- ~~`dream_cycle_manual`~~ → no manual trigger exists; `/brain sync` for git sync OR `/brain agent` for autonomous LLM work

**Added 20+ subcommands** covering:
- Reflection: `think`, `recall`, `query`, `anomalies`, `contradictions`, `orphans`, `trajectory`, `salience`, `transcripts`, `resolve`, `chunks`, `links`
- Entity context: `tags`, `timeline`, `versions`, `health`
- Lifecycle: `delete`, `restore`, `purge`
- Tags + timeline write: `tag +/-`, `timeline-add`
- Facts: `fact-extract`, `fact-forget`
- Versions: `revert`
- Sources: `source add/list/remove/status`
- Takes: `takes search/list/scorecard/calibration`
- Files: `file upload/list/url`
- Workflow: `agent`, `sync`, `jobs`, `job`

**Coverage**: ~30 founder-facing subcommands across 56 actively-used gbrain tools (~54%). Excluded internal/diagnostic (`get_raw_data`, `put_raw_data`, `get_ingest_log`, `log_ingest`, `send_job_message`, `replay_job`, `code_traversal_cache_clear`, `submit_job` (use `agent` instead), `code_*` 7 tools) — these stay on direct `mcp__gbrain__*` for the @brain subagent when needed.

## References

- Capability spec: `wiki/capabilities/gbrain-operational-brain/spec.md`
- Retrospective: `wiki/capabilities/gbrain-operational-brain/retrospective-v1.0.0.md`
- HITL tier classification: `governance/HITL.md` Appendix A
- Role grants: `governance/ROLES.md` v1.1 (`brain_affinity` matrix)
- Cost convention: `knowledge/economic-architecture.md` v1.1 addendum (task_kind='gbrain.<op>' after v1.0.1 hotfix)
- Failure runbook: `06-ai-ops/gbrain/runbooks/runbook-gbrain-doctor-failure.md`
- Sub-pillar overview: `06-ai-ops/gbrain/README.md`
- Subagent counterpart: `.claude/agents/brain.md`
- gbrain live schema (v0.40.2.0): 74 MCP tools — see `knowledge/recipients/external-sources.md` `external-source/gbrain-mcp`
