---
name: image
description: |
  Umbrella for the image-platform capability — the `/image` command's brain.
  A model-agnostic image-generation front door with a pluggable adapter layer
  (`--use=<adapter>`), so new image models plug in WITHOUT command-side code
  change (mirrors docs-engine/wiki-sync: umbrella + adapters/<id>/ + routing
  table). v0.1 ships ONE real backend (gpt-image-2, reusing the in-place deepask
  helpers — deepask untouched) + gpt-image-2-pro-max preset + nano-banana/
  midjourney/flux registered-not-built stubs. Composes the final prompt from the
  user prompt + the two orthogonal style axes (`--style` brand via
  design-systems.yaml, `--art-style` genre via art-styles.yaml) + art-direction,
  then runs scripts/image/gen.cjs (out-of-band OpenAI). Tier A; per-run
  --max-cost-usd breaker. Invoked by `.claude/commands/image.md`.
---

# image (umbrella) — capability `image-platform` v0.1

> The dispatcher + prompt-composition brain behind `/image <prompt> [flags]`.
> Resolves the adapter from `knowledge/image-adapters.yaml`, composes a
> brand+genre+art-directed prompt in-session, then hands it to the out-of-band
> generator `scripts/image/gen.cjs`. Adding a model later = drop
> `adapters/<id>/SKILL.md` + one registry row + one routing-table row. **No
> command-side code change.**

## When to use
- Founder runs `/image "<prompt>" [flags]` → this skill drives the run.
- NOT auto-invoked by other flows. Generation is explicit-only (mirrors deepask image — never silently spends).

## Inputs (the universal parameter vocabulary)
Parsed by `scripts/image/lib/params.cjs` (`UNIVERSAL_PARAMS`, the single source of truth the L2 validator checks adapter `supports[]` against). Full flag table + defaults: see `.claude/commands/image.md`. Core: `<prompt>` · `--use` (default `gpt-image-2`) · `--ar` (1:1) · `--quality` (medium; `low|medium|high` = OpenAI native) · `--count` (1) · `--format` (png) · `--style` · `--art-style` · `--enhance` · `--max-cost-usd` (1.00) · `--dry-run` · `--out`.

## Adapter routing (`--use` → adapter)
Read `knowledge/image-adapters.yaml`; resolve `--use` to its entry. Adding a backend = a new row + `adapters/<id>/SKILL.md`.

| `--use` | Adapter | Status | Generator |
|---|---|---|---|
| `gpt-image-2` *(default)* | `adapters/gpt-image-2` | installed | `scripts/image/gen.cjs` |
| `gpt-image-2-pro-max` | `adapters/gpt-image-2` (preset) | installed | `gen.cjs` + `--enhance --quality=high` |
| `nano-banana` | — | registered-not-built | (stub → `not_built` error) |
| `midjourney` | — | registered-not-built | (stub → `not_built` error) |
| `flux` | — | registered-not-built | (stub → `not_built` error) |

`gen.cjs` itself reads the registry and returns a clean `not_built` error (citing `image-adapters.yaml`) for any `registered-not-built` adapter — so the routing is data-driven, not hard-coded here.

## Run flow

1. **Parse** flags (`params.cjs`). Resolve `--use` against the registry.
2. **(optional) `--enhance`** → dispatch to `image/enhance` (in-session prompt refinement; subscription billing; NEVER an external API). Records `prompt_enhanced` (before/after) for `run.json`.
3. **`--style` / `--art-style` → gen.cjs** (v0.2: composition is now **deterministic**, not in-session). The command just passes the flags; `scripts/image/gen.cjs` calls `scripts/image/lib/compose.cjs`, which:
   - **BRAND block** — `resolveStyle(--style)` (`scripts/design-system/resolve-style.cjs`) injects the DESIGN.md palette / typography / personality. Omitted or uncached (non-interactive AD-3 miss) → plain + warn, never crash.
   - **GENRE block** — `resolveArtStyle(--art-style)` (`scripts/deepask/art-style.cjs`) → `assets` (the lever — concrete objects to DRAW) + layout / tone / display + a SECONDARY accent only.
   - **Precedence:** brand core palette/logo/type **>** genre (secondary accent only). The only **in-session** prompt step is the optional `--enhance` (step 2); brand/genre composition is fully deterministic.
4. **Generate** — call the resolved adapter's generator (`scripts/image/gen.cjs`). gen.cjs: composes (step 3), resolves size (R2 flexible native), estimates cost (R3), enforces the `--max-cost-usd` breaker BEFORE the call, **routes to the `/v1/images/edits` multipart endpoint when `--ref`/`--mask` are set** (reference-guided generation; else `/generations`), writes PNG(s) + typed `run.json` + prompt sidecar. See `adapters/gpt-image-2/SKILL.md`.
   - **v0.3 brand corner LOGO OVERLAY** — when the resolved `--style` declares a `logo.overlay` policy AND a `--ref` is given (e.g. `--style=ritsu --ref=<asset>`), gen.cjs does NOT use the edits endpoint (a square logo there comes out big + centered). It forces `/generations` for a clean base (compose.cjs appends a `hasRef`-gated *"draw no logo, keep the corner clean"* directive) and then **composites the brand's canonical LOCKUP — `logo.asset` (the mark + "Ritsu" wordmark, matching ritsu.ai) — small in the policy corner** via `scripts/image/lib/png-overlay.cjs` (dependency-free, zlib-only PNG decode/downscale/composite/encode). The `--ref` is the **trigger** (any ritsu asset works); compose.cjs resolves `logo.asset` → an absolute path; gen.cjs falls back to the `--ref` only if the policy declares no asset. Deterministic + pixel-perfect; graceful fallback (warn, keep the base) on failure; PNG-only.
5. **Report** — surface the adapter's output contract `{ok, files[], model, cost_usd, warnings[]}`. **Always surface `warnings[]`** (unsupported params are warned, never silently dropped). On `outcome ∈ {not_built, breaker_refusal, moderation_block, api_error}`, report the typed reason + remedy.

## Output contract (uniform across adapters)
`{ ok, outcome, files[], model, cost_usd, warnings[], runJson, error }` — `outcome ∈ success | dry_run | not_built | breaker_refusal | moderation_block | api_error`. Artifacts: `.archives/image/<date>-<slug>/` (root `.archives`, local-only).

## Governance
- **Tier A** runtime (reversible, local writes, metered + capped). Explicit-invoke only.
- **Billing:** generation = `OPENAI_API_KEY` out-of-band via `gen.cjs` (compliant — Claude can't generate images, same lane as text-embedding-3-small). `--enhance` = in-session/subscription.
- **Cost:** per-run `--max-cost-usd` breaker (default 1.00) is the real guard. The `ai-ops-image` `image-gen` per-task cap is advisory (out-of-band → invisible to the budget hook); `image-enhance` is hook-enforced (in-session). See `governance/ROLES.md` gps `per_task_kind_caps`.
- **`--ref`/`--mask`** (v0.2): reference-guided generation via the `/v1/images/edits` multipart endpoint (`gen.cjs callOpenAiEdit`) — `--ref=<image[,image2]>`, optional `--mask=<png>` inpaint region.

## Composes with
`scripts/image/{gen,lib/params,lib/compose,lib/png-overlay}.cjs` · `scripts/design-system/resolve-style.cjs` · `scripts/deepask/art-style.cjs` · `deepask/image-compose` (§1/§1b technique) · `deepask/aesthetic` (Part 3) · `knowledge/{image-adapters,design-systems,art-styles}.yaml` · `00-core/design-system/ritsu/DESIGN.md` (`logo:` overlay policy).
