---
name: docs-engine/update
description: |
  Alias for `docs-engine/sync --area=<area>`. Convenience verb to refresh one
  content area without walking the full corpus.
---

# docs-engine/update

## When to use

- `/docs update <area>` command (founder wants to refresh just one area, e.g. after editing a SOP).

## Inputs

- `area` — required; one of `commands` | `skills` | `agents` | `hooks` | `charter` | `governance` | `pillars` | `sops` | `tier1`.

## Process

Dispatches to `docs-engine/sync` with `area=<area>`. No additional logic.

## HITL

Same as `docs-engine/sync` (Tier A; B if cost > cap or > 50% pages changed in area).

## Cost estimate

Scoped subset of `docs-engine/sync` cost. Typically $0.05-0.30 per area.

## See also

- `docs-engine/sync/SKILL.md` (the actual workhorse)
