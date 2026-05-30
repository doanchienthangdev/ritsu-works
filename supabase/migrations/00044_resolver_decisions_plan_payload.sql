-- ============================================================================
-- 00044_resolver_decisions_plan_payload.sql
-- Capability: resolver-plan v1.0 (Sprint 1)
-- ============================================================================
-- TWO first-class deliverables in one additive migration (per @cto Phase-5 review):
--   (1) REPAIR the pre-existing resolver-audit breakage: `mode` is char(1) on the
--       LIVE table, so the MCP tool's `mode:'A2'` inserts have been SILENTLY FAILING
--       since the v3 cutover (live: 2 rows, newest 2026-05-23; fire-and-forget catch
--       in resolver-find.ts swallows the char(1) overflow error). Widen the column and
--       reconcile the two conflicting CHECK constraints.
--   (2) ADD `plan_payload jsonb` for resolver-plan's plan-mode audit (discriminator:
--       plan rows = mode='A2' AND plan_payload IS NOT NULL).
--
-- Verified live state (@cto): mode = character(1); BOTH constraints present —
--   resolver_decisions_mode_valid  CHECK (mode IN ('A','B','C'))      [00035; never dropped]
--   resolver_decisions_mode_check  CHECK (mode IN ('A','B','C','A2')) [00038]
-- 00038's `DROP CONSTRAINT IF EXISTS resolver_decisions_mode_check` was a no-op (wrong
-- name at that time), so `_valid` still rejects 'A2'.
-- ============================================================================

-- (1a) Repair: widen mode so 'A2' (and any future short token) is storable.
ALTER TABLE ops.resolver_decisions
  ALTER COLUMN mode TYPE varchar(8);

-- (1b) Reconcile constraints to a single source of truth.
ALTER TABLE ops.resolver_decisions
  DROP CONSTRAINT IF EXISTS resolver_decisions_mode_valid;   -- stale (A,B,C); was rejecting A2
ALTER TABLE ops.resolver_decisions
  DROP CONSTRAINT IF EXISTS resolver_decisions_mode_check;
ALTER TABLE ops.resolver_decisions
  ADD CONSTRAINT resolver_decisions_mode_check
  CHECK (mode IN ('A','B','C','A2'));
-- NOTE (@cto): do NOT introduce a 'PLAN' token. Plan rows reuse mode='A2'
-- (the find call that backs them) + plan_payload IS NOT NULL as the discriminator.

-- (2) Plan-mode audit payload.
ALTER TABLE ops.resolver_decisions
  ADD COLUMN IF NOT EXISTS plan_payload jsonb;

COMMENT ON COLUMN ops.resolver_decisions.plan_payload IS
  'resolver-plan v1.0: the assembled ResolverPlan v1 (= populated context_recipe): content_axis[], capability_axis[] (tier-tagged), governance_constraints[], goal_metrics[], no_coverage[]. NULL for pure find() (Mode A2) rows; plan rows = mode=''A2'' AND plan_payload IS NOT NULL.';

CREATE INDEX IF NOT EXISTS idx_resolver_decisions_plan
  ON ops.resolver_decisions (ts)
  WHERE plan_payload IS NOT NULL;

-- Phase 7 regression test (REQUIRED): assert an 'A2' find-audit row AND a plan row
-- actually PERSIST (round-trip SELECT), proving the char(1) breakage is fixed and the
-- fire-and-forget path no longer silently drops audits.

-- Rollback (all reversible; widening + nullable col are safe):
--   DROP INDEX IF EXISTS ops.idx_resolver_decisions_plan;
--   ALTER TABLE ops.resolver_decisions DROP COLUMN IF EXISTS plan_payload;
--   -- (mode stays varchar(8) — harmless; or ALTER back to char(1) only if no A2/2-char rows exist)
