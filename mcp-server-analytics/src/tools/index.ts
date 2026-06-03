/**
 * Tool registry for supabase-analytics. Maps tool id → handler + JSONSchema.
 *
 * Handlers take an injected AnalyticsQuerier (not a pg Pool) so they unit-test
 * with a fake. Sprint 1 ships two read-only tools: `query` and `list_tables`.
 */

import type { AnalyticsCallerContext, AnalyticsQuerier, ToolResult } from "../types.ts";
import { handleQuery, queryInputSchema, queryDescription } from "./query.ts";
import {
  handleListTables,
  listTablesInputSchema,
  listTablesDescription,
} from "./list-tables.ts";

export interface AnalyticsToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (
    input: unknown,
    ctx: AnalyticsCallerContext,
    querier: AnalyticsQuerier,
  ) => Promise<ToolResult>;
}

export const TOOLS: AnalyticsToolDef[] = [
  {
    name: "query",
    description: queryDescription,
    inputSchema: queryInputSchema,
    handler: handleQuery,
  },
  {
    name: "list_tables",
    description: listTablesDescription,
    inputSchema: listTablesInputSchema,
    handler: handleListTables,
  },
];

export function findToolDef(name: string): AnalyticsToolDef | null {
  return TOOLS.find((t) => t.name === name) ?? null;
}
