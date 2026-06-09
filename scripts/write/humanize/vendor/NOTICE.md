# Vendored humanizer engines — attribution & licenses

The `write-platform` humanizer is **synthesized from four open-source projects**. The
deterministic detectors below are **vendored** (copied) here so `/write`'s AI-smell gate
(`scripts/write/humanize/scan.cjs`) runs offline and reproducibly. The LLM-pass method is
synthesized into `06-ai-ops/skills/write/humanize/SKILL.md`, which credits the same sources.

All four are **MIT-licensed**. Vendored verbatim except where noted. Pinned to the commit
each was fetched at (2026-06-10).

| Project | Author | Commit (pinned) | Vendored here | License |
|---|---|---|---|---|
| [blader/humanizer](https://github.com/blader/humanizer) | blader | `9600f2b` | `humanizer/SKILL.md` (the Wikipedia 33-pattern method, used as method reference) | MIT (`humanizer/LICENSE`) |
| [conorbronsdon/avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) | Conor Bronsdon | `4331560` | `avoid-ai-writing/detector/patterns.cjs` + `CATEGORIES.md` (the 44-type detection engine — the primary score) | MIT (`avoid-ai-writing/LICENSE`) |
| [theclaymethod/unslop](https://github.com/theclaymethod/unslop) | Clayton Kim | `5150806` | `unslop/scripts/*.py` (banned-phrase / readability / fact scanners) + `unslop/references/*` (taboo-phrases, rubric, fact-preservation, edit-library, personality-guide) + `unslop/presets/*` (voice presets) | MIT (per repo `SKILL.md` frontmatter `license: MIT`; no standalone LICENSE file upstream) |
| [jpeggdev/humanize-writing](https://github.com/jpeggdev/humanize-writing) | jpeggdev | `da03340` | `humanize-writing/references/ai-tells.md` (AI-vocabulary catalog) | MIT (`humanize-writing/LICENSE`) |

## Adaptations (the only changes to vendored content)

1. **`avoid-ai-writing/detector/patterns.js` → `patterns.cjs`** — extension only. This repo's
   `package.json` is `"type": "module"`, so a `.js` would be loaded as ESM and the upstream
   file's CJS `module.exports` guard would be skipped (Node 22 `require(esm)` returns an empty
   namespace). Renaming to `.cjs` forces CJS. **Content is byte-identical** to upstream
   (verified by md5 against the pinned commit).
2. Upstream test files, install scripts, plugin manifests, and CI config were **not** vendored
   (not needed by the gate). The `unslop` `wiki_sync.py` is not vendored (it mutates the
   pattern files at runtime — out of scope for a frozen gate).

## Why vendor rather than depend

`scripts/write/humanize/scan.cjs` must be deterministic, offline, and pinned — the AI-smell
gate is part of the quality contract. Vendoring (with this NOTICE + the upstream LICENSEs)
keeps the gate reproducible and the attribution explicit, consistent with how this repo
vendors other third-party engines (e.g. the skillopt vendor).

To refresh: re-clone the four repos at their latest commits, re-copy the files listed above
(re-apply adaptation #1), update the pinned commits in this table, and re-run `tests/write/`.
