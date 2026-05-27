---
name: eval-evo/skillopt-runner
description: |
  Orchestrator for /evolve skillopt <skill>. Runs the 7-phase pipeline (A pre-flight →
  B gen-data → C train loop → D outer K4 → E install → F founder review → G cleanup)
  per spec §19.6/§19.7. Drives the SkillOpt Python subprocess + session-bridge.cjs
  via this Claude session's Task() dispatches (subagents: skillopt-target-rollout
  for kind=target, skillopt-optimizer-reflect for kind=optimizer). Persists
  cross-phase state to runtime/skillopt/<entity>/runs/<rid>/runner-state.json so
  /evolve skillopt --resume=<run-id> picks up at next_action. Handles R12 (rate-
  limit pause + Tier B founder choice), R18 (orphaned-tmp cleanup at bridge init).
  Subscription invariant: zero direct HTTP calls; Python runs with empty
  ANTHROPIC_API_KEY; every LLM call flows file-queue → bridge → Task() subagent.
trigger: invoked-by-evolve-command
budget_cap_task_kind: eval-evo-skillopt-iteration-total   # 500-msg session-message ceiling (governance/ROLES.md)
spec: wiki/capabilities/evolve/spec.md §19 (after Phase 8 promotion); draft .archives/cla/evolve-extend-skillopt/spec.md
---

# Skill: eval-evo/skillopt-runner

The orchestrator for `/evolve skillopt`. Wires Sprint 1 (vendor + backend +
bridge) + Sprint 2 (gen-data + judge + rate-limit detector + cost estimator)
into a single end-to-end runnable pipeline. Drives Python subprocess via
file-queue + Task() fan-out from this session.

## When to invoke

Dispatched ONLY by the `/evolve` command's skillopt subcommand:

```
/evolve skillopt <skill-name> [--max-messages=N] [--max-cost-usd=N] [--dry-run]
                              [--regen-data] [--resume=<run-id>]
                              [--gen-sources=auto|pillars=1,3,5] [--bridge-poll-ms=N]
                              [--tier-override]
```

Do NOT invoke directly from a session — use the command, which performs argv
parsing + cost-estimator pre-flight + tier classification before dispatching here.

## Inputs

```json
{
  "run_id":               "<uuid>",
  "command_agent_run_id": "<uuid>",       // ops.agent_runs.id of the /evolve command invocation that
                                          // holds the entity_edit_lock and dispatched this runner.
                                          // Used at Phase G to release the lock.
  "entity_type":          "skill",
  "entity_name":          "<slug>",
  "max_messages":         500,
  "max_cost_usd":         null,
  "dry_run":              true,
  "regen_data":           false,
  "resume":               null,
  "gen_sources":          "auto",
  "bridge_poll_ms":       1000,
  "tier_override":        false
}
```

v1.1 entity_type is always `skill` (spec §19.2 explicit). `gen_sources`
v1.1 active subset: pillars `[1, 3, 5]` (Pillars 2 & 4 deferred to v1.2 —
see `skillopt-gen-data` SKILL.md TODO section).

## Output

Strict JSON to stdout for the `/evolve` command to render:

```json
{
  "run_id":           "<uuid>",
  "final_phase":      "completed" | "aborted" | "paused_rate_limit",
  "exit_reason":      "all_phases_done" | "founder_abort" | "rate_limit_pause" |
                       "budget_exceeded" | "judge_regressed" | "subprocess_crash",
  "scores": {
    "baseline":       <int>,
    "post_iter":      <int>,
    "held_out_delta": <float>
  },
  "totals": {
    "messages_dispatched":  <int>,
    "messages_completed":   <int>,
    "judge_calls":          <int>,
    "iterations_completed": <int>
  },
  "artifacts": {
    "runner_state_path":   "runtime/skillopt/<entity>/runs/<rid>/runner-state.json",
    "best_skill_path":     "runtime/skillopt/<entity>/runs/<rid>/best-skill.md",
    "dataset_path":        "runtime/skillopt/<entity>/data/v<ts>/dataset.jsonl"
  },
  "agent_run_id":     "<uuid>",
  "next_action":      null | "resume" | "review_held_out_delta"
}
```

## Process — 7 phases

### Phase A — Pre-flight (gates that abort cheaply)

1. **Validate entity exists.** `06-ai-ops/skills/<entity_name>/SKILL.md` must
   exist. If missing → abort with NN-search hint.
2. **Cost pre-check.** Run `node scripts/skillopt/cost-estimator.cjs
   --skill=<entity_name> --max-messages=<max_messages>`. Exit 2 (cap exceeded)
   → abort with widen-cap hint. Exit 0 → record `estimated_messages` in state.
3. **Drift gate.** `pnpm check` must be clean.
4. **Working tree clean check.** `git status --porcelain` empty.
5. **Vendor smoke.** `bash scripts/skillopt/install-vendor.sh` exits 0 (idempotent).
6. **Python deps check.** `python3 -c 'import openai, yaml, numpy'` succeeds.
   Else abort with `pip install -r vendor/skillopt/requirements.txt` hint.
7. **Lock verification (NOT re-acquire).** The /evolve command (step 5/6 of
   `.claude/commands/evolve.md`) acquires the universal lock for
   (`entity_type='skill'`, `entity_name=<entity_name>`) with
   `holder_kind='evolve'`, `holder_run_id=<command's agent_run_id>` BEFORE
   dispatching to this skill. The runner does NOT re-acquire (a second
   `acquire_entity_edit_lock` call with a different `holder_run_id` would
   return `acquired=false` and incorrectly abort). Instead, the runner
   verifies a lock is held by reading `ops.entity_edit_locks` for the
   `(entity_type, entity_name)` row and confirming `holder_run_id =
   <command_agent_run_id>` (passed in via inputs). The lock is released
   in Phase G using the command's `agent_run_id`, NOT the runner's.
8. **Tier classify.** v1.1 explicitly Tier B; `--tier-override` allowed
   founder-only.
9. **Resume branch.** If `--resume=<run-id>`: read
   `runtime/skillopt/<entity>/runs/<run-id>/runner-state.json`, skip phases
   ≤ runner-state.phase, refuse if `phase = 'aborted'` (terminal) or
   `started_at` > 7 days old.

**Failure mode:** any gate failure → write `runner-state.json` with
`phase: 'aborted'`, `exit_reason: '<reason>'`, release lock, emit stderr
summary, exit non-zero. No subprocess launched → no cleanup beyond lock.

### Phase B — Synthetic data generation

1. Invoke `eval-evo/skillopt-gen-data` skill via the Skill tool with:
   ```json
   { "run_id": "<runner-agent-run-id>", "entity_type": "skill",
     "entity_path": "06-ai-ops/skills/<entity>/SKILL.md",
     "entity_content": "<...>", "gen_count": 25, "gen_sources": "<arg>",
     "regen_data": <arg>, "dry_run": <arg>,
     "max_messages_cap": <max_messages> }
   ```
2. Read stdout JSON. Capture `dataset_path` + `agent_run_id`.
3. If gen-data returned `founder_gate: 'aborted'` → abort the runner
   (Phase A cleanup + DELETE extraction rows authored by this gen-data run).
4. Write `runner-state.json` with `phase: 'gen-data'` + `dataset_path`.

**Subscription discipline:** gen-data may invoke Haiku/Sonnet for Pillar 1/3
extraction. All in-session → subscription billing. No Python yet.

### Phase C — Train loop (the heavy work)

1. **Write cfg.json** at `runtime/skillopt/<entity>/runs/<rid>/cfg.json`:
   ```json
   { "dataset": "<dataset_path>", "max_iterations": 3,
     "max_messages": <remaining_budget>,
     "rollout_batch_size": 25, "reflect_batch_size": 4 }
   ```
2. **Launch Python subprocess** via Bash `run_in_background: true`:
   ```bash
   env -i ANTHROPIC_API_KEY= HOME=$HOME PATH=$PATH PYTHONPATH=vendor/skillopt \
     SKILLOPT_FILE_QUEUE_DIR=$(pwd)/runtime/skillopt/<entity>/runs/<rid> \
     python3 vendor/skillopt/scripts/train.py \
       --config runtime/skillopt/<entity>/runs/<rid>/cfg.json \
       --backend ritsu_file_queue
   ```
   Capture `subprocess_pid` from the Bash background-task announcement.
3. **Init bridge state.** Call `node scripts/skillopt/session-bridge.cjs init
   --queue-dir=runtime/skillopt/<entity>/runs/<rid> --pid=<subprocess_pid>`.
   This auto-sweeps orphaned `*.tmp` files older than 5 minutes (R18).
4. **Bridge polling loop** — drive from this session in a tool-call loop.
   Each iteration:
   a. `session-bridge.cjs subprocess-alive` → exit 1 if dead → break.
   b. `session-bridge.cjs scan` → list pending UUIDs.
   c. Empty → sleep `bridge_poll_ms` ms; continue.
   d. Non-empty → take up to 25 UUIDs as a batch.
   e. For each UUID, `session-bridge.cjs request <uuid>` → parse request JSON.
   f. `session-bridge.cjs batch-start <uuids...>` (records in-flight + dedup).
   g. **Parallel Task() dispatch** — issue 16-25 Task() calls in ONE assistant
      turn for true parallelism:
      - `kind == "target"` → `subagent_type: "skillopt-target-rollout"` with
        prompt = `SKILL.md text + ANCHOR (Pillar 5) + TASK block`.
      - `kind == "optimizer"` → `subagent_type: "skillopt-optimizer-reflect"`
        with prompt = `CURRENT_SKILL + MINIBATCH + PRIOR_REJECTED_EDITS +
        META_SKILL`.
      - `kind == "custom"` → bridge fallback to `target` subagent + log warning
        (spec §19 upstream-contract-violation safety net).
   h. **For each Task() result**: parse the subagent's strict-JSON response.
      Pipe via `echo '<json>' | session-bridge.cjs write-response <uuid>`.
      The bridge auto-injects `ts` + `kind` and atomically writes
      `resp-<uuid>.json` (tmp + rename per UPSTREAM-DEVIATION contract).
   i. **On Task() failure**: classify via
      `echo '<error>' | node scripts/skillopt/rate-limit-detector.cjs`:
      - Exit 2 (rate-limit / adjacent) → **R12 handling, below.**
      - Exit 3 (transient) → retry the batch up to 3 times w/ exponential backoff.
      - Exit 0 (other) → write `{ "id": "...", "error": "..." }` response;
        Python's `_round_trip` raises → fail-graded task; surface in Phase F.
   j. `session-bridge.cjs batch-complete <uuids...>` (out of in-flight).
   k. **Loop budget check.** Sum `state.totals.messages_completed`. If
      `>= max_messages` → snapshot state, `kill <pid>`, break loop with
      `exit_reason: 'budget_exceeded'`.

**R12 (rate-limit) handling** (spec §19.6 + rate-limit-detector advice=pause):

1. Snapshot state: `session-bridge.cjs pause-rate-limit --until=<ISO+1h>` +
   write `runner-state.json` with `phase: 'rate_limit_paused'`,
   `rate_limit_resume_after: <ISO>`.
2. Pause subprocess: `kill -SIGSTOP <pid>` (so it doesn't time out waiting).
3. `AskUserQuestion` Tier B:
   > "Rate-limit on /evolve skillopt <skill> after N messages.
   > Resume in 1h? / Switch to vendor subprocess (NOT impl v1.1) / Abort?"
4. Founder picks:
   - **Resume in 1h** → `ScheduleWakeup(delaySeconds=3600, prompt='/evolve
     skillopt <skill> --resume=<run-id>')`. Exit runner cleanly.
   - **Switch to vendor subprocess** → v1.1 not implemented; abort with
     "Vendor-subprocess fallback deferred per spec §19.11 TCDP-5."
   - **Abort** → `phase: 'aborted'`, `exit_reason: 'founder_rate_limit_abort'`,
     `kill -SIGKILL <pid>`, lock release, exit.

### Phase D — Outer K4 (keep-or-revert decision)

1. **Best-skill candidate.** Python subprocess writes
   `runtime/skillopt/<entity>/runs/<rid>/best-skill.md` on successful exit.
   Validate it exists; else `exit_reason: 'subprocess_crash'`.
2. **Held-out judge pass.** For each task in `<dataset_path>` flagged as
   held-out (30% randomly partitioned by gen-data via deterministic seed):
   a. Render candidate `best-skill.md` to a fresh `skillopt-target-rollout`
      subagent (in-session Task() call).
   b. Score via `skillopt-judge` skill → score ∈ [0, 1].
   c. Accumulate `held_out_post_scores[]`.
3. **Baseline.** Repeat 2a-2c on ORIGINAL `SKILL.md` (pre-iteration) to get
   `held_out_pre_scores[]`. Skip if `--resume` and baseline persisted.
4. **Composite delta.** Compute `mean(post) - mean(pre)` per
   `playbooks/skill-skillopt.md` §"Composite formula" (10-criterion sum).
5. **K4 decision** (spec §19 + playbook C10):
   - delta ≥ +0.10 → **keep**: proceed to Phase E install.
   - 0 ≤ delta < +0.10 → **borderline**: AskUserQuestion Tier B
     ("Held-out gain X.XX below the 0.10 threshold but non-negative.
     Install anyway? Yes / Reject / Stash for later").
   - delta < 0 → **revert**: do NOT install. `exit_reason: 'judge_regressed'`.
     Best-skill.md retained in runtime/ for forensic review.

### Phase E — Install (skipped if dry_run OR judge_regressed)

1. Invoke `eval-evo/install-improvement` skill with
   `(entity_path, candidate=best-skill.md)`. Performs git stash + apply
   (mirrors v1.0 install flow).
2. Run `pnpm check` post-apply. Failure → revert via git stash pop, abort.
3. Write `runner-state.json` with `phase: 'install'`.

### Phase F — Founder review

1. AskUserQuestion Tier B:
   > "/evolve skillopt <skill> complete. Baseline N, post N+M. Held-out
   > Δ = +X.XX. Install applied at 06-ai-ops/skills/<entity>/SKILL.md.
   > Verify? [Yes — keep installed / No — revert / Show diff / Reject + ops.corrections]"
2. **Yes** → Phase G with `exit_reason: 'all_phases_done'`.
3. **No — revert** → `git checkout HEAD -- 06-ai-ops/skills/<entity>/SKILL.md`,
   `exit_reason: 'founder_revert'`.
4. **Show diff** → dump diff, re-prompt.
5. **Reject** → revert + INSERT `ops.corrections` row (negative signal for
   future episodic recall).

### Phase G — Cleanup + persist

1. Release universal lock: `ops.release_entity_edit_lock('skill', '<entity>',
   <command_agent_run_id>)`. Uses the COMMAND's agent_run_id (passed in
   via inputs) — the runner doesn't hold the lock; the command does.
2. UPDATE `ops.agent_runs` (this orchestration's row) with final state.
3. Write `ops.run_summaries` (~150 tokens per Strategy E).
4. Emit `ops.events`: `ritsu.evolve.skillopt-run-completed` with stdout payload.
5. **Cleanup decision** (NOT auto-delete the run dir):
   - dry_run runs: keep for inspection.
   - Successful installs: keep; L1 invariant `skillopt-runtime-staleness`
     sweeps anything >60 days old (knowledge/cross-tier-invariants.yaml).
   - Aborted runs: keep for resume support; same sweep.
6. Write final `runner-state.json` with `phase: 'completed'`.
7. Emit stdout JSON.

## State.json schema (v1.0)

Two state files per run, distinct concerns:

**`runner-state.json`** — owned by THIS skill; cross-phase + resume support:

```jsonc
{
  "version":       "1.0",
  "run_id":        "<uuid>",
  "entity_type":   "skill",
  "entity_name":   "<slug>",
  "started_at":    "2026-05-27T...Z",
  "config":        { /* echoes Inputs */ },
  "phase":         "pre-flight | gen-data | train | judge | install | review | completed | aborted | rate_limit_paused",
  "phase_history": [
    { "phase": "pre-flight", "entered_at": "...", "duration_s": 4.2 }
  ],
  "totals": {
    "messages_dispatched":  0,
    "messages_completed":   0,
    "judge_calls":          0,
    "iterations_completed": 0
  },
  "dataset_path":            "runtime/skillopt/<entity>/data/v<ts>/dataset.jsonl",
  "subprocess_pid":          12345,
  "rate_limit_resume_after": null,
  "exit_reason":             null,
  "scores": { "baseline": null, "post_iter": null, "held_out_delta": null }
}
```

Written atomically (tmp + rename) at every phase boundary AND every batch
completion in Phase C. `--resume` reads this file.

**`state.json`** (bridge-managed) — separate concern, see
`scripts/skillopt/queue-protocol.md` §"State.json schema". Bridge owns
per-batch IPC + dedup; this skill never directly writes the bridge's
state.json (only via session-bridge.cjs verbs).

## R18 — Orphaned tmp cleanup

Handled by `session-bridge.cjs init` (Sprint 3 in-place edit): on init,
scan `llm-requests/` and `llm-responses/` for `*.tmp` files older than 5
minutes (`mtime + 5min < now()`) and `unlink` them. These are leftovers
from prior crashed runs where a write started but never `rename`d. The
5-minute threshold is conservative — a healthy bridge write completes in
milliseconds.

## Compose with

- `eval-evo/skillopt-gen-data` (Phase B)
- `eval-evo/skillopt-judge` (Phase C + Phase D)
- `eval-evo/install-improvement` (Phase E)
- `.claude/agents/skillopt-target-rollout` (Task() during Phase C)
- `.claude/agents/skillopt-optimizer-reflect` (Task() during Phase C)
- `scripts/skillopt/session-bridge.cjs` (state helper)
- `scripts/skillopt/rate-limit-detector.cjs` (R12 classifier)
- `scripts/skillopt/cost-estimator.cjs` (Phase A pre-flight)

## Cost model

Per spec §19.9 caps in `governance/ROLES.md` eval-evo-orchestrator role:
- `eval-evo-skillopt-rollout-batch`: 25 messages/iter
- `eval-evo-skillopt-reflect-batch`: 4 messages/iter
- `eval-evo-skillopt-val-gate-batch`: 25 messages/iter (Phase D held-out)
- `eval-evo-skillopt-meta`: 10 messages/iter
- `eval-evo-skillopt-iteration-total`: 500 messages hard ceiling per run

A typical medium-complexity skill at 3 iterations: 91 messages/iter × 3
≈ 273 messages (matches `cost-estimator.cjs` output). Phase A/B/E/F overhead:
~5 messages (gen-data founder gate + install-improvement diff). Phase D judge
calls: 25 per iter × 3 ≈ 75 messages charged to the rollout-batch cap.

## Reference

- Spec: `wiki/capabilities/evolve/spec.md` §19 (after Phase 8 promotion;
  current draft `.archives/cla/evolve-extend-skillopt/spec.md`)
- Protocol: `scripts/skillopt/queue-protocol.md`
- Bridge contract: `scripts/skillopt/UPSTREAM-DEVIATION.md` §"Bridge write contract"
- Sprint 1: PRs #128 + #129 + #130
- Sprint 2: PR #131 (gen-data + judge + helpers)
- Sprint 3 (this skill): PR pending
