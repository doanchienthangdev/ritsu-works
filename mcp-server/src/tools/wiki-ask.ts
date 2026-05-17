/**
 * `wiki_ask` tool — RAG over wiki/ + ops.knowledge_embeddings.
 *
 * Added Sprint 3 / PR5 of wiki-sync-from-refs v2.0.0. v0.1 STUB: returns
 * a clear "embedding-search-deferred-to-v0.2" contract so callers can wire
 * up to this tool now and benefit when v0.2 lands without a contract change.
 *
 * v0.2 will:
 *   - Embed the question via OpenAI text-embedding-3-small
 *   - Vector top-K search against ops.knowledge_embeddings (k=10)
 *   - Optional keyword (BM25) hybrid join
 *   - Synthesize answer with strict citation discipline:
 *     every claim cites [wiki/<type>/<slug>.md#chunk-NN]
 *   - Return {answer:null, reason:'no_coverage'} if no wiki hit;
 *     NEVER falls back to training data
 *
 * v0.1 contract (THIS commit) is contract-complete for callers:
 *   - Same input/output shape as v0.2 will have
 *   - Returns explicit reason='embedding_search_deferred_v0_2'
 *   - Includes pointers to wiki_list_pages + wiki_get_page so the caller
 *     agent can manually browse + cite (the v0 fallback path)
 *
 * Per Tier C ops.decisions[fff2bf7c-…] Hybrid B/A: this tool is wired into
 * mcp-server so agents (@cto, @cpo, @cgo, subagents) have a single API
 * surface, even before the actual embedding integration lands.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallerContext, ToolResult } from "../types.ts";
import { MCPToolError } from "../types.ts";
import { canReadSchema } from "../governance/role-resolver.ts";

export const wikiAskDescription = `Ask a citation-disciplined RAG question over the wiki. \
Inputs: { question: string (required), k?: 1..20 (default 10), rerank?: boolean (default false), filter?: { page_type? } }. \
Output v0.2 (TARGET): { answer: string | null, citations: [{wiki_path, slug, chunk_index, score}], reason: 'answered'|'no_coverage' }. \
Output v0.1 (STUB): { answer: null, reason: 'embedding_search_deferred_v0_2', fallback_tools: ['wiki_list_pages', 'wiki_get_page'], note: '...' }. \
Citation discipline: every claim MUST cite a wiki path; NEVER falls back to training data.`;

export const wikiAskInputSchema = {
  type: "object",
  required: ["question"],
  properties: {
    question: {
      type: "string",
      minLength: 3,
      maxLength: 2000,
      description: "Natural language question to answer from wiki contents.",
    },
    k: {
      type: "integer",
      minimum: 1,
      maximum: 20,
      default: 10,
      description: "Top-K vector neighbors (v0.2). Ignored in v0.1.",
    },
    rerank: {
      type: "boolean",
      default: false,
      description: "If true, apply OpenAI rerank model on top-K (v0.2; adds ~$0.05 to cost). Off by default.",
    },
    filter: {
      type: "object",
      properties: {
        page_type: {
          type: "string",
          enum: [
            "customer", "person", "company", "concept", "decision", "meeting",
            "article", "episode", "book", "repo", "idea", "observation",
            "weekly_review",
          ],
        },
      },
      description: "Optional filter to scope retrieval to one page_type.",
    },
  },
} as const;

interface WikiAskInput {
  question: string;
  k?: number;
  rerank?: boolean;
  filter?: { page_type?: string };
}

function parseInput(raw: unknown): WikiAskInput {
  if (!raw || typeof raw !== "object") {
    throw new MCPToolError("invalid_input", "wiki_ask: input must be an object with `question`");
  }
  const obj = raw as Record<string, unknown>;
  const q = obj.question;
  if (typeof q !== "string" || q.length < 3 || q.length > 2000) {
    throw new MCPToolError("invalid_input", "wiki_ask: `question` (3..2000 chars) is required");
  }
  return {
    question: q,
    k: typeof obj.k === "number" ? obj.k : 10,
    rerank: Boolean(obj.rerank),
    filter: obj.filter as { page_type?: string } | undefined,
  };
}

export async function handleWikiAsk(
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

  // v0.1 STUB: report how many pages + embeddings exist so caller can decide
  // whether to fall through to wiki_list_pages + wiki_get_page.
  const { count: pagesCount } = await client
    .schema("ops")
    .from("knowledge_pages")
    .select("*", { count: "exact", head: true });

  const { count: embeddingsCount } = await client
    .schema("ops")
    .from("knowledge_embeddings")
    .select("*", { count: "exact", head: true });

  return {
    state: "completed",
    output: {
      answer: null,
      reason: "embedding_search_deferred_v0_2",
      version: "0.1",
      citations: [],
      question_echoed: args.question,
      wiki_state: {
        knowledge_pages_count: pagesCount ?? 0,
        knowledge_embeddings_count: embeddingsCount ?? 0,
      },
      v0_2_target: {
        embedding_model: "openai/text-embedding-3-small",
        retrieval: "hybrid (vector top-K=10 + optional BM25; score = vector*0.5 + keyword*0.3 + backlink*0.2)",
        synthesis: "Claude Sonnet/Opus with strict citation contract",
        cost_estimate_usd: 0.02,
        gated_on: "OPENAI_API_KEY + npm dep openai + feature-flag wiki_sync_llm_fallback (currently FALSE per knowledge/feature-flags.yaml)",
      },
      fallback_tools_v0_1: [
        {
          name: "wiki_list_pages",
          purpose: "Browse all pages by page_type to identify candidates",
        },
        {
          name: "wiki_get_page",
          purpose: "Fetch a specific page by slug; read its Markdown body",
        },
      ],
      note: "v0.1 returns a contract-complete stub. Caller agent should use wiki_list_pages + wiki_get_page to browse-and-cite manually. When v0.2 ships (OpenAI integration), this tool's payload shape will change ONLY by adding actual answer + citations; the fallback fields will remain for compatibility.",
    },
  };
}
