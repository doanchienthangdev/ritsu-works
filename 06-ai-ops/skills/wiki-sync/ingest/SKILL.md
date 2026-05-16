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

Read `knowledge/ingestion-sources.yaml`. Match `<path>` extension / URL pattern to one of the 5 adapters:

| Pattern | Adapter | source_kind |
|---|---|---|
| `*.pdf` | `wiki-sync/adapters/pdf-adapter` | `book` |
| `http(s)://...` | `wiki-sync/adapters/url-adapter` | `article` |
| `*.md` / `*.markdown` | `wiki-sync/adapters/markdown-adapter` | `markdown_passthrough` |
| `youtube.com/* | youtu.be/*` | `wiki-sync/adapters/youtube-adapter` | `youtube_video` |
| `*.vtt | *.srt | *.txt` (in `raw/meetings/`) | `wiki-sync/adapters/meeting-adapter` | `meeting_transcript` |

If no match: bail with helpful error listing supported patterns.

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

If `pages > 100` OR `markdown_size > 25 KB` OR `split_mode` was passed → dispatch to `wiki-sync/chapter-splitter` skill. Each chapter becomes its own `ingestion_jobs` row with `parent_job_id` pointing to this row. Steps 6-9 run independently per chapter.

Sprint 1: chapter-splitter is a STUB (returns "split not yet implemented"); split path defers to Sprint 2. Single-file path works.

### Step 6 — Extract + entity-link

Call `wiki-sync/link-extractor` skill:
1. Regex pass (Bài #14 patterns from `link-inference-rules.yaml`)
2. LLM-fallback (only if `wiki-sync.llm_fallback_enabled` feature flag is true — DEFAULT FALSE in v1.0)

Outputs:
- `structured_content` — { title, summary, sections[], entities[] }
- `links_created` — int
- `llm_cost_usd` — numeric (0 if regex-only)

### Step 7 — Embed

Chunk per adapter's chunking strategy. Call OpenAI `text-embedding-3-small`. INSERT into `ops.knowledge_embeddings` with `page_id` (linked to the knowledge_pages row we'll insert next), `chunk_index`, `chunk_text`, `embedding`, `chunk_hash`.

Cost: ~$0.00002 / 1K tokens. Track in `embedding_cost_usd`.

### Step 8 — Write wiki page + knowledge_pages row

a) Write Markdown to `wiki/<entity_type>/<slug>.md` with frontmatter:

```yaml
---
type: <entity_type>
slug: <slug>
source_kind: <source_kind>
source_ref: <source_ref>
source_hash: <source_hash>
ingested_at: <timestamp>
generated_by: wiki-sync v1.0
---

<!-- generated-by: wiki-sync v1.0 -->

<structured content as Markdown>
```

b) INSERT into `ops.knowledge_pages` (using new `source_kind`/`source_ref`/`source_hash` columns from migration 00027):

```sql
INSERT INTO ops.knowledge_pages (slug, page_type, title, file_path, file_hash, source_kind, source_ref, source_hash, frontmatter)
VALUES (..., ON CONFLICT (slug) DO UPDATE SET ...);
```

c) If page already existed (re-sync flow), warn if `<!-- generated-by: wiki-sync vN -->` marker is missing (founder hand-edited). Show 3-way diff. Bail unless `--force` or `--merge` (merge mode is Sprint 4+).

### Step 9 — Emit events + cost attribution

```sql
INSERT INTO ops.events (event_type, source, payload, state)
VALUES ('ritsu.wiki.synced', 'wiki-sync', jsonb_build_object(...), 'pending');

INSERT INTO ops.cost_attributions (run_id, task_kind, cost_usd, ...)
VALUES (..., 'wiki-ingest-<adapter>', ...);
```

UPDATE `ops.ingestion_jobs` SET state='completed', `total_cost_usd`=sum(steps).

## Return

```jsonc
{
  "ingestion_job_id": "uuid",
  "knowledge_page_id": "uuid",
  "wiki_path": "wiki/<entity_type>/<slug>.md",
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
- Escalates to Tier B if estimated cost > `wiki-ingest-pdf=$1.00` / `wiki-ingest-other=$0.30` per-task-kind cap (per economic-architecture.md)

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
