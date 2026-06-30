-- ============================================================================
-- 00051_revoke_matview_pii_grants.sql
-- capability multi-user-auth — Sprint 2 follow-up (audit 2026-06-30, finding D1-1)
-- ----------------------------------------------------------------------------
-- Closes a per-human read-path PII exposure that the 2026-06-30 adversarial
-- audit found in migration 00049.
--
-- THE GAP. `public.mv_customer_360` (00007) is a MATERIALIZED VIEW exposing
-- customer PII (primary_email, display_name, person_full_name, person_country,
-- …). The per-human read RPC `ops.ops_run_select_rls` (00049) is SECURITY
-- INVOKER, has `public` in its search_path, runs caller-supplied SELECT text,
-- and is `grant execute … to authenticated`. The §5.5 CRM backstop in 00049
-- RLS-locks only the four BASE tables (relkind='r': customers/persons/
-- companies/company_persons) — but a MATERIALIZED VIEW CANNOT carry RLS, and
-- nothing revokes its default `authenticated`/`anon` SELECT grant. So once
-- RITSU_AUTH_MODE=per-human, a legitimate (NON-forging) `admin` operator could
-- `SELECT primary_email FROM public.mv_customer_360` and read owner-only PII,
-- contradicting 00049 §5.5's own promise ("public CRM → OWNER-ONLY (customer
-- PII)"). This is the same RLS-bypass class migration 00047 closed for the old
-- `ops_run_select`; 00049 reintroduced an `authenticated`-reachable INVOKER RPC
-- with `public` back in the path.
--
-- THE FIX. A matview can't be RLS-gated, so the correct deny is an explicit
-- REVOKE of the `authenticated` + `anon` SELECT grant. Owner reads of customer
-- data go through the service_role path / the operator broker, not this matview.
-- (Dropping `public` from the RPC search_path is NOT sufficient on its own — a
-- FULLY-QUALIFIED `public.mv_customer_360` resolves regardless — so REVOKE is the
-- load-bearing fix.)
--
-- SAFETY. ADDITIVE + INERT under the live service_role MCP path (service_role is
-- BYPASSRLS and is unaffected by these role grants); it changes only what the
-- `authenticated`/`anon` roles may read, i.e. it only bites at the founder-gated
-- per-human cutover. `authenticated` and `anon` are standard Supabase roles
-- (always present); REVOKE of a privilege a role doesn't hold is a no-op, so this
-- is idempotent and re-runnable. The REFRESH path is unaffected — refreshing a
-- matview needs ownership/MAINTAIN, not SELECT.
--
-- Per-human OWNER note: REVOKE keys on the Postgres role (`authenticated`), not
-- the JWT tier, so at the per-human cutover even an OWNER connection cannot read
-- the matview directly — it is strictly MORE restrictive (no regression). An owner
-- reads the 360 join via the base tables (owner-RLS-allowed per 00049 §5.5) or via
-- the service_role path. The matview is a service/convenience surface, not a
-- per-human read surface.
--
-- Drift guard: scripts/cross-tier/validate-secdef-rpc-exposure.cjs now also fails
-- CI if any public MATERIALIZED VIEW is left readable by authenticated/anon.
--
-- Ready-to-apply; FOUNDER APPLIES (D-MAX shared-prod-DB migration), like 00050.
-- ============================================================================

revoke all on public.mv_customer_360 from authenticated, anon;

comment on materialized view public.mv_customer_360 is
  'Customer 360 view (Bài #16). Matviews cannot carry RLS; SELECT is REVOKEd from '
  'authenticated/anon (00051) so the per-human INVOKER read path (ops.ops_run_select_rls) '
  'cannot expose customer PII. Owner/service reads go via service_role. REFRESH periodically.';
