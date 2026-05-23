-- Migration: 00035_resolver_decisions_llm_reasoning
-- Author: founder (resolver v2 LLM-native catalog)
-- Date: 2026-05-23
-- Purpose: Extend ops.resolver_decisions to support v2 audit shape (Mode A/B/C,
--          LLM reasoning, composition outputs). Existing v1 rows preserved.
-- Spec: .archives/cla/resolver-v2/spec.md §8
-- Capability: resolver-v2 (capability_runs id: 342d05a8-2b77-4ed1-bd0c-2ce800c1462e)
-- Validation: validate-resolver-schema.cjs (rewritten in same PR)
--
-- NON-DESTRUCTIVE: ADD COLUMN only. v1 row at run_id=794cdaf5-69b0-404b-9a5b-6ff3623361a5 preserved.

BEGIN;

-- 1. New columns
ALTER TABLE ops.resolver_decisions
  ADD COLUMN IF NOT EXISTS llm_reasoning text,
  ADD COLUMN IF NOT EXISTS mode char(1) DEFAULT 'B',
  ADD COLUMN IF NOT EXISTS catalog_files_loaded text[],
  ADD COLUMN IF NOT EXISTS composition_supporting text[];

-- 2. Constraints: mode must be 'A' | 'B' | 'C'
ALTER TABLE ops.resolver_decisions
  ADD CONSTRAINT resolver_decisions_mode_valid
  CHECK (mode IN ('A', 'B', 'C'));

-- 3. Indexes for v2 query patterns
-- Per-mode aggregation (which mode is most-used; v1 active-learning loop CP-1)
CREATE INDEX IF NOT EXISTS resolver_decisions_mode_idx
  ON ops.resolver_decisions(mode, ts);

-- Composition usage analytics (how often supporting recipients invoked together)
CREATE INDEX IF NOT EXISTS resolver_decisions_has_composition_idx
  ON ops.resolver_decisions(ts)
  WHERE composition_supporting IS NOT NULL AND array_length(composition_supporting, 1) > 0;

-- 4. Comments documenting new columns
COMMENT ON COLUMN ops.resolver_decisions.llm_reasoning IS
  'v2 LLM-native: optional natural-language explanation from LLM about why this recipient was chosen (Mode B only). Truncated at 2000 chars by audit.cjs.';

COMMENT ON COLUMN ops.resolver_decisions.mode IS
  'v2 LLM-native: A=in-session ambient (no resolver call needed), B=explicit /resolver query, C=keyword fallback for non-LLM consumers. Default ''B'' for backward compat with v1 rows.';

COMMENT ON COLUMN ops.resolver_decisions.catalog_files_loaded IS
  'v2 LLM-native: which recipient catalog files (knowledge/recipients/*.md) contributed to this decision.';

COMMENT ON COLUMN ops.resolver_decisions.composition_supporting IS
  'v2 LLM-native: supporting recipient IDs returned alongside primary (composition assembly). E.g., for trigger "onboard customer", primary=skill/customer-onboarding, supporting=[persona/cs-coach, sop/SOP-CUSTOMER-006].';

-- 5. Backfill v1 row mode to 'B' (was inserted via /resolver query slash command)
UPDATE ops.resolver_decisions
  SET mode = 'B'
  WHERE mode IS NULL;

COMMIT;
