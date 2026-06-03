-- ════════════════════════════════════════════════════════════════════════════
-- analytics-machinery.sql — ANALYTICS-SIDE sync machinery   [APPLY ON ritsu-analytics]
-- ════════════════════════════════════════════════════════════════════════════
-- Capability: product-db-readonly-access (Door 2). The reproducible, version-
-- controlled source of truth for the ritsu-analytics (ddgbabvbfjrsznvzhizf,
-- us-west-1 — NOT Product) sync machinery: schemas, the sync log, the array-aware
-- PII canary, and the per-table / batch sync procedures.
--
-- This is [A] analytics-side (the analytics DB holds only pseudonymized data; no
-- Product touch here). Idempotent — safe to re-apply. Applied via the Supabase
-- Management API /database/query endpoint against the analytics ref ONLY.
--
-- NOT in this file (they need the Product pooler host + the analytics_export_ro
-- password, founder-provisioned — see knowledge/analytics-sync-contract.yaml +
-- the local-only brainstorm dir):
--   • the postgres_fdw server `product_ro` + user mapping
--   • IMPORT FOREIGN SCHEMA analytics_export → ext.*
--   • CREATE ROLE analytics_reader (mcp-server-analytics/sql/create-analytics-reader.cjs)
--   • the nightly pg_cron job:
--       select cron.schedule('analytics-sync-nightly','0 11 * * *', $$ call live.sync_all(); $$);
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists postgres_fdw;
create extension if not exists pg_cron;

create schema if not exists ext;      -- foreign tables → product analytics_export.* views
create schema if not exists staging;  -- per-run landing; canary-validated before swap
create schema if not exists live;     -- the read surface (analytics_reader / the MCP read here)

-- ── sync log. started_at + finished_at give REAL per-table duration (Sprint 4
--    Tầng-0: sync_one stamps both explicitly so duration is usable as the
--    scale-trigger signal — see wiki/capabilities/product-db-readonly-access/spec.md §7). ──
create table if not exists live._sync_runs(
  id bigint generated always as identity primary key,
  table_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  rows_synced bigint,
  detail text);

-- ── PII canary — ARRAY-AWARE (Sprint 3). Scans every scalar text column AND every
--    text[] element for an email-shaped pattern. Returns the count of suspect cells
--    across the table; MUST be 0 before any staging→live swap. ──────────────────
create or replace function live.pii_canary(p_schema text, p_table text) returns bigint
language plpgsql as $fn$
declare r record; total bigint := 0; n bigint;
  email_re text := '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}';
begin
  for r in
    select column_name, data_type, udt_name
    from information_schema.columns
    where table_schema = p_schema and table_name = p_table
      and ( data_type in ('text','character varying','character')
            or (data_type = 'ARRAY' and udt_name in ('_text','_varchar','_bpchar')) )
  loop
    if r.data_type = 'ARRAY' then
      execute format('select count(*) from %I.%I t, lateral unnest(t.%I) as g(v) where g.v ~* %L',
        p_schema, p_table, r.column_name, email_re) into n;
    else
      execute format('select count(*) from %I.%I where %I ~* %L',
        p_schema, p_table, r.column_name, email_re) into n;
    end if;
    total := total + coalesce(n, 0);
  end loop;
  return total;
end $fn$;

-- ── sync_one — full-replace a single table (Sprint 4 Tầng-0: real timing +
--    self-logs BOTH ok/failed paths). The BEGIN…EXCEPTION block is a subtransaction:
--    on a canary trip / 0-row-abort the partial work rolls back and live.<tbl> keeps
--    its last-good copy, then a 'failed' row is logged WITH timing.
--    NOTE (scale): this is full-replace (O(table size) per night). Fine to ~15-25k
--    users; past that, graduate to incremental + a view-indirection swap — see spec §7. ──
create or replace procedure live.sync_one(tbl text) language plpgsql as $sp$
declare n bigint; bad bigint; prior bigint; v_start timestamptz := clock_timestamp();
begin
  execute format('drop table if exists staging.%I', tbl);
  execute format('create table staging.%I as select * from ext.%I', tbl, tbl);  -- pulls the product stripped view
  execute format('select count(*) from staging.%I', tbl) into n;
  bad := live.pii_canary('staging', tbl);
  if bad > 0 then raise exception 'PII-canary tripped (% suspect cells)', bad; end if;
  -- empty-safe: only abort 0-rows when live already HAD rows (don't replace good with empty)
  if n = 0 and exists (select 1 from information_schema.tables where table_schema='live' and table_name=tbl) then
    execute format('select count(*) from live.%I', tbl) into prior;
    if prior > 0 then raise exception '0 rows but live had % — abort (keep last-good)', prior; end if;
  end if;
  execute format('drop table if exists live.%I', tbl);
  execute format('alter table staging.%I set schema live', tbl);
  -- grant-survival: the schema-swap makes a NEW table object that loses the one-time grant.
  if exists (select 1 from pg_roles where rolname='analytics_reader') then
    execute format('grant select on live.%I to analytics_reader', tbl);
  end if;
  insert into live._sync_runs(table_name, started_at, finished_at, status, rows_synced)
    values (tbl, v_start, clock_timestamp(), 'ok', n);
exception when others then
  insert into live._sync_runs(table_name, started_at, finished_at, status, detail)
    values (tbl, v_start, clock_timestamp(), 'failed', sqlerrm);
end $sp$;

-- ── sync_all — the 17-table set (sync_one self-logs both paths → plain loop).
--    Runs as ONE transaction (the nightly pg_cron / a single Management-API call),
--    so all swaps commit atomically — consumers never see a cross-table mix. ──────
create or replace procedure live.sync_all() language plpgsql as $sa$
declare t text; tables text[] := array[
  'profiles','learning_sessions','learning_progress','sources','learning_projects',
  'learning_plans','learning_units','pok_progress','session_shares','ai_usage_logs',
  'credit_transactions','user_pok_analytics','tier_limits','ai_providers','ai_models',
  'command_model_configs','onboarding_categories'];
begin
  foreach t in array tables loop call live.sync_one(t); end loop;
end $sa$;
