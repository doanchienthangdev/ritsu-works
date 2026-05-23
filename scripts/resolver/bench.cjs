#!/usr/bin/env node
'use strict';
// Resolver engine — performance benchmark.
// Per .archives/cla/resolver/spec.md §10 perf budget + architect T-13.
//
// Targets:
//   - Structured lookup (warm cache) p95 < 50ms; p99 < 100ms
//   - Cold start < 200ms
//
// Exit codes:
//   0 — within budget
//   1 — regression detected (p95 > target × 2)
//   2 — script error

const { invalidateCache } = require('./load-index.cjs');
const { query } = require('./query.cjs');

const TARGETS = {
  structured_p95_ms: 50,
  structured_p99_ms: 100,
  cold_start_ms: 200,
};
const REGRESSION_MULTIPLIER = 2; // Fail if p95 > target * 2

const TRIGGERS = [
  'evolve a skill',
  'check drift',
  'cla propose new capability',
  'resolver query',
  'wiki sync distill',
  'khách hàng cần CGO',
  'pricing decision',
  'wedge gate',
  'investigate customer churn',
  'capability lifecycle architect',
];

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

function bench() {
  console.log('[resolver bench] starting...');

  // Cold start measurement
  invalidateCache();
  const coldStart = Date.now();
  query({ trigger: TRIGGERS[0] });
  const coldMs = Date.now() - coldStart;
  console.log(`[resolver bench] cold start: ${coldMs}ms (target <${TARGETS.cold_start_ms}ms)`);

  // Warm cache: run 100 queries (10 triggers × 10 iterations)
  const latencies = [];
  const ITERATIONS = 10;
  for (let i = 0; i < ITERATIONS; i++) {
    for (const trigger of TRIGGERS) {
      const r = query({ trigger });
      latencies.push(r.latency_ms);
    }
  }

  const total = latencies.length;
  const p50 = percentile(latencies, 0.5);
  const p95 = percentile(latencies, 0.95);
  const p99 = percentile(latencies, 0.99);
  const avg = latencies.reduce((a, b) => a + b, 0) / total;

  console.log(`[resolver bench] warm cache (${total} queries):`);
  console.log(`  avg: ${avg.toFixed(2)}ms`);
  console.log(`  p50: ${p50}ms`);
  console.log(`  p95: ${p95}ms  (target <${TARGETS.structured_p95_ms}ms)`);
  console.log(`  p99: ${p99}ms  (target <${TARGETS.structured_p99_ms}ms)`);

  const verdict = {
    cold_start_ok: coldMs < TARGETS.cold_start_ms,
    p95_ok: p95 < TARGETS.structured_p95_ms,
    p99_ok: p99 < TARGETS.structured_p99_ms,
  };
  console.log(`[resolver bench] verdict: ${JSON.stringify(verdict)}`);

  // Fail only on REGRESSION (p95 > target × 2)
  if (p95 > TARGETS.structured_p95_ms * REGRESSION_MULTIPLIER) {
    console.error(`[resolver bench] REGRESSION: p95=${p95}ms exceeds target×${REGRESSION_MULTIPLIER}=${TARGETS.structured_p95_ms * REGRESSION_MULTIPLIER}ms`);
    process.exit(1);
  }

  process.exit(0);
}

if (require.main === module) bench();
module.exports = { bench, TARGETS, TRIGGERS };
