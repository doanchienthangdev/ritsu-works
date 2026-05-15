# SOP-AIOPS-001-tune — Capability KPI re-tuning sub-flow

**Status:** Active (v1.1)
**Version:** 1.0.0
**Pillar:** 06-ai-ops
**Parent SOP:** SOP-AIOPS-001-capability-lifecycle
**Front-end:** `/cla tune <id>`

## Purpose

Lightest update sub-flow. Edits `knowledge/capability-registry.yaml` only — bumps `target_value` (or adds/removes `target_kpis`). NO spec change, NO code change. Patch version bump for tracking.

## When to use

- Operating capability needs KPI target adjustment (e.g., `daily_new_customers` target 10 → 25)
- No code change needed
- Time budget: ~10 min
- Single registry edit + single PR

If the KPI change implies new measurement infrastructure or new code → use `/cla extend` instead.

## 3 Phases

| Phase | Skill / step | HITL | Time |
|---|---|---|---|
| 0. Pre-flight + lock | inline | A | ~30s |
| 1. Tune spec | problem-framer (mode=tune) | A | 2-5 min |
| 8. Registry update + PR | catalog-updater (mode=tune) | **B per PR** | 5-10 min |

**Total:** ~10 min.

## Artifacts

- Working folder: `.archives/cla/<id>-tune-<session_id>/` (tiny — just tune-spec.md)
- Registry: `knowledge/capability-registry.yaml` capability.target_value updated
- CHANGELOG: `wiki/capabilities/<id>/CHANGELOG.md` appended
- Spec: NOT changed
- Code: NOT changed

## Cost

- Anthropic API: ~$0.10 per tune
- Founder time: ~10 min
- Cost-bucket: same as parent

## Compression note

This sub-flow compresses `implementing → deployed → operating` into a single state transition because there's no real "deployed" intermediate (just a registry edit). The PR is opened, merged, and the capability is operating again immediately.

## See also

- Parent capability spec: `wiki/capabilities/cla-update-mechanism/spec.md` § 4.2
- Sister sub-flows: `SOP-AIOPS-001-fix`, `SOP-AIOPS-001-extend`, `SOP-AIOPS-001-revise`, `SOP-AIOPS-001-deprecate`
