---
name: eval-evo/score-hook
description: |
  Scores a hook entity (.claude/hooks/<name>.md) on the 10-criterion
  rubric in playbooks/hook.md. Invokes @cto persona as judge. Returns
  composite + sub_scores. Hooks are TIER C entities (safety infrastructure);
  /evolve on a hook always opens a PR.
trigger: invoked-by-orchestrator-only
judge_persona: "@cto"
playbook: 06-ai-ops/skills/eval-evo/playbooks/hook.md
cases_path: 06-ai-ops/skills/eval-evo/cases/hook/
budget_cap_task_kind: eval-evo-evaluation
---

# Skill: eval-evo/score-hook

Scores a single hook entity. Same loop logic as `score-skill/SKILL.md`;
key differences below.

## Type-specific bindings

| Binding | Value |
|---|---|
| Entity path pattern | `.claude/hooks/<name>.md` |
| Playbook | `06-ai-ops/skills/eval-evo/playbooks/hook.md` |
| Judge persona | `@cto` (safety + code review) |
| Cases dir | `06-ai-ops/skills/eval-evo/cases/hook/<name>/` |
| Allowed paths for proposer | `.claude/hooks/<name>.md` (single file) |
| **Tier** | **Tier C** (hooks govern safety per HITL.md) |

## Tier C behavior

The orchestrator detects entity_type='hook' and ALWAYS routes Tier C+
flow — even without `--tier-override`, /evolve does NOT auto-install
hook changes. PR-only path:

1. Per-iter diffs accumulate in working tree (git stash drop on keep)
2. Post-loop: outside-voice (codex/subagent) runs MANDATORILY
3. PR opened via `gh pr create`
4. Founder Tier C reviews + merges

`--tier-override` is REJECTED for hooks — the spec explicitly prohibits
fast-pathing safety infrastructure changes. The command returns:
"--tier-override not permitted for hook entity (safety infrastructure)."

## Case battery emphasis

Hooks are programs. Per `playbooks/hook.md` C5, hooks MUST have known-good
+ known-bad fixtures. The judge will penalize C5 to ≤3 if no cases exist.

Sprint 3 seeds 2 cases per hook. Subsequent /evolve runs may add cases
via the proposer (as part of an improvement that targets C5).

## Contract + Process

Same as `score-skill/SKILL.md` §Contract and §Process. Differences:
- Judge prompt loads `playbooks/hook.md` rubric (10 sub-scores focused on
  trigger correctness, block/pass matrix, error fallback, perf budget,
  test fixture coverage, security posture, etc.).
- Judge persona `@cto`.
- Tier override REJECTED at orchestrator level (not score-hook level).

## Cost

~$0.10 per invocation.

## Cross-reference

See `score-skill/SKILL.md` for canonical process documentation.
