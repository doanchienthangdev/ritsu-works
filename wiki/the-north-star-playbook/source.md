---
type: book
slug: the-north-star-playbook
title: The North Star Playbook — The guide to discovering your product’s North Star
authors:
  - Amplitude, Inc.
  - John Cutler
  - Ibrahim Bashir
publisher: Amplitude, Inc.
published: 2024
source_kind: book
source_ref: raw/the-north-star-playbook.pdf
source_hash: 7c2a25e550d76901ff29bb3e84a1ec83d87cdb3c0d89fef77c0c9bd1748944ed
license_status: copyrighted_internal_only
rights_notice: ©2024 Amplitude, Inc. All rights reserved. Freely-distributed practitioner resource; INTERNAL USE ONLY in this repo — attribution-watcher fires Tier B when ≥3 observations from this source contribute to an external content draft.
split_mode: toc
chapters_count: 8
pdf_pages_total: 63
ingestion_job_id: 44ba5f97-bc89-4166-a480-df5babad53aa
extracted_from_source_id: null
generated_by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02)
ingested_at: 2026-06-02
---

<!-- generated-by: wiki-sync v4.0 (Claude-walked, distill mode, autonomous batch 2026-06-02) -->

# The North Star Playbook — The guide to discovering your product’s North Star

**Amplitude, Inc., John Cutler, Ibrahim Bashir · Amplitude, Inc. · 2024 · 63 pages (PDF)**

Amplitude’s practitioner guide to the **North Star Framework** — choosing a single **North Star Metric** (a leading indicator of sustainable, customer-value-driven growth), defining its input metrics, running the North Star statement exercise, troubleshooting common traps (gap thinking, vanity metrics, output-not-outcome), and operationalizing it across product squads. Directly relevant to Ritsu’s own north-star discipline (`00-core/north-star.md`: “100 paying who love”) and PLG activation instrumentation (`10-metrics/pmf-instrumentation`).

## License & attribution

©2024 Amplitude, Inc. All rights reserved. Freely-distributed practitioner resource; INTERNAL USE ONLY in this repo — attribution-watcher fires Tier B when ≥3 observations from this source contribute to an external content draft.

## How this entry was produced

Ingested via `/wiki sync raw/the-north-star-playbook.pdf` on 2026-06-02 (autonomous batch). Mode: v3.0/v4.0 distill+extract default. Split: `toc` (PDF bookmarks / printed table of contents). Adapter: pdf-adapter (pymupdf text layer).

Pipeline stages (per chapter):

1. **Extract** the chapter’s PDF page range via pymupdf `get_text`
2. **Split** by table-of-contents chapter boundaries (verbatim chapter projections under `chapters/`)
3. **Distill** each chapter into derived entities (concept / observation / decision / idea) — one subagent per chapter, Sonnet-class
4. **Verify** every raw quote as a normalized substring of its chapter text (hallucinated quotes are dropped before write)
5. **Cite** each derived entity via `ops.knowledge_extractions` (chapter → entity, with verbatim quote)
6. **Dedup** within-source by `(type, slug)`; multi-chapter citations merge into one entity page
7. **Embed** deferred (no `OPENAI_API_KEY` in worktree) — hourly `wiki-embeddings-backfill` cron backfills `ops.knowledge_embeddings`

## Chapters (auto-extracted, toc split)

0. [Introduction: Why should you read this playbook?](chapters/chapter-00-introduction-why-should-you-read-this-playboo.md) (PDF pp. 4–5)
1. [Chapter 1 — About the North Star Framework](chapters/chapter-01-about-the-north-star-framework.md) (PDF pp. 6–13)
2. [Chapter 2 — The North Star checklist and statement exercise](chapters/chapter-02-the-north-star-checklist-and-statement-exerci.md) (PDF pp. 14–22)
3. [Chapter 3 — Get specific: defining your North Star](chapters/chapter-03-get-specific-defining-your-north-star.md) (PDF pp. 23–33)
4. [Chapter 4 — Troubleshooting: fixing issues and avoiding traps](chapters/chapter-04-troubleshooting-fixing-issues-and-avoiding-tr.md) (PDF pp. 34–42)
5. [Chapter 5 — Making the North Star Framework stick and changing your North Star](chapters/chapter-05-making-the-north-star-framework-stick-and-cha.md) (PDF pp. 43–47)
6. [Chapter 6 — Putting your North Star into action](chapters/chapter-06-putting-your-north-star-into-action.md) (PDF pp. 48–58)
7. [Chapter 7 — Reap the benefits of the North Star Framework](chapters/chapter-07-reap-the-benefits-of-the-north-star-framework.md) (PDF pp. 59–63)

## Entities distilled from this source

Derived entities live under:

- `concepts/` — frameworks + definitional terms
- `observations/` — empirical claims / case-study results (attributed)
- `decisions/` — actionable strategic rulings the source recommends
- `ideas/` — generative prompts tied to Ritsu’s situation

## Source artifact

Local-only (in `raw/`, not synced): `raw/the-north-star-playbook.pdf` · sha256 `7c2a25e550d7…748944ed` · 63 pages.
