// ============================================================================
// scripts/voice/run.cjs — voice-platform single-input pipeline (deterministic)
// ============================================================================
// Capability `voice-platform` v0.1. ONE input (inline text or a file) → ONE
// stitched audio file. Chunks the (already-preprocessed) script under the engine
// input cap, calls gen.cjs per chunk with a shared style block + voice (so the
// whole input narrates in one consistent voice), then stitches the parts. This is
// the DETERMINISTIC engine the command uses for small/single inputs and that the
// tests + live-verify drive; the parallel Workflow path (large inputs / folders)
// reuses the same gen.cjs + stitch primitives.
//
// A total-cost breaker refuses BEFORE any spend when the summed estimate exceeds
// --max-cost-usd. --dry-run writes the per-chunk script + instruction sidecars and
// the plan, with NO API call.
//
// OUTPUT (stdout, one JSON line):
//   { ok, outcome, file, chunks, cost_usd, model, voice, parts[], warnings[], runJson, error }
//
// CLI:
//   node scripts/voice/run.cjs --use=gemini-tts-3.1-flash
//     --file=<path>|--text="..."|--text-file=<path>
//     [--instructions-file=<path>] [--type=podcast] [--pace=normal]
//     [--voice=Kore|--gender=female] [--format=mp3] [--model=<override>]
//     [--chunk-chars=1800] [--concurrency=4] [--out=<dir>] [--name=<slug>]
//     [--max-cost-usd=1.00] [--dry-run]
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const { REPO_ROOT } = require('./lib/env.cjs');
const params = require('./lib/params.cjs');
const { chunkText } = require('./lib/chunk.cjs');
const { estimateCost } = require('./lib/cost.cjs');
const { stitchAudio } = require('./lib/audio.cjs');
const genMod = require('./gen.cjs');

const OPENAI_INPUT_CAP = 3800; // gpt-4o-mini-tts hard cap 4096 chars — stay safely under.
const GEMINI_INPUT_CAP = 6000; // conservative across 2.5 (32k tok) + 3.1 (8k tok) per chunk.

function parseArgs(argv) {
  const { options } = params.parseVoiceArgs(argv);
  for (const raw of Array.isArray(argv) ? argv : []) {
    if (typeof raw !== 'string' || !raw.startsWith('--')) continue;
    const eq = raw.indexOf('=');
    const key = raw.slice(2, eq === -1 ? undefined : eq);
    const val = eq === -1 ? true : raw.slice(eq + 1);
    if (['text-file', 'instructions-file', 'out', 'name'].includes(key)) options[key] = val;
  }
  return options;
}

function resolveText(options) {
  const spec = params.resolveInputSpec(options);
  if (spec.mode === 'folder') return { error: 'run.cjs handles ONE input — pass a file or text, not a folder (folder mode is orchestrated per-file by /voice)' };
  if (spec.mode === 'file') {
    const abs = path.resolve(spec.value);
    if (!fs.existsSync(abs)) return { error: `input file not found: ${spec.value}` };
    return { text: fs.readFileSync(abs, 'utf-8'), source: spec.value };
  }
  if (typeof options['text-file'] === 'string') {
    const abs = path.resolve(options['text-file']);
    if (!fs.existsSync(abs)) return { error: `--text-file not found: ${options['text-file']}` };
    return { text: fs.readFileSync(abs, 'utf-8'), source: options['text-file'] };
  }
  return { text: spec.value || '', source: 'inline' };
}

function readInstructions(options, type, pace) {
  if (typeof options['instructions-file'] === 'string') {
    const abs = path.resolve(options['instructions-file']);
    if (fs.existsSync(abs)) return fs.readFileSync(abs, 'utf-8').trim();
  }
  if (typeof options.instructions === 'string' && options.instructions.trim()) return options.instructions.trim();
  return params.buildFallbackInstructions(type, pace);
}

/** Run async thunks with a bounded concurrency pool, preserving result order. */
async function pool(items, size, worker) {
  const results = new Array(items.length);
  let next = 0;
  const lanes = new Array(Math.max(1, Math.min(size, items.length))).fill(0).map(async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(lanes);
  return results;
}

async function run(argv) {
  const options = parseArgs(argv);
  const type = params.normalizeType(options.type);
  const pace = params.normalizePace(options.pace);
  const format = params.normalizeFormat(options.format);

  const adapterId = options.use || params.DEFAULT_ADAPTER;
  let adapters;
  try { adapters = genMod.loadRegistry(); } catch (e) { return { ok: false, outcome: 'api_error', error: String(e.message || e) }; }
  const resolved = genMod.resolveAdapter(adapters, adapterId);
  if (resolved.error) return { ok: false, outcome: 'api_error', error: resolved.error };
  const { target } = resolved;
  const model = genMod.resolveModel(target, options.model);
  const { voice } = params.resolveVoice(target.id, options);

  const got = resolveText(options);
  if (got.error) return { ok: false, outcome: 'input_error', error: got.error };
  if (!got.text || !got.text.trim()) return { ok: false, outcome: 'input_error', error: 'input is empty' };

  let instructions = readInstructions(options, type, pace);
  const engineCap = target.id.startsWith('gemini') ? GEMINI_INPUT_CAP : OPENAI_INPUT_CAP;
  const cap = Math.min(Number(options['chunk-chars']) || engineCap, engineCap);
  const chunks = chunkText(got.text, cap);
  // v0.3 — multi-chunk → lock a CONSISTENCY directive into the shared voice-direction so every
  // chunk reads with one steady narrator (the model has no cross-request memory). Loudness is
  // separately equalized at stitch time (loudnorm). Both default ON for long-form.
  if (chunks.length > 1) instructions = params.withConsistency(instructions);

  const totalChars = chunks.reduce((s, c) => s + c.length, 0);
  const totalCost = Math.round(estimateCost({ chars: totalChars, model }).usd * 1e4) / 1e4;
  const maxCost = Number(options['max-cost-usd']) || params.DEFAULTS['max-cost-usd'];

  const slug = options.name ? params.slugify(options.name) : params.slugify(got.source === 'inline' ? got.text.slice(0, 50) : path.basename(got.source).replace(/\.[^.]+$/, ''));
  const runDir = path.resolve(options.out || path.join(REPO_ROOT, '.archives', 'voice', `${new Date().toISOString().slice(0, 10)}-${slug}`));
  const partsDir = path.join(runDir, 'parts');
  const outDir = path.join(runDir, 'out');
  const finalFile = path.join(outDir, `${slug}.${format}`);

  const manifest = {
    ts: new Date().toISOString(), command: '/voice', adapter: target.id, model, voice,
    type, pace, format, source: got.source, chars: totalChars, chunks: chunks.length,
    cost_usd: totalCost, max_cost_usd: maxCost, instructions, warnings: [], file: null, parts: [],
  };

  if (totalCost > maxCost) {
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, 'run.json'), `${JSON.stringify({ ...manifest, outcome: 'breaker_refusal' }, null, 2)}\n`);
    return { ok: false, outcome: 'breaker_refusal', chunks: chunks.length, cost_usd: totalCost, model, voice, error: `estimated $${totalCost} exceeds --max-cost-usd $${maxCost}`, runJson: path.join(runDir, 'run.json') };
  }

  // shared style block on disk so every chunk + the Workflow path read the same file.
  fs.mkdirSync(partsDir, { recursive: true });
  const instrFile = path.join(runDir, 'instructions.txt');
  fs.writeFileSync(instrFile, instructions, 'utf-8');

  const concurrency = Math.max(1, Math.min(Number(options.concurrency) || params.DEFAULTS.concurrency, 8));
  const baseArgs = [
    `--use=${target.id}`, `--type=${type}`, `--pace=${pace}`, `--voice=${voice}`,
    `--format=${format}`, `--model=${model}`, `--instructions-file=${instrFile}`,
    `--out=${partsDir}`, `--max-cost-usd=${maxCost}`,
  ];
  if (options['dry-run']) baseArgs.push('--dry-run');

  // Per-chunk retry — long-form reliability. The preview TTS models occasionally return an
  // empty/transient error or stall (now bounded by gen.cjs's fetch timeout); without retry a
  // single bad chunk would abort the whole render. Retry up to maxRetries with linear backoff.
  const maxRetries = Number.isFinite(Number(options['max-retries'])) ? Number(options['max-retries']) : 4;
  const results = await pool(chunks, concurrency, async (chunk, i) => {
    const name = String(i + 1).padStart(4, '0');
    const args = [...baseArgs, `--name=${name}`, `--text=${chunk}`];
    let r;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      r = await genMod.run(args);
      if (r && r.ok) return r;
      if (r && (r.outcome === 'not_built' || r.outcome === 'input_error' || r.outcome === 'breaker_refusal')) return r; // not transient
      if (attempt < maxRetries) await new Promise((res) => setTimeout(res, 4000 + attempt * 2000));
    }
    return r;
  });

  const failed = results.filter((r) => !r || !r.ok);
  const warnings = results.flatMap((r) => (r && r.warnings) || []);
  manifest.warnings = [...new Set(warnings)];

  if (failed.length) {
    fs.writeFileSync(path.join(runDir, 'run.json'), `${JSON.stringify({ ...manifest, outcome: 'api_error', failed: failed.length }, null, 2)}\n`);
    return { ok: false, outcome: failed[0].outcome || 'api_error', chunks: chunks.length, cost_usd: totalCost, model, voice, warnings: manifest.warnings, error: `${failed.length}/${chunks.length} chunk(s) failed: ${failed[0].error || ''}`, runJson: path.join(runDir, 'run.json') };
  }

  if (options['dry-run']) {
    fs.writeFileSync(path.join(runDir, 'run.json'), `${JSON.stringify({ ...manifest, outcome: 'dry_run' }, null, 2)}\n`);
    return { ok: true, outcome: 'dry_run', file: null, chunks: chunks.length, cost_usd: totalCost, model, voice, warnings: manifest.warnings, runJson: path.join(runDir, 'run.json') };
  }

  const parts = results.map((r) => r.file).filter(Boolean);
  fs.mkdirSync(outDir, { recursive: true });
  // v0.3 — normalize each part to one loudness target before concatenating (the volume-consistency fix).
  const stitched = stitchAudio(parts, finalFile, format, {
    normalize: options.normalize !== false,
    level: options.level !== false,
    targetLufs: Number.isFinite(Number(options['target-lufs'])) ? Number(options['target-lufs']) : params.DEFAULTS['target-lufs'],
  });
  if (!stitched.ok) {
    fs.writeFileSync(path.join(runDir, 'run.json'), `${JSON.stringify({ ...manifest, outcome: 'api_error', error: stitched.error, parts }, null, 2)}\n`);
    return { ok: false, outcome: 'api_error', chunks: chunks.length, cost_usd: totalCost, model, voice, warnings: manifest.warnings, error: `stitch failed: ${stitched.error}`, runJson: path.join(runDir, 'run.json') };
  }

  manifest.file = finalFile;
  manifest.parts = parts;
  fs.writeFileSync(path.join(runDir, 'run.json'), `${JSON.stringify({ ...manifest, outcome: 'success' }, null, 2)}\n`);
  return { ok: true, outcome: 'success', file: finalFile, chunks: chunks.length, cost_usd: totalCost, model, voice, parts, warnings: manifest.warnings, runJson: path.join(runDir, 'run.json') };
}

module.exports = { run, parseArgs, resolveText, pool, OPENAI_INPUT_CAP, GEMINI_INPUT_CAP };

if (require.main === module) {
  run(process.argv.slice(2))
    .then((r) => { console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1); })
    .catch((e) => { console.log(JSON.stringify({ ok: false, outcome: 'api_error', error: String(e.message || e) })); process.exit(1); });
}
