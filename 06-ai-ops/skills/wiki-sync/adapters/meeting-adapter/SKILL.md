---
name: wiki-sync/adapters/meeting-adapter
description: |
  STUB (Sprint 1) — placeholder for meeting transcript adapter. Implemented
  Sprint 2: VTT/SRT/TXT passthrough with speaker-turn chunking.
  source_kind=`meeting_transcript`; wiki target `wiki/meetings/<slug>.md`.
---

# Meeting transcript adapter (STUB — Sprint 2)

Sprint 1 ingest dispatch refuses `.vtt` / `.srt` files (no adapter wired yet); founder gets:

```
Meeting adapter not yet implemented (Sprint 2 ETA).
Workaround: convert your transcript to plain Markdown
(`# Speaker A\n\nline 1\n\n# Speaker B\n\n...`) and ingest via markdown-adapter
with entity_type=meeting in frontmatter.
```

## When implemented (Sprint 2)

Per spec.md § Sprint 2:
- Parse VTT/SRT cue blocks → speaker-attributed Markdown
- Plain TXT passthrough (no parsing)
- Chunking: structural per speaker turn
- source_hash: sha256 of file
- entity_type: `meeting`
- wiki target: `wiki/meetings/<slug>.md`

## Related

- Tier 1 config: `knowledge/ingestion-sources.yaml` entry `meeting_transcript`
- Sprint 2 fixtures: `tests/wiki-sync/fixtures/sample.vtt`
