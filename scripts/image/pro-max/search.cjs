// ============================================================================
// scripts/image/pro-max/search.cjs — thin client for the gpt-image-2-pro-max corpus
// ============================================================================
// Capability `image-platform` v0.4 (/cla extend: --use=pro-max). A Node re-implementation
// of the vendored upstream `search.py`
// (vendor/gpt-image-2-pro-max/upstream/skills/gpt-image-2-pro-max/scripts/search.py, MIT),
// so the /image pipeline has NO Python runtime dependency. Same hosted backend, same query
// contract. The corpus + BM25 search run on the hosted backend (free, key-less,
// rate-limited per IP) — this only assembles the query + renders results.
//
//   GET {PROMPTS_API}/search?q=<query>&n=<n>[&shape=<s>][&has_image=1]
//   GET {PROMPTS_API}/vocab/<facet>
//
// Attribution (upstream license): each record carries its original author (@handle) +
// tweet_url; the media-designer methodology makes citing them MANDATORY. --json emits the
// raw records (incl. author + twitter_link) so the in-session pro-max enhance can record
// + surface attribution. Governance: register the backend in knowledge/external-sources.yaml;
// send ONLY non-sensitive creative briefs (never PII/secrets).
//
// CLI:
//   node scripts/image/pro-max/search.cjs "<query>" [--shape <s>] [--has-image] [-n 5] [--json] [--full]
//   node scripts/image/pro-max/search.cjs --list <facet|facets>
// Exit non-zero on unreachable backend / rejected query (caller falls back to generic enhance).
// ============================================================================

'use strict';

const DEFAULT_API = 'https://gpt-image-2-prompts.goclawoffice.com';
const PROMPTS_API = (process.env.PROMPTS_API || DEFAULT_API).replace(/\/+$/, '');
const TIMEOUT_MS = 15000;

const FACETS = ['subjects', 'styles', 'lighting', 'cameras', 'moods', 'palettes', 'compositions', 'mediums', 'techniques', 'usecases'];
const SHAPES = ['portrait', 'poster', 'ui', 'character', 'comparison', 'ecommerce', 'ad', 'thumbnail', 'infographic', 'comic'];
const TOKEN_RE = /[A-Za-z0-9]+/g;

class ProMaxSearchError extends Error {
  constructor(message, kind) { super(message); this.name = 'ProMaxSearchError'; this.kind = kind || 'error'; }
}

/** Lowercased alphanumeric tokens (mirrors search.py tokenize). */
function tokenize(text) {
  return String(text || '').toLowerCase().match(TOKEN_RE) || [];
}

/** Client-side guard: the backend rejects queries with < 3 unique ≥2-char tokens. */
function uniqueTokens(query) {
  return [...new Set(tokenize(query).filter((t) => t.length >= 2))];
}

async function httpGetJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'gpt-image-2-pro-max-cli/1.0 (ritsu-works)', Accept: 'application/json' },
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new ProMaxSearchError(`backend unreachable: ${PROMPTS_API} (${e.name === 'AbortError' ? 'timeout' : e.message})`, 'unreachable');
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 300);
    try { detail = JSON.parse(text).error || detail; } catch (_e) { /* raw */ }
    throw new ProMaxSearchError(`backend rejected (${res.status}): ${detail}`, res.status === 429 ? 'rate_limited' : 'rejected');
  }
  try { return JSON.parse(text); } catch (_e) {
    throw new ProMaxSearchError(`backend returned non-JSON: ${text.slice(0, 120)}`, 'bad_response');
  }
}

/**
 * Search the corpus. Returns { count, results[] } (results carry author + twitter_link).
 * @param {string} query  free-text + facet-slug tokens (≥3 unique ≥2-char tokens).
 * @param {{shape?:string, hasImage?:boolean, limit?:number}} [opts]
 */
async function search(query, opts = {}) {
  const toks = uniqueTokens(query);
  if (toks.length < 3) {
    throw new ProMaxSearchError(`query too short — need ≥3 descriptive words, got [${toks.join(', ')}]`, 'too_short');
  }
  const qs = new URLSearchParams({ q: query, n: String(opts.limit || 5) });
  if (opts.shape) qs.set('shape', opts.shape);
  if (opts.hasImage) qs.set('has_image', '1');
  const data = await httpGetJson(`${PROMPTS_API}/search?${qs.toString()}`);
  return { count: data.count || (data.results || []).length, results: data.results || [] };
}

/** List a facet's controlled vocabulary (or the facet names). */
async function listFacet(what) {
  if (what === 'facets') return FACETS.map((f) => ({ slug: f, name: f }));
  if (!FACETS.includes(what)) throw new ProMaxSearchError(`unknown facet "${what}". Valid: ${FACETS.join(', ')}, facets`, 'bad_facet');
  const data = await httpGetJson(`${PROMPTS_API}/vocab/${what}`);
  return data.items || [];
}

/** A compact one-line attribution string for run.json / reports. */
function attribution(record) {
  if (!record) return null;
  return { id: record.id || null, title: record.title || null, author: record.author ? `@${record.author}` : null, tweet: record.twitter_link || null, shape: record.shape || null };
}

function renderResult(rank, r, full) {
  const tags = Object.entries(r.tags || {}).filter(([, v]) => v && v.length).map(([f, v]) => `${f}=${v.join(',')}`).join(' | ') || '(no tags)';
  let pt = r.prompt_text || '(no prompt body)';
  if (!full && pt.length > 400) pt = `${pt.slice(0, 400)}...`;
  return [
    `#${rank}  bm25=${Number(r.bm25 || 0).toFixed(2)}  shape=${r.shape}`,
    `  id    : ${r.id}`,
    `  title : ${r.title}`,
    `  author: @${r.author}`,
    `  tweet : ${r.twitter_link || '(none)'}`,
    `  tags  : ${tags}`,
    '  prompt:',
    ...pt.split('\n').map((l) => `    ${l}`),
  ].join('\n');
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const o = { query: '', shape: null, hasImage: false, limit: 5, json: false, full: false, list: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--shape') o.shape = argv[++i];
    else if (a === '--has-image') o.hasImage = true;
    else if (a === '-n' || a === '--limit') o.limit = Number(argv[++i]) || 5;
    else if (a === '--json') o.json = true;
    else if (a === '--full') o.full = true;
    else if (a === '--list') o.list = argv[++i];
    else if (!a.startsWith('-')) o.query = o.query ? `${o.query} ${a}` : a;
  }
  return o;
}

async function main(argv) {
  const o = parseArgs(argv);
  if (o.shape && !SHAPES.includes(o.shape)) process.stderr.write(`[warn] --shape "${o.shape}" not in ${SHAPES.join('|')} — passing through\n`);
  if (o.list) {
    const items = await listFacet(o.list);
    if (o.json) { process.stdout.write(`${JSON.stringify(items, null, 2)}\n`); return; }
    for (const it of items) process.stdout.write(`${(it.slug || '').padEnd(24)} ${it.name || ''}${it.description ? ` — ${it.description}` : ''}\n`);
    return;
  }
  const { count, results } = await search(o.query, { shape: o.shape, hasImage: o.hasImage, limit: o.limit });
  if (o.json) {
    process.stdout.write(`${JSON.stringify({ count, query: o.query, endpoint: PROMPTS_API, results }, null, 2)}\n`);
    return;
  }
  if (!results.length) { process.stdout.write('no records match\n'); return; }
  results.forEach((r, i) => process.stdout.write(`${renderResult(i + 1, r, o.full || i === 0)}\n\n`));
  process.stdout.write(`(${count} matched, showing ${results.length}; top-1 full)\n`);
}

module.exports = { search, listFacet, attribution, uniqueTokens, tokenize, parseArgs, ProMaxSearchError, PROMPTS_API, FACETS, SHAPES };

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`${e.message || e}\n`);
    process.exit(e instanceof ProMaxSearchError && e.kind === 'too_short' ? 2 : 1);
  });
}
