-- ============================================================================
-- Migration 00021: ops.consistency_checks — Cross-Tier Consistency Engine v1.0b
-- ============================================================================
-- First-class lifecycle table for drift events detected by L1/L2/L3 invariant
-- checks (knowledge/cross-tier-invariants.yaml).
--
-- Lifecycle: pending → running → passed | failed | fix_proposed
--            fix_proposed → fix_merged | fix_reverted | wont_fix
--            fix_reverted → wont_fix (revert depth cap = 1; see CEO plan E3f)
--
-- Background: .archives/ceo-plans/2026-05-14-cross-tier-consistency-engine.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper function for updated_at trigger (idempotent)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE ops.consistency_checks (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invariant_id             text NOT NULL,                  -- references cross-tier-invariants.yaml id
  check_kind               text NOT NULL,                  -- 'L1' | 'L2' | 'L3'
  target_path              text,                           -- file/table path that drifted (NULL when invariant has no specific target instance)
  state                    text NOT NULL DEFAULT 'pending',
  state_since              timestamptz NOT NULL DEFAULT now(),
  severity                 text NOT NULL,                  -- 'info' | 'warn' | 'critical'
  hitl_tier                text NOT NULL,                  -- 'A' | 'B' | 'C' | 'D-Std' | 'D-MAX'
  drift_description        text,
  proposed_fix_diff        text,
  proposed_fix_strategy    text,                           -- references fix_strategy enum from yaml
  proposed_fix_confidence  numeric(3, 2),                  -- 0.00 .. 1.00
  proposed_fix_pr_url      text,
  by_run_id                uuid REFERENCES ops.agent_runs(id) ON DELETE SET NULL,
  founder_decision_ts      timestamptz,
  founder_note             text,
  revert_run_id            uuid,                           -- chain to a revert entry; cap=1 enforced in app code
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_consistency_state CHECK (state IN (
    'pending', 'running', 'passed', 'failed',
    'fix_proposed', 'fix_merged', 'fix_reverted', 'wont_fix'
  )),
  CONSTRAINT ck_consistency_check_kind CHECK (check_kind IN ('L1', 'L2', 'L3')),
  CONSTRAINT ck_consistency_severity CHECK (severity IN ('info', 'warn', 'critical')),
  CONSTRAINT ck_consistency_hitl_tier CHECK (hitl_tier IN ('A', 'B', 'C', 'D-Std', 'D-MAX')),
  CONSTRAINT ck_consistency_confidence_range CHECK (
    proposed_fix_confidence IS NULL
    OR (proposed_fix_confidence >= 0 AND proposed_fix_confidence <= 1)
  )
);

CREATE INDEX idx_consistency_state ON ops.consistency_checks (state, created_at DESC);
CREATE INDEX idx_consistency_invariant ON ops.consistency_checks (invariant_id, created_at DESC);
CREATE INDEX idx_consistency_severity ON ops.consistency_checks (severity, created_at DESC)
  WHERE state NOT IN ('passed', 'wont_fix');
CREATE INDEX idx_consistency_target ON ops.consistency_checks (invariant_id, target_path)
  WHERE state = 'wont_fix';
CREATE INDEX idx_consistency_open ON ops.consistency_checks (state)
  WHERE state IN ('failed', 'fix_proposed', 'running');

CREATE TRIGGER trg_consistency_checks_updated_at
  BEFORE UPDATE ON ops.consistency_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

COMMENT ON TABLE ops.consistency_checks IS 'Cross-Tier Consistency Engine lifecycle log (v1.0b). Each row = one invariant evaluation result. Powers dashboard + alerts + L3 sweep history.';

-- ----------------------------------------------------------------------------
-- RLS — founder read only (mirrors 00010 pattern)
-- ----------------------------------------------------------------------------
ALTER TABLE ops.consistency_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY founder_read_consistency_checks ON ops.consistency_checks
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');
