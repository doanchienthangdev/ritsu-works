---
type: book
slug: bulletproof-problem-solving
title: "Bulletproof Problem Solving: The One Skill That Changes Everything"
authors:
  - Charles Conn
  - Robert McLean
publisher: John Wiley & Sons, Inc.
published: 2018
source_kind: book
source_ref: raw/mckinsey/bulletproof-problem-solving.pdf
source_hash: 89f3a4d772ddfc221e4c9394933ed514ca96a20e98434eb263a760cde396d3ba
license_status: copyrighted_internal_only
rights_notice: Copyright © 2018 Charles Conn and Robert McLean / John Wiley & Sons. All rights reserved. INTERNAL USE ONLY — attribution-watcher fires Tier B when ≥3 observations from this source contribute to an external content draft.
split_mode: toc
chapters_count: 11
pdf_pages_total: 320
ingestion_job_id: c39fbd1e-95c0-493a-aa1a-f9be10848b82
extracted_from_source_id: null
generated_by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02)
ingested_at: 2026-06-02
---

<!-- generated-by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02) -->

# Bulletproof Problem Solving: The One Skill That Changes Everything

**Charles Conn, Robert McLean · John Wiley & Sons, Inc. · 2018 · 320 pages (PDF)**

Charles Conn & Robert McLean’s (ex-McKinsey) **seven-step problem-solving method**: (1) define the problem, (2) disaggregate with **logic trees**, (3) prioritize / prune, (4) build a workplan & team process, (5) conduct analyses (heuristics & rules of thumb), (6) bring in the “big guns” of analysis, (7) synthesize and tell a great story (one-day answer → **pyramid structure**). Extends to long-horizon / high-uncertainty and “wicked” problems. The structured-reasoning backbone behind Ritsu’s `/think` toolkit (`06-ai-ops/skills/thinking-toolkit/`).

## License & attribution

Copyright © 2018 Charles Conn and Robert McLean / John Wiley & Sons. All rights reserved. INTERNAL USE ONLY — attribution-watcher fires Tier B when ≥3 observations from this source contribute to an external content draft.

## How this entry was produced

Ingested via `/wiki sync raw/mckinsey/bulletproof-problem-solving.pdf` on 2026-06-02 (autonomous batch). Mode: v3.0/v4.0 distill+extract default. Split: `toc` (PDF bookmarks / printed table of contents). Adapter: pdf-adapter (pymupdf text layer).

Pipeline stages (per chapter):

1. **Extract** the chapter’s PDF page range via pymupdf `get_text`
2. **Split** by table-of-contents chapter boundaries (verbatim chapter projections under `chapters/`)
3. **Distill** each chapter into derived entities (concept / observation / decision / idea) — one subagent per chapter, Sonnet-class
4. **Verify** every raw quote as a normalized substring of its chapter text (hallucinated quotes are dropped before write)
5. **Cite** each derived entity via `ops.knowledge_extractions` (chapter → entity, with verbatim quote)
6. **Dedup** within-source by `(type, slug)`; multi-chapter citations merge into one entity page
7. **Embed** deferred (no `OPENAI_API_KEY` in worktree) — hourly `wiki-embeddings-backfill` cron backfills `ops.knowledge_embeddings`

## Chapters (auto-extracted, toc split)

0. [Introduction: Problem Solving for the Challenges of the Twenty-First Century](chapters/chapter-00-introduction-problem-solving-for-the-challeng.md) (PDF pp. 15–30)
1. [Chapter 1 — Learn the Bulletproof Problem Solving Approach](chapters/chapter-01-learn-the-bulletproof-problem-solving-approac.md) (PDF pp. 31–60)
2. [Chapter 2 — Define the Problem](chapters/chapter-02-define-the-problem.md) (PDF pp. 61–78)
3. [Chapter 3 — Problem Disaggregation and Prioritization](chapters/chapter-03-problem-disaggregation-and-prioritization.md) (PDF pp. 79–116)
4. [Chapter 4 — Build a Great Workplan and Team Processes](chapters/chapter-04-build-a-great-workplan-and-team-processes.md) (PDF pp. 117–140)
5. [Chapter 5 — Conduct Analyses](chapters/chapter-05-conduct-analyses.md) (PDF pp. 141–164)
6. [Chapter 6 — Big Guns of Analysis](chapters/chapter-06-big-guns-of-analysis.md) (PDF pp. 165–208)
7. [Chapter 7 — Synthesize Results and Tell a Great Story](chapters/chapter-07-synthesize-results-and-tell-a-great-story.md) (PDF pp. 209–224)
8. [Chapter 8 — Problem Solving with Long Time Frames and High Uncertainty](chapters/chapter-08-problem-solving-with-long-time-frames-and-hig.md) (PDF pp. 225–264)
9. [Chapter 9 — Wicked Problems](chapters/chapter-09-wicked-problems.md) (PDF pp. 265–282)
10. [Chapter 10 — Becoming a Great Problem Solver](chapters/chapter-10-becoming-a-great-problem-solver.md) (PDF pp. 283–288)

## Entities distilled from this source

Derived entities live under:

- `concepts/` — frameworks + definitional terms
- `observations/` — empirical claims / case-study results (attributed)
- `decisions/` — actionable strategic rulings the source recommends
- `ideas/` — generative prompts tied to Ritsu’s situation

## Source artifact

Local-only (in `raw/`, not synced): `raw/mckinsey/bulletproof-problem-solving.pdf` · sha256 `89f3a4d772dd…e396d3ba` · 320 pages.
