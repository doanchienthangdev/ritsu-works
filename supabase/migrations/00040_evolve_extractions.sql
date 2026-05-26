-- Migration 00040 — Citation spine for /update distill output.
--
-- Renumbered from draft 00039 (00039 went to universal entity-edit lock —
-- see supabase/migrations/00039_universal_entity_edit_lock.sql).
--
-- Per spec §4: every proposed change traces to a source chunk in refs. This
-- table is the citation spine. /update distill phase INSERTs one row per
-- extraction; review queue surfaces 0.6-0.85 bucket; propose phase consumes
-- auto_accepted + founder_accepted rows via the propose-improvement
-- skill's extractions_context input (added Sprint 1).
--
-- Naming: `evolve_extractions` (not `update_extractions`) because the table
-- lives in the shared eval-evo skill folder convention. /update is the v1.0
-- writer; future /evolve --refs (if approved v1.1) could also write here.
--
-- Capability: update v1.0 (capability_run_id: 16720cb5-f2fe-47f0-9d47-beaeca5f05e1)
-- Sprint: 2
-- Tier C decision: ops.decisions[a683a371-0611-49c7-9650-53503027d60e]

CREATE TABLE IF NOT EXISTS ops.evolve_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_run_id UUID NOT NULL REFERENCES ops.agent_runs(id) ON DELETE CASCADE,

  -- Ref source (where the extraction came from)
  ref_path TEXT NOT NULL,
  ref_chunk_index INTEGER NOT NULL CHECK (ref_chunk_index >= 0),
  ref_source_kind TEXT NOT NULL CHECK (ref_source_kind IN (
    'file',           -- founder-supplied file path (e.g. raw/notes.md)
    'wiki-src',       -- /wiki get --src=<spec> resolved to runtime/cla/refs/<slug>/
    'wiki-query',     -- /wiki get --query=<text> resolved via MCP wiki_ask
    'raw'             -- raw/ folder input (uncatalogued)
  )),

  -- Extraction content
  raw_quote TEXT NOT NULL CHECK (length(raw_quote) <= 2000),
  proposed_change TEXT NOT NULL,
  section_target TEXT,

  -- Quality signals
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  llm_model TEXT NOT NULL,
  extraction_cost_usd NUMERIC(8, 6),

  -- Review state — per spec §4 Phase 1
  -- Legal transitions (enforced by trigger below):
  --   pending_review → founder_accepted | founder_rejected | founder_edited
  --   auto_accepted: terminal-on-insert (confidence >= 0.85)
  --   rejected_low_confidence: terminal-on-insert (confidence < 0.6)
  review_state TEXT NOT NULL CHECK (review_state IN (
    'auto_accepted',
    'pending_review',
    'rejected_low_confidence',
    'founder_accepted',
    'founder_rejected',
    'founder_edited'
  )),

  founder_decision_at TIMESTAMPTZ,
  founder_decision_note TEXT,
  founder_edited_change TEXT,

  -- Applied tracking (downstream propose phase consumes accepted rows)
  applied_to_diff BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for hot paths
CREATE INDEX IF NOT EXISTS idx_evolve_extractions_run
  ON ops.evolve_extractions (agent_run_id, created_at);

CREATE INDEX IF NOT EXISTS idx_evolve_extractions_pending
  ON ops.evolve_extractions (review_state)
  WHERE review_state = 'pending_review';

CREATE INDEX IF NOT EXISTS idx_evolve_extractions_ref
  ON ops.evolve_extractions (ref_path, ref_chunk_index);

COMMENT ON TABLE ops.evolve_extractions IS
  'Citation spine for /update distill outputs (and future /evolve --refs). Every proposed entity change traces to a ref chunk via this table. 3-bucket confidence: >=0.85 auto, 0.6-0.85 review, <0.6 reject. Spec: wiki/capabilities/update/spec.md §4 (after Phase 8 promotion); draft .archives/cla/update/spec.md.';

-- updated_at auto-update trigger
CREATE OR REPLACE FUNCTION ops.evolve_extractions_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evolve_extractions_updated_at ON ops.evolve_extractions;
CREATE TRIGGER trg_evolve_extractions_updated_at
  BEFORE UPDATE ON ops.evolve_extractions
  FOR EACH ROW
  EXECUTE FUNCTION ops.evolve_extractions_set_updated_at();

-- Review state machine enforcement trigger
-- Activates the cross-tier invariant `evolve-extractions-review-state-machine-valid`
-- which Sprint 1 added as `status: deferred` pending this migration.
CREATE OR REPLACE FUNCTION ops.evolve_extractions_check_review_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- auto_accepted + rejected_low_confidence are terminal-on-insert; UPDATE forbidden.
  IF OLD.review_state IN ('auto_accepted', 'rejected_low_confidence')
     AND NEW.review_state <> OLD.review_state THEN
    RAISE EXCEPTION 'review_state % is terminal-on-insert; cannot transition to %',
      OLD.review_state, NEW.review_state
      USING ERRCODE = 'check_violation';
  END IF;

  -- pending_review → founder_{accepted|rejected|edited} only.
  IF OLD.review_state = 'pending_review'
     AND NEW.review_state NOT IN ('pending_review', 'founder_accepted', 'founder_rejected', 'founder_edited') THEN
    RAISE EXCEPTION 'illegal transition pending_review → %', NEW.review_state
      USING ERRCODE = 'check_violation';
  END IF;

  -- founder_* states are also terminal once set.
  IF OLD.review_state IN ('founder_accepted', 'founder_rejected', 'founder_edited')
     AND NEW.review_state <> OLD.review_state THEN
    RAISE EXCEPTION 'review_state % is terminal; cannot re-transition to %',
      OLD.review_state, NEW.review_state
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evolve_extractions_review_transition ON ops.evolve_extractions;
CREATE TRIGGER trg_evolve_extractions_review_transition
  BEFORE UPDATE OF review_state ON ops.evolve_extractions
  FOR EACH ROW
  EXECUTE FUNCTION ops.evolve_extractions_check_review_transition();

-- Row-Level Security
ALTER TABLE ops.evolve_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evolve_extractions_founder_all ON ops.evolve_extractions;
DROP POLICY IF EXISTS evolve_extractions_writers_all ON ops.evolve_extractions;
DROP POLICY IF EXISTS evolve_extractions_readers ON ops.evolve_extractions;

CREATE POLICY evolve_extractions_founder_all ON ops.evolve_extractions
  FOR ALL
  USING (current_setting('app.mcp_caller_role', true) IN ('founder', 'cofounder'))
  WITH CHECK (current_setting('app.mcp_caller_role', true) IN ('founder', 'cofounder'));

CREATE POLICY evolve_extractions_writers_all ON ops.evolve_extractions
  FOR ALL
  USING (current_setting('app.mcp_caller_role', true) IN (
    'entity-update-orchestrator', 'eval-evo-orchestrator'
  ))
  WITH CHECK (current_setting('app.mcp_caller_role', true) IN (
    'entity-update-orchestrator', 'eval-evo-orchestrator'
  ));

CREATE POLICY evolve_extractions_readers ON ops.evolve_extractions
  FOR SELECT
  USING (current_setting('app.mcp_caller_role', true) IN ('code-reviewer', 'metrics-curator'));
