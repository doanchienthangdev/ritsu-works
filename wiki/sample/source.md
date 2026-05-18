---
page_type: article
slug: sample
extracted_from_source: null
source_ref: tests/wiki-sync/fixtures/sample.md
created: 2026-05-18
updated: 2026-05-18
license_status: public_domain
---

# Sample fixture (v2.0 legacy compatibility)

Stub source RECORD created by `scripts/wiki-sync/migrate-to-v4.cjs` during the
v3.0→v4.0 layout migration. The single derived entity
`wiki/sample/concepts/spaced-repetition.md` references this page via its
`extracted_from_source` frontmatter and `ops.knowledge_pages.extracted_from_source_id` FK.

For a full distillation (concepts/observations/decisions/ideas extracted
from the sample fixture body), run:

```bash
/wiki sync tests/wiki-sync/fixtures/sample.md
```

after the v4.0 layout migration completes. Re-running distill against the
fixture will produce derived entities under `wiki/sample/{concepts,...}/`
respecting composite UNIQUE `(extracted_from_source_id, slug)`.

## Provenance

- Hand-stubbed: 2026-05-18
- Migration: `supabase/migrations/00032_wiki_v4_source_grouped.sql`
- Capability run: `ops.capability_runs[f75502d4-c7b2-44c1-86a5-395b4578f93d]`
- Tier C decision: `ops.decisions[e558913a-fb5d-444a-ab0b-305f38ce80a0]` (slug `wiki-sync-v4-source-grouped-layout`)
