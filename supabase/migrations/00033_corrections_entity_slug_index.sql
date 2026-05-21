-- ============================================================================
-- Migration 00033: Index on ops.corrections(entity_slug, ts)
-- ============================================================================
-- Capability: evolve (v1.0)
-- Phase 7 (Sprint 3) migration. Zero downtime (CONCURRENTLY).
-- Speeds up /evolve cross-iter negative-signal load:
--   SELECT correction_note FROM ops.corrections
--   WHERE entity_slug = $1 AND ts > NOW() - INTERVAL '90 days'
--   ORDER BY ts DESC LIMIT 10
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_corrections_entity_slug_ts
  ON ops.corrections (entity_slug, ts DESC);

COMMENT ON INDEX ops.idx_corrections_entity_slug_ts IS
  'Speeds up /evolve cross-iter negative-signal load (last 10 corrections per entity, <90d). Capability: evolve.';
