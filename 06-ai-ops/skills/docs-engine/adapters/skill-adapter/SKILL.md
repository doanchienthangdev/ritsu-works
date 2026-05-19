---
name: docs-engine/adapters/skill-adapter
description: |
  Adapter that renders a `06-ai-ops/skills/**/SKILL.md` source file into an MDX
  reference page under `docs/content/skills/<path>.mdx`. Preserves YAML frontmatter
  (`name`, `description`); extracts headings into Fumadocs `<Steps>` if "Process" section exists.
---

# docs-engine/adapters/skill-adapter

## Input pattern

`06-ai-ops/skills/**/SKILL.md`

## Output pattern

`docs/content/skills/<path>.mdx` (path = relative path under `06-ai-ops/skills/` minus `/SKILL.md`)

## Process

1. Parse YAML frontmatter (`name`, `description`).
2. Compute `source_hash = sha256(canonical(file_contents))`.
3. Render MDX with frontmatter `{ title: <name>, source_path: <path>, source_hash, generated_at, generated_by: 'docs-engine v0.1.0' }`.
4. Body: pass through markdown. If "## Process" section exists, transform numbered list to Fumadocs `<Steps>` component.
5. Add idempotency marker `<!-- generated-by: docs-engine v0.1.0 -->` at top of body.

## Edge cases

- `SKILL.md` with no frontmatter → derive title from first H1; flag in adapter_errors.
- Multi-line `description:` YAML — preserve formatting.
- Sub-skills under wiki-sync/ — preserve folder hierarchy.

## HITL / Cost

Tier A. ~$0.02-0.05 per file. Deterministic mostly (LLM only if prose enrichment requested — disabled at v1.0).

## See also

- Sibling adapters: agent-adapter, hook-adapter, command-adapter, etc.
- Walker: `docs-engine/sync/SKILL.md`
