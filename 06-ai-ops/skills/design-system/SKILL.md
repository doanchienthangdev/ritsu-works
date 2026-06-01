---
name: design-system
description: >-
  Umbrella skill for the design-system-styling capability — the registry model,
  the --style resolution order, and THE adoption contract every output-producing
  command follows to render in a named DESIGN.md design system. Read this when
  wiring --style into a command, or when /design-system dispatches a verb.
---

# design-system (umbrella)

## Registry model (SPLIT)
- **Owned/canonical** → `00-core/design-system/<name>/DESIGN.md` (+ `assets/`, previews). Tier-1 identity. v1: `ritsu`.
- **Downloaded** → `runtime/design-systems/<name>/DESIGN.md` (+ previews). Gitignored, re-downloadable cache.
- **Index** → `knowledge/design-systems.yaml` (committed) — `name → {origin, source, source_ref, path, status, last_synced}`. Single source of truth.
- **`vendor`** promotes a cached system → Tier-1 (PR) for CI reproducibility.

## The `--style` adoption contract (how ANY command adopts it)
1. Parse `--style=<name>` (omitted → plain, the default).
2. Call `scripts/design-system/resolve-style.cjs (name, {interactive})`.
   → `{mode:'plain'}` → render normally, no styling.
   → `{mode:'styled', tokens, previewPath, designMdPath}` → pass `tokens` + `previewPath` as **design context** INTO whichever renderer the command's own `--format` (or default output) dispatches to. **Never add a renderer per system — tokens are data.**
   → `{mode:'needs-download'}` (interactive only) → run `download`, then re-resolve.
   → throws `StyleResolveError` on cache-miss in non-interactive mode (AD-3: no silent npx in CI).
3. **Visual** outputs (html/dashboard/canvas/pptx/pdf/docx/chart/mermaid) → tokens drive the look. **Non-visual** (inline/text/article/xlsx-data) → `--style` is an honest no-op (optionally a cover/accent note).

## `--style` ⟂ `--format`
`--format` = which artifact type (the noun). `--style` = which visual language (the adjective). They compose. First consumer: **deepask** (`06-ai-ops/skills/deepask/format/SKILL.md` reads resolved tokens; dispatch-table row-count unchanged).

## Verbs → helpers
`list/show` → `registry-io`; `add` → `download`(getdesign); `build --from` → `design-system/build-from-repo` skill; `preview` → `parse-design-md`+render; `vendor`/`remove` → `registry-io` + git (HITL C for owned).

## Tiers · cost · events
See `SOP-AIOPS-007-design-system-runtime-contract`. Cost-bucket `ai-ops-design-system`.
