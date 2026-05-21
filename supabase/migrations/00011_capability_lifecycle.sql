-- ============================================================================
-- Migration 00011: Capability Lifecycle (Bài #20)
-- ============================================================================
-- ops.capability_runs: tracks lifecycle of each CLA workflow run.
-- Multi-session resilient — Phase 7 implementation can span weeks.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ops.capability_runs — Capability lifecycle tracking
-- ----------------------------------------------------------------------------
CREATE TABLE ops.capability_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Capability identification
  capability_id   text NOT NULL,                -- slug from problem.md
  capability_name text NOT NULL,
  pillar_owner    text NOT NULL,                -- 00-core | 01-growth | ...
  
  -- State machine (Bài #13 convention)
  state           text NOT NULL DEFAULT 'proposed',
  state_since     timestamptz NOT NULL DEFAULT now(),
  state_payload   jsonb,                         -- {sub_state: 'sprint_2_skills', ...}
  state_version   text NOT NULL DEFAULT '1.0.0',
  
  -- Phase tracking (8 phases of CLA)
  current_phase   integer NOT NULL DEFAULT 1,
  phases_completed integer[] NOT NULL DEFAULT ARRAY[]::integer[],
  
  -- Artifacts (paths under wiki/capabilities/<id>/)
  problem_path        text,
  domain_analysis_path text,
  gap_analysis_path    text,
  options_path         text,
  spec_path            text,
  sprint_plan_path     text,
  retrospective_path   text,
  
  -- Bài-toán touched
  bai_toan_touched     integer[],
  
  -- Cost & impact (Bài #7 + #19)
  cost_bucket          text,
  estimated_cost_setup_usd     numeric(10, 2),
  estimated_cost_recurring_usd numeric(10, 2),
  estimated_founder_hours      numeric(6, 2),
  
  actual_cost_setup_usd        numeric(10, 2),
  actual_cost_recurring_usd    numeric(10, 2),
  actual_founder_hours         numeric(6, 2),
  
  -- KPI targets
  target_kpis          text[],
  target_value         numeric,
  current_value        numeric,
  
  -- Decisions (Bài #15)
  phase_4_decision_id  uuid REFERENCES ops.decisions(id),  -- option selection
  phase_5_decision_id  uuid REFERENCES ops.decisions(id),  -- architecture (Tier C)
  
  -- HITL trail (Bài #2)
  hitl_phase_4_run_id  uuid REFERENCES ops.hitl_runs(id),
  hitl_phase_5_run_id  uuid REFERENCES ops.hitl_runs(id),
  hitl_phase_6_run_id  uuid REFERENCES ops.hitl_runs(id),
  
  -- Lifecycle dates
  proposed_by          text NOT NULL DEFAULT 'founder',
  proposed_at          timestamptz NOT NULL DEFAULT now(),
  approved_at          timestamptz,
  deployed_at          timestamptz,
  operating_since      timestamptz,
  deprecated_at        timestamptz,
  
  -- Lineage
  superseded_by_id     uuid REFERENCES ops.capability_runs(id),
  supersedes_id        uuid REFERENCES ops.capability_runs(id),
  
  -- Trigger source
  triggered_by_kind    text NOT NULL,            -- 'voice_note' | 'cla_command' | 'wiki_entry'
  triggered_by_payload jsonb,
  
  CONSTRAINT capability_runs_state_valid CHECK (
    state IN ('proposed', 'analyzing', 'architecting', 'planning',
              'implementing', 'deployed', 'operating', 'deprecated', 'superseded')
  ),
  CONSTRAINT capability_runs_phase_valid CHECK (current_phase BETWEEN 1 AND 8),
  CONSTRAINT capability_runs_pillar_valid CHECK (
    pillar_owner ~ '^0[0-9]-[a-z-]+$'
  )
);

-- Unique active capability per slug (multiple runs allowed if superseded)
CREATE UNIQUE INDEX idx_capability_runs_active_slug
  ON ops.capability_runs (capability_id)
  WHERE state NOT IN ('deprecated', 'superseded');

CREATE INDEX idx_capability_runs_state ON ops.capability_runs (state, state_since);
CREATE INDEX idx_capability_runs_phase ON ops.capability_runs (current_phase) 
  WHERE state IN ('proposed', 'analyzing', 'architecting', 'planning', 'implementing');
CREATE INDEX idx_capability_runs_pillar ON ops.capability_runs (pillar_owner);
CREATE INDEX idx_capability_runs_proposed_at ON ops.capability_runs (proposed_at DESC);

CREATE TRIGGER trg_capability_runs_state_since
  BEFORE UPDATE ON ops.capability_runs
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE ops.capability_runs IS 
  'Capability lifecycle tracking (Bài #20 CLA). Each row = one CLA workflow run from proposal to operating.';

-- ----------------------------------------------------------------------------
-- ops.capability_phase_events — append-only phase transition log
-- ----------------------------------------------------------------------------
CREATE TABLE ops.capability_phase_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  
  capability_run_id uuid NOT NULL REFERENCES ops.capability_runs(id) ON DELETE CASCADE,
  phase             integer NOT NULL,
  event_type        text NOT NULL,              -- 'started', 'artifact_created', 'hitl_requested', 'completed', 'failed'
  
  payload           jsonb,                       -- skill output, hitl response, error, etc.
  
  CONSTRAINT phase_events_phase_valid CHECK (phase BETWEEN 1 AND 8)
);

CREATE INDEX idx_phase_events_capability ON ops.capability_phase_events (capability_run_id, phase, occurred_at);
CREATE INDEX idx_phase_events_type ON ops.capability_phase_events (event_type, occurred_at DESC);

COMMENT ON TABLE ops.capability_phase_events IS
  'Append-only log of CLA phase events. Audit trail for capability lifecycle.';

-- ----------------------------------------------------------------------------
-- View: active capability pipeline
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW ops.v_capability_pipeline AS
SELECT
  cr.id,
  cr.capability_id,
  cr.capability_name,
  cr.pillar_owner,
  cr.state,
  cr.current_phase,
  cr.proposed_at,
  cr.estimated_cost_recurring_usd,
  cr.actual_cost_recurring_usd,
  cr.estimated_founder_hours,
  cr.actual_founder_hours,
  cr.target_kpis,
  
  -- Phase progress percentage
  CASE
    WHEN array_length(cr.phases_completed, 1) IS NULL THEN 0
    ELSE round((array_length(cr.phases_completed, 1)::numeric / 8) * 100, 1)
  END AS phase_progress_pct,
  
  -- Time in current state
  EXTRACT(EPOCH FROM (now() - cr.state_since)) / 3600 AS hours_in_current_state,
  
  -- Lineage
  cr.supersedes_id,
  cr.superseded_by_id
FROM ops.capability_runs cr
WHERE cr.state NOT IN ('superseded', 'deprecated')
ORDER BY 
  CASE cr.state
    WHEN 'proposed' THEN 1
    WHEN 'analyzing' THEN 2
    WHEN 'architecting' THEN 3
    WHEN 'planning' THEN 4
    WHEN 'implementing' THEN 5
    WHEN 'deployed' THEN 6
    WHEN 'operating' THEN 7
  END,
  cr.proposed_at DESC;

COMMENT ON VIEW ops.v_capability_pipeline IS
  'Capability pipeline view: all active capabilities sorted by lifecycle stage.';

-- ----------------------------------------------------------------------------
-- Function: advance capability phase
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ops.capability_advance_phase(
  p_capability_run_id uuid,
  p_completed_phase integer,
  p_artifact_path text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_state text;
  v_event_id uuid;
BEGIN
  -- Determine new state based on completed phase
  v_new_state := CASE p_completed_phase
    WHEN 1 THEN 'analyzing'      -- after Phase 1
    WHEN 2 THEN 'analyzing'      -- after Phase 2 (still in analyzing)
    WHEN 3 THEN 'architecting'   -- after Phase 3
    WHEN 4 THEN 'architecting'   -- after Phase 4 (still in architecting)
    WHEN 5 THEN 'planning'       -- after Phase 5
    WHEN 6 THEN 'implementing'   -- after Phase 6
    WHEN 7 THEN 'deployed'       -- after Phase 7
    WHEN 8 THEN 'operating'      -- after Phase 8
    ELSE NULL
  END;
  
  IF v_new_state IS NULL THEN
    RAISE EXCEPTION 'Invalid phase: %', p_completed_phase;
  END IF;
  
  -- Update capability run
  UPDATE ops.capability_runs
  SET
    state = v_new_state,
    current_phase = LEAST(p_completed_phase + 1, 8),
    phases_completed = array_append(phases_completed, p_completed_phase),
    deployed_at = CASE WHEN v_new_state = 'deployed' THEN now() ELSE deployed_at END,
    operating_since = CASE WHEN v_new_state = 'operating' THEN now() ELSE operating_since END
  WHERE id = p_capability_run_id;
  
  -- Log phase event
  INSERT INTO ops.capability_phase_events (
    capability_run_id, phase, event_type, payload
  ) VALUES (
    p_capability_run_id, p_completed_phase, 'completed',
    jsonb_build_object('artifact_path', p_artifact_path, 'new_state', v_new_state)
  )
  RETURNING id INTO v_event_id;
  
  -- Fire ops.events for downstream subscribers
  INSERT INTO ops.events (event_type, source, payload) VALUES (
    'ritsu.capability.phase_' || p_completed_phase || '_completed',
    'cla_workflow',
    jsonb_build_object(
      'capability_run_id', p_capability_run_id,
      'phase_completed', p_completed_phase,
      'new_state', v_new_state,
      'artifact_path', p_artifact_path
    )
  );
  
  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION ops.capability_advance_phase IS
  'Advance capability through CLA phases. Updates state, logs event, fires ops.events.';
