# Changelog — consulting-toolkit

All notable changes to the `consulting-toolkit` capability.

## [0.1.0] — 2026-06-04

Initial ship (single session, CLA-disciplined, autonomous per founder delegation).

### Added
- **Reconstruction engine** — turn a partial consulting-toolkit "clue" (Domont/Slidebooks-style overview) into a complete, executable process bundle.
- **Bundle structure (deliverable #1)** — `06-ai-ops/skills/consulting-toolkit/STRUCTURE.md`: the `bundle-spec.json` contract + the per-framework 6-part anatomy + the §7 quality checklist.
- **Slide grammar** — `domont-deliverable-anatomy.md`: palette, chrome, a 20-layout catalog (cover · exec-summary · process-map chevron · section · content · two-col · framework-desc · matrix-2x2 · staircase · process-flow · tutorial · table · comparison · kpi-tiles · chart · example · quote · close · toc · html), and the deck spine.
- **Render pipeline** — `scripts/consulting-toolkit/render.cjs` + `lib/{styles,md,chart,deck,doc,toolkit}.cjs`: deterministic HTML→PDF. Deck via headless Google Chrome (exact 16:9); handbook via weasyprint (A4, paged page-numbers). Zero-dep markdown + SVG-chart engines.
- **Reconstruction Workflow** — `scripts/consulting-toolkit/reconstruct.workflow.js`: per-toolkit `Reconstruct` (deep, strong model) → `Deck` (Sonnet) pipeline; agents write spec JSON to the worktree (disk hand-off; orchestrator context stays near-empty).
- **Extraction + build drivers** — `build-briefs.cjs` (clue → `briefs.json`), `build-all.cjs` (merge core+deck → validate → render).
- **`/toolkit` command** + **SKILL.md** + this **spec** + **CHANGELOG**.
- **Content** (not shipped; local-only in `raw/consultant/tookits/`): 19 reconstructed Domont toolkit bundles + a master index.

### Notes
- No Tier-2 migration (Option-B-lean; observability deferred).
- Workflow fs-write capability verified by explicit probe before relying on the disk-handoff architecture.
- Reconstructed content is original synthesis in the consulting-deck genre — never a copy of any source deck; not redistributed.
