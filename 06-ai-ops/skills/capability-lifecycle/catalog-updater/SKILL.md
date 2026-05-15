---
name: catalog-updater
description: Phase 8 of CLA workflow (Bài #20). Updates `knowledge/capability-registry.yaml` with actuals, generates `retrospective.md`, **promotes** `spec.md` + `retrospective.md` from `.archives/cla/<id>/` to `wiki/capabilities/<id>/`, updates `wiki/capabilities/CATALOG.md`, appends boilerplate-extractable patterns to `notes/boilerplate-candidates.md`. Final `pnpm check` gate before transitioning state to `operating`. Refuses to advance state if `retrospective.md` doesn't exist.
---

# Catalog Updater (CLA Phase 8)

## When to use

- After Phase 7 transitions state to `deployed`. `ops.capability_runs.current_phase = 8`.
- All sprint PRs merged. Final E2E passed.

## Inputs

- `capability_id`
- All artifacts in `.archives/cla/<id>/`
- `ops.capability_runs` row (for actuals: cost, hours, deployed_at)
- `ops.cost_attributions` history (for actual cost roll-up)
- Implementation PR list from git history

## Process

### Step 1 — Generate retrospective

Read `ops.cost_attributions WHERE capability_id = '<id>'` (or `cost_bucket = '<id>'`) for the implementation period. Compute actual recurring cost from the last 30 days of LLM calls related to this capability.

Read `ops.capability_runs` for `actual_cost_setup_usd`, `actual_founder_hours` (filled by Phase 7 sprint completions).

Read git log for the implementation period (`git log --since=<state_since> --grep="<capability_id>"`) to extract surprises (commits with "fix:" or "hotfix:" or "WIP" patterns are surprise indicators).

Write `.archives/cla/<id>/retrospective.md`:

```markdown
# Retrospective: {capability-name}

**Capability ID:** {capability_id}
**State:** deployed → operating
**Generated:** {date}
**Implementation period:** {state_since.implementing} → {deployed_at}

## Outcomes vs targets

| Metric | Target | Actual | Delta |
|---|---|---|---|
| Cost setup ($) | {est} | {actual} | {±%} |
| Cost recurring ($/mo) | {est} | {actual} | {±%} |
| Founder hours | {est} | {actual} | {±%} |
| Time to production (weeks) | {est} | {actual} | {±%} |
| Target KPI value | {target} | {current} | {±%} |

## What went well
- ...

## What was hard
- ...

## Surprises
- Positive: ...
- Negative: {pulled from "fix:" / "hotfix:" commits in git log}

## Lessons learned
1. ...

## Generic patterns observed (boilerplate candidates)
- {pattern}: {description, generic %, applicability}

## Should we have done it differently?
- ...

## Operating mode
- Trigger interface: {/command, @subagent, scheduled SOP, webhook}
- First fired: {pending}
- Monitoring: {KPIs registered}
```

### Step 2 — Refuse to advance if retrospective.md missing

Per `flow.yaml.failure_handling.phase_8_skipped`:

If `.archives/cla/<id>/retrospective.md` doesn't exist after Step 1 (e.g., generation failed or was skipped), ABORT. Do NOT advance state. Log: "Phase 8 requires retrospective.md to advance to 'operating'."

### Step 3 — Promote canonical artifacts to wiki

Copy:
1. `.archives/cla/<id>/spec.md` → `wiki/capabilities/<id>/spec.md`
2. `.archives/cla/<id>/retrospective.md` → `wiki/capabilities/<id>/retrospective.md`

Promotion rules:
- `mkdir -p wiki/capabilities/<id>/`.
- If destination already exists (e.g., a v2 with same slug), STOP and ask founder: "wiki/capabilities/<id>/ exists. Overwrite (capability re-deployment), append `-v2`, or abort?"
- After copy, the `.archives/cla/<id>/` folder STAYS local (gitignored) for retrospective context. Don't delete.

### Step 4 — Update `wiki/capabilities/CATALOG.md`

Read the existing CATALOG (or use the bootstrap version from Sprint 1). Append/update the row for this capability under the "Operating" section:

| ID | Name | Pillar | Deployed | Spec | Retrospective |
|---|---|---|---|---|---|
| `<id>` | <name> | <pillar> | <deployed_at> | [spec](<id>/spec.md) | [retro](<id>/retrospective.md) |

Move the row out of any in-progress sections if it was there.

Update the header counts ("Total capabilities (operating): N", "Total capabilities (any state): N").

### Step 5 — Update `knowledge/capability-registry.yaml`

Find the entry for `<id>` (created by Phase 0). Update:

```yaml
- id: <capability_id>
  name: <name>
  description: <from problem.md>
  state: operating
  state_since: <today>
  proposed_at: <existing>
  approved_at: <ops.capability_runs.approved_at>
  deployed_at: <ops.capability_runs.deployed_at>
  operating_since: <today>
  pillar_owner: <pillar>
  bài_toán_touched: [from spec.md § 3]
  spec_path: wiki/capabilities/<id>/spec.md          # promoted location
  retrospective_path: wiki/capabilities/<id>/retrospective.md
  cost_bucket: <id>
  estimated_cost_setup_usd: <from spec>
  estimated_cost_recurring_usd: <from spec>
  estimated_founder_hours: <from spec>
  actual_cost_setup_usd: <from ops.capability_runs>
  actual_cost_recurring_usd: <from ops.cost_attributions roll-up>
  actual_founder_hours: <from ops.capability_runs>
  target_kpis: [from spec]
  target_value: <from spec>
```

The yaml MUST validate against `knowledge/schemas/capability-registry.schema.json` after edit — if it doesn't, fix the diff.

### Step 6 — Append boilerplate-extractable patterns

If the retrospective identified generic patterns (Section "Generic patterns observed"), append to `notes/boilerplate-candidates.md`:

```markdown
## {date} — Patterns from {capability_id}
- **Pattern:** {description}
- **Generic level:** {%}
- **Applicability:** {which other projects / contexts}
- **Action:** {extract now? defer per chương 31 Maturity Level rule? skip?}
```

Per chương 31 discipline: do NOT extract to a shared library at Maturity Level 0-1 — just note for later.

### Step 7 — Final `pnpm check` gate

Run `pnpm check`. If non-zero, ABORT — do NOT advance state to `operating`. Surface the validator output: "Final drift check failed; capability stays at `deployed`. Fix drift, re-run Phase 8."

This is the second mandatory drift gate (the first is Phase 0). It catches any inconsistency introduced by the registry update OR the wiki/CATALOG.md update.

### Step 8 — Persist state

After `pnpm check` clean:
- UPDATE `ops.capability_runs` SET `state = 'operating'`, `state_since = now()`, `operating_since = now()`, `phases_completed = phases_completed || 8`, `current_phase = 8`, `retrospective_path = '.archives/cla/<id>/retrospective.md'`.
- INSERT `ops.events` (`ritsu.capability.cataloged`, `ritsu.capability.operating`).
- INSERT `ops.capability_phase_events` (final).
- INSERT `ops.run_summaries` (~150 tokens summarising actual vs estimate + 1 lesson).

### Step 9 — Final report to founder

```
✓ Capability {id} now LIVE in operating state.

Trigger interface (from spec.md § 12):
  - /<commands you exposed>
  - @<subagents you registered>
  - SOP-<X>-<NN> (scheduled at <cron>)

Promoted:
  - wiki/capabilities/<id>/spec.md
  - wiki/capabilities/<id>/retrospective.md

Registry updated. Catalog updated. Final pnpm check clean.

Estimated vs actual:
  - Cost setup: ${est} → ${actual} ({delta%})
  - Cost recurring: ${est}/mo → ${actual}/mo ({delta%})
  - Founder hours: {est} → {actual} ({delta%})
  - Time to production: {est}w → {actual}w ({delta%})

Top lesson: {top lesson from retrospective}

Boilerplate-candidate noted: {if any}
```

## Outputs

- `.archives/cla/<capability_id>/retrospective.md`
- **Promoted:** `wiki/capabilities/<capability_id>/spec.md`, `wiki/capabilities/<capability_id>/retrospective.md`
- Updated `wiki/capabilities/CATALOG.md`
- Updated `knowledge/capability-registry.yaml`
- Appended `notes/boilerplate-candidates.md` (if any patterns)
- ops.events: `ritsu.capability.cataloged`, `ritsu.capability.operating`
- ops.run_summaries entry
- ops.cost_attributions for the LLM call (small)

## State transition

`deployed → operating` (only after final `pnpm check` clean AND retrospective.md exists).

## HITL

Tier A. Auto-advance unless drift gate fails or wiki destination collision.

## Failure modes

| Symptom | Response |
|---|---|
| `retrospective.md` missing | ABORT (`flow.yaml.failure_handling.phase_8_skipped`). |
| `wiki/capabilities/<id>/` exists | Ask founder: overwrite, `-v2`, or abort. |
| Final `pnpm check` fails | Hold state at `deployed`; surface validator output. |
| Registry yaml invalid after edit | Roll back the registry diff; surface to founder. |
| `ops.cost_attributions` empty for this capability | Use estimates as actuals; flag "actuals unavailable" in retrospective. |

## LLM mode awareness

- **Subscription / Hybrid / Full API:** Same flow.
- **Fallback (no API):** Skill produces only the deterministic parts (registry update, promotion, CATALOG.md). Retrospective generation skipped — founder writes manually before re-running Phase 8.

## Cost estimate

- Anthropic API: ~$0.20-0.40 per invocation (mostly retrospective generation).
- Founder time: 15-30 min review + retrospective input.
- Cost-bucket: `ai-ops-cla` for the orchestration; `<capability-id>` for ongoing operation costs.

## Test fixtures

- `tests/cla/fixtures/catalog-updater-no-retrospective.json` — retrospective.md missing, expects ABORT.
- `tests/cla/fixtures/catalog-updater-wiki-collision.json` — wiki/capabilities/<id>/ exists, expects founder prompt.
- `tests/cla/fixtures/catalog-updater-final-drift.json` — pnpm check fails after registry update, expects state held at `deployed`.

---

**End of CLA workflow.** Capability is now `operating`. Future enhancements go through their own CLA cycle (or a `<id>-v2` extension capability).
