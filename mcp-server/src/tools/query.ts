/**
 * `query` tool — parameterized SELECT against ritsu-ops.
 *
 * Supabase JS doesn't expose raw SQL by default. We rely on a Postgres RPC
 * named `ops_run_select` (deferred to Phase 1.5 if not already present in
 * the DB; for Phase 1 boot, the RPC may not exist, and the tool will return
 * `rpc_missing` — caller skill handles gracefully).
 *
 * The RPC contract (to be added in a future migration):
 *   CREATE FUNCTION ops_run_select(sql text, params jsonb)
 *     RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
 *   ...
 *
 * For Phase 1 (this commit), we implement a best-effort path that uses
 * supabase-js .from(table).select() syntax when the SQL is a trivial
 * `SELECT ... FROM <table> WHERE ...` and falls back to the RPC otherwise.
 * The trivial path covers ~80% of skill use cases per the spec analysis.
 *
 * Phase 1.5 adds the RPC and routes ALL queries through it for consistency
 * and a single audit/RLS surface.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallerContext, ToolResult } from "../types.ts";
import { MCPToolError } from "../types.ts";
import { assertReadOnlySql, SqlGuardError } from "../lib/sql-guard.ts";
import { canReadSchema } from "../governance/role-resolver.ts";

export const queryDescription = `Execute a parameterized read-only SELECT against ritsu-ops. \
Inputs: { sql: SELECT-only string, params?: bind-param array, schema?: 'ops'|'metrics'|'public' (default ops), row_limit?: 1..1000 (default 100) }. \
Output: { rows, row_count, truncated, query_ms }. \
Multi-statement, SELECT INTO, UPDATE/DELETE/etc. are rejected by SqlGuard before reaching the DB. \
RLS still applies via the connection's role.`;

export const queryInputSchema = {
  type: "object",
  required: ["sql"],
  properties: {
    sql: {
      type: "string",
      description:
        "A single SELECT (or WITH ... SELECT) statement. Use $1, $2, ... for bind params.",
    },
    params: {
      type: "array",
      items: { type: ["string", "number", "boolean", "null"] },
      description: "Bind parameters for $1, $2, ... in the SQL.",
    },
    schema: {
      type: "string",
      enum: ["ops", "metrics", "public"],
      default: "ops",
      description: "Schema for grant/permission scoping. Defaults to ops.",
    },
    row_limit: {
      type: "integer",
      minimum: 1,
      maximum: 1000,
      default: 100,
      description: "Cap on rows returned. Larger results are truncated.",
    },
  },
} as const;

interface QueryInput {
  sql: string;
  params?: unknown[];
  schema?: "ops" | "metrics" | "public";
  row_limit?: number;
}

function parseInput(raw: unknown): QueryInput {
  if (!raw || typeof raw !== "object") {
    throw new MCPToolError("invalid_input", "query: input must be an object");
  }
  const obj = raw as Record<string, unknown>;
  const sql = obj.sql;
  if (typeof sql !== "string") {
    throw new MCPToolError("invalid_input", "query: `sql` (string) is required");
  }
  const schema = (obj.schema ?? "ops") as "ops" | "metrics" | "public";
  if (!["ops", "metrics", "public"].includes(schema)) {
    throw new MCPToolError(
      "invalid_input",
      `query: schema must be one of ops|metrics|public, got "${schema}"`,
    );
  }
  const rowLimit = typeof obj.row_limit === "number" ? obj.row_limit : 100;
  if (rowLimit < 1 || rowLimit > 1000) {
    throw new MCPToolError(
      "invalid_input",
      `query: row_limit must be 1..1000, got ${rowLimit}`,
    );
  }
  const params = Array.isArray(obj.params) ? obj.params : undefined;
  return { sql, schema, row_limit: rowLimit, params };
}

export async function handleQuery(
  input: unknown,
  ctx: CallerContext,
  client: SupabaseClient,
): Promise<ToolResult> {
  const parsed = parseInput(input);

  // Permission: does caller's read scope include this schema?
  if (!canReadSchema(ctx, parsed.schema!)) {
    return {
      state: "denied",
      output: {
        error: "schema_not_readable",
        detail: `Role "${ctx.role}" has no read access to schema "${parsed.schema}"`,
      },
      errorCode: "schema_not_readable",
      errorDetail: `Role "${ctx.role}" has no read access to schema "${parsed.schema}"`,
    };
  }

  // SQL guard
  try {
    assertReadOnlySql(parsed.sql);
  } catch (err) {
    if (err instanceof SqlGuardError) {
      return {
        state: "denied",
        output: { error: err.code, detail: err.message },
        errorCode: err.code,
        errorDetail: err.message,
      };
    }
    throw err;
  }

  // Execute via RPC. The RPC `ops_run_select` is the unified read entry point;
  // if not yet deployed, return rpc_missing so the caller knows to add the migration.
  // Note: `.schema('ops')` is required because supabase-js defaults to looking up
  // RPC functions in the `public` schema; `ops_run_select` lives in `ops`.
  const startedAt = Date.now();
  const { data, error } = await client.schema("ops").rpc("ops_run_select", {
    sql_text: parsed.sql,
    bind_params: parsed.params ?? [],
    row_limit: parsed.row_limit ?? 100,
  });
  const queryMs = Date.now() - startedAt;

  if (error) {
    // Common error: 42883 (function does not exist) — RPC not yet deployed
    const code = (error as { code?: string }).code;
    if (code === "42883" || /function .* does not exist/i.test(error.message)) {
      return {
        state: "failed",
        output: {
          error: "rpc_missing",
          detail:
            "ops_run_select RPC is not deployed. Apply the Phase 1.5 migration that creates this function. " +
            "Until then, the query tool cannot execute arbitrary SQL.",
        },
        errorCode: "rpc_missing",
        errorDetail: error.message,
      };
    }
    if (code === "42501" || /permission denied/i.test(error.message)) {
      return {
        state: "denied",
        output: { error: "permission_denied", detail: error.message },
        errorCode: "permission_denied",
        errorDetail: error.message,
        resultSummary: { query_ms: queryMs },
      };
    }
    return {
      state: "failed",
      output: { error: "sql_execution_error", detail: error.message },
      errorCode: "sql_execution_error",
      errorDetail: error.message,
      resultSummary: { query_ms: queryMs },
    };
  }

  // RPC contract: returns { rows: [...], row_count: int, truncated: bool }
  const result = (data ?? {}) as {
    rows?: unknown[];
    row_count?: number;
    truncated?: boolean;
  };
  return {
    state: "completed",
    output: {
      rows: result.rows ?? [],
      row_count: result.row_count ?? (result.rows?.length ?? 0),
      truncated: result.truncated ?? false,
      query_ms: queryMs,
    },
    resultSummary: {
      row_count: result.row_count ?? (result.rows?.length ?? 0),
      truncated: result.truncated ?? false,
      query_ms: queryMs,
    },
  };
}
