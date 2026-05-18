-- ============================================================================
-- Migration 00031: wiki-sync v3.0.0 schema deltas — distill+extract foundation
-- ============================================================================
-- Capability: wiki-sync-from-refs v3.0.0 (revise of v2.0.0)
-- Tier C decision:
--   ops.decisions[562b2e4e-7f50-47f2-a3bb-1291c30f6709] —
--   "wiki-sync v3.0 architecture: Option B (full 4-entity distill+extract) +
--   all CTO + Muse NITs"
-- Spec: .archives/cla/wiki-sync-from-refs-revise-ff5e2a89/spec.md §0
-- Sprint plan: .archives/cla/wiki-sync-from-refs-revise-ff5e2a89/sprint-plan.md §Sprint 1
-- Capability run: ops.capability_runs[36836749-06f7-48e8-8a31-f5a3f2e401a1]
--
-- Reframes wiki-sync from verbatim-projection (v1.0+v2.0) to distill+extract:
-- source files become RECORDS (frontmatter + summary + pointer to raw/);
-- the IMPORTANT KNOWLEDGE (concept/observation/decision/idea entities) is
-- LLM-extracted into separate wiki/<type>/<slug>.md pages with full citation
-- back to source chunks via ops.knowledge_extractions.
--
-- 4 blocks:
--   Block A — CREATE TABLE ops.knowledge_extractions (citation spine)
--   Block B — knowledge_pages new columns:
--             extracted_from_source_id (FK→knowledge_pages, SET NULL)
--             legacy_v2_verbatim       (boolean DEFAULT false; A10 backward compat)
--             review_state             (CHECK enum; page-level review queue)
--             deleted_at               (timestamptz NULL; soft-delete for /wiki merge per CTO P2/P3 #6)
--   Block C — Indexes for review queue, source-to-derived lookups, soft-deletes
--   Block D — RLS policies (mirror knowledge_pages; raw_quote NOT exposed to anon per CTO P2/P3 #3)
--   Block E — Backfill: flag the 1 existing v2.0 verbatim row (legacy_v2_verbatim=true)
--
-- NOTE on link_type enum asymmetry (per CTO P2/P3 #1):
--   knowledge_extractions.link_type uses a STRICT CHECK enum (4 extracted_*
--   values) because it's the citation contract — every row MUST be one of
--   these 4 types or the citation discipline breaks. By contrast,
--   knowledge_links.link_type (00006) is free-text by design because it
--   captures author-typed cross-references like [[concept/X]] which are
--   intentionally open-ended. Different design intent, intentional asymmetry.
--
-- Confidence numeric semantics (per CTO P2/P3 #4):
--   confidence column allows 0..1 but the DISTILL SKILL documents this as a
--   COARSE 3-BUCKET SIGNAL (~0.6 / 0.8 / 0.95 effectively from Haiku/Sonnet
--   self-report). Future hooks/queries MUST NOT treat as calibrated probability.
--   See 06-ai-ops/skills/wiki-sync/distill/SKILL.md §Confidence semantics.
--
-- Index threshold-drift safeguard (per CTO P2/P3 #3 / NIT 3):
--   idx_extractions_review_queue uses WHERE confidence < 0.95 (not
--   BETWEEN 0.6 AND 0.85) so if the founder retunes the 0.85 auto-accept
--   threshold to 0.80 or 0.90 in v3.0.1, the index stays correct without
--   needing migration.
--
-- Rollback (documented, not committed):
--   DROP POLICY IF EXISTS extractions_read_authenticated ON ops.knowledge_extractions;
--   DROP POLICY IF EXISTS extractions_write_service_role ON ops.knowledge_extractions;
--   DROP INDEX IF EXISTS ops.idx_pages_deleted_at;
--   DROP INDEX IF EXISTS ops.idx_pages_review_pending;
--   DROP INDEX IF EXISTS ops.idx_pages_extracted_from;
--   ALTER TABLE ops.knowledge_pages
--     DROP COLUMN deleted_at,
--     DROP COLUMN review_state,
--     DROP COLUMN legacy_v2_verbatim,
--     DROP COLUMN extracted_from_source_id;
--   DROP INDEX IF EXISTS ops.idx_extractions_review_queue;
--   DROP INDEX IF EXISTS ops.idx_extractions_derived;
--   DROP INDEX IF EXISTS ops.idx_extractions_source;
--   DROP TABLE ops.knowledge_extractions;
--
-- All blocks wrap in implicit transaction (Supabase db push behavior for .sql
-- files). Block E uses guarded DO block with RAISE WARNING (not NOTICE) per
-- CTO P2/P3 #2 so reviewer sees the line in CI output.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Block A — CREATE TABLE ops.knowledge_extractions (citation spine)
-- ----------------------------------------------------------------------------
-- One row per (source_chunk → derived_entity) edge produced by /wiki distill.
-- Founder reviews queue 0.6-0.85; auto-accept ≥0.85; auto-reject <0.6.
-- raw_quote = literal source text supporting the extraction (citation evidence).

CREATE TABLE ops.knowledge_extractions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  source_page_id        uuid        NOT NULL REFERENCES ops.knowledge_pages(id) ON DELETE CASCADE,
  source_chunk_index    int,                              -- nullable; some extractions are page-level
  derived_page_id       uuid        NOT NULL REFERENCES ops.knowledge_pages(id) ON DELETE CASCADE,
  link_type             text        NOT NULL CHECK (link_type IN (
    'extracted_concept', 'extracted_observation', 'extracted_decision', 'extracted_idea'
  )),
  confidence            numeric     CHECK (confidence >= 0 AND confidence <= 1),
  llm_model             text        NOT NULL,
  extraction_cost_usd   numeric,
  raw_quote             text,                             -- literal source text supporting the extraction
  founder_reviewed      boolean     NOT NULL DEFAULT false,
  founder_decision      text        CHECK (founder_decision IS NULL OR founder_decision IN (
    'accepted', 'rejected', 'edited', 'merged'
  )),
  founder_reviewed_at   timestamptz,
  CONSTRAINT extractions_self_ref_distinct CHECK (source_page_id <> derived_page_id),
  CONSTRAINT extractions_reviewed_implies_decision CHECK (
    founder_reviewed = false OR founder_decision IS NOT NULL
  )
);

COMMENT ON TABLE ops.knowledge_extractions IS
  'v3.0 citation spine. One row per (source_chunk, derived_entity) edge produced by /wiki distill. confidence is a coarse 3-bucket signal (~0.6/0.8/0.95) per Haiku/Sonnet self-report — NOT a calibrated probability; see 06-ai-ops/skills/wiki-sync/distill/SKILL.md.';

COMMENT ON COLUMN ops.knowledge_extractions.raw_quote IS
  'Literal source text that supported the extraction. Used for citation discipline in /wiki ask retrieval (must surface raw_quote so founder can verify the extraction faithfully represents source). Sensitive for copyrighted sources — RLS restricts to authenticated role only (NOT anon).';

COMMENT ON COLUMN ops.knowledge_extractions.link_type IS
  'STRICT CHECK enum (4 extracted_* values) by design — citation contract requires every row be one of these. Asymmetric with knowledge_links.link_type (free-text) which captures author-typed [[concept/X]] cross-references and is intentionally open-ended.';

COMMENT ON COLUMN ops.knowledge_extractions.confidence IS
  'COARSE 3-BUCKET signal (~0.6 / 0.8 / 0.95) from LLM self-report. Do NOT treat as calibrated probability. Auto-accept ≥0.85; review 0.6-0.85; auto-reject <0.6 (per spec §0 A6 disposition).';

COMMENT ON COLUMN ops.knowledge_extractions.founder_decision IS
  'NULL until reviewed. Set to one of accepted/rejected/edited/merged when founder runs /wiki review. Trigger constraint: if founder_reviewed=true then this MUST be set.';

-- ----------------------------------------------------------------------------
-- Block B — knowledge_pages new columns
-- ----------------------------------------------------------------------------
-- extracted_from_source_id: nullable FK; NULL = manually-created page OR
--                           v2.0 legacy verbatim page (the source RECORD page
--                           also has this NULL since it IS the source).
-- legacy_v2_verbatim:       A10 backward compat flag. v2.0 wiki pages get
--                           this set true; audit treats them differently.
-- review_state:             page-level review state. auto_accepted = all
--                           extractions ≥ 0.85; pending_review = any
--                           extraction in 0.6-0.85; founder_approved/rejected
--                           = /wiki review processed.
-- deleted_at:               soft-delete column for /wiki merge --undo support
--                           (CTO P2/P3 #6). NULL = active; timestamp = deleted.

ALTER TABLE ops.knowledge_pages
  ADD COLUMN extracted_from_source_id uuid REFERENCES ops.knowledge_pages(id) ON DELETE SET NULL,
  ADD COLUMN legacy_v2_verbatim boolean NOT NULL DEFAULT false,
  ADD COLUMN review_state text NOT NULL DEFAULT 'auto_accepted'
    CHECK (review_state IN ('auto_accepted', 'pending_review', 'founder_approved', 'founder_rejected')),
  ADD COLUMN deleted_at timestamptz;

COMMENT ON COLUMN ops.knowledge_pages.extracted_from_source_id IS
  'v3.0: source RECORD page from which this entity was distilled. NULL = manually-created page OR v2.0 legacy verbatim page OR the source RECORD itself (sources are not extracted from anything).';

COMMENT ON COLUMN ops.knowledge_pages.legacy_v2_verbatim IS
  'v3.0: TRUE for v2.0-era verbatim pages preserved for backward compat. Audit treats these differently (no citation integrity check since they have no extractions). New v3.0 ingests default false.';

COMMENT ON COLUMN ops.knowledge_pages.review_state IS
  'v3.0: page-level review state. auto_accepted = all extractions ≥0.85 confidence; pending_review = at least one extraction in 0.6-0.85 (founder /wiki review queue); founder_approved/rejected = /wiki review processed.';

COMMENT ON COLUMN ops.knowledge_pages.deleted_at IS
  'v3.0: soft-delete for /wiki merge --undo support. NULL = active page; timestamp = deleted (by merge operation). /wiki merge --undo clears this. Housekeeping job (v3.1+) hard-deletes after retention period.';

-- ----------------------------------------------------------------------------
-- Block C — Indexes
-- ----------------------------------------------------------------------------
-- Per CTO P2/P3 #3 / NIT 3: idx_extractions_review_queue uses
-- WHERE confidence < 0.95 (not BETWEEN 0.6 AND 0.85) so threshold tuning
-- in v3.0.1 doesn't invalidate the index.

CREATE INDEX idx_extractions_source
  ON ops.knowledge_extractions (source_page_id);

CREATE INDEX idx_extractions_derived
  ON ops.knowledge_extractions (derived_page_id);

CREATE INDEX idx_extractions_review_queue
  ON ops.knowledge_extractions (confidence, founder_reviewed)
  WHERE founder_reviewed = false AND confidence < 0.95;

CREATE INDEX idx_pages_extracted_from
  ON ops.knowledge_pages (extracted_from_source_id)
  WHERE extracted_from_source_id IS NOT NULL;

CREATE INDEX idx_pages_review_pending
  ON ops.knowledge_pages (review_state)
  WHERE review_state = 'pending_review';

CREATE INDEX idx_pages_deleted_at
  ON ops.knowledge_pages (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Block D — RLS policies
-- ----------------------------------------------------------------------------
-- Per CTO P2/P3 #3: raw_quote may contain sensitive source text (copyrighted
-- excerpts from growth playbooks). Restrict reads to authenticated role only
-- (NOT anon). Service role has full access for ETL/distill skill writes.

ALTER TABLE ops.knowledge_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY extractions_read_authenticated
  ON ops.knowledge_extractions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY extractions_write_service_role
  ON ops.knowledge_extractions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Block E — Backfill (A10 backward compat)
-- ----------------------------------------------------------------------------
-- Flag the 1 existing v2.0 verbatim wiki page so audit treats it differently.
-- Per CTO P2/P3 #2: RAISE WARNING (not NOTICE) so the line shows in CI output.

DO $$
DECLARE
  v_rows int;
BEGIN
  UPDATE ops.knowledge_pages
    SET legacy_v2_verbatim = true
    WHERE slug = 'spaced-repetition'
      AND source_kind = 'markdown_passthrough';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE WARNING 'Migration 00031 Block E: no rows updated (expected 1 row with slug=spaced-repetition + source_kind=markdown_passthrough). DB state may have changed since spec was written.';
  ELSIF v_rows > 1 THEN
    RAISE WARNING 'Migration 00031 Block E: updated % rows (expected exactly 1). Multiple matches indicate slug discipline drift.', v_rows;
  ELSE
    RAISE NOTICE 'Migration 00031 Block E: backfilled legacy_v2_verbatim=true on 1 row (slug=spaced-repetition).';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- End of migration 00031
-- ============================================================================
