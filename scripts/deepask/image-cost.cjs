// ============================================================================
// scripts/deepask/image-cost.cjs — deepask image-gen cost estimator + breaker
// ============================================================================
// Capability `deepask` v1.1 (extend: image formats), 2026-06-01. Pure
// deterministic helper that estimates the USD cost of a gpt-image-* run BEFORE
// any API call, so the orchestrator can (a) show the founder the estimate and
// (b) enforce the --max-cost-usd circuit-breaker (mirrors the resolver breaker:
// refuse-up-front, never silent overspend).
//
// COST IS AN ESTIMATE. gpt-image pricing is output-image-token-based; the table
// below uses commonly-cited gpt-image-1 per-image USD figures as the baseline.
// gpt-image-2 pricing is assumed ≈ gpt-image-1 (model released post-cutoff —
// VERIFY at https://platform.openai.com/pricing and update COST_TABLE). Every
// result is flagged isEstimate:true. The dial the founder controls is `quality`
// (low/medium/high) × image count (--max-slides).
//
// Pure functions: no I/O, no network. Quality/size validation throws (caller
// bug); unknown model falls back to the baseline table (model name varies
// legitimately as OpenAI ships new versions).
// ============================================================================

'use strict';

const QUALITIES = Object.freeze(['low', 'medium', 'high', 'auto']);

// Per-image USD estimate, keyed by size → quality. Baseline = gpt-image-1.
// 'auto' is treated as 'high' for a conservative (never-undershoot) estimate.
const COST_TABLE = Object.freeze({
  '1024x1024': { low: 0.011, medium: 0.042, high: 0.167 },
  '1536x1024': { low: 0.016, medium: 0.063, high: 0.25 },
  '1024x1536': { low: 0.016, medium: 0.063, high: 0.25 },
});
// Sizes that share the landscape/portrait price tier if a cropped finalSize is passed.
const SIZE_ALIASES = Object.freeze({
  '1536x864': '1536x1024', // img-slide cropped 16:9 still billed at landscape gen size
});

const DEFAULT_QUALITY = 'medium';

function round4(n) {
  return Math.round(n * 1e4) / 1e4;
}

/** Normalize a (possibly cropped) size to a COST_TABLE key. */
function costSizeKey(size) {
  if (typeof size !== 'string') {
    throw new TypeError(`image-cost: size must be a string, got ${typeof size}`);
  }
  if (COST_TABLE[size]) return size;
  if (SIZE_ALIASES[size]) return SIZE_ALIASES[size];
  throw new TypeError(`image-cost: unknown size "${size}" (known: ${Object.keys(COST_TABLE).join(', ')}, aliases: ${Object.keys(SIZE_ALIASES).join(', ')})`);
}

/** Normalize quality; 'auto' → 'high' for a conservative estimate. */
function costQuality(quality) {
  const q = quality === undefined || quality === null ? DEFAULT_QUALITY : quality;
  if (!QUALITIES.includes(q)) {
    throw new TypeError(`image-cost: quality must be one of [${QUALITIES.join(', ')}], got ${JSON.stringify(quality)}`);
  }
  return q === 'auto' ? 'high' : q;
}

/**
 * Estimate the USD cost of ONE image.
 * @param {object} a
 * @param {string} a.size      a COST_TABLE size (or known alias like 1536x864).
 * @param {string} [a.quality='medium']  low|medium|high|auto.
 * @param {string} [a.model]   informational; baseline table used for any model.
 * @returns {number} USD (rounded to 4dp).
 */
function estimateImageCost(a) {
  if (a === null || typeof a !== 'object') {
    throw new TypeError(`image-cost: args must be an object, got ${a === null ? 'null' : typeof a}`);
  }
  const key = costSizeKey(a.size);
  const q = costQuality(a.quality);
  return round4(COST_TABLE[key][q]);
}

/**
 * Estimate the cost of a full run (count images at the same size+quality).
 * @param {object} a
 * @param {string} a.size
 * @param {string} [a.quality='medium']
 * @param {number} a.count    images to generate (positive integer).
 * @param {string} [a.model='gpt-image-2']
 * @returns {{ perImageUsd:number, totalUsd:number, count:number, size:string,
 *            quality:string, model:string, isEstimate:true, note:string }}
 */
function estimateRunCost(a) {
  if (a === null || typeof a !== 'object') {
    throw new TypeError(`image-cost: args must be an object, got ${a === null ? 'null' : typeof a}`);
  }
  const { count, model = 'gpt-image-2' } = a;
  if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0) {
    throw new TypeError(`image-cost: count must be a positive integer, got ${JSON.stringify(count)}`);
  }
  const perImageUsd = estimateImageCost({ size: a.size, quality: a.quality, model });
  return {
    perImageUsd,
    totalUsd: round4(perImageUsd * count),
    count,
    size: costSizeKey(a.size),
    quality: costQuality(a.quality),
    model,
    isEstimate: true,
    note: 'Estimate from gpt-image-1 baseline; verify at platform.openai.com/pricing. Dial: quality × count.',
  };
}

/**
 * Circuit-breaker decision against --max-cost-usd. Refuse up front if the
 * estimate exceeds the cap (mirror of the resolver breaker — never silent).
 * @param {object} a
 * @param {number} a.estimatedUsd
 * @param {number} a.maxCostUsd
 * @returns {{ ok:boolean, estimatedUsd:number, maxCostUsd:number, reason:(null|'over_cost_cap') }}
 */
function checkCostBudget(a) {
  if (a === null || typeof a !== 'object') {
    throw new TypeError(`image-cost: args must be an object, got ${a === null ? 'null' : typeof a}`);
  }
  const { estimatedUsd, maxCostUsd } = a;
  if (typeof estimatedUsd !== 'number' || !Number.isFinite(estimatedUsd) || estimatedUsd < 0) {
    throw new TypeError(`image-cost: estimatedUsd must be a non-negative number, got ${JSON.stringify(estimatedUsd)}`);
  }
  if (typeof maxCostUsd !== 'number' || !Number.isFinite(maxCostUsd) || maxCostUsd < 0) {
    throw new TypeError(`image-cost: maxCostUsd must be a non-negative number, got ${JSON.stringify(maxCostUsd)}`);
  }
  const ok = estimatedUsd <= maxCostUsd;
  return { ok, estimatedUsd: round4(estimatedUsd), maxCostUsd: round4(maxCostUsd), reason: ok ? null : 'over_cost_cap' };
}

module.exports = {
  estimateImageCost,
  estimateRunCost,
  checkCostBudget,
  costSizeKey,
  costQuality,
  COST_TABLE,
  SIZE_ALIASES,
  QUALITIES,
  DEFAULT_QUALITY,
};
