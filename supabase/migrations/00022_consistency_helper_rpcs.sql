-- ============================================================================
-- Migration 00022: Helper RPC functions for the Consistency Engine (v1.0c)
-- ============================================================================
-- Edge Functions call these via supabase.rpc() to read DB metadata that
-- PostgREST does not expose by default (information_schema, pg_class).
--
-- All functions are SECURITY DEFINER so they run with elevated privileges
-- regardless of caller — they're read-only metadata queries and the input
-- is constrained to known-good schema names.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- get_ops_tables — list all base tables in the ops schema
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ops.get_ops_tables()
RETURNS TABLE (table_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT c.relname::text AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'ops'
    AND c.relkind = 'r'            -- ordinary table
  ORDER BY c.relname;
$$;

COMMENT ON FUNCTION ops.get_ops_tables() IS 'Consistency engine helper: returns all ops.* base tables. Used by consistency-sweep skill to compare against manifest.tier2_operational.';

GRANT EXECUTE ON FUNCTION ops.get_ops_tables() TO service_role;

-- ----------------------------------------------------------------------------
-- get_ops_rls_state — list all ops.* tables with their RLS-enabled flag
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ops.get_ops_rls_state()
RETURNS TABLE (table_name text, rls_enabled boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    c.relname::text AS table_name,
    c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'ops'
    AND c.relkind = 'r'
  ORDER BY c.relname;
$$;

COMMENT ON FUNCTION ops.get_ops_rls_state() IS 'Consistency engine helper: returns ops.* tables with rls_enabled flag. Used by consistency-sweep to enforce live-db-tables-have-rls invariant.';

GRANT EXECUTE ON FUNCTION ops.get_ops_rls_state() TO service_role;
