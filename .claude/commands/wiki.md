# /wiki

Project-scoped command for ritsu-works. Front-end for the wiki-sync capability
(`wiki-sync-from-refs`). Thin orchestrator — phase logic lives in the skills
under `06-ai-ops/skills/wiki-sync/`. Follows the same orchestrator pattern as
`/cla` (delegate to skill; manage HITL gates; persist state).

## Subcommands

| Invocation | Purpose | HITL | Persistence |
|---|---|---|---|
| `/wiki` | Show menu + recent ingests / asks / audits | A | read-only |
| `/wiki sync <path>` | Ingest one ref into wiki | A (B if cost > per-task-kind cap) | INSERT ops.ingestion_jobs + ops.knowledge_pages + embeddings |
| `/wiki sync <path> --split=<toc\|count=N\|heading=h2>` | Ingest with chapter splitting | A | per chapter row |
| `/wiki sync <path> --force` | Re-sync ignoring change-detection (overwrite) | B | UPDATE row |
| `/wiki ask "<question>"` | RAG query against wiki | A | INSERT ops.agent_runs entry (no wiki write) |
| `/wiki audit` | Integrity scan (orphan / dead / stale) | A | writes `.archives/wiki-audits/<date>.md` |
| `/wiki audit --fix` | Audit + offer auto-fixes (one PR per fix class) | B | one PR per fix class |
| `/wiki status` | Show current ingestion queue + recent audit results | A | read-only |
| `/wiki list [--type=<entity_type>]` | List wiki pages by type | A | read-only |
| `/wiki resync <path>` | Re-fetch ref + diff against existing wiki page | A (B if writes) | UPDATE row |

## Workflow

### `/wiki sync <path>`

1. **Detect adapter** — read `<path>` extension / URL pattern. Map to one of the 5 source-kind adapters in `knowledge/ingestion-sources.yaml`. Bail with helpful error if no adapter matches.
2. **Chapter-split prompt** — if PDF > 100 pages OR `--split` flag passed, run `chapter-splitter` skill which uses `AskUserQuestion` to confirm split mode (`toc` / `count=N` / `heading=h2`).
3. **Acquire lock** — `SELECT ops.wiki_sync_lock(<entity_type>, <slug>)` (migration 00022) to prevent concurrent writes.
4. **Dedup check** — compute `source_hash = sha256(ref_content)`; query `ops.ingestion_jobs WHERE source_hash = ? AND state IN ('completed')`. If exists and `--force` not set, return "ref unchanged; wiki up-to-date".
5. **Run SOP-INGEST-001** — invokes the 6-step pipeline skill via `06-ai-ops/sops/SOP-INGEST-001-wiki-sync/`.
6. **Confirm to founder** — print summary (entity type, slug, page count, cost) + link to written wiki path.

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
