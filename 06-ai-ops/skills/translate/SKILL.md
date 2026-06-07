---
name: translate
description: |
  Umbrella skill for the `translate` capability — the brain behind /translate. Turns a
  source document (pdf/docx/pptx/webpage/md/txt) into one or more output formats
  (pdf/epub/docx/pptx/md) in a target language (default Vietnamese), styled by a design
  system (default claude). Drives the deterministic pipeline (scripts/translate/cli.cjs:
  plan → build) and, between them, launches a parallel Claude Code Workflow that
  translates each unit at top-tier literary quality. Books auto-split into chapters.
  Invoke when the user asks to translate a document/book/webpage into another language,
  or runs /translate.
---

# translate — umbrella skill (capability `translate` v0.1)

The runtime orchestrator. Three phases: **plan → translate (Workflow) → build**. The
mechanical work is deterministic Python/Node (`scripts/translate/`); the *translation*
is a fan-out of LLM agents driven by a shared brief. Outputs land next to the source.

> **Right-to-translate:** a /translate invocation asserts the caller holds the right to
> translate the source. Process the document; write outputs for the caller's own use.

## Phase 1 — Plan

Run the planner (it ingests the source, detects book/doc/slides, splits into units,
writes `brief.md` + `plan.json` to a runtime workdir):

```
node scripts/translate/cli.cjs plan "<src>" [--to=… --out=pdf+epub --style=claude --mode=auto --split=auto --max-cost-usd=8 --dry-run …]
```

Read the JSON result: `{workdir, brief, mode, title, units, total_words, cost_estimate_usd, outputs, to, tasks[], warnings[]}`.
- **Surface every warning.**
- **`--dry-run`** (or `dry_run:true`): present the plan (mode, # units, words, cost, outputs) and STOP. Do not translate.
- **Cost gate:** if `cost_estimate_usd` > the resolved `--max-cost-usd`, surface the estimate and STOP for confirmation (do not silently spend).

## Phase 2 — Translate the title, then fan out the units

**2a. Title.** Translate the book/document title (`plan.title`) into the target language
yourself (one line) — keep proper nouns. Hold it as `TITLE_TRANSLATED` for the build step.

**2b. Launch the translation Workflow.** Use the Workflow tool. Embed the task list as a
`const` in the script body — **do NOT pass it via `args`** (large `args` arrive as a string
and `.map` throws). One agent per unit; each reads the shared brief + its source unit and
writes its translated unit. Template:

```js
export const meta = { name: 'translate-<slug>', description: 'Parallel translation of <title> into <lang>', phases: [{ title: 'Translate' }] }
const BRIEF = "<plan.brief abs path>"
const TASKS = [ /* plan.tasks: {id, title, is_first, src, out} — embed literally */ ]
const SCHEMA = { type:'object', additionalProperties:false, required:['id','ok','words'],
  properties:{ id:{type:'string'}, ok:{type:'boolean'}, words:{type:'integer'}, note:{type:'string'} } }
phase('Translate')
const results = await parallel(TASKS.map(t => () =>
  agent(
`You are a world-class literary translator into <LANGUAGE>.
STEP 1 — Read the brief (follow it EXACTLY): ${BRIEF}
STEP 2 — Read the source unit: ${t.src}
STEP 3 — Translate the ENTIRE unit into <LANGUAGE> at the highest literary standard
  (faithful + natural). ${t.is_first ? 'This is the FIRST part — begin with the H1 line "# '+t.title+'" (translate the title), blank line, then body.' : 'This is a CONTINUATION part of "'+t.title+'" — do NOT repeat the title; begin with the first translated section/paragraph.'}
  Preserve every "## "/"### " heading (translated), "> " blockquote (translated),
  **bold**, lists, tables, and every <sup>N</sup> marker VERBATIM. Keep proper nouns.
STEP 4 — Write ONLY the translated markdown (no preamble/fences) to: ${t.out}
STEP 5 — return {"id":"${t.id}","ok":true,"words":<count>}.`,
    { label:`tr:${t.id}`, schema: SCHEMA }
  ).catch(e => ({ id:t.id, ok:false, words:0, note:String(e).slice(0,200) }))
))
return { ok: results.filter(r=>r&&r.ok).length, total: TASKS.length, failed: results.filter(r=>!r||!r.ok) }
```

- Agents inherit the session model (use the strongest available — translation quality is the point).
- Concurrency auto-caps (~8–16); large books run in waves. The workflow returns a small manifest only (translations are written to files, never funneled back through context).
- **Re-run any failed unit** (its `out` file missing/empty) before building.

## Phase 3 — Build

```
node scripts/translate/cli.cjs build <workdir> --title="<TITLE_TRANSLATED>" [--subtitle="…"]
```
This assembles the translated units (concatenating split halves) and renders every requested
output format with the resolved design system. Read the result `{ok, outputs[], outDir}`.

## Phase 4 — Report

Report the produced files (absolute paths), the target language + style, any warnings, and —
honestly — the fidelity notes from the command's matrix (pdf/epub/md polished; docx clean;
pptx functional). Outputs are in the source's folder unless `--out-dir` was given.

## Notes
- **Hosts:** the planner/renderers pick the right Python automatically (PDF → WeasyPrint host;
  epub/docx/pptx/md → anaconda). Fonts (Source Serif 4 + Inter, full Vietnamese) are fetched +
  instanced once into `runtime/translate/fonts/` (gitignored).
- **Structure detection** is generic (TOC → font-size → heading fallback for PDF; paragraph
  styles for docx; slides for pptx; semantic tags for HTML). It degrades gracefully.
- **Quality bar:** the brief enforces faithful-but-natural prose, consistent terminology,
  preserved structure + citation superscripts — the discipline of a top publishing-house translator.
- This skill is the *only* place that launches the translation Workflow; `cli.cjs` never does.
