---
name: wiki-sync/adapters/markdown-adapter
description: |
  Markdown passthrough adapter for wiki-sync. For `.md` files already in
  Markdown form, no extraction needed. source_kind=`markdown_passthrough`;
  entity_type derived from file frontmatter `type:` field (defaults to
  `concept` if absent).
---

# Markdown adapter (Sprint 1 baseline)

## When to use

- Dispatched by `wiki-sync/ingest` when path ends in `.md` or `.markdown`
- source_kind: `markdown_passthrough`
- entity_type: read from file frontmatter `type:` (if absent → `concept`)
- wiki target: `wiki/<entity_type>/<slug>.md`

## Inputs

- `path` — absolute path under `raw/`

## Process

### Step 1 — Validate

- File exists? Else bail.
- Extension `.md` or `.markdown`? Else delegate.
- Size > 0? Else bail.
- Size < 5 MB? Else bail (manual split required).
- Report `pages_or_size_metric = file_size_bytes`. v2.0 (Sprint 2 PR2): `wiki-sync/ingest` Step 5 dispatches to `wiki-sync/chapter-splitter` when `pages_or_size_metric > 25 KB` (or founder passes `--split=heading=h2`); splitter reads back this adapter's `raw_text` and runs the heading=h2 boundary detection on it.

### Step 2 — Compute source_hash

```bash
sha256sum "$path"
```

### Step 3 — Parse YAML frontmatter

If file starts with `---\n` block:
```yaml
---
type: book          # entity_type
slug: my-note       # override slug
title: My Note      # override title
author: ...
created: 2026-05-16
---
```

Parse via `js-yaml`. Extract `type`, `slug`, `title` for entity_type and slug suggestion. Carry remaining fields into `attribution`.

If no frontmatter: default `entity_type='concept'`, slug from filename stem.

### Step 4 — Synthesize raw_text

Strip the frontmatter block (if present). Return the body as `raw_text`.

### Step 5 — Slug + attribution

- Slug: frontmatter `slug:` first; else from filename stem.
- Title: frontmatter `title:` first; else first `# Heading` in body; else from filename.
- Attribution: frontmatter fields not in (`type`, `slug`, `title`).

## Outputs

```jsonc
{
  "raw_text": "<markdown body, frontmatter stripped>",
  "source_ref": "/Users/doanchienthang/ritsu-works/raw/<topic>/<file>.md",
  "source_hash": "sha256:abcdef...",
  "attribution": {
    "author": "...",
    "created": "...",
    "format_metadata": "Markdown, X chars"
  },
  "pages_or_size_metric": <markdown char count>,
  "suggested_slug": "<from frontmatter or filename>",
  "suggested_entity_type": "<from frontmatter type: field, default 'concept'>",
  "ocr_needed": false
}
```

## Failure modes

| Symptom | Response |
|---|---|
| File not found | Bail with absolute path |
| Not Markdown (binary detected) | Bail; suggest correct adapter |
| Invalid YAML frontmatter | Warn; treat file as no-frontmatter |
| `type:` in frontmatter not in 14-type enum | Bail with valid types list |
| File > 5 MB | Bail; ask founder to split first |

## Cost estimate

- Extraction: FREE (just file IO + yaml parse)
- Embedding (downstream): ~$0.001-$0.005 / file
- LLM-fallback (downstream, if triggered): ~$0.05 / chunk

Total per Markdown file: ~$0.02-$0.05. Cheapest adapter.

## Sprint scope

Sprint 1: full implementation. Markdown is the simplest case — first acceptance test fixture uses this adapter (per spec.md Sprint 1 acceptance: "MD round-trip < $0.10").

## Related

- Parent: `06-ai-ops/skills/wiki-sync/ingest/SKILL.md`
- Tier 1 config: `knowledge/ingestion-sources.yaml` entry `markdown_passthrough`
- Test fixture: `tests/wiki-sync/fixtures/sample.md` (created Sprint 1 for acceptance test)
