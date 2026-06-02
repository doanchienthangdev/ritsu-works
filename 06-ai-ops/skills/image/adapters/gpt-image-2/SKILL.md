---
name: image/adapters/gpt-image-2
description: |
  The one real image-platform adapter (v0.1) — OpenAI gpt-image-2. Maps the
  universal /image params to gpt-image-2 native params and runs
  scripts/image/gen.cjs (which require()s the in-place deepask helpers —
  deepask untouched). Flexible native sizing (--ar → ×16-edge size, AR≤3:1,
  edge<3840, no in-range crop). --quality low|medium|high = OpenAI native quality (1:1). png/jpeg/webp.
  NO seed (warns). --ref/--mask = Phase-7 stretch (edits endpoint). gpt-image-2-pro-max
  is a PRESET of this adapter (= --enhance --quality=high). Billing: OPENAI_API_KEY
  out-of-band. Adapter contract: {ok, files[], model, cost_usd, warnings[]}.
---

# Adapter: gpt-image-2 (capability `image-platform` v0.1)

The default + only real backend in v0.1. Proves the pluggable-adapter abstraction with one backend.

## Supports
Source of truth = `knowledge/image-adapters.yaml` (the L2 validator asserts these ⊆ `UNIVERSAL_PARAMS`). Summary:

| Class | Params |
|---|---|
| ✅ native | `ar` (flexible size), `quality` (= OpenAI native low/medium/high), `count` (n≤10), `format` (png/jpeg/webp), `style`, `art-style`, `enhance`, `safety` (→moderation), `max-cost-usd`, `dry-run`, `out`, `deck` |
| 🔁 stretch (NOT built v0.1) | `ref`, `mask` — need `/v1/images/edits` (multipart). WARN-as-unsupported until built. |
| ⚠️ warn-ignored | `seed` (no reproducibility), `resolution`, `ref-style`, `ref-character`, `ref-strength`, `negative`, `stylize`, `raw`, `variety`, `weird`, `tile`, `background` (transparent is gpt-image-1/1.5 only) |

`computeWarnings` (params.cjs) emits **consequence-honest** warnings (e.g. "`--seed` ignored — output is NOT reproducible"), never a silent drop.

## Param mapping (universal → native)
| Universal | gpt-image-2 native | Notes |
|---|---|---|
| `--ar W:H` | `size` (W×H, edges ×16, AR≤3:1, edge<3840) | `resolveAspectRatio` (R2). Clamps >3:1 + warns. No post-crop in-range. |
| `--quality low\|medium\|high` | OpenAI `quality` (1:1, no translation layer) + long-edge budget 1024/1024/2048 | `high` also upsizes (1:1→2048², 16:9→2048×1152). |
| `--count n` | `n` (1..10) | clamp + warn if >10. |
| `--format jpeg\|webp` | `output_format` | png (default) omits the field (== proven baseline payload). |
| `--safety strict\|standard\|relaxed` | `moderation auto\|auto\|low` | included only when `--safety` explicitly passed. |
| `--model <id>` | `model` | default `gpt-image-2`. |

Cost: `estimateFlexibleCost` (R3) — per-tier area-interpolation over `scripts/deepask/image-cost.cjs` `COST_TABLE`.

## Generate
`node scripts/image/gen.cjs --prompt="<composed>" --ar=<> --quality=<> [--count --format --safety --style --art-style --max-cost-usd --out] [--dry-run]`
- `gen.cjs` `require()`s deepask `image-gen` (`ensureOpenAiKey`, `extractImageBuffer`, `OPENAI_IMAGES_URL`) + `image-cost` (`checkCostBudget`) + `image-spec` (`parseSize`, `centeredCropBox`) + `slide-deck` (`assembleDeckPdf`). **deepask is not modified.**
- The umbrella composes the final brand+genre+art-directed prompt BEFORE calling (gen.cjs receives `--prompt` as `prompt_sent`; `--style`/`--art-style` are recorded as provenance metadata).

## Output contract
`{ ok, outcome, files[], model, cost_usd, warnings[], runJson, error }`. Writes PNG(s) (`NN.<ext>`) + `run.json` (typed, table-ready superset) + (dry-run) `NN.png.prompt.txt` sidecar to the `--out` dir.

## Auth / billing
`OPENAI_API_KEY` (out-of-band; `ensureOpenAiKey` resolves it from `runtime/secrets/.env.local`, incl. the worktree→main-root path). Key value never printed. **Not** an in-session LLM call — so the budget hook does not see this spend (the `image-gen` cap is advisory; the per-run `--max-cost-usd` breaker is the real guard).

## Failure modes (typed `outcome`)
- `not_built` — `--use` is a `registered-not-built` adapter → clean error citing `image-adapters.yaml`.
- `breaker_refusal` — estimate > `--max-cost-usd` → abort **before** the API call.
- `moderation_block` — OpenAI content-policy rejection (distinguished from a breaker refusal).
- `api_error` — missing key / bad param / network / non-2xx (detail surfaced, key never leaked).
- `dry_run` — composed prompt + cost estimate, no spend.
