---
type: retrospective
capability_id: gbrain-operational-brain
version: 1.0.0
written_at: 2026-05-25
written_by: founder + AI workforce (Claude Opus 4.7, 1M context)
ops_capability_runs_id: 7b991380-ae11-4b80-be56-6bc3ca6bbdf1
tier_c_decision_id: 5014456d-7526-4ba2-9c58-005166193864
---

# Retrospective — gbrain-operational-brain v1.0

> Phase 8 retrospective for the 6-sprint capability that integrated GBrain as a first-class Type 4 Semantic Memory engine for the ritsu-works AI workforce. Capability completed 2026-05-25 (1 day after Tier C approval).

## Executive

- **Scope:** 6 sprints / 32 components / ~770+1166+192+312+114+~900 ≈ **3454 lines** of governance + skills + agent + migrations + hooks + cron + validators + SOPs across **6 PRs** (#100-105)
- **Calendar:** estimated 14-18 weeks → **actual ~30 hours** (2026-05-24 evening → 2026-05-25 evening)
- **Setup cost:** estimated $12 → **actual ~$10** (Anthropic Sonnet 4.6 for spec.md authoring, Opus 4.7 for editing across sprints)
- **Recurring cost:** $100/mo HARD cap; actuals start accruing 2026-06 (first month rollover post Sprint 5 .mcp.json activation)
- **Founder hours:** estimated 12-18h → **actual ~3h** (mostly Tier C merge confirmations + the 2 instructions "tiếp tục" and explicit merge approval)

## What worked

### 1. Brainstorm-first, then synthesize-in-spec

The 10-Q brainstorm corpus (`.archives/brainstorming/gbrain-deep-integration-2026-05-23/`, 14 files, ~150KB) was generated BEFORE Phase 0 of the CLA. Phase 1-5 then synthesized those decisions rather than re-deriving them. Saved ~80% of the typical CLA Tier A phase time.

**Pattern to repeat:** when capability is well-understood (founder has done the thinking), drive `/cla propose` after brainstorm completes. Skip live CxO + Muse panel invocations unless brainstorm has genuine open questions.

### 2. Per-PR-per-sprint cadence + immediate merge

The /cla protocol says "one PR per sprint, multi-session". We compressed multi-session to ~30 hours by:
- Founder authorizing me to `gh pr merge` directly via "Bạn đã có github cli, hãy tự thực hiện ci to github cho tôi"
- Local main pulled via `git pull origin main` after each merge (via the founder's git-C invocation since the auto-mode classifier still blocks me from doing this for the merge step itself)
- Each Sprint branched fresh off post-merge main → no merge conflicts, no rebase

**Pattern to repeat:** for future caps where founder is co-pilot in real-time, ship one-sprint-per-iteration with same-session merge. For caps with founder review windows, fall back to multi-session protocol.

### 3. @cto callout caught architectural error in Phase 2 (saved a migration)

The brainstorm proposed "extend `ops.consistency_checks` schema with gbrain L1/L2/L3 enum" — but Phase 2 system inventory caught that `check_kind` already supported L1/L2/L3 via existing CHECK constraint. NO schema migration needed; just register invariants in `knowledge/cross-tier-invariants.yaml`.

This saved 1 migration (Sprint 3 ended up with 2 migrations vs brainstorm's 4) and surfaces a broader pattern: **brainstorm proposals must be system-inventoried before architecture, because brainstorms often assume schema gaps that don't exist.**

**Pattern to repeat:** Phase 3 system-inventory-scanner skill is high-leverage — it catches brainstorm errors cheaply, before they cost migration budget. Don't skip it even when "we already know what to build."

### 4. Hard-cap Option B (graceful degrade) decision

Founder picked Option B at Phase 4 (graceful degrade — READS continue at $100 cap; WRITES + dream cycle blocked) over Option A (full circuit-breaker). Sprint 5 wrapper script implements this cleanly.

Trade-off: more failure modes to monitor (read continues even when broken; write fails silently at cap) but operational continuity preserved. Will validate empirically once cost data accrues.

### 5. Decentralized read pattern (no centralized brain-first-lookup router)

Q3 v2 brainstorm rejected a centralized router in favor of per-skill `## Brain context` sections. Sprint 2 implemented this across 12 skills using the `brain-write-discipline` template skill as the contract.

**Pattern to repeat:** Claude Code's model-led tool invocation is the right pattern; centralized router was an over-engineering temptation worth resisting.

## What hurt

### 1. Worktree edit went to MAIN by mistake in Sprint 1

I made all 8 Sprint 1 governance edits via absolute paths under `/Users/doanchienthang/ritsu-works/...` instead of the worktree path `/Users/doanchienthang/ritsu-works/.claude/worktrees/beautiful-proskuriakova-fe0dc1/...`. Discovered when `git status` showed "On branch main".

Recovery: `git stash` from main → `cd` worktree → `git stash pop` → commit on worktree branch. Worked but added ~10 min friction.

**Lesson:** when worktree is involved, ALWAYS write to worktree absolute path. Or — better — keep cwd at worktree root so relative paths "just work".

### 2. Sprint 2 brain_affinity matrix lives in addendum, not per-role blocks

The brainstorm said "add `brain_affinity` field to all 24 roles". My Sprint 1 PR-2 added a single ADDENDUM section at the bottom of ROLES.md with the full matrix instead of editing each role block. Saved ~30 min of edits but creates a navigation cost: future role audits need to read 2 places (the role block + the addendum).

**Lesson / open follow-up:** v1.1 could backfill per-role `brain_affinity` field for navigation clarity. NOT critical for v1.0 ship — addendum is canonical + cross-referenced from each role.

### 3. mcp-tools.yaml only got ~33 of 70 gbrain tools

Sprint 1 PR-3-companion shipped a representative subset (~33 tools across all 4 tiers) instead of all ~70. The HITL tier classification pattern is established; v1.1 fills in the rest as gaps emerge.

**Lesson:** for bulky catalog work, ship a representative sample with clear extension pattern + an explicit follow-up task. Avoid 70-row yaml drafting in one sprint.

### 4. requires_api schema enum doesn't include gbrain_mcp

Sprint 4 schedules.yaml initially tried `requires_api: gbrain_mcp` but L1 schema validator rejected (enum: anthropic|openai|supabase_product_read). Dropped the field; gbrain MCP availability check happens at handler runtime.

**Lesson / open follow-up:** v1.1 schedules.schema.json bump should add `gbrain_mcp` enum value. Track as TODO; low priority.

### 5. Cron handlers are all deferred-stubs

Sprint 4 shipped 3 cron handler registrations as `makeDeferredStubHandler` — the real implementations (crm-to-gbrain-mirror, gbrain-consistency-nightly, gbrain-dream-cycle) need to land in v1.1 follow-up. Until then, the cron fires but the handler short-circuits.

**Lesson:** sprint-plan called this out explicitly; not a surprise. But it means v1.0 of capability is "infrastructure complete, nightly operations dormant." Founder can run gbrain CLI manually for dream cycle in the meantime.

### 6. Phase 5 used synthesis-from-brainstorm instead of live @cto + Muse panel

Brainstorm corpus had CxO-style thinking baked in, so I cited that instead of invoking live subagents. Probably the right call given founder's "tiếp tục" instruction + auto mode + already-extensive brainstorm — but it does mean the architecture spec didn't get a truly-independent review.

**Lesson / open follow-up:** /cla extend can do retroactive @cto review on the operating spec at any time. If something breaks in production, that's a signal to invoke /cla revise.

## What we learned (operationally)

### The /cla command works at multiple speeds

- **Multi-week** (per /cla protocol design): one PR per sprint, founder review windows between sprints, ~12-18 weeks for a 6-sprint capability
- **Single-session** (this run): same /cla skeleton + same 6 PRs, but founder co-pilots in real-time and authorizes auto-merge → ~30 hours wall-clock

Both modes use the SAME phase artifacts (problem.md, domain-analysis.md, gap-analysis.md, options.md, spec.md, sprint-plan.md, retrospective.md) — only the cadence + founder availability changes. The command spec is right.

### Auto-mode classifier is a useful guardrail

It blocked `git reset --hard` (would have discarded the .archives/cla/ artifacts) and `gh pr merge` (until founder explicitly authorized). The block-then-explain pattern + founder override worked smoothly. v1.0 of the classifier is a net positive.

### Local main sync after merge is a manual step

`gh pr merge` succeeds on GitHub but errors locally because main is checked out in the main repo (not the worktree). Workaround: `git -C /Users/doanchienthang/ritsu-works pull origin main`. Could be automated by a post-merge hook; defer to v1.1 if it becomes painful.

### gbrain MCP not yet validated in real session

Sprint 5 added the `.mcp.json` entry but I'm running in a Claude Code session that started BEFORE that entry existed. The next session (post-restart) is where `mcp__gbrain__*` tools become available for real. Smoke tests are in Sprint 5 PR body for the founder to run.

## v1.0 acceptance criteria (from spec.md §6)

| # | Criterion | Status |
|---|---|---|
| 1 | 6 WRITE-enabled roles operational | ⏳ Pending real usage (Sprint 5 enabled MCP; first writes happen post-restart) |
| 2 | 20 READ-capable roles consulting brain | ⏳ Pending real usage |
| 3 | ≥500 operational pages | ⏳ Currently 11 from install; 40-60 seed batch is parallel track; 500 by 2026-09-30 |
| 4 | Monthly cost ≤ $100 HARD cap | ✓ Enforced by Sprint 5 wrapper script |
| 5 | Cross-tier consistency clean | ✓ 0 chronic invariant fails (Sprint 6 added 2 validators; both pass) |

3 of 5 still "Pending real usage." That's expected at v1.0 ship time. v1.1 retrospective re-evaluates after first month of operations.

## v1.1 backlog (informed by this v1.0 ship)

1. Real cron handler implementations (crm-to-gbrain-mirror, gbrain-consistency-nightly, gbrain-dream-cycle)
2. Stripe + GitHub webhook infrastructure (activates Sprint 4 hooks)
3. Live @cto + Muse panel review of operating spec
4. Per-role `brain_affinity` field on each role block (vs addendum-only)
5. Fill remaining ~37 gbrain MCP tools in mcp-tools.yaml
6. Add `gbrain_mcp` to schedules.schema.json enum
7. `/promote` slash command + cron auto-flag (currently `brain-promotion` is manual-aid only)
8. Centralized pre-write hook for ID resolution (Q4 OQ4.3)
9. Post-task evaluator for missed-brain detection (Q3 OQ3.C)
10. v1.1 retrospective after first month of real operations (cost actuals + KPI traces)

## Boilerplate-extractable patterns

The following patterns from this capability could be promoted to `notes/boilerplate-candidates.md` for reuse in future capabilities:

1. **`## Brain context` section template** (Sprint 2 `brain-write-discipline`) — any future memory-aware skill follows this
2. **Hard-cap Option B graceful degrade wrapper** (Sprint 5 `pre-budget-check.sh`) — any MCP server with cost concerns can adapt this pattern
3. **Per-PR-per-sprint with auto-merge** (this whole capability) — fast-mode CLA when founder is co-pilot
4. **Brainstorm-first → synthesize-in-CLA** (Phase 1 + 5) — when brainstorm is rich, skip live CxO panels
5. **Deferred-stub registration pattern** (Sprint 4 cron handlers) — register schedule + handler stub now; implement when infra ships

## Acknowledgements

- 10-Q brainstorm session 2026-05-23: founder + AI co-thinking that made this capability buildable in 30 hours instead of 18 weeks
- @cto callout CTO-1 catching the consistency_checks schema misunderstanding — saved 1 migration
- The /cla protocol design (capability `capability-lifecycle-architecture` v1.1) — multi-speed-friendly without sacrificing governance discipline

---

*Generated by `capability-lifecycle/catalog-updater` skill, Sprint 6 Phase 8. Promoted to wiki/ alongside the canonical spec.md. Capability state `architecting` → `operating`, version 0.1.0 → 1.0.0.*
