-- ============================================================================
-- Migration 00048: ops.match_wiki_embeddings — server-side cosine for wiki_ask
-- ============================================================================
-- Problem: mcp-server wiki_ask (rankByEmbedding) ranked embeddings CLIENT-side
-- by fetching every candidate page's embedding via a single supabase-js
-- `.in("page_id", pageIds)`. With the full auto-accepted entity set (~755 ids)
-- that serialized into a ~28 KB PostgREST request URL, which the Supabase/Kong
-- gateway rejects with HTTP 400 "Bad Request" (`embeddings query: Bad Request`).
-- PR #210 batched the `.in()` as a band-aid; this RPC is the proper fix.
--
-- This function ranks ops.knowledge_embeddings *within a caller-supplied
-- page-id set* entirely server-side (cosine distance `<=>`, which uses the HNSW
-- idx_embeddings_vector index) and returns ONLY the top-k chunks. The page-id
-- array + the query embedding travel in the RPC POST *body*, so there is no
-- request-URL length limit at any corpus size, and only k rows cross the wire
-- instead of every candidate embedding (~755 x 1536 floats before).
--
-- query_embedding is `text` (a pgvector literal e.g. '[0.1,0.2,...]') cast to
-- vector(1536) in the body. Passing it as text and casting inside sidesteps
-- PostgREST's ambiguous coercion of a JSON array to a `vector` parameter — a
-- JSON string -> text -> ::vector cast is unambiguous and version-stable.
--
-- SECURITY INVOKER (explicit): runs with the CALLER's privileges, so RLS is
-- respected and there is NO RLS-bypass surface (unlike the SECURITY DEFINER
-- RPCs hardened in migration 00047 — this function is invisible to
-- validate-secdef-rpc-exposure for that reason). EXECUTE is still locked to
-- service_role (the only caller is the supabase-ops MCP shim, which connects
-- with the service-role key per 00047), opting out of the `ops` schema's
-- default anon/authenticated EXECUTE grant.
--
-- No pinned search_path: matches the existing working pgvector function
-- ops.hybrid_search_pages (00008) so the `vector` type + `<=>` operator resolve
-- from the caller's default search_path. Safe for a SECURITY INVOKER function
-- (no definer privilege-escalation surface); the table is schema-qualified.
--
-- Reversibility: DROP FUNCTION ops.match_wiki_embeddings(uuid[], text, integer,
-- numeric). Creates no table, touches no data. Idempotent (CREATE OR REPLACE +
-- idempotent REVOKE/GRANT) — safe to re-run.
-- Drift guards: validate-manifest-db (not flagged — creates a function, not a
-- table); validate-secdef-rpc-exposure (not flagged — INVOKER, not DEFINER).
-- HITL: founder-approved to apply to live ritsu-ops (this is the OPS Supabase,
-- not Product). Applied via the Supabase Management API (the established
-- mechanism in this repo; migration tracking is maintained out-of-band).
-- ============================================================================

CREATE OR REPLACE FUNCTION ops.match_wiki_embeddings(
  page_ids uuid[],
  query_embedding text,
  match_limit integer DEFAULT 10,
  min_similarity numeric DEFAULT 0.5
)
RETURNS TABLE (
  page_id uuid,
  chunk_index integer,
  chunk_text text,
  similarity numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    e.page_id,
    e.chunk_index,
    e.chunk_text,
    (1 - (e.embedding <=> query_embedding::public.vector(1536)))::numeric AS similarity
  FROM ops.knowledge_embeddings e
  WHERE e.page_id = ANY(page_ids)
    AND e.embedding IS NOT NULL
    AND (1 - (e.embedding <=> query_embedding::public.vector(1536))) >= min_similarity
  ORDER BY e.embedding <=> query_embedding::public.vector(1536) ASC
  LIMIT GREATEST(COALESCE(match_limit, 10), 0);
$$;

COMMENT ON FUNCTION ops.match_wiki_embeddings(uuid[], text, integer, numeric) IS
  'wiki_ask server-side cosine ranking. Returns top matching ops.knowledge_embeddings chunks within a caller-supplied page-id set, ordered by cosine similarity (HNSW idx_embeddings_vector). page_ids + embedding travel in the RPC body to avoid the PostgREST .in() URL-overflow that 400d wiki_ask (PR #210). SECURITY INVOKER (RLS-respecting); EXECUTE locked to service_role per migration 00047 posture.';

REVOKE EXECUTE ON FUNCTION ops.match_wiki_embeddings(uuid[], text, integer, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION ops.match_wiki_embeddings(uuid[], text, integer, numeric) FROM authenticated;
REVOKE EXECUTE ON FUNCTION ops.match_wiki_embeddings(uuid[], text, integer, numeric) FROM anon;
GRANT  EXECUTE ON FUNCTION ops.match_wiki_embeddings(uuid[], text, integer, numeric) TO service_role;
