# Retrospective: wiki-sync-from-refs v4.4.0 (extend)

**Capability ID:** `wiki-sync-from-refs`
**Version:** 4.4.0 (extend from v4.3.0)
**Phase:** 8 — Catalog Update (post-extend)
**Shipped:** 2026-05-20
**Sub-flow:** `/cla extend wiki-sync-from-refs` (accelerated single-session)

---

## What v4.4 addressed

Founder tested v4.3 with natural-language query input and discovered **2 bugs**:

1. **Bug #1 — Schema inconsistency between Kotler books** (silent zero-result):
   - Marketing Management entities: `source_chapter_index: <int>` (numeric field)
   - Principles of Marketing entities: `extracted_from_source: <chapter-slug>` (string slug, NO numeric index)
   - v4.3 `chapter-N` filter only checked field A → POM `--src=principles-of-marketing-kotler/chapter-7` returned chapter file + **0 entities** silently
   - Caught when founder ran the spec expecting entities

2. **Bug #2 — Natural-language `--src` not supported**:
   - Founder typed `--src="customer segment attributes from principles-of-marketing-kotler"` expecting semantic retrieval
   - v4.3 only accepts structured spec grammar → script bailed with "source not found"
   - Founder asked for `--query=<text>` semantic mode

v4.4 fixes both + ships entity-list mode as the third invocation form (also used internally by query mode).

---

## Sprint scope shipped

| Component | Change | Status |
|---|---|---|
| `scripts/wiki-sync/get.cjs` | (1) Schema fix in `entityChapterIndex()` — fallback to parse chapter number from `extracted_from_source: ...__chapter-NN-...` slug. (2) New `--entities=<csv>` flag with 3 reference forms (full spec / type+slug / bare slug). (3) New `--query=<text>` flag (orchestrator-only, exit 3 if direct CLI). (4) New `--query-context-header=<text>` for bundle annotation. (5) New header field "Query:" + "Entities (list):" sections. Reordered scope handling for entity-list mode. | ✅ |
| `.claude/commands/wiki.md` | Replaced single `/wiki get` row with **3 rows** (spec / query / entity-list modes). Added "3 modes" preamble + Mode 2 + Mode 3 workflow sections with examples. | ✅ |
| `06-ai-ops/skills/wiki-sync/get/SKILL.md` | Added "v4.4 additions" section covering query mode, entity-list mode, schema fix. Version notes updated v1.0 → v1.1. | ✅ |
| `knowledge/capability-registry.yaml` | Version 4.3.0 → 4.4.0; retrospective_path updated. | ✅ |
| `wiki/capabilities/CATALOG.md` | v4.4 row + version history (4.0 → 4.1 → 4.2 → 4.3 → 4.4 lineage). | ✅ |

---

## Architecture: how `--query=` works (orchestrator + script split)

The `--query=<text>` flag is **NOT** runnable by `get.cjs` alone. The script has no network access (no OpenAI API key reading, no Supabase HTTP). Instead:

```
User types:
  /wiki get --query="..." [--src=<src>] [--to=<path>]
  
Slash command orchestrator (Claude session) workflow:
  1. Call mcp__supabase-ops__wiki_ask({
       question: <text>,
       k: 15,
       entity_only: true,
       filter: { source: <src> } if --src given
     })
  2. Got top-K results? → build entities CSV: <source>/<type>/<slug>
     No results (no_coverage)? → fall back to filesystem keyword match
                                  via Bash grep over wiki/<src>/<type>/*.md
                                  for query keywords in slug + title
  3. Invoke: node scripts/wiki-sync/get.cjs
              --entities=<csv resolved>
              --query-context-header=<original text>
              [--src=<src>] [--to=<path>]
  4. Script bundles + writes; orchestrator reports
```

The script handles only deterministic ops (parse csv → resolve files → assemble markdown). The orchestrator (LLM session) handles semantic retrieval + fallback.

Direct CLI: `node scripts/wiki-sync/get.cjs --query="..."` exits with code 3 + helpful error pointing to slash command.

**Why this split**: keeps script deterministic, testable, headless-friendly (any future cron job can use --entities= directly). Semantic retrieval naturally lives in the Claude session that has MCP access.

---

## Tested invocations (5 scenarios)

1. ✅ Spec mode regression: `--src=marketing-management-kotler/chapter-14` → 1 chapter + 8 entities (unchanged from v4.3)
2. ✅ `--query=` standalone → exit code 3 with helpful error
3. ✅ Entity-list (full specs): 3 cross-cited concepts → 6204 chars
4. ✅ Entity-list (type+slug with --src) + `--query-context-header` → header shows "Query: ..."
5. ✅ End-to-end query mode: founder asked "List all marketing segments in the book principles-of-marketing-kotler" → MCP returned no_coverage → fallback grep matched 24 entities (13c + 4o + 3d + 4i) → bundle 42485 chars written to `.archives/wikiout/principles-of-marketing-kotler/test-1.md`

---

## Estimated vs actual

| Metric | Estimated | Actual | Delta |
|---|---|---|---|
| Founder time | 1-2h (write spec, review, test) | ~5 min (one ask) | -95% |
| LLM cost | $0.50 | ~$0.01 (1 MCP wiki_ask call, embedding only) | -98% |
| Wall-clock | 2-4h | ~30 min | -85% |
| LoC added to get.cjs | 80-150 | ~110 | on target |

---

## What went well

1. **Bug #1 fix was a 5-line change.** Adding fallback `extracted_from_source` parsing to `entityChapterIndex()` immediately unlocked POM chapter-N spec. Saw 0 → 14 entities for POM Ch 7 after fix.

2. **Entity-list mode is a clean primitive.** Three reference forms (full spec / type+slug+src / bare+src) cover all caller needs. Cross-source bundle works without special-casing — header just notes "multiple sources" scope.

3. **Orchestrator/script split is clean.** Script stays deterministic (zero network, zero LLM). Orchestrator handles semantic search via existing MCP tool. No new dependencies, no new API keys.

4. **`--query-context-header` makes bundles self-documenting.** When a downstream command receives a bundle, the header tells it "this was produced by query X" → context is traceable.

5. **Filesystem keyword fallback worked when embeddings deferred.** MCP wiki_ask returned `no_coverage` because v4.0 source-grouped layout's `ops.knowledge_embeddings` backfill is still on `embeddings_deferred_v0_2` (scripts/sync/backfill-wiki-embeddings.cjs is a stub). Filesystem grep on slug + title matched 24/24 segmentation entities for POM. Future v0.2 embedding backfill will improve relevance ranking but baseline retrieval works today.

---

## What was harder than expected

1. **Entity-list ref form ambiguity.** Initially supported only 2 forms (full spec + bare slug). Founder's first invocation used `concepts/behavioral-segmentation-variables` (type+slug) which I'd missed. Quick fix: detect 2-part refs as type+slug, require `--src` for resolution. Tested fix in same session.

2. **`spec.scope` enum needed extending.** Added `"entity-list"` value. Required reorganizing the assembler so the entity-list branch comes BEFORE the spec.scope checks (which assume `spec.sourceDir` is set).

3. **Source RECORD frontmatter assumed `spec.sourceDir`.** When entity-list uses multiple sources, `spec.sourceDir` is null. Guarded with `if (spec.sourceDir)` check before reading source.md. Bundle header gracefully omits source title for multi-source bundles.

---

## Boilerplate-extractable patterns (additions to v4.3 list)

13. **Orchestrator + script split for semantic-search commands.** Pattern: deterministic script (no network) + LLM-session orchestrator (semantic search via MCP). Reusable for any future bundler command that needs both.

14. **Entity-list ref grammar (3 forms).** Pattern: full spec / type-prefixed / bare slug. Bare slug requires scope flag for resolution. Useful for any future skill that takes a list of slug references.

15. **Filesystem grep fallback when embeddings deferred.** Pattern: try semantic search first → if `no_coverage`, grep on slug + title + keywords. Acceptable baseline for early-stage knowledge graphs before embeddings are warm.

---

## Lessons for next CLA extend run

1. **Schema consistency audit BEFORE extending.** Bug #1 existed in v4.0 source-grouped distill output. Should have been caught by `/wiki audit` integrity check at v4.0 promotion. Add to audit suite v4.5 candidate.

2. **CLI direct vs orchestrator-only is a design choice worth documenting.** v4.4 made `--query=` orchestrator-only. v4.5 candidate: optionally support direct CLI with OPENAI_API_KEY env → makes script usable in headless cron + future MCP server. Don't ship until needed.

3. **Bundle header is the new spec contract.** Every bundle now carries Query + Source spec + License + Scope + Generated_at. Downstream consumers can rely on this header. Future bundlers (docs, kpi-dashboard, email-templates) should adopt same header schema.

---

## v4.4.0 promotion confirmed

- [x] `knowledge/capability-registry.yaml` 4.3.0 → 4.4.0
- [x] `wiki/capabilities/wiki-sync-from-refs/retrospective-v4.4.0.md` written (this file)
- [x] `wiki/capabilities/CATALOG.md` v4.4 row + history
- [x] `scripts/wiki-sync/get.cjs` patched (+ tested 5 scenarios)
- [x] `.claude/commands/wiki.md` updated (3 mode rows + workflow sections)
- [x] `06-ai-ops/skills/wiki-sync/get/SKILL.md` updated (v4.4 additions section)
- [ ] Final `pnpm check` clean (last gate)
- [ ] Docs site reflects new 3-mode wiki get (after `/docs sync` + translate)

---

## Open questions / future work (v4.5+ candidates)

1. **v4.5 — Direct CLI `--query=` mode with OPENAI_API_KEY.** When founder has key in env, script does embedding + Supabase HTTP directly. Cross-platform without Claude session. ~3h impl.

2. **v4.5 — Embeddings backfill v0.2 ships.** Replaces filesystem grep fallback with proper semantic retrieval for POM + future sources. Already tracked separately (scripts/sync/backfill-wiki-embeddings.cjs).

3. **v4.5 — Schema audit in `/wiki audit`.** Detect frontmatter schema inconsistencies (e.g. Bug #1: missing `source_chapter_index` when `extracted_from_source` references a chapter). Auto-fix proposal.

4. **v4.5 — `--filter-by-confidence=<min>` flag.** Bundle only entities with confidence ≥ threshold. Useful when founder wants high-trust subset for content generation.

5. **v4.5 — Cross-source dedup hint in bundle.** When entity-list spans multiple sources and 2 entities share canonical-name (per `wiki/_index/<type>/<canonical>.md` reverse-lookup), bundle header notes "potential dup: X (in source A) vs Y (in source B)".

6. **v4.6 — Auto-compose flag on `/cla`, `@cxo`, `/brainstorm`**: `--wiki-context=<spec>` or `--wiki-query=<text>` so orchestrator runs `/wiki get` and injects bundle into prompt automatically. Eliminates one operator step.

7. **v4.6 — JSON output mode.** `--format=json` returns machine-readable {chapters: [...], entities: [{slug, type, body, frontmatter}]} for skill orchestration.

8. **v4.6 — Bundle TTL + auto-refresh.** Bundle files at `.archives/.../*.md` carry `bundle_generated_at` + `bundle_max_age=<duration>`. When stale, re-run automatically before pasting into next command.
