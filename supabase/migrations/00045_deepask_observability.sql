-- ============================================================================
-- Migration 00045: ops.deepask_runs + ops.deepask_coverage (capability `deepask` v1.0)
-- ============================================================================
-- Created by: capability `deepask` v1.0 — Phase 7 Sprint 1.
-- Decision row: ops.decisions[861f8eb4-6572-4df5-b1cc-44aac0a7b014] (slug deepask-architecture-option-b, decided, Tier C).
-- Capability run: 46bec9c9-a094-4979-a62f-614943e64c6a
--
-- deepask's observability + learning substrate. Mirrors the ops.resolver_decisions
-- pattern (migration 00034): one audit row per /deepask query (deepask_runs) +
-- one row per decomposed sub-need (deepask_coverage). Founder corrections feed the
-- existing ops.corrections table (no change here). This is the substrate for a future
-- /evolve target that mines (question -> ResolverPlan -> coverage verdict -> correction).
--
-- Additive only. No existing table modified. Zero-downtime apply.
-- Forward-only per repo convention (rollback documented at bottom, not committed).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- ops.deepask_runs — one row per /deepask query
-- ----------------------------------------------------------------------------
CREATE TABLE ops.deepask_runs (
  -- Identity
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts                  timestamptz NOT NULL DEFAULT now(),
  caller_role         text,                            -- $MCP_CALLER_ROLE at query time

  -- Input
  question            text NOT NULL,
  format              text,                            -- resolved --format (smartauto -> chosen format)
  depth               text CHECK (depth IN ('quick', 'standard', 'deep', 'exhaustive')),
  sources_filter      text,                            -- --sources csv or 'auto'
  dry_run             boolean NOT NULL DEFAULT false,

  -- Outcome
  verdict             text CHECK (verdict IN ('COMPLETE', 'PARTIAL')),  -- NULL while running; CHECK passes on NULL
  sub_need_count      integer,
  resolver_find_calls integer,                         -- breaker-budget accounting (vs SESSION_HARD_CAP=20)
  recipients_touched  jsonb,                           -- [{recipient_id, axis, executed, got_data}, ...]
  artifact_path       text,                            -- .archives/deepask/<date>-<slug>/

  -- Performance / cost
  cost_usd            numeric(10, 4),                  -- subscription orchestration cost (cost_bucket ai-ops-deepask)
  latency_ms          integer,

  -- Extension point
  metadata            jsonb
);

-- ----------------------------------------------------------------------------
-- ops.deepask_coverage — one row per decomposed sub-need
-- ----------------------------------------------------------------------------
CREATE TABLE ops.deepask_coverage (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id              uuid NOT NULL REFERENCES ops.deepask_runs(id) ON DELETE CASCADE,

  sub_need            text NOT NULL,
  ia_type             text CHECK (ia_type IN ('A', 'B', 'C', 'D')),  -- SoR | derived-memory | scratch | conduit
  planned_recipients  jsonb,                           -- from ResolverPlan v1 (content_axis + capability_axis)
  executed            jsonb,                           -- what actually ran/read
  got_data            boolean,                         -- did the leg return usable evidence?
  gap_reason          text,                            -- no_match | stale | empty | not_built | breaker_budget
  remedy              text                             -- ingest via /wiki sync | wire MCP <x> | build via /cla propose
);

-- ----------------------------------------------------------------------------
-- Indexes (common query patterns + learning-loop aggregation)
-- ----------------------------------------------------------------------------
CREATE INDEX deepask_runs_ts_idx          ON ops.deepask_runs (ts DESC);
CREATE INDEX deepask_runs_verdict_idx     ON ops.deepask_runs (verdict) WHERE verdict IS NOT NULL;
CREATE INDEX deepask_runs_caller_role_idx ON ops.deepask_runs (caller_role) WHERE caller_role IS NOT NULL;
CREATE INDEX deepask_runs_dry_run_idx     ON ops.deepask_runs (dry_run);

CREATE INDEX deepask_coverage_run_id_idx  ON ops.deepask_coverage (run_id);
CREATE INDEX deepask_coverage_gap_idx     ON ops.deepask_coverage (gap_reason) WHERE gap_reason IS NOT NULL;

-- ----------------------------------------------------------------------------
-- RLS: founder + etl-runner full; other roles read own caller_role rows
-- (mirrors ops.resolver_decisions 00034)
-- ----------------------------------------------------------------------------
ALTER TABLE ops.deepask_runs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.deepask_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY deepask_runs_full_access
  ON ops.deepask_runs FOR ALL
  USING      (current_setting('request.jwt.claims', true)::jsonb->>'role' IN ('founder', 'etl-runner'))
  WITH CHECK (current_setting('request.jwt.claims', true)::jsonb->>'role' IN ('founder', 'etl-runner'));

CREATE POLICY deepask_runs_read_own_role
  ON ops.deepask_runs FOR SELECT
  USING (caller_role = current_setting('request.jwt.claims', true)::jsonb->>'role');

CREATE POLICY deepask_coverage_full_access
  ON ops.deepask_coverage FOR ALL
  USING      (current_setting('request.jwt.claims', true)::jsonb->>'role' IN ('founder', 'etl-runner'))
  WITH CHECK (current_setting('request.jwt.claims', true)::jsonb->>'role' IN ('founder', 'etl-runner'));

-- Coverage rows are readable when the parent run is owned by the caller's role.
CREATE POLICY deepask_coverage_read_own_role
  ON ops.deepask_coverage FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ops.deepask_runs r
    WHERE r.id = ops.deepask_coverage.run_id
      AND r.caller_role = current_setting('request.jwt.claims', true)::jsonb->>'role'
  ));

GRANT SELECT, INSERT ON ops.deepask_runs     TO authenticated;
GRANT SELECT, INSERT ON ops.deepask_coverage TO authenticated;

-- ----------------------------------------------------------------------------
-- Comments
-- ----------------------------------------------------------------------------
COMMENT ON TABLE ops.deepask_runs IS
  'Audit + learning substrate for capability deepask. One row per /deepask query (incl. --dry-run rows). Powers the deepask KPIs (complete_verdict_rate, uncited_claim_rate, breaker_trip_rate) and a future /evolve target. Mirrors ops.resolver_decisions.';
COMMENT ON TABLE ops.deepask_coverage IS
  'Per-sub-need coverage detail for a deepask run. One row per decomposed sub-need: planned recipients (from ResolverPlan v1), what executed, whether it got data, and the honest gap_reason + remedy when not.';

COMMIT;

-- ============================================================================
-- ROLLBACK (documented, not committed)
-- ============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS ops.deepask_coverage;  -- FK-dependent, drop first
-- DROP TABLE IF EXISTS ops.deepask_runs;
-- COMMIT;
