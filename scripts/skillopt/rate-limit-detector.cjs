#!/usr/bin/env node
'use strict';
/**
 * scripts/skillopt/rate-limit-detector.cjs — UNION-pattern rate-limit detector.
 *
 * Capability: evolve v1.1 (SkillOpt integration) Sprint 2.
 * Spec: wiki/capabilities/evolve/spec.md §19.6 (after Phase 8 promotion;
 *       current draft .archives/cla/evolve-extend-skillopt/spec.md).
 *
 * Consumed by:
 *   - scripts/skillopt/session-bridge.cjs (Sprint 1) — when a Task() dispatch
 *     fails, classify the error to decide whether to pause for rate-limit OR
 *     retry as transient.
 *   - 06-ai-ops/skills/eval-evo/skillopt-runner (Sprint 3) — R12 rate-limit
 *     handling: on detection, snapshot state + AskUserQuestion Tier B.
 *
 * Module API (CommonJS):
 *
 *   const det = require('./rate-limit-detector.cjs');
 *   const result = det.classify(error);
 *   // result.kind ∈ {'rate-limit', 'rate-limit-adjacent', 'transient', 'other'}
 *   // result.signal: which pattern matched (string for audit)
 *   // result.advice: 'pause' | 'retry' | 'escalate'
 *
 * CLI:
 *
 *   echo '<JSON or string error>' | node rate-limit-detector.cjs
 *   → outputs classification JSON
 *
 * Patterns (UNION; any match → rate-limit):
 *   - HTTP status 429                                     → rate-limit
 *   - HTTP status 529                                     → rate-limit
 *   - Anthropic error.type === "rate_limit_error"         → rate-limit
 *   - Anthropic error.type === "overloaded_error"         → rate-limit
 *   - Error message matching /rate.?limit/i               → rate-limit
 *   - Error message matching /quota/i                     → rate-limit
 *
 * Adjacent patterns (treat as rate-limit-adjacent per @cto SHOULD-FIX 2):
 *   - Generic HTTP 5xx (500, 502, 503, 504)               → rate-limit-adjacent
 *     (often correlates with backend overload, indistinguishable from rate-
 *     limit at low rates; pause briefly + retry is safer than immediate fail)
 *
 * Other classifications:
 *   - Timeout / ECONNRESET / ETIMEDOUT                    → transient (retry)
 *   - Anything else                                       → other (escalate)
 */

// ── Pattern constants ────────────────────────────────────────────────────────

const RATE_LIMIT_HTTP_STATUSES = new Set([429, 529]);
const RATE_LIMIT_ADJACENT_HTTP_STATUSES = new Set([500, 502, 503, 504]);

const RATE_LIMIT_ANTHROPIC_ERROR_TYPES = new Set([
  'rate_limit_error',
  'overloaded_error',
]);

const RATE_LIMIT_MESSAGE_PATTERNS = [
  /rate.?limit/i,
  /quota/i,
];

const TRANSIENT_MESSAGE_PATTERNS = [
  /ETIMEDOUT/i,
  /ECONNRESET/i,
  /ECONNREFUSED/i,
  /\btimeout\b/i,           // word-boundary to avoid false-positive on "timeout_s" config strings
  /socket hang up/i,
];

// ── Core classifier ─────────────────────────────────────────────────────────

/**
 * Classify an error. Accepts either:
 *   - Error instance (uses .message, .code, .status)
 *   - Anthropic SDK error object ({ type, message, status })
 *   - HTTP response object ({ status, statusText, body })
 *   - Plain string (treated as message)
 *   - Plain object with any of: status, statusCode, type, message, code, error
 *
 * Returns: { kind, signal, advice }
 *   kind:    'rate-limit' | 'rate-limit-adjacent' | 'transient' | 'other'
 *   signal:  short string naming which pattern matched (or 'unknown')
 *   advice:  'pause' | 'retry' | 'escalate'
 *             - pause:    treat as rate-limit; snapshot state + AskUserQuestion
 *             - retry:    transient; exponential backoff + retry
 *             - escalate: surface to founder; not a known recoverable class
 */
function classify(err) {
  if (err == null) return { kind: 'other', signal: 'null-or-undefined-error', advice: 'escalate' };

  // Extract candidates from various error shapes
  const status = extractStatus(err);
  const type = extractType(err);
  const message = extractMessage(err);

  // 1. HTTP status — strong signal
  if (status != null) {
    if (RATE_LIMIT_HTTP_STATUSES.has(status)) {
      return { kind: 'rate-limit', signal: `http-${status}`, advice: 'pause' };
    }
    if (RATE_LIMIT_ADJACENT_HTTP_STATUSES.has(status)) {
      return { kind: 'rate-limit-adjacent', signal: `http-${status}`, advice: 'pause' };
    }
  }

  // 2. Anthropic SDK error type
  if (type != null && RATE_LIMIT_ANTHROPIC_ERROR_TYPES.has(type)) {
    return { kind: 'rate-limit', signal: `anthropic-type-${type}`, advice: 'pause' };
  }

  // 3. Message-pattern UNION (rate-limit first, then transient)
  if (message != null && message.length > 0) {
    for (const pat of RATE_LIMIT_MESSAGE_PATTERNS) {
      if (pat.test(message)) {
        return { kind: 'rate-limit', signal: `message-match-${pat.source}`, advice: 'pause' };
      }
    }
    for (const pat of TRANSIENT_MESSAGE_PATTERNS) {
      if (pat.test(message)) {
        return { kind: 'transient', signal: `message-match-${pat.source}`, advice: 'retry' };
      }
    }
  }

  return { kind: 'other', signal: 'unknown', advice: 'escalate' };
}

// ── Field extractors ────────────────────────────────────────────────────────

function extractStatus(err) {
  if (typeof err !== 'object') return null;
  // direct fields
  for (const key of ['status', 'statusCode']) {
    const v = err[key];
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v, 10);
  }
  // nested under .response (axios/fetch style)
  if (err.response && typeof err.response === 'object') {
    return extractStatus(err.response);
  }
  // nested under .error (some SDKs wrap)
  if (err.error && typeof err.error === 'object') {
    return extractStatus(err.error);
  }
  return null;
}

function extractType(err) {
  if (typeof err !== 'object') return null;
  if (typeof err.type === 'string') return err.type;
  if (err.error && typeof err.error === 'object' && typeof err.error.type === 'string') {
    return err.error.type;
  }
  // Anthropic SDK error JSON: { error: { type, message } }
  if (err.body && typeof err.body === 'object' && err.body.error && typeof err.body.error.type === 'string') {
    return err.body.error.type;
  }
  return null;
}

function extractMessage(err) {
  if (typeof err === 'string') return err;
  if (typeof err !== 'object') return null;
  if (typeof err.message === 'string') return err.message;
  if (err.error && typeof err.error === 'object' && typeof err.error.message === 'string') {
    return err.error.message;
  }
  if (typeof err.code === 'string') return err.code;
  // Last resort: stringify
  try {
    return JSON.stringify(err);
  } catch {
    return null;
  }
}

// ── Module exports ──────────────────────────────────────────────────────────

module.exports = {
  classify,
  // Exposed for tests + downstream registries
  RATE_LIMIT_HTTP_STATUSES,
  RATE_LIMIT_ADJACENT_HTTP_STATUSES,
  RATE_LIMIT_ANTHROPIC_ERROR_TYPES,
  RATE_LIMIT_MESSAGE_PATTERNS,
  TRANSIENT_MESSAGE_PATTERNS,
};

// ── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Treat as plain string error
      parsed = raw.trim();
    }
    const result = classify(parsed);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    // Exit non-zero on rate-limit / rate-limit-adjacent so a shell pipeline
    // can branch on the outcome:
    //   node rate-limit-detector.cjs <<< "$ERR" || handle_rate_limit
    if (result.kind === 'rate-limit' || result.kind === 'rate-limit-adjacent') {
      process.exit(2);
    }
    if (result.kind === 'transient') process.exit(3);
    process.exit(0);  // 'other' → 0 with caller deciding via JSON
  });
}
