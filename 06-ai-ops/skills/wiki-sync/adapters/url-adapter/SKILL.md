---
name: wiki-sync/adapters/url-adapter
description: |
  URL source adapter for wiki-sync. Fetches HTML via HTTP GET, extracts main
  content via readability (Mozilla Readability port), converts HTML→Markdown.
  source_kind=`article`, entity_type=`article`, wiki target `wiki/<slug>/source.md` (v4.0 source-grouped layout).
---

# URL adapter (Sprint 1 baseline)

## When to use

- Dispatched by `wiki-sync/ingest` when path starts with `http://` or `https://`
- source_kind: `article`
- entity_type: `article`
- wiki target: `wiki/<slug>/source.md` (v4.0 source-grouped layout; derived entities extracted by `distill` land at `wiki/<slug>/concepts/`, `wiki/<slug>/observations/`, etc.)

## Inputs

- `path` — URL (http/https)

## Process

### Step 1 — Validate URL

- URL parseable? Else bail.
- Scheme http/https? Else bail.
- Host not in blocklist (e.g., `localhost`, `127.0.0.1`, `169.254.169.254` (AWS metadata SSRF)).

### Step 2 — Fetch HTML

```bash
curl -sL -A "ritsu-wiki-sync/1.0" -H "Accept: text/html" --max-time 30 "$url" -o /tmp/raw.html
```

Capture:
- HTTP status (must be 200; redirects auto-followed)
- `ETag` header (for re-sync detection)
- `Last-Modified` header (fallback for re-sync)
- Final URL after redirects

### Step 3 — Compute source_hash

```bash
# Prefer ETag if present, else body hash
if [[ -n "$etag" ]]; then
  echo "etag:$etag"
else
  sha256sum /tmp/raw.html | cut -d' ' -f1
fi
```

### Step 4 — Readability extraction

Use `@mozilla/readability` (Node package; add to mcp-server deps OR a new wiki-sync helper package). Pseudocode:

```javascript
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(html, { url });
const reader = new Readability(dom.window.document);
const article = reader.parse();
// { title, content (HTML), textContent, length, excerpt, byline, siteName, publishedTime }
```

### Step 5 — HTML→Markdown

Use `turndown` Node package (or similar):

```javascript
import TurndownService from 'turndown';
const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
const markdown = td.turndown(article.content);
```

### Step 6 — Slug + attribution

- Slug: from article title → kebab-case, lowercase, strip punctuation, 50-char cap.
  Fallback: from URL path tail.
- Attribution: { author: article.byline, publication: article.siteName, published_at: article.publishedTime, url }

## Outputs

```jsonc
{
  "raw_text": "<extracted markdown>",
  "source_ref": "<final url after redirects>",
  "source_hash": "etag:abc | sha256:def",
  "attribution": {
    "author": "...",
    "publication": "...",
    "published_at": "...",
    "url": "...",
    "site_name": "...",
    "format_metadata": "HTML, X words"
  },
  "pages_or_size_metric": <markdown char count>,
  "suggested_slug": "nyt-2026-edtech-trends",
  "suggested_entity_type": "article",
  "ocr_needed": false
}
```

## Failure modes

| Symptom | Response |
|---|---|
| URL unreachable / DNS fail | Bail with curl exit code |
| Non-2xx HTTP status | Bail with status; suggest manual save → markdown adapter |
| Readability finds no main content | Bail; suggest manual extraction |
| Content < 200 chars after extraction | Warn; flag low_quality |
| URL blocked (SSRF host) | Bail with explicit security rejection |

## Security

- Block private/loopback hosts (SSRF defense)
- Time out at 30s
- Cap response size at 10 MB (drop oversized fetches)
- Strip `<script>` tags before readability (readability does this too, defense-in-depth)

## Cost estimate

- HTTP fetch: FREE
- Readability + turndown: FREE (local)
- Embedding (downstream): ~$0.001-$0.005 / article
- LLM-fallback (downstream, if triggered): ~$0.05 / chunk

Total per article typically: $0.05-$0.10.

## Sprint scope

Sprint 1: single-URL fetch + readability + turndown.
Sprint 2: multi-page article handling (paginated/infinite-scroll).
Sprint 4+: active subscriptions (Bài #18) — auto-poll feeds.

## Related

- Parent: `06-ai-ops/skills/wiki-sync/ingest/SKILL.md`
- Tier 1 config: `knowledge/ingestion-sources.yaml` entry `article`
