/**
 * `wiki_source` tool — reverse lookup: given a source RECORD page slug,
 * list all derived entities extracted from it, with their knowledge_extractions
 * confidence + raw_quote.
 *
 * Added Sprint 4 of wiki-sync-from-refs v3.0.0 (per spec §3.6 + founder brief
 * Part 5 + Muse M2 attribution discipline).
 *
 * Use case: founder writes content; runs /wiki ask; sees a citation to an
 * entity page; wants to understand "where else does this entity appear in
 * sources?" — this tool surfaces the full provenance trail.
 *
 * Read-only; deterministic; no LLM dependency.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallerContext, ToolResult } from "../types.ts";
import { MCPToolError } from "../types.ts";
import { canReadSchema } from "../governance/role-resolver.ts";

export const wikiSourceDescription = `Reverse lookup: list all derived entities extracted from a source RECORD page. \
Inputs: { source_slug: string (required; the source page's slug), include_raw_quotes?: boolean (default true) }. \
Output: { source_row: { id, slug, title, source_kind, license_status }, derived_entities: [{ derived_slug, derived_title, page_type, link_type, confidence, llm_model, raw_quote?, source_chunk_index, founder_decision, founder_reviewed }], row_count }. \
Returns 'not_found' if source slug doesn't exist OR has no derived entities (v3.0 distill output). Read-only; tier A.`;

export const wikiSourceInputSchema = {
  type: "object",
  required: ["source_slug"],
  properties: {
    source_slug: {
      type: "string",
      minLength: 1,
      maxLength: 200,
      description:
        "Slug of the source RECORD page (a page where extracted_from_source_id IS NULL and source_kind IS NOT NULL).",
    },
    include_raw_quotes: {
      type: "boolean",
      default: true,
      description:
        "If true, return raw_quote field for each extraction (sensitive: may contain copyrighted excerpts; restricted to authenticated role per RLS).",
    },
  },
} as const;

interface WikiSourceInput {
  source_slug: string;
  include_raw_quotes?: boolean;
}

function parseInput(raw: unknown): WikiSourceInput {
  if (!raw || typeof raw !== "object") {
    throw new MCPToolError(
      "invalid_input",
      "wiki_source: input must be an object with `source_slug`",
    );
  }
  const obj = raw as Record<string, unknown>;
  const slug = obj.source_slug;
  if (typeof slug !== "string" || slug.length === 0 || slug.length > 200) {
    throw new MCPToolError(
      "invalid_input",
      "wiki_source: `source_slug` (1..200 chars) is required",
    );
  }
  const includeQuotes =
    obj.include_raw_quotes === undefined ? true : Boolean(obj.include_raw_quotes);
  return { source_slug: slug, include_raw_quotes: includeQuotes };
}

export async function handleWikiSource(
  input: unknown,
  ctx: CallerContext,
  client: SupabaseClient,
): Promise<ToolResult> {
  const args = parseInput(input);
  if (!canReadSchema(ctx, "ops")) {
    throw new MCPToolError(
      "permission_denied",
      `role '${ctx.role}' does not have read access to schema 'ops'`,
    );
  }

  const startMs = Date.now();

  // Step 1 — Fetch source RECORD page
  const { data: sourceRow, error: sourceErr } = await client
    .schema("ops")
    .from("knowledge_pages")
    .select("id, slug, page_type, title, source_kind, source_ref, frontmatter, deleted_at")
    .eq("slug", args.source_slug)
    .maybeSingle();

  if (sourceErr) {
    throw new MCPToolError("sql_execution_error", sourceErr.message);
  }

  if (!sourceRow) {
    return {
      state: "completed",
      output: {
        not_found: true,
        source_slug: args.source_slug,
        reason: "source_slug_not_in_knowledge_pages",
        query_ms: Date.now() - startMs,
      },
    };
  }

  if (sourceRow.deleted_at) {
    return {
      state: "completed",
      output: {
        not_found: true,
        source_slug: args.source_slug,
        reason: "source_soft_deleted",
        deleted_at: sourceRow.deleted_at,
        query_ms: Date.now() - startMs,
      },
    };
  }

  // Step 2 — Join knowledge_extractions + derived knowledge_pages
  // Select columns conditional on include_raw_quotes
  const extractionCols = args.include_raw_quotes
    ? "id, source_chunk_index, derived_page_id, link_type, confidence, llm_model, extraction_cost_usd, raw_quote, founder_reviewed, founder_decision, founder_reviewed_at"
    : "id, source_chunk_index, derived_page_id, link_type, confidence, llm_model, extraction_cost_usd, founder_reviewed, founder_decision, founder_reviewed_at";

  const { data: extractions, error: extErr } = await client
    .schema("ops")
    .from("knowledge_extractions")
    .select(extractionCols)
    .eq("source_page_id", sourceRow.id)
    .order("source_chunk_index", { ascending: true, nullsFirst: false });

  if (extErr) {
    throw new MCPToolError("sql_execution_error", extErr.message);
  }

  if (!extractions || extractions.length === 0) {
    return {
      state: "completed",
      output: {
        source_row: {
          id: sourceRow.id,
          slug: sourceRow.slug,
          title: sourceRow.title,
          source_kind: sourceRow.source_kind,
          license_status: sourceRow.frontmatter?.license_status ?? null,
        },
        derived_entities: [],
        row_count: 0,
        note: "source has no derived entities (possibly --verbatim mode OR distill produced 0 above threshold)",
        query_ms: Date.now() - startMs,
      },
    };
  }

  // Step 3 — Fetch derived page metadata (one query for all derived_page_ids)
  const derivedIds = Array.from(new Set(extractions.map((e: any) => e.derived_page_id)));
  const { data: derivedPages, error: dpErr } = await client
    .schema("ops")
    .from("knowledge_pages")
    .select("id, slug, page_type, title, review_state, deleted_at")
    .in("id", derivedIds);

  if (dpErr) {
    throw new MCPToolError("sql_execution_error", dpErr.message);
  }

  // Index derived pages by id for join
  const derivedById = new Map<string, any>();
  for (const p of derivedPages ?? []) {
    derivedById.set(p.id, p);
  }

  // Step 4 — Compose response
  const enriched = extractions.map((e: any) => {
    const dp = derivedById.get(e.derived_page_id);
    return {
      extraction_id: e.id,
      source_chunk_index: e.source_chunk_index,
      derived_page_id: e.derived_page_id,
      derived_slug: dp?.slug ?? null,
      derived_title: dp?.title ?? null,
      page_type: dp?.page_type ?? null,
      review_state: dp?.review_state ?? null,
      deleted_at: dp?.deleted_at ?? null,
      link_type: e.link_type,
      confidence: e.confidence,
      llm_model: e.llm_model,
      extraction_cost_usd: e.extraction_cost_usd,
      raw_quote: args.include_raw_quotes ? e.raw_quote : undefined,
      founder_reviewed: e.founder_reviewed,
      founder_decision: e.founder_decision,
      founder_reviewed_at: e.founder_reviewed_at,
    };
  });

  return {
    state: "completed",
    output: {
      source_row: {
        id: sourceRow.id,
        slug: sourceRow.slug,
        title: sourceRow.title,
        source_kind: sourceRow.source_kind,
        license_status: sourceRow.frontmatter?.license_status ?? null,
      },
      derived_entities: enriched,
      row_count: enriched.length,
      query_ms: Date.now() - startMs,
    },
  };
}
