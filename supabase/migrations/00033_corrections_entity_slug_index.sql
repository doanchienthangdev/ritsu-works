-- ============================================================================
-- Migration 00033: Index on ops.corrections(run_id, ts) — eval-evo lookup
-- ============================================================================
-- Capability: evolve (v1.0)
-- Phase 7 (Sprint 3) migration. Zero downtime (CONCURRENTLY).
--
-- Note: ops.corrections does NOT have an entity_slug column (the eval-evo
-- spec PLAN.md §6.13 was based on an incorrect assumption; corrections is
-- linked to runs via run_id and entity_slug lives in
-- ops.agent_runs.state_payload->>'entity_slug'). So the negative-signal
-- load query in eval-evo/orchestrator/SKILL.md joins corrections → agent_runs:
--
--   SELECT c.correction_note
--   FROM ops.corrections c
--   JOIN ops.agent_runs ar ON ar.id = c.run_id
--   WHERE ar.state_payload->>'entity_slug' = $1
--     AND c.ts > NOW() - INTERVAL '90 days'
--   ORDER BY c.ts DESC LIMIT 10;
--
-- This index speeds up the JOIN filter on the corrections side. The
-- entity_slug filter still requires an index on the JSONB path; existing
-- (or implicit GIN) coverage on ops.agent_runs.state_payload is acceptable
-- for v1.0 scale.
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_corrections_run_id_ts
  ON ops.corrections (run_id, ts DESC);

COMMENT ON INDEX ops.idx_corrections_run_id_ts IS
  'Speeds up /evolve cross-iter negative-signal load via JOIN on agent_runs.id. Capability: evolve.';
