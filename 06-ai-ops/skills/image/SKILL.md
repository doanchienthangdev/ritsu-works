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
Parsed by `scripts/image/lib/params.cjs` (`UNIVERSAL_PARAMS`, the single source of truth the L2 validator checks adapter `supports[]` against). Full flag table + defaults: see `.claude/commands/image.md`. Core: `<prompt>` · `--use` (default `gpt-image-2`) · `--ar` (1:1) · `--tier` (standard) · `--count` (1) · `--format` (png) · `--style` · `--art-style` · `--enhance` · `--max-cost-usd` (1.00) · `--dry-run` · `--out`.

## Adapter routing (`--use` → adapter)
Read `knowledge/image-adapters.yaml`; resolve `--use` to its entry. Adding a backend = a new row + `adapters/<id>/SKILL.md`.

| `--use` | Adapter | Status | Generator |
|---|---|---|---|
| `gpt-image-2` *(default)* | `adapters/gpt-image-2` | installed | `scripts/image/gen.cjs` |
| `gpt-image-2-pro-max` | `adapters/gpt-image-2` (preset) | installed | `gen.cjs` + `--enhance --tier=high` |
| `nano-banana` | — | registered-not-built | (stub → `not_built` error) |
| `midjourney` | — | registered-not-built | (stub → `not_built` error) |
| `flux` | — | registered-not-built | (stub → `not_built` error) |

`gen.cjs` itself reads the registry and returns a clean `not_built` error (citing `image-adapters.yaml`) for any `registered-not-built` adapter — so the routing is data-driven, not hard-coded here.

## Run flow

1. **Parse** flags (`params.cjs`). Resolve `--use` against the registry.
2. **(optional) `--enhance`** → dispatch to `image/enhance` (in-session prompt refinement; subscription billing; NEVER an external API). Records `prompt_enhanced` (before/after) for `run.json`.
3. **Compose the final prompt** (in-session) — reuse the deepask composition technique, adapted for a free-form prompt (not a synthesis IR):
   - **Content** = the user prompt (after `--enhance`, if any).
   - **BRAND STYLE BLOCK** — `resolveStyle(--style)` (`scripts/design-system/resolve-style.cjs`) → if `{mode:'plain'}` use the neutral brief; if `{mode:'styled', tokens, designMdPath}` build the brand block from tokens + `Read(designMdPath)` Do's/Don'ts. Compose ONCE, byte-identical. (Technique: `deepask/image-compose` §1.)
   - **GENRE BLOCK** — `resolveArtStyle(--art-style)` (`scripts/deepask/art-style.cjs`) → `{layout, assets, tone, secondary_palette, display_type}`; `assets` is the lever (concrete objects to DRAW). (Technique: `deepask/image-compose` §1b.)
   - **ART-DIRECTION** — `deepask/aesthetic` Part 3 (the don'ts: no clip-art / stock clichés / hype; legibility; exact-text rendering).
   - **Precedence on conflict:** brand core palette/logo/body-type **>** legibility/a11y **>** genre **>** art-direction **>** content density.
4. **Generate** — call the resolved adapter's generator (`scripts/image/gen.cjs`) with the composed `--prompt` + the operational flags. gen.cjs: resolves size (R2 flexible native), estimates cost (R3), enforces the `--max-cost-usd` breaker BEFORE the call, writes PNG(s) + typed `run.json` + prompt sidecar. See `adapters/gpt-image-2/SKILL.md`.
5. **Report** — surface the adapter's output contract `{ok, files[], model, cost_usd, warnings[]}`. **Always surface `warnings[]`** (unsupported params are warned, never silently dropped). On `outcome ∈ {not_built, breaker_refusal, moderation_block, api_error}`, report the typed reason + remedy.

## Output contract (uniform across adapters)
`{ ok, outcome, files[], model, cost_usd, warnings[], runJson, error }` — `outcome ∈ success | dry_run | not_built | breaker_refusal | moderation_block | api_error`. Artifacts: `.archives/image/<date>-<slug>/` (root `.archives`, local-only).

## Governance
- **Tier A** runtime (reversible, local writes, metered + capped). Explicit-invoke only.
- **Billing:** generation = `OPENAI_API_KEY` out-of-band via `gen.cjs` (compliant — Claude can't generate images, same lane as text-embedding-3-small). `--enhance` = in-session/subscription.
- **Cost:** per-run `--max-cost-usd` breaker (default 1.00) is the real guard. The `ai-ops-image` `image-gen` per-task cap is advisory (out-of-band → invisible to the budget hook); `image-enhance` is hook-enforced (in-session). See `governance/ROLES.md` gps `per_task_kind_caps`.
- **`--ref`/`--mask`** are v0.1 `supports_stretch` (need the `/v1/images/edits` multipart endpoint) → WARN-as-unsupported until built.

## Composes with
`scripts/image/{gen,lib/params}.cjs` · `scripts/design-system/resolve-style.cjs` · `scripts/deepask/art-style.cjs` · `deepask/image-compose` (§1/§1b technique) · `deepask/aesthetic` (Part 3) · `knowledge/{image-adapters,design-systems,art-styles}.yaml`.
