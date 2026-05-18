# SOP-INGEST-001 — Wiki Sync Pipeline

**Capability:** `wiki-sync-from-refs` (Sprint 1)
**Pillar:** 06-ai-ops (knowledge-engineering)
**Status:** Active from Sprint 1 (2026-05-16)
**Author:** /cla propose 2026-05-16, Option B (Aligned with Bài #18)

---

## Purpose

Synchronous, founder-triggered pipeline that ingests one source reference (PDF, URL, Markdown, YouTube video, meeting transcript) into the wiki + knowledge-graph + embeddings system. Subset of Bài #18's 11-step ingestion architecture (axes 1+2+4); active subscriptions (axis 1 cron) and voice-note classification (axis 3) deferred to v1.1+.

## Flow

See [flow.yaml](flow.yaml) for canonical step definitions.

## v3.0 pipeline (DEFAULT — distill+extract)

```
INPUT: raw/<topic>/<file>   OR   URL   OR   folder
         │
         ▼
 1. fetch (adapter)                            [deterministic]
 2. dedup check                                 [deterministic]
 3. acquire advisory lock                       [deterministic]
 4. chapter split (if needed)                   [subagent, LLM]
 5. extract chunks (adapter)                    [deterministic]
 6. DISTILL entities                            [LLM — Haiku for concept+idea; Sonnet for observation+decision]
 7. DEDUP pass (slug + vector sim)              [deterministic + pgvector]
 8. embed (source RECORD + entity pages)        [OpenAI text-embedding-3-small]
 9. write source RECORD + N entity pages        [deterministic — multi-page output]
10. emit events + cost                          [deterministic]
         │
         ▼
OUTPUT (v4.0 source-grouped layout — Sprint 1 of v4.0 revise, 2026-05-18):
  wiki/<source-slug>/source.md                      (1 source RECORD — thin: frontmatter + summary + pointer)
+ wiki/<source-slug>/concepts/<slug>.md       ×N
+ wiki/<source-slug>/observations/<slug>.md   ×M    (entity pages — distilled knowledge)
+ wiki/<source-slug>/decisions/<slug>.md      ×K
+ wiki/<source-slug>/ideas/<slug>.md          ×J
+ wiki/<source-slug>/chapters/chapter-NN.md   ×P    (only when chapter-split fires; page_type='book')
+ DB rows in ops.{ingestion_jobs, knowledge_pages, knowledge_links, knowledge_extractions, knowledge_embeddings, events, cost_attributions}
```

The composite UNIQUE on `(extracted_from_source_id, slug)` (migration 00032) means same-slug derived entities across different source packages (e.g. `wedge` in both `wiki/pg-do-things/concepts/wedge.md` and `wiki/blank-4-steps/concepts/wedge.md`) coexist legitimately.

## v2.0 fallback pipeline (`--verbatim` flag)

```
INPUT → 1. fetch → 2. dedup → 3. lock → 4. chapter-split → 5. extract chunks →
       → 6'. link-extract (regex + opt LLM fallback)   [no distill]
       → 8. embed
       → 9. write SINGLE wiki page (v2.0 behavior)
       → 10. emit events + cost

OUTPUT (v4.0 layout for --verbatim mode): wiki/<source-slug>/source.md   (1 verbatim page; no entity extraction)
```

Auto-deprecation trigger (per v3.0 spec §0): if `--verbatim` invoked < 1× in first 30 days post-v3.0 promotion, flag removed in v3.1 first PR.

## State machine

Reuses `ops.ingestion_jobs.state` (defined in migration 00007). v3.0 adds transient state `distilling` between `processing` and `completed`:

```
queued → fetching → processing → distilling → completed
                                            ↘ failed
                                            ↘ duplicate
                                            ↘ low_quality
```

`distilling` is the new state for Steps 6-9 of v3.0 pipeline. In `--verbatim` mode this state is skipped (pipeline goes processing → completed directly).

## HITL

Per `governance/HITL.md`:
- Default Tier A (additive writes to wiki/ + ops.* schemas; reversible)
- Escalates to Tier B if estimated `total_cost_usd` exceeds per-task-kind cap (per `knowledge/economic-architecture.md`)

## Cost-bucket

`ai-ops-knowledge` (registered in `knowledge/capability-registry.yaml.cost_buckets` Sprint 1)

## Per-task-kind caps (v3.0)

| Task | Cap | Tier B threshold | Notes |
|---|---|---|---|
| `wiki-distill-pdf` | $2.00 | — | v3.0 default for PDF |
| `wiki-distill-folder` | $15.00 | $5.00 (Tier B above) | raised per Muse M6 — accommodates 20-paper growth corpus |
| `wiki-distill-other` | $0.50 | — | URL / Markdown / YouTube / meeting in v3.0 default |
| `wiki-ingest-verbatim` | $0.30 | — | `--verbatim` flag invocations |
| `wiki-review-batch` | $0.20 | — | One `/wiki review` session |
| `wiki-dedup-batch` | $0.30 | — | Per-source dedup pass |
| `wiki-merge` | $0.05 | — | Mostly DB rewires |
| `wiki-ask` | $0.10 | — | unchanged from v2.0 |
| `wiki-audit` | $0.50 | — | unchanged from v2.0 |

DEPRECATED (transition window through v3.1; auto-mapped to new caps):
- `wiki-ingest-pdf` ($1.00) → `wiki-distill-pdf` (default) OR `wiki-ingest-verbatim` (--verbatim)
- `wiki-ingest-url` / `markdown` / `youtube` / `meeting` ($0.30) → `wiki-distill-other` OR `wiki-ingest-verbatim`
- `wiki-ingest-folder` ($2.00) → `wiki-distill-folder` (default; raised to $15)

## Concurrency

Migration 00027 adds `ops.wiki_sync_lock(entity_type, slug)` (postgres advisory lock). All ingest runs MUST acquire this before write phase. Lock is transaction-scoped — released at COMMIT.

Migration 00027 also replaces non-unique `ingestion_jobs` dedup indexes with UNIQUE partial indexes on active states — DB-level guard against duplicate active jobs for same source.

## Observability

Events emitted (via `ops.events`):
- `ritsu.wiki.sync_started`
- `ritsu.wiki.synced` (success)
- `ritsu.wiki.sync_failed` (state='failed')
- `ritsu.wiki.sync_duplicate` (state='duplicate')

Cost rows in `ops.cost_attributions` per pipeline step (cost-bucket `ai-ops-knowledge`).

## Skills invoked

- `06-ai-ops/skills/wiki-sync/ingest/SKILL.md` (orchestrator; v3.0 updated Steps 6-10)
- `06-ai-ops/skills/wiki-sync/adapters/<adapter>/SKILL.md` (6 file/folder adapters)
- `06-ai-ops/skills/wiki-sync/chapter-splitter/SKILL.md` (Sprint 2 v2.0; chapters feed distill in v3.0)
- `06-ai-ops/skills/wiki-sync/link-extractor/SKILL.md` (regex + opt LLM-fallback; runs alongside distill in v3.0)
- `06-ai-ops/skills/wiki-sync/distill/SKILL.md` (v3.0 — core engine; per-type model picker)
- `06-ai-ops/skills/wiki-sync/dedup/SKILL.md` (v3.0 — Sprint 3; slug + vector sim)
- `06-ai-ops/skills/wiki-sync/embeddings-backfill/SKILL.md` (v2.0; v3.0 update covers derived entity pages)
- `06-ai-ops/skills/wiki-sync/review/SKILL.md` (v3.0 — Sprint 4; pending_review queue UX)
- `06-ai-ops/skills/wiki-sync/merge/SKILL.md` (v3.0 — Sprint 4; manual merge + --undo)
- `06-ai-ops/skills/wiki-sync/attribution-watcher/SKILL.md` (v3.0 — Sprint 4; A11 attribution discipline)
- `06-ai-ops/skills/wiki-sync/ask/SKILL.md` (v3.0 update — entity-first retrieval + Muse M5 citation format)
- `06-ai-ops/skills/wiki-sync/audit/SKILL.md` (v3.0 update — 9 checks total; 5 v2.0 + 4 v3.0)

## Sprint scope

| Sprint | Coverage |
|---|---|
| **1 (current)** | Steps 1-3, 5-9 for `book` / `article` / `markdown_passthrough` adapters. Chapter-splitter STUB. LLM-fallback OFF. |
| 2 | YouTube + Meeting adapters. Chapter-splitter live. Advisory lock wired. |
| 3 | `wiki-sync/ask` skill + MCP shim. |
| 4 | `wiki-sync/audit` + L2 validator + LLM-fallback link extraction live. |

## Related

- Capability spec: `wiki/capabilities/wiki-sync-from-refs/spec.md` (promoted Phase 8)
- Sprint plan: `.archives/cla/wiki-sync-from-refs/sprint-plan.md`
- Bài #14 (knowledge graph): `knowledge/phase-a2-extensions/bai-14-knowledge-graph-DRAFT.md`
- Bài #18 (ingestion pipeline): `knowledge/phase-a2-extensions/bai-18-knowledge-ingestion-DRAFT.md`
- Migration: `supabase/migrations/00027_wiki_sync_extensions.sql`
- Tier 1: `knowledge/ingestion-sources.yaml`, `knowledge/link-inference-rules.yaml`, `knowledge/manifest.yaml`
