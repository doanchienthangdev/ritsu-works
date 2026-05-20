# Retrospective: wiki-sync-from-refs v4.3.0 (extend)

**Capability ID:** `wiki-sync-from-refs`
**Version:** 4.3.0 (extend from v4.2.0)
**Phase:** 8 — Catalog Update (post-extend)
**Shipped:** 2026-05-20
**Sub-flow:** `/cla extend wiki-sync-from-refs` (accelerated single-session)

---

## What v4.3 addressed

Founder asked: when I want to feed an entire chapter of a distilled book (e.g. *Marketing Management* Ch 14) as input context to another command (`/cla propose`, `@cgo`, `@cpo`), what's the right workflow? Should I create an intermediate context file?

Pre-v4.3, the only options were:
1. Direct file Read references in the next command's prompt (operator must know exact paths + glob hints)
2. `/wiki ask --source <slug>` — narrow Q&A, not exhaustive
3. Anti-pattern: copy content into `.archives/context-bundle-X.md` (drift, manual labor, broken citation chain)

v4.3 ships **`/wiki get`** — stateless, deterministic, citation-preserving bundler. One spec → one markdown bundle → either stdout (paste into prompt) or file (`--to=<path>`).

---

## Sprint scope shipped

**v4.3 = single session AI execution (~45 min):**

| Component | Change | Status |
|---|---|---|
| `scripts/wiki-sync/get.cjs` (NEW, ~280 LoC) | Source-spec parser (5 scopes) + bundle assembler + cap-aware drop tracking + `--to=<path>` write OR stdout | ✅ |
| `.claude/commands/wiki.md` | New subcommand row + workflow section (`### /wiki get`) with spec grammar table, flags, examples, composition pattern | ✅ |
| `06-ai-ops/skills/wiki-sync/get/SKILL.md` (NEW) | Skill spec — when to use, process, failure modes, anti-pattern guidance | ✅ |
| `knowledge/capability-registry.yaml` | Version 4.2.0 → 4.3.0, retrospective_path updated | ✅ |
| `wiki/capabilities/CATALOG.md` | v4.3 row in version history; description updated | ✅ |
| `wiki/capabilities/wiki-sync-from-refs/retrospective-v4.3.0.md` (this file) | Phase 8 retro | ✅ |

**Out of scope (v4.4 candidate):**

- `mcp__wiki__get` MCP tool (server-side wrapper around `get.cjs`). Currently the skill is local-filesystem only; an MCP version would let subagents without filesystem access (e.g. headless cron jobs) use `/wiki get` too.
- `--via-db` flag to source content from `ops.knowledge_pages` instead of filesystem (useful when filesystem and DB diverge).
- Auto-composition `<flag>--wiki-context=<spec>` on `/cla`, `@cxo`, `@cgo` etc. so the bundler injects directly without operator pasting.

---

## Source spec grammar (5 scopes)

| Spec form | Example | Scope |
|---|---|---|
| `<source-slug>` | `marketing-management-kotler` | Full source: source.md + all chapters + capped entities |
| `<source-slug>/chapter-N` | `marketing-management-kotler/chapter-14` | Chapter N file + entities cited from it |
| `<source-slug>/chapter-NN-<slug>` | `marketing-management-kotler/chapter-14-personal-selling-direct-marketing` | Specific chapter file |
| `<source-slug>/<type>` | `marketing-management-kotler/ideas` | All entities of type (concepts \| observations \| decisions \| ideas) |
| `<source-slug>/<type>/<entity-slug>` | `marketing-management-kotler/decisions/decision-ritsu-direct-marketing-engine-email-lifecycle` | One entity page |

---

## Tested scopes (all passing)

- ✓ `chapter-N` spec — 1 chapter + 8 entities (5 concepts + 2 obs + 1 decision) for Kotler MM Ch 14
- ✓ `--to=<path>` file write — wrote 115 KB to `.archives/test-bundle-ch14.md`, 1424 lines
- ✓ `<source-slug>` full source — 21 chapters + 200 entities (capped at 10 via `--max-entities`, dropped 190 reported)
- ✓ `<source-slug>/<type>/<slug>` single entity — 1 decision entity full body
- ✓ Error: source not found — bails with clear message
- ✓ `<source-slug>/<type>` all ideas — 17 idea entities, summary mode prints titles

---

## Estimated vs actual

| Metric | Estimated | Actual | Delta |
|---|---|---|---|
| Founder time | 1-2h (write spec, review, test) | ~5 min (single ask) | -95% |
| LLM cost | $0.50 | $0 (no LLM call — pure filesystem read) | -100% |
| Wall-clock | 2-4h | ~45 min | -75% |
| Lines of code | 200-300 | ~280 (get.cjs) + skill + command docs | on target |

---

## What went well

1. **Spec grammar was natural.** Source-grouped layout v4.0 (`wiki/<source>/{chapters,concepts,...}`) means spec syntax `<source>/<scope>` maps 1:1 to filesystem paths. No translation layer needed.

2. **Pure filesystem read = $0 cost + deterministic.** No LLM, no DB write (besides agent_runs log via slash command orchestrator). Re-runnable without budget concerns. Idempotent.

3. **Frontmatter-driven entity filtering for chapter scope.** Each entity has `source_chapter_index` in its frontmatter (set during v3.0 distill). Filtering by chapter is just `grep -l` semantics. No DB join needed.

4. **Single-script implementation reuses parseFrontmatter pattern from docs-engine walker.** Consistent code style across wiki-sync + docs-engine pipelines.

5. **Anti-pattern documented in SKILL.md.** Future operators reading the skill see the "don't copy bundle into .archives/" warning + recommended re-run pattern.

---

## What was harder than expected

1. **Spec disambiguation for chapter file vs chapter index.** Spec `chapter-14` (numeric) vs `chapter-14-personal-selling-direct-marketing` (full filename) both start with `chapter-`. Regex match `^chapter-0*(\d+)$` (digits only) for numeric form; otherwise fall through to filename match. Tested both — works.

2. **Source RECORD frontmatter inclusion.** Initially considered including source.md FULL body (could be MB-scale bibliography), but reduced to just frontmatter YAML block — meta-only, content-light, preserves citation lineage without bloat.

3. **Cap default tuning.** Default 100 entities is comfortable for typical chapter-N bundle (~10 entities) but too low for full source (~200). User can override via `--max-entities=N` with dropped count reported. Acceptable trade-off.

---

## Boilerplate-extractable patterns (additions to v4.0 list)

10. **Filesystem-read bundler with spec grammar.** Pattern: `<container>/<scope>` spec resolves to a deterministic file set via frontmatter or filename matching. Reusable for any future source-grouped store (e.g. `/docs get --src=<category>/<page>` for the docs-engine).

11. **Anti-pattern guidance in SKILL.md.** Skills should explicitly document `❌ DO NOT` alternatives. Especially for stateless skills like `get` where naive operators might create intermediate files.

12. **Stderr summary + stdout output separation.** Bundle (stdout) vs status line (stderr) means operators can pipe `| wc -l` or `| head` without losing the summary. Reusable pattern.

---

## Lessons for next CLA extend run

1. **A "thin orchestrator + spec grammar" extend is cheap.** v4.3 took ~45 min vs v4.0 (full revise) ~5 days. Use sub-flow `/cla extend` for thin additions; reserve `/cla revise` for architecture changes.

2. **`bash test` matrix before committing.** Testing 6 spec modes (chapter + file write + full source + entity + error case + type-only) took ~5 min and caught no bugs but built confidence. Make this standard for any spec-grammar-based skill.

3. **Backward compatibility is free when adding NEW verbs.** v4.3 adds `/wiki get` without touching `/wiki sync`, `/wiki ask`, etc. Zero migration risk. Pattern: when extending, prefer NEW verb over modifying existing verb behavior.

---

## v4.3.0 promotion confirmed

- [x] `knowledge/capability-registry.yaml` updated (4.2.0 → 4.3.0)
- [x] `wiki/capabilities/wiki-sync-from-refs/retrospective-v4.3.0.md` written (this file)
- [x] `wiki/capabilities/CATALOG.md` v4.3 row + history update
- [x] `scripts/wiki-sync/get.cjs` tested on 6 scope modes
- [x] `.claude/commands/wiki.md` updated (row + workflow section)
- [x] `06-ai-ops/skills/wiki-sync/get/SKILL.md` written
- [ ] Final `pnpm check` clean (last gate)
- [ ] Docs site `/docs/commands/wiki` reflects new `/wiki get` subcommand (after `/docs sync` runs)

---

## Open questions / future work (v4.4+ candidates)

1. **v4.4 — `mcp__wiki__get` MCP tool.** Server-side wrapper so headless subagents can use `/wiki get` without local filesystem access. Time-box 2h.

2. **v4.4 — `--via-db` flag.** Source content from `ops.knowledge_pages.content` instead of filesystem. Useful when DB has been updated but filesystem hasn't been re-synced (e.g. founder pulled DB but not git).

3. **v4.4 — Auto-composition flag on /cla, @cxo.** `/cla propose "Build email engine" --wiki-context=marketing-management-kotler/chapter-14` would call `/wiki get` internally and inject as preamble. Saves operator one paste action.

4. **v4.4 — JSON output mode.** `--format=json` returns machine-readable structure (chapter list + entity list with frontmatter) for skill orchestration. Currently markdown-only.

5. **v4.5 — Cross-source bundle.** `/wiki get --src=concept/4-Ps-of-marketing` resolves all canonical entries for that concept across multiple sources (via `wiki/_index/` reverse-lookup link-lists). For when founder wants "everything Kotler said about 4 Ps" regardless of which book.

6. **v4.5 — Compression mode.** For very large bundles (>200 KB), an optional `--compress` mode that drops redundant frontmatter and inlines only critical fields. For LLM context budgets where every token costs.
