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
  "entity_path":          null,            // v1.1.1: absolute path to SKILL.md source-of-truth.
                                            // null → resolves to 06-ai-ops/skills/<entity_name>/SKILL.md
                                            //         (production path; Phase E install writes here).
                                            // <abs-path> → sandbox mode. Reads SKILL.md from this path;
                                            //         Phase E install writes back to THIS path, not
                                            //         06-ai-ops/. Original production SKILL.md untouched.
                                            //         Used by `/evolve skillopt --entity-path=$(pwd)/runtime/sandboxes/<name>/SKILL.md`.
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

**v1.1.2 default behavior:** the `/evolve skillopt <skill>` command
auto-derives `entity_path = $(pwd)/runtime/sandboxes/<flattened>/SKILL.md`
when no `--apply` or explicit `--entity-path` is passed. The command also
auto-invokes `eval-evo/gen-skill-examples` if the sandbox SKILL.md has no
`<example>` blocks (founder reviews + accepts via Tier B gate). This skill
(runner) receives `entity_path` already resolved — it does NOT do path
resolution itself.

**v1.1.1 sandbox flow (`entity_path != null`):**
- All reads of SKILL.md content come from `entity_path` (not 06-ai-ops/).
- Phase E install writes `best-skill.md` back to `entity_path` location.
- K4 baseline comparison: held-out judge scores candidate vs CURRENT content
  at `entity_path` (the sandbox baseline IS the baseline, not production).
- Production `06-ai-ops/skills/<entity_name>/SKILL.md` is NEVER touched.
- `entity_name` retained for ops.* logging + runtime/skillopt/<entity>/runs/
  directory naming (lineage). Slashes in entity_name are flattened to `-`
  for the runtime dir (e.g., `wiki-sync/ask` → `runtime/skillopt/wiki-sync-ask/`).
- Founder merges sandbox → production manually after reviewing the result:
  `cp <entity_path> 06-ai-ops/skills/<entity_name>/SKILL.md && git diff` then commit.

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

1. **Validate entity exists + snapshot baseline.** Path resolution per `entity_path` input:
   - If `entity_path != null`: validate it's absolute + exists. This is the
     v1.1.1 sandbox flow. Define `effective_entity_path = entity_path`.
   - If `entity_path == null`: validate `06-ai-ops/skills/<entity_name>/SKILL.md`
     exists. If missing → abort with NN-search hint. Production flow. Define
     `effective_entity_path = 06-ai-ops/skills/<entity_name>/SKILL.md`.
   - **Snapshot baseline (critical for Phase D K4):** immediately copy
     `effective_entity_path` content to `runtime/skillopt/<entity>/runs/<rid>/baseline-skill.md`
     BEFORE any downstream phase mutates anything. Phase D step 3 reads from
     this snapshot, not the live file (the live file may be the about-to-be-
     overwritten target in production flow OR the about-to-be-overwritten
     sandbox in sandbox flow). The snapshot guarantees baseline ≠ candidate
     even if Phase E mutates the live path.
2. **Cost pre-check.** Run `node scripts/skillopt/cost-estimator.cjs
   --skill=<entity_name> --max-messages=<max_messages>`. Exit 2 (cap exceeded)
   → abort with widen-cap hint. Exit 0 → record `estimated_messages` in state.
3. **Drift gate.** `pnpm check` must be clean.
4. **Working tree clean check.** Working tree must be clean EXCEPT for
   `vendor/skillopt` (the submodule's patches re-apply each `install-vendor.sh`
   run — intentional per `scripts/skillopt/UPSTREAM-DEVIATION.md`; SHA pin +
   patch-integrity verified by L1 invariant `skillopt-vendor-sha-pinned` in
   `scripts/cross-tier/validate-skillopt-vendor.cjs`). Concretely:
   `[ -z "$(git status --porcelain | grep -v 'vendor/skillopt$')" ]`.
   Excluding the known-benign path is cleaner than either committing the
   patched submodule pointer (breaks `install-vendor.sh` idempotency) or
   stashing before every run (wraps every invocation in 2 extra steps).
5. **Vendor auto-bootstrap.** `bash scripts/skillopt/install-vendor.sh` (idempotent
   — exits 0 fast if 3 patches already applied; applies otherwise). Non-zero
   exit → abort with the stderr output (likely pin mismatch or patch conflict;
   see UPSTREAM-DEVIATION.md refresh procedure). This phase runs every time so
   the founder NEVER has to remember to bootstrap manually.
6. **Python deps auto-bootstrap.** `bash scripts/skillopt/install-python-deps.sh
   --yes` (idempotent — exits 0 immediately if openai/yaml/numpy import inside
   the project venv at `runtime/skillopt/.venv/`; otherwise creates venv +
   pip installs ~50MB on first run, ~30-60s). The `--yes` flag skips the
   interactive prompt; the runner runs unattended. Non-zero exit → abort
   with the stderr output (likely no python3 ≥ 3.10 found; founder must
   `brew install python@3.13` then re-invoke).

   After the helper returns 0, resolve `PYTHON=$(bash scripts/skillopt/find-python.sh)`
   (now returns the venv path) and sanity-verify
   `"$PYTHON" -c 'import openai, yaml, numpy'`. If verify fails despite
   helper-exit-0 → abort with `subscription_python_setup_corrupted`
   (rare; usually --recreate fixes).

   **Why auto-bootstrap (not just check + hint):** /evolve skillopt is a
   single-command UX per spec §19.1. Forcing the founder to remember 2
   setup commands (`install-vendor.sh` + `install-python-deps.sh`) before
   each fresh-environment invocation defeats that goal. Both helpers are
   idempotent and cheap when already-satisfied (~100ms each), so running
   them every time costs negligibly while guaranteeing the gate cannot fail
   for "forgot to install" reasons.
7. **Lock verification (NOT re-acquire).** Branch on
   `evolve_uses_universal_lock` feature flag in `knowledge/feature-flags.yaml`,
   same as the `/evolve` command's Phase A step 6:

   **If `evolve_uses_universal_lock=true`:** The /evolve command acquires
   the universal lock for (`entity_type='skill'`, `entity_name=<entity_name>`)
   with `holder_kind='evolve'`, `holder_run_id=<command's agent_run_id>`
   BEFORE dispatching to this skill. The runner does NOT re-acquire (a
   second `acquire_entity_edit_lock` call with a different `holder_run_id`
   would return `acquired=false` and incorrectly abort). Instead, the
   runner verifies a lock is held by reading `ops.entity_edit_locks` for
   the `(entity_type, entity_name)` row and confirming `holder_run_id =
   <command_agent_run_id>` (passed in via inputs). The lock is released
   in Phase G using the command's `agent_run_id`, NOT the runner's.

   **If `evolve_uses_universal_lock=false`** (legacy path — default for
   first 48h post-deploy per @cto NIT 4 staged migration; flag toggle
   after 5 successful /evolve runs): no `ops.entity_edit_locks` row exists.
   The "lock" is implicit in the command's INSERT of `ops.agent_runs`
   with `agent_slug='evolve'`, `state='running'`, and
   `input_payload->>'entity_slug' = '<entity_name>'`. The runner verifies
   by re-issuing the legacy concurrent-run check (same SELECT as command
   Phase A.6 legacy branch) and confirming the ONLY matching row has
   `id = command_agent_run_id`. Multiple matches → abort with
   `ConcurrentRunError`. Zero matches → abort with `LockLostError`
   (the command's row must have moved to a terminal state mid-dispatch).
   Phase G "release" under the legacy path is the UPDATE of the command's
   row to `state IN ('completed','failed','cancelled')` (see Phase G
   step 2).
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

1. **Read SKILL.md content from effective_entity_path** (computed in Phase A.1):
   `entity_content = fs.readFileSync(effective_entity_path, 'utf8')`.
2. Invoke `eval-evo/skillopt-gen-data` skill via the Skill tool with:
   ```json
   { "run_id": "<runner-agent-run-id>", "entity_type": "skill",
     "entity_path": "<effective_entity_path>",
     "entity_content": "<read in step 1 above>",
     "gen_count": 25, "gen_sources": "<arg>",
     "regen_data": <arg>, "dry_run": <arg>,
     "max_messages_cap": <max_messages> }
   ```
   In sandbox flow, `entity_path` = the runtime/sandboxes/ path (NOT production).
   In production flow, `entity_path` = 06-ai-ops/skills/<entity_name>/SKILL.md.
   Either way, gen-data sees the source of truth caller declared.
3. Read stdout JSON. Capture `dataset_path` + `agent_run_id`.
4. If gen-data returned `founder_gate: 'aborted'` → abort the runner
   (Phase A cleanup + DELETE extraction rows authored by this gen-data run).
5. Write `runner-state.json` with `phase: 'gen-data'` + `dataset_path`.

**Subscription discipline:** gen-data may invoke Haiku/Sonnet for Pillar 1/3
extraction. All in-session → subscription billing. No Python yet.

### Phase C — Train loop (the heavy work)

1. **Write cfg.json** at `runtime/skillopt/<entity>/runs/<rid>/cfg.json`:
   ```json
   { "dataset": "<dataset_path>", "max_iterations": 3,
     "max_messages": <remaining_budget>,
     "rollout_batch_size": 25, "reflect_batch_size": 4 }
   ```
2. **Launch Python subprocess** via Bash `run_in_background: true`. The
   interpreter MUST satisfy Python ≥ 3.10 (vendor uses
   `@dataclass(slots=True)`). Resolve via `scripts/skillopt/find-python.sh`
   instead of bare `python3` (macOS /usr/bin/python3 is 3.9):
   ```bash
   PYTHON=$(bash scripts/skillopt/find-python.sh) || exit 2
   env -i ANTHROPIC_API_KEY= HOME=$HOME PATH=$PATH PYTHONPATH=vendor/skillopt \
     SKILLOPT_FILE_QUEUE_DIR=$(pwd)/runtime/skillopt/<entity>/runs/<rid> \
     "$PYTHON" vendor/skillopt/scripts/train.py \
       --config runtime/skillopt/<entity>/runs/<rid>/cfg.json \
       --backend ritsu_file_queue
   ```
   The operator may pin a specific interpreter via the `SKILLOPT_PYTHON`
   env var (read by find-python.sh as highest-priority override).
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
3. **Baseline.** Repeat 2a-2c on `runtime/skillopt/<entity>/runs/<rid>/baseline-skill.md`
   (the Phase A.1 snapshot of the pre-iteration `effective_entity_path` content)
   to get `held_out_pre_scores[]`. Sourcing from the snapshot (not the live
   file) is critical because the live file may have been mutated by Phase E
   in a prior `--resume`-able run. Skip this step if `--resume` and
   `held_out_pre_scores[]` already persisted in `runner-state.json`.
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

Branch on `sandbox_mode` (true iff `entity_path != null`):

**Production flow** (`sandbox_mode = false`, target = `06-ai-ops/skills/<entity>/SKILL.md`):
1. Invoke `eval-evo/install-improvement` skill with input
   `{"entity_path": "<effective_entity_path>", "candidate_path":
   "runtime/skillopt/<entity>/runs/<rid>/best-skill.md"}`. Performs git
   stash + cp + pnpm check (mirrors v1.0 install flow). The path is a
   tracked file, so git stash is meaningful + revert path works.
2. On pnpm check failure → git stash pop reverts the file → abort with
   `exit_reason: 'install_drift_detected'`.
3. Write `runner-state.json` with `phase: 'install'`,
   `install_method: 'git-stash-cp'`.

**Sandbox flow** (`sandbox_mode = true`, target = `runtime/sandboxes/<flat>/SKILL.md`):
1. `runtime/sandboxes/` is gitignored → `git stash` is a no-op on an
   untracked file. Use plain copy + pnpm check instead:
   - `cp <effective_entity_path> <effective_entity_path>.pre-install.bak`
     (manual backup, since git can't be used).
   - `cp runtime/skillopt/<entity>/runs/<rid>/best-skill.md <effective_entity_path>`
   - Run `pnpm check`. On failure → restore via
     `mv <effective_entity_path>.pre-install.bak <effective_entity_path>` →
     abort with `exit_reason: 'install_drift_detected'`. On success → keep
     the `.pre-install.bak` for Phase F revert path.
2. Write `runner-state.json` with `phase: 'install'`,
   `install_method: 'cp-backup'`, `backup_path:
   "<effective_entity_path>.pre-install.bak"`.

### Phase F — Founder review

1. AskUserQuestion Tier B (text parameterized on `effective_entity_path`
   so the founder sees the actual install target, not a hard-coded path):
   > "/evolve skillopt <skill> complete. Baseline N, post N+M. Held-out
   > Δ = +X.XX. Install applied at `<effective_entity_path>`.
   > Verify? [Yes — keep installed / No — revert / Show diff / Reject + ops.corrections]"
2. **Yes** → Phase G with `exit_reason: 'all_phases_done'`.
3. **No — revert** — branches on `install_method` (set in Phase E):
   - `install_method == 'git-stash-cp'` (production flow): run
     `git checkout HEAD -- <effective_entity_path>` to restore the
     pre-install tracked content.
   - `install_method == 'cp-backup'` (sandbox flow): run
     `mv <backup_path> <effective_entity_path>` to restore from the
     `.pre-install.bak` snapshot. The sandbox file is gitignored so
     git checkout can't help.
   Either way, set `exit_reason: 'founder_revert'`.
4. **Show diff** — production flow: `git diff HEAD -- <effective_entity_path>`.
   Sandbox flow: `diff <backup_path> <effective_entity_path>`. Re-prompt.
5. **Reject** → revert (per #3 above) + INSERT `ops.corrections` row
   (negative signal for future episodic recall).

### Phase G — Cleanup + persist

1. Release lock — branch on `evolve_uses_universal_lock` (same as Phase A.7):
   - **flag=true (universal lock):** `ops.release_entity_edit_lock('skill',
     '<entity>', <command_agent_run_id>)`. Uses the COMMAND's agent_run_id
     (passed in via inputs) — the runner doesn't hold the lock; the
     command does. Invoked via `supabase db query --linked "SELECT
     ops.release_entity_edit_lock(...)"` because the MCP supabase-ops
     shim is INSERT-only and cannot call mutating RPCs.
   - **flag=false (legacy):** no separate release. The UPDATE in step 2
     transitions the command's `ops.agent_runs` row to a terminal state,
     which IS the legacy lock release (concurrent-run check matches on
     `state='running'` only).
2. UPDATE `ops.agent_runs` (this orchestration's row) with final state
   (`state='completed'` | `'failed'` | `'cancelled'`, `ended_at=now()`,
   `outcome`, `output_payload` JSONB with scores + artifacts).
   **MCP supabase-ops is INSERT-only** (per `knowledge/manifest.yaml`
   tool_plane registered_servers `supabase-ops` purpose: "INSERT-only for
   writes (no UPDATE in Phase 1.5)"). The UPDATE MUST flow through the
   Supabase CLI fallback:
   ```bash
   source runtime/secrets/.env.local
   supabase db query --linked "UPDATE ops.agent_runs
     SET state='completed', ended_at=now(), outcome='success',
         output_payload='<jsonb>'::jsonb
     WHERE id='<command_agent_run_id>'
     RETURNING id, state, outcome"
   ```
   `SUPABASE_ACCESS_TOKEN` lives in `runtime/secrets/.env.local`. The CLI
   query is non-SUPERUSER so works under `db query --linked` (per founder
   memory `reference_supabase_admin_constraints`). If the CLI is
   unavailable (e.g., Edge Function execution context), fall back to
   `mcp__supabase-ops__insert` of a `correcting_run_id`-linked row per the
   `ops.audit_log` immutability convention.
3. Write `ops.run_summaries` (~150 tokens per Strategy E). INSERT via
   `mcp__supabase-ops__insert` (writes are allowed; only UPDATE blocked).
4. Emit `ops.events`: `ritsu.evolve.skillopt-run-completed` with stdout
   payload. INSERT via `mcp__supabase-ops__insert`.
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
