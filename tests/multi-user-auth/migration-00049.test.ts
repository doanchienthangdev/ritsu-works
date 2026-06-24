// All-Edge structural tests for supabase/migrations/00049_multi_user_auth.sql.
// The migration is DDL, so these assert the security-load-bearing invariants of
// the SQL text (objects present, SECURITY mode correct, owner-gates present,
// holes closed, idempotency). They are the guard against a future edit silently
// weakening the tier model. Behavioral RLS enforcement is verified against the
// live DB post-apply (read-only) + by the per-human MCP unit tests.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SQL = readFileSync(
  resolve(__dirname, "..", "..", "supabase", "migrations", "00049_multi_user_auth.sql"),
  "utf8",
);
const sql = SQL.toLowerCase();

describe("00049_multi_user_auth migration", () => {
  describe("JWT tier helpers", () => {
    for (const fn of ["jwt_claims", "jwt_tier", "jwt_email", "jwt_sub", "tier_rank", "is_owner", "is_admin_or_above"]) {
      it(`defines ops.${fn}()`, () => {
        expect(sql).toMatch(new RegExp(`create or replace function ops\\.${fn}\\b`));
      });
    }
    it("jwt_tier reads app_metadata.tier (not a top-level claim — a real Auth JWT)", () => {
      expect(sql).toMatch(/'app_metadata'\s*->>\s*'tier'/);
    });
    it("is_owner checks tier = 'owner'", () => {
      expect(sql).toMatch(/is_owner[\s\S]*?jwt_tier\(\)\s*=\s*'owner'/);
    });
    it("is_admin_or_above uses rank >= 2", () => {
      expect(sql).toMatch(/is_admin_or_above[\s\S]*?tier_rank\(ops\.jwt_tier\(\)\)\s*>=\s*2/);
    });
    it("jwt_claims is null-safe off-JWT (coalesce to '{}')", () => {
      expect(sql).toMatch(/coalesce\(nullif\(current_setting\('request\.jwt\.claims', true\), ''\), '\{\}'\)/);
    });
  });

  describe("ops.operators table", () => {
    it("creates the table (idempotent)", () => {
      expect(sql).toMatch(/create table if not exists ops\.operators/);
    });
    it("constrains tier to owner|admin|user", () => {
      expect(sql).toMatch(/tier\s+text not null check \(tier in \('owner','admin','user'\)\)/);
    });
    it("constrains status to invited|active|revoked|expired", () => {
      expect(sql).toMatch(/status in \('invited','active','revoked','expired'\)/);
    });
    it("enables RLS", () => {
      expect(sql).toMatch(/alter table ops\.operators enable row level security/);
    });
    it("has a case-insensitive unique email index", () => {
      expect(sql).toMatch(/create unique index if not exists operators_email_lower_uniq on ops\.operators \(lower\(email\)\)/);
    });
    it("owner-read-only policy (no direct write policy → broker-only writes)", () => {
      expect(sql).toMatch(/create policy operators_owner_read on ops\.operators[\s\S]{0,120}?for select to authenticated[\s\S]{0,60}?using \(ops\.is_owner\(\)\)/);
      // operators is excluded from the owner-all + admin loops → no write policy is created for it
      expect(sql).toMatch(/if t <> 'operators' and t <> 'audit_log' then/);
      // the only `create policy ... on ops.operators` statement is operators_owner_read
      const opCreates = (SQL.match(/create policy \w+ on ops\.operators\b/gi) || []).map((s) => s.toLowerCase());
      expect(opCreates).toStrictEqual(["create policy operators_owner_read on ops.operators"]);
    });
  });

  describe("broker SECURITY DEFINER functions (owner-gated)", () => {
    for (const fn of ["operator_invite", "operator_redeem", "operator_revoke", "operator_set_tier"]) {
      it(`${fn} is SECURITY DEFINER with search_path pinned WITHOUT public (anti-privesc)`, () => {
        const re = new RegExp(`function ops\\.${fn}\\b[\\s\\S]*?security definer[\\s\\S]*?set search_path = ops, pg_temp`);
        expect(sql).toMatch(re);
      });
    }
    it("invite is owner-gated", () => {
      expect(sql).toMatch(/operator_invite[\s\S]*?if not ops\.is_owner\(\) then[\s\S]*?raise exception/);
    });
    it("revoke is owner-gated", () => {
      expect(sql).toMatch(/operator_revoke[\s\S]*?if not ops\.is_owner\(\) then/);
    });
    it("set_tier is owner-gated", () => {
      expect(sql).toMatch(/operator_set_tier[\s\S]*?if not ops\.is_owner\(\) then/);
    });
    it("invite refuses to mint an owner tier", () => {
      expect(sql).toMatch(/operator_invite[\s\S]*?p_tier not in \('admin','user'\)/);
    });
    it("revoke refuses to strand the system ownerless (last active owner)", () => {
      expect(sql).toMatch(/operator_revoke[\s\S]*?refusing to revoke the last active owner/);
    });
    it("set_tier refuses to demote the last active owner (red-team #2)", () => {
      expect(sql).toMatch(/operator_set_tier[\s\S]*?refusing to demote the last active owner/);
    });
    it("redeem only activates an outstanding, unexpired invite", () => {
      expect(sql).toMatch(/operator_redeem[\s\S]*?status = 'invited'[\s\S]*?invite_expires_at is null or invite_expires_at > now\(\)/);
    });
    it("broker fns are owner-broker-only: revoked from authenticated/anon/public, granted ONLY to service_role", () => {
      expect(sql).toMatch(/revoke all on function ops\.operator_invite[\s\S]*?from public, anon, authenticated/);
      // line-scoped: each broker fn's GRANT line targets service_role only (no authenticated)
      const lines = SQL.toLowerCase().split("\n");
      for (const fn of ["operator_invite", "operator_redeem", "operator_revoke", "operator_set_tier"]) {
        const grant = lines.find((l) => l.includes(`grant execute on function ops.${fn}`)) || "";
        expect(grant).toContain("to service_role");
        expect(grant).not.toContain("authenticated"); // privesc surface
      }
    });
  });

  describe("audit-immutability", () => {
    it("defines a reject_mutation trigger fn", () => {
      expect(sql).toMatch(/create or replace function ops\.reject_mutation\(\)/);
    });
    it("blocks UPDATE and DELETE on ops.audit_log", () => {
      expect(sql).toMatch(/create trigger audit_log_no_update before update on ops\.audit_log/);
      expect(sql).toMatch(/create trigger audit_log_no_delete before delete on ops\.audit_log/);
    });
  });

  describe("closes the pre-existing permissive holes", () => {
    it("drops the qual=true settings policies", () => {
      expect(sql).toMatch(/drop policy if exists founder_read_settings on ops\.settings/);
      expect(sql).toMatch(/drop policy if exists founder_write_settings on ops\.settings/);
    });
    it("drops the qual=true extractions read policy", () => {
      expect(sql).toMatch(/drop policy if exists extractions_read_authenticated on ops\.knowledge_extractions/);
    });
    it("drops the deepask/resolver `to public` role-claim policies (red-team #4)", () => {
      for (const p of [
        "deepask_runs_read_own_role", "deepask_runs_full_access",
        "deepask_coverage_read_own_role", "deepask_coverage_full_access",
        "resolver_decisions_read_own_role", "resolver_decisions_full_access",
      ]) {
        expect(sql).toMatch(new RegExp(`drop policy if exists ${p} on ops\\.`));
      }
    });
  });

  describe("cross-schema RLS backstop (INVOKER path reaches ops+metrics+public) — red-team #1/#3", () => {
    it("enables RLS on metrics.product_dau_snapshot + owner-only read", () => {
      expect(sql).toMatch(/alter table if exists metrics\.product_dau_snapshot enable row level security/);
      expect(sql).toMatch(/create policy mua_metrics_owner_read on metrics\.product_dau_snapshot[\s\S]*?for select to authenticated using \(ops\.is_owner\(\)\)/);
    });
    it("makes metrics.gbrain_cost_daily security_invoker (inherits owner-only RLS)", () => {
      expect(sql).toMatch(/alter view metrics\.gbrain_cost_daily set \(security_invoker = true\)/);
    });
    it("owner-only RLS on public CRM/PII tables", () => {
      expect(sql).toMatch(/c\.relname in \('customers','persons','companies','company_persons'\)/);
      expect(sql).toMatch(/create policy mua_owner_crm on public\.%i as permissive for all to authenticated using \(ops\.is_owner\(\)\)/);
    });
  });

  describe("tier RLS (owner ⊇ admin ⊇ user) — explicit fail-safe allowlists", () => {
    it("owner gets mua_owner_all (full) via the loop", () => {
      expect(sql).toMatch(/create policy mua_owner_all on ops\.%i as permissive for all to authenticated using \(ops\.is_owner\(\)\) with check \(ops\.is_owner\(\)\)/);
    });
    it("admin data plane = explicit allowlist → mua_admin_rw (ALL)", () => {
      expect(sql).toMatch(/admin_data_rw text\[\] := array\[/);
      expect(sql).toMatch(/create policy mua_admin_rw on ops\.%i as permissive for all to authenticated using \(ops\.is_admin_or_above\(\)\)/);
      for (const t of ["knowledge_pages", "tasks", "deepask_runs", "resolver_decisions"]) {
        expect(sql).toContain(`'${t}'`);
      }
    });
    it("admin forensic = append-only (SELECT + INSERT, NO update/delete) — red-team #5", () => {
      expect(sql).toMatch(/admin_append text\[\] := array\[/);
      expect(sql).toMatch(/create policy mua_admin_read on ops\.%i as permissive for select to authenticated/);
      expect(sql).toMatch(/create policy mua_admin_append on ops\.%i as permissive for insert to authenticated/);
      for (const t of ["agent_runs", "mcp_calls", "task_state_transitions", "sop_runs", "events"]) {
        expect(sql).toContain(`'${t}'`);
      }
      // forensic tables must be in admin_append, NOT in the full-rw allowlist
      const dataRwBlock = SQL.slice(SQL.indexOf("admin_data_rw text[] := array["), SQL.indexOf("admin_append text[] := array["));
      const appendBlock = SQL.slice(SQL.indexOf("admin_append text[] := array["), SQL.indexOf("admin_append text[] := array[") + 300);
      expect(dataRwBlock).not.toContain("'agent_runs'");
      expect(dataRwBlock).not.toContain("'mcp_calls'");
      expect(appendBlock).toContain("'agent_runs'");
    });
    it("operators + audit_log excluded from owner-all (broker-write / system-write)", () => {
      expect(sql).toMatch(/if t <> 'operators' and t <> 'audit_log' then[\s\S]*?mua_owner_all/);
    });
    it("audit_log: owner READ-only (no write) + system-written", () => {
      expect(sql).toMatch(/create policy mua_owner_read_audit on ops\.audit_log[\s\S]*?for select to authenticated using \(ops\.is_owner\(\)\)/);
    });
    it("audit always lands: every tier may INSERT ops.mcp_calls (red-team #6)", () => {
      expect(sql).toMatch(/create policy mua_audit_insert on ops\.mcp_calls[\s\S]*?for insert to authenticated with check \(true\)/);
    });
    it("unclassified tables default to owner-only (fail-safe — red-team #9)", () => {
      expect(sql).toMatch(/else: owner-only \(admin gets no policy\) — fail-safe default/);
    });
    it("user tier gets NO ops grant policy (default-deny; only the audit INSERT)", () => {
      expect(sql).not.toMatch(/create policy \w+ on ops\.[\w%]+[\s\S]*?jwt_tier\(\)\s*=\s*'user'/);
    });
  });

  describe("SECURITY INVOKER read RPC (per-human enforcement path)", () => {
    it("ops_run_select_rls is SECURITY INVOKER (NOT definer)", () => {
      expect(sql).toMatch(/function ops\.ops_run_select_rls\([\s\S]*?security invoker/);
      // must not accidentally be definer
      const block = sql.slice(sql.indexOf("ops_run_select_rls"));
      expect(block.slice(0, 600)).not.toContain("security definer");
    });
    it("re-applies the SqlGuard (SELECT-only, no multi-statement, no INTO)", () => {
      expect(sql).toMatch(/ops_run_select_rls[\s\S]*?first keyword must be select or with/);
      expect(sql).toMatch(/ops_run_select_rls[\s\S]*?multi-statement sql not allowed/);
    });
  });

  describe("idempotency / re-runnability", () => {
    it("uses create-or-replace / if-not-exists / drop-if-exists throughout", () => {
      expect(sql).toMatch(/create or replace function/);
      expect(sql).toMatch(/create table if not exists/);
      expect(sql).toMatch(/drop policy if exists/);
      expect(sql).toMatch(/drop trigger if exists/);
    });
  });
});
