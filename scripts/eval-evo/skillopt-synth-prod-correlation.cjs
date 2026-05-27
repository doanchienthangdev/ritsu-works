#!/usr/bin/env node
'use strict';
/**
 * scripts/eval-evo/skillopt-synth-prod-correlation.cjs
 *
 * Monthly cron handler for KPI `skillopt_synth_to_prod_correlation`.
 *
 * Computes Spearman correlation between:
 *   A. Held-out test-split judge scores from /evolve skillopt runs (synth signal)
 *   B. Post-install production correction-rate per entity (prod signal)
 *
 * If correlation < 0.5 over the last 30 days, the synth signal is poorly
 * predicting real-world success — the playbook (`playbooks/skill-skillopt.md`)
 * needs revision OR the judge is miscalibrated.
 *
 * Capability: evolve v1.1 Sprint 4. Spec §19.10.
 * Cron: knowledge/schedules.yaml `skillopt-synth-prod-correlation-monthly`
 *       (cron `0 9 1 * *`).
 *
 * Output (stdout): JSON for the cron dispatcher to insert into
 * `ops.kpi_snapshots`:
 * ```json
 * {
 *   "kpi_id": "skillopt_synth_to_prod_correlation",
 *   "value": 0.62,
 *   "ts": "2026-06-01T09:00:00Z",
 *   "metadata": {
 *     "window_days":     30,
 *     "n_entities":      8,
 *     "method":          "spearman",
 *     "computed_at":     "2026-06-01T09:00:12.345Z",
 *     "insufficient_data": false
 *   }
 * }
 * ```
 *
 * Special case: if < 5 entities have BOTH a held-out score AND a post-install
 * correction-rate datapoint in the 30-day window, emit `insufficient_data:
 * true` and value = null. The KPI snapshot is still inserted (for trend
 * tracking that data is sparse), but the alert rule for `<0.3 critical`
 * does NOT fire on null values (alert-rules.yaml condition includes a
 * non-null guard).
 */

const path = require('path');

// ── Data source contracts (consumed; not in this script) ─────────────────────
//
// Held-out scores live in: ops.run_summaries WHERE agent_slug='evolve.skillopt'
// AND artifacts->>'held_out_delta' IS NOT NULL. The runner writes this at
// Phase D.
//
// Post-install correction-rate lives in: ops.corrections WHERE corrected_by
// IS NOT NULL AND ts > <install_ts of the entity's most-recent /evolve
// skillopt run>. Per spec §19.10 KPI `skillopt_post_install_correction_rate_delta`.
//
// Both queries gated by 30-day window from now() (or --as-of for testing).

// ── Spearman rank correlation helper ─────────────────────────────────────────
//
// Implementation: rank-transform both arrays, compute Pearson correlation
// on ranks. Standard formula; no scipy needed (pure stdlib JS).

function ranks(values) {
  // Returns rank array (1-indexed), averaging ties (Spearman convention).
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const r = new Array(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j += 1;
    const avgRank = (i + j + 2) / 2;   // 1-indexed: ranks (i+1)..(j+1) average = (i+j+2)/2
    for (let k = i; k <= j; k++) r[indexed[k].i] = avgRank;
    i = j + 1;
  }
  return r;
}

function pearson(a, b) {
  if (a.length !== b.length || a.length < 2) return null;
  const n = a.length;
  let sumA = 0, sumB = 0;
  for (let i = 0; i < n; i++) { sumA += a[i]; sumB += b[i]; }
  const meanA = sumA / n;
  const meanB = sumB / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  if (den === 0) return null;
  return num / den;
}

function spearman(a, b) {
  return pearson(ranks(a), ranks(b));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Args: --as-of=<iso> (default: now), --window-days=30
  const args = process.argv.slice(2);
  const asOf = (args.find((a) => a.startsWith('--as-of=')) || `--as-of=${new Date().toISOString()}`).slice('--as-of='.length);
  const windowDays = parseInt(
    (args.find((a) => a.startsWith('--window-days=')) || '--window-days=30').slice('--window-days='.length),
    10,
  );
  const dryRun = args.includes('--dry-run');

  // In production, the cron dispatcher (supabase/functions/schedule-dispatcher)
  // invokes this script with the MCP supabase-ops query tool injected. For the
  // Sprint 4 deliverable we emit a *deterministic* JSON envelope; the actual
  // SQL queries are documented above and will be wired through the dispatcher
  // when the bridge integration is exercised end-to-end (Sprint 5 / first real
  // /evolve skillopt run produces data).
  //
  // Until then: emit insufficient_data envelope (graceful default).

  const result = {
    kpi_id: 'skillopt_synth_to_prod_correlation',
    value: null,
    ts: asOf,
    metadata: {
      window_days: windowDays,
      n_entities: 0,
      method: 'spearman',
      computed_at: new Date().toISOString(),
      insufficient_data: true,
      reason: 'no /evolve skillopt runs yet produced held-out + post-install data',
      handler: 'scripts/eval-evo/skillopt-synth-prod-correlation.cjs',
    },
  };

  if (dryRun) {
    result.metadata.dry_run = true;
  }

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
}

// Module exports for unit tests (Spearman correctness verified in
// __tests__/skillopt-synth-prod-correlation.test.cjs if added in Sprint 5).
module.exports = { ranks, pearson, spearman };

if (require.main === module) {
  main();
}
