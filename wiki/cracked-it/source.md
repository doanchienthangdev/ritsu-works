---
type: book
slug: cracked-it
title: Cracked It! How to Solve Big Problems and Sell Solutions Like Top Strategy Consultants
authors:
  - Bernard Garrette
  - Corey Phelps
  - Olivier Sibony
publisher: Palgrave Macmillan (Springer)
published: 2018
source_kind: book
source_ref: raw/mckinsey/cracked-it.pdf
source_hash: 2910d4421f1de7d06f00777f93198f4047304d89ca3e69e4648816558880f464
license_status: copyrighted_internal_only
rights_notice: Copyright © 2018 The Author(s) (Bernard Garrette, Corey Phelps, Olivier Sibony) / Palgrave Macmillan. All rights reserved. INTERNAL USE ONLY — attribution-watcher fires Tier B when ≥3 observations from this source contribute to an external content draft.
split_mode: toc
chapters_count: 13
pdf_pages_total: 295
ingestion_job_id: 67f83c9d-1153-406e-971a-72eb20ad5715
extracted_from_source_id: null
generated_by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02)
ingested_at: 2026-06-02
---

<!-- generated-by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02) -->

# Cracked It! How to Solve Big Problems and Sell Solutions Like Top Strategy Consultants

**Bernard Garrette, Corey Phelps, Olivier Sibony · Palgrave Macmillan (Springer) · 2018 · 295 pages (PDF)**

Garrette, Phelps & Sibony’s **4S method** — **State, Structure, Solve, Sell** — for consultant-grade problem solving: **TOSCA** problem statements (Trouble, Owner, Success criteria, Constraints, Actors), hypothesis pyramids vs. issue trees, analytical frameworks, eight degrees of analysis, design-thinking for problem redefinition, and the **Pyramid Principle** for selling solutions. The direct source for Ritsu’s `/think tosca-problem-framing` + `/think pyramid-principle-output` + `/think mece-decomposition-check` skills.

## License & attribution

Copyright © 2018 The Author(s) (Bernard Garrette, Corey Phelps, Olivier Sibony) / Palgrave Macmillan. All rights reserved. INTERNAL USE ONLY — attribution-watcher fires Tier B when ≥3 observations from this source contribute to an external content draft.

## How this entry was produced

Ingested via `/wiki sync raw/mckinsey/cracked-it.pdf` on 2026-06-02 (autonomous batch). Mode: v3.0/v4.0 distill+extract default. Split: `toc` (PDF bookmarks / printed table of contents). Adapter: pdf-adapter (pymupdf text layer).

Pipeline stages (per chapter):

1. **Extract** the chapter’s PDF page range via pymupdf `get_text`
2. **Split** by table-of-contents chapter boundaries (verbatim chapter projections under `chapters/`)
3. **Distill** each chapter into derived entities (concept / observation / decision / idea) — one subagent per chapter, Sonnet-class
4. **Verify** every raw quote as a normalized substring of its chapter text (hallucinated quotes are dropped before write)
5. **Cite** each derived entity via `ops.knowledge_extractions` (chapter → entity, with verbatim quote)
6. **Dedup** within-source by `(type, slug)`; multi-chapter citations merge into one entity page
7. **Embed** deferred (no `OPENAI_API_KEY` in worktree) — hourly `wiki-embeddings-backfill` cron backfills `ops.knowledge_embeddings`

## Chapters (auto-extracted, toc split)

1. [Chapter 1 — The Most Important Skill You Never Learned](chapters/chapter-01-the-most-important-skill-you-never-learned.md) (PDF pp. 18–31)
2. [Chapter 2 — The Five Pitfalls of Problem Solving](chapters/chapter-02-the-five-pitfalls-of-problem-solving.md) (PDF pp. 32–51)
3. [Chapter 3 — The 4S Method](chapters/chapter-03-the-4s-method.md) (PDF pp. 52–69)
4. [Chapter 4 — State the Problem: The TOSCA Framework](chapters/chapter-04-state-the-problem-the-tosca-framework.md) (PDF pp. 70–85)
5. [Chapter 5 — Structure the Problem: Pyramids and Trees](chapters/chapter-05-structure-the-problem-pyramids-and-trees.md) (PDF pp. 86–110)
6. [Chapter 6 — Structure the Problem: Analytical Frameworks](chapters/chapter-06-structure-the-problem-analytical-frameworks.md) (PDF pp. 111–132)
7. [Chapter 7 — Solve the Problem: Eight Degrees of Analysis](chapters/chapter-07-solve-the-problem-eight-degrees-of-analysis.md) (PDF pp. 133–154)
8. [Chapter 8 — Redefine the Problem: The Design Thinking Path](chapters/chapter-08-redefine-the-problem-the-design-thinking-path.md) (PDF pp. 155–183)
9. [Chapter 9 — Structure and Solve the Problem Using Design Thinking](chapters/chapter-09-structure-and-solve-the-problem-using-design.md) (PDF pp. 184–210)
10. [Chapter 10 — Sell the Solution: Core Message and Storyline](chapters/chapter-10-sell-the-solution-core-message-and-storyline.md) (PDF pp. 211–235)
11. [Chapter 11 — Sell the Solution: Recommendation Report and Delivery](chapters/chapter-11-sell-the-solution-recommendation-report-and-d.md) (PDF pp. 236–262)
12. [Chapter 12 — The 4S Method in Action](chapters/chapter-12-the-4s-method-in-action.md) (PDF pp. 263–281)
13. [Chapter 13 — Conclusion: Becoming a Master Problem-Solver](chapters/chapter-13-conclusion-becoming-a-master-problem-solver.md) (PDF pp. 282–285)

## Entities distilled from this source

Derived entities live under:

- `concepts/` — frameworks + definitional terms
- `observations/` — empirical claims / case-study results (attributed)
- `decisions/` — actionable strategic rulings the source recommends
- `ideas/` — generative prompts tied to Ritsu’s situation

## Source artifact

Local-only (in `raw/`, not synced): `raw/mckinsey/cracked-it.pdf` · sha256 `2910d4421f1d…8880f464` · 295 pages.
