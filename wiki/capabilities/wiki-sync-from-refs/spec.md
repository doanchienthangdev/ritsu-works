# Wiki Sync from External Refs — Architecture Spec v4.0.0

**Capability:** `wiki-sync-from-refs`
**Version:** 4.0.0 (revise of v3.0.0; supersedes_id `36836749-06f7-48e8-8a31-f5a3f2e401a1`)
**Phase:** 5 (architect; Tier C — pending founder approval)
**Author:** `/cla revise` session `caf0cd84-af27-45e0-807d-e15912ebb926` (resumed from prior session `f55023d9-...` after force-unlock 2026-05-18T08:04Z)
**Selected option:** **B (source-grouped layout + reverse-lookup `wiki/_index/`)** per Phase 4 decision `ed521734-8ed0-4b71-9fa0-14df3d9277b8`.
**Status:** DRAFT — pending @cto sanity review + Muse high-stakes-decision-panel + Tier C founder approval.

---

## 0. FINAL DISPOSITION (pending Tier C founder approval)

### Selected option

**Option B (source-grouped + `_index/`)** per Phase 4. Phase 5 settles 5 open sub-decisions with the recommended values from `revision-options.md` "What Phase 5 must decide":

| # | Sub-decision | Recommended | Adopted in this spec |
|---|---|---|---|
| 1 | Slug uniqueness | Composite UNIQUE `(extracted_from_source_id, slug)` for derived entities; global UNIQUE preserved only for source RECORDs (`extracted_from_source_id IS NULL`). | ✅ |
| 2 | Empty plural dirs (`wiki/concepts/`, `wiki/observations/`, …) | DELETE in Phase 7; record in retrospective. | ✅ |
| 3 | Legacy `wiki/concept/spaced-repetition.md` (no source RECORD) | Retroactively regenerate `wiki/sample/source.md` from `tests/wiki-sync/fixtures/sample.md`; cost ~$0.02. **Halt-on-divergence:** if regenerated entity slug != `spaced-repetition` exactly, migrate-to-v4 aborts before any `git mv` and surfaces choice (rename source vs keep file at v3 location). Sprint 1 fixture-pins the expected slug. | ✅ |
| 4 | Chapter-split normalize | `wiki/<book-slug>/chapters/chapter-NN.md` (uniform with the new `concepts/`, `observations/` pattern). | ✅ |
| 5 | Migration tool packaging | Sprint 1 PR includes: migration tool script (one-shot, idempotent) + 14-entity migration + validator updates + frontmatter rewrites. | ✅ |

### Decision quality stance

This revise is **scope-contained** (file paths + 1 DDL change + skill template rewrites). No new system pieces (no new MCP servers, no new pillars, no new SOPs, no new cost-buckets). All v3.0 semantics carry forward unchanged (distill+extract, per-type model picker, citation spine, license inheritance, kill criterion clock).

### Reversibility

File paths are data, not contracts. If v4.0 fails the use-case check, a v5 revise can revert the migration. But:

- The composite UNIQUE constraint is sticky — reverting requires `DROP CONSTRAINT` + global re-uniqueness check.
- 30-day soft-deprecation window for any downstream consumer that hardcoded v3.0 paths.
- Today's downstream consumer count: **0 production callers** (per `revision-gap-analysis.md` §J). Skills that reference `wiki/<type>/` paths are all within the wiki-sync capability itself and get rewritten in Sprint 1.

### Cost summary

| Item | Estimate |
|---|---|
| Sprint 1 (migration + skill rewrites + validators + dir cleanup) | ~6-8h founder, ~$3-4 LLM |
| Sprint 2 (`_index/` rebuild skill + `--source` flag on `/wiki ask` + `/wiki package` cmd) | ~3-4h founder, ~$1-2 LLM |
| Phase 8 promotion + retro | ~2h founder, ~$0.50 LLM |
| **Total** | **~11-14h founder, ~$4.50-6.50 LLM** |

This is a smaller revise than v3.0 (which was ~42-52h / $23-30). v4.0 is path-rearrangement plus 1 DDL, not a semantic flip.

### Kill criterion (carries from v3.0)

The v3.0 kill criterion (< 5 growth-domain `/wiki sync` invocations by day 30 OR 0 `01-marketing/`/`02-sales/` content citing extracted entities by day 60 → freeze v3.x) **carries forward unchanged**. v4.0 does not reset the clock — it inherits the day-30 / day-60 evaluation that began at v3.0 promotion (2026-05-18). If the kill criterion fires before v4.0 ships, v4.0 work pauses and the kill criterion supersedes.

### Risk register (top 3, see also §6)

| Risk | Probability | Mitigation |
|---|---|---|
| Slug collision in legacy `wiki/concept/spaced-repetition.md` if `wiki/sample/source.md` regen produces different slug | LOW | Migration tool checks first; if collision, founder picks (rename source or rename derived) via AskUserQuestion. |
| Skills hard-code v3.0 paths somewhere outside scanned set | LOW | Phase 7 Sprint 1 PR runs `git grep "wiki/concept/"` + `wiki/observation/` + `wiki/decision/` + `wiki/idea/` + `wiki/article/` across repo and fails CI if matches remain. |
| `/wiki ask` retrieval citation format changes break downstream consumers | NONE | No downstream consumers exist yet. |

---

## 1. What's revised vs v3.0.0

This spec inherits all v3.0.0 semantics that still apply (pillar ownership `06-ai-ops`, cost-bucket `ai-ops-knowledge`, distill+extract semantic, per-type model picker, citation spine `ops.knowledge_extractions`, confidence 3-bucket signal, kill criterion clock, A11 attribution-watcher, all migrations 00027-00031 stay applied). Only the items below are revised.

### The core change

**v3.0:** wiki layout is entity-type-grouped. `wiki/concept/`, `wiki/observation/`, `wiki/decision/`, `wiki/idea/` hold derived entities (slug globally unique). `wiki/article/`, `wiki/books/`, etc. hold source RECORDs. Optimized for cross-source dedup (graph mode).

**v4.0:** wiki layout is source-grouped. `wiki/<source-slug>/source.md` holds the source RECORD; `wiki/<source-slug>/{concepts,observations,decisions,ideas}/<entity-slug>.md` hold derived entities from that source (slug unique within source). Optimized for curated-library mode — skills/templates/workflows consume a package as a coherent input.

A thin reverse-lookup surface at `wiki/_index/<type>/<canonical-name>.md` (markdown link-list, regenerated on demand by `/wiki index rebuild`) covers the "show me all packages that mention wedge" case without resurrecting graph-mode dedup.

### Founder anchor statement (verbatim from `revision-problem.md`)

> "triển khai input wiki files/folders tường minh để phục vụ cho ritsu-works dùng đi dùng lại nhiều lần hay giải các bài toán"

(*"Explicitly specify wiki files/folders as inputs to serve ritsu-works for repeated use or for solving specific problems."*)

This makes `input = wiki/<source-slug>/` and `input = wiki/<source-slug>/concepts/` first-class skill input contracts. Phase 5 is settling the architecture to make those contracts mechanical.

---

## 2. Decision axes — explicit dispositions

| Axis | Disposition | Rationale |
|---|---|---|
| **B1** STORAGE LAYOUT | Source-grouped (`wiki/<source-slug>/{source.md,concepts/,observations/,decisions/,ideas/}/`). Per-book chapters move to `wiki/<book-slug>/chapters/chapter-NN.md`. | Founder anchor: skill input ergonomics + navigation locality. |
| **B2** SLUG UNIQUENESS | Composite UNIQUE `(extracted_from_source_id, slug)` for derived entities (`extracted_from_source_id IS NOT NULL`); preserve global UNIQUE for source RECORDs (`extracted_from_source_id IS NULL`). | Library mode EXPECTS the same slug (e.g. `wedge`) to appear in multiple packages with distinct nuance per source. Composite UNIQUE keeps slug human-readable; source-prefixing slug (e.g. `gpfp__wedge`) would be ugly and bake the source name into the entity. |
| **B3** REVERSE-LOOKUP INDEX | NEW `wiki/_index/<page_type>/<canonical-name>.md`. Markdown link-list ONLY (not entity pages). Generated by `/wiki index rebuild`, not by distill. Excluded from `/wiki audit` orphan checks (derivative). | Cheap (no DB table) coverage of "show me all wedges" without dedup ceremony. `rm -rf wiki/_index/` recovers Option A if `_index/` proves useless. |
| **B4** EMPTY PLURAL DIRS | DELETE in Phase 7 PR. List: `wiki/articles/`, `wiki/concepts/`, `wiki/decisions/`, `wiki/ideas/`, `wiki/observations/`, `wiki/books/`, `wiki/episodes/`, `wiki/meetings/`, `wiki/customers/`, `wiki/companies/`, `wiki/persons/`, `wiki/repos/`, `wiki/weekly_reviews/`. Record in retrospective as "v3.0 legacy folders not used since promotion". | Keeping them as empty placeholders pollutes the layout. Wiki is folder-as-data; empty folders mislead. |
| **B5** LEGACY ENTITY (`spaced-repetition`) | Regenerate `wiki/sample/source.md` retroactively from `tests/wiki-sync/fixtures/sample.md` via `/wiki sync --regen-source --skip-extract`. New flag (`--regen-source`) is internal-only, used by the migration tool. Cost ~$0.02. After regen: `git mv wiki/concept/spaced-repetition.md wiki/sample/concepts/spaced-repetition.md`. | Avoids permanent v2.0 orphan in the corpus; aligns the only legacy file with v4.0 layout discipline. |
| **B6** CHAPTER-SPLIT NORMALIZE | v3.0 wrote `wiki/books/<book-slug>/chapter-NN.md`. v4.0 normalizes to `wiki/<book-slug>/chapters/chapter-NN.md`. Same flat folder pattern as `concepts/`. `page_type='book'` still applies to the chapter pages (they're slices of the source). | Uniform "type subfolder" convention. Skill input `input = wiki/<book-slug>/chapters/` matches `input = wiki/<book-slug>/concepts/`. |
| **B7** MIGRATION TOOL PACKAGING | Sprint 1 PR ships `scripts/wiki-sync/migrate-to-v4.cjs` — one-shot, idempotent, drift-safe. Runs in this order: (1) regen `wiki/sample/source.md` from fixture, (2) `git mv` 14 entity files + 1 source RECORD into v4 paths, (3) rewrite frontmatter `extracted_from_source` paths, (4) `UPDATE ops.knowledge_pages SET file_path = <new>` for the 14 rows, (5) write a one-shot `UPDATE ops.ingestion_jobs SET metadata = jsonb_set(metadata, '{wiki_path}', to_jsonb(<new>))`, (6) regenerate `wiki/_index/` for the first time. Idempotent — re-running is a no-op. | Founder runs `node scripts/wiki-sync/migrate-to-v4.cjs --dry-run` first; if dry-run shows expected actions, runs without `--dry-run`. No DB UPDATE happens in `--dry-run`. |
| **B8** SKILL INPUT CONTRACTS | Skills now specify `input = <wiki path>` with 3 valid shapes: whole package `wiki/<source-slug>/`, type slice `wiki/<source-slug>/<type>s/`, single entity `wiki/<source-slug>/<type>s/<slug>.md`. `/wiki ask` gains `--source <slug>` (single) and `--packages <slug1,slug2>` (multi-package union) flags for retrieval-side scoping. NEW `/wiki package <slug>` command lists package inventory for skill planning. | Makes the founder anchor case mechanical. |
| **B9** `/wiki ask` CITATION FORMAT | Citation MUST include both source title AND package: `"<extracted_quote>" — extracted from [<source title>](wiki/<source-slug>/source.md#chunk-N), package `<source-slug>`, confidence 0.92`. Same shape as v3.0 A11; gain `package` suffix. | Skills consuming `/wiki ask` output can route by package. |
| **B10** `_index/` REGEN POLICY | `wiki/_index/` rebuilt on every `/wiki sync` completion AND on `/wiki index rebuild` manual invocation. NEW skill `06-ai-ops/skills/wiki-sync/index-rebuild/SKILL.md`. Cost-bucket `ai-ops-knowledge`; per-invocation cost ~$0.02 (mostly file I/O). Aliases drive index entries (frontmatter `aliases: [PLG, product-led growth]` → both names appear in `_index/concept/`). | Auto-keep on sync means founder never thinks about it. Manual rebuild covers manual-edit cases. |

### v3.0 commitments that carry forward unchanged

- **A1** `--verbatim` flag with v3.1 auto-deprecation trigger.
- **A2** All 4 entity types (concept, observation, decision, idea).
- **A3** Per-type model picker (Haiku for concept+idea; Sonnet for observation+decision).
- **A4** Slug-equality + vector similarity dedup thresholds (0.92 auto-merge, 0.75-0.92 review queue, < 0.75 distinct) — **but now scoped within source-package by default**. Cross-source dedup is opt-in via `/wiki merge` only.
- **A5** Citation contract via `ops.knowledge_extractions` (page-level `review_state`, NOT per-edge state machine).
- **A6** Confidence as coarse 3-bucket signal.
- **A7** Per-paper extract + folder-level aggregation pass.
- **A8** Re-extraction trigger via chunk-diff.
- **A9** Cost discipline per-task-kind caps from v3.0 spec (no v4.0 changes here; v4.0 doesn't add task kinds).
- **A10** `legacy_v2_verbatim` column on knowledge_pages.
- **A11** Attribution-watcher / license_status / copyrighted-content trigger.

---

## 3. Component diff (what files change in v4.0)

### 3.1 Migration — 1 new file

**`supabase/migrations/00032_wiki_v4_source_grouped.sql`** — single forward-only DDL. See `draft/migrations/00032_wiki_v4_source_grouped.sql` for the full text. Summary:

- Block A: drop global UNIQUE `knowledge_pages_slug_key`.
- Block B: add partial UNIQUE INDEX `knowledge_pages_source_record_slug_uniq` ON `(slug) WHERE extracted_from_source_id IS NULL` (preserves global uniqueness for source RECORDs).
- Block C: add partial UNIQUE INDEX `knowledge_pages_derived_slug_uniq` ON `(extracted_from_source_id, slug) WHERE extracted_from_source_id IS NOT NULL` (composite uniqueness for derived entities).
- Block D: header comment documenting v4.0 layout flip, links to spec.md and ops.decisions row, lineage parent `36836749`.

**No data migration in the SQL itself.** Data migration lives in `scripts/wiki-sync/migrate-to-v4.cjs` (Sprint 1 PR), which runs the FS moves + frontmatter rewrites + targeted UPDATEs. Why split: keeps migration 00032 surgical (DDL-only, instantly reversible if needed); the FS+UPDATE work depends on filesystem state that doesn't exist in CI, so it has to run on founder's machine post-merge.

**Sequencing safety:** the partial indexes must be created BEFORE the global unique is dropped, OR the global unique stays in place until the migrate-to-v4 script has run. Block sequence chosen: (A) create both partial indexes, (B) drop global unique. Both partial indexes' predicates are mutually exclusive (NULL vs NOT NULL on `extracted_from_source_id`), so they don't conflict during the create step. Then drop global unique. Atomically within the migration transaction.

### 3.2 Skill updates — 14 files

| Skill | Change | Risk |
|---|---|---|
| `06-ai-ops/skills/wiki-sync/SKILL.md` | Update §"Layout" section to describe v4.0 source-grouped. | low |
| `06-ai-ops/skills/wiki-sync/distill/SKILL.md` | Step 5 path template: `wiki/<page_type>/<slug>.md` → `wiki/<source-slug>/<page_type>s/<slug>.md`. Document slug-uniqueness scoped-to-source. | high |
| `06-ai-ops/skills/wiki-sync/ingest/SKILL.md` | Step 9 output spec. Source RECORD path: `wiki/<source-slug>/source.md`. | high |
| `06-ai-ops/skills/wiki-sync/ask/SKILL.md` | Add `--source` / `--packages` flags. Update citation format (B9). | high |
| `06-ai-ops/skills/wiki-sync/audit/SKILL.md` | Walk pattern + expected layout v4.0. Exclude `wiki/_index/` from orphan checks. | high |
| `06-ai-ops/skills/wiki-sync/adapters/url-adapter/SKILL.md` | `wiki_target: wiki/articles/<slug>.md` → `wiki/<slug>/source.md`. | medium |
| `06-ai-ops/skills/wiki-sync/adapters/pdf-adapter/SKILL.md` | `wiki_target: wiki/books/<slug>.md` → `wiki/<slug>/source.md`. Chapter pattern: `wiki/<slug>/chapters/chapter-NN.md`. | medium |
| `06-ai-ops/skills/wiki-sync/adapters/youtube-adapter/SKILL.md` | `wiki/episodes/<slug>.md` → `wiki/<slug>/source.md`. | medium |
| `06-ai-ops/skills/wiki-sync/adapters/meeting-adapter/SKILL.md` | `wiki/meetings/<slug>.md` → `wiki/<slug>/source.md`. | medium |
| `06-ai-ops/skills/wiki-sync/adapters/markdown-adapter/SKILL.md` | `wiki/<entity_type_from_frontmatter>/<slug>.md` → `wiki/<slug>/source.md`. | medium |
| `06-ai-ops/skills/wiki-sync/adapters/folder-adapter/SKILL.md` | Children land at `wiki/<col-slug>/<child-slug>/source.md` (per-child source RECORD). Revisit `<col-slug>__<file-slug>` slug convention — now redundant given source-grouping; child files just get clean slugs at `wiki/<col-slug>/<child-slug>/`. | medium |
| `06-ai-ops/skills/wiki-sync/chapter-splitter/SKILL.md` | `wiki/books/<book-slug>/chapter-NN.md` → `wiki/<book-slug>/chapters/chapter-NN.md`. | medium |
| `06-ai-ops/skills/wiki-sync/link-extractor/SKILL.md` | Cross-page link format must include package prefix when traversing packages. | low |
| `06-ai-ops/skills/wiki-sync/merge/SKILL.md` | Now operates BETWEEN packages by default (manual opt-in `/wiki merge wiki/A/concepts/wedge.md wiki/B/concepts/wedge.md`). | medium |
| **NEW** `06-ai-ops/skills/wiki-sync/index-rebuild/SKILL.md` | `_index/` regen logic; alias resolution; orphan handling. | medium |

Deferred (no change in this revise): `dedup`, `review`, `attribution-watcher`, `embeddings-backfill` — all page_id-keyed, file_path-agnostic.

### 3.3 Tier 1 / config updates

| File | Change |
|---|---|
| `knowledge/ingestion-sources.yaml` | All 6 adapter `wiki_target` values updated to v4.0 paths. |
| `knowledge/ingestion-routing.yaml` | 2 entries' output path strings updated. |
| `knowledge/feature-flags.yaml` | Add `wiki_layout_version: '4.0'` (enum string). `wiki_sync_distill_enabled` carries over from v3.0. |
| `knowledge/capability-registry.yaml` | `wiki-sync-from-refs.version: 3.0.0 → 4.0.0`; bump `state_since`, `migration_files` list append `00032_wiki_v4_source_grouped.sql`; `notes` block append v4.0 lineage entry; `spec_path` carries forward; `retrospective_path` updated to `wiki/capabilities/wiki-sync-from-refs/retrospective-v4.0.0.md`. |
| `knowledge/manifest.yaml` | `tier4_derived.vector_store.namespaces[wiki_embeddings]` description updated: `source_kind` values now include `wiki_v4_source` and `wiki_v4_derived`. Re-embed only happens on file_path UPDATE, which the migrate-to-v4 script triggers. |
| `wiki/capabilities/CATALOG.md` | Update wiki-sync entry: version 4.0.0, layout-flip noted. |

### 3.4 Scripts / validators

| File | Change |
|---|---|
| **NEW** `scripts/wiki-sync/migrate-to-v4.cjs` | One-shot migration tool per B7. Idempotent. Dry-run flag. Logs to `.archives/wiki-audits/migrate-v4-<date>.md`. |
| `scripts/wiki-sync/ingest.cjs` | Path derivation: `path.join('wiki', type, slug+'.md')` → `path.join('wiki', sourceSlug, type+'s', slug+'.md')`. Source RECORD goes to `path.join('wiki', sourceSlug, 'source.md')`. |
| `scripts/cross-tier/validate-wiki-integrity.cjs` | Update layout-validation patterns: source RECORD path regex, derived entity path regex, exclude `wiki/_index/` from orphan-check. Add v4.0 layout assertion (no files in deprecated plural-dirs). |
| `scripts/wiki-sync/check-content-traceability.cjs` | Path patterns updated. |
| **NEW** `scripts/sync/rebuild-wiki-index.sh` | Wraps `/wiki index rebuild` skill invocation for cron/CI. (Optional Sprint 2.) |

### 3.5 Slash command

**`.claude/commands/wiki.md`** — update sections:
- `/wiki sync` — output path semantics updated to v4.0.
- `/wiki ask` — gain `--source <slug>` and `--packages <slug1,slug2>` flags.
- **NEW** `/wiki package <slug>` — list a package's full inventory.
- **NEW** `/wiki index rebuild` — regenerate `wiki/_index/` for all packages.
- `/wiki audit` — note that `wiki/_index/` is excluded from orphan checks (it's derivative).
- `/wiki merge` — note that v4.0 merge operates BETWEEN packages by default (cross-package opt-in).

### 3.6 Docs

| File | Change |
|---|---|
| `wiki/ENTITY_TYPES.md` | Rewrite around v4.0 layout. Source-grouped layout diagram. Keep page_type CHECK enum unchanged (singular page_type, but folder convention is now `<source-slug>/<page_type>s/`). |
| `wiki/README.md` | Layout description updated. |
| `wiki/capabilities/wiki-sync-from-refs/spec.md` | Promoted in Phase 8 from this draft. Archive v3.0 spec as `spec-v3.md`. |
| `wiki/capabilities/wiki-sync-from-refs/retrospective-v4.0.0.md` | Post-Phase-8. |

### 3.7 Tests / fixtures

| File | Change |
|---|---|
| `tests/wiki-sync/fixtures/*.md` | UNCHANGED — these are source inputs, not wiki outputs. |
| `tests/wiki-sync/` test scripts | Update expected output paths. |

### 3.8 NOT touched (preservation contract)

- All migrations 00027-00031 stay applied.
- `ops.knowledge_extractions`, `ops.knowledge_links`, `ops.knowledge_embeddings` schemas — page_id opaque to layout.
- HITL flow, cost attribution, attribution-watcher, role permissions for customer/finance/etc.
- `mcp-server/src/tools/wiki-*` — page-id-keyed, file-path-agnostic. **Sprint 1 PR CI gates a grep** (per `draft/tier1-diffs.yaml.phase_7_enforcement.sprint_1.must_grep_clean_mcp_server`) verifying no v3.0 path literals were silently added between v3.0 ship and v4.0 merge.

### 3.9 Deferred to Sprint 1 (CTO NITS surfaced post-Phase-5)

- **`legacy_v2_verbatim` semantics post-migrate-to-v4.** Currently the legacy `spaced-repetition` row has `legacy_v2_verbatim=true` AND `extracted_from_source_id IS NULL` (per migration 00031's backfill). After migrate-to-v4 regenerates `wiki/sample/source.md` and the row gets `extracted_from_source_id` set, those two flags coexist confusingly. Sprint 1 PR resolves: either (a) clear `legacy_v2_verbatim` on rows that get a real source after-the-fact, OR (b) explicitly note in migration 00031's column comment that `legacy_v2_verbatim` means "ingested under v2.0 semantics", independent of whether a source RECORD was retroactively attached. **Recommended: (a)** — keeps the flag's semantics tight ("still in v2.0 layout/semantics today"). Migrate-to-v4 script sets `legacy_v2_verbatim = false` after attaching `extracted_from_source_id`.

---

## 4. Migration strategy (FS + data + DDL)

Order matters. The migration tool MUST run in this sequence:

1. **DDL (migration 00032)** runs first (creates partial indexes, drops global unique). Transaction-safe.
2. **Regen sample source RECORD** — `node scripts/wiki-sync/migrate-to-v4.cjs --regen-sample` writes `wiki/sample/source.md` from `tests/wiki-sync/fixtures/sample.md`. Uses `/wiki sync --regen-source --skip-extract` skill invocation under the hood. Cost ~$0.02.
3. **FS moves** via `git mv` (preserves history):
   - `wiki/article/growth-playbook-fixture.md` → `wiki/growth-playbook-fixture/source.md`
   - 13 entity files into `wiki/growth-playbook-fixture/{concepts,observations,decisions,ideas}/`
   - `wiki/concept/spaced-repetition.md` → `wiki/sample/concepts/spaced-repetition.md`
4. **Frontmatter rewrites** in moved files: `source_ref`, `extracted_from_source`, and any `file_path` field updated to new paths.
5. **DB UPDATEs** via parameterized SQL (one transaction):
   - `UPDATE ops.knowledge_pages SET file_path = $new WHERE id = $id` for 14 derived + 2 source RECORDs.
   - `UPDATE ops.ingestion_jobs SET metadata = jsonb_set(metadata, '{wiki_path}', to_jsonb($new)) WHERE id = $id` for related job rows.
6. **Empty plural dirs deletion** — only after step 3 confirms all files moved. Dirs in B4 list deleted via `git rm -r`.
7. **`_index/` initial generation** — `node scripts/sync/rebuild-wiki-index.sh` runs once at end of migration. Populates `wiki/_index/concept/wedge.md` etc.
8. **Validation** — `pnpm check` must be clean. Any failure rolls back step 5 via SAVEPOINT and exits with error.

The migrate-to-v4 script is **idempotent**: re-running detects already-migrated state via `ops.knowledge_pages.file_path LIKE 'wiki/_/%' AND NOT LIKE 'wiki/<old>/%'` and exits cleanly.

---

## 5. Per-Bài-toán impact

| Bài | Topic | v4.0 impact |
|---|---|---|
| 1 | 4-tier truth | Tier 1 yaml updates (3 files); Tier 2 DDL (migration 00032) + DML (14 file_path updates); Tier 3 embeddings re-trigger via file_path UPDATE; Tier 4 namespace description tweaked. |
| 2 | HITL | This spec = Tier C decision. Migration apply = Tier C-adjacent (founder runs). `/wiki merge` cross-package = Tier B (since v3.0). Force-unlock used today (D-Std) recorded in audit. |
| 4 | Memory | `ops.run_summaries` continues to record `/wiki sync` invocations. No change. |
| 5 | Multi-Agent | 1 new skill (`index-rebuild`). 14 skill updates. No new subagents. |
| 7 | Cost | Cost-bucket `ai-ops-knowledge` carries over. NEW task kind `wiki-index-rebuild` at ~$0.02/run (folded into `ai-ops-knowledge`; no new bucket). |
| 8 | Schedule | OPTIONAL — `pg_cron` for nightly `_index/` rebuild defers to v4.1 (cost-vs-value not yet established; founder-triggered rebuild covers the 80% case for now). |
| 9 | SOP | `SOP-INGEST-001-wiki-sync/flow.yaml` updated for v4.0 paths (Sprint 1). |
| 10 | Visibility | KPI `wiki_sync_v4_migration_complete` (one-shot, set true post-migration); no recurring KPIs added. |
| 11 | Events | No new events. v3.0 `ritsu.wiki.synced` continues. |
| 12 | MCP | `mcp__wiki__list_pages` and `mcp__wiki__source` continue working (page_id-keyed). `mcp__wiki__ask` description text updated in v4.0 PR to mention `--source` flag (analogous to v3.0 NIT 6 discipline). |
| 13 | State machine | None. |
| 14 | Knowledge graph | LAYOUT change. Composite UNIQUE on derived entity slugs. Cross-source dedup demoted from default to opt-in (was already deferred in v3.0; cleanly recast in v4.0). |
| 15 | Decision | This spec IS a Tier C decision row. |
| 16 | Customer data | None. `public.customers` etc. unaffected. |
| 17 | Multi-surface | None. |
| 18 | Ingestion | All 6 adapters change output path. Source kinds unchanged. |
| 19 | Founder capacity | ~11-14h founder over 2 sprints; lighter than v3.0 (~42-52h). |
| 20 | CLA | This IS a CLA-produced unit (CLA v1.1 revise sub-flow). |

---

## 6. Success criteria

A v4.0 ingest succeeds when ALL hold:

1. **Layout invariant.** `find wiki/ -name "*.md" -not -path "wiki/_index/*" -not -path "wiki/capabilities/*"` returns ONLY files matching pattern `wiki/<source-slug>/(source\.md|(concepts|observations|decisions|ideas|chapters)/<entity-slug>\.md)`.
2. **Skill input contract.** Founder runs `cd wiki/growth-playbook-fixture/concepts/ && ls` and sees 6 standalone concept files; no need to scan other directories.
3. **Source-scoped retrieval.** `/wiki ask "wedge" --source growth-playbook-fixture` returns ONLY that source's framing.
4. **Cross-package retrieval.** `/wiki ask "wedge"` returns top hits across all packages with package attribution in each result.
5. **Reverse-lookup.** `wiki/_index/concept/wedge.md` exists and lists all packages that mention "wedge".
6. **DB invariants.** `ops.knowledge_pages` rows: source RECORDs have `extracted_from_source_id IS NULL` and globally unique slugs; derived entities have `extracted_from_source_id IS NOT NULL` and slugs unique within source.
7. **No production-blocking drift.** `pnpm check` clean after Phase 8 promotion.
8. **All 14 existing entities + 1 legacy migrated.** Migration tool log shows 14 entities + 1 sample source RECORD regenerated + 1 legacy file `git mv`'d.
9. **Empty plural dirs gone.** `ls wiki/` shows no `concepts/`, `observations/`, etc. directories.
10. **`_index/` populated.** `wiki/_index/concept/`, `wiki/_index/observation/`, `wiki/_index/decision/`, `wiki/_index/idea/` exist with at least 1 link-list file each.

### Out of scope (explicitly deferred to v4.1 or beyond)

- Auto-promote aliased canonical entries to a curated `wiki/canon/` pool (Option C territory).
- Cron-scheduled `_index/` rebuild (current: founder-triggered or post-sync).
- Search-engine-like ranking inside `_index/<type>/<name>.md` link-lists (current: insertion order).
- Per-package retrieval cache.
- Web UI / dashboard surface for packages.

---

## 7. Effort summary

| Sprint | Goal | Founder hours | LLM cost |
|---|---|---|---|
| 1 | Migration 00032 + migrate-to-v4 script + skill rewrites (14 files) + tier1-diff updates + validator updates + dir cleanup PR | 6-8h | $3-4 |
| 2 | NEW `index-rebuild` skill + `--source` / `--packages` flags on `/wiki ask` + `/wiki package` cmd + rebuild-wiki-index.sh | 3-4h | $1-2 |
| Phase 8 | Promotion (spec promote + CATALOG + registry version bump + retrospective-v4.0.0.md) | 2h | $0.50 |
| **Total** | | **11-14h** | **$4.50-6.50** |

Compared to v3.0 (~42-52h / $23-30), v4.0 is **3-4× cheaper** because it's path-rearrangement + 1 DDL, not a semantic flip.

---

## 8. Re-trigger conditions for v4.1+

- (a) Founder later wants graph-mode dedup back as a default → consider v5.0 revise.
- (b) `_index/` proves valuable enough that founder asks for cron-scheduled rebuild → v4.1 adds the cron entry to `knowledge/schedules.yaml`.
- (c) Skill template authors find package-input ergonomics still awkward (e.g. want `input = wiki/<source-slug>/concepts/wedge.md AND wiki/<source-slug>/observations/wedge-as-traction-metric.md`) → v4.1 introduces "named selection" syntax.
- (d) > 50 packages exist and `_index/` files grow > 1MB each → introduce sharded `_index/` or DB-backed alternative.
- (e) Auto-canonization (Option C territory) becomes a felt need → v4.1 introduces `/wiki canonize` + `wiki/canon/`.

---

## 9. CTO sanity-check

**Verdict: NITS** — merge-ready after a handful of small cleanups; would not block. Full review at [cto-review.md](./cto-review.md).

The 4 explicit sequencing questions answered with confidence:

1. **Partial indexes before drop = SAFE.** `00032:47-49, 59-61, 72-77` all live inside the `BEGIN/COMMIT`. The two partial predicates (`IS NULL` vs `IS NOT NULL`) exhaustively partition the table. During the window where all three constraints coexist, every row is covered by exactly one partial index plus the old global UNIQUE. **No uniqueness gap.**
2. **Composite UNIQUE `(extracted_from_source_id, slug)` with `WHERE extracted_from_source_id IS NOT NULL` = SAFE.** Verified against current 14 rows: 13 derived share one source FK with distinct slugs; the legacy `spaced-repetition` is currently `extracted_from_source_id IS NULL` so it falls under Block A. **No FK breakage** — all FKs on `ops.knowledge_pages` target `id` (uuid PK), never `slug`.
3. **DDL/data deferral window = real but LOW risk.** Between 00032 commit and `migrate-to-v4.cjs` finishing, the DB allows INSERTs with v3.0 paths that satisfy the new partial indexes. Mitigation: single-operator runs both back-to-back. Header comment promotes this.
4. **RLS = no new attack surface.** Partial indexes inherit table RLS from 00031. The only new surface is `wiki/_index/*.md` alias-text markdown injection — handled in Sprint 2 `index-rebuild` SKILL.md sanitization note.

**NITs applied in this Phase 5 (during finalization):**
- nit a: RAISE NOTICE → real RAISE EXCEPTION assertions in 00032 DO block ✅
- nit b: `IF NOT EXISTS` on both partial indexes (partial-reapply foot-gun) ✅
- nit c: `wiki/article(s?)` mismatch reconciliation note in `tier1-diffs.yaml` ✅
- nit d: Phase 7 grep regex expanded to all 14 plural-dir patterns ✅
- nit e: Halt-on-divergence note for regen-then-mv slug determinism ✅ (spec.md §0 row 3 + risk register)
- nit g: `mcp-server/src/tools/wiki-*.ts` Phase 7 grep gate added ✅

**NITs deferred to Sprint 1 PR (with line items):**
- nit f: `legacy_v2_verbatim` semantics post-migrate-to-v4 — resolved as Option (a) in §3.9 of this spec.

---

## 10. Muse panel synthesis

**Verdict: 2 of 3 PROCEED** (Graham NIT, Feynman clean); **Rams CONCERN** on `_index/` as premature ornament. Full panel at [muse-panel.md](./muse-panel.md).

| Persona | Frame | Verdict | Key contribution |
|---|---|---|---|
| Paul Graham | Default-alive vs default-dead; v3.0 kill clock | NIT | Layout flip is an enabler, not a wedge. 7-day commitment: ingest ≥3 growth playbooks within 7 days of v4.0 ship, else kill criterion supersedes regardless of layout. |
| Dieter Rams | Less but better; obvious-is-easy | CONCERN | `_index/` is addition disguised as completeness. Recommend ship as Option A (defer `_index/` to v4.1 entry condition b); add only when 20+ packages or real skill demands it. |
| Richard Feynman | Essential vs accidental complexity | PROCEED | Composite UNIQUE is essential complexity (correctness, not workaround). DDL+script split is unavoidable. One residual rough edge: `jsonb_set` UPDATE on `ops.ingestion_jobs.metadata` deserves a comment in the script header. |

**Aggregate recommendation:** founder MAY approve at Tier C, but should explicitly decide (a) Option B-with-`_index/` vs Option A-defer-`_index/`, AND (b) commit to 7-day ingest discipline post-ship. v4.0 does NOT reset the v3.0 kill criterion clock.

---

## 11. Tier C decision record

**Approved 2026-05-18 by founder via AskUserQuestion inline ceremony.**

- **Decision slug:** `wiki-sync-v4-source-grouped-layout`
- **ops.decisions row id:** `e558913a-fb5d-444a-ab0b-305f38ce80a0`
- **Decision state:** `decided` (transitioned from `draft` at 2026-05-18T08:24Z founder approval)
- **Approval method:** AskUserQuestion inline (Claude Code CLI; this session)
- **Founder identity:** verified via session continuity (override-authorized session `caf0cd84-af27-45e0-807d-e15912ebb926`; prior session `f55023d9-...` force-unlocked at 2026-05-18T08:04Z per Tier D-Std `override:` ceremony, audit_log id `e6f5e17b-6db6-466f-a616-0907dcaf1213`)
- **Cooldown:** N/A for Tier C
- **Founder approved at:** 2026-05-18T08:24Z (`ops.capability_runs.approved_at` + `ops.decisions.decided_at`)
- **Sub-decisions resolved:**
  - **SD-1 (Option A vs B):** **B (with `wiki/_index/`)**. Rams's CONCERN noted but founder elected `_index/` inclusion at v4.0 ship for skill-input ergonomics; v4.1 re-evaluation per re-trigger condition (b).
  - **SD-2 (7-day ingest commitment):** **YES**. Founder commits: by 2026-05-25, ingest ≥ 3 growth playbooks via `/wiki sync` so v3.0 kill-criterion (day-30: 2026-06-17) is informed by real v4.0 usage.
  - **SD-3 (CTO nits):** **Apply 6 at Phase 5 (a, b, c, d, e, g); defer f to Sprint 1.** Implemented in this spec + draft files before approval.

### State transitions persisted

- `ops.decisions[e558913a].state`: `draft → decided`
- `ops.capability_runs[f75502d4].state`: `implementing → planning`
- `ops.capability_runs[f75502d4].current_phase`: `5 → 6`
- `ops.capability_runs[f75502d4].phases_completed`: `[0, 1, 3, 4] → [0, 1, 3, 4, 5]`
- `ops.capability_phase_events`: appended phase=5 event_type='completed' row.

### Next phase

**Phase 6 — Sprint Planning** (Tier B). Skill `capability-lifecycle/sprint-planner` breaks this spec into 2 sprints (per §7 effort summary). Founder approves the sprint plan at Tier B. Then Phase 7 (implementation) begins, which is multi-session (one PR per sprint). Lock stays held by session `caf0cd84-...` until Phase 8 catalog promotion.

---

## 12. Operating notes

- Once `wiki/_index/` exists, founder NEVER hand-edits it. Always regenerate via `/wiki index rebuild`.
- The migrate-to-v4 script is **single-use** but kept in `scripts/wiki-sync/` indefinitely for audit / replay if a v5 revert is ever needed.
- Composite UNIQUE on `(extracted_from_source_id, slug)` makes one legitimate query slower: "find this exact slug globally". This is a 14-row table; no observable slowdown. If table grows past 10K rows, add a non-unique index on `(slug)` for that lookup.
- The 30-day v3.0 kill criterion clock continues running. If v4.0 ships day-25 and v3.0 fails day-30, freeze applies to v4.0 work too.
