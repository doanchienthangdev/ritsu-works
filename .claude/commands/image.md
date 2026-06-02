---
name: image
description: |
  Generate an image from a prompt — model-agnostic front door with a pluggable
  adapter layer (--use=<adapter>). Default backend gpt-image-2 (in-repo, governed).
  Universal sensibly-defaulted params (--ar --tier --count --format --style brand
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
| `--use` | `gpt-image-2` | adapter id; `gpt-image-2-pro-max` = preset (`--enhance --tier=high`) |
| `--ar` | `1:1` | aspect ratio `W:H`; gpt-image-2 → native flexible size (AR ≤ 3:1, else clamp+warn) |
| `--tier` | `standard` | `draft\|standard\|high` → quality low/medium/high (`high` also upsizes) |
| `--count` | `1` | images (gpt-image-2 n ≤ 10) |
| `--format` | `png` | `png\|jpeg\|webp` |
| `--seed` | — | ⚠️ gpt-image-2 has no seed → warns (not reproducible) |

### Style (two orthogonal axes)
| Flag | Default | Notes |
|---|---|---|
| `--style` | plain | **brand** design system (`ritsu`, …) — `knowledge/design-systems.yaml` |
| `--art-style` | plain | **artistic genre** (80-style registry) — `knowledge/art-styles.yaml` |
| `--enhance` | off | in-session prompt refinement (subscription) — the "pro-max" concept |

### Reference (v0.1 stretch — WARN-as-unsupported on gpt-image-2)
`--ref` `--mask` (need the OpenAI edits endpoint; built later) · `--ref-style` `--ref-character` `--ref-strength` `--negative` (warn).

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
3. Compose the final prompt: user prompt + BRAND block (`--style`) + GENRE block (`--art-style`) + art-direction + legibility (precedence: brand > a11y > genre > art-direction > density).
4. `node scripts/image/gen.cjs --prompt="<composed>" …` → resolves size (R2), estimates cost (R3), enforces `--max-cost-usd` BEFORE the call, writes PNG(s) + typed `run.json` + sidecar.
5. Report `{ok, files[], model, cost_usd, warnings[]}` — **always surface warnings**; on `not_built|breaker_refusal|moderation_block|api_error`, give the typed reason.

## Examples
```
/image "a serene mountain lake at dawn"
/image "Q3 funnel overview" --ar=16:9 --tier=high --style=ritsu --art-style=swiss-international
/image "product hero" --use=gpt-image-2-pro-max          # = --enhance --tier=high
/image "anything" --dry-run                              # no spend; preview prompt + cost
/image "x" --use=midjourney                              # → not_built (proves the registry)
```

## Governance
Tier A (reversible, local writes, metered + capped). Generation = `OPENAI_API_KEY` out-of-band (compliant); `--enhance` = in-session/subscription. Cost-bucket `ai-ops-image` (gps): `image-gen` $0.50 (advisory — out-of-band; the `--max-cost-usd` breaker is the real guard), `image-enhance` $0.10 (hook-enforced). Runtime contract: `SOP-AIOPS-008-image-runtime-contract` (PR-3). deepask is a separate peer consumer — unchanged.
