---
name: resolver-plan
description: |
  Assemble a populated ResolverPlan v1 (= a first-class, populated context_recipe)
  for an intent (or a batch of sub-needs). Calls mcp__supabase-ops__resolver_find for axis-tagged +
  enriched candidates, then SESSION-MODEL splits them into content_axis (recipients you
  READ — carry authority/freshness/grounding_ref/columns_hint) vs capability_axis
  (recipients you RUN — carry hitl_tier/side_effect/cost_bucket), attaches
  governance_constraints (ALWAYS page/governance-HITL when any capability is HITL tier
  B+) + goal_metrics + primary_lens, and emits an honest no_coverage list. The planning
  layer that lets orchestrators (deepask) consume an executable plan with ZERO routing of
  their own. Output schema: knowledge/schemas/resolver-plan.schema.json. Subscription
  billing (session model); no API key; read-only except a best-effort plan-mode audit row.
status: active
version: 1.0.0
hitl_max_tier: A
role_scope: ['*']
home_pillar: 06-ai-ops
spec: .archives/cla/resolver-plan/spec.md
allowed-tools:
  - mcp__supabase-ops__resolver_find
  - mcp__supabase-ops__insert
  - Read
---

# Skill: resolver-plan (v1)

> Companion to `resolver-query`. `resolver-query` answers "WHICH recipient?";
> `resolver-plan` answers "here is the 2-axis EXECUTION PLAN — READ these / RUN these,
> grounded for query-authoring + tier-tagged for safe auto-run." The plan IS a populated
> `context_recipe` (the optional shape from `resolver-query`/`/resolver`, now first-class
> and filled in). Output schema: `knowledge/schemas/resolver-plan.schema.json`
> (ResolverPlan v1). Full contract + field provenance:
> `.archives/cla/resolver-plan/refs/03-design-decisions.md`.

## When to use this skill

A consumer needs a directly-executable plan for an intent — the content to READ +
the capabilities to RUN, grounded for authoring a concrete read/query and tier-gated for
safe auto-run. **Primary consumer: `/deepask`** (it calls this once per sub-need, then
its execute stage authors the concrete SQL/tool calls). Also reachable as
`/resolver plan "<intent>"` for operators.

You do NOT use this skill to merely "find a recipient" — that is `resolver-query` / Mode A
ambient reasoning over `INDEX.md`. Use `resolver-plan` only when you want the assembled
2-axis plan object.

## Invocation

```
Skill({ skill: "resolver-plan" })
```

Input (one of `intent` | `sub_needs` is required):

| Field | Type | Required | Meaning |
|---|---|---|---|
| `intent` | string | one-of | A single sub-need → returns ONE `ResolverPlan`. |
| `sub_needs` | string[] | one-of | A batch of sub-needs → returns `{ plans: ResolverPlan[] }` (same order). |
| `sources_filter` | string[] | no | Constrain which IA kinds/axes to consider (e.g. `["page","metric"]`, or axis `["content"]`). Maps to the `kind`/`axis` filter on `mcp__supabase-ops__resolver_find`. |
| `role` | string | no | Override caller role for the role_scope filter (default: `MCP_CALLER_ROLE`). |

Also surfaced as `/resolver plan "<intent>" [--sources=<csv>] [--json]`.

## Algorithm (session model — NO subprocess LLM, NO API key)

The deterministic keyword pre-filter + axis tagging + enrichment all happen INSIDE
`mcp__supabase-ops__resolver_find` (no LLM there). This skill is the session model doing only
**assembly + selection** over the candidates the tool returns — subscription billing,
no API key (per `external-source/anthropic-api` policy).

For each sub-need (the single `intent`, or each element of `sub_needs`):

1. **Find candidates.** Call
   `mcp__supabase-ops__resolver_find({ intent: <sub-need>, include_composition: true, include_recency: true, role: <role?>, kind/axis: <from sources_filter?>, limit: 20 })`.
   Each returned `match` carries `axis` + enrichment:
   - content → `authority`, `freshness`, `grounding_ref`, `columns_hint?`
   - capability → `hitl_tier`, `side_effect` (+ `cost_bucket` if known)
   **Respect the 20-find/4h/session breaker: exactly ONE find per sub-need.** If the
   response includes `session_warning` (≥15/20) OR `error: session_cap_exceeded`, STOP
   issuing finds — assemble plans for the sub-needs already resolved and mark the rest
   `no_coverage` (`reason: "no_match"`, remedy noting the breaker). Never loop find().

2. **Partition by axis** (read the `axis` field — do NOT re-derive it):
   - `axis === "content"` → a `content_axis` item:
     `{ recipient: <id>, invoke: <match.invoke>, authority, freshness, grounding_ref: <match.grounding_ref ?? null>, columns_hint?: <match.columns_hint> }`.
   - `axis === "capability"` → a `capability_axis` item:
     `{ recipient: <id>, invoke: <match.invoke>, hitl_tier, side_effect, cost_bucket?: <match.cost_bucket ?? null> }`.
   - `axis === "meta"` (the `capability` registry kind) → it is neither read nor run;
     do NOT place it in either axis. Cite it under `no_coverage` ONLY if it is the
     closest thing to a facet and there is no real content/capability for that facet
     (`reason: "not_built"`, remedy `/cla propose` / `/cla update <id>`).
   Select the relevant candidates by reading them — drop off-topic high-keyword-score
   noise; keep the ones that actually serve the sub-need (this is the session-model
   judgment the tool cannot do).

3. **governance_constraints** (the load-bearing safety rule):
   **ALWAYS include `page/governance-HITL` when ANY `capability_axis` item has
   `hitl_tier` in {B, C, D-Std, D-MAX}** (i.e. is side-effecting). A consumer that
   auto-runs a Tier-B+ capability without HITL is the failure this prevents. Add bounding
   `metric/*` recipients when the sub-need is metric-constrained (e.g. a budget cap). The
   deterministic helper `scripts/resolver-v2/plan-audit.cjs#governanceRequiresHitl(capability_axis)`
   encodes exactly this B+ rule — the plan MUST agree with it.

4. **goal_metrics / primary_lens / ia_type_hint** (session-model selection):
   - `goal_metrics`: the `metric/*` recipient(s) the sub-need ultimately bears on.
   - `primary_lens`: a `persona/*` framing if one clearly applies (else omit).
   - `ia_type_hint`: a coarse A|B|C|D IA-type label if confidently classifiable (else omit).

5. **no_coverage** (honest gaps): for any facet of the sub-need where
   `mcp__supabase-ops__resolver_find` returned no usable match (`matches: []` / `no_match_reason`),
   OR a matched source is stale / empty / not-yet-built, append
   `{ facet, reason: "no_match"|"stale"|"empty"|"not_built", remedy }`. Never silently
   drop a facet; never substitute training-data knowledge for a missing source.

6. **Validate + return.** The assembled object MUST validate against
   `knowledge/schemas/resolver-plan.schema.json` (single `ResolverPlan`, or the
   `{ plans: [...] }` batch wrapper). Return it. `content_axis`, `capability_axis`,
   `governance_constraints`, `goal_metrics`, `no_coverage` are REQUIRED keys (empty array
   when nothing applies) so consumers iterate without presence-checks.

7. **Plan-mode audit (best-effort, non-blocking).** Build the audit row with
   `scripts/resolver-v2/plan-audit.cjs#buildPlanAuditRow({ plan, intent, callerRole, latencyMs, findCalls })`
   and write it via `mcp__supabase-ops__insert`:

   ```json
   {
     "table": "ops.resolver_decisions",
     "rows": [
       {
         "trigger": "<intent>",
         "trigger_normalized": "<normalized intent>",
         "matched_route_id": null,
         "confidence": null,
         "semantic_used": false,
         "caller_role": "<role>",
         "latency_ms": 0,
         "decision": "dispatch_silently | surface_candidates | no_match",
         "mode": "A2",
         "plan_payload": { /* the assembled ResolverPlan v1 (single or {plans:[...]}) */ },
         "catalog_files_loaded": ["recipients/*.md (via mcp__supabase-ops__resolver_find)"],
         "metadata": { "kind": "resolver-plan", "sub_need_count": 1, "no_coverage_count": 0, "find_calls": 1 }
       }
     ]
   }
   ```

   Plan rows are discriminated as `mode='A2' AND plan_payload IS NOT NULL` (per migration
   00044; **no `'PLAN'` mode token** — @cto Phase-5 decision). The write is fire-and-forget:
   if it fails (RLS / DB down), still return the plan — audit loss must never block planning.

## Output schema (single)

```yaml
schema_version: "1.0"
sub_need: "<sub-question text>"
ia_type_hint: "A|B|C|D"                  # OPTIONAL
primary_lens: ["persona/<id>"]            # OPTIONAL
content_axis:                             # READ these — REQUIRED key (may be [])
  - recipient: "page/core-pricing"
    invoke: "Read(\"00-core/pricing-philosophy.md\")"
    authority: "SoR|SoR-external|derived-memory|scratch"
    freshness: "static|hourly|daily|live|unknown"
    grounding_ref: "<file/migration/kpi-id> | null"   # OPTIONAL
    columns_hint: ["col_a", "col_b"]                  # OPTIONAL (view/metric)
capability_axis:                          # RUN these (HITL-gated) — REQUIRED key (may be [])
  - recipient: "skill/cost-report"
    invoke: "Skill({skill:\"cost-report\"})"
    hitl_tier: "A|B|C|D-Std|D-MAX"
    side_effect: "none|write|send|money|publish"
    cost_bucket: "gbrain.<role>.<op> | null"          # OPTIONAL
governance_constraints: ["page/governance-HITL", "metric/<id>"]   # REQUIRED key
goal_metrics: ["metric/<id>"]             # REQUIRED key (may be [])
no_coverage:                              # REQUIRED key (may be [])
  - { facet: "<unresolved facet>", reason: "no_match|stale|empty|not_built",
      remedy: "ingest via /wiki sync | wire MCP <x> | build via /cla propose" }
```

Batch: `{ plans: [ <ResolverPlan>, ... ] }` — one per `sub_needs[i]`, same order.

## Guarantees / INVARIANTS

- **INV-1 (deterministic substrate):** axis + enrichment come from the catalog
  (generator-emitted, surfaced by `mcp__supabase-ops__resolver_find`). This skill READS those fields;
  it never re-derives axis or invents enrichment. No LLM in the find subprocess; no API key.
- **INV-2 (HITL-in-governance):** `page/governance-HITL` is present in
  `governance_constraints` whenever any capability is HITL tier B+ — agrees with
  `plan-audit.cjs#governanceRequiresHitl`.
- **INV-3 (breaker):** exactly one `mcp__supabase-ops__resolver_find` per sub-need; never loop. Warn at
  ≥15/20; degrade to `no_coverage` at the cap.
- **INV-4 (firewall + no writes):** product data only via `metrics.*` (never the Product
  Supabase); the ONLY write this skill performs is the best-effort `ops.resolver_decisions`
  audit row. No other Tier-2/3 write.
- **INV-5 (honest coverage):** every unresolved facet appears in `no_coverage`; never a
  silent partial; never training-data substitution for a missing source.
- **INV-6 (plan ⊇ context_recipe):** the plan is a superset of the `context_recipe` shape —
  a consumer that only understands `context_recipe` reads `primary_lens` /
  `governance_constraints` / `goal_metrics` and ignores the execution fields.

## Division of labor (who writes the concrete call)

resolver-plan supplies **WHICH recipient + the interface + a grounding pointer**, NOT the
literal SQL/params/prompt. The consumer's execute stage (e.g. deepask, session model)
authors the concrete invocation, grounded in the `grounding_ref`/`columns_hint` (read the
DDL/KPI def before writing SQL; never invent column names — CLAUDE.md operating principle 3).
`mcp__supabase-ops__query` is read-only by tool contract, so a consumer's SQL cannot mutate,
and the firewall hook keeps product data to `metrics.*`.

## Cost / skip notes

- **Cost:** session-model assembly = Claude Code subscription (NO API key, per
  `external-source/anthropic-api`). Per find ≈ ~80-440ms MCP + session ranking, $0 API.
  A standard plan is ≤6 sub-needs (≤6 finds); deep ≤12 — budget against the 20-find/4h cap.
- **Skip the find entirely** for a sub-need you can resolve from the ambient `INDEX.md`
  AND that needs no composition/recency/enrichment — but you then LOSE the enrichment
  (`hitl_tier`/`authority`/`grounding_ref`) the plan needs, so in practice planning calls
  find. Do NOT skip find just to save a call if the plan would lose its tier tags.
- **Audit is best-effort** — never blocks; a failed insert returns the plan with no
  `audit_run_id`.

## Failure modes

| Code / signal | Cause | Handling |
|---|---|---|
| `INVALID_INPUT` | neither `intent` nor `sub_needs` given (or empty) | Throw; caller must supply one. |
| `session_cap_exceeded` (from find) | 21st find in 4h window | STOP find()'ing; assemble resolved sub-needs; mark rest `no_coverage`. Likely a loop bug — restart session to reset. |
| `no_match` (empty `matches[]`) | no recipient passes keyword pre-filter for a facet | Record the facet in `no_coverage` (`reason: "no_match"`); broaden the sub-need or `/cla propose`. |
| `degraded: true` (catalog corrupt) | `recipients/*.md` unparseable | find returns INDEX-only; assemble what you can; flag remaining facets `no_coverage`. Fix catalog + `pnpm resolver:index`. |
| `AUDIT_WRITE_FAILED` | `ops.resolver_decisions` insert failed | Best-effort: warn, return the plan anyway (no `audit_run_id`). |

## See also

- Output schema: `knowledge/schemas/resolver-plan.schema.json`
- Deterministic helper (audit row + B+ governance rule): `scripts/resolver-v2/plan-audit.cjs`
- Find tool (axis-tagged candidates): `mcp-server/src/tools/resolver-find.ts`
- Companion skill: `06-ai-ops/skills/resolver-query/SKILL.md`
- Command surface: `.claude/commands/resolver.md` (`/resolver plan`)
- Contract + field provenance: `.archives/cla/resolver-plan/refs/03-design-decisions.md`
- Capability spec: `.archives/cla/resolver-plan/spec.md` (→ `wiki/capabilities/resolver-plan/spec.md` after Phase 8)
- Audit table: `ops.resolver_decisions` (mode='A2' + plan_payload; migrations 00034/00035/00038/00044)
- Governance: `governance/HITL.md` (tier classification — the B+ rule); `governance/ROLES.md` (role_scope)
- Policy: `knowledge/recipients/external-sources.md` entry `external-source/anthropic-api` (session billing, no API key)
