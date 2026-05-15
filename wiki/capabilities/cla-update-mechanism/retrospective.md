# Retrospective: cla-update-mechanism

**Capability ID:** cla-update-mechanism
**State:** operating (post-Sprint 3 Phase 8)
**Generated:** 2026-05-15
**Implementation period:** 2026-05-15 (single session, 3 stacked PRs)

## Outcomes vs targets

| Metric | Target (from spec) | Actual | Delta |
|---|---|---|---|
| Cost setup ($) | 2.00 | TBD post-merge (estimate $1.50-2.00) | within range |
| Cost recurring ($/mo) | 0 | 0 | 0% (uses ai-ops-cla bucket) |
| Founder hours | 1.5 (3 PR reviews × 30 min) | TBD | TBD |
| Time to production (days) | same session (compressed via CC) | same session | as planned |
| Test count | 11 new files | 11 new files, 144 new test cases | +144 cases |

## What went well

- **Approach E (use /cla on itself) validated:** the v1.0 workflow architecture held up when applied to a real (and meta) capability. Phase artifacts produced inline correctly mapped to actual implementation.
- **Mode-awareness as appended subsection** worked cleanly. Each existing skill stayed readable; mode logic discrete + deletable.
- **Migration 00025 zero-downtime:** lock + version columns added without breaking v1.0 capabilities.
- **194 tests pass** including 144 new for v1.1 — strong contract coverage on every sub-flow + mode.
- **Resolved Bài #20 OQ-CLA-2** (deprecation flow) explicitly via `/cla deprecate` sub-flow.

## What was hard

- **Mode-awareness scope creep on `catalog-updater`:** by far the heaviest skill update. 5 modes × distinct catalog logic = 5 prose sub-sections + per-mode failure handling. Could have been split into 5 mode-specific skill files but chose to keep the `mode parameter` pattern for DRY.
- **5 sub-flow yamls duplication:** each has Phase 0 with similar pre-flight + lock acquisition. Could be DRYed via shared yaml include (not yet supported by the SOP runtime). Acceptable duplication for v1.1.
- **Test for race conditions:** wrote inline simulation (`acquireLock` helper) but didn't test against actual Postgres. Real concurrent-acquire race is only validated when sub-flows run for real.

## Surprises

- **Positive:** the existing `state_payload jsonb` from v1.0 was perfect for storing `update_mode` + `session_id` + `parent_version` without any migration changes to the column itself.
- **Negative (minor):** had to fix one stale test count in `tests/validate-tier1.test.ts` — same pattern as v1.0 Sprint 3 cleanup. Took 2 min.

## Lessons learned

1. **"Documentation as test" pattern scales.** 144 new test cases produced via regex contract checks against SKILL.md / flow.yaml / migration.sql. Catches drift if a future edit removes a gate without updating tests.
2. **Sub-flow proliferation is OK pre-PMF** when each has clear semantic boundary. 5 commands feel like a lot but each one has unambiguous scope.
3. **Lock semantics are easy to get wrong.** The `UPDATE ... WHERE col IS NULL RETURNING id` atomic pattern is the only race-free lock acquisition in Postgres without LOCK TABLE. Documented prominently in `architecture-revise/flow.yaml`.
4. **Promotion logic in catalog-updater needs mode awareness.** v1.0's catalog-updater assumed `:create`. Adding 5 update modes × different promotion paths (no-spec for fix/tune; archive-and-promote for extend/revise; keep-but-deprecate for deprecate) was the most complex skill update.

## Generic patterns observed (boilerplate candidates)

- **Lock acquire/release pattern** (Phase 0 acquire + Phase 8 release): generalizable to any long-running multi-phase workflow. Could extract as helper SQL functions used by future capability lifecycle SOPs.
- **Mode parameter on shared skill** (8 skills × 5 modes): pattern reusable for any future skill family with multiple invocation contexts. Note in `notes/boilerplate-candidates.md`.
- **Sub-flow yaml inheritance**: 5 sub-flows all share Phase 0 pre-flight. A future SOP runtime feature for `extends:` (yaml include) would reduce duplication.

## Should we have done it differently?

- **Single-command + --mode flag (Approach C):** considered but rejected. Per CEO review, semantic precision of 5 separate commands wins long-term. Reaffirmed during implementation when each sub-flow's failure modes diverged significantly.
- **Approach D (no new code, just `<id>-v2` extensions):** would have been faster (~30 min vs 4.5h) but not solved the actual problem (right-sized HITL per change type).

## Next steps

- Operating mode (Phase 8 → operating state) — this retrospective concludes the v1.1 ship cycle.
- **First real-world dogfood:** founder runs `/cla fix capability-lifecycle-architecture` on some small fix to v1.0 itself within 2 weeks. This validates the meta property: v1.1 can update its own parent.
- **Future enhancements (deferred):**
  - cherry-pick #5: auto-detect update need from KPI drift (premature pre-PMF; revisit at 5+ operating capabilities)
  - cherry-pick #8: capability fork semantics (wait for real fork need)
  - OQ-CLA-1: cost-bucket detail per sub-flow (defer to optional ROLES.md PR)
  - OQ-CLA-3: cross-cap dependency graph as separate artifact (depends on cherry-pick #2 usage)
- **Trigger interfaces now available:**
  - `/cla fix <id>` `/cla extend <id>` `/cla revise <id>` `/cla tune <id>` `/cla deprecate <id>` `/cla history <id>` `/cla force-unlock <id>`
  - `@cla` subagent (mid-conversation)

## Operating notes

(populated as the capability runs in production)

- **Trigger interface:** see § Next steps
- **First fired:** TBD — founder will dogfood post-merge
- **Drift since deploy:** 0 (just shipped)
- **Cost actuals (last 30d):** N/A
- **KPI trend:** N/A (infrastructure capability; no KPI defined)

## Related artifacts

- Working folder (local): `.archives/cla/cla-update-mechanism/`
- Promoted spec: `wiki/capabilities/cla-update-mechanism/spec.md`
- Sprint plan: `.archives/cla/cla-update-mechanism/sprint-plan.md`
- Capability registry entry: `knowledge/capability-registry.yaml § cla-update-mechanism`
- Parent capability: `capability-lifecycle-architecture` (v1.0)
- Bài #20 DRAFT (v1.1 footnote): `knowledge/phase-a2-extensions/bai-20-capability-lifecycle-DRAFT.md`
- PR series: #26 (Sprint 1), #27 (Sprint 2), #28 (Sprint 3)
- CEO review: this implementation session
- Eng review: this implementation session (Phase A of Sprint 3)
