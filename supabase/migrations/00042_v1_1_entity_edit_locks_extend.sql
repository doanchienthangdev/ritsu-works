-- Migration 00042 — Extend ops.entity_edit_locks entity_type CHECK to v1.1.
--
-- Capability: update v1.1 (extends v1.0; per /cla extend sub-flow).
-- Parent capability_run_id: 16720cb5-f2fe-47f0-9d47-beaeca5f05e1 (v1.0)
-- v1.1 new entity types: hook, pillar, folder, workflow, file.

ALTER TABLE ops.entity_edit_locks DROP CONSTRAINT IF EXISTS entity_edit_locks_entity_type_check;
ALTER TABLE ops.entity_edit_locks ADD CONSTRAINT entity_edit_locks_entity_type_check
  CHECK (entity_type IN (
    -- v1.0 types
    'skill', 'command', 'agent', 'sop',
    'capability',
    -- v1.1 types (additive — no v1.0 type removed)
    'hook', 'pillar', 'folder', 'workflow', 'file'
  ));

COMMENT ON CONSTRAINT entity_edit_locks_entity_type_check ON ops.entity_edit_locks IS
  'v1.0 + v1.1 entity types. capability is for /cla flows; hook + pillar + folder + workflow + file added by /update v1.1 (Sprint 1+2+3).';
