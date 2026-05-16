---
name: wiki-sync/adapters/youtube-adapter
description: |
  STUB (Sprint 1) — placeholder for YouTube transcript adapter. Implemented
  Sprint 2: yt-dlp transcript download (VTT/caption first, whisper fallback).
  source_kind=`youtube_video`; wiki target `wiki/episodes/<slug>.md`.
---

# YouTube adapter (STUB — Sprint 2)

Sprint 1 ingest dispatch refuses YouTube URLs (no adapter wired yet); founder gets:

```
YouTube adapter not yet implemented (Sprint 2 ETA).
Workaround: download transcript manually (e.g., `yt-dlp --write-auto-subs --skip-download <url>`)
and ingest the resulting .vtt via meeting-adapter (also Sprint 2).
```

## When implemented (Sprint 2)

Per spec.md § Sprint 2:
- Fetch transcript via `yt-dlp` (auto-captions if available; whisper-on-audio fallback)
- Parse chapter markers from YouTube description / VTT cue points
- source_ref: canonical YouTube URL (with timestamp prefix if chapter-bounded)
- source_hash: video ID + transcript content hash
- entity_type: `episode`
- wiki target: `wiki/episodes/<slug>.md`

## Related

- Tier 1 config: `knowledge/ingestion-sources.yaml` entry `youtube_video`
- Sibling: `06-ai-ops/skills/wiki-sync/adapters/meeting-adapter/SKILL.md` (handles VTT manually)
