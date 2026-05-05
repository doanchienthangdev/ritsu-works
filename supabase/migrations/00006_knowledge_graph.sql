-- ============================================================================
-- Migration 00006: Knowledge Graph (Bài #14)
-- ============================================================================
-- Auto-link extraction (zero-LLM regex), graph traversal, embeddings.
-- BrainBench: 2.8x P@5 precision improvement.
--
-- Tables:
-- - ops.knowledge_links: graph edges (auto-extracted)
-- - ops.knowledge_pages: page metadata (compiled-truth + timeline)
-- - ops.knowledge_embeddings: vector index
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ops.knowledge_pages — page metadata (Bài #14)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.knowledge_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Page identification (matches wiki/<type>/<slug>.md)
  slug            text UNIQUE NOT NULL,            -- 'customers/acme-corp'
  page_type       text NOT NULL,                   -- 'customer' | 'person' | 'company' | 'concept' | 'decision' | etc.
  title           text NOT NULL,
  
  -- Content
  compiled_truth  text,                            -- mutable section
  timeline_count  integer NOT NULL DEFAULT 0,
  
  -- File system reference
  file_path       text NOT NULL,                   -- 'wiki/customers/acme-corp.md'
  file_hash       text,                            -- detect external edits
  
  -- Frontmatter
  frontmatter     jsonb,                           -- type, slug, dates, custom fields
  
  -- Lifecycle
  last_edited_by  text,
  last_extracted_at timestamptz,                   -- when auto-link extraction last ran
  
  CONSTRAINT page_type_valid CHECK (page_type IN (
    'customer', 'person', 'company', 'concept', 'decision', 'meeting',
    'article', 'episode', 'book', 'repo', 'idea', 'observation', 'weekly_review'
  ))
);

CREATE INDEX idx_pages_type ON ops.knowledge_pages (page_type);
CREATE INDEX idx_pages_updated ON ops.knowledge_pages (updated_at DESC);
CREATE INDEX idx_pages_extraction_stale ON ops.knowledge_pages (last_extracted_at) WHERE last_extracted_at IS NULL OR last_extracted_at < updated_at;

COMMENT ON TABLE ops.knowledge_pages IS 'Page metadata (Bài #14). Files in wiki/ are source; this table is index.';

-- ----------------------------------------------------------------------------
-- ops.knowledge_links — graph edges (Bài #14)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.knowledge_links (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Edge endpoints
  source_page_id  uuid NOT NULL REFERENCES ops.knowledge_pages(id) ON DELETE CASCADE,
  target_page_id  uuid REFERENCES ops.knowledge_pages(id) ON DELETE SET NULL,
  
  -- Edge type (per link-inference-rules.yaml)
  link_type       text NOT NULL,                   -- 'works_at' | 'founded' | 'mentions' | 'attributed_to'
  
  -- Source context
  extracted_from_section text,                     -- 'compiled_truth' | 'timeline' | 'frontmatter'
  source_text     text,                            -- original text where link extracted
  
  -- Confidence (zero-LLM = always 1.0; LLM-verified can be higher fidelity)
  confidence      numeric NOT NULL DEFAULT 1.0,
  extraction_method text NOT NULL DEFAULT 'regex', -- 'regex' | 'llm' | 'manual'
  
  -- Validity
  is_active       boolean NOT NULL DEFAULT true,
  invalidated_at  timestamptz,
  
  CONSTRAINT links_endpoints_distinct CHECK (source_page_id != target_page_id)
);

-- Edge traversal indexes (recursive CTE optimization)
CREATE INDEX idx_links_outbound ON ops.knowledge_links (source_page_id, link_type) WHERE is_active = true;
CREATE INDEX idx_links_inbound ON ops.knowledge_links (target_page_id, link_type) WHERE is_active = true AND target_page_id IS NOT NULL;
CREATE INDEX idx_links_type ON ops.knowledge_links (link_type) WHERE is_active = true;

COMMENT ON TABLE ops.knowledge_links IS 'Graph edges (Bài #14). Auto-extracted via regex from page content. 2.8x P@5 precision.';

-- ----------------------------------------------------------------------------
-- ops.knowledge_embeddings — vector index (Bài #4 + Bài #14)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.knowledge_embeddings (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Source
  page_id         uuid REFERENCES ops.knowledge_pages(id) ON DELETE CASCADE,
  chunk_index     integer NOT NULL,                -- which chunk in page
  chunk_text      text NOT NULL,                   -- original text
  
  -- Embedding
  embedding       vector(1536),                    -- OpenAI text-embedding-3-small dim
  embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
  
  -- Metadata
  token_count     integer,
  
  -- Update tracking (re-embed when chunk changes)
  chunk_hash      text NOT NULL,                   -- detect changes
  
  UNIQUE (page_id, chunk_index)
);

-- Vector similarity index (HNSW for fast approximate search)
CREATE INDEX idx_embeddings_vector ON ops.knowledge_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_embeddings_page ON ops.knowledge_embeddings (page_id);

COMMENT ON TABLE ops.knowledge_embeddings IS 'Vector embeddings (Bài #4 + Bài #14). Hybrid search (keyword + semantic) drives BrainBench precision.';

-- ----------------------------------------------------------------------------
-- Update trigger for ops.knowledge_pages
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ops.update_page_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pages_updated_at
  BEFORE UPDATE ON ops.knowledge_pages
  FOR EACH ROW
  EXECUTE FUNCTION ops.update_page_updated_at();
