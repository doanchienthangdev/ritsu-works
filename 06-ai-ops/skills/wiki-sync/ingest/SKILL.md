---
name: wiki-sync/ingest
description: |
  Ingest verb of the wiki-sync capability. Implements SOP-INGEST-001's 6-step
  pipeline: fetch (via adapter) → dedup (against ops.ingestion_jobs) →
  acquire lock → optional chapter-split → extract entities → entity-link →
  embed → write wiki page. Single-source-of-truth contract: the ref is source,
  the wiki page is a re-derivable projection. Re-runs with same source_hash
  short-circuit on dedup unless --force.
---

# wiki-sync / ingest (Sprint 1 baseline)

## When to use

- Founder runs `/wiki sync <path>` → orchestrator dispatches here.
- `<path>` is either a local file under `raw/<entity_type>/<file>` or a URL.

## Inputs

- `path` — file path or URL
- `split_mode` — null | `toc` | `count=N` | `heading=h2` (defer to chapter-splitter)
- `force` — bool (default false; bypass dedup)
- `entity_type_override` — null | one of the 14 page_type enum values

## Process (6-step SOP-INGEST-001)

### Step 1 — Pick adapter

Read `knowledge/ingestion-sources.yaml`. Match `<path>` to one of the 6 adapters:

| Pattern | Adapter | source_kind |
|---|---|---|
| `<path>` is a directory | `wiki-sync/adapters/folder-adapter` (v2.0 PR3) | `folder_collection` |
| `*.pdf` | `wiki-sync/adapters/pdf-adapter` | `book` |
| `http(s)://...` | `wiki-sync/adapters/url-adapter` | `article` |
| `*.md` / `*.markdown` | `wiki-sync/adapters/markdown-adapter` | `markdown_passthrough` |
| `youtube.com/* | youtu.be/*` | `wiki-sync/adapters/youtube-adapter` | `youtube_video` |
| `*.vtt | *.srt | *.txt` (in `raw/meetings/`) | `wiki-sync/adapters/meeting-adapter` | `meeting_transcript` |

If no match: bail with helpful error listing supported patterns.

**Folder dispatch (v2.0 PR3):** the folder-adapter iterates files alphabetically and dispatches each to its matching sibling adapter (markdown / pdf / meeting). Children use slug `<col-slug>__<file-slug>` and inherit `page_type` from each file's frontmatter (NO new `'collection'` enum — that's a v2.1 candidate). Subdirectories refused with workaround message. See `06-ai-ops/skills/wiki-sync/adapters/folder-adapter/SKILL.md` for the 8-step folder pipeline.

**CLI helper (v2.0 PR3):** `scripts/wiki-sync/ingest.cjs` covers the deterministic file-side parts of this pipeline for markdown + folder adapters. Subagents and cron handlers SHOULD invoke the CLI rather than walking SKILL prose. PDF/URL/YouTube/meeting still walk this SKILL until CLI v0.2.

### Step 2 — Adapter fetch + extract

Invoke adapter; receive:
- `raw_text` — extracted text content
- `source_ref` — canonical reference (URL / abspath)
- `source_hash` — sha256 of raw bytes (NOT of extracted text — for FILE refs; for URLs use ETag-or-body-hash)
- `attribution` — { author, publication, published_at, ... } (best-effort)
- `pages_or_size_metric` — for chapter-split threshold check

### Step 3 — Dedup check

Query `ops.ingestion_jobs WHERE (source_hash = $1 OR content_hash = $2) AND state IN ('queued','fetching','processing','completed')`.

- If completed match + `--force` not set → return `resulting_slug` from existing row; set new row state='duplicate'. No further work.
- If active match → bail: "another /wiki sync for this ref is in progress (job_id=...)". The UNIQUE partial index from migration 00027 also enforces this at DB level.

### Step 4 — Acquire advisory lock

```sql
SELECT ops.wiki_sync_lock(<entity_type>, <slug>);
```

Lock is transaction-scoped. Released at COMMIT/rollback. Cross-process safe.

### Step 5 — Chapter split (if applicable)

If `pages > 100` OR `markdown_size > 25 KB` OR `split_mode` was passed → dispatch to `wiki-sync/chapter-splitter` skill. Each chapter becomes its own `ingestion_jobs` row with `parent_job_id` pointing to this row (column added in v2.0 migration 00030 Block C). Steps 6-9 run independently per chapter.

Sprint 2 (v2.0): chapter-splitter is REAL — implements modes `toc` / `count=N` / `heading=h2` with TOC→heading→count fallback chain. See `06-ai-ops/skills/wiki-sync/chapter-splitter/SKILL.md` for the full 8-step splitter spec.

When the splitter returns `{split: true}`, this ingest skill SKIPS its own Steps 6-9 for the parent (children handle it independently). The parent gets a book-level `index.md` page that lists chapters.

When splitter returns `{split: false}` (founder picked "no split" in the Tier B prompt, OR the file was under threshold and `--split` was not passed), this ingest skill continues Steps 6-9 as a single-page ingest.

### Step 6 — Distill entities (v3.0 reframe) — OR — verbatim link-extract (v2.0 fallback)

**DEFAULT (v3.0 — `wiki_sync_distill_enabled = true` AND `--verbatim` flag absent):**
Dispatch to `wiki-sync/distill` skill. It:
- Writes source RECORD page (single page per source) with `extracted_from_source_id = NULL`
- Loops over chunks; per-type model picker (Haiku for concept+idea; Sonnet for observation+decision)
- INSERTs derived entity pages (`page_type` IN `concept`/`observation`/`decision`/`idea`) with `extracted_from_source_id = <source_page_id>`
- INSERTs `ops.knowledge_extractions` rows (citation spine: source_chunk → derived_entity with confidence + raw_quote + llm_model + cost)
- Confidence ≥ 0.85 → auto-accept; 0.6-0.85 → `review_state = 'pending_review'`; < 0.6 → rejected
- Cost-bucket task_kinds: `wiki-distill-pdf` / `wiki-distill-folder` / `wiki-distill-other`

Also calls `wiki-sync/link-extractor` IN PARALLEL (regex pass for explicit `[[concept/X]]` cross-references typed by author). Distill and link-extractor are SEPARATE passes serving different intents:
- Link-extractor: explicit author intent (free-text `knowledge_links.link_type` like `defines`/`see_also`/`related_concept`)
- Distill: inferred entities (strict CHECK enum `extracted_concept`/`extracted_observation`/`extracted_decision`/`extracted_idea`)

Both write to `ops.knowledge_links`; values coexist.

**FALLBACK (v2.0 path — `--verbatim` flag set OR `wiki_sync_distill_enabled = false`):**
Skip distill. Call `wiki-sync/link-extractor` only (regex + optional LLM-fallback). Outputs same as v2.0:
- `structured_content` — { title, summary, sections[], entities[] }
- `links_created` — int
- `llm_cost_usd` — numeric (0 if regex-only)

Cost-bucket task_kind: `wiki-ingest-verbatim` (v3.0 successor to deprecated `wiki-ingest-pdf` / `wiki-ingest-other`).

Per spec §0 auto-deprecation trigger: if `--verbatim` flag invoked < 1 time in first 30 days post-v3.0 promotion, remove flag in v3.1 first PR.

### Step 7 — Dedup pass (v3.0 — distill mode only)

If Step 6 ran distill (not verbatim): dispatch to `wiki-sync/dedup` skill (Sprint 3). Per-source batch dedup + folder-level aggregation when ingest was triggered by folder-adapter.

Dedup mechanism:
- Slug-equality fast path (matched in Step 6 Step 3 already; this is the explicit re-check)
- Vector similarity > 0.92 on (title + first 200 chars of summary) → auto-merge derived entity pages from THIS source with existing entities in `ops.knowledge_pages`
- 0.75-0.92 → queue: derived entity stays separate but `review_state = 'pending_review'` and Telegram digest surfaces the borderline merge candidate for founder `/wiki review`
- < 0.75 → distinct; no merge

Cost-bucket task_kind: `wiki-dedup-batch`.

If `--verbatim` flag set (Step 6 fell through to v2.0 path): SKIP Step 7. Verbatim mode produces 1 page per source; nothing to dedup against entity graph.

### Step 8 — Embed

Chunk per adapter's chunking strategy (already in Step 5 if chapter-split fired; else use adapter's default chunking).

Call OpenAI `text-embedding-3-small` on:
- v3.0 distill mode: source RECORD page + each derived entity page (1 embedding per page, body content)
- v2.0 verbatim mode: chunks of the single page body (unchanged from v2.0)

INSERT into `ops.knowledge_embeddings`. If `OPENAI_API_KEY` absent → mark `embeddings_deferred = true`; hourly `wiki-embeddings-backfill` cron picks up (v2.0 G3 pattern continues; backfill SKILL updated in Sprint 3 to handle derived entity pages too).

Cost: ~$0.00002 / 1K tokens. Track in `embedding_cost_usd`.

### Step 9 — Write wiki page(s) + knowledge_pages row(s)

**v3.0 distill mode: MULTI-PAGE OUTPUT (v4.0 source-grouped layout)**
- Source RECORD page at `wiki/<source-slug>/source.md` (1 page) with `extracted_from_source_id = NULL`. Frontmatter includes `license_status` (founder set in distill Step 1).
- N derived entity pages under the same package at `wiki/<source-slug>/concepts/<slug>.md` + `wiki/<source-slug>/observations/<slug>.md` + `wiki/<source-slug>/decisions/<slug>.md` + `wiki/<source-slug>/ideas/<slug>.md` with `extracted_from_source_id = <source_page_id>`. Distill skill wrote these in its Step 5.
- This Step 9 is a no-op for distill mode — distill already wrote everything during its loop.

**v2.0 verbatim mode (--verbatim flag): SINGLE-PAGE OUTPUT**

a) Write Markdown to `wiki/<source-slug>/source.md` (v4.0 source-grouped layout — verbatim mode is a single source RECORD; no derived entities, so no `<page_type>s/` subfolders) with frontmatter:

```yaml
---
type: <entity_type>
slug: <slug>
source_kind: <source_kind>
source_ref: <source_ref>
source_hash: <source_hash>
ingested_at: <timestamp>
generated_by: wiki-sync v3.0 (verbatim mode)
legacy_v2_verbatim: false  # this is a v3.0-era verbatim ingest, not a v2.0 leftover
---

<!-- generated-by: wiki-sync v3.0 (verbatim mode) -->

<structured content as Markdown>
```

b) INSERT into `ops.knowledge_pages` (using source_kind/source_ref/source_hash columns from migration 00027):

```sql
INSERT INTO ops.knowledge_pages (
  slug, page_type, title, file_path, file_hash,
  source_kind, source_ref, source_hash, frontmatter,
  extracted_from_source_id,  -- NULL for verbatim mode (no source-derived chain)
  legacy_v2_verbatim,        -- false for v3.0 verbatim ingests
  review_state               -- 'auto_accepted' for verbatim
)
VALUES (..., NULL, false, 'auto_accepted', ON CONFLICT (slug) DO UPDATE SET ...);
```

c) If page already existed (re-sync flow), warn if `<!-- generated-by: wiki-sync vN -->` marker is missing (founder hand-edited). Show 3-way diff. Bail unless `--force` or `--merge`.

### Step 10 — Emit events + cost attribution

```sql
INSERT INTO ops.events (event_type, source, payload, state)
VALUES (
  CASE WHEN distill_mode THEN 'ritsu.wiki.distill_synced' ELSE 'ritsu.wiki.synced' END,
  'wiki-sync',
  jsonb_build_object(...),
  'pending'
);

INSERT INTO ops.cost_attributions (run_id, task_kind, cost_usd, ...)
VALUES (
  ...,
  CASE
    WHEN distill_mode AND source_kind = 'book' THEN 'wiki-distill-pdf'
    WHEN distill_mode AND source_kind = 'folder_collection' THEN 'wiki-distill-folder'
    WHEN distill_mode THEN 'wiki-distill-other'
    ELSE 'wiki-ingest-verbatim'
  END,
  ...
);
```

UPDATE `ops.ingestion_jobs` SET state='completed', `total_cost_usd`=sum(steps).

If distill mode produced entities with `review_state = 'pending_review'`: count them; daily `wiki-review-queue-digest` cron (Sprint 4) batches Telegram heads-up.

## Return

```jsonc
{
  "ingestion_job_id": "uuid",
  "knowledge_page_id": "uuid",
  "wiki_path": "wiki/<source-slug>/<page_type>s/<slug>.md",   // derived entities; source RECORDs use "wiki/<source-slug>/source.md"
  "source_kind": "<kind>",
  "source_hash": "<sha256>",
  "chapters_count": 1,  // > 1 if split
  "entities_extracted": <int>,
  "links_created": <int>,
  "embeddings_count": <int>,
  "total_cost_usd": <numeric>
}
```

## HITL

- Tier A normally
- Escalates to Tier B if estimated cost exceeds per-task-kind cap (per spec §0 cost table):
  - `wiki-distill-pdf` $2.00 (Tier B above $2; auto-confirm below)
  - `wiki-distill-folder` $15.00 (Tier B above $5 per Muse M6)
  - `wiki-distill-other` $0.50
  - `wiki-ingest-verbatim` $0.30
- Distill skill internal: Tier B for license_status prompt on first ingest of a source (founder picks {public_domain | creative_commons | fair_use_excerpt | copyrighted_internal_only})

## Failure modes

| Symptom | Response |
|---|---|
| No adapter matches path | List supported patterns; bail. |
| Adapter extraction returns empty | Mark state='low_quality'; surface to founder. |
| Dedup hit on `completed` w/o `--force` | Return existing slug; state='duplicate'. |
| Lock acquire blocks > 30s | Bail with "another sync in progress". |
| `knowledge_pages.slug` UNIQUE conflict (race despite lock) | Retry once; if still conflict, surface conflict. |
| Embedding API error | Retry with backoff; if persistent, fail run with state='failed'. |
| Hand-edited page detected (no generated-by marker) on re-sync | Show 3-way diff; require `--force` to overwrite. |

## Cost estimate

| Adapter | Per ingest |
|---|---|
| PDF (50pp book) | ~$0.50 (extract $0.40 + embed $0.005 + LLM-fallback $0.05 avg) |
| URL article | ~$0.07 |
| Markdown passthrough | ~$0.03 |
| YouTube (60min) | ~$0.20 |
| Meeting transcript (60min) | ~$0.15 |

## Sprint scope (this skill)

Sprint 1 baseline:
- All 9 steps implemented for `book` / `article` / `markdown_passthrough` adapters
- Chapter-splitter = STUB (Sprint 2)
- LLM-fallback = STUB (Sprint 4 — feature-flag off)
- YouTube + Meeting adapters not yet wired (Sprint 2)

## Related

- Umbrella: `06-ai-ops/skills/wiki-sync/SKILL.md`
- Adapters: `06-ai-ops/skills/wiki-sync/adapters/{pdf,url,markdown,youtube,meeting}-adapter/`
- Chapter splitter: `06-ai-ops/skills/wiki-sync/chapter-splitter/`
- Link extractor: `06-ai-ops/skills/wiki-sync/link-extractor/`
- SOP: `06-ai-ops/sops/SOP-INGEST-001-wiki-sync/`
- Migration: `supabase/migrations/00027_wiki_sync_extensions.sql`
- Tier 1: `knowledge/ingestion-sources.yaml`, `knowledge/link-inference-rules.yaml`
