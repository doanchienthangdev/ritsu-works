-- ============================================================================
-- 00036_gbrain_cla_cross_links.sql
--
-- Capability: gbrain-operational-brain v1.0 (Sprint 3 / Tier C)
-- Tier C decision: ops.decisions[5014456d-7526-4ba2-9c58-005166193864]
-- Sprint plan: .archives/cla/gbrain-operational-brain/sprint-plan.md §3
-- Spec: spec.md §4.5 + draft/tier1-diffs.yaml (after Phase 8 → wiki/capabilities/gbrain-operational-brain/spec.md)
--
-- Adds 3 NEW NULL-able TEXT columns + 3 partial indexes to enable
-- bidirectional cross-linking between formal CLA artifacts (Tier 2) and
-- their gbrain narrative companion pages (Tier 4).
--
-- Per Q7 deep-dive (refs/02-Q7-cla-integration-deep-dive.md), every CLA
-- phase auto-creates a brain page (Tier B notify-first-then-batch). The
-- cross-link columns let formal queries jump to the brain narrative and
-- vice versa, without joining on slug heuristics.
--
-- L2 invariant `gbrain-l2-cross-link-integrity` (cross-tier-invariants.yaml)
-- monitors that every non-NULL slug references an existing gbrain page.
--
-- Reversibility: 4/5 — drop columns + drop indexes. NULL-able so existing
-- rows already populated (pre-gbrain CLA runs) need no backfill.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- ops.capability_runs.gbrain_proposal_slug
-- Set by capability-lifecycle/problem-framer skill at Phase 1 with the
-- slug of ideas/<capability_id>-proposal gbrain page.
-- ---------------------------------------------------------------------------
ALTER TABLE ops.capability_runs
  ADD COLUMN gbrain_proposal_slug text NULL;

COMMENT ON COLUMN ops.capability_runs.gbrain_proposal_slug IS
  'Slug of the gbrain ideas/<capability_id>-proposal page authored at Phase 1 by capability-lifecycle/problem-framer skill (capability gbrain-operational-brain v1.0). NULL for runs that predate gbrain integration OR were started with --no-brain flag.';

-- Partial index for lookups (most rows have NULL — only CLA runs after
-- gbrain integration land carry the slug).
CREATE INDEX IF NOT EXISTS idx_capability_runs_gbrain_proposal_slug
  ON ops.capability_runs (gbrain_proposal_slug)
  WHERE gbrain_proposal_slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- ops.capability_phase_events.gbrain_meeting_slug
-- Set by capability-lifecycle/implementation-coordinator skill at each
-- Phase 7 sprint completion. Slug of meetings/<merge-date>-<cap>-sprint-N-review.
-- ---------------------------------------------------------------------------
ALTER TABLE ops.capability_phase_events
  ADD COLUMN gbrain_meeting_slug text NULL;

COMMENT ON COLUMN ops.capability_phase_events.gbrain_meeting_slug IS
  'Slug of the gbrain meetings/<merge-date>-<capability_id>-sprint-<N>-review page authored at each Phase 7 sprint-completed event by capability-lifecycle/implementation-coordinator skill (capability gbrain-operational-brain v1.0). NULL for non-sprint events OR pre-gbrain runs.';

CREATE INDEX IF NOT EXISTS idx_phase_events_gbrain_meeting_slug
  ON ops.capability_phase_events (gbrain_meeting_slug)
  WHERE gbrain_meeting_slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- ops.decisions.gbrain_concept_slug
-- Set by capability-lifecycle/architect skill at Phase 5 (architect output)
-- AND by ad-hoc Muse-panel decisions. Slug of concepts/<cap>-architecture
-- or concepts/<topic>-decision-log.
-- ---------------------------------------------------------------------------
ALTER TABLE ops.decisions
  ADD COLUMN gbrain_concept_slug text NULL;

COMMENT ON COLUMN ops.decisions.gbrain_concept_slug IS
  'Slug of the gbrain concepts/ page that holds the narrative + architectural reasoning for this decision (capability gbrain-operational-brain v1.0). Set by capability-lifecycle/architect at Phase 5 OR by ad-hoc Muse-panel decisions. NULL for pre-gbrain decisions.';

CREATE INDEX IF NOT EXISTS idx_decisions_gbrain_concept_slug
  ON ops.decisions (gbrain_concept_slug)
  WHERE gbrain_concept_slug IS NOT NULL;

COMMIT;

-- ============================================================================
-- Post-migration verification (run manually after `supabase db push`)
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'ops'
--   AND table_name IN ('capability_runs', 'capability_phase_events', 'decisions')
--   AND column_name LIKE 'gbrain%';
--
-- Expected: 3 rows, all is_nullable='YES', data_type='text'.
--
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname = 'ops' AND indexname LIKE 'idx_%gbrain%';
--
-- Expected: 3 rows (idx_capability_runs_gbrain_proposal_slug, idx_phase_events_gbrain_meeting_slug, idx_decisions_gbrain_concept_slug).
