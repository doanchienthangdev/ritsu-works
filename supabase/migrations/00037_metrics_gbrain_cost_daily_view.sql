-- ============================================================================
-- 00037_metrics_gbrain_cost_daily_view.sql
--
-- Capability: gbrain-operational-brain v1.0 (Sprint 3 / Tier C — optional)
-- Sprint 6 v1.0.1 HOTFIX: original Sprint 3 attempt errored because the
-- view referenced a non-existent `cost_bucket` column. Actual schema of
-- ops.cost_attributions has agent_role + task_kind dimensions (per
-- supabase/migrations/00017_economic_architecture_tables.sql). View
-- rewritten to use real column names with task_kind LIKE 'gbrain.%'
-- convention (cost_bucket convention from spec.md §5 retroactively maps
-- to task_kind='gbrain.<op>' + agent_role='<role>'; v1.1 follow-up
-- aligns spec docs).
--
-- Creates a daily rollup view of gbrain cost-attribution entries from
-- ops.cost_attributions. Consumed by:
--   - synthesize-morning-brief skill (daily founder brief surfaces top
--     gbrain spend roles + ops)
--   - cost-report skill (`/cost gbrain` queries this view)
--   - brain.cost_usd_monthly_rolling30d KPI (registered Sprint 2 PR #101)
--   - .mcp.json wrapper scripts/pre-budget-check.sh (Sprint 5) consults
--     this view to enforce the $100/mo HARD cap
--
-- Naming convention (v1.0.1 corrected): every gbrain MCP call logs to
-- ops.cost_attributions with:
--   - agent_role = '<caller-role>' (e.g. 'customer-lead', 'gbrain-maintainer')
--   - task_kind  = 'gbrain.<op>' (e.g. 'gbrain.put_page', 'gbrain.search',
--                                'gbrain.dream_cycle')
-- The view derives the (role, op) breakdown by splitting task_kind on the
-- 'gbrain.' prefix.
--
-- Reversibility: 5/5 — drop view. No data loss; underlying
-- ops.cost_attributions rows preserved.
-- ============================================================================

BEGIN;

CREATE OR REPLACE VIEW metrics.gbrain_cost_daily AS
SELECT
  date_trunc('day', ts)::date                              AS day,
  agent_role                                               AS role,
  REPLACE(task_kind, 'gbrain.', '')                        AS op,
  SUM(cost_usd)                                            AS spend_usd,
  COUNT(*)                                                 AS call_count,
  MIN(ts)                                                  AS first_call_ts,
  MAX(ts)                                                  AS last_call_ts
FROM ops.cost_attributions
WHERE task_kind LIKE 'gbrain.%'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

COMMENT ON VIEW metrics.gbrain_cost_daily IS
  'Daily rollup of ops.cost_attributions filtered to task_kind LIKE ''gbrain.%''. Splits by agent_role + op (from task_kind suffix). Capability gbrain-operational-brain v1.0.1 hotfix. Consumed by synthesize-morning-brief, cost-report, brain.cost_usd_monthly_rolling30d KPI, and Sprint 5 .mcp.json wrapper scripts/pre-budget-check.sh for $100/mo HARD cap enforcement (Hard-cap Option B graceful degrade).';

-- Helper function the .mcp.json wrapper calls instead of a raw view query.
-- Returns total spend over the rolling N days as a single numeric.
CREATE OR REPLACE FUNCTION metrics.sum_gbrain_cost_rolling(days_back integer DEFAULT 30)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(spend_usd), 0)::numeric
  FROM metrics.gbrain_cost_daily
  WHERE day > current_date - (days_back || ' days')::interval;
$$;

COMMENT ON FUNCTION metrics.sum_gbrain_cost_rolling(integer) IS
  'Convenience function for scripts/pre-budget-check.sh — returns total gbrain spend over rolling N days (default 30). v1.0.1 capability gbrain-operational-brain hotfix.';

COMMIT;

-- ============================================================================
-- Post-migration verification (run manually after `supabase db push`)
-- ============================================================================
-- SELECT viewname FROM pg_views
-- WHERE schemaname = 'metrics' AND viewname = 'gbrain_cost_daily';
-- Expected: 1 row.
--
-- SELECT * FROM metrics.gbrain_cost_daily LIMIT 5;
-- Expected: empty (no gbrain.* task_kind rows yet; populates as Sprint 5
-- .mcp.json wrapper ships + workforce starts hitting gbrain MCP).
--
-- SELECT metrics.sum_gbrain_cost_rolling(30);
-- Expected: 0 (no spend yet); used by scripts/pre-budget-check.sh.
