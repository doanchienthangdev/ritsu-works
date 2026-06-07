# Capability spec — `translate` v0.1

> Status: **operating** (built + dogfooded + shipped 2026-06-08, founder-proxy
> autonomous CLA). Command `/translate`. SOP `SOP-AIOPS-013-translate-runtime-contract`.
> Cost-bucket `ai-ops-translate` under `gps`. Tier A.

## 1. Problem

The founder needed to turn a 401-page English book into a beautiful, faithful
Vietnamese PDF + EPUB. That one-off proved a pipeline — **chapter-split → parallel
literary translation → design-system render**. This capability **generalizes that
pipeline** into a reusable command: translate *any* source document, into *any*
language, out to *any* set of formats, styled by *any* design system.

The `/cla propose` framing:

> `/cla propose "Build a /translate command that turns any input document (pdf, pptx,
> docx, webpage, markdown…) into one or more output documents (pdf, epub, docx, pptx…)
> in a target language (default Vietnamese), styled by a design system (default claude),
> auto-splitting books into chapters and translating them in parallel via a Workflow at
> top-tier literary quality, saving outputs next to the source. Invoking implies the
> right to translate."`

## 2. Shape (mirrors /image, /deepask, /dataviz)

A **thin command** over an **umbrella skill** over a **deterministic engine**:

```
/translate <src> [flags]                       .claude/commands/translate.md
  └─ 06-ai-ops/skills/translate/SKILL.md        (the ONLY launcher of the translation Workflow)
       └─ scripts/translate/
            cli.cjs          Node orchestrator: `plan` | `build`
            lib/params.cjs   flag/out-spec/language/style parsing  (vitest: tests/translate/params.test.ts)
            lib/detect.cjs   source-format detection (extension / URL)
            engine.py        ingest adapters · structure detect · chapter split · assemble · brief
            render.py        renderers: pdf · epub · docx · pptx · md
            design.py        DESIGN.md tokens → book CSS (palette per --style)
            fonts.py         Source Serif 4 + Inter → instanced static TTFs (runtime cache)
            styles/claude/   bundled default design system (DESIGN.md)
```

## 3. Flow — plan → translate → build

1. **plan** (`cli.cjs plan`) — deterministic, no LLM. Detect format → ingest to normalized
   markdown → detect mode (`book`/`doc`/`slides`) → split into units (books: chapters at
   TOC/H1; long units split at section boundary, cap 3500 source words) → write the
   parameterized translator **brief** + `plan.json` (incl. the per-unit task list) to a
   gitignored runtime workdir. `--dry-run` stops here.
2. **translate** — the **skill** launches a Claude Code **Workflow**: one agent per unit,
   each reads the shared brief + its source unit and writes its translated unit. The brief
   enforces faithful-but-natural prose, consistent terminology, and preserved structure
   (`#`/`##`/`###`, `>` blockquotes, **bold**, lists, tables) + **`<sup>N</sup>` citation
   superscripts verbatim** + proper nouns. The task list is embedded as a script `const`
   (NOT `args` — large args arrive stringified). The workflow returns a small manifest only;
   translations are written to files (context stays clean). Failed units are re-run.
3. **build** (`cli.cjs build`) — deterministic, no LLM. Assemble translated units
   (concatenating split halves) → render each requested format with the design system →
   write `<name>.<lang>.<ext>` next to the source.

## 4. Decisions

- **D1 — generic structure detection, not per-document tuning.** PDF: `get_toc()` →
  modal-body-font-size heading heuristic → bold/heading fallback; running headers/footers
  stripped by repetition; footnote superscripts via the PyMuPDF superscript flag. DOCX:
  paragraph styles. PPTX: per-slide. HTML: semantic tags + main-content extraction. Degrades
  gracefully; never per-file hardcoding.
- **D2 — palette varies by `--style`, typography is bundled.** Source Serif 4 + Inter
  (full Vietnamese, instanced static) are the reading pairing for every style in v0.1; the
  design system supplies the **color identity**. Keeps every output reliable + VN-correct.
- **D3 — translation is a Workflow, launched by the skill.** `cli.cjs` never spawns agents;
  the skill owns the fan-out (the user asked for Workflow-based parallel translation).
- **D4 — outputs next to the source; work in gitignored `runtime/`.** Nothing tracked is
  written; the source folder gets only the final artifacts.
- **D5 — Tier A + `--max-cost-usd` breaker.** Local, reversible, metered. Invoking asserts
  the right to translate (founder directive).
- **D6 — reuse, don't fork.** `--style` reads the repo design-system library for non-claude
  palettes; the renderers share `design.py`.

## 5. Format matrix (v0.1, honest fidelity)

| | pdf | epub | docx | pptx | md |
|---|---|---|---|---|---|
| **fidelity** | polished | polished | clean | functional | polished |

Input: `pdf · docx · pptx · html/URL · md · txt`. Output default = source format
(html → pdf); multiple via `--out=pdf+epub`.

## 6. Hosts & deps

- `TRANSLATE_PY` = anaconda python (pymupdf, python-docx, python-pptx, bs4, ebooklib, markdown, PIL, fonttools).
- `TRANSLATE_PY_WEASY` = homebrew python (weasyprint) for PDF.
- Fonts instanced once into `runtime/translate/fonts/` (network only on cold cache).

## 7. Not in v0.1 (future `/cla extend`)

epub/odt **input**; richer pptx/docx layout; `ops.translate_runs` observability + 3 KPIs;
a per-language glossary library; RTL page direction (ar/he); a second design-system font set.

## 8. Provenance

Generalized from the 2026-06-07/08 one-off that produced `raw/elon-musk/Sách-về-Elon-Musk.vi.{pdf,epub}`
(401 pp → 371 pp, 28 parallel agents, footnotes preserved). CLA artifacts (local-only):
`.archives/cla/translate/`.
