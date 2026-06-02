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
//   - tierToQuality     — --tier → OpenAI quality knob.
//   - resolveAspectRatio— R2: --ar → a NATIVE gpt-image-2 flexible size (edges ×16,
//                         AR ≤ 3:1, edge < 3840), warn-on-clamp, NO post-crop in-range.
//   - estimateFlexibleCost — R3: per-tier area-interpolation over deepask COST_TABLE.
//   - computeWarnings   — supports()/WARN engine; consequence-honest, never silent-drop.
// ============================================================================

'use strict';

// Reuse the deepask cost anchor (R3) — do NOT duplicate the price table.
const { COST_TABLE, costQuality } = require('../../deepask/image-cost.cjs');

// ── Universal parameter vocabulary (the contract) ──────────────────────────
// Flag names WITHOUT the leading `--`. An adapter's supports[]/supports_stretch[]/
// unsupported_warn[] in knowledge/image-adapters.yaml must each be a subset of this.
const UNIVERSAL_PARAMS = Object.freeze([
  'prompt', 'use', 'ar', 'count', 'tier', 'resolution', 'seed', 'format',
  'ref', 'ref-style', 'ref-character', 'ref-strength', 'mask', 'negative',
  'style', 'art-style', 'enhance', 'stylize', 'raw', 'variety', 'weird', 'tile',
  'out', 'deck', 'background', 'safety', 'model', 'max-cost-usd', 'dry-run',
]);

const TIERS = Object.freeze(['draft', 'standard', 'high']);
const FORMATS = Object.freeze(['png', 'jpeg', 'webp']);

// --tier → OpenAI `quality` knob (image-gen.cjs accepts low|medium|high|auto).
const TIER_TO_QUALITY = Object.freeze({ draft: 'low', standard: 'medium', high: 'high' });
// --tier → target LONG edge (px). All ×16 and < 3840 (the gpt-image-2 ceiling).
// Quality is the primary tier lever (low/medium/high); `high` additionally upsizes.
// standard 1:1 → 1024x1024 (matches the proven deepask baseline + brief "1K tier", cheap);
// high 1:1 → 2048x2048; high 16:9 → 2048x1152 (matches deepask img-slide). draft = standard size, low quality.
const TIER_TO_LONG_EDGE = Object.freeze({ draft: 1024, standard: 1024, high: 2048 });

const MAX_AR = 3;            // gpt-image-2: aspect ratio ≤ 3:1.
const MAX_EDGE = 3824;       // largest multiple of 16 strictly < 3840.
const MIN_EDGE = 256;        // sane floor.

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
  resolution: 'explicit resolution override not honored; size derives from --ar × --tier',
});

const DEFAULTS = Object.freeze({
  use: 'gpt-image-2', ar: '1:1', count: 1, tier: 'standard', format: 'png',
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

/** --tier → OpenAI quality. Unknown tier → 'medium' (never throw on a convenience flag). */
function tierToQuality(tier) {
  return TIER_TO_QUALITY[tier] || 'medium';
}

function round16(n) {
  const v = Math.round(n / 16) * 16;
  return Math.max(MIN_EDGE, Math.min(MAX_EDGE, v));
}

/**
 * R2 — resolve --ar to a NATIVE gpt-image-2 flexible size.
 * Edges ×16, AR clamped ≤ 3:1 (warn), edge < 3840. No post-crop for in-range ratios.
 * @param {string} ar    "W:H" (e.g. "16:9").
 * @param {string} tier  draft|standard|high (sets the long-edge pixel budget).
 * @returns {{ width, height, size, requestedRatio, effectiveRatio, clamped, warnings }}
 */
function resolveAspectRatio(ar, tier) {
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

  const longEdge = TIER_TO_LONG_EDGE[tier] || TIER_TO_LONG_EDGE.standard;
  let width;
  let height;
  if (ratio >= 1) { width = round16(longEdge); height = round16(longEdge / ratio); }
  else { height = round16(longEdge); width = round16(longEdge * ratio); }

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
 * R3 — estimate USD for an arbitrary flexible size by per-tier AREA interpolation
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
  const NEVER_WARN = new Set(['prompt', 'use', 'out', 'model', 'max-cost-usd', 'dry-run', 'tier', 'ar', 'count', 'format', 'style', 'art-style']);
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
  TIERS,
  FORMATS,
  TIER_TO_QUALITY,
  TIER_TO_LONG_EDGE,
  DEFAULTS,
  MAX_AR,
  MAX_EDGE,
  parseImageArgs,
  tierToQuality,
  resolveAspectRatio,
  estimateFlexibleCost,
  computeWarnings,
  round16,
};
