-- ============================================================================
-- Migration 00016: Memory architecture tables (Strategy E)
-- ============================================================================
-- Implements knowledge/memory-architecture.md Strategy E:
--   - Type 2 memory (episodic): ops.run_summaries
--   - Correction feedback loop: ops.corrections
--
-- Tables:
--   - ops.run_summaries: ~150-token post-hoc summary per completed agent_run.
--     Powers `episodic-recall` skill.
--   - ops.corrections: founder rejects/edits/redirects of agent output.
--     Powers learning loop (monthly-learning-review skill).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ops.run_summaries — episodic memory (Type 2)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.run_summaries (
  run_id          uuid PRIMARY KEY REFERENCES ops.agent_runs(id) ON DELETE CASCADE,
  agent_slug      text NOT NULL,
  action_name     text,
  summary         text NOT NULL,        -- ~150 tokens of compressed context
  artifacts       jsonb NOT NULL DEFAULT '{}'::jsonb,
  ts              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_run_summaries_agent ON ops.run_summaries (agent_slug, ts DESC);
CREATE INDEX idx_run_summaries_action ON ops.run_summaries (action_name, ts DESC)
  WHERE action_name IS NOT NULL;

COMMENT ON TABLE ops.run_summaries IS 'Post-hoc compressed summary per agent_run (memory-architecture.md Strategy E). One row per agent_run with emit_run_summary=true.';

-- ----------------------------------------------------------------------------
-- ops.corrections — founder feedback loop
-- ----------------------------------------------------------------------------
CREATE TABLE ops.corrections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            uuid NOT NULL REFERENCES ops.agent_runs(id) ON DELETE CASCADE,
  corrected_by      text NOT NULL,        -- 'founder' or backup operator id
  correction_kind   text NOT NULL,        -- 'reject'|'edit'|'redirect'|'reframe'
  correction_note   text NOT NULL,
  ts                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT corrections_kind_valid
    CHECK (correction_kind IN ('reject', 'edit', 'redirect', 'reframe'))
);

CREATE INDEX idx_corrections_run ON ops.corrections (run_id);
CREATE INDEX idx_corrections_ts ON ops.corrections (ts DESC);
CREATE INDEX idx_corrections_kind ON ops.corrections (correction_kind, ts DESC);

COMMENT ON TABLE ops.corrections IS 'Founder corrections to agent outputs. Surfaced by episodic-recall and aggregated by monthly-learning-review (memory-architecture.md).';
