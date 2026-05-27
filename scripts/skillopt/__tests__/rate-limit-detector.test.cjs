#!/usr/bin/env node
'use strict';
/**
 * Tests for scripts/skillopt/rate-limit-detector.cjs.
 *
 * Capability: evolve v1.1 Sprint 2.
 *
 * 5 historical Anthropic error shapes + 4 negative cases.
 * Run directly: `node scripts/skillopt/__tests__/rate-limit-detector.test.cjs`
 * Exits 0 on all-pass, 1 on any failure.
 */

const assert = require('assert');
const detector = require('../rate-limit-detector.cjs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    process.stdout.write(`  ✓ ${name}\n`);
    passed += 1;
  } catch (e) {
    process.stdout.write(`  ✗ ${name}\n    ${e.message}\n`);
    failed += 1;
  }
}

process.stdout.write('rate-limit-detector tests\n\n');

// ── 5 historical Anthropic error fixtures (spec acceptance criterion) ───────

test('fixture 1: HTTP 429 status', () => {
  const err = { status: 429, statusText: 'Too Many Requests' };
  const r = detector.classify(err);
  assert.strictEqual(r.kind, 'rate-limit');
  assert.strictEqual(r.advice, 'pause');
  assert.strictEqual(r.signal, 'http-429');
});

test('fixture 2: HTTP 529 overloaded (Anthropic-specific)', () => {
  const err = { status: 529, statusText: 'Overloaded' };
  const r = detector.classify(err);
  assert.strictEqual(r.kind, 'rate-limit');
  assert.strictEqual(r.advice, 'pause');
  assert.strictEqual(r.signal, 'http-529');
});

test('fixture 3: Anthropic SDK rate_limit_error type', () => {
  const err = {
    type: 'rate_limit_error',
    message: 'Rate limit reached for your organization. Please wait 60 seconds.',
  };
  const r = detector.classify(err);
  assert.strictEqual(r.kind, 'rate-limit');
  assert.strictEqual(r.advice, 'pause');
  assert.strictEqual(r.signal, 'anthropic-type-rate_limit_error');
});

test('fixture 4: Anthropic SDK overloaded_error type (servers under load)', () => {
  const err = {
    type: 'overloaded_error',
    message: 'Anthropic servers are temporarily overloaded.',
  };
  const r = detector.classify(err);
  assert.strictEqual(r.kind, 'rate-limit');
  assert.strictEqual(r.advice, 'pause');
  assert.strictEqual(r.signal, 'anthropic-type-overloaded_error');
});

test('fixture 5: Plain Error instance with rate-limit message (no status code)', () => {
  const err = new Error('Request failed: rate limit exceeded; retry in 30s');
  const r = detector.classify(err);
  assert.strictEqual(r.kind, 'rate-limit');
  assert.strictEqual(r.advice, 'pause');
  assert.ok(r.signal.startsWith('message-match'));
});

// ── 4 negative cases — non-rate-limit errors must NOT misclassify ───────────

test('negative: timeout is transient (retry), not rate-limit', () => {
  const err = { code: 'ETIMEDOUT', message: 'Connection timeout after 30000ms' };
  const r = detector.classify(err);
  assert.strictEqual(r.kind, 'transient');
  assert.strictEqual(r.advice, 'retry');
});

test('negative: random validation error is "other" (escalate)', () => {
  const err = { type: 'invalid_request_error', message: 'max_tokens must be positive' };
  const r = detector.classify(err);
  assert.strictEqual(r.kind, 'other');
  assert.strictEqual(r.advice, 'escalate');
});

test('negative: null error → other/escalate (defensive)', () => {
  const r = detector.classify(null);
  assert.strictEqual(r.kind, 'other');
  assert.strictEqual(r.advice, 'escalate');
});

test('negative: word "timeout" inside a config string is NOT transient (word-boundary regex)', () => {
  const err = { message: 'config field timeout_s defaults to 600' };
  const r = detector.classify(err);
  // /\btimeout\b/i shouldn't match because "timeout_s" has _ adjacent, not word-boundary
  assert.strictEqual(r.kind, 'other');
});

// ── @cto SHOULD-FIX 2: 5xx adjacent ─────────────────────────────────────────

test('@cto SHOULD-FIX 2: HTTP 500 is rate-limit-adjacent (pause, not retry)', () => {
  const err = { status: 500, statusText: 'Internal Server Error' };
  const r = detector.classify(err);
  assert.strictEqual(r.kind, 'rate-limit-adjacent');
  assert.strictEqual(r.advice, 'pause');
});

test('@cto SHOULD-FIX 2: HTTP 503 is rate-limit-adjacent', () => {
  const err = { status: 503 };
  const r = detector.classify(err);
  assert.strictEqual(r.kind, 'rate-limit-adjacent');
  assert.strictEqual(r.advice, 'pause');
});

// ── Nested error shape extraction ────────────────────────────────────────────

test('extracts status from .response.status (axios-style)', () => {
  const err = { response: { status: 429, statusText: 'Too Many Requests' } };
  const r = detector.classify(err);
  assert.strictEqual(r.kind, 'rate-limit');
  assert.strictEqual(r.signal, 'http-429');
});

test('extracts type from .body.error.type (Anthropic SDK wrapped JSON)', () => {
  const err = { status: 429, body: { error: { type: 'rate_limit_error', message: '...' } } };
  const r = detector.classify(err);
  // Status check wins first; both signals are valid here.
  assert.strictEqual(r.kind, 'rate-limit');
});

// ── CLI exit-code contract ──────────────────────────────────────────────────

test('module exports core constants', () => {
  assert.ok(detector.RATE_LIMIT_HTTP_STATUSES.has(429));
  assert.ok(detector.RATE_LIMIT_HTTP_STATUSES.has(529));
  assert.ok(detector.RATE_LIMIT_ADJACENT_HTTP_STATUSES.has(500));
  assert.ok(detector.RATE_LIMIT_ANTHROPIC_ERROR_TYPES.has('rate_limit_error'));
  assert.ok(detector.RATE_LIMIT_ANTHROPIC_ERROR_TYPES.has('overloaded_error'));
});

// ── Summary ─────────────────────────────────────────────────────────────────

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
