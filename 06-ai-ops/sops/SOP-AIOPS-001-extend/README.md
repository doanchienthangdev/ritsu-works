# SOP-AIOPS-001-extend — Capability scope expansion sub-flow

**Status:** Active (v1.1)
**Version:** 1.0.0
**Pillar:** 06-ai-ops
**Parent SOP:** SOP-AIOPS-001-capability-lifecycle
**Front-end:** `/cla extend <id>`

## Purpose

Medium-weight workflow for adding new scope/components to operating capabilities. Bumps minor version, promotes new spec.md, archives prior version. Auto-escalates to Tier C if the spec diff is substantial.

## When to use

- Operating capability needs new functionality (e.g., add Twitter polling to lead-acquisition)
- New components: 1-3 skills, optionally 1 SOP, light Tier 1 changes
- Time budget: 2-4 hours (or 1 week multi-session if multi-sprint)

If the change is fundamental architecture revision → use `/cla revise` instead.
If it's a single-file bug fix → use `/cla fix` instead.

## 7 Phases

| Phase | Skill / step | HITL | Time |
|---|---|---|---|
| 0. Pre-flight + lock | inline in /cla | A | ~30s |
| 1. Delta problem framing | problem-framer (mode=extend) | A | 15-30 min |
| 3. System inventory + dep scan | system-inventory-scanner + dependency-scanner | A | 15-30 min |
| 5. Architect (delta) | architect (mode=extend) | **B → C if diff substantial** | 30-90 min |
| 6. Sprint plan | sprint-planner (mode=extend) | B | 15-30 min |
| 7. Implementation | implementation-coordinator (mode=extend) | **B per PR** | 1-7 days |
| 8. Catalog update + promote | catalog-updater (mode=extend) | A | 10-15 min |

## Auto-escalation logic

Phase 5 architect classifies the spec diff:
- **Light** (≤ 20% lines change, no Section 4 component add/remove) → Tier B
- **Substantial** (>20% lines OR component changes) → auto-Tier C with full ceremony (@cto + Muse panel)

This means founder may go in expecting Tier B and end up doing Tier C ceremony. Acceptable — the auto-escalate prevents under-reviewed substantial changes.

## Artifacts

- Working folder: `.archives/cla/<id>-extend-<session_id>/`
- Promoted: `wiki/capabilities/<id>/spec.md` (new version)
- Archived: `wiki/capabilities/<id>/spec-v<prior>.md`
- CHANGELOG: `wiki/capabilities/<id>/CHANGELOG.md`
- Registry: `knowledge/capability-registry.yaml` updated

## Lineage

NEW `ops.capability_runs` row; `supersedes_id` → prior; prior state → `superseded`; new state → `operating`.

## Cost

- Anthropic API: ~$1-3 (depends on auto-escalation + sprint count)
- Founder time: 2-4 hours (light) or 1 week (multi-sprint)
- Cost-bucket: same as parent

## See also

- Parent capability spec: `wiki/capabilities/cla-update-mechanism/spec.md` § 4.2
- Sister sub-flows: `SOP-AIOPS-001-fix`, `SOP-AIOPS-001-revise`, `SOP-AIOPS-001-tune`, `SOP-AIOPS-001-deprecate`
