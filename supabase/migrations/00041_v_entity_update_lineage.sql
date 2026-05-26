-- Migration 00041 — ops.v_entity_update_lineage view for /update history.
--
-- Sprint 4 of capability `update` v1.0 (per spec §4 + sprint-plan.md).
--
-- Why a VIEW (not a table): /update runs are written to ops.agent_runs with
-- agent_slug='update'. The lineage chain for an entity is just the
-- chronological list of those runs, optionally JOINed with
-- ops.evolve_extractions counts + scores. Materializing as a view keeps
-- the data fresh + avoids dedicated lineage table maintenance.
--
-- Column convention: entity_type / entity_slug / triggering_role are written
-- to ops.agent_runs.input_payload at INSERT time. classification / k4_outcome
-- / score_pre / score_post / diff_id / pr_url are written to
-- ops.agent_runs.output_payload on phase completion.
--
-- Consumed by:
--   /update history <type> <name> (command subcommand from Sprint 3)
--   Sprint 4 KPI entity_update_run_count_monthly (aggregates this view)
--   founder ad-hoc audits
--
-- Capability: update v1.0 (capability_run_id: 16720cb5-f2fe-47f0-9d47-beaeca5f05e1)
-- Sprint: 4 (final sprint before Phase 8 promote)

CREATE OR REPLACE VIEW ops.v_entity_update_lineage AS
WITH update_runs AS (
  SELECT
    ar.id AS run_id,
    ar.started_at,
    ar.ended_at,
    ar.input_payload->>'entity_type' AS entity_type,
    ar.input_payload->>'entity_slug' AS entity_slug,
    coalesce(ar.persona_slug, ar.input_payload->>'role') AS triggering_role,
    ar.state AS run_state,
    ar.outcome,
    ar.cost_usd,
    ar.error,
    ar.error_at_step,
    ar.output_payload->>'classification' AS classification,
    ar.output_payload->>'k4_outcome' AS k4_outcome,
    ar.output_payload->>'diff_id' AS diff_id,
    ar.output_payload->>'pr_url' AS pr_url,
    ar.output_payload->>'score_pre' AS score_pre_text,
    ar.output_payload->>'score_post' AS score_post_text
  FROM ops.agent_runs ar
  WHERE ar.agent_slug = 'update'
),
extraction_counts AS (
  SELECT
    agent_run_id,
    count(*) FILTER (WHERE review_state = 'auto_accepted') AS auto_accepted_count,
    count(*) FILTER (WHERE review_state = 'pending_review') AS pending_review_count,
    count(*) FILTER (WHERE review_state = 'rejected_low_confidence') AS rejected_low_confidence_count,
    count(*) FILTER (WHERE review_state = 'founder_accepted') AS founder_accepted_count,
    count(*) FILTER (WHERE review_state = 'founder_rejected') AS founder_rejected_count,
    count(*) FILTER (WHERE review_state = 'founder_edited') AS founder_edited_count
  FROM ops.evolve_extractions
  GROUP BY agent_run_id
)
SELECT
  ur.run_id,
  ur.entity_type,
  ur.entity_slug,
  ur.started_at,
  ur.ended_at,
  ur.run_state,
  ur.outcome,
  ur.classification,
  ur.k4_outcome,
  ur.diff_id,
  ur.pr_url,
  ur.score_pre_text,
  ur.score_post_text,
  -- Derived: numeric score delta when both pre + post are integer-castable
  CASE
    WHEN ur.score_pre_text ~ '^-?[0-9]+$' AND ur.score_post_text ~ '^-?[0-9]+$'
    THEN (ur.score_post_text::int - ur.score_pre_text::int)
    ELSE NULL
  END AS score_delta,
  ur.cost_usd,
  ur.error,
  ur.error_at_step,
  ur.triggering_role,
  coalesce(ec.auto_accepted_count, 0) AS auto_accepted_count,
  coalesce(ec.pending_review_count, 0) AS pending_review_count,
  coalesce(ec.rejected_low_confidence_count, 0) AS rejected_low_confidence_count,
  coalesce(ec.founder_accepted_count, 0) AS founder_accepted_count,
  coalesce(ec.founder_rejected_count, 0) AS founder_rejected_count,
  coalesce(ec.founder_edited_count, 0) AS founder_edited_count,
  -- Lineage rank: 0 = most recent run for this entity; 1 = next prior; etc.
  ROW_NUMBER() OVER (
    PARTITION BY ur.entity_type, ur.entity_slug
    ORDER BY ur.started_at DESC
  ) - 1 AS lineage_depth
FROM update_runs ur
LEFT JOIN extraction_counts ec ON ec.agent_run_id = ur.run_id
ORDER BY ur.entity_type, ur.entity_slug, ur.started_at DESC;

COMMENT ON VIEW ops.v_entity_update_lineage IS
  'Chronological lineage of /update runs per entity. One row per agent_run with agent_slug=update; LEFT JOINs evolve_extractions bucket counts. lineage_depth column lets /update history filter to most-recent or chain-walk. Reads input_payload for entity_type/slug + persona_slug for role, output_payload for classification/k4_outcome/scores. v1.0 (2026-05-26).';
