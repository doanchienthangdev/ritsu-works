---
name: wiki-sync/adapters/folder-adapter
description: |
  Folder = collection adapter (Sprint 2 PR3, capability v2.0.0). When /wiki sync
  is invoked with a directory path, iterates the directory's files alphabetically
  and dispatches each to its matching sibling adapter (markdown/pdf/url/youtube/
  meeting). Children inherit page_type from each file's frontmatter (per Hybrid
  B/A: NO new 'collection' page_type). Slug discipline:
  `<col-slug>__<file-slug>` global UNIQUE. Flat-only in v2.0; recursive
  subdirectories refused. Parent/child wired via ops.ingestion_jobs.parent_job_id
  (migration 00030 Block C, CASCADE).
---

# wiki-sync / adapters / folder-adapter (Sprint 2 PR3 baseline — v2.0.0)

## When this adapter runs

Dispatched by `wiki-sync/ingest` Step 1 when `<path>` arg to `/wiki sync` is a
directory (i.e. `fs.statSync(path).isDirectory() === true`). The other 5
adapters all require single files; this is the ONLY adapter that consumes
directory input.

source_kind: `folder_collection`
entity_type for children: derived per-file (each file's adapter decides)
wiki target for children: `wiki/<col-slug>/<child-slug>/source.md` (v4.0 source-grouped layout — drops the `<col-slug>__<file-slug>` flat-slug pattern; each child lands at a clean nested package path under the collection's slug)

## Inputs

- `path` — absolute path to a directory under `raw/<topic>/<folder>/`
- `entity_type_override` — optional; if passed, forces ALL children to that page_type
- `force` — bool; passed through to each child ingestion

## Process

### Step 1 — Validate input

- Path exists? Else bail with clear error.
- Is a directory? Else delegate back to ingest (single-file path).
- Contains at least 1 file (after filtering)? Else bail "empty collection".
- NO subdirectories present? Else bail with v2.0 refuse-recursive error:
  ```
  Recursive folder ingestion is deferred to v2.1.
  Found subdirectories under <path>: <list>.
  Workaround: flatten the input, OR run /wiki sync on each subdirectory
  separately (each becomes its own collection).
  ```

### Step 2 — Derive collection slug

- `col_slug = kebab-case(basename(path))`
- Cap at 40 chars
- Sanity check: must match `^[a-z0-9][a-z0-9-]*[a-z0-9]$` regex
- If `col_slug` already exists in `ops.knowledge_pages` (any page_type), warn:
  ```
  Slug '<col_slug>' already used. Children will be created as
  `<col_slug>__<file-slug>` which is still globally unique, but
  the collection itself has no own page. Continue? [Tier B confirm]
  ```

### Step 3 — Enumerate files

- `files = readdirSync(path).filter(f => !f.startsWith('.'))` — skip hidden files
- Sort alphabetically (default; future v2.1 may support manual ordering via INDEX.md)
- Filter by supported extensions:
  - `.md`, `.markdown` → markdown-adapter
  - `.pdf` → pdf-adapter
  - `.vtt`, `.srt`, `.txt` (if under `raw/meetings/`) → meeting-adapter
  - Other extensions: include in summary as "skipped: unsupported extension"
- If zero supported files after filter → bail "no supported files in collection"

### Step 4 — Create parent ingestion_jobs row

```sql
INSERT INTO ops.ingestion_jobs (
  source_kind, source_ref, source_hash, state, current_step,
  attribution, metadata
) VALUES (
  'folder_collection',
  $path,
  sha256(concat-of-all-child-source-hashes),
  'processing',
  'folder_dispatch',
  jsonb_build_object('col_slug', $col_slug, 'files_count', $N),
  jsonb_build_object(
    'supported_files', $supported_array,
    'skipped_files', $skipped_array,
    'recursive_check', 'passed'
  )
) RETURNING id;  -- this is parent_job_id for all children
```

### Step 5 — Per-file dispatch (alphabetical order)

For each supported file:

1. Resolve adapter from extension
2. Compute file's slug: `child_slug = derived-from-frontmatter-or-filename`
3. v4.0 source-grouped path: child source RECORD lands at `wiki/<col_slug>/<child_slug>/source.md`. The child's slug field in `knowledge_pages` is `child_slug` (NOT prefixed); uniqueness is enforced by the composite `(extracted_from_source_id, slug)` rule + the global slug uniqueness on source RECORDs scoped to the path. For derived entities under the child, the source-grouped path naturally namespaces them per package.
4. Pre-check: scope by package path — `SELECT 1 FROM ops.knowledge_pages WHERE file_path = 'wiki/<col_slug>/<child_slug>/source.md'`. If exists, log error + continue (partial-failure semantics).
5. Acquire `ops.wiki_sync_lock(<file-page-type>, '<col_slug>/<child_slug>')`. Release at COMMIT.
6. Invoke the sibling adapter normally, but inject:
   - `parent_job_id = <parent_id>` (from Step 4) — added to the child's `ingestion_jobs` row
   - `path_override = wiki/<col_slug>/<child_slug>/source.md` — bypasses adapter's default path derivation (v4.0 replaces v3.0's `slug_override = <col_slug>__<file_slug>` pattern)
7. The adapter returns its normal outputs; ingest's Steps 6-9 run per child as usual.

### Step 6 — Per-file results tally

Build summary table:

| # | File | Adapter | Status | Slug | Cost |
|---|---|---|---|---|---|
| 1 | attention.md | markdown | ✓ | papers/attention | $0.03 |
| 2 | cot.md | markdown | ✓ | papers/cot | $0.03 |
| 3 | react.pdf | pdf | ✗ slug conflict | papers/react | $0.00 |
| 4 | notes.docx | — | skipped: unsupported | — | — |

### Step 6b — Cross-paper concept aggregation (v3.0 — distill mode only)

If `wiki_sync_distill_enabled = true` AND `--verbatim` flag absent: after ALL files in the folder have completed individual distill (Step 5 per-file dispatch finishes), invoke `wiki-sync/dedup` skill with:

```
corpus_scope: "folder_aggregation"
derived_entity_ids: <union of all derived_entity_ids from per-file distill runs>
```

Dedup skill (Sprint 3, see `06-ai-ops/skills/wiki-sync/dedup/SKILL.md` Step 4):
- Groups derived entities by `(page_type, slug)` across ALL files
- v4.0 source-grouped layout flips the default: each derived entity lives in its own source package (composite UNIQUE `(extracted_from_source_id, slug)` allows same slug across sources). So "PLG" concept extracted from 10 papers in the folder produces 10 distinct pages: `wiki/papers/<paper-1>/concepts/plg.md`, ..., `wiki/papers/<paper-10>/concepts/plg.md` — each preserves its source's framing. The reverse-lookup aggregate lives at `wiki/_index/concept/plg.md` (link-list pointing to all 10 packages; regenerated by `wiki-sync/index-rebuild`), NOT a canonical entity page.
- For `page_type IN ('observation', 'decision', 'idea')`: same per-source treatment (observations cite specific paper claims; decisions reflect per-source framework rulings — unchanged from v3.0 intent, now natively expressed by the source-grouped layout).
- `/wiki merge` is OPT-IN if the founder later wants to consolidate same-slug entities across sources into a single canonical page (changes ONE concept's per-source split into one shared concept — see `wiki-sync/merge` SKILL).

Cost: ~$0.30 cap per folder (wiki-dedup-batch task_kind).

Per spec A7: this aggregation is the headline value of folder ingest — without it, a 10-paper growth corpus produces 50+ duplicate concept pages. With it, the founder gets a clean concept graph with multi-source provenance.

### Step 7 — Update parent ingestion_jobs row

```sql
UPDATE ops.ingestion_jobs SET
  state = CASE WHEN $failed_count = 0 THEN 'completed' ELSE 'partial' END,
  current_step = 'folder_dispatch_done',
  total_cost_usd = $sum_of_child_costs,
  ingested_at = now(),
  metadata = metadata || jsonb_build_object(
    'succeeded_count', $succeeded,
    'failed_count', $failed,
    'skipped_count', $skipped,
    'results_table', $results_array
  )
WHERE id = $parent_id;
```

Note: `state = 'partial'` is NOT in the current `ops.ingestion_jobs.state` CHECK
allowlist (00007 declares `queued | fetching | processing | completed | failed |
duplicate | low_quality`). v2.0 PR3 should add `'partial'` to the allowlist via
a small ALTER CHECK in a follow-up migration OR map partial → completed with
metadata flag. **Disposition: map to `completed` with `metadata.has_partial_failures=true`**
to avoid yet another migration. CTO can revisit in Sprint 4 cleanup PR.

### Step 8 — Telegram heartbeat (per CTO NIT 1)

Two messages only (NOT per-file):
- Start: "Folder ingest started: <col_slug> (<N> files; <skipped_count> skipped). ETA ~<estimate>."
- End: "Folder ingest done: <succeeded>/<N> succeeded; <failed> failed; <skipped> skipped. Total cost $<sum>. <link to summary>."

If `failed > 0`, end message tagged with ⚠️ icon.

## Outputs

Returns to caller (`wiki-sync/ingest`):

```jsonc
{
  "split": false,                       // folder is its own split unit; not chapter-split
  "is_folder": true,
  "col_slug": "papers",
  "parent_ingestion_job_id": "<uuid>",
  "files_total": N,
  "succeeded_count": K,
  "failed_count": F,
  "skipped_count": S,
  "child_ingestion_job_ids": [<uuids>],
  "child_knowledge_page_ids": [<uuids>],
  "child_wiki_paths": ["wiki/papers/attention/source.md", ...],   // v4.0 source-grouped: each child gets a package folder under <col-slug>/<child-slug>/
  "total_cost_usd": <sum>,
  "results_table": [{ file, adapter, status, slug, cost, error? }, ...]
}
```

## HITL

- Tier A normally
- Tier B if:
  - col_slug already exists in knowledge_pages (warn + confirm)
  - Estimated total cost > `wiki-ingest-folder` per-task-kind cap ($2.00 per `knowledge/economic-architecture.md`)
  - `failed_count > 0` at end of run → surface to founder for triage

## Failure modes

| Symptom | Response |
|---|---|
| Path doesn't exist | Bail with abs path in error |
| Path is a file, not dir | Delegate back to ingest single-file path |
| Subdirectory found | Bail with refuse-recursive error + workaround |
| Empty (after hidden-file filter) | Bail "empty collection" |
| 0 supported files | Bail "no supported files" |
| One file's ingest fails | Continue + log to results_table; `state = 'completed'` w/ `has_partial_failures=true` |
| All files fail | `state = 'failed'`; surface to founder |
| Slug conflict on a child | That child = "skipped: slug conflict"; continue with others |
| Concurrent /wiki sync on same folder | Lock acquired per child; whichever caller gets the parent's slug INSERT first wins; second caller gets dedup hit on parent's `source_hash` |

## Cost estimate

Per-task-kind cap: `wiki-ingest-folder` = $2.00 per `knowledge/economic-architecture.md`.

Realistic costs (mostly sum-of-children):
- Folder of 5 markdown files: ~$0.15 ($0.03 × 5 per markdown-adapter cost)
- Folder of 10 papers (URL articles): ~$0.70
- Folder of 3 PDFs (50pp each): ~$1.20-$1.50 (chapter-splitter may fire per PDF, multiplying cost)
- Folder of 50 markdown files: ~$1.50 (~cap; founder confirms via Tier B)

## Slug discipline (v4.0 source-grouped)

Per Hybrid B/A Tier C decision + v4.0 source-grouped layout flip:
- v2.0/v3.0 used global UNIQUE `<col-slug>__<file-slug>` flat slugs. v4.0 DROPS this pattern in favor of nested package paths.
- Each child source RECORD lives at `wiki/<col-slug>/<child-slug>/source.md`. The `knowledge_pages.slug` field stores `child-slug` (not the prefixed flat form); composite UNIQUE `(extracted_from_source_id, slug)` allows the same `child-slug` to legitimately appear across different collections (e.g., `attention` exists in both `wiki/papers/attention/source.md` AND `wiki/ml-survey/attention/source.md`).
- The COLLECTION ITSELF does NOT get its own knowledge_pages row in v2.0/v4.0
  (the folder-adapter's parent ingestion_jobs row is the only "collection" record)
- v2.1 may add a collection-index page (similar to chapter-splitter's chapters index for books)
  + the `'collection'` page_type enum value
- Founder can discover children via `[[<file-page-type>/<child-slug>]]` references resolved within the collection's package, or via the reverse-lookup `wiki/_index/` link-lists.

## Sprint scope (this skill)

Sprint 2 PR3 baseline:
- All 8 steps implemented in prose
- Markdown + PDF + meeting children supported (URL/YouTube are URL-based not file-based; folder-adapter intentionally does NOT recurse into URLs)
- Flat-only (no recursive subdirs)
- Skip hidden files; skip unsupported extensions silently with summary
- Telegram heartbeat: start + end only

Deferred to v2.1+:
- Recursive subdirectory support (becomes nested collections)
- Manual ordering via `INDEX.md` in folder
- `'collection'` page_type + auto-generated collection-index page
- `.gitignore` filter support (currently only hidden-file `.foo` is skipped)

## Related

- Parent: `06-ai-ops/skills/wiki-sync/ingest/SKILL.md` Step 1 (dispatch)
- Sibling adapters delegated to: `wiki-sync/adapters/{markdown,pdf,meeting}-adapter/`
- Schema: `supabase/migrations/00030_wiki_sync_v2_schema_deltas.sql` Block C (`parent_job_id`)
- Decision: `ops.decisions[fff2bf7c-efeb-4169-b430-8139ad4d4de3]` — Hybrid B/A
- Tier 1 config: `knowledge/ingestion-sources.yaml` entry `folder_collection`
- Economic cap: `knowledge/economic-architecture.md` task `wiki-ingest-folder`
