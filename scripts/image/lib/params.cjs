// ============================================================================
// scripts/image/lib/params.cjs — image-platform universal parameter layer
// ============================================================================
// Capability `image-platform` v0.1 (PR-1). PURE, deterministic helpers shared by
// scripts/image/gen.cjs and the adapter skills. No I/O, no network — so the whole
// universal-param/supports()/aspect-ratio/cost surface is unit-testable (the fetch
// is the impure edge, isolated in gen.cjs).
//
// Holds:
//   - UNIVERSAL_PARAMS  — the canonical flag vocabulary (single source of truth;
//                         the L2 validator asserts every adapter's supports[] ⊆ this).
//   - parseImageArgs    — argv → {options, provided} (provided = explicitly-set flags,
//                         so supports()/WARN only fires on flags the user actually passed).
//   - normalizeQuality  — validate the --quality value (= OpenAI quality low|medium|high; default medium).
//   - resolveAspectRatio— R2: --ar → a NATIVE gpt-image-2 flexible size (edges ×16,
//                         AR ≤ 3:1, edge < 3840), warn-on-clamp, NO post-crop in-range.
//   - estimateFlexibleCost — R3: per-quality area-interpolation over deepask COST_TABLE.
//   - computeWarnings   — supports()/WARN engine; consequence-honest, never silent-drop.
// ============================================================================

'use strict';

// Reuse the deepask cost anchor (R3) — do NOT duplicate the price table.
const { COST_TABLE, costQuality } = require('../../deepask/image-cost.cjs');

// ── Universal parameter vocabulary (the contract) ──────────────────────────
// Flag names WITHOUT the leading `--`. An adapter's supports[]/supports_stretch[]/
// unsupported_warn[] in knowledge/image-adapters.yaml must each be a subset of this.
const UNIVERSAL_PARAMS = Object.freeze([
  'prompt', 'use', 'ar', 'count', 'quality', 'resolution', 'seed', 'format',
  'ref', 'ref-style', 'ref-character', 'ref-strength', 'mask', 'negative',
  'style', 'art-style', 'enhance', 'enhance-mode', 'stylize', 'raw', 'variety', 'weird', 'tile',
  'out', 'deck', 'background', 'safety', 'model', 'max-cost-usd', 'dry-run',
]);

const QUALITIES = Object.freeze(['low', 'medium', 'high']);   // = OpenAI gpt-image-2 native quality enum (1:1, no translation layer)
const FORMATS = Object.freeze(['png', 'jpeg', 'webp']);

// --quality → target LONG edge (px). All ×16 and < 3840 (the gpt-image-2 ceiling).
// `--quality` IS the OpenAI quality knob directly (low|medium|high); it ALSO sets the size budget.
// medium 1:1 → 1024x1024 (the proven deepask baseline, cheap); high 1:1 → 2048x2048;
// high 16:9 → 2048x1152 (matches deepask img-slide). low + medium share the 1024 budget; high upsizes.
const QUALITY_TO_LONG_EDGE = Object.freeze({ low: 1024, medium: 1024, high: 2048 });

const MAX_AR = 3;            // gpt-image-2: aspect ratio ≤ 3:1.
const MAX_EDGE = 3824;       // largest multiple of 16 strictly < 3840.
const MIN_EDGE = 256;        // sane floor.
// gpt-image-2 also enforces a MINIMUM pixel budget (an area floor): a too-small
// request — e.g. 16:9 at medium quality = 1024x576 = 0.59 MP — is rejected by the
// API with "Requested resolution is below the current minimum pixel budget". The
// known-good baseline 1024x1024 (1.05 MP) passes, so we target that area. R2 lifts
// the long edge so the SHORT edge keeps area ≥ this floor (see resolveAspectRatio).
const MIN_PIXEL_BUDGET = 1024 * 1024;  // 1,048,576 px (~1 MP).

// Consequence text for semantics-changing params (§10a — warn names the consequence,
// not just "ignored"). Absent here ⇒ a plain "not supported" warning.
const CONSEQUENCE = Object.freeze({
  seed: 'output is NOT reproducible (gpt-image-2 has no seed)',
  negative: 'no native negative prompt; emulate "without X" in the prompt instead',
  'ref-character': 'identity/character reference not honored by this backend',
  'ref-style': 'style-reference image not honored by this backend',
  'ref-strength': 'reference-strength has no effect on this backend',
  background: 'transparent/opaque background control is not supported on gpt-image-2',
  stylize: 'Midjourney-only knob; ignored',
  variety: 'Midjourney-only (chaos) knob; ignored',
  weird: 'Midjourney-only knob; ignored',
  tile: 'seamless-tiling is Midjourney-only; ignored',
  raw: 'raw mode is Midjourney/Flux-only; ignored',
  resolution: 'explicit resolution override not honored; size derives from --ar × --quality',
});

const DEFAULTS = Object.freeze({
  use: 'gpt-image-2', ar: '1:1', count: 1, quality: 'medium', format: 'png',
  'ref-strength': 0.5, stylize: 40, variety: 0, weird: 0, 'max-cost-usd': 1.0,
  safety: 'standard', background: 'auto', enhance: false, raw: false, tile: false,
  'dry-run': false,
});

const BOOL_FLAGS = Object.freeze(['enhance', 'raw', 'tile', 'dry-run', 'deck']);
const NUM_FLAGS = Object.freeze(['count', 'seed', 'ref-strength', 'stylize', 'variety', 'weird', 'max-cost-usd']);

/**
 * Parse `/image` argv into options + the set of explicitly-provided flags.
 * Positional (non --) tokens join into the prompt. Pure.
 * @returns {{ options: object, provided: Set<string> }}
 */
function parseImageArgs(argv) {
  const options = { ...DEFAULTS };
  const provided = new Set();
  const positional = [];
  for (const raw of argv) {
    if (typeof raw !== 'string') continue;
    if (!raw.startsWith('--')) { positional.push(raw); continue; }
    const body = raw.slice(2);
    const eq = body.indexOf('=');
    const key = eq === -1 ? body : body.slice(0, eq);
    if (!UNIVERSAL_PARAMS.includes(key) && key !== 'prompt-file') {
      // unknown flag — record so the caller can warn; don't throw (forward-compat).
      provided.add(key);
      options[key] = eq === -1 ? true : body.slice(eq + 1);
      continue;
    }
    provided.add(key);
    if (BOOL_FLAGS.includes(key)) {
      options[key] = eq === -1 ? true : !/^(false|0|no)$/i.test(body.slice(eq + 1));
    } else {
      const val = eq === -1 ? true : body.slice(eq + 1);
      options[key] = NUM_FLAGS.includes(key) && val !== true ? Number(val) : val;
    }
  }
  if (positional.length && options.prompt === undefined) {
    options.prompt = positional.join(' ');
  }
  return { options, provided };
}

/** Validate --quality (= OpenAI quality low|medium|high). Unknown → 'medium' (never throw on a convenience flag). */
function normalizeQuality(quality) {
  return QUALITIES.includes(quality) ? quality : 'medium';
}

function round16(n) {
  const v = Math.round(n / 16) * 16;
  return Math.max(MIN_EDGE, Math.min(MAX_EDGE, v));
}

/**
 * R2 — resolve --ar to a NATIVE gpt-image-2 flexible size.
 * Edges ×16, AR clamped ≤ 3:1 (warn), edge < 3840. No post-crop for in-range ratios.
 * @param {string} ar    "W:H" (e.g. "16:9").
 * @param {string} quality  low|medium|high (sets the long-edge pixel budget).
 * @returns {{ width, height, size, requestedRatio, effectiveRatio, clamped, warnings }}
 */
function resolveAspectRatio(ar, quality) {
  const warnings = [];
  let W = 1;
  let H = 1;
  const m = /^(\d+)\s*:\s*(\d+)$/.exec(typeof ar === 'string' ? ar.trim() : '');
  if (!m) {
    warnings.push(`--ar "${ar}" is not "W:H"; defaulting to 1:1`);
  } else {
    W = Number(m[1]);
    H = Number(m[2]);
    if (W <= 0 || H <= 0) { warnings.push(`--ar "${ar}" has a non-positive edge; defaulting to 1:1`); W = 1; H = 1; }
  }
  let ratio = W / H;             // > 1 landscape, < 1 portrait, == 1 square.
  let clamped = false;
  if (ratio > MAX_AR) { ratio = MAX_AR; clamped = true; }
  else if (ratio < 1 / MAX_AR) { ratio = 1 / MAX_AR; clamped = true; }
  if (clamped) warnings.push(`--ar ${ar} exceeds gpt-image-2's 3:1 limit → clamped to ${ratio >= 1 ? '3:1' : '1:3'}`);

  // Long edge = the larger of the quality's budget and the minimum long edge that keeps
  // the SHORT edge's area ≥ MIN_PIXEL_BUDGET. For area A and long/short ratio s ≥ 1,
  // a long edge L gives area L²/s, so L ≥ √(A·s) clears the floor. High quality (long
  // edge 2048) already exceeds this for every AR ≤ 3:1, so this only lifts low/medium
  // wide ARs — and never shrinks an already-large budget.
  const qualityLongEdge = QUALITY_TO_LONG_EDGE[quality] || QUALITY_TO_LONG_EDGE.medium;
  const longOverShort = ratio >= 1 ? ratio : 1 / ratio;            // ≥ 1
  const minLongForBudget = Math.sqrt(MIN_PIXEL_BUDGET * longOverShort);
  const longEdge = Math.min(MAX_EDGE, Math.max(qualityLongEdge, minLongForBudget));
  let width;
  let height;
  if (ratio >= 1) { width = round16(longEdge); height = round16(longEdge / ratio); }
  else { height = round16(longEdge); width = round16(longEdge * ratio); }

  // ×16 rounding can nudge the area just under the floor — bump the long edge up in
  // 16-px steps until the rounded size clears MIN_PIXEL_BUDGET (bounded; ≤ MAX_EDGE).
  let guard = 0;
  while (width * height < MIN_PIXEL_BUDGET && Math.max(width, height) + 16 <= MAX_EDGE && guard < 16) {
    if (ratio >= 1) { width += 16; height = round16(width / ratio); }
    else { height += 16; width = round16(height * ratio); }
    guard += 1;
  }

  // Honest, never-silent: if we raised the size to clear the floor, say so.
  if (longEdge > qualityLongEdge + 0.5) {
    warnings.push(`--ar ${ar} at "${quality}" quality is below gpt-image-2's ~1 MP minimum → size raised to ${width}x${height} (aspect ratio preserved)`);
  }

  return {
    width,
    height,
    size: `${width}x${height}`,
    requestedRatio: `${W}:${H}`,
    effectiveRatio: Math.round((width / height) * 1000) / 1000,
    clamped,
    warnings,
  };
}

/**
 * R3 — estimate USD for an arbitrary flexible size by per-quality AREA interpolation
 * between the two nearest COST_TABLE keys (NOT a single global rate, per @cto).
 * Linearly extrapolates from the nearest rate outside the table's area range.
 * @returns {{ usd:number, isEstimate:true, quality:string }}
 */
function estimateFlexibleCost({ width, height, quality }) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new TypeError(`image-params: width/height must be positive finite, got ${width}x${height}`);
  }
  const q = costQuality(quality);              // normalizes auto→high; throws on invalid.
  const area = (width * height) / 1e6;         // megapixels.
  const points = Object.keys(COST_TABLE)
    .map((k) => { const [w, h] = k.split('x').map(Number); return { area: (w * h) / 1e6, cost: COST_TABLE[k][q] }; })
    .sort((a, b) => a.area - b.area);
  let usd;
  if (area <= points[0].area) {
    usd = area * (points[0].cost / points[0].area);                       // extrapolate down
  } else if (area >= points[points.length - 1].area) {
    const p = points[points.length - 1];
    usd = area * (p.cost / p.area);                                       // extrapolate up
  } else {
    let lo = points[0];
    let hi = points[points.length - 1];
    for (let i = 0; i < points.length - 1; i++) {
      if (area >= points[i].area && area <= points[i + 1].area) { lo = points[i]; hi = points[i + 1]; break; }
    }
    usd = lo.cost + ((hi.cost - lo.cost) * (area - lo.area)) / (hi.area - lo.area);
  }
  return { usd: Math.round(usd * 1e4) / 1e4, isEstimate: true, quality: q };
}

/**
 * supports()/WARN engine. For each EXPLICITLY-PROVIDED flag that the adapter does
 * not support (or supports only as a not-yet-built stretch), emit a consequence-honest
 * warning. Never throws, never drops silently — the image still generates.
 * @param {{supports?:string[], supports_stretch?:string[], unsupported_warn?:string[]}} caps
 * @param {Set<string>} provided  flags the user explicitly passed.
 * @returns {string[]} warnings
 */
function computeWarnings(caps, provided) {
  const supports = new Set(caps && Array.isArray(caps.supports) ? caps.supports : []);
  const stretch = new Set(caps && Array.isArray(caps.supports_stretch) ? caps.supports_stretch : []);
  // params that are operational plumbing, not generation knobs — never warn on these.
  // `prompt-file` is read into options.prompt by gen.cjs (run()), so it IS honored —
  // warning "ignored" would be false and break the never-silent-drop / consequence-honest
  // contract. It belongs with `prompt`/`out`/`model`, not the generation-knob path.
  const NEVER_WARN = new Set(['prompt', 'prompt-file', 'use', 'out', 'model', 'max-cost-usd', 'dry-run', 'quality', 'ar', 'count', 'format', 'style', 'art-style', 'enhance-mode', 'pro-max-base']);
  const warnings = [];
  for (const flag of provided) {
    if (NEVER_WARN.has(flag) || supports.has(flag)) continue;
    if (stretch.has(flag)) {
      warnings.push(`--${flag} requires the edits endpoint (not built in v0.1) → ignored for this run`);
      continue;
    }
    const why = CONSEQUENCE[flag];
    warnings.push(why ? `--${flag} ignored — ${why}` : `--${flag} is not supported by this adapter → ignored`);
  }
  return warnings;
}

module.exports = {
  UNIVERSAL_PARAMS,
  QUALITIES,
  FORMATS,
  QUALITY_TO_LONG_EDGE,
  DEFAULTS,
  MAX_AR,
  MAX_EDGE,
  MIN_PIXEL_BUDGET,
  parseImageArgs,
  normalizeQuality,
  resolveAspectRatio,
  estimateFlexibleCost,
  computeWarnings,
  round16,
};
