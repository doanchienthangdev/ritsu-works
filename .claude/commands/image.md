---
name: image
description: |
  Generate an image from a prompt — model-agnostic front door with a pluggable
  adapter layer (--use=<adapter>). Default backend gpt-image-2 (in-repo, governed).
  Universal sensibly-defaulted params (--ar --quality --count --format --style brand
  --art-style genre --enhance --max-cost-usd --dry-run --out …); unsupported params
  WARN, never silently drop. Reuses the deepask image helpers + both style axes.
  Tier A; per-run --max-cost-usd breaker; OPENAI_API_KEY out-of-band; artifacts to
  .archives/image/<date>-<slug>/. Thin orchestrator over the `image` umbrella skill.
---

# /image — capability `image-platform` v0.1

Front-end for the image-platform capability. Parses flags, drives the `image`
umbrella skill (`06-ai-ops/skills/image/SKILL.md`), reports the result.

## Usage
```
/image "<prompt>" [flags]
```

## Flags (universal vocabulary — `scripts/image/lib/params.cjs`)

### Core
| Flag | Default | Notes |
|---|---|---|
| `<prompt>` | — (required) | the description (positional, or `--prompt=`) |
| `--use` | `gpt-image-2` | adapter id; `gpt-image-2-pro-max` = preset (`--enhance --quality=high`) |
| `--ar` | `1:1` | aspect ratio `W:H`; gpt-image-2 → native flexible size (AR ≤ 3:1, else clamp+warn) |
| `--quality` | `medium` | `low\|medium\|high` (= OpenAI native quality, 1:1; `high` also upsizes the canvas) |
| `--count` | `1` | images (gpt-image-2 n ≤ 10) |
| `--format` | `png` | `png\|jpeg\|webp` |
| `--seed` | — | ⚠️ gpt-image-2 has no seed → warns (not reproducible) |

### Style (two orthogonal axes)
| Flag | Default | Notes |
|---|---|---|
| `--style` | plain | **brand** design system (`ritsu`, …) — `knowledge/design-systems.yaml` |
| `--art-style` | plain | **artistic genre** (80-style registry) — `knowledge/art-styles.yaml` |
| `--enhance` | off | in-session prompt refinement (subscription) — the "pro-max" concept |

### Reference (v0.2 — `--ref`/`--mask` BUILT via the OpenAI edits endpoint)
`--ref=<image[,image2]>` reference-guided generation · `--mask=<png>` inpaint region. Still warn-only (no gpt-image-2 mapping): `--ref-style` `--ref-character` `--ref-strength` `--negative`.

> **v0.3 — brand corner LOGO OVERLAY (`--ref` + a `--style` with a logo policy):** if the resolved `--style` design system declares a `logo.overlay` policy (e.g. `--style=ritsu`), a `--ref` brand asset is **NOT** sent to the edits endpoint (which rendered the logo big + centered). Instead `/image` generates a clean base (model told to leave the corner clear) and **composites the real `--ref` asset SMALL in the corner** (ritsu → top-left, 12% of the shorter edge) via the dependency-free `scripts/image/lib/png-overlay.cjs`. Deterministic, pixel-perfect, on-brand. Overlay is PNG-only and degrades gracefully (warn, keep base) on failure. Plain `--ref` (no branded style) keeps the v0.2 edits behavior.

### Operational
| Flag | Default | Notes |
|---|---|---|
| `--max-cost-usd` | `1.00` | per-run circuit breaker (refuse-up-front, **the real spend guard**) |
| `--dry-run` | off | composed prompt sidecar + cost estimate, **no API spend** |
| `--out` | `.archives/image/<date>-<slug>/` | output dir (root `.archives`, local-only) |
| `--deck` | off | when `--count>1`, also assemble `deck.pdf` |
| `--background` `--safety` `--model` `--resolution` | adapter-default | see adapter `supports()` (some warn on gpt-image-2) |

MJ-only knobs `--stylize/--raw/--variety/--weird/--tile` are registered vocabulary → warn-ignored on gpt-image-2 (honored when a Midjourney adapter ships).

## Flow (dispatches to the `image` umbrella skill)
1. Parse flags (`params.cjs`); resolve `--use` against `knowledge/image-adapters.yaml`.
2. If `--enhance` → `image/enhance` (in-session refine).
3. `--style`/`--art-style` pass to gen.cjs (the only in-session prompt step is the optional `--enhance` in step 2).
4. `node scripts/image/gen.cjs --prompt="<prompt>" --style=… --art-style=… [--ref=… --mask=…] …` → **gen.cjs deterministically composes** the BRAND block (`--style` → DESIGN.md tokens via `lib/compose.cjs`) + GENRE block (`--art-style`), precedence brand > a11y > genre > art-direction > density; resolves size (R2); estimates cost (R3); enforces `--max-cost-usd` BEFORE the call; routes to the **edits** endpoint when `--ref` is set; writes PNG(s) + typed `run.json` + sidecar.
5. Report `{ok, files[], model, cost_usd, warnings[]}` — **always surface warnings**; on `not_built|breaker_refusal|moderation_block|api_error`, give the typed reason.

## Examples
```
/image "a serene mountain lake at dawn"
/image "Q3 funnel overview" --ar=16:9 --quality=high --style=ritsu --art-style=swiss-international
/image "product hero" --use=gpt-image-2-pro-max          # = --enhance --quality=high
/image "anything" --dry-run                              # no spend; preview prompt + cost
/image "x" --use=midjourney                              # → not_built (proves the registry)
```

## Governance
Tier A (reversible, local writes, metered + capped). Generation = `OPENAI_API_KEY` out-of-band (compliant); `--enhance` = in-session/subscription. Cost-bucket `ai-ops-image` (gps): `image-gen` $0.50 (advisory — out-of-band; the `--max-cost-usd` breaker is the real guard), `image-enhance` $0.10 (hook-enforced). Runtime contract: `SOP-AIOPS-008-image-runtime-contract` (PR-3). deepask is a separate peer consumer — unchanged.
