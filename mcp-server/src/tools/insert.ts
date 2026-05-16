/**
 * `insert` tool — INSERT rows into a ritsu-ops table the caller's role can write.
 *
 * Uses supabase-js native .from(table).insert(rows) syntax. No raw SQL involved,
 * so no RPC dependency. The table allowlist is enforced from the caller's
 * `tier2SchemasWrite` (role-resolver.ts).
 *
 * Phase 1: on_conflict='error' or 'ignore' only (ignore = ON CONFLICT DO NOTHING
 * via Supabase's `.upsert({}, { ignoreDuplicates: true })` shape, which actually
 * uses insert internally). UPDATE/UPSERT semantics deferred to Phase 1.5.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallerContext, ToolResult } from "../types.ts";
import { MCPToolError } from "../types.ts";
import { canWriteTable } from "../governance/role-resolver.ts";

export const insertDescription = `INSERT rows into a ritsu-ops table the caller's role is permitted to write. \
Inputs: { table: 'schema.table_name', rows: object[] (1..100), on_conflict?: 'error'|'ignore' (default 'error'), returning?: string[] }. \
Output: { inserted_count, returned_rows, query_ms }. \
Table allowlist enforced per governance/ROLES.md tier2_schemas_write.`;

export const insertInputSchema = {
  type: "object",
  required: ["table", "rows"],
  properties: {
    table: {
      type: "string",
      pattern: "^(ops|metrics|public)\\.[a-z_][a-z0-9_]*$",
      description:
        "Fully-qualified table (e.g. 'ops.tasks'). Must be in caller's tier2_schemas_write.",
    },
    rows: {
      type: "array",
      minItems: 1,
      maxItems: 100,
      items: { type: "object" },
      description: "Array of row objects. All rows must share the same keys.",
    },
    on_conflict: {
      type: "string",
      enum: ["error", "ignore"],
      default: "error",
      description: "Phase 1: 'error' (default) or 'ignore' (skip dup rows). No upsert.",
    },
    returning: {
      type: "array",
      items: { type: "string" },
      description: "Columns to return per inserted row. Default: ['id'] if column exists, else [].",
    },
  },
} as const;

interface InsertInput {
  table: string;
  rows: Record<string, unknown>[];
  on_conflict?: "error" | "ignore";
  returning?: string[];
}

const TABLE_PATTERN = /^(ops|metrics|public)\.[a-z_][a-z0-9_]*$/;

function parseInput(raw: unknown): InsertInput {
  if (!raw || typeof raw !== "object") {
    throw new MCPToolError("invalid_input", "insert: input must be an object");
  }
  const obj = raw as Record<string, unknown>;
  const table = obj.table;
  if (typeof table !== "string" || !TABLE_PATTERN.test(table)) {
    throw new MCPToolError(
      "invalid_input",
      `insert: table must match ${TABLE_PATTERN.source}; got "${String(table)}"`,
    );
  }
  const rows = obj.rows;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 100) {
    throw new MCPToolError(
      "invalid_input",
      `insert: rows must be an array of 1..100 objects; got length ${
        Array.isArray(rows) ? rows.length : "n/a"
      }`,
    );
  }
  for (const r of rows) {
    if (!r || typeof r !== "object" || Array.isArray(r)) {
      throw new MCPToolError("invalid_input", "insert: each row must be a non-array object");
    }
  }
  const onConflict = (obj.on_conflict ?? "error") as "error" | "ignore";
  if (!["error", "ignore"].includes(onConflict)) {
    throw new MCPToolError(
      "invalid_input",
      `insert: on_conflict must be 'error' or 'ignore'; got "${onConflict}"`,
    );
  }
  const returning = Array.isArray(obj.returning)
    ? (obj.returning as unknown[]).filter((s): s is string => typeof s === "string")
    : undefined;
  return {
    table,
    rows: rows as Record<string, unknown>[],
    on_conflict: onConflict,
    returning,
  };
}

export async function handleInsert(
  input: unknown,
  ctx: CallerContext,
  client: SupabaseClient,
): Promise<ToolResult> {
  const parsed = parseInput(input);

  // Permission gate
  if (!canWriteTable(ctx, parsed.table)) {
    return {
      state: "denied",
      output: {
        error: "table_not_allowed",
        detail: `Role "${ctx.role}" cannot INSERT into ${parsed.table}. See governance/ROLES.md tier2_schemas_write.`,
      },
      errorCode: "table_not_allowed",
      errorDetail: `Role "${ctx.role}" cannot INSERT into ${parsed.table}`,
    };
  }

  const startedAt = Date.now();

  // Split fully-qualified table into schema + name so supabase-js routes correctly.
  // Pattern validated upstream: ^(ops|metrics|public)\.[a-z_][a-z0-9_]*$.
  const dotIdx = parsed.table.indexOf(".");
  const tableSchema = parsed.table.slice(0, dotIdx);
  const tableName = parsed.table.slice(dotIdx + 1);
  let query = client.schema(tableSchema).from(tableName as never).insert(parsed.rows as never);
  if (parsed.returning && parsed.returning.length > 0) {
    query = (query as unknown as { select(cols: string): typeof query }).select(
      parsed.returning.join(","),
    );
  }
  const { data, error } = await query;
  const queryMs = Date.now() - startedAt;

  if (error) {
    const code = (error as { code?: string }).code;

    // 23505 = unique_violation
    if (code === "23505") {
      if (parsed.on_conflict === "ignore") {
        return {
          state: "completed",
          output: { inserted_count: 0, returned_rows: [], query_ms: queryMs, skipped: parsed.rows.length },
          resultSummary: { inserted_count: 0, skipped: parsed.rows.length, query_ms: queryMs },
        };
      }
      return {
        state: "failed",
        output: { error: "unique_violation", detail: error.message },
        errorCode: "unique_violation",
        errorDetail: error.message,
        resultSummary: { query_ms: queryMs },
      };
    }

    // 23502 = not_null_violation
    if (code === "23502") {
      return {
        state: "failed",
        output: { error: "not_null_violation", detail: error.message },
        errorCode: "not_null_violation",
        errorDetail: error.message,
        resultSummary: { query_ms: queryMs },
      };
    }

    // 42501 = permission_denied (RLS)
    if (code === "42501") {
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
      output: { error: "insert_error", detail: error.message, pg_code: code },
      errorCode: "insert_error",
      errorDetail: error.message,
      resultSummary: { query_ms: queryMs },
    };
  }

  const returned = (data ?? []) as Record<string, unknown>[];
  return {
    state: "completed",
    output: {
      inserted_count: parsed.rows.length,
      returned_rows: returned,
      query_ms: queryMs,
    },
    resultSummary: {
      inserted_count: parsed.rows.length,
      query_ms: queryMs,
      table: parsed.table,
    },
  };
}
