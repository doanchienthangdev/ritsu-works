# SOP-AIOPS-001-fix — Capability bug fix sub-flow

**Status:** Active (v1.1 of /cla shipped)
**Version:** 1.0.0
**Pillar:** 06-ai-ops
**Parent SOP:** SOP-AIOPS-001-capability-lifecycle
**Front-end:** `/cla fix <id>` (`.claude/commands/cla.md` § Evolution sub-flows)

## Purpose

Light delta workflow for bug fixes on operating capabilities. Runs only 4 phases (0, 1, 7, 8); skips architecture review entirely. If `@cto` review identifies that the fix actually requires a spec change, the sub-flow ABORTS with redirect to `/cla extend` or `/cla revise`.

## When to use

- Operating capability has a defect (output wrong, edge case missed, integration brittle)
- Fix is small (≤ 5 files changed, ≤ 1 PR)
- No spec.md change needed (no new architecture, no new components)
- Time budget: ≤ 2 hours

If the fix needs a spec change → use `/cla extend` (medium) or `/cla revise` (heavy).

## 4 Phases

| Phase | Skill / step | HITL | Time |
|---|---|---|---|
| 0. Pre-flight + lock | inline in /cla | A | ~30s |
| 1. Delta problem framing | problem-framer (mode=fix) | A | 5-15 min |
| 7. Implementation | implementation-coordinator (mode=fix) | **B per PR** | 30-90 min |
| 8. Light catalog update | catalog-updater (mode=fix) | A | 5 min |

**Total:** ~30 min - 2 hours.

## Artifacts

- Working folder: `.archives/cla/<id>-fix-<session_id>/` (local; small)
  - `fix-description.md` (Phase 1 output)
- Canonical: PR diff in git history
- Registry: `knowledge/capability-registry.yaml` capability.version bumped patch++
- `wiki/capabilities/<id>/CHANGELOG.md` — appended fix entry

## State machine

```
operating → implementing (lock acquired) → deployed → operating (next version)
                                                    ↘ superseded (prior row)
```

## Lineage

- NEW `ops.capability_runs` row per fix invocation
- `supersedes_id` points to the prior row
- After Phase 8 success: prior row state → `superseded`; new row state → `operating`

## Cost

- Anthropic API: ~$0.50 per fix (problem-framer + @cto delegation + catalog-updater)
- Founder time: 30-90 min PR review
- Cost-bucket: same as parent capability

## Failure handling

See `flow.yaml` § failure_handling. Critical:
- Lock contention → wait or `/cla force-unlock`
- Fix scope creep into spec → ABORT + redirect to `/cla extend`
- Final pnpm check fails → hold at `deployed`

## Cross-references

- Parent capability spec: `wiki/capabilities/cla-update-mechanism/spec.md` § 4.2
- Front-end: `.claude/commands/cla.md` § `/cla fix <id>`
- Skills used: problem-framer (mode=fix), implementation-coordinator (mode=fix), catalog-updater (mode=fix)
- Migration: `supabase/migrations/00025_capability_update_lock.sql` (lock helpers)
