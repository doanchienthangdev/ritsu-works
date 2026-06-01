-- Migration 00046 — ops.v_forge_lineage view for /forge provenance.
--
-- Sprint 2 of capability `book-to-capability` (/forge) v0.1 (per spec §4.4 + sprint-plan.md).
--
-- Why a VIEW (not a table — @cto Phase-5): /forge runs are written to
-- ops.agent_runs with agent_slug='forge'. Provenance = (which wiki sources →
-- which funnel verdict → which route → resulting entity). evolve_extractions
-- already links a run's citations via agent_run_id (00040:22); the funnel
-- verdict + route live in ops.agent_runs.output_payload (gps can write
-- agent_runs but NOT ops.decisions — invariant #4). So no new table: this view
-- joins agent_runs ↔ evolve_extractions and surfaces the many-to-many
-- (1 capability ← N sources via source_refs; 1 source → N capabilities by
-- unnesting source_refs across rows). Mirrors 00041_v_entity_update_lineage.
--
-- Column convention: need / sources written to input_payload at INSERT;
-- forge_verdict / route / entity_target / spawned_run_id written to
-- output_payload on completion (per 06-ai-ops/skills/forge/orchestrator).
--
-- Consumed by: /forge history (future), forge.* KPIs, founder ad-hoc audits.
-- Capability: book-to-capability v0.1 (ops.capability_runs 487d0d1c;
-- Tier C build decision 721170f0). Sprint: 2 (final before Phase 8 promote).

CREATE OR REPLACE VIEW ops.v_forge_lineage AS
WITH forge_runs AS (
  SELECT
    ar.id AS run_id,
    ar.started_at,
    ar.ended_at,
    ar.input_payload->>'need' AS need,
    ar.state AS run_state,
    ar.outcome,
    ar.cost_usd,
    ar.error,
    ar.error_at_step,
    coalesce(ar.persona_slug, ar.input_payload->>'role') AS triggering_role,
    ar.output_payload->>'forge_verdict' AS forge_verdict,    -- PASS | REJECT
    ar.output_payload->>'route' AS route,                    -- extend | net-new | surface
    ar.output_payload->>'entity_target' AS entity_target,    -- the skill extended/created (NULL on REJECT/surface)
    ar.output_payload->>'spawned_run_id' AS spawned_run_id   -- the /update or /cla run that built it
  FROM ops.agent_runs ar
  WHERE ar.agent_slug = 'forge'
),
source_spine AS (
  -- The citation spine: per forge run, the distinct wiki sources that grounded it.
  -- This is the many-to-many: a run (→ one entity_target) carries N source_refs.
  SELECT
    agent_run_id,
    array_agg(DISTINCT ref_path ORDER BY ref_path) AS source_refs,
    count(*) AS citation_count,
    count(*) FILTER (WHERE review_state = 'auto_accepted')          AS auto_accepted_count,
    count(*) FILTER (WHERE review_state = 'pending_review')         AS pending_review_count,
    count(*) FILTER (WHERE review_state = 'rejected_low_confidence') AS rejected_low_confidence_count,
    count(*) FILTER (WHERE review_state = 'founder_accepted')        AS founder_accepted_count,
    count(*) FILTER (WHERE review_state = 'founder_rejected')        AS founder_rejected_count,
    count(*) FILTER (WHERE review_state = 'founder_edited')          AS founder_edited_count
  FROM ops.evolve_extractions
  GROUP BY agent_run_id
)
SELECT
  fr.run_id,
  fr.need,
  fr.forge_verdict,
  fr.route,
  fr.entity_target,
  fr.spawned_run_id,
  fr.started_at,
  fr.ended_at,
  fr.run_state,
  fr.outcome,
  fr.cost_usd,
  fr.error,
  fr.error_at_step,
  fr.triggering_role,
  coalesce(ss.source_refs, ARRAY[]::text[]) AS source_refs,
  coalesce(ss.citation_count, 0) AS citation_count,
  coalesce(ss.auto_accepted_count, 0) AS auto_accepted_count,
  coalesce(ss.pending_review_count, 0) AS pending_review_count,
  coalesce(ss.rejected_low_confidence_count, 0) AS rejected_low_confidence_count,
  coalesce(ss.founder_accepted_count, 0) AS founder_accepted_count,
  coalesce(ss.founder_rejected_count, 0) AS founder_rejected_count,
  coalesce(ss.founder_edited_count, 0) AS founder_edited_count,
  -- Lineage rank per resulting skill: 0 = most recent forge run touching this
  -- entity_target; 1 = next prior; etc. NULL entity_target (REJECT/surface) all
  -- group together under a single partition, ranked chronologically.
  ROW_NUMBER() OVER (
    PARTITION BY fr.entity_target
    ORDER BY fr.started_at DESC
  ) - 1 AS lineage_depth
FROM forge_runs fr
LEFT JOIN source_spine ss ON ss.agent_run_id = fr.run_id
ORDER BY fr.entity_target NULLS LAST, fr.started_at DESC;

COMMENT ON VIEW ops.v_forge_lineage IS
  'Provenance of /forge runs. One row per agent_run with agent_slug=forge; reads input_payload.need + output_payload.{forge_verdict,route,entity_target,spawned_run_id}; LEFT JOINs ops.evolve_extractions for the citation spine (source_refs array = the many-to-many: 1 capability <- N sources; unnest source_refs across rows for 1 source -> N capabilities) + review-state bucket counts. No new table (verdict sink = agent_runs.output_payload; gps cannot write ops.decisions). Capability book-to-capability v0.1 Sprint 2 (2026-06-01).';
