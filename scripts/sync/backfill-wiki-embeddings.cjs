#!/usr/bin/env node
// scripts/sync/backfill-wiki-embeddings.cjs — wiki embeddings backfill (v0.2)
//
// Per Tier C decision ops.decisions[fff2bf7c-efeb-4169-b430-8139ad4d4de3]
// G3 disposition (soft-defer): when /wiki sync runs without OPENAI_API_KEY,
// pages get ops.knowledge_pages rows but no embeddings. This script scans for
// wiki pages lacking embeddings and backfills via OpenAI text-embedding-3-small.
//
// Capability: wiki-sync-from-refs (/cla fix → v4.4.1).
// SKILL: 06-ai-ops/skills/wiki-sync/embeddings-backfill/SKILL.md (Steps 1-8).
//
// v0.2 (this version) implements the real work the v0.1 stub deferred:
//   - Discovery: wiki pages with NO row in ops.knowledge_embeddings (robust;
//     supersedes the v0.1 embeddings_deferred-flag-only query — catches every
//     gap regardless of how the page was ingested).
//   - Read page body from disk → strip frontmatter → chunk (H2-structural,
//     fixed-char fallback) → embed (OpenAI text-embedding-3-small, 1536-dim)
//     → upsert ops.knowledge_embeddings (idempotent on page_id,chunk_index).
//   - Self-throttle (--cron mode only): skip if last cron tick affected 0 rows
//     within the past 6h (per SKILL Step 1 / CTO NIT 4).
//   - Zero new npm deps: OpenAI + Supabase PostgREST both via global fetch
//     (Node >= 18). Runs anywhere with .env.local sourced.
//
// NOT done here (by design — see /cla fix retrospective):
//   - ops.cost_attributions insert (needs an agent_runs run_id; the Edge cron
//     handler owns that context). Manual runs report cost to stdout only.
//   - The Edge/pg_cron handler: Supabase Edge has no repo filesystem AND
//     ops.knowledge_pages.compiled_truth is NULL for derived entities, so the
//     cron handler cannot read page bodies the way this CLI does. That handler
//     stays an honest deferred-stub pending a vehicle decision (GitHub-fetch
//     vs GitHub-Actions runner) + OPENAI_API_KEY provisioning into Edge env.
//
// Invocation:
//   node scripts/sync/backfill-wiki-embeddings.cjs                  # backfill ALL missing under wiki/
//   node scripts/sync/backfill-wiki-embeddings.cjs --dry-run        # list what WOULD be embedded
//   node scripts/sync/backfill-wiki-embeddings.cjs --max-pages=50   # cap batch size
//   node scripts/sync/backfill-wiki-embeddings.cjs --prefix=wiki/5-star/   # scope to a subtree
//   node scripts/sync/backfill-wiki-embeddings.cjs --cron --json    # cron consumer (self-throttle + JSON)
//
// Env (sourced from runtime/secrets/.env.local):
//   OPENAI_API_KEY                                  (required unless --dry-run)
//   SUPABASE_URL                                    (required)
//   SUPABASE_OPS_SERVICE_KEY || SUPABASE_SERVICE_KEY (required)
//
// Exit codes: 0 success (incl. "no work"); 1 config error; 2 runtime error.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MODEL = 'text-embedding-3-small';
const EMBED_DIM = 1536;
const MAX_CHUNK_CHARS = 6000; // ~1500 tokens, safe under the 8191-token model limit
const PRICE_PER_1M_TOKENS = 0.02;
const OPENAI_BATCH = 96; // inputs per embeddings call (model caps higher; stay conservative)
const REST_PAGE = 1000; // PostgREST default max rows per request

// ----------------------------------------------------------------------------
// Args + env
// ----------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { maxPages: Infinity, dryRun: false, json: false, cron: false, prefix: 'wiki/' };
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--json') args.json = true;
    else if (a === '--cron') args.cron = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--max-pages=')) args.maxPages = Math.max(1, parseInt(a.split('=')[1], 10) || 1);
    else if (a.startsWith('--prefix=')) args.prefix = a.split('=')[1] || 'wiki/';
    else { console.error(`unknown flag: ${a}`); process.exit(1); }
  }
  return args;
}

function readEnv() {
  return {
    openaiKey: process.env.OPENAI_API_KEY || '',
    supabaseUrl: (process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
    serviceKey: process.env.SUPABASE_OPS_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
  };
}

// ----------------------------------------------------------------------------
// Supabase PostgREST (ops schema) — zero-dep via fetch
// ----------------------------------------------------------------------------

function restHeaders(env, extra = {}) {
  return {
    apikey: env.serviceKey,
    Authorization: `Bearer ${env.serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// Paginated GET against a PostgREST table in the ops schema.
async function restSelectAll(env, table, query) {
  const rows = [];
  for (let from = 0; ; from += REST_PAGE) {
    const url = `${env.supabaseUrl}/rest/v1/${table}?${query}`;
    const res = await fetch(url, {
      headers: restHeaders(env, {
        'Accept-Profile': 'ops',
        Range: `${from}-${from + REST_PAGE - 1}`,
        'Range-Unit': 'items',
      }),
    });
    if (!res.ok) throw new Error(`select ${table} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < REST_PAGE) break;
  }
  return rows;
}

async function upsertEmbeddings(env, rows) {
  const res = await fetch(`${env.supabaseUrl}/rest/v1/knowledge_embeddings`, {
    method: 'POST',
    headers: restHeaders(env, {
      'Content-Profile': 'ops',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`upsert ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

// ----------------------------------------------------------------------------
// Discovery — wiki pages with NO embeddings yet
// ----------------------------------------------------------------------------

async function findPagesNeedingEmbeddings(env, prefix, maxPages) {
  const likePrefix = encodeURIComponent(`${prefix}*`); // PostgREST like wildcard is *
  const pages = await restSelectAll(
    env,
    'knowledge_pages',
    `select=id,slug,file_path,page_type&file_path=like.${likePrefix}&deleted_at=is.null`,
  );
  const embeddedIds = new Set(
    (await restSelectAll(env, 'knowledge_embeddings', 'select=page_id')).map((r) => r.page_id),
  );
  const todo = pages.filter((p) => !embeddedIds.has(p.id));
  return {
    candidates: pages.length,
    alreadyEmbedded: pages.length - todo.length,
    todo: maxPages === Infinity ? todo : todo.slice(0, maxPages),
    totalMissing: todo.length,
  };
}

// Self-throttle (cron mode): skip if the last tick embedded nothing in the past 6h.
async function shouldSelfThrottle(env) {
  const rows = await restSelectAll(
    env,
    'scheduled_runs',
    'select=state_payload,fired_at&schedule_id=eq.wiki-embeddings-backfill&order=fired_at.desc&limit=1',
  );
  if (!rows.length) return false;
  const last = rows[0];
  const affected = Number(last.state_payload && last.state_payload.affected_rows) || 0;
  const ageMs = Date.now() - new Date(last.fired_at).getTime();
  return affected === 0 && ageMs < 6 * 60 * 60 * 1000;
}

// ----------------------------------------------------------------------------
// Text → chunks → embeddings
// ----------------------------------------------------------------------------

function stripFrontmatter(raw) {
  let s = raw;
  if (s.startsWith('---')) {
    const end = s.indexOf('\n---', 3);
    if (end !== -1) { const nl = s.indexOf('\n', end + 1); s = nl !== -1 ? s.slice(nl + 1) : ''; }
  }
  return s.replace(/^\s*<!--[\s\S]*?-->\s*/, '').trim(); // drop leading generated-by comment
}

function chunkBody(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= MAX_CHUNK_CHARS) return [trimmed];
  const out = [];
  for (const section of trimmed.split(/\n(?=## )/)) {
    if (section.length <= MAX_CHUNK_CHARS) { out.push(section); continue; }
    let cur = '';
    for (const para of section.split(/\n\n+/)) {
      if (cur && (cur + '\n\n' + para).length > MAX_CHUNK_CHARS) { out.push(cur); cur = para; }
      else { cur = cur ? cur + '\n\n' + para : para; }
    }
    if (cur) out.push(cur);
  }
  return out.filter((c) => c.trim().length > 0);
}

async function embedBatch(env, inputs) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: inputs }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const vectors = json.data.map((d) => d.embedding);
  for (const v of vectors) {
    if (!Array.isArray(v) || v.length !== EMBED_DIM) {
      throw new Error(`OpenAI returned dim ${v && v.length}, expected ${EMBED_DIM}`);
    }
  }
  return { vectors, tokens: (json.usage && json.usage.total_tokens) || 0 };
}

function rowsForPage(page, chunks, vectors) {
  return chunks.map((c, i) => ({
    page_id: page.id,
    chunk_index: i,
    chunk_text: c,
    embedding: JSON.stringify(vectors[i]), // pgvector canonical text form '[...]'
    embedding_model: MODEL,
    token_count: Math.ceil(c.length / 4),
    chunk_hash: crypto.createHash('sha256').update(c).digest('hex'),
  }));
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

function showHelp() {
  console.error('scripts/sync/backfill-wiki-embeddings.cjs (v0.2)');
  console.error('Backfill OpenAI embeddings for wiki pages missing them.');
  console.error('Flags: --dry-run --json --cron --max-pages=N --prefix=wiki/<sub>/');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { showHelp(); process.exit(0); }

  const env = readEnv();
  if (!env.supabaseUrl || !env.serviceKey) {
    console.error('config error: SUPABASE_URL + SUPABASE_(OPS_)SERVICE_KEY required (source runtime/secrets/.env.local)');
    process.exit(1);
  }
  if (!args.dryRun && !env.openaiKey) {
    console.error('config error: OPENAI_API_KEY required for a real run (use --dry-run to preview without it)');
    process.exit(1);
  }

  const out = { script: 'backfill-wiki-embeddings', version: '0.2', invoked_at: new Date().toISOString(), mode: args.dryRun ? 'dry-run' : 'execute', prefix: args.prefix };

  if (args.cron && !args.dryRun && (await shouldSelfThrottle(env))) {
    out.self_throttled = true;
    out.reason = 'last tick affected 0 rows within 6h';
    print(args, out, () => console.error('Self-throttled (last tick: 0 rows in <6h). Skipping.'));
    process.exit(0);
  }

  const { candidates, alreadyEmbedded, todo, totalMissing } = await findPagesNeedingEmbeddings(env, args.prefix, args.maxPages);
  Object.assign(out, { candidates, already_embedded: alreadyEmbedded, missing_total: totalMissing, batch_size: todo.length });

  if (todo.length === 0) {
    out.embedded_pages = 0; out.chunks = 0; out.cost_usd = 0;
    print(args, out, () => console.error(`Nothing to do — ${candidates} pages under ${args.prefix}, all embedded.`));
    process.exit(0);
  }

  if (args.dryRun) {
    out.would_embed = todo.map((p) => p.file_path);
    print(args, out, () => {
      console.error(`DRY RUN — would embed ${todo.length}/${totalMissing} missing pages under ${args.prefix}:`);
      todo.slice(0, 30).forEach((p) => console.error(`  - ${p.file_path}`));
      if (todo.length > 30) console.error(`  ...and ${todo.length - 30} more`);
    });
    process.exit(0);
  }

  // Execute: read → chunk → embed → upsert, per page.
  const stats = { pages: 0, chunks: 0, tokens: 0, failed: [] };
  for (const page of todo) {
    try {
      const abs = path.join(REPO_ROOT, page.file_path);
      const body = stripFrontmatter(fs.readFileSync(abs, 'utf8'));
      const chunks = chunkBody(body);
      if (chunks.length === 0) { stats.failed.push({ slug: page.slug, reason: 'empty body' }); continue; }

      const vectors = [];
      let tokens = 0;
      for (let i = 0; i < chunks.length; i += OPENAI_BATCH) {
        const res = await embedBatch(env, chunks.slice(i, i + OPENAI_BATCH));
        vectors.push(...res.vectors);
        tokens += res.tokens;
      }
      await upsertEmbeddings(env, rowsForPage(page, chunks, vectors));
      stats.pages += 1; stats.chunks += chunks.length; stats.tokens += tokens;
    } catch (e) {
      stats.failed.push({ slug: page.slug, reason: String(e.message || e) });
    }
  }

  out.embedded_pages = stats.pages;
  out.chunks = stats.chunks;
  out.tokens = stats.tokens;
  out.cost_usd = Number(((stats.tokens / 1e6) * PRICE_PER_1M_TOKENS).toFixed(6));
  out.failed = stats.failed;
  print(args, out, () => {
    console.error(`Embedded ${stats.pages}/${todo.length} pages, ${stats.chunks} chunks, ${stats.tokens} tokens (~$${out.cost_usd}).`);
    if (stats.failed.length) { console.error(`Failed ${stats.failed.length}:`); stats.failed.slice(0, 20).forEach((f) => console.error(`  - ${f.slug}: ${f.reason}`)); }
  });
  process.exit(stats.failed.length && stats.pages === 0 ? 2 : 0);
}

function print(args, obj, humanFn) {
  if (args.json) console.log(JSON.stringify(obj, null, 2));
  else humanFn();
}

// Run only when invoked directly; stay importable (pure helpers) for unit tests.
if (require.main === module) {
  main().catch((e) => { console.error('FATAL:', e.message || e); process.exit(2); });
}

module.exports = {
  parseArgs,
  stripFrontmatter,
  chunkBody,
  rowsForPage,
  MAX_CHUNK_CHARS,
  MODEL,
};
