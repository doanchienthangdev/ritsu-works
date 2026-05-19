---
name: docs-engine/adapters/hook-adapter
description: |
  Adapter that renders `.claude/hooks/<name>.md` into MDX page. Hook frontmatter
  is rich (name, version, type, tools, default_decision, fail_mode); rendered as
  structured policy spec.
---

# docs-engine/adapters/hook-adapter

## Input pattern

`.claude/hooks/*.md` (excluding `README.md`, `SPEC.md` — those become explanation pages, not hook references)

## Output pattern

`docs/content/hooks/<name>.mdx`

## Process

1. Parse YAML frontmatter (6 keys: `name`, `version`, `type`, `tools`, `default_decision`, `fail_mode`).
2. Compute `source_hash`.
3. Render MDX with sections: "Policy", "Triggers (tools list)", "Decision logic", "Default behavior", "Failure mode".
4. Render `tools: [*]` as "All tools" callout.
5. Render `default_decision` + `fail_mode` as a 2-row Fumadocs `<Cards>` block.
6. Add idempotency marker.

## Edge cases

- `tools: [*]` glob → expand to explanatory note ("This hook fires on every tool call").
- Multi-line `description:` (none currently, but defensive).

## HITL / Cost

Tier A. ~$0.02 per file. Deterministic.

## See also

- `governance/HITL.md` for hook ↔ HITL tier mapping
- `.claude/hooks/README.md` + `SPEC.md` — rendered separately as explanation pages
