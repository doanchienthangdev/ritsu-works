---
name: catalog-updater
description: Phase 8 of CLA workflow (Bài #20). Updates capability catalog, registry, retrospective. Identifies boilerplate-extractable patterns. Final phase before transitioning to operating state.
---

# Catalog Updater (CLA Phase 8)

## When to use

After Phase 7 implementation deployed. Capability state = `deployed`.

## Inputs

- `capability_id`
- All artifacts in `wiki/capabilities/<id>/`
- Implementation PRs + retrospective data

## Process

### Step 1: Generate retrospective

`wiki/capabilities/<id>/retrospective.md`:

```markdown
# Retrospective: <capability>

## Outcomes vs targets
| Metric | Target | Actual | Delta |
|---|---|---|---|
| Cost setup | $X | $Y | +/- |
| Cost recurring | $X/mo | $Y/mo | +/- |
| Founder hours | X | Y | +/- |
| Time to production | N weeks | M weeks | +/- |
| Target KPI value | X | Y | +/- |

## What went well
- ...

## What was hard
- ...

## Surprises
- Positive: ...
- Negative: ...

## Lessons learned
1. ...
2. ...

## Generic patterns observed (boilerplate candidates)
- <pattern>: detail, applicability across projects

## Should we have done it differently?
- ...

## Next steps
- Operating mode (Phase 8 → operating state)
- Future enhancements deferred to v2
```

### Step 2: Update _CATALOG.md

`wiki/capabilities/_CATALOG.md` (master index):

```markdown
# Capability Catalog

## Deployed
- [<capability-1>](capability-1/spec.md) — deployed YYYY-MM-DD
- [<capability-2>](capability-2/spec.md) — deployed YYYY-MM-DD

## In progress
- [<capability-3>](capability-3/spec.md) — phase X

## Proposed (not yet started)
- ...

## Deprecated
- ...
```

### Step 3: Update capability-registry.yaml

Append/update capability entry:
```yaml
- id: <capability_id>
  state: deployed
  state_since: <today>
  deployed_at: <today>
  spec_path: wiki/capabilities/<id>/spec.md
  retrospective_path: wiki/capabilities/<id>/retrospective.md
  actual_cost_setup_usd: <Y>
  actual_cost_recurring_usd: <Y>
  actual_founder_hours: <Y>
```

### Step 4: Update boilerplate-candidates.md (chương 31 discipline)

If retrospective identified generic patterns:

```markdown
## <date> — Patterns from <capability_id>
- Pattern: <description>
- Generic level: X%
- Applicability: <which other projects>
- Action: defer extraction (per chương 31, Maturity Level 0)
```

### Step 5: Update playbook (if novel architectural pattern)

If capability uncovered novel pattern not in playbook:
- Draft chương addition (e.g., "Chương 34: <pattern>")
- Founder reviews, decides if include in next playbook version

### Step 6: Fire events

```
ritsu.capability.deployed (already fired Phase 7)
ritsu.capability.cataloged
ritsu.capability.retrospective_complete
```

## Outputs

- `wiki/capabilities/<id>/retrospective.md`
- Updated `wiki/capabilities/_CATALOG.md`
- Updated `knowledge/capability-registry.yaml`
- Updated `notes/boilerplate-candidates.md` (if patterns)

## State transition

`deployed → operating`

## Cost estimate

- Anthropic API: ~$0.20 per invocation
- Founder time: 15-30 min review

---

**End of CLA workflow.** Capability now in `operating` state. Ongoing monitoring via Bài #10 visibility.
