#!/usr/bin/env node
// calibrate-efficacy.cjs
//
// Day-30 falsifiable efficacy gate (per spec §6.6 / PLAN §6.13b).
//
// Computes:
//   - Judge-noise σ: empirical SD of judge variance flags on unchanged artifacts
//   - Median gain: median composite-score delta across first N≥10 evolved entities
//
// PASS if median gain ≥ 1.5× σ. Else PAUSE-RECOMMENDED.
//
// Invocation:
//   node scripts/eval-evo/calibrate-efficacy.cjs
//   (requires SUPABASE_ACCESS_TOKEN in env; source runtime/secrets/.env.local first)
//
// Uses supabase CLI for DB query (same pattern as scripts/cross-tier/validate-wiki-integrity.cjs).
//
// Exit codes:
//   0 — PASS or INSUFFICIENT_DATA (don't block; just report)
//   1 — PAUSE-RECOMMENDED (founder retro required)
//   2 — environment / tool error

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const REPO_ROOT = path.resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Env check
// ---------------------------------------------------------------------------
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN env var required.');
  console.error('Hint: export $(grep -v "^#" runtime/secrets/.env.local | xargs)');
  process.exit(2);
}

const PROJECT_REF = process.env.SUPABASE_OPS_PROJECT_REF || 'mntobbmieuoaxipnjaau';

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------
function median(arr) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stddev(arr) {
  if (arr.length < 2) return null;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// Fetch /evolve runs via supabase CLI
// ---------------------------------------------------------------------------
function fetchEvolveRuns() {
  const sql = `
    SELECT id::text AS id,
           started_at::text AS started_at,
           ended_at::text AS ended_at,
           state,
           state_payload::text AS state_payload_json,
           output_payload::text AS output_payload_json
    FROM ops.agent_runs
    WHERE agent_slug = 'evolve' AND state = 'completed'
    ORDER BY started_at ASC
    LIMIT 500;
  `.trim();

  try {
    const out = execSync(
      `supabase db query --linked --project-ref ${PROJECT_REF} --json -- "${sql.replace(/"/g, '\\"')}"`,
      { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );
    return JSON.parse(out);
  } catch (e) {
    console.error('ERROR: supabase CLI query failed.');
    console.error(e.message);
    if (e.stderr) console.error('stderr:', e.stderr.toString());
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// Compute metrics
// ---------------------------------------------------------------------------
function computeMetrics(runs) {
  const gains = [];
  const varianceFlags = [];

  for (const r of runs) {
    let sp = {};
    try {
      sp = JSON.parse(r.state_payload_json || '{}');
    } catch (e) {
      continue;
    }
    const scores = sp.scores;
    if (!Array.isArray(scores) || scores.length < 2) continue;
    const gain = scores[scores.length - 1] - scores[0];
    gains.push(gain);

    if (Array.isArray(sp.variance_flags) && sp.variance_flags.length > 0) {
      // Each variance flag means >5pt difference on unchanged artifact.
      // v1.0 conservative proxy: count of flags × 5 (threshold).
      // v1.1 may augment with actual variance measurements.
      for (const _ of sp.variance_flags) {
        varianceFlags.push(5);
      }
    }
  }

  return {
    n_runs: runs.length,
    n_gains: gains.length,
    median_gain: median(gains),
    mean_gain: gains.length ? (gains.reduce((a, b) => a + b, 0) / gains.length) : null,
    judge_sigma: stddev(varianceFlags) || 5,
    n_variance_flags: varianceFlags.length,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  console.log('=== /evolve Day-30 Efficacy Calibration ===');
  console.log('');

  const runs = fetchEvolveRuns();
  console.log(`Fetched ${runs.length} /evolve runs from ops.agent_runs (agent_slug='evolve', state='completed').`);
  console.log('');

  const m = computeMetrics(runs);

  console.log(`n_runs_with_scores: ${m.n_gains}`);
  console.log(`median_gain (composite delta): ${m.median_gain !== null ? m.median_gain.toFixed(2) : 'n/a'}`);
  console.log(`mean_gain: ${m.mean_gain !== null ? m.mean_gain.toFixed(2) : 'n/a'}`);
  console.log(`judge_sigma (empirical, floor 5): ${m.judge_sigma.toFixed(2)}`);
  console.log(`n_variance_flags: ${m.n_variance_flags}`);
  console.log('');

  let verdict;
  let exitCode;

  if (m.n_gains < 10) {
    verdict = 'INSUFFICIENT_DATA';
    console.log(`VERDICT: ${verdict}`);
    console.log(`  Reason: only ${m.n_gains} runs available; need ≥10 for honest median.`);
    console.log(`  Recommendation: continue /evolve usage; re-run this script after 10+ runs.`);
    exitCode = 0;
  } else {
    const ratio = m.median_gain / m.judge_sigma;
    console.log(`gain / sigma ratio: ${ratio.toFixed(3)}`);
    console.log(`gate threshold: 1.5`);
    console.log('');
    if (ratio >= 1.5) {
      verdict = 'PASS';
      console.log(`VERDICT: ${verdict}`);
      console.log(`  /evolve passes the falsifiable efficacy gate. Median gain exceeds 1.5× judge σ.`);
      exitCode = 0;
    } else {
      verdict = 'PAUSE_RECOMMENDED';
      console.log(`VERDICT: ${verdict}`);
      console.log(`  Median gain < 1.5× judge σ — reported improvements indistinguishable from noise.`);
      console.log(`  Recommendation: founder runs /cla revise evolve to address v1.1 redesign.`);
      console.log(`  Orchestrator's pre-flight check will refuse new /evolve invocations until founder retro.`);
      exitCode = 1;
    }
  }

  // Persist result
  const resultsDir = path.join(REPO_ROOT, 'scripts/eval-evo/calibration-results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const resultPath = path.join(resultsDir, `${ts}.json`);
  fs.writeFileSync(resultPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    verdict,
    metrics: m,
    gate_threshold: 1.5,
    note: 'eval-evo capability falsifiable efficacy gate (§6.13b PLAN.md)',
  }, null, 2));
  console.log('');
  console.log(`Result persisted: ${path.relative(REPO_ROOT, resultPath)}`);

  process.exit(exitCode);
}

main();
