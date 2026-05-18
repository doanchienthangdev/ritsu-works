---
name: wiki-sync/chapter-splitter
description: |
  Splits oversized refs (PDFs > 100 pages, Markdown > 25 KB, or any ref with
  explicit --split flag) into per-chapter child ingestion_jobs rows + per-chapter
  wiki pages under wiki/<book-slug>/chapters/ (v4.0 source-grouped layout). Modes: toc (PDF bookmarks /
  Markdown TOC, default when available), count=N (equal parts), heading=h2.
  Each chapter is its own knowledge_pages row with page_type='book' and slug
  '<book-slug>__chapter-NN-<chapter-slug>'. Uses ops.ingestion_jobs.parent_job_id
  (ON DELETE CASCADE) to link chapter children to the parent book ingestion.
---

# wiki-sync / chapter-splitter (Sprint 2 baseline — v2.0.0)

## When this skill runs

Dispatched by `wiki-sync/ingest` Step 5 when ANY of the following is true:
- `path` ends in `.pdf` AND `pdf-adapter` reports `pages_or_size_metric > 100`
- `path` ends in `.md` or `.markdown` AND file size > 25 KB
- Founder passed `--split=<mode>` flag explicitly via `/wiki sync` command

This skill does NOT run for files under the thresholds AND without explicit
flag — small files ingest as single pages.

## Inputs (from caller — `wiki-sync/ingest`)

- `parent_job_id` — the `ops.ingestion_jobs` row UUID for the parent book/file
- `book_slug` — derived slug for the parent (e.g., `make-it-stick`)
- `raw_text` — full extracted text (from pdf-adapter or markdown-adapter)
- `pages_or_size_metric` — page count (PDF) or byte size (Markdown)
- `split_mode` — explicit `toc | count=N | heading=h2 | null` (null = pick default)
- `source_kind` — `book` (PDF) or `markdown_passthrough` (large MD)
- `source_ref`, `source_hash` — passed through for child rows

## Process

### Step 1 — Resolve split mode

If `split_mode == null`, founder is prompted via `AskUserQuestion`:
```
Split <book_slug> (<N> pages) into chapters?
  [a] toc      — use PDF bookmarks / MD headings (DEFAULT if bookmarks exist)
  [b] count=N  — equal parts (founder picks N)
  [c] heading=h2 — split per H2 heading
  [d] no split — ingest as single page (overrides threshold trigger)
```

If founder picks `(d)`, return `{split: false}` to caller; caller proceeds with
single-page ingest.

### Step 2 — Detect chapter boundaries

#### Mode `toc`

**For PDF:**
1. Use `pymupdf.open(path).get_toc()` to retrieve bookmark tree.
2. Filter to depth ≤ 2 (chapters; deeper = sections, ignored).
3. If TOC is empty → log warning, fall back to `heading=h2` mode.
4. Each TOC entry → `(chapter_index, chapter_title, start_page, end_page)`.

**For Markdown:**
1. Scan for `## ` H2 lines (regex `^## (.+)$`).
2. Each H2 → start of new chapter; preceding H1 frontmatter → chapter 0 if non-empty.
3. If no H2 headings → fall back to `count=N` with N=4 (founder confirms).

#### Mode `count=N`

Validate N ≥ 2 and N ≤ 50. Bail if outside range.

**For PDF:**
- `chapter_pages = ceil(pages / N)`.
- Slice `pages = [chapter_i * chapter_pages .. (chapter_i+1) * chapter_pages)` for each chapter.

**For Markdown:**
- `chapter_bytes = ceil(size / N)`.
- Slice raw_text into N approximately-equal chunks, snapping to nearest newline boundary so no paragraph splits mid-line.

#### Mode `heading=h2`

Both PDF (after extraction) and Markdown — same as `toc` mode's MD path:
regex `^## (.+)$` boundary detection.

### Step 3 — Generate chapter slugs

For each chapter (1-indexed):
```
chapter_slug_raw = kebab-case(chapter_title) | "untitled"
chapter_slug_capped = chapter_slug_raw.substring(0, 40)  // 40-char cap
NN = zero-pad chapter_index, 2 digits  // 01, 02, ... 99
final_slug = `${book_slug}__chapter-${NN}-${chapter_slug_capped}`
```

Slug discipline (v2.0 — per ops.decisions hybrid B/A):
- Global UNIQUE namespace shared with all other knowledge_pages slugs
- Pre-check: if `final_slug` already exists in `ops.knowledge_pages`, abort with
  conflict error (founder resolves via `--force` flag or manual rename)

### Step 4 — Acquire advisory locks

For each chapter slug, acquire `ops.wiki_sync_lock('book', final_slug)`. Hold
all locks until all chapter rows committed. If any lock acquire blocks > 30s →
abort the entire batch (rollback inserted child rows).

### Step 5 — INSERT child ingestion_jobs rows

For each chapter, in deterministic order (chapter_index ASC):

```sql
INSERT INTO ops.ingestion_jobs (
  source_kind, source_ref, source_hash, content_hash, state,
  current_step, parent_job_id, attribution, metadata
) VALUES (
  $source_kind, $source_ref, $source_hash,
  sha256($chapter_text),   -- content_hash differs per chapter
  'processing', 'chapter_split',
  $parent_job_id,           -- v2.0 migration 00030 column
  jsonb_build_object('chapter_index', $chapter_index, 'chapter_title', $chapter_title),
  jsonb_build_object('mode', $split_mode, 'pages', $chapter_pages, 'bytes', $chapter_bytes)
) RETURNING id;
```

Note: `source_hash` is the SAME across all chapters (it's the parent file's
hash). The dedup UNIQUE partial index from migration 00027 is keyed on
`source_hash` for active states — since this is a single batch, we acquire all
rows in one transaction so the partial UNIQUE applies to the FINAL state
('completed'), not the intermediate 'processing'. If batch fails, rollback
clears all rows.

**Important:** content_hash MUST differ per chapter (sha256 of chapter text)
so the second UNIQUE partial index (`idx_ingestion_dedup_content_unique`) does
not flag duplicates within the batch.

### Step 6 — Per-chapter delegation

For each chapter row, delegate back to `wiki-sync/ingest` Steps 6-9 (extract +
link-extract + embed + write wiki + emit events + cost). Each chapter becomes
its own:
- `ops.knowledge_pages` row with `page_type='book'`, `slug=<final_slug>`,
  `file_path='wiki/<book-slug>/chapters/chapter-NN-<chapter-slug>.md'` (v4.0 source-grouped: chapters live under their parent book's package),
  `frontmatter.chapter_of=<book_slug>`, `frontmatter.chapter_index=<NN>`
- `ops.knowledge_links` rows (extracted from chapter content)
- `ops.knowledge_embeddings` chunks (or `embeddings_deferred=true` per G3)
- `ops.events` row (`ritsu.wiki.synced` per chapter)

Wiki file layout (v4.0 source-grouped — chapters nest inside their parent book's package alongside source.md and any derived entity folders):
```
wiki/<book-slug>/
  source.md                        # parent book RECORD page (replaces v3.0 index.md role; auto-lists chapters via "Entities distilled from this source" section)
  chapters/
    chapter-01-<title-slug>.md
    chapter-02-<title-slug>.md
    ...
    chapter-NN-<title-slug>.md
  concepts/                        # derived entities extracted across all chapters (if distill ran)
  observations/
  decisions/
  ideas/
```

Frontmatter of each chapter wiki file:
```yaml
---
type: book
slug: <book-slug>__chapter-NN-<chapter-slug>
title: <chapter_title>
parent_book: <book-slug>
chapter_index: <NN>
chapter_of_pages_or_size: <pages_or_size_metric>
source_kind: <source_kind>
source_ref: <source_ref>
source_hash: <source_hash>
chapter_content_hash: <sha256 of this chapter's text>
ingested_at: <ts>
generated_by: wiki-sync v2.0 chapter-splitter
---

<!-- generated-by: wiki-sync v2.0 chapter-splitter -->

# <chapter_title>

<chapter_text>
```

### Step 7 — Update parent ingestion_jobs row

After all chapters succeed, the caller (wiki-sync/ingest) updates the PARENT
ingestion_jobs row:
- `state = 'completed'`
- `current_step = 'split_complete'`
- `metadata = metadata || jsonb_build_object('chapters_count', N, 'split_mode', $mode)`
- `total_cost_usd = SUM(child total_cost_usd) + parent extract cost`

v4.0 source-grouped layout: the parent book gets its standard source RECORD page at `wiki/<book-slug>/source.md` (created by the pdf-adapter / markdown-adapter as it would for any source). The parent `knowledge_pages` row has `page_type='book'`, `slug=<book-slug>`, `file_path='wiki/<book-slug>/source.md'`. The chapter list appears as part of the auto-generated "Entities distilled from this source" section inside `source.md` (per spec.md §3 B3) — no separate index.md page is generated. The chapters in `wiki/<book-slug>/chapters/` are discoverable from `/wiki ask` via either the parent source.md's chapter list or directly via link-extractor `[[book/<book-slug>__chapter-NN-<slug>]]` references resolving into the chapters folder.

### Step 8 — Source RECORD chapter-list section (v4.0)

The parent book's `wiki/<book-slug>/source.md` page (created by the pdf-adapter / markdown-adapter as the source RECORD) has its body augmented with an auto-generated "Chapters" section (under the same "Entities distilled from this source" umbrella per spec §3 B3):

```markdown
## Chapters (auto-extracted, <split_mode>)

1. [Chapter 01 — <title>](chapters/chapter-01-<slug>.md)
2. [Chapter 02 — <title>](chapters/chapter-02-<slug>.md)
...
N. [Chapter NN — <title>](chapters/chapter-NN-<slug>.md)
```

This section lives INSIDE the parent source RECORD page; no separate index.md is generated in v4.0. The parent `knowledge_pages.slug` is `<book-slug>` (NOT prefixed), which keeps it discoverable from `/wiki ask` and `[[book/<book-slug>]]` references.

## Outputs

Returns to caller (`wiki-sync/ingest`):

```jsonc
{
  "split": true,
  "split_mode": "toc",
  "chapters_count": N,
  "child_ingestion_job_ids": ["<uuid>", "<uuid>", ...],
  "child_knowledge_page_ids": ["<uuid>", "<uuid>", ...],
  "book_source_page_id": "<uuid>",   // v4.0: the parent source RECORD page (replaces v3.0 book_index_page_id role)
  "wiki_source_path": "wiki/<book-slug>/source.md",   // v4.0: parent source RECORD with auto-listed chapters (replaces v3.0 wiki_index_path)
  "wiki_chapter_paths": ["wiki/<book-slug>/chapters/chapter-01-...md", ...],
  "total_cost_usd": <sum across children>,
  "errors_per_chapter": []   // [] if clean; objects { chapter_index, error } otherwise
}
```

## HITL

- Tier A if `split_mode` was passed via flag OR threshold-triggered with default `toc`
- Tier B (founder confirms via AskUserQuestion) if:
  - TOC mode requested but bookmarks empty → propose heading=h2 fallback
  - Markdown has no H2 → propose count=4 fallback
  - Estimated total cost > $1.50 (per-task-kind cap `wiki-ingest-pdf` × 1.5)

## Failure modes

| Symptom | Response |
|---|---|
| TOC empty | Warn + fall back to heading=h2 (Tier B confirm if interactive) |
| heading=h2 finds 0 headings | Warn + fall back to count=4 (Tier B confirm) |
| count=N with N<2 or N>50 | Bail with clear error message |
| Slug conflict on chapter row | Bail entire batch; founder can `--force` or rename book_slug |
| Lock acquire times out (>30s) | Bail; release locks; surface concurrent-write conflict |
| Some chapter rows succeed, some fail | Rollback all (transactional batch); parent stays in 'processing' |
| Cost estimate > Tier B threshold | Surface to founder; await approval before proceeding |

## Cost estimate

| Source | Chapters | Per-chapter cost | Total |
|---|---|---|---|
| 200-page PDF (toc mode) | ~15 chapters | $0.04 extract + $0.005 embed = $0.045 | ~$0.70 |
| 500-page PDF (toc mode) | ~25 chapters | same | ~$1.15 |
| 50 KB Markdown (heading=h2) | ~10 chapters | $0.01 + $0.005 = $0.015 | ~$0.15 |

Per-task-kind cap from `knowledge/economic-architecture.md`:
- `wiki-ingest-pdf`: $1.00 / invocation (parent cost; chapter children don't double-bill since they share source_hash)
- `wiki-ingest-folder`: $2.00 / invocation (when folder-adapter calls chapter-splitter on a PDF inside it)

## Slug discipline reminder

Per v2.0 hybrid B/A decision (NO `(page_type, slug)` UNIQUE relax — that's v2.1):
- Chapter slugs `<book-slug>__chapter-NN-<chapter-slug>` are GLOBAL UNIQUE
- The book-level index slug `<book-slug>` is also GLOBAL UNIQUE
- These two SHARE the global slug namespace. If `<book-slug>` collides with an
  existing knowledge_pages slug (e.g., a concept named the same), the founder
  must rename the book_slug — chapter-splitter abort.
- v2.1 may relax to `(page_type, slug)` UNIQUE; trigger conditions in
  `wiki/capabilities/wiki-sync-from-refs/spec.md` v2 §0.

## Sprint scope (this skill)

Sprint 2 (v2.0.0):
- All 3 modes (toc, count, heading) implemented in PROSE for Claude-walked execution
- TOC fallback to heading=h2 when bookmarks empty
- heading=h2 fallback to count=4 when no H2 found
- Slug discipline + global UNIQUE pre-check
- Per-chapter delegation back to `wiki-sync/ingest` Steps 6-9
- Book-level index page generation

Deferred to Sprint 2 PR3+ (per sprint-plan.md):
- `scripts/wiki-sync/ingest.cjs` CLI helper for deterministic per-chapter work
- `tests/wiki-sync/fixtures/sample-large.pdf` — copyright-clear ≥ 100-page test fixture
- `tests/wiki-sync/chapter-splitter.test.ts` — round-trip test against the fixture

Deferred to Sprint 4:
- OCR fallback for scanned PDFs (when text-layer empty > 30% pages)
- LLM-assisted chapter boundary detection (when TOC + headings both fail)

## Related

- Parent: `06-ai-ops/skills/wiki-sync/ingest/SKILL.md` Step 5
- Triggers from: `06-ai-ops/skills/wiki-sync/adapters/pdf-adapter/SKILL.md` (pages > 100)
                 `06-ai-ops/skills/wiki-sync/adapters/markdown-adapter/SKILL.md` (size > 25 KB)
- Sister: `06-ai-ops/skills/wiki-sync/adapters/folder-adapter/SKILL.md` (Sprint 2 PR3+; uses same parent_job_id mechanism)
- Schema: `supabase/migrations/00030_wiki_sync_v2_schema_deltas.sql` Block C (`parent_job_id` column)
- Decision: `ops.decisions[fff2bf7c-efeb-4169-b430-8139ad4d4de3]` — Hybrid B/A
