---
name: format
description: deepask Format Engine — renders the format-agnostic synthesis IR into the requested output by REUSING existing renderer skills (no bespoke renderers). DEFAULT (no --format) = inline: the answer is rendered straight into the conversation (no files). Any explicit --format = file mode: writes the artifact dir. Dispatch-table architecture: each format = one row mapping to its reuse-skill (adding a format = a new row + reuse pointer). smartauto picks the best available file format via scripts/deepask/format-select.cjs. In file mode always writes canonical answer.md; rich formats degrade gracefully to answer.md + a note when a session skill is unavailable.
---

# deepask/format (capability `deepask` v1.0)

> The Format Engine. Consumes the synthesis IR (from `deepask/synthesize`, spec §5.1) and
> either renders it **inline into the conversation (DEFAULT, no files)** or — when an explicit
> `--format` is given — produces a file artifact. **Reuses existing skills — never rebuilds a renderer.**
>
> **Structure note (deviation from spec §4.1):** the spec drafted 12 *per-format* adapter
> folders. To stay under the resolver INDEX token hard-cap (~14k/15k; +12 catalog entries
> would breach it) and for maintainability, this is ONE umbrella skill with a **dispatch
> table**. Extensibility is preserved — adding a format = one new row + a reuse pointer.
> To be reconciled at Phase-8 promotion.

## When to use
- Called by `deepask/orchestrator` (final stage) after `completeness-critic` sets the IR verdict.

## Inputs
- The synthesis IR (verdict + sections/claims/tables/charts/diagrams/conflicts/coverage/sources).
- `--format` (one of the 12, or `smartauto`), `--depth`, the run slug.

## Process

### 1. Resolve the target format / mode
- **No `--format` (DEFAULT) → `inline` mode:** render the cited answer **into the conversation**; write **NO files**. Skip `format-select` and the artifact dir entirely — go to the `inline` dispatch row in §2. This is the common path for quick questions (you asked, you read the answer in chat).
- Explicit `--format=<x>` → **file mode**; use `<x>` directly.
- Explicit `--format=smartauto` → **file mode**; `scripts/deepask/format-select.cjs` `selectFormat({intent})` (classify `intent` from the question + IR). As of **Sprint 5 the default `available` set is `ALL_FORMATS`** — every adapter is built. Returns `{format, reason, fellBack}`; record `reason` in `plan.json`.

### 1.5 `--style=<name>` — design-context injection (capability `design-system-styling`)
`--style` is **orthogonal** to `--format` (format = which artifact; style = which visual language). If `--style=<name>` is set, the orchestrator resolves it ONCE via `scripts/design-system/resolve-style.cjs` (`resolveStyle(name, {interactive})`):
- `{mode:'plain'}` (or `--style` omitted) → render with no styling — the default.
- `{mode:'styled', tokens, previewPath}` → pass `tokens` + `previewPath` as **design context** INTO whichever reuse-renderer the §2 dispatch row selects. **Tokens are DATA — `--style` NEVER adds a new dispatch row / renderer; the §2 table below is unchanged by it (AD-4).**
- non-interactive cache-miss → `StyleResolveError` (AD-3: no silent fetch in CI).

**Visual** formats (html/dashboard/interactive/canvas/pptx/pdf/docx/chart/mermaid + the v1.1 image formats **infographics/img-slide**) → tokens drive the look. For the image formats the style coupling is the STRONGEST: the resolved tokens + DESIGN.md prose become the "brand style block" `deepask/image-compose` injects into every gpt-image-2 prompt (so `--style=ritsu` ⇒ cyan/slate/Inter imagery; plain ⇒ neutral editorial). **Non-visual** (inline/text/article/xlsx) → honest no-op (at most a cover/accent note). Full contract: `SOP-AIOPS-007-design-system-runtime-contract`.

### 1.5b `--art-style=<name>` — artistic GENRE injection (image → code-rendered too, v1.2.x)
`--art-style` is the SECOND, orthogonal axis — the artistic genre (`knowledge/art-styles.yaml`, resolved ONCE via `scripts/deepask/art-style.cjs` `resolveArtStyle(name)`; CLOSED registry → hard-fail on an unknown name, AD-3). It now drives **both** kinds of visual output:
- **Image formats** (infographics/img-slide) → the genre is the GENRE block in the gpt-image-2 prompt (`deepask/image-compose` §1b).
- **Code-rendered visual formats** (`html`/`dashboard`/`interactive`/`canvas`/`chart` + `pdf`-via-html) → **v1.2.x**: the resolved genre is passed as design context INTO the §2 reuse-renderer (`design:*`/`frontend-design`) and consumed by `deepask/aesthetic` **Part 2** (the code-rendered checklist): `genre.layout`→page composition, `genre.assets`→CSS illustration motifs / decorative treatment (drawn in the brand palette, never raster clip-art), `genre.tone`→mood, `genre.secondary_palette`→secondary accents, `genre.display_type`→headline feel.
- **Non-visual / native-doc** (`inline`/`text`/`article`/`xlsx`/`docx`/`pptx`/`mermaid`) → genre is an honest **no-op** (no illustration surface; the brand `--style` still applies where it did). *(Native docx/pptx theme-per-genre = a future extension.)*

**Precedence identical to the image branch: brand (`--style`) core palette / logo / body-type ALWAYS WIN > legibility/a11y > genre (`--art-style`) > art-direction > content density.** Like `--style`, `--art-style` is DATA — it NEVER adds a §2 dispatch row (AD-4). The logo-data-URI + the honesty invariant carry over to code-rendered outputs.

### 2. Dispatch table (inline default + 12 file formats)
| `--format` | reuse | how |
|---|---|---|
| **`inline`** (DEFAULT) | native (conversational) | render the IR **into the chat response**: Pyramid prose (exec_summary → sections → claims, each with an inline `[source-ref]`), then a **Sources** list, plus Conflicts + Coverage/Gaps sections when present. **Writes NO files** (no artifact dir). The conversational answer *is* the deliverable. |
| `text` | native | (file) flatten the IR (exec_summary + sections→claims, each with its citation) to plain text |
| `article` | native Markdown | (file) the **canonical `answer.md`** — Pyramid prose, every claim with inline `[source-ref]`, a Conflicts section, a Freshness note, and a Coverage/Gaps section if PARTIAL. Always written in **file mode** (regardless of which file `--format`). |
| `pdf` | `anthropic-skills:pdf` (portable) or `playbook-builder` (WeasyPrint, Mac-local) | render the article MD → PDF |
| `docx` | `anthropic-skills:docx` | IR sections/tables → Word |
| `pptx` | `anthropic-skills:pptx` | exec_summary → title; each section → a slide; tables/charts as slide objects |
| `xlsx` | `anthropic-skills:xlsx` | IR `tables[]` + metric rows → sheets (best for data/metric-heavy answers) |
| `mermaid` | mermaid MCP (`validate_and_render_mermaid_diagram`) | IR `diagrams[].mermaid_src` → validated/rendered diagram(s) |
| `chart` | `anthropic-skills:xlsx` charts / `design:*` html-chart | IR `charts[]` (series-data, not pixels) → chart image/html |
| `dashboard` | `design:*` / `frontend-design` | multi-panel html dashboard from IR sections + charts + tables |
| `html` | `design:*` / `frontend-design` | standalone html rendering of the article + visuals |
| `interactive` | `frontend-design` | interactive html (filterable tables, toggles) |
| `canvas` | `anthropic-skills:canvas-design` | canvas / infographic artifact from the IR |
| `infographics` *(v1.1, image)* | `deepask/image-compose` → `scripts/deepask/image-gen.cjs` (gpt-image-2) | ONE poster image; `--orientation=landscape\|portrait`; style-block-driven |
| `img-slide` *(v1.1, image)* | `deepask/image-compose` → `image-gen.cjs` (×N) → `scripts/deepask/slide-deck.cjs` | a **16:9** deck: `slides/NN-*.png` folder **+** combined `slides.pdf` |

deepask AUTHORS the concrete invocation of each reuse-skill (frames its inputs from the IR); the reuse-skill does the rendering. **For the code-rendered visual rows (`chart`/`dashboard`/`html`/`interactive`/`canvas`, + `pdf`-via-html), deepask passes BOTH the resolved `--style` brand tokens AND the resolved `--art-style` genre (§1.5b) as design context — the renderer applies `aesthetic` Part 2 (brand wins, genre dresses the data).**

### 2.5 Image pipeline (v1.1 — `infographics` · `img-slide`, gpt-image-2)
These two formats render via OpenAI image generation, so they have an extra pipeline + flags + a cost gate. They are **explicit-only** (never returned by `smartauto` — image gen spends money).

**New flags** (orthogonal to `--format`; only meaningful for the 2 image formats):

| Flag | Values | Default | Effect |
|---|---|---|---|
| `--art-style` | genre id \| omit | `plain` | **(v1.2-image)** artistic GENRE from `knowledge/art-styles.yaml` (orthogonal to brand `--style`). → `art-style.resolveArtStyle`; injected by image-compose as the GENRE block (brand palette wins). |
| `--lang` | ISO (e.g. `vi`) \| omit | IR-auto | **(v1.2-image)** VN diacritic-locking sub-block when the text is Vietnamese. |
| `--orientation` | `landscape` \| `portrait` | `landscape` | infographics canvas (img-slide ignores it — always 16:9). → `image-spec.resolveImageSpec`. |
| `--img-quality` | `low` \| `medium` \| `high` \| `auto` | `medium` | gpt-image `quality` = the **primary cost dial**. **(v1.2-image) WARN on `low`** for image formats — it's a draft tier; artistic decks want `medium`+ (the `high`-default flip is gated on a separate gpt-image-2 COST_TABLE re-verify, @cto R3). |
| `--image-model` | model id | `gpt-image-2` | the image model (parameterized for robustness if the name changes). |
| `--max-slides` | int | `8` | img-slide deck cap (cost control); overflow sections recorded in `image-plan.json.dropped[]`. |
| `--max-cost-usd` | number | `1.00` | **cost circuit-breaker**: if the pre-gen estimate exceeds it → REFUSE up front (mirror of the resolver breaker), tell the operator, do not silently overspend. |

**Pipeline (Stage 6, image branch):**
1. `resolveStyle(--style)` → brand context. **`resolveArtStyle(--art-style)` → genre context (v1.2-image).** `resolveImageSpec({format, orientation})` → `apiSize` (img-slide = **2048×1152 native 16:9, `crop:null`** — no crop, so the title is never clipped, v1.2.1).
2. **`deepask/image-compose`** → `image-plan.json` (pieces + per-piece gpt-image-2 prompts = byte-identical brand block + **genre block + a REQUIRED per-piece focal illustration from the cited IR** + the EXACT IR text; no new claims; **honesty invariant** — no load-bearing figure exists ONLY as illustration).
3. **Cost gate:** `image-cost.estimateRunCost({size, quality, count})` → `checkCostBudget({estimatedUsd, maxCostUsd})`. If `!ok` → STOP, report the estimate vs cap, suggest lowering `--img-quality`/`--max-slides` or raising `--max-cost-usd`. Show the estimate either way.
4. **Gen:** for each piece, `node scripts/deepask/image-gen.cjs --prompt-file=… --size=… --quality=… --model=… --out=images/NN-role.png` (writes PNG via OpenAI; `--dry-run` writes prompt sidecars + no PNG + no spend).
5. **Assemble (img-slide only):** `node scripts/deepask/slide-deck.cjs --images-dir=slides/ --out=slides.pdf --crop=16:9` (Pillow; crops each page to true 16:9; graceful-degrade → keep PNGs + note if Pillow absent).
6. **Always also write `answer.md`** (+ `plan.json` + `sources.json` + `image-plan.json`). The image deck/poster is the rich artifact; the cited text answer is never lost.

**Artifact layout (image formats):**
- `infographics` → `.archives/deepask/<date>-<slug>/poster.png` (+ `image-plan.json`, `answer.md`, …).
- `img-slide` → `.archives/deepask/<date>-<slug>/slides/NN-role.png` (folder) + `slides.pdf` (+ `image-plan.json`, `answer.md`, …).

**Billing:** gpt-image-2 is OUTSIDE the Claude subscription → `OPENAI_API_KEY` (runtime/secrets/.env.local), exactly like `text-embedding-3-small`. Logged to `ops.deepask_runs.metadata.image_gen` + `cost_usd` (cost-bucket `ai-ops-deepask`).

### 2.6 Aesthetic quality bar — EXTRAORDINARY (v1.1) + the logo-embed contract
**Every visual artifact MUST clear the `deepask/aesthetic` bar** (references omgkit `/design:good` as the FLOOR and exceeds it: one focal point, ruthless restraint, optical spacing, fluid type scale, layered depth, purposeful motion, zero AI-slop). This is NOT optional polish — it is the deliverable standard for `html`/`dashboard`/`interactive`/`canvas`/`chart` (code-rendered) AND `infographics`/`img-slide` (image-gen).
- **Code-rendered** (html/dashboard/interactive/canvas/chart): apply `deepask/aesthetic` Part 2 (the `/design:good` floor + extraordinary additions) and run the Part-5 gate before writing the file. May lean on `frontend-design` / `design:*` for execution; `deepask/aesthetic` sets the bar.
- **Image-gen** (infographics/img-slide): `deepask/image-compose` injects `deepask/aesthetic` Part 3 (the art-direction block) into every prompt, after the brand style block.

**Logo-embed contract (FIXES the `--format=html --style=ritsu` missing-logo / path bug).** Code-rendered visual formats MUST embed the brand logo **inline as a base64 data URI** — NEVER a sibling-file `src`/`href` (which breaks when the artifact is viewed from a different base — preview panel, moved file, email):
```js
const { resolveStyleLogo } = require('scripts/design-system/style-asset.cjs');
const logo = resolveStyleLogo(resolved /* from resolveStyle(--style) */, { prefer: 'mark' });
// logo === null  → plain style / no assets → render a tasteful CSS wordmark instead
// logo.dataUri        → <img src="${logo.dataUri}" alt="${name}">   (header mark)
// logo.faviconDataUri → <link rel="icon" href="${logo.faviconDataUri}">
```
The asset is resolved from the design system's `assets/` dir (beside its DESIGN.md). Self-contained → the logo renders everywhere, always. `--style` plain → no logo file; use a CSS wordmark in the brand-neutral aesthetic.

### 3. Artifact layout (FILE MODE ONLY — skipped entirely in `inline` default)
**Inline mode (default) writes nothing to disk** — the cited answer + Sources list live in the conversation; only the Stage-7 `ops.deepask_runs`/`ops.deepask_coverage` audit rows are written (DB rows, not files), with `artifact_path = NULL`. In **file mode** (any explicit `--format`), write to `.archives/deepask/<YYYY-MM-DD>-<slug>/`:
- **`answer.md`** — the canonical cited article (ALWAYS in file mode, regardless of which `--format`).
- **`plan.json`** — decomposition + ResolverPlans + coverage matrix + smartauto `reason`.
- **`sources.json`** — the citation ledger (every `source-ref` with recipient_id, axis, authority, freshness, retrieved_at).
- **`<artifact>.<ext>`** — the rendered `--format` output (when not `text`/`article`).

### 4. Graceful degradation
If a reuse-skill is unavailable in the session (e.g., `anthropic-skills:pdf` absent, or Mac-local WeasyPrint missing), DO NOT fail the run: write `answer.md` + a note in `plan.json` (`format_degraded: {requested, reason, delivered: 'article'}`) and tell the operator "rendered as Markdown; <format> adapter unavailable this session." The canonical answer is never lost.

## Constraints
- **Reuse only** — no bespoke rendering engine. New format = new dispatch row + reuse pointer (+ add it to `format-select` availability when built).
- **Mode contract:** no `--format` → `inline` (conversational answer, **zero files**); any explicit `--format` → file mode where `answer.md` is always written (the durable, portable answer). Inline is the default because most questions want a fast answer, not an artifact.
- No new content/claims at render time — the Format Engine only *re-presents* the IR (which already passed `citation-audit`); it never adds an uncited claim.

## HITL / cost
Tier A (rendering is local/in-session). Cost-bucket `ai-ops-deepask`. PDF/docx/pptx/xlsx via session skills (subscription).

## Tests (per spec §10)
`scripts/deepask/format-select.cjs` unit-tested (`tests/deepask/format-select.test.ts`, 23 cases — every intent × availability, fallback flag, validation). Skill-level (land per sprint): each doc adapter renders the IR → a valid artifact; **smartauto picks a sane format per intent**; **`answer.md` is always written**; the artifact dir layout is correct; **graceful-degrade path** writes answer.md + a note when a reuse-skill is missing.
