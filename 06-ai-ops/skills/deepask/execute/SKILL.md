---
name: execute
description: deepask Stage 3 — per-sub-need executor. Sprint 1 = READ-only legs (content_axis from the ResolverPlan). AUTHORS the concrete read-only SQL / wiki_ask question / read params itself, grounded in the plan's grounding_ref/columns_hint — NEVER invents column names. Firewall-aware (product only via metrics.*), gbrain-cap-aware, bounded self-correct on error. Sprint 3 adds the capability-RUN leg (Tier-A auto / Tier-B+ surface) + deep-research delegation.
---

# deepask/execute (capability `deepask` v1.0)

> Stage 3 of the loop. Runs ONE sub-need's `ResolverPlan v1`, in parallel with siblings.
> resolver-plan supplies WHICH recipient + interface contract + grounding pointer; **execute
> authors the literal call.** Sprint 1 scope: read-only `content_axis`. The capability-RUN
> leg (`capability_axis`) + deep-research delegation land in Sprint 3.

## When to use
- Called by `deepask/orchestrator` (Stage 3), once per sub-need, fanned out in parallel.

## Inputs
- `sub_need` (text + ia_type) and its `ResolverPlan v1` (`content_axis`, `capability_axis`, `governance_constraints`, `goal_metrics`, `no_coverage`).

## Process (Sprint 1 — READ-only)

### 1. Read each `content_axis` recipient
For each entry, dispatch the read per the recipient's `invoke` contract:
- `page/<slug>` → `Read("<path>")` · `wiki/<slug>` → `mcp__supabase-ops__wiki_ask` / `wiki_get_page`
- `view/<schema>__<name>` or `metric/<id>` → `mcp__supabase-ops__query` (SELECT)
- `external-source/<id>` → per the entry's invoke pattern (read-only)
- gbrain (derived-memory) → `mcp__gbrain__{search,recall,traverse}` — **prefer cheap `search`/`recall` over `think`**; respect the $100/mo cap (degrade gracefully if capped → record as a gap, don't fail the run).

### 2. AUTHOR the concrete call, grounded in schema (the crux)
deepask does NOT receive pre-written SQL. For a `view`/`metric` read:
- If the plan carries `columns_hint`, use it directly.
- Else **read the DDL first** (`supabase/migrations/*.sql`) or the metric def (`knowledge/kpi-ownership.yaml#<id>`) — then compose the SELECT. **NEVER invent a column name** (CLAUDE.md operating principle 3).
- `mcp__supabase-ops__query` is read-only by tool contract (SqlGuard rejects writes). Use the plan's `grounding_ref` to know what to read before writing.
- Worked example (MRR MoM): plan → `content_axis:[metric/mrr]`, `grounding_ref: kpi-ownership.yaml#mrr` (source `ops.kpi_snapshots`) → read grounding → write `SELECT date_trunc('month',ts), value FROM ops.kpi_snapshots WHERE kpi_id='mrr' …` → run → return evidence + the SQL + freshness.

The same authoring principle applies to every recipient: deepask frames the precise `wiki_ask` question / gbrain query / read params itself, grounded in the recipient's contract.

### 3. Firewall (hard, always)
**Product data ONLY via `metrics.*` views** (the ETL mirror). NEVER query `product.*` / the product Supabase directly — the `pre-tool-supabase-product` hook blocks it (D-MAX). If a sub-need seems to need product data not in `metrics.*`, that's an honest gap (`gap_reason='not_built'`, `remedy="expand the metrics.* ETL"`), not a firewall bypass.

### 4. Bounded self-correction
On a query/tool error: inspect → re-read the schema/DDL → retry **once** → else emit an honest `no_coverage` for that leg ("can't safely query X — schema mismatch"). **NEVER fabricate a result row.**

### 5. Tier-B+ capability legs (Sprint 1: surface only)
If the `ResolverPlan.capability_axis` contains a Tier-B+ (side-effecting) recipient, **do not run it** — record it as a surfaced suggestion for the orchestrator to present ("to answer fully I'd run X (Tier B) — approve?"). Auto-running Tier-A capabilities + the full surface/HITL wiring is Sprint 3.

## Output (per sub-need, to the orchestrator)
```yaml
evidence:
  - claim_support: "<what this supports>"
    source_ref: "<recipient_id + concrete locator (path / SQL / wiki page)>"
    authority: "SoR|SoR-external|derived-memory|scratch"
    freshness: "static|hourly|daily|live|unknown"
    retrieved_at: "<ts>"
    got_data: true|false
surfaced_capabilities: [ { recipient, hitl_tier, why } ]   # Tier-B+, NOT run (S1)
gaps: [ { facet, gap_reason: no_match|stale|empty|not_built|breaker_budget, remedy } ]
```
This feeds `ops.deepask_coverage` (one row/sub-need) + Stage-4 synthesis.

## Constraints
- **No routing** — execute runs the plan it's given; it never decides WHICH recipient (resolver-plan did).
- Read-only in Sprint 1; every claim must carry a `source_ref` (no uncited evidence reaches synthesis).
- Subscription billing in-session; gbrain under cap; API key out-of-band only.

## HITL / cost
Tier A (reads). Tier-B+ legs surfaced (S3 wires the approval). Cost-bucket `ai-ops-deepask` + capped gbrain reads.

## Tests (per spec §10)
read-only enforced; **product.* attempt blocked** (firewall); **invalid column → re-reads schema → retry → honest no_coverage, never fabricated rows** (negative test); gbrain-cap degrade → gap not crash; partial-failure of one leg doesn't sink the run; every evidence item has a source_ref.
