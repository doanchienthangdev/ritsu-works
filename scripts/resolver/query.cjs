'use strict';
// Resolver engine — query module.
// Per .archives/cla/resolver/spec.md §11 lookup flow.
//
// Public API:
//   query({ trigger, flags, callerRole, opts }) → { matched, alternatives, decision, latency_ms, ... }

const E = require('./errors.cjs');
const { loadIndex, normalizeKeyword } = require('./load-index.cjs');

const MAX_TRIGGER_LEN = 1000;
const ALTERNATIVES_LIMIT = 5;

function nowMs() { return Date.now(); }

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compute confidence from match quality (architect T-14 baked in).
 * No hand-set confidence_default in v1.0.
 */
function computeConfidence(triggerNorm, keyword) {
  const kwNorm = normalizeKeyword(keyword);
  if (!kwNorm) return 0;

  // 1. Full-phrase exact match (with word boundaries) → 0.9
  if (kwNorm.includes(' ')) {
    const pattern = new RegExp(`\\b${escapeRegex(kwNorm)}\\b`, 'u');
    if (pattern.test(triggerNorm)) return 0.9;
    // All words present (non-contiguous) → 0.7
    const words = kwNorm.split(' ');
    if (words.every(w => new RegExp(`\\b${escapeRegex(w)}\\b`, 'u').test(triggerNorm))) return 0.7;
    return 0;
  }

  // Single-word match (whole word)
  const pattern = new RegExp(`\\b${escapeRegex(kwNorm)}\\b`, 'u');
  if (pattern.test(triggerNorm)) return 0.9; // single-word full match
  return 0;
}

/**
 * Match a route against a normalized trigger. Returns {matched, confidence, matchedKeyword} or null.
 */
function matchRoute(triggerNorm, route) {
  if (!route.triggers || !Array.isArray(route.triggers.keywords)) return null;

  let bestConfidence = 0;
  let bestKeyword = null;

  for (const kw of route.triggers.keywords) {
    const c = computeConfidence(triggerNorm, kw);
    if (c > bestConfidence) {
      bestConfidence = c;
      bestKeyword = kw;
    }
  }

  // Optional regex[] field
  if (route.triggers.regex && Array.isArray(route.triggers.regex)) {
    for (const rxStr of route.triggers.regex) {
      try {
        const rx = new RegExp(rxStr, 'u');
        if (rx.test(triggerNorm) && 0.7 > bestConfidence) {
          bestConfidence = 0.7;
          bestKeyword = `regex:${rxStr}`;
        }
      } catch (e) {
        // Log + skip
        if (process.env.RESOLVER_DEBUG) console.error('[resolver] bad regex:', rxStr, e.message);
      }
    }
  }

  // Manual override via metadata.disambiguator → +0.05 bump (max 1.0)
  if (bestConfidence > 0 && route.metadata && route.metadata.disambiguator) {
    bestConfidence = Math.min(1.0, bestConfidence + 0.05);
  }

  if (bestConfidence === 0) return null;
  return { matched: true, confidence: bestConfidence, matchedKeyword: bestKeyword };
}

/**
 * Filter routes by caller role (architect T-8: metadata-only at v1.0).
 * If callerRole present + route.role_scope is restrictive, filter.
 * If callerRole absent, return all.
 */
function filterByRole(candidates, callerRole) {
  if (!callerRole) return candidates;
  return candidates.filter(c => {
    const scope = c.route.role_scope;
    if (!scope || !Array.isArray(scope)) return true;
    if (scope.includes('*')) return true;
    return scope.includes(callerRole);
  });
}

/**
 * Decide: silent dispatch / surface candidates / no match.
 * Per spec.md §11.4 thresholds.
 */
function decide(candidates, config) {
  const cfg = (config && config.default_confidence_threshold) || {};
  const dispatchThreshold = cfg.dispatch_silently ?? 0.85;
  const surfaceFloor = cfg.surface_candidates ?? 0.60;

  if (candidates.length === 0) return { decision: 'no_match' };

  const top = candidates[0];
  if (top.confidence >= dispatchThreshold) {
    return { decision: 'dispatch_silently', matched: top, alternatives: candidates.slice(1, ALTERNATIVES_LIMIT) };
  }
  if (top.confidence >= surfaceFloor) {
    return { decision: 'surface_candidates', candidates: candidates.slice(0, ALTERNATIVES_LIMIT) };
  }
  return { decision: 'no_match', alternatives: candidates.slice(0, ALTERNATIVES_LIMIT) };
}

/**
 * Normalize trigger input.
 */
function normalizeTrigger(trigger) {
  if (trigger === null || trigger === undefined) {
    throw new E.InvalidTrigger('trigger is nil');
  }
  if (typeof trigger !== 'string') {
    throw new E.InvalidTrigger(`trigger must be string, got ${typeof trigger}`);
  }
  const trimmed = trigger.trim();
  if (trimmed.length === 0) {
    throw new E.InvalidTrigger('trigger is empty or whitespace-only');
  }
  if (trimmed.length > MAX_TRIGGER_LEN) {
    // Truncate + warn (architect T-3 + spec §11.2)
    return trimmed.slice(0, MAX_TRIGGER_LEN).normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
  }
  // Strip control chars except whitespace
  // eslint-disable-next-line no-control-regex
  const cleaned = trimmed.replace(/[\x00-\x08\x0B-\x1F]/g, '');
  return cleaned.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Public query API.
 *
 * @param {Object} input
 * @param {string} input.trigger - the trigger string
 * @param {Object} [input.flags] - { semantic?: bool, plan?: bool, json?: bool }
 * @param {string} [input.callerRole] - $MCP_CALLER_ROLE or override
 * @param {string} [input.kind] - filter to single recipient kind
 * @param {Object} [input.opts] - { resolversDir? } passed to loadIndex
 *
 * @returns {Object} { decision, matched, alternatives, latency_ms, trigger_normalized, ... }
 */
function query(input) {
  const start = nowMs();
  input = input || {};
  const trigger = input.trigger;
  const flags = input.flags || {};
  const callerRole = input.callerRole || process.env.MCP_CALLER_ROLE || null;
  const kindFilter = input.kind || null;

  const triggerNorm = normalizeTrigger(trigger);
  const loadStart = nowMs();
  const index = loadIndex(input.opts || {});
  const loadMs = nowMs() - loadStart;

  // Match all routes
  const candidates = [];
  for (const route of index.routes) {
    if (kindFilter && route.recipient && route.recipient.kind !== kindFilter) continue;
    const m = matchRoute(triggerNorm, route);
    if (m) candidates.push({ route, ...m });
  }

  // Rank by confidence DESC; stable
  candidates.sort((a, b) => b.confidence - a.confidence);

  // Filter by role
  const filtered = filterByRole(candidates, callerRole);

  // Decide
  const result = decide(filtered, index.config);

  const latency_ms = nowMs() - start;
  return {
    trigger,
    trigger_normalized: triggerNorm,
    caller_role: callerRole,
    decision: result.decision,
    matched: result.matched || null,
    alternatives: result.alternatives || result.candidates || [],
    semantic_used: false, // v1.1 only
    latency_ms,
    perf: { load_ms: loadMs, match_count: candidates.length, filtered_count: filtered.length },
    flags,
    config_thresholds: index.config && index.config.default_confidence_threshold,
  };
}

/**
 * Format result for /resolver query --explain.
 */
function explain(input) {
  const result = query(input);
  result.explanation = {
    tokenization: result.trigger_normalized.split(/\s+/),
    decision_reasoning: `top confidence ${result.matched ? result.matched.confidence : 0} vs threshold ${result.config_thresholds && result.config_thresholds.dispatch_silently}`,
    role_filter_applied: !!input.callerRole,
  };
  return result;
}

module.exports = { query, explain, normalizeTrigger, matchRoute, computeConfidence, filterByRole, decide };
