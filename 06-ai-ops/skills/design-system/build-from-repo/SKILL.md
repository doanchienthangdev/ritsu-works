---
name: design-system/build-from-repo
description: >-
  Generate a valid DESIGN.md by researching a codebase. Reads a repo's theme
  source (theme.json / CSS vars / tailwind config / brand usage) and emits the
  YAML tokens + Markdown rationale (HSL→hex sRGB). Powers `build <name> --from=<repo>`
  — the `ritsu` seed path AND the key-free hydration of designmd-listed systems
  from their public repos (AD-2: never needs DESIGNMD_API_KEY).
---

# design-system/build-from-repo

> Folder is `build-from-repo/` (not `build/`) because `.gitignore` ignores `build/`.
> The `/design-system` command verb is still `build --from=<repo>`.

## Inputs
- `name` — the design-system slug.
- `--from=<repo>` — local path or public git repo to research.

## Process
1. Locate theme source: `theme.json`/`theme.css`, `*color-scales.css`, `tailwind.config.*`, brand usage in components (wordmark, logo).
2. Extract tokens: colors (HSL→hex sRGB), typography (families/weights/tracking), radius, spacing, components, dark-mode set, status + chart palettes, signature effects (glow/gradient/glass).
3. Emit a valid `DESIGN.md`: YAML front matter (tokens, `{token.refs}`) + Markdown body (Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Logo, Do's & Don'ts).
4. Write to the target path (`00-core/design-system/<name>/` if owned, else `runtime/design-systems/<name>/`); register in `knowledge/design-systems.yaml` via `registry-io`.
5. Self-verify: re-parse via `parse-design-md.cjs` (sRGB hex valid, no `{ref}` cycles).

## ritsu acceptance
`build ritsu --from=/Users/doanchienthang/omg/ritsu` must regenerate tokens equivalent to the pre-drafted seed (`#0ABCD0` primary, Inter + JetBrains Mono, 8px radius, cyan→teal logo). Diff against the installed `00-core/design-system/ritsu/DESIGN.md`.

## Cost
LLM (token extraction + rationale). task_kind `design-system-build` cap `{unit:usd, cap:0.50}`.
