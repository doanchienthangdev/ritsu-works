-- ============================================================================
-- Migration 00003: Schedules + SOPs runtime
-- ============================================================================
-- Bài #8 Scheduling: ops.scheduled_runs
-- Bài #9 SOP Architecture: ops.sop_runs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ops.scheduled_runs — schedule execution tracking (Bài #8)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.scheduled_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_at    timestamptz NOT NULL,
  fired_at        timestamptz NOT NULL DEFAULT now(),
  
  -- Schedule identification (matches schedules.yaml id)
  schedule_id     text NOT NULL,
  cron_expression text NOT NULL,
  
  -- Execution
  state           text NOT NULL DEFAULT 'pending',
  state_since     timestamptz NOT NULL DEFAULT now(),
  triggered_skill text,                          -- skill name from schedules.yaml
  output_payload  jsonb,
  error           text,
  
  -- Mode awareness (Bài #30)
  feature_flag_state text,                       -- 'enabled' | 'disabled' | 'fallback_manual'
  
  CONSTRAINT scheduled_state_valid CHECK (state IN ('pending', 'running', 'completed', 'failed', 'skipped'))
);

CREATE INDEX idx_scheduled_pending ON ops.scheduled_runs (scheduled_at) WHERE state = 'pending';
CREATE INDEX idx_scheduled_history ON ops.scheduled_runs (schedule_id, fired_at DESC);

CREATE TRIGGER trg_scheduled_state_since
  BEFORE UPDATE ON ops.scheduled_runs
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE ops.scheduled_runs IS 'Scheduled task execution tracking (Bài #8). pg_cron fires inserts here.';

-- ----------------------------------------------------------------------------
-- ops.sop_runs — SOP execution tracking (Bài #9)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.sop_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- SOP identification
  sop_id          text NOT NULL,                  -- e.g., 'SOP-CUSTOMER-001-onboarding'
  sop_version     text NOT NULL,
  
  -- Trigger
  triggered_by_kind text NOT NULL,                -- 'event' | 'schedule' | 'manual'
  triggered_by_id text NOT NULL,
  
  -- Execution flow
  state           text NOT NULL DEFAULT 'pending',
  state_since     timestamptz NOT NULL DEFAULT now(),
  current_step    text,
  completed_steps text[],
  
  -- Inputs/outputs
  input_payload   jsonb,
  output_payload  jsonb,
  
  -- HITL
  hitl_required_at_step text,
  hitl_run_id     uuid REFERENCES ops.hitl_runs(id),
  
  -- Error
  error           text,
  error_at_step   text,
  
  -- SLA tracking
  sla_minutes     integer,
  sla_breached_at timestamptz,
  
  -- Cost (Bài #7)
  total_cost_usd  numeric(10, 4),
  cost_bucket     text,
  
  CONSTRAINT sop_runs_state_valid CHECK (state IN ('pending', 'running', 'paused_hitl', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX idx_sop_runs_active ON ops.sop_runs (sop_id, created_at DESC) WHERE state IN ('pending', 'running', 'paused_hitl');
CREATE INDEX idx_sop_runs_sla ON ops.sop_runs (created_at) WHERE state = 'running' AND sla_minutes IS NOT NULL;
CREATE INDEX idx_sop_runs_hitl ON ops.sop_runs (hitl_run_id) WHERE hitl_run_id IS NOT NULL;

CREATE TRIGGER trg_sop_runs_state_since
  BEFORE UPDATE ON ops.sop_runs
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE ops.sop_runs IS 'SOP execution tracking (Bài #9). Each row = 1 SOP run với full history.';
