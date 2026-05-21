---
title: Retrospective — Redesign 00-core + /core command (v1.0.0)
type: capability-retrospective
slug: core-redesign-and-command-retrospective
capability_id: core-redesign-and-command
capability_version: "1.0.0"
proposed_at: 2026-05-21
deployed_at: 2026-05-22
operating_since: 2026-05-22
ops_capability_runs_id: cd377ba8-d8c6-44ed-b0ad-69981b49d45a
prs: [75, 76, 77]
---

# Retrospective: core-redesign-and-command v1.0.0

## Summary

Transformed `00-core/` from 5 docs (3 filled + 2 templates) into 19-file canonical foundation (10 filled + 6 stubs + 3 existing retrofitted) + shipped `/core` slash command with 7 Phase-1 verbs + supporting scripts + skill + tests + bilingual docs site.

**Wall-clock**: ~2.5 hours of CC orchestration (founder primarily watching).
**Cumulative LLM cost**: ~$0.50 (CTO Phase 2 $0.20 + docs translate Sprint 1 $0.125 + Sprint 3 $0.047 + misc).
**Founder review time**: ~10 minutes (3 PR merges).

## What worked

### 1. CLA 8-phase ceremony worked end-to-end
Phase 0 (drift pre-flight) → Phase 6 (sprint plan) → Phase 7 (3 sprints) → Phase 8 (promotion). All state transitions persisted to `ops.capability_runs`. Resume semantics worked correctly across multiple sessions.

### 2. Compressed Phase 4 + Phase 5 saved $2-3 + 15 min ceremony
Upstream `/plan-ceo-review` brainstorm + adversarial spec review iter 1+2 (5/10 → 7/10) produced equivalent input to full CxO panel + Muse panel. Founder Tier C approval ceremony preserved at Phase 5. Net savings without quality loss.

### 3. CTO Phase 2 mandates landed as designed
All 3 CTO directives from Phase 2 lens shipped in Sprint 2:
- `scripts/core/lib/frontmatter.cjs` shipped FIRST (before compose.cjs)
- Snapshot tests against existing 3 docs (parsed correctly post-migration)
- `workspace_plane.runtime` declaration added in Sprint 3 manifest v0.9.0

Verified gaps from CTO Phase 2 (both real): `scripts/wiki-sync/lib/` didn't exist → created shared lib correctly; `runtime/` not in manifest → added in Sprint 3.

### 4. Founder authorized AI to do "founder work"
Mid-Sprint 1, founder explicitly authorized CC to fill 9 think-heavy docs (charter, founder-profile, north-star, icp-summary, positioning, values, principles, ai-native-philosophy, INDEX) instead of solo write. CC synthesized from existing repo material (product.md, brand_voice.md, transparency.md, CLAUDE.md, HITL.md, ROLES.md, .archives/pillars/PLAN.md). All docs tagged with `ai_synthesized_v0_1` frontmatter + founder review path at 30-paying.

This effectively compressed Phase A from 6-10h founder solo → ~15 min of context loading + 15 min of writes by CC, with founder review at PR.

### 5. Bilingual docs site (Fumadocs + Vercel) integrates smoothly
3 PR cycles each: docs sync → docs translate (Haiku) → .vi.mdx → .mdx propagation → Vercel auto-deploy. End-to-end ~5 min after merge. Total VI translation cost ~$0.17 for all 12 charter docs over 3 cycles.

## What didn't work

### 1. CI warn-tier check fails on every PR (pre-existing tech debt)
`L2 — governance/ROLES ↔ skills (warn)` fails because 27 skills declared in `governance/ROLES.md` don't exist on disk (escalation-routing, blog-post-drafting, etc.). NOT introduced by this capability — pre-existing latent tech debt. All 3 PRs (75, 76, 77) had to merge despite this warn-tier failure.

**Action**: separate `/cla propose "ROLES.md skill stub cleanup"` capability OR edit ROLES.md to comment-out non-shipped skill claims. Track in TODOS.md.

### 2. Founder effort estimate was 4× off in good direction
Initial estimate: 6-10h founder solo for Phase A. Actual: ~10 min of founder watching + 5 min × 3 PR reviews = ~25 min. Reviewer concern about "structurally hard to estimate pre-PMF" turned out to apply to founder writing time, NOT to AI-synthesis time. Compression ratio: 12-24× faster than estimated.

**Lesson**: when CC can do the work, recompute Phase A founder time as PR-review-only.

### 3. `docs-translate.cjs` requires `ANTHROPIC_API_KEY` env even when in Claude Code Desktop
Per /docs.md command: "no `ANTHROPIC_API_KEY` required when invoked from a Claude Code Desktop session" — but the CLI script `scripts/docs-translate.cjs` still requires the env. CC had to manually source `.env.local` before each run.

**Action**: docs-translate.cjs should detect Claude Code Desktop env + dispatch subagents instead of direct API calls. File TODO in docs-engine capability backlog.

### 4. `.mdx` (default-lang) vs `.vi.mdx` (explicit VI) split is non-obvious
`scripts/docs-translate.cjs` writes to `.vi.mdx`; default URL serves from `.mdx`. CC had to manually `cp .vi.mdx → .mdx` for VI to actually serve. This is a docs-engine quirk that should be documented OR the translate script should write both.

**Action**: file TODO in docs-engine — either document or fix script.

## Acceptance criteria (per spec.md §6)

### Phase 7 (Implementation)

- [x] `scripts/core/lib/frontmatter.cjs` shipped FIRST + snapshot tests (Sprint 2)
- [x] All 4 helper scripts (compose, reindex, validate, migrate-existing-frontmatter) + validator wrapper
- [x] `.claude/commands/core.md` 7 Phase-1 verbs
- [x] `06-ai-ops/skills/core-management/core-fill/SKILL.md` per-layer schemas
- [x] Migration script ran --apply (product/brand_voice/transparency retrofitted)
- [x] All 19 docs exist in `00-core/` (10 filled + 6 stubs + 3 existing migrated)
- [x] `knowledge/manifest.yaml` v0.9.0 bumped
- [x] `knowledge/kpi-registry.yaml` +2 KPIs
- [x] `pnpm check` clean per PR
- [x] E2E: `/core compose identity` valid bundle
- [x] E2E: `/core scaffold + fill + check` round-trip via Sprint 2 tests

### Phase 8 (Catalog) — THIS RETRO

- [x] `knowledge/capability-registry.yaml` UPDATE state→operating, version 1.0.0
- [x] `wiki/capabilities/core-redesign-and-command/spec.md` promoted (this folder)
- [x] `wiki/capabilities/core-redesign-and-command/retrospective.md` written (this file)
- [x] `pnpm check` clean
- [x] `ops.capability_runs.state = 'operating'`

### Operating (post-launch)

- [ ] `core_docs_filled_count` = 10 (currently 10; verify with `node scripts/cross-tier/validate-core-pillar.cjs --json`)
- [ ] `core_command_verbs_phase_1` = 7 (verify by parse of `.claude/commands/core.md`)
- [ ] `core_docs_v0_1_drafts` = 3 (values, principles, ai-native-philosophy; revisit at 30-paying)
- [ ] Founder reports cofounder onboarding time < 2 hours (verify when cofounder joins)

## Actuals vs estimates

| Metric | Estimated | Actual | Variance |
|---|---|---|---|
| CC hours | 8-12 | ~2.5 | -75% (better) |
| Founder hours | 6-10 | ~0.25 | -97% (founder watch-only mode) |
| Calendar days | 3-7 | 1 day | -85% (better; single-day full ship) |
| PR count | 3 | 3 | ✓ on target |
| LLM cost USD | 3 | ~$0.50 | -83% (better) |
| Files added | 25 | ~70 (incl docs MDX) | +180% (docs auto-gen) |
| LOC added | 1500-2500 | ~9000 (incl docs) | +200% (docs auto-gen) |

**Net**: massively under-estimate on cost + time (CC compression worked); on-target for PR count; over on file count due to docs MDX auto-generation (not strictly "human-written code").

## v0.1 revisit triggers (calendar reminders)

| Doc | Revisit at | Trigger |
|---|---|---|
| `00-core/values.md` | 30-paying milestone | First NPS survey + customer interview data |
| `00-core/principles.md` | 30-paying milestone | First founder retro post-30-paying |
| `00-core/ai-native-philosophy.md` | 30-paying milestone | 30 days of ops.agent_runs analysis |

## Stub graduation roster (when entry_condition fires)

| Stub | Entry condition | Estimated graduate timeline |
|---|---|---|
| `glossary.md` | First 10 SOPs land (current ~13 already exist) | Within Q3 2026 |
| `design-system.md` | First marketing visual needed (after brand-tokens.yaml) | Pre-launch marketing |
| `wedge.md` | SOP-PRODUCT-002 N=10 strangers complete | Post-launch, first cohort |
| `pricing-philosophy.md` | First SOP-PRODUCT-010 pricing-pull-test | Post-100-paying |
| `operating-cadence.md` | Cofounder formal join OR 50 paying | Cofounder-driven |
| `decision-rights-narrative.md` | Cofounder formal join | Cofounder-driven |

## Patterns extracted (for boilerplate-candidates.md)

1. **Compressed Phase 4 + Phase 5 with full Tier C approval** — when upstream `/plan-ceo-review` brainstorm + adversarial spec review have produced equivalent input, compress CLA Phases 4+5 to save $2-3 + 15 min while preserving founder Tier C approval ceremony.

2. **AI-synthesized founder docs with v0.1 calibration tagging** — when CC can synthesize founder think-heavy content from existing repo material, tag with `ai_synthesized_v0_1: true` + `revisit_at: 30-paying` to maintain intellectual honesty + force revisit when real customer data lands.

3. **Build order load-bearing per CTO mandate** — shared lib FIRST + snapshot tests + parity tests vs sibling implementation. Avoids parser drift between sibling commands (e.g., `/wiki get` vs `/core compose`).

4. **Bilingual docs auto-sync per PR** — `node scripts/docs-sync.cjs --area=<a>` + `node scripts/docs-translate.cjs --area=<a>` + `.vi.mdx → .mdx` propagation = ~5 min per PR cycle for full bilingual docs.

## Carry-forward TODOs

- `knowledge/design-tokens/brand-tokens.yaml` (precursor to design-system.md)
- `ops.core_runs` migration if `/core` write-actions exceed git audit capacity
- `/core` Phase 2 verbs (init, reindex --write, review, status, <doc>:apply, <doc>:build, <doc>:export) — trigger: post first 30 paying
- `/cla propose --refs=core:bundle=...` v1.1 feature (mirror wiki:src= pattern)
- Phase 2 migration: skills move from direct `Read 00-core/<file>` → `/core compose <bundle>` for consistency
- ROLES.md 27 skill stub cleanup (separate capability)
- docs-translate.cjs Claude Code Desktop env detection (no API key required)
- docs-engine `.mdx` vs `.vi.mdx` propagation either document or auto-fix

## State at promotion

- ops.capability_runs.id: cd377ba8-d8c6-44ed-b0ad-69981b49d45a
- state: implementing → operating
- current_phase: 7 → 8
- completed_sprints: [1, 2, 3]
- spec_path: wiki/capabilities/core-redesign-and-command/spec.md (promoted)
- retrospective_path: wiki/capabilities/core-redesign-and-command/retrospective.md (this file)

## Sign-off

- Founder authorized: 2026-05-21T13:30Z (brainstorm) + 2026-05-21T14:00Z (Phase 5 Tier C) + 2026-05-21T17:00Z (Sprint 2) + 2026-05-22 (Sprint 3 merge + Phase 8 promotion)
- AI executor: Claude Opus 4.7 (1M context) via Claude Code Desktop
- Repo: doanchienthangdev/ritsu-works
- Final commits: 75 (Sprint 1), 76 (Sprint 2), 77 (Sprint 3), [this PR] (Phase 8)

— end retrospective
