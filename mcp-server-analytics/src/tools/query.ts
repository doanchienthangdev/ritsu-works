/**
 * `query` tool — parameterized read-only SELECT over the pseudonymized
 * `live.*` surface of ritsu-analytics.
 *
 * Security model (NOT RLS):
 *   1. role allowlist — only the analytics consumer roles may call at all
 *      (governance/role-allowlist.ts; default-deny).
 *   2. SQL guard — SELECT/WITH only, single statement, no INTO (lib/sql-guard.ts).
 *   3. the DB role — the connection IS `analytics_reader`: SELECT on `live.*`
 *      only, no writes, no `ext`/`staging`/FDW, no PII. This is the real line;
 *      1+2 just make mistakes loud and early.
 *
 * Row cap: applied in JS (slice to row_limit) rather than by wrapping the SQL in
 * a `SELECT * FROM (<sql>) LIMIT n` subquery — wrapping breaks legitimate join
 * queries whose projections share column names. Runaway queries are instead
 * bounded by the connection's statement_timeout. A server-side hard LIMIT is a
 * Sprint-4 hardening.
 */

import type { AnalyticsCallerContext, AnalyticsQuerier, ToolResult } from "../types.ts";
import { MCPToolError } from "../types.ts";
import { assertReadOnlySql, SqlGuardError } from "../lib/sql-guard.ts";
import { analyticsDenialReason } from "../governance/role-allowlist.ts";

export const queryDescription = `Execute a read-only SELECT over the pseudonymized ritsu-analytics dataset (schema "live"). \
Inputs: { sql: SELECT-only string (use $1,$2,… for params), params?: array, row_limit?: 1..1000 (default 100) }. \
Output: { rows, row_count, truncated, query_ms }. \
Data is PSEUDONYMIZED (user_hash, never email/name) and synced nightly from Product behind a PII-stripping boundary — never raw Product PII. \
Tables live under schema "live" (e.g. live.profiles, live.learning_sessions, live.learning_progress). Join on user_hash. \
UPDATE/INSERT/DELETE/DDL and multi-statement SQL are rejected before reaching the DB; the connection is a SELECT-only role anyway.`;

export const queryInputSchema = {
  type: "object",
  required: ["sql"],
  properties: {
    sql: {
      type: "string",
      description:
        "A single SELECT (or WITH … SELECT) over schema live. Use $1, $2, … for bind params.",
    },
    params: {
      type: "array",
      items: { type: ["string", "number", "boolean", "null"] },
      description: "Bind parameters for $1, $2, … in the SQL.",
    },
    row_limit: {
      type: "integer",
      minimum: 1,
      maximum: 1000,
      default: 100,
      description: "Cap on rows returned. Larger results are truncated (truncated=true).",
    },
  },
} as const;

interface QueryInput {
  sql: string;
  params?: unknown[];
  row_limit: number;
}

function parseInput(raw: unknown): QueryInput {
  if (!raw || typeof raw !== "object") {
    throw new MCPToolError("invalid_input", "query: input must be an object", "denied");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.sql !== "string") {
    throw new MCPToolError("invalid_input", "query: `sql` (string) is required", "denied");
  }
  let rowLimit = typeof obj.row_limit === "number" ? obj.row_limit : 100;
  if (!Number.isInteger(rowLimit) || rowLimit < 1 || rowLimit > 1000) {
    throw new MCPToolError(
      "invalid_input",
      `query: row_limit must be an integer 1..1000, got ${String(obj.row_limit)}`,
      "denied",
    );
  }
  const params = Array.isArray(obj.params) ? obj.params : undefined;
  return { sql: obj.sql, params, row_limit: rowLimit };
}

export async function handleQuery(
  input: unknown,
  ctx: AnalyticsCallerContext,
  querier: AnalyticsQuerier,
): Promise<ToolResult> {
  // Gate 1 — caller allowed? service-key: role allowlist; per-human: verified tier.
  if (!ctx.allowedAnalytics) {
    const r = analyticsDenialReason(ctx);
    return denied(r.code, r.detail);
  }

  let parsed: QueryInput;
  try {
    parsed = parseInput(input);
  } catch (err) {
    if (err instanceof MCPToolError) return denied(err.code, err.message);
    throw err;
  }

  // Gate 2 — SQL guard.
  try {
    assertReadOnlySql(parsed.sql);
  } catch (err) {
    if (err instanceof SqlGuardError) return denied(err.code, err.message);
    throw err;
  }

  // Gate 3 — execute as analytics_reader (SELECT-only role).
  const startedAt = Date.now();
  let rows: unknown[];
  let serverRowCount: number;
  try {
    const res = await querier.query(parsed.sql, parsed.params ?? []);
    rows = res.rows;
    serverRowCount = res.rowCount;
  } catch (err) {
    const e = err as { code?: string; message?: string };
    const msg = e.message ?? String(err);
    const queryMs = Date.now() - startedAt;
    // 42501 permission_denied: caller tried to reach outside live.* — the role wall held.
    if (e.code === "42501" || /permission denied/i.test(msg)) {
      return {
        state: "denied",
        output: {
          error: "permission_denied",
          detail:
            "analytics_reader may only SELECT from schema live. " +
            "ext/staging/the FDW are out of bounds by design. " + msg,
        },
        errorCode: "permission_denied",
        errorDetail: msg,
        resultSummary: { query_ms: queryMs },
      };
    }
    return {
      state: "failed",
      output: { error: "sql_execution_error", detail: msg },
      errorCode: "sql_execution_error",
      errorDetail: msg,
      resultSummary: { query_ms: queryMs },
    };
  }
  const queryMs = Date.now() - startedAt;

  const truncated = rows.length > parsed.row_limit;
  const capped = truncated ? rows.slice(0, parsed.row_limit) : rows;

  return {
    state: "completed",
    output: {
      rows: capped,
      row_count: capped.length,
      truncated,
      query_ms: queryMs,
    },
    resultSummary: {
      row_count: capped.length,
      server_row_count: serverRowCount,
      truncated,
      query_ms: queryMs,
    },
  };
}

function denied(code: string, detail: string): ToolResult {
  return {
    state: "denied",
    output: { error: code, detail },
    errorCode: code,
    errorDetail: detail,
  };
}
