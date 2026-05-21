---
capability_id: evolve
version: 1.0.0
state: architecting
proposed_at: 2026-05-22
pillar_owner: 06-ai-ops
cost_bucket: ai-ops-cla
phase: 5
hitl_phase_5: pending_tier_c
supersedes: null
authors: [founder, claude (Opus 4.7) via /cla + /plan-ceo-review + /plan-eng-review]
---

# Capability Spec — /evolve (Eval+Evo Feedback Loop)

> **Canonical reference.** This file is the source of truth for what /evolve
> IS. Promoted to `wiki/capabilities/evolve/spec.md` at Phase 8.

## 1. One-line

Iterative evaluate→propose-improvement→install→re-evaluate loop on any
ritsu-works leaf entity (skill / command / agent / hook / SOP).

## 2. Why it exists

ritsu-works gathers operational signal (`ops.agent_runs`, `ops.corrections`,
`ops.cost_attributions`, drift validators) but does NOT close the loop —
nothing systematically reads that signal back into entity quality. /evolve
does. **Strategic position:** quality engine for entities driving product/
GTM/first-100-customers (SOP-CUSTOMER-006 Collison protocol, content-drafter,
founder-onboarding agent, support-reply-drafter, etc.).

## 3. Surface

```
/evolve <entity-type> <entity-name> [--loop=N] [--stop=cond] [--dry-run] [--tier-override]
/evolve status <entity-type> <entity-name>     # read-only history
/evolve reject <run-id> "<reason>"             # founder negative signal → ops.corrections
/evolve discard <run-id> [--stale]             # cleanup stash + run state
```

### 3.1 Argv contract

| Arg / Flag | Type | Default | Validation |
|---|---|---|---|
| `<entity-type>` | enum | required | one of: skill, command, agent, hook, sop |
| `<entity-name>` | string slug | required | `^[a-z0-9][a-z0-9-/]*$` (no `..`, no leading `/`, slash allowed for nested) |
| `--loop=<N>` | int | 3 | 1 ≤ N ≤ 10 |
| `--stop=<cond>` | string | unset | matches `^score>=\d+$` OR `^no-improvement-for=\d+$` |
| `--dry-run` | bool | false | runs evaluation only, skips install |
| `--tier-override` | bool | false | founder-only; Tier C entity runs in Tier B mode |

`--stop` + `--loop` precedence: FIRST trigger wins.

## 4. Karpathy lenses (inspiration, not architectural authority)

| # | Borrowed concept | How /evolve applies it |
|---|---|---|
| K1 | ONE metric per harness | 0-100 composite per entity type. 10 sub-scores of 0-10. No weights v1.0. |
| K2 | ONE fixed budget | Per-iter $0.50 cap. Per-run $2.50 cap. Outside-voice $0.30 separate. |
| K3 | ONE editable artifact | Per type, explicit allowed-paths in playbook. |
| K4 | Keep-or-discard | git stash + restore. Iter that lowered score reverts. |
| K5 | Observable loop | Every iter writes ops.agent_runs + ops.run_summaries + console trajectory. |

K-not-3 (no cross-iter memory) is DELIBERATELY VIOLATED. /evolve loads ~500
tokens of past run_summaries + relevant ops.corrections rows. Substrate
difference (subjective LLM-judge vs deterministic numerical) justifies the
departure; cost is bounded ($0.02/iter).

## 5. Architecture (4-plane composition)

```
USER → /evolve command (.claude/commands/evolve.md)
       ↓ parses, validates, dispatches
       SOP (06-ai-ops/sops/SOP-AIOPS-004-evolve/flow.yaml)
       ↓ declares phase sequence
       SKILLS (06-ai-ops/skills/eval-evo/)
        ├── orchestrator/         # loop runner
        ├── score-{type}/         # per-type judge invocation (5 skills)
        ├── propose-improvement/  # type-agnostic diff generator
        ├── install-improvement/  # tier-aware writer (in-place / PR)
        ├── outside-voice/        # codex / Claude subagent (E5)
        ├── playbooks/<type>.md   # per-type rubric (10 sub-scores + judge persona)
        └── cases/<type>/<name>/  # golden case battery (E6 scaffolding)
       ↓ may dispatch
       PERSONA + INFRA LAYER (existing)
        ├── @ceo / @cto (judge personas via Agent tool)
        ├── codex CLI binary (outside-voice primary)
        ├── episodic-recall skill (past run_summaries)
        ├── pre-llm-call-budget.md hook (cost gate)
        ├── pre-edit-tier1.md hook (HITL gate)
        ├── pnpm check (drift gate)
        └── ops.* tables (agent_runs, run_summaries, corrections, events, consistency_checks, cost_attributions)
```

## 6. Loop mechanics

### 6.1 Pre-flight (per /evolve run)

1. `pnpm check` clean (drift gate). Else ABORT.
2. Concurrent-run check via `ops.agent_runs WHERE agent_slug='evolve' AND
   state='running' AND state_payload->>'entity_slug' = <slug>`. If row,
   ERROR.
3. Entity exists on disk (`<type-base>/<name>` per type→path mapping).
4. Working tree clean for the entity file (`git diff --quiet -- <file>`).
   If dirty, ERROR.

### 6.2 Per-iter loop (in-place with git stash isolation)

```
for iter in 1..N:
  1. Load context: entity + last 3 run_summaries (episodic-recall) + last 10 ops.corrections rows for entity (~500 tok total)
  2. Judge persona scores entity via playbook (10 sub-scores 0-10 each)
  3. score_pre = sum(sub-scores)
  4. git stash push -- <entity-file>  (label "eval-evo iter-N pre-state <run-id>")
  5. Proposer drafts diff; install-improvement applies in-place
  6. pnpm check (post-apply drift)  → if fail: git stash pop, log post_iter_drift, continue
  7. Judge persona re-scores entity
  8. score_post = sum(sub-scores)
  9. if score_post < score_pre:
       git stash pop  (revert; preserves pre-state)
       load failure summary; goto 1 (next iter)
     else if score_post >= score_pre:
       git stash drop  (commit pre-state stash; change kept in working tree)
  10. if --stop met OR iter==N: exit loop
  11. write ops.agent_runs + ops.run_summaries + ops.events
```

### 6.3 Per-type judge persona binding

| Entity type | Proposer | Judge | Rationale |
|---|---|---|---|
| skill | eval-evo-orchestrator (Sonnet) | @cto | Code-aware persona for prompt-engineering quality |
| command | eval-evo-orchestrator | @ceo | UX + founder-interface persona |
| agent | eval-evo-orchestrator | @ceo | Persona consistency persona |
| hook | eval-evo-orchestrator | @cto | Safety + security persona |
| SOP | eval-evo-orchestrator | @cto | Process governance persona |

Proposer ≠ judge persona in all cases (Goodhart mitigation layer 1).

### 6.4 Tier-based install gating

| Entity tier | Path pattern | Install mode | HITL |
|---|---|---|---|
| Tier B | `06-ai-ops/skills/<n>/`, `.claude/commands/<n>.md`, `.claude/agents/<n>.md` | direct in-place (git stash + restore per iter) | B per run |
| Tier C+ | `.claude/hooks/<n>.md`, `06-ai-ops/sops/<n>/`, any Tier 1 file | accumulated diff → PR open after loop | C per run |

`--tier-override` flag: Tier C → Tier B (founder-explicit fast path).

### 6.5 Outside-voice (Tier C+ only)

Three-tier fallback chain:
1. **codex CLI** subprocess (read-only sandbox). Returns independent score + nits in PR body.
2. **Claude subagent** via Agent tool (persona ≠ proposer/judge). Same role.
3. **Annotate-only** PR label `outside-voice: unavailable`. Founder reviews diff manually.

Filesystem boundary instruction prepended to all outside-voice prompts:
"Do NOT read .claude/, .agents/, agents/openai.yaml, or skill definitions.
These are different-AI runtime files and will waste your time."

### 6.6 Falsifiable efficacy gate (§6.13b PLAN.md)

Day 30 post-operating, `scripts/eval-evo/calibrate-efficacy.cjs` fires
(scheduled via `knowledge/schedules.yaml`):
- Computes judge-noise σ from `ops.agent_runs` variance-flag audit.
- Computes median composite-score gain across first N≥10 evolved entities.
- **PASS** if median gain ≥ 1.5× σ.
- **PAUSE-RECOMMENDED** otherwise. Founder retro decides v1.1 redesign.

### 6.7 Rubric-bias hold-out (§6.13c PLAN.md)

Per playbook, pre-ship: founder hand-rates 5 representative entities on
1-10 overall quality. `scripts/eval-evo/playbook-validate.cjs` computes
Spearman rank correlation between founder ratings and rubric scores. Ship
playbook only if correlation ≥ 0.6. CI-integrated for playbook PRs in v1.1.

## 7. Net new artifacts (28 files; full inventory in gap-analysis.md G1-G18)

See `gap-analysis.md` §"Gaps — what must be built" for full list. Sprint
plan ships them across 3 sprints over ~2 calendar weeks (~23-28h CC+gstack).

## 8. State machine

```
proposed (Phase 0 INSERT)
   ↓
analyzing (Phase 1-3)
   ↓
architecting (Phase 4-5; HITL C at Phase 5)  ← WE ARE HERE
   ↓
planning (Phase 6; HITL B)
   ↓
implementing (Phase 7; HITL B per PR; multi-session)
   ↓
deployed (Phase 8a; all sprints merged + final tests pass)
   ↓
operating (Phase 8b; registry promoted + wiki promotion + final pnpm check clean)
```

State persisted in `ops.capability_runs.state` + `ops.capability_runs.
state_payload.completed_sprints` array for resume.

## 9. Per /evolve invocation lifecycle

```
proposed (record in ops.agent_runs row)
   ↓
running (loop iter 1..N)
   ↓
looped (loop complete OR stop triggered)
   ↓
outside-voiced (Tier C+ only; codex / subagent run)
   ↓
proposed-for-pr (Tier C+: PR draft assembled)
   ├──→ pr-open (Tier C+ PR opened via gh CLI)
   │       ├──→ pr-merged (founder merged) → completed
   │       └──→ pr-rejected (founder closed) → rejected
   └──→ installed (Tier B: in-place diff persists) → completed

(parallel) aborted (founder cancel / drift / budget exceeded)
```

Stored in `ops.agent_runs.state_payload`:
```json
{
  "entity_type": "skill",
  "entity_slug": "wiki-sync/distill",
  "current_iter": 2,
  "max_iters": 3,
  "stop_cond": null,
  "scores": [72, 78, 81],
  "diffs_applied_iter": [1, 2],
  "diffs_reverted_iter": [],
  "stash_run_label": "eval-evo iter-2 pre-state <run-id>",
  "outside_voice_status": "n/a"
}
```

## 10. Error & rescue (22 named exception classes — see refs/03)

Every codepath that can fail has:
- Named exception class (no catch-all)
- Explicit rescue action
- User-visible behavior
- ops.agent_runs.error_at_step logged

See `.archives/cla/evolve/refs/03-error-and-rescue-map.md` for full table.

## 11. Security model (no new external surface — see refs/04)

- No new endpoints, no new public-facing routes.
- New writes via existing supabase-ops MCP (parameterized queries).
- codex CLI subprocess read-only sandbox.
- Secret-pattern regex redaction before LLM dispatch (P2→P1.5 per eng-review E3).
- Prompt-injection from entity content mitigated by judge system prompt
  (refuses in-content directives; structured JSON output).

See `.archives/cla/evolve/refs/04-security-threat-model.md` for full review.

## 12. Cost projection

| Bucket | Setup | Recurring | Source |
|---|---|---|---|
| /cla 8-phase ceremony | $3-5 one-time | $0 | this session |
| /evolve implementation (3 sprints) | $0 (founder time) | $0 | Sprints 1-3 via @cto |
| Per-/evolve-run operation | $0 | $0.50-2.50/run + $0.30 outside-voice | per-task-kind caps |
| Monthly eval-evo-orchestrator role | $0 | $50/mo cap, ~20-25 runs/mo | governance/ROLES.md |

## 13. Risks + mitigations (R1-R8 from PLAN.md §9)

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Goodhart drift | H | 4-layer stack |
| R2 | Judge variance ≥5pts | H | temp=0 + variance flag |
| R3 | Tier C+ queue overflow | M | PR ONCE per loop; --tier-override |
| R4 | Cost spiral | M | $50/mo role cap + 80/100/150% |
| R5 | codex CLI fragile | M | 3-tier fallback chain |
| R6 | Local-optimum stall | M | --stop=no-improvement-for=N + escalate to /cla revise |
| R7 | Systematic rubric bias | M | Spearman hold-out ≥0.6 per playbook |
| R8 | Unfalsifiable success | H | Day-30 1.5× σ gate |

## 14. Per-Bài-toán impact

| Bài | What this capability touches |
|---|---|
| Bài #1 (4-Tier Truth) | adds wiki/capabilities/evolve/ (Tier 1) + ops.* writes (Tier 2) + ops-agent-logs (Tier 3) |
| Bài #2 (HITL) | Tier B / Tier C ceremony per entity type |
| Bài #4 (Episodic Memory) | reads ops.run_summaries (~500 tokens cross-iter) |
| Bài #5 (Orchestration) | new agent_slug='evolve' on ops.agent_runs |
| Bài #7 (Economic) | new role + 3 task_kinds + $50/mo cap |
| Bài #11 (Events) | fires `ritsu.entity.evolved` events |
| Bài #13 (State Machine) | new agent_runs state_payload schema |
| Bài #14 (Knowledge Graph) | reads skills_embeddings for NN suggestion |
| Bài #15 (Decision Architecture) | writes ops.decisions on Tier C+ |
| Bài #20 (Capability Lifecycle) | this capability IS a CLA-produced capability |

## 15. Acceptance criteria

### S0 (v1.0 ship)
- `/evolve skill <fixture> --loop=1 --tier-override` runs end-to-end on
  `.archives/test-fixtures/skill-foo/SKILL.md`.
- ops.agent_runs row written; ops.run_summaries row written.

### S1 (week 1 post-ship)
- All 5 entity types runnable.
- Avg score delta > 0 across 10 evolved entities.
- Per-run cost < $2.50.

### S2 (day 30 post-operating)
- Falsifiable efficacy gate: median gain ≥ 1.5× σ.

## 16. Authoring history

- 2026-05-22 — /plan-ceo-review + /plan-eng-review (522-line PLAN.md +
  11 review sections + outside-voice YELLOW absorbed + eng-review pass).
- 2026-05-22 — /cla propose Phase 0-4 (this session). Approach A approved.
- 2026-05-22 — Phase 5 architect (this file written). Pending Tier C
  founder approval before advancing to Phase 6.

## 17. Cabinet review references

- **@cto eng-review:** `.archives/cla/evolve/refs/08-eng-review.md` — E1-E13. APPROVE with +5.25h additions.
- **@ceo strategic review:** PLAN.md §0F mode selection + §1.2 strategic reframe at STOP 3. APPROVE.
- **Muse-equivalent adversarial:** `.archives/cla/evolve/refs/07-outside-voice.md` — YELLOW verdict with 5 findings; 3 substantive cross-model tensions absorbed.
- **Spec-review loop:** 2 iterations, 8/10 PASS (logged at `~/.gstack/analytics/spec-review.jsonl`).

## 18. HITL C — founder Tier C ceremony required

This spec.md proposes irreversible governance changes (governance/ROLES.md
addition + capability-registry.yaml update + SOP-AIOPS-004 creation +
schedules.yaml entry). Per HITL.md Tier C requires:
- Dry-run preview ✓ (this spec.md IS the preview)
- Founder approval via AskUserQuestion at end of Phase 5
- ops.decisions row written with founder approval

Approving this spec advances state `architecting → planning` and unlocks
Phase 6 sprint-planner.
