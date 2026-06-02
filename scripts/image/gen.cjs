// ============================================================================
// scripts/image/gen.cjs — image-platform thin generation orchestrator
// ============================================================================
// Capability `image-platform` v0.1 (PR-1). The ONE side-effecting entry point of
// the platform: resolves the adapter from knowledge/image-adapters.yaml, maps the
// universal params → gpt-image-2 native params, enforces the cost breaker, calls
// the OpenAI Images API, and writes PNG(s) + a typed run.json + a prompt sidecar.
//
// REUSE (decision #2 — deepask UNTOUCHED, zero file moves): this require()s the
// in-place deepask helpers —
//   image-gen.cjs : ensureOpenAiKey, extractImageBuffer, OPENAI_IMAGES_URL
//   image-cost.cjs: checkCostBudget
//   image-spec.cjs: parseSize, centeredCropBox   (geometry only; resolveImageSpec is
//                   deepask-format-coupled and is NOT reused — see params.resolveAspectRatio)
// and the pure universal layer in ./lib/params.cjs.
//
// BILLING: image generation is OUT-OF-BAND (Claude can't gen images) → legitimately
// uses OPENAI_API_KEY exactly like text-embedding-3-small. ensureOpenAiKey resolves the
// key from runtime/secrets/.env.local incl. the worktree→main-root path. Key never printed.
//
// OUTPUT (stdout, one JSON line) — the adapter contract:
//   { ok, outcome, files[], model, cost_usd, warnings[], runJson, error }
//   outcome ∈ success | dry_run | not_built | breaker_refusal | moderation_block | api_error
//
// CLI:
//   node scripts/image/gen.cjs --prompt="<text>" [--use=gpt-image-2] [--ar=16:9]
//     [--tier=standard] [--count=1] [--format=png] [--max-cost-usd=1.00]
//     [--out=<dir>] [--style=ritsu] [--art-style=swiss-international]
//     [--safety=standard] [--background=auto] [--dry-run]
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY_PATH = path.join(REPO_ROOT, 'knowledge', 'image-adapters.yaml');

const { ensureOpenAiKey, OPENAI_IMAGES_URL } = require('../deepask/image-gen.cjs');
const { checkCostBudget } = require('../deepask/image-cost.cjs');
const {
  parseImageArgs, tierToQuality, resolveAspectRatio, estimateFlexibleCost, computeWarnings,
} = require('./lib/params.cjs');

// ── registry ────────────────────────────────────────────────────────────────
/** Load + parse knowledge/image-adapters.yaml. Throws a clear error if absent/malformed. */
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    throw new Error('knowledge/image-adapters.yaml missing (capability image-platform)');
  }
  const doc = yaml.load(fs.readFileSync(REGISTRY_PATH, 'utf-8')) || {};
  const adapters = Array.isArray(doc.adapters) ? doc.adapters : [];
  return adapters;
}

/**
 * Resolve --use against the registry, applying preset_of/preset_flags.
 * @returns {{ entry, target, presetFlags } | { error }}
 */
function resolveAdapter(adapters, useId) {
  const entry = adapters.find((a) => a && a.id === useId);
  if (!entry) {
    return { error: `unknown adapter "${useId}" — not in knowledge/image-adapters.yaml` };
  }
  if (entry.preset_of) {
    const target = adapters.find((a) => a && a.id === entry.preset_of);
    if (!target) return { error: `preset "${useId}" points at missing adapter "${entry.preset_of}"` };
    return { entry, target, presetFlags: entry.preset_flags || {} };
  }
  return { entry, target: entry, presetFlags: {} };
}

// ── helpers ───────────────────────────────────────────────────────────────
function isoDate(d) { return d.toISOString().slice(0, 10); }

function slugify(s) {
  return String(s || 'image').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 6).join('-').slice(0, 40) || 'image';
}

/** Decode every image in an OpenAI Images response → Buffer[]. (extractImageBuffer is data[0]-only.) */
async function extractAllBuffers(apiJson) {
  const data = apiJson && Array.isArray(apiJson.data) ? apiJson.data : [];
  if (!data.length) throw new Error('OpenAI response had no data[]');
  const out = [];
  for (const item of data) {
    if (item.b64_json) { out.push(Buffer.from(item.b64_json, 'base64')); continue; }
    if (item.url) {
      const r = await fetch(item.url);
      if (!r.ok) throw new Error(`fetching returned image url failed ${r.status}`);
      out.push(Buffer.from(await r.arrayBuffer()));
      continue;
    }
    throw new Error('OpenAI response item had neither b64_json nor url');
  }
  return out;
}

/** Build the (richer-than-deepask) gpt-image-2 payload. Default png run == the proven baseline. */
function buildPayload({ prompt, size, quality, n, options, provided }) {
  const payload = { model: options.model || 'gpt-image-2', prompt, size, quality, n };
  if (options.format && options.format !== 'png') payload.output_format = options.format; // jpeg|webp
  if (provided.has('safety')) payload.moderation = options.safety === 'relaxed' ? 'low' : 'auto';
  if (provided.has('background') && options.background !== 'auto') payload.background = options.background;
  return payload;
}

/** Classify an OpenAI error string → typed outcome. */
function classifyError(msg) {
  return /moderation|content[_ ]?policy|safety|rejected|blocked/i.test(msg) ? 'moderation_block' : 'api_error';
}

async function callOpenAi(payload) {
  const res = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 400);
    try { detail = JSON.stringify(JSON.parse(text).error || JSON.parse(text)).slice(0, 400); } catch (_e) { /* raw */ }
    const err = new Error(`OpenAI Images API ${res.status}: ${detail}`);
    err.outcome = classifyError(detail);
    throw err;
  }
  return JSON.parse(text);
}

function writeRunJson(outDir, run) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'run.json'), `${JSON.stringify(run, null, 2)}\n`, 'utf-8');
}

// ── main ────────────────────────────────────────────────────────────────────
async function run(argv) {
  const { options, provided } = parseImageArgs(argv);
  if (options['prompt-file'] && !options.prompt) {
    options.prompt = fs.readFileSync(options['prompt-file'], 'utf-8');
  }

  let adapters;
  try { adapters = loadRegistry(); } catch (e) { return { ok: false, outcome: 'api_error', error: String(e.message || e) }; }

  const resolved = resolveAdapter(adapters, options.use);
  if (resolved.error) return { ok: false, outcome: 'api_error', error: resolved.error };
  const { target, presetFlags } = resolved;
  // Apply preset flags only where the user did NOT explicitly override.
  for (const [k, v] of Object.entries(presetFlags)) if (!provided.has(k)) { options[k] = v; provided.add(k); }

  // registered-not-built stub → clean not_built error citing the registry (acceptance #5).
  if (target.status === 'registered-not-built') {
    return {
      ok: false, outcome: 'not_built', model: target.id,
      error: `adapter "${target.id}" is registered-not-built (see knowledge/image-adapters.yaml). v0.1 builds gpt-image-2 only.`,
    };
  }
  // v0.1: only gpt-image-2 (and its preset) has a real generator.
  if (target.id !== 'gpt-image-2') {
    return { ok: false, outcome: 'not_built', model: target.id, error: `no generator wired for "${target.id}" in v0.1 (gpt-image-2 only).` };
  }

  if (typeof options.prompt !== 'string' || options.prompt.trim() === '') {
    return { ok: false, outcome: 'api_error', error: 'a prompt is required (positional text, --prompt=, or --prompt-file=)' };
  }

  // size (R2) + quality + cost (R3).
  const spec = resolveAspectRatio(options.ar, options.tier);
  const quality = tierToQuality(options.tier);
  let n = Number(options.count) || 1;
  const warnings = computeWarnings(target, provided).concat(spec.warnings);
  if (!Number.isInteger(n) || n < 1) { warnings.push(`--count ${options.count} invalid → 1`); n = 1; }
  if (n > 10) { warnings.push(`--count ${n} exceeds gpt-image-2 max 10 → clamped to 10`); n = 10; }

  const per = estimateFlexibleCost({ width: spec.width, height: spec.height, quality });
  const totalCost = Math.round(per.usd * n * 1e4) / 1e4;
  const maxCost = Number(options['max-cost-usd']) || 1.0;

  const outDir = path.resolve(options.out || path.join(REPO_ROOT, '.archives', 'image', `${isoDate(new Date())}-${slugify(options.prompt)}`));
  const baseRun = {
    ts: new Date().toISOString(), command: '/image', adapter: target.id, model: options.model || 'gpt-image-2',
    prompt_input: options.prompt, prompt_enhanced: options.prompt_enhanced || null, prompt_sent: options.prompt,
    ar: spec.requestedRatio, tier: options.tier, size: spec.size, size_clamped: spec.clamped,
    count: n, format: options.format, style: options.style || null, art_style: options['art-style'] || null,
    enhance: Boolean(options.enhance), dry_run: Boolean(options['dry-run']),
    cost_usd: totalCost, is_estimate: true, breaker_tripped: false, max_cost_usd: maxCost,
    warnings, error: null, files: [],
  };

  // cost breaker — refuse BEFORE any API call (acceptance #7).
  const breaker = checkCostBudget({ estimatedUsd: totalCost, maxCostUsd: maxCost });
  if (!breaker.ok) {
    const runJson = { ...baseRun, outcome: 'breaker_refusal', breaker_tripped: true };
    writeRunJson(outDir, runJson);
    return { ok: false, outcome: 'breaker_refusal', model: runJson.model, cost_usd: totalCost, warnings, error: `estimated $${totalCost} exceeds --max-cost-usd $${maxCost}`, runJson: path.join(outDir, 'run.json') };
  }

  // dry-run — composed prompt sidecar + run.json, NO API call, NO key needed (acceptance #4).
  if (options['dry-run']) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, '01.png.prompt.txt'), options.prompt, 'utf-8');
    const runJson = { ...baseRun, outcome: 'dry_run' };
    writeRunJson(outDir, runJson);
    return { ok: true, outcome: 'dry_run', files: [], model: runJson.model, cost_usd: totalCost, warnings, runJson: path.join(outDir, 'run.json') };
  }

  if (!ensureOpenAiKey()) {
    const runJson = { ...baseRun, outcome: 'api_error', error: 'OPENAI_API_KEY not set/found in runtime/secrets/.env.local' };
    writeRunJson(outDir, runJson);
    return { ok: false, outcome: 'api_error', model: runJson.model, warnings, error: runJson.error, runJson: path.join(outDir, 'run.json') };
  }

  const payload = buildPayload({ prompt: options.prompt, size: spec.size, quality, n, options, provided });
  try {
    const apiJson = await callOpenAi(payload);
    const buffers = await extractAllBuffers(apiJson);
    fs.mkdirSync(outDir, { recursive: true });
    const ext = options.format === 'jpeg' ? 'jpg' : options.format;
    const files = buffers.map((buf, i) => {
      const fp = path.join(outDir, `${String(i + 1).padStart(2, '0')}.${ext}`);
      fs.writeFileSync(fp, buf);
      return fp;
    });
    const runJson = { ...baseRun, outcome: 'success', files };
    writeRunJson(outDir, runJson);
    return { ok: true, outcome: 'success', files, model: runJson.model, cost_usd: totalCost, warnings, runJson: path.join(outDir, 'run.json') };
  } catch (e) {
    const outcome = e.outcome || 'api_error';
    const runJson = { ...baseRun, outcome, error: String(e.message || e) };
    writeRunJson(outDir, runJson);
    return { ok: false, outcome, model: runJson.model, cost_usd: totalCost, warnings, error: runJson.error, runJson: path.join(outDir, 'run.json') };
  }
}

module.exports = {
  run, loadRegistry, resolveAdapter, buildPayload, classifyError, extractAllBuffers, slugify, REGISTRY_PATH,
};

if (require.main === module) {
  run(process.argv.slice(2))
    .then((r) => { console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1); })
    .catch((e) => { console.log(JSON.stringify({ ok: false, outcome: 'api_error', error: String(e.message || e) })); process.exit(1); });
}
