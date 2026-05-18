# /wiki

Project-scoped command for ritsu-works. Front-end for the wiki-sync capability
(`wiki-sync-from-refs`). Thin orchestrator — phase logic lives in the skills
under `06-ai-ops/skills/wiki-sync/`. Follows the same orchestrator pattern as
`/cla` (delegate to skill; manage HITL gates; persist state).

**v3.0 (2026-05-18 onward): DEFAULT semantic = distill+extract.** Source files
become RECORD pages; important knowledge (concept / observation / decision / idea)
is LLM-extracted into separately-projected `wiki/<type>/<slug>.md` entity pages
with citation via `ops.knowledge_extractions`. `--verbatim` flag falls through
to v2.0 verbatim-projection behavior.

## Subcommands (v3.0 verb table)

| Invocation | Purpose | HITL | Persistence |
|---|---|---|---|
| `/wiki` | Show menu + recent ingests / asks / audits / review queue size | A | read-only |
| `/wiki sync <path>` | **DEFAULT = distill+extract.** Source becomes RECORD page + N derived entity pages (concept/observation/decision/idea). `<path>` may be a file OR a directory (folder-adapter v2.0 + cross-paper aggregation v3.0). | A (B if cost > cap) | INSERT source RECORD + N entity pages + extractions + links + embeddings |
| `/wiki sync <path> --verbatim` | v2.0 fallback: single-page write, no distill. Auto-deprecation trigger: if invoked < 1× in 30 days post-promotion, flag removed in v3.1. | A | INSERT single page (v2.0 behavior) |
| `/wiki sync <path> --split=<toc\|count=N\|heading=h2>` | Chapter split (PDFs > 100pp; chapters feed distill independently) | A | per chapter row with `parent_job_id` (migration 00030 Block C) |
| `/wiki sync <path> --force` | Re-extract everything; bypass chunk-diff | B | UPDATE row |
| `/wiki resync <path>` | Chunk-diff first; re-extract only changed chunks. Tier B if > 50% chunks changed (founder confirms scope per spec A8). | A (B if > 50% changed) | UPDATE row |
| `/wiki distill <path>` (alias) | Same as `/wiki sync`. Explicit verb for clarity. | A (B if cost > cap) | same as sync |
| `/wiki extract <path> --type=concept\|observation\|decision\|idea` | Selective: run extractor for ONE entity type only. Useful for re-running after threshold tuning. | A | INSERT/UPDATE only matching-type entity pages |
| `/wiki merge <canonical-slug> <duplicate-slug>` | Manual dedup: merge two pages founder identifies as same. Soft-delete loser via `deleted_at`. | B | UPDATE extractions rewire + soft-delete duplicate |
| `/wiki merge <a> <b> --undo` | Reverse most recent merge of the pair. Restores `deleted_at = NULL`. | B | UPDATE (reverse rewire) |
| `/wiki source <slug>` | Reverse lookup: list all derived entities from a source RECORD with their `knowledge_extractions` confidence + raw_quote. | A | read-only |
| `/wiki review` | Process founder-review queue (pending_review pages with extraction confidence 0.6-0.85 OR dedup queue 0.75-0.92). | B per item | UPDATE `knowledge_extractions.founder_decision` + page review_state |
| `/wiki ask "<question>"` | **v3.0 entity-first retrieval.** Prefer derived entity pages over source chunks; citation format includes original source title + raw_quote (Muse M5). | A | INSERT ops.agent_runs entry (no wiki write) |
| `/wiki audit` | Integrity scan. v3.0 adds 4 new checks: distillation completeness, citation integrity, dedup consistency, attribution discipline (A11). | A | writes `.archives/wiki-audits/<date>.md` |
| `/wiki audit --fix` | Audit + offer auto-fixes (one PR per fix class) | B | one PR per fix class |
| `/wiki attribution-check <content-file>` | Manual trigger of `wiki-sync/attribution-watcher` — checks if recent `/wiki ask` correlated with this content file edit, ≥3 obs from copyrighted source → Tier B heads-up | B | INSERT ops.events row |
| `/wiki status` | Show current ingestion queue + recent audit results + pending_review count | A | read-only |
| `/wiki list [--type=<page_type>]` | List wiki pages by type | A | read-only |

## Workflow

### `/wiki sync <path>`

1. **Detect adapter** — read `<path>`:
   - If directory → `folder-adapter` (v2.0 PR3; iterates files alphabetically; refuses subdirectories; children use slug `<col-slug>__<file-slug>`)
   - Else extension / URL pattern → one of the 5 file adapters in `knowledge/ingestion-sources.yaml`
   - Bail with helpful error if no adapter matches
2. **Chapter-split prompt** — if PDF > 100 pages OR `--split` flag passed, run `chapter-splitter` skill which uses `AskUserQuestion` to confirm split mode (`toc` / `count=N` / `heading=h2`). Children get their own `ingestion_jobs` rows with `parent_job_id` (migration 00030 Block C).
3. **Acquire lock** — `SELECT ops.wiki_sync_lock(<entity_type>, <slug>)` (migration 00027) to prevent concurrent writes.
4. **Dedup check** — compute `source_hash = sha256(ref_content)`; query `ops.ingestion_jobs WHERE source_hash = ? AND state IN ('completed')`. If exists and `--force` not set, return "ref unchanged; wiki up-to-date".
5. **Run SOP-INGEST-001** — invokes the 6-step pipeline skill via `06-ai-ops/sops/SOP-INGEST-001-wiki-sync/`. For markdown + folder paths, prefer the CLI helper `scripts/wiki-sync/ingest.cjs` (v2.0 PR3) for deterministic file-side steps; LLM-touching steps stay in this command's session.
6. **Confirm to founder** — print summary (entity type, slug, page count, cost) + link to written wiki path. For folder ingest, also prints the per-file summary table.

### `/wiki ask "<question>"`

1. **Embed question** — OpenAI `text-embedding-3-small`.
2. **Retrieve** — hybrid search: vector top-K (k=10) + keyword (BM25) join, deduped, scored per Bài #14 ranking (vector*0.5 + keyword*0.3 + backlink*0.2).
3. **Optional rerank** — if `--rerank` flag passed (off by default for cost), call OpenAI rerank model on the top 10.
4. **Synthesize** — invoke `wiki-sync/ask` skill which composes the answer with strict citation discipline (every claim cites a wiki path + chunk anchor; if no citation possible, say "no wiki coverage").
5. **Return** — answer + citation list. NEVER fall back to training data.

### `/wiki audit`

1. **Hash check** — every `ops.knowledge_pages` row's `source_hash` is re-computed from `source_ref`; flag if drift > 0.
2. **Link walk** — every `ops.knowledge_links.target_page_id IS NULL` → orphan.
3. **Dead URL check** — every `wiki/articles/*.md` with `source_kind='url_article'` → HTTP HEAD `source_ref`; flag if 4xx/5xx.
4. **Stale-claim sample** — random 10 % of pages; LLM-evaluate "is this claim still consistent with the source ref?" (cheap sample; full sweep is too expensive).
5. **Write report** — `.archives/wiki-audits/<date>.md` with per-defect file:line precision + total defect rate.
6. **If `--fix`** — for each fix class (orphan, dead, stale), open one PR with proposed remediation.

## State persistence

Every invocation writes:
- `ops.agent_runs` row with `agent_slug = wiki-sync/<verb>`.
- For sync: `ops.ingestion_jobs` row, then `ops.knowledge_pages` row, then `ops.knowledge_embeddings` rows.
- `ops.cost_attributions` row (cost-bucket: `ai-ops-knowledge`).
- `ops.events` row (`ritsu.wiki.<verb>_completed`).

## HITL discipline

Per `governance/HITL.md`:
- `/wiki sync` (additive ingest) — **Tier A**.
- `/wiki sync --force` (re-sync overwrites) — **Tier B** (Telegram notify after — undo = `git revert`).
- `/wiki ask` — **Tier A** (read-only).
- `/wiki audit` — **Tier A** (read-only).
- `/wiki audit --fix` — **Tier B** per opened PR.
- A `/wiki sync` invocation whose estimated cost exceeds the `wiki-ingest-*` per-task-kind cap (see capability-registry.yaml) — escalates to **Tier B** (Telegram preview + approve).

## Drift gates

| Touchpoint | Gate |
|---|---|
| Before any DB write | check `pnpm check` clean (cheap; ~1s) |
| Before promoting an audit-fix PR | `pnpm check --full` |

## Defensive notes

- **Wiki edits are the founder's**. The command writes pages with a `<!-- generated-by: wiki-sync vN -->` marker. Pages WITHOUT this marker (or with it stripped) are treated as founder-edited; re-sync warns and shows a 3-way diff.
- **Re-sync regenerates by default.** Single-source-of-truth: ref = source, wiki = projection. If founder hand-edits a generated page, that's an exception requiring `--merge` (v1.1+) or accepting the warning.
- **All file paths logged to `ops.agent_runs`**. Easy to find "which page came from which ref."

## Related

- Capability spec: `wiki/capabilities/wiki-sync-from-refs/spec.md` (promoted in Phase 8)
- SOP: `06-ai-ops/sops/SOP-INGEST-001-wiki-sync/`
- Skills: `06-ai-ops/skills/wiki-sync/{ingest,ask,audit,adapters,chapter-splitter,link-extractor}/`
- MCP exposure: `mcp__wiki__ask`, `mcp__wiki__list_pages`, `mcp__wiki__get_page`
- Migration: `supabase/migrations/00022_wiki_sync_extensions.sql`
- Bài #14 (knowledge graph) + Bài #18 (ingestion pipeline) — the architectural ancestors
