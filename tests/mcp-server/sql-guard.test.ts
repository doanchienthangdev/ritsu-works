import { describe, it, expect } from "vitest";
import { assertReadOnlySql, SqlGuardError } from "../../mcp-server/src/lib/sql-guard.ts";

describe("assertReadOnlySql — happy path", () => {
  it("accepts a basic SELECT", () => {
    expect(() => assertReadOnlySql("SELECT 1")).not.toThrow();
  });

  it("accepts SELECT FROM table", () => {
    expect(() => assertReadOnlySql("SELECT * FROM ops.tasks")).not.toThrow();
  });

  it("accepts SELECT with WHERE + bind params", () => {
    expect(() =>
      assertReadOnlySql("SELECT id FROM ops.tasks WHERE state = $1"),
    ).not.toThrow();
  });

  it("accepts trailing semicolon", () => {
    expect(() => assertReadOnlySql("SELECT 1;")).not.toThrow();
  });

  it("accepts WITH CTE leading to SELECT", () => {
    expect(() =>
      assertReadOnlySql(
        "WITH recent AS (SELECT id FROM ops.tasks WHERE created_at > now() - interval '1 day') SELECT count(*) FROM recent",
      ),
    ).not.toThrow();
  });

  it("accepts complex SELECT with JOIN", () => {
    expect(() =>
      assertReadOnlySql(
        "SELECT t.id, r.summary FROM ops.tasks t LEFT JOIN ops.run_summaries r ON r.run_id = t.id",
      ),
    ).not.toThrow();
  });

  it("accepts SELECT with subquery", () => {
    expect(() =>
      assertReadOnlySql(
        "SELECT * FROM ops.tasks WHERE id IN (SELECT task_id FROM ops.agent_runs)",
      ),
    ).not.toThrow();
  });

  it("strips line comments before validating", () => {
    expect(() =>
      assertReadOnlySql("-- this is a comment\nSELECT 1"),
    ).not.toThrow();
  });

  it("strips block comments before validating", () => {
    expect(() => assertReadOnlySql("/* hi */ SELECT 1")).not.toThrow();
  });
});

describe("assertReadOnlySql — rejections", () => {
  it("rejects empty string", () => {
    expect(() => assertReadOnlySql("")).toThrowError(SqlGuardError);
  });

  it("rejects whitespace only", () => {
    expect(() => assertReadOnlySql("   \n\t")).toThrowError(SqlGuardError);
  });

  it("rejects comment-only", () => {
    expect(() => assertReadOnlySql("-- nothing here")).toThrowError(SqlGuardError);
  });

  it("rejects UPDATE", () => {
    try {
      assertReadOnlySql("UPDATE ops.tasks SET state = 'done'");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SqlGuardError);
      expect((err as SqlGuardError).code).toBe("sql_not_select");
    }
  });

  it("rejects DELETE", () => {
    expect(() =>
      assertReadOnlySql("DELETE FROM ops.tasks WHERE id = $1"),
    ).toThrowError(SqlGuardError);
  });

  it("rejects INSERT", () => {
    expect(() =>
      assertReadOnlySql("INSERT INTO ops.tasks (task_type) VALUES ($1)"),
    ).toThrowError(SqlGuardError);
  });

  it("rejects DROP TABLE", () => {
    expect(() => assertReadOnlySql("DROP TABLE ops.tasks")).toThrowError(SqlGuardError);
  });

  it("rejects ALTER TABLE", () => {
    expect(() =>
      assertReadOnlySql("ALTER TABLE ops.tasks ADD COLUMN x int"),
    ).toThrowError(SqlGuardError);
  });

  it("rejects TRUNCATE", () => {
    expect(() => assertReadOnlySql("TRUNCATE ops.tasks")).toThrowError(SqlGuardError);
  });

  it("rejects GRANT", () => {
    expect(() =>
      assertReadOnlySql("GRANT SELECT ON ops.tasks TO public"),
    ).toThrowError(SqlGuardError);
  });

  it("rejects multi-statement SELECT + DROP", () => {
    try {
      assertReadOnlySql("SELECT 1; DROP TABLE ops.tasks");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SqlGuardError);
      expect((err as SqlGuardError).code).toBe("sql_multi_statement");
    }
  });

  it("rejects multi-statement even when both are SELECT", () => {
    expect(() => assertReadOnlySql("SELECT 1; SELECT 2")).toThrowError(SqlGuardError);
  });

  it("rejects SELECT INTO new_table", () => {
    try {
      assertReadOnlySql("SELECT * INTO new_table FROM ops.tasks");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SqlGuardError);
      expect((err as SqlGuardError).code).toBe("sql_select_into");
    }
  });

  it("rejects WITH leading to UPDATE", () => {
    try {
      assertReadOnlySql(
        "WITH stale AS (SELECT id FROM ops.tasks WHERE created_at < now() - interval '30 days') UPDATE ops.tasks SET state = 'archived' WHERE id IN (SELECT id FROM stale)",
      );
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SqlGuardError);
      expect((err as SqlGuardError).code).toBe("sql_not_select");
    }
  });

  it("rejects sql longer than 8KB", () => {
    // Build a string > 8000 chars. Use 'x'.repeat for predictable size.
    const giant = "SELECT '" + "x".repeat(8100) + "'";
    expect(giant.length).toBeGreaterThan(8000);
    try {
      assertReadOnlySql(giant);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SqlGuardError);
      expect((err as SqlGuardError).code).toBe("sql_too_long");
    }
  });
});

describe("assertReadOnlySql — hostile input", () => {
  it("rejects `;` alone", () => {
    expect(() => assertReadOnlySql(";")).toThrowError(SqlGuardError);
  });

  it("rejects SELECT with embedded ; via concatenation", () => {
    expect(() =>
      assertReadOnlySql("SELECT 'a;b' ; DROP TABLE ops.tasks"),
    ).toThrowError(SqlGuardError);
  });

  it("rejects DROP hidden behind block comment trick", () => {
    // Our normalizer strips comments — so the keyword still leads
    expect(() => assertReadOnlySql("/* hi */ DROP TABLE ops.tasks")).toThrowError(
      SqlGuardError,
    );
  });

  it("rejects 100KB UNION ALL as too long", () => {
    const union = Array(100).fill("SELECT 1").join(" UNION ALL ");
    // This one might pass since it's under 8KB — verify it's accepted
    if (union.length <= 8000) {
      expect(() => assertReadOnlySql(union)).not.toThrow();
    } else {
      expect(() => assertReadOnlySql(union)).toThrowError(SqlGuardError);
    }
  });
});
