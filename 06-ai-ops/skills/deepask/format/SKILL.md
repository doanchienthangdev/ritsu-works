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

deepask AUTHORS the concrete invocation of each reuse-skill (frames its inputs from the IR); the reuse-skill does the rendering.

### 2.5 Image pipeline (v1.1 — `infographics` · `img-slide`, gpt-image-2)
These two formats render via OpenAI image generation, so they have an extra pipeline + flags + a cost gate. They are **explicit-only** (never returned by `smartauto` — image gen spends money).

**New flags** (orthogonal to `--format`; only meaningful for the 2 image formats):

| Flag | Values | Default | Effect |
|---|---|---|---|
| `--orientation` | `landscape` \| `portrait` | `landscape` | infographics canvas (img-slide ignores it — always 16:9). → `image-spec.resolveImageSpec`. |
| `--img-quality` | `low` \| `medium` \| `high` \| `auto` | `medium` | gpt-image `quality` = the **primary cost dial**. |
| `--image-model` | model id | `gpt-image-2` | the image model (parameterized for robustness if the name changes). |
| `--max-slides` | int | `8` | img-slide deck cap (cost control); overflow sections recorded in `image-plan.json.dropped[]`. |
| `--max-cost-usd` | number | `1.00` | **cost circuit-breaker**: if the pre-gen estimate exceeds it → REFUSE up front (mirror of the resolver breaker), tell the operator, do not silently overspend. |

**Pipeline (Stage 6, image branch):**
1. `resolveStyle(--style)` → style context (tokens + DESIGN.md path). `resolveImageSpec({format, orientation})` → `apiSize` + 16:9 `crop` (img-slide).
2. **`deepask/image-compose`** → `image-plan.json` (pieces + per-piece gpt-image-2 prompts carrying the style block + the EXACT IR text; no new claims).
3. **Cost gate:** `image-cost.estimateRunCost({size, quality, count})` → `checkCostBudget({estimatedUsd, maxCostUsd})`. If `!ok` → STOP, report the estimate vs cap, suggest lowering `--img-quality`/`--max-slides` or raising `--max-cost-usd`. Show the estimate either way.
4. **Gen:** for each piece, `node scripts/deepask/image-gen.cjs --prompt-file=… --size=… --quality=… --model=… --out=images/NN-role.png` (writes PNG via OpenAI; `--dry-run` writes prompt sidecars + no PNG + no spend).
5. **Assemble (img-slide only):** `node scripts/deepask/slide-deck.cjs --images-dir=slides/ --out=slides.pdf --crop=16:9` (Pillow; crops each page to true 16:9; graceful-degrade → keep PNGs + note if Pillow absent).
6. **Always also write `answer.md`** (+ `plan.json` + `sources.json` + `image-plan.json`). The image deck/poster is the rich artifact; the cited text answer is never lost.

**Artifact layout (image formats):**
- `infographics` → `.archives/deepask/<date>-<slug>/poster.png` (+ `image-plan.json`, `answer.md`, …).
- `img-slide` → `.archives/deepask/<date>-<slug>/slides/NN-role.png` (folder) + `slides.pdf` (+ `image-plan.json`, `answer.md`, …).

**Billing:** gpt-image-2 is OUTSIDE the Claude subscription → `OPENAI_API_KEY` (runtime/secrets/.env.local), exactly like `text-embedding-3-small`. Logged to `ops.deepask_runs.metadata.image_gen` + `cost_usd` (cost-bucket `ai-ops-deepask`).

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
