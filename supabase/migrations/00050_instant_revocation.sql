-- ============================================================================
-- 00050_instant_revocation.sql
-- Capability: multi-user-auth — Sprint 3 hardening (DB-side instant revocation).
--
-- Problem (red-team residual, Sprints 1-2): when an owner revokes an operator, the
-- broker bans them in Supabase Auth + flips ops.operators.status='revoked'. But the
-- operator's ALREADY-ISSUED access token still passes Supabase's signature + exp
-- verification for up to its ~1h TTL, so without a DB-side check they retain their
-- RLS-granted access for that window (the access token is what the per-human path
-- authenticates with).
--
-- Fix: gate the two tier helpers (ops.is_owner / ops.is_admin_or_above — which EVERY
-- per-human RLS policy and broker fn funnels through) on the operator NOT being
-- revoked/expired in ops.operators. A revoked operator is then denied at the DB
-- immediately, even with a still-valid token — closing the ~1h window.
--
-- ADDITIVE + INERT under the live system: service_role connections BYPASS RLS and
-- carry no JWT (jwt_tier() = NULL), so is_owner()/is_admin_or_above() were already
-- falsy for them and the new not_revoked() term changes nothing there. This enforces
-- ONLY in per-human mode (RITSU_AUTH_MODE=per-human), which is founder-gated. Same
-- safety posture as 00049. Reversible: re-create the two helpers without the term.
--
-- ⚠️  RECURSION TRIPWIRE (do NOT add `ALTER TABLE ops.operators FORCE ROW LEVEL
--     SECURITY`): operator_status_self() reads ops.operators as a SECURITY DEFINER
--     owned by the table owner, which is RLS-EXEMPT under plain ENABLE RLS (00049
--     uses ENABLE, not FORCE). That exemption is what avoids recursion. If a future
--     migration FORCEs RLS on ops.operators, the owner-read policy `USING (is_owner())`
--     would fire on this DEFINER read → is_owner() → not_revoked() → status_self() →
--     operators RLS → is_owner() … infinite recursion, breaking auth for EVERY
--     authenticated caller (incl. the owner). Keep ops.operators ENABLE-only.
--
-- Scope note: this covers all per-human DATA-plane access (every mua_* RLS policy +
-- the broker fns funnel through is_owner/is_admin). Two intentional non-funnels are
-- UNAFFECTED by design: (1) the `mua_audit_insert` WITH CHECK (true) on ops.mcp_calls
-- stays open so a revoked operator's FINAL actions are still audited (the safer
-- trade-off — audit availability over total lockout); (2) ops_run_select_rls grants
-- EXECUTE to authenticated and relies on RLS, so a revoked operator may still CALL it
-- but every mua_* policy now returns false → they get [] (starved, not errored).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. operator_status_self() — the CALLING human's own ops.operators.status, or
--    NULL if not enrolled. SECURITY DEFINER so it can read ops.operators (which is
--    owner-READ-only RLS) for ANY authenticated caller — but it is scoped to the
--    caller's own sub/email, so it can only ever reveal the caller's own status
--    (never another operator's). search_path pinned WITHOUT public (cannot reach
--    public.* PII) per scripts/cross-tier/validate-secdef-rpc-exposure.cjs.
-- ----------------------------------------------------------------------------
-- Revocation invariant: the guarantee that a revoked operator is caught relies on
-- any operator capable of holding a valid signed JWT having supabase_user_id set
-- (the redeem flow always sets it). The OR-email arm additionally catches an
-- invited-but-unbound row by email. The only uncaught case — an unbound (NULL
-- supabase_user_id) revoked row whose JWT email ALSO differs from the row email —
-- cannot arise: no JWT is minted without the redeem binding that sets both.
create or replace function ops.operator_status_self()
returns text
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select status from ops.operators
  where supabase_user_id = ops.jwt_sub()
     or lower(email) = lower(ops.jwt_email())
  -- fail-closed tiebreak: if any matching row is revoked/expired, that one wins.
  order by (status in ('revoked','expired')) desc
  limit 1
$$;

comment on function ops.operator_status_self() is
  'multi-user-auth Sprint 3: the calling human''s own ops.operators.status (by sub/email), NULL if not enrolled. Caller-scoped; reveals only the caller''s status.';

-- ----------------------------------------------------------------------------
-- 2. operator_not_revoked() — TRUE unless the caller is ENROLLED and revoked/expired.
--    A caller with NO ops.operators row (e.g. a genesis owner provisioned directly
--    in Supabase Auth, not via the broker) is NOT denied here — they rely on the
--    JWT tier, and their revocation is a governance action (operators.yaml + an Auth
--    ban), not a runtime status flip. Only an enrolled operator whose status flipped
--    to revoked/expired is instantly denied. Fail-OPEN on NULL is deliberate and
--    safe: the only NULL-status callers are (a) service_role (no JWT → is_owner() is
--    already falsy via jwt_tier) and (b) un-enrolled genesis owners (still gated by
--    the jwt_tier term in is_owner/is_admin).
-- ----------------------------------------------------------------------------
create or replace function ops.operator_not_revoked()
returns boolean
language sql
stable
security definer
set search_path = ops, pg_temp
as $$
  select coalesce(ops.operator_status_self() not in ('revoked','expired'), true)
$$;

comment on function ops.operator_not_revoked() is
  'multi-user-auth Sprint 3: false iff the calling human is enrolled AND revoked/expired in ops.operators. ANDed into is_owner()/is_admin_or_above() for DB-side instant revocation.';

-- Defense-in-depth on the two new SECURITY DEFINER fns: they are reachable from RLS
-- (which runs as `authenticated`), so authenticated must EXECUTE them — but anon/PUBLIC
-- must not. (They only ever return the caller's own status, so this is belt-and-braces.)
revoke execute on function ops.operator_status_self() from public;
revoke execute on function ops.operator_not_revoked() from public;
grant execute on function ops.operator_status_self() to authenticated;
grant execute on function ops.operator_not_revoked() to authenticated;

-- ----------------------------------------------------------------------------
-- 3. AND instant-revocation into the two tier helpers. EVERY per-human RLS policy
--    (00049: all 70 use is_owner()/is_admin_or_above(), zero inline jwt_tier) + the
--    owner-gated broker fns funnel through these, so this one change propagates DB-
--    side instant revocation everywhere. is_owner/is_admin stay SECURITY INVOKER;
--    they call the DEFINER not_revoked() which elevates to read ops.operators.
-- ----------------------------------------------------------------------------
create or replace function ops.is_owner()
returns boolean
language sql
stable
as $$
  select ops.jwt_tier() = 'owner' and ops.operator_not_revoked()
$$;

create or replace function ops.is_admin_or_above()
returns boolean
language sql
stable
as $$
  select ops.tier_rank(ops.jwt_tier()) >= 2 and ops.operator_not_revoked()
$$;

comment on function ops.is_owner() is
  'multi-user-auth: authenticated human is owner (app_metadata.tier) AND not revoked (Sprint 3 instant revocation). NULL/false off-JWT (service_role/cron).';
comment on function ops.is_admin_or_above() is
  'multi-user-auth: authenticated human is admin-or-above AND not revoked (Sprint 3 instant revocation).';
