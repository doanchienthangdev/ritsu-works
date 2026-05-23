'use strict';
/**
 * scripts/resolver-v2/keyword-fallback.cjs — Mode C deterministic matcher.
 *
 * For non-LLM consumers (CRON jobs, Edge Functions, pre-commit hooks).
 * Loads SAME catalog as Mode A/B (single source of truth).
 * Whole-word matching against:
 *   1. recipient slug (after kind/ prefix)
 *   2. tokens extracted from "When to use" text
 *   3. explicit aliases
 *
 * Per spec.md §6:
 *   Recall: ~30% (acknowledged degradation vs Mode A)
 *   Use case: last resort; encourage migration to Mode A.
 *
 * Public API:
 *   match({ trigger, kind?, callerRole?, opts? }) → { decision, matched, alternatives, latency_ms, mode: 'C' }
 */

const path = require('path');
const E = require('./errors.cjs');
const { loadCatalog } = require('./catalog-loader.cjs');

const MAX_TRIGGER_LEN = 1000;
const MAX_ALTERNATIVES = 5;
const DEFAULT_THRESHOLDS = {
  dispatch_silently: 0.85,
  surface_candidates: 0.60,
};

function nowMs() { return Date.now(); }

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize text for matching: NFC + lowercase + collapse whitespace.
 * Strips control chars (but preserves newlines + tabs).
 */
function normalize(text) {
  if (typeof text !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return text.normalize('NFC').toLowerCase()
    .replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '')   // strip control chars (preserve \t \n \r → collapsed below)
    .replace(/[​-‏﻿]/g, '')      // strip zero-width chars + BOM
    .replace(/\s+/g, ' ').trim();
}

/**
 * Validate trigger input.
 */
function validateTrigger(trigger) {
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
    throw new E.TriggerTooLong(trimmed.length, MAX_TRIGGER_LEN);
  }
  // After normalize (strips control + ZWSP), if empty → invalid
  const normalized = normalize(trimmed);
  if (normalized.length === 0) {
    throw new E.InvalidTrigger('trigger contains only control/zero-width characters');
  }
  return trimmed;
}

/**
 * Extract searchable tokens from a recipient.
 * Tokens come from:
 *   1. The slug part of the ID (after kind/)
 *   2. Significant words in "When to use" (length ≥3, not stop-words)
 *   3. Explicit aliases (full phrases)
 *
 * Returns Set of normalized tokens.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has',
  'have', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'to',
  'was', 'were', 'will', 'with', 'when', 'use', 'used', 'using', 'this',
  'that', 'these', 'those', 'do', 'does', 'did', 'doing', 'not', 'no',
  'all', 'any', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
]);

function extractTokens(recipient) {
  const tokens = new Set();
  // 1. Slug part
  const slugPart = recipient.id.split('/').slice(1).join('/');
  for (const t of slugPart.split(/[/_-]+/)) {
    const n = normalize(t);
    if (n && n.length >= 2) tokens.add(n);
  }
  // 2. Words from "When to use"
  const desc = normalize(recipient.when_to_use || '');
  for (const t of desc.split(/[\s,.;:!?()[\]{}'"]+/)) {
    if (t.length >= 3 && !STOP_WORDS.has(t)) tokens.add(t);
  }
  // 3. Aliases (full phrases — preserve spaces)
  if (Array.isArray(recipient.aliases)) {
    for (const a of recipient.aliases) {
      const n = normalize(a);
      if (n) tokens.add(n);
    }
  }
  return tokens;
}

/**
 * Compute match confidence for trigger vs recipient.
 * Returns { confidence, matchedToken } or null.
 */
function computeMatch(triggerNorm, recipient) {
  const triggerWords = new Set(triggerNorm.split(/\s+/).filter(w => w.length >= 2));
  const recipientTokens = extractTokens(recipient);

  if (triggerWords.size === 0) return null;

  // Exact slug match (whole-word boundary) → 0.95
  const slugTail = recipient.id.split('/').slice(1).join('/');
  if (slugTail) {
    const slugNorm = normalize(slugTail);
    const wb = new RegExp(`\\b${escapeRegex(slugNorm)}\\b`, 'u');
    if (wb.test(triggerNorm)) {
      return { confidence: 0.95, matchedToken: slugNorm };
    }
  }

  // Alias phrase match (whole-word) → 0.9
  if (Array.isArray(recipient.aliases)) {
    for (const alias of recipient.aliases) {
      const aliasNorm = normalize(alias);
      if (!aliasNorm) continue;
      const wb = new RegExp(`\\b${escapeRegex(aliasNorm)}\\b`, 'u');
      if (wb.test(triggerNorm)) {
        return { confidence: 0.9, matchedToken: aliasNorm };
      }
    }
  }

  // Slug-word match (single token from slug) → 0.8
  const slugTokens = slugTail.split(/[/_-]+/).map(normalize).filter(t => t && t.length >= 3);
  for (const t of slugTokens) {
    if (triggerWords.has(t)) {
      return { confidence: 0.8, matchedToken: t };
    }
  }

  // Description token match (multiple required) → 0.6 + 0.05 per extra word
  const matchedWords = [];
  for (const w of triggerWords) {
    if (w.length < 3 || STOP_WORDS.has(w)) continue;
    if (recipientTokens.has(w)) matchedWords.push(w);
  }
  if (matchedWords.length >= 2) {
    const conf = Math.min(0.85, 0.6 + (matchedWords.length - 2) * 0.05);
    return { confidence: conf, matchedToken: matchedWords.join('+') };
  }

  return null;
}

/**
 * Filter candidates by caller role.
 */
function filterByRole(candidates, callerRole) {
  if (!callerRole) return candidates;
  return candidates.filter(c => {
    const scope = c.recipient.role_scope;
    if (!scope || !Array.isArray(scope)) return true;
    if (scope.includes('*')) return true;
    return scope.includes(callerRole);
  });
}

/**
 * Mode C match: trigger → best recipient.
 *
 * @param {Object} input
 * @param {string} input.trigger
 * @param {string} [input.kind]    filter to specific kind
 * @param {string} [input.callerRole]
 * @param {Object} [input.opts]    forwarded to loadCatalog
 *
 * @returns {Object} { mode: 'C', decision, matched, alternatives, latency_ms, perf, trigger_normalized }
 */
function match(input) {
  const start = nowMs();
  input = input || {};
  const trigger = validateTrigger(input.trigger);
  const kindFilter = input.kind || null;
  const callerRole = input.callerRole || process.env.MCP_CALLER_ROLE || null;

  if (kindFilter && !E.VALID_KINDS.includes(kindFilter)) {
    throw new E.InvalidKindFilter(kindFilter, E.VALID_KINDS);
  }

  const triggerNorm = normalize(trigger);
  const loadStart = nowMs();
  const catalog = loadCatalog(input.opts || {});
  const loadMs = nowMs() - loadStart;

  const candidates = [];
  for (const recipient of catalog.recipients) {
    if (kindFilter && recipient.kind !== kindFilter) continue;
    if (recipient.status === 'deprecated') continue;
    const m = computeMatch(triggerNorm, recipient);
    if (m) candidates.push({ recipient, confidence: m.confidence, matchedToken: m.matchedToken });
  }

  candidates.sort((a, b) => b.confidence - a.confidence);

  const filtered = filterByRole(candidates, callerRole);

  let decision = 'no_match';
  let matched = null;
  let alternatives = filtered.slice(0, MAX_ALTERNATIVES);

  if (filtered.length > 0) {
    const top = filtered[0];
    if (top.confidence >= DEFAULT_THRESHOLDS.dispatch_silently) {
      decision = 'dispatch_silently';
      matched = top;
      alternatives = filtered.slice(1, MAX_ALTERNATIVES);
    } else if (top.confidence >= DEFAULT_THRESHOLDS.surface_candidates) {
      decision = 'surface_candidates';
      matched = null;
      alternatives = filtered.slice(0, MAX_ALTERNATIVES);
    }
  }

  return {
    mode: 'C',
    trigger,
    trigger_normalized: triggerNorm,
    caller_role: callerRole,
    kind_filter: kindFilter,
    decision,
    matched,
    alternatives,
    latency_ms: nowMs() - start,
    perf: {
      load_ms: loadMs,
      candidate_count: candidates.length,
      filtered_count: filtered.length,
      catalog_size: catalog.totalCount,
    },
    config_thresholds: DEFAULT_THRESHOLDS,
  };
}

module.exports = {
  match,
  normalize,
  validateTrigger,
  extractTokens,
  computeMatch,
  filterByRole,
  STOP_WORDS,
  DEFAULT_THRESHOLDS,
};
