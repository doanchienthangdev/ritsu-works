---
name: design-system
description: >-
  Manage the multi-design-system library + the universal --style output layer.
  A design system = 1 folder + 1 DESIGN.md (Google Stitch / google-labs-code/design.md
  format: YAML tokens + Markdown rationale). SPLIT registry: owned/canonical in
  Tier-1 00-core/design-system/, downloaded third-party in runtime/design-systems/
  (gitignored cache), indexed by knowledge/design-systems.yaml. Default = plain
  (no style). Missing system = on-demand CLI fetch. Tier A read/search; A→B
  download; C for vendor/Tier-1 + remove-owned.
---

# /design-system  (capability: design-system-styling v1.0)

Thin orchestrator over `scripts/design-system/*.cjs` helpers + the
`design-system` skill family. Mirrors the deepask command shape.

## Verbs
| Verb | Purpose | HITL |
|---|---|---|
| `list` | list registered systems (from `knowledge/design-systems.yaml`) | A |
| `show <name>` | print a system's tokens + rationale + paths | A |
| `search <query>` | search remote libraries (getdesign/designmd, no download) | A |
| `add <name> [--source=getdesign\|designmd]` | download → `runtime/design-systems/` cache → register | A→B |
| `build <name> --from=<repo>` | research a codebase → emit a valid DESIGN.md (HSL→hex) | A→B |
| `preview <name>` | open/generate light+dark `preview.html` | A |
| `lint <name>` | validate a DESIGN.md (reuse design.md `lint` if available) | A |
| `vendor <name>` | promote cache → Tier-1 `00-core/design-system/` (PR) | **C** |
| `remove <name>` | remove a cached system (B); **refuses owned without a PR** (C) | B/C |

## Resolution order (for `--style=<name>`, via `resolve-style.cjs`)
index → owned path (`00-core/design-system/`) → cache (`runtime/design-systems/`)
→ (miss + interactive) download → cache → use. Omitted → `{mode:'plain'}`.
**Non-interactive/CI:** owned/vendored only; cache-miss = hard-fail (AD-3).

## Notes
- Helpers do the work: `resolve-style`, `parse-design-md`, `registry-io`, `download`.
- NO MCP, NO API key (locked #3). Download = `Bash(npx getdesign@latest add)` / `build --from`.
- Events: `ritsu.design_system.{style_resolved,added,vendored}` → `ops.events`.
- Cost-bucket `ai-ops-design-system`; task_kinds `design-system-{build,resolve,add}`.
