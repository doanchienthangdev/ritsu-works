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
describe("real repo — analyzeRepo()", () => {
  it("finds exactly the 3 known SECURITY DEFINER functions in ops", () => {
    const { functions } = analyzeRepo();
    const secdef = [...functions.values()].filter((s: any) => s.defined && s.securityDefiner).map((s: any) => s.name).sort();
    expect(secdef).toEqual(["get_ops_rls_state", "get_ops_tables", "ops_run_select"]);
  });

  it("reports ZERO offenses now that migration 00047 hardened all three", () => {
    const { offenses } = analyzeRepo();
    expect(offenses).toEqual([]);
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
