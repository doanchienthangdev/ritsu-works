---
name: wiki-sync/ask
description: |
  Citation-disciplined RAG over wiki/ + ops.knowledge_embeddings (Sprint 3 PR5,
  v2.0.0). Embeds the question via OpenAI text-embedding-3-small, hybrid-
  retrieves top-K wiki chunks (vector + keyword), synthesises an answer that
  cites real wiki paths via Markdown links `[wiki/<type>/<slug>.md#chunk-NN]`.
  Returns `{answer:null, reason:'no_coverage'}` if no wiki hit; NEVER falls back
  to training data. v0.1 = STUB that returns the contract structure + reports
  wiki state; v0.2 wires real OpenAI calls (gated on wiki_sync_llm_fallback
  feature flag + OPENAI_API_KEY).
---

# wiki-sync / ask (Sprint 3 PR5 baseline — v2.0.0)

## When to use

- Founder runs `/wiki ask "<question>"` → dispatches here.
- Other agent calls `mcp__wiki__wiki_ask` → also dispatches here (added Sprint 3 PR5).

## Inputs

- `question` — natural language string (3..2000 chars)
- `k` — optional top-K (default 10)
- `rerank` — optional bool (default false; adds ~$0.05 cost when true)
- `filter` — optional `{ page_type? }` to scope retrieval

## Process (v0.2 target — full implementation)

### Step 1 — Embed the question

```
POST https://api.openai.com/v1/embeddings
  { model: 'text-embedding-3-small', input: question }
→ 1536-dim vector
```

Cost: ~$0.00002 per question (negligible).

### Step 2 — Hybrid retrieval

Per Bài #14 ranking, the score is `vector*0.5 + keyword*0.3 + backlink*0.2`:

**Vector path:**
```sql
SELECT page_id, chunk_index, chunk_text, embedding <=> $1 AS distance
  FROM ops.knowledge_embeddings
 WHERE ($filter_page_type IS NULL OR EXISTS (
     SELECT 1 FROM ops.knowledge_pages WHERE id = page_id AND page_type = $filter_page_type
   ))
 ORDER BY embedding <=> $1
 LIMIT $k * 2;  -- over-fetch for dedup
```

**Keyword path (BM25 via Postgres full-text):**
```sql
SELECT page_id, chunk_index, chunk_text,
       ts_rank_cd(to_tsvector('english', chunk_text), websearch_to_tsquery($question_text)) AS rank
  FROM ops.knowledge_embeddings
 WHERE to_tsvector('english', chunk_text) @@ websearch_to_tsquery($question_text)
 ORDER BY rank DESC
 LIMIT $k * 2;
```

**Backlink path** (boost pages cited by many other pages):
```sql
SELECT target_page_id, count(*) AS backlinks
  FROM ops.knowledge_links
 WHERE is_active = true
 GROUP BY target_page_id;
```

Combine: normalize each path's score to [0, 1]; compose per ranking formula; dedup by (page_id, chunk_index); take top K.

### Step 3 — Optional rerank (if `rerank=true`)

Call OpenAI rerank model on the top-K chunks against the question. Re-order by rerank score. Cost ~$0.05 per call.

### Step 4 — Fetch full chunk context

For each top-K chunk, fetch the page's frontmatter + the chunk's neighboring chunks (chunk_index ± 1) for context.

### Step 5 — Synthesize answer

Call Claude (Sonnet or Opus per `wiki_sync_llm_fallback` flag) with a system prompt that enforces citation discipline:

```
You are answering from a corpus of wiki pages. RULES:
1. Every claim MUST cite a wiki page in the form [wiki/<type>/<slug>.md#chunk-NN].
2. If the corpus does not contain enough information to answer, return
   {answer: null, reason: "no_coverage"}.
3. NEVER use information that is not in the provided chunks.
4. NEVER cite a path that wasn't in the input — that's a hallucination.
```

Input to Claude: question + top-K chunks (with explicit wiki path + chunk_index labels).

### Step 6 — Validate citations

Programmatically verify every `[wiki/...]` link in the answer:
- The path exists (matches a row in `ops.knowledge_pages.file_path`).
- The `#chunk-NN` anchor matches a real chunk_index for that page.

If validation fails, retry once with stricter prompt; if still fails, return `reason: 'citation_validation_failed'`.

### Step 7 — Return

```jsonc
{
  "answer": "...",
  "citations": [
    { "wiki_path": "wiki/concept/spaced-repetition.md", "slug": "spaced-repetition", "chunk_index": 0, "score": 0.87 },
    ...
  ],
  "reason": "answered",  // or "no_coverage" | "citation_validation_failed"
  "cost_usd": 0.02,
  "retrieval_summary": { "vector_hits": K, "keyword_hits": K, "merged_topk": K, "reranked": false }
}
```

## v0.1 STUB behavior (THIS commit)

Until v0.2 wires the OpenAI calls + npm dep, the SKILL returns:

```jsonc
{
  "answer": null,
  "reason": "embedding_search_deferred_v0_2",
  "version": "0.1",
  "citations": [],
  "question_echoed": "<input>",
  "wiki_state": {
    "knowledge_pages_count": N,
    "knowledge_embeddings_count": M
  },
  "fallback_tools_v0_1": [
    "wiki_list_pages (browse by page_type)",
    "wiki_get_page (fetch by slug + read Markdown)"
  ],
  "note": "v0.1 returns contract-complete stub. Use wiki_list_pages + wiki_get_page to browse-and-cite manually until v0.2 ships."
}
```

The MCP tool `mcp__wiki__wiki_ask` mirrors this contract — see
`mcp-server/src/tools/wiki-ask.ts`.

## HITL

- Tier A always (read-only)
- No founder approval needed — citation discipline is enforced programmatically

## Failure modes

| Symptom | Response |
|---|---|
| OPENAI_API_KEY missing (v0.2) | Bail with clear "feature_flag_blocked" reason |
| OpenAI rate limit | Exponential backoff (5s → 15s → 30s); after 3 fails, return reason='rate_limited' |
| No wiki coverage | Return `reason:'no_coverage'` (NEVER guess from training data) |
| Citation validation fails twice | Return `reason:'citation_validation_failed'`; surface to founder |
| `pgvector` extension missing | Fail loudly; founder must apply migration 00006 |
| `knowledge_embeddings` table empty | Return early with `reason:'no_embeddings_yet'` + suggest running embeddings-backfill |

## Cost

| Mode | Per ask |
|---|---|
| v0.1 STUB | $0 (DB counts only) |
| v0.2 (no rerank) | ~$0.02 (embedding + claude) |
| v0.2 (with rerank) | ~$0.07 |

Per-task-kind cap from SOP-INGEST-001 README: `wiki-ask` = $0.10 / invocation.

## Sprint scope

Sprint 3 PR5 (v2.0.0) — this commit:
- All 7 steps documented in prose
- STUB handler in mcp-server (`mcp__wiki__wiki_ask`) returns v0.1 contract
- Wiki state reporting (page/embedding counts) so caller knows whether to fall through to manual browsing

v0.2 (separate PR, when founder authorises):
- Add `openai` npm dep + `OPENAI_API_KEY` env wiring
- Wire actual Step 1-6 implementation
- Flip `wiki_sync_llm_fallback` flag to true
- Integration test against real fixture

## Related

- MCP exposure: `mcp-server/src/tools/wiki-ask.ts` (this commit)
- Parent: `06-ai-ops/skills/wiki-sync/SKILL.md`
- Feature flag: `wiki_sync_llm_fallback` in `knowledge/feature-flags.yaml`
- Schema: `ops.knowledge_embeddings` (vector top-K target), `ops.knowledge_pages` (citation resolution), `ops.knowledge_links` (backlink boost)
- Companion v0.1 fallback tools: `wiki_list_pages`, `wiki_get_page`
- Bài #14 ranking formula source: `knowledge/phase-a2-extensions/bai-14-knowledge-graph-DRAFT.md`
