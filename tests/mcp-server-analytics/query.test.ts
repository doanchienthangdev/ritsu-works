// Tests for handleQuery (the supabase-analytics `query` tool).
//
// Phase 1: handleQuery(input, ctx, querier) — gates in order: (1) role allowlist
//   ctx.allowedAnalytics; (2) parseInput (object, sql:string, row_limit 1..1000);
//   (3) assertReadOnlySql; (4) querier.query → rows/error mapping (42501→denied
//   permission_denied; other→failed sql_execution_error) + JS row cap (truncated).
//   Deps: injected AnalyticsQuerier (mocked — no pg).
// Phase 2: denied-before-querier (no DB hit on bad role/guard); row_limit
//   boundaries; truncation at limit / limit+1; params passthrough (incl. SQL-in-
//   param stays a param, not concatenated); empty result; rowCount vs rows.length.
// Contract (2N): consumes {rows, rowCount} from the querier; server_row_count
//   reflects rowCount even when it differs from rows.length.

import { describe, it, expect, beforeEach } from "vitest";
import { handleQuery } from "../../mcp-server-analytics/src/tools/query.ts";
import type {
  AnalyticsCallerContext,
  AnalyticsQuerier,
} from "../../mcp-server-analytics/src/types.ts";

interface MockOpts {
  rows?: unknown[];
  rowCount?: number;
  error?: Error;
}
function mockQuerier(opts: MockOpts = {}) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const q: AnalyticsQuerier & { calls: typeof calls } = {
    calls,
    query(sql: string, params: unknown[]) {
      calls.push({ sql, params });
      if (opts.error) return Promise.reject(opts.error);
      const rows = opts.rows ?? [];
      return Promise.resolve({ rows, rowCount: opts.rowCount ?? rows.length });
    },
  };
  return q;
}

const allowed: AnalyticsCallerContext = {
  role: "product-orchestrator",
  sessionId: "s1",
  allowedAnalytics: true,
};
const denied: AnalyticsCallerContext = { role: "gps", sessionId: "s2", allowedAnalytics: false };

describe("handleQuery", () => {
  describe("role allowlist gate", () => {
    it("denies a non-allowed role and never touches the DB", async () => {
      const q = mockQuerier({ rows: [{ x: 1 }] });
      const r = await handleQuery({ sql: "select 1" }, denied, q);
      expect(r.state).toBe("denied");
      expect(r.errorCode).toBe("role_not_allowed");
      expect(q.calls).toHaveLength(0);
    });
  });

  describe("input validation", () => {
    let q: ReturnType<typeof mockQuerier>;
    beforeEach(() => (q = mockQuerier()));

    it("denies non-object input", async () => {
      const r = await handleQuery("nope", allowed, q);
      expect(r.state).toBe("denied");
      expect(r.errorCode).toBe("invalid_input");
      expect(q.calls).toHaveLength(0);
    });
    it("denies missing sql", async () => {
      const r = await handleQuery({ row_limit: 10 }, allowed, q);
      expect(r.errorCode).toBe("invalid_input");
    });
    it("denies non-string sql", async () => {
      const r = await handleQuery({ sql: 123 }, allowed, q);
      expect(r.errorCode).toBe("invalid_input");
    });
    it("denies null input", async () => {
      const r = await handleQuery(null, allowed, q);
      expect(r.errorCode).toBe("invalid_input");
    });

    describe("row_limit boundaries", () => {
      for (const bad of [0, -1, 1001, 1.5, NaN]) {
        it(`denies row_limit=${bad}`, async () => {
          const r = await handleQuery({ sql: "select 1", row_limit: bad }, allowed, q);
          expect(r.errorCode).toBe("invalid_input");
        });
      }
      it("accepts row_limit=1 (min)", async () => {
        const r = await handleQuery({ sql: "select 1", row_limit: 1 }, allowed, mockQuerier({ rows: [{ a: 1 }] }));
        expect(r.state).toBe("completed");
      });
      it("accepts row_limit=1000 (max)", async () => {
        const r = await handleQuery({ sql: "select 1", row_limit: 1000 }, allowed, mockQuerier({ rows: [] }));
        expect(r.state).toBe("completed");
      });
      it("defaults row_limit to 100 when omitted", async () => {
        const rows = Array.from({ length: 150 }, (_, i) => ({ i }));
        const r = await handleQuery({ sql: "select 1" }, allowed, mockQuerier({ rows }));
        expect((r.output as { row_count: number }).row_count).toBe(100);
        expect((r.output as { truncated: boolean }).truncated).toBe(true);
      });
    });
  });

  describe("SQL guard gate", () => {
    it("denies a mutation and never touches the DB", async () => {
      const q = mockQuerier();
      const r = await handleQuery({ sql: "update live.profiles set x=1" }, allowed, q);
      expect(r.state).toBe("denied");
      expect(r.errorCode).toBe("sql_not_select");
      expect(q.calls).toHaveLength(0);
    });
    it("denies multi-statement", async () => {
      const r = await handleQuery({ sql: "select 1; drop table x" }, allowed, mockQuerier());
      expect(r.errorCode).toBe("sql_multi_statement");
    });
    it("denies empty sql via the guard", async () => {
      const r = await handleQuery({ sql: "   " }, allowed, mockQuerier());
      expect(r.errorCode).toBe("sql_empty");
    });
  });

  describe("happy path", () => {
    it("returns rows for a valid SELECT and passes sql+params to the querier", async () => {
      const q = mockQuerier({ rows: [{ tier: "free", n: 13 }] });
      const r = await handleQuery(
        { sql: "select subscription_tier as tier, count(*) n from live.profiles where user_hash=$1 group by 1", params: ["abc"] },
        allowed,
        q,
      );
      expect(r.state).toBe("completed");
      expect((r.output as { rows: unknown[] }).rows).toEqual([{ tier: "free", n: 13 }]);
      expect((r.output as { row_count: number }).row_count).toBe(1);
      expect((r.output as { truncated: boolean }).truncated).toBe(false);
      expect(typeof (r.output as { query_ms: number }).query_ms).toBe("number");
      expect(q.calls[0]!.params).toEqual(["abc"]);
      expect(q.calls[0]!.sql).toContain("live.profiles");
    });
    it("defaults params to [] when omitted", async () => {
      const q = mockQuerier({ rows: [] });
      await handleQuery({ sql: "select 1" }, allowed, q);
      expect(q.calls[0]!.params).toEqual([]);
    });
    it("returns an empty result set cleanly", async () => {
      const r = await handleQuery({ sql: "select 1 where false" }, allowed, mockQuerier({ rows: [] }));
      expect(r.state).toBe("completed");
      expect((r.output as { row_count: number }).row_count).toBe(0);
      expect((r.output as { truncated: boolean }).truncated).toBe(false);
    });
  });

  describe("truncation (JS row cap)", () => {
    it("does not truncate when rows == row_limit", async () => {
      const rows = Array.from({ length: 5 }, (_, i) => ({ i }));
      const r = await handleQuery({ sql: "select 1", row_limit: 5 }, allowed, mockQuerier({ rows }));
      expect((r.output as { truncated: boolean }).truncated).toBe(false);
      expect((r.output as { row_count: number }).row_count).toBe(5);
    });
    it("truncates when rows == row_limit + 1", async () => {
      const rows = Array.from({ length: 6 }, (_, i) => ({ i }));
      const r = await handleQuery({ sql: "select 1", row_limit: 5 }, allowed, mockQuerier({ rows }));
      expect((r.output as { truncated: boolean }).truncated).toBe(true);
      expect((r.output as { rows: unknown[] }).rows).toHaveLength(5);
    });
  });

  describe("error mapping", () => {
    it("maps pg 42501 to denied/permission_denied (the role wall held)", async () => {
      const err = Object.assign(new Error("permission denied for schema ext"), { code: "42501" });
      const r = await handleQuery({ sql: "select 1 from ext.profiles" }, allowed, mockQuerier({ error: err }));
      expect(r.state).toBe("denied");
      expect(r.errorCode).toBe("permission_denied");
    });
    it("maps a permission-denied message (no code) to denied/permission_denied", async () => {
      const r = await handleQuery({ sql: "select 1" }, allowed, mockQuerier({ error: new Error("permission denied for table x") }));
      expect(r.errorCode).toBe("permission_denied");
    });
    it("maps other DB errors to failed/sql_execution_error", async () => {
      const err = Object.assign(new Error('relation "live.nope" does not exist'), { code: "42P01" });
      const r = await handleQuery({ sql: "select 1 from live.nope" }, allowed, mockQuerier({ error: err }));
      expect(r.state).toBe("failed");
      expect(r.errorCode).toBe("sql_execution_error");
    });
  });

  describe("contract: querier {rows, rowCount}", () => {
    it("surfaces server_row_count from rowCount even if it differs from rows.length", async () => {
      const r = await handleQuery({ sql: "select 1" }, allowed, mockQuerier({ rows: [{ a: 1 }], rowCount: 999 }));
      expect((r.resultSummary as { server_row_count: number }).server_row_count).toBe(999);
      expect((r.output as { row_count: number }).row_count).toBe(1);
    });
  });

  describe("security: SQL in params stays a bind param", () => {
    it("passes an injection-y param value straight through (not concatenated into sql)", async () => {
      const q = mockQuerier({ rows: [] });
      await handleQuery({ sql: "select * from live.profiles where user_hash = $1", params: ["'; drop table x; --"] }, allowed, q);
      expect(q.calls[0]!.params).toEqual(["'; drop table x; --"]);
      expect(q.calls[0]!.sql).not.toContain("drop table");
    });
  });
});
