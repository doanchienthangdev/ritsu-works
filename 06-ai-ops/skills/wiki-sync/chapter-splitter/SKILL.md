---
name: wiki-sync/chapter-splitter
description: |
  STUB (Sprint 1) — placeholder for chapter/part-splitting of oversized refs.
  Real implementation in Sprint 2: TOC detection + per-chapter ingestion_jobs
  rows + wiki sub-folder layout `wiki/books/<slug>/chapter-NN.md`.
---

# wiki-sync / chapter-splitter (STUB — Sprint 2)

This file is a placeholder so `wiki-sync/ingest/SKILL.md`'s Step 5 reference
resolves. Sprint 1 ingest path skips chapter splitting (returns "split not yet
implemented" when threshold tripped).

## When implemented (Sprint 2)

Per spec.md § Sprint 2:
- Triggered when PDF > 100 pages OR Markdown > 25 KB OR `--split` flag
- Modes:
  - `--split=toc` — use PDF bookmarks / Markdown TOC (default if available)
  - `--split=count=N` — split into N equal parts
  - `--split=heading=h2` — split per H2 (Markdown / extracted text)
- Each chapter → its own `ops.ingestion_jobs` row with `parent_job_id`
- Each chapter wiki page: `wiki/books/<slug>/chapter-NN-<chapter-slug>.md`
- All chapter rows: `page_type='book'` (no new page_type enum needed — verified Phase 3)

## Sprint 1 behaviour

When `wiki-sync/ingest` Step 5 detects threshold OR `split_mode` was passed:

```
Chapter splitting not yet implemented (Sprint 2 ETA).
For now, ingesting as single page. You can split manually by:
1. Running PDF→text via pymupdf
2. Splitting at chapter boundaries
3. Storing pieces in raw/<topic>/chapters/<NN>-<title>.md
4. Running /wiki sync on each separately
```

## Related

- Parent: `06-ai-ops/skills/wiki-sync/ingest/SKILL.md` (Step 5)
- Triggers: PDF page count via pdf-adapter; Markdown char count via markdown-adapter
- Wiki layout (when split): `wiki/books/<slug>/chapter-NN.md`
