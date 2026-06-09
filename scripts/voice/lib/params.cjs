// ============================================================================
// scripts/voice/lib/params.cjs — voice-platform universal parameter layer
// ============================================================================
// Capability `voice-platform` v0.1. PURE, deterministic helpers shared by
// scripts/voice/gen.cjs, the orchestrator skill, and the L2 validator. No I/O,
// no network — the whole param/pace/voice/warn surface is unit-testable; the
// fetch + ffmpeg are the impure edges (gen.cjs / audio.cjs).
//
// Holds:
//   - UNIVERSAL_PARAMS  — the canonical flag vocabulary (single source of truth;
//                         the L2 validator asserts every adapter's supports[] ⊆ this).
//   - TYPES / PACES / FORMATS / GENDERS — the closed enums.
//   - PACE_MAP          — pace → {speed multiplier, natural-language phrase, gemini tag}.
//   - TYPE_STYLE        — the DETERMINISTIC per-type style floor (used when the
//                         in-session preprocess step didn't author richer --instructions).
//   - parseVoiceArgs    — argv → {options, provided}.
//   - resolveInputSpec  — flags/positional → {mode: text|file|folder, value}.
//   - resolveVoice      — --voice | --gender | adapter default → a concrete voice.
//   - buildFallbackInstructions — type + pace → a baseline style block (the floor).
//   - computeWarnings   — supports()/WARN engine; consequence-honest, never silent-drop.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { catalogFor, findVoice } = require('./voices.cjs');

// ── Universal parameter vocabulary (the contract) ──────────────────────────
// Flag names WITHOUT the leading `--`. An adapter's supports[]/unsupported_warn[]
// in knowledge/voice-adapters.yaml must each be a subset of this set.
const UNIVERSAL_PARAMS = Object.freeze([
  'text', 'file', 'folder', 'in', 'use', 'type', 'pace', 'voice', 'gender', 'lang',
  'format', 'instructions', 'style', 'speed', 'multi-speaker', 'markup', 'model',
  'out', 'name', 'chunk-chars', 'concurrency', 'stitch', 'max-cost-usd', 'dry-run',
  'normalize', 'target-lufs', 'max-retries', 'level', // v0.3 — long-form consistency + reliability
]);

// Content TYPE → drives the preprocessing tone. `default` when omitted.
const TYPES = Object.freeze([
  'default', 'ads', 'podcast', 'story', 'blog', 'educational', 'news',
  'narration', 'conversational', 'meditation', 'announcement',
  // v0.2 (/cla extend) — expanded register vocabulary
  'film', 'conversation', 'language-learning', 'public-speaking', 'audiobook',
  'asmr', 'sports', 'documentary', 'customer-support', 'character', 'poetry', 'comedy',
]);

// Speaking PACE → mapped to a model-steering phrase (the reliable lever; numeric
// `speed` is ignored by gpt-4o-mini-tts and absent on Gemini — see SOP-AIOPS-014).
const PACES = Object.freeze(['very-low', 'low', 'normal', 'fast', 'very-fast']);

const PACE_MAP = Object.freeze({
  'very-low': { speed: 0.7, phrase: 'very slowly and deliberately, with generous pauses', tag: '[very slow]' },
  low: { speed: 0.85, phrase: 'at a relaxed, unhurried pace', tag: '[slow]' },
  normal: { speed: 1.0, phrase: 'at a natural, conversational pace', tag: '' },
  fast: { speed: 1.2, phrase: 'briskly and with energy', tag: '[fast]' },
  'very-fast': { speed: 1.4, phrase: 'rapidly and energetically, while staying intelligible', tag: '[extremely fast]' },
});

// Output container/codec. ffmpeg converts the engine's native output to any of these.
const FORMATS = Object.freeze(['mp3', 'wav', 'opus', 'aac', 'flac', 'm4a', 'pcm', 'ogg']);

const GENDERS = Object.freeze(['male', 'female', 'neutral', 'any']);

// DETERMINISTIC per-type style floor. The in-session preprocess step authors a far
// richer, content-aware instruction block; this is the baseline used when it didn't
// (e.g. a direct headless gen.cjs call), so the engine never ships a styleless read.
const TYPE_STYLE = Object.freeze({
  default: 'a clear, natural, friendly voice',
  ads: 'an energetic, persuasive, upbeat voice that lands the benefit and the call-to-action with confidence',
  podcast: 'a warm, conversational, relaxed host voice with natural, intimate delivery',
  story: 'an expressive narrator with emotional dynamics and dramatic, well-timed pauses',
  blog: 'a clear, friendly, informative voice, like reading a well-written article aloud',
  educational: 'a patient, clear, structured teacher voice that emphasizes key terms and pauses after each concept',
  news: 'an authoritative, neutral, crisp broadcaster voice with steady cadence and precise articulation',
  narration: 'a smooth, measured documentary-narration voice',
  conversational: 'a casual, natural, friendly speaking voice, as if talking to a friend',
  meditation: 'a soft, calm, soothing voice with slow pacing and long, gentle pauses',
  announcement: 'a clear, warm, confident announcer voice',
  // v0.2 (/cla extend) — expanded registers
  film: 'a cinematic, dramatic film-voiceover voice with rich texture and gravitas, like a movie trailer or a tense film scene',
  conversation: 'a natural scripted dialogue, reading each speaker\'s lines with a distinct shift in tone, like a two-person scene',
  'language-learning': 'a slow, exceptionally clear, encouraging language-teacher voice with crisp enunciation and natural but simplified pacing for learners',
  'public-speaking': 'a projected, persuasive keynote-speaker voice with rhetorical emphasis and confident command of the room',
  audiobook: 'a warm, immersive audiobook-narrator voice that sustains one consistent character across long-form reading',
  asmr: 'a soft, breathy, intimate near-whisper voice with gentle, soothing, deliberately quiet delivery',
  sports: 'an energetic, fast, excited play-by-play sports-commentary voice that builds to the big moments',
  documentary: 'an authoritative, observational documentary-narrator voice with measured gravitas and wonder',
  'customer-support': 'a calm, professional, reassuring customer-support voice — clear, patient, and friendly',
  character: 'an animated, characterful voice-acting performance with exaggerated personality and expressive range',
  poetry: 'a lyrical, rhythmic, expressive voice that honors line breaks, meter, and the music of the words',
  comedy: 'a playful, well-timed comedic voice with a light, knowing delivery and good comedic timing',
});

const DEFAULT_ADAPTER = 'gemini-tts-3.1-flash';

const DEFAULTS = Object.freeze({
  use: DEFAULT_ADAPTER, type: 'default', pace: 'normal', gender: 'any', format: 'mp3',
  lang: 'auto', 'chunk-chars': 1800, concurrency: 4, stitch: true,
  'max-cost-usd': 1.0, 'dry-run': false,
  normalize: true, 'target-lufs': -16, 'max-retries': 4, level: true, // v0.3 — uniform loudness + per-chunk retry; v0.3.1 dynamic leveling
});

const BOOL_FLAGS = Object.freeze(['stitch', 'dry-run', 'multi-speaker', 'markup', 'normalize', 'level']);
const NUM_FLAGS = Object.freeze(['chunk-chars', 'concurrency', 'speed', 'max-cost-usd', 'target-lufs', 'max-retries']);

/**
 * Parse `/voice` argv into options + the set of explicitly-provided flags.
 * Positional (non `--`) tokens join into the input text/path. Pure.
 * @returns {{ options: object, provided: Set<string> }}
 */
function parseVoiceArgs(argv) {
  const options = { ...DEFAULTS };
  const provided = new Set();
  const positional = [];
  for (const raw of Array.isArray(argv) ? argv : []) {
    if (typeof raw !== 'string') continue;
    if (!raw.startsWith('--')) { positional.push(raw); continue; }
    const body = raw.slice(2);
    const eq = body.indexOf('=');
    const key = eq === -1 ? body : body.slice(0, eq);
    const rawVal = eq === -1 ? true : body.slice(eq + 1);
    provided.add(key);
    if (BOOL_FLAGS.includes(key)) {
      options[key] = rawVal === true ? true : !/^(false|0|no|off)$/i.test(String(rawVal));
    } else if (NUM_FLAGS.includes(key) && rawVal !== true) {
      const n = Number(rawVal);
      options[key] = Number.isFinite(n) ? n : DEFAULTS[key];
    } else {
      options[key] = rawVal;
    }
  }
  if (positional.length && options.text === undefined && options.in === undefined
      && options.file === undefined && options.folder === undefined) {
    options._positional = positional.join(' ');
  }
  return { options, provided };
}

/** Validate a value against a closed enum; fall back (never throw on a convenience flag). */
function oneOf(value, list, fallback) { return list.includes(value) ? value : fallback; }
function normalizeType(t) { return oneOf(t, TYPES, 'default'); }
function normalizePace(p) { return oneOf(p, PACES, 'normal'); }
function normalizeFormat(f) { return oneOf(f, FORMATS, 'mp3'); }

/**
 * Resolve the input source. Explicit flags win, else the positional token is
 * auto-classified: existing dir → folder, existing file → file, else inline text.
 * @returns {{ mode: 'text'|'file'|'folder', value: string }}
 */
function resolveInputSpec(options) {
  if (typeof options.folder === 'string') return { mode: 'folder', value: options.folder };
  if (typeof options.file === 'string') return { mode: 'file', value: options.file };
  if (typeof options.text === 'string') return { mode: 'text', value: options.text };
  const candidate = typeof options.in === 'string' ? options.in
    : (typeof options._positional === 'string' ? options._positional : '');
  if (candidate) {
    try {
      const st = fs.statSync(path.resolve(candidate));
      if (st.isDirectory()) return { mode: 'folder', value: candidate };
      if (st.isFile()) return { mode: 'file', value: candidate };
    } catch (_e) { /* not a path → treat as inline text */ }
  }
  return { mode: 'text', value: candidate };
}

/** pace → numeric speed multiplier (honored only by adapters that declare `speed` support). */
function paceToSpeed(pace) { return (PACE_MAP[normalizePace(pace)] || PACE_MAP.normal).speed; }
/** pace → natural-language phrase (the reliable, model-agnostic lever). */
function paceToPhrase(pace) { return (PACE_MAP[normalizePace(pace)] || PACE_MAP.normal).phrase; }
/** pace → Gemini inline audio tag ('' for normal). */
function paceToTag(pace) { return (PACE_MAP[normalizePace(pace)] || PACE_MAP.normal).tag; }

/**
 * Resolve a concrete voice for an adapter: an explicit --voice wins (validated,
 * case-insensitive → canonical name); else --gender picks the adapter's default for
 * that gender; else the adapter default. Returns {voice, warnings[]}.
 */
function resolveVoice(adapterId, options, aliasMap = {}) {
  const warnings = [];
  const cat = catalogFor(adapterId, aliasMap);
  if (!cat) return { voice: undefined, warnings: [`no voice catalog for adapter "${adapterId}"`] };

  if (typeof options.voice === 'string' && options.voice.trim()) {
    const rec = findVoice(adapterId, options.voice, aliasMap);
    if (rec) return { voice: rec.name, warnings };
    warnings.push(`--voice "${options.voice}" is not a ${adapterId} voice → using default "${cat.default}" (see /voice doc for the catalog)`);
    return { voice: cat.default, warnings };
  }
  const gender = oneOf(options.gender, GENDERS, 'any');
  if (gender !== 'any' && cat.defaultByGender && cat.defaultByGender[gender]) {
    return { voice: cat.defaultByGender[gender], warnings };
  }
  return { voice: cat.default, warnings };
}

/**
 * The DETERMINISTIC style floor: type + pace → a compact instruction block, used
 * when the caller supplied no preprocessed --instructions. Mirrors the shape of
 * the gpt-4o-mini-tts `instructions` field / the Gemini natural-language prefix.
 */
// v0.3 — the CONSISTENCY directive for long-form / multi-chunk content. A TTS request has
// no memory of previous requests, so each chunk otherwise drifts in energy/pace/tone driven
// by ITS OWN content. This locked clause forces one steady, uniform narrator across every
// chunk. Loudness ("lúc to lúc nhỏ") is fixed deterministically by loudnorm at stitch time;
// this clause fixes the things loudnorm can't: tone, pace, intonation, and character drift.
const CONSISTENCY_DIRECTIVE = 'CONSISTENCY — this is ONE continuous reading split into parts that will be joined: use EXACTLY the same single narrator, the same timbre, the same steady volume, the same pace, and the same even, measured tone for EVERY part. Do NOT dramatize, re-characterize, change accent, or vary energy based on the content of any individual passage. Read everything as one calm, uniform, professional narration — as if it were a single unbroken recording.';

/** Append the CONSISTENCY directive to a voice-direction block if it isn't already there. */
function withConsistency(instructions) {
  const ins = String(instructions || '').trim();
  if (/CONSISTENCY|nhất quán|one continuous|single narrator|một giọng/i.test(ins)) return ins;
  return ins ? `${ins}\n${CONSISTENCY_DIRECTIVE}` : CONSISTENCY_DIRECTIVE;
}

/**
 * The DETERMINISTIC style floor: type + pace → a compact instruction block. When `consistent`
 * is set (multi-chunk / long-form), the CONSISTENCY directive is appended so every chunk reads
 * with the same steady delivery.
 */
function buildFallbackInstructions(type, pace, opts = {}) {
  const style = TYPE_STYLE[normalizeType(type)] || TYPE_STYLE.default;
  const block = [
    `Voice: ${style}.`,
    `Pacing: speak ${paceToPhrase(pace)}.`,
    'Delivery: read the text below naturally, honoring its punctuation, ellipses, and paragraph breaks as pauses; keep pronunciation crisp and the emotion appropriate to the content.',
  ].join('\n');
  return opts.consistent ? withConsistency(block) : block;
}

/**
 * supports()/WARN engine. For each EXPLICITLY-PROVIDED generation flag the adapter
 * does not support, emit a consequence-honest warning. Operational plumbing flags
 * never warn. Never throws, never silently drops — audio still generates.
 * @param {{supports?:string[], unsupported_warn?:string[]}} caps
 * @param {Set<string>} provided
 * @returns {string[]}
 */
const NEVER_WARN = new Set([
  'text', 'file', 'folder', 'in', 'use', 'type', 'gender', 'out', 'name', 'model',
  'lang', 'format', 'chunk-chars', 'concurrency', 'stitch', 'max-cost-usd', 'dry-run',
  'text-file', 'instructions-file', 'prompt-file', // operational file-path plumbing read by gen/run
  'normalize', 'target-lufs', 'max-retries', 'level', // v0.3 post-gen loudness consistency + per-chunk retry (run.cjs, not the adapter)
]);
const CONSEQUENCE = Object.freeze({
  speed: 'numeric speed is ignored by this backend (gpt-4o-mini-tts/Gemini) — pace is steered through the spoken-style instruction instead',
  'multi-speaker': 'multi-speaker voice assignment is not supported by this backend → single voice used',
  markup: 'inline audio-tag markup is not honored by this backend → tags read literally or stripped',
  style: 'a separate style file is not supported → fold style into --instructions',
});
function computeWarnings(caps, provided) {
  const supports = new Set(caps && Array.isArray(caps.supports) ? caps.supports : []);
  const warnings = [];
  for (const flag of provided) {
    if (NEVER_WARN.has(flag) || supports.has(flag)) continue;
    if (!UNIVERSAL_PARAMS.includes(flag)) { warnings.push(`--${flag} is not a recognized /voice flag → ignored`); continue; }
    const why = CONSEQUENCE[flag];
    warnings.push(why ? `--${flag} ignored — ${why}` : `--${flag} is not supported by this adapter → ignored`);
  }
  return warnings;
}

/** kebab-case slug for run-dir / filenames; <= 6 words, <= 40 chars. */
function slugify(s) {
  return String(s || 'voice').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .split('-').filter(Boolean).slice(0, 6).join('-').slice(0, 40) || 'voice';
}

module.exports = {
  UNIVERSAL_PARAMS, TYPES, PACES, PACE_MAP, FORMATS, GENDERS, TYPE_STYLE, DEFAULTS, DEFAULT_ADAPTER,
  CONSISTENCY_DIRECTIVE,
  parseVoiceArgs, normalizeType, normalizePace, normalizeFormat, resolveInputSpec,
  paceToSpeed, paceToPhrase, paceToTag, resolveVoice, buildFallbackInstructions, withConsistency, computeWarnings, slugify,
};
