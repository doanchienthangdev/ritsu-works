---
playbook_for: sop
judge_persona: "@cto"
proposer_persona: eval-evo-orchestrator
composite_range: [0, 100]
sub_score_count: 10
allowed_paths_for_proposer:
  - "06-ai-ops/sops/<name>/flow.yaml"
  - "06-ai-ops/sops/<name>/README.md"
  - "06-ai-ops/sops/<name>/cases/**"
  - "06-ai-ops/sops/<name>/tests/**"
sub_scores:
  - id: C1
    name: "flow.yaml schema validity"
    what_10_looks_like: "flow.yaml parses; required fields present; matches the SOP yaml schema (when one exists)."
    what_0_looks_like: "flow.yaml malformed; missing required fields."
  - id: C2
    name: "Phase reachability"
    what_10_looks_like: "No orphan phases; every phase reachable from start; explicit terminal phases marked."
    what_0_looks_like: "Phases referenced but never invoked; dead branches."
  - id: C3
    name: "HITL tier consistency"
    what_10_looks_like: "Each phase has explicit hitl tier; matches HITL.md taxonomy; tier progression makes sense (don't gate cheap phases at C, don't auto-advance expensive irreversible ones)."
    what_0_looks_like: "Mixed conventions; or all phases set to same tier without thought."
  - id: C4
    name: "Failure handling per phase"
    what_10_looks_like: "Each phase has explicit failure_handling block: what triggers; what happens; who's notified."
    what_0_looks_like: "Failures undefined; SOP halts silently on first error."
  - id: C5
    name: "Cost-bucket assignment"
    what_10_looks_like: "SOP cites its cost_bucket; per-phase cost estimates documented; respects governance/ROLES.md role budgets."
    what_0_looks_like: "No cost discussion; SOP could blow budget without warning."
  - id: C6
    name: "Event emission discipline"
    what_10_looks_like: "Each phase emits ritsu.* events with documented payload; downstream subscribers can chain off it."
    what_0_looks_like: "No events; SOP is opaque to event-driven listeners."
  - id: C7
    name: "Documentation coherence"
    what_10_looks_like: "README.md matches flow.yaml structure; phase names, HITL tiers, failure_handling all aligned across files."
    what_0_looks_like: "README and flow.yaml drift; reader confused which is canonical."
  - id: C8
    name: "Idempotency / resume"
    what_10_looks_like: "SOP can be safely re-invoked from any phase without duplicating effects; resume mechanism documented."
    what_0_looks_like: "Re-invocation duplicates work or corrupts state."
  - id: C9
    name: "Tier 1 + Tier 2 references"
    what_10_looks_like: "Cites all knowledge/*.yaml files SOP depends on; documents ops.* tables written and read."
    what_0_looks_like: "Reads/writes Tier 1/2 without documentation."
  - id: C10
    name: "Drift hygiene"
    what_10_looks_like: "SOP triggers pnpm check at appropriate gates; doesn't ship outputs that break invariants."
    what_0_looks_like: "No drift discipline; SOP completion ≠ system clean."
version: 0.1.0
spearman_holdout_status: pending_founder_ratings
spearman_holdout_threshold: 0.6
---

# Playbook — Scoring `sop`-type entities

> Version 0.1.0 (Sprint 1 stub). Frontmatter canonical; prose in Sprint 2.

## Composite

`composite = sum(sub_scores)`, 0-100.

## Judge persona

**@cto** per spec §6.3. SOPs are process governance — code-aware persona.

## Allowed paths

```
06-ai-ops/sops/<name>/flow.yaml
06-ai-ops/sops/<name>/README.md
```

Proposer must NOT touch sibling SOPs or supporting skills.

## Tier note

SOPs are **Tier C** per HITL.md (process governance). /evolve on an SOP
ALWAYS opens a PR.

## SOP yaml schema

If/when a JSON Schema is created for SOP `flow.yaml` files
(`knowledge/schemas/sop-flow.schema.json` — not yet existent), C1 of this
playbook delegates the structural validation to that schema and only
scores AGAINST it. Until then, C1 is judged by the @cto persona reading the
flow.yaml directly.
