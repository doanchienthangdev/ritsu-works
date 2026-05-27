---
playbook_for: skill-skillopt
judge_persona: "@cto"
proposer_persona: eval-evo-orchestrator
composite_range: [0, 100]
sub_score_count: 10
allowed_paths_for_proposer:
  - "<entity-dir>/SKILL.md"
  - "<entity-dir>/README.md"
  - "<entity-dir>/cases/**"
allowed_paths_for_proposer_notes: |
  Same write surface as playbooks/skill.md — proposer edits the SKILL.md
  (or its cases) based on minibatch reflection, not the rollout subagent
  itself. SkillOpt's rollout/optimizer agents (.claude/agents/skillopt-*)
  are sealed: tools=[] for structural defense per @cto Phase 5 MUST-FIX 3.
sub_scores:
  - id: C1
    name: "Task input comprehension"
    what_10_looks_like: "Trajectory shows the rollout parsed task.input, identified key constraints, and acted within them; output addresses the precise ask."
    what_0_looks_like: "Output ignores or contradicts task.input; rollout pursued tangent unrelated to the task framing."
  - id: C2
    name: "Rubric criterion coverage"
    what_10_looks_like: "Final output demonstrably satisfies each rubric criterion; judge scores ≥0.8 with rationale anchored to specific output passages."
    what_0_looks_like: "Output misses ≥half rubric criteria; judge can't locate evidence for any specific criterion."
  - id: C3
    name: "Edge-case handling"
    what_10_looks_like: "Difficulty-3 tasks succeed at ≥40% rate; null/empty/boundary inputs produce explicit refusal or graceful default; no crash trajectories."
    what_0_looks_like: "Difficulty-3 tasks succeed <10%; edge inputs cause hallucinated default that judge marks fail; rollouts crash or time out."
  - id: C4
    name: "Output format compliance"
    what_10_looks_like: "Output matches SKILL.md's declared output shape (JSON/markdown/etc.); parser-friendly; downstream consumer can ingest without massage."
    what_0_looks_like: "Output is prose where structure required; JSON has trailing commas; markdown has unclosed code fences; downstream parse fails."
  - id: C5
    name: "Self-grade calibration"
    what_10_looks_like: "abs(self_grade_score - judge_score) ≤0.15 across the minibatch; rollout's self-assessment tracks reality."
    what_0_looks_like: "abs(self_grade_score - judge_score) >0.3; rollout systematically over-grades (claims pass on what judge calls fail)."
  - id: C6
    name: "Anchor consistency"
    what_10_looks_like: "Outputs consistent with 00-core anchor (brand voice, product positioning, principles) prepended at Pillar 5; no off-brand voice."
    what_0_looks_like: "Outputs contradict brand voice (e.g., corporate-stiff where Ritsu is direct/casual); ignores Pillar 5 context entirely."
  - id: C7
    name: "Token efficiency per rollout"
    what_10_looks_like: "Median trajectory ≤800 tokens; 95th-pct ≤1500. Skill achieves the rubric without verbose padding."
    what_0_looks_like: "Median trajectory ≥1500 tokens; 95th-pct ≥3000. Skill rambles; trajectory inflates without proportional rubric gain."
  - id: C8
    name: "Failure mode legibility"
    what_10_looks_like: "When a rollout fails, the trajectory explicitly names which rubric criterion failed and why; judge confidence remains 'high'."
    what_0_looks_like: "Failed rollouts produce silent or generic failures; judge has to guess what went wrong; confidence drops to 'low'."
  - id: C9
    name: "Cross-pillar generalization"
    what_10_looks_like: "Score is balanced across pillars 1-4; no pillar shows >2x higher fail-rate than the mean. Skill generalizes beyond gold examples."
    what_0_looks_like: "Pillar-1 (gold) scores 0.9+ but Pillar-3 (wiki RAG) scores <0.4. Skill memorized canonical examples without learning the underlying task."
  - id: C10
    name: "Held-out test split delta"
    what_10_looks_like: "Post-install judge score on a held-out 30% split improves ≥0.1 over pre-install baseline; gain is real, not training-set memorization."
    what_0_looks_like: "Held-out delta is ≤0 or negative; skill regressed on unseen tasks; SkillOpt iteration over-fit to the training minibatch."
version: 0.1.0
spearman_holdout_status: pending_founder_ratings
spearman_holdout_threshold: 0.6
---

# Playbook — Scoring `skill`-type entities via SkillOpt held-out task completion

> **Version 0.1.0 (Sprint 2 of /evolve v1.1).** Complementary to `playbooks/skill.md`
> (the v1.0 text-quality rubric). This playbook measures **task completion** on a
> held-out test split rather than SKILL.md authoring quality. Ship gate: Spearman
> correlation ≥ 0.6 against `cases/_HOLDOUT.yaml` founder ratings, plus production
> calibration via `KPI skillopt_synth_to_prod_correlation` (target ≥ 0.5).

## When this playbook applies

Invoked by `eval-evo/skillopt-runner` (Sprint 3) at the end of a `/evolve skillopt`
iteration to compute a single composite score from the minibatch of judge scores
produced by `eval-evo/skillopt-judge`. The composite informs the K4 keep-or-revert
decision per spec §19.6 Phase D.

Distinct from `playbooks/skill.md`:
- `skill.md` scores **SKILL.md authoring** (description quality, process clarity, etc.)
- `skill-skillopt.md` scores **skill execution** (does the skill actually accomplish
  tasks on a held-out split?)

Both are valid lenses; the v1.1 capability uses both — `skill.md` for the v1.0
in-session judge-persona path, `skill-skillopt.md` for the v1.1 out-of-band held-out
path. Convergence of the two signals (per spec §19.1) is the falsifiable test that
v1.0 alone lacks.

## Composite formula

```
composite = sum(sub_scores)
```

Simple sum, 0-100 range. Same convention as `skill.md` (Karpathy K1 discipline:
no weights until calibration justifies them). Each sub-score is 0-10 inclusive,
integer-valued.

## The 10 sub-scores

(See frontmatter `sub_scores` array above for canonical machine-readable
definitions. The prose below repeats them for human readers.)

| # | Name | What "10" looks like | What "0" looks like |
|---|---|---|---|
| C1 | Task input comprehension | Output addresses precise ask | Pursued tangent |
| C2 | Rubric criterion coverage | Judge ≥0.8 w/ output-anchored rationale | Misses ≥half criteria |
| C3 | Edge-case handling | Diff-3 ≥40%, no crashes | Diff-3 <10%, hallucinated defaults |
| C4 | Output format compliance | Parser-friendly, matches declared shape | Downstream parse fails |
| C5 | Self-grade calibration | abs(self − judge) ≤0.15 | abs(self − judge) >0.3 |
| C6 | Anchor consistency | On-brand voice, Pillar 5 honored | Contradicts brand/principles |
| C7 | Token efficiency | Median ≤800, 95th-pct ≤1500 | Median ≥1500, 95th-pct ≥3000 |
| C8 | Failure mode legibility | Failed trajectories self-explain | Silent or generic failures |
| C9 | Cross-pillar generalization | Balanced across P1-4 | Memorized P1, fails P3 |
| C10 | Held-out test split delta | Δ ≥0.1 vs baseline on held-out 30% | Δ ≤0 (over-fit) |

## Calibration discipline

- **Day-30 ratchet:** if composite trends down ≥1.5σ for ≥2 consecutive monthly
  windows, alert founder via `KPI skillopt_post_install_correction_rate_delta`
  (per spec §19.10). Skill may be regressing into Goodhart territory.
- **Hold-out validation:** Sprint 3 founder rates 5 fixture skills against this
  playbook; if Spearman correlation against composite < 0.6, the playbook itself
  needs revision (likely C5 or C7 weights, not the criterion definitions).
- **Production correlation:** `KPI skillopt_synth_to_prod_correlation` measured
  monthly via cron `skillopt-synth-prod-correlation-monthly`. Target ≥0.5; alert
  at <0.3 (critical miscalibration; founder retro mandatory).

## Reference

- Spec: `wiki/capabilities/evolve/spec.md` §19.5 / §19.7 (after Phase 8 promotion;
  current draft `.archives/cla/evolve-extend-skillopt/spec.md`)
- Companion: `playbooks/skill.md` (v1.0 text-quality rubric)
- Companion skills: `skillopt-gen-data`, `skillopt-judge`, `skillopt-runner` (Sprint 3)
- Brainstorm: `.archives/brainstorming/skillopt-integration-2026-05-27/04-synthetic-data-grounding.md`
