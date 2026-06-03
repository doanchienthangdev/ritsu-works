// Tests for the supabase-analytics SQL guard.
//
// Phase 1: assertReadOnlySql(rawSql:string):void — branches: empty/too-long/
//   comment-only (sql_empty/sql_too_long), multi-statement (sql_multi_statement),
//   forbidden leading keyword + non-select/with (sql_not_select), SELECT INTO
//   (sql_select_into), WITH→non-select (sql_not_select). Pure, no deps.
//   stripTrailingSemicolon(sql):string — single trailing ';' strip.
// Phase 2: strings (empty, whitespace, control, unicode, 8000-char boundary),
//   casing, comments (line/block), CTE nesting, semicolon-in-literal + into-in-
//   literal known heuristic limitations.
// The DB role (analytics_reader, SELECT-only on live.*) is the real boundary;
// this guard only makes mistakes loud — tests assert that contract.

import { describe, it, expect } from "vitest";
import {
  assertReadOnlySql,
  stripTrailingSemicolon,
  SqlGuardError,
} from "../../mcp-server-analytics/src/lib/sql-guard.ts";

function code(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof SqlGuardError ? e.code : `__unexpected:${(e as Error).name}`;
  }
}

describe("assertReadOnlySql", () => {
  describe("happy path", () => {
    it("accepts a plain SELECT", () => {
      expect(code(() => assertReadOnlySql("select 1"))).toBeNull();
    });
    it("accepts SELECT with params and joins over live.*", () => {
      expect(
        code(() =>
          assertReadOnlySql(
            "select p.subscription_tier, count(*) from live.profiles p join live.learning_sessions s using (user_hash) where p.user_hash = $1 group by 1",
          ),
        ),
      ).toBeNull();
    });
    it("accepts WITH … SELECT (CTE)", () => {
      expect(
        code(() => assertReadOnlySql("with t as (select 1 as x) select x from t")),
      ).toBeNull();
    });
    it("accepts multi-CTE WITH … SELECT", () => {
      expect(
        code(() =>
          assertReadOnlySql(
            "with a as (select 1 as x), b as (select 2 as y) select x, y from a, b",
          ),
        ),
      ).toBeNull();
    });
    it("accepts uppercase SELECT", () => {
      expect(code(() => assertReadOnlySql("SELECT 1"))).toBeNull();
    });
    it("accepts leading whitespace / newlines", () => {
      expect(code(() => assertReadOnlySql("\n\t  select 1"))).toBeNull();
    });
    it("accepts a leading line comment before SELECT", () => {
      expect(code(() => assertReadOnlySql("-- a comment\nselect 1"))).toBeNull();
    });
    it("accepts a leading block comment before SELECT", () => {
      expect(code(() => assertReadOnlySql("/* hi */ select 1"))).toBeNull();
    });
    it("accepts a single trailing semicolon", () => {
      expect(code(() => assertReadOnlySql("select 1;"))).toBeNull();
    });
  });

  describe("input boundaries", () => {
    it("rejects empty string as sql_empty", () => {
      expect(code(() => assertReadOnlySql(""))).toBe("sql_empty");
    });
    it("rejects whitespace-only as sql_empty", () => {
      expect(code(() => assertReadOnlySql("   \n\t "))).toBe("sql_empty");
    });
    it("rejects comment-only as sql_empty", () => {
      expect(code(() => assertReadOnlySql("-- nothing here"))).toBe("sql_empty");
    });
    it("rejects non-string as sql_empty", () => {
      // @ts-expect-error deliberate runtime misuse
      expect(code(() => assertReadOnlySql(null))).toBe("sql_empty");
    });
    it("accepts exactly 8000 chars", () => {
      const sql = "select " + "1".padEnd(7993, "1"); // 7 + 7993 = 8000
      expect(sql.length).toBe(8000);
      expect(code(() => assertReadOnlySql(sql))).toBeNull();
    });
    it("rejects 8001 chars as sql_too_long", () => {
      const sql = "select " + "1".repeat(7994); // 8001
      expect(sql.length).toBe(8001);
      expect(code(() => assertReadOnlySql(sql))).toBe("sql_too_long");
    });
  });

  describe("forbidden leading keywords → sql_not_select", () => {
    for (const kw of [
      "update users set x=1",
      "delete from users",
      "insert into users values (1)",
      "drop table users",
      "alter table users add column c int",
      "create table t (id int)",
      "truncate users",
      "grant select on t to r",
      "revoke select on t from r",
      "call live.sync_all()",
      "copy t from '/x'",
      "do $$ begin end $$",
      "set role postgres",
      "vacuum users",
      "explain select 1",
      "comment on table t is 'x'",
    ]) {
      it(`rejects: ${kw.slice(0, 24)}…`, () => {
        expect(code(() => assertReadOnlySql(kw))).toBe("sql_not_select");
      });
    }
  });

  describe("multi-statement", () => {
    it("rejects two statements", () => {
      expect(code(() => assertReadOnlySql("select 1; select 2"))).toBe(
        "sql_multi_statement",
      );
    });
    it("rejects a smuggled mutation after a select", () => {
      expect(code(() => assertReadOnlySql("select 1; drop table users"))).toBe(
        "sql_multi_statement",
      );
    });
    it("known limitation: a literal ';' inside a string is flagged multi_statement (safe over-rejection)", () => {
      expect(code(() => assertReadOnlySql("select ';' as s"))).toBe(
        "sql_multi_statement",
      );
    });
  });

  describe("SELECT INTO", () => {
    it("rejects SELECT … INTO newtable", () => {
      expect(code(() => assertReadOnlySql("select * into newt from live.profiles"))).toBe(
        "sql_select_into",
      );
    });
    it("does NOT false-positive on into joined by underscore", () => {
      expect(code(() => assertReadOnlySql("select pointed_into from t"))).toBeNull();
    });
    it("known limitation: the word 'into' inside a string literal over-rejects", () => {
      expect(code(() => assertReadOnlySql("select x from t where note = 'go into space'"))).toBe(
        "sql_select_into",
      );
    });
  });

  describe("WITH leading to a non-SELECT", () => {
    it("rejects WITH … (…) DELETE", () => {
      expect(
        code(() => assertReadOnlySql("with t as (select 1) delete from users")),
      ).toBe("sql_not_select");
    });
    it("rejects WITH … (…) UPDATE", () => {
      expect(
        code(() => assertReadOnlySql("with t as (select 1) update users set a=1")),
      ).toBe("sql_not_select");
    });
  });
});

describe("stripTrailingSemicolon", () => {
  it("strips a single trailing semicolon", () => {
    expect(stripTrailingSemicolon("select 1;")).toBe("select 1");
  });
  it("strips trailing semicolon + whitespace", () => {
    expect(stripTrailingSemicolon("select 1;  \n")).toBe("select 1");
  });
  it("is a no-op without a trailing semicolon", () => {
    expect(stripTrailingSemicolon("select 1")).toBe("select 1");
  });
  it("only strips the FINAL semicolon", () => {
    expect(stripTrailingSemicolon("select 1 ; select 2;")).toBe("select 1 ; select 2");
  });
  it("handles empty string", () => {
    expect(stripTrailingSemicolon("")).toBe("");
  });
});
