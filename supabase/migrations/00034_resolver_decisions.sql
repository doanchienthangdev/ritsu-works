-- ============================================================================
-- Migration 00033: ops.resolver_decisions table (resolver capability v1.0)
-- ============================================================================
-- Created by: capability `resolver` v1.0 (Phase 5 spec)
-- Decision row: ops.decisions <pending Tier C approval>
-- Capability run: 40324249-1604-415e-b8cb-2f012456ea84
--
-- Per architect outside-voice T-11 fix: dedicated audit table instead of
-- shoving decisions into ops.agent_runs.metadata JSON field. This enables
-- v1.1 active-learning (CP-1) aggregation queries with proper indexes.
--
-- Additive only. No existing table modified. Zero-downtime apply.
-- Rollback: DROP TABLE ops.resolver_decisions; (no consumer dependency)
-- ============================================================================

BEGIN;

CREATE TABLE ops.resolver_decisions (
  -- Identity
  run_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts                  timestamptz NOT NULL DEFAULT now(),

  -- Input
  trigger             text NOT NULL,
  trigger_normalized  text NOT NULL,   -- NFC normalized, lowercased, whitespace-collapsed

  -- Match outcome
  matched_route_id    text,             -- nullable when decision IN ('no_match', 'role_denied')
  confidence          numeric(3, 2),    -- 0.00 to 1.00; nullable on no_match
  alternatives        jsonb,            -- [{ route_id, confidence }, ...] top-N (up to 5)

  -- Modality
  semantic_used       boolean NOT NULL DEFAULT false,  -- false at v1.0 (no semantic in hot path)
  caller_role         text,                            -- $MCP_CALLER_ROLE at query time

  -- Performance
  latency_ms          integer NOT NULL,

  -- Decision
  decision            text NOT NULL CHECK (decision IN (
                        'dispatch_silently',
                        'surface_candidates',
                        'no_match',
                        'role_denied'
                      )),

  -- Extension point (v1.1+ may add e.g. founder_corrected: bool)
  metadata            jsonb
);

-- Indexes for common query patterns (v1.0 + v1.1 active-learning)
CREATE INDEX resolver_decisions_ts_idx
  ON ops.resolver_decisions (ts DESC);

CREATE INDEX resolver_decisions_route_id_idx
  ON ops.resolver_decisions (matched_route_id)
  WHERE matched_route_id IS NOT NULL;

CREATE INDEX resolver_decisions_decision_idx
  ON ops.resolver_decisions (decision);

CREATE INDEX resolver_decisions_caller_role_idx
  ON ops.resolver_decisions (caller_role)
  WHERE caller_role IS NOT NULL;

-- RLS: founder + etl-runner have full access; other roles read own caller_role rows
ALTER TABLE ops.resolver_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY resolver_decisions_full_access
  ON ops.resolver_decisions
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::jsonb->>'role' IN ('founder', 'etl-runner')
  )
  WITH CHECK (
    current_setting('request.jwt.claims', true)::jsonb->>'role' IN ('founder', 'etl-runner')
  );

CREATE POLICY resolver_decisions_read_own_role
  ON ops.resolver_decisions
  FOR SELECT
  USING (
    caller_role = current_setting('request.jwt.claims', true)::jsonb->>'role'
  );

-- Grants: founder + etl-runner explicit; everyone else relies on RLS for filter
GRANT SELECT, INSERT ON ops.resolver_decisions TO authenticated;

-- Comment for documentation
COMMENT ON TABLE ops.resolver_decisions IS
  'Audit log of every resolver query decision. Powers v1.1 active learning, /resolver explain, Monday digest. One row per /resolver query (or programmatic equivalent).';

COMMIT;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- BEGIN;
-- DROP POLICY IF EXISTS resolver_decisions_read_own_role ON ops.resolver_decisions;
-- DROP POLICY IF EXISTS resolver_decisions_full_access ON ops.resolver_decisions;
-- ALTER TABLE ops.resolver_decisions DISABLE ROW LEVEL SECURITY;
-- DROP INDEX IF EXISTS resolver_decisions_caller_role_idx;
-- DROP INDEX IF EXISTS resolver_decisions_decision_idx;
-- DROP INDEX IF EXISTS resolver_decisions_route_id_idx;
-- DROP INDEX IF EXISTS resolver_decisions_ts_idx;
-- DROP TABLE IF EXISTS ops.resolver_decisions;
-- COMMIT;
