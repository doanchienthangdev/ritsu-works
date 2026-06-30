// Tests for scripts/cross-tier/validate-secdef-rpc-exposure.cjs — the security
// drift guard added with migration 00047.
//
// The guard fails CI if any SECURITY DEFINER function in schema `ops` is left
// with `public` in (or no pinned) search_path AND remains executable by
// authenticated/PUBLIC — the RLS-bypass / PII-exposure configuration.
//
// We unit-test the pure parser (tokenizer + effective-state folder) on
// synthetic inputs, then integration-test the real validator against the repo
// and confirm it would have flagged the pre-fix state.

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..");
const VALIDATOR_PATH = join(REPO, "scripts/cross-tier/validate-secdef-rpc-exposure.cjs");
const validator = cjsRequire(VALIDATOR_PATH);
const { MIGRATIONS_DIR, listMigrationFiles } = cjsRequire(
  join(REPO, "scripts/lib/read-migrations.cjs"),
);

const {
  stripAndSplitStatements,
  headerOf,
  extractSearchPath,
  parseGrantees,
  analyzeMigrations,
  analyzeRepo,
} = validator;

// Helpers ------------------------------------------------------------------
const mig = (file: string, sql: string) => ({ file, sql });
const analyze = (...migs: Array<{ file: string; sql: string }>) => analyzeMigrations(migs);
const names = (offenses: Array<{ name: string }>) => offenses.map((o) => o.name).sort();

// A reusable "vulnerable" definition: SECURITY DEFINER + public in path +
// granted to authenticated.
const VULN = `
CREATE OR REPLACE FUNCTION ops.foo(sql_text text, bind jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ops, metrics, public, pg_temp
AS $$
BEGIN
  RETURN '[]'::jsonb;  -- body mentions public; and a semicolon
END;
$$;
GRANT EXECUTE ON FUNCTION ops.foo(text, jsonb) TO service_role, authenticated;
`;

// ==========================================================================
describe("tokenizer — stripAndSplitStatements", () => {
  it("splits on top-level semicolons", () => {
    const s = stripAndSplitStatements("SELECT 1; SELECT 2; SELECT 3");
    expect(s).toHaveLength(3);
    expect(s[0]).toBe("SELECT 1");
  });

  it("does NOT split on semicolons inside a dollar-quoted body", () => {
    const s = stripAndSplitStatements(
      "CREATE FUNCTION f() RETURNS void AS $$ BEGIN a; b; c; END; $$; SELECT 1",
    );
    expect(s).toHaveLength(2);
    expect(s[0]).toContain("BEGIN a; b; c; END;");
    expect(s[1]).toBe("SELECT 1");
  });

  it("does NOT split on semicolons inside single-quoted strings", () => {
    const s = stripAndSplitStatements("INSERT INTO t VALUES ('a;b;c'); SELECT 1");
    expect(s).toHaveLength(2);
    expect(s[0]).toContain("'a;b;c'");
  });

  it("strips line comments outside dollar bodies", () => {
    const s = stripAndSplitStatements("SELECT 1 -- a; b; comment\n; SELECT 2");
    expect(s).toHaveLength(2);
    expect(s[0]).not.toContain("comment");
  });

  it("strips block comments outside dollar bodies", () => {
    const s = stripAndSplitStatements("SELECT 1 /* drop ; table */ ; SELECT 2");
    expect(s).toHaveLength(2);
    expect(s[0]).not.toContain("drop");
  });

  it("preserves a custom dollar tag and its inner content verbatim", () => {
    const s = stripAndSplitStatements("CREATE FUNCTION f() AS $body$ a; -- x\n $body$");
    expect(s).toHaveLength(1);
    expect(s[0]).toContain("$body$ a; -- x");
  });

  it("does not mistake positional params ($1) for a dollar-quote open", () => {
    const s = stripAndSplitStatements("SELECT $1 WHERE x = $2; SELECT 3");
    expect(s).toHaveLength(2);
  });

  it("returns [] for empty / whitespace / comment-only input", () => {
    expect(stripAndSplitStatements("")).toEqual([]);
    expect(stripAndSplitStatements("   \n\t ")).toEqual([]);
    expect(stripAndSplitStatements("-- just a comment\n")).toEqual([]);
  });
});

// ==========================================================================
describe("extractSearchPath", () => {
  it("parses a comma list and lowercases elements", () => {
    expect(extractSearchPath("SET search_path = ops, Metrics, public, pg_temp")).toEqual([
      "ops",
      "metrics",
      "public",
      "pg_temp",
    ]);
  });

  it("returns null when no SET search_path clause is present", () => {
    expect(extractSearchPath("LANGUAGE sql SECURITY DEFINER")).toBeNull();
  });

  it("accepts the TO spelling", () => {
    expect(extractSearchPath("SET search_path TO pg_catalog, public")).toEqual([
      "pg_catalog",
      "public",
    ]);
  });

  it("stops at an inline AS body marker on the same line", () => {
    expect(extractSearchPath("SET search_path = ops, public AS $$ SELECT 1 $$")).toEqual([
      "ops",
      "public",
    ]);
  });

  it("a path without public does not include public", () => {
    expect(extractSearchPath("SET search_path = ops, metrics, pg_temp")).not.toContain("public");
    expect(extractSearchPath("SET search_path = pg_catalog")).toEqual(["pg_catalog"]);
  });
});

// ==========================================================================
describe("parseGrantees", () => {
  it("parses a GRANT ... TO list", () => {
    expect(parseGrantees("GRANT EXECUTE ON FUNCTION ops.foo(text) TO service_role, authenticated")).toEqual([
      "service_role",
      "authenticated",
    ]);
  });

  it("parses REVOKE ... FROM PUBLIC (lowercased)", () => {
    expect(parseGrantees("REVOKE EXECUTE ON FUNCTION ops.foo() FROM PUBLIC")).toEqual(["public"]);
  });

  it("parses a multi-role FROM list", () => {
    expect(parseGrantees("REVOKE EXECUTE ON FUNCTION ops.foo() FROM PUBLIC, authenticated, anon")).toEqual([
      "public",
      "authenticated",
      "anon",
    ]);
  });
});

// ==========================================================================
describe("headerOf", () => {
  it("returns everything before the dollar-quoted body", () => {
    const h = headerOf("CREATE FUNCTION ops.f() SECURITY DEFINER AS $$ SECURITY INVOKER in body $$");
    expect(h).toContain("SECURITY DEFINER");
    expect(h).not.toContain("in body");
  });
});

// ==========================================================================
describe("analyzeMigrations — offense detection", () => {
  it("flags SECURITY DEFINER + public-in-path + granted-to-authenticated", () => {
    const { offenses } = analyze(mig("00001_x.sql", VULN));
    expect(offenses).toHaveLength(1);
    expect(offenses[0]).toMatchObject({ name: "foo", reason: "public_in_search_path" });
    expect(offenses[0].file).toBe("00001_x.sql");
  });

  it("clears the offense when a LATER migration REVOKEs PUBLIC + authenticated (the 00047 pattern)", () => {
    const { offenses } = analyze(
      mig("00001_x.sql", VULN),
      mig(
        "00002_fix.sql",
        `REVOKE EXECUTE ON FUNCTION ops.foo(text, jsonb) FROM PUBLIC;
         REVOKE EXECUTE ON FUNCTION ops.foo(text, jsonb) FROM authenticated;
         REVOKE EXECUTE ON FUNCTION ops.foo(text, jsonb) FROM anon;
         GRANT  EXECUTE ON FUNCTION ops.foo(text, jsonb) TO service_role;`,
      ),
    );
    expect(offenses).toHaveLength(0);
  });

  it("does NOT flag when search_path has no public, even if still authenticated-executable (matches the public-AND-authenticated contract)", () => {
    const { offenses } = analyze(
      mig("00001_x.sql", VULN),
      mig("00002_drop_public.sql", "ALTER FUNCTION ops.foo(text, jsonb) SET search_path = ops, metrics, pg_temp;"),
    );
    expect(offenses).toHaveLength(0);
  });

  it("flags an unpinned (no SET search_path) SECURITY DEFINER function reachable by authenticated", () => {
    const { offenses } = analyze(
      mig("00001_u.sql", "CREATE FUNCTION ops.bar() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ SELECT 1 $$;"),
    );
    expect(offenses).toHaveLength(1);
    expect(offenses[0]).toMatchObject({ name: "bar", reason: "unpinned_search_path" });
  });

  it("does NOT flag a non-SECURITY-DEFINER function even with public + authenticated", () => {
    const { offenses } = analyze(
      mig(
        "00001_inv.sql",
        `CREATE FUNCTION ops.baz() RETURNS void LANGUAGE sql SET search_path = public AS $$ SELECT 1 $$;
         GRANT EXECUTE ON FUNCTION ops.baz() TO authenticated;`,
      ),
    );
    expect(offenses).toHaveLength(0);
  });

  it("still flags when only PUBLIC is revoked but authenticated retains an EXPLICIT grant", () => {
    const { offenses } = analyze(
      mig(
        "00001_q.sql",
        `CREATE FUNCTION ops.qux() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = ops, public AS $$ SELECT 1 $$;
         GRANT EXECUTE ON FUNCTION ops.qux() TO authenticated;
         REVOKE EXECUTE ON FUNCTION ops.qux() FROM PUBLIC;`,
      ),
    );
    expect(offenses).toHaveLength(1);
    expect(offenses[0]).toMatchObject({ name: "qux", reason: "public_in_search_path" });
  });

  it("CREATE OR REPLACE preserves a prior REVOKE (does not silently re-expose)", () => {
    const { offenses } = analyze(
      mig("00001_r.sql", "CREATE FUNCTION ops.rep() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = ops, public AS $$ SELECT 1 $$;"),
      mig("00002_r.sql", "REVOKE EXECUTE ON FUNCTION ops.rep() FROM PUBLIC; REVOKE EXECUTE ON FUNCTION ops.rep() FROM authenticated;"),
      mig("00003_r.sql", "CREATE OR REPLACE FUNCTION ops.rep() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = ops, public AS $$ SELECT 2 $$;"),
    );
    expect(offenses).toHaveLength(0);
  });

  it("DROP FUNCTION removes a previously-flagged function", () => {
    const { offenses } = analyze(
      mig("00001_g.sql", "CREATE FUNCTION ops.gone() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT 1 $$;"),
      mig("00002_g.sql", "DROP FUNCTION ops.gone();"),
    );
    expect(offenses).toHaveLength(0);
  });

  it("ignores SECURITY DEFINER / public / semicolons that appear only inside a function body", () => {
    const { functions, offenses } = analyze(
      mig(
        "00001_t.sql",
        `CREATE FUNCTION ops.tricky() RETURNS text LANGUAGE plpgsql AS $$
         BEGIN
           -- mentions SECURITY DEFINER and search_path = public; with semicolons;
           RETURN 'SECURITY DEFINER public; --';
         END;
         $$;
         GRANT EXECUTE ON FUNCTION ops.tricky() TO authenticated;`,
      ),
    );
    expect(offenses).toHaveLength(0);
    expect(functions.get("tricky").securityDefiner).toBe(false);
  });

  it("flags ALL three real anti-patterns when present together (smoke)", () => {
    const { offenses } = analyze(
      mig("00001.sql", VULN),
      mig("00002.sql", "CREATE FUNCTION ops.bar() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ SELECT 1 $$;"),
    );
    expect(names(offenses)).toEqual(["bar", "foo"]);
  });
});

// ==========================================================================
// Second check — public MATERIALIZED VIEWs (audit 2026-06-30, finding D1-1).
// A matview can't carry RLS, so the per-human INVOKER read path can reach it
// unless authenticated+anon SELECT is REVOKEd. Same fail-safe model as functions.
describe("analyzeMigrations — public matview PII exposure", () => {
  const MV = "CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pii AS SELECT id, primary_email FROM customers;";

  it("flags a public matview with no REVOKE (default authenticated+anon readable)", () => {
    const { offenses } = analyze(mig("00001_mv.sql", MV));
    expect(offenses).toHaveLength(1);
    expect(offenses[0]).toMatchObject({ name: "mv_pii", reason: "public_matview_exposed" });
    expect(offenses[0].searchPath).toBe("authenticated, anon");
    expect(offenses[0].file).toBe("00001_mv.sql");
  });

  it("clears when a later migration REVOKEs ALL from authenticated, anon (the 00051 pattern)", () => {
    const { offenses } = analyze(
      mig("00001_mv.sql", MV),
      mig("00002_fix.sql", "REVOKE ALL ON public.mv_pii FROM authenticated, anon;"),
    );
    expect(offenses).toHaveLength(0);
  });

  it("still flags when only authenticated is revoked (anon retains read)", () => {
    const { offenses } = analyze(
      mig("00001_mv.sql", MV),
      mig("00002_partial.sql", "REVOKE ALL ON public.mv_pii FROM authenticated;"),
    );
    expect(offenses).toHaveLength(1);
    expect(offenses[0]).toMatchObject({ name: "mv_pii", reason: "public_matview_exposed" });
    expect(offenses[0].searchPath).toBe("anon");
  });

  it("a single REVOKE ... FROM PUBLIC clears both authenticated and anon (PUBLIC pseudo-role)", () => {
    const { offenses } = analyze(
      mig("00001_mv.sql", MV),
      mig("00002_pub.sql", "REVOKE ALL ON public.mv_pii FROM PUBLIC;"),
    );
    expect(offenses).toHaveLength(0);
  });

  it("DROP MATERIALIZED VIEW removes a previously-flagged matview", () => {
    const { offenses } = analyze(
      mig("00001_mv.sql", MV),
      mig("00002_drop.sql", "DROP MATERIALIZED VIEW IF EXISTS public.mv_pii;"),
    );
    expect(offenses).toHaveLength(0);
  });

  it("a re-GRANT to authenticated after a REVOKE re-exposes (fail-safe fold)", () => {
    const { offenses } = analyze(
      mig("00001_mv.sql", MV),
      mig("00002_fix.sql", "REVOKE ALL ON public.mv_pii FROM authenticated, anon;"),
      mig("00003_oops.sql", "GRANT SELECT ON public.mv_pii TO authenticated;"),
    );
    expect(offenses).toHaveLength(1);
    expect(offenses[0]).toMatchObject({ name: "mv_pii", reason: "public_matview_exposed" });
  });

  it("a function REVOKE does not clear a matview, and a matview REVOKE does not touch functions", () => {
    const { offenses } = analyze(
      mig("00001.sql", VULN), // ops.foo: secdef + public + authenticated → function offense
      mig("00002_mv.sql", MV), // mv_pii → matview offense
      // a function-scoped revoke must NOT be mistaken for the matview, and vice-versa
      mig("00003.sql", "REVOKE EXECUTE ON FUNCTION ops.foo(text, jsonb) FROM authenticated;"),
    );
    // foo's search_path still includes public AND PUBLIC still has EXECUTE (only
    // authenticated was revoked) → foo remains a function offense; mv_pii remains.
    expect(names(offenses)).toEqual(["foo", "mv_pii"]);
  });

  it("CREATE ... IF NOT EXISTS re-run preserves a prior REVOKE (does not re-expose)", () => {
    const { offenses } = analyze(
      mig("00001_mv.sql", MV),
      mig("00002_fix.sql", "REVOKE ALL ON public.mv_pii FROM authenticated, anon;"),
      mig("00003_mv.sql", MV), // idempotent re-create
    );
    expect(offenses).toHaveLength(0);
  });
});

// ==========================================================================
describe("real repo — analyzeRepo()", () => {
  it("finds exactly the 9 known SECURITY DEFINER functions in ops", () => {
    // 3 original (00026/secdef RPCs) + 4 multi-user-auth broker fns (00049) +
    // 2 instant-revocation helpers (00050: operator_status_self, operator_not_revoked)
    // — all hardened (search_path WITHOUT public, service_role-only EXECUTE). The
    // multi-user-auth INVOKER RPC ops_run_select_rls is SECURITY INVOKER → absent here.
    const { functions } = analyzeRepo();
    const secdef = [...functions.values()].filter((s: any) => s.defined && s.securityDefiner).map((s: any) => s.name).sort();
    expect(secdef).toEqual([
      "get_ops_rls_state",
      "get_ops_tables",
      "operator_invite",
      "operator_not_revoked",
      "operator_redeem",
      "operator_revoke",
      "operator_set_tier",
      "operator_status_self",
      "ops_run_select",
    ]);
  });

  it("reports ZERO offenses now that migration 00047 hardened all three", () => {
    const { offenses } = analyzeRepo();
    expect(offenses).toEqual([]);
  });

  it("tracks public.mv_customer_360 and confirms 00051 REVOKEd authenticated+anon (no PII offense)", () => {
    const { matviews, offenses } = analyzeRepo();
    const mv = matviews.get("mv_customer_360");
    expect(mv).toBeTruthy();
    expect(mv.defined).toBe(true);
    expect(mv.authRead).toBe(false);
    expect(mv.anonRead).toBe(false);
    expect(offenses.find((o: any) => o.name === "mv_customer_360")).toBeUndefined();
  });

  it("WOULD have flagged mv_customer_360 before 00051 (regression: the audit finding)", () => {
    const preFix = listMigrationFiles()
      .filter((f: string) => !f.startsWith("00051"))
      .map((f: string) => ({ file: f, sql: readFileSync(join(MIGRATIONS_DIR, f), "utf8") }));
    const { offenses } = analyzeMigrations(preFix);
    const mv = offenses.find((o: any) => o.name === "mv_customer_360");
    expect(mv).toBeTruthy();
    expect(mv.reason).toBe("public_matview_exposed");
  });

  it("WOULD have flagged all three before 00047 (regression: the original finding)", () => {
    const preFix = listMigrationFiles()
      .filter((f: string) => !f.startsWith("00047"))
      .map((f: string) => ({ file: f, sql: readFileSync(join(MIGRATIONS_DIR, f), "utf8") }));
    const { offenses } = analyzeMigrations(preFix);
    expect(names(offenses)).toEqual(["get_ops_rls_state", "get_ops_tables", "ops_run_select"]);
    const opsRunSelect = offenses.find((o: any) => o.name === "ops_run_select");
    expect(opsRunSelect.reason).toBe("public_in_search_path");
  });

  it("migration 00047 exists and revokes EXECUTE from authenticated on ops_run_select", () => {
    const f = listMigrationFiles().find((x: string) => x.startsWith("00047"));
    expect(f).toBeTruthy();
    const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
    expect(sql).toMatch(/REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+ops\.ops_run_select\([^)]*\)\s+FROM\s+authenticated/i);
    expect(sql).toMatch(/SET\s+search_path\s*=\s*ops,\s*metrics,\s*pg_temp/i);
  });
});

// ==========================================================================
describe("CLI — validator process", () => {
  it("exits 0 against the current repo (post-fix)", () => {
    const r = spawnSync("node", [VALIDATOR_PATH], { cwd: REPO, encoding: "utf-8", timeout: 30000 });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("[OK]");
  });
});
