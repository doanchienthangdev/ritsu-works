-- ============================================================================
-- Migration 00029: Loosen capability_runs active uniqueness to ROOT-ONLY
-- ============================================================================
-- The original 00011-era index `idx_capability_runs_active_slug` enforced
-- AT MOST ONE non-terminal row per capability_id:
--
--   CREATE UNIQUE INDEX idx_capability_runs_active_slug
--   ON ops.capability_runs (capability_id)
--   WHERE state <> ALL (ARRAY['deprecated', 'superseded']);
--
-- This made CLA evolution sub-flows (/cla revise/extend/fix) physically
-- impossible to express with the supersede-at-Phase-8 semantic the flow doc
-- prescribes — parent and child must both be alive during multi-day
-- revise work; supersede transition is the *Phase 8 closing ceremony*, not
-- the *Phase 0 opening one*.
--
-- New index enforces uniqueness only at the ROOT of the supersede chain:
--
--   CREATE UNIQUE INDEX idx_capability_runs_root_active
--   ON ops.capability_runs (capability_id)
--   WHERE state <> ALL (ARRAY['deprecated', 'superseded'])
--     AND supersedes_id IS NULL;
--
-- Invariant after migration: exactly one row per capability_id has
-- supersedes_id IS NULL AND state IN active-set. Child rows (supersedes_id
-- NOT NULL) are unconstrained by uniqueness — chain depth is unbounded.
--
-- Serialization of concurrent evolution attempts is still enforced by
-- ops.capability_acquire_update_lock (one lock holder at a time on the
-- latest non-superseded row of the chain).
--
-- Driver: blocked Phase 0e INSERT of revise child row for
-- wiki-sync-from-refs (2026-05-17). Founder Option A path approved this
-- migration as the loosening route.
--
-- Pre-check: today there are 0 rows with supersedes_id NOT NULL in any
-- state (no revise/extend has yet completed Phase 8), so the new partial
-- index is structurally equivalent to the old one for existing data —
-- DROP→CREATE is safe.
--
-- Rollback (documented, not committed):
--   DROP INDEX ops.idx_capability_runs_root_active;
--   CREATE UNIQUE INDEX idx_capability_runs_active_slug
--     ON ops.capability_runs (capability_id)
--     WHERE state <> ALL (ARRAY['deprecated', 'superseded']);
-- ============================================================================

-- Pre-check guard: bail if any pre-existing data would violate the new index.
DO $$
DECLARE
  v_root_dup_count int;
BEGIN
  SELECT count(*) INTO v_root_dup_count
    FROM (
      SELECT capability_id FROM ops.capability_runs
       WHERE state <> ALL (ARRAY['deprecated', 'superseded'])
         AND supersedes_id IS NULL
       GROUP BY capability_id
      HAVING count(*) > 1
    ) sub;

  IF v_root_dup_count > 0 THEN
    RAISE EXCEPTION
      'Cannot create root-active unique index: % capability_ids have multiple active root rows. Clean up first.',
      v_root_dup_count;
  END IF;
END $$;

DROP INDEX IF EXISTS ops.idx_capability_runs_active_slug;

CREATE UNIQUE INDEX idx_capability_runs_root_active
  ON ops.capability_runs (capability_id)
  WHERE state <> ALL (ARRAY['deprecated', 'superseded'])
    AND supersedes_id IS NULL;

COMMENT ON INDEX ops.idx_capability_runs_root_active IS
  'CLA invariant (migration 00029): exactly one root (supersedes_id IS NULL) '
  'active row per capability_id. Child supersede rows are unconstrained — '
  'revise/extend chains may have arbitrary depth. Concurrency control is '
  'enforced separately by ops.capability_acquire_update_lock.';
