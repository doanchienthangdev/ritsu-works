-- ============================================================================
-- Migration 00019: metrics schema — read-only mirror of Product Supabase
-- ============================================================================
-- Creates the `metrics` schema referenced by knowledge/manifest.yaml.
-- This schema is the ONLY way Operating AI sees Product (ritsu) data.
--
-- Populated by the `etl-runner` role on an hourly cadence per manifest's
-- etl_flows.product_metrics_to_ops. Until ETL is wired, the table exists as a
-- structural placeholder so downstream skills (growth-orchestrator,
-- support-agent) can compile their queries.
--
-- IMPORTANT: only etl-runner role should have INSERT/UPDATE on metrics.*.
-- All other roles get SELECT-only (see grants in 00012 — extend there next
-- pass or here).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS metrics;
COMMENT ON SCHEMA metrics IS 'Read-only mirror of Product Supabase (ritsu) data, populated by etl-runner. No other role may write here. Operating AI consumes via SELECT.';

-- ----------------------------------------------------------------------------
-- metrics.product_dau_snapshot — hourly DAU snapshot from Product
-- ----------------------------------------------------------------------------
CREATE TABLE metrics.product_dau_snapshot (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at         timestamptz NOT NULL,
  dau                 integer NOT NULL,
  wau                 integer,
  mau                 integer,
  new_signups_24h     integer,
  paid_users          integer,
  free_users          integer,
  churned_users_24h   integer,
  extra               jsonb NOT NULL DEFAULT '{}'::jsonb,
  etl_run_id          uuid,                        -- ops.agent_runs.id of the etl run (no FK across schemas to avoid coupling)
  inserted_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (snapshot_at)
);

CREATE INDEX idx_dau_snapshot_ts ON metrics.product_dau_snapshot (snapshot_at DESC);

COMMENT ON TABLE metrics.product_dau_snapshot IS 'Hourly DAU mirror from Product Supabase (manifest etl_flows.product_metrics_to_ops). Populated by etl-runner role only.';

-- ----------------------------------------------------------------------------
-- Grants (mirror 00012 pattern — read for service_role, anon, authenticated)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA metrics TO postgres, service_role, authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA metrics TO authenticated, anon, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA metrics
  GRANT SELECT ON TABLES TO authenticated, anon, service_role;

-- etl-runner is the ONLY role with INSERT here. Until role-based DB users are
-- provisioned, service_role is the proxy (etl-runner uses it via
-- SUPABASE_OPS_SERVICE_KEY per governance/SECRETS.md). Once role-based users
-- exist, replace with: GRANT INSERT, UPDATE ON metrics.* TO etl_runner;
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA metrics TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA metrics
  GRANT INSERT, UPDATE ON TABLES TO service_role;
