# SOP-AIOPS-001-revise — Capability architecture revision sub-flow

**Status:** Active (v1.1)
**Version:** 1.0.0
**Pillar:** 06-ai-ops
**Parent SOP:** SOP-AIOPS-001-capability-lifecycle
**Front-end:** `/cla revise <id>`

## Purpose

Heaviest update sub-flow. Re-runs full Phase 4 (options) + 5 (architect with @cto + Muse panel) + 6 + 7 + 8. Bumps major version. Used when fundamental architecture changes (re-platforming, swapping core dependency, redesigning data model).

## When to use

- Operating capability needs fundamental architecture change
- Migration strategy from old → new architecture matters
- Multi-week implementation acceptable
- Founder commits to full Tier C ceremony

If just adding components → use `/cla extend`.
If just bug fix → use `/cla fix`.

## 8 Phases (full ceremony minus Phase 2 domain — domain inherited from parent)

| Phase | Skill / step | HITL | Time |
|---|---|---|---|
| 0. Pre-flight + lock | inline | A | ~30s |
| 1. Delta problem framing | problem-framer (mode=revise) | A | 30-60 min |
| 3. System inventory + deps | system-inventory-scanner + dependency-scanner | A | 30 min |
| 4. Options regeneration | options-generator (mode=revise) | **B** | 60-90 min |
| 5. Architect + @cto + Muse | architect (mode=revise) | **C — full ceremony** | 60-120 min |
| 6. Multi-sprint plan | sprint-planner (mode=revise) | B | 30-45 min |
| 7. Multi-PR implementation | implementation-coordinator (mode=revise) | B per PR | 1-2 weeks |
| 8. Major catalog update | catalog-updater (mode=revise) | A | 30 min |

**Total:** typically 1-2 weeks (multi-session).

## Why no Phase 2

Domain context is inherited from the parent capability (the original `/cla propose` cycle for this capability already established domain). Revising doesn't change the domain; it changes the architecture within that domain.

## Tier C ceremony (Phase 5)

**Mandatory full ceremony** — revise cannot be Tier B (per design).
- @cto sanity review of migration + tier1-diffs (verdict: APPROVE | NITS | BLOCK)
- Muse `high-stakes-decision-panel` (cynic, optimist, ethical-compass, data-pragmatist, time-honest)
- `ops.decisions` row written with Tier C metadata
- Founder approves via Telegram inline / Claude Code reply / GitHub PR comment per HITL.md

## Artifacts

- Working folder: `.archives/cla/<id>-revise-<session_id>/`
- Promoted: `wiki/capabilities/<id>/spec.md` (new major version)
- Archived: `wiki/capabilities/<id>/spec-v<prior>.md`
- Promoted: `wiki/capabilities/<id>/retrospective-v<new>.md`
- CHANGELOG, CATALOG.md, registry — all updated

## Lineage

NEW `ops.capability_runs` row → `supersedes_id` prior row. Prior row state → `superseded`. Major version delta marks the architectural boundary.

## Cost

- Anthropic API: ~$3-5 per revise (most expensive sub-flow)
- Founder time: ~8 hours over 1-2 weeks
- Cost-bucket: same as parent capability

## Failure handling

See `flow.yaml`. Critical:
- Founder rejects Phase 5 → roll back to Phase 4 OR mark deprecated
- @cto BLOCK 2x → escalate to founder
- Phase 8 final pnpm check fails → hold at `deployed`

## See also

- Parent capability spec: `wiki/capabilities/cla-update-mechanism/spec.md` § 4.2
- Sister sub-flows: `SOP-AIOPS-001-fix`, `SOP-AIOPS-001-extend`, `SOP-AIOPS-001-tune`, `SOP-AIOPS-001-deprecate`
