# Capability Catalog

> Index of all capabilities deployed via `/cla` (SOP-AIOPS-001, Bài #20).
> Auto-updated by Phase 8 (`catalog-updater` skill) when a capability reaches
> `operating` state.
>
> The canonical source of truth is `knowledge/capability-registry.yaml`. This
> catalog is the human-readable view that links into each capability's
> promoted spec + retrospective.

**Last updated:** 2026-05-30 (post-deepask v1.0 promotion)
**Total capabilities (operating):** 6
**Total capabilities (deployed pending operating):** 1
**Total capabilities (any state):** 7

---

## Operating

| ID | Name | Version | Pillar | Deployed | Spec | Retrospective |
|---|---|---|---|---|---|---|
| `capability-lifecycle-architecture` | Capability Lifecycle Architecture (Bài #20) + `--refs=wiki:` (v1.1) | **1.1.0** | 06-ai-ops | 2026-05-21 | [Bài #20 DRAFT](../../knowledge/phase-a2-extensions/bai-20-capability-lifecycle-DRAFT.md) | [retrospective-v1.1.0.md](capability-lifecycle-architecture/retrospective-v1.1.0.md) |
| `cla-update-mechanism` | CLA Update Sub-flows (v1.1) | 1.0.0 | 06-ai-ops | 2026-05-15 | [spec.md](cla-update-mechanism/spec.md) | [retrospective.md](cla-update-mechanism/retrospective.md) |
| `wiki-sync-from-refs` | Wiki Sync from External Refs (v4.4 source-grouped + 3-mode bundler) | **4.4.0** | 06-ai-ops | 2026-05-20 | [spec.md](wiki-sync-from-refs/spec.md) | [retrospective-v4.4.0.md](wiki-sync-from-refs/retrospective-v4.4.0.md) |
| `docs-engine` | Live Documentation Engine (Fumadocs + Vercel, bilingual VI+EN, incremental translation) | **1.2.0** | 06-ai-ops | 2026-05-19 | [spec.md](docs-engine/spec.md) | [retrospective-v1.2.0.md](docs-engine/retrospective-v1.2.0.md) |
| `resolver-plan` | resolver as a first-class 2-axis planner (`ResolverPlan v1` = populated `context_recipe`) + self-fresh catalog | **1.0.0** | 06-ai-ops | 2026-05-30 | [spec.md](resolver-plan/spec.md) | [retrospective.md](resolver-plan/retrospective.md) |
| `deepask` | federated retrieval + capability-execution + cited synthesis supercommand (5-stage loop, 12-format engine; zero-routing consumer of resolver-plan) | **1.0.0** | 06-ai-ops | 2026-05-30 | [spec.md](deepask/spec.md) | [retrospective.md](deepask/retrospective.md) |

## Deployed (pending operational gate)

| ID | Name | Version | Pillar | Deployed | Spec | Retrospective | Gate to operating |
|---|---|---|---|---|---|---|---|
| `evolve` | /evolve — Eval+Evo Feedback Loop for ritsu-works entities | **1.0.0** | 06-ai-ops | 2026-05-22 | [spec.md](evolve/spec.md) | [retrospective.md](evolve/retrospective.md) | Founder completes 25 hold-out ratings in `06-ai-ops/skills/eval-evo/cases/_HOLDOUT.yaml` → orchestrator pre-flight unlocks /evolve invocations → state becomes `operating`. See [runbooks/evolve.md §Onboarding](../runbooks/evolve.md). |
| `resolver-v3-jit-loading` | /resolver v3 — JIT Loading (Pocket Map + Drill-Down) | **3.0.4** | 06-ai-ops | 2026-05-25 (v3.0.0) / patched 2026-05-26 (v3.0.1 speed opts + v3.0.2 /resolver command doc via manual /evolve + v3.0.3 Tier C cutover PR #115 + v3.0.4 per-role propagation & CLA Phase 8 INDEX regen) | [spec.md](resolver-v3-jit-loading/spec.md) | [retrospective.md](resolver-v3-jit-loading/retrospective.md) | v3.0.3 cutover MERGED (PR #115): CLAUDE.md flipped to `@INDEX.md` + bypass-detection hooks active. State: runtime-active-pending-restart. v3.0.4 (this PR): per-role propagation guidance in 4 persona agents + Step 6.6 in catalog-updater for INDEX regen during CLA Phase 8. Remaining founder actions: (1) ⌘Q + reopen Claude Code to activate v3.0.3 ambient INDEX + hooks. (2) 7-day baseline + canary verdict (`find()` > 20/day AND recall ≥ 17/20 nightly). See [retrospective §v3.0.4 patch](resolver-v3-jit-loading/retrospective.md). |

### docs-engine version history (lineage chain)

| Version | State | Operating range | Spec | Retrospective |
|---|---|---|---|---|
| 1.0.0 | superseded | 2026-05-19 → 2026-05-19 (~6h) | [spec.md](docs-engine/spec.md) | [retrospective-v1.0.0.md](docs-engine/retrospective-v1.0.0.md) |
| 1.1.0 | superseded | 2026-05-19 → 2026-05-19 (~2h) | [spec.md](docs-engine/spec.md) | [retrospective-v1.1.0.md](docs-engine/retrospective-v1.1.0.md) |
| 1.1.1 (translation) | merged into 1.2 lineage | 2026-05-19 → 2026-05-19 (PR #65) | — | — |
| 1.1.2 (translation 100%) | merged into 1.2 lineage | 2026-05-19 → 2026-05-19 (PR #66) | — | — |
| **1.2.0** | **operating** (current) | 2026-05-19 → present | [spec.md](docs-engine/spec.md) | [retrospective-v1.2.0.md](docs-engine/retrospective-v1.2.0.md) |

**v1.2.0 Phase 8 promotion details:**
- Founder ask addressed: "đa ngôn ngữ có tự động cho nội dung mới không?" — answer pre-v1.2 was NO (walker overwrote translations on source change); post-v1.2 the walker preserves VI bodies + flags stale.
- Walker change (scripts/docs-sync.cjs): new `preservedVi` branch (~47 lines). Title/description/body all preserved when source changes; `translated_source_hash` + `needs_retranslation: true` added to frontmatter.
- Verifier extended (scripts/verify-vi-translation.cjs): `--list-stale`, `--list-needs-translation` flags. Summary table now Fresh / Stale / Untrans / Skipped.
- New skill: `06-ai-ops/skills/docs-engine/translate/SKILL.md` (incremental translation orchestration via Claude Code subagent dispatch — no Anthropic API key needed).
- New `/docs translate` slash command (workflow section in `.claude/commands/docs.md`).
- One-time migration: 224 already-translated files backfilled with `translated_source_hash = source_hash`.
- Idempotency test passed (edit source → walker preserved VI; revert source → walker skipped).
- v1.3 candidates: 5 hand-written tutorials, `docs-translate-check.yml` CI gate, auto-dispatch via `--then-translate`, custom domain `docs.ritsu.works`.

**v1.1.0 Phase 8 promotion details:**
- PRs shipped (same-session extend): [#62](https://github.com/doanchienthangdev/ritsu-works/pull/62) (i18n infra + walker bilingual + landing cards), [#63](https://github.com/doanchienthangdev/ritsu-works/pull/63) (Fumadocs v14 default-locale fix + Cards import)
- Founder asks addressed: bilingual VI+EN, sidebar grouping (Diátaxis), `/` → `/docs` redirect, Cards landing
- Walker v1.1: outputs 225 `.mdx` (vi default) + 225 `.en.mdx` (alt) = 450 MDX + 18 meta.{lang}.json
- Live verified: `/`, `/docs`, `/en/docs`, `/docs/agents/cto`, `/en/docs/agents/cto`, `/api/raw/agents/cto` all HTTP 200
- **Founder action pending v1.1.1:** run `scripts/docs-translate.cjs` to replace English placeholder in VI files with actual Vietnamese translations (~$0.50-2 LLM, ~10-20 min)

### docs-engine v1.0 Phase 8 promotion details

- **Live URL:** https://ritsu-works.vercel.app
- **PRs shipped (single-session, 2026-05-19):**
  - [#54](https://github.com/doanchienthangdev/ritsu-works/pull/54) Tier 1 manifest registration
  - [#55](https://github.com/doanchienthangdev/ritsu-works/pull/55) Skill stubs + SOP + `/docs` command
  - [#56](https://github.com/doanchienthangdev/ritsu-works/pull/56) Next.js scaffold + walker + 9 adapters + secret redactor
  - [#57](https://github.com/doanchienthangdev/ritsu-works/pull/57) pillar-numbering hotfix (`docs/` to allowlist)
  - [#58](https://github.com/doanchienthangdev/ritsu-works/pull/58) MDX build compatibility (escape `<`/`{`, version pinning, type casts)
  - [#59](https://github.com/doanchienthangdev/ritsu-works/pull/59) Vercel config fix (removed `output: standalone` + `i18n`)
  - [#60](https://github.com/doanchienthangdev/ritsu-works/pull/60) Manifest deploy_url
- **226 auto-generated MDX pages** rendered from Tier 1 + `.claude/` runtime (1 SOP yaml drift skip — pre-existing)
- **AI runtime endpoint** `/api/raw/<slug>` returns `text/markdown` — verified end-to-end (CPO Phase 4 P0 reframe)
- **Founder time actuals:** ~30 min (-97% vs estimated 15-25h; reference-only v1.0)
- **Setup cost actuals:** ~$4 LLM (-50% vs estimated $8-18 midpoint; single-session execution)
- **Sprint 2 + 3 deferred to v1.1** per founder choice + Muse cynic contingency (avoid stale tutorials)
- **v1.1 candidate extensions:** 5 Vietnamese tutorials, Orama index sharding, Diátaxis nav grouping, custom domain `docs.ritsu.works`, `.github/workflows/docs-check.yml` soft-gate

### Wiki-sync version history (lineage chain)

| Version | State | Operating range | Spec | Retrospective |
|---|---|---|---|---|
| 1.0.0 | superseded | 2026-05-16 → 2026-05-17 | (never promoted) | (never promoted) |
| 2.0.0 | superseded | 2026-05-17 → 2026-05-18 | [spec-v2.md](wiki-sync-from-refs/spec-v2.md) | [retrospective-v2.0.0.md](wiki-sync-from-refs/retrospective-v2.0.0.md) |
| 3.0.0 | superseded | 2026-05-18 (~5h) → 2026-05-18 | [spec-v3.md](wiki-sync-from-refs/spec-v3.md) | [retrospective-v3.0.0.md](wiki-sync-from-refs/retrospective-v3.0.0.md) |
| 4.0.0 | superseded | 2026-05-18 → 2026-05-18 | [spec.md](wiki-sync-from-refs/spec.md) | [retrospective-v4.0.0.md](wiki-sync-from-refs/retrospective-v4.0.0.md) |
| 4.1.0 | superseded | 2026-05-18 → 2026-05-18 | [spec.md](wiki-sync-from-refs/spec.md) | (folder-adapter recursive) |
| 4.2.0 | superseded | 2026-05-18 → 2026-05-20 | [spec.md](wiki-sync-from-refs/spec.md) | (namespace output folder) |
| 4.3.0 | superseded | 2026-05-20 → 2026-05-20 | [spec.md](wiki-sync-from-refs/spec.md) | [retrospective-v4.3.0.md](wiki-sync-from-refs/retrospective-v4.3.0.md) |
| **4.4.0** | **operating** (current) | 2026-05-20 → present | [spec.md](wiki-sync-from-refs/spec.md) | [retrospective-v4.4.0.md](wiki-sync-from-refs/retrospective-v4.4.0.md) |

**v4.4 Phase 8 promotion details:**
- Founder ask addressed: `/wiki get --query=<text>` semantic mode + schema fix for POM frontmatter (Bug #1: chapter-N returned 0 entities)
- 3 modes in `/wiki get`: Spec (v4.3) / Query (v4.4 NEW) / Entity-list (v4.4 NEW)
- Orchestrator + script split: `--query=` resolved by Claude session via MCP wiki_ask → script bundles
- Filesystem keyword grep fallback when MCP returns `no_coverage` (until embeddings v0.2 backfill)
- 5 test scenarios pass including end-to-end query mode (24 entities matched for "List all marketing segments…")
- Schema fix: `entityChapterIndex()` now parses chapter from `extracted_from_source: ...__chapter-NN-...` slug as fallback when `source_chapter_index` field absent
- v4.5 candidates: direct CLI `--query=` with OPENAI_API_KEY, embeddings backfill v0.2, schema audit in `/wiki audit`, confidence threshold filter, cross-source dedup hint

**v4.3 Phase 8 promotion details:**
- Founder ask addressed: how to feed wiki chapter as context to other commands without intermediate context files
- New `/wiki get --src=<spec> [--to=<path>]` subcommand — extracts bundled context from source-grouped package
- New `scripts/wiki-sync/get.cjs` (~280 LoC) — 5-scope spec grammar (full / chapter-N / chapter-file / type / entity); pure filesystem read, $0 cost
- New skill `06-ai-ops/skills/wiki-sync/get/SKILL.md` with anti-pattern guidance (don't copy bundle into `.archives/`; re-run on every session)
- `.claude/commands/wiki.md` updated with new row + workflow section
- Tested 6 spec modes including --to=<path> file write + error handling
- v4.4 candidates: MCP tool wrapper, `--via-db` flag, auto-compose flag on `/cla` and `@cxo`, JSON output mode

**v4.0 Phase 8 promotion details:**
- Sprint 1 merge commit: `0cd0c62` (PR [#45](https://github.com/doanchienthangdev/ritsu-works/pull/45))
- Sprint 2 merge commit: `70ee2ee` (PR [#46](https://github.com/doanchienthangdev/ritsu-works/pull/46))
- Migration applied: `00032_wiki_v4_source_grouped.sql` (drops global UNIQUE on `knowledge_pages.slug`; adds 2 partial UNIQUE indexes)
- migrate-to-v4.cjs ran: 15 FS moves (`git mv`) + 1 new sample source RECORD; 14 wiki/_index/ link-lists generated
- ops.capability_runs lineage: `911973a2 (v1)` ← `638811f8 (v2)` ← `36836749 (v3.0 superseded 2026-05-18)` ← `f75502d4 (v4.0 operating 2026-05-18)`
- v3.0 hard kill criterion clock CONTINUES (day-30: 2026-06-17; day-60: 2026-07-17) — v4.0 does NOT reset it
- 7-day post-ship commitment (Muse M1): founder ingests ≥3 growth playbooks via `/wiki sync` by **2026-05-25**

**v3.0 Phase 8 promotion details (historical):**
- Merge commit: `7f39b2c` (5 sprint commits squashed via `--no-ff`)
- Migration applied: `00031_wiki_distillation.sql` (Block E backfill flagged 1 row `spaced-repetition` as `legacy_v2_verbatim=true`)
- Hard kill criterion clock starts: 2026-05-18; day-30 + day-60 evaluations per spec-v3.md §0

### resolver-plan v1.0 Phase 8 promotion details

- **PRs shipped (one per sprint):**
  - [#157](https://github.com/doanchienthangdev/ritsu-works/pull/157) Sprint 1 — axis tag + per-kind enrichment + **audit-repair migration `00044`**
  - [#158](https://github.com/doanchienthangdev/ritsu-works/pull/158) Sprint 2 — `mcp__resolver__find` axis/enrichment (NO LLM) + `validate-resolver-axis-tags.cjs` (CRITICAL) + coverage→16 kinds
  - [#159](https://github.com/doanchienthangdev/ritsu-works/pull/159) Sprint 3 — `resolver-plan` skill + `ResolverPlan v1` schema + `/resolver plan` + plan audit
  - [#160](https://github.com/doanchienthangdev/ritsu-works/pull/160) Sprint 4 — nightly catalog-sync **GitHub Action** + `sync.cjs --draft` + coverage WARN→CRITICAL
  - *this PR* Sprint 5 — `context_recipe` optional→**first-class** docs + find→plan contract test + Phase 8 promotion
- **The contract object:** `ResolverPlan v1` (`knowledge/schemas/resolver-plan.schema.json`) — a populated, first-class `context_recipe`: `content_axis` (READ) + `capability_axis` (RUN, HITL-tier-tagged) + `governance_constraints` (always `page/governance-HITL` when any capability is tier B+) + `goal_metrics` + `primary_lens` + honest `no_coverage`. Consumed by `/deepask` (Capability 2) with zero routing.
- **@cto Phase-5 discovery → live repair:** `ops.resolver_decisions.mode` was `char(1)`, so `'A2'` audit inserts had silently failed since the v3 cutover; migration `00044` (APPLIED to ritsu-ops) widens it to `varchar(8)` + reconciles the CHECK + adds `plan_payload jsonb`.
- **Deviation (founder-approved):** the nightly cron is a **GitHub Action** (`.github/workflows/resolver-catalog-sync.yml`), NOT a `knowledge/schedules.yaml` entry — a Supabase-Edge handler can't `git`/`gh` to regenerate the catalog + open a draft PR.
- **Tests:** ~263 across S1-S4 + 7 in S5 (the find→plan contract-boundary seam). **2 pre-existing failures persist** (`v21-new-kinds` SOP-ID regex; `v22-context-sources` CLAUDE.md 16-`@import` assertion obsoleted by resolver-v3 #114) — unrelated to this capability.
- **Reversibility:** 5/5 (additive/backward-compatible; only stateful change = an additive nullable column).
- **Program:** Capability 1 of 2 — unblocks **deepask** (Capability 2; `/cla` PROMPT 2 in `.archives/brainstorming/deepask/`).

## Implementing / Architecting / Analyzing

(none yet)

## Deprecated / Superseded

(none yet)

---

## How this catalog is maintained

- **Phase 8 of `/cla`** (the `catalog-updater` skill) appends a new row when a
  capability transitions `deployed → operating`.
- **Manual updates** to add notes are fine — but state changes MUST come
  from `/cla` so `ops.capability_runs` and `knowledge/capability-registry.yaml`
  stay consistent.
- **Source of truth:** `knowledge/capability-registry.yaml` (Tier 1, schema-validated).
- **Naming:** the file is `CATALOG.md` (not `_CATALOG.md`) so it commits — per
  the wiki/ workspace plane convention, leading-underscore files stay local.

## Related

- Front-end: `.claude/commands/cla.md` (`/cla` command)
- SOP: `06-ai-ops/sops/SOP-AIOPS-001-capability-lifecycle/`
- Skills: `06-ai-ops/skills/capability-lifecycle/`
- Playbook: `knowledge/phase-a2-extensions/bai-20-capability-lifecycle-DRAFT.md`
- Routing: `knowledge/cla-routing-keywords.yaml`
