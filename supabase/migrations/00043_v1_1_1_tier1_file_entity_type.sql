-- Migration 00043 — Extend ops.entity_edit_locks entity_type CHECK with tier1_file.
--
-- Capability: update v1.1.1 (patch — adds /update tier1-file command).
-- Parent capability_run_id: 16720cb5-f2fe-47f0-9d47-beaeca5f05e1 (v1.0)
-- Brainstorm: .archives/cla/update/v1.1.1-brainstorming/00-tier1-file.md (local-only)

ALTER TABLE ops.entity_edit_locks DROP CONSTRAINT IF EXISTS entity_edit_locks_entity_type_check;
ALTER TABLE ops.entity_edit_locks ADD CONSTRAINT entity_edit_locks_entity_type_check
  CHECK (entity_type IN (
    -- v1.0 types
    'skill', 'command', 'agent', 'sop',
    'capability',
    -- v1.1 types
    'hook', 'pillar', 'folder', 'workflow', 'file',
    -- v1.1.1 type (D-Std ceremony required; targets Tier 1 paths)
    'tier1_file'
  ));

COMMENT ON CONSTRAINT entity_edit_locks_entity_type_check ON ops.entity_edit_locks IS
  'v1.0 + v1.1 + v1.1.1 entity types. capability for /cla flows; hook+pillar+folder+workflow+file added by /update v1.1; tier1_file added by /update v1.1.1 (D-Std ceremony for 00-core/, governance/, knowledge/manifest+invariants).';
