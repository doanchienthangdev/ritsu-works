---
sop_id: SOP-AIOPS-004
slug: evolve
state: operating
owner: 06-ai-ops
version: "1.0.0"
---

# SOP-AIOPS-004 — /evolve Iteration Loop

> Canonical SOP for the /evolve self-improvement command. Defines the
> declarative loop semantics; pairs with `flow.yaml` (machine-readable)
> and `wiki/capabilities/evolve/spec.md` (full capability spec).

## Purpose

Run an iterative evaluate→propose-improvement→install→re-evaluate loop on
any ritsu-works leaf entity (skill, command, agent, hook, SOP). Closes the
self-improvement loop in the AI-Native workforce.

## Trigger

- Founder runs `/evolve <type> <name> [--loop=N] [--stop=cond]`
- (Future v1.1) Scheduled weekly auto-pass via SOP-AIOPS-005 (deferred)
- (Future v1.1) Founder voice note classified as "improve this entity"
  → ingestion pipeline auto-fires (deferred)

## Phase summary

See `flow.yaml` for the canonical machine-readable phase sequence.
Human-readable summary:

| Step | Purpose | HITL |
|---|---|---|
| pre_flight | drift + holdout + concurrent + working-tree checks | A |
| insert_agent_run | open ops.agent_runs row state='running' | A |
| loop_iter | the actual N-iter loop (orchestrator skill) | A within loop |
| tier_b_finalize | in-place install for skill/command/agent | A |
| tier_c_outside_voice | codex/subagent challenge for hook/sop/Tier 1 | A |
| tier_c_open_pr | PR open via gh CLI; founder Tier C reviews | A (PR = founder gate) |
| tier_c_post_merge | post-merge drift + consistency checks | A (alert on fail) |

## HITL discipline

- skill / command / agent entities: **Tier B** per invocation (in-place edit;
  founder can audit via ops.agent_runs + /evolve status afterward).
- hook / sop entities: **Tier C** ALWAYS (PR-only path; --tier-override
  REJECTED at command level).
- Tier 1 paths (00-core/, governance/, knowledge/*.yaml): /evolve does not
  directly support these in v1.0. Use `/cla revise <id>` or `/core fill <slug>`
  instead.

## Budget

Per `governance/ROLES.md` role `eval-evo-orchestrator`:
- monthly cap: $50
- per-task-kind caps: iteration $0.50, evaluation $0.10, outside-voice $0.30
- 80/100/150% escalation via `pre-llm-call-budget.md` hook

Honest throughput: ~20-25 /evolve runs/month at v1.0 budget. Full-fleet
coverage (~260 entities/year) requires v1.1 cost optimizations.

## Drift discipline

Three drift gates (per `flow.yaml.drift_gates`):
1. **pre-flight**: ABORT on drift
2. **per-iter post-apply**: REVERT diff on drift
3. **post-merge** (Tier C+): ALERT on drift; founder offered revert

## Falsifiable efficacy gate (§6.13b PLAN.md)

30 days after capability `evolve` transitions to state='operating':
1. `scripts/eval-evo/calibrate-efficacy.cjs` fires (scheduled via
   knowledge/schedules.yaml).
2. Computes judge-noise σ + median composite gain on N≥10 evolved entities.
3. **PASS** if median gain ≥ 1.5× σ. /evolve continues normally.
4. **PAUSE-RECOMMENDED** otherwise. Orchestrator pre-flight refuses new
   invocations until founder retro decides v1.1 redesign vs continue.

## Rubric-bias hold-out (§6.13c PLAN.md)

Per playbook, Spearman rank correlation between founder hold-out ratings
(in `cases/_HOLDOUT.yaml`) and rubric composite scores must be ≥0.6 BEFORE
that playbook's score-{type} skill can run. Enforced by
`scripts/eval-evo/playbook-validate.cjs`.

## Events emitted

See `flow.yaml.events_emitted`. The key event is `ritsu.entity.evolved`
which fires on every kept iter. Subscribers can chain off it (e.g., a
weekly-evolution-digest skill in v1.1).

## Failure handling

22 named exception classes (per `wiki/capabilities/evolve/spec.md#10-error--rescue`).
No catch-all `rescue Exception` permitted in any composed skill.

## Composition

This SOP composes:
- `06-ai-ops/skills/eval-evo/orchestrator/SKILL.md`
- `06-ai-ops/skills/eval-evo/score-<type>/SKILL.md` (5 skills)
- `06-ai-ops/skills/eval-evo/propose-improvement/SKILL.md`
- `06-ai-ops/skills/eval-evo/install-improvement/SKILL.md`
- `06-ai-ops/skills/eval-evo/outside-voice/SKILL.md`
- `episodic-recall` (memory load)
- `pre-llm-call-budget` hook (cost gate)
- `pre-edit-tier1` hook (HITL gate for Tier C+ paths)
- `pnpm check` (drift gate)

## Related SOPs

- `SOP-AIOPS-001-capability-lifecycle` — /cla 8-phase ceremony. /evolve was
  produced by this SOP.
- `SOP-AIOPS-001-revise` — escalation path when /evolve plateaus on an entity
  (architectural rethink needed).
- `SOP-AIOPS-002-cross-tier-consistency` — drift validation /evolve depends on.

## Cabinet review history

- Phase 5 architecture review (2026-05-22): @cto APPROVE (E1-E13 +5.25h);
  outside-voice YELLOW absorbed (3 substantive tensions); spec-review iter-2
  8/10 PASS; founder Tier C APPROVED.

## v1.0 caveats

- Single-judge mode (no 3-judge median). v1.1 evaluates if variance flag
  fires often enough to justify.
- Subagent dispatch latency may exceed wall budget on slow nights;
  orchestrator measures and flags in Sprint 2.
- Hold-out ratings (`_HOLDOUT.yaml`) MUST be completed by founder before
  /evolve becomes truly operational.
