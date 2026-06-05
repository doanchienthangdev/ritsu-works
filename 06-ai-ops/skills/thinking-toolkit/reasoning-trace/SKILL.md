---
name: thinking-toolkit/reasoning-trace
description: |
  Turn a COMPLETED /think mckinsey run folder into a narrated "McKinsey thinking
  journal" — a single, readable artifact that retraces the REASONING JOURNEY along
  a 4S timeline + a flow/tree graph: for each State/Structure/Solve/Sell band and
  each team-session checkpoint, what was done · WHICH framework/toolkit was chosen
  and WHY · the decision and its basis · the tool routed to for each datum · the
  porpoises (back-edges). Renders to PDF. Like reading the thinking journal of a
  McKinsey expert — clear, full, easy to study, easy to retrieve later.

  Trigger: `/think trace <slug>`; or after any substantial `/think mckinsey` run
  when you want an auditable provenance of HOW the answer was reached (not just the
  answer — the report already carries that). Capability thinking-toolkit v3.3.

  Skip when: the run was a `--depth=quick` accordion (no run folder); a trivial
  question. Needs the 9 persisted artifacts to reconstruct from.
allowed-tools: [Read, Write, Bash]
disable-model-invocation: false
---

# Reasoning Trace — the McKinsey "thinking journal"

> Not the answer (the `--sell` report carries that). This is the **provenance of the thinking** — a narrated, diagram-led retrace of *how the mind moved* through the 4S engine, so anyone can study and audit the reasoning, the framework choices, and the decisions later.

## What it produces

A `reasoning-trace.{md,pdf}` in the run folder, with five parts:

1. **The 4S flow / tree graph** — State → Structure → Solve → Sell as a diagram: the 7 team-session checkpoints as nodes, the Solve data-pulls hanging off Solve, and the **porpoise back-edges** drawn explicitly (the loop, not a waterfall).
2. **The timeline** — every checkpoint + key analysis in chronological order, each tagged with its band + the tool it routed to + the certainty (degree 1–8).
3. **The narration** — per band, written like a McKinsey EM's journal: *what we were doing · which framework/toolkit we SELECTED and WHY (the latticework + debias choice) · what the data said · the decision and its basis · what we'd have done if it were wrong (the disconfirmation)*.
4. **The data-provenance ledger** — every datum: which tool pulled it, the degree-of-certainty, and (v3.3) its verification status (see `data-verification`). Makes "where did this number come from?" answerable at a glance.
5. **The decision log** — the 7 checkpoints' decisions + the porpoises, with the reasoning basis for each.

## The pipeline (deterministic extract → narrate → render)

```bash
# 1. EXTRACT (pure Node — builds the structured trace.json from the 9 artifacts)
node scripts/thinking-toolkit/trace-extract.cjs <slug-or-path>

# 3. RENDER (local — diagrams + PDF; weasyprint + matplotlib, like the report build)
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib /opt/anaconda3/bin/python3 \
  scripts/thinking-toolkit/trace-build.py <slug-or-path>
```

Step 2 is YOU (the agent): read `trace.json` + the run folder, and **write the narration** to `reasoning-trace.md` in the run folder, using the structure below. `trace-build.py` embeds the narration + the rendered diagrams → PDF.

## How to write the narration (the judgment part)

Read `trace.json` (the skeleton) + the source artifacts (`checkpoint-log.md`, `analysis-log.md`, `one-day-answer.md`, `decomposition.md`) and narrate each 4S band. For EACH band write:

- **What we set out to do** (the band's intent in plain language).
- **The framework / toolkit we chose — and WHY.** This is the heart of the journal: name the lens(es) selected (TOSCA, driver-tree, 2×2, hypothesis-pyramid, the funnel model, the judge-panel…), and the *rationale* — why this tool fit this sub-need, and (debias) why NOT the familiar default. Cite `tool_selection` discipline (CLASSIFY → LOAD → SELECT ≤3 latticework lenses).
- **What the data said** (the key pulls + their tools + degrees, from `analyses`).
- **The decision + its basis** (from the checkpoint's `decision` + `consensus`).
- **The disconfirmation** — what would have proven this band's conclusion wrong (the one analysis that flips it).
- **Porpoise?** — if a back-edge fired here, narrate the reframe + why.

Write in clear, full, accessible prose (the `--sell` audience can read it) — *not* terse bullets. The goal is a journal a newcomer can read end-to-end and understand the entire problem-solving journey + every choice.

## Honesty + anti-claims

- The trace is **reconstructed from the persisted artifacts**, not a live keystroke log — it is as honest as the run folder (which the `mckinsey-run.cjs` gate already disciplines). It cannot invent reasoning the artifacts don't record.
- It is **discipline-trace, not proof** — it shows what the engine *recorded* choosing, not a guarantee the choice was optimal. Its value is auditability + study, not certification.
- It does NOT replace the report. Report = the answer (for the decision-maker). Trace = the journey (for whoever studies/audits the thinking).
- Composes with `data-verification`: the provenance ledger surfaces each external datum's verification status, so the reader sees not just *where* a number came from but *whether it was re-checked*.
