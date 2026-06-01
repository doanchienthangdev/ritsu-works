// ============================================================================
// scripts/forge/dry-run-preview.cjs — /forge --dry-run cost + preview
// ============================================================================
// Capability `book-to-capability` (/forge) v0.1, Sprint 1. Pure deterministic
// cost/tier estimator + preview renderer behind `/forge --dry-run` (the
// mandatory cost-safety, deepask `--dry-run` precedent / @cto Phase-5). It
// shows the funnel verdicts + the chosen route + an estimated cost & HITL tier
// BEFORE any build spend, so a mis-route (the 5x-cost risk) is caught by eye.
//
// /forge's OWN spend is only the funnel + classify overhead (~$0.10-0.30);
// the BUILD spend lands on the delegate (/update ~$0.70 Tier B; /cla ~$3-5
// Tier C) and is attributed to the delegate's own role/bucket, not /forge.
// A `surface` route defers the build until the founder picks the target, so
// its estimate is overhead-only.
//
// Pure functions: no I/O, no clock.
// ============================================================================

'use strict';

const { VALID_ROUTES } = require('./route-classify.cjs');

// Forge's own per-run orchestration overhead (funnel gate + route classify LLM).
const FORGE_OVERHEAD_USD = { min: 0.1, max: 0.3 };

// Delegate build cost + HITL tier per route (spec §2.3, §5).
const ROUTE_BUILD = {
  extend: { build: { min: 0.7, max: 0.7 }, hitlTier: 'B', delegate: '/update <skill> <name> --refs=wiki:' },
  'net-new': { build: { min: 3.0, max: 5.0 }, hitlTier: 'C', delegate: '/cla propose --refs=wiki:' },
  surface: { build: { min: 0.0, max: 0.0 }, hitlTier: 'A', delegate: 'awaiting founder entity pick (no build yet)' },
};

const VALID_VERDICTS = ['PASS', 'REJECT'];

function round2(n) {
  return Math.round(n * 100) / 100;
}

function assertRoute(route) {
  if (typeof route !== 'string' || !VALID_ROUTES.includes(route)) {
    throw new TypeError(
      `dry-run-preview: route must be one of [${VALID_ROUTES.join(', ')}], got ${
        typeof route === 'string' ? `"${route}"` : typeof route
      }`,
    );
  }
}

/**
 * Estimate the cost + HITL tier of a /forge run for a given route.
 *
 * @param {string} route  'extend' | 'net-new' | 'surface'
 * @returns {{route: string, overheadUsd: {min:number,max:number},
 *            buildUsd: {min:number,max:number}, totalUsd: {min:number,max:number},
 *            hitlTier: string, delegate: string}}
 * @throws {TypeError} on an invalid route.
 */
function estimateRoute(route) {
  assertRoute(route);
  const { build, hitlTier, delegate } = ROUTE_BUILD[route];
  return {
    route,
    overheadUsd: { ...FORGE_OVERHEAD_USD },
    buildUsd: { ...build },
    totalUsd: {
      min: round2(FORGE_OVERHEAD_USD.min + build.min),
      max: round2(FORGE_OVERHEAD_USD.max + build.max),
    },
    hitlTier,
    delegate,
  };
}

/**
 * Render the human-readable `/forge --dry-run` preview. Spends nothing.
 *
 * @param {object} plan
 * @param {string} plan.need     the NEED string.
 * @param {string[]} plan.sources  assembled wiki source refs (may be empty).
 * @param {Array<{gate: (string|number), verdict: string, reason: string}>} plan.gates
 *        the 5-gate funnel results.
 * @param {string} plan.route    'extend' | 'net-new' | 'surface'.
 * @param {string} [plan.entity] the extend target (route === 'extend').
 * @returns {string} a multi-line preview.
 * @throws {TypeError} on malformed input.
 */
function renderPreview(plan) {
  if (plan === null || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new TypeError('dry-run-preview: plan must be an object');
  }
  if (typeof plan.need !== 'string' || plan.need.trim().length === 0) {
    throw new TypeError('dry-run-preview: plan.need must be a non-empty string');
  }
  if (!Array.isArray(plan.sources) || plan.sources.some((s) => typeof s !== 'string')) {
    throw new TypeError('dry-run-preview: plan.sources must be an array of strings');
  }
  if (!Array.isArray(plan.gates)) {
    throw new TypeError('dry-run-preview: plan.gates must be an array');
  }
  plan.gates.forEach((g, i) => {
    if (g === null || typeof g !== 'object' || Array.isArray(g)) {
      throw new TypeError(`dry-run-preview: plan.gates[${i}] must be an object`);
    }
    if (typeof g.verdict !== 'string' || !VALID_VERDICTS.includes(g.verdict)) {
      throw new TypeError(
        `dry-run-preview: plan.gates[${i}].verdict must be one of [${VALID_VERDICTS.join(', ')}]`,
      );
    }
  });
  assertRoute(plan.route);

  const est = estimateRoute(plan.route);
  const anyReject = plan.gates.some((g) => g.verdict === 'REJECT');
  const routeLabel = plan.route === 'extend' ? `extend → ${plan.entity || '<unset>'}` : plan.route;

  const lines = [];
  lines.push('── /forge --dry-run (NO SPEND) ───────────────────────────────');
  lines.push(`NEED:    ${plan.need.trim()}`);
  lines.push(`SOURCES: ${plan.sources.length ? plan.sources.join(', ') : '(none assembled)'}`);
  lines.push('FUNNEL (default REJECT):');
  for (const g of plan.gates) {
    const mark = g.verdict === 'PASS' ? '✓' : '✗';
    lines.push(`  ${mark} Gate ${g.gate}: ${g.verdict} — ${g.reason || ''}`.trimEnd());
  }
  if (anyReject) {
    lines.push('VERDICT: REJECT — does not become a skill (knowledge stays latent; or → Tier-1 doc).');
    lines.push('ROUTE:   (none — funnel rejected)');
  } else {
    lines.push('VERDICT: PASS');
    lines.push(`ROUTE:   ${routeLabel}`);
    lines.push(`DELEGATE: ${est.delegate}`);
    lines.push(
      `EST COST: $${est.totalUsd.min}–$${est.totalUsd.max} ` +
        `(forge overhead $${est.overheadUsd.min}–$${est.overheadUsd.max} + build $${est.buildUsd.min}–$${est.buildUsd.max})`,
    );
    lines.push(`HITL TIER: ${est.hitlTier}`);
  }
  lines.push('──────────────────────────────────────────────────────────────');
  return lines.join('\n');
}

module.exports = {
  estimateRoute,
  renderPreview,
  FORGE_OVERHEAD_USD,
  ROUTE_BUILD,
  VALID_VERDICTS,
};
