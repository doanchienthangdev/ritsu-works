-- ============================================================================
-- 00024_agent_runs_persona_slug.sql
--
-- Workforce persona layer v1.0 (PR 1/4): add persona_slug attribution to
-- ops.agent_runs so every run can be traced back to the C-suite persona that
-- routed/invoked it, in addition to the technical role (agent_slug) doing
-- the work.
--
-- Rationale:
--   - persona = façade (CEO, CMO, ...)
--   - role    = permissions/budget/HITL holder (gps, growth-orchestrator, ...)
--   - One row in ops.agent_runs already records `agent_slug` (role).
--   - This migration adds `persona_slug` so the same row carries BOTH planes.
--
-- Set by: .claude/hooks/post-persona-log.md (PR 2/4)
-- Queried by: persona KPIs (PR 3+/4), Friday review aggregations, drift checks.
--
-- Nullable: not every run is persona-routed (direct role invocations leave it NULL).
--
-- See: knowledge/workforce-personas.yaml, .archives/workforces/PLAN.md §4, ADR-003.
-- ============================================================================

ALTER TABLE ops.agent_runs
  ADD COLUMN IF NOT EXISTS persona_slug text NULL;

CREATE INDEX IF NOT EXISTS idx_agent_runs_persona_slug
  ON ops.agent_runs (persona_slug)
  WHERE persona_slug IS NOT NULL;

COMMENT ON COLUMN ops.agent_runs.persona_slug IS
  'C-suite persona (façade layer) that invoked this run, e.g. ceo, cto, cgo, cpo. '
  'Resolves to a bound technical role via knowledge/workforce-personas.yaml. '
  'NULL when the run was a direct role invocation (no persona). '
  'Set by .claude/hooks/post-persona-log.md.';
