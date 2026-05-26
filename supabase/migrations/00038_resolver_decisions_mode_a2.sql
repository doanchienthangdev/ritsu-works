-- Migration 00038 — Resolver v3 Mode A2 (JIT MCP find())
--
-- Capability: resolver-v3-jit-loading v3.0.0 (Sprint 2)
-- ops.capability_runs id: 1fa9208d-2fda-45de-ac72-728998b1d33f
-- ops.decisions id: 3f71c5d8-a54d-4116-9a14-ff6216b46339
--
-- Extends ops.resolver_decisions.mode CHECK constraint to include 'A2'.
-- Mode taxonomy (post-v3):
--   A   = in-session ambient (v2 — model reads CLAUDE.md preamble catalog)
--   A2  = JIT MCP find() (v3 NEW — model invokes mcp__resolver__find at point of need)
--   B   = explicit /resolver query (in-session LLM-mediated)
--   C   = keyword fallback (CRON, Edge Functions, non-LLM consumers)
--
-- Additive — no breaking change to existing v2.2 audit rows.
-- Rollback: ALTER CHECK back to (A, B, C); existing A2 rows would orphan the constraint.

BEGIN;

ALTER TABLE ops.resolver_decisions
  DROP CONSTRAINT IF EXISTS resolver_decisions_mode_check;

ALTER TABLE ops.resolver_decisions
  ADD CONSTRAINT resolver_decisions_mode_check
  CHECK (mode IN ('A', 'B', 'C', 'A2'));

COMMENT ON COLUMN ops.resolver_decisions.mode IS
  'A=in-session ambient (v2), A2=JIT MCP find() (v3), B=explicit /resolver query, C=keyword fallback';

-- Sanity check: no existing row has invalid mode
DO $$
DECLARE
  invalid_count int;
BEGIN
  SELECT count(*) INTO invalid_count
  FROM ops.resolver_decisions
  WHERE mode NOT IN ('A', 'B', 'C', 'A2');
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Migration 00038 abort: % rows have invalid mode value', invalid_count;
  END IF;
END $$;

COMMIT;
