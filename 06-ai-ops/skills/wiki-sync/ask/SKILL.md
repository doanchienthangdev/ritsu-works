---
name: wiki-sync/ask
description: |
  STUB (Sprint 1) — placeholder for the wiki-sync ask verb. Will implement
  citation-disciplined RAG over wiki/ + ops.knowledge_embeddings in Sprint 3.
  Returns {answer:null, reason:'not_implemented'} when invoked from Sprint 1.
---

# wiki-sync / ask (STUB — Sprint 3)

This file is a placeholder so `wiki-sync/SKILL.md`'s `ask` dispatch entry has a
target. Sprint 1 ships ingest verb only.

## When implemented (Sprint 3)

Per spec.md § Sprint 3:
- Hybrid retrieval (vector top-K + keyword BM25, scored per Bài #14 ranking)
- Optional rerank flag (off by default for cost)
- Citation-disciplined synthesis — every claim cites `[wiki/<type>/<slug>.md#chunk-NN]`
- Returns `{answer:null, reason:'no_coverage'}` if no wiki hit
- Never falls back to training data

## Sprint 1 behaviour

If founder invokes `/wiki ask "..."` in Sprint 1:

```jsonc
{
  "answer": null,
  "reason": "not_implemented_until_sprint_3",
  "citations": []
}
```

## Cost

Sprint 3+: ~$0.02 / ask (no rerank), ~$0.10 / ask (with rerank).

## Related

- Parent: `06-ai-ops/skills/wiki-sync/SKILL.md`
- Companion: `06-ai-ops/skills/wiki-sync/ingest/SKILL.md` (Sprint 1)
- Future MCP exposure: `mcp__wiki__ask` (Sprint 3, via mcp-server extension)
