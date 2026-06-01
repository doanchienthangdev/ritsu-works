// ============================================================================
// scripts/deepask/image-gen.cjs — deepask gpt-image-* generation leg
// ============================================================================
// Capability `deepask` v1.1 (extend: image formats), 2026-06-01. The ONE
// side-effecting helper of the image Format Engine: takes a composed prompt +
// resolved size/quality/model and calls the OpenAI Images API, writing a PNG.
//
// BILLING: image generation is OUTSIDE Claude's subscription (Claude cannot gen
// images) — so this legitimately uses OPENAI_API_KEY, exactly like the existing
// text-embedding-3-small usage (scripts/sync/backfill-wiki-embeddings.cjs).
// Key is sourced from runtime/secrets/.env.local (auto-loaded here if not already
// in process.env). The key VALUE is never printed (per the never-leak-env rule).
//
// CLI:
//   node scripts/deepask/image-gen.cjs \
//     --prompt-file=<path>|--prompt="<text>" \
//     --size=1536x1024 --quality=medium --model=gpt-image-2 \
//     --out=<png-path> [--n=1] [--dry-run]
// Output: a single JSON line on stdout {ok,outPath,bytes,model,size,quality,dryRun}.
//
// --dry-run: writes <out>.prompt.txt (the exact prompt) + NO PNG + NO API call —
// so the founder can inspect prompts/cost without spending. Pure helpers
// (parseArgs, buildImagePayload) are unit-tested; the fetch is the impure edge.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';

/**
 * Candidate .env.local paths, in priority order. runtime/ is local-only and is
 * NOT copied into git worktrees, so when we run from `<root>/.claude/worktrees/<name>/`
 * the secrets live in the MAIN repo root — resolve both. Override via RITSU_ENV_LOCAL.
 */
function envLocalCandidates() {
  const cands = [];
  if (process.env.RITSU_ENV_LOCAL) cands.push(process.env.RITSU_ENV_LOCAL);
  cands.push(path.join(REPO_ROOT, 'runtime', 'secrets', '.env.local'));
  const marker = `${path.sep}.claude${path.sep}worktrees${path.sep}`;
  const idx = REPO_ROOT.indexOf(marker);
  if (idx !== -1) {
    const mainRoot = REPO_ROOT.slice(0, idx);
    cands.push(path.join(mainRoot, 'runtime', 'secrets', '.env.local'));
  }
  return [...new Set(cands)];
}

/** Load OPENAI_API_KEY from the first readable .env.local candidate into process.env if absent. No value is logged. */
function ensureOpenAiKey() {
  if (process.env.OPENAI_API_KEY) return true;
  for (const file of envLocalCandidates()) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      for (const line of raw.split('\n')) {
        const m = /^\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*(.*?)\s*$/.exec(line);
        if (m) {
          let v = m[1].trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          if (v) {
            process.env.OPENAI_API_KEY = v;
            return true;
          }
        }
      }
    } catch (_e) {
      /* try next candidate */
    }
  }
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Parse --k=v / --flag argv into an object. Pure. */
function parseArgs(argv) {
  const out = { dryRun: false, n: 1 };
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--prompt-file=')) out.promptFile = a.slice('--prompt-file='.length);
    else if (a.startsWith('--prompt=')) out.prompt = a.slice('--prompt='.length);
    else if (a.startsWith('--size=')) out.size = a.slice('--size='.length);
    else if (a.startsWith('--quality=')) out.quality = a.slice('--quality='.length);
    else if (a.startsWith('--model=')) out.model = a.slice('--model='.length);
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
    else if (a.startsWith('--n=')) out.n = Number(a.slice('--n='.length));
  }
  return out;
}

/** Build the OpenAI Images API request body. Pure + validated. */
function buildImagePayload({ prompt, size, quality, model, n = 1 }) {
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new TypeError('image-gen: prompt must be a non-empty string');
  }
  if (typeof size !== 'string' || !/^\d+x\d+$/.test(size)) {
    throw new TypeError(`image-gen: size must be "WxH", got ${JSON.stringify(size)}`);
  }
  const q = quality || 'medium';
  if (!['low', 'medium', 'high', 'auto'].includes(q)) {
    throw new TypeError(`image-gen: quality must be low|medium|high|auto, got ${JSON.stringify(quality)}`);
  }
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    throw new TypeError(`image-gen: n must be an integer 1..10, got ${JSON.stringify(n)}`);
  }
  return { model: model || 'gpt-image-2', prompt, size, quality: q, n };
}

async function callOpenAiImage(payload) {
  const res = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    // Surface status + a snippet of the error body (NOT the key).
    let detail = text.slice(0, 400);
    try {
      detail = JSON.stringify(JSON.parse(text).error || JSON.parse(text)).slice(0, 400);
    } catch (_e) { /* keep raw snippet */ }
    throw new Error(`OpenAI Images API ${res.status}: ${detail}`);
  }
  return JSON.parse(text);
}

/** Decode the first image (b64_json or url) from an OpenAI Images response → Buffer. */
async function extractImageBuffer(apiJson) {
  const item = apiJson && Array.isArray(apiJson.data) ? apiJson.data[0] : null;
  if (!item) throw new Error('image-gen: OpenAI response had no data[0]');
  if (item.b64_json) return Buffer.from(item.b64_json, 'base64');
  if (item.url) {
    const r = await fetch(item.url);
    if (!r.ok) throw new Error(`image-gen: fetching returned url failed ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error('image-gen: OpenAI response item had neither b64_json nor url');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prompt = args.prompt || (args.promptFile ? fs.readFileSync(args.promptFile, 'utf-8') : '');
  if (!args.out) {
    console.log(JSON.stringify({ ok: false, error: '--out=<png> is required' }));
    process.exit(1);
  }
  let payload;
  try {
    payload = buildImagePayload({ prompt, size: args.size, quality: args.quality, model: args.model, n: args.n });
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });

  if (args.dryRun) {
    fs.writeFileSync(`${args.out}.prompt.txt`, payload.prompt, 'utf-8');
    console.log(JSON.stringify({ ok: true, dryRun: true, outPath: null, promptSidecar: `${args.out}.prompt.txt`, model: payload.model, size: payload.size, quality: payload.quality }));
    return;
  }

  if (!ensureOpenAiKey()) {
    console.log(JSON.stringify({ ok: false, error: 'OPENAI_API_KEY not set and not found in runtime/secrets/.env.local. Source it first, or use --dry-run.' }));
    process.exit(1);
  }

  try {
    const apiJson = await callOpenAiImage(payload);
    const buf = await extractImageBuffer(apiJson);
    fs.writeFileSync(args.out, buf);
    console.log(JSON.stringify({ ok: true, dryRun: false, outPath: args.out, bytes: buf.length, model: payload.model, size: payload.size, quality: payload.quality }));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: String(e.message || e), model: payload.model, size: payload.size }));
    process.exit(1);
  }
}

module.exports = { parseArgs, buildImagePayload, ensureOpenAiKey, extractImageBuffer, OPENAI_IMAGES_URL };

if (require.main === module) {
  main();
}
