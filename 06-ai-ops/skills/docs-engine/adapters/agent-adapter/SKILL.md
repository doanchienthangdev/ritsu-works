---
name: docs-engine/adapters/agent-adapter
description: |
  Adapter that renders `.claude/agents/<name>.md` into an MDX page under
  `docs/content/agents/<name>.mdx`. Includes role binding from
  `knowledge/workforce-personas.yaml` + permissions cross-ref to `governance/ROLES.md`.
---

# docs-engine/adapters/agent-adapter

## Input pattern

`.claude/agents/*.md` (excluding `README.md`)

## Output pattern

`docs/content/agents/<name>.mdx`

## Process

1. Parse YAML frontmatter (`name`, `description`, `tools`).
2. Cross-reference `knowledge/workforce-personas.yaml` to find bound role (e.g. cto → code-reviewer).
3. Cross-reference `governance/ROLES.md` to fetch role permissions + budget.
4. Compute `source_hash`.
5. Render MDX with sections: "Description", "Tools", "Bound role", "Permissions", "Activation patterns".
6. Add idempotency marker.

## Edge cases

- Persona `status: planned` → flag MDX with "🏗️ planned" badge; document fallback_role.
- Tools list spans multiple lines → render as `<Files>` or `<Tabs>`.

## HITL / Cost

Tier A. ~$0.02 per file. Deterministic.

## See also

- `06-ai-ops/skills/docs-engine/adapters/skill-adapter/SKILL.md` (sibling pattern)
