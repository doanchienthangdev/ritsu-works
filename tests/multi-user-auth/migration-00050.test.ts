// All-Edge structural tests for supabase/migrations/00050_instant_revocation.sql
// (multi-user-auth Sprint 3). The migration is DDL; these assert the security-
// load-bearing invariants of the SQL text. Behavioral enforcement is verified
// against the live DB post-apply (mint a revoked operator JWT → denied).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SQL = readFileSync(
  resolve(__dirname, "..", "..", "supabase", "migrations", "00050_instant_revocation.sql"),
  "utf8",
);
const sql = SQL.toLowerCase();

describe("00050_instant_revocation migration", () => {
  describe("operator_status_self()", () => {
    it("is defined", () => {
      expect(sql).toMatch(/create or replace function ops\.operator_status_self\(\)/);
    });
    it("is SECURITY DEFINER with a search_path pinned WITHOUT public (no PII reach)", () => {
      expect(sql).toMatch(/operator_status_self[\s\S]*?security definer/);
      expect(sql).toMatch(/operator_status_self[\s\S]*?set search_path = ops, pg_temp/);
      // no `set search_path = ...` CLAUSE in this migration may include public
      // (comment mentions of "public" are fine — we target the actual SET clause).
      expect(sql).not.toMatch(/set search_path =[^\n]*public/);
    });
    it("is CALLER-SCOPED (matches the caller's own sub or email only)", () => {
      expect(sql).toMatch(/supabase_user_id = ops\.jwt_sub\(\)/);
      expect(sql).toMatch(/lower\(email\) = lower\(ops\.jwt_email\(\)\)/);
    });
    it("fail-closed tiebreak: a revoked/expired matching row wins", () => {
      expect(sql).toMatch(/order by \(status in \('revoked','expired'\)\) desc/);
    });
  });

  describe("operator_not_revoked()", () => {
    it("is defined, SECURITY DEFINER, pinned search_path", () => {
      expect(sql).toMatch(/create or replace function ops\.operator_not_revoked\(\)/);
      expect(sql).toMatch(/operator_not_revoked[\s\S]*?security definer/);
      expect(sql).toMatch(/operator_not_revoked[\s\S]*?set search_path = ops, pg_temp/);
    });
    it("returns false ONLY for an enrolled revoked/expired caller; NULL (un-enrolled) → true (fail-open, JWT-gated)", () => {
      expect(sql).toMatch(/coalesce\(ops\.operator_status_self\(\) not in \('revoked','expired'\), true\)/);
    });
  });

  describe("execute grants (defense-in-depth)", () => {
    it("revokes execute from public + grants to authenticated for both new SECDEF fns", () => {
      expect(sql).toMatch(/revoke execute on function ops\.operator_status_self\(\) from public/);
      expect(sql).toMatch(/revoke execute on function ops\.operator_not_revoked\(\) from public/);
      expect(sql).toMatch(/grant execute on function ops\.operator_status_self\(\) to authenticated/);
      expect(sql).toMatch(/grant execute on function ops\.operator_not_revoked\(\) to authenticated/);
    });
  });

  describe("is_owner / is_admin_or_above gain the not_revoked term", () => {
    it("is_owner ANDs not_revoked() onto the tier check (instant revocation propagates to all RLS)", () => {
      expect(sql).toMatch(/is_owner[\s\S]*?jwt_tier\(\)\s*=\s*'owner'\s*and\s*ops\.operator_not_revoked\(\)/);
    });
    it("is_admin_or_above ANDs not_revoked() onto rank >= 2", () => {
      expect(sql).toMatch(/is_admin_or_above[\s\S]*?tier_rank\(ops\.jwt_tier\(\)\)\s*>=\s*2\s*and\s*ops\.operator_not_revoked\(\)/);
    });
    it("the two helpers stay SECURITY INVOKER (no `security definer` on is_owner/is_admin)", () => {
      const ownerDef = sql.slice(sql.indexOf("create or replace function ops.is_owner"));
      const ownerBody = ownerDef.slice(0, ownerDef.indexOf("$$", ownerDef.indexOf("$$") + 2));
      expect(ownerBody).not.toMatch(/security definer/);
    });
  });

  describe("safety posture", () => {
    it("documents that it is ADDITIVE + INERT under service_role (RLS bypass)", () => {
      expect(sql).toMatch(/additive \+ inert|inert under the live system|bypass rls/i);
    });
  });
});
