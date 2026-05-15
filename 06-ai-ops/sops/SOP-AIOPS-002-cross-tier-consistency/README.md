# SOP-AIOPS-002 — Cross-Tier Consistency Engine

**Status:** Scaffold (v1.0b — Phase 1 only)
**Version:** 1.0.0
**Pillar:** 05-ai-ops

## Purpose

Catch drift between linked artifacts (Tier 1 git ↔ Tier 2 Supabase ↔ skills/hooks/schedules) automatically, route it through `ops.hitl_runs` per severity, and propose fixes via auto-PR when confidence is high enough.

**Without this SOP:** Drift surfaces only when a human reads the affected file and notices the lie. By then, downstream agents may have made decisions on stale truth.

**With this SOP:** Every Tier 1 modification is checked at three layers (L1 pre-commit, L2 CI, L3 nightly sweep). Failures land as rows in `ops.consistency_checks` with severity → HITL tier mapping. Founder sees only the items that genuinely need review.

## Three detection layers

```
L1 pre-commit (.husky/pre-commit) — ~3s local
  ↓ runs validate-tier1.cjs + 3 critical L2 validators
L2 CI workflow (.github/workflows/cross-tier-consistency.yml) — ~30s
  ↓ runs all 5 L2 validators (3 critical block PR, 2 warn continue-on-error)
L3 nightly sweep (this SOP) — scheduled
  ↓ inserts pending consistency_checks rows for each L3 invariant
  ↓ (v1.0c) worker ticks claim pending rows + run checks against live DB
  ↓ (v1.1) drift-fix-proposer generates auto-PR
```

## v1.0b implementation scope

- ✅ Migration `00021_consistency_checks.sql` (lifecycle table)
- ✅ Skill `consistency-sweep` (dispatcher — inserts pending rows)
- ✅ Schedule `consistency-sweep-nightly` (03:00 UTC daily)
- ✅ Event types: `consistency.drift_detected`, `consistency.fix_proposed`, `consistency.fix_merged`, `consistency.fix_reverted`, `consistency.drift_batch_pending`
- ✅ Event subscriptions in `event-subscriptions.yaml` routing all 5 events here
- ⏳ Check execution (v1.0c) — requires Postgres helper RPC functions for live-DB metadata reads
- ⏳ Auto-PR fix proposer (v1.1) — requires `GITHUB_CONSISTENCY_BOT_TOKEN` provisioning
- ⏳ AI cross-doc claim verifier (v1.2) — narrowed to marker-comment scope

## Lifecycle states

```
pending → running → passed | failed | cancelled
failed → fix_proposed (v1.1+)
fix_proposed → fix_merged | fix_reverted | wont_fix
fix_reverted → wont_fix (revert depth cap = 1)
```

Once `(invariant_id, target_path) = wont_fix`, subsequent sweeps skip — prevents alert fatigue.

## How to add a new invariant

1. Edit `knowledge/cross-tier-invariants.yaml` — add an entry with id, kind, source, target, severity, hitl_tier, fix_strategy
2. If L1/L2: the existing validators read the new entry; no code change
3. If L3 (live-DB / AI semantic): add to `supabase/functions/_shared/invariants.ts` `L3_INVARIANTS` list (until the bundler ships in v1.0c)
4. Validate via `node scripts/validate-tier1.cjs`
5. Open PR

## References

- CEO plan: `.archives/ceo-plans/2026-05-14-cross-tier-consistency-engine.md`
- Test plan: `.archives/ceo-plans/2026-05-14-cross-tier-consistency-engine-TEST-PLAN.md`
- Migration: `supabase/migrations/00021_consistency_checks.sql`
- Invariants: `knowledge/cross-tier-invariants.yaml`
- Sweep skill: `supabase/functions/_shared/worker.ts` (`makeConsistencySweepHandler`)
- Schedule: `knowledge/schedules.yaml` (`consistency-sweep-nightly`)
- Event subscriptions: `knowledge/event-subscriptions.yaml`
