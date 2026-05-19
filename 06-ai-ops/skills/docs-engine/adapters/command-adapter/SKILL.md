---
name: docs-engine/adapters/command-adapter
description: |
  Adapter that renders `.claude/commands/<name>.md` into MDX page. Handles
  INCONSISTENT frontmatter discipline — some commands (e.g. /cla) have YAML
  frontmatter; some (e.g. /wiki) start directly with H1.
---

# docs-engine/adapters/command-adapter

## Input pattern

`.claude/commands/*.md`

## Output pattern

`docs/content/commands/<name>.mdx`

## Process

1. Try to parse YAML frontmatter.
2. **Fallback if no frontmatter:** derive `title` from first H1 (`# /<name>`); `description` from first paragraph.
3. Compute `source_hash`.
4. Render MDX with sections: "Synopsis", "Subcommands", "Workflow", "State persistence", "Drift gates", "HITL discipline".
5. Detect subcommand table (markdown table with first column "Invocation") → render with Fumadocs `<Tabs>` per major verb.
6. Add idempotency marker.

## Edge cases

- Commands with sub-command tables: `/wiki`, `/cla`, `/docs` (new). Parse + structure.
- Commands without sub-commands: `/cto`, `/cgo`, `/ceo`, `/cpo`. Render as single-page narrative.
- `/check-drift`, `/mcp-doctor`: deterministic-tool commands with no LLM; brief.

## HITL / Cost

Tier A. ~$0.03 per file (slightly higher than skill/agent because of table parsing).

## See also

- Examples to test against: `.claude/commands/wiki.md` (no frontmatter), `.claude/commands/cla.md` (with frontmatter)
