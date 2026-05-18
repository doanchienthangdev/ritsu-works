# Retrospective — wiki-sync-from-refs revise v1.0.0 → v2.0.0

**Capability run:** `638811f8-94d0-4fc8-8d61-dcf6db6a74c7`
**Supersedes parent:** `911973a2-5d28-4718-a1c8-c43cc41d317d`
**Session:** `a3858b7d-fc82-4d90-bb67-84d6f5f547b1`
**Phase:** 8 (catalog update + promotion)
**Date:** 2026-05-17 (start → promotion same calendar day)

---

## What was the revise about

Sprint 1 of wiki-sync v1.0 shipped 2026-05-16 (PR #35). Day after, founder ran the first real `/wiki sync tests/wiki-sync/fixtures/sample.md` end-to-end. The run surfaced **6 distinct gaps** between the v1.0 spec/SKILLs and operational reality, and founder also requested **folder-as-collection** scope addition (Cách C). Per parent `sprint-plan.md:138` ("If Sprint 1 reveals migration needs revision → use `/cla revise`") this triggered the v2.0.0 revise.

## What shipped

**8 PRs over one session (2026-05-17):**

| PR | Commit | Scope | LOC |
|---|---|---|---|
| #37 | 905be05 | Migrations 00028 + 00029 (CLA evolution sub-flow unblock) + first wiki page artifact | +183 |
| #38 | 321013c | Migration 00030 (3 ALTERs: source_ref + cost_attributions.model nullable + parent_job_id CASCADE) | +105 |
| #39 | c6a8808 | chapter-splitter v2.0 real impl (toc / count=N / heading=h2) | +318 |
| #40 | 08e44e4 | folder-adapter + CLI helper v0.1 + G2 regex + G3 backfill scaffolds + Tier 1 yamls | +986 |
| #41 | 0e19cdb | YouTube + meeting adapter realizations (STUB → real) | +428 |
| #42 | (merged) | /wiki ask SKILL real + 3 mcp-server wiki tools + link-extractor LLM-fallback spec | +695 |
| #43 | (merged) | /wiki audit SKILL real + L2 wiki-integrity validator + check-consistency wiring | +397 |
| #44 (THIS) | (pending) | Phase 8 promotion: spec → wiki/capabilities/, retrospective, registry to operating, CATALOG, supersede chain | TBD |

**Total LOC added across 8 PRs:** ~3,100+ lines (mostly SKILL.md prose; some real TS for MCP tools; some .cjs for validator + CLI helper)

## Dispositions on the 6 Sprint 1 gaps

| Gap | Per Tier C decision (Hybrid B/A) | Where landed |
|---|---|---|
| G1 — `source_url` vs `source_ref` naming drift | RENAME column in migration 00030 Block A | PR #38 |
| G2 — Link-extractor regex misses concept→concept | Added `related_concept` rule + CTO NIT 2 ordering safety | PR #40 |
| G3 — Embedding deferral path missing | Soft-defer + scripts/sync/backfill-wiki-embeddings.cjs v0.1 dry-run stub + SKILL prose for v0.2 | PR #40 |
| G4 — `cost_attributions.model NOT NULL` forces fake rows | `ALTER COLUMN model DROP NOT NULL` in migration 00030 Block B | PR #38 |
| G5 — chapter-splitter STUB + missing `parent_job_id` | `parent_job_id` ADD COLUMN + chapter-splitter STUB → real | PR #38 + #39 |
| G6 — No executable runner | scripts/wiki-sync/ingest.cjs v0.1 (markdown + folder; defers PDF/URL/YouTube/meeting to v0.2; defers DB writes to caller via supabase-ops MCP) | PR #40 |

## Folder = collection (Cách C) — what landed

Per Phase 5 architect spec + Tier C decision: **deferred new `'collection'` page_type to v2.1**; v2.0 reuses `'book'` page_type for folder children with global UNIQUE slug discipline `<col-slug>__<file-slug>`.

| Q | Decision (Hybrid B/A) | Why |
|---|---|---|
| Q1 page_type | Reuse `'book'` for v2.0 | n=1 fixture evidence insufficient to commit new enum value; CHECK enum is forward-additive |
| Q2 slug discipline | `<col-slug>__<file-slug>` global UNIQUE | Ugly but boring + reversible; saves the one-way-door migration risk |
| Q3 adapter dispatch | folder-adapter iterates files alphabetically, dispatches to sibling adapters | PR #40 |
| Q4 parent_job_id | Shared with chapter-splitter (migration 00030 Block C) | PR #38 |
| Q5 recursive | Refuse recursive subdirs with workaround message; v2.1 candidate | PR #40 (folder-adapter SKILL Step 1) |
| Q6 filters | Skip hidden files + skip unsupported extensions silently with summary | PR #40 |

## Where Phase 5 architect was overridden by founder

@cto (APPROVE WITH NITS) confirmed Option B technically viable. @oracle (PROCEED WITH DOWNGRADE, adversarial critic) argued n=1 fixture + premature Edge Function commit. Founder picked Option D (Hybrid B/A + all 5 CTO nits) — taking Oracle's downgrade on G6 (no Edge Function v2.0), Q1 (reuse `'book'`), Q2 (ugly slug) while keeping B's bug-fix schema work (G1/G3/G4/G5). All 5 CTO nits applied:

1. NIT 1: folder-adapter heartbeat = start + end only (NOT per-file)
2. NIT 2: regex rule ordering safety documented in link-inference-rules.yaml
3. NIT 3: parent_job_id ON DELETE CASCADE (was SET NULL in draft)
4. NIT 4: backfill cron self-throttle (skip if last 6h had 0 affected rows)
5. NIT 5: slug-collision convention documented in SOP + adapter + migration header

## What was deferred (legitimately, not abandoned)

| Item | Disposition | Re-trigger |
|---|---|---|
| Edge Function `supabase/functions/wiki-sync/` | v2.1 | When a second caller exists (subagent, cron, hook) — currently only `/wiki sync` invokes |
| `'collection'` page_type enum value | v2.1 | When ≥ 3 folder ingests reveal real friction with `'book'` reuse |
| `(page_type, slug)` UNIQUE relax | v2.1 | When `<col>__<file>` slug ugliness shows up in retrieval results |
| Recursive folder ingestion | v2.1 | When founder requests nested collections |
| CLI helper v0.2 (PDF/URL/YouTube/meeting + DB writes) | next PR series | When subagents/cron need it; +`@supabase/supabase-js` dep |
| Backfill v0.2 (actual OpenAI calls) | next PR series | When `OPENAI_API_KEY` provisioned + `openai` npm dep approved |
| Cron wiring for embeddings-backfill | small follow-up PR | Needs minion-worker handler key in `SKILL_REGISTRY` (paired with schedules.yaml entry per L2 validator) |
| `wiki_ask` v0.2 (real OpenAI embedding + claude synthesis) | next PR series | When `OPENAI_API_KEY` + `openai` + `anthropic` deps approved + `wiki_sync_llm_fallback` flag flipped |
| Link-extractor LLM-fallback actual wire-up | next PR series | Sprint 4 measurement of regex-only baseline |
| `scripts/sync/rebuild-wiki-embeddings.sh` | follow-up PR | When backfill v0.2 lands |
| `scripts/cross-tier/validate-cli-sop-parity.cjs` | follow-up PR (CTO Sprint 4 cleanup) | When CLI v0.2 lands (so drift detector has something to validate) |
| Test fixtures (sample-large.pdf, sample.vtt, audit-corpus/, sample-folder/) | test-fixtures PR | Need copyright-clear content founder controls |
| mcp-server tests | when mcp-server test infra lands (no current pattern) | Defer |

## Wins (compared to v1.0)

1. **Schema correctness:** `source_ref` is now the canonical column name matching SKILL vocabulary; `cost_attributions.model` allows non-LLM pipeline steps (compounds across future capabilities, not just wiki-sync).
2. **Chapter splitter works:** real 3-mode implementation (toc/count/heading) ready for first PDF ingest.
3. **Folder support:** founder can now drop a `raw/papers/llm-2025/` directory and get N wiki pages with parent/child linkage.
4. **CLI helper (v0.1):** deterministic file-side steps reproducible by subagents and cron — first concrete step away from "Claude must be in the loop" for wiki-sync.
5. **MCP exposure:** other agents can now call `mcp__wiki__list_pages` + `mcp__wiki__get_page` + (stub) `mcp__wiki__ask` to cite wiki content in their replies.
6. **Audit + CI validator:** `/wiki audit` SKILL real + automated L2 validator catches integrity drift on every PR.
7. **Unblocked CLA evolution sub-flows:** migrations 00028 + 00029 (bonus deliverables of Phase 0) mean future `/cla fix|extend|revise|tune|deprecate` work mid-implementation without hitting the lock/uniqueness wall.

## Loses / regrets / open invariants

1. **n=1 evidence concern (Oracle Finding 1.4):** schema commitments (source_ref rename, parent_job_id CASCADE direction) are based on ONE acceptance run of ONE Markdown fixture. PDF / URL / YouTube / meeting adapters may surface different gaps that force re-revise.
2. **Edge Function dual-path risk (Oracle Finding 1.1):** by downgrading G6 to A (skill-walked + CLI helper), we avoided creating the dual-path drift that Edge Function + skill_fallback would have introduced. BUT we also delayed the moment when subagents can reliably invoke `/wiki sync` — current state is CLI helper for markdown+folder only; PDF/URL still skill-walked.
3. **PMF critical-path concern (Oracle Finding 3.1):** this revise consumed ~6-8h of founder focused time on internal infra during a pre-PMF stage. The "Nile Perch" risk (workshop > product) is real. v2.1 should be triggered by real usage evidence, NOT planned proactively.
4. **mcp_ask v0.1 is a stub:** other agents calling `mcp__wiki__ask` get a contract-complete but content-free response. They must fall through to `wiki_list_pages` + `wiki_get_page` to actually browse and cite. This is functional but suboptimal; v0.2 ships real RAG when OpenAI integration is approved.
5. **Backfill cron not wired:** `scripts/sync/backfill-wiki-embeddings.cjs` exists as dry-run v0.1; the pg_cron entry in `knowledge/schedules.yaml` would need a paired minion-worker handler in `supabase/functions/minion-worker/index.ts` (L2 validator enforces both-or-neither). Deferred to a small follow-up PR.
6. **`wiki/capabilities/` legacy docs lack frontmatter:** the new wiki-integrity validator flags 6 such pages (cla-update-mechanism + _TEMPLATE files). Not a defect — they're docs not auto-generated wiki output. May refine the validator's "missing_frontmatter" check to exclude `wiki/capabilities/` prefix in a follow-up.

## SOP-AIOPS-001-revise lessons (for cla-update-mechanism)

This revise was the **first real use** of the revise sub-flow on a capability still in `implementing` state. Three structural gaps surfaced + were patched:

1. `ops.capability_acquire_update_lock` RPC hard-coded `state IN ('operating', 'deployed')` — patched in migration 00028 to also allow `'implementing'`.
2. `idx_capability_runs_active_slug` enforced one active row per capability_id, making the supersede-at-Phase-8 semantic physically impossible (parent + child can't coexist) — patched in migration 00029 to scope uniqueness to root rows (`supersedes_id IS NULL`).
3. `ops.capability_advance_phase` doesn't know about revise mode (downgrades state to `'analyzing'` on Phase 1 advance, which is cosmetically wrong for revise). Cosmetic; not patched in v2.0.

**Recommended follow-up:** `/cla fix cla-update-mechanism` to update `SOP-AIOPS-001-revise/README.md` + `.claude/commands/cla.md` common pre-flight to reflect that evolution sub-flows now accept `implementing` state per migrations 00028 + 00029.

## v2.1 re-trigger conditions (canonical)

Trigger another `/cla revise wiki-sync-from-refs` when ANY of:

- (a) `/wiki sync` invoked > 20 times in a month
- (b) Real second caller (subagent, cron, hook) needs Edge Function-style invocation
- (c) `<col>__<file>` slug ugliness shows up in retrieval/search results enough that founder complains
- (d) `'book'` reuse for a non-book collection (e.g., `wiki/books/llm-papers-2025/`) is publicly confusing
- (e) PDF or URL adapter actual use surfaces NEW gaps not anticipated by n=1 markdown evidence

## Actuals vs estimates

| Item | Estimated | Actual |
|---|---|---|
| Founder hours | ~7h (Hybrid B/A spec §4) → ~12.5h (sprint-plan v2 corrected) | ~6-8h (one session 2026-05-17) — **under** sprint-plan estimate; Oracle's 12-15h was over |
| LLM cost | ~$3.50 (Hybrid B/A spec) → ~$3.70 (sprint-plan v2) | ~$6-8 (rough — includes 2 @cto + @oracle subagent invocations + 8 PRs of file generation) — **over** estimate by ~2× |
| Calendar | 5-7 days (sprint-plan v2) | **1 day** (single session, founder pushed straight through) |
| PRs | 4 expected | 8 actual (split smaller for review burden) |
| Migrations | 1 (consolidated 00030) | 3 (00028 + 00029 Phase 0 unblock + 00030 schema deltas) |

**Variance analysis:**
- Calendar under-shot because founder elected to push through in one session. Single-session execution worked but probably costs ~$2-3 more in LLM than spreading across 3-4 sessions with /compact between (cache warmth lost across many subagent invocations).
- LLM cost over-shot because the spec-plan didn't model @cto + @oracle subagent costs explicitly (each ~$0.50 input + variable output).
- PR count over-shot because smaller PRs = easier review burden; tradeoff accepted.

## Files promoted (this PR — #44)

- `.archives/cla/wiki-sync-from-refs-revise-a3858b7d/spec.md` → `wiki/capabilities/wiki-sync-from-refs/spec.md` (v2.0.0)
- `.archives/cla/wiki-sync-from-refs-revise-a3858b7d/retrospective.md` (this file) → `wiki/capabilities/wiki-sync-from-refs/retrospective.md`
- Parent v1.0.0 NEVER had its own promoted directory (was implementing only); v2.0.0 promotion creates it for the first time
- `knowledge/capability-registry.yaml` updated: state `implementing` → `operating`, version `1.0.0` → `2.0.0`
- `wiki/capabilities/CATALOG.md` updated: row added under Operating
- `ops.capability_runs`:
  - parent `911973a2…` → state=`superseded`, superseded_by_id=`638811f8…`
  - child `638811f8…` → state=`operating`, operating_since=now, current_phase=8, phases_completed=[0,1,2,3,4,5,6,7,8]

## Final state

Capability `wiki-sync-from-refs` v2.0.0 = `operating` 2026-05-17. Lineage chain: `911973a2 (v1.0.0, superseded) ← supersedes ← 638811f8 (v2.0.0, operating)`.
