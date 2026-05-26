-- Migration 00039 — Universal entity-edit lock
--
-- Renumbered from draft 00038 (00038 was taken by resolver-v3 mode-A2; see
-- supabase/migrations/00038_resolver_decisions_mode_a2.sql). Functional
-- content unchanged from draft.
--
-- Replaces per-capability concurrent-run checks:
--   - /evolve currently uses `WHERE agent_slug='evolve'` against ops.agent_runs
--     at orchestrator boot.
--   - /cla has ops.capability_acquire_update_lock for capability_runs scope.
--
-- The universal lock is keyed on (entity_type, entity_name) — the conceptual
-- "thing being edited" — not on the writer's capability or agent identity.
-- Multiple writers (/update, /evolve, /cla extend, future manual-edit hook)
-- share this lock table. First-acquirer wins; stale takeover after 24h with
-- explicit REFUSE if prior holder was in awaiting_review state.
--
-- Per spec §4 + §9 (CTO NIT 2): COALESCE state_payload defensively when
-- inspecting prior holder's phase.
--
-- Capability: update v1.0
-- ops.capability_runs id: 16720cb5-f2fe-47f0-9d47-beaeca5f05e1
-- Sprint: 1
-- Tier C decision: ops.decisions[a683a371-0611-49c7-9650-53503027d60e]
-- Approval audit: ops.audit_log[408c018f-d859-4bef-b9a4-f40f27e9f9d6] (2026-05-26)

CREATE TABLE IF NOT EXISTS ops.entity_edit_locks (
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'skill', 'command', 'agent', 'sop',
    'capability'
  )),
  entity_name TEXT NOT NULL,
  holder_kind TEXT NOT NULL CHECK (holder_kind IN (
    'update', 'evolve',
    'cla_propose', 'cla_extend', 'cla_revise', 'cla_fix', 'cla_tune', 'cla_deprecate',
    'manual_edit'
  )),
  holder_run_id UUID,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT,
  PRIMARY KEY (entity_type, entity_name)
);

CREATE INDEX IF NOT EXISTS idx_entity_edit_locks_holder_run
  ON ops.entity_edit_locks (holder_run_id);

CREATE INDEX IF NOT EXISTS idx_entity_edit_locks_acquired_at
  ON ops.entity_edit_locks (acquired_at);

COMMENT ON TABLE ops.entity_edit_locks IS
  'Universal lock for entity-level edit serialization across /update, /evolve, /cla extend, and future writers. v1.0 (2026-05-26). Spec: wiki/capabilities/update/spec.md §4 (after Phase 8 promotion); draft .archives/cla/update/spec.md.';

-- ACQUIRE function — atomic; refuses takeover if prior holder is awaiting founder
CREATE OR REPLACE FUNCTION ops.acquire_entity_edit_lock(
  p_entity_type TEXT,
  p_entity_name TEXT,
  p_holder_kind TEXT,
  p_holder_run_id UUID,
  p_session_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing ops.entity_edit_locks%ROWTYPE;
  v_prior_phase TEXT;
BEGIN
  -- Fast path: fresh acquire (no prior row).
  INSERT INTO ops.entity_edit_locks (entity_type, entity_name, holder_kind, holder_run_id, session_id)
    VALUES (p_entity_type, p_entity_name, p_holder_kind, p_holder_run_id, p_session_id)
    ON CONFLICT (entity_type, entity_name) DO NOTHING;

  IF FOUND THEN
    RETURN jsonb_build_object('acquired', true, 'method', 'fresh_insert');
  END IF;

  -- Slow path: prior row exists. Decide takeover vs refuse.
  SELECT * INTO v_existing FROM ops.entity_edit_locks
    WHERE entity_type = p_entity_type AND entity_name = p_entity_name;

  IF v_existing.acquired_at < now() - interval '24 hours' THEN
    -- Stale prior holder. Check if prior was awaiting founder review (for /update or /evolve).
    IF v_existing.holder_kind IN ('update', 'evolve') THEN
      -- @cto NIT 2: COALESCE state_payload extraction defensively.
      SELECT COALESCE(ar.state_payload->>'phase', 'unknown') INTO v_prior_phase
        FROM ops.agent_runs ar
        WHERE ar.id = v_existing.holder_run_id;

      IF v_prior_phase IN ('reviewing', 'awaiting_review') THEN
        RETURN jsonb_build_object(
          'acquired', false,
          'reason', 'prior_awaiting_review',
          'holder', row_to_json(v_existing),
          'prior_phase', v_prior_phase,
          'hint', 'Use /update cancel or /update review on prior run before re-acquiring'
        );
      END IF;
    END IF;

    -- Takeover OK.
    UPDATE ops.entity_edit_locks
      SET holder_kind = p_holder_kind,
          holder_run_id = p_holder_run_id,
          session_id = p_session_id,
          acquired_at = now()
      WHERE entity_type = p_entity_type AND entity_name = p_entity_name;

    RETURN jsonb_build_object(
      'acquired', true,
      'method', 'stale_takeover',
      'prior_holder', row_to_json(v_existing),
      'prior_phase', v_prior_phase
    );
  END IF;

  -- Active holder (< 24h old). Refuse.
  RETURN jsonb_build_object(
    'acquired', false,
    'reason', 'held_by_active_run',
    'holder', row_to_json(v_existing)
  );
END;
$$;

COMMENT ON FUNCTION ops.acquire_entity_edit_lock(TEXT, TEXT, TEXT, UUID, TEXT) IS
  'Atomically acquire an entity edit lock. Returns JSONB { acquired: bool, method?: "fresh_insert"|"stale_takeover", reason?: "held_by_active_run"|"prior_awaiting_review", holder?, prior_phase?, hint? }. Stale threshold: 24h. Refuses takeover if prior holder was in awaiting_review/reviewing phase.';

-- RELEASE function — idempotent; only the holder may release.
CREATE OR REPLACE FUNCTION ops.release_entity_edit_lock(
  p_entity_type TEXT,
  p_entity_name TEXT,
  p_holder_run_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM ops.entity_edit_locks
    WHERE entity_type = p_entity_type
      AND entity_name = p_entity_name
      AND holder_run_id = p_holder_run_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

COMMENT ON FUNCTION ops.release_entity_edit_lock(TEXT, TEXT, UUID) IS
  'Idempotent release of an entity edit lock. Returns true iff the caller was the holder (DELETE removed a row). Use the holder_run_id from the original acquire result.';

-- Row-Level Security
ALTER TABLE ops.entity_edit_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entity_edit_locks_founder_all ON ops.entity_edit_locks;
DROP POLICY IF EXISTS entity_edit_locks_writers_all ON ops.entity_edit_locks;
DROP POLICY IF EXISTS entity_edit_locks_readers ON ops.entity_edit_locks;

CREATE POLICY entity_edit_locks_founder_all ON ops.entity_edit_locks
  FOR ALL
  USING (current_setting('app.mcp_caller_role', true) IN ('founder', 'cofounder'))
  WITH CHECK (current_setting('app.mcp_caller_role', true) IN ('founder', 'cofounder'));

CREATE POLICY entity_edit_locks_writers_all ON ops.entity_edit_locks
  FOR ALL
  USING (current_setting('app.mcp_caller_role', true) IN (
    'entity-update-orchestrator', 'eval-evo-orchestrator', 'gps'
  ))
  WITH CHECK (current_setting('app.mcp_caller_role', true) IN (
    'entity-update-orchestrator', 'eval-evo-orchestrator', 'gps'
  ));

CREATE POLICY entity_edit_locks_readers ON ops.entity_edit_locks
  FOR SELECT
  USING (current_setting('app.mcp_caller_role', true) IN ('code-reviewer', 'metrics-curator'));
