-- 00012_grants_for_ops_schema.sql
--
-- Grant schema-level USAGE + table-level privileges on `ops.*` to Supabase roles.
-- Without these grants, even after exposing `ops` via Settings -> API,
-- requests return HTTP 403 "permission denied for schema ops".
--
-- service_role  : full access; bypasses RLS by default. Used by Edge Functions and agents
--                 that hold SUPABASE_SERVICE_KEY. Must be able to read/write every table.
-- authenticated : founder dashboard sessions. RLS policies (see 00010) gate row access.
--                 Granted INSERT/SELECT/UPDATE/DELETE so RLS can decide; without GRANT
--                 RLS never gets a chance to evaluate.
-- anon          : not granted. Anonymous users must not see ops state. RLS+no-grant
--                 doubles the seal.
--
-- Defaults are also set so future tables added to `ops` inherit these grants automatically.

GRANT USAGE ON SCHEMA ops TO service_role, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ops TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ops TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ops TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ops TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ops TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ops TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA ops
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops
  GRANT USAGE, SELECT ON SEQUENCES TO service_role, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops
  GRANT EXECUTE ON FUNCTIONS TO service_role, authenticated;

-- public schema customer entity (00005) — already accessible by default but make explicit
-- for the same RLS-gated authenticated dashboard access pattern.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers, public.persons, public.companies, public.company_persons
  TO authenticated;
