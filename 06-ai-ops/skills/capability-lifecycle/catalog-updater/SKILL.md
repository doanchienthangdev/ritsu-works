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

### Step 6.5 — Regenerate resolver v2 catalog (REQUIRED, v1.2.0)

Run from repo root:
```bash
node scripts/resolver-v2/sync.cjs --apply
```

**Why this step exists:** every CLA-built capability typically adds 1+ skill, possibly 1 command, 0-2 agents, 0-N SOPs, 0-N schedules, 0-N hooks, sometimes new MCP tools / wiki pages / pages / views / metrics / runbooks / external-sources. Without this regen step, `knowledge/recipients/*.md` drifts from filesystem source-of-truth and:
- The Mode A in-session ambient catalog (loaded via `CLAUDE.md` `@knowledge/recipients/*.md` imports) becomes stale — `/resolver` lookups + `/ceo` routing miss the new capability.
- Step 7 (final `pnpm check`) fails the `validate-resolver-v2-coverage` validator.

**Behavior:**
- Idempotent — if no source changes, no files written, exits 0 in ~150ms.
- Covers all **16 recipient kinds**: skill, command, agent, persona, mcp, wiki, sop, capability, workflow, schedule, hook, page, view, metric, runbook, external-source (per resolver-v2.2 spec + sync.cjs v1.2.0 fix).
- Atomic write per file (temp → rename).

**Failure handling:**
- If `sync.cjs` exits 2 (lock held by another session): wait 60s + retry once. If still locked, ABORT phase — surface to founder: "resolver-v2 sync lock held — investigate `.archives/resolver-v2-sync.lock`".
- If `sync.cjs` exits 1 (generator error): ABORT — do NOT advance state. Log the error to `.archives/cla/<id>/phase-8-sync-error.log` and surface to founder.
- If `sync.cjs` exits 0 but writes 0 files (already in sync from a prior manual run): proceed to Step 7 normally.

**Cost-bucket:** `ai-ops-cla` (deterministic — no LLM call; pure file I/O).

**Note on the OTHER catalog files:** Phase 8 has already updated `wiki/capabilities/CATALOG.md` (Step 4) and `knowledge/capability-registry.yaml` (Step 5). Step 6.5 is specifically about regenerating the resolver v2 ambient catalog (`knowledge/recipients/*.md`) — a different surface, consumed by LLM in-session routing.

### Step 6.6 — Regenerate resolver v3 INDEX.md (REQUIRED, v1.2.1)

Run from repo root:
```bash
pnpm resolver:index
# equivalent: node scripts/resolver-v3/index-generator.cjs
```

**Why this step exists:** Step 6.5 regenerated the 16 `knowledge/recipients/*.md` source files (resolver v2 catalog). The resolver v3 ambient surface is `knowledge/recipients/INDEX.md` — a compressed (~11K tokens) projection of those 16 files, loaded into every Claude Code session via `CLAUDE.md @import`. Without this regen, INDEX.md drifts from the source files and:
- The session ambient INDEX is stale — model sees old summary lines, misses the new capability's recipients.
- `validate-resolver-v3-index-consistency.cjs` (L1 validator in `pnpm check` Step 7) FAILS.
- Husky pre-commit will auto-regen at commit time, but THIS session (mid-Phase 8) would still operate against stale INDEX between Step 6.5 and the eventual commit. Explicit regen here closes that window.

**Behavior:**
- Idempotent — if no source changes since last regen, no file written, exits 0 in ~50ms.
- Reads all 16 `recipients/*.md` files; emits compressed INDEX.md (1-line per active recipient, stubs/deprecated/planned hidden).
- Atomic write (temp → rename); preserves header `<!-- AUTO-GENERATED -->` markers.

**Failure handling:**
- If exit ≠ 0: ABORT — log error to `.archives/cla/<id>/phase-8-index-regen-error.log` and surface to founder.
- If exit 0 but writes 0 files (already in sync): proceed to Step 7 normally.

**Cost-bucket:** `ai-ops-cla` (deterministic — no LLM call).

**Order matters:** Step 6.5 MUST run before Step 6.6. Step 6.6 reads `recipients/*.md` written by Step 6.5.

### Step 7 — Final `pnpm check` gate

Run `pnpm check`. If non-zero, ABORT — do NOT advance state to `operating`. Surface the validator output: "Final drift check failed; capability stays at `deployed`. Fix drift, re-run Phase 8."

This is the second mandatory drift gate (the first is Phase 0). It catches any inconsistency introduced by the registry update OR the wiki/CATALOG.md update.

After Step 6.5 regenerated recipients/*.md AND Step 6.6 regenerated INDEX.md, the `validate-resolver-v2-*` AND `validate-resolver-v3-index-consistency` validators in `pnpm check` should now pass cleanly — Steps 6.5 + 6.6 close the gap where the new capability's components weren't yet visible in either catalog surface (recipients/*.md = source-of-truth; INDEX.md = compressed ambient).

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
- Updated `knowledge/recipients/*.md` (16 files; only changed ones touched; v1.2.0 Step 6.5)
- Updated `knowledge/recipients/INDEX.md` (resolver v3 compressed ambient surface; v1.2.1 Step 6.6)
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
| `resolver-v2 sync.cjs` lock held (exit 2) | Wait 60s + retry once; if still locked, ABORT with `resolver-v2-sync.lock` investigation prompt. |
| `resolver-v2 sync.cjs` generator error (exit 1) | ABORT — write `.archives/cla/<id>/phase-8-sync-error.log`; surface to founder. |
| `resolver-v3 index-generator.cjs` error (exit ≠ 0) | ABORT — write `.archives/cla/<id>/phase-8-index-regen-error.log`; surface to founder. |

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

## Mode awareness (v1.1 — `cla-update-mechanism`)

This skill is invoked at Phase 8 of every flow. v1.1 adds mode-specific behavior. The orchestrator passes `mode` via `state_payload.update_mode`.

### Common pre-Phase 8 across update modes (mandatory)

Before mode-specific Phase 8 logic:
1. Verify update lock owned by current session (read `update_lock_session_id`).
2. Verify state_payload.update_mode is set.
3. Run `version-bumper` skill (NEW v1.1) for fix/extend/revise/tune; skip for deprecate.

### Per-mode behavior

#### Mode `create` (default — v1.0 behavior)
Full Process Steps 1-9 above. Output: `wiki/capabilities/<id>/spec.md` + `retrospective.md` promoted; CATALOG.md row added under Operating; registry updated to state=operating.

#### Mode `fix`
Light catalog update:
1. Skip retrospective generation (single fix doesn't warrant; aggregate in CHANGELOG instead).
2. Skip spec.md promotion (spec didn't change).
3. Append entry to `wiki/capabilities/<id>/CHANGELOG.md` (create if missing):
   ```markdown
   ## v<X.Y.Z> — fix — YYYY-MM-DD
   - <fix description from Phase 1>
   - PR: <url>
   ```
4. Update `knowledge/capability-registry.yaml`:
   - capability.version (from version-bumper)
   - capability.actual_cost_setup_usd (cumulative)
5. Release lock via `ops.capability_release_update_lock(<id>, <session_id>)`.
6. Set capability_runs.state = 'operating' (NEW row); mark prior row state = 'superseded'.
7. Final pnpm check.

#### Mode `extend`
Per-Spec versioning + promotion:
1. Generate retrospective.md (extension-specific: estimated vs actual, dependency impact handled).
2. Archive prior spec: `cp wiki/capabilities/<id>/spec.md wiki/capabilities/<id>/spec-v<prior_version>.md`.
3. Promote new spec: `cp .archives/cla/<id>-extend-<session_id>/spec.md wiki/capabilities/<id>/spec.md`.
4. Append CHANGELOG.md (minor version line).
5. Update CATALOG.md row (new version, same Operating section).
6. Update registry (version, actuals).
7. Release lock.
8. State advance + lineage as above.
9. Final pnpm check.

#### Mode `revise`
Major catalog update:
1. Generate full retrospective.md (revisions warrant comprehensive retro).
2. Archive prior spec to `spec-v<prior>.md`. Archive prior retrospective to `retrospective-v<prior>.md`.
3. Promote new spec.md AND new retrospective.md.
4. Append CHANGELOG.md (major version line — MAJOR header in markdown).
5. Update CATALOG.md row (new MAJOR version).
6. Update registry (major version, actuals).
7. Append boilerplate-extractable patterns to `notes/boilerplate-candidates.md` (revisions often surface generic patterns).
8. Release lock.
9. State advance + lineage as above.
10. Final pnpm check.

#### Mode `tune`
Lightest catalog update:
1. UPDATE `knowledge/capability-registry.yaml`:
   - capability.target_value (from tune-spec.md)
   - capability.target_kpis (if KPI list changed)
   - capability.version (patch++ from version-bumper)
2. Append CHANGELOG.md: `## v<X.Y.Z> — tune — YYYY-MM-DD\n- <KPI> target <old> → <new>\n- PR: <url>`.
3. Open ONE PR with the registry edit. Husky pre-commit pnpm check.
4. Founder Tier B approval per PR.
5. Release lock.
6. State: implementing → operating (compressed; no separate deployed phase).
7. Mark prior row 'superseded'.
8. NO spec.md change. NO retrospective. NO CATALOG row move.

#### Mode `deprecate`
Cleanup mode:
1. Verify Tier C approval (founder approved deprecation per HITL.md ceremony).
2. **Schedule cleanup:** read `knowledge/schedules.yaml`. For each schedule whose target SOP belongs to this capability (per spec.md § 4.2 SOPs list), set `enabled: false`. Log each disable to `ops.audit_log` with reason "capability-deprecation".
3. **CATALOG move:** Move row from "## Operating" section → "## Deprecated / Superseded" section in `wiki/capabilities/CATALOG.md`. Add deprecation_at date to the row.
4. **Registry update:** UPDATE capability:
   - capability.state = 'deprecated'
   - capability.deprecated_at = today
   - NO version bump (state transition only)
5. **Generate retrospective:** NEW `retrospective-deprecation.md` (deprecation-specific format: why deprecated, lessons learned, what to do differently next time, was it ever providing value, what replaces it). Promote to `wiki/capabilities/<id>/retrospective-deprecation.md`. Do NOT overwrite existing retrospective.md (keep for archeology).
6. **Spec retention:** KEEP `wiki/capabilities/<id>/spec.md` (not deleted; archeology preserved).
7. **CHANGELOG:** Append final entry: `## DEPRECATED — YYYY-MM-DD\n- Reason: <from deprecation-rationale.md>\n- Replaced by: <other capability id, if any>`.
8. Release lock.
9. **State machine special:** the deprecation cycle's NEW capability_runs row goes implementing → operating (the deprecation cycle itself is operating). Then immediately UPDATE the PARENT capability_runs row state = 'deprecated' (NOT 'superseded' — terminal state for the capability).
10. Final pnpm check.

### Failure mode additions (v1.1)

| Symptom | Mode | Response |
|---|---|---|
| Update lock not owned by current session | any update | ABORT — lock release would corrupt; surface for investigation |
| version-bumper returns conflict | fix/extend/revise/tune | ABORT — concurrent bump in flight; should be impossible if locks correct |
| Schedule cleanup fails | deprecate | Hold state; surface error; founder manually disables before re-running |
| Dependent capability still references | deprecate | BLOCK at Phase 8 (Phase 3 should have caught; this is defensive) |
| Spec archive collision (spec-v<X>.md exists) | extend/revise | Append `-r2`, `-r3` suffix; flag for cleanup |
| Wiki destination collision | create only | Already in v1.0 — ask founder overwrite/v2/abort |

### Lock release timing

In ALL update modes, lock release happens AFTER state transition to operating but BEFORE final pnpm check. Rationale: if pnpm check fails, the lock is already released so founder can retry without `/cla force-unlock`.

Rollback if final pnpm check fails: re-acquire lock + revert state to 'deployed' + surface error.

### Cost across modes

| Mode | Phase 8 LLM cost |
|---|---|
| `create` | $0.30-0.50 (full retrospective) |
| `fix` | $0.05 (CHANGELOG entry only) |
| `extend` | $0.20 (light retrospective + archive) |
| `revise` | $0.30-0.50 (full retrospective) |
| `tune` | $0.02 (registry edit only) |
| `deprecate` | $0.20 (deprecation retrospective + cleanup) |

---

**End of CLA workflow.** Capability is now `operating` (or `deprecated` for deprecate mode). Future enhancements go through their own CLA cycle: `/cla fix/extend/revise/tune` for evolution OR `/cla propose <id>-v2` for radical extensions.

## Brain context

> Per capability `gbrain-operational-brain` v1.0 Sprint 2. Template at `06-ai-ops/skills/brain-write-discipline/SKILL.md`.

**READ (full history aggregation):** `mcp__gbrain__list_pages` filtered by `frontmatter.capability_id = <slug>` → enumerates every brain page authored across Phase 1-7 (proposal + domain-analysis + options + architecture + sprint-plan + 6× sprint-review). Cost: ~$0.03.

**WRITE (retrospective + cross-link to wiki/):** `mcp__gbrain__put_page concepts/<capability_id>-retro-v<version>` with the canonical retrospective (lessons learned, deviation from estimates, recommendations for similar future caps). After the wiki/ retrospective PR merges, `mcp__gbrain__update_page` adds bidirectional link to the wiki/ promoted retrospective. Tier B notify. Cost: ~$0.05.

**Promotion candidate flag:** if the retrospective contains generalizable patterns (boilerplate-extractable, per `notes/boilerplate-candidates.md`), set page state to `mature` immediately so `brain-promotion` skill surfaces it in next weekly review.

**Skip** when `--no-brain` OR caller `brain_affinity: none`. Do NOT skip on cost-cap (catalog-updater retrospective is the highest-value brain write per capability — defer the dream cycle, not this).
