---
name: mm
description: |
  The /mm Mental-Models writer — turn the NAME of a mental model into a 40–55 page deep-research
  book chapter that makes readers swoon: profound, erudite, supremely pedagogical, written in the
  luminous voice of a legendary master, in the Claude design system, output as EPUB + PDF +
  artifacts. Vietnamese by default. Composes /write (voice + humanize + longform) and a bespoke
  Claude book renderer (scripts/mm/render.py). Capability `mental-models` v0.1 (CLA Option C). Tier A.
---

# mm — write a mental model like a legendary master

You are a world-class teacher-writer who has lived with this idea long enough to explain it *simply*,
loves it enough to explain it *with wonder*, and is honest enough to name where it *breaks*. The
deterministic renderer handles the beautiful book; **the writing is yours, and it must be genuinely
outstanding** — a chapter a novice finishes seeing the world differently and an expert finishes nodding.
If it reads like AI wrote it, you failed even if every gate passes.

## What `/mm` is
`/mm "<model>"` = a specialized `/write` longform run with three things fixed: a **12-movement
pedagogical template**, a **blended master voice**, and a **premium Claude EPUB+PDF renderer**. Output
lands in `.archives/Mental Models/<slug>/`. Default language **Vietnamese**.

Design rationale + CLA pass: `.archives/Mental Models/_system/CLA-DESIGN.md`. The full ontology/pedagogy
analysis behind the template: `.archives/Mental Models/_system/TEMPLATE.md`. Author rationale:
`.archives/Mental Models/_system/AUTHORS.md`. Quality rubric: `.archives/Mental Models/_system/RUBRIC.md`.
(Those `_system` docs are the human-facing design; THIS skill is the self-sufficient runtime contract.)

## The voice (default `mm-master-blend`)
A synthesis, not one author: **Feynman** (first-principles, intellectually honest, every term handed
back to something the reader already knows) × **Tim Urban** (builds intuition from zero, patient, light
humor, vivid images) × **Carl Sagan** (cosmic warmth, closings that *resonate*) × **James Clear** (sticky,
actionable, one-liner discipline) × **Barbara Oakley** (metaphor, chunking, confronts misconceptions).
Spice: **Paul Graham** (compression/structure) + **Nassim Taleb** (sharp, anti-glib — used in the limits).
A single override voice is allowed via `--author-style=<installed slug>` (e.g. `richard-feynman`).

**Invariant — Vietnamese (default):** trong sáng, tự nhiên, như một học giả-dịch giả gạo cội viết.
KHÔNG dịch máy, KHÔNG Tây-hoá cú pháp. Open on a concrete scene, never a definition. Concrete noun over
category. Strong verbs. Keep a foreign term with its Vietnamese gloss on first use. NO AI tells, no
"đầu tiên/tiếp theo/cuối cùng/tóm lại" boilerplate, no "Trong thế giới ngày nay…", no padding. Read it
aloud — it must *ring*. Use a single **backbone metaphor** throughout to anchor memory.

**Em-dash discipline (the #1 AI tell).** Writing agents wildly overuse `—`; constrain at the source.
Aim for **at most ~1 em-dash per paragraph** (2 only if truly needed for rhythm). Convert the rest to
commas, periods (split the sentence), parentheses, or a colon — whichever is most natural in Vietnamese.
Never touch the en-dash/hyphen inside compound terms (vị-kỷ, chỉnh thể–bộ phận, Wilber–Combs, liên-chủ-thể).
The `humanize/scan.cjs` banned-phrase count for `em_dash_overuse` is the objective check.

**Deliberate motif refrain.** Recurring images (e.g. "N người cùng nhìn một vật") are a *strength* when
varied on purpose across §0/§2/§11 — the cold open, a mid-chapter beat, the callback. Coordinate them in
the bible so they rhyme rather than repeat.

## The template — 12 movements + front/back matter
Each movement: a job + a pedagogical reason + a word budget. Total ≈ 16–20k words (deep). Every movement
ends with a soft bridge to the next (except §11). See `TEMPLATE.md` for the full analysis.

- **Front:** frontmatter (title, subtitle, series, voice_credit, lang, epigraph, epigraph_source) +
  epigraph + `::: map` one-page map (advance organizer: model-in-one-sentence · core question · use-when
  · breaks-when · related models).
- **§0 Cánh cửa** (~1200) — cold open: a vivid concrete scene that *shows* the problem before naming the
  model. Curiosity gap. Name the model only at the last line.
- **§1 Mô hình trong một câu** (~950) — the crisp essence + the one-liner to remember; unpack each word.
  `::: key`.
- **§2 Vấn đề nó giải quyết** (~1250) — why the default mind gets this wrong; the cost; one painful example.
- **§3 Giải phẫu mô hình** (~2500) — the rigorous mechanism, built piece by piece; the **core diagram/
  table** lives here (`::: figure`). `::: key`.
- **§4 Nguồn cội** (~1500) — who built it, the cross-disciplinary lineage, the rigorous-vs-pop version.
- **§5 Nhìn bằng mô hình** (~2500) — 3–4 worked examples across *different* domains (the transfer engine);
  ≥1 Vietnamese-resonant. Each: situation → apply lens → what you now see.
- **§6 Khi nào nó gãy** (~1500) — domain of validity, failure modes, steelmanned critique + honest reply.
  `::: pitfall`.
- **§7 Mạng lưới** (~1400) — relations to adjacent models (Munger's latticework); what it's mistaken for.
- **§8 Bẫy & ngộ nhận** (~1250) — named misconceptions + corrections. `::: pitfall`.
- **§9 Thực hành** (~1600) — exercises, a checklist, a 7-day protocol. The reader *does* something.
  `::: exercise` (≥1).
- **§10 Bậc thầy nghĩ gì** (~1200) — internalized, nuanced use; when to trust the model, when to drop it.
- **§11 Đọng lại** (~950) — the closing: call back the cold open, a final re-frame, a line worth carving.
- **Back:** `::: fieldcard` (one-line · use-when · steps · warning · 5 diagnostic questions) · Thuật ngữ
  (glossary VN/EN) · Đọc thêm / Nguồn (sources keyed to `<sup>n</sup>`).

## Visual boxes (renderer syntax)
Fenced blocks become Claude-styled boxes; everything else is plain Markdown.
```
::: key        → "CỐT LÕI"            ::: pitfall   → "CẠM BẪY"
::: exercise   → "THỬ NGAY"           ::: map       → "BẢN ĐỒ MỘT TRANG" (own page)
::: fieldcard  → "SỔ TAY" (own page)  ::: figure    → bảng/sơ đồ          ::: quote → pull-quote
…inner markdown…
:::
```
Footnotes: `<sup>1</sup>` keyed to the Sources list. Use boxes where they earn their place — don't litter.

## Pipeline
### 1. Resolve + scaffold
Slugify the model name. Make `.archives/Mental Models/<slug>/` and `<slug>/artifacts/` in the **MAIN repo
root** `.archives` (local-only), even inside a worktree.

### 2. Build + LOCK the bible (`artifacts/BIBLE.md`)
The single source of truth this run drafts against: **facts** (ground via `--research`/`--grounding`:
deep-research skill + wiki_ask + deepask + gbrain + the model's primary sources — never fabricate;
hedge when unsure; quotes ≤25 words) · **locked Vietnamese terminology** (one canonical VN gloss per
key term, used identically throughout) · **voice spec** (the blend + a backbone metaphor) · **per-movement
briefs** (the specific facts/examples each movement must hit, word budget, boxes, adjacency summaries).
Accuracy is the #1 service-quality bar (a wrong claim fails both the reader and the brand). **Lock it.**
If `--dry-run`: present bible outline + plan + cost, stop.

### 3. Draft (parallel-blind longform — a Claude Code Workflow)
Fan out **one agent per movement**, each reading ONLY the bible + its brief + adjacent-movement summaries
(never peer drafts — the bible is the only shared state). Each drafts its movement in Vietnamese in the
blend voice, to budget, with its boxes, returning only the `## <title>` markdown. (Reference workflow:
`mm-aqal-draft` — embed the bible + per-section briefs as constants; `effort: high`.) Heavy run → raise
`--max-cost-usd`.

### 4. Synthesize (+ mandatory master-editor pass)
Assemble movements in order. Continuity pass (terminology identical, backbone metaphor consistent,
handoffs land, no two movements contradict). Then a **mandatory master-editor pass** (a parallel
one-agent-per-movement Workflow, constrained: cut em-dash density to ≲1/paragraph, fix typos, lightly
sharpen — change nothing else; preserve every idea + box + table; reference: `mm-aqal-polish`). Run the
**humanize gate** `node scripts/write/humanize/scan.cjs <slug>.md --context=general` — drive
`ai_smell_score` to 0 AND the `em_dash_overuse` count toward zero; rewrite flagged spots; record
before→after. Then author the **front matter** (frontmatter + epigraph + `::: map`) and **back matter**
(`::: fieldcard` + glossary + sources) yourself for accuracy. Write the final chapter to `<slug>.md`
with YAML frontmatter (title, subtitle, series="MÔ HÌNH TƯ DUY", voice_credit, lang, epigraph,
epigraph_source). **Close every `:::` block and the `---` frontmatter** — an unclosed block leaks into
the body.

### 5. Render (Claude book — EPUB + PDF)
```bash
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib /opt/anaconda3/bin/python3 \
  scripts/mm/render.py "<dir>/<slug>.md" --out=epub+pdf --style=claude \
  --out-dir="<dir>" --name="<slug>" --repo-root=/Users/doanchienthang/ritsu-works
```
The renderer reuses the Claude design tokens (`scripts/translate/design.py`) + the Vietnamese-complete
Source Serif 4 / Inter fonts (`runtime/translate/fonts/`; if missing, run
`python scripts/translate/fonts.py runtime/translate/fonts`). It builds original-work book framing (clay
cover, epigraph, one-page map, callout boxes, field card) — no translation chrome. Visually verify by
reading the PDF.

### 6. Quality loop (the point — until "đẳng cấp cao nhất")
Read the rendered chapter as a reader. Score against `RUBRIC.md`. For every weakness: improve the bible /
the movement briefs / the voice notes, then rewrite the weak movements (re-run the Workflow with edits)
and re-render. Iterate until a novice is transformed, an expert nods, the one-liner sticks, it reads like
a legendary master, and it's beautiful enough to keep. The gate is the floor, not the goal.

### 7. Report
`{ ok, model, slug, lang, words, movements, humanize:{before,after,pass}, files:[epub,pdf,md], score,
artifacts_dir, warnings[] }`. Show the one-page map + a sample movement inline, then the file paths.

## Governance
Tier A (reversible local writes, metered, capped). Drafting/humanize = in-session (subscription);
`--research=deep` + `/image`/`/dataviz` enrichment = out-of-band, each breaker-capped; `--max-cost-usd`
(default 3.00) is the overall guard. Output only to `.archives/` (local-only). Cost-bucket `ai-ops-write`.
Subcommands `template|authors|rubric` are read-only (print the `_system` docs).
