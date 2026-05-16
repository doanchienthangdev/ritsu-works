-- ============================================================================
-- Migration 00027: Wiki Sync Extensions (capability `wiki-sync-from-refs`)
-- ============================================================================
-- Renamed from 00022 → 00027 per CTO Phase-5 review (00022 collides with live
-- `00022_consistency_helper_rpcs.sql`; 00023-00026 also taken).
--
-- Closes the four CTO Phase-2 must-fixes for capability `wiki-sync-from-refs`:
--
--   1. Add (source_kind, source_ref, source_hash) to ops.knowledge_pages so
--      "find all pages ingested from PDF" is a SARGable query, not a JSONB scan.
--   2. Replace non-unique dedup indexes on ops.ingestion_jobs with UNIQUE
--      partial indexes scoped to active states. Prevents concurrent /wiki sync
--      from creating duplicate job rows.
--   3. (Implicit in #1) — re-sync detection (problem.md Q4) now has a proper
--      column to store the ref's content hash.
--   4. Add ops.wiki_sync_lock(entity_type, slug) helper wrapping
--      pg_advisory_xact_lock to prevent racing wiki-page writes across
--      concurrent sessions (CTO concurrency finding).
--
-- This migration is ADDITIVE only. Rollback:
--   ALTER TABLE ops.knowledge_pages DROP COLUMN source_kind,
--     DROP COLUMN source_ref, DROP COLUMN source_hash;
--   DROP INDEX ops.idx_ingestion_dedup_url_unique, ops.idx_ingestion_dedup_content_unique;
--   CREATE INDEX idx_ingestion_dedup_url ON ops.ingestion_jobs (source_hash)
--     WHERE source_hash IS NOT NULL;
--   CREATE INDEX idx_ingestion_dedup_content ON ops.ingestion_jobs (content_hash)
--     WHERE content_hash IS NOT NULL;
--   DROP FUNCTION ops.wiki_sync_lock(text, text);
--
-- Per repo convention, rollback is documented above but not committed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add source_kind / source_ref / source_hash to ops.knowledge_pages
-- ----------------------------------------------------------------------------
ALTER TABLE ops.knowledge_pages
  ADD COLUMN source_kind text,                         -- 'article' | 'book' | 'episode' | 'meeting' | 'idea' | NULL (founder-written)
  ADD COLUMN source_ref text,                          -- URL, file path, video ID — the actual ref
  ADD COLUMN source_hash text;                         -- sha256 of source content for re-sync detection

COMMENT ON COLUMN ops.knowledge_pages.source_kind IS 'Capability `wiki-sync-from-refs`: which source kind this page was generated from. NULL = founder-hand-written or pre-wiki-sync.';
COMMENT ON COLUMN ops.knowledge_pages.source_ref IS 'Capability `wiki-sync-from-refs`: the actual ref (URL / file path / video ID). Used by re-sync to know what to re-fetch.';
COMMENT ON COLUMN ops.knowledge_pages.source_hash IS 'Capability `wiki-sync-from-refs`: sha256 of the source content at last ingest. Used to detect ref changes for re-sync.';

CREATE INDEX idx_pages_source_kind ON ops.knowledge_pages (source_kind) WHERE source_kind IS NOT NULL;
CREATE INDEX idx_pages_source_ref ON ops.knowledge_pages (source_ref) WHERE source_ref IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. Replace non-unique dedup indexes on ops.ingestion_jobs with UNIQUE partial
-- ----------------------------------------------------------------------------
-- Original non-unique indexes (from 00007:116-117) allow duplicates. The new
-- UNIQUE partial indexes scope uniqueness to ACTIVE states only — completed,
-- failed, duplicate, low_quality rows can repeat (legitimate re-ingest history).
--
-- PRECHECK (per CTO Phase-5 review): the DROP → CREATE UNIQUE pattern would
-- fail mid-migration if any pre-existing rows in the active states have
-- duplicate source_hash or content_hash. Fail fast here with a clear error
-- rather than midway through DDL.
DO $$
DECLARE
  dup_url_count int;
  dup_content_count int;
BEGIN
  SELECT count(*) INTO dup_url_count
    FROM (
      SELECT source_hash FROM ops.ingestion_jobs
       WHERE source_hash IS NOT NULL
         AND state IN ('queued', 'fetching', 'processing')
       GROUP BY source_hash
      HAVING count(*) > 1
    ) sub;

  SELECT count(*) INTO dup_content_count
    FROM (
      SELECT content_hash FROM ops.ingestion_jobs
       WHERE content_hash IS NOT NULL
         AND state IN ('queued', 'fetching', 'processing')
       GROUP BY content_hash
      HAVING count(*) > 1
    ) sub;

  IF dup_url_count > 0 OR dup_content_count > 0 THEN
    RAISE EXCEPTION
      'Cannot apply UNIQUE partial indexes: % duplicate source_hash + % duplicate content_hash rows exist in active states. Clean up duplicates first.',
      dup_url_count, dup_content_count;
  END IF;
END $$;

DROP INDEX ops.idx_ingestion_dedup_url;
DROP INDEX ops.idx_ingestion_dedup_content;

CREATE UNIQUE INDEX idx_ingestion_dedup_url_unique
  ON ops.ingestion_jobs (source_hash)
  WHERE source_hash IS NOT NULL
    AND state IN ('queued', 'fetching', 'processing');

CREATE UNIQUE INDEX idx_ingestion_dedup_content_unique
  ON ops.ingestion_jobs (content_hash)
  WHERE content_hash IS NOT NULL
    AND state IN ('queued', 'fetching', 'processing');

-- Retain a non-unique index for read-paths over historic jobs:
CREATE INDEX idx_ingestion_history_url ON ops.ingestion_jobs (source_hash)
  WHERE source_hash IS NOT NULL;
CREATE INDEX idx_ingestion_history_content ON ops.ingestion_jobs (content_hash)
  WHERE content_hash IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Advisory-lock helper for cross-process /wiki sync concurrency
-- ----------------------------------------------------------------------------
-- Wraps pg_advisory_xact_lock with a deterministic int key derived from
-- entity_type + slug. Lock is auto-released at transaction end. Caller pattern:
--
--   BEGIN;
--   SELECT ops.wiki_sync_lock('book', 'make-it-stick');  -- blocks if held
--   -- do work: INSERT into ingestion_jobs, then knowledge_pages, then embeddings
--   COMMIT;  -- lock auto-released
--
-- Returns void on success; blocks until lock is acquired.
CREATE OR REPLACE FUNCTION ops.wiki_sync_lock(entity_type text, slug text)
RETURNS void AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('wiki-sync:' || COALESCE(entity_type, '_') || ':' || COALESCE(slug, '_'))::bigint
  );
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION ops.wiki_sync_lock(text, text) IS
  'Capability `wiki-sync-from-refs`: acquires a transaction-scoped advisory lock keyed on (entity_type, slug). Used by /wiki sync to prevent concurrent writes to the same wiki page from racing on knowledge_pages.slug UNIQUE constraint or last-writer-wins on file writes.';
