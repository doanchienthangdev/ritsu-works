-- ============================================================================
-- 00037_metrics_gbrain_cost_daily_view.sql
--
-- Capability: gbrain-operational-brain v1.0 (Sprint 3 / Tier C — optional)
-- Bundled with 00036_gbrain_cla_cross_links.sql per @cto callout to reduce
-- per-sprint Tier C ceremony overhead.
--
-- Creates a daily rollup view of gbrain cost-bucket entries from
-- ops.cost_attributions. Consumed by:
--   - synthesize-morning-brief skill (daily founder brief surfaces top
--     gbrain spend roles + ops)
--   - cost-report skill (`/cost gbrain` queries this view)
--   - brain.cost_usd_monthly_rolling30d KPI (registered Sprint 2 PR #101)
--   - .mcp.json wrapper scripts/pre-budget-check.sh (Sprint 5) consults
--     this view to enforce the $100/mo HARD cap
--
-- Naming convention: cost_bucket follows gbrain.<role>.<op> for per-role
-- attribution, or gbrain.shared.<op> for cross-role buckets (gbrain.shared.search,
-- gbrain.shared.embedding). See knowledge/economic-architecture.md v1.1
-- addendum for the full convention.
--
-- Reversibility: 5/5 — drop view. No data loss; underlying ops.cost_attributions
-- rows remain.
-- ============================================================================

BEGIN;

CREATE OR REPLACE VIEW metrics.gbrain_cost_daily AS
SELECT
  date_trunc('day', ts)::date                              AS day,
  split_part(cost_bucket, '.', 2)                           AS role,
  split_part(cost_bucket, '.', 3)                           AS op,
  SUM(usd)                                                  AS spend_usd,
  COUNT(*)                                                  AS call_count,
  MIN(ts)                                                   AS first_call_ts,
  MAX(ts)                                                   AS last_call_ts
FROM ops.cost_attributions
WHERE cost_bucket LIKE 'gbrain.%'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

COMMENT ON VIEW metrics.gbrain_cost_daily IS
  'Daily rollup of ops.cost_attributions filtered to gbrain.* buckets. Splits cost_bucket into role + op components for per-role per-op aggregation. Capability gbrain-operational-brain v1.0. Consumed by synthesize-morning-brief, cost-report, brain.cost_usd_monthly_rolling30d KPI, and Sprint 5 .mcp.json wrapper budget enforcement.';

COMMIT;

-- ============================================================================
-- Post-migration verification (run manually after `supabase db push`)
-- ============================================================================
-- SELECT viewname FROM pg_views
-- WHERE schemaname = 'metrics' AND viewname = 'gbrain_cost_daily';
-- Expected: 1 row.
--
-- SELECT * FROM metrics.gbrain_cost_daily LIMIT 5;
-- Expected: empty (no gbrain.* cost rows yet; populates as Sprint 5
-- .mcp.json wrapper ships + workforce starts hitting gbrain MCP).
--
-- Example usage post-Sprint-5 (rolling 30d sum for $100 cap enforcement):
-- SELECT SUM(spend_usd) FROM metrics.gbrain_cost_daily
-- WHERE day > current_date - interval '30 days';
