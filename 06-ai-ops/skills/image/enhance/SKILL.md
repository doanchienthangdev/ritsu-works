---
name: image/enhance
description: |
  In-session prompt-refinement stage for /image. TWO modes. (1) generic (`--enhance`):
  Claude rewrites the raw prompt into a richer, more renderable brief — pure in-session.
  (2) pro-max (`--enhance-mode=pro-max`, i.e. `--use=pro-max`): the vendored
  gpt-image-2-pro-max "media-designer" loop — diagnose → SEARCH the hosted community-prompt
  corpus (scripts/image/pro-max/search.cjs → goclawoffice.com, free + key-less) → pick a
  mood-aligned base → refactor into a parameterised template → resolve from the brief, WITH
  mandatory author attribution. Both run BEFORE the umbrella appends the brand/genre blocks,
  and NEITHER generates an image. Records before/after into run.json.prompt_enhanced (+ the
  chosen base into run.json.pro_max). Cost-bucket ai-ops-image task_kind image-enhance.
---

# image/enhance (capability `image-platform` v0.1 generic · v0.4 pro-max)

> The prompt-refinement stage. `--enhance` (generic) and `--use=pro-max` /
> `--enhance-mode=pro-max` (retrieval-augmented) route through here, BEFORE prompt
> composition (step 2 of the umbrella run flow). NO image generation here — pure text.

## When to use
- **generic** — `--enhance` is set (and `enhance-mode` is unset/`generic`).
- **pro-max** — `--use=pro-max` (or `--gpt-image-2-pro-max`, or `--enhance --enhance-mode=pro-max`). Uses the vendored `gpt-image-2-pro-max` skill (`vendor/gpt-image-2-pro-max/`, MIT — see its `NOTICE.md`).

## Billing / data lanes (important)
- **Refactor = in-session / subscription** (Claude reasoning). Hook-enforced under `image-enhance` (cap $0.10).
- **pro-max SEARCH = a free, key-less, read-only HTTP GET** to the corpus backend (`external-source/gpt-image-2-prompts-backend`, registered in `knowledge/external-sources.yaml`) — same lane as a web search; NOT an LLM/image API, NOT billed. Send **only non-sensitive creative briefs** (image descriptions) — never PII, user data, or secrets.
- Generation stays on our governed `gpt-image-2` (`OPENAI_API_KEY`, out-of-band), AFTER this stage — never the upstream OAuth/`gpt-image-1.5` generator.

---

## Mode 1 — generic (`--enhance`)
1. Take the raw prompt + `resolveStyle(--style)` mode + `resolveArtStyle(--art-style)` genre (for awareness — don't duplicate the style block the umbrella appends next).
2. Rewrite the prompt to be **more specific + renderable**: concrete subject, composition, lighting, medium, mood, focal point, exact text to render. Keep intent; add specificity, not new meaning.
3. Do NOT bake in brand palette / logo / genre assets — those are the umbrella's BRAND + GENRE blocks.
4. Return `{ prompt_input, prompt_enhanced }`.

## Mode 2 — pro-max (`--enhance-mode=pro-max`) — the media-designer loop
The vendored methodology (`vendor/gpt-image-2-pro-max/upstream/agents/media-designer.md` is canonical). Two principles: **start from a community-vetted base, never from scratch**, and **match mood/palette before subject type**.

1. **Diagnose** the brief → subject, brand/copy, output shape, mood, palette, technique, hard constraints.
2. **Search** the corpus. Run:
   ```bash
   node scripts/image/pro-max/search.cjs "<facet-slug tokens> <free text>" [--shape <portrait|poster|ui|character|comparison|ecommerce|ad|thumbnail|infographic|comic>] -n 5 --json
   ```
   Seed the query with 2–4 high-signal **facet slugs** first (subjects: `person-portrait` `product` `ui-screen` `poster-art` `diagram-chart`…; styles: `photorealistic` `cinematic` `editorial` `isometric` `illustration`…; moods: `vibrant` `luxurious` `moody` `minimal` `warm-emotional`…; palettes: `pastel` `neon-cyber` `cool-blue` `monochrome`…) — the backend tag-boosts slug matches. **Subject-mismatch retry:** put the right subjects slug FIRST. **Non-English brief:** retry in English + a cultural hint (the strongest livestream/e-commerce/portrait bases are often CN/KR/JP prompts; override their UI-text language at step 4).
3. **Pick** the best **mood-aligned** result (read each `tags` line; reject mood/palette conflicts — mood mismatch costs more than structural mismatch). Prefer a `parameterised-template`.
4. **Refactor** the chosen `prompt_text` into a parameterised template — abstract product-specific specifics into `{argument name="X" default="Y"}` slots (brand, headline, product, palette, backdrop, tagline, aspect, corner-logo…); **keep mood/lighting/style/photographic grammar literal** (that's the genre recipe).
5. **Resolve** every slot from the brief (user value → strong-implied value → keep `default`). Never invent contradictory values.
6. **Output** `{ prompt_input, prompt_enhanced, pro_max_base }`, where `prompt_enhanced` is the resolved prompt and `pro_max_base = "@<author> · <tweet_url> · <title>"`. The umbrella passes `--pro-max-base="<...>"` to `gen.cjs` so attribution lands in `run.json.pro_max` (the upstream license REQUIRES citing prompt authors).

**Composition (unchanged):** the resolved prompt is the *content brief*. The umbrella then appends the BRAND block (`--style`, e.g. ritsu palette/lockup) + GENRE block (`--art-style`), and `gen.cjs` does the corner logo overlay. So pro-max composes with every existing param. Do NOT bake brand/genre/logo into the enhanced prompt — let the deterministic blocks own that (brand palette still wins).

## Guardrails (both modes)
- Never invent claims/facts for an informational image (deepask no-new-claims discipline).
- Refusal-safe: don't rewrite a prompt into something that trips OpenAI moderation; surface a policy-risky raw prompt rather than "enhancing" around it.
- If enhancement adds no value (already specific), return the input unchanged.
- **pro-max fallbacks (never fatal):** if `search.cjs` exits non-zero (backend unreachable / rate-limited / query <3 tokens) → fall back to **Mode 1 generic** + a warning (`"pro-max corpus unavailable → generic enhance"`). NEVER block generation on the corpus.
- **pro-max attribution is mandatory** — every pro-max output cites the chosen base's `@author` + `tweet_url`. No attribution → no pro-max (fall back to generic).
