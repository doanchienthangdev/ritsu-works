// ============================================================================
// scripts/voice/gen.cjs — voice-platform atomic TTS generator (out-of-band)
// ============================================================================
// Capability `voice-platform` v0.1. The ONE side-effecting unit: ONE chunk of
// text → ONE audio file. Resolves the adapter from knowledge/voice-adapters.yaml,
// resolves the voice + style instructions, enforces the cost breaker, calls the
// provider TTS API (OpenAI gpt-4o-mini-tts OR the Gemini Developer API), and writes
// the audio file + a typed run sidecar.
//
// BILLING: speech synthesis is OUT-OF-BAND (Claude can't synthesize speech) → it
// legitimately uses OPENAI_API_KEY / GEMINI_API_KEY exactly like text-embedding /
// gpt-image-2. Keys are sourced from runtime/secrets/.env.local (incl. the
// worktree→main-root hop) and NEVER printed.
//
// OUTPUT (stdout, one JSON line) — the adapter contract:
//   { ok, outcome, file, model, voice, cost_usd, chars, warnings[], runJson, error }
//   outcome ∈ success | dry_run | not_built | breaker_refusal | api_error | input_error
//
// CLI:
//   node scripts/voice/gen.cjs --use=gemini-tts-3.1-flash --text="..."|--text-file=<p>
//     [--instructions="..."|--instructions-file=<p>] [--type=default] [--pace=normal]
//     [--voice=Kore|--gender=female] [--format=mp3] [--model=<override>]
//     --out=<dir> [--name=001] [--max-cost-usd=1.00] [--dry-run]
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { ensureKey, REPO_ROOT } = require('./lib/env.cjs');
const params = require('./lib/params.cjs');
const { estimateCost } = require('./lib/cost.cjs');
const { pcmToWav, convertAudio } = require('./lib/audio.cjs');

const REGISTRY_PATH = path.join(REPO_ROOT, 'knowledge', 'voice-adapters.yaml');
const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Friendly --model aliases → the real provider model id (the founder-facing
// "gemini-tts-3.1-flash" resolves to the real generativelanguage id).
const MODEL_ALIAS = Object.freeze({
  'gemini-tts-3.1-flash': 'gemini-3.1-flash-tts-preview',
  'gemini-3.1-flash': 'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash': 'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro': 'gemini-2.5-pro-preview-tts',
  whisper: 'gpt-4o-mini-tts',
});

// OpenAI response_format keywords the API emits natively (extension = key).
const OPENAI_NATIVE = new Set(['mp3', 'wav', 'flac', 'opus', 'aac', 'pcm']);

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) throw new Error('knowledge/voice-adapters.yaml missing (capability voice-platform)');
  const doc = yaml.load(fs.readFileSync(REGISTRY_PATH, 'utf-8')) || {};
  return Array.isArray(doc.adapters) ? doc.adapters : [];
}

/** Resolve --use against the registry, applying preset_of → target. */
function resolveAdapter(adapters, useId) {
  const entry = adapters.find((a) => a && a.id === useId);
  if (!entry) return { error: `unknown adapter "${useId}" — not in knowledge/voice-adapters.yaml` };
  if (entry.preset_of) {
    const target = adapters.find((a) => a && a.id === entry.preset_of);
    if (!target) return { error: `preset "${useId}" points at missing adapter "${entry.preset_of}"` };
    return { entry, target, presetFlags: entry.preset_flags || {} };
  }
  return { entry, target: entry, presetFlags: {} };
}

/** Resolve the concrete provider model id for a target adapter + optional --model override. */
function resolveModel(target, override) {
  if (typeof override === 'string' && override.trim()) {
    return MODEL_ALIAS[override.trim()] || override.trim();
  }
  return target.default_model;
}

// ── arg parsing (single-chunk subset) ───────────────────────────────────────
function parseArgs(argv) {
  const { options } = params.parseVoiceArgs(argv);
  // text-file / instructions-file are gen-only (not universal flags) — read them in.
  for (const raw of argv) {
    if (typeof raw !== 'string' || !raw.startsWith('--')) continue;
    const eq = raw.indexOf('=');
    const key = raw.slice(2, eq === -1 ? undefined : eq);
    const val = eq === -1 ? true : raw.slice(eq + 1);
    if (['text-file', 'instructions-file', 'out', 'name'].includes(key)) options[key] = val;
  }
  return options;
}

function readText(options) {
  if (typeof options['text-file'] === 'string') return fs.readFileSync(path.resolve(options['text-file']), 'utf-8');
  if (typeof options.text === 'string') return options.text;
  if (typeof options._positional === 'string') return options._positional;
  return '';
}

function readInstructions(options, type, pace) {
  if (typeof options['instructions-file'] === 'string') return fs.readFileSync(path.resolve(options['instructions-file']), 'utf-8').trim();
  if (typeof options.instructions === 'string' && options.instructions.trim()) return options.instructions.trim();
  return params.buildFallbackInstructions(type, pace);
}

/** Ensure pace is represented in the instruction block (without double-stating it). */
function withPace(instructions, pace) {
  if (params.normalizePace(pace) === 'normal') return instructions;
  if (/pac(e|ing)|tempo|speed|slow|fast|brisk|rapid/i.test(instructions)) return instructions;
  return `${instructions}\nPacing: speak ${params.paceToPhrase(pace)}.`;
}

// ── provider calls ──────────────────────────────────────────────────────────
// Network timeout (AbortController) — a stalled TTS connection must NOT hang a long-form
// render forever (a real failure mode on the preview models). Default 180s (generous for a
// big chunk's audio); override with VOICE_FETCH_TIMEOUT_MS. On timeout the caller retries.
const FETCH_TIMEOUT_MS = Number(process.env.VOICE_FETCH_TIMEOUT_MS) || 180000;
async function fetchWithTimeout(url, opts) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error(`TTS request timed out after ${FETCH_TIMEOUT_MS}ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAi({ model, voice, input, instructions, responseFormat }) {
  const res = await fetchWithTimeout(OPENAI_SPEECH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, voice, input, instructions, response_format: responseFormat }),
  });
  if (!res.ok) {
    let detail = (await res.text()).slice(0, 400);
    try { detail = JSON.stringify(JSON.parse(detail).error || detail).slice(0, 400); } catch (_e) { /* raw */ }
    throw new Error(`OpenAI speech API ${res.status}: ${detail}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function callGemini({ model, voice, text }) {
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  };
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) {
    let detail = txt.slice(0, 400);
    try { detail = JSON.stringify(JSON.parse(txt).error || txt).slice(0, 400); } catch (_e) { /* raw */ }
    throw new Error(`Gemini TTS API ${res.status}: ${detail}`);
  }
  let json;
  try { json = JSON.parse(txt); } catch (_e) { throw new Error('Gemini response was not JSON'); }
  const part = json && json.candidates && json.candidates[0] && json.candidates[0].content
    && json.candidates[0].content.parts && json.candidates[0].content.parts[0];
  const b64 = part && part.inlineData && part.inlineData.data;
  if (!b64) throw new Error('Gemini response had no inlineData audio (check model access / safety block)');
  return Buffer.from(b64, 'base64'); // raw 16-bit LE / 24kHz / mono PCM
}

// ── write helpers ────────────────────────────────────────────────────────────
/** Write OpenAI bytes to the target format (native → direct, else transcode from mp3). */
function writeOpenAiAudio(buf, outBase, format) {
  if (OPENAI_NATIVE.has(format)) {
    const fp = `${outBase}.${format}`;
    fs.writeFileSync(fp, buf);
    return { ok: true, file: fp };
  }
  const tmp = `${outBase}.mp3`; // requested mp3 → transcode to m4a/ogg
  fs.writeFileSync(tmp, buf);
  const conv = convertAudio(tmp, `${outBase}.${format}`, format);
  if (conv.ok) { try { fs.unlinkSync(tmp); } catch (_e) { /* keep */ } }
  return conv;
}

/** Write Gemini PCM to the target format (wav/pcm → direct, else transcode from wav). */
function writeGeminiAudio(pcm, outBase, format) {
  if (format === 'pcm') { const fp = `${outBase}.pcm`; fs.writeFileSync(fp, pcm); return { ok: true, file: fp }; }
  const wav = pcmToWav(pcm);
  if (format === 'wav') { const fp = `${outBase}.wav`; fs.writeFileSync(fp, wav); return { ok: true, file: fp }; }
  const tmp = `${outBase}.wav`;
  fs.writeFileSync(tmp, wav);
  const conv = convertAudio(tmp, `${outBase}.${format}`, format);
  if (conv.ok) { try { fs.unlinkSync(tmp); } catch (_e) { /* keep */ } }
  return conv;
}

function writeRunSidecar(outBase, run) {
  fs.mkdirSync(path.dirname(outBase), { recursive: true });
  const p = `${outBase}.run.json`;
  fs.writeFileSync(p, `${JSON.stringify(run, null, 2)}\n`, 'utf-8');
  return p;
}

// ── main ──────────────────────────────────────────────────────────────────────
async function run(argv) {
  const options = parseArgs(argv);
  const type = params.normalizeType(options.type);
  const pace = params.normalizePace(options.pace);
  const format = params.normalizeFormat(options.format);

  let adapters;
  try { adapters = loadRegistry(); } catch (e) { return { ok: false, outcome: 'api_error', error: String(e.message || e) }; }
  const resolved = resolveAdapter(adapters, options.use);
  if (resolved.error) return { ok: false, outcome: 'api_error', error: resolved.error };
  const { target } = resolved;

  if (target.status === 'registered-not-built') {
    return { ok: false, outcome: 'not_built', model: target.id, error: `adapter "${target.id}" is registered-not-built (see knowledge/voice-adapters.yaml).` };
  }

  const text = readText(options);
  if (!text || !text.trim()) return { ok: false, outcome: 'input_error', error: 'no input text (use --text=, --text-file=, or a positional argument)' };

  const model = resolveModel(target, options.model);
  const { voice, warnings: voiceWarn } = params.resolveVoice(target.id, options);
  const instructions = withPace(readInstructions(options, type, pace), pace);
  const warnings = params.computeWarnings(target, new Set(Object.keys(options).filter((k) => !k.startsWith('_')))).concat(voiceWarn);

  const cost = estimateCost({ chars: text.length, model });
  const maxCost = Number(options['max-cost-usd']) || params.DEFAULTS['max-cost-usd'];

  const outDir = path.resolve(options.out || path.join(REPO_ROOT, '.archives', 'voice', `${new Date().toISOString().slice(0, 10)}-${params.slugify(text.slice(0, 50))}`, 'parts'));
  const name = (options.name && String(options.name)) || '001';
  const outBase = path.join(outDir, name);

  const baseRun = {
    ts: new Date().toISOString(), command: '/voice', adapter: target.id, model, voice,
    type, pace, format, lang: options.lang || 'auto', chars: text.length,
    instructions, cost_usd: cost.usd, est_minutes: cost.minutes, is_estimate: true,
    max_cost_usd: maxCost, warnings, error: null, file: null,
  };

  // cost breaker — refuse BEFORE any API call.
  if (cost.usd > maxCost) {
    const runJson = writeRunSidecar(outBase, { ...baseRun, outcome: 'breaker_refusal' });
    return { ok: false, outcome: 'breaker_refusal', model, voice, cost_usd: cost.usd, chars: text.length, warnings, error: `estimated $${cost.usd} exceeds --max-cost-usd $${maxCost}`, runJson };
  }

  // dry-run — write the script + instructions sidecars, NO API call, NO key needed.
  if (options['dry-run']) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(`${outBase}.txt`, text, 'utf-8');
    fs.writeFileSync(`${outBase}.instructions.txt`, instructions, 'utf-8');
    const runJson = writeRunSidecar(outBase, { ...baseRun, outcome: 'dry_run' });
    return { ok: true, outcome: 'dry_run', file: null, model, voice, cost_usd: cost.usd, chars: text.length, warnings, runJson };
  }

  const isGemini = target.id.startsWith('gemini');
  const keyName = isGemini ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
  if (!ensureKey(keyName)) {
    const runJson = writeRunSidecar(outBase, { ...baseRun, outcome: 'api_error', error: `${keyName} not set/found in runtime/secrets/.env.local` });
    return { ok: false, outcome: 'api_error', model, voice, warnings, error: `${keyName} not set/found`, runJson };
  }

  try {
    fs.mkdirSync(outDir, { recursive: true });
    let written;
    if (isGemini) {
      // Gemini steering = natural-language prefix prepended to the text.
      const tag = params.paceToTag(pace);
      const prompt = `${instructions}\n\n${tag ? `${tag} ` : ''}Now read the following text aloud in exactly that voice and style:\n\n${text}`;
      const pcm = await callGemini({ model, voice, text: prompt });
      written = writeGeminiAudio(pcm, outBase, format);
    } else {
      const responseFormat = OPENAI_NATIVE.has(format) ? format : 'mp3';
      const buf = await callOpenAi({ model, voice, input: text, instructions, responseFormat });
      written = writeOpenAiAudio(buf, outBase, format);
    }
    if (!written.ok) throw new Error(written.error || 'audio write/convert failed');
    const runJson = writeRunSidecar(outBase, { ...baseRun, outcome: 'success', file: written.file });
    return { ok: true, outcome: 'success', file: written.file, model, voice, cost_usd: cost.usd, chars: text.length, warnings, runJson };
  } catch (e) {
    const runJson = writeRunSidecar(outBase, { ...baseRun, outcome: 'api_error', error: String(e.message || e) });
    return { ok: false, outcome: 'api_error', model, voice, cost_usd: cost.usd, chars: text.length, warnings, error: String(e.message || e), runJson };
  }
}

module.exports = {
  run, loadRegistry, resolveAdapter, resolveModel, parseArgs, withPace,
  callOpenAi, callGemini, writeOpenAiAudio, writeGeminiAudio, MODEL_ALIAS, OPENAI_NATIVE, REGISTRY_PATH,
};

if (require.main === module) {
  run(process.argv.slice(2))
    .then((r) => { console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1); })
    .catch((e) => { console.log(JSON.stringify({ ok: false, outcome: 'api_error', error: String(e.message || e) })); process.exit(1); });
}
