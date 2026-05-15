# TODOS

Project-level deferred work. Append-only; do not delete completed items —
move to a `## Done` section instead.

## P2 — Soon

### Hook runtime implementation (covers all 10 hook specs incl. persona hooks)

All hooks in `.claude/hooks/*.md` are SPECS — markdown documentation of intended behavior. **None execute at runtime.** Per `.claude/hooks/README.md`: "This folder contains **specs** for hooks at v0.2. Implementation (actual executable code) happens in Phase C of `_build/ROADMAP.md`."

Affected hooks (10 total):
- 8 pre-existing: `pre-bash-dangerous`, `pre-delegate-check`, `pre-edit-tier1`, `pre-llm-call-budget`, `pre-tool-customer-message`, `pre-tool-publish`, `pre-tool-secrets`, `pre-tool-supabase-product`
- 2 new (added by workforce Phase 1, PR #19): `pre-persona-resolve`, `post-persona-log`

**Consequences of unwired runtime:**
- `ops.agent_runs.persona_slug` column (migration 00024) exists but stays NULL — `post-persona-log` is supposed to populate it.
- `06-ai-ops/workforce-personas/<slug>/dossier.md` files stay at empty stubs — `post-persona-log` is supposed to append entries.
- HITL tier classification of actions is on the honor system — `pre-delegate-check` is supposed to enforce.
- The 5 invariants in `validate-personas.cjs` still enforce drift via `pnpm check`, so static state stays consistent. Only runtime state (persona_slug + dossier) is missing.

**What's needed to close the gap:**
1. Pick implementation language per SPEC.md (Python or TypeScript; "whichever the team picks first; don't mix per-hook").
2. Implement each `.md` spec as a script in same folder. Input: JSON via stdin. Output: JSON via stdout (per SPEC.md §Input/Output).
3. Add `.claude/settings.json` with hook entries pointing to the script paths.
4. Test with `claude --debug` to verify hooks fire on tool calls.
5. Add hook-test fixtures in `tests/hooks/`.

**Why:** Currently every governance rule (HITL tiers, budget caps, persona narrowing, Tier 1 edit gating) is on the honor system. Hooks are the difference between "agents should follow HITL.md" and "agents cannot violate HITL.md."
**Pros:** Eliminates trust requirement on agents. Activates the persona_slug audit trail. Auto-populates dossier.md files.
**Cons:** ~3-5 hours engineering work per hook (10 hooks total = ~30-50h). Tests need real Claude Code session fixtures. Hook errors can hard-block agent if not careful — needs fail_mode=open default during rollout.
**Effort:** L (full implementation), M (per-hook MVP)
**Priority:** P2 — the static validators provide most of the safety today. Runtime hooks are the proper enforcement; workaround is human review at PR/Telegram time.
**Depends on:** Phase C of `_build/ROADMAP.md` (not yet authored)
**Surfaced from:** workforce Phase 1.5 hardening review 2026-05-15

---

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
