# Wiki Sync from External Refs — Architecture Spec v3.0.0

**Capability:** `wiki-sync-from-refs`
**Version:** 3.0.0 (revise of v2.0.0; supersedes_id `638811f8-94d0-4fc8-8d61-dcf6db6a74c7`)
**Phase:** 5 (architect; Tier C — pending founder approval)
**Author:** /cla revise session `ff5e2a89-3877-45ea-a27a-171a64a3003d` (2026-05-18)
**Selected option:** **B (full 4-entity) + all 7 CTO NITs** (founder reconsidered after Phase 4 cabinet DEFER; new S1 evidence resolves PMF concern)
**Status:** DRAFT — pending @cto sanity review + Muse high-stakes-decision-panel + Tier C founder approval

---

## 0. FINAL DISPOSITION (pending Tier C founder approval)

Reviews completed 2026-05-18:
- @cto: **APPROVE-WITH-NITS** — [cto-review.md](./cto-review.md). All 7 prior CTO NITs honored Y/Y/Y/Y/Y/Y/Y; 6 P2/P3 tweaks added + 1 hard fix (ROLES.md drift).
- @oracle (Muse high-stakes-decision-panel substitute): **PROCEED-WITH-NITS** — [muse-panel.md](./muse-panel.md). 8 NITs (M1-M8); falsifiability gates required; ethical-compass A11 axis added.

Final commitments (this disposition supersedes any conflicting §1-§7 text):

### Selected option

**Option B (full 4-entity) + all 7 prior CTO NITs + 6 CTO P2/P3 tweaks + Muse NITs M1, M2, M3, M4, M5, M6, M8** (M7 = `content_traceability` link type deferred to v3.0.5 — not blocking). The growth-content-prep S1 evidence is the founder's stated rationale; the kill criterion below (M1) makes that claim falsifiable.

### Cost-cap audit (Muse M6 applied)

| Task kind | v3.0 cap | Tier B threshold | Notes |
|---|---|---|---|
| `wiki-distill-pdf` | $2.00 | — (auto) | PDF distill per source |
| `wiki-distill-folder` | **$15.00** (raised from $5) | **$5.00** | A 20-paper growth corpus at $0.50/paper avg = ~$10 expected; cap accommodates founder's stated use case |
| `wiki-distill-other` | $0.50 | — | URL/Markdown/YouTube/meeting |
| `wiki-ingest-verbatim` | $0.30 | — | `--verbatim` flag invocations |
| `wiki-review-batch` | $0.20 | — | One `/wiki review` session |
| `wiki-dedup-batch` | $0.30 | — | Per-source dedup pass |
| `wiki-ask` | $0.10 | — | Unchanged |
| `wiki-audit` | $0.50 | — | Unchanged |
| `wiki-merge` | $0.05 | — | Mostly DB rewires |

### Honest founder-time estimate (Muse M4 applied)

| Item | Original spec | Honest estimate |
|---|---|---|
| Founder hours | 30-40h over 5 sprints | **38-50h over 5 sprints** (1.3× risk multiplier if Sprint 1 validator rework triggers downstream re-Phase-5) |
| Calendar | 6-10 weeks OR compressed ~3 weeks | **7-9 weeks** (compressed-3-weeks option dropped — unrealistic given parallel customer-pillar work) |
| LLM setup + impl cost | $20-27 | $22-30 (same range; honest upper end) |

### HARD KILL CRITERION (Muse M1 applied — load-bearing for whether S1 was real)

> **If by day 30 post-promotion there are < 5 growth-domain `/wiki sync` invocations AND by day 60 post-promotion there are 0 `01-marketing/` or `02-sales/` content pieces citing a v3.0-extracted entity, FREEZE further v3.x investment. Reopen `/cla revise wiki-sync-from-refs` only with paying-user-tied evidence that includes explicit acknowledgment of why v3.0 didn't get used.**

This is not "Phase 8 retro will honestly reflect" — it is an automatic decision gate. `10-metrics/alerting/` SOP will fire a Tier B Telegram at day 30 (`ingest_count` check) and day 60 (`content_cite_count` check). If either gate fails, capability state transitions to `frozen` (new state to add in migration 00031 OR document as `state_payload.frozen_at = ts`).

### Sprint 0 — MANUAL WORKFLOW VALIDATION (Muse M3 applied — BEFORE Sprint 1 starts)

Before any code work on v3.0, founder spends **~2h** doing the distill-then-write workflow MANUALLY on ONE real growth playbook:
1. Read a 50-page growth playbook PDF (founder-chosen — preferably already in their reading queue)
2. Hand-extract ≥ 5 concepts + ≥ 3 observations + ≥ 2 decisions to a Markdown file
3. Use those extracted items to write a content paragraph (blog draft, social post, sales-page line — founder-chosen)
4. Write findings to `.archives/cla/wiki-sync-from-refs-revise-ff5e2a89/manual-workflow-test.md`:
   - Time spent at each step
   - Bottleneck identification: was the EXTRACTION the slow part? Or playbook selection? Or content writing itself?
   - Confidence: would automating extraction realistically save you 3-5h on the next playbook?

**Gate:** if manual extraction takes < 30 min on the 50-page playbook (i.e., the bottleneck is NOT distillation), v3.0 premise weakens. Re-confirm Phase 5 disposition with founder before Sprint 1 starts. Cost: 2h founder; if it kills v3.0, saves 35-50h.

### Attribution discipline — NEW axis A11 (Muse M2 + M5 applied)

| A11 sub-item | Commitment |
|---|---|
| Source RECORD frontmatter | NEW field `license_status` enum: `{public_domain, creative_commons, fair_use_excerpt, copyrighted_internal_only}`. Distill skill prompts founder via AskUserQuestion on first ingest of a source if not auto-inferable from source_kind |
| `/wiki ask` retrieval citation format | UPDATED — MUST include original source title, not just wiki slug. Format: `"<extracted_quote>" — extracted from [Hooked by Nir Eyal, ch. 4](wiki/books/hooked.md#chunk-7), confidence 0.92` |
| Copyrighted-source content trigger | When a `copyrighted_internal_only` source contributes ≥ 3 extracted observations to a single content draft (correlation via `01-marketing/` or `02-sales/` file edit ±10 min after `/wiki ask`), Tier B Telegram heads-up fires to founder per `growth-orchestrator` role's brand-voice review discipline. Skill: NEW `wiki-sync/attribution-watcher/SKILL.md` (Sprint 4) |
| Audit | `/wiki audit` checks: every source RECORD has `license_status` set; no `copyrighted_internal_only` source has > 5 extractions in `knowledge_extractions` without founder review |

### Sprint-order enforcement strategy (CTO 3-layer)

Sprint 1 (validators + migration 00031) MUST land before Sprint 2 (distill skill). Three layers of enforcement:

1. **Sprint plan declares dependency:** `wiki/capabilities/wiki-sync-from-refs/sprint-plan.md` (Phase 6 output) has `sprint_2.depends_on: [sprint_1]` in its frontmatter. Phase 6 sprint-planner enforces this in its template.
2. **Sprint 2 PR CI gate:** Sprint 2 PR's CI step runs a 3-line grep check that `scripts/cross-tier/validate-wiki-integrity.cjs` exists AND contains the literal string `extracted_from_source_id IS NOT NULL`. If absent → CI fails → PR cannot merge.
3. **Optional @cto subagent review:** Sprint 2 PR open triggers @cto review with explicit instruction to verify Sprint 1 validators are merged.

Minimum bar: (1) + (2). Layer (3) is optional but recommended.

### CTO P2/P3 tweaks applied to migration 00031 + spec

1. Migration 00031 header comment: explain asymmetric `link_type` CHECK on `knowledge_extractions` (constrained to 4 `extracted_*` values) vs `knowledge_links.link_type` (free-text) — different design intent.
2. Block C backfill: `RAISE NOTICE` → `RAISE WARNING` so Sprint 1 reviewer sees the line in CI output, not just psql notices.
3. Sprint 1 PR reviewer MUST explicitly verify RLS policy `extractions_read_anon_authenticated` doesn't leak copyrighted `raw_quote` to anon — adjust policy if needed (likely `auth.role() = 'service_role' OR auth.role() = 'authenticated'` instead of TO anon).
4. **ROLES.md drift fix (HARD):** `governance/ROLES.md` `etl-runner.tier2_schemas_write` doesn't list `ops.knowledge_*` at all (pre-existing drift from v2.0). Sprint 1 PR adds the grant: `ops.knowledge_pages`, `ops.knowledge_links`, `ops.knowledge_embeddings`, `ops.knowledge_extractions`. This is a Tier C change (governance edit) — Sprint 1 PR is a Tier C PR for this reason alone.
5. `mcp-server/src/tools/insert.ts` allowlist collapses into ROLES.md fix — insert.ts derives allowlist from ROLES.md; no separate edit.
6. `/wiki merge` gains `--undo` flag (Tier B preserves; without --undo it would need to be Tier C since merge is hard to reverse). Migration 00031 adds `deleted_at timestamptz NULL` column to `knowledge_pages` (additive) so `/wiki merge` soft-deletes (sets `deleted_at = now()`) and `/wiki merge --undo` clears it. Audit-trail-clean for the v3.1+ housekeeping job.

### Phase 8 acceptance — Muse M8 applied (evidence cites, not subjective)

`retrospective.md` v3.0 §7 MUST cite:
- Specific `ops.agent_runs.id` row IDs for the ≥ 5 growth-domain distill invocations
- Specific git commit SHAs or `01-marketing/` / `02-sales/` file paths for content pieces citing v3.0 entities
- Specific `knowledge_extractions.id` rows that the content cites

A subjective "yes, I felt productive" does NOT pass the gate. Phase 8 catalog-updater rejects retrospective.md if these citations are missing.

### Net effect on migration 00031

Adds 1 column to original draft (`deleted_at timestamptz NULL` on `knowledge_pages`). Otherwise unchanged from §3.1. RLS policy text adjusted per CTO P2/P3 #3.

### Effort summary

- **Sprint 0 (manual workflow validation):** ~2h founder, $0 LLM. BEFORE Sprint 1.
- **Sprint 1 (validators + migration + ROLES.md fix + governance edits):** ~6-8h founder, ~$3 LLM. Tier C PR.
- **Sprint 2 (distill skill + per-type model picker):** ~10-12h founder, ~$8 LLM.
- **Sprint 3 (dedup skill + folder aggregation + embeddings-backfill update):** ~8-10h founder, ~$4 LLM.
- **Sprint 4 (review + merge skills + attribution-watcher + ask SKILL update + audit SKILL update + MCP wiki-source tool):** ~10-12h founder, ~$5 LLM.
- **Sprint 5 (SOP-INGEST-001 rewrite + acceptance corpus + Phase 8 promotion):** ~6-8h founder, ~$3 LLM. Tier C PR.
- **Total:** ~42-52h founder over 5 sprints (~7-9 weeks); $23-30 LLM setup + recurring per-invocation cost.

### Re-trigger conditions for v3.1+ (if kill criterion NOT triggered)

- (a) `--verbatim` flag invoked < 1 time in first 30 days → auto-deprecate flag in v3.1 first PR (CTO NIT 1)
- (b) Founder retunes confidence threshold from 0.85 to a different value 3+ times → revisit A6 in v3.0.1
- (c) `content_traceability` telemetry from M7 lands → unlocks day-60 gate automated detection
- (d) Real second caller (subagent / cron / hook) needs `/wiki sync` invocation → revisit Edge Function runner (G6 from v2.0)
- (e) Per-adapter quality variance shows PDF distill consistently underperforms (< 0.7 conf majority) → consider per-adapter prompt tuning in v3.0.5

---

## 1. What's revised vs v2.0.0

This spec inherits all of v2.0.0's domain semantics that still apply (pillar ownership `06-ai-ops`, cost-bucket `ai-ops-knowledge`, single-source-of-truth principle "ref = source, wiki = projection", citation discipline, HITL tier mapping, 3-verb conceptual model `sync/ask/audit`, slug discipline `<col-slug>__<file-slug>`, chapter splitter, embeddings backfill cron, schema migrations 00027-00030 stay applied). Only the items below are revised.

### The core semantic flip

v1.0 + v2.0: `/wiki sync` = **ingest + index** (verbatim projection of source body + regex link extraction + vector embeddings).
v3.0: `/wiki sync` = **distill + extract** (LLM extracts entities — concept, observation, decision, idea — into separately-projected wiki/<type>/<slug>.md pages, each with citation back to source chunk via `ops.knowledge_extractions`).

The source body itself is no longer the wiki page; the **extracted entities are**. Source becomes a thin RECORD (frontmatter + summary + pointer to `raw/` + list of derived entities). Wiki/ becomes a derived knowledge graph, not a file-projection store.

### S1 — Why now (RESOLVED 2026-05-18)

The Phase 4 cabinet recommended DEFER on the premise that wiki-sync was internal infra alternative to PMF work. Founder added evidence 2026-05-18 that refutes the premise:

> "tôi cần dùng lệnh wiki này để extract + distill tri thức từ các tài liệu chuẩn đề chuẩn bị cho tìm kiếm khách hàng (việc quan trọng), đặc biệt liên quan đến growth … cái tôi cần là distill + extract được kiến thức quan trọng từ files/folders đầu vào để có thể viết các content, nội dung, plan…"

Translation: "I need to use this wiki command to extract + distill knowledge from standard/reference documents to PREPARE for customer acquisition (important work), especially related to growth … What I need is to distill + extract important knowledge from input files/folders to be able to write content, copy, plans…"

→ Wiki-sync v3.0 IS the PMF tool. It processes growth playbooks, customer-acquisition reference materials, sales/marketing literature into queryable concept/observation/decision/idea pages that directly accelerate founder content production. The 25-35h is not alternative-to-PMF; it is on-the-path-of-PMF. Cabinet DEFER premise dissolves.

Concrete return on investment: ~1h of distill on a growth playbook PDF replaces ~5h of read-and-summarize. Cohort of 10-20 growth playbooks distilled = a knowledge graph the founder queries while writing content, instead of re-reading source material per article.

### S2 — Product / Founder-Ops boundary (CONFIRM ISOLATION in v3.0)

NO shared infrastructure between Ritsu PRODUCT (user-facing distillation for textbook-style learning) and wiki-sync (founder-internal growth-content-prep). Different inputs (founder growth playbooks vs user textbook chapters), different outputs (concept/observation/decision/idea vs quiz/flashcard/mindmap), different citation discipline (reference RAG vs learning recall). Re-evaluate only when product team explicitly requests a wiki-sync prompt or schema as prototype.

### S3 — Scope: 4 entity types in v3.0 (CONFIRMED full per founder "đầy đủ chính xác")

All 4 entity types ship in v3.0: concept, observation, decision, idea. All 4 are well-suited to growth-content-prep workflow:
- **concept** = vocabulary (e.g., "PLG", "wedge", "ARR ramp", "ICP")
- **observation** = empirical claims (e.g., "Companies with X traction had Y churn outcome")
- **decision** = framework choices (e.g., "Pick wedge before brand", "Free trial > freemium for sub-$100 ACV")
- **idea** = unfinished thoughts to revisit (e.g., "What if onboarding email cadence A vs B?")

---

## 2. Decision axes — explicit dispositions

| Axis | Disposition | Rationale |
|---|---|---|
| **A1** SOURCE PRESERVATION | **B + CTO NIT 1**: distill default; `--verbatim` flag for v2.0 behavior; **explicit v3.1 auto-deprecation trigger in this spec §0**: if `--verbatim` invoked < 1 time in first 30 days post-promotion, remove flag in v3.1 first PR | Avoids Oracle v2.0 Finding 1.1 dual-code-path anti-pattern; auto-sunset prevents permanent legacy branch |
| **A2** ENTITY TYPES | All 4: concept + observation + decision + idea | Founder "đầy đủ chính xác"; all 4 serve growth-content-prep |
| **A3** EXTRACTION ENGINE | Per-type model picker: Haiku for concept + idea; Sonnet for observation + decision | Concepts are noun-phrases (Haiku fine); observations + decisions need fidelity to source phrasing (Sonnet); ~$0.04-0.10 per chunk average |
| **A4** DEDUPLICATION | Slug-equality fast path + vector similarity > 0.92 auto-merge; 0.75-0.92 → review queue (Tier B); < 0.75 = distinct | Standard pattern; threshold tunable in spec.md §0 if first 10 ingests show drift |
| **A5** CITATION CONTRACT | NEW `ops.knowledge_extractions` table per §2.1 below + page-level `review_state` column (NOT per-extraction state machine per CTO NIT 2) | Every derived entity MUST have ≥ 1 extraction row. Page-level state is simpler. |
| **A6** CONFIDENCE THRESHOLDS | Auto-accept ≥ 0.85; review 0.6 ≤ conf < 0.85; auto-reject < 0.6. **CTO NIT 4**: document confidence as coarse 3-bucket signal (~0.6/0.8/0.95) in distill/SKILL.md, not continuous probability | Haiku self-report is not calibrated probability; future tuning hooks must treat it as bucketed |
| **A7** FOLDER SEMANTICS | Per-paper extract (Haiku/Sonnet per type); folder-level aggregation pass at end (concept page cites all papers; observations stay per-paper-attached) | Cheaper than folder-level prompt with all 10 papers; quality regression acceptable for v3.0 |
| **A8** RE-EXTRACTION TRIGGER | chunk-diff first; founder confirms scope when > 50% of chunks changed via AskUserQuestion; `--force` bypasses chunk-diff | Saves cost on minor source edits |
| **A9** COST DISCIPLINE | Per-task-kind caps per §4 below. Total cost projection: setup ~$22-28 LLM; ~30-40h founder time over 5 sprints | Caps mean a single runaway folder triggers Tier B confirm at $2 |
| **A10** BACKWARD COMPAT | `legacy_v2_verbatim boolean DEFAULT false` column on `knowledge_pages`. Migration 00031 UPDATEs the 1 existing v2.0 row (`spaced-repetition`) → `true`. No migration wizard | 1 row to flag; trivial; preserves v2.0 fixture |

### CTO NITs explicitly applied (from Phase 4 cabinet)

1. **NIT 1: `--verbatim` v3.1 auto-deprecation trigger** in this spec §0 disposition table (above). Written into SOP-INGEST-001-wiki-sync README, not buried.
2. **NIT 2: page-level `review_state` only.** Migration 00031 adds `review_state` to `knowledge_pages`; extractions get `founder_decision text` only (no per-edge state machine to sync transactionally).
3. **NIT 3: partial index threshold-drift safeguard.** `idx_extractions_review_queue` predicate is `WHERE founder_reviewed = false AND confidence < 0.95` (not `BETWEEN 0.6 AND 0.85`) — over-includes a bit; index stays correct if founder retunes the 0.85 threshold to 0.80 or 0.90 in v3.0.1.
4. **NIT 4: confidence = coarse 3-bucket signal.** `distill/SKILL.md` documents this explicitly. Future tuning hooks read this — no calibrated-probability assumptions.
5. **NIT 5: per-type model picker** (Haiku vs Sonnet) per A3 above. Justified.
6. **NIT 6: `mcp__wiki__ask` description update in lockstep** with the entity-first retrieval rewrite. Same PR that rewrites the tool body must update its registered description string in `mcp-server/src/tools/index.ts`.
7. **NIT 7 (from gap-analysis): L2 wiki-integrity validator HARD GATE.** Sprint 1 MUST ship extended validators BEFORE Sprint 2 ships distill skill. Sprint 2 PR MUST NOT merge until Sprint 1 PR landed. (No hook enforces this today; sprint-planner's Phase 6 acceptance criteria for Sprint 2 explicitly cites Sprint 1 validators as a prerequisite.)

---

## 3. Component diff (what files change in v3.0)

### 3.1 Migrations (1 new file)

**`supabase/migrations/00031_wiki_distillation.sql`** — surgical single-DDL:

```sql
-- ============================================================================
-- 00031_wiki_distillation.sql — v3.0 distill+extract schema
-- ============================================================================
-- Reframes wiki-sync from verbatim-projection to distill+extract per founder's
-- 2026-05-18 reframe ("đầy đủ chính xác"). See:
-- - wiki/capabilities/wiki-sync-from-refs/spec.md v3.0.0 §0
-- - ops.decisions row hitl_tier='C' for this revise
--
-- Changes:
-- 1. NEW TABLE ops.knowledge_extractions — citation contract per (source_chunk,
--    derived_entity) with confidence, llm_model, raw_quote, founder_decision.
-- 2. knowledge_pages adds extracted_from_source_id (nullable FK; NULL = manual
--    or v2.0 legacy) + legacy_v2_verbatim boolean DEFAULT false +
--    review_state text DEFAULT 'auto_accepted' CHECK enum.
-- 3. Indexes for review queue + source-to-derived lookups.
-- 4. Backfill: UPDATE existing 1 row (slug='spaced-repetition') to
--    legacy_v2_verbatim=true.
-- ============================================================================

-- Block A: knowledge_extractions table
CREATE TABLE ops.knowledge_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  source_page_id uuid NOT NULL REFERENCES ops.knowledge_pages(id) ON DELETE CASCADE,
  source_chunk_index int,                      -- nullable; some extractions are page-level
  derived_page_id uuid NOT NULL REFERENCES ops.knowledge_pages(id) ON DELETE CASCADE,
  link_type text NOT NULL CHECK (link_type IN (
    'extracted_concept', 'extracted_observation', 'extracted_decision', 'extracted_idea'
  )),
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  llm_model text NOT NULL,
  extraction_cost_usd numeric,
  raw_quote text,                              -- literal source text supporting the extraction
  founder_reviewed boolean NOT NULL DEFAULT false,
  founder_decision text CHECK (founder_decision IN ('accepted', 'rejected', 'edited', 'merged') OR founder_decision IS NULL),
  founder_reviewed_at timestamptz,
  CONSTRAINT extraction_self_ref_distinct CHECK (source_page_id <> derived_page_id)
);

COMMENT ON TABLE ops.knowledge_extractions IS 'v3.0 citation spine. One row per (source_chunk → derived_entity) edge produced by /wiki distill. Founder reviews queue 0.6-0.85; auto-accept ≥0.85; auto-reject <0.6.';

-- Indexes
CREATE INDEX idx_extractions_source ON ops.knowledge_extractions(source_page_id);
CREATE INDEX idx_extractions_derived ON ops.knowledge_extractions(derived_page_id);
-- CTO NIT 3: widen partial predicate so threshold tuning doesn't invalidate index
CREATE INDEX idx_extractions_review_queue ON ops.knowledge_extractions(confidence, founder_reviewed)
  WHERE founder_reviewed = false AND confidence < 0.95;

-- Block B: knowledge_pages new columns
ALTER TABLE ops.knowledge_pages
  ADD COLUMN extracted_from_source_id uuid REFERENCES ops.knowledge_pages(id) ON DELETE SET NULL,
  ADD COLUMN legacy_v2_verbatim boolean NOT NULL DEFAULT false,
  ADD COLUMN review_state text NOT NULL DEFAULT 'auto_accepted'
    CHECK (review_state IN ('auto_accepted', 'pending_review', 'founder_approved', 'founder_rejected'));

COMMENT ON COLUMN ops.knowledge_pages.extracted_from_source_id IS 'v3.0: source RECORD page from which this entity was distilled. NULL = manually-created page OR v2.0 legacy verbatim page.';
COMMENT ON COLUMN ops.knowledge_pages.legacy_v2_verbatim IS 'v3.0: TRUE for v2.0-era verbatim pages preserved for backward compat. Audit treats these differently (no citation integrity check).';
COMMENT ON COLUMN ops.knowledge_pages.review_state IS 'v3.0: page-level review state. auto_accepted = above 0.85 confidence on all extractions; pending_review = at least one extraction in 0.6-0.85; founder_approved/rejected = /wiki review processed.';

CREATE INDEX idx_pages_extracted_from ON ops.knowledge_pages(extracted_from_source_id) WHERE extracted_from_source_id IS NOT NULL;
CREATE INDEX idx_pages_review_pending ON ops.knowledge_pages(review_state) WHERE review_state = 'pending_review';

-- Block C: backfill A10 — flag the 1 existing v2.0 verbatim row
DO $$
DECLARE
  v_rows int;
BEGIN
  UPDATE ops.knowledge_pages
    SET legacy_v2_verbatim = true
    WHERE slug = 'spaced-repetition';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE NOTICE 'A10 backfill: expected 1 row (slug=spaced-repetition), updated %', v_rows;
  END IF;
END $$;

-- Block D: RLS — mirror knowledge_pages RLS for the new table
ALTER TABLE ops.knowledge_extractions ENABLE ROW LEVEL SECURITY;
-- (Specific policies depend on migration 00010 + 00020 patterns; see CTO review for exact wording.)
CREATE POLICY extractions_read_anon_authenticated ON ops.knowledge_extractions
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY extractions_write_service_role ON ops.knowledge_extractions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Rollback (documented; NOT executed):
-- DROP INDEX ops.idx_pages_extracted_from;
-- DROP INDEX ops.idx_pages_review_pending;
-- ALTER TABLE ops.knowledge_pages
--   DROP COLUMN review_state,
--   DROP COLUMN legacy_v2_verbatim,
--   DROP COLUMN extracted_from_source_id;
-- DROP INDEX ops.idx_extractions_review_queue;
-- DROP INDEX ops.idx_extractions_derived;
-- DROP INDEX ops.idx_extractions_source;
-- DROP TABLE ops.knowledge_extractions;
```

**Rationale for single migration:** atomic apply on `db push`; rollback is one file; 4 surgical blocks all reversible. Block C backfill is a guarded `DO` block — bails noisily if the 1-row assumption fails.

### 3.2 Skills (4 new + 7 updates)

| Path | Change | Sprint |
|---|---|---|
| `06-ai-ops/skills/wiki-sync/distill/SKILL.md` | **NEW core engine.** LLM-driven entity extraction; per-type model picker (Haiku for concept+idea, Sonnet for observation+decision); writes `knowledge_extractions` rows; documents confidence as 3-bucket signal (CTO NIT 4); cost-bucket `ai-ops-knowledge` task_kinds `wiki-distill-*` | 2 |
| `06-ai-ops/skills/wiki-sync/dedup/SKILL.md` | **NEW.** Slug equality fast path + vector similarity > 0.92 auto-merge; 0.75-0.92 queue Tier B; cross-source equivalence across `knowledge_pages` | 3 |
| `06-ai-ops/skills/wiki-sync/review/SKILL.md` | **NEW.** Process `pending_review` queue: AskUserQuestion-driven approve/reject/edit per extraction OR per page; UPDATE founder_decision + page review_state; emit ops.events | 4 |
| `06-ai-ops/skills/wiki-sync/merge/SKILL.md` | **NEW.** Manual concept merge invoked by `/wiki merge <a> <b>`; rewires `knowledge_extractions.derived_page_id` from `b` to `a`; soft-deletes page `b`; emits ops.events | 4 |
| `06-ai-ops/skills/wiki-sync/SKILL.md` (umbrella) | UPDATE — verb table reflects v3.0 semantics; add distill/dedup/review/merge dispatch rows; mark v2.0 verbs (sync verbatim) as `--verbatim` flag invocation | 2 |
| `06-ai-ops/skills/wiki-sync/ingest/SKILL.md` | UPDATE — Steps 6-8 rewritten: Step 6 = run distill (replaces former extract-then-embed); Step 7 = dedup pass; Step 8 = write source RECORD + derived entity pages + extractions rows + embeddings on entity pages | 2 |
| `06-ai-ops/skills/wiki-sync/adapters/{markdown,pdf,url,youtube,meeting,folder}-adapter/SKILL.md` | UPDATE (minor) — adapters output chunks; chunks feed distill (not just embed); folder-adapter additionally calls folder-level aggregation pass per A7 | 2 |
| `06-ai-ops/skills/wiki-sync/link-extractor/SKILL.md` | UNCHANGED — regex `[[concept/X]]` extraction stays as PARALLEL pass; distill is separate; both write `knowledge_links` rows | — |
| `06-ai-ops/skills/wiki-sync/embeddings-backfill/SKILL.md` | UPDATE — also backfills embeddings on derived entity pages | 3 |
| `06-ai-ops/skills/wiki-sync/ask/SKILL.md` | UPDATE — entity-first retrieval: prefer `knowledge_pages WHERE extracted_from_source_id IS NOT NULL` over source RECORD pages; citation format: "extracted from [source.md#chunk-N]" footer with `raw_quote` | 4 |
| `06-ai-ops/skills/wiki-sync/audit/SKILL.md` | UPDATE — 3 new checks: distillation completeness (source pages with no derived entities) + dedup consistency (semantically-equivalent concepts split across 2 pages, flagged by post-hoc sim > 0.92) + citation integrity (every derived `extracted_from_source_id` MUST have matching `knowledge_extractions` row) | 4 |

### 3.3 SOP (1 update)

**`06-ai-ops/sops/SOP-INGEST-001-wiki-sync/{README.md,flow.yaml}`** — pipeline gains stages between extract + write:

```
INPUT: raw/<topic>/<file>  OR  URL  OR  folder
         │
         ▼
 1. fetch (adapter)                            [unchanged from v2]
 2. dedup check                                 [unchanged from v2]
 3. acquire advisory lock                       [unchanged from v2]
 4. chapter split (if needed)                   [unchanged from v2]
 5. extract chunks (adapter)                    [unchanged from v2; chunks now feed distill]
 6. distill entities                            [NEW v3 — per-type Haiku/Sonnet; writes knowledge_extractions]
 7. dedup pass (per-source + folder aggregation)[NEW v3 — semantic + slug match]
 8. embed entity pages                           [unchanged — embedding model unchanged]
 9. write source RECORD + entity pages + DB rows [updated — multi-page write per source]
10. emit events + cost                          [unchanged from v2]
         │
         ▼
OUTPUT: wiki/<source-type>/<source-slug>.md (RECORD)
      + wiki/concept/<slug>.md, wiki/observation/<slug>.md, wiki/decision/<slug>.md, wiki/idea/<slug>.md (entities)
      + ops.{knowledge_pages × N, knowledge_extractions × M, knowledge_links × K, knowledge_embeddings × P, events, cost_attributions}
```

State machine `ops.ingestion_jobs.state` gains transient state `distilling` between `processing` and `completed`.

### 3.4 Tier 1 yamls

**`knowledge/manifest.yaml`** — add `ops.knowledge_extractions` under `tier2_operational.schemas.ops.tables`; bump `version`.

**`knowledge/capability-registry.yaml`** — bump `wiki-sync-from-refs.version` 2.0.0 → 3.0.0; description updates to lead with distill+extract; migration_files appends 00031; actual_cost_setup_usd + actual_founder_hours updated post-Sprint-5; notes appends lineage `638811f8 (v2.0 superseded) ← 36836749 (v3.0 operating)`.

**`knowledge/ingestion-sources.yaml`** — each source kind gains `distillation_supported: true` flag (default true in v3.0); `wiki_target` semantics documented as "multi-page output (RECORD + entities)".

**`knowledge/link-inference-rules.yaml`** — UNCHANGED. Link extraction stays parallel to distill.

**`knowledge/feature-flags.yaml`** — add:
```yaml
  wiki_sync_distill_enabled:
    default: true        # v3.0.0 default-on
    description: "Run distill+extract pipeline by default. --verbatim flag opts out."
  wiki_sync_review_queue_telegram_digest:
    default: true
    description: "Daily Telegram digest of pending_review extraction count."
```

**`knowledge/economic-architecture.md`** — replace v2.0 caps with v3.0 caps per §4 below. Keep `wiki-ingest-verbatim` for `--verbatim` invocations.

**`knowledge/schedules.yaml`** — add `wiki-review-queue-digest` cron (daily, 09:00 ICT; minion-worker handler emits Telegram if `pending_review` count > 0).

### 3.5 Commands

**`.claude/commands/wiki.md`** — full verb table refresh per founder brief Part 5:

| Verb | v3.0 semantic | HITL |
|---|---|---|
| `/wiki sync <path>` | DEFAULT = distill+extract. Multi-page output. | A (B if cost > cap) |
| `/wiki sync <path> --verbatim` | v2.0 passthrough: single RECORD page, no distill | A |
| `/wiki sync <path> --split=<toc\|count=N\|heading=h2>` | Chapter split (unchanged from v2.0); chapters become distill input | A |
| `/wiki sync <path> --force` | Re-extract everything (bypass chunk-diff) | B |
| `/wiki resync <path>` | Chunk-diff first; re-extract only changed chunks | A (B if > 50% changed) |
| `/wiki distill <path>` (alias) | Same as `/wiki sync`; explicit verb for clarity | A |
| `/wiki extract <path> --type=concept\|observation\|decision\|idea` | Selective extraction (one entity type) | A |
| `/wiki merge <slug-a> <slug-b>` | Manual dedup: merge two pages founder identifies as same | B |
| `/wiki source <slug>` | List all derived entities from a source RECORD (reverse lookup) | A |
| `/wiki review` | Process founder-review queue (Tier B per extraction) | B per item |
| `/wiki ask "<question>"` | UPDATED: entity-first retrieval; citation format includes raw_quote | A |
| `/wiki audit` | UPDATED: distillation completeness + dedup consistency + citation integrity checks | A |
| `/wiki audit --fix` | Audit + offer auto-fixes (per fix class) | B per PR |
| `/wiki list [--type=...]` | Unchanged | A |
| `/wiki status` | UPDATED: include distillation queue depth + review queue size | A |

### 3.6 MCP server

| Path | v3.0 change |
|---|---|
| `mcp-server/src/tools/wiki-ask.ts` | UPDATE — entity-first retrieval per §3.5 ingest spec. **CTO NIT 6**: registered description string in `tools/index.ts` updated in same PR. |
| `mcp-server/src/tools/wiki-list-pages.ts` | UPDATE (minor) — optional filter `extracted_from_source_id IS NOT NULL` to list entity pages only |
| `mcp-server/src/tools/wiki-get-page.ts` | UPDATE — returned row includes new columns `extracted_from_source_id`, `legacy_v2_verbatim`, `review_state` |
| (NEW) `mcp-server/src/tools/wiki-source.ts` | NEW tool — given a source page slug, list all derived entity pages with their `knowledge_extractions` confidence + raw_quote |

### 3.7 Scripts

| Path | v3.0 change |
|---|---|
| `scripts/wiki-sync/ingest.cjs` | UPDATE — adds `--verbatim` flag handling; deterministic file-side prep stays; LLM distill step stays in skill-walked path; calls supabase-ops MCP for multi-page writes |
| `scripts/sync/backfill-wiki-embeddings.cjs` | UPDATE — also backfill embeddings for derived entity pages (page_type IN concept/observation/decision/idea where `extracted_from_source_id IS NOT NULL`) |
| `scripts/cross-tier/validate-wiki-integrity.cjs` | **CTO NIT 7 HARD GATE — ships Sprint 1.** Adds 3 invariants: (a) every page with `extracted_from_source_id IS NOT NULL` has ≥ 1 `knowledge_extractions` row pointing to it; (b) every `knowledge_extractions.source_page_id` exists and matches `derived_page_id.extracted_from_source_id`; (c) no semantically-equivalent concept pages (cosine sim > 0.92 on title + first 200 chars of summary) |

### 3.8 Tests + fixtures

| Path | Change |
|---|---|
| `tests/wiki-sync/fixtures/sample.md` | KEEP (v2.0 baseline) |
| `tests/wiki-sync/fixtures/sample-distill.md` | NEW — small Markdown with ≥ 3 extractable concepts + ≥ 2 observations + ≥ 1 decision for v3.0 acceptance |
| `tests/wiki-sync/fixtures/growth-playbook-fixture.md` | NEW — copyright-clear growth/customer-acquisition fixture (the founder's actual use case); ≥ 5 concepts (PLG, ICP, wedge, etc.) + ≥ 3 observations + ≥ 2 decisions |
| `tests/wiki-sync/fixtures/sample-distill-pdf.pdf` | NEW (Sprint 2-3) — copyright-clear ≥ 20pp PDF for distill end-to-end |
| `tests/wiki-sync/fixtures/sample-corpus/` | NEW — 3-5 markdown files about the same growth domain (cross-source dedup validation) |
| `tests/wiki-sync/distill.test.ts` | NEW — Sprint 2; confidence > 0.85 majority assertion |
| `tests/wiki-sync/dedup.test.ts` | NEW — Sprint 3; cross-source dedup |
| `tests/wiki-sync/citation-integrity.test.ts` | NEW — Sprint 1 (alongside validator); every derived entity traces to source chunk |
| `tests/wiki-sync/review-flow.test.ts` | NEW — Sprint 4; founder-review queue UX |
| `tests/mcp-server/wiki-ask-entity-first.test.ts` | NEW — Sprint 4; retrieval prefers entity pages |
| `tests/cross-tier/validate-wiki-integrity-v3.test.ts` | NEW — Sprint 1; validator unit tests |

---

## 4. Cost & calendar

| Item | Value |
|---|---|
| Setup cost (LLM — Phase 5-7 architect + reviews + Tier C ceremony) | ~$5-7 (this revise's own spend) |
| Implementation cost (Sprint 1-5 LLM for code generation + iteration) | ~$15-20 |
| Recurring cost (per `/wiki sync` invocation) | $0.05-2.00 depending on adapter + size |
| Founder hours (review + Tier C ceremony + 5-PR review burden) | ~30-40h over 5 sprints |
| Calendar | 5 sprints × 2-week sprint cadence (≈ 6-10 weeks elapsed) OR compressed to ~3 weeks if multi-session push |
| Migrations | 1 (00031) |
| New skills | 4 (distill, dedup, review, merge) |
| New MCP tools | 1 (wiki-source) |
| New scripts | 0 (existing scripts updated) |
| Sprint count | 5 |

### Per-task-kind cost caps (v3.0 active set)

| Task kind | Cap | Notes |
|---|---|---|
| `wiki-distill-pdf` | $2.00 | PDF distill: chapter-split + per-chunk extract; 5-20 chunks × $0.05-0.10 |
| `wiki-distill-folder` | $5.00 (Tier B confirms above $2) | 10-paper folder = 10× per-file cost |
| `wiki-distill-other` | $0.50 | URL/Markdown/YouTube/meeting: typically 1-5 chunks |
| `wiki-ingest-verbatim` | $0.30 | `--verbatim` flag invocations; same as v2.0 `wiki-ingest-other` |
| `wiki-review-batch` | $0.20 | One `/wiki review` session; LLM may judge equivalence |
| `wiki-dedup-batch` | $0.30 | Per-source dedup pass; mostly OpenAI embedding cost |
| `wiki-ask` | $0.10 | Unchanged |
| `wiki-audit` | $0.50 | Unchanged |
| `wiki-merge` | $0.05 | Mostly DB rewires; minimal LLM |

DEPRECATED (kept for transition window through v3.1):
- `wiki-ingest-pdf` ($1.00) — replaced by `wiki-distill-pdf` + `wiki-ingest-verbatim`
- `wiki-ingest-other` ($0.30) — replaced by `wiki-distill-other` + `wiki-ingest-verbatim`

---

## 5. Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| L2 validator NOT ready Sprint 1 → bad extractions slip through Sprint 2 CI | MEDIUM | HIGH | **CTO NIT 7 HARD GATE**: Sprint 2 PR explicitly blocked until Sprint 1 validator PR merged; sprint-planner Phase 6 acceptance criteria for Sprint 2 cites this. |
| Distill quality varies across adapters (PDF distill quality ≠ URL distill quality ≠ YouTube distill quality) | HIGH | LOW (per-adapter tuning expected) | Adapter-specific extraction prompts (per A3 model picker); Sprint 2-3 iteration with founder feedback |
| Cross-source dedup mis-merges semantically-distinct concepts ("attention" ML vs psychology) | MEDIUM | MEDIUM (silent data loss) | Founder-review queue 0.6-0.85 catches borderline; auto-merge only above 0.92; per-merge audit log row; `/wiki merge` for manual override |
| `knowledge_extractions` grows unbounded if every chunk yields entities | LOW | LOW | Per-task-kind cost caps act as natural ceiling; monthly housekeeping in v3.1+ |
| Migration 00031 RLS mis-grant (raw_quote in extractions = sensitive source text) | LOW | HIGH | RLS policies mirror `knowledge_pages` (service_role write; anon/authenticated read); @cto reviews exact wording in Sprint 1 PR |
| Founder-review queue UX unusable (too much friction) | MEDIUM | MEDIUM | First iteration: Telegram daily digest + `/wiki review` interactive session; tune cadence per founder feedback in Sprint 4 |
| `--verbatim` flag becomes permanent dual-code-path (Oracle v2.0 Finding 1.1 anti-pattern) | LOW (auto-deprecation trigger active) | LOW | **CTO NIT 1**: spec §0 disposition explicitly states "if `--verbatim` invoked < 1× in 30 days post-promotion, remove flag in v3.1 first PR" |
| Per-type model picker (Haiku for concept; Sonnet for observation/decision) cost-out-of-band | LOW | LOW | Per-task-kind cap acts as backstop; founder Telegram alert at 80% monthly budget per economic-architecture.md |
| Confidence-as-bucketed-signal documentation forgotten; future hook treats as continuous | MEDIUM | MEDIUM | **CTO NIT 4**: explicit text in `distill/SKILL.md`; code review at Sprint 2 PR checks for this |
| Phase 5 spec.md drifts during implementation (5-sprint span) | MEDIUM | MEDIUM | `/cla resume wiki-sync-from-refs` re-runs Phase 0 drift check; if main moved significantly, re-validate Phase 5 dispositions |
| Founder energy state worsens during 5-sprint span (1-person SPOF) | HIGH | HIGH | Calendar can stretch to 6-10 weeks at lower hours/week; HEALTH alerts via 09-founder/health pillar; sprint-planner explicitly notes flex |
| Growth-content-prep use case fails to materialize 5 acceptance ingests in first month post-promotion | MEDIUM | MEDIUM | **Phase 8 retro MUST honestly answer**: "did v3.0 actually deliver distill+extract for the growth-content-prep use case as defined?" (per founder brief) |

---

## 6. Open NITs for @cto + Muse review (this draft)

1. **Per-source dedup batch vs incremental** — Phase 3 NIT #2 was "tentative: batch at end of each source ingest, with per-corpus batch when folder-adapter dispatches." Architect commits this — but should the per-corpus batch run BEFORE or AFTER individual source ingests complete? Tentative: AFTER (let each source finish + dedup local; then folder pass merges across). @cto + Muse reviewers — does this give the right wins per A7?
2. **CLI helper extension to distill** — Phase 3 NIT #3 said "distill stays skill-walked in v3.0; CLI helper handles file-side prep." Confirm: `scripts/wiki-sync/ingest.cjs` v0.3 (Sprint 2-3) handles `--verbatim` deterministic path; calls supabase-ops MCP for entity-page writes; LLM distill stays in Claude Code session. No Edge Function in v3.0 per v2.0 Hybrid B/A G6 disposition.
3. **Single-pass vs double-pass confidence** — Phase 3 NIT #4: single-pass Haiku self-report in v3.0; double-pass (model-of-model) as v3.1 if first 10 ingests show > 30% mis-confidence. @cto — is this the right metric for "should we double-pass"?
4. **Telegram heartbeat for review queue** — Phase 3 NIT #6: per-source (one msg per source ingest with "N pending review" link) + daily digest if backlog > N. Confirm N=5 daily digest threshold.
5. **Folder-level aggregation prompt** — A7's per-paper + folder-level aggregation pass: the folder pass needs to know which CONCEPTS to aggregate without the source bodies present (cost limit). Architect commits: folder pass uses cosine sim > 0.92 on entity name + 200-char summary, NOT a full re-distill. @cto — is this a quality concern?
6. **Growth-content-prep specific entity types** — should v3.0 add a "tactic" or "playbook-move" entity type beyond the 4? Architect's recommendation: NO — `observation` covers "X tactic produced Y outcome" and `decision` covers "Pick tactic A over B". Adding "tactic" inflates the page_type CHECK enum (currently has 13 values, no room without ALTER) for no clear semantic win. v3.1+ if growth-content-prep actual use shows the 4 types miss a category.
7. **Tier 1 ROLES.md update** — does `etl-runner` need a new permission to write `ops.knowledge_extractions`? Per existing role grant `tier2_schemas_write: [metrics.*, ops.agent_runs, ops.tier3_index]` — knowledge_extractions is `ops.*`. Need explicit grant for `ops.knowledge_extractions` OR a glob `ops.knowledge_*`. @cto verifies.
8. **MCP tools/insert.ts allowlist** — `ops.knowledge_extractions` must be added to the allowlist in `mcp-server/src/tools/insert.ts` so distill skill can INSERT via the MCP. Same PR as migration 00031.
9. **Founder-decision audit trail on `/wiki merge`** — when founder runs `/wiki merge <a> <b>`, the merge rewires extractions from `b` to `a` and soft-deletes `b`. Should the soft-delete also `legacy_v2_verbatim: true` + `review_state: founder_rejected`? Or is a NEW state needed? Architect tentative: re-use `founder_rejected` to keep the enum small. @cto + Muse — what's the audit-trail cleanest shape?
10. **Sprint 5 acceptance criteria — growth fixture** — Phase 8 retro requirement: "5 ingests across PDF/Markdown/URL/folder must all produce confidence > 0.85 majority before promotion." The fixtures must include growth/customer-acquisition material (per founder's S1 evidence), not just generic learning material like Make-It-Stick. Architect commits: at least 2 of 5 acceptance ingests are growth-domain.

---

## 7. Acceptance criteria (Phase 8)

Per founder brief — revise complete when ALL:

- [ ] `spec.md` v3.0 promoted to `wiki/capabilities/wiki-sync-from-refs/spec.md`; prior spec archived to `spec-v2.md`
- [ ] All 4 entity types (concept + observation + decision + idea) extract successfully on `tests/wiki-sync/fixtures/growth-playbook-fixture.md` with confidence > 0.85 majority
- [ ] Dedup correctly merges semantically-equivalent concepts across `sample-corpus/` (seeded with 3 papers mentioning "PLG" or "wedge")
- [ ] Citation integrity: every derived entity row has `knowledge_extractions` record linking back to a real source chunk (validator green on `validate-wiki-integrity.cjs`)
- [ ] `/wiki review` handles founder-approval queue cleanly end-to-end (UX usable for batch of 10+ pending)
- [ ] `pnpm check` clean; `mcp-server` tsc clean; all 5 sprint PRs merged
- [ ] `ops.capability_runs` lineage: `638811f8` (v2.0 superseded) ← `36836749` (v3.0 operating)
- [ ] `retrospective.md` v3.0 includes section: "Has v3.0 actually delivered DISTILL+EXTRACT for the GROWTH-CONTENT-PREP USE CASE as founder defined it?" Required to be answered honestly with evidence (number of growth playbooks ingested; number of content pieces written citing v3.0-extracted entities)
- [ ] First-month post-promotion: founder has ingested ≥ 5 growth-domain sources via distill (S1 evidence validation)

---

## 8. Phase 5 done — state transition

Pending Tier C founder approval:
- `ops.capability_runs[36836749…]` `phases_completed` += `5`; `current_phase → 6`.
- `ops.decisions` row INSERT with `hitl_tier='C'`, payload linking this spec.md + cabinet polls + @cto verdict + Muse panel synthesis.
- `state_payload.selected_option = 'B_full_4_entity_with_cto_nits'`.
- INSERT `ops.capability_phase_events` (phase=5, event_type='completed').
- INSERT `ops.events` (event_type='ritsu.capability.revise_phase_5_completed').

Next phase: **Phase 6 — Sprint planner (`sprint-planner` mode=revise)**. 5-sprint multi-week plan with Sprint 1 = validator + migration (CTO NIT 7 HARD GATE precedes distill).
