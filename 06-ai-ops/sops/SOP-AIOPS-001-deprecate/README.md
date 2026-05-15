# SOP-AIOPS-001-deprecate — Capability sunset sub-flow

**Status:** Active (v1.1)
**Version:** 1.0.0
**Pillar:** 06-ai-ops
**Parent SOP:** SOP-AIOPS-001-capability-lifecycle
**Front-end:** `/cla deprecate <id>`

## Purpose

Sunsets an operating capability. Cleans up scheduled SOPs, moves CATALOG row, blocks if dependent capabilities exist. **IRREVERSIBLE.** Tier C ceremony required.

Resolves **Bài #20 OQ-CLA-2** (capability deprecation flow open question).

## When to use

- Operating capability no longer providing value
- Replaced by another capability
- Decided to abandon (failed experiment)
- Resource cost outweighs benefit

## 4 Phases

| Phase | Skill / step | HITL | Time |
|---|---|---|---|
| 0. Pre-flight + lock | inline | A | ~30s |
| 1. Deprecation rationale | problem-framer (mode=deprecate) | A | 10-15 min |
| 3. Mandatory dependency scan | dependency-scanner | A (auto-blocks) | 5 min |
| 8. Cleanup + Tier C ceremony | catalog-updater (mode=deprecate) | **C** | 15-20 min |

**Total:** ~30 min.

## Dependent capability check (mandatory)

Phase 3 runs `dependency-scanner` skill. If any operating capability has spec.md text referencing `<id>` — BLOCK. Founder must:
- Update or deprecate dependents first, OR
- Override with Tier D-Std magic phrase (`override: acknowledged-breakage <reason 5+ words>`)

Override path: explicit acceptance that deprecating this capability will break X, Y, Z dependents. Logged immutably to `ops.audit_log`.

## Cleanup actions (Phase 8)

- `knowledge/capability-registry.yaml` capability.state = 'deprecated', deprecated_at = today
- `knowledge/schedules.yaml` — any pg_cron schedule referencing this capability's SOPs → enabled: false
- `wiki/capabilities/CATALOG.md` — row moves Operating → Deprecated section
- `wiki/capabilities/<id>/retrospective-deprecation.md` — NEW retrospective specific to deprecation (lessons, what we'd do differently)
- `wiki/capabilities/<id>/spec.md` — KEPT (archeology; not deleted)
- `wiki/capabilities/<id>/CHANGELOG.md` — append "deprecated YYYY-MM-DD: <reason>"

## State machine

```
operating → implementing (deprecation cycle starts) → operating (cycle done)
                                                    ↓
                                            parent capability state = 'deprecated' (terminal)
```

NB: the **parent capability_runs row** (the one being deprecated) goes to terminal state `'deprecated'`, NOT `'superseded'`. The deprecation cycle itself's NEW row goes to `'operating'` then is implicitly closed (it has no successor; the deprecation is the final action).

## Cost

- Anthropic API: ~$0.30
- Founder time: ~30 min (Tier C ceremony)
- Cost-bucket: same as parent capability (final attribution)

## Failure handling

See `flow.yaml`. Critical:
- Dependent capabilities → BLOCK; require founder override (D-Std)
- Tier C rejected → abort; original capability stays operating
- Schedule cancellation fails → hold state; manual intervention

## See also

- Parent capability spec: `wiki/capabilities/cla-update-mechanism/spec.md` § 4.2
- Bài #20 § OQ-CLA-2 (open question this resolves)
- Sister sub-flows: `SOP-AIOPS-001-fix`, `SOP-AIOPS-001-extend`, `SOP-AIOPS-001-revise`, `SOP-AIOPS-001-tune`
