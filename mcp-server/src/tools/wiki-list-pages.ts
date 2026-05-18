/**
 * `wiki_list_pages` tool — list wiki pages by page_type.
 *
 * Added Sprint 3 / PR5 of wiki-sync-from-refs v2.0.0. Per Tier C decision
 * ops.decisions[fff2bf7c-…], MCP exposure of read-only wiki tools so any
 * agent (@cto, @cpo, @cgo, subagents) can cite wiki pages in replies.
 *
 * Deterministic DB query — no LLM, no OpenAI. Uses supabase-js .from() syntax.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallerContext, ToolResult } from "../types.ts";
import { MCPToolError } from "../types.ts";
import { canReadSchema } from "../governance/role-resolver.ts";

export const wikiListPagesDescription = `List wiki pages in ops.knowledge_pages, optionally filtered. \
Inputs: { page_type?: 'concept'|'book'|'article'|'episode'|'meeting'|... (else returns all 13 page types), limit?: 1..200 (default 50), entity_only?: boolean (v3.0; if true, only return derived entity pages where extracted_from_source_id IS NOT NULL), include_deleted?: boolean (default false; v3.0 soft-deleted pages excluded by default) }. \
Output: { rows: [{id, slug, page_type, title, file_path, extracted_from_source_id, legacy_v2_verbatim, review_state, deleted_at, created_at}], row_count }. \
Read-only; respects caller's tier2_schemas_read (must include 'ops'). \
Powers /wiki list command + agent-side wiki discovery before /wiki ask.`;

export const wikiListPagesInputSchema = {
  type: "object",
  properties: {
    page_type: {
      type: "string",
      enum: [
        "customer", "person", "company", "concept", "decision", "meeting",
        "article", "episode", "book", "repo", "idea", "observation",
        "weekly_review",
      ],
      description: "Filter by page_type. Omit to list all 13 types.",
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 200,
      default: 50,
      description: "Cap on rows returned. Use small limits for menu-style listings.",
    },
    entity_only: {
      type: "boolean",
      default: false,
      description: "v3.0: if true, only return derived entity pages (extracted_from_source_id IS NOT NULL). Useful for browsing the distilled knowledge graph.",
    },
    include_deleted: {
      type: "boolean",
      default: false,
      description: "v3.0: if true, include soft-deleted pages (deleted_at IS NOT NULL). Default false excludes merged-loser pages from /wiki merge.",
    },
  },
} as const;

interface WikiListPagesInput {
  page_type?: string;
  limit?: number;
  entity_only?: boolean;
  include_deleted?: boolean;
}

function parseInput(raw: unknown): WikiListPagesInput {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const obj = raw as Record<string, unknown>;
  const out: WikiListPagesInput = {};
  if (obj.page_type !== undefined) {
    if (typeof obj.page_type !== "string") {
      throw new MCPToolError("invalid_input", "wiki_list_pages: page_type must be a string");
    }
    out.page_type = obj.page_type;
  }
  if (obj.limit !== undefined) {
    if (typeof obj.limit !== "number" || !Number.isInteger(obj.limit) || obj.limit < 1 || obj.limit > 200) {
      throw new MCPToolError("invalid_input", "wiki_list_pages: limit must be an integer 1..200");
    }
    out.limit = obj.limit;
  }
  out.entity_only = obj.entity_only === undefined ? false : Boolean(obj.entity_only);
  out.include_deleted = obj.include_deleted === undefined ? false : Boolean(obj.include_deleted);
  return out;
}

export async function handleWikiListPages(
  input: unknown,
  ctx: CallerContext,
  client: SupabaseClient,
): Promise<ToolResult> {
  const args = parseInput(input);
  if (!canReadSchema(ctx, "ops")) {
    throw new MCPToolError(
      "permission_denied",
      `role '${ctx.role}' does not have read access to schema 'ops' (required for wiki tables)`,
    );
  }

  const startMs = Date.now();
  let q = client
    .schema("ops")
    .from("knowledge_pages")
    .select("id, slug, page_type, title, file_path, extracted_from_source_id, legacy_v2_verbatim, review_state, deleted_at, created_at")
    .order("created_at", { ascending: false })
    .limit(args.limit ?? 50);

  if (args.page_type) {
    q = q.eq("page_type", args.page_type);
  }
  if (args.entity_only) {
    q = q.not("extracted_from_source_id", "is", null);
  }
  if (!args.include_deleted) {
    q = q.is("deleted_at", null);
  }

  const { data, error } = await q;
  const queryMs = Date.now() - startMs;

  if (error) {
    throw new MCPToolError("sql_execution_error", error.message);
  }

  return {
    state: "completed",
    output: {
      rows: data ?? [],
      row_count: data?.length ?? 0,
      query_ms: queryMs,
    },
  };
}
