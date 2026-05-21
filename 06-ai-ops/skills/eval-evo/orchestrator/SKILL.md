---
name: eval-evo/orchestrator
description: |
  Runs the /evolve iteration loop on a single entity. Loads context (entity
  + last 3 run_summaries + relevant corrections), invokes per-type judge,
  invokes proposer, applies diff via git stash isolation, re-scores, keeps
  or reverts per Karpathy K4, repeats until --loop or --stop met. Returns
  final state for the command to persist. Invoked by .claude/commands/evolve.md.
trigger: invoked-by-command-only
judge_persona: per-type (see playbooks/<type>.md)
proposer: eval-evo-orchestrator (this skill IS the proposer dispatcher)
budget_caps:
  per_task_kind:
    eval-evo-iteration: 0.50
    eval-evo-evaluation: 0.10
    eval-evo-outside-voice: 0.30
  per_run_hard_cap: 2.50
spec: wiki/capabilities/evolve/spec.md
sop: 06-ai-ops/sops/SOP-AIOPS-004-evolve/flow.yaml
---

# Skill: eval-evo/orchestrator

> Loop runner for /evolve. Composes existing infrastructure
> (episodic-recall, workforce-personas, ops.* tables, git stash).

## Contract

### Input (from `.claude/commands/evolve.md`)
```json
{
  "entity_type": "skill" | "command" | "agent" | "hook" | "sop",
  "entity_name": "<slug>",
  "entity_path": "<resolved-file-or-dir-path>",
  "max_iters": <int 1..10>,
  "stop_cond": "score>=N" | "no-improvement-for=N" | null,
  "dry_run": <bool>,
  "tier": "B" | "C",
  "run_id": "<uuid>",
  "playbook_path": "06-ai-ops/skills/eval-evo/playbooks/<type>.md",
  "cases_dir": "06-ai-ops/skills/eval-evo/cases/<type>/<name>/"
}
```

### Output (JSON return to command)
```json
{
  "exit_reason": "loop_complete" | "stop_triggered" | "budget_truncated" | "aborted" | "all_iters_reverted",
  "iters_attempted": <int>,
  "iters_kept": <int>,
  "iters_reverted": <int>,
  "scores": [<pre>, <post_iter1>, <post_iter2>, ...],
  "sub_scores_per_iter": [[ten ints], ...],
  "final_score": <int>,
  "total_cost_usd": <float>,
  "wall_clock_seconds": <int>,
  "outside_voice_status": "n/a" | "codex_ok" | "subagent_ok" | "annotate_only",
  "variance_flags": [iter_indices where variance exceeds 5 pts on unchanged artifact],
  "summary_text": "<one-line why score moved>",
  "diffs_applied_iter": [<iter indices kept>],
  "diffs_reverted_iter": [<iter indices reverted>],
  "stash_run_label_prefix": "eval-evo <run-id>"
}
```

## Process

### Step 1 — Load context (~500 tokens budget)

1. **Episodic recall** — invoke `episodic-recall` skill with
   `agent_slug='evolve'` + `recall_filter.entity_slug=<entity_name>`
   + `recall_max_runs=3`. Append summaries to context.
2. **Corrections** — query `ops.corrections WHERE entity_slug=<entity_name>
   AND ts > NOW() - INTERVAL '90 days' ORDER BY ts DESC LIMIT 10`.
   Append correction_note + correction_kind to context.
3. **Entity content** — Read the entity file (or, for SOPs, the
   directory's flow.yaml + README.md).
4. **Playbook** — Read `playbooks/<type>.md`. Extract:
   - The 10 sub-score criteria
   - Judge persona binding (@cto or @ceo)
   - Allowed-paths list (which files proposer may write)
5. **Golden cases** — List `cases/<type>/<name>/case-*.yaml` if any.

**Cost:** ~$0.02 (mostly read operations; episodic-recall is a single embedding query).

### Step 2 — Iteration loop

```text
prev_score = null
unchanged_runs = 0  # for variance flag
no_improvement_count = 0  # for stop=no-improvement-for=N

for iter in 1..max_iters:

  # ---- Budget check ----
  query: SELECT SUM(cost_usd) FROM ops.cost_attributions
         WHERE run_id = $1 AND task_kind LIKE 'eval-evo-%'
  if total_so_far + estimated_next_iter > $2.50:
    return exit_reason='budget_truncated'

  # ---- Judge pre-score ----
  invoke score-<type> skill with: entity_path, playbook_path, cases_dir
  receive {composite: int, sub_scores: [10 ints], rationale, cases_passed}
  validate JSON against playbooks/_SCHEMA.yaml
  on parse/schema fail: retry once with strict reminder
    on second fail: raise RubricMismatchError → log error_at_step='judge', skip iter
  score_pre = composite

  # ---- Variance flag (R2 mitigation) ----
  if iter > 1 and prev_diff_was_reverted:
    if abs(score_pre - prev_score_pre) > 5:
      append iter to variance_flags array

  # ---- Stash pre-state ----
  bash: git stash push --keep-index --message "eval-evo iter-${iter} pre-state ${run_id}" -- ${entity_path}

  # ---- Proposer ----
  invoke propose-improvement skill with: full context buffer + allowed_paths
  receive diff (unified format)
  validate: parseable, all touched paths in allowed_paths
  on EmptyDiffError: skip iter; if 2nd consecutive empty, exit 'all_iters_reverted'
  on DiffParseError: skip iter, log

  # ---- Apply ----
  bash: git apply --whitespace=nowarn -- <patch-file>
  on DiffApplyError: bash: git stash pop --quiet; skip iter, log

  # ---- Drift gate (post-apply) ----
  bash: pnpm check
  on non-zero: bash: git stash pop; log error_at_step='drift'; continue

  # ---- Judge post-score ----
  invoke score-<type> skill again
  receive {composite_post, sub_scores_post}
  score_post = composite_post

  # ---- Decision (Karpathy K4) ----
  if score_post < score_pre:
    bash: git stash pop --quiet  # revert; stash contents restored
    write failure_summary to context for next iter
    append iter to diffs_reverted_iter
    no_improvement_count += 1
  elif score_post == score_pre:
    bash: git stash drop  # keep change; sub-scores may have shifted
    append iter to diffs_applied_iter
    no_improvement_count += 1
  else:  # score_post > score_pre
    bash: git stash drop  # keep change
    append iter to diffs_applied_iter
    no_improvement_count = 0

  scores.append(score_post)
  sub_scores_per_iter.append(sub_scores_post)
  prev_score = score_post

  # ---- Persist iter ----
  INSERT ops.run_summaries (run_id, agent_slug='evolve', summary=<one-line why>, artifacts={iter, score_pre, score_post, diff_kept})
  INSERT ops.events (event_type='ritsu.entity.evolved', payload={iter, entity_type, entity_slug, score_pre, score_post, delta})

  # ---- Stop check ----
  if stop_cond == "score>=N" and score_post >= N:
    return exit_reason='stop_triggered'
  if stop_cond starts with "no-improvement-for=":
    K = int(stop_cond.split('=')[1])
    if no_improvement_count >= K:
      return exit_reason='stop_triggered'
  if iter == max_iters:
    return exit_reason='loop_complete'

# (unreachable; loop always exits via one of the above)
```

### Step 3 — Return to command

Output JSON conforms to the contract above. Command handles Tier B/C+ post-loop
(in-place vs PR open).

## Error classes (cross-ref spec.md §10)

| Class | Cause | Rescue |
|---|---|---|
| `JudgeParseError` | judge returned malformed JSON | Retry 1x with strict schema reminder |
| `RubricMismatchError` | judge gave wrong number of sub-scores | Retry 1x with explicit "exactly 10" reminder |
| `JudgeTimeoutError` | judge persona dispatch exceeded wall budget | Skip iter, log |
| `EmptyDiffError` | proposer returned no diff | Skip iter; exit if 2x consecutive |
| `DiffParseError` | proposer returned malformed unified diff | Skip iter, log |
| `DiffApplyError` | diff didn't apply cleanly | Auto-revert stash, skip iter |
| `PostApplyParseError` | post-apply file has parse error | Auto-revert, skip iter |
| `PostIterDriftError` | pnpm check failed after apply | Auto-revert via stash pop, continue |
| `BudgetCapError` | per-task-kind cap hit mid-iter | Exit loop with 'budget_truncated' |
| `RubricBiasGateError` | playbook Spearman correlation <0.6 (pre-flight) | ABORT before loop start |

Catch-all `rescue Exception` is BANNED.

## Cross-iter memory composition (per spec §2 K-not-3 violation)

The ~500-token memory load is the deliberate departure from Karpathy's
pure-amnesic model. Composition:

| Source | Max tokens | Purpose |
|---|---|---|
| `ops.run_summaries` (last 3 on this entity) | ~300 | Prior iter outcomes |
| `ops.corrections` (last 10 within 90d) | ~150 | Founder negative signal |
| Per-iter failure summary (this run) | ~50 | What didn't work this run |

Total budget per iter: ~500 tokens. Real cost: $0.02/iter at Sonnet input rates.

## Pre-flight rubric-bias check (R7 mitigation)

BEFORE the first iter, call `scripts/eval-evo/playbook-validate.cjs --type=<type>`
which reads `_HOLDOUT.yaml` and computes Spearman rank correlation between
founder ratings and rubric scores on hold-out entities. If correlation <0.6,
raise `RubricBiasGateError` and refuse to run.

This is the v1.0 hold-out gate. If it fails, /evolve refuses to invoke until
the playbook is revised. Built-in safety against systematic bias.

## Dependencies

- **Composes**: `episodic-recall` (memory load), `eval-evo/score-<type>` (judge),
  `eval-evo/propose-improvement` (diff gen), `eval-evo/install-improvement`
  (tier-aware writer), `eval-evo/outside-voice` (Tier C+ second opinion).
- **Reads**: `ops.run_summaries`, `ops.corrections`, `ops.cost_attributions`,
  `ops.agent_runs`.
- **Writes**: `ops.agent_runs` (state_payload UPDATE), `ops.run_summaries`
  (per iter), `ops.events` (per kept iter).
- **Uses**: `git stash`, `git apply`, `pnpm check`.

## v1.0 caveats

- Subagent dispatch latency (E1 from eng-review) is measured per iter and
  flagged if avg >15s/dispatch. v1.1 may add inline LLM-call fallback.
- Variance flag fires but does NOT auto-shift to 3-judge median in v1.0
  (cost). v1.1 evaluates.
- Cross-entity pattern transfer NOT in v1.0 — each /evolve invocation is
  scoped to the named entity only.
