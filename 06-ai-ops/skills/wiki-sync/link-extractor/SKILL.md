---
name: wiki-sync/link-extractor
description: |
  Sprint 1 baseline: regex-only extraction per Bài #14 link-inference-rules.
  Sprint 4 will add LLM-fallback (escalate to LLM when regex finds < 3 links
  in a > 1000-token chunk) gated by feature flag `wiki-sync.llm_fallback_enabled`.
---

# wiki-sync / link-extractor (Sprint 1 baseline)

## When to use

- Called by `wiki-sync/ingest/SKILL.md` Step 6.

## Inputs

- `structured_content` — extracted entities + sections from adapter
- `chunk_text` — text being analyzed (per embedding chunk)
- `page_id` — uuid of the `ops.knowledge_pages` row being built (target for FK)

## Process (Sprint 1: regex-only)

### Step 1 — Regex pass

For each pattern in `knowledge/link-inference-rules.yaml.link_types[]`:
- Apply pattern to `chunk_text`
- For each match: INSERT into `ops.knowledge_links` with:
  - `source_page_id` = current page_id
  - `target_page_id` = lookup by slug (NULL if not found; that's the orphan-link signal `wiki-sync/audit` looks for)
  - `link_type` = the rule's `id`
  - `extracted_from_section` = (where in chunk_text the match was)
  - `source_text` = the matched snippet
  - `extraction_method` = 'regex'
  - `confidence` = 1.0

### Step 2 — Sprint 4 LLM-fallback (DEFERRED, stub)

Sprint 1: this step is a no-op.

Sprint 4 will add:
- If `regex_pass yielded < 3 links` AND `chunk has > 1000 tokens`:
- If `knowledge/feature-flags.yaml#wiki-sync.llm_fallback_enabled = true`:
- Call LLM with `link-extract-prompt.md` template
- INSERT extracted links with `extraction_method='llm'`, `confidence=<llm-confidence>`

Cost cap: $0.05 per LLM-fallback invocation.

## Outputs

```jsonc
{
  "links_created": <int>,
  "method_breakdown": { "regex": <int>, "llm": <int (Sprint 4+)> },
  "llm_cost_usd": <numeric>     // 0 in Sprint 1
}
```

## Failure modes

| Symptom | Response |
|---|---|
| Pattern compile error | Skip that rule; log warning |
| Bulk INSERT fails | Retry once; on second fail, mark step state='partial' |
| Target slug lookup ambiguous (multiple matches) | Pick first; flag for audit |

## Cost estimate

Sprint 1: $0 (regex only).
Sprint 4 with LLM-fallback ON: ~$0.01-$0.05 per chunk where fallback triggers (most chunks won't).

## Sprint scope

- Sprint 1: regex-only (this file)
- Sprint 4: LLM-fallback via feature flag

## Related

- Parent: `06-ai-ops/skills/wiki-sync/ingest/SKILL.md` (Step 6)
- Tier 1: `knowledge/link-inference-rules.yaml`
- Feature flag (Sprint 4): `knowledge/feature-flags.yaml#wiki-sync.llm_fallback_enabled`
- Companion table: `ops.knowledge_links` (migration 00006)
