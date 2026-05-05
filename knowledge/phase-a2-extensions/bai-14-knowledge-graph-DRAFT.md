# Bài #14 — Knowledge Graph Architecture (DRAFT)

**Status:** DRAFT — derived from G15 walkthrough, not yet brainstormed/decided
**Walkthrough:** `_build/notes/phase-a2/walkthroughs/G15-knowledge-graph.md`
**Dependencies:** Bài #1, #4, #5, #8 DRAFT, #11 DRAFT, #12 DRAFT, #13 DRAFT
**Heritage:** GBrain reference architecture (https://github.com/garrytan/gbrain)

## Why
~12 issues directly + many indirect (every relational query benefits).

Phase A defers graph to v1.x: *"Strategy A: Postgres + pgvector for embedding-based recall. Defer knowledge graph — premature complexity."*

**GBrain BrainBench reveals defer is wrong:**
- v0.12 (graph + hybrid): P@5 49.1%, R@5 97.9%
- No-graph hybrid: P@5 17.7%
- Vector-only RAG: ~17% P@5
- **Gap: 2.8x precision, 5.5x recall improvement**

Auto-link extraction = $0/write (deterministic regex). Cost-benefit obvious.

Without Bài #14:
- Search caps at ~17-22% P@5
- "Who works at X" queries unanswerable (vector misses)
- GDPR data deletion error-prone (no traversal)
- Decision archaeology fails at 6 months
- Knowledge silos per pillar

## Decisions (tentative)

### Axis 1 — Schema & Page Format
**Choice:** Adopt GBrain page format + ops.knowledge_links Postgres-native
- Page format: compiled-truth (above ---, mutable) + timeline (below ---, append-only)
- `[[wiki-link/slug]]` references = automatic graph edges
- Slug convention: `<type>/<slug>` (lowercase kebab-case, globally unique)
- ops.knowledge_links table với typed edges
- Postgres-native (recursive CTEs), not separate graph DB

### Axis 2 — Auto-Link Extraction (zero LLM)
**Choice:** post-page-write hook + Tier 1 inference rules
- Parse markdown → wikilinks + bare slugs
- Strip code-fences (no false positives)
- Type inference cascade (works_at > founded > invested_in > mentions)
- Within-page dedup, stale reconciliation on edits
- knowledge/link-inference-rules.yaml Tier 1 declarative
- Marked deterministic → ops.minion_jobs (Minions pattern)
- Cost: $0/page write

### Axis 3 — Cross-Source Edges
**Choice:** State transitions + events + ops.tasks auto-emit edges
- DB trigger after customers_state_log INSERT → emit edge
- Bài #11 events with entity refs → edges
- Bài #5 ops.tasks payload → edges
- Unified ops.knowledge_links table (text + structured sources)

### Axis 4 — Graph API + Search Integration
**Choice:** Recursive CTE + skill + MCP tool + backlink boost
- `graph-traverse` skill (depth-capped, cycle-prevented)
- `ritsu.knowledge.graph_query` MCP tool (Bài #12)
- Search ranking: vector*0.5 + keyword*0.3 + backlink*0.2
- Daily backfill cron (Bài #8)
- Mermaid visualization CLI

## Schema additions (Tier 2)

```sql
CREATE TABLE ops.knowledge_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug     text NOT NULL,
  target_slug     text NOT NULL,
  link_type       text NOT NULL,
  confidence      numeric DEFAULT 1.0,
  occurrence_count int DEFAULT 1,
  source_context  text,
  first_seen_at   timestamptz DEFAULT now(),
  last_seen_at    timestamptz DEFAULT now(),
  is_stale        boolean DEFAULT false,
  metadata        jsonb,
  
  UNIQUE (source_slug, target_slug, link_type)
);

CREATE INDEX ON ops.knowledge_links (source_slug, link_type) WHERE NOT is_stale;
CREATE INDEX ON ops.knowledge_links (target_slug, link_type) WHERE NOT is_stale;
CREATE INDEX ON ops.knowledge_links (link_type, last_seen_at DESC);
```

## YAML schema

```yaml
# knowledge/link-inference-rules.yaml
rules:
  - id: founder-pattern
    pattern: "(\\[\\[person/[\\w-]+\\]\\]) (?:founded|co-founded) (\\[\\[company/[\\w-]+\\]\\])"
    edge_type: founded
    confidence: 0.95
    
  - id: works-at-with-role
    pattern: <regex with role capture>
    edge_type: works_at
    metadata: { role: "$2" }
    confidence: 0.90
    
  - id: invested-in
    pattern: <regex>
    edge_type: invested_in
    confidence: 0.95
    
  - id: customer-uses-product
    pattern: <regex>
    edge_type: uses
    confidence: 0.85
    
  - id: mentions-fallback
    pattern: "\\[\\[([\\w-]+/[\\w-]+)\\]\\]"
    edge_type: mentions
    confidence: 1.0
```

## Page format convention

```yaml
---
type: customer | company | concept | decision | meeting | episode | person | content
slug: <type>/<kebab-case-name>
tags: [...]
created_at: <date>
last_assessed_at: <date>
---

# <Title>

## Compiled Truth (above ---, mutable)

<Current best understanding. Rewritten when evidence changes.>

Connected to: [[type/slug]], [[type/slug]]

---

## Timeline (below ---, append-only)

- <date> — <event>: source [[type/slug]]
- <date> — <event>: source [[type/slug]]
```

## Recursive CTE traversal pattern

```sql
WITH RECURSIVE traversal AS (
  SELECT source_slug, target_slug, link_type, 1 AS depth, ARRAY[source_slug] AS path
  FROM ops.knowledge_links
  WHERE source_slug = $1 AND NOT is_stale
  
  UNION ALL
  
  SELECT kl.source_slug, kl.target_slug, kl.link_type, t.depth + 1, t.path || kl.source_slug
  FROM ops.knowledge_links kl
  JOIN traversal t ON kl.source_slug = t.target_slug
  WHERE NOT kl.is_stale
    AND t.depth < 10  -- DoS prevention
    AND NOT (kl.target_slug = ANY(t.path))  -- cycle prevention
)
SELECT DISTINCT * FROM traversal ORDER BY depth, source_slug;
```

## New components (22)

| ID | Component | Type | Phase |
|---|---|---|---|
| CN14.1 | ops.knowledge_links | Tier 2 | B |
| CN14.2 | knowledge/link-inference-rules.yaml | Tier 1 | A.2 |
| CN14.3 | Page format convention | Schema | A.2 |
| CN14.4 | Slug convention | Schema | A.2 |
| CN14.5 | auto-link-extract skill | Procedural | C |
| CN14.6 | graph-traverse skill | Procedural | C |
| CN14.7 | post-page-write hook | Hook | D |
| CN14.8 | DB triggers (state/event/task → edges) | Tier 2 | B |
| CN14.9 | MCP tool ritsu.knowledge.graph_query | MCP | D |
| CN14.10 | Search ranking backlink boost | Update Bài #4 | C |
| CN14.11 | ritsu-cli graph diagram | CLI | C |
| CN14.12 | wiki/graph-views/ Mermaid | Docs | A.2 |
| CN14.13 | Daily backfill cron entry | schedules.yaml | A.2 |
| CN14.14 | Recipe add-link-inference-rule.md | Meta | A.2 |
| CN14.15 | Recipe add-entity-type.md | Meta | A.2 |
| CN14.16 | Checklist entity-page-pre-publish.md | Meta | A.2 |
| CN14.17 | Update Bài #4 page format + auto-link | Update | A.2 |
| CN14.18 | Update Bài #11 events emit edges | Update | A.2 |
| CN14.19 | Update Bài #13 state transitions emit edges | Update | A.2 |
| CN14.20 | Update Bài #5 ops.tasks payload emits edges | Update | A.2 |
| CN14.21 | Update Bài #12 graph_query MCP tool | Update | A.2 |
| CN14.22 | Brainstorm problem-14 | Meta | A.2 |

## Open questions

- OQ14.1: Multi-language link inference (VI vs EN)?
- OQ14.2: Confidence thresholds (LLM verification trigger)?
- OQ14.3: Cross-instance graph sync?
- OQ14.4: Graph versioning on rule change?
- OQ14.5: Operator role graph access?
- OQ14.6: Cycle handling beyond prevention?
- OQ14.7: Edge expiration (former vs current)?
- OQ14.8: Entity disambiguation (two "John Doe"s)?

## Anti-patterns

- ❌ Skip graph layer (P@5 caps)
- ❌ LLM-based link extraction (cost explosion)
- ❌ Separate graph DB (sync nightmare)
- ❌ Skip slug convention
- ❌ No stale reconciliation
- ❌ Skip page format convention
- ❌ Inference rules in code
- ❌ No depth cap
- ❌ Skip backlink boost in search
- ❌ Treat graph as separate domain

## GBrain heritage notes

**Direct adoption:**
- Compiled-truth + timeline page format
- Auto-link algorithm (zero LLM, regex-based)
- Type inference cascade (FOUNDED > INVESTED > ADVISES > WORKS_AT)
- Recursive CTE traversal pattern
- Backlink boost in search ranking
- Stale-link reconciliation
- Slug convention

**Production validation:** GBrain runs at 17,888 pages, 4,383 people, 723 companies. Postgres-native scales.

**BrainBench numbers (re-validated):**
- v0.12 graph + hybrid: P@5 49.1%, R@5 97.9%
- v0.11 less link extract: P@5 22.1%
- Hybrid no-graph: P@5 17.7%
- ripgrep BM25: ~17%
- Vector-only: ~17%

## Ritsu uses (platform primitives)

| Need | Platform |
|---|---|
| Edge storage | Postgres |
| Recursive traversal | Postgres recursive CTEs |
| Auto-link parsing | TypeScript regex (skill) |
| Page format | Markdown + frontmatter |
| Visualization | Mermaid |
| Backfill | Bài #8 schedules.yaml + Minions queue |

## Ritsu adds (Outer Harness)

1. ops.knowledge_links table
2. Page format + slug convention (Tier 1 standard)
3. link-inference-rules.yaml (Tier 1)
4. auto-link-extract skill
5. graph-traverse skill
6. post-page-write hook
7. DB triggers for state/event/task → edges
8. MCP tool ritsu.knowledge.graph_query
9. Search ranking backlink boost
10. CLI graph diagram visualization
11. Daily backfill cron
12. Cross-bài-toán updates (#4, #5, #11, #12, #13)

## Lessons captured

1. Graph is not optional (2.8x precision per BrainBench).
2. Auto-link extraction = $0/write (regex only).
3. Page format convention essential.
4. Slug convention non-negotiable.
5. Operational data = graph data too.
6. Postgres-native > separate graph DB.
7. Backlink boost in search ranking.
8. Stale-link reconciliation prevents drift.
9. Type inference cascade (specific overrides generic).
10. GBrain validates Postgres + recursive CTE + auto-link at scale.
