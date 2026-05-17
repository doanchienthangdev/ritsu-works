-- ============================================================================
-- Migration 00030: wiki-sync v2.0.0 schema deltas (Sprint 2 PR1)
-- ============================================================================
-- Capability: wiki-sync-from-refs v2.0.0 (revise of v1.0.0)
-- Tier C decision:
--   ops.decisions[fff2bf7c-efeb-4169-b430-8139ad4d4de3] —
--   "wiki-sync v2.0.0 architecture: Hybrid B/A + CTO nits"
-- Spec: .archives/cla/wiki-sync-from-refs-revise-a3858b7d/spec.md §0
-- Sprint plan: .archives/cla/wiki-sync-from-refs-revise-a3858b7d/sprint-plan.md §Sprint 2
--
-- 3 ALTER blocks (Hybrid B/A downgraded from Option B's original 5):
--   Block A — G1 rename source_url → source_ref (skill terms + schema converge)
--   Block B — G4 cost_attributions.model DROP NOT NULL (non-LLM pipeline steps)
--   Block C — G5 parent_job_id ADD COLUMN with CASCADE FK (chapter splitter + folder children)
--
-- Blocks D (page_type='collection' CHECK enum add) and E (slug UNIQUE relax)
-- were DOWNGRADED to Option A per Tier C decision (oracle-critique.md Findings
-- 1.1, 1.2, 1.4): n=1 fixture evidence insufficient to commit. Folder children
-- in v2.0 use `<col-slug>__<file-slug>` global UNIQUE on existing slug column;
-- page_type='book' reused for collections. v2.1 re-trigger conditions in
-- spec.md §0 list when to promote to full Option B via /cla revise.
--
-- Reconciliation contract (per @cto §1 caveat re: Block B):
--   `pre-llm-call-budget` reconciliation script (drift alert at >5%) tallies
--   cost_attributions rows by agent_role + task_kind. With model=NULL allowed,
--   the script must NOT filter on `model IS NOT NULL` — verified at audit time
--   that no consumer code does this. Any future code that wants to SUM cost
--   "by LLM model" should use `WHERE model IS NOT NULL`; "all costs by task"
--   ignores model entirely.
--
-- Slug discipline (v2.0 — for SOP-INGEST-001 + folder-adapter):
--   - Single-file ingest: slug = derived from frontmatter/path; global UNIQUE
--     within ops.knowledge_pages (existing 00006 constraint preserved)
--   - Chapter children of book: slug = `<book-slug>__chapter-NN-<chapter-slug>`
--   - Folder children of collection: slug = `<col-slug>__<file-slug>`
--   - All slugs share the same global UNIQUE namespace. v2.1 may relax to
--     (page_type, slug) UNIQUE when evidence warrants — NOT in v2.0.
--
-- Rollback (documented, not committed):
--   ALTER TABLE ops.ingestion_jobs RENAME COLUMN source_ref TO source_url;
--   ALTER INDEX ops.idx_ingestion_dedup_ref_unique RENAME TO idx_ingestion_dedup_url_unique;
--   ALTER INDEX ops.idx_ingestion_history_ref RENAME TO idx_ingestion_history_url;
--   ALTER TABLE ops.cost_attributions ALTER COLUMN model SET NOT NULL;
--     -- (will fail if any rows have model IS NULL — backfill required)
--   DROP INDEX ops.idx_ingestion_jobs_parent;
--   ALTER TABLE ops.ingestion_jobs DROP COLUMN parent_job_id;
--
-- All blocks wrap in implicit transaction (Supabase db push behavior for .sql
-- files). No DO blocks here that COMMIT mid-migration.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Block A — G1 naming drift fix: rename source_url → source_ref
-- ----------------------------------------------------------------------------
-- The original 00007 column was named `source_url` but SKILL.md/SOP have always
-- treated it as a general reference (URL OR abspath). Today's run had to map
-- "source_ref" concept to "source_url" column at INSERT time. Aligns naming
-- with semantics; today's 1 existing row trivially carries over.

ALTER TABLE ops.ingestion_jobs RENAME COLUMN source_url TO source_ref;

ALTER INDEX ops.idx_ingestion_dedup_url_unique RENAME TO idx_ingestion_dedup_ref_unique;
ALTER INDEX ops.idx_ingestion_history_url RENAME TO idx_ingestion_history_ref;

COMMENT ON COLUMN ops.ingestion_jobs.source_ref IS
  'Canonical reference for the source: URL or absolute file path. Renamed from source_url in migration 00030 (wiki-sync v2.0.0) to match SKILL.md vocabulary.';

-- ----------------------------------------------------------------------------
-- Block B — G4 cost_attributions.model nullable for non-LLM pipeline steps
-- ----------------------------------------------------------------------------
-- The original 00017 declared `model text NOT NULL` assuming every cost row
-- represents an LLM call. wiki-sync (and future pipelines) have legitimate
-- non-LLM steps (regex link extraction, file IO, deferred embeddings) that
-- need cost attribution without a model identifier.
--
-- Reconciliation script contract confirmed safe (see header comment).

ALTER TABLE ops.cost_attributions ALTER COLUMN model DROP NOT NULL;

COMMENT ON COLUMN ops.cost_attributions.model IS
  'LLM model identifier (e.g. claude-sonnet-4-6). NULL = non-LLM pipeline step (v2.0.0 migration 00030). Filter `WHERE model IS NOT NULL` to scope reports to LLM costs only.';

-- ----------------------------------------------------------------------------
-- Block C — G5 parent_job_id ADD COLUMN with CASCADE FK
-- ----------------------------------------------------------------------------
-- Chapter splitter children + folder children need to reference their parent
-- ingestion_jobs row. Per @cto NIT 3 (REQUIRED), cascade is CASCADE not
-- SET NULL — if parent is deleted, orphan children whose slugs reference
-- the deleted parent would become indistinguishable from standalone ingests
-- but their slug shape (`<base>__chapter-NN-...`) would still reference the
-- deleted parent. CASCADE is the consistent choice.

ALTER TABLE ops.ingestion_jobs
  ADD COLUMN parent_job_id uuid REFERENCES ops.ingestion_jobs(id) ON DELETE CASCADE;

CREATE INDEX idx_ingestion_jobs_parent
  ON ops.ingestion_jobs (parent_job_id)
  WHERE parent_job_id IS NOT NULL;

COMMENT ON COLUMN ops.ingestion_jobs.parent_job_id IS
  'For chapter splitter and folder collection children: points to the parent ingestion_jobs row representing the full source. ON DELETE CASCADE per CTO Phase 5 NIT 3 (v2.0.0 migration 00030).';

COMMIT;
