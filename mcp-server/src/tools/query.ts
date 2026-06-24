/**
 * `query` tool — parameterized read-only SELECT against ritsu-ops.
 *
 * All queries run through the Postgres RPC `ops.ops_run_select` (deployed in
 * migration 00026_mcp_query_rpc.sql). The RPC is the SOLE execution path —
 * there is no supabase-js `.from().select()` fallback. supabase-js doesn't
 * expose raw SQL, and skills need arbitrary SELECT (multi-table joins,
 * aggregations, CTEs), so this RPC is the single entry point.
 *
 * Security model — this tool does NOT rely on RLS:
 *   - `ops_run_select` is SECURITY DEFINER, so it runs as the function owner
 *     (postgres, which has BYPASSRLS).
 *   - The shim connects as `service_role` (see lib/supabase-client.ts +
 *     lib/env.ts; service key is preferred over anon), which ALSO bypasses RLS.
 *   So row-level security policies do NOT constrain what this tool can read.
 *   Reads are constrained instead by, in order:
 *     1. the role-allowlist / `canReadSchema` gate (governance/role-resolver.ts)
 *     2. the sql-guard (lib/sql-guard.ts — SELECT-only, no multi-statement,
 *        no SELECT INTO), which the RPC re-applies inside the DB as
 *        belt-and-suspenders
 *     3. the project-ref allowlist (lib/env.ts — only ritsu-ops, never Product)
 *
 * The `rpc_missing` branch in handleQuery is a defensive guard only: the RPC
 * is deployed, so it should not fire in normal operation; it surfaces a clear
 * error if the function is ever absent (e.g. a fresh DB without 00026).
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
Runs as service_role via the SECURITY DEFINER RPC ops_run_select, so RLS does NOT apply; reads are constrained by the caller role's read-allowlist (canReadSchema) and the SqlGuard, not by RLS.`;

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

  // Execute via the RPC — the sole read path. `ops_run_select` is
  // SECURITY DEFINER and the shim connects as service_role, so the canReadSchema
  // gate + sql-guard above (not RLS) are what constrain this read. The
  // rpc_missing branch below is a defensive guard for a DB without migration
  // 00026; it should not fire in normal operation.
  // Note: `.schema('ops')` is required because supabase-js defaults to looking up
  // RPC functions in the `public` schema; `ops_run_select` lives in `ops`.
  // RPC selection by authority mode (capability multi-user-auth):
  //   service-key → ops_run_select       (SECURITY DEFINER; RLS bypassed; gated
  //                                        by the canReadSchema check above)
  //   per-human   → ops_run_select_rls   (SECURITY INVOKER; runs as the
  //                                        authenticated caller so per-tier RLS
  //                                        on ops.* actually enforces the read)
  const rpcName = ctx.authMode === "per-human" ? "ops_run_select_rls" : "ops_run_select";
  const startedAt = Date.now();
  const { data, error } = await client.schema("ops").rpc(rpcName, {
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
