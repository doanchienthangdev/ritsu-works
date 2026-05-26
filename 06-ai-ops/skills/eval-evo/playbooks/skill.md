---
playbook_for: skill
judge_persona: "@cto"
proposer_persona: eval-evo-orchestrator
composite_range: [0, 100]
sub_score_count: 10
allowed_paths_for_proposer:
  - "<entity-dir>/SKILL.md"
  - "<entity-dir>/README.md"
  - "<entity-dir>/cases/**"
  - "<entity-dir>/tests/**"
sub_scores:
  - id: C1
    name: "Description quality"
    what_10_looks_like: "Frontmatter description is 30+ chars, names specific trigger words, discovery-friendly. Reads like an instruction to an LLM about when to invoke."
    what_0_looks_like: "Missing or 'do stuff' or generic placeholder."
  - id: C2
    name: "Process step ordering"
    what_10_looks_like: "Numbered steps in logical sequence; each step references inputs from prior step or produces outputs consumed downstream."
    what_0_looks_like: "Steps in arbitrary order; nonsequential prerequisites; missing setup."
  - id: C3
    name: "Output specificity"
    what_10_looks_like: "Says exactly where files go ('writes to .archives/<id>/foo.md'); cites canonical paths and uses absolute references."
    what_0_looks_like: "Vague 'saves output' or 'persists data' with no path."
  - id: C4
    name: "Cost discipline"
    what_10_looks_like: "Documents per-invocation cost estimate; cites budget bucket from governance/ROLES.md; respects per-task-kind caps."
    what_0_looks_like: "No cost mention; no budget bucket; could invoke expensive operations without thought."
  - id: C5
    name: "Drift contribution"
    what_10_looks_like: "Running this skill keeps `pnpm check` clean; uses canonical schemas; doesn't introduce L1/L2 drift."
    what_0_looks_like: "Skill writes files that break invariants; ignores cross-tier consistency."
  - id: C6
    name: "Episodic-recall friendliness"
    what_10_looks_like: "Emits ~150-token run_summary on completion; uses standard ops.run_summaries schema; future invocations can recall this run."
    what_0_looks_like: "No run_summary emission; future runs are amnesic."
  - id: C7
    name: "HITL discipline"
    what_10_looks_like: "Respects tier per governance/HITL.md; classifies its own actions correctly; doesn't autonomously touch Tier 1 paths."
    what_0_looks_like: "Bypasses HITL silently; auto-writes to 00-core/ or governance/."
  - id: C8
    name: "Golden-case battery alignment"
    what_10_looks_like: "Has 2+ golden cases in cases/<name>/; outputs match expected on those cases; Goodhart-resistant."
    what_0_looks_like: "No cases; behavior brittle and unverifiable."
  - id: C9
    name: "Documentation cross-refs"
    what_10_looks_like: "Cites canonical spec at wiki/capabilities/<id>/spec.md; cites relevant SOPs; cites related skills it composes with."
    what_0_looks_like: "Self-contained; no cross-refs; can't be located by readers searching for related work."
  - id: C10
    name: "Resilience to misuse"
    what_10_looks_like: "Validates inputs; explicit error classes with named exceptions; refuses unsafe directives in entity content."
    what_0_looks_like: "Trusts inputs blindly; silent failures; catch-all error handling."
version: 0.1.0
spearman_holdout_status: pending_founder_ratings
spearman_holdout_threshold: 0.6
---

# Playbook — Scoring `skill`-type entities

> **Version 0.1.0 (Sprint 1).** Refined via founder hold-out validation in
> Sprint 3 (§6.13c PLAN.md). Ship gate: Spearman correlation ≥ 0.6 against
> `cases/_HOLDOUT.yaml` founder ratings.

## Composite formula

```
composite = sum(sub_scores)
```

Simple sum, 0-100 range. NO weights v1.0 (Karpathy K1 discipline).

## The 10 sub-scores

(See frontmatter `sub_scores` array above for canonical machine-readable
definitions. The prose below repeats them for human readers.)

| # | Name | What "10" looks like | What "0" looks like |
|---|---|---|---|
| C1 | Description quality | Frontmatter `description` 30+ chars, names specific trigger words, discovery-friendly | Missing or "do stuff" |
| C2 | Process step ordering | Numbered steps in logical sequence; each references inputs/outputs from neighbors | Arbitrary order |
| C3 | Output specificity | Says exactly where files go; canonical paths | Vague "saves output" |
| C4 | Cost discipline | Documents per-invocation cost; cites budget bucket; respects caps | No cost mention |
| C5 | Drift contribution | Running this keeps `pnpm check` clean | Writes break invariants |
| C6 | Episodic-recall friendliness | Emits run_summary on completion; uses standard schema | No run_summary emission |
| C7 | HITL discipline | Respects tier per HITL.md; doesn't autonomously touch Tier 1 | Bypasses HITL silently |
| C8 | Golden-case battery alignment | Has 2+ cases in cases/<name>/; outputs match | No cases; brittle |
| C9 | Documentation cross-refs | Cites canonical spec + related SOPs + related skills | Self-contained, no refs |
| C10 | Resilience to misuse | Validates inputs; explicit error classes | Trusts blindly; silent fails |

## Judge persona

**@cto** per spec §6.3. Code-aware persona evaluating skill prompt quality
+ structural discipline. Same persona scores both pre and post (within-iter);
across-iter variance flagged by orchestrator if >5 pts on unchanged artifact.

## Allowed paths for proposer

Per Karpathy K3 (ONE editable artifact):

```yaml
allowed_paths_for_proposer:
  - "<entity-dir>/SKILL.md"
  - "<entity-dir>/README.md"
  - "<entity-dir>/cases/**"   # added v1.1 — capability `update` Sprint 1
  - "<entity-dir>/tests/**"   # added v1.1 — capability `update` Sprint 1
```

`<entity-dir>` resolves to the skill's own folder. Proposer must NOT
write outside this folder (no edits to sibling skills, no edits to
upstream callers). `cases/` + `tests/` are within-folder by design so
/update's test-gen skill can add regression tests under each entity's
own footprint (no central tests/ tree to drift).

## Tier classification (per HITL.md)

- Skills under `06-ai-ops/skills/` are Tier B (claude-config space).
- Exception: skills that write to Tier 1 (e.g., capability-lifecycle/
  catalog-updater editing `knowledge/capability-registry.yaml`) are Tier
  C for the eval+evo install step.

The orchestrator detects this by analyzing the diff:
- If diff touches only files under `06-ai-ops/skills/<name>/`: Tier B
- If diff touches paths matched by `governance/`, `00-core/`,
  `knowledge/*.yaml`, or any pillar SOP: Tier C+ (refused unless
  --tier-override; PR path)

## Anti-Goodhart prompts (built into score-skill SKILL.md)

The judge prompt explicitly instructs:
- "Score what's TRULY good, not what scores well on these specific criteria"
- "If a criterion doesn't apply, give it 5 (neutral) and explain in rationale"
- "temp=0" for stability
- Past founder corrections loaded as negative signal

## Hold-out validation (Sprint 3 gate)

Spearman rank correlation between this playbook's scores and founder's
1-10 ratings on 5 representative skills, stored at
`06-ai-ops/skills/eval-evo/cases/_HOLDOUT.yaml`. Ship gate: correlation ≥ 0.6.

If correlation <0.6, this playbook is REVISED before /evolve invocations
proceed (`scripts/eval-evo/playbook-validate.cjs --type=skill` enforces).

## Versioning

- v0.1.0: Sprint 1 ship — frontmatter + prose duplicate
- v0.2.0: Sprint 3 post-Spearman tune (expected)
- v1.0.0: Phase 8 promotion

## Operational signal weighting (v1.1 candidate)

Future: judge MAY augment score with operational evidence from `ops.agent_runs`
for this skill — cost trend, outcome rate, drift incident count.
**NOT IN v1.0** to keep rubric simple. v1.1 adds `--evidence` flag.
