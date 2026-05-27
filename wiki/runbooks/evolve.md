---
title: /evolve Runbook
type: runbook
slug: evolve
owner: founder
last_reviewed: 2026-05-22
---

# /evolve Runbook — Operational Guide

> Operational reference for the `/evolve` self-improvement command.
> Spec: `wiki/capabilities/evolve/spec.md`. SOP: `06-ai-ops/sops/SOP-AIOPS-004-evolve/`.

## Quick reference

```
/evolve <type> <name> [--loop=N] [--stop=cond] [--dry-run] [--tier-override]
/evolve status <type> <name>
/evolve reject <run-id> "<reason>"
/evolve discard <run-id> [--stale]
```

| Type | Tier | Install path | Examples |
|---|---|---|---|
| skill | B | in-place | `wiki-sync/distill`, `episodic-recall`, `cost-optimization-review` |
| command | B | in-place | `cla`, `core`, `wiki`, `docs` |
| agent | B | in-place | `ceo`, `cto`, `cgo`, `cpo` |
| hook | **C always** | PR | `pre-edit-tier1`, `pre-llm-call-budget`, `pre-delegate-check` |
| sop | **C always** | PR | `SOP-AIOPS-001-capability-lifecycle`, etc. |

## Onboarding (first-time setup) — REQUIRED

Before /evolve can be invoked, you must complete the founder hold-out
ratings. This is the Goodhart-mitigation layer 2 safety check (R7).

### Step 1: open `_HOLDOUT.yaml`

Path: `06-ai-ops/skills/eval-evo/cases/_HOLDOUT.yaml`

Contains 25 entries (5 per entity type). All start with
`founder_rating: PENDING-FOUNDER`.

### Step 2: rate each entity 1-10

For each entry:
1. Read the entity at `entity_path`.
2. Rate overall quality 1-10:
   - **10** = exemplar; could not be substantially better
   - **7-8** = solid; minor improvements possible
   - **5-6** = adequate; meaningful improvements available
   - **3-4** = poor; needs substantial work
   - **1-2** = broken or near-broken
3. Replace `founder_rating: PENDING-FOUNDER` with the integer 1-10.
4. Add notes to the `notes:` field if you want context.

### Step 3: validate

```bash
node scripts/eval-evo/playbook-validate.cjs
```

Expected output:
```
[skill] Spearman ρ = X.XXX (threshold 0.6) — PASS / FAIL
[command] ...
[agent] ...
[hook] ...
[sop] ...
```

### Step 4: handle FAIL

If any playbook returns FAIL (Spearman < 0.6), the playbook's rubric does
NOT correlate with your judgment. The rubric must be REVISED before
/evolve runs on that type.

Open `06-ai-ops/skills/eval-evo/playbooks/<type>.md` and:
1. Read the 10 sub-scores in frontmatter.
2. Compare against the 5 entities you rated.
3. Revise sub-scores that don't match your judgment.
4. Re-run the validator.

You may need 1-2 iterations per playbook. Each cycle is ~10 min.

### Step 5: confirm /evolve is unlocked

```bash
/evolve skill wiki-sync/distill --dry-run
```

If you see "Eval+Evo: skill / wiki-sync/distill" — /evolve is operational.

## Common workflows

### Improve a single skill

```
/evolve skill <name>
```

Defaults: `--loop=3`, no `--stop`. Runs 3 iters, in-place install per kept iter.

### Test what /evolve WOULD do (no install)

```
/evolve skill <name> --dry-run
```

Runs the full eval cycle but skips install. Useful before committing to
a real run.

### Improve until score plateaus

```
/evolve skill <name> --loop=10 --stop=no-improvement-for=2
```

Up to 10 iters, but exits early if 2 consecutive iters don't improve.

### Improve to a specific quality target

```
/evolve skill <name> --loop=10 --stop=score>=85
```

Up to 10 iters, exits when composite score ≥ 85.

### Improve a hook (Tier C — PR opens)

```
/evolve hook <name>
```

The loop runs in-session (all iters), then outside-voice (codex CLI or
subagent fallback) runs, then a PR opens via `gh pr create`. You review
the PR + merge in your normal workflow.

### View history of /evolve runs on an entity

```
/evolve status skill <name>
```

Shows last 5 runs + score trajectory + cost summary.

### Reject a /evolve run (negative-signal feedback)

```
/evolve reject <run-id> "Removed the structured 10-sub-score rubric — that was the wrong direction"
```

Writes to `ops.corrections`. Next iteration on this entity loads this row
as negative signal — proposer avoids similar directions.

### Discard a stale stash entry

```
/evolve discard <run-id>
```

OR sweep all stale entries:

```
/evolve discard --stale
```

## Operational thresholds

| Metric | v1.0 limit | Action when hit |
|---|---|---|
| Per-iter cost | $0.50 | Hard cap; iter exits budget_truncated |
| Per-run cost (excl outside-voice) | $2.50 | Hard cap; run exits budget_truncated |
| Outside-voice cost (Tier C+ only) | $0.30 | Separate task_kind cap |
| Monthly role cap | $50 | 80% alert; 100% escalate; 150% hard-block |
| Per-month throughput | ~20-25 runs | Honest throughput; full-fleet requires v1.1 |
| Judge variance flag threshold | 5 pts | >5pt on unchanged artifact → audit flag |
| Spearman correlation (ship gate) | 0.6 per playbook | <0.6 = /evolve refuses on that type |
| Day-30 efficacy gate | 1.5× σ median gain | <1.5× → PAUSE-RECOMMENDED |

## Failure modes — what to do

### "Repo has drift — fix first"

`pnpm check` failed pre-flight. Run `pnpm check` manually to see what's
broken. Common causes: uncommitted Tier 1 yaml edits; recent migration
not reflected in manifest; persona registry mismatch.

### "Already evolving <slug> (run-id N)"

Concurrent-run check fired. Either wait for the existing run, or
`/evolve discard N` to abort it.

### "Entity <type> <name> not found"

Check entity exists at the path (see table at top of this file). If
typo, the error suggests closest match via NN search.

### "Working tree has uncommitted changes to <file>"

Commit or `git stash` your work-in-progress changes first. /evolve
needs a clean target file for its own stash isolation.

### "Outside-voice unavailable"

codex CLI not installed/configured AND Claude subagent dispatch failed.
PR still opens with annotation. Founder reviews manually as de facto
outside voice.

### "Judge returned malformed scores"

`JudgeParseError` — retry happened automatically; if persists, the
playbook prompt may be too strict. Open the playbook and verify the
rubric is unambiguous. Sub-score names should be specific, not abstract.

### "Iter <N> regressed score; reverted"

Normal behavior per Karpathy K4 keep-or-discard. If 3 consecutive iters
revert, the proposer can't find improvement — exit with
`all_iters_reverted`. Consider `/cla revise evolve` or `/cla revise <target>`
for architectural rethink.

### "Day-30 calibration: PAUSE-RECOMMENDED"

Median gain didn't beat 1.5× judge σ over 30 days. The orchestrator's
pre-flight check now refuses new /evolve invocations. Action:
1. Read `scripts/eval-evo/calibration-results/<latest>.json`
2. Run `/cla revise evolve` to address the underperformance
3. After v1.1 ships, the gate re-checks

## Debug tooling

| Need | Command |
|---|---|
| See all /evolve runs | `select * from ops.agent_runs where agent_slug='evolve' order by started_at desc limit 20;` |
| See per-iter scores for a run | `select state_payload->'scores' from ops.agent_runs where id = '<uuid>';` |
| See per-iter summaries | `select summary from ops.run_summaries where agent_slug='evolve' and run_id = '<uuid>' order by ts;` |
| See cost breakdown | `select task_kind, sum(cost_usd) from ops.cost_attributions where run_id = '<uuid>' group by 1;` |
| See variance flags | `select state_payload->'variance_flags' from ops.agent_runs where agent_slug='evolve' and id = '<uuid>';` |
| See founder rejections | `select correction_note from ops.corrections where entity_slug = '<slug>' order by ts desc;` |

## Cross-references

- **Spec:** `wiki/capabilities/evolve/spec.md` — canonical capability reference
- **SOP:** `06-ai-ops/sops/SOP-AIOPS-004-evolve/{flow.yaml, README.md}`
- **Command:** `.claude/commands/evolve.md`
- **Orchestrator skill:** `06-ai-ops/skills/eval-evo/orchestrator/SKILL.md`
- **Playbooks:** `06-ai-ops/skills/eval-evo/playbooks/{skill,command,agent,hook,sop}.md`
- **Cases:** `06-ai-ops/skills/eval-evo/cases/<type>/<entity>/case-*.yaml`
- **Hold-out ratings:** `06-ai-ops/skills/eval-evo/cases/_HOLDOUT.yaml`
- **Calibration:** `scripts/eval-evo/calibrate-efficacy.cjs`
- **Validator:** `scripts/eval-evo/playbook-validate.cjs`
- **HITL policy:** `governance/HITL.md`
- **Cost architecture:** `knowledge/economic-architecture.md`

## v1.1 — Running `/evolve skillopt <skill>` (SkillOpt held-out path)

> v1.1 adds the `skillopt` subcommand: an OUT-OF-BAND task-completion
> measurement complementary to the v1.0 judge-persona text-quality path.
> Spec: `wiki/capabilities/evolve/spec.md` §19 (after Phase 8 promotion;
> current draft `.archives/cla/evolve-extend-skillopt/spec.md`).

### When to use which path

| You want to measure… | Use |
|---|---|
| SKILL.md authoring quality (description, process clarity, output specificity) | `/evolve skill <name>` (v1.0) |
| Skill execution quality on a held-out task split (does it actually accomplish tasks?) | `/evolve skillopt <name>` (v1.1) |
| **Both** — falsifiable signal via convergence | Run both sequentially; compare judge-persona composite vs held-out delta |

### Prerequisites

Before first `/evolve skillopt` run:

1. **Python deps installed.** From repo root:
   ```bash
   python3 -m pip install -r vendor/skillopt/requirements.txt
   ```
   Required: openai, pyyaml, numpy, openpyxl, azure-identity, azure-core, httpx.

2. **Vendor patched.** Run `bash scripts/skillopt/install-vendor.sh` (idempotent).
   On a fresh `pnpm install`, the `postinstall` hook runs this automatically with
   `|| true` (soft-fail so unrelated dev isn't blocked).

3. **Drift gate clean.** `pnpm check` must pass (same as v1.0 path).

4. **Hold-out ratings complete.** Same gate as v1.0 — `_HOLDOUT.yaml` must
   have real founder ratings, not `PENDING-FOUNDER` placeholders.

5. **Cost pre-check.** `node scripts/skillopt/cost-estimator.cjs --skill=<name> --max-messages=500`
   should return a sane integer below the cap.

### Quickstart — S1 acceptance smoke (Sprint 4 deliverable)

The Sprint 4 fixture skill `skill-foo` lives at
`06-ai-ops/skills/eval-evo/test-fixtures/skill-foo/SKILL.md`. The S1 acceptance
gate per spec §15.S1:

```bash
/evolve skillopt skill-foo --max-messages=50 --dry-run
```

This MUST exit 0 and produce:

- `runtime/skillopt/skill-foo/runs/<rid>/best-skill.md` (non-empty)
- `runtime/skillopt/skill-foo/runs/<rid>/runner-state.json` with
  `phase: 'completed'` (or `'completed_no_improvement'` if K4 chose revert)
- `ops.agent_runs` row with `agent_slug='evolve'`, `state_payload->>'mode'='skillopt'`
- `ops.run_summaries` row (~150 tokens summary)

If any of those is missing, file a bug under capability `evolve` v1.1
follow-up.

### Argv reference (v1.1)

| Flag | Default | Notes |
|---|---|---|
| `--max-messages=N` | 500 | hard ceiling per `eval-evo-skillopt-iteration-total` cap in ROLES.md |
| `--dry-run` | off | skips Phase E install + Phase F founder review |
| `--regen-data` | off | forces fresh synth-data; bypasses skill-hash cache hit |
| `--resume=<run-id>` | none | resume a paused/crashed run from `runner-state.json` |
| `--gen-sources=auto` | auto | active pillars `[1, 3, 5]`; Pillars 2 + 4 deferred to v1.2 |
| `--gen-sources=pillars=1,3,5` | — | explicit subset; requesting 2 or 4 errors with deferral hint |
| `--bridge-poll-ms=N` | 1000 | bridge polling cadence (250-2000) |
| `--tier-override` | off | founder-only; Tier C entity → run in-session |

### Resume after rate-limit (R12)

When the bridge detects a rate-limit error (HTTP 429/529, Anthropic
`rate_limit_error` / `overloaded_error`, or message-pattern match), the
runner:

1. Snapshots `runner-state.json` with `phase: 'rate_limit_paused'`,
   `rate_limit_resume_after: <ISO timestamp ~1h ahead>`.
2. Sends SIGSTOP to the Python subprocess (it doesn't time out — paused
   at the file-queue blocker).
3. Surfaces `AskUserQuestion` Tier B:
   - **Resume in 1h** → `ScheduleWakeup(delaySeconds=3600, ...)`. Runner
     exits cleanly. The wake-up auto-resumes via the command's `--resume`.
   - **Switch to vendor subprocess** → NOT implemented v1.1; deferral hint.
   - **Abort** → SIGKILL subprocess; release lock; final state.

To manually resume a paused run:

```bash
/evolve skillopt <skill> --resume=<run-id>
```

The run-id is the uuid in `runtime/skillopt/<entity>/runs/<run-id>/`.

### Vendor rescue (microsoft/SkillOpt upstream archived / deleted)

If `git submodule update` starts failing because microsoft/SkillOpt is
removed from GitHub, switch the submodule to the rescue mirror:

```bash
# Founder action — create the mirror fork once (Sprint 1 task 1.15;
# still pending as of v1.1 ship):
gh repo create doanchienthangdev/skillopt-vendor-mirror \
  --public --source=microsoft/SkillOpt

# Per-developer override:
git config submodule.vendor/skillopt.url \
  https://github.com/doanchienthangdev/skillopt-vendor-mirror.git
git submodule sync vendor/skillopt
git submodule update vendor/skillopt
```

Documented at `scripts/skillopt/UPSTREAM-DEVIATION.md` §"Refresh procedure".

### Cleanup

Runs accumulate at `runtime/skillopt/<entity>/runs/<rid>/`. The L1 invariant
`skillopt-runtime-staleness` warns (does NOT fail CI) on directories older
than 60 days. Cleanup hint:

```bash
# Retain forensic copies first:
tar czf runtime-skillopt-archive-$(date +%Y%m%d).tar.gz runtime/skillopt
# Then delete old runs:
find runtime/skillopt -type d -name runs -exec find {} -mindepth 1 -maxdepth 1 -type d -mtime +60 -exec rm -rf {} \; \;
```

### Observability

- **KPI `skillopt_runs_monthly`:** count of /evolve skillopt runs each month
  (adoption signal).
- **KPI `skillopt_synth_to_prod_correlation`:** Spearman rolling-30d.
  Computed monthly by `skillopt-synth-prod-correlation-monthly` cron.
  Insufficient-data months (< 5 entities) → value=null.
- **KPI `skillopt_post_install_correction_rate_delta`:** ratio of post-install
  to pre-install correction rate. Warn at 2×, critical at 5×.

### Debug tooling (v1.1 additions)

| Need | Command |
|---|---|
| See current runner phase | `cat runtime/skillopt/<entity>/runs/<rid>/runner-state.json \| jq .phase` |
| See bridge state | `cat runtime/skillopt/<entity>/runs/<rid>/state.json \| jq` |
| See pending request queue | `ls runtime/skillopt/<entity>/runs/<rid>/llm-requests/` |
| Force-cleanup a stuck run | `node scripts/skillopt/session-bridge.cjs cleanup --queue-dir=runtime/skillopt/<entity>/runs/<rid>` |
| Cost estimate on a fixture | `node scripts/skillopt/cost-estimator.cjs --skill=<name>` |
| Rate-limit detector dry-run | `echo '{"status": 429}' \| node scripts/skillopt/rate-limit-detector.cjs` |

### Cross-references (v1.1)

- **Spec §19:** `wiki/capabilities/evolve/spec.md` (after Sprint 5 promotion)
- **Protocol:** `scripts/skillopt/queue-protocol.md`
- **Patch contract:** `scripts/skillopt/UPSTREAM-DEVIATION.md`
- **Runner skill:** `06-ai-ops/skills/eval-evo/skillopt-runner/SKILL.md`
- **Gen-data skill:** `06-ai-ops/skills/eval-evo/skillopt-gen-data/SKILL.md`
- **Judge skill:** `06-ai-ops/skills/eval-evo/skillopt-judge/SKILL.md`
- **Playbook:** `06-ai-ops/skills/eval-evo/playbooks/skill-skillopt.md`
- **Fixture:** `06-ai-ops/skills/eval-evo/test-fixtures/skill-foo/SKILL.md`
- **Bridge:** `scripts/skillopt/session-bridge.cjs`
- **Helpers:** `scripts/skillopt/{rate-limit-detector,cost-estimator}.cjs`

## Versioning

This runbook covers /evolve v1.0 (sections above) + v1.1 (this section).
v1.2 will re-enable Pillars 2 + 4 (gen-data) via migration
`00045_evolve_extractions_extend_ref_source_kind`.
