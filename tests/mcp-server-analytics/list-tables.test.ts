// Tests for handleListTables (the supabase-analytics `list_tables` tool).
//
// Phase 1: handleListTables(input, ctx, querier) — gate: role allowlist; then a
//   fixed information_schema query → {tables, count}; error → failed.
// Phase 2: denied role (no DB hit); input ignored; empty schema; querier error.

import { describe, it, expect } from "vitest";
import { handleListTables } from "../../mcp-server-analytics/src/tools/list-tables.ts";
import type {
  AnalyticsCallerContext,
  AnalyticsQuerier,
} from "../../mcp-server-analytics/src/types.ts";

function mockQuerier(opts: { rows?: unknown[]; error?: Error } = {}) {
  const calls: { sql: string }[] = [];
  const q: AnalyticsQuerier & { calls: typeof calls } = {
    calls,
    query(sql: string) {
      calls.push({ sql });
      if (opts.error) return Promise.reject(opts.error);
      const rows = opts.rows ?? [];
      return Promise.resolve({ rows, rowCount: rows.length });
    },
  };
  return q;
}

const allowed: AnalyticsCallerContext = { role: "customer-lead", sessionId: "s1", allowedAnalytics: true };
const denied: AnalyticsCallerContext = { role: "etl-runner", sessionId: "s2", allowedAnalytics: false };

describe("handleListTables", () => {
  it("denies a non-allowed role and never touches the DB", async () => {
    const q = mockQuerier({ rows: [{ table_name: "profiles" }] });
    const r = await handleListTables({}, denied, q);
    expect(r.state).toBe("denied");
    expect(r.errorCode).toBe("role_not_allowed");
    expect(q.calls).toHaveLength(0);
  });

  it("lists live tables for an allowed role", async () => {
    const q = mockQuerier({
      rows: [
        { table_name: "learning_progress", table_type: "BASE TABLE" },
        { table_name: "learning_sessions", table_type: "BASE TABLE" },
        { table_name: "profiles", table_type: "BASE TABLE" },
      ],
    });
    const r = await handleListTables({}, allowed, q);
    expect(r.state).toBe("completed");
    expect((r.output as { count: number }).count).toBe(3);
    expect((r.output as { tables: unknown[] }).tables).toHaveLength(3);
    expect(q.calls[0]!.sql).toContain("information_schema.tables");
    expect(q.calls[0]!.sql).toContain("'live'");
  });

  it("ignores the input argument", async () => {
    const q = mockQuerier({ rows: [] });
    const r = await handleListTables({ anything: "ignored" }, allowed, q);
    expect(r.state).toBe("completed");
    expect((r.output as { count: number }).count).toBe(0);
  });

  it("returns failed on a DB error", async () => {
    const r = await handleListTables({}, allowed, mockQuerier({ error: new Error("boom") }));
    expect(r.state).toBe("failed");
    expect(r.errorCode).toBe("sql_execution_error");
  });
});
