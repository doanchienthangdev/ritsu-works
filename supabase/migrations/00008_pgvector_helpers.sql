-- ============================================================================
-- Migration 00008: pgvector helpers + hybrid search
-- ============================================================================
-- Helper functions for hybrid search (keyword + semantic) per Bài #4 + Bài #14.
-- BrainBench: 2.8x P@5 precision improvement.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Hybrid search function: combines keyword (FTS) + semantic (cosine)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ops.hybrid_search_pages(
  query_text text,
  query_embedding vector(1536) DEFAULT NULL,
  page_types text[] DEFAULT NULL,
  limit_count integer DEFAULT 10,
  semantic_weight numeric DEFAULT 0.6
)
RETURNS TABLE (
  page_id uuid,
  page_slug text,
  page_title text,
  page_type text,
  hybrid_score numeric,
  keyword_score numeric,
  semantic_score numeric,
  matching_chunks integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Keyword search (FTS over page metadata + chunks)
  keyword_matches AS (
    SELECT
      p.id AS page_id,
      ts_rank(
        to_tsvector('simple', p.title || ' ' || COALESCE(p.compiled_truth, '')),
        plainto_tsquery('simple', query_text)
      ) AS score
    FROM ops.knowledge_pages p
    WHERE
      to_tsvector('simple', p.title || ' ' || COALESCE(p.compiled_truth, '')) @@ plainto_tsquery('simple', query_text)
      AND (page_types IS NULL OR p.page_type = ANY(page_types))
  ),
  -- Semantic search (cosine similarity over embeddings)
  semantic_matches AS (
    SELECT
      e.page_id,
      MAX(1 - (e.embedding <=> query_embedding)) AS score,
      COUNT(*) AS matching_chunk_count
    FROM ops.knowledge_embeddings e
    JOIN ops.knowledge_pages p ON p.id = e.page_id
    WHERE
      query_embedding IS NOT NULL
      AND (page_types IS NULL OR p.page_type = ANY(page_types))
    GROUP BY e.page_id
  ),
  -- Combine
  combined AS (
    SELECT
      COALESCE(k.page_id, s.page_id) AS page_id,
      COALESCE(k.score, 0) AS keyword_score,
      COALESCE(s.score, 0) AS semantic_score,
      COALESCE(s.matching_chunk_count, 0)::integer AS matching_chunks,
      (
        (1 - semantic_weight) * COALESCE(k.score, 0) +
        semantic_weight * COALESCE(s.score, 0)
      ) AS hybrid_score
    FROM keyword_matches k
    FULL OUTER JOIN semantic_matches s ON k.page_id = s.page_id
  )
  SELECT
    c.page_id,
    p.slug,
    p.title,
    p.page_type,
    c.hybrid_score,
    c.keyword_score,
    c.semantic_score,
    c.matching_chunks
  FROM combined c
  JOIN ops.knowledge_pages p ON p.id = c.page_id
  ORDER BY c.hybrid_score DESC
  LIMIT limit_count;
END;
$$;

COMMENT ON FUNCTION ops.hybrid_search_pages IS
  'Hybrid search: keyword (FTS) + semantic (cosine). Per Bài #4 + Bài #14. semantic_weight 0.0-1.0.';

-- ----------------------------------------------------------------------------
-- Graph traversal function: 2-hop neighbors of a page (Bài #14)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ops.knowledge_graph_neighbors(
  start_page_id uuid,
  max_hops integer DEFAULT 2,
  link_types text[] DEFAULT NULL
)
RETURNS TABLE (
  page_id uuid,
  page_slug text,
  page_title text,
  page_type text,
  hop_distance integer,
  via_link_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE traversal AS (
    -- Start: outbound from source page (1 hop)
    SELECT
      l.target_page_id AS page_id,
      l.link_type AS via_link_type,
      1 AS hop_distance
    FROM ops.knowledge_links l
    WHERE
      l.source_page_id = start_page_id
      AND l.is_active = true
      AND l.target_page_id IS NOT NULL
      AND (link_types IS NULL OR l.link_type = ANY(link_types))
    
    UNION
    
    -- Recurse: outbound from each newly found page
    SELECT
      l.target_page_id,
      l.link_type,
      t.hop_distance + 1
    FROM traversal t
    JOIN ops.knowledge_links l ON l.source_page_id = t.page_id
    WHERE
      l.is_active = true
      AND l.target_page_id IS NOT NULL
      AND t.hop_distance < max_hops
      AND (link_types IS NULL OR l.link_type = ANY(link_types))
  )
  SELECT
    p.id AS page_id,
    p.slug,
    p.title,
    p.page_type,
    t.hop_distance,
    t.via_link_type
  FROM (
    SELECT DISTINCT ON (page_id) page_id, hop_distance, via_link_type
    FROM traversal
    ORDER BY page_id, hop_distance
  ) t
  JOIN ops.knowledge_pages p ON p.id = t.page_id
  ORDER BY t.hop_distance, p.title;
END;
$$;

COMMENT ON FUNCTION ops.knowledge_graph_neighbors IS
  'Graph traversal: find pages within N hops of source. Per Bài #14 BrainBench pattern.';

-- ----------------------------------------------------------------------------
-- Refresh customer_360 materialized view
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ops.refresh_customer_360()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_360;
END;
$$;

COMMENT ON FUNCTION ops.refresh_customer_360 IS
  'Refresh customer_360 materialized view. Call from pg_cron (Bài #8) or trigger after customer mutations.';
