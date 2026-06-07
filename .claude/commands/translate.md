---
name: translate
description: |
  Translate any source document (pdf · docx · pptx · webpage/URL · markdown · LaTeX · txt)
  into one or more output formats (pdf · epub · docx · pptx · md · latex · pdf-latex) in any
  target language (default Vietnamese), styled by a design system (default claude). v0.2 STEM:
  figures/charts/tables are extracted and carried into the translation; math/formulas are
  preserved verbatim and typeset natively in LaTeX output; --preserve keeps docx/pptx layout
  identical to the original. Books auto-split into chapters and translate in PARALLEL via a
  Claude Code Workflow — top-tier literary quality, structure + footnotes preserved. Outputs
  land next to the source. Tier A; per-run --max-cost-usd breaker; invoking implies the caller
  has the right to translate. Thin orchestrator over the `translate` umbrella skill.
---

# /translate — capability `translate` v0.2 (STEM)

Front-end for the `translate` capability. Parses flags, drives the `translate`
umbrella skill (`06-ai-ops/skills/translate/SKILL.md`), reports the artifacts.

## Usage
```
/translate <src> [flags]
```
`<src>` is a file path or an http(s) URL.

## Flags

| Flag | Default | Notes |
|---|---|---|
| `<src>` | — (required) | file path or webpage URL (positional, or `--src=`) |
| `--to` | `vi` | target language — code (`vi`,`en`,`ja`,`fr`…) or name (`vietnamese`,`tiếng việt`,`japanese`); unknown codes pass through |
| `--from` | auto | source language hint (rarely needed) |
| `--out` | = source format | output format(s); **`+` = multiple**, e.g. `--out=pdf+epub`. Supported: `pdf epub docx pptx md latex pdf-latex` (aliases `tex`→latex, `pdflatex`/`xelatex`→pdf-latex). A webpage source defaults to `pdf` |
| `--preserve` | off | **format-preserving / in-place** (Req 3): translate the text but keep structure, styling, images, tables, and layout **identical** to the original. v0.2 supports **docx · pptx** (output = source format); other formats fall back to reflow with a warning |
| `--keep-assets` / `--no-assets` | on | extract **figures/charts/tables** (Req 1) from the source and carry them into the outputs |
| `--math` | `auto` | `auto\|preserve\|off` — math/formulas (`$…$`, `\[…\]`, environments) are kept **verbatim** and typeset natively in LaTeX output (Req 2) |
| `--style` | `claude` | design system (palette). `claude` bundled; others via the repo design-system library (`knowledge/design-systems.yaml`) |
| `--mode` | `auto` | `auto\|book\|doc\|slides` — `auto` detects a book (→ chapters + cover + TOC) vs a short doc vs slides |
| `--split` | `auto` | chapter splitting: `auto\|toc\|heading\|none\|count=N` |
| `--out-dir` | source folder | where to write outputs |
| `--name` | from source | output basename (files are `<name>.<lang>.<ext>`) |
| `--workflow` / `--no-workflow` | auto | force/disable the parallel translation Workflow (auto = on for books/long docs) |
| `--dry-run` | off | ingest + plan only (mode, chapters, word count, cost estimate) — **no translation** |
| `--max-cost-usd` | `8.00` | per-run cost breaker (refuse-up-front) |
| `--glossary` | — | optional path to a project glossary appended to the translator brief |

`<src>` also accepts **LaTeX** (`.tex`) sources (prose translated, math preserved).

## v0.2 STEM capabilities
- **Figures / charts / tables (Req 1)** — extracted from the source (PDF images + `find_tables`; docx images + tables; in document order) into `assets/` and carried into **pdf · epub · md · latex** (`\includegraphics`), so diagrams and tables survive the translation. `--no-assets` to skip.
- **Math / formulas (Req 2)** — anything inside `$…$`, `$$…$$`, `\(…\)`, `\[…\]`, or a LaTeX math environment is **preserved byte-for-byte** during translation (brief discipline) and **typeset natively** in `latex` / `pdf-latex` output. docx Office-Math (OMML) is captured best-effort. PDF-rendered math is preserved as a cropped figure.
- **Format-preserving (Req 3)** — `--preserve` translates **docx/pptx in place**: same template, styles, images, tables, and layout — only the language changes ("giống hệt bản gốc").
- **LaTeX output (Req 4)** — `--out=latex` emits a self-contained `.tex` (XeLaTeX, Source Serif 4, full Vietnamese, math + figures + tables); `--out=pdf-latex` compiles it to PDF via **tectonic**. Ideal for STEM textbooks, AI/ML notes, and papers.

## Flow (dispatches to the `translate` umbrella skill)
1. **Plan** — `node scripts/translate/cli.cjs plan "<src>" [flags]` → ingest (format adapter) →
   detect mode → split into translatable units → write `brief.md` + `plan.json` to a runtime
   workdir. `--dry-run` stops here and prints the plan.
2. **Cost gate** — if the estimate exceeds `--max-cost-usd`, surface and stop.
3. **Translate (parallel Workflow)** — the skill launches a Claude Code Workflow: one agent per
   unit, each reads the shared brief + its source unit and writes its translated unit, at
   top-tier literary quality with structure + `<sup>` footnotes preserved.
4. **Build** — `node scripts/translate/cli.cjs build <workdir> --title="<translated title>"` →
   assemble translated units → render each requested format with the design system.
5. **Report** `{ok, outputs[], outDir, warnings[]}`.

## Fidelity by format (v0.2, honest)
- **Input** pdf · docx · pptx · webpage · md · **latex** · txt — fully supported (PDF uses TOC → font/heading fallback; figures + tables extracted).
- **Output** **pdf · epub · md · latex · pdf-latex** = polished (LaTeX/pdf-latex typeset math + figures + tables natively). **docx** = clean styled document (or **identical** with `--preserve`). **pptx** = functional deck (or **identical** with `--preserve`). Typography = bundled Source Serif 4 + Inter (full Vietnamese); `--style` supplies the color identity.
- **Honest limits:** non-LaTeX output shows math as `$…$` literal (use `latex`/`pdf-latex` for typeset math); generic PDF chapter-split is rougher than a hand-tuned run; PDF `--preserve` falls back to reflow in v0.2.

## Examples
```
/translate report.pdf                              # → report.vi.pdf (Vietnamese, claude style)
/translate the-book.pdf --out=pdf+epub             # book → Vietnamese PDF + EPUB
/translate paper.pdf --out=pdf-latex --to=vi       # STEM paper → typeset Vietnamese PDF (native math)
/translate ml-notes.md --out=latex+pdf-latex       # AI/ML notes → .tex + compiled PDF, formulas preserved
/translate contract.docx --preserve                # docx → identical layout, Vietnamese text (giống hệt bản gốc)
/translate slides.pptx --preserve --to=en          # pptx → identical deck, English text
/translate textbook.pdf --out=pdf-latex --to=vi    # textbook: figures + tables + equations carried + typeset
/translate https://blog.example.com/post --to=ja   # webpage → Japanese PDF
/translate big-book.pdf --dry-run                  # plan only: chapters + words + cost
```

> **Right to translate:** invoking `/translate` asserts the caller holds the right to
> translate the source. Outputs are written for the caller's own use, next to the source.

See `06-ai-ops/sops/SOP-AIOPS-013-translate-runtime-contract/flow.yaml` for the runtime
contract and `wiki/capabilities/translate/spec.md` for the architecture.
