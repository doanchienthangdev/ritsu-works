/**
 * Tool registry. Maps tool id → handler + JSONSchema input.
 *
 * Tools are added by importing their handler module here. Phase 1 only has
 * `query` (Unit 3) and `insert` (Unit 4). Both stubbed below until those
 * units land.
 */

import type { CallerContext, ToolResult } from "../types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleQuery, queryInputSchema, queryDescription } from "./query.ts";
import { handleInsert, insertInputSchema, insertDescription } from "./insert.ts";
import {
  handleWikiListPages,
  wikiListPagesInputSchema,
  wikiListPagesDescription,
} from "./wiki-list-pages.ts";
import {
  handleWikiGetPage,
  wikiGetPageInputSchema,
  wikiGetPageDescription,
} from "./wiki-get-page.ts";
import {
  handleWikiAsk,
  wikiAskInputSchema,
  wikiAskDescription,
} from "./wiki-ask.ts";
import {
  handleWikiSource,
  wikiSourceInputSchema,
  wikiSourceDescription,
} from "./wiki-source.ts";
import {
  handleResolverFind,
  resolverFindInputSchema,
  resolverFindDescription,
} from "./resolver-find.ts";

export interface ToolDef {
  /** MCP tool name as the client sees it (without the server prefix) */
  name: string;
  /** Description shown to the LLM in ListTools */
  description: string;
  /** JSONSchema for input — MCP SDK validates inputs against this */
  inputSchema: Record<string, unknown>;
  /** Handler — dispatch wraps this with tier check, audit, etc. */
  handler: (
    input: unknown,
    ctx: CallerContext,
    client: SupabaseClient,
  ) => Promise<ToolResult>;
}

export const TOOLS: ToolDef[] = [
  {
    name: "query",
    description: queryDescription,
    inputSchema: queryInputSchema,
    handler: handleQuery,
  },
  {
    name: "insert",
    description: insertDescription,
    inputSchema: insertInputSchema,
    handler: handleInsert,
  },
  // === Wiki tools (Sprint 3 PR5 of wiki-sync-from-refs v2.0.0) ===
  {
    name: "wiki_list_pages",
    description: wikiListPagesDescription,
    inputSchema: wikiListPagesInputSchema,
    handler: handleWikiListPages,
  },
  {
    name: "wiki_get_page",
    description: wikiGetPageDescription,
    inputSchema: wikiGetPageInputSchema,
    handler: handleWikiGetPage,
  },
  {
    name: "wiki_ask",
    description: wikiAskDescription,
    inputSchema: wikiAskInputSchema,
    handler: handleWikiAsk,
  },
  // === v3.0 reverse lookup tool (Sprint 4 of wiki-sync-from-refs v3.0.0) ===
  {
    name: "wiki_source",
    description: wikiSourceDescription,
    inputSchema: wikiSourceInputSchema,
    handler: handleWikiSource,
  },
  // === resolver-v3 JIT MCP tool (Sprint 2 of resolver-v3-jit-loading v3.0.0) ===
  {
    name: "resolver_find",
    description: resolverFindDescription,
    inputSchema: resolverFindInputSchema,
    handler: handleResolverFind,
  },
];

export function findToolDef(name: string): ToolDef | null {
  return TOOLS.find((t) => t.name === name) ?? null;
}
