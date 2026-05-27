---
capability_id: evolve
version: 1.1.0
state: operating
proposed_at: 2026-05-27
deployed_at: 2026-05-27       # Sprint 4 merge (PR #133, commit 3939b86)
operating_since: 2026-05-27   # Sprint 5 Phase 8 promotion (this PR)
pillar_owner: 06-ai-ops
cost_bucket: eval-evo-orchestrator
phase: 8
hitl_phase_5: approved-decided   # Tier C decided 2026-05-27 (ops.decisions[748044a7-d213-475f-be63-323549cb94e9])
supersedes: 1.0.0
prior_spec_archive: .archives/cla/evolve/spec-v1.0.0.md
authors: [founder, claude (Opus 4.7) via /cla extend + brainstorm files 04/06/09]
v1_0_authors: [founder, claude (Opus 4.7) via /cla + /plan-ceo-review + /plan-eng-review]
---

# Capability Spec — /evolve (Eval+Evo Feedback Loop) v1.1

> **Canonical reference.** This file is the source of truth for what /evolve
> IS. Promoted to `wiki/capabilities/evolve/spec.md` at Phase 8.
>
> **v1.1 changes** are concentrated in §3.x (surface additions), §6.8 (new
> loop mechanics), §10/§13 (R10 + R18 risks), §15.x (S1-S3 gates), §19
> (the full SkillOpt subcommand specification). v1.0 sections 1-18 are
> preserved with minor frontmatter updates and inline v1.1 annotations
> only where a v1.0 statement would otherwise be inaccurate after the
> extend.

## 1. One-line

Iterative evaluate→propose-improvement→install→re-evaluate loop on any
ritsu-works leaf entity (skill / command / agent / hook / SOP), **plus
SkillOpt-powered held-out task-completion evaluation for skills** (v1.1).

## 2. Why it exists

ritsu-works gathers operational signal (`ops.agent_runs`, `ops.corrections`,
`ops.cost_attributions`, drift validators) but does NOT close the loop —
nothing systematically reads that signal back into entity quality. /evolve
does. **Strategic position:** quality engine for entities driving product/
GTM/first-100-customers (SOP-CUSTOMER-006 Collison protocol, content-drafter,
founder-onboarding agent, support-reply-drafter, etc.).

**v1.1 addition:** v1.0 quality signal is judge-persona rubric score
(judge-on-judge measurement). v1.1 adds SkillOpt-powered held-out
task-completion evaluation (out-of-band measurement) as a complementary
signal. The two signals' convergence/divergence is the falsifiable test
v1.0 lacks (resolves R7/R8 partially).

## 3. Surface

```
# v1.0 paths (unchanged)
/evolve <entity-type> <entity-name> [--loop=N] [--stop=cond] [--dry-run] [--tier-override]
/evolve status <entity-type> <entity-name>     # read-only history
/evolve reject <run-id> "<reason>"             # founder negative signal → ops.corrections
/evolve discard <run-id> [--stale]             # cleanup stash + run state

# v1.1 NEW path
/evolve skillopt <skill-name> [--max-messages=N] [--max-cost-usd=N] [--dry-run]
                              [--regen-data] [--resume=<run-id>]
                              [--gen-sources=auto|pillars=1,2,3,4,5]
                              [--bridge-poll-ms=N] [--tier-override]
```

### 3.1 Argv contract

| Arg / Flag | Type | Default | Validation |
|---|---|---|---|
| `<entity-type>` (v1.0) | enum | required | one of: skill, command, agent, hook, sop |
| `<entity-name>` | string slug | required | `^[a-z0-9][a-z0-9-/]*$` (no `..`, no leading `/`, slash allowed for nested) |
| `--loop=<N>` (v1.0 only) | int | 3 | 1 ≤ N ≤ 10 |
| `--stop=<cond>` (v1.0 only) | string | unset | matches `^score>=\d+$` OR `^no-improvement-for=\d+$` |
| `--dry-run` | bool | false | runs evaluation only, skips install |
| `--tier-override` | bool | false | founder-only; Tier C entity runs in Tier B mode |
| **v1.1 NEW** `--max-messages=<N>` | int | 500 | hard ceiling on session messages per skillopt run |
| **v1.1 NEW** `--max-cost-usd=<N>` | float | 5.00 | per-task-kind cap aggregator (currently $0 marginal cash; reserved for future API escape) |
| **v1.1 NEW** `--regen-data` | bool | false | force regenerate synth dataset (default: reuse `latest/`) |
| **v1.1 NEW** `--resume=<run-id>` | uuid | unset | resume interrupted run from `state.json` |
| **v1.1 NEW** `--gen-sources=auto\|pillars=1,2,3,4,5` | string | auto | which Pillars 1-5 to mix for synth data (see §19.5) |
| **v1.1 NEW** `--bridge-poll-ms=<N>` | int | 1000 | session-bridge file-queue polling cadence (250/500/1000/2000) |

`--stop` + `--loop` precedence: FIRST trigger wins (v1.0 path).
`--max-messages` + `--max-cost-usd` precedence: FIRST trigger wins (v1.1 skillopt path).

## 4. Karpathy lenses (v1.0 — inspiration, not architectural authority)

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

**v1.1 note:** SkillOpt path REPLACES K1 (rubric composite) with K1' (held-out
test-split mean score), uses K2' (session-message budget instead of $), and
keeps K3/K4/K5 unchanged.

## 5. Architecture (4-plane composition, v1.1 extended)

```
USER → /evolve command (.claude/commands/evolve.md)
       ↓ parses, validates, dispatches
       SOP (06-ai-ops/sops/SOP-AIOPS-004-evolve/flow.yaml)
       ↓ declares phase sequence (v1.0 + v1.1 skillopt sections)
       SKILLS (06-ai-ops/skills/eval-evo/)
        ├── orchestrator/         # v1.0 loop runner
        ├── score-{type}/         # v1.0 per-type judge invocation (5 skills)
        ├── propose-improvement/  # v1.0 type-agnostic diff generator
        ├── install-improvement/  # v1.0+v1.1 tier-aware writer (REUSED by v1.1)
        ├── outside-voice/        # v1.0 codex / Claude subagent (E5)
        ├── playbooks/<type>.md   # v1.0 rubric (10 sub-scores + judge persona)
        ├── cases/<type>/<name>/  # v1.0 golden case battery (E6 scaffolding)
        ├── skillopt-runner/      # v1.1 NEW — Phase C wrapper
        ├── skillopt-gen-data/    # v1.1 NEW — synth data pipeline (5 pillars)
        ├── skillopt-judge/       # v1.1 NEW — per-task LLM-as-judge
        └── playbooks/skill-skillopt.md  # v1.1 NEW — task-completion rubric
       ↓ may dispatch
       PERSONA + INFRA LAYER
        ├── @ceo / @cto (v1.0 judge personas via Agent tool)
        ├── codex CLI binary (v1.0 outside-voice primary)
        ├── @skillopt-target-rollout (v1.1 NEW — Haiku 4.5; tools=[Read])
        ├── @skillopt-optimizer-reflect (v1.1 NEW — Sonnet 4.6; tools=[Read])
        ├── episodic-recall skill (v1.0+v1.1 past run_summaries)
        ├── pre-llm-call-budget.md hook (cost gate)
        ├── pre-edit-tier1.md hook (HITL gate)
        ├── pnpm check (drift gate)
        ├── vendor/skillopt/ (v1.1 NEW — pinned MIT, ONE additive file)
        ├── scripts/skillopt/session-bridge.cjs (v1.1 NEW — IPC bridge)
        └── ops.* tables (agent_runs, run_summaries, corrections, events,
                          consistency_checks, cost_attributions, +v1.1:
                          evolve_extractions for synth-task citation spine,
                          entity_edit_locks for serialization)
```

## 6. Loop mechanics

### 6.1 Pre-flight (per /evolve run, v1.0 — applies to ALL paths including v1.1 skillopt)

1. `pnpm check` clean (drift gate). Else ABORT.
2. Concurrent-run check via universal lock: `ops.acquire_entity_edit_lock('skill', <slug>, 'evolve', <run_id>, <session_id>)`. If lock held, ERROR with held-by + age.
3. Entity exists on disk (`<type-base>/<name>` per type→path mapping).
4. Working tree clean for the entity file (`git diff --quiet -- <file>`). If dirty, ERROR.

**v1.1 note:** v1.0 path uses `WHERE agent_slug='evolve'` check OR universal lock per `evolve_uses_universal_lock` feature flag. v1.1 skillopt path ALWAYS uses universal lock (no legacy code path).

### 6.2-6.7 (v1.0 mechanics, unchanged)

See v1.0 spec history. Sections preserved verbatim:
- 6.2 Per-iter loop (in-place with git stash isolation)
- 6.3 Per-type judge persona binding
- 6.4 Tier-based install gating
- 6.5 Outside-voice (Tier C+ only)
- 6.6 Falsifiable efficacy gate (day-30)
- 6.7 Rubric-bias hold-out (per playbook)

### 6.8 SkillOpt loop mechanics (v1.1 NEW)

**Entry condition:** `/evolve skillopt <skill-name>` invoked AND v1.0 pre-flight (§6.1) passes.

**Phase chain (in `skillopt-runner/SKILL.md`):**

```
A. Pre-flight        — §6.1 lock + drift + working tree
B. Gen-data          — synth task generation (§19.5 5-pillar pipeline)
                        - founder review gate via AskUserQuestion
                        - cached to runtime/skillopt/<entity>/data/v<ts>/
C. Train loop        — SkillOpt subprocess + bridge dispatch (§19.6)
                        - subprocess: vendor/skillopt/scripts/train.py
                          --backend ritsu_file_queue
                        - bridge: scripts/skillopt/session-bridge.cjs polls
                          llm-requests/ → Task() fan-out → llm-responses/
                        - resume-able via runtime/skillopt/<entity>/runs/<rid>/state.json
D. Outer K4 ratchet  — score current_skill vs best_skill via session call (§19.7)
                        - keep-or-discard at full-skill granularity
E. Install           — invoke eval-evo/install-improvement (v1.0 skill REUSED)
                        - Tier B: in-place via git stash (default)
                        - Tier C: PR mode (--tier-override needed; not v1.0 default)
F. Founder review    — AskUserQuestion: accept / reject / request-changes
                        - reject → ops.corrections row written; entity reverted
G. Lock release      — ops.release_entity_edit_lock(...)
                        - ops.run_summaries written; ops.events fires ritsu.entity.evolved
```

**Outer-loop quality signal:** `best_skill.md` from SkillOpt subprocess scored
by per-task LLM judge (`skillopt-judge` skill) against held-out test split.
Mean test-split score is the K4 ratchet quantity. Strictly greater than prior
best → accept; else → revert.

**Bridge IPC** (full detail §19.6):
```
runtime/skillopt/<entity>/runs/<rid>/
├── cfg.json               # config passed to subprocess
├── llm-requests/          # req-<uuid>.json files written by Python
├── llm-responses/         # resp-<uuid>.json files written by Node bridge
├── state.json             # checkpoint for resume
├── stdout.log             # subprocess stdout
├── stderr.log             # subprocess stderr
├── trajectory.jsonl       # full event log
├── checkpoints/           # skill_v0001.md..skill_vNNNN.md
├── entity.backup.md       # pre-run snapshot for revert
├── best_skill.md          # subprocess output
└── summary.json           # final per-task scores + metadata
```

## 7. Net new artifacts (v1.1 — ~19 new files + 3 in-place modifies)

See `gap-analysis.md` §6.1 for the full inventory. Summary:
- 3 new skills under `06-ai-ops/skills/eval-evo/` (skillopt-runner, skillopt-gen-data, skillopt-judge)
- 1 new playbook (`skill-skillopt.md`)
- 2 new agent types (`skillopt-target-rollout.md`, `skillopt-optimizer-reflect.md`)
- 1 vendor submodule (`vendor/skillopt/` pinned) + 1 additive file inside (`ritsu_file_queue.py`)
- 6 new helper scripts under `scripts/skillopt/` + `scripts/cross-tier/` + `scripts/eval-evo/`
- 3 in-place modifies: `.claude/commands/evolve.md` (+50 lines), `wiki/runbooks/evolve.md` (+80 lines), `governance/ROLES.md` eval-evo-orchestrator block (per_task_kind_caps additions)

Sprint plan ships across 4 sprints over ~2-3 weeks calendar (~$15-22 cash).

## 8. State machine (v1.0 unchanged)

Per-capability state (this is for the extend itself):
```
proposed → analyzing → architecting (← WE ARE HERE) → planning → implementing → deployed → operating
```

Per /evolve invocation lifecycle: see §9.

## 9. Per /evolve invocation lifecycle

### 9.1 v1.0 paths (unchanged)
See v1.0 spec §9 — state machine `proposed → running → looped → outside-voiced → proposed-for-pr → pr-open → pr-merged/pr-rejected | installed → completed`.

### 9.2 v1.1 skillopt path (NEW)

```
proposed (record in ops.agent_runs row; agent_slug='evolve.skillopt')
   ↓
lock_acquired (universal lock via ops.acquire_entity_edit_lock)
   ↓
gen_data_pending (synth task generation kicked off)
   ↓
gen_data_awaiting_founder (AskUserQuestion shown)
   ├──→ gen_data_rejected → aborted (lock released)
   └──→ gen_data_accepted → train_running
train_running (SkillOpt subprocess + bridge active)
   ├──→ train_paused_rate_limit (Tier B prompt; resume/abort)
   ├──→ train_crashed (subprocess non-zero exit → state.json snapshot → failed)
   └──→ train_completed (best_skill.md produced)
       ↓
       outer_k4 (session compares best_skill vs original)
       ├──→ k4_no_gain → reverted → completed_no_improvement
       └──→ k4_gain → install_pending
       install_pending (eval-evo/install-improvement invoked)
       ├──→ install_failed → reverted → failed
       └──→ install_applied → founder_review_pending
       founder_review_pending (AskUserQuestion: accept/reject)
       ├──→ founder_rejected → reverted → ops.corrections row → completed_rejected
       └──→ founder_accepted → completed
(parallel) aborted (founder cancel / drift / budget exceeded — lock released)
```

Stored in `ops.agent_runs.state_payload`:
```json
{
  "skillopt_run": true,
  "entity_type": "skill",
  "entity_slug": "wiki-sync/distill",
  "current_phase": "C",
  "current_epoch": 2,
  "current_step": 3,
  "best_score_so_far": 0.84,
  "current_checkpoint": "skill_v0012.md",
  "bridge_session_id": "gracious-gagarin-b63fec",
  "messages_consumed": 138,
  "messages_cap": 500,
  "outcome_path": "runtime/skillopt/wiki-sync-distill/runs/<rid>/best_skill.md"
}
```

## 10. Error & rescue

v1.0 spec §10 covers 22 named exception classes. v1.1 ADDS:

| # | Exception | Step | Rescue |
|---|---|---|---|
| 23 | `BridgeStartupFailure` | C-init | Cleanup runtime/skillopt/<rid>/; abort; log ops.agent_runs.error_at_step='bridge_startup' |
| 24 | `BridgePollTimeout` | C-loop | If subprocess alive but no requests for 5min: state.json snapshot; Tier B prompt resume/abort |
| 25 | `BridgeSubprocessCrash` | C-loop | Subprocess exit code non-zero: state.json snapshot; ops.agent_runs.state='failed' |
| 26 | `SubagentDispatchFail` | C-fan-out | Per-subagent retry (1x); 2-consecutive-fail: abort batch with Tier B prompt |
| 27 | `RateLimitBind` | C-fan-out | Session message error parsed: pause; state.json; Tier B AskUserQuestion (resume-later/abort) |
| 28 | `VendorSHAMismatch` | A-pre-flight | L1 validator failure: refuse to start; require `git submodule update` to repin |
| 29 | `RuntimeStalenessExceeded` | A-pre-flight | Dataset > 60d old: Tier B warning "regenerate or proceed with stale?" |
| 30 | `GenDataFounderReject` | B | Cleanup runtime/skillopt/<entity>/data/v<ts>/; abort with state='gen_data_rejected' |
| 31 | `OuterK4NoGain` | D | NOT an error: reverted to original entity; state='completed_no_improvement'; ops.run_summaries documents the no-gain |
| 32 | `FounderRejectFinal` | F | Original entity restored; ops.corrections row written; state='completed_rejected' |

All v1.1 exceptions follow the v1.0 discipline: named class + explicit rescue + ops.agent_runs.error_at_step logged.

## 11. Security model

v1.0 spec §11 unchanged. **v1.1 additions:**

### 11.1 Vendor isolation
- `vendor/skillopt/` is a git submodule pinned to a known commit SHA recorded in `.gitmodules`
- L1 invariant `skillopt-vendor-sha-pinned` blocks `pnpm check` if `git ls-tree HEAD vendor/skillopt` doesn't match `.gitmodules`
- Submodule update requires explicit founder action: `git submodule update --remote vendor/skillopt && git add .gitmodules vendor/skillopt && pnpm check` — minimum Tier B
- No execute permission grant beyond `python3 vendor/skillopt/scripts/train.py` invoked by `skillopt-runner` skill via Bash tool (already governed by `pre-bash-mass-action` hook for observability)

### 11.2 Subprocess sandboxing
- Python subprocess launched via `Bash run_in_background` with explicit empty env: `env ANTHROPIC_API_KEY= python3 vendor/skillopt/scripts/train.py ...`
- Subprocess has NO network access to Anthropic (key empty); all LLM calls flow through file-queue → bridge → Task() subagents
- Subprocess working directory: `runtime/skillopt/<entity>/runs/<rid>/` (cwd-scoped to its run dir)

### 11.3 Bridge IPC isolation
- Request/response queue: `runtime/skillopt/<entity>/runs/<rid>/{llm-requests,llm-responses}/`
- Both directories are session-scoped; no other process should be reading them
- Bridge polls only requests files matching `req-<uuid>.json` schema (per `queue-protocol.md`); malformed files trigger `BridgeMalformedRequest` log + skip
- Response files written atomically (write to `.tmp` → rename)

### 11.4 PII redaction (Pillar 2)
- `skillopt-gen-data/` Pillar 2 extracts from `ops.run_summaries`; regex-redact before embedding in synth tasks
- Patterns redacted: emails, API keys (sk-, pk-, bearer tokens), URLs containing user IDs, Stripe customer IDs (cus_...)
- Same regex library as `pre-tool-secrets.md` hook (reuse, don't fork)

### 11.5 Subagent permissions
- `@skillopt-target-rollout` tools: `[Read]` only — cannot Edit, Write, Bash, or Task
- `@skillopt-optimizer-reflect` tools: `[Read]` only — same constraint
- Both subagents receive ONLY the SKILL.md text + 1 task object per dispatch; no file system traversal possible

## 12. Cost projection

| Bucket | Setup | Recurring | Source |
|---|---|---|---|
| **v1.0** /cla 8-phase ceremony | $3-5 one-time | $0 | original /cla session |
| **v1.0** Per-/evolve-run (judge-rubric path) | $0 | $0.50-2.50/run + $0.30 outside-voice | per-task-kind caps |
| **v1.0** Monthly eval-evo-orchestrator role | $0 | $50/mo cap, ~20-25 runs/mo | governance/ROLES.md |
| **v1.1** /cla extend ceremony | $3-5 one-time | $0 | this session burn |
| **v1.1** Sprint 1-4 implementation | $12-18 one-time | $0 | per `09-integrate-vs-reimplement.md` §3.6 |
| **v1.1** Per-/evolve-skillopt-run | **$0 marginal cash** | ~350 session messages | A' subscription-only invariant |
| **v1.1** Monthly recurring | **$0 new** | Reuses `eval-evo-orchestrator` $50/mo (A' is $0 marginal) | scope decision |
| **v1.1** Subscription rate budget | n/a | ~3-5 skillopt runs per 5h window | natural rate-limit cap |

**Per-task-kind soft caps (NEW v1.1 — session-message counts):**
- `eval-evo-skillopt-rollout-batch`: ~20 subagent msg per batch; ~10 batches/run = ~200 msg total
- `eval-evo-skillopt-reflect-batch`: ~4 subagent msg per batch; ~10 batches/run = ~40 msg total
- `eval-evo-skillopt-val-gate-batch`: ~20 subagent msg per batch; ~5 batches/run = ~100 msg total
- `eval-evo-skillopt-meta`: ~10 msg (gen-data + outer K4 + slow/meta updates)
- `eval-evo-skillopt-iteration-total`: ~350 msg cap per run (hard ceiling via `--max-messages=500` default + 30% headroom)

## 13. Risks + mitigations

v1.0 R1-R8 unchanged. **v1.1 NEW:**

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R9 | Synth data train→prod drift | M | Day-30 Spearman synth-prod correlation alert (< 0.3 critical, < 0.5 warn); 2-consecutive-month low correlation → founder retro (deprecate or re-tune pillar mix) |
| R10 | Python subprocess fragility | M | Vendor SHA pinned (L1); smoke test in CI on every PR; subprocess wrapped with state.json snapshot on every step; 2-consecutive-crash abort with founder Tier B |
| R11 | Synth-data-only (no real benchmarks) | M | Pillar 2 (ops.run_summaries) covers 30% of synth tasks when real usage exists; founder review gate (Phase B Step 4) prevents bad synth from reaching optimizer |
| R12 | Subscription rate-limit binds mid-run | M | Detector parses session error → state.json snapshot → Tier B prompt (resume later / abort); resume protocol is idempotent |
| R13 | Algorithm port fidelity (re-impl drift from paper) | **eliminated in A'** | Paper authors' code runs unchanged; we only added one additive backend file |
| R14 | Subagent fan-out instability | L | Per-subagent retry (1x); 2-consecutive-fail abort; E2E smoke covers 1-induced-failure case |
| R15 | Vendor upstream API changes | L | Additive backend pattern (file 09 §3.3); submodule pin requires explicit `git submodule update`; SHA mismatch blocks `pnpm check` |
| R16 | Founder review fatigue (Phase B+F gates per run) | L | Cached datasets reuse via `latest/`; review-time ~3 min becomes ritualized after 3-5 runs |
| R17 | PII leakage via Pillar 2 synth tasks | L | Regex-redact at extraction (same patterns as `pre-tool-secrets.md` hook); founder review gate as second backstop |
| **R18 (NEW)** | Bridge IPC fragility (file watch + subprocess + Node coordination) | M | 50ms file watch latency × ~350 calls = ~15-25s overhead per run (negligible); atomic write via `.tmp` + rename; malformed files logged + skipped; Tier B prompt on >5min poll timeout |
| R19 | Vendor upstream PR for ritsu_file_queue rejected | L | Fork-as-additive-file pattern works without upstream merge; rebase against future upstream releases trivial (one file, additive) |

**Net risk:** R10 + R18 traded against R13 elimination. Per file 09 §3.7: net risk LOWER than vendor-without-bridge OR re-implement-without-vendor alternatives.

## 14. Per-Bài-toán impact (v1.1 additions)

| Bài | What v1.1 touches |
|---|---|
| Bài #1 (4-Tier Truth) | adds `runtime/skillopt/` (gitignored Tier-Workspace) + INSERTS to `ops.evolve_extractions` (citation spine for synth tasks) |
| Bài #2 (HITL) | Phase B founder review gate (B); Phase F founder accept/reject (B); rate-limit-bind Tier B prompt; vendor SHA repin (B) |
| Bài #4 (Episodic Memory) | Pillar 2 reads `ops.run_summaries` (~30 rows per skill) for synth-task grounding |
| Bài #5 (Orchestration) | new agent_slug='evolve.skillopt' on ops.agent_runs; subagent fan-out via Task() (16-25 parallel) |
| Bài #7 (Economic) | NO new cost-bucket; 5 new task_kinds (session-message budgets, not USD) under existing `eval-evo-orchestrator` |
| Bài #11 (Events) | fires `ritsu.entity.evolved` events (existing family, no new event kind) |
| Bài #12 (MCP) | NO new MCP server; reuses `supabase-ops` (lock + INSERT) + `gbrain` (READ-only opt-in Pillar 4) |
| Bài #13 (State Machine) | new agent_runs state_payload schema (jsonb additions; no DDL) for skillopt lifecycle |
| Bài #14 (Knowledge Graph) | Pillar 3 reads wiki via `mcp__supabase-ops__wiki_ask` for synth-task grounding |
| Bài #15 (Decision Architecture) | writes `ops.decisions` for Phase 5 architect approval (this run) |
| Bài #20 (Capability Lifecycle) | this v1.1 IS a CLA-produced extend (/cla extend evolve sub-flow) |

## 15. Acceptance criteria

### S0 (v1.0 ship — unchanged)
- `/evolve skill <fixture> --loop=1 --tier-override` runs end-to-end on `.archives/test-fixtures/skill-foo/SKILL.md`
- ops.agent_runs row written; ops.run_summaries row written

### S1 (v1.1 Sprint 4 smoke)
- `/evolve skillopt <fixture-skill> --max-messages=50 --dry-run` runs end-to-end on synthetic fixture
- Produces `best_skill.md` in `runtime/skillopt/<fixture>/runs/<rid>/`
- ops.agent_runs row written with `agent_slug='evolve.skillopt'`; ops.run_summaries row written
- L1 invariant `skillopt-vendor-sha-pinned` passes after vendor pin commit

### S2 (v1.1 Week 3 post-ship)
- 3 real skills evaluated (founder picks at Phase 5 ceremony OR post-ship per Q8)
- ≥ 2 produce held-out test-split delta > 0 (improvement on unseen tasks)
- All within `--max-messages=500` (no rate-limit binds)
- IF 0/3 → mandatory retro on whether bridge IPC OR synth-data quality is at fault; A could escalate (vendor + API key + Tier C audit override) ONLY if measurement shows session bridge cannot deliver

### S3 (v1.1 Day-30 post-operating)
- Production correction-rate delta < 1.5× baseline (v1.0 rate) — i.e., skillopt-evolved skills don't increase founder corrections
- Synth-prod correlation ≥ 0.5 — held-out test-split scores correlate with real prod success
- KPI `skillopt_synth_to_prod_correlation` ≥ 0.5; alert clean

## 16. Authoring history

- 2026-05-22 — /plan-ceo-review + /plan-eng-review (522-line PLAN.md + 11 review sections + outside-voice YELLOW absorbed + eng-review pass)
- 2026-05-22 — /cla propose Phase 0-4. Approach A approved
- 2026-05-22 — Phase 5 architect (v1.0 spec). Tier C founder approval
- 2026-05-22 — Sprint 1-3 ship; capability state → `operating` (overnight session, single ceremony)
- 2026-05-27 — Brainstorm 4 revisions on SkillOpt integration (00→09 + 99 consolidated) culminating in Architecture A' (vendor + ONE additive backend + session bridge; NO API key, NO source modification)
- 2026-05-27 — /cla extend evolve invoked (this run; ops.capability_runs id `20595190-adff-40ba-bdc6-b67a60651f04`)
- 2026-05-27 — Phase 0 drift gate (pnpm check 14/14 clean) + universal lock acquire
- 2026-05-27 — Phase 1-delta + Phase 3 gap-analysis authored
- 2026-05-27 — Phase 5 spec.md v1.1 drafted (this file). Pending Tier C founder approval before advancing to Phase 6 sprint plan.

## 17. Cabinet review references

### v1.0 (preserved)
- **@cto eng-review:** `.archives/cla/evolve/refs/08-eng-review.md` — E1-E13. APPROVE with +5.25h additions
- **@ceo strategic review:** PLAN.md §0F mode selection + §1.2 strategic reframe at STOP 3. APPROVE
- **Muse-equivalent adversarial:** `.archives/cla/evolve/refs/07-outside-voice.md` — YELLOW verdict with 5 findings; 3 substantive cross-model tensions absorbed
- **Spec-review loop:** 2 iterations, 8/10 PASS (logged at `~/.gstack/analytics/spec-review.jsonl`)

### v1.1 (this run)
- **Brainstorm consolidation:** `.archives/brainstorming/skillopt-integration-2026-05-27/09-integrate-vs-reimplement.md` (A' final synthesis, supersedes 06/07/08)
- **Synth-data design:** `.archives/brainstorming/skillopt-integration-2026-05-27/04-synthetic-data-grounding.md`
- **Subagent fan-out mechanics:** `.archives/brainstorming/skillopt-integration-2026-05-27/06-subscription-mode-feasibility.md` §4
- **Muse-equivalent adversarial pass:** ABSORBED across brainstorm revisions 06→07→08→09 (4 revisions of pressure on api-key-vs-vendor trade-off). No separate Phase 5 Muse panel run — would be redundant given the 4-revision history.
- **@cto review (this session, Sprint 1 founder commits):** VERDICT `APPROVE-WITH-CHANGES`. Three MUST-FIX items addressed inline in this spec before founder Tier C presentation:
   1. `.gitmodules` `commit =` field doesn't exist by git spec — replaced with `vendor/skillopt.pin` companion file + L1 validator parses `git ls-tree HEAD vendor` fields (not regex). See §19.4.
   2. `per_task_kind_caps:` USD-float vs message-count integer collision would silently break `pre-llm-call-budget` hook — replaced with tagged `{unit: usd|messages, cap: N}` schema + Sprint 1 hook extension commitment. See §19.9.
   3. `tools: [Read]` on rollout/optimizer subagents was unnecessary attack surface (Pillar 2 prompt-injection exfiltration vector) — changed to `tools: []` for structural defense. See §19.7.
   Five SHOULD-FIX items committed as Sprint 1 deliverables in §19.13 (vendor rescue mirror, postinstall hook, IPC dedup state, rate-limit detector UNION pattern + 5-fixture test, `env -i` env clearing). Three nits also addressed (Sprint 4 → Sprint 5 split per NIT 2; Pillar confidence mapping per NIT 3; `env -i` per NIT 4). NIT 1 (Python sleep tuning) deferred to Sprint 1 implementation phase.

## 18. HITL C — founder Tier C ceremony required

This spec.md proposes:
- New vendor submodule (`vendor/skillopt/`) — first vendor dep in ritsu-works
- 2 new agent types — specifically `skillopt-target-rollout` (Haiku 4.5, `tools: []`) and `skillopt-optimizer-reflect` (Sonnet 4.6, `tools: []`); founder approval at this gate authorizes BOTH agent creations under existing Tier C agent-addition convention (the `pre-edit-tier1` hook) — no separate per-agent ceremony required (per @cto SHOULD-FIX 3)
- New L1 invariants (`skillopt-vendor-sha-pinned`, `skillopt-runtime-staleness`)
- KPI registry additions (3 new KPIs)
- Alert rules additions (2 new alerts)
- `governance/ROLES.md` eval-evo-orchestrator `per_task_kind_caps:` schema migration (USD-float legacy → tagged `{unit, cap}` form) + 5 new tagged entries
- `pre-llm-call-budget` hook extension to dispatch on `unit:` field (Sprint 1 commit)

Per HITL.md Tier C requires:
- Dry-run preview ✓ (this spec.md IS the preview)
- Founder approval via AskUserQuestion at end of Phase 5 (this session)
- `ops.decisions` row written with founder approval

**Approving this spec advances state `architecting → planning` and unlocks Phase 6 sprint-planner. Rejection at this gate releases the universal lock and writes `ops.corrections` for retrospective.**

---

# 19. SkillOpt subcommand integration (v1.1 NEW — the heart of this extend)

## 19.1 Why this section exists

v1.0 § 13 R7 (rubric bias) and R8 (unfalsifiable success) remain open because
v1.0 measures entity quality via judge-persona rubric scoring — judge-on-judge
measurement. The Day-30 efficacy gate (§6.6) uses the same judge that
produces the gains; if the judge is systematically miscalibrated, the gate
falsely confirms.

SkillOpt (Liu et al., 2025, arXiv:2605.23904, MIT license) reports +14-24pt
improvements across 52/52 evaluation cells using held-out task-completion as
the quality signal — **out-of-band measurement** the v1.0 lacks. Adding
SkillOpt as a complementary path (NOT a replacement) gives /evolve a
falsifiable test: convergent agreement between v1.0 judge scores and v1.1
held-out test deltas is evidence of real quality gain; divergence flags
calibration issues.

## 19.2 Surface

```
/evolve skillopt <skill-name> [--max-messages=N] [--max-cost-usd=N] [--dry-run]
                              [--regen-data] [--resume=<run-id>]
                              [--gen-sources=auto|pillars=1,2,3,4,5]
                              [--bridge-poll-ms=N] [--tier-override]
```

**v1.0 paths unchanged.** New surface is only the `skillopt` subcommand.

Entity-type restriction: `skill` only (v1.1). Defer command/agent/hook/SOP
to v1.2+ research because those entity types lack a clean "target task to
roll out on" abstraction (e.g., what task does a hook complete?).

## 19.3 Architecture A' (vendor + file-queue backend + session bridge)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Claude Code session (founder role; subscription billing)             │
│                                                                       │
│   /evolve skillopt <skill>                                            │
│       ▼                                                               │
│   skillopt-runner (skill orchestrator)                                │
│       │                                                                │
│       │ Phase A: pre-flight (Bash; lock acquire; drift; tree check)   │
│       │ Phase B: gen-data (skillopt-gen-data skill)                   │
│       │ Phase C: TRAIN LOOP                                            │
│       │   1. Write cfg.json + create llm-requests/, llm-responses/    │
│       │   2. Launch Python subprocess (Bash run_in_background):       │
│       │        env ANTHROPIC_API_KEY= python3                          │
│       │        vendor/skillopt/scripts/train.py                       │
│       │        --config runtime/skillopt/<entity>/runs/<rid>/cfg.json │
│       │        --backend ritsu_file_queue                             │
│       │        --backend-queue-dir runtime/skillopt/<entity>/runs/<rid>/│
│       │   3. Start session-bridge.cjs polling loop                    │
│       │   ┌─── BRIDGE LOOP (1s polling default) ───────────────┐     │
│       │   │  watch llm-requests/ for new req-<uuid>.json files  │     │
│       │   │  on new file:                                       │     │
│       │   │    parse request (model, prompt, max_tokens, kind)  │     │
│       │   │    dispatch via Task() with subagent_type:          │     │
│       │   │      - skillopt-target-rollout if kind=rollout      │     │
│       │   │      - skillopt-optimizer-reflect if kind=reflect   │     │
│       │   │    batch up to 16-25 in parallel when queue >1      │     │
│       │   │    write response atomically:                       │     │
│       │   │      resp-<uuid>.json.tmp → rename resp-<uuid>.json │     │
│       │   │  continue until subprocess exits OR aborted         │     │
│       │   └──────────────────────────────────────────────────────┘     │
│       │ Phase D: outer K4 (session call: score best vs current)       │
│       │ Phase E: install (eval-evo/install-improvement REUSED)        │
│       │ Phase F: founder review (AskUserQuestion)                     │
│       │ Phase G: lock release; ops.run_summaries write                │
│       ▼                                                                │
│   completion / abort                                                   │
└──────────────────────────────────────────────────────────────────────┘
            ▲                                       │
            │ resp-<uuid>.json files                │ req-<uuid>.json files
            │                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Python subprocess (cwd: runtime/skillopt/<entity>/runs/<rid>/)        │
│                                                                       │
│   vendor/skillopt/scripts/train.py                                    │
│       │                                                                │
│       │ uses backend selected via --backend flag                       │
│       ▼                                                                │
│   vendor/skillopt/skillopt/model/backends/ritsu_file_queue.py         │
│       │  (THE ONLY ADDITION TO vendor/skillopt/)                       │
│       │                                                                │
│       │ implements SkillOpt backend interface:                         │
│       │   class RitsuFileQueueBackend:                                 │
│       │     def generate(self, model, prompt, max_tokens, **kw):      │
│       │       req_id = uuid.uuid4().hex                                │
│       │       request = {                                              │
│       │         "id": req_id,                                          │
│       │         "model": model,                                        │
│       │         "prompt": prompt,                                      │
│       │         "max_tokens": max_tokens,                              │
│       │         "kind": kw.get("backend_kind", "rollout"),             │
│       │         "ts": time.time(),                                     │
│       │       }                                                        │
│       │       (req_dir / f"req-{req_id}.json.tmp").write_text(...)    │
│       │       (req_dir / f"req-{req_id}.json.tmp").rename(            │
│       │           req_dir / f"req-{req_id}.json")                      │
│       │       # block until response appears (timeout 600s default)    │
│       │       deadline = time.time() + 600                             │
│       │       while time.time() < deadline:                            │
│       │         resp_path = resp_dir / f"resp-{req_id}.json"           │
│       │         if resp_path.exists():                                 │
│       │           data = json.loads(resp_path.read_text())             │
│       │           return data["text"]                                  │
│       │         time.sleep(0.5)                                        │
│       │       raise TimeoutError(f"no response for {req_id}")          │
└──────────────────────────────────────────────────────────────────────┘
```

**Subscription invariant:** Python subprocess runs with `ANTHROPIC_API_KEY=`
empty in env. All LLM calls flow file-queue → bridge → Task() subagents →
session subscription billing. Zero HTTP calls to Anthropic from Python.

## 19.4 Vendor integration

```bash
# In /Users/doanchienthang/ritsu-works/ (root)
git submodule add https://github.com/microsoft/SkillOpt vendor/skillopt
cd vendor/skillopt
git checkout <pinned-commit-sha>
cd ../..
mkdir -p vendor/skillopt/skillopt/model/backends/
# ADD the new file (the ONLY modification — additive)
# vendor/skillopt/skillopt/model/backends/ritsu_file_queue.py (~80 LOC)
# Note: this file lives INSIDE vendor/skillopt/ but is tracked
# in OUR repo (outside the submodule's git tree)

# Record the pin in a companion file (.gitmodules has no `commit` field by spec)
echo "vendor/skillopt: <pinned-commit-sha>" > vendor/skillopt.pin

git add .gitmodules vendor/skillopt vendor/skillopt.pin \
  vendor/skillopt/skillopt/model/backends/ritsu_file_queue.py
```

**`vendor/skillopt.pin` format** (NEW companion file — addresses @cto MUST-FIX 1):
```
# vendor/skillopt.pin — submodule SHA pin (managed by L1 invariant)
# Updated only via explicit Tier B founder action:
#   git submodule update --remote vendor/skillopt
#   echo "vendor/skillopt: $(git -C vendor/skillopt rev-parse HEAD)" > vendor/skillopt.pin
#   git add vendor/skillopt vendor/skillopt.pin && pnpm check
vendor/skillopt: <40-char-sha>
```

**L1 invariant `skillopt-vendor-sha-pinned`** (revised — uses pin file + `git ls-tree` field extraction, not regex on `.gitmodules`):
```javascript
// scripts/cross-tier/validate-skillopt-vendor.cjs
const fs = require('fs');
const { execSync } = require('child_process');

// 1. Read pinned SHA from companion file (not .gitmodules; that file has no commit field)
const pinFile = 'vendor/skillopt.pin';
if (!fs.existsSync(pinFile)) {
  console.error(`MISSING: ${pinFile} — pin file required for vendor/skillopt`);
  process.exit(1);
}
const pinMatch = fs.readFileSync(pinFile, 'utf8')
  .split('\n').find(l => l.startsWith('vendor/skillopt:'));
const pinnedSha = pinMatch?.split(':')[1]?.trim();
if (!/^[0-9a-f]{40}$/.test(pinnedSha || '')) {
  console.error(`MALFORMED pin in ${pinFile}: ${pinnedSha}`);
  process.exit(1);
}

// 2. Read actual SHA from git's submodule tree entry (parse fields, don't regex)
//    git ls-tree HEAD vendor outputs lines like: "160000 commit <sha>\tvendor/skillopt"
const lsTree = execSync('git ls-tree HEAD vendor').toString().trim().split('\n');
const submoduleLine = lsTree.find(l => l.endsWith('\tvendor/skillopt'));
if (!submoduleLine) {
  console.error('vendor/skillopt is not registered as a submodule in HEAD');
  process.exit(1);
}
const actualSha = submoduleLine.split(/\s+/)[2];  // field 3: SHA

// 3. Compare
if (pinnedSha !== actualSha) {
  console.error(`vendor/skillopt SHA drift: pinned ${pinnedSha}, actual ${actualSha}`);
  console.error('Re-pin via: git submodule update --remote vendor/skillopt && echo "vendor/skillopt: $(git -C vendor/skillopt rev-parse HEAD)" > vendor/skillopt.pin');
  process.exit(1);
}
```

**Smoke test in CI (`scripts/skillopt/install-vendor.sh`)** (revised — env clearing per @cto NIT 4):
```bash
#!/usr/bin/env bash
set -euo pipefail
git submodule update --init vendor/skillopt
# Verify pin file matches actual SHA (assert L1 invariant from CI)
node scripts/cross-tier/validate-skillopt-vendor.cjs

# Verify backend is registered + callable
# env -i clears ALL env then re-adds minimum — defense against leaked API keys
env -i ANTHROPIC_API_KEY= HOME="$HOME" PATH="$PATH" PYTHONPATH="vendor/skillopt" \
  python3 vendor/skillopt/scripts/train.py --backend ritsu_file_queue --help > /dev/null
echo "vendor smoke ok"
```

**`package.json` postinstall hook (Sprint 1 commit — addresses @cto SHOULD-FIX 5):**
```json
{
  "scripts": {
    "postinstall": "bash scripts/skillopt/install-vendor.sh || true",
    "setup:skillopt": "bash scripts/skillopt/install-vendor.sh"
  }
}
```
Postinstall tolerant of failure (`|| true`) so a developer working unrelated
code isn't blocked; `pnpm check` enforces vendor health when actually needed.

**Vendor rescue (Sprint 1 commit — addresses @cto SHOULD-FIX 4):**
If `microsoft/SkillOpt` upstream is archived/deleted, fall back to a forked
mirror at `doanchienthangdev/skillopt-vendor-mirror` (created Sprint 1 at
pin SHA). Override mechanism:
```bash
git config submodule.vendor/skillopt.url https://github.com/doanchienthangdev/skillopt-vendor-mirror.git
git submodule sync vendor/skillopt
git submodule update vendor/skillopt
```
Documented in `wiki/runbooks/evolve.md` §Vendor rescue.

**Upstream PR (founder Q10 default YES):** Submit `ritsu_file_queue` as a
PR to `microsoft/SkillOpt` after Sprint 1 lands. Pattern is additive (no
breakage to existing backends); high acceptance probability. If rejected,
fork-as-additive-file pattern continues to work indefinitely.

## 19.5 Synthetic data strategy (5 grounding pillars — Phase B)

Per `04-synthetic-data-grounding.md`. Default mix per
`--gen-sources=auto` resolution:

| Pillar | Source | % of dataset | Cite | Notes |
|---|---|---|---|---|
| 1 (gold) | SKILL.md `<example>` blocks | 30-40% | always | Founder-authored canonical examples |
| 2 (silver-gold) | `ops.run_summaries` past invocations | 0-30% | when ≥ 10 rows exist | REGEX-REDACT PII at extract (§11.4) |
| 3 (silver) | Wiki RAG via `mcp__supabase-ops__wiki_ask` | 15-20% | always for skills attached to wiki capability | Domain knowledge + edge cases |
| 4 (silver opt-in) | gbrain READ via `mcp__gbrain__search` | **0% default (per Q1)**; opt-in via `--gen-sources=pillars=1,2,3,4` | when explicit | Operational lessons; cost ~$0.005/run |
| 5 (anchor) | `00-core/{brand_voice,product,principles}.md` + skill's SOPs | context only | always | Prepended ~3K tok for tone/anchor |

**Founder review gate (Phase B Step 4):** AskUserQuestion shows 5 random
sampled tasks + source mix + difficulty distribution. Options: Accept /
Reject+Regen / Show 5 more / Abort. Founder time ~3 min, becomes ritualized
after 3-5 runs.

**Caching:** `runtime/skillopt/<entity>/data/v<ts>/` per dataset version.
`latest/` symlink for default reuse. `--regen-data` forces new generation.
Auto-regenerate if `SKILL.md` hash differs from cached `source-manifest.json.skill_hash`.

**Citation spine writes (per task):** INSERT `ops.evolve_extractions` with
`(entity_type='skill', entity_slug, ref_path=<pillar-source-path>,
ref_chunk_index=<pillar-N>, raw_quote=<excerpt>, proposed_change=<task.input>,
confidence=[0.6|0.85|0.95], review_state='auto_accepted' if founder gate
passed else 'pending_review')`.

## 19.6 Session bridge (`scripts/skillopt/session-bridge.cjs`)

Architecture per file 06 §4.3 and file 09 §3.2. Skeleton (~200 LOC):

```javascript
// scripts/skillopt/session-bridge.cjs
// Driven from skillopt-runner skill via this session's tool calls.
// Polls runtime/skillopt/<entity>/runs/<rid>/llm-requests/.
// Dispatches via Task() subagent. Writes responses.
// State persists in state.json after every batch.

const POLL_MS = parseInt(process.env.BRIDGE_POLL_MS || '1000', 10);
const QUEUE_DIR = process.env.QUEUE_DIR;  // runtime/skillopt/<entity>/runs/<rid>/
const SUBPROCESS_PID = parseInt(process.env.SUBPROCESS_PID, 10);

// Pseudocode (the cjs reads requests, but the actual Task() dispatch
// happens via this session's Task tool calls; the bridge cjs is a
// state-machine helper that the session orchestrator drives in a loop):
//
// loop:
//   if !subprocess_alive(SUBPROCESS_PID): break
//   pending_requests = scan(llm-requests/, exclude responded)
//   if pending_requests.length == 0:
//     sleep(POLL_MS)
//     continue
//   batch = pending_requests.take(min(16, pending_requests.length))
//   write_state({phase: 'dispatching', batch_size: batch.length})
//   // dispatched via session's Task tool — see runner skill for invocation
//   for each req in batch:
//     emit_telegram_log(req.id, req.kind, req.model)
//   write_state({phase: 'awaiting_responses', batch_uuids: batch.map(b => b.id)})
//   wait_for_responses_written_by_session(...)
```

**Note:** The actual Task() fan-out is invoked by the session model (this
Claude session) from the `skillopt-runner` skill — the cjs file is a state
helper. The runner skill reads each pending request from `llm-requests/`,
issues `Task()` calls in batches of 16-25 in a single message (parallel),
and writes responses to `llm-responses/`. The cjs file persists batch state
across session message boundaries so `--resume` works.

**Polling cadence default:** 1000ms (1s). Founder Q9 hint suggests batch-
friendlier; founder may override via `--bridge-poll-ms=500` for latency-
sensitive evals. **Tier C decision point** for founder at this gate.

**Rate-limit detector:** Each Task() dispatch wrapped to detect Anthropic
rate-limit error. On binding:
1. Snapshot state.json with `{phase: 'rate_limit_paused', resume_after:
   <ISO timestamp>}`
2. AskUserQuestion Tier B: "Rate-limit window exhausted. Resume in N
   hours? [Yes / Switch to --use-vendor-subprocess this run / Abort]"
3. Founder picks one; runner skill executes accordingly.

## 19.7 Two new agent types

**`.claude/agents/skillopt-target-rollout.md`** (~80 LOC) — frozen target simulator

```yaml
---
name: skillopt-target-rollout
description: Frozen-agent simulator for SkillOpt rollouts. Receives (current_skill, task) and produces (trajectory, grade). Stateless, single-pass. Never spawns subagents. Used by /evolve skillopt subcommand.
tools: []          # NO tools — defense against prompt-injection exfiltration (per @cto MUST-FIX 3); SKILL.md text is passed in prompt
model: haiku
---

You are a frozen LLM agent under SkillOpt training. Your behavior is
defined ENTIRELY by the skill markdown provided in the prompt. Do not
deviate from it.

You will receive:
1. SKILL (full markdown text)
2. TASK (input + expected_behavior + rubric)

Produce:
1. TRAJECTORY (your reasoning + final output, ≤ 800 tokens)
2. SELF_GRADE_PER_CRITERION (0 or 1 per rubric criterion)

Output format: strict JSON
```

**`.claude/agents/skillopt-optimizer-reflect.md`** (~120 LOC) — proposer

```yaml
---
name: skillopt-optimizer-reflect
description: SkillOpt optimizer that reflects on a minibatch of (success | failure) trajectories and proposes add/delete/replace edits to skill markdown. Never spawns subagents. Used by /evolve skillopt subcommand reflection phase.
tools: []          # NO tools — defense against prompt-injection exfiltration (per @cto MUST-FIX 3); inputs passed via prompt
model: sonnet
---

You are the SkillOpt optimizer model. Given:
1. CURRENT_SKILL (markdown)
2. MINIBATCH (B_m trajectories with grades, partitioned failure vs success)
3. PRIOR_REJECTED_EDITS (this epoch's rejected-edit buffer — DO NOT propose these)
4. META_SKILL (optimizer-side accumulated lessons)

Produce up to L_t edits as structured JSON:
{
  "edits": [
    {"op": "add"|"delete"|"replace",
     "target": "<line range or section>",
     "new_text": "...",
     "rationale": "..."}
  ]
}

Failure-driven edits priority > success-preserving edits.
Output strict JSON only.
```

Both agents marked `tools: []` (empty) — cannot Read/Bash/Write/Edit/Task.
This is **structural defense** against prompt-injection-driven exfiltration:
a malicious task input embedded in synth data (e.g., from Pillar 2
`ops.run_summaries` despite §11.4 regex redaction) cannot direct the
subagent to read `runtime/secrets/.env.local`, `.archives/`, or any path —
because the subagent has no Read tool. They receive ONLY the SKILL.md text
+ 1 task object per dispatch in the prompt.

**Implementation note:** Claude Code agent format permits `tools: []`
(empty list). If Sprint 1 testing reveals a runtime requirement for at
least one tool, fall back to `tools: [Glob]` with a deny-by-default pattern
limiting Glob to a sentinel non-existent path — but the design intent is
zero tools.

## 19.8 Three new skills

| Skill | LOC | Purpose |
|---|---|---|
| `skillopt-runner/` | ~250 | Phase C orchestrator: writes cfg, launches subprocess via Bash run_in_background, drives bridge polling loop via Task() dispatch, persists ops.* writes |
| `skillopt-gen-data/` | ~300 | Phase B synth pipeline (5 pillars; founder review gate; citation spine writes) |
| `skillopt-judge/` | ~150 | per-task LLM-as-judge invoked by `ritsu_file_queue.py` backend for grading dispatches (returns rubric pass-rate normalized [0,1]) |

Full SKILL.md content authored Sprint 2-3 per sprint plan.

## 19.9 Per-task-kind caps (NEW — tagged values for unit safety)

Added to `eval-evo-orchestrator` role in `governance/ROLES.md`
`per_task_kind_caps:` block. **v1.1 introduces unit-tagged values to
prevent the unit-collision bug @cto MUST-FIX 2 surfaced** — `pre-llm-call-budget`
hook unconditionally treated all caps as USD; mixing in message-count
integers would silently allow what should be cap-checked.

**New schema (additive — v1.0 USD-float entries auto-migrate to `{unit: usd}`):**
```yaml
per_task_kind_caps:
  # v1.0 task kinds — auto-migrated to tagged form by Sprint 1 hook extension:
  eval-evo-iteration:   {unit: usd, cap: 0.50}
  eval-evo-evaluation:  {unit: usd, cap: 0.10}
  eval-evo-outside-voice: {unit: usd, cap: 0.30}
  # v1.1 NEW task kinds (session-message counts):
  eval-evo-skillopt-rollout-batch:   {unit: messages, cap: 25}
  eval-evo-skillopt-reflect-batch:   {unit: messages, cap: 4}
  eval-evo-skillopt-val-gate-batch:  {unit: messages, cap: 25}
  eval-evo-skillopt-meta:            {unit: messages, cap: 10}
  eval-evo-skillopt-iteration-total: {unit: messages, cap: 500}
```

**Backward compatibility:** The hook (Sprint 1 commit) parses both shapes:
- bare number (legacy) → treated as `{unit: usd, cap: N}` with deprecation warning logged to `ops.events`
- `{unit: usd|messages, cap: N}` (new) → unit-dispatched

**`pre-llm-call-budget` hook extension (Sprint 1 deliverable — addresses MUST-FIX 2):**
- Loads cap entry; dispatches by `unit` field
- `unit: usd` → enforces against `current_task_cost + estimated_call > cap`
- `unit: messages` → enforces against `session_message_count_for_task_kind + 1 > cap`
- Unknown `unit` → log warning to `ops.events` + skip enforcement (fail-open with audit trail; safer than fail-closed for an unknown task kind)

**Migration:** All ritsu-works `per_task_kind_caps:` entries get auto-migrated
to tagged form in the Sprint 1 PR for `governance/ROLES.md` (no separate
migration; the change is a YAML edit + hook update committed together).

## 19.10 KPIs, alerts, invariants

**3 new KPIs (`knowledge/kpi-registry.yaml`):**
- `skillopt_runs_monthly` (counter) — monthly count of completed `/evolve skillopt` runs (any outcome)
- `skillopt_synth_to_prod_correlation` (gauge) — Spearman correlation between held-out test-split scores and post-install prod success (correction-rate signal)
- `skillopt_post_install_correction_rate_delta` (gauge) — ratio of post-install correction rate to pre-install baseline per skill

**2 new alerts (`knowledge/alert-rules.yaml`):**
- `skillopt-synth-to-prod-correlation` — **critical** at < 0.3 (severe miscalibration); founder retro mandatory
- `skillopt-post-install-correction-delta` — **warn** at > 2× baseline (skillopt may be regressing entities)

**2 new L1 invariants (`knowledge/cross-tier-invariants.yaml`):**
- `skillopt-vendor-sha-pinned` — vendor submodule HEAD == `.gitmodules`-recorded pin (handler `scripts/cross-tier/validate-skillopt-vendor.cjs`)
- `skillopt-runtime-staleness` — no `runtime/skillopt/<entity>/runs/<rid>/` older than 60d (handler `scripts/cross-tier/validate-skillopt-runtime-staleness.cjs`; warn not fail)

**1 new schedule (`knowledge/schedules.yaml`):**
- `skillopt-synth-prod-correlation-monthly` — cron `0 9 1 * *` (1st of month 09:00 UTC); handler `scripts/eval-evo/skillopt-synth-prod-correlation.cjs`; populates `skillopt_synth_to_prod_correlation` KPI

## 19.11 Tier C decision points

Carried from Phase 1 problem.md §5 (Q8 + Q9) plus 3 net-new for Phase 5
founder ceremony:

| # | Decision | My default | Tier C founder choice |
|---|---|---|---|
| TCDP-1 | Bridge polling cadence default | 1000ms (1s) | Founder approves OR overrides to 250/500/2000 |
| TCDP-2 | S2 measurement skills | Post-ship pick (after S1 smoke) | Founder approves post-ship process OR picks 3 now |
| TCDP-3 | Vendor submodule pin SHA | Latest stable SkillOpt main HEAD as of merge | Founder approves OR specifies SHA |
| TCDP-4 | Upstream PR for ritsu_file_queue | YES (open as draft after Sprint 1) | Founder approves OR defers |
| TCDP-5 | `--use-vendor-subprocess` escape hatch in v1.0 | DEFER entirely (not even wired-disabled) — keep scope tight | Founder approves OR insists on wired-disabled scaffolding |

## 19.12 Vendored-license summary

SkillOpt is MIT-licensed. Vendoring as a submodule preserves their LICENSE
file at `vendor/skillopt/LICENSE`. The added file
`vendor/skillopt/skillopt/model/backends/ritsu_file_queue.py` carries
ritsu-works copyright header but is tracked in OUR repo (not the submodule's
tree), so no contribution to upstream unless we submit the optional PR.

## 19.13 Sprint plan preview (Phase 6 deliverable, not this session)

Revised per @cto NIT 2 (Sprint 4 was overloaded; Phase 8 promotion moved
to Sprint 5/buffer). Each sprint commits the @cto SHOULD-FIX items that
fall in its scope:

| Sprint | Days | Deliverables | Tier |
|---|---|---|---|
| 1 | 3 | Vendor pin + `vendor/skillopt.pin` companion file + `ritsu_file_queue.py` backend + 2 agent types (`tools: []`) + session-bridge skeleton + L1 vendor SHA validator (per §19.4 corrected) + install-vendor.sh w/ `env -i` env clearing + queue-protocol.md + `package.json` postinstall + vendor rescue mirror at `doanchienthangdev/skillopt-vendor-mirror` + **`pre-llm-call-budget` hook extension for tagged unit caps + auto-migration of v1.0 ROLES.md per_task_kind_caps to tagged form** + IPC dedup state (req-<uuid>.json.dispatched sentinel OR state.json batch tracking) | **C** (new agents + vendor + ROLES.md edit + hook edit) |
| 2 | 3 | skillopt-gen-data + skillopt-judge + playbooks/skill-skillopt.md + rate-limit-detector.cjs with UNION error patterns + 5-fixture unit test for rate-limit detector + cost-estimator.cjs (session msg count) + Pillar 1-5 confidence mapping (gold=0.95 auto-accept; silver/silver-gold=0.6-0.84 pending_review per @cto NIT 3) | B |
| 3 | 3 | skillopt-runner SKILL.md (orchestrator implementation) + evolve.md command extend (+50 lines) + state.json checkpoint format + R12 rate-limit handling + R18 startup cleanup (orphaned `.tmp` >5min sweep on bridge entry) | B |
| 4 | 3 | E2E smoke (S1 acceptance) + runbook bump including §Vendor rescue + L1 runtime-staleness validator + skillopt-synth-prod-correlation.cjs cron + KPI/alert YAML edits | B |
| 5 (was buffer) | 1-2 | Phase 8 promotion: capability-registry version bump 1.0.0 → 1.1.0 + spec.md promotion `.archives/cla/evolve-extend-skillopt/spec.md` → `wiki/capabilities/evolve/spec.md` (v1.0 archived to `.archives/cla/evolve/spec-v1.0.0.md`) + retrospective entry append + final pnpm check + ops.capability_runs state transition to `operating` | A (mechanical promotion) |

Full sprint plan (with acceptance criteria per task) authored in Phase 6,
next session.

---

*End of v1.1 spec. Phase 5 deliverable complete pending @cto review + founder Tier C approval.*
