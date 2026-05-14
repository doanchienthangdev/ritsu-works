-- ============================================================================
-- Migration 00015: ops.agent_runs HITL audit + episodic recall extensions
-- ============================================================================
-- Adds columns required by governance/HITL.md (Tier D override audit trail)
-- and knowledge/memory-architecture.md (Strategy E episodic recall).
--
-- Additive: existing columns kept, code unaffected.
-- Tables touched:
--   - ops.agent_runs (ALTER): + tier, was_override, override_*, approved_*,
--     outcome, cooldown_seconds, correcting_run_id, recall_*,
--     secrets_accessed, *_payload_hash
--   - Trigger: BEFORE UPDATE raises if was_override = true (per HITL.md
--     "Immutable D-MAX record" requirement)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- HITL audit columns (governance/HITL.md)
-- ----------------------------------------------------------------------------
ALTER TABLE ops.agent_runs
  ADD COLUMN tier                  text,
  ADD COLUMN was_override          boolean NOT NULL DEFAULT false,
  ADD COLUMN override_reason       text,
  ADD COLUMN override_method       text,   -- 'telegram' | 'telegram+github'
  ADD COLUMN approved_by           text,   -- 'founder' (telegram user id hash)
  ADD COLUMN approved_at           timestamptz,
  ADD COLUMN approval_message_url  text,
  ADD COLUMN cooldown_seconds      integer,
  ADD COLUMN correcting_run_id     uuid REFERENCES ops.agent_runs(id),
  ADD COLUMN outcome               text,   -- 'success'|'failed'|'rejected'|'timeout'|'aborted'|'blocked'
  ADD COLUMN secrets_accessed      text[];

ALTER TABLE ops.agent_runs
  ADD CONSTRAINT agent_runs_tier_valid
  CHECK (tier IS NULL OR tier IN ('A', 'B', 'C', 'D-Std', 'D-MAX'));

ALTER TABLE ops.agent_runs
  ADD CONSTRAINT agent_runs_outcome_valid
  CHECK (outcome IS NULL OR outcome IN ('success', 'failed', 'rejected', 'timeout', 'aborted', 'blocked'));

ALTER TABLE ops.agent_runs
  ADD CONSTRAINT agent_runs_override_requires_metadata
  CHECK (
    was_override = false
    OR (override_reason IS NOT NULL AND override_method IS NOT NULL AND approved_by IS NOT NULL)
  );

-- ----------------------------------------------------------------------------
-- Episodic recall columns (knowledge/memory-architecture.md Strategy E)
-- ----------------------------------------------------------------------------
ALTER TABLE ops.agent_runs
  ADD COLUMN recall_run_ids        uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  ADD COLUMN recall_tokens_loaded  integer;

-- ----------------------------------------------------------------------------
-- Payload hashes (for redacted/large payload audit without storing the body)
-- ----------------------------------------------------------------------------
ALTER TABLE ops.agent_runs
  ADD COLUMN input_payload_hash    text,
  ADD COLUMN output_payload_hash   text;

-- ----------------------------------------------------------------------------
-- Immutability trigger for override rows (governance/HITL.md "D-MAX immutable")
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ops.agent_runs_override_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.was_override = true THEN
    -- Allow correcting_run_id linkage from a follow-up correction entry; deny
    -- all other column mutations.
    IF NEW.was_override IS DISTINCT FROM OLD.was_override
       OR NEW.override_reason IS DISTINCT FROM OLD.override_reason
       OR NEW.override_method IS DISTINCT FROM OLD.override_method
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approval_message_url IS DISTINCT FROM OLD.approval_message_url
       OR NEW.tier IS DISTINCT FROM OLD.tier
       OR NEW.input_payload IS DISTINCT FROM OLD.input_payload
       OR NEW.output_payload IS DISTINCT FROM OLD.output_payload
       OR NEW.cost_usd IS DISTINCT FROM OLD.cost_usd THEN
      RAISE EXCEPTION 'ops.agent_runs row with was_override=true is immutable (governance/HITL.md). To correct, insert a new row with correcting_run_id = %', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agent_runs_override_immutable
  BEFORE UPDATE ON ops.agent_runs
  FOR EACH ROW
  EXECUTE FUNCTION ops.agent_runs_override_immutable();

-- ----------------------------------------------------------------------------
-- Indexes for new query paths
-- ----------------------------------------------------------------------------
CREATE INDEX idx_agent_runs_override ON ops.agent_runs (started_at DESC)
  WHERE was_override = true;

CREATE INDEX idx_agent_runs_tier ON ops.agent_runs (tier, started_at DESC)
  WHERE tier IS NOT NULL;

CREATE INDEX idx_agent_runs_recall ON ops.agent_runs USING GIN (recall_run_ids)
  WHERE recall_run_ids <> ARRAY[]::uuid[];

CREATE INDEX idx_agent_runs_correcting ON ops.agent_runs (correcting_run_id)
  WHERE correcting_run_id IS NOT NULL;

COMMENT ON COLUMN ops.agent_runs.tier IS 'HITL tier per governance/HITL.md: A|B|C|D-Std|D-MAX';
COMMENT ON COLUMN ops.agent_runs.was_override IS 'True when founder magic phrase override was used. Row becomes immutable.';
COMMENT ON COLUMN ops.agent_runs.recall_run_ids IS 'Past agent_runs.id loaded as episodic context (memory-architecture.md Strategy E).';
COMMENT ON COLUMN ops.agent_runs.outcome IS 'Higher-level outcome distinct from state (running/completed). NULL until completion.';
