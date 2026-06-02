/**
 * `wiki_ask` tool — citation-disciplined RAG over wiki/ + ops.knowledge_embeddings.
 *
 * v0.2 (wiki-sync v3.0.5 patch, 2026-05-18): ENTITY-FIRST retrieval.
 * Prefer derived entity pages (extracted_from_source_id IS NOT NULL) over
 * source RECORD chunks. Citation format per Muse M5: includes original
 * source title + raw_quote + confidence.
 *
 * Architecture decision: this MCP tool RETURNS structured retrieval data
 * + citations; the calling Claude Code session synthesizes the final answer.
 * This avoids a per-call Anthropic synthesis cost in the MCP server and
 * lets the caller use whatever model is best for the context. The SKILL
 * spec at 06-ai-ops/skills/wiki-sync/ask/SKILL.md documents both the
 * retrieval contract (this tool) and the synthesis prompt (caller-side).
 *
 * v0.2 capabilities (gated on OPENAI_API_KEY presence):
 *   - Embed question via OpenAI text-embedding-3-small (1536 dims)
 *   - Entity-first cosine similarity (TypeScript-side) — preferred ranking
 *   - Falls through to source-chunk retrieval if < 3 entity hits with sim > 0.7
 *   - Joins source RECORD metadata for Muse M5 citation format
 *   - Returns {answer:null, reason:'no_coverage'} if no hits;
 *     NEVER hallucinates from training data
 *
 * If OPENAI_API_KEY is absent, falls back to v0.1 stub behavior.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallerContext, ToolResult } from "../types.ts";
import { MCPToolError } from "../types.ts";
import { canReadSchema } from "../governance/role-resolver.ts";

export const wikiAskDescription = `Citation-disciplined RAG retrieval over wiki/ + ops.knowledge_embeddings. \
v3.0 entity-first: prefers derived entity pages (concept/observation/decision/idea where extracted_from_source_id IS NOT NULL) \
over source RECORD chunks. Citation format includes original source title + raw_quote + confidence per Muse M5. \
v4.0 source-grouped layout: filter.source / filter.packages let callers scope retrieval to specific source packages (v4.0 §0 B9). \
Inputs: { question: string (required), k?: 1..20 (default 10), entity_only?: boolean (default false), filter?: { page_type?, source?: string (single source-slug), packages?: string[] (multiple source-slugs) } }. \
Output (v0.2): { answer: null, retrieval_results: [{ page_slug, page_type, page_title, source_slug, source_title, package_slug, similarity, is_derived_entity, chunk_text, citation_format }], reason: 'retrieved'|'no_coverage'|'embedding_search_deferred_v0_2', synthesis_hint: '...' }. \
Caller (Claude Code session) synthesizes final answer per ask/SKILL.md system prompt. NEVER falls back to training data.`;

export const wikiAskInputSchema = {
  type: "object",
  required: ["question"],
  properties: {
    question: {
      type: "string",
      minLength: 3,
      maxLength: 2000,
      description: "Natural language question to retrieve wiki entities for.",
    },
    k: {
      type: "integer",
      minimum: 1,
      maximum: 20,
      default: 10,
      description: "Top-K results to return (per ranking tier).",
    },
    entity_only: {
      type: "boolean",
      default: false,
      description: "If true, only return derived entity pages; never fall through to source chunks.",
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
        source: {
          type: "string",
          description: "v4.0: scope retrieval to a single source package. Value is the source RECORD slug (e.g. 'growth-playbook-fixture'). Filters derived entities by extracted_from_source.slug = this value.",
        },
        packages: {
          type: "array",
          items: { type: "string" },
          description: "v4.0: scope retrieval to a union of source packages. Each entry is a source RECORD slug. If both `source` and `packages` are set, `packages` wins.",
        },
      },
      description: "Optional filter to scope retrieval. page_type for entity-type filter; source / packages (v4.0) for package-scoped retrieval.",
    },
  },
} as const;

interface WikiAskFilter {
  page_type?: string;
  source?: string;
  packages?: string[];
}

interface WikiAskInput {
  question: string;
  k?: number;
  entity_only?: boolean;
  filter?: WikiAskFilter;
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
  const filterRaw = obj.filter as Record<string, unknown> | undefined;
  let filter: WikiAskFilter | undefined;
  if (filterRaw && typeof filterRaw === "object") {
    filter = {};
    if (typeof filterRaw.page_type === "string") filter.page_type = filterRaw.page_type;
    if (typeof filterRaw.source === "string" && filterRaw.source.length > 0) filter.source = filterRaw.source;
    if (Array.isArray(filterRaw.packages)) {
      filter.packages = filterRaw.packages.filter((p): p is string => typeof p === "string" && p.length > 0);
      if (filter.packages.length === 0) delete filter.packages;
    }
  }
  return {
    question: q,
    k: typeof obj.k === "number" ? Math.min(20, Math.max(1, Math.floor(obj.k))) : 10,
    entity_only: Boolean(obj.entity_only),
    filter,
  };
}

// ---------------------------------------------------------------------------
// OpenAI embedding (text-embedding-3-small, 1536 dims)
// ---------------------------------------------------------------------------
// Direct fetch() — no `openai` npm dep needed. ~$0.00002/1K tokens.

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

async function embedQuestion(question: string, apiKey: string): Promise<number[]> {
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: question,
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new MCPToolError(
      "openai_api_error",
      `OpenAI embeddings API ${resp.status}: ${errText.slice(0, 300)}`,
    );
  }
  const json = (await resp.json()) as OpenAIEmbeddingResponse;
  if (!json.data?.[0]?.embedding) {
    throw new MCPToolError("openai_api_error", "OpenAI embeddings: no embedding in response");
  }
  return json.data[0].embedding;
}

// ---------------------------------------------------------------------------
// Cosine similarity (TypeScript — fine for < ~5K embeddings; pgvector RPC if scale)
// ---------------------------------------------------------------------------

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ---------------------------------------------------------------------------
// Retrieval result shape
// ---------------------------------------------------------------------------

interface RetrievalResult {
  page_id: string;
  page_slug: string;
  page_type: string;
  page_title: string;
  is_derived_entity: boolean;
  source_page_id: string | null;
  source_slug: string | null;
  source_title: string | null;
  chunk_index: number | null;
  chunk_text: string;
  similarity: number;
  citation_format: string; // Muse M5 format
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

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

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey || openaiKey.length < 20) {
    // Fall back to v0.1 stub behavior so callers get an explicit signal.
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
        version: "0.2_no_openai_key",
        question_echoed: args.question,
        wiki_state: {
          knowledge_pages_count: pagesCount ?? 0,
          knowledge_embeddings_count: embeddingsCount ?? 0,
        },
        note: "OPENAI_API_KEY not set in env. wiki_ask v0.2 needs OpenAI for question embedding. Set OPENAI_API_KEY then retry. Fallback: use wiki_list_pages + wiki_get_page to browse manually.",
        fallback_tools: ["wiki_list_pages", "wiki_get_page", "wiki_source"],
      },
    };
  }

  const startMs = Date.now();
  let questionEmbedding: number[];
  try {
    questionEmbedding = await embedQuestion(args.question, openaiKey);
  } catch (e) {
    if (e instanceof MCPToolError) throw e;
    throw new MCPToolError("openai_api_error", `Failed to embed question: ${(e as Error).message}`);
  }

  // v4.0: resolve filter.source / filter.packages source-slugs → source-ids
  // BEFORE the entity query so we can filter derived entities by their parent.
  let sourceIdAllowlist: string[] | null = null;
  const sourceSlugs: string[] = [];
  if (args.filter?.packages && args.filter.packages.length > 0) {
    sourceSlugs.push(...args.filter.packages);
  } else if (args.filter?.source) {
    sourceSlugs.push(args.filter.source);
  }
  if (sourceSlugs.length > 0) {
    const { data: sourceRows, error: sourceErr } = await client
      .schema("ops")
      .from("knowledge_pages")
      .select("id, slug")
      .is("extracted_from_source_id", null)
      .in("slug", sourceSlugs);
    if (sourceErr) {
      throw new MCPToolError("sql_execution_error", `source slug resolution: ${sourceErr.message}`);
    }
    sourceIdAllowlist = (sourceRows ?? []).map((r: any) => r.id);
    if (sourceIdAllowlist.length === 0) {
      // No matching packages — return no_coverage immediately.
      return {
        state: "completed",
        output: {
          answer: null,
          reason: "no_coverage",
          version: "0.2",
          question_echoed: args.question,
          retrieval_results: [],
          v4_filter: { source_slugs: sourceSlugs, resolved_ids: 0 },
          note: `No source packages matched slug(s): ${sourceSlugs.join(", ")}. Run wiki_list_pages with page_type filter to see available sources.`,
        },
      };
    }
  }

  // Step 1 — Entity-first query: fetch derived entity pages + their embeddings.
  const entityQuery = client
    .schema("ops")
    .from("knowledge_pages")
    .select("id, slug, page_type, title, file_path, frontmatter, extracted_from_source_id, review_state, deleted_at, legacy_v2_verbatim")
    .not("extracted_from_source_id", "is", null)
    .is("deleted_at", null)
    .eq("legacy_v2_verbatim", false)
    .in("review_state", ["auto_accepted", "founder_approved"]);
  if (args.filter?.page_type) {
    entityQuery.eq("page_type", args.filter.page_type);
  }
  if (sourceIdAllowlist) {
    entityQuery.in("extracted_from_source_id", sourceIdAllowlist);
  }
  const { data: entityPages, error: entityErr } = await entityQuery;
  if (entityErr) {
    throw new MCPToolError("sql_execution_error", `entity query: ${entityErr.message}`);
  }

  const entityResults = await rankByEmbedding(
    client,
    entityPages ?? [],
    questionEmbedding,
    args.k ?? 10,
    /* isDerived */ true,
  );

  // Step 2 — Decide whether to fall through to source chunks
  const STRONG_ENTITY_HIT_COUNT = 3;
  const STRONG_ENTITY_THRESHOLD = 0.7;
  const strongEntityCount = entityResults.filter((r) => r.similarity > STRONG_ENTITY_THRESHOLD).length;

  let sourceResults: RetrievalResult[] = [];
  if (!args.entity_only && strongEntityCount < STRONG_ENTITY_HIT_COUNT) {
    // Source-chunk fallback (v2.0 retrieval mode)
    const sourceQuery = client
      .schema("ops")
      .from("knowledge_pages")
      .select("id, slug, page_type, title, file_path, frontmatter, extracted_from_source_id, deleted_at, legacy_v2_verbatim")
      .is("deleted_at", null);
    if (args.filter?.page_type) {
      sourceQuery.eq("page_type", args.filter.page_type);
    }
    const { data: sourcePages, error: sourceErr } = await sourceQuery;
    if (sourceErr) {
      throw new MCPToolError("sql_execution_error", `source query: ${sourceErr.message}`);
    }
    // Only consider pages that ARE source RECORDS or are legacy_v2_verbatim
    // (not already covered by entity-first pass)
    const filtered = (sourcePages ?? []).filter(
      (p: any) => p.extracted_from_source_id === null,
    );
    sourceResults = await rankByEmbedding(
      client,
      filtered,
      questionEmbedding,
      args.k ?? 10,
      /* isDerived */ false,
    );
  }

  // Combine: entity-first ordering, then source chunks
  const allResults = [...entityResults, ...sourceResults].slice(0, args.k ?? 10);

  if (allResults.length === 0) {
    return {
      state: "completed",
      output: {
        answer: null,
        reason: "no_coverage",
        version: "0.2",
        question_echoed: args.question,
        retrieval_results: [],
        query_ms: Date.now() - startMs,
        note: "No wiki pages matched. Consider /wiki sync to ingest more sources, or use wiki_list_pages to browse.",
      },
    };
  }

  return {
    state: "completed",
    output: {
      answer: null,
      reason: "retrieved",
      version: "0.2",
      question_echoed: args.question,
      retrieval_results: allResults,
      strong_entity_hits: strongEntityCount,
      fell_through_to_source: sourceResults.length > 0,
      query_ms: Date.now() - startMs,
      synthesis_hint: "You (the calling LLM) MUST synthesize the answer using the retrieval_results above. Citation discipline (Muse M5): every claim cites via the citation_format string from each result. NEVER use training data. If no retrieval_result actually answers the question, return { answer: null, reason: 'no_coverage' } in your response. See 06-ai-ops/skills/wiki-sync/ask/SKILL.md Step 5 for the full synthesis prompt.",
    },
  };
}

// ---------------------------------------------------------------------------
// Batched embeddings fetch (PostgREST URL-overflow guard)
// ---------------------------------------------------------------------------
// supabase-js encodes `.in("page_id", ids)` into the PostgREST request URL as
// `?page_id=in.(id1,id2,...)`. A single call with hundreds of uuids overflows
// the Supabase/Kong gateway URI limit (~8-16 KB) and the gateway rejects it with
// HTTP 400 "Bad Request" (observed: 755 entity ids ≈ 28 KB URL → 400). Batching
// keeps each request URL small. Cosine ranking stays TypeScript-side, which is
// the author's stated design envelope ("fine for < ~5K embeddings").

export const EMBEDDINGS_IN_BATCH_SIZE = 100;

interface BatchFetchResult {
  // Row shape: { page_id, chunk_index, chunk_text, embedding }. Typed `any` to
  // mirror the untyped supabase-js client used throughout this file.
  data: any[] | null;
  error: { message: string } | null;
}

/**
 * Fetch knowledge_embeddings rows for `pageIds`, splitting the `.in()` filter
 * into batches of at most `batchSize` so the request URL never overflows the
 * gateway URI limit. Rows are concatenated in batch order. A batch error is
 * surfaced as an MCPToolError preserving the original "embeddings query: ..."
 * message; a null `data` for a batch contributes nothing (no throw).
 */
export async function fetchEmbeddingsBatched(
  pageIds: string[],
  fetchBatch: (ids: string[]) => PromiseLike<BatchFetchResult>,
  batchSize: number = EMBEDDINGS_IN_BATCH_SIZE,
): Promise<any[]> {
  const step = Math.max(1, Math.floor(batchSize)); // guard: never 0/neg → no infinite loop
  const out: any[] = [];
  for (let i = 0; i < pageIds.length; i += step) {
    const slice = pageIds.slice(i, i + step);
    const { data, error } = await fetchBatch(slice);
    if (error) {
      throw new MCPToolError("sql_execution_error", `embeddings query: ${error.message}`);
    }
    if (data) out.push(...data);
  }
  return out;
}

// ---------------------------------------------------------------------------
// rankByEmbedding — fetch embeddings for a set of pages, compute cosine, sort
// ---------------------------------------------------------------------------

async function rankByEmbedding(
  client: SupabaseClient,
  pages: any[],
  questionEmbedding: number[],
  topK: number,
  isDerived: boolean,
): Promise<RetrievalResult[]> {
  if (pages.length === 0) return [];

  const pageIds = pages.map((p) => p.id);
  // Batched fetch — a single `.in()` over hundreds of ids overflows the
  // PostgREST request URL → HTTP 400 "Bad Request". See fetchEmbeddingsBatched.
  const embeddings = await fetchEmbeddingsBatched(pageIds, (ids) =>
    client
      .schema("ops")
      .from("knowledge_embeddings")
      .select("page_id, chunk_index, chunk_text, embedding")
      .in("page_id", ids),
  );

  // Index pages by id for join
  const pageById = new Map<string, any>();
  for (const p of pages) pageById.set(p.id, p);

  // For derived entities, fetch source RECORD metadata for citation
  const sourceMetaById = new Map<string, { slug: string; title: string }>();
  if (isDerived) {
    const sourceIds = Array.from(
      new Set(pages.map((p) => p.extracted_from_source_id).filter(Boolean)),
    );
    if (sourceIds.length > 0) {
      const { data: sources, error: srcErr } = await client
        .schema("ops")
        .from("knowledge_pages")
        .select("id, slug, title")
        .in("id", sourceIds);
      if (srcErr) {
        throw new MCPToolError("sql_execution_error", `source meta query: ${srcErr.message}`);
      }
      for (const s of sources ?? []) {
        sourceMetaById.set(s.id, { slug: s.slug, title: s.title });
      }
    }
  }

  // Compute similarities + build results
  const results: RetrievalResult[] = [];
  for (const emb of embeddings ?? []) {
    const p = pageById.get(emb.page_id);
    if (!p) continue;
    let embVec: number[];
    if (typeof emb.embedding === "string") {
      // pgvector returns embedding as string "[0.1,0.2,...]" via supabase-js
      embVec = parseEmbeddingString(emb.embedding);
    } else if (Array.isArray(emb.embedding)) {
      embVec = emb.embedding as number[];
    } else {
      continue;
    }
    const sim = cosineSimilarity(questionEmbedding, embVec);
    if (sim < 0.5) continue; // weak signal; skip

    const sourceMeta = (isDerived && p.extracted_from_source_id
      ? sourceMetaById.get(p.extracted_from_source_id)
      : null) ?? null;
    const citationFormat = formatCitation({
      page: p,
      chunk_index: emb.chunk_index,
      chunk_text: emb.chunk_text,
      similarity: sim,
      source_meta: sourceMeta,
      is_derived: isDerived,
    });
    results.push({
      page_id: p.id,
      page_slug: p.slug,
      page_type: p.page_type,
      page_title: p.title,
      is_derived_entity: isDerived,
      source_page_id: p.extracted_from_source_id ?? null,
      source_slug: sourceMeta?.slug ?? null,
      source_title: sourceMeta?.title ?? null,
      chunk_index: emb.chunk_index ?? null,
      chunk_text: emb.chunk_text,
      similarity: sim,
      citation_format: citationFormat,
    });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

function parseEmbeddingString(s: string): number[] {
  // pgvector serializes as "[0.1,0.2,0.3]" — strip brackets, split, parse
  const trimmed = s.replace(/^\[|\]$/g, "");
  return trimmed.split(",").map((x) => parseFloat(x));
}

// ---------------------------------------------------------------------------
// Muse M5 citation format
// ---------------------------------------------------------------------------

interface FormatCitationArgs {
  page: any;
  chunk_index: number | null;
  chunk_text: string;
  similarity: number;
  source_meta: { slug: string; title: string } | null;
  is_derived: boolean;
}

function formatCitation(a: FormatCitationArgs): string {
  const simStr = a.similarity.toFixed(2);
  const quote = a.chunk_text.slice(0, 200).replace(/\s+/g, " ").trim();
  if (a.is_derived && a.source_meta) {
    // Entity page citing source: "<quote>" — extracted from [Source Title](wiki/.../source-slug.md#chunk-N), confidence X.XX
    const sourcePath = a.page.file_path
      ? `wiki/${a.page.page_type}/${a.page.slug}.md`
      : `wiki/<unknown>/${a.page.slug}.md`;
    const sourceLink = `wiki/${a.source_meta.slug}.md${a.chunk_index !== null ? `#chunk-${a.chunk_index}` : ""}`;
    return `"${quote}" — extracted from [${a.source_meta.title}](${sourceLink}), similarity ${simStr} (entity: [${a.page.title}](${sourcePath}))`;
  } else {
    // Source-chunk citation (fallback): "<quote>" — from [Page Title](wiki/.../page-slug.md#chunk-N), similarity X.XX
    const path = `wiki/${a.page.page_type}/${a.page.slug}.md${a.chunk_index !== null ? `#chunk-${a.chunk_index}` : ""}`;
    return `"${quote}" — from [${a.page.title}](${path}), similarity ${simStr}`;
  }
}
