/**
 * `list_tables` tool — enumerate the queryable tables in schema `live`.
 *
 * Pure discovery helper so a caller can learn the surface before writing a
 * SELECT. Reads `information_schema.tables` (which only ever exposes objects the
 * connecting role has a privilege on), so it can never reveal `ext`/`staging`.
 * Role-gated identically to `query`.
 */

import type { AnalyticsCallerContext, AnalyticsQuerier, ToolResult } from "../types.ts";

export const listTablesDescription = `List the tables available in the pseudonymized ritsu-analytics dataset (schema "live"). \
No input. Output: { tables: [{ table_name, table_type }], count }. \
Use this to discover what you can SELECT, then call "query". Freshness per table is in live._sync_runs.`;

export const listTablesInputSchema = {
  type: "object",
  properties: {},
} as const;

export async function handleListTables(
  _input: unknown,
  ctx: AnalyticsCallerContext,
  querier: AnalyticsQuerier,
): Promise<ToolResult> {
  if (!ctx.allowedAnalytics) {
    return {
      state: "denied",
      output: {
        error: "role_not_allowed",
        detail: `Role "${ctx.role}" is not on the analytics consumer allowlist. See governance/ROLES.md.`,
      },
      errorCode: "role_not_allowed",
      errorDetail: `Role "${ctx.role}" not allowed`,
    };
  }

  const startedAt = Date.now();
  try {
    const res = await querier.query(
      `select table_name, table_type
         from information_schema.tables
        where table_schema = 'live'
        order by table_name`,
      [],
    );
    return {
      state: "completed",
      output: {
        tables: res.rows,
        count: res.rows.length,
        query_ms: Date.now() - startedAt,
      },
      resultSummary: { count: res.rows.length, query_ms: Date.now() - startedAt },
    };
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    return {
      state: "failed",
      output: { error: "sql_execution_error", detail: msg },
      errorCode: "sql_execution_error",
      errorDetail: msg,
    };
  }
}
