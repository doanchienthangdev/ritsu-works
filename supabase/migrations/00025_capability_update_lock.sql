-- ============================================================================
-- Migration 00025: Capability update lock + version field
-- ============================================================================
-- Adds concurrency lock + spec versioning to ops.capability_runs to support
-- /cla update sub-flows (fix, extend, revise, tune, deprecate) per
-- capability `cla-update-mechanism`.
--
-- See:
--   - .claude/commands/cla.md (Sprint 1 — extended subcommand parser)
--   - 06-ai-ops/sops/SOP-AIOPS-001-{fix,extend,revise,tune,deprecate}/ (Sprint 2)
--   - .archives/cla/cla-update-mechanism/spec.md §12 (concurrency model)
--                                                 §14 (spec versioning)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Concurrency lock columns
-- ----------------------------------------------------------------------------
-- Acquired at Phase 0 of any update sub-flow. Released at Phase 8 success
-- or any abort. Auto-expires after 24h (enforced on read, no cron needed
-- pre-PMF). See spec §12.

ALTER TABLE ops.capability_runs
  ADD COLUMN update_lock_session_id  text NULL,
  ADD COLUMN update_lock_acquired_at timestamptz NULL;

-- Both lock fields must move together: either both set or both null.
ALTER TABLE ops.capability_runs
  ADD CONSTRAINT capability_runs_update_lock_pair_valid CHECK (
    (update_lock_session_id IS NULL AND update_lock_acquired_at IS NULL)
    OR
    (update_lock_session_id IS NOT NULL AND update_lock_acquired_at IS NOT NULL)
  );

-- Partial index for fast lock-held queries. Most rows have NULL lock columns.
CREATE INDEX IF NOT EXISTS idx_capability_runs_update_lock
  ON ops.capability_runs (update_lock_session_id, update_lock_acquired_at)
  WHERE update_lock_session_id IS NOT NULL;

COMMENT ON COLUMN ops.capability_runs.update_lock_session_id IS
  'Concurrency lock owner for /cla update sub-flows. NULL = unlocked. ' ||
  'Acquired at Phase 0; released at Phase 8 or abort. Auto-expires 24h on read.';

COMMENT ON COLUMN ops.capability_runs.update_lock_acquired_at IS
  'When the update lock was acquired. Used for 24h auto-expiry on read.';

-- ----------------------------------------------------------------------------
-- 2. Version field (semver)
-- ----------------------------------------------------------------------------
-- Tracks the spec version of the capability. Bumped by the version-bumper
-- skill per sub-flow:
--   :fix     → patch++ (1.0.0 → 1.0.1)
--   :tune    → patch++ (1.0.0 → 1.0.1)
--   :extend  → minor++ (1.0.0 → 1.1.0)
--   :revise  → major++ (1.0.0 → 2.0.0)
--   :deprecate → no bump (state transition only)

ALTER TABLE ops.capability_runs
  ADD COLUMN version text NOT NULL DEFAULT '1.0.0';

-- Validate semver format. NB: also matches '0.x.x' for early/dev capabilities.
ALTER TABLE ops.capability_runs
  ADD CONSTRAINT capability_runs_version_valid CHECK (
    version ~ '^\d+\.\d+\.\d+$'
  );

COMMENT ON COLUMN ops.capability_runs.version IS
  'Semver of the capability spec. Bumped per sub-flow by version-bumper skill.';

-- ----------------------------------------------------------------------------
-- 3. Helper function: acquire update lock (atomic)
-- ----------------------------------------------------------------------------
-- Returns the row id on successful acquisition, NULL if already locked by
-- another live session. Auto-expires locks older than 24h on the same call.

CREATE OR REPLACE FUNCTION ops.capability_acquire_update_lock(
  p_capability_id text,
  p_session_id text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_row_id uuid;
BEGIN
  UPDATE ops.capability_runs
  SET update_lock_session_id = p_session_id,
      update_lock_acquired_at = now()
  WHERE capability_id = p_capability_id
    AND state IN ('operating', 'deployed')
    AND (
      update_lock_session_id IS NULL
      OR update_lock_acquired_at < now() - interval '24 hours'
    )
  RETURNING id INTO v_row_id;

  RETURN v_row_id;  -- NULL if no row updated (lock held)
END;
$$;

COMMENT ON FUNCTION ops.capability_acquire_update_lock IS
  'Atomic acquire of update lock for /cla update sub-flows. Returns the ' ||
  'capability_runs.id on success, NULL if locked by a live session (<24h).';

-- ----------------------------------------------------------------------------
-- 4. Helper function: release update lock
-- ----------------------------------------------------------------------------
-- Releases lock if owned by p_session_id. Returns true on success.

CREATE OR REPLACE FUNCTION ops.capability_release_update_lock(
  p_capability_id text,
  p_session_id text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE ops.capability_runs
  SET update_lock_session_id = NULL,
      update_lock_acquired_at = NULL
  WHERE capability_id = p_capability_id
    AND update_lock_session_id = p_session_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

COMMENT ON FUNCTION ops.capability_release_update_lock IS
  'Release update lock. Returns true if released, false if not owned ' ||
  'by p_session_id (already released or owned by other).';

-- ----------------------------------------------------------------------------
-- 5. View: lineage chain (for /cla history command)
-- ----------------------------------------------------------------------------
-- Recursive query through supersedes_id chain. Returns all rows for a
-- capability_id ordered by proposed_at.

CREATE OR REPLACE VIEW ops.v_capability_lineage AS
WITH RECURSIVE chain AS (
  -- Base: original row (no predecessor)
  SELECT
    cr.*,
    0 AS chain_depth,
    cr.id AS root_id
  FROM ops.capability_runs cr
  WHERE cr.supersedes_id IS NULL

  UNION ALL

  -- Recursive: rows that supersede prior rows
  SELECT
    cr.*,
    c.chain_depth + 1,
    c.root_id
  FROM ops.capability_runs cr
  JOIN chain c ON cr.supersedes_id = c.id
)
SELECT * FROM chain
ORDER BY capability_id, chain_depth;

COMMENT ON VIEW ops.v_capability_lineage IS
  'Full lineage chain of every capability via supersedes_id. ' ||
  'Used by /cla history <id> command. chain_depth = 0 for original row.';

-- ============================================================================
-- DONE — migration 00025
-- ============================================================================
