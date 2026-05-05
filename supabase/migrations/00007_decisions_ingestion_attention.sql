-- ============================================================================
-- Migration 00007: Decisions + Ingestion + Founder Capacity
-- ============================================================================
-- Bài #15 Decision Architecture: ops.decisions
-- Bài #18 Knowledge Ingestion Pipeline: ops.ingestion_jobs
-- Bài #19 Founder Capacity: ops.attention_log
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ops.decisions — Decision pages (Bài #15)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.decisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Identification
  slug            text UNIQUE NOT NULL,
  title           text NOT NULL,
  decision_type   text NOT NULL,                   -- 'product' | 'hiring' | 'pricing' | 'partnership' | etc.
  
  -- Stakes (Bài #2 HITL Tier classification)
  hitl_tier       text NOT NULL,                   -- 'A' | 'B' | 'C' | 'D' | 'E'
  reversibility   text NOT NULL,                   -- 'reversible' | 'partially_reversible' | 'irreversible'
  estimated_impact_usd numeric,
  
  -- Muse panel (per Bài #15)
  muse_personas_invoked text[],                    -- list of persona ids
  muse_synthesis_at timestamptz,
  muse_synthesis_payload jsonb,
  
  -- State (Bài #13)
  state           text NOT NULL DEFAULT 'draft',
  state_since     timestamptz NOT NULL DEFAULT now(),
  
  -- Resolution
  decided_at      timestamptz,
  decided_by      text,
  decision_text   text,                            -- final decision
  decision_payload jsonb,
  
  -- Lifecycle
  superseded_by_id uuid REFERENCES ops.decisions(id),
  staleness_check_at timestamptz,
  
  -- Reference page (Bài #14)
  page_id         uuid REFERENCES ops.knowledge_pages(id),
  
  CONSTRAINT decisions_state_valid CHECK (state IN ('draft', 'in_muse_panel', 'awaiting_synthesis', 'decided', 'stale', 'superseded')),
  CONSTRAINT decisions_tier_valid CHECK (hitl_tier IN ('A', 'B', 'C', 'D', 'E'))
);

CREATE INDEX idx_decisions_state ON ops.decisions (state, state_since);
CREATE INDEX idx_decisions_type ON ops.decisions (decision_type, decided_at DESC) WHERE state = 'decided';
CREATE INDEX idx_decisions_stale ON ops.decisions (staleness_check_at) WHERE state = 'decided';
CREATE INDEX idx_decisions_superseded ON ops.decisions (superseded_by_id) WHERE superseded_by_id IS NOT NULL;

CREATE TRIGGER trg_decisions_state_since
  BEFORE UPDATE ON ops.decisions
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE ops.decisions IS 'Decision Architecture (Bài #15). Decisions = 5th truth category. Muse panel for Tier C+.';

-- ----------------------------------------------------------------------------
-- ops.ingestion_jobs — Knowledge ingestion pipeline (Bài #18)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.ingestion_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Source
  source_kind     text NOT NULL,                   -- 'article' | 'voice_note' | 'podcast' | 'book' | 'repo' | 'youtube_video' | 'tweet_thread'
  source_url      text,
  source_hash     text,                            -- URL hash dedup
  content_hash    text,                            -- content-level dedup
  
  -- State machine (Bài #13)
  state           text NOT NULL DEFAULT 'queued',
  state_since     timestamptz NOT NULL DEFAULT now(),
  
  -- Pipeline progress
  current_step    text,                            -- 'fetching' | 'transcribing' | 'classifying' | 'embedding' | etc.
  
  -- Output
  resulting_page_id uuid REFERENCES ops.knowledge_pages(id),
  resulting_slug  text,
  
  -- Cost tracking (Bài #7)
  whisper_cost_usd numeric(10, 4),
  llm_cost_usd    numeric(10, 4),
  embedding_cost_usd numeric(10, 4),
  total_cost_usd  numeric(10, 4),
  
  -- Quality scoring
  quality_score   numeric,
  quality_flags   text[],
  
  -- Voice note classification (per ingestion-routing.yaml)
  voice_classification text,                       -- 'idea' | 'decision_request' | 'observation' | 'task' | 'mixed' | NULL
  
  -- Attribution
  attribution     jsonb,                           -- author, publication, published_at, etc.
  metadata        jsonb,
  
  -- Lifecycle
  ingested_at     timestamptz,
  last_refreshed_at timestamptz,
  
  -- Errors
  error_message   text,
  error_step      text,
  
  CONSTRAINT ingestion_state_valid CHECK (state IN ('queued', 'fetching', 'processing', 'completed', 'failed', 'duplicate', 'low_quality'))
);

CREATE INDEX idx_ingestion_dedup_url ON ops.ingestion_jobs (source_hash) WHERE source_hash IS NOT NULL;
CREATE INDEX idx_ingestion_dedup_content ON ops.ingestion_jobs (content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX idx_ingestion_active ON ops.ingestion_jobs (state, created_at DESC);
CREATE INDEX idx_ingestion_kind ON ops.ingestion_jobs (source_kind, ingested_at DESC) WHERE state = 'completed';
CREATE INDEX idx_ingestion_voice ON ops.ingestion_jobs (voice_classification) WHERE source_kind = 'voice_note';

CREATE TRIGGER trg_ingestion_state_since
  BEFORE UPDATE ON ops.ingestion_jobs
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE ops.ingestion_jobs IS 'Knowledge ingestion pipeline (Bài #18). Sources: article/voice/podcast/book/repo/video/tweet.';

-- ----------------------------------------------------------------------------
-- ops.attention_log — Founder capacity tracking (Bài #19)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.attention_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  founder_id      text NOT NULL DEFAULT 'founder',
  
  -- Categorization
  category        text NOT NULL,                   -- 'deep_work' | 'meeting' | 'hitl' | 'triage' | 'reactive' | 'reflection' | 'recovery'
  duration_minutes numeric NOT NULL,
  
  -- Context
  source          text,                            -- which surface/event triggered this attention
  related_entities jsonb,                          -- {customer_id, decision_id, sop_id, etc.}
  
  -- Quality
  estimated_leverage text,                         -- 'high' | 'medium' | 'low'
  energy_state    text,                            -- 'high' | 'medium' | 'low' (optional, manual entry)
  
  -- Notes
  notes           text,
  
  CONSTRAINT attention_category_valid CHECK (category IN ('deep_work', 'meeting', 'hitl', 'triage', 'reactive', 'reflection', 'recovery', 'break'))
);

CREATE INDEX idx_attention_recent ON ops.attention_log (occurred_at DESC);
CREATE INDEX idx_attention_category ON ops.attention_log (category, occurred_at DESC);
CREATE INDEX idx_attention_founder ON ops.attention_log (founder_id, occurred_at DESC);

COMMENT ON TABLE ops.attention_log IS 'Founder attention budget tracking (Bài #19). Drives Bài #19 capacity reports.';

-- ----------------------------------------------------------------------------
-- Materialized view: customer_360 (Bài #16)
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_customer_360 AS
SELECT
  c.id AS customer_id,
  c.customer_kind,
  c.display_name,
  c.primary_email,
  c.tier,
  c.state,
  c.last_active_at,
  c.activated_at,
  
  -- Timeline indicators
  (now() - c.last_active_at) AS time_since_active,
  (c.last_active_at - c.activated_at) AS active_duration,
  
  -- Person details (for individual customers)
  p.full_name AS person_full_name,
  p.country AS person_country,
  p.locale AS person_locale,
  
  -- Company details (for org customers)
  comp.legal_name AS company_legal_name,
  comp.industry,
  comp.size_band,
  comp.hq_country
  
FROM customers c
LEFT JOIN persons p ON c.primary_person_id = p.id
LEFT JOIN companies comp ON c.primary_company_id = comp.id
WHERE c.deleted_at IS NULL;

CREATE UNIQUE INDEX idx_mv_customer_360_id ON mv_customer_360 (customer_id);

COMMENT ON MATERIALIZED VIEW mv_customer_360 IS 'Customer 360 view (Bài #16). REFRESH MATERIALIZED VIEW periodically or via trigger.';
