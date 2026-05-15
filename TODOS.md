# TODOS

Project-level deferred work. Append-only; do not delete completed items —
move to a `## Done` section instead.

## P2 — Soon

### Migrate 2 pre-contract SOPs to flow-schema.yaml conformance

`05-ai-ops/sops/SOP-AIOPS-001-capability-lifecycle/flow.yaml` and `06-ai-ops/sops/SOP-AIOPS-002-cross-tier-consistency/flow.yaml` (paths post Phase 2 rename) predate SOP-AIOPS-003 runtime contract. Both currently fail validation by SOP-AIOPS-004 smoke test.

**Why:** These SOPs work today but would fail CI gating once SOP-AIOPS-004 is wired to `pnpm check`. Either migrate them to the schema, or document an explicit exemption in the validator.
**Pros:** Brings full repo to single contract. Removes "two formats" cognitive load.
**Cons:** Touches working code. Requires understanding existing flow.yaml semantics.
**Effort:** S (CC ~30 min for both)
**Priority:** P2 — not blocking pillar restructure, but blocking CI gating of new SOPs.
**Depends on:** Phase 2 of pillar architecture v1.0.1 migration (rename 05-ai-ops → 06-ai-ops)
**Surfaced from:** /plan-eng-review 2026-05-15 (pillar architecture v1.0.1, validator first run)

---

### Update ops.campaigns.pillar default value (was '01-growth')

`supabase/migrations/00018_orchestration_storage_growth.sql` line 64 sets `pillar text NOT NULL DEFAULT '01-growth'`. After pillar architecture v1.0.1 migration, '01-growth' is deprecated. New campaigns inserted without explicit pillar value get a deprecated value.

**Why:** Currently no production campaigns (0 paying users), so no real data corruption today. But before launching marketing operations, fix the default.
**Pros:** Prevents silent default-to-deprecated-value bug at scale.
**Cons:** Requires a new migration. Needs decision on new default value (likely '03-gtm' for stage-pillar-owned campaigns, or '01-marketing' for evergreen-owned).
**Effort:** S (CC ~15 min for migration + decision)
**Priority:** P2 — pre-launch, before first campaign created.
**Depends on:** Phase 2 of pillar architecture v1.0.1 migration
**Surfaced from:** /plan-eng-review 2026-05-15 (post-eng-review scan, retroactive Eng E6)

---

### E5 — Pre-edit linkage warning hook
Extend `.claude/hooks/pre-edit-tier1.md` to read `knowledge/cross-tier-invariants.yaml`
and warn when the file being edited has linked invariants. Format: "this file is
linked to X, Y, Z via invariants A, B, C — consider checking them after your edit."

**Why:** Catches drift BEFORE commit, earlier than L1/L2/L3 sweeps. Zero token
cost, zero runtime overhead.
**Pros:** Earliest possible detection point. Educative — shows linkage graph
during edit.
**Cons:** Only fires when agent reads the hook; humans editing directly don't
benefit. Limited scope.
**Effort:** S (CC ~15 min)
**Priority:** P2
**Depends on:** v1.0 ship (needs `cross-tier-invariants.yaml` to exist)
**Surfaced from:** /plan-ceo-review 2026-05-14 (cross-tier consistency engine)

---

### F1 — Drift weekly retro skill
New skill `drift-weekly-retro` in `06-ai-ops/skills/`. Aggregates
`ops.consistency_checks` over past 7 days. Outputs: most-drifting invariants,
average MTTD, false-positive rate, recurring patterns suggesting architectural
refactor. Posts to Telegram + appends to `_build/notes/`.

**Why:** Turns operational data into architectural insight. Drift patterns
reveal coupling problems worth refactoring upstream.
**Pros:** Compounds value of the consistency engine. Makes systemic problems
visible.
**Cons:** Only valuable after 30+ days of data. Premature to ship before then.
**Effort:** M (CC ~30 min)
**Priority:** P3
**Depends on:** v1.1 ship + 30 days runtime
**Surfaced from:** /plan-ceo-review 2026-05-14

---

### F4 — Telegram PR approve/reject UX
Build inline Telegram buttons on drift-fix PR notifications: `[Approve & merge]`
`[Reject]` `[View diff]`. Bot calls gh CLI to action the PR.

**Why:** Founder ergonomic for PR review without leaving Telegram.
**Pros:** True "30-second review" experience promised in vision.
**Cons:** GitHub mobile is already excellent. Building this only worthwhile if
PR volume grows past ~5/day. Most likely permanent-deferred.
**Effort:** L (CC ~1h)
**Priority:** P3
**Depends on:** PR volume exceeding manual-review capacity (unlikely v1.x)
**Surfaced from:** /plan-ceo-review 2026-05-14
