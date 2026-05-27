---
name: eval-evo/skillopt-judge
description: |
  Per-task LLM-as-judge for /evolve skillopt. Given a (task, target_output) pair,
  scores the target's output against the task's rubric and returns a normalized
  pass-rate in [0, 1]. Invoked by the SkillOpt Python train.py via the file-queue
  backend (kind: "judge"), but ALSO directly invocable in isolation for testing.
  Stateless — no DB writes, no caching, no Task() fanout.
trigger: invoked-by-skillopt-runner-or-vendor-subprocess
budget_cap_task_kind: eval-evo-skillopt-rollout-batch   # judge shares the rollout batch cap (each grade = 1 message)
spec: wiki/capabilities/evolve/spec.md §19.5/§19.7 (after Phase 8 promotion); draft .archives/cla/evolve-extend-skillopt/spec.md
---

# Skill: eval-evo/skillopt-judge

LLM-as-judge for SkillOpt task grading. Reads `(task, target_output)`,
returns a single float in `[0, 1]` representing the fraction of rubric
criteria the target output satisfies. Used by:

1. **skillopt-target-rollout self-grades** — Phase C rollouts include
   `self_grade_per_criterion` in their JSON response. This skill produces
   a **second-opinion** judge score so the runner can detect over-grading
   (target says "passed all 5" but judge says "passed 2 of 5").
2. **Held-out validation** — Phase D validation gate on a held-out test
   split where target_output is produced fresh and graded by this skill.
3. **Day-30 calibration** — comparing judge score vs production correction
   rate (KPI `skillopt_synth_to_prod_correlation`).

## Why a separate skill (not just an inline LLM call)

- **Auditability.** Every judge invocation lands in `ops.agent_runs` with
  `agent_slug = eval-evo/skillopt-judge`. Year-later debugging of "why
  did this skill not improve?" needs the judge's decisions on file.
- **Composability.** Sprint 3's runner skill calls this; future tests
  can also call it; ops-team can replay grades for stale runs.
- **Cost ceiling.** As a skill, it inherits `per_task_kind_caps` enforcement
  from the pre-llm-call-budget hook.

## Inputs

```json
{
  "task": {
    "id":                 "<uuid>",
    "input":              "<verbatim task input as presented to the target>",
    "expected_behavior":  "<plain English what success looks like>",
    "rubric": [
      { "criterion": "<verbatim rubric line>", "weight": 1 },
      ...
    ],
    "difficulty":         1 | 2 | 3
  },
  "target_output":         "<the trajectory + final output emitted by skillopt-target-rollout>",
  "self_grade_per_criterion": [
    { "criterion": "<verbatim>", "passed": 0 | 1 },
    ...
  ] | null,
  "anchor_context": "<optional ~3K-token anchor from Pillar 5; passed for context only — does NOT affect grading>"
}
```

`self_grade_per_criterion` is optional; if present, the judge's output
includes a `self_vs_judge_delta` field for the runner to track
calibration. Pass `null` if grading without a self-grade reference.

## Outputs

Strict JSON (single message, no prose):

```json
{
  "score":  0.6,                    // float in [0, 1]; fraction of rubric criteria passed
  "per_criterion": [
    { "criterion": "<verbatim>", "passed": 0 | 1, "rationale": "<≤200 char why>" },
    ...
  ],
  "self_vs_judge_delta": 0.2 | null,
  // (self_grade_pass_count - judge_pass_count) / rubric.length;
  // positive value = target over-graded itself; null if no self_grade provided
  "confidence": "high" | "medium" | "low",
  // "high" if rubric is unambiguous and target_output directly maps;
  // "medium" if some criteria are subjective;
  // "low" if rubric is poorly-specified OR target_output is empty/malformed
  "warnings": [
    "<one-line audit signal — e.g., 'target_output truncated mid-sentence', 'rubric criterion 3 is ambiguous'>",
    ...
  ]
}
```

## Process

### Step 1 — Validate inputs

- Reject if `task.rubric.length === 0`: nothing to grade. Return `score: 0,
  confidence: "low", warnings: ["empty rubric"]`.
- Reject if `target_output` is empty or whitespace-only: return `score: 0,
  confidence: "low", warnings: ["empty target_output"]`.
- Reject if rubric criterion strings vary between input `rubric` and input
  `self_grade_per_criterion` (when provided): return error indicating
  mismatch. The runner uses verbatim criterion strings as join keys.

### Step 2 — Compose judge prompt

System prompt (~500 tokens, tuned for consistency):

```
You are a JUDGE evaluating whether a skill's output satisfies a task rubric.
You will receive:
1. TASK — the input + expected behavior + rubric criteria
2. TARGET_OUTPUT — what a skill produced when asked to handle the task
3. (optional) SELF_GRADE — the skill's own pass/fail per criterion

For each rubric criterion, decide PASS (1) or FAIL (0). Be strict:
- PASS only if the target output demonstrably satisfies the criterion.
- "Reasoning seems sound" is not enough — the output must show it.
- Partial credit is not allowed (criteria are binary).

Output strict JSON only.
```

User prompt: serialized inputs.

### Step 3 — LLM call

- Model: **Claude Haiku 4.5** by default (cheap, fast, ~$0.001 per grade).
- Override via `args.model` if the runner skill passes a more capable
  model for difficulty-3 tasks.
- Single-shot. No retries beyond what the backend handles.

### Step 4 — Parse + compute score

- Parse the LLM's JSON response.
- Validate every criterion string matches the input rubric (verbatim).
  If any mismatch → emit warning, treat that criterion as fail.
- Compute `score = (sum of passed) / rubric.length`.
- Compute `self_vs_judge_delta` if `self_grade_per_criterion` was provided.

### Step 5 — Confidence + warnings

- `confidence = "high"` if all `per_criterion.rationale` strings are
  ≥ 20 chars (judge gave reasoning) AND `warnings` is empty.
- `confidence = "medium"` if ≥ 1 criterion has rationale < 20 chars OR
  ≥ 1 warning fired.
- `confidence = "low"` if Step 1 hit a reject path OR target_output was
  malformed.

### Step 6 — Emit + log

Write to `ops.agent_runs`:
- `agent_slug = eval-evo/skillopt-judge`
- `state = 'completed'`
- `output_payload` = the strict JSON above
- `cost_bucket = ai-ops-eval-evo-skillopt-judge`

Emit `run_summary` (~150 tokens) per Strategy E memory architecture.

Print the JSON to stdout for the caller (either the bridge dispatching
on `kind: judge` or the runner skill calling Skill() directly).

## Calibration discipline (per spec §19.5 R-S2-3)

The judge is itself an LLM and can systematically over- or under-grade.
Sprint 2 tests are synth-only — first real calibration happens in S2 acceptance
(week 3 post-ship) comparing judge scores to founder corrections.

If `KPI skillopt_synth_to_prod_correlation < 0.5` for ≥ 2 consecutive months,
this skill needs Sprint 5 (post-promotion) revision — likely a stricter
prompt or a multi-model consensus (median of Haiku/Sonnet judges).

## Compose with

- `eval-evo/skillopt-gen-data` (produces the tasks this skill grades against)
- `eval-evo/skillopt-runner` (Sprint 3 — invokes this for Phase C rollout grading)
- Day-30 calibration script `scripts/eval-evo/calibrate-efficacy.cjs`
  (existing for /evolve v1.0; v1.1 extension reads this skill's outputs)

## Cost model

- Per grade: ~$0.001 (Haiku, ~1-2K input tokens, ~300 output tokens)
- 25-task rollout batch = ~$0.025 in grading on top of rollouts
- Logged under `eval-evo-orchestrator` role,
  `task_kind = eval-evo-skillopt-rollout-batch` (shared batch cap)

## Reference

- Spec: `wiki/capabilities/evolve/spec.md` §19.5 / §19.7 (after Phase 8 promotion)
- Companion skills: `skillopt-gen-data`, `skillopt-runner`
- Brainstorm: `.archives/brainstorming/skillopt-integration-2026-05-27/04-synthetic-data-grounding.md`
