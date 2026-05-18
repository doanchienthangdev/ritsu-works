# Wiki Sync from External Refs — Architecture Spec v2.0.0

**Capability:** `wiki-sync-from-refs`
**Version:** 2.0.0 (revise of v1.0.0; supersedes_id `911973a2`)
**Phase:** 5 (architect; Tier C — APPROVED 2026-05-17)
**Author:** /cla revise session `a3858b7d` (2026-05-17)
**Final decision:** **Hybrid B/A + all 5 CTO nits** (see §0 below; ops.decisions slug `wiki-sync-from-refs-revise-v2-architecture-hybrid`)
**Status:** APPROVED — proceed to Phase 6 sprint planning

---

## 0. FINAL DISPOSITION (Tier C approved 2026-05-17, supersedes §1–§7 below where conflicting)

The Phase 5 architect draft (§1–§7) committed to Option B (Balanced) per Phase 4 founder pick. @cto APPROVE-WITH-NITS [cto-review.md](./cto-review.md) confirmed technical viability of Option B. @oracle PROCEED-WITH-DOWNGRADE [oracle-critique.md](./oracle-critique.md) argued Option B was right-sized to evidence we WILL have after Sprints 2-3-4, not the evidence we HAVE today (n=1 fixture). Founder resolved the tension with a hybrid:

| Axis | Final choice | Why |
|---|---|---|
| G1 naming | **B**: rename `source_url → source_ref` in migration 00030 | Schema correctness; today's 1 row trivially migrates |
| G2 regex | **B + CTO NIT 2**: add `related_concept` + ensure rule ordering (rewrite `defines_or_references_concept_general` to be non-overlapping with `(see also|cf\.)`) | Cheap; fixes today's silent drop of `[[concept/active-recall]]` |
| G3 embeddings | **B**: soft-defer + hourly backfill cron | Unblocks today's deferred state without breaking dev flow |
| G4 cost_attributions | **B**: `ALTER COLUMN model DROP NOT NULL` | One ALTER; @cto verified all consumers safe (none filter on model) |
| G5 chapter-splitter | **B + CTO NIT 3 REQUIRED**: add `parent_job_id uuid REFERENCES … ON DELETE CASCADE` (was SET NULL); ship real splitter | Required for Sprint 2 |
| **G6 runner** | **A (downgrade from B)**: NO Edge Function in v2.0. Keep skill-walked + ship `scripts/wiki-sync/ingest.cjs` CLI helper for deterministic steps | Oracle finding 1.1: skill_fallback hatch (spec §3.5) IS the dual code path Option B was supposed to eliminate. Net new surface with zero new callers in v2.0. Edge Function pattern proven (per @cto via minion-worker) — defer until a second caller exists |
| **Q1 page_type** | **A (downgrade from B)**: reuse `'book'` for folder collections in v2.0 | n=1 fixture evidence insufficient to commit to new enum value. CHECK enum is forward-additive; `'collection'` can land in v2.1 ADD VALUE migration without breaking anything |
| **Q2 slug discipline** | **A (downgrade from B)**: `<col-slug>__<file-slug>` global UNIQUE; no schema change | Ugly but boring + reversible. Avoids migration 00030 Block E (UNIQUE relax). Saves the one-way-door risk |
| Q5 recursive | **B**: flat-only for v2 | Unchanged |
| Sprint shape | **B**: fold folder into Sprint 2 | Unchanged |

**Net effect on migration 00030:** shrinks from 5 ALTERs to 3:
- Block A (rename source_url → source_ref + 2 index renames) — KEEP
- Block B (cost_attributions.model DROP NOT NULL) — KEEP + add comment per CTO §1 caveat
- Block C (parent_job_id ADD COLUMN + index) — KEEP, **CHANGED to CASCADE** per CTO NIT 3
- ~~Block D (page_type CHECK enum add `'collection'`)~~ — **DROPPED**
- ~~Block E (slug UNIQUE relax to (page_type, slug))~~ — **DROPPED**

Header of 00030 must call Block B's reconciliation contract (per CTO §1 caveat) and the SLUG discipline (`<col-slug>__<file-slug>` global UNIQUE; NO schema change) so future readers understand the v2.0 choices.

**All 5 CTO nits applied:**
1. NIT 1: folder-adapter Telegram heartbeat is start + summary-at-end (NOT per-file).
2. NIT 2: regex rule ordering — rewrite `defines_or_references_concept_general` to exclude `(see also|cf\.)` so `related_concept` fires first.
3. NIT 3: `parent_job_id ON DELETE CASCADE` (was SET NULL in draft §2.1 Block C).
4. NIT 4: backfill cron self-throttles — skip if last `scheduled_runs` row affected_rows=0 AND ran < 6h ago.
5. NIT 5: slug-collision convention documented in three places — SOP-INGEST-001 README, folder-adapter SKILL.md, migration 00030 header.

**Also from CTO §3:** `WIKI_SYNC_FUNCTION_URL` env var contract — N/A now (no Edge Function in v2.0). Replace with: `.claude/commands/wiki.md` invokes `scripts/wiki-sync/ingest.cjs` directly via Node; CLI helper is local-only, no URL discovery needed.

**v2.1 re-trigger conditions (when to promote G6/Q1/Q2 back to Option B):**
- (a) `/wiki sync` invoked > 20 times/month
- (b) A real second caller (subagent, cron, hook) needs invocation
- (c) `<col>__<file>` slug ugliness shows up in retrieval/search results enough that founder complains
- (d) `'book'` reuse for a non-book collection is publicly confusing (`wiki/books/llm-papers-2025/...` etc.)

**Effort (revised down from Option B's ~10h to Hybrid's ~7h):**
- Setup cost (LLM, Phase 6-7): ~$3.50 (was $4.50)
- Founder hours: ~7h over Sprint 2 (was ~10h)
- Calendar: 4-5 days
- Migration count: 1 (00030 — 3 ALTERs)
- New skills: 1 (folder-adapter) + 1 (backfill-embeddings, called by cron)
- New Edge Function: 0
- Sprint inflation: 0

---



---

## 1. What's revised vs v1.0.0

This spec inherits all of v1.0.0's domain semantics (3-verb model, single-source-of-truth, citation discipline, HITL tier mapping, cost-bucket `ai-ops-knowledge`, pillar ownership `06-ai-ops`). Only the items below are revised:

### Resolved (in this spec)

| ID | What | Disposition |
|---|---|---|
| G1 | `source_url` vs `source_ref` naming drift | Rename column to `source_ref`; update 5 indexes |
| G2 | Link-extractor regex misses concept→concept | Add `related_concept` + informal-see-also rules to `link-inference-rules.yaml` |
| G3 | Embedding deferral path missing | Soft-defer: mark `embeddings_deferred=true`; ship `scripts/sync/backfill-wiki-embeddings.cjs` driven by `knowledge/schedules.yaml` (hourly) |
| G4 | `cost_attributions.model NOT NULL` forces fake rows | `ALTER COLUMN model DROP NOT NULL`; treat NULL model as "non-LLM step" in reconciliation |
| G5 | chapter-splitter STUB + `parent_job_id` missing | Add column; ship real splitter (TOC / count=N / heading=h2); slug discipline `<book-slug>__chapter-NN-<chapter-slug>` |
| G6 | No executable runner | Edge Function `supabase/functions/wiki-sync/index.ts`; single canonical entry; `/wiki sync` command POSTs to it |
| Folder | Folder = collection (Cách C) | New `'collection'` page_type; folder-adapter dispatches to sibling adapters; `(page_type, slug)` UNIQUE for collection children |

### Deferred (out of scope)

- LLM-fallback link extraction (stays Sprint 4)
- OCR fallback for scanned PDFs (stays Sprint 4)
- `/wiki ask` MCP shim (stays Sprint 3)
- Recursive folder support (v2.1 — flat-only for v2.0)
- mcp-server wiki tools (stays Sprint 3)

---

## 2. Component diff (what files change)

### 2.1 Migrations (1 new file)

**`supabase/migrations/00030_wiki_sync_v2_consolidated.sql`** — single DDL covering all schema deltas:

```sql
-- Block A: G1 rename
ALTER TABLE ops.ingestion_jobs RENAME COLUMN source_url TO source_ref;
ALTER INDEX ops.idx_ingestion_dedup_url_unique RENAME TO idx_ingestion_dedup_ref_unique;
ALTER INDEX ops.idx_ingestion_history_url RENAME TO idx_ingestion_history_ref;
-- Update 1 existing row's frontmatter-mirrored field: no DDL action — frontmatter is jsonb
COMMENT ON COLUMN ops.ingestion_jobs.source_ref IS 'Canonical reference: URL or absolute file path (renamed from source_url v2.0.0).';

-- Block B: G4 cost_attributions
ALTER TABLE ops.cost_attributions ALTER COLUMN model DROP NOT NULL;
COMMENT ON COLUMN ops.cost_attributions.model IS 'LLM model identifier; NULL = non-LLM pipeline step (v2.0.0).';

-- Block C: G5 + Folder parent_job_id (shared infrastructure)
ALTER TABLE ops.ingestion_jobs ADD COLUMN parent_job_id uuid REFERENCES ops.ingestion_jobs(id) ON DELETE SET NULL;
CREATE INDEX idx_ingestion_jobs_parent ON ops.ingestion_jobs(parent_job_id) WHERE parent_job_id IS NOT NULL;

-- Block D: Folder page_type
ALTER TABLE ops.knowledge_pages DROP CONSTRAINT page_type_valid;
ALTER TABLE ops.knowledge_pages ADD CONSTRAINT page_type_valid CHECK (page_type IN (
  'customer', 'person', 'company', 'concept', 'decision', 'meeting',
  'article', 'episode', 'book', 'repo', 'idea', 'observation',
  'weekly_review',
  'collection'  -- v2.0.0
));

-- Block E: Folder slug discipline — (page_type, slug) UNIQUE for collection children
-- Pre-check: bail if any duplicate (page_type, slug) pre-exists (should not — slug is currently global UNIQUE)
DO $$
DECLARE
  v_dup_count int;
BEGIN
  SELECT count(*) INTO v_dup_count FROM (
    SELECT page_type, slug FROM ops.knowledge_pages GROUP BY page_type, slug HAVING count(*) > 1
  ) sub;
  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'Cannot relax slug UNIQUE: % (page_type, slug) duplicates exist.', v_dup_count;
  END IF;
END $$;

ALTER TABLE ops.knowledge_pages DROP CONSTRAINT knowledge_pages_slug_key;
ALTER TABLE ops.knowledge_pages ADD CONSTRAINT knowledge_pages_type_slug_key UNIQUE (page_type, slug);

-- Rollback (documented):
-- ALTER TABLE ops.ingestion_jobs RENAME COLUMN source_ref TO source_url;
-- ALTER INDEX ops.idx_ingestion_dedup_ref_unique RENAME TO idx_ingestion_dedup_url_unique;
-- ALTER INDEX ops.idx_ingestion_history_ref RENAME TO idx_ingestion_history_url;
-- ALTER TABLE ops.cost_attributions ALTER COLUMN model SET NOT NULL;
-- ALTER TABLE ops.ingestion_jobs DROP COLUMN parent_job_id;
-- ALTER TABLE ops.knowledge_pages ADD CONSTRAINT knowledge_pages_slug_key UNIQUE (slug); (after backfilling type-slug dupes)
-- ALTER TABLE ops.knowledge_pages DROP CONSTRAINT knowledge_pages_type_slug_key;
-- ALTER TABLE ops.knowledge_pages DROP CONSTRAINT page_type_valid;
-- ALTER TABLE ops.knowledge_pages ADD CONSTRAINT page_type_valid CHECK (page_type IN (... without 'collection'));
```

**Rationale for single migration:** atomic apply on `db push`; rollback is one file. All 5 ALTERs are surgical + reversible.

### 2.2 New skills (1 new + 6 updates)

| Path | Change | Sprint |
|---|---|---|
| `06-ai-ops/skills/wiki-sync/adapters/folder-adapter/SKILL.md` | **NEW** | 2 |
| `06-ai-ops/skills/wiki-sync/chapter-splitter/SKILL.md` | STUB → real (TOC / count=N / heading=h2) | 2 |
| `06-ai-ops/skills/wiki-sync/ingest/SKILL.md` | Update: source_ref naming + embedding-deferred path + folder-adapter dispatch case | 2 |
| `06-ai-ops/skills/wiki-sync/adapters/{pdf,url,markdown,youtube,meeting}-adapter/SKILL.md` | Update each: source_ref naming (G1) | 2 |
| `06-ai-ops/skills/wiki-sync/link-extractor/SKILL.md` | Note new patterns from G2 | 2 |
| `06-ai-ops/skills/wiki-sync/SKILL.md` (umbrella) | Update to list 6 adapters (+folder) | 2 |

### 2.3 New runner (Edge Function — G6)

**`supabase/functions/wiki-sync/index.ts`** — TypeScript Edge Function (Deno runtime per Supabase Functions standard). Single endpoint:

```
POST /functions/v1/wiki-sync
Body: { path: string, split_mode?: "toc"|"count=N"|"heading=h2", force?: boolean, entity_type_override?: string }
Auth: service_role JWT (server-to-server) OR session JWT (founder via /wiki sync command)
```

Logic mirrors the 9-step SOP-INGEST-001 pipeline. Dispatches to the right adapter based on path/URL pattern. Handles folder-adapter loop internally (no recursion in v2.0). Calls Anthropic API directly for any LLM-touching step (link-extraction LLM-fallback still feature-flagged off in v2.0; embedding step calls OpenAI when key present, else soft-defer).

`.claude/commands/wiki.md` becomes a thin frontend: POSTs to the Edge Function and reports the response. Backwards compat: if the Edge Function returns `runner=skill_fallback`, command falls through to walking SKILL.md (today's mode). This safety hatch ensures the migration to Edge Function is reversible.

### 2.4 Tier 1 diffs

**`knowledge/ingestion-sources.yaml`** — add new entry:
```yaml
  - id: folder_collection
    adapter: folder-adapter
    fetch_method: local_directory_glob
    extraction: per_file_dispatch_to_sibling_adapter
    chunking: per_file_per_adapter
    cost_estimate: "$0.20-$2.00 / folder (N files × per-file cost)"
    wiki_target: wiki/<collection_type_or_collection>/<col-slug>/<file-slug>.md
    discipline:
      slug_uniqueness: "(page_type, slug)"  # depends on migration 00030
      recursive: false  # v2.0 — recursive deferred to v2.1
```

**`knowledge/link-inference-rules.yaml`** — add 2 patterns:
```yaml
  - id: related_concept
    pattern: "(?:see also|cf\\.) \\[\\[concept/([^\\]]+)\\]\\]"
    source_type: any
    target_type: concept
    description: "Informal cross-reference between concepts via 'see also' or 'cf.' prefix."

  - id: defines_or_references_concept_general
    pattern: "(?:see|cf|defined in|definition of) \\[\\[concept/([^\\]]+)\\]\\]"
    source_type: any
    target_type: concept
    description: "Generalized concept cross-reference (less specific than 'defines'; catches '(see)' prefix)."
```

**`knowledge/feature-flags.yaml`** — add:
```yaml
wiki-sync:
  llm_fallback_enabled: false  # Sprint 4 will flip to true
  edge_function_runner: true   # v2.0.0 default
  edge_function_fallback_to_skill: true  # safety hatch
  recursive_folder: false  # v2.1 candidate
```

**`knowledge/economic-architecture.md`** — add per-task-kind cap:
```
wiki-ingest-folder | $2.00 / invocation (N files; folder-adapter overhead negligible)
```

**`knowledge/schedules.yaml`** — add hourly cron:
```yaml
wiki-embeddings-backfill:
  cron: "0 * * * *"  # hourly
  agent: etl-runner
  skill: wiki-sync/embeddings-backfill  # NEW skill in Sprint 2
  description: "Scan ops.knowledge_pages for embeddings_deferred=true; backfill via OpenAI text-embedding-3-small when key present."
```

### 2.5 SOPs

**`06-ai-ops/sops/SOP-INGEST-001-wiki-sync/README.md`** — update Step 7 (embedding) + Step 9 (cost): conditional cost_attributions insert per G4 disposition.

### 2.6 Tests

| Path | Change |
|---|---|
| `tests/wiki-sync/fixtures/sample-folder/` | NEW — 3 markdown files for folder-adapter round-trip |
| `tests/wiki-sync/fixtures/sample-large.pdf` | NEW — copyright-clear ≥ 100 page PDF (Sprint 2) |
| `tests/wiki-sync/fixtures/sample.vtt` | NEW — meeting transcript fixture (Sprint 2) |
| `tests/wiki-sync/edge-function.test.ts` | NEW — end-to-end test invoking Edge Function locally via `supabase functions serve` |
| `tests/wiki-sync/folder-adapter.test.ts` | NEW — folder dispatch + partial failure semantics |

### 2.7 Scripts

| Path | Change |
|---|---|
| `scripts/sync/backfill-wiki-embeddings.cjs` | NEW (G3) |
| `scripts/cross-tier/validate-wiki-integrity.cjs` | NEW (Sprint 4) — added per parent plan |

---

## 3. Behavioral contract

### 3.1 `/wiki sync <path>`

- If `path` is a single file matching one of 5 file adapters → existing behavior (with G1/G2/G3 fixes).
- If `path` is a directory → folder-adapter:
  - Iterate files alphabetically (default; `INDEX.md` override planned for v2.1).
  - Each file gets a child ingestion_jobs row with `parent_job_id` = parent folder's row.
  - Each file becomes `wiki/<collection_type>/<col-slug>/<file-slug>.md`.
  - Partial failure: continue by default; surface summary at end with per-file status.
  - Total cost: sum of per-file costs; tracked in parent ingestion_jobs.total_cost_usd.
- If `path` is a directory with nested subdirs → **refuse** with error: "Recursive folder ingestion deferred to v2.1. Flatten input or pass each subdir separately."

### 3.2 Embedding deferred state

- When `OPENAI_API_KEY` absent:
  - `/wiki sync` completes; sets `ingestion_jobs.metadata.embeddings_deferred=true` + `knowledge_pages` row written WITHOUT embeddings.
  - Cron `wiki-embeddings-backfill` runs hourly; processes deferred pages.
  - Founder Telegram heartbeat: 1 message per cron run if any backfill happened (not every hour).

### 3.3 cost_attributions

- LLM call → cost_attributions row with model set.
- Non-LLM step (regex, IO, deferred) → either no cost_attributions row, or row with model=NULL (both allowed v2.0).
- Reconciliation hook treats NULL model as "ops" cost-class; rolls up to `ai-ops-knowledge` bucket via task_kind.

### 3.4 Slug discipline

- Single-file ingest: `slug = <slug-from-frontmatter-or-derived>`, UNIQUE within `page_type`. (Was global UNIQUE; v2.0 = per-type UNIQUE.)
- Chapter children (book): `slug = <book-slug>__chapter-NN-<chapter-slug>` within `page_type='book'`.
- Folder children (collection): `slug = <file-slug>` within `page_type='collection'` (the FILE's slug; collection-uniqueness via path tree on disk + page_type partition in DB).

**Note on slug stability:** If founder ingests `attention.md` standalone (page_type=concept) AND inside `papers/` folder (page_type=collection, slug=attention), both can coexist. Cross-references via `[[concept/attention]]` resolve to the standalone; `[[collection/papers/attention]]` resolves to the folder child. The two pages have different `page_type` so the UNIQUE per-type constraint is satisfied.

### 3.5 Edge Function fallback

- `/wiki sync` first POSTs to the Edge Function.
- If function returns `runner=skill_fallback` (env var or feature-flag), command walks SKILL.md (today's mode). Used during migration period; future flip to remove fallback in v2.1.

---

## 4. Cost & calendar

| Item | Value |
|---|---|
| Setup cost (LLM, Phase 5-7) | ~$4.50 |
| Recurring cost (per-invocation, unchanged from v1.0) | $0.05-$2.00 per `/wiki sync` |
| Founder hours (review + Tier C approvals + PR merges) | ~10h over Sprint 2 |
| Calendar | Sprint 2 expanded; 5-7 days |
| Migrations | 1 (00030_wiki_sync_v2_consolidated) |
| New skills | 1 (folder-adapter) + 1 (embeddings-backfill) |
| New Edge Function | 1 (wiki-sync/index.ts) |
| Sprint inflation | 0 (folder folds into Sprint 2) |

## 5. Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Edge Function cold start adds 2-3s to `/wiki sync` first invocation | High | Low UX | Skill fallback hatch absorbs failures during cutover |
| Migration 00030's `(page_type, slug)` UNIQUE conflicts with existing 1 row | Low | Medium | Pre-check guard in migration bails before destructive ALTER |
| OpenAI rate limit during cron backfill | Medium | Low | Process N=10 pages per cron tick max; spread across hours |
| `parent_job_id` ON DELETE SET NULL orphans chapter children if parent deleted | Low | Medium | Cascade rule documented; no UI exposes DELETE to founder for ingestion_jobs |
| Folder-adapter partial failure muddles status reporting | Medium | Low | Summary table per file at end; failed files surfaced + retryable |
| Recursive folder discoveries surprise founder | Low | Low | Hard error "refuse recursive in v2.0" with clear v2.1 deferred note |
| New page_type 'collection' confuses existing tooling | Low | Low | CHECK enum tested in migration pre-check; no downstream code currently switches on page_type |

## 6. Open NITS for @cto + Muse review

1. Should the Edge Function emit Telegram heartbeat per file in a folder (could be noisy for 50-file folder), or only at start + end?
2. Slug `<file-slug>` for collection children — if founder later moves a file from one collection to another, slug stays but `page_type` partition assumes static membership. Worth a `collection_id` FK for v2.1?
3. `parent_job_id` ON DELETE SET NULL — should it be CASCADE? (Currently no UI deletes ingestion_jobs, so debatable.)
4. Embedding backfill cron runs every hour even if no work — wasteful tail. Should it self-throttle (skip if last run had 0 backfills)?
5. `(page_type, slug)` UNIQUE: should there ALSO be a global UNIQUE on (slug) at the umbrella level for collection's COLLECTION row (collection itself = 1 page; children = N pages with the same slug as collection... wait, that's a collision). Resolution: collection's own row has slug=`<col-slug>` page_type=`'collection'`; children have slug=`<file-slug>` page_type=`'collection'`. Within page_type='collection' both must be unique. → Implies col-slug ≠ any file-slug under it. Pre-check in migration covers; needs convention doc.

## 7. Phase 5 done — state transition

`ops.capability_runs[638811f8…]` phases_completed += `5` after Tier C founder approval; `current_phase → 6` (sprint plan v2). `ops.decisions` row created with hitl_tier='C' linking spec.md.
