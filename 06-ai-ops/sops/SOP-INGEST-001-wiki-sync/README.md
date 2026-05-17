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

```
INPUT: raw/<entity_type>/<file>   OR   URL
         │
         ▼
 1. fetch (adapter)             [minion / deterministic]
 2. dedup check                  [minion]
 3. acquire advisory lock        [minion]
 4. chapter split (if needed)    [subagent, LLM]
 5. extract entities             [subagent, LLM via adapter]
 6. entity-link (regex + LLM)    [hybrid]
 7. embed                        [minion / OpenAI API]
 8. write wiki + knowledge_pages [minion]
 9. emit events + cost           [minion]
         │
         ▼
OUTPUT: wiki/<entity_type>/<slug>.md  +  DB rows in ops.{ingestion_jobs, knowledge_pages, knowledge_links, knowledge_embeddings, events, cost_attributions}
```

## State machine

Reuses `ops.ingestion_jobs.state` (defined in migration 00007):

```
queued → fetching → processing → completed
                                ↘ failed
                                ↘ duplicate
                                ↘ low_quality
```

## HITL

Per `governance/HITL.md`:
- Default Tier A (additive writes to wiki/ + ops.* schemas; reversible)
- Escalates to Tier B if estimated `total_cost_usd` exceeds per-task-kind cap (per `knowledge/economic-architecture.md`)

## Cost-bucket

`ai-ops-knowledge` (registered in `knowledge/capability-registry.yaml.cost_buckets` Sprint 1)

## Per-task-kind caps

| Task | Cap |
|---|---|
| `wiki-ingest-pdf` | $1.00 / invocation |
| `wiki-ingest-url` / `markdown` / `youtube` / `meeting` | $0.30 |
| `wiki-ingest-folder` (v2.0 Sprint 2 PR3) | $2.00 / invocation (sum of children) |
| `wiki-ask` | $0.10 |
| `wiki-audit` | $0.50 |

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

- `06-ai-ops/skills/wiki-sync/ingest/SKILL.md` (orchestrator)
- `06-ai-ops/skills/wiki-sync/adapters/<adapter>/SKILL.md` (per format)
- `06-ai-ops/skills/wiki-sync/chapter-splitter/SKILL.md` (Sprint 2+)
- `06-ai-ops/skills/wiki-sync/link-extractor/SKILL.md` (Sprint 2 hybrid)

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
