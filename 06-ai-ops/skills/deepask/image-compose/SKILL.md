---
name: image-compose
description: deepask image-format planner (capability deepask v1.1, extend). Turns the synthesis IR into an image-plan — for img-slide, a deck of ≤max-slides 16:9 slides (title → exec-summary → one per section → conflicts/verdict → sources); for infographics, ONE poster (landscape or portrait). For each piece it composes a gpt-image-2 prompt that (a) re-presents ONLY cited IR content (no new claims), (b) embeds the resolved --style DESIGN.md tokens as a brand "style block" so the rendered image matches the design system, (c) instructs legible exact-text rendering. Pure planning — emits prompts; deepask/format runs image-gen + slide-deck. NEVER invents claims; NEVER selected by smartauto (explicit cost gate).
---

# deepask/image-compose (capability `deepask` v1.1)

> The planning brain of the two image formats. The Format Engine (`deepask/format`)
> calls this AFTER `completeness-critic` sets the IR verdict, when `--format` is
> `infographics` or `img-slide`. It produces an **image-plan.json**; the engine then
> runs `image-gen.cjs` per prompt and (for img-slide) `slide-deck.cjs` to build the PDF.
>
> This is the stage the founder described: *"phân tích kết quả → chia thành slides/phần
> → soạn prompt ảnh theo --style → chạy lệnh gen."*

## When to use
- Called by `deepask/format` when `--format ∈ {infographics, img-slide}`.

## Inputs
- The synthesis IR (spec §5.1): `executive_summary`, `sections[].claims[]` (each with `citations`), `tables`, `charts` (series-data), `conflicts`, `coverage.gaps`, `sources`, `verdict`.
- `--format` (`infographics` | `img-slide`), `--orientation` (infographics only), `--max-slides` (img-slide; default 8), and the resolved **style context** from `scripts/design-system/resolve-style.cjs` (`resolveStyle(name)` → `{mode, tokens, designMdPath}`).
- The per-piece canvas from `scripts/deepask/image-spec.cjs` `resolveImageSpec({format, orientation})`.

## Process

### 1. Build the STYLE BLOCK (the --style compatibility core)
This is what makes the image obey the design system.
- `resolveStyle(name)` → if `{mode:'plain'}` (no `--style`): use the **neutral brief** (below). If `{mode:'styled', tokens, designMdPath}`: build a brand block from the tokens **and** the DESIGN.md prose.
  - From `tokens.colors`: name the **primary/accent** as the single hero color + its hex, the **background/foreground/muted/border** neutrals, the **signature gradient** if present, the **chart palette** (ordered) for any data viz.
  - From `tokens.typography`: the display/heading/body **font family** + weight + "tight tracking" feel.
  - From `tokens.rounded`/`spacing`/components: corner radius, whitespace rhythm, card/badge treatment.
  - **`Read(designMdPath)`** and lift the **Overview personality** + **Do's and Don'ts** verbatim-in-spirit into the prompt (e.g. ritsu: *"calm, confident, precise; one decisive cyan accent over slate; generous whitespace; flat-with-intent depth; NEVER salesy, no hype, no 'AI magic' clichés, no emoji-as-logo"*). The Don'ts are as important as the Do's for an image model.
- **Neutral brief (plain / no style):** *"clean modern editorial infographic style; one restrained accent color; high contrast on near-white; sans-serif; generous whitespace; flat; no clip-art, no stock-photo clichés, no hype."*

Compose the block ONCE; reuse it across every prompt in the plan so the deck/poster is visually coherent.

### 2. Derive the piece plan
**`img-slide`** — a deck (cap at `--max-slides`, default 8). Canonical ordering, dropped tail recorded (never silently):
1. **Title slide** — the IR `title` + the question + the verdict badge (COMPLETE/PARTIAL).
2. **Executive summary** — the Pyramid conclusion (≤3 bullets), each with its `[source-ref]` shown small.
3. **One slide per `sections[]`** (highest-value first) — section heading + its key claims (verbatim wording for headings/labels/numbers); render any `tables`/`charts` belonging to it as a styled table/chart drawn IN the image.
4. **Conflicts / Observation slide** (only if `conflicts[]` non-empty).
5. **Coverage & gaps slide** (only if `verdict==='PARTIAL'`) — the honest gaps + remedies.
6. **Sources slide** — the citation ledger (ref → recipient → authority → freshness).

If sections+fixed slides exceed `max-slides`, MERGE the lowest-value sections (or keep the highest-value ones) and **record the dropped sections in `image-plan.json.dropped[]`** — never silently omit. Always keep title + exec-summary + sources.

**`infographics`** — ONE poster. Landscape (3:2) = a left-to-right or grid layout; portrait (2:3) = a top-to-bottom vertical infographic (title → key-stat band → 3–5 section blocks → gaps/verdict → a sources footer). Pack the whole IR into the single canvas; prioritize the exec-summary + the most cited claims + any headline number.

### 3. Compose the per-piece gpt-image-2 prompt
Each prompt (assembly order from `deepask/aesthetic` Part 4) = **[content brief] + [layout] + [STYLE BLOCK (brand)] + [ART-DIRECTION BLOCK (`deepask/aesthetic` Part 3)] + [canvas] + [legibility/citation rules]**. On any conflict: **brand > legibility > art-direction > content density.**
- **Content brief:** the EXACT text to render — headings, labels, numbers, short claim phrases — quoted from the IR. Image models render text; give them the literal strings (e.g. `"100 paying customers who LOVE Ritsu"`, `"Activation ≥ 40%"`). Keep per-slide text tight (a slide is not a paragraph). Each piece has ONE focal point (title→headline, metric→number, comparison→table, poster→the single takeaway).
- **Layout:** "infographic slide", "title + 3 metric cards", "vertical timeline", "comparison table", "2-column", etc. — matched to the section's shape (a `tables[]` → a table; a `charts[]` → a bar/line chart with the given series-data).
- **STYLE BLOCK:** from step 1 (the brand identity — palette, type-feel, radius, personality).
- **ART-DIRECTION BLOCK (extraordinary bar):** append `deepask/aesthetic` Part 3 verbatim-in-spirit — award-grade editorial composition, one focal point, disciplined grid + generous margins, restraint, crisp vector iconography in the brand style, NO AI-slop/clip-art/stock/3-D/gradient-mush. This is what makes the image look *designed*, not *generated*. Subordinate to the brand block.
- **Canvas:** state the aspect ratio explicitly ("16:9 widescreen slide" / "vertical poster, 2:3"). (The API `size` comes from `image-spec`; stating it in the prompt improves composition.)
- **Legibility & citation rules:** "render all text crisply, correctly spelled, properly kerned, no lorem ipsum, no warped/nonsensical glyphs; use the EXACT words provided; small source tag in a corner: `[S1]`; no watermark; no stock photography; no emoji-as-logo."

Before emitting the plan, apply the `deepask/aesthetic` **Part 5 extraordinary gate** to each piece's prompt (one focal point? accent used once? art-direction present? legibility preserved?). Revise any piece that would "look generated."

### 4. Citation discipline (inherited from synthesize)
The image only **re-presents** IR content that already passed `citation-audit`. Each piece's prompt lists the `[source-ref]`s of the claims it shows (rendered as a small tag), so the deck/poster stays traceable. **No new claim may appear in an image that isn't in the IR** — if a slide needs a fact the IR doesn't have, that's a gap (the IR already records it), not an invention.

### 5. Emit `image-plan.json`
```json
{
  "format": "img-slide|infographics",
  "style": { "name": "ritsu|null", "mode": "styled|plain" },
  "pieces": [
    { "index": 1, "role": "title|exec|section|conflict|gaps|sources|poster",
      "size": "1536x1024", "quality": "medium",
      "source_refs": ["S1","S2"],
      "prompt": "<full composed gpt-image-2 prompt>" }
  ],
  "dropped": [ { "role": "section", "heading": "...", "reason": "over_max_slides" } ]
}
```

## Constraints
- **No new claims** — images re-present the cited IR only (same hard rule as synthesize).
- **Style-faithful** — when `--style` is set, every prompt carries the brand block; the Don'ts matter.
- **Cost-aware** — respect `--max-slides`; the orchestrator runs `image-cost.estimateRunCost` + `checkCostBudget` against `--max-cost-usd` BEFORE any gen and refuses up front if over.
- **Explicit-only** — image formats are never chosen by `smartauto` (they cost OpenAI money); the operator must ask for them.
- The canonical `answer.md` is still written alongside (the durable text answer is never replaced by images).

## HITL / cost
Planning is Tier A (in-session, no external call). The GEN step (`deepask/format` → `image-gen.cjs`) spends OpenAI image $ (out-of-subscription, like embeddings) — surfaced as an estimate; gated by `--max-cost-usd`.

## Tests (per spec §10)
Plan derivation (img-slide → title+exec+sections+sources, capped at max-slides with dropped[] recorded); infographics → exactly 1 poster piece; style block present iff `--style` resolved styled; **negative — no piece prompt contains a claim absent from the IR**; every piece lists ≥1 source_ref when its content has citations.
