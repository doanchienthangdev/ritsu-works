# TODOS

Project-level deferred work. Append-only; do not delete completed items —
move to a `## Done` section instead.

## P2 — Soon

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
New skill `drift-weekly-retro` in `05-ai-ops/skills/`. Aggregates
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
