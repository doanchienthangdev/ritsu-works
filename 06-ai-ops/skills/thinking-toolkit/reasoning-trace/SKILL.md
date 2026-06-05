---
name: thinking-toolkit/reasoning-trace
description: |
  Turn a COMPLETED /think mckinsey run folder into a narrated McKinsey ENGAGEMENT
  JOURNEY — a single, easy-to-follow document that walks the reader through HOW the
  thinking moved, milestone by milestone, exactly like a McKinsey member presenting
  to a client and getting sign-off at each stage. Four acts (State / Structure /
  Solve / Sell); inside each, every team-session checkpoint is a "chặng" told in a
  fixed 5-beat rhythm — bối cảnh → the options (with a narrative CHART) → what we
  chose + why → what we dropped + why → the client's ✓ sign-off. Chart-rich; v3.5
  foregrounds the McKinsey crux — EXCELLENT TOOL USE — with a `toolkit_map` (which
  thinking-tool for which sub-need, ✓ chosen / ✗ rejected + why) and a MECE
  `issue_tree` (kept ✓ · knock-out ★ · cut ✗ + reason), plus the journey map, the
  decision funnel, the cut, the funnel math, the path. Flowing accessible prose → PDF.

  Trigger: `/think trace <slug>`; or after any substantial `/think mckinsey` run
  when you want to SHOW the reasoning journey persuasively (not just the answer —
  the report carries that). Capability thinking-toolkit v3.5.

  Skip when: the run was a `--depth=quick` accordion (no run folder); a trivial
  question. Needs the 10 persisted artifacts to reconstruct from.
allowed-tools: [Read, Write, Bash]
disable-model-invocation: false
---

# Reasoning Trace — the narrated McKinsey engagement journey

> Not the answer (the `--sell` report carries that). This is the **journey of the thinking, told to be followed** — the way a McKinsey member walks a client through *how we got here*, milestone by milestone, charts narrating each choice, the client signing off at every stage. The reader should finish able to *retrace and trust* the reasoning — not just admire it.

## The north star (read this first)

The founder's verdict on the old v3.3 trace: *"khó hiểu và khó theo trình tự suy nghĩ"* — a technical skeleton (a 4S box diagram + a dot timeline + flat tables), not a story. v3.4 fixes that. The output must read like **`ritsu-100-who-love-strategy-vi-day-du.pdf`** — flowing, accessible, deeply-explained Vietnamese — but tell the *thinking journey*, with the **client's sign-off (nghiệm thu) at every milestone**. If a reader can't follow "chart + its explanation together, in order, and see why each choice was made and each alternative dropped," the trace has failed.

## What it produces

A `reasoning-trace.{md,pdf}` in the run folder, shaped as a **client walkthrough**:

1. **Opening** — "how to read this journey" + a one-page **journey map** (the 4S arc with the milestones as numbered stations, each with its ✓ sign-off, + the porpoise loop) + a short **"how we chose our tools"** section carrying the **`toolkit_map`** chart. The McKinsey crux is *excellent, deliberate tool use* — so the whole tool-selection (which thinking-tool for which sub-need · ✓ chosen + why · ✗ rejected + why, grouped by 4S step) leads, not hides.
2. **Four acts** — STATE → STRUCTURE → SOLVE → SELL, each act a page-break, holding its milestones. **STRUCTURE MUST carry the `issue_tree`** — the MECE decomposition drawn as a tree (kept branches ✓ · the knock-outs ★ · the out-of-scope cuts ✗ grey + a reason for each). This is the founder's explicit ask: *a tree showing the list of choices + cuts + the why-keep / why-drop argument.*
3. **Each milestone (a "chặng")** is told in the **5-beat rhythm** (below), with **one narrative chart** that shows the THINKING (options narrowing, the cut, the math), not just structure.
4. **Closing** — the answer + *why you can trust it* (because the journey was disciplined and signed off at every step), with the path chart.

## The 5-beat rhythm (every milestone, same shape)

For each of the run's team-session checkpoints, write a `## Mốc N — <kind>` section with these five beats as **flowing bold-lead-in paragraphs** (not rigid headers):

1. **Bối cảnh.** — what we faced at this point; why this milestone mattered.
2. **Các lựa chọn.** — the options that were on the table, **followed by a narrative chart** (the funnel of strategies, the kept/dropped cut, the funnel math…). Narrate the chart ("hình này cho thấy…").
3. **Lựa chọn và vì sao.** — what we chose, and the rationale. **Name the actual thinking-tool selected (from `toolkit-log.md`)** + why it fit THIS need + the notable candidate rejected (why-not / debias) — do not say "we used a framework" vaguely. This is the McKinsey crux made narrative: e.g. *"chúng tôi chọn **cây vấn đề MECE** (không phải kim-tự-tháp giả thuyết, vì chưa có niềm tin mạnh) vì nó phơi ra nhánh-bằng-0-giết-cả-tích."* Source every tool claim from the recorded toolkit-log row — never invent a tool choice the ledger doesn't hold.
4. **Bỏ gì và vì sao.** — what we **explicitly dropped**, and why. This is the most persuasive beat — it proves discipline. Name the dropped options; give the one-line reason for each.
5. **✓ Nghiệm thu.** — the client's sign-off at that checkpoint (the recorded consensus/decision), as a **green sign-off box** (raw HTML, see below).

Map the 7 standard checkpoints to acts: **STATE** = {frame}; **STRUCTURE** = {hypothesize, plan, prioritize}; **SOLVE** = {porpoise/analyze, dissent}; **SELL** = {pre-wire}. Group plan+prioritize into one chặng if their decisions are tight (as the demo does).

## The pipeline (extract → author walkthrough + chart-specs → render)

```bash
# 1. EXTRACT — pure Node; builds trace.json (the skeleton) from the 10 artifacts
#    (incl. the v3.5 toolkit-log → trace.json.toolkit → the auto toolkit_map chart)
node scripts/thinking-toolkit/trace-extract.cjs <slug-or-path>

# 2. AUTHOR (this is YOU) — write TWO files into the run folder:
#    reasoning-trace.md   — the milestone-by-milestone walkthrough (the 5-beat rhythm, -vi-day-du register)
#    trace-charts.json    — the narrative chart specs (see the chart library below)

# 3. RENDER — local; renders the charts + compiles the walkthrough → McKinsey-styled PDF
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib /opt/anaconda3/bin/python3 \
  scripts/thinking-toolkit/trace-build.py <slug-or-path>
```

Read `trace.json` + the source artifacts (`checkpoint-log.md`, `analysis-log.md`, `one-day-answer.md`, `decomposition.md`, `hitl-log.md`) for the specific options, drops, decisions, and sign-offs.

### Writing `reasoning-trace.md`

- Start with a `# Hành trình tư duy — đọc bản này thế nào` intro (2–3 paragraphs) + the journey map: `![cap](trace-charts/journey.png)`.
- Each act header is **raw HTML** so it page-breaks: `<h1 class="act">STATE · Chặng 1 — …</h1>`.
- Each milestone: `## Mốc N — <kind>` then the 5 beats; embed its chart with `![cap](trace-charts/<name>.png)`.
- **Sign-off boxes are raw HTML** (markdown can't add the class): `<blockquote class="signoff"><strong>✓ Bạn đã nghiệm thu:</strong> …</blockquote>`. Escape `<`, `>`, `&` as `&lt; &gt; &amp;` inside them.
- Register: flowing, accessible, deeply-explained Vietnamese. Explain terms inline. Narrate every chart. No jargon dumps, no scaffolding boxes, no glossary.

### Writing `trace-charts.json`

A map `{ "<chart-name>": {type, …data} }`. The renderer always draws **four AUTO charts** from `trace.json` (`journey`, `receipts`, `tools`, **`toolkit_map`** — the last drawn straight from the recorded `toolkit-log`, so it's faithful, no invention) — you reference them by those names. You author the rest from this library:

| `type` | Use for | Key fields |
|---|---|---|
| `journey` *(override)* | clean in-register captions on the journey map | `stations: [{kind, decision}]` aligned 1:1 with checkpoints — strongly recommended (else the map shows raw run-log decisions) |
| **`issue_tree`** | **the MECE decomposition as a tree (MANDATORY at STRUCTURE)** — kept ✓ · knock-out ★ · dropped/out-of-scope ✗ + reason | `root`, `title?`, `branches: [{label, status: kept\|knockout\|dropped, reason?, children?}]` (nest `children` arbitrarily deep) |
| `funnel` | options/quantities narrowing (6→3→1, the funnel math) | `title`, `stages: [{label, value, display?, note?}]` |
| `kept_dropped` | the cut — what we kept vs dropped + reasons | `title`, `kept: [str]`, `dropped: [{item, reason}]` |
| `line_band` | a path / projection with a range band | `title`, `weeks[]`, `low[]`, `high[]`, `target`, `window?`, labels |
| `assumptions` | stress-test: assumption → test → kill-criterion | `title`, `rows: [{assumption, test, kill}]` |
| `bars` | ranked magnitudes | `title`, `items: [{label, value, display?, highlight?}]` |
| `twobytwo` | positioning on 2 axes | `title`, `x_label`, `y_label`, `items: [{label, x, y, kept?}]` |
| `callout` | 2–4 big-number tiles | `title`, `tiles: [{number, label}]` |

**Two charts are non-negotiable** (the founder's two asks): the auto **`toolkit_map`** in the opening "how we chose our tools" section, and a skill-authored **`issue_tree`** at STRUCTURE. Build the `issue_tree.branches` from `decomposition.md` (the MECE tree is there as text) — mark the knock-out leaves `status:"knockout"` and the explicitly-cut scope items `status:"dropped"` with a one-line `reason`. Then pick a narrative chart per other milestone. Keep `funnel`/`bars` labels short — push detail into `note`; the renderer wraps but very long in-box labels still crowd. The renderer strips light markdown (`**`/`*`/`` ` ``) from chart text, so a `**slug**` in the toolkit-log renders clean.

## Honesty + anti-claims

- The journey is **reconstructed from the persisted artifacts**, not a live keystroke log — as honest as the run folder (which `mckinsey-run.cjs` already disciplines). It cannot invent reasoning, options, or sign-offs the artifacts don't record. If a checkpoint has no recorded dissent or drop, say so plainly — don't manufacture a beat.
- It is a **discipline-trace, not proof** — it shows what the engine *recorded* choosing + signing off, not a guarantee the choice was optimal. Its value is *followability + auditability*, not certification.
- It does NOT replace the report. Report = the answer (for the decision-maker, action-first). Trace = the journey (for whoever needs to follow/trust/study the thinking).
- Composes with `data-verification`: the `tools` chart + the SOLVE narration surface where each number came from and which were re-checked — so the reader sees not just *where* a number came from but *whether it was verified*.
