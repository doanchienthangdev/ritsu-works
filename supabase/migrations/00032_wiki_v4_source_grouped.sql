-- ============================================================================
-- 00032_wiki_v4_source_grouped.sql — v4.0 source-grouped layout DDL
-- ============================================================================
-- Reframes wiki layout from entity-type-grouped (v3.0) to source-grouped (v4.0)
-- per founder reframe 2026-05-18 ("input wiki files/folders tường minh ... cho
-- ritsu-works dùng đi dùng lại nhiều lần hay giải các bài toán"). See:
-- - .archives/cla/wiki-sync-from-refs-revise-f55023d9/spec.md v4.0.0 §0
-- - ops.decisions slug='wiki-sync-v4-source-grouped-layout' hitl_tier='C'
-- - capability_runs lineage: 911973a2 (v1) ← 638811f8 (v2) ← 36836749 (v3) ← f75502d4 (v4)
--
-- Changes (single transaction):
-- A. CREATE partial UNIQUE INDEX knowledge_pages_source_record_slug_uniq
--    ON (slug) WHERE extracted_from_source_id IS NULL.
--    Preserves global slug uniqueness ONLY for source RECORDs.
-- B. CREATE partial UNIQUE INDEX knowledge_pages_derived_slug_uniq
--    ON (extracted_from_source_id, slug) WHERE extracted_from_source_id IS NOT NULL.
--    Composite uniqueness for derived entities (slug unique within source).
-- C. DROP CONSTRAINT knowledge_pages_slug_key (was: global UNIQUE on slug).
-- D. Cleanup: drop the index created by the dropped constraint if not auto-removed.
--
-- Why this order: A + B's partial indexes are mutually exclusive on their WHERE
-- predicates (IS NULL vs IS NOT NULL). They can coexist with the old global
-- UNIQUE. Creating them BEFORE dropping the old global UNIQUE means at no point
-- during the migration is the table without uniqueness coverage.
--
-- Data migration (file_path UPDATEs, ingestion_jobs metadata) lives in
-- scripts/wiki-sync/migrate-to-v4.cjs (Sprint 1 PR). Migration tool runs
-- POST-migration-apply and is idempotent. This DDL itself does NOT mutate
-- existing data — the 14 current rows still satisfy global uniqueness so
-- partial indexes' uniqueness checks pass on creation.
--
-- Rollback: NONE (forward-only per repo convention). To revert:
--   ALTER TABLE ops.knowledge_pages ADD CONSTRAINT knowledge_pages_slug_key UNIQUE (slug);
--   DROP INDEX IF EXISTS ops.knowledge_pages_source_record_slug_uniq;
--   DROP INDEX IF EXISTS ops.knowledge_pages_derived_slug_uniq;
-- ...but ONLY after ensuring no slug collisions exist (which v4.0 introduces
-- legitimately, e.g. 'wedge' in both wiki/pg-do-things/ and wiki/blank-4-steps/).
-- A v5 revert would require coordinated data deduplication first.
-- ============================================================================

BEGIN;

-- Block A: partial UNIQUE for source RECORDs (global uniqueness preserved).
-- Source RECORDs have extracted_from_source_id IS NULL (they ARE the source,
-- not derived FROM a source). All 13 current "ingest target" pages plus
-- per-source RECORDs land here.
-- IF NOT EXISTS guards against partial-reapply foot-gun (CTO nit b).
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_pages_source_record_slug_uniq
  ON ops.knowledge_pages (slug)
  WHERE extracted_from_source_id IS NULL;

COMMENT ON INDEX ops.knowledge_pages_source_record_slug_uniq IS
  'v4.0 layout: global slug uniqueness for source RECORD pages '
  '(extracted_from_source_id IS NULL). Created by migration 00032.';

-- Block B: composite UNIQUE for derived entities (slug unique within source).
-- Derived entities have extracted_from_source_id pointing at their source
-- RECORD page. The same slug ('wedge', say) can legitimately exist in
-- multiple packages with different nuance per source.
-- IF NOT EXISTS guards against partial-reapply foot-gun (CTO nit b).
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_pages_derived_slug_uniq
  ON ops.knowledge_pages (extracted_from_source_id, slug)
  WHERE extracted_from_source_id IS NOT NULL;

COMMENT ON INDEX ops.knowledge_pages_derived_slug_uniq IS
  'v4.0 layout: composite slug uniqueness for derived entity pages '
  '(extracted_from_source_id IS NOT NULL). Created by migration 00032.';

-- Block C: drop the old global UNIQUE constraint on slug.
-- After this point, slug uniqueness is enforced by the two partial indexes
-- above. The old constraint becomes redundant + blocks library-mode use case.
-- Note: the constraint's underlying index `knowledge_pages_slug_key` is
-- auto-dropped by ALTER TABLE DROP CONSTRAINT.
ALTER TABLE ops.knowledge_pages
  DROP CONSTRAINT IF EXISTS knowledge_pages_slug_key;

-- Block D: defensive cleanup — if for any reason the underlying index
-- wasn't auto-dropped (PostgreSQL version variance), drop it explicitly.
DROP INDEX IF EXISTS ops.knowledge_pages_slug_key;

-- Sanity assertion: REAL ASSERT, not theater (CTO nit a).
-- The 14 current rows must still satisfy uniqueness under the new constraints,
-- AND both partial indexes must be present + the old global UNIQUE absent.
-- If any check fails, RAISE EXCEPTION aborts the transaction. Future re-runs
-- (IF NOT EXISTS above) make this re-runnable safely.
DO $$
DECLARE
  v_source_count int;
  v_derived_count int;
  v_dup_source_slugs int;
  v_dup_derived_slugs int;
  v_old_unique_exists int;
  v_new_unique_source int;
  v_new_unique_derived int;
BEGIN
  -- Count rows in each partition.
  SELECT count(*) INTO v_source_count
    FROM ops.knowledge_pages WHERE extracted_from_source_id IS NULL;
  SELECT count(*) INTO v_derived_count
    FROM ops.knowledge_pages WHERE extracted_from_source_id IS NOT NULL;

  -- Verify no slug collisions under the new partial-uniqueness model.
  SELECT count(*) INTO v_dup_source_slugs FROM (
    SELECT slug FROM ops.knowledge_pages
     WHERE extracted_from_source_id IS NULL
     GROUP BY slug HAVING count(*) > 1
  ) s;
  SELECT count(*) INTO v_dup_derived_slugs FROM (
    SELECT extracted_from_source_id, slug FROM ops.knowledge_pages
     WHERE extracted_from_source_id IS NOT NULL
     GROUP BY extracted_from_source_id, slug HAVING count(*) > 1
  ) d;

  -- Verify old unique constraint is gone.
  SELECT count(*) INTO v_old_unique_exists
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
   WHERE n.nspname = 'ops' AND c.conname = 'knowledge_pages_slug_key';

  -- Verify new partial indexes exist.
  SELECT count(*) INTO v_new_unique_source
    FROM pg_indexes
   WHERE schemaname = 'ops'
     AND indexname = 'knowledge_pages_source_record_slug_uniq';
  SELECT count(*) INTO v_new_unique_derived
    FROM pg_indexes
   WHERE schemaname = 'ops'
     AND indexname = 'knowledge_pages_derived_slug_uniq';

  IF v_dup_source_slugs > 0 THEN
    RAISE EXCEPTION 'Migration 00032 ABORT: % duplicate source-RECORD slugs detected. Reconcile before re-running.', v_dup_source_slugs;
  END IF;

  IF v_dup_derived_slugs > 0 THEN
    RAISE EXCEPTION 'Migration 00032 ABORT: % duplicate (source_id, slug) pairs detected among derived entities.', v_dup_derived_slugs;
  END IF;

  IF v_old_unique_exists <> 0 THEN
    RAISE EXCEPTION 'Migration 00032 ABORT: old constraint knowledge_pages_slug_key still present after drop.';
  END IF;

  IF v_new_unique_source <> 1 OR v_new_unique_derived <> 1 THEN
    RAISE EXCEPTION 'Migration 00032 ABORT: expected 2 new partial indexes, found % + %.', v_new_unique_source, v_new_unique_derived;
  END IF;

  RAISE NOTICE 'Migration 00032 OK: % source RECORDs, % derived entities, 2 partial indexes present, old global UNIQUE gone.',
    v_source_count, v_derived_count;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION FOUNDER ACTION ITEMS (NOT in this SQL):
-- ============================================================================
-- 1. Run migrate-to-v4 script (dry-run first):
--      node scripts/wiki-sync/migrate-to-v4.cjs --dry-run
--      node scripts/wiki-sync/migrate-to-v4.cjs
-- 2. Verify pnpm check clean.
-- 3. Verify /wiki audit clean.
-- 4. Phase 6 sprint plan kicks off Sprint 1 PR.
-- ============================================================================
