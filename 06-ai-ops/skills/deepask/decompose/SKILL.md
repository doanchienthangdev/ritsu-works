---
name: decompose
description: deepask Stage 1 — splits a question into MECE sub-needs, each tagged by IA type (A System-of-Record / B Derived-memory / C Scratch / D Conduit). Depth-bounded (≤6 standard / ≤12 deep) and budget-capped by the orchestrator's resolver-budget accountant. Reuses thinking-toolkit/{tosca,mece-decomposition-check,driver-tree-decomposition}. Pure decomposition — no routing (that's resolver-plan), no retrieval.
---

# deepask/decompose (capability `deepask` v1.0)

> Stage 1 of the deepask loop. Turns one question into a clean set of sub-needs the
> orchestrator can resolve+execute independently. Quality of the whole answer starts here:
> a bad decomposition → gaps or overlap downstream.

## When to use
- Called by `deepask/orchestrator` after the Stage-0 budget gate, with an `allowedSubNeeds` cap.

## Inputs
- `question` (1–500 chars).
- `maxSubNeeds` — the orchestrator's budget-approved cap (from `computeBreakerBudget`; ≤6 standard / ≤12 deep, possibly capped lower).
- `--sources` filter (optional) — restricts which IA types are in-scope.

## Process
1. **Frame** the question with `thinking-toolkit/tosca-problem-framing` if it's ambiguous (extract the real ask).
2. **Decompose** into sub-needs using `thinking-toolkit/driver-tree-decomposition` (break the question into the independent things you must learn to answer it).
3. **MECE-check** with `thinking-toolkit/mece-decomposition-check` — no overlap (two sub-needs asking the same thing), no gap (a facet of the question with no sub-need). Merge overlaps; add missing facets.
4. **Tag each sub-need with its IA type** (the hint resolver-plan uses):
   - **A — System-of-Record:** authoritative truth → Tier-1 git (`Read`/`Grep`), `ops.*`/`metrics.*` via `mcp__supabase-ops__query`, Tier-3 blobs.
   - **B — Derived-memory:** distilled meaning → gbrain (`search`/`recall`/`think`/`traverse`), wiki (`wiki_ask`).
   - **C — Scratch:** transient/local → `raw/`, `.archives/`, `runtime/`.
   - **D — Conduit:** gateway / 3rd-party / web → MCP + (web leg → `deep-research`).
   A sub-need may carry a primary + secondary IA tag (e.g., "are we on track for 100-paying?" = A metric + B retro context).
5. **Enforce the bound:** if the natural decomposition exceeds `maxSubNeeds`, merge the lowest-value sub-needs (or, if the orchestrator capped due to breaker budget, keep the highest-value ones and let the completeness-critic surface the rest as an honest gap). NEVER silently drop a facet without recording it.
6. Honor `--sources`: drop sub-needs whose only IA type is excluded by the filter (and note them as out-of-scope-by-filter, not as gaps).

## Output (to the orchestrator)
```yaml
sub_needs:
  - text: "<sub-question>"
    ia_type: "A|B|C|D"
    ia_secondary: "A|B|C|D|null"
    rationale: "<why this is a distinct facet>"
mece_check: { overlap: none|<note>, gap: none|<note> }
dropped: [ { text, reason: "over_budget|out_of_scope_filter" } ]   # recorded, never silent
```

## Constraints
- **No routing.** decompose says WHAT to learn + its IA type; resolver-plan decides WHERE/HOW. Do not name specific recipients here.
- **No retrieval.** decompose reads nothing external; it only structures the question.
- Deterministic-ish: same question + cap → stable decomposition (helps the future /evolve learning loop).

## HITL / cost
Tier A (pure reasoning, in-session subscription). No external calls. Cost-bucket `ai-ops-deepask`.

## Tests (per spec §10, land with this skill's sprint)
MECE (no overlap/gap on a known multi-facet question); bound enforcement (n>cap → merges, records dropped); degenerate (1-word question → 1 sub-need; huge question → capped + honest dropped list); `--sources` filter excludes correctly (out_of_scope_filter, not gap).
