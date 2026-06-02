---
name: image/enhance
description: |
  Optional in-session prompt-refinement stage for /image (the "gpt-image-2-pro-max"
  concept, reframed). Takes the user's raw prompt + the resolved --style/--art-style
  context and rewrites it into a richer, more specific image-generation prompt
  BEFORE the brand/genre/art-direction blocks are appended. Runs IN-SESSION
  (Claude, subscription billing) — NEVER routed through an external API. Records
  before/after into run.json.prompt_enhanced. Cost-bucket ai-ops-image task_kind
  image-enhance (hook-enforced, cap $0.10). NO image generation here — pure text.
---

# image/enhance (capability `image-platform` v0.1)

> The optional prompt-refinement stage. `--enhance` (and the `gpt-image-2-pro-max`
> preset, = `--enhance --quality=high`) route through here. This is the founder's
> reframing of the GitHub `gpt-image-2-pro-max` skill (a prompt tool, not a
> generator): we keep the *prompt-refinement concept* as an in-session stage and
> drop the external generator.

## When to use
- The umbrella `image` skill calls this when `--enhance` is set (or `--use=gpt-image-2-pro-max`), BEFORE prompt composition (step 2 of the umbrella run flow).

## Billing lane (important)
**In-session / subscription** — this is a Claude reasoning step, NOT an external API call. Do NOT shell out to any image/prompt API. It is hook-enforced under `image-enhance` (cap $0.10). This is the one `/image` stage the budget hook actually sees.

## Process
1. Take the raw user prompt + `resolveStyle(--style)` mode + `resolveArtStyle(--art-style)` genre (for awareness — don't duplicate the style block, which the umbrella appends next).
2. Rewrite the prompt to be **more specific + more renderable**: concrete subject, composition, lighting, medium, mood, focal point, and any exact text to render. Keep the user's intent; add specificity, not new meaning.
3. Do NOT bake in brand palette / logo / genre assets — those are the umbrella's BRAND + GENRE blocks (appended after this). Enhance the *content brief* only.
4. Return `{ prompt_input, prompt_enhanced }`. The umbrella records both in `run.json` (legibility: the founder can see exactly what the refinement changed).

## Guardrails
- Never invent claims/facts for an informational image (mirror deepask's no-new-claims discipline).
- Refusal-safe: don't rewrite a prompt into something that would trip OpenAI moderation; if the raw prompt is already policy-risky, surface that rather than "enhancing" around it.
- If enhancement adds no value (already specific), return the input unchanged (`prompt_enhanced === prompt_input`) — don't pad.
