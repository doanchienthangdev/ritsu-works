---
name: docs-engine/nav
description: |
  Sidebar / navigation editor. Edits `docs/content/meta.json` per Fumadocs
  conventions (pages, groups, ordering). Interactive prompts for pillar grouping.
  Idempotent: re-running with same args is a no-op.
---

# docs-engine/nav

## When to use

- `/docs nav` command (manual sidebar tuning).
- Auto-invoked at end of `/docs scaffold` to write initial meta.json.

## Inputs

- `action` — `init` | `reorder <area> <key1,key2,...>` | `group <area> <group-name> <pages>` | `hide <page>` | `unhide <page>`.

## Process

1. Read `docs/content/meta.json`.
2. Apply action.
3. Write back. Validate against Fumadocs meta.json schema.
4. Surface diff to founder if interactive.

## Outputs

- Updated `docs/content/meta.json`.

## HITL

Tier A.

## Cost estimate

~$0.05-0.10 per invocation. Cap: `docs-nav-edit` ≤ $0.10.

## See also

- Fumadocs meta.json reference: https://www.fumadocs.dev/docs/headless/page-tree
