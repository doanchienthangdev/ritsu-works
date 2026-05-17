-- ============================================================================
-- Migration 00028: Allow capability evolution sub-flows during `implementing`
-- ============================================================================
-- Patches ops.capability_acquire_update_lock to permit mid-implementation
-- evolution (revise/fix/extend/tune/deprecate). The original 00025 function
-- required state IN ('operating', 'deployed') which made it impossible to
-- run /cla revise during an in-flight Sprint 1 — even though the parent
-- capability's own sprint-plan.md explicitly anticipated that workflow:
--
--   .archives/cla/wiki-sync-from-refs/sprint-plan.md:138 —
--   "If Sprint 1 reveals migration 00022 needs revision → use /cla revise"
--
-- The function-level filter contradicted the playbook-level guidance. This
-- migration aligns the two by adding 'implementing' to the allowed state set.
-- The complement (still EXCLUDED): {proposed, analyzing, architecting,
-- planning, deprecated, superseded} — capabilities that haven't started
-- building or have ended should not accept evolution sub-flows.
--
-- Driver: /cla revise wiki-sync-from-refs invoked 2026-05-17; founder
-- approved Option A (proceed with revise) then approved this patch as the
-- non-bypass implementation path. Retroactive bookkeeping: should be folded
-- into a follow-up `/cla fix cla-update-mechanism` to update SOP-AIOPS-001-
-- revise/README.md "When to use" + .claude/commands/cla.md common pre-flight
-- step 3 accordingly.
--
-- Rollback (documented, not committed):
--   CREATE OR REPLACE FUNCTION ops.capability_acquire_update_lock(...)  -- restore 00025 body
--
-- This migration is ADDITIVE in behavior — strictly relaxes the lock filter.
-- Any caller previously denied for state='implementing' will now succeed;
-- callers for 'operating'/'deployed' behave identically.
-- ============================================================================

CREATE OR REPLACE FUNCTION ops.capability_acquire_update_lock(
  p_capability_id text,
  p_session_id text
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_row_id uuid;
BEGIN
  UPDATE ops.capability_runs
     SET update_lock_session_id = p_session_id,
         update_lock_acquired_at = now()
   WHERE capability_id = p_capability_id
     AND state IN ('implementing', 'operating', 'deployed')
     AND (
       update_lock_session_id IS NULL
       OR update_lock_acquired_at < now() - interval '24 hours'
     )
     AND superseded_by_id IS NULL   -- never lock a superseded row
  RETURNING id INTO v_row_id;

  RETURN v_row_id;  -- NULL if no row updated (lock held, terminal state, or superseded)
END;
$function$;

COMMENT ON FUNCTION ops.capability_acquire_update_lock(text, text) IS
  'Acquire transaction-independent update lock on the live capability_runs row '
  'for a given capability_id. Returns the row id on success, NULL if lock is '
  'held (or expires < 24h ago), state is terminal, or row has been superseded. '
  'Allowed states (v2, migration 00028): implementing | operating | deployed.';
