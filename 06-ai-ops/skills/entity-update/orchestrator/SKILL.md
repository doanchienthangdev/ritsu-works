---
name: entity-update/orchestrator
description: |
  Runs the /update <type> <name> --refs=<refs> phase chain for a single
  entity refresh. Composes shared eval-evo skills (distill-from-refs,
  review-extractions, propose-improvement, install-improvement, score-{type},
  test-gen). Replaces ad-hoc refresh hand-edits with citation-discipline +
  K4 quality ratchet + auto-revert. Invoked by .claude/commands/update.md.
trigger: invoked-by-command-only
judge_persona: per-type (see playbooks/<type>.md)
proposer: eval-evo-orchestrator (shared with /evolve)
budget_caps:
  per_task_kind:
    entity-update-iteration: 1.50
    entity-update-distill-skill: 0.20
    entity-update-distill-command: 0.15
    entity-update-distill-agent: 0.20
    entity-update-distill-sop: 0.30
    entity-update-score-any: 0.15
    entity-update-propose-any: 0.25
    entity-update-test-gen-any: 0.25
  per_run_hard_cap: 1.50
spec: wiki/capabilities/update/spec.md (after Phase 8 promotion); draft .archives/cla/update/spec.md
role: entity-update-orchestrator
---

# Skill: entity-update/orchestrator

THIN dispatcher. Phase logic lives in shared eval-evo skills. This file:
1. Validates input from `/update` command
2. Acquires the universal entity-edit lock
3. Dispatches phases in order
4. Persists state to ops.* tables
5. Returns final state to command
6. Releases the lock

## Contract

### Input (from `.claude/commands/update.md`)
```json
{
  "entity_type": "skill | command | agent | sop | hook | pillar | file | folder | workflow",
  "entity_name": "<slug or path>",
  "entity_path": "<resolved-file-or-dir-path>",
  "refs": ["<ref1>", "<ref2>", ...],
  "run_id": "<uuid>",
  "session_id": "<claude-code-session-id>",
  "tier": "B" | "C",
  "force_pr": <bool>,
  "skip_drift_check": <bool>,
  "allow_untrusted_refs": <bool>,
  "force_tier": "B" | "C" | null,    // v1.1 file mode only
  "magic_phrase_override_reason": "<string|null>",   // v1.1 hook ceremony record
  "dry_run": <bool>
}
```

### v1.1 type extensions

- `hook` (Sprint 1): requires D-Std magic-phrase ceremony BEFORE Phase 0. Refused without
  `magic_phrase_override_reason` populated (≥ 5 words). All hook runs always Tier C minimum.
- `pillar` (Sprint 1): resolves pillar name (alias or numeric); refuses sub-pillar paths;
  allowed_paths from playbook = README.md + CLAUDE.md only.
- `file` (Sprint 2): NO playbook, NO score/K4 ratchet. Path-tier classification via
  `knowledge/update-file-paths.yaml` + `scripts/update/path-classify.cjs`. Tier-C floor enforced.
- `folder` (Sprint 3): classifier-dispatcher; recurses into the dispatched-to /update <type>.
- `workflow` (Sprint 3): REFUSES at runtime until workflows/ folder ships.

### Output (JSON return to command)
```json
{
  "exit_reason": "completed" | "aborted_classification_structural" | "aborted_quality_regression" | "aborted_cost_cap" | "aborted_lock_held" | "aborted_drift" | "aborted_review_pending" | "<other>",
  "classification": "trivial" | "medium" | "structural",
  "extractions": {
    "auto_accepted": <int>,
    "pending_review": <int>,
    "rejected_low_confidence": <int>,
    "founder_accepted": <int>,
    "founder_rejected": <int>,
    "founder_edited": <int>
  },
  "scores": { "pre": <int>, "post": <int>, "delta": <int> },
  "k4_outcome": "kept" | "reverted" | "n/a",
  "diff_applied": "in-place" | "pr" | "none",
  "pr_url": "<url>" | null,
  "marker": "<updated-by marker text written to entity>",
  "total_cost_usd": <float>,
  "wall_clock_seconds": <int>,
  "summary_text": "<one-line>",
  "abort_detail": "<reason text>" | null
}
```

## Phase chain

### Phase -1 — D-Std ceremony (hook type only; v1.1 Sprint 1)

For `entity_type='hook'`:
- Command surface (NOT orchestrator) emits the magic-phrase prompt:
  ```
  /update hook <name> requires D-Std authorization per governance/HITL.md.
  Reply with: override: <reason 5+ words> to proceed.
  Reply STOP to cancel.
  ```
- Founder issues `override: <reason 5+ words>`. Validates ≥ 5 whitespace-separated
  words + lowercase `override:` prefix. Re-prompts on invalid (max 3 attempts).
- On valid: command emits "Override registered. Executing in 30s. Reply STOP to cancel."
- 30s timer. If STOP within window → ABORT with `exit_reason='aborted_d_std_cancelled'`.
- On timer expire: command invokes orchestrator with `magic_phrase_override_reason` populated.
- Orchestrator records `was_override=true` + `override_reason` in `ops.agent_runs` row
  per HITL.md Tier D-Std audit requirements.

If `entity_type='hook'` AND `magic_phrase_override_reason` is null/missing → orchestrator
ABORTs with `exit_reason='aborted_d_std_required'`. Founder must re-run via command surface.

### Phase 0b — Workflow REFUSE (workflow type only; v1.1 Sprint 3)

For `entity_type='workflow'`:
- Check `fs.existsSync('workflows/')` AND `fs.existsSync('workflows/<name>.yaml')`.
- If EITHER missing → ABORT with `exit_reason='aborted_workflow_blocked_folder_not_shipped'`.
  Surface forward message:
  ```
  /update workflow blocked until workflows/ folder ships.
  knowledge/manifest.yaml workflows.status: planned
  Track progress: /cla list --state=implementing | grep workflow
  ```
- If both exist → fall through to standard pipeline (Phase 0 onward; uses the
  workflow playbook stub for scoring; sub_scores may need refinement post-real-data
  via /cla tune workflow-playbook).

The REFUSE branch exists BEFORE Phase 0 drift check; no LLM cost on impossible runs.

### Phase 0c — Folder classify-dispatch (folder type only; v1.1 Sprint 3)

For `entity_type='folder'`:
- Invoke `node scripts/update/folder-classify.cjs --path=<entity_path>`.
- Deterministic; no LLM call.
- Outcomes:
  - `classification='pillar'` → orchestrator INVOKES the dispatch_to command
    (e.g., `/update pillar 01-marketing`) recursively in-session. Parent /update
    folder run logs `state_payload.dispatch_to` for audit; child run accumulates
    cost normally.
  - `classification='skill'` → recursively `/update skill <name>`.
  - `classification='sop'` → recursively `/update sop <full-sop-id>`.
  - `classification='single-readme'` → recursively `/update file <path>/README.md`.
  - `classification='wiki-collection'` → ABORT with forward message
    `Run: /wiki sync wiki/<slug>/`. exit_reason='aborted_folder_wiki_use_wiki_sync'.
  - `classification='sub-pillar'` → ABORT; forward suggests file mode on README.
    exit_reason='aborted_sub_pillar_deferred_to_v1_2'.
  - `classification='refuse'` → ABORT; surface reason.

After dispatch (any positive classification), parent /update folder run state =
`completed` with `output_payload.dispatched_to` recorded. Folder run does NOT
double-count in KPI entity_update_run_count_monthly — the inner /update <type>
run counts; the wrapper logs as `agent_slug='update', input_payload.entity_type='folder'`
with `output_payload.dispatcher_only=true`.

### Phase 0a — Path classify (file type only; v1.1 Sprint 2)

For `entity_type='file'`:
- BEFORE Phase 0 drift gate. Deterministic; no LLM call.
- Invoke `node scripts/update/path-classify.cjs --path=<entity_path>`.
- Reads `knowledge/update-file-paths.yaml`. First-match-wins.
- Three outcomes:
  - `tier='refuse'` → orchestrator ABORTs with `exit_reason='aborted_path_classification_refused'`,
    surfaces `reason` + `forward_to` to command. No LLM cost.
  - `tier='C'` → tier_floor=C set. `force_tier=B` would attempt downgrade — ORCHESTRATOR REFUSES
    the downgrade with `exit_reason='aborted_force_tier_downgrade_refused'`. `force_tier=C` is a
    no-op (already C).
  - `tier='B'` → tier_floor=B. `force_tier=C` upgrade allowed + audit event
    `update_file_force_tier_upgrade` logged.
- Tier-floor recorded in `ops.agent_runs.input_payload.path_tier` for invariant
  `update-file-path-classification-deterministic`.

Path safety pre-check (also done by path-classify.cjs):
- Absolute paths (`/...`) → REFUSED
- `..` components → REFUSED (path traversal)
- Paths resolving outside repo root via realpath → REFUSED

File-size safety (orchestrator post path-classify):
- If `fs.statSync(entity_path).size > 200 * 1024` (200 KB) → ABORT with
  `exit_reason='aborted_file_too_large_for_distill'`.
- If file content is not valid UTF-8 (binary detection via sample bytes) →
  ABORT with `exit_reason='aborted_binary_file_refused'`.

### Phase 0 — Pre-flight (orchestrator does itself; no LLM)

1. **Drift gate** — invoke `pnpm check` unless `skip_drift_check` is true.
   - If `skip_drift_check=true` → INSERT `ops.audit_log` event
     `ref_source_allowlist_overridden`-style audit with `action='skip_drift_check'`,
     `tier='C'`. Founder authorized override.
   - On drift failure → ABORT with `exit_reason='aborted_drift'`.
2. **Working-tree check** — `git diff --quiet -- <entity-path>`. If dirty, abort.
3. **Ref-source allowlist** (agent + hook types; v1.1 STRICT_TYPES) — invoke
   `scripts/update/ref-source-allowlist.cjs --entity-type=<agent|hook> --refs=...
   [--allow-untrusted-refs]`. If refused, ABORT unless override.
4. **Refs resolution** — invoke `scripts/update/refs-resolver.cjs --run-id=<run_id> --refs=...`.
   For `wiki-query-pending` refs: orchestrator (this skill running in Claude
   session) invokes `mcp__supabase-ops__wiki_ask` + `scripts/wiki-sync/get.cjs`
   to fulfil; updates the runtime/cla/refs/<run_id>/ folder.
5. **Lock acquire** — invoke
   `ops.acquire_entity_edit_lock('<entity_type>', '<entity_name>', 'update',
   '<run_id>', '<session_id>')`. If returns `acquired=false`, ABORT.
6. **Size estimate** — invoke `scripts/update/size-estimator.cjs
   --refs=... --entity-type=<type>`. Pass result into Phase 1.
7. **INSERT ops.agent_runs** — `agent_slug='update'`, `state='running'`,
   `state_payload={ phase: 'distill', entity_slug, entity_type, run_id }`,
   `triggered_by_kind='founder'` (via /update command).

### Phase 1 — Distill (LLM via shared skill)

Invoke `eval-evo/distill-from-refs` skill with:
- `run_id`, `entity_type`, `entity_path`, `entity_content`, `refs`,
  `cost_estimate_usd` (from size-estimator), `per_task_kind_cap_usd`
  (from cost-bucket caps).

The skill INSERTs to `ops.evolve_extractions`. Returns counts per bucket.

If `aborted_reason='estimate_exceeds_2x_cap'` → ABORT with
`exit_reason='aborted_cost_cap'`.

### Phase 2 — Score pre + classify diff (LLM via shared score-{type} skill + helper)

1. Invoke `eval-evo/score-{type}` for `score_pre`.
2. Apply UPDATE `ops.agent_runs.state_payload.phase = 'classify'`.

(Classification happens after propose since classify-diff needs the actual diff.)

### Phase 3 — Review queue (if pending_review > 0)

If `pending_review` count from Phase 1 > 0:
- UPDATE `ops.agent_runs.state_payload.phase = 'awaiting_review'`.
- Surface to founder: "N extractions pending; run `/update review <run_id>`."
- Return early with `exit_reason='aborted_review_pending'` if founder hasn't
  pre-cleared queue. /update resume <run_id> picks up here.

Else proceed.

### Phase 4 — Propose-improvement (LLM via shared skill)

Invoke `eval-evo/propose-improvement` with:
- Standard /evolve inputs (memory_context, sub_scores_pre, weakest_sub_scores)
- PLUS `extractions_context` = founder_accepted + auto_accepted +
  founder_edited rows from `ops.evolve_extractions` for this `run_id`.

Skill returns unified diff. Orchestrator validates diff format.

### Phase 5 — Classify diff (per @cto NIT 3 — `classify-diff.cjs`)

Invoke `scripts/update/classify-diff.cjs --diff=<temp-file> --entity-type=<type>`.

Results:
- `structural` → ABORT with `exit_reason='aborted_classification_structural'`
  and forward message: "Run `/cla extend <capability-id>` instead — structural
  changes need full CLA ceremony."
- `medium` → proceed with PR-after-loop path (Tier C-full).
- `trivial` → proceed with in-place apply (Tier B-light).

If `force_pr=true`, promote to medium (audit-logged Tier C override).

**v1.1 per-type tier floors:**
- `hook` → ALWAYS Tier C minimum (PR always). trivial → promoted to medium with
  audit event `hook_tier_floor_enforced`.
- `pillar` → ALWAYS Tier C minimum (PR always). trivial → promoted to medium with
  audit event `pillar_tier_floor_enforced`.
- `file` (v1.1 Sprint 2): tier from path-classify Phase 0a output. Orchestrator
  SKIPS classify-diff for file type (no entity-type structural matrix; path-tier
  IS the tier). Score Phase 2 + Phase 8 ratchet ALSO SKIPPED (no playbook → no
  scoring rubric). Mandatory Phase 6.5 founder-approval AskUserQuestion replaces
  K4 ratchet for safety.
- `folder` (Sprint 3) → no classify-diff (dispatcher; recurses into dispatched type).
- `workflow` (Sprint 3) → REFUSEs before reaching Phase 5.

**v1.1 hook + pillar structural matrices added to classify-diff.cjs:**
- Hook: hitl_tier change, block: directive add/remove, denied_patterns: change,
  requires: change, tier_override_authority: change.
- Pillar: pillar_code, status, composes_from, sops_namespace, pillar_owner,
  entry_conditions, home_pillar, personas_bound field changes.

### Phase 6 — Install (in-place or PR) + 3-way diff check

1. **3-way diff** — invoke `scripts/update/three-way-diff.cjs
   --base=<git-blob-at-prior-marker> --yours=<current-entity-file>
   --theirs=<proposed-after-diff>`.
   - `status='conflict'` → ABORT; surface conflict_regions to founder.
   - `status='fast_forward' | 'merge_ok'` → proceed.
2. **Install** via `eval-evo/install-improvement` skill (git stash pattern).
3. **Write marker** — add `<!-- updated-by: /update v1.0 <run_id> @ <ts> -->`
   (or per-file-extension variant; see three-way-diff.cjs marker patterns)
   at top of modified file.

### Phase 7 — Test gen (LLM via shared test-gen skill)

Invoke `eval-evo/test-gen` skill. The skill body contains the All-Edge-Cases-Test
5-phase rule COMMITTED VERBATIM (per @cto T7 finding — avoid drift from
`~/.claude/CLAUDE.md` source).

Generated tests land under `<entity-dir>/tests/<diff-id>.test.cjs` (per
Sprint 1 playbook allowed_paths_for_proposer extension; founder Q1
co-located convention).

If test-gen returns no tests (entity has no testable surface) OR generated
tests don't apply (skip-tagged), log Tier-B `.skip` Telegram notify event
(Sprint 4 wires this).

### Phase 6.5 — Founder approval at install (file type only; v1.1 Sprint 2)

For `entity_type='file'`, BEFORE Phase 6 install commits the diff:
- Tier B (in-place): orchestrator presents the unified diff via AskUserQuestion
  ("Apply this diff to <path>?") with 4 options: Apply / Edit / Reject / Promote to PR (Tier C).
  Reject → ABORT with `exit_reason='aborted_founder_rejected_diff'`.
  Promote → re-classify as Tier C (PR path).
- Tier C (PR): no in-session approval — PR review on GitHub IS the approval.

This is the **K4 substitute** for file mode. Without a playbook → no score → no K4 ratchet.
Founder agency stays in the loop on every arbitrary-file change.

### Phase 8 — Score post + K4 ratchet

1. Invoke `eval-evo/score-{type}` for `score_post`.
2. K4 ratchet logic (mode-aware ±5pt slack per spec §10):
   - If `score_post >= score_pre - 5` (allowing 5-point regression in /update
     mode) → KEEP. Diff stays. UPDATE `ops.agent_runs.state_payload.k4='kept'`.
   - If `score_post < score_pre - 5` → REVERT via `git stash pop` of the
     install. INSERT `ops.events` event `ritsu.entity.update_reverted`.
     UPDATE `ops.agent_runs.state_payload.k4='reverted'`. EXIT with
     `exit_reason='aborted_quality_regression'`.

### Phase 9 — Finalize

1. UPDATE `ops.agent_runs.state='completed'`, `outcome=k4_outcome`.
2. INSERT `ops.run_summaries` with ~150-token post-hoc summary.
3. INSERT `ops.events` event `ritsu.entity.updated`.
4. **Lock release** — `ops.release_entity_edit_lock('<type>', '<name>',
   '<run_id>')`. Idempotent.
5. If classification was `medium` OR `force_pr=true`: open draft PR via
   `gh pr create`; return PR URL.
6. Else (trivial in-place): just print final summary to console.
7. RETURN JSON per output contract.

## On error / abort path (any phase)

- UPDATE `ops.agent_runs.state='failed'`, `error=<error>`, `error_at_step=<phase>`.
- RELEASE lock (idempotent — no-op if never acquired).
- INSERT `ops.events` `ritsu.entity.update_failed` with payload `{ phase, error }`.
- Return abort_detail to command for console rendering.

## State machine (agent_runs.state_payload.phase)

```
pre_flight → distill → awaiting_review → propose → classify
  → install (or aborted_structural)
  → test_gen
  → score_post
  → k4_decision
  → finalize (completed) | revert (failed_regression)
```

The lock function reads `state_payload->>'phase'` and refuses takeover if
it sees `awaiting_review` or `reviewing` (per Sprint 1 acquire function
@cto NIT 2).

## Cost discipline

- Per-task-kind caps enforced by `pre-llm-call-budget` hook (existing).
- Pre-distill check via `size-estimator.cjs` — ABORTs before any LLM call
  if estimate > cap × 2 (R7).
- Per-run hard cap: $1.50 total (sum of all phases per `economic_budget`
  in `governance/ROLES.md`).

## Reuse / composition contract

Every LLM-consuming phase delegates to a shared eval-evo skill:
- eval-evo/distill-from-refs (Sprint 2)
- eval-evo/review-extractions (Sprint 2 — Phase 3 dispatch only)
- eval-evo/score-{skill,command,agent,sop} (existing /evolve infrastructure)
- eval-evo/propose-improvement (Sprint 1 contract extension for extractions_context)
- eval-evo/install-improvement (existing /evolve infrastructure)
- eval-evo/test-gen (Sprint 3)

The orchestrator NEVER calls Anthropic API directly. All LLM cost lands
under the appropriate `entity-update-*` task_kind via the shared skill.
