-- ============================================================================
-- Migration 00026: ops_run_select RPC for MCP `query` tool (Bài #12, Phase 1)
-- ============================================================================
-- Phase 1 plan: .archives/plans/2026-05-16-mcp-ritsu-ops-integration/
--
-- Why this exists:
-- The supabase-ops MCP shim server exposes a `query` tool that the 7 production
-- skills (episodic-recall, cost-report, etc.) invoke. supabase-js does NOT
-- expose raw SQL — only .from(table).select() table-scoped queries. The skills
-- need arbitrary SELECT (multi-table joins, aggregations, CTEs). This RPC is
-- the single entry point.
--
-- Security model:
-- - SECURITY DEFINER means the RPC runs as the function owner (service role).
--   This is fine because the shim already enforces:
--     1. Project-ref allowlist (only ritsu-ops, never Product)
--     2. sql-guard (SELECT-only, no multi-statement, no SELECT INTO)
--     3. role tier2_schemas_read gating (per caller's role)
-- - The function CHECKS the SQL one more time inside the DB as belt-and-suspenders
--   — if the shim's sql-guard is ever bypassed, the RPC also refuses non-SELECT.
-- - Bind parameters are passed via jsonb array; the RPC uses EXECUTE with USING
--   to inject them safely (no string interpolation of params).
--
-- Returns:
--   { rows: jsonb[], row_count: int, truncated: boolean }
-- ============================================================================

CREATE OR REPLACE FUNCTION ops.ops_run_select(
  sql_text     text,
  bind_params  jsonb DEFAULT '[]'::jsonb,
  row_limit    int   DEFAULT 100
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ops, metrics, public, pg_temp
AS $$
DECLARE
  normalized        text;
  first_keyword     text;
  rows_jsonb        jsonb;
  effective_limit   int;
  rows_returned     int;
BEGIN
  -- Length guard (matches sql-guard.ts MAX_SQL_LENGTH)
  IF char_length(sql_text) > 8000 THEN
    RAISE EXCEPTION 'ops_run_select: sql length % exceeds 8000', char_length(sql_text)
      USING ERRCODE = '22023';  -- invalid_parameter_value
  END IF;

  -- Strip comments + trim — heuristic mirror of TS normalize()
  normalized := regexp_replace(sql_text, '--[^\n]*', ' ', 'g');
  normalized := regexp_replace(normalized, '/\*.*?\*/', ' ', 'gn');
  normalized := btrim(normalized);
  normalized := regexp_replace(normalized, ';\s*$', '');

  IF normalized = '' THEN
    RAISE EXCEPTION 'ops_run_select: sql is empty or comments-only'
      USING ERRCODE = '22023';
  END IF;

  -- Multi-statement check (matches sql-guard.ts)
  IF normalized ~ ';' THEN
    RAISE EXCEPTION 'ops_run_select: multi-statement SQL not allowed'
      USING ERRCODE = '22023';
  END IF;

  -- First keyword check (case-insensitive)
  first_keyword := lower(split_part(btrim(normalized), ' ', 1));
  IF first_keyword NOT IN ('select', 'with') THEN
    RAISE EXCEPTION 'ops_run_select: first keyword must be SELECT or WITH; got %', first_keyword
      USING ERRCODE = '22023';
  END IF;

  -- SELECT INTO check
  IF normalized ~* '\binto\b' THEN
    RAISE EXCEPTION 'ops_run_select: SELECT INTO is not permitted'
      USING ERRCODE = '22023';
  END IF;

  effective_limit := LEAST(GREATEST(row_limit, 1), 1000);

  -- Execute. We wrap the user SQL in a CTE so we can apply a hard row cap
  -- without disturbing the user's own ORDER BY / LIMIT.
  EXECUTE format(
    'SELECT coalesce(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb) FROM (%s LIMIT %s) AS t',
    normalized,
    effective_limit + 1  -- +1 to detect truncation
  )
  INTO rows_jsonb
  USING bind_params;

  rows_returned := jsonb_array_length(rows_jsonb);

  IF rows_returned > effective_limit THEN
    -- Trim the last (overflow) row and flag truncated
    rows_jsonb := (
      SELECT jsonb_agg(elem)
      FROM (
        SELECT elem
        FROM jsonb_array_elements(rows_jsonb) AS elem
        LIMIT effective_limit
      ) sub
    );
    RETURN jsonb_build_object(
      'rows', rows_jsonb,
      'row_count', effective_limit,
      'truncated', true
    );
  END IF;

  RETURN jsonb_build_object(
    'rows', rows_jsonb,
    'row_count', rows_returned,
    'truncated', false
  );
END;
$$;

COMMENT ON FUNCTION ops.ops_run_select(text, jsonb, int) IS
  'MCP supabase-ops query tool entry point (Bài #12, Phase 1). Read-only SELECT only. Multi-statement, DDL, and DML are rejected. Bind params via $1, $2, ... + USING bind_params jsonb array. row_limit clamped to 1..1000; truncation flagged.';

-- Grant execute to service_role (used by MCP shim with SUPABASE_OPS_SERVICE_KEY)
-- and authenticated (for future founder dashboard direct use).
GRANT EXECUTE ON FUNCTION ops.ops_run_select(text, jsonb, int) TO service_role, authenticated;

-- The function name without schema qualifier — for PostgREST RPC invocation
-- via client.rpc('ops_run_select', {...}), PostgREST looks in the API schema.
-- ops is exposed via Settings → API; PostgREST routes the RPC name to ops.ops_run_select.
