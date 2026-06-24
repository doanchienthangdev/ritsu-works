-- ============================================================================
-- 00049_multi_user_auth.sql — capability multi-user-auth, Sprint 1
-- Server-side per-human authority substrate (owner ⊇ admin ⊇ user).
--
-- SAFETY: every object here is ADDITIVE and INERT for the running system.
-- The supabase-ops MCP connects as `service_role` (BYPASSRLS) and reads via the
-- SECURITY DEFINER RPC `ops_run_select` — so the RLS policies below DO NOT affect
-- any current code path. They take effect only when a connection authenticates
-- as `authenticated` carrying a per-human Supabase Auth JWT (the per-human
-- cutover, RITSU_AUTH_MODE=per-human). Until then this is dormant scaffolding
-- that makes the eventual cutover correct + closes two pre-existing RLS holes.
--
-- Tier source of truth: the Supabase Auth JWT claim app_metadata.tier
-- (server-only-writable → unforgeable by the client). The owner identity was
-- provisioned with app_metadata.tier='owner'.
--
-- Reversible: DROP the policies/functions/table/triggers created here.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. JWT claim helpers (read the verified Supabase Auth claim; NULL off-JWT)
-- ----------------------------------------------------------------------------
-- The single source: the request's JWT claims GUC (what auth.jwt() reads under
-- the hood). Robust when there is no JWT (service_role / cron / direct) → '{}'.
create or replace function ops.jwt_claims()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

-- The human's tier, server-issued under app_metadata. NULL when no JWT.
create or replace function ops.jwt_tier()
returns text
language sql
stable
as $$
  select nullif(ops.jwt_claims() -> 'app_metadata' ->> 'tier', '')
$$;

create or replace function ops.jwt_email()
returns text
language sql
stable
as $$
  select nullif(ops.jwt_claims() ->> 'email', '')
$$;

create or replace function ops.jwt_sub()
returns uuid
language sql
stable
as $$
  select nullif(ops.jwt_claims() ->> 'sub', '')::uuid
$$;

-- Hierarchy rank: owner=3 ⊃ admin=2 ⊃ user=1; unknown/none=0.
create or replace function ops.tier_rank(p_tier text)
returns int
language sql
immutable
as $$
  select case p_tier
    when 'owner' then 3
    when 'admin' then 2
    when 'user'  then 1
    else 0
  end
$$;

create or replace function ops.is_owner()
returns boolean
language sql
stable
as $$
  select ops.jwt_tier() = 'owner'
$$;

create or replace function ops.is_admin_or_above()
returns boolean
language sql
stable
as $$
  select ops.tier_rank(ops.jwt_tier()) >= 2
$$;

comment on function ops.jwt_tier() is
  'multi-user-auth: the authenticated human tier from app_metadata.tier (server-issued, unforgeable). NULL off-JWT (service_role/cron).';

-- ----------------------------------------------------------------------------
-- 2. ops.operators — Tier-2 runtime registry (mirror of governance/operators.yaml
--    + enrollment state). Written ONLY by the SECURITY DEFINER broker fns below
--    (and service_role); authenticated humans get owner-READ only.
-- ----------------------------------------------------------------------------
create table if not exists ops.operators (
  operator_id            uuid primary key default gen_random_uuid(),
  email                  text not null,
  tier                   text not null check (tier in ('owner','admin','user')),
  status                 text not null default 'invited'
                           check (status in ('invited','active','revoked','expired')),
  supabase_user_id       uuid,                    -- auth.users id once enrolled
  github_login           text,
  invite_hash            text,                    -- hash of single-use invite; NULL after redeem
  invite_expires_at      timestamptz,
  credential_fingerprint text,                    -- optional refresh/device fingerprint
  added_by               text,                    -- email of the owner who invited
  invited_at             timestamptz default now(),
  redeemed_at            timestamptz,
  revoked_at             timestamptz,
  last_seen_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- case-insensitive unique email
create unique index if not exists operators_email_lower_uniq on ops.operators (lower(email));
create index if not exists operators_status_idx on ops.operators (status);
create index if not exists operators_supabase_user_idx on ops.operators (supabase_user_id);

alter table ops.operators enable row level security;

-- owner can READ the registry; nobody (authenticated) writes directly — only the
-- broker SECURITY DEFINER fns (which run as owner of the fn) + service_role.
drop policy if exists operators_owner_read on ops.operators;
create policy operators_owner_read on ops.operators
  as permissive for select to authenticated
  using (ops.is_owner());

-- ----------------------------------------------------------------------------
-- 3. Broker SECURITY DEFINER functions (the ONLY authenticated write path)
--    Each is owner-gated server-side via ops.is_owner() — never a client claim.
-- ----------------------------------------------------------------------------
-- 3a. invite a new admin/user (owner only; owner-tier invites blocked here —
--     they require joint authority + a governance PR, Sprint 3).
create or replace function ops.operator_invite(
  p_email        text,
  p_tier         text,
  p_invite_hash  text default null,
  p_expires_at   timestamptz default (now() + interval '24 hours'),
  p_github_login text default null
)
returns ops.operators
language plpgsql
security definer
set search_path = ops, pg_temp
as $$
declare
  v_row ops.operators;
begin
  if not ops.is_owner() then
    raise exception 'operator_invite: caller is not an owner (tier=%)',
      coalesce(ops.jwt_tier(), 'none') using errcode = '42501';
  end if;
  if p_tier not in ('admin','user') then
    raise exception 'operator_invite: tier must be admin|user (got %); owner-tier requires joint-owner approval + governance PR',
      p_tier using errcode = '22023';
  end if;
  insert into ops.operators(email, tier, status, invite_hash, invite_expires_at, github_login, added_by, invited_at, updated_at)
  values (lower(p_email), p_tier, 'invited', p_invite_hash, p_expires_at, p_github_login, ops.jwt_email(), now(), now())
  on conflict (lower(email)) do update
    set tier = excluded.tier,
        status = 'invited',
        invite_hash = excluded.invite_hash,
        invite_expires_at = excluded.invite_expires_at,
        github_login = coalesce(excluded.github_login, ops.operators.github_login),
        added_by = excluded.added_by,
        updated_at = now()
  returning * into v_row;
  return v_row;
end
$$;

-- 3b. redeem an invite (called by the enrollment broker after it verifies the
--     single-use invite secret + mailbox proof). Activates the operator + binds
--     the Supabase Auth user id. Not owner-gated (the new user redeems) — gated
--     instead by an outstanding, unexpired invite for that email.
create or replace function ops.operator_redeem(
  p_email            text,
  p_supabase_user_id uuid,
  p_fingerprint      text default null
)
returns ops.operators
language plpgsql
security definer
set search_path = ops, pg_temp
as $$
declare
  v_row ops.operators;
begin
  update ops.operators
     set status = 'active',
         supabase_user_id = p_supabase_user_id,
         credential_fingerprint = coalesce(p_fingerprint, credential_fingerprint),
         invite_hash = null,
         redeemed_at = now(),
         last_seen_at = now(),
         updated_at = now()
   where lower(email) = lower(p_email)
     and status = 'invited'
     and (invite_expires_at is null or invite_expires_at > now())
  returning * into v_row;
  if v_row.operator_id is null then
    raise exception 'operator_redeem: no outstanding (invited, unexpired) invite for %', p_email
      using errcode = '42501';
  end if;
  return v_row;
end
$$;

-- 3c. revoke an operator (owner only). Refuses to revoke the last active owner.
create or replace function ops.operator_revoke(p_email text)
returns ops.operators
language plpgsql
security definer
set search_path = ops, pg_temp
as $$
declare
  v_row ops.operators;
  v_active_owners int;
begin
  if not ops.is_owner() then
    raise exception 'operator_revoke: caller is not an owner (tier=%)',
      coalesce(ops.jwt_tier(), 'none') using errcode = '42501';
  end if;
  -- root-of-trust guard: never strand the system ownerless
  select count(*) into v_active_owners
    from ops.operators where tier = 'owner' and status = 'active' and lower(email) <> lower(p_email);
  if v_active_owners < 1 and exists (
       select 1 from ops.operators where lower(email)=lower(p_email) and tier='owner' and status='active') then
    raise exception 'operator_revoke: refusing to revoke the last active owner' using errcode = '42501';
  end if;
  update ops.operators
     set status = 'revoked', revoked_at = now(), updated_at = now()
   where lower(email) = lower(p_email)
  returning * into v_row;
  if v_row.operator_id is null then
    raise exception 'operator_revoke: no operator with email %', p_email using errcode = '42704';
  end if;
  return v_row;
end
$$;

-- 3d. set tier (owner only; cannot promote to owner here — joint authority).
create or replace function ops.operator_set_tier(p_email text, p_tier text)
returns ops.operators
language plpgsql
security definer
set search_path = ops, pg_temp
as $$
declare
  v_row ops.operators;
begin
  if not ops.is_owner() then
    raise exception 'operator_set_tier: caller is not an owner (tier=%)',
      coalesce(ops.jwt_tier(), 'none') using errcode = '42501';
  end if;
  if p_tier not in ('admin','user') then
    raise exception 'operator_set_tier: tier must be admin|user (got %); owner promotion needs joint authority + governance PR',
      p_tier using errcode = '22023';
  end if;
  -- root-of-trust guard (mirror operator_revoke): never demote the last active
  -- owner — that would strand the system ownerless with no broker recovery path.
  if exists (select 1 from ops.operators where lower(email) = lower(p_email) and tier = 'owner' and status = 'active')
     and (select count(*) from ops.operators where tier = 'owner' and status = 'active' and lower(email) <> lower(p_email)) < 1 then
    raise exception 'operator_set_tier: refusing to demote the last active owner' using errcode = '42501';
  end if;
  update ops.operators set tier = p_tier, updated_at = now()
   where lower(email) = lower(p_email)
  returning * into v_row;
  if v_row.operator_id is null then
    raise exception 'operator_set_tier: no operator with email %', p_email using errcode = '42704';
  end if;
  return v_row;
end
$$;

-- Lock down the broker fns to the OWNER-BROKER ONLY. These are SECURITY DEFINER,
-- so they must NOT be reachable by `authenticated`/`anon`/PUBLIC (a privesc
-- surface — enforced by scripts/cross-tier/validate-secdef-rpc-exposure.cjs).
-- The owner-broker holds `service_role` SERVER-SIDE (the hosted Edge-Function
-- broker in Sprint 2; the service-key MCP today) and authenticates the owner's
-- identity BEFORE calling these — never an authenticated human on a laptop. The
-- fn bodies also re-check ops.is_owner() as defense-in-depth.
revoke all on function ops.operator_invite(text,text,text,timestamptz,text) from public, anon, authenticated;
revoke all on function ops.operator_redeem(text,uuid,text) from public, anon, authenticated;
revoke all on function ops.operator_revoke(text) from public, anon, authenticated;
revoke all on function ops.operator_set_tier(text,text) from public, anon, authenticated;
grant execute on function ops.operator_invite(text,text,text,timestamptz,text) to service_role;
grant execute on function ops.operator_redeem(text,uuid,text) to service_role;
grant execute on function ops.operator_revoke(text) to service_role;
grant execute on function ops.operator_set_tier(text,text) to service_role;

-- ----------------------------------------------------------------------------
-- 4. Audit-immutability — make ops.audit_log UPDATE/DELETE-proof (append-only).
--    audit_log is documented append-only; this enforces it for EVERY role
--    (triggers fire regardless of BYPASSRLS). agent_runs override rows already
--    have trg_agent_runs_override_immutable (migration 00015) — not duplicated.
-- ----------------------------------------------------------------------------
create or replace function ops.reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'ops.% is append-only — % is forbidden (multi-user-auth audit immutability)',
    tg_table_name, tg_op using errcode = '42501';
end
$$;

drop trigger if exists audit_log_no_update on ops.audit_log;
drop trigger if exists audit_log_no_delete on ops.audit_log;
create trigger audit_log_no_update before update on ops.audit_log
  for each row execute function ops.reject_mutation();
create trigger audit_log_no_delete before delete on ops.audit_log
  for each row execute function ops.reject_mutation();

-- ----------------------------------------------------------------------------
-- 5. Close two PRE-EXISTING RLS holes (permissive `qual: true` policies that
--    would grant ANY authenticated user access at cutover):
--      - ops.settings: founder_read_settings / founder_write_settings = (true)
--      - ops.knowledge_extractions: extractions_read_authenticated = (true)
--    Dropped here; replaced by the tier policies in §6 (settings → owner-only;
--    extractions → owner+admin via the data-plane loop).
-- ----------------------------------------------------------------------------
drop policy if exists founder_read_settings on ops.settings;
drop policy if exists founder_write_settings on ops.settings;
drop policy if exists extractions_read_authenticated on ops.knowledge_extractions;

-- Drop the pre-existing `to public` policies on deepask/resolver that key on the
-- JWT 'role' claim. A real per-human JWT carries role='authenticated', so these
-- *_read_own_role policies (qual: caller_role = claims->>'role') would OR-grant a
-- per-human connection (incl. a user tier!) read of any row whose
-- caller_role='authenticated' at cutover — violating user=zero-ops. owner/admin
-- get these tables via the §6 mua_* policies instead. (red-team #4/#L2.) The
-- *_full_access twins key on role IN (founder,etl-runner) — never match a
-- per-human JWT — dropped for hygiene. The entity_edit_locks/evolve_extractions
-- public policies key on the app.mcp_caller_role GUC (never set in any per-human
-- path → already dead, NOT a leak per red-team #nit) and are load-bearing for the
-- service-key lock system, so they are intentionally LEFT in place.
drop policy if exists deepask_runs_read_own_role on ops.deepask_runs;
drop policy if exists deepask_runs_full_access on ops.deepask_runs;
drop policy if exists deepask_coverage_read_own_role on ops.deepask_coverage;
drop policy if exists deepask_coverage_full_access on ops.deepask_coverage;
drop policy if exists resolver_decisions_read_own_role on ops.resolver_decisions;
drop policy if exists resolver_decisions_full_access on ops.resolver_decisions;

-- ----------------------------------------------------------------------------
-- 5.5 Backstop the OTHER schemas reachable via the per-human INVOKER read path.
--     ops_run_select_rls runs as the authenticated caller with search_path
--     ops, metrics, public — and a FULLY-QUALIFIED name (metrics.x / public.x)
--     resolves regardless of search_path. So RLS must gate metrics + public too,
--     else a per-human read reaches them. (red-team CRITICAL #1 + HIGH #3.)
--
--     metrics.*  → OWNER-ONLY (Product-mirror DAU/MRR + cost). Admin's per-human
--                  metrics scope is also removed app-layer (role-resolver.ts).
--     public CRM → OWNER-ONLY (customer PII). These already have RLS + dead
--                  founder_* policies (deny-by-default); we add an explicit owner
--                  policy so the deny is INTENTIONAL + self-documenting, not an
--                  accident of never-matching legacy policies.
-- ----------------------------------------------------------------------------
alter table if exists metrics.product_dau_snapshot enable row level security;
drop policy if exists mua_metrics_owner_read on metrics.product_dau_snapshot;
create policy mua_metrics_owner_read on metrics.product_dau_snapshot
  as permissive for select to authenticated using (ops.is_owner());

-- metrics.gbrain_cost_daily is a VIEW over ops.cost_attributions (owner_only).
-- Make it security_invoker so it inherits the underlying owner-only RLS rather
-- than running with the (BYPASSRLS) view-owner's rights.
do $cost$
begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='metrics' and c.relname='gbrain_cost_daily' and c.relkind='v') then
    execute 'alter view metrics.gbrain_cost_daily set (security_invoker = true)';
  end if;
end
$cost$;

do $crm$
declare t text;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and c.relname in ('customers','persons','companies','company_persons')
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists mua_owner_crm on public.%I', t);
    execute format('create policy mua_owner_crm on public.%I as permissive for all to authenticated using (ops.is_owner()) with check (ops.is_owner())', t);
  end loop;
end
$crm$;

-- ----------------------------------------------------------------------------
-- 6. Tier-aware RLS on ops.* — owner ⊇ admin ⊇ user, keyed on the verified JWT.
--    EXPLICIT ALLOWLISTS (fail-safe per red-team #9 — an unclassified/new ops
--    table defaults to owner-only, never admin-writable):
--      • owner → ALL on every ops table, EXCEPT ops.operators (broker-write-only,
--                §2/§3) and ops.audit_log (system-written; owner gets READ only).
--      • admin → on the DATA-PLANE allowlist: ALL.
--                on the FORENSIC allowlist: SELECT + INSERT only (append-only — an
--                admin insider cannot rewrite/erase the agent/tool trail, red-team
--                #5). audit_log is already UPDATE/DELETE-proof (§4).
--                everything else (owner-only / unclassified): NOTHING.
--      • user  → nothing on ops (content commands don't touch the ops DB), EXCEPT
--                an INSERT-only audit policy on ops.mcp_calls so the lowest-trust
--                tier is never un-audited (red-team #6; audit writes must land).
--    Pre-existing dead `founder_*` policies (qual auth.jwt()->>'role'='founder',
--    never matches a real Auth JWT) are left in place — harmless (never evaluate
--    true → grant nothing).
-- ----------------------------------------------------------------------------
do $mua$
declare
  t text;
  -- admin: full read+write (operational data admins legitimately manage)
  admin_data_rw text[] := array[
    'alerts','attention_log','campaigns','capability_phase_events','capability_runs',
    'deepask_coverage','deepask_runs','entity_edit_locks','evolve_extractions',
    'ingestion_jobs','knowledge_embeddings','knowledge_extractions','knowledge_links',
    'knowledge_pages','kpi_snapshots','resolver_decisions','tasks','tier3_index'
  ];
  -- admin: append-only (SELECT + INSERT; no UPDATE/DELETE) — the forensic trail
  admin_append text[] := array[
    'agent_runs','mcp_calls','task_state_transitions','sop_runs','scheduled_runs',
    'minion_jobs','events','run_summaries'
  ];
begin
  for t in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'ops' and c.relkind = 'r'
  loop
    -- owner: full everywhere EXCEPT operators (broker-write-only) + audit_log
    -- (read-only — system-written; immutable via §4).
    if t <> 'operators' and t <> 'audit_log' then
      execute format('drop policy if exists mua_owner_all on ops.%I', t);
      execute format(
        'create policy mua_owner_all on ops.%I as permissive for all to authenticated using (ops.is_owner()) with check (ops.is_owner())',
        t);
    end if;

    if t = any(admin_data_rw) then
      -- admin: ALL on the data plane
      execute format('drop policy if exists mua_admin_rw on ops.%I', t);
      execute format(
        'create policy mua_admin_rw on ops.%I as permissive for all to authenticated using (ops.is_admin_or_above()) with check (ops.is_admin_or_above())',
        t);
    elsif t = any(admin_append) then
      -- admin: append-only (SELECT + INSERT; cannot UPDATE/DELETE the trail)
      execute format('drop policy if exists mua_admin_read on ops.%I', t);
      execute format(
        'create policy mua_admin_read on ops.%I as permissive for select to authenticated using (ops.is_admin_or_above())',
        t);
      execute format('drop policy if exists mua_admin_append on ops.%I', t);
      execute format(
        'create policy mua_admin_append on ops.%I as permissive for insert to authenticated with check (ops.is_admin_or_above())',
        t);
    end if;
    -- else: owner-only (admin gets no policy) — fail-safe default.
  end loop;
end
$mua$;

-- audit_log: owner READ-only (no human write at all; the system appends via
-- service_role, which bypasses RLS). Combined with the §4 UPDATE/DELETE triggers,
-- audit_log is the single tamper-evident source of forensic truth.
drop policy if exists mua_owner_read_audit on ops.audit_log;
create policy mua_owner_read_audit on ops.audit_log
  as permissive for select to authenticated using (ops.is_owner());

-- Audit availability: EVERY per-human tier (incl. user) must be able to APPEND
-- its own ops.mcp_calls audit row, else the audit INSERT is RLS-denied and (being
-- fail-open) the lowest-trust tier goes silently un-audited (red-team #6).
-- INSERT-only; reads stay tier-gated (user has no select policy on mcp_calls).
drop policy if exists mua_audit_insert on ops.mcp_calls;
create policy mua_audit_insert on ops.mcp_calls
  as permissive for insert to authenticated with check (true);

-- ----------------------------------------------------------------------------
-- 7. SECURITY INVOKER read RPC — the per-human cutover read path.
--    `ops_run_select` (00026) is SECURITY DEFINER → bypasses RLS (the
--    service-key path keeps using it, unchanged). This twin runs as the CALLER,
--    so when the MCP connects as `authenticated` with a per-human JWT
--    (RITSU_AUTH_MODE=per-human), the §6 tier RLS actually enforces the read.
--    Identical SqlGuard body to 00026; only the SECURITY mode differs.
-- ----------------------------------------------------------------------------
create or replace function ops.ops_run_select_rls(
  sql_text     text,
  bind_params  jsonb default '[]'::jsonb,
  row_limit    int   default 100
) returns jsonb
language plpgsql
security invoker
set search_path = ops, metrics, public, pg_temp
as $$
declare
  normalized      text;
  first_keyword   text;
  rows_jsonb      jsonb;
  effective_limit int;
  rows_returned   int;
begin
  if char_length(sql_text) > 8000 then
    raise exception 'ops_run_select_rls: sql length % exceeds 8000', char_length(sql_text) using errcode = '22023';
  end if;
  normalized := regexp_replace(sql_text, '--[^\n]*', ' ', 'g');
  normalized := regexp_replace(normalized, '/\*.*?\*/', ' ', 'gn');
  normalized := btrim(normalized);
  normalized := regexp_replace(normalized, ';\s*$', '');
  if normalized = '' then
    raise exception 'ops_run_select_rls: sql is empty or comments-only' using errcode = '22023';
  end if;
  if normalized ~ ';' then
    raise exception 'ops_run_select_rls: multi-statement SQL not allowed' using errcode = '22023';
  end if;
  first_keyword := lower(split_part(btrim(normalized), ' ', 1));
  if first_keyword not in ('select', 'with') then
    raise exception 'ops_run_select_rls: first keyword must be SELECT or WITH; got %', first_keyword using errcode = '22023';
  end if;
  if normalized ~* '\binto\b' then
    raise exception 'ops_run_select_rls: SELECT INTO is not permitted' using errcode = '22023';
  end if;
  effective_limit := least(greatest(row_limit, 1), 1000);
  execute format('SELECT coalesce(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb) FROM (%s LIMIT %s) AS t', normalized, effective_limit + 1)
    into rows_jsonb using bind_params;
  rows_returned := jsonb_array_length(rows_jsonb);
  if rows_returned > effective_limit then
    rows_jsonb := (select jsonb_agg(elem) from (select elem from jsonb_array_elements(rows_jsonb) as elem limit effective_limit) sub);
    return jsonb_build_object('rows', rows_jsonb, 'row_count', effective_limit, 'truncated', true);
  end if;
  return jsonb_build_object('rows', rows_jsonb, 'row_count', rows_returned, 'truncated', false);
end;
$$;

comment on function ops.ops_run_select_rls(text, jsonb, int) is
  'multi-user-auth: SECURITY INVOKER read RPC for the per-human MCP path. Runs as the authenticated caller so §6 tier RLS enforces. Service-key path keeps using ops_run_select (DEFINER).';

revoke all on function ops.ops_run_select_rls(text, jsonb, int) from public;
grant execute on function ops.ops_run_select_rls(text, jsonb, int) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 8. Verification (run read-only after apply):
--   select ops.is_owner();                      -- false off-JWT (fail-closed)
--   select ops.jwt_tier();                       -- null off-JWT
--   select count(*) from pg_policies where schemaname='ops' and policyname like 'mua_%';
--   select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--     where n.nspname='ops' and proname like 'operator_%' or proname like 'jwt_%';
-- ----------------------------------------------------------------------------
