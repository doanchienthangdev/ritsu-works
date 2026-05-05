# Bài #18 — Knowledge Ingestion Pipeline (DRAFT)

**Status:** DRAFT — derived from G13 walkthrough, not yet brainstormed/decided
**Walkthrough:** `_build/notes/phase-a2/walkthroughs/G13-knowledge-ingestion.md`
**Dependencies:** Bài #1, #4, #5, #6, #7, #8 DRAFT, #9 DRAFT, #11 DRAFT, #14 DRAFT, #15 DRAFT, #17 DRAFT

## Why
~10 issues + founder daily content consumption (5 articles/day, 2 podcasts/week, 3 videos/week, 10 voice notes/week).

Phase A defers ingestion to per-pillar Phase B. Phase A.2 reveals defer = wrong:
- External knowledge = upstream of Bài #14 graph + Bài #4 search
- Voice notes time-sensitive (idea loss)
- Per-pillar reinvention = drift
- Dedup, quality filter, chunking = cross-cutting concerns

Without Bài #18:
- Manual paste-to-wiki = bandwidth sink
- Vector index bloat từ duplicate ingestions
- Voice ideas forgotten before transcription
- Cost surprises (Whisper API)
- Knowledge graph stagnates (only founder-written content auto-linked)

## Decisions (tentative)

### Axis 1 — Source Registry + Adapter Pattern
**Choice:** IngestionAdapter interface + Tier 1 knowledge/ingestion-sources.yaml
- 7+ source kinds (article, podcast, book, repo, voice, video, tweet thread)
- Common interface (fetch, normalize, assess_quality, chunk, attribution)
- Active subscriptions polled by Bài #8 schedules
- Cost estimates surfaced per source kind

### Axis 2 — Pipeline Orchestration + Minions
**Choice:** SOP-INGEST-001 với Minions queue cho deterministic steps
- 11 pipeline steps (fetch → dedup → quality → normalize → chunk → embed+extract → summarize → write → emit)
- Most steps deterministic → ops.minion_jobs queue (parallel)
- Summarization judgment → subagent
- Per-chunk parallelism: 8 concurrent
- Cost tracked to Bài #7 cost-bucket

### Axis 3 — Voice Note Classification + Auto-Routing
**Choice:** voice-note-classify skill + Tier 1 routing rules
- Classification: idea | decision_request | observation | task | mixed
- Routing rules in knowledge/ingestion-routing.yaml
- decision_request → invokes Bài #15 muse-panel (Tier C HITL)
- task → ops.tasks (Bài #5)
- idea → wiki/raw-ideas/<date>-<slug>.md
- Telegram voice messages = primary capture surface (Bài #6 sub-domain B)

### Axis 4 — Observability + Quality Scoring + Lifecycle
**Choice:** ops.ingestion_jobs + dashboard pages + post-ingest quality scoring
- ops.ingestion_jobs với status state machine
- 5 dashboard pages (jobs, queue, cost, quality, sources health)
- Post-ingest quality scoring (retrieval frequency + founder feedback)
- Re-ingestion lifecycle (slug preserved, compiled-truth updated)
- Active subscriptions health monitoring

## Schema additions (Tier 2)

```sql
CREATE TABLE ops.ingestion_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind     text NOT NULL,
  source_url      text,
  source_hash     text,                  -- URL hash for dedup
  content_hash    text,                  -- content-level dedup
  
  status          text NOT NULL,         -- 'queued' | 'fetching' | 'processing' | 'completed' | 'failed' | 'duplicate' | 'low_quality'
  state_since     timestamptz NOT NULL DEFAULT now(),
  
  resulting_slug  text,                  -- wiki page slug if successful
  
  whisper_cost_usd numeric,
  llm_cost_usd     numeric,
  total_cost_usd   numeric,
  
  quality_score   numeric,
  quality_flags   text[],
  
  attribution     jsonb,
  metadata        jsonb,
  
  ingested_at     timestamptz,
  last_refreshed_at timestamptz,
  
  error_message   text,
  error_step      text,
  
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON ops.ingestion_jobs (source_hash) WHERE source_hash IS NOT NULL;
CREATE INDEX ON ops.ingestion_jobs (content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX ON ops.ingestion_jobs (status, created_at DESC);
```

## YAML schemas

```yaml
# knowledge/ingestion-sources.yaml
source_kinds:
  - id: <slug>
    adapter: <adapter-name>
    fetch_method: <description>
    chunking: <strategy>
    cost_estimate: <per-unit cost>
    quality_filters: [<filter-list>]
    classification_required: <bool>
    attribution_required: [<field-list>]

active_subscriptions:
  - source_kind: <kind>
    name: <display name>
    feed_url: <url>
    poll_cadence: <duration>
```

```yaml
# knowledge/ingestion-routing.yaml
voice_note_routing:
  <classification>:
    target: <wiki-path | muse-panel | ops.tasks>
    follow_up: <action>
    hitl: <tier>
```

## TypeScript interface

```typescript
export interface IngestionAdapter {
  source_kind: string;
  fetch(input: IngestInput): Promise<RawSource>;
  normalize(raw: RawSource): Promise<NormalizedSource>;
  assess_quality(normalized: NormalizedSource): Promise<QualityScore>;
  chunk(normalized: NormalizedSource): Promise<Chunk[]>;
  attribution(raw: RawSource): SourceAttribution;
}
```

## SOP definition

```yaml
sop_id: SOP-INGEST-001-knowledge-ingest
hitl_tier: tier_a
sla_minutes: 30
trigger:
  - event: ritsu.knowledge.ingest_request
  - manual: founder-initiated CLI
steps:
  - fetch (minion)
  - dedup-check (minion)
  - quality-assess (minion)
  - normalize (minion)
  - chunk (minion)
  - embed-and-extract (minion, parallelism 8)
  - summarize (subagent)
  - write-wiki-page (minion)
  - emit-event
```

## Initial 7 source kinds

article, podcast, book, repo, voice_note, youtube_video, tweet_thread

## New components (31)

31 components — 2 Tier 1 registries + adapters + 9 skills + SOP + ops.ingestion_jobs + 5 dashboard pages + 2 MCP tools + browser extension + email handler + 7 cross-bài-toán updates + meta.

**Largest set so far** — ingestion pipeline = upstream of entire knowledge layer.

## Open questions

- OQ18.1: Re-ingestion frequency per kind?
- OQ18.2: Vector index sharding at 10K+ pages?
- OQ18.3: Translation step for non-EN sources?
- OQ18.4: Personal recording consent (GDPR)?
- OQ18.5: Real-time vs batch ingestion?
- OQ18.6: Image/video frame extraction?
- OQ18.7: Custom chunking per author style?
- OQ18.8: Selective ingestion within long sources?
- OQ18.9: Cross-source entity disambiguation?
- OQ18.10: LLM vs rule-based voice classification?

## Anti-patterns

- ❌ Manual paste-to-wiki (bandwidth sink)
- ❌ Skip dedup (vector index bloat)
- ❌ No quality filter (clickbait pollution)
- ❌ One-size-fits-all chunking
- ❌ Skip source attribution
- ❌ Voice notes without classification
- ❌ Skip cost tracking (Whisper bill surprises)
- ❌ Adapter bypassed (direct API per skill)
- ❌ No pipeline observability
- ❌ Single LLM call for whole document (chunk first)
- ❌ Skip re-ingestion lifecycle
- ❌ Voice classification rules in code (use Tier 1)

## GBrain heritage notes

- **Page format compiled-truth + timeline** (Bài #14 lineage)
- **Auto-link extraction** post-ingest (Bài #14)
- **Skillify pattern** for ingestion skills
- **BrainBench validates:** ingested + auto-linked corpus → 49.1% P@5
- **Minions pattern** = textbook fit (deterministic, parallel)

## Ritsu uses (platform primitives)

| Need | Platform |
|---|---|
| URL fetch | fetch / Readability |
| Audio transcription | OpenAI Whisper API |
| LLM summary | Anthropic Claude |
| Embeddings | OpenAI text-embedding-3-small |
| Vector storage | Postgres pgvector |
| Job queue | ops.minion_jobs (Bài #5) |
| Storage | Postgres ops.ingestion_jobs + filesystem wiki/ |
| Scheduling | Bài #8 schedules |

## Ritsu adds (Outer Harness)

1. ingestion-sources.yaml + ingestion-routing.yaml (Tier 1)
2. IngestionAdapter interface + 7+ adapters
3. SOP-INGEST-001 + 9 ingestion skills
4. voice-note-classify skill
5. ops.ingestion_jobs table
6. Dashboard 5 pages
7. MCP tools (ingest, search_jobs)
8. Browser extension stub + email forward handler
9. Cross-bài-toán updates (#4, #5, #7, #11, #14, #15, #17)

## Lessons captured

1. Ingestion = upstream of knowledge graph (Bài #14).
2. Adapter pattern parallels surface adapter (Bài #17).
3. Dedup essential (3 layers: URL hash + content hash + similarity).
4. Voice notes = special category (time-sensitive, classification + auto-routing).
5. Cost tracking critical (Whisper $0.006/min).
6. Quality filter prevents signal-to-noise drop.
7. Chunking strategy per source kind.
8. Source attribution non-negotiable.
9. Re-ingestion preserves slug, updates compiled-truth.
10. Pipeline as SOP + Minions (deterministic-heavy, parallel).
11. Active subscriptions = scheduled polling.
12. Cross-bài-toán integration heaviest of all walkthroughs (7 updates).
