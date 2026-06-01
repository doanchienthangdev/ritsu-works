---
name: aesthetic
description: deepask EXTRAORDINARY-quality art-direction layer (capability deepask v1.1). The shared aesthetic bar every visual output must clear — code-rendered (html·dashboard·interactive·canvas·chart) AND image-gen (infographics·img-slide via gpt-image-2). References omgkit /design:good as the FLOOR (hierarchy·spacing·transitions·a11y·dark-mode) and exceeds it with senior art-direction: one focal point, ruthless restraint, optical spacing, a fluid type scale, layered depth, purposeful motion, and zero AI-slop. Provides (1) a code-render polish checklist + (2) a reusable IMAGE art-direction prompt block, both ALWAYS subordinate to the --style brand block (brand > art-direction > content). Consumed by deepask/format + deepask/image-compose.
---

# deepask/aesthetic (capability `deepask` v1.1)

> The reason a `/deepask` artifact looks *designed*, not *generated*. Every visual
> output — whether HTML I author or an image gpt-image-2 renders — must clear an
> **extraordinary** bar: the work a senior editorial/brand designer would ship.
> omgkit **`/design:good`** is the FLOOR (its checklist is table-stakes); this skill
> is the ceiling. Consumed by `deepask/format` (code-rendered) and
> `deepask/image-compose` (image-gen).

## The mandate
> Extraordinary = **award-grade**: *Information-is-Beautiful / Pentagram / Stripe-press / Linear* caliber. If a slide or page would not survive a senior designer's review, it is not done. Beauty NEVER costs correctness: citation discipline, legibility, accessibility, and the `--style` brand are inviolable. **Order of authority on any conflict: brand (`--style`) > accessibility/legibility > art-direction > decoration.**

## Part 1 — Universal principles (every visual output)
1. **One focal point per surface.** A slide/poster/page has a single thing the eye hits first. Everything else supports it. No competing heroes.
2. **Ruthless restraint.** One decisive accent (the brand hero color), used *once* with intent — never flooded. Two type weights, not five. Remove every element that isn't earning its place (Rams: "as little design as possible").
3. **Negative space is a material.** Generous, intentional margins and gutters. Crowding reads as cheap; air reads as premium.
4. **Unmistakable hierarchy.** Size, weight, color, and position encode importance so the reading order is obvious in 200ms. A clear type scale (display → heading → body → caption), not arbitrary sizes.
5. **Grid + optical alignment.** Everything sits on a grid; then nudge for *optical* (not just mathematical) balance. Consistent rhythm (8-pt or the brand's spacing scale).
6. **Contrast with purpose.** High text contrast (WCAG AA+). Contrast of scale (big vs small), weight, and density creates drama — use it deliberately.
7. **Data-ink discipline (charts/tables).** Maximize data-ink, kill chartjunk (no 3-D, no gratuitous gridlines, no legends when direct labels work). Tufte, not Excel-default.
8. **Cohesion.** A deck/dashboard feels like one object: shared margins, type, accent, and treatment across every piece.

## Part 2 — CODE-RENDERED checklist (html · dashboard · interactive · canvas · chart)
The `/design:good` floor (MUST all be true) **+** the extraordinary additions:

**Floor (from `/design:good`):** visual hierarchy ✓ · consistent spacing ✓ · smooth transitions ✓ · keyboard navigation ✓ · screen-reader support ✓ · responsive ✓ · dark-mode support ✓.

**Extraordinary additions (MUST):**
- **Embedded brand logo** — resolve via `scripts/design-system/style-asset.cjs` `resolveStyleLogo(resolved)` and inline the returned `dataUri` (`<img src="data:image/png;base64,…">`) + `faviconDataUri` for `<link rel="icon">`. **NEVER reference a sibling file path** (that is the bug this fixes). Plain style (`null`) → render a tasteful CSS wordmark instead.
- **Fluid type scale** — `clamp()` based, a real modular scale (≈1.2–1.25 ratio); tight tracking on display, comfortable `line-height` (~1.5–1.65) on body.
- **Layered depth, flat-with-intent** — depth from subtle borders + soft surface tints + at most one signature shadow/glow on the single focal element (per the brand's elevation rules), never drop-shadow-as-decoration.
- **Purposeful motion** — subtle entrance/transition on key elements; **always** wrap in `@media (prefers-reduced-motion: reduce)` to disable. Motion clarifies, never distracts.
- **Accessibility beyond the floor** — semantic landmarks, focus-visible rings (the brand `ring`), alt text on the logo, color never the sole signal, AA+ contrast verified.
- **Print + small-screen** — sane `@media print` and a genuine mobile reflow (not just shrink).
- **Finish** — optically-aligned numerals (`font-variant-numeric: tabular-nums` in tables), consistent radii, no orphaned punctuation, em-dashes done right. The 1% details.

**DON'T:** flood the accent; use >2 font families; lorem/placeholder; emoji as iconography; raw HTML-default tables/charts; drop-shadow soup; centered walls of text.

**Genre (`--art-style`) for code-rendered outputs (v1.2.x).** When `--art-style` resolves `styled` (via `resolveArtStyle`), consume the genre INTO the CSS aesthetic — **subordinate to the brand** (brand palette / logo / body-type win; legibility outranks genre):
- `genre.layout` → the page composition / grid (isometric → isometric CSS cards; swiss-international → a strict modular grid; risograph → layered offset blocks; neo-glassmorphism → frosted floating panels).
- `genre.assets` → decorative CSS illustration motifs (line-icon system / isometric platforms / grain-texture overlay / halftone dots) drawn **in the brand palette**, as CSS/SVG — NEVER stock or raster clip-art.
- `genre.tone` → the mood; `genre.secondary_palette` → secondary accents ONLY (the brand hero color still leads); `genre.display_type` → the headline character (overridden by legibility for VN/diacritic-heavy copy).
- **Honesty rule holds:** no load-bearing figure/claim may exist ONLY as a decorative motif — every number stays legible, cited text; the genre dresses the data, it never replaces it.
- Plain (`--art-style` omitted) → the neutral editorial aesthetic (today's behavior). Brand `--style` still drives palette/logo when set.

## Part 3 — IMAGE art-direction block (infographics · img-slide, gpt-image-2)
`deepask/image-compose` appends THIS block to every gpt-image-2 prompt, **after** the brand style block (brand wins on conflict). Adapt the nouns to the piece; keep it concrete:

> *"Art direction: award-winning editorial infographic / keynote-slide design — Information-is-Beautiful and Pentagram caliber. ONE clear focal point; strong typographic hierarchy (a bold display headline, clean supporting labels); a disciplined grid with generous margins and breathing room; flat, modern, premium; purposeful use of the single brand accent (not flooded); crisp vector-style shapes, clean iconography drawn in the brand style (no clip-art, no stock photos, no 3-D bevels, no gradient mush, no glossy web-2.0). Render ALL text crisply, correctly spelled, exact wording, properly kerned — typography is the hero. Balanced negative space; nothing crowded; museum-grade restraint. NO AI-slop tells: no warped text, no nonsensical glyphs, no melted UI, no random faces, no watermark."*

- **Subordinate to brand:** colors, fonts-feel, radius, personality come from the `--style` block; this block governs *composition, craft, and restraint*, not palette.
- **Per-piece focal point:** title slide → the headline; a metric slide → the number; a comparison → the table; a poster → the single key takeaway.
- **Legibility first:** if art-direction and text-clarity conflict, text-clarity wins (a beautiful illegible slide is a failed slide).

### Part 3b — GENRE direction (the `--art-style` axis, v1.2-image) — the POSITIVE complement
Part 3 is mostly *prohibition* (no clip-art / 3-D / slop). The `--art-style` GENRE block is the *positive* instruction that makes an image **illustrated**, not "text on a gradient", and sits BETWEEN the brand block and Part 3 (precedence: brand > legibility > **genre** > art-direction). `deepask/image-compose` (§1b) builds it from the resolved genre:
- **`assets` = THE lever** — the concrete objects / textures / lighting / medium to DRAW (e.g. "isometric floating platforms, tiny people, glowing path, line-icons"). Name them; this is what the model paints.
- **`layout` / `tone` / `display_type` / `secondary_palette`** → composition + mood + headline character + a SECONDARY accent.
- **Rendered IN the brand palette** — the genre owns the *register*; the `--style` brand owns the *palette / logo / body-type* (brand wins; a green-locked genre keeps its composition + assets, never its green).
- **REQUIRED per-piece focal illustration** — every content piece gets ONE concrete drawn subject derived from its cited IR, distinct from the other pieces' (kills sameness while the shared brand+genre keep cohesion).

## Part 4 — Prompt assembly order (images)
`[content brief (exact cited text)] + [FOCAL_ILLUSTRATION (per-piece)] + [layout] + [STYLE BLOCK (brand, --style)] + [GENRE BLOCK (--art-style, Part 3b)] + [ART-DIRECTION BLOCK (Part 3)] + [canvas/aspect] + [legibility / citation / VN rules]`. On any conflict: **brand > legibility/a11y (incl. VN diacritics) > genre > art-direction > content density** (drop density, never the brand or legibility).

## Part 5 — The extraordinary gate (pre-finalize self-check)
Before emitting any visual artifact, confirm ALL:
- [ ] One obvious focal point; reading order clear in a glance.
- [ ] Accent used once, decisively (not flooded); ≤2 type families.
- [ ] Generous, intentional negative space; everything on a grid.
- [ ] (Code) logo embedded as data URI; `/design:good` floor all true; reduced-motion honored; AA+ contrast.
- [ ] (Image) no AI-slop tells; all text crisp + correctly spelled + exact wording (incl. VN diacritics correctly attached if `--lang=vi`).
- [ ] (Image, v1.2-image) every CONTENT piece has a distinct `focal_illustration` drawn from its cited IR; NO two content pieces share an identical one.
- [ ] **(Honesty, v1.2-image — the load-bearing gate)** no load-bearing figure/claim exists ONLY as illustration — every number is legible text + cited; the illustration carries the SHAPE of an argument, never its SUBSTANCE, and asserts nothing absent from the piece's `[source-ref]`.
- [ ] Brand (`--style`) faithfully expressed; genre (`--art-style`) rendered IN the brand palette; citation/legibility intact.
- If any box fails → revise before emitting. "Looks generated" is a fail; "pretty but uncited / dishonest" is a worse fail.

## Constraints
- **Never trade correctness for beauty** — citations, legibility, accessibility, and brand are inviolable (Part-mandate order of authority).
- **Plain (`--style` omitted)** → a restrained, neutral *editorial* aesthetic (the principles still apply; just no brand palette/logo — use a tasteful CSS wordmark for code outputs).
- Reuse, don't reinvent: code outputs may lean on `frontend-design` / `design:*`; this skill sets the BAR + the logo-embed contract; the renderer does the work.

## HITL / cost
Tier A (guidance only; no external call). For image outputs the elevated art-direction rides inside the existing gpt-image-2 call (no extra cost beyond the image itself).

## Tests
The logo-embed contract is enforced by `scripts/design-system/style-asset.cjs` (`tests/design-system/style-asset.test.ts`). Aesthetic principles are guidance (no unit test); the extraordinary gate is a checklist the renderer applies. Skill-level acceptance: a `--format=html --style=ritsu` artifact embeds the logo as a data URI (no sibling-path `<img>`) and passes the Part-2 floor; an image prompt carries the Part-3 art-direction block after the brand block.
