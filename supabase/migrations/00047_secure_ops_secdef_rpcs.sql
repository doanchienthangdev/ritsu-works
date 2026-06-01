-- ============================================================================
-- Migration 00047: Close latent RLS-bypass + PII exposure on the SECURITY
--                  DEFINER read RPCs in schema ops (security hardening)
-- ============================================================================
-- Security finding (design review, 2026-06-01):
--   ops.ops_run_select (migration 00026) is SECURITY DEFINER with
--   `SET search_path = ops, metrics, public, pg_temp` and is EXECUTE-able by
--   `authenticated` + PUBLIC. Because a SECURITY DEFINER function runs as its
--   owner (postgres, which has BYPASSRLS) and this one EXECUTEs caller-supplied
--   SELECT text, ANY caller holding a Supabase `authenticated` JWT can run
--   `SELECT * FROM customers` / `persons` and read all of ops.* + metrics.* +
--   public.customers/persons (customer PII), bypassing every RLS policy in
--   00010_rls_policies.sql. The in-function sql-guard only proves the statement
--   is a read; it does NOT constrain WHICH tables are read.
--
--   Exposure is LATENT today (the supabase-ops MCP shim connects with the
--   service key, and there are 0 Supabase Auth users on ritsu-ops) but it is a
--   loaded gun: the moment any `authenticated` credential is issued against
--   ritsu-ops (a read-only operator login, a dashboard, a Supabase Auth user),
--   it reads everything including PII.
--
--   The SAME anti-pattern applies to the two consistency-engine helpers in
--   migration 00022 — get_ops_tables() and get_ops_rls_state() — which are also
--   SECURITY DEFINER with `public` in their search_path. Their migrations
--   GRANT EXECUTE only to service_role, yet the LIVE acl shows authenticated +
--   PUBLIC have EXECUTE: that grant comes from Supabase's default privileges
--   for API-exposed schemas (ops is exposed), which auto-grant EXECUTE to
--   anon/authenticated on every new function. So "granted only to service_role
--   in SQL" is NOT the live reality — an explicit REVOKE is required.
--
-- Fix — the ONLY legitimate caller of all three functions is the service_role
-- (the supabase-ops MCP shim and the consistency-sweep Edge Function both
-- connect with the service-role key; verified 2026-06-01):
--   (a) Drop `public` from each function's search_path so unqualified customer
--       /PII table names no longer resolve inside the definer context
--       (defense-in-depth; the functions' own bodies use only pg_catalog
--       built-ins, and no caller sends raw pgvector/`public` SQL through them).
--   (b) REVOKE EXECUTE from PUBLIC + authenticated + anon; keep service_role
--       only. This closes the "any authenticated JWT reads everything" path
--       entirely — the headline fix.
--
-- A future founder dashboard that needs direct DB reads must use a
-- SECURITY INVOKER (RLS-respecting) path or go through the service-role MCP —
-- NOT a SECURITY DEFINER arbitrary-SQL RPC exposed to `authenticated`.
--
-- Deferred (documented, not applied here): (c) re-own the functions to a role
-- with no PII grants, and (d) an in-function PII-table denylist. Both are
-- larger changes that fight the current architecture (postgres owner; the
-- mv_customer_360 view is a deliberate read path) and are unnecessary once the
-- only caller is service_role. See the PR description.
--
-- Drift guard: scripts/cross-tier/validate-secdef-rpc-exposure.cjs (registered
-- L2-critical in scripts/check-consistency.cjs) fails CI if any SECURITY
-- DEFINER function in schema `ops` has `public` in its search_path (or no
-- pinned search_path at all) while remaining executable by authenticated /
-- PUBLIC.
--
-- Reversibility: fully reversible (re-GRANT + re-ALTER search_path); touches no
-- data. Every statement is idempotent — safe to re-run.
-- HITL: Tier C (schema change) — founder-approved via PR + merge, then applied
-- with `supabase db push`. This migration is NOT applied by the authoring
-- session.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ops.ops_run_select(text, jsonb, int) — the arbitrary-SELECT RPC (00026)
--    Backs the supabase-ops MCP `query` tool (mcp-server/src/tools/query.ts).
-- ----------------------------------------------------------------------------
ALTER FUNCTION ops.ops_run_select(text, jsonb, int)
  SET search_path = ops, metrics, pg_temp;   -- was: ops, metrics, public, pg_temp

REVOKE EXECUTE ON FUNCTION ops.ops_run_select(text, jsonb, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION ops.ops_run_select(text, jsonb, int) FROM authenticated;
REVOKE EXECUTE ON FUNCTION ops.ops_run_select(text, jsonb, int) FROM anon;
GRANT  EXECUTE ON FUNCTION ops.ops_run_select(text, jsonb, int) TO service_role;

COMMENT ON FUNCTION ops.ops_run_select(text, jsonb, int) IS
  'MCP supabase-ops query tool entry point (Bài #12, Phase 1). Read-only SELECT/WITH only. '
  'SECURITY DEFINER, but locked to service_role: REVOKEd from PUBLIC/authenticated/anon and '
  'search_path pinned to ops, metrics, pg_temp (NO public) in migration 00047 to prevent the '
  'RLS-bypass PII read described there. Multi-statement, DDL, and DML are rejected; row_limit 1..1000.';

-- ----------------------------------------------------------------------------
-- 2. ops.get_ops_tables() — consistency-engine helper (00022)
--    Called only by the consistency-sweep Edge Function (service_role).
-- ----------------------------------------------------------------------------
ALTER FUNCTION ops.get_ops_tables()
  SET search_path = pg_catalog;               -- was: pg_catalog, public

REVOKE EXECUTE ON FUNCTION ops.get_ops_tables() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION ops.get_ops_tables() FROM authenticated;
REVOKE EXECUTE ON FUNCTION ops.get_ops_tables() FROM anon;
GRANT  EXECUTE ON FUNCTION ops.get_ops_tables() TO service_role;

-- ----------------------------------------------------------------------------
-- 3. ops.get_ops_rls_state() — consistency-engine helper (00022)
--    Called only by the consistency-sweep Edge Function (service_role).
-- ----------------------------------------------------------------------------
ALTER FUNCTION ops.get_ops_rls_state()
  SET search_path = pg_catalog;               -- was: pg_catalog, public

REVOKE EXECUTE ON FUNCTION ops.get_ops_rls_state() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION ops.get_ops_rls_state() FROM authenticated;
REVOKE EXECUTE ON FUNCTION ops.get_ops_rls_state() FROM anon;
GRANT  EXECUTE ON FUNCTION ops.get_ops_rls_state() TO service_role;
