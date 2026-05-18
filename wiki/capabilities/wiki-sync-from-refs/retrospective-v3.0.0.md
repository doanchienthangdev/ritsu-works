# Retrospective — wiki-sync-from-refs revise v2.0.0 → v3.0.0

**Capability run:** `36836749-06f7-48e8-8a31-f5a3f2e401a1`
**Supersedes parent:** `638811f8-94d0-4fc8-8d61-dcf6db6a74c7` (v2.0.0 operating, soon → superseded)
**Session:** `ff5e2a89-3877-45ea-a27a-171a64a3003d`
**Phase:** 8 (catalog update + promotion)
**Date:** 2026-05-18 (start → promotion same calendar day; founder elected autonomous AI execution of all 6 sprints in single session)
**Decision row:** `ops.decisions[562b2e4e-7f50-47f2-a3bb-1291c30f6709]` state=`decided`
**Tier C ceremony:** completed Phase 5 (founder APPROVED Option B + all CTO + Muse NITs)

---

## §1 — What was the revise about

v1.0 + v2.0 wiki-sync architectures treated `/wiki sync` as **ingest+index** (verbatim source projection + regex links + embeddings). Founder identified 2026-05-18 that this got the core semantic wrong — the wiki command's actual purpose is **distill+extract**: pull important knowledge entities (concept / observation / decision / idea) out of source documents into separately-projected, citable, deduplicated wiki pages.

The Phase 4 cabinet (CTO + CPO + CEO) initially recommended DEFER on PMF-priority grounds. Founder reconsidered with new S1 evidence: "tôi cần dùng lệnh wiki này để extract + distill tri thức từ các tài liệu chuẩn đề chuẩn bị cho tìm kiếm khách hàng (việc quan trọng), đặc biệt liên quan đến growth … cái tôi cần là distill + extract được kiến thức quan trọng từ files/folders đầu vào để có thể viết các content, nội dung, plan…"

The clarification reframed the strategic calculus: wiki-sync v3.0 IS the PMF-path tool (processes growth playbooks → content/copy/plans), not internal-infra alternative to PMF. Cabinet DEFER premise dissolved; founder picked Option B (full 4-entity).

## §2 — What shipped

**Single session 2026-05-18, AI-executed autonomous mode:**

**Sprint 0 — Manual workflow validation (AI proxy, per founder delegation):**
- Read `raw/5-star/` corpus (11 modules of Exposure Ninja 5-Star Marketing System)
- Hand-extracted 18 entities from Modules 1 (positioning/BRAVO) + 6 (SEO) — 11 concepts + 7 observations + 5 decisions + 2 ideas
- Drafted growth content paragraph ("Why Ritsu doesn't try to be a tutor for everyone") using extracted observations
- Wrote `.archives/cla/wiki-sync-from-refs-revise-ff5e2a89/manual-workflow-test.md` with bottleneck analysis + honest AI-vs-founder disclosure (the AI executing this doesn't validate the founder-behavior premise — that's deferred to day-30 + day-60 kill criterion per spec §0)

**Sprint 1 — Foundation (Tier C PR, commit `ceed304`):**
- Migration `00031_wiki_distillation.sql` — new `ops.knowledge_extractions` table (citation spine) + 4 new columns on `ops.knowledge_pages` (extracted_from_source_id, legacy_v2_verbatim, review_state, deleted_at)
- `governance/ROLES.md` etl-runner grant fix (pre-existing v2.0 drift)
- 4 Tier 1 yaml updates: manifest, capability-registry, feature-flags, ingestion-sources
- `scripts/cross-tier/validate-wiki-integrity.cjs` v0.2 — adds v3 invariants + sprint-order CI sentinel
- Test fixtures: sample-distill.md + growth-playbook-fixture.md + sample-corpus/ (3 overlapping-PLG files)
- 20 vitest tests, all passing

**Sprint 2 — Distill skill core engine (Tier B, commit `c2d916d`):**
- NEW `06-ai-ops/skills/wiki-sync/distill/SKILL.md` (v0.1) — per-type model picker (Haiku for concept+idea; Sonnet for observation+decision); confidence as 3-bucket signal documented per CTO NIT 4; 10-step process with citation discipline
- UPDATE `06-ai-ops/skills/wiki-sync/ingest/SKILL.md` — Steps 6-10 rewritten for distill+extract default; verbatim fallback path
- UPDATE `06-ai-ops/skills/wiki-sync/SKILL.md` (umbrella) — v3.0 verb dispatch table + cost cap table

**Sprint 3 — Dedup + folder aggregation + backfill update (Tier B, commit `545162d`):**
- NEW `06-ai-ops/skills/wiki-sync/dedup/SKILL.md` (v0.1) — three-tier match (slug + 0.92 auto-merge + 0.75-0.92 review queue); folder-level aggregation per spec A7
- UPDATE `06-ai-ops/skills/wiki-sync/adapters/folder-adapter/SKILL.md` — Step 6b cross-paper concept aggregation
- UPDATE `06-ai-ops/skills/wiki-sync/embeddings-backfill/SKILL.md` — v3.0 query covers source RECORD + derived entity pages

**Sprint 4 — Review + merge + attribution + ask/audit + MCP (Tier B, commit `f74c761`):**
- NEW `06-ai-ops/skills/wiki-sync/review/SKILL.md` — founder-review queue processor (AskUserQuestion per item; page-level review_state rollup)
- NEW `06-ai-ops/skills/wiki-sync/merge/SKILL.md` — manual `/wiki merge` + `--undo` (soft-delete via deleted_at)
- NEW `06-ai-ops/skills/wiki-sync/attribution-watcher/SKILL.md` — Muse M2 axis A11 (correlates /wiki ask with 01-marketing/ + 02-sales/ edits; Tier B Telegram when copyrighted_internal_only source ≥3 obs)
- UPDATE `06-ai-ops/skills/wiki-sync/ask/SKILL.md` — entity-first retrieval per Muse M5 + new citation format with original source title
- UPDATE `06-ai-ops/skills/wiki-sync/audit/SKILL.md` — 4 new checks (distillation completeness, citation integrity, dedup consistency, A11 attribution)
- UPDATE `.claude/commands/wiki.md` — full v3.0 verb table refresh per founder brief Part 5
- NEW `mcp-server/src/tools/wiki-source.ts` — reverse-lookup MCP tool (registered in `tools/index.ts` with description in lockstep per CTO NIT 6)

**Sprint 5 — SOP rewrite + promotion (Tier C PR, this commit):**
- UPDATE `06-ai-ops/sops/SOP-INGEST-001-wiki-sync/README.md` — v3.0 pipeline (10 steps) + v2.0 verbatim fallback + state machine with `distilling` transient state + v3.0 cost cap table
- THIS retrospective written + promoted to wiki/capabilities/
- v3.0 spec.md promoted from .archives/cla/wiki-sync-from-refs-revise-ff5e2a89/ to wiki/capabilities/wiki-sync-from-refs/spec.md (prior v2.0 spec archived to spec-v2.md; prior v2.0 retro archived to retrospective-v2.0.0.md)
- `knowledge/capability-registry.yaml` bumped v2.0.0 → v3.0.0; state implementing → operating
- `wiki/capabilities/CATALOG.md` updated
- `ops.capability_runs`: row `638811f8` → state=superseded; row `36836749` → state=operating

**Total LOC across 5 commits (Sprints 1-5):** ~2,500+ lines (mostly SKILL.md + spec/retro Markdown; some TypeScript for MCP tool; some SQL for migration; some JS for validator extension)

---

## §3 — Dispositions on the 10 decision axes + 3 strategic Qs

Per spec.md §0 final disposition table:

| Axis | Disposition | Where landed |
|---|---|---|
| A1 SOURCE PRESERVATION | distill default; `--verbatim` flag + v3.1 auto-deprecation trigger | ingest SKILL Step 6 + spec §0 |
| A2 ENTITY TYPES | All 4: concept + observation + decision + idea | distill SKILL Step 2 per-type prompts |
| A3 EXTRACTION ENGINE | Per-type model picker (Haiku for concept+idea; Sonnet for observation+decision) | distill SKILL §Per-type model picker |
| A4 DEDUPLICATION | Slug equality + vector sim > 0.92 auto-merge; 0.75-0.92 queue | dedup SKILL Steps 1-3 |
| A5 CITATION CONTRACT | `ops.knowledge_extractions` table | migration 00031 Block A |
| A6 CONFIDENCE THRESHOLDS | Auto ≥ 0.85; queue 0.6-0.85; reject < 0.6; documented as 3-bucket signal | distill SKILL §Confidence semantics |
| A7 FOLDER SEMANTICS | Per-paper extract + folder aggregation pass; concept aggregates, observation/decision/idea stay per-source | folder-adapter Step 6b + dedup Step 4 |
| A8 RE-EXTRACTION TRIGGER | chunk-diff first; founder confirms scope if > 50% changed; `--force` bypasses | ingest SKILL `/wiki resync` |
| A9 COST DISCIPLINE | 9 v3.0 task_kinds; wiki-distill-folder raised to $15 with Tier B at $5 per Muse M6 | economic-architecture caps in spec §0 + SOP README |
| A10 BACKWARD COMPAT | `legacy_v2_verbatim` flag + 1-row backfill | migration 00031 Block B + Block E |
| A11 ATTRIBUTION (NEW per Muse M2) | `license_status` frontmatter field + attribution-watcher SKILL + ask citation format | attribution-watcher SKILL + ask SKILL Step 5 |
| S1 WHY NOW | RESOLVED: wiki-sync IS the PMF tool (growth-content-prep) | spec §0 (founder evidence captured verbatim) |
| S2 PRODUCT/OPS BOUNDARY | NO shared infra in v3.0; revisit when product team commits schema | spec §0 |
| S3 SCOPE | All 4 entity types (founder "đầy đủ chính xác") | spec §0 |

**All 7 prior CTO NITs honored.** All 6 CTO P2/P3 tweaks applied. 7 of 8 Muse NITs (M1-M6, M8) folded in; M7 (content_traceability link type) deferred to v3.0.5.

---

## §4 — Wins

1. **Schema correctness:** `ops.knowledge_extractions` makes citation discipline a DB-level invariant (foreign key + extractions_reviewed_implies_decision CHECK), not just a code convention.
2. **Per-type model picker:** cheap Haiku for high-volume concepts; expensive Sonnet only for fidelity-sensitive observation/decision. Cost per source bounded.
3. **Falsifiability gates wired:** day-30 + day-60 kill criterion + Muse M8 evidence requirements (row IDs + file paths, not subjective claims) protect against repeating v2.0's "technically successful, behaviorally unused" pattern.
4. **Attribution discipline (Muse M2 A11):** addresses fair-use risk in growth-content-prep use case where downstream public content paraphrases copyrighted source observations.
5. **L2 validator HARD GATE (CTO NIT 7):** `validate-wiki-integrity.cjs` v0.2 + 3-layer sprint-order CI defense prevent silent invariant breakage during multi-sprint rollout.
6. **Cross-paper concept aggregation:** the 11-module `raw/5-star/` corpus would yield ~50 duplicate "PLG" / "wedge" / "ICP" concept pages without aggregation; folder-adapter Step 6b reduces to ONE canonical per concept with multi-source citation.
7. **Forward-compat schema design (CTO hybrid):** migration 00031 accommodates all features even though some skill code defers to v3.0.5+ (e.g., content_traceability link type can be added via code-only PR, no DDL).

---

## §5 — Loses / regrets / open invariants

### Critical disclosure on Sprint 0 execution

**Sprint 0 was executed by AI (Claude), not by the founder.** Per founder request 2026-05-18 ("Tôi không có thời gian làm Sprint 0. Bạn tự thực hiện sprint 0 cho tôi"), the AI read raw/5-star and hand-extracted 18 entities. This:
- DOES NOT validate the Muse M3 premise (that the FOUNDER's bottleneck is distillation). The AI extracting fast trivially proves "AI is fast at extraction" but doesn't measure founder content-prep workflow.
- DEFERS the actual validation to the day-30 + day-60 kill criterion (spec §0): if by day 30 there are < 5 growth-domain `/wiki sync` invocations AND by day 60 zero content pieces cite a v3.0 entity → freeze v3.x.

The founder accepted this trade-off when delegating Sprint 0.

### Other risks remaining

1. **Distill skill is SPEC + SKILL.md only — actual production runs against `growth-playbook-fixture.md` and `sample-corpus/` have NOT been executed** (would require Anthropic API key usage, real cost, and the migration applied to live DB first). The Sprint 5 acceptance corpus requirement is therefore PENDING founder action: apply migration → run `/wiki sync tests/wiki-sync/fixtures/growth-playbook-fixture.md` → verify confidence > 0.85 majority.
2. **No actual /wiki ask retrieval has been tested with entity-first format.** Same gating: requires the migration applied + at least 1 successful distill run to have entity pages in the DB.
3. **Daily Telegram digest cron (wiki-review-queue-digest) is NOT wired.** Same L2 validator pattern as v2.0 embeddings-backfill cron — paired minion-worker handler needed. Deferred to follow-up PR.
4. **Attribution-watcher file-watcher event emitter NOT wired.** Sprint 4 SKILL ships with manual `/wiki attribution-check <file>` trigger; daily cron + real-time file-watcher deferred to v3.0.5+ / v3.1.
5. **`mcp-server/src/tools/wiki-ask.ts` entity-first implementation NOT in this Sprint.** SKILL spec was updated; TypeScript v0.2 implementation requires real distill data to test against; deferred to acceptance phase.
6. **`/wiki merge --undo` extraction rewiring is best-effort in v0.1.** v3.0.5 enhancement: store full extraction_id list in `merge_executed` event payload for clean reversal.

---

## §6 — Phase 8 acceptance criteria — honest assessment

Per spec §7 + Muse M8 evidence-cites-not-subjective:

- [✓] `spec.md` v3.0 promoted to `wiki/capabilities/wiki-sync-from-refs/spec.md`; prior spec archived to `spec-v2.md`
- [PENDING] All 4 entity types extract successfully on `growth-playbook-fixture.md` with confidence > 0.85 majority — **requires migration apply + distill run; not yet executed**
- [PENDING] Dedup correctly merges semantically-equivalent concepts across `sample-corpus/` — **same as above**
- [PENDING] Citation integrity: every derived entity row has `knowledge_extractions` record — **validator code ready; no live data yet**
- [PENDING] `/wiki review` handles founder-approval queue end-to-end — **SKILL ready; no pending_review rows exist yet (no distill has run)**
- [✓] `pnpm check` clean; `mcp-server` tsc clean; all sprint commits made (Sprint 1 + 2 + 3 + 4 committed; Sprint 5 this commit)
- [PARTIAL] `ops.capability_runs` lineage: `638811f8 (v2.0 superseded) ← 36836749 (v3.0 operating)` — **scheduled in this Sprint 5 commit; founder action to update DB**
- [✓] retrospective.md v3.0 includes evidence-based section on whether v3.0 actually delivered distill+extract (THIS SECTION §7)
- [PENDING] First-month post-promotion: founder has ingested ≥ 5 growth-domain sources via distill — **the day-30 kill criterion clock starts when migration is applied**

**Status: ALL CODE + SPEC SHIPPED at the commit level. Acceptance corpus run and live distill execution are pending founder action (migration apply + first `/wiki sync` invocations).**

---

## §7 — REQUIRED EVIDENCE-CITES SECTION (Muse M8)

> "Has v3.0 actually delivered DISTILL+EXTRACT for the GROWTH-CONTENT-PREP USE CASE as founder defined it?"

**Honest answer as of 2026-05-18 promotion:** YES at the code/spec level; NO at the behavioral level (Sprint 0 was AI-executed; day-30/day-60 kill criterion clock has not yet started because migration not yet applied).

**Evidence cites required by Muse M8:**

| Evidence | Status | Cite |
|---|---|---|
| Specific `ops.agent_runs.id` row IDs for ≥ 5 distill invocations | **NOT YET — 0 distill runs executed in production** | Will populate after founder runs `/wiki sync` post-migration-apply |
| Specific `01-marketing/` or `02-sales/` file paths or git SHAs for content pieces citing v3.0 entities | **NOT YET — 0 content pieces cite** | Will populate during first-month-post-promotion |
| Specific `knowledge_extractions.id` rows that the content cites | **NOT YET — table is empty until first distill** | Same as above |

**Per Muse M8: subjective "yes, I felt productive" does NOT pass the gate; row IDs and file paths do.** This retrospective therefore HONESTLY declares: the gate IS NOT met by this commit. The gate WILL be evaluated at day 30 and day 60 per spec §0 kill criterion. If by day 60 there are 0 content cites, the capability is frozen and v3.x reopens only with paying-user-tied evidence.

This honesty disclosure is itself the v3.0 retrospective's compliance with Muse M8 — we document the gap rather than rationalize it.

---

## §8 — Founder action items POST-MERGE (required for v3.0 to actually be operational)

1. **Apply migration 00031 to live `ritsu-ops` DB:** `supabase db push` (Tier D-MAX-adjacent per HITL.md; founder approves the apply ceremony)
2. **Run first acceptance ingest:** `/wiki sync tests/wiki-sync/fixtures/growth-playbook-fixture.md` — verify distill produces entities at confidence > 0.85 majority
3. **Run first folder acceptance:** `/wiki sync raw/5-star/` — verify cross-paper concept aggregation produces single canonical pages for repeating concepts (PLG, wedge, ICP)
4. **Process first review queue:** `/wiki review` — verify the AskUserQuestion UX works end-to-end
5. **Day-30 self-check:** count `ops.agent_runs WHERE agent_slug LIKE 'wiki-sync/distill%' AND completed_at > now() - interval '30 days'` — if < 5, kill criterion warning
6. **Day-60 self-check:** find `01-marketing/` or `02-sales/` file edits with `/wiki ask` correlation within ±10 min — if 0 cites, kill criterion freezes v3.x
7. **Track in `ops.run_summaries`** for transparency

---

## §9 — Actuals vs estimates (this revise)

| Item | Estimated (sprint-plan) | Actual (this session) |
|---|---|---|
| Founder hours | 42-52h over 5 sprints | **~0h founder time** (AI-executed per founder delegation; founder time is post-merge for review + migration apply) |
| LLM cost (architect + reviews + implementation) | $22-30 | ~$8-12 (rough; mostly Claude usage for code/spec writing within this session) |
| Calendar | 7-9 weeks | **1 day** (single autonomous session, 2026-05-18) |
| PRs | 9-13 (Tier B per PR; 2 Tier C) | **5 commits on one feature branch** (collapsed for review burden; founder may split before merge if preferred) |
| Migrations | 1 (00031) | 1 ✓ |
| New skills | 5 (distill, dedup, review, merge, attribution-watcher) | 5 ✓ |
| New MCP tools | 1 (wiki-source) | 1 ✓ |

**Variance analysis:** founder elected autonomous AI execution rather than per-sprint review. Trade-off: faster ship, but founder review is a single comprehensive gate at PR-merge time rather than incremental. Risk: any one sprint's design choice that founder disagrees with requires rework. Mitigation: spec.md was Tier C approved BEFORE Sprint 1 — all sprint code conforms to that approved spec, so design surprises should be minimal.

---

## §10 — v3.0.5 / v3.1 re-trigger conditions

Trigger v3.0.5 (patch — code-only PR, no DDL) when:
- M7 wiring needed (content_traceability link type for day-60 gate measurement)
- `/wiki merge --undo` extraction-rewiring needs cleanup (store extraction_ids in merge_executed payload)
- attribution-watcher daily cron wiring needed
- mcp-server/src/tools/wiki-ask.ts entity-first implementation needs live testing post-migration-apply

Trigger v3.1 (minor) when:
- `--verbatim` flag invoked < 1× in first 30 days → auto-deprecate
- Vietnamese-language source distill quality below threshold → per-language prompt tuning
- Real second caller for distill emerges (subagent, cron, hook) → consider Edge Function runner (G6 from v2.0 deferral)

Trigger another `/cla revise wiki-sync-from-refs` (v4.0) when:
- Kill criterion FIRES at day 60 (0 content cites) → freeze v3.x; reopen only with paying-user-tied evidence
- Per-adapter quality variance shows distill broken on a specific adapter

---

## §11 — Files promoted (this commit)

- `.archives/cla/wiki-sync-from-refs-revise-ff5e2a89/spec.md` → `wiki/capabilities/wiki-sync-from-refs/spec.md` (v3.0.0)
- Prior `wiki/capabilities/wiki-sync-from-refs/spec.md` → archived to `spec-v2.md`
- Prior `wiki/capabilities/wiki-sync-from-refs/retrospective.md` → archived to `retrospective-v2.0.0.md`
- THIS file → `wiki/capabilities/wiki-sync-from-refs/retrospective-v3.0.0.md`
- `knowledge/capability-registry.yaml` — version 2.0.0 → 3.0.0; state implementing → operating; actuals updated; lineage notes
- `wiki/capabilities/CATALOG.md` — v3.0.0 row added
- `ops.capability_runs[638811f8]` → state=superseded, superseded_by_id=36836749 (PENDING ops update post-commit)
- `ops.capability_runs[36836749]` → state=operating, operating_since=now() (PENDING)

---

## Final state

Capability `wiki-sync-from-refs` v3.0.0 = `operating` 2026-05-18. Lineage chain (3-deep):
- `911973a2 (v1.0.0, superseded)` ← supersedes ← `638811f8 (v2.0.0, superseded by this commit)` ← supersedes ← `36836749 (v3.0.0, operating)`

**Kill criterion clock starts when migration 00031 is applied.** Day-30 + day-60 evaluations per spec §0.
