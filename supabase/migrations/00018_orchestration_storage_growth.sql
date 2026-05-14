-- ============================================================================
-- Migration 00018: Orchestration audit + Tier 3 index + Growth campaigns
-- ============================================================================
-- Three small but load-bearing tables:
--   - ops.task_state_transitions: append-only history for ops.tasks state changes
--     (orchestration-architecture.md forensics)
--   - ops.tier3_index: row-per-blob index for Supabase Storage objects
--     (manifest tier3_events index_table)
--   - ops.campaigns: growth campaigns (manifest tier2_operational.ops.campaigns)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ops.task_state_transitions
-- ----------------------------------------------------------------------------
CREATE TABLE ops.task_state_transitions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       uuid NOT NULL REFERENCES ops.tasks(id) ON DELETE CASCADE,
  from_state    text,
  to_state      text NOT NULL,
  by_run_id     uuid REFERENCES ops.agent_runs(id) ON DELETE SET NULL,
  reason        text,
  ts            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_transitions_task ON ops.task_state_transitions (task_id, ts);
CREATE INDEX idx_task_transitions_ts ON ops.task_state_transitions (ts DESC);

COMMENT ON TABLE ops.task_state_transitions IS 'Append-only audit log for ops.tasks state changes (orchestration-architecture.md). Note: column is `from_state`/`to_state` to match ops.tasks.state convention (manifest pre-refactor used `from_status`/`to_status`).';

-- ----------------------------------------------------------------------------
-- ops.tier3_index — Storage blob index
-- ----------------------------------------------------------------------------
CREATE TABLE ops.tier3_index (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket          text NOT NULL,                  -- e.g., 'ops-transcripts'
  object_path     text NOT NULL,
  uri             text NOT NULL,                  -- full canonical URI
  mime_type       text,
  size_bytes      bigint,
  source_kind     text,                           -- 'voice-note'|'call'|'export'|'screenshot'|...
  source_ref      text,                           -- original id (telegram msg, github issue, ...)
  produced_by_run uuid REFERENCES ops.agent_runs(id) ON DELETE SET NULL,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  retention_until timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (bucket, object_path)
);

CREATE INDEX idx_tier3_bucket ON ops.tier3_index (bucket, created_at DESC);
CREATE INDEX idx_tier3_source ON ops.tier3_index (source_kind, source_ref)
  WHERE source_ref IS NOT NULL;
CREATE INDEX idx_tier3_retention ON ops.tier3_index (retention_until)
  WHERE retention_until IS NOT NULL;

COMMENT ON TABLE ops.tier3_index IS 'One row per Tier 3 blob (manifest.yaml tier3_events.index_table). Tier 4 embeddings reference this for source linkage.';

-- ----------------------------------------------------------------------------
-- ops.campaigns — Growth (01-growth) campaigns
-- ----------------------------------------------------------------------------
CREATE TABLE ops.campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  pillar          text NOT NULL DEFAULT '01-growth',
  name            text NOT NULL,
  channel         text,                           -- 'blog'|'twitter'|'linkedin'|'email'|'ads'|...
  objective       text,
  audience        text,
  state           text NOT NULL DEFAULT 'draft',
  state_since     timestamptz NOT NULL DEFAULT now(),
  starts_at       timestamptz,
  ends_at         timestamptz,
  budget_usd      numeric(10, 2),
  owner_role      text,                           -- agent role responsible
  metrics_ref     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_run  uuid REFERENCES ops.agent_runs(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT campaigns_state_valid
    CHECK (state IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'))
);

CREATE INDEX idx_campaigns_state ON ops.campaigns (state, starts_at DESC NULLS LAST);
CREATE INDEX idx_campaigns_pillar ON ops.campaigns (pillar, state);
CREATE INDEX idx_campaigns_channel ON ops.campaigns (channel, state)
  WHERE channel IS NOT NULL;

COMMENT ON TABLE ops.campaigns IS 'Growth campaigns (manifest tier2_operational.ops.campaigns). FK target for future ops.content_drafts, ops.leads, etc.';
