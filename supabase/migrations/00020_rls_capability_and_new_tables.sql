-- ============================================================================
-- Migration 00020: RLS for capability_* tables + tables added in 00015..00018
-- ============================================================================
-- Closes the RLS gap observed in the Supabase UI (UNRESTRICTED badges on
-- capability_phase_events, capability_runs, v_capability_pipeline) and enables
-- RLS on tables added by 00016, 00017, 00018.
--
-- Pattern: mirror 00010 — service_role bypasses RLS, authenticated needs
-- 'founder' jwt role for SELECT. Writes via Edge Functions (service_role).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Capability lifecycle tables (added in 00011, RLS missed in 00010)
-- ----------------------------------------------------------------------------
ALTER TABLE ops.capability_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.capability_phase_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY founder_read_capability_runs ON ops.capability_runs
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_capability_phase_events ON ops.capability_phase_events
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

-- View v_capability_pipeline inherits RLS from underlying tables in postgres 15+;
-- explicit security_invoker ensures policy evaluation against the caller.
ALTER VIEW ops.v_capability_pipeline SET (security_invoker = true);

-- ----------------------------------------------------------------------------
-- Memory architecture tables (00016)
-- ----------------------------------------------------------------------------
ALTER TABLE ops.run_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.corrections   ENABLE ROW LEVEL SECURITY;

CREATE POLICY founder_read_run_summaries ON ops.run_summaries
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_corrections ON ops.corrections
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

-- ----------------------------------------------------------------------------
-- Economic architecture tables (00017)
-- ----------------------------------------------------------------------------
ALTER TABLE ops.cost_attributions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.budget_alerts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.optimization_recommendations  ENABLE ROW LEVEL SECURITY;

CREATE POLICY founder_read_cost_attributions ON ops.cost_attributions
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_budget_alerts ON ops.budget_alerts
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_optimization_recommendations ON ops.optimization_recommendations
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

-- ----------------------------------------------------------------------------
-- Orchestration / storage / growth tables (00018)
-- ----------------------------------------------------------------------------
ALTER TABLE ops.task_state_transitions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.tier3_index             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.campaigns               ENABLE ROW LEVEL SECURITY;

CREATE POLICY founder_read_task_state_transitions ON ops.task_state_transitions
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_tier3_index ON ops.tier3_index
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_campaigns ON ops.campaigns
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');
