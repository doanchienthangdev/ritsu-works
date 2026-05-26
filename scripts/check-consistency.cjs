#!/usr/bin/env node
/**
 * scripts/check-consistency.cjs
 *
 * On-demand orchestrator for the Cross-Tier Consistency Engine.
 * Runs the same validators as L1 pre-commit + L2 CI, optionally triggers
 * the L3 nightly sweep against the live DB.
 *
 * Modes:
 *   pnpm check                # default: L1 + 3 critical L2 (~3s, local-only)
 *   pnpm check --full         # default + 2 warn-tier validators (~5s, local-only)
 *   pnpm check --remote       # full local + trigger L3 sweep on ritsu-ops (~70s)
 *                             # requires DISPATCHER_SECRET in runtime/secrets/.env.local
 *                             # + SUPABASE_ACCESS_TOKEN for the post-tick verify query.
 *
 * Exit codes:
 *   0  — all checks passed
 *   1  — at least one CRITICAL drift detected (CI-blocking)
 *   2  — script error (missing deps, etc.)
 *   3  — at least one WARN drift (informational; only when --full and no critical)
 *
 * Output is grouped + colored so humans can scan it; CI parses exit code.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const CT_DIR = path.join(REPO_ROOT, 'scripts', 'cross-tier');

const args = new Set(process.argv.slice(2));
const FULL = args.has('--full') || args.has('--remote');
const REMOTE = args.has('--remote');
const NO_COLOR = args.has('--no-color') || !process.stdout.isTTY;

function color(code, text) {
  if (NO_COLOR) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}
const c = {
  green: (s) => color('32', s),
  red: (s) => color('31', s),
  yellow: (s) => color('33', s),
  gray: (s) => color('90', s),
  bold: (s) => color('1', s),
  cyan: (s) => color('36', s),
};

function header(text) {
  console.log('');
  console.log(c.bold(c.cyan(`── ${text} `.padEnd(72, '─'))));
}

function tick() { return c.green('✓'); }
function cross() { return c.red('✗'); }
function warn() { return c.yellow('⚠'); }
function dot() { return c.gray('·'); }

function runNodeCheck(label, scriptPath, severity = 'critical') {
  const result = spawnSync('node', [scriptPath], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 60000,
  });
  const passed = result.status === 0;
  const sym = passed ? tick() : (severity === 'critical' ? cross() : warn());
  const tag = passed ? c.green('clean') : (severity === 'critical' ? c.red('FAIL') : c.yellow('warn'));
  console.log(`  ${sym} ${label.padEnd(48, ' ')} ${tag}`);
  if (!passed && (result.stdout || result.stderr)) {
    const out = (result.stdout || '') + (result.stderr || '');
    const lines = out.trim().split('\n').slice(-12);
    for (const ln of lines) console.log(`    ${c.gray(ln)}`);
  }
  return { passed, severity };
}

async function triggerL3Sweep() {
  // Step 1: load secrets.
  const secretsPath = '/Users/doanchienthang/ritsu-works/runtime/secrets/.env.local';
  const productEnvPath = '/Users/doanchienthang/omg/ritsu/apps/web/.env.local';

  function readEnvVar(filePath, varName) {
    if (!fs.existsSync(filePath)) return null;
    const text = fs.readFileSync(filePath, 'utf8');
    const m = text.match(new RegExp(`^${varName}=(.+)$`, 'm'));
    return m ? m[1].trim() : null;
  }

  const dispatcherSecret = readEnvVar(secretsPath, 'DISPATCHER_SECRET');
  const anonKey = readEnvVar(secretsPath, 'SUPABASE_ANON_KEY');
  const accessToken = readEnvVar(productEnvPath, 'SUPABASE_ACCESS_TOKEN');

  if (!dispatcherSecret) {
    console.log(`  ${cross()} DISPATCHER_SECRET missing from runtime/secrets/.env.local`);
    return { ok: false };
  }
  if (!anonKey) {
    console.log(`  ${cross()} SUPABASE_ANON_KEY missing from runtime/secrets/.env.local`);
    return { ok: false };
  }
  if (!accessToken) {
    console.log(`  ${warn()} SUPABASE_ACCESS_TOKEN not found; post-tick verify will be skipped`);
  }

  // Step 2: invoke dispatcher.
  console.log(`  ${dot()} Invoking dispatcher → consistency-sweep-nightly...`);
  const url = 'https://mntobbmieuoaxipnjaau.supabase.co/functions/v1/scheduled-run-dispatcher';
  const fetchFn = (typeof fetch !== 'undefined') ? fetch : null;
  if (!fetchFn) {
    console.log(`  ${cross()} fetch() not available; need Node 18+`);
    return { ok: false };
  }
  let runId;
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'x-dispatcher-auth': dispatcherSecret,
      },
      body: JSON.stringify({ schedule_id: 'consistency-sweep-nightly' }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.log(`  ${cross()} Dispatcher returned ${res.status}: ${text.slice(0, 200)}`);
      return { ok: false };
    }
    const body = await res.json();
    runId = body.run_id;
    console.log(`  ${tick()} Queued run_id=${runId} (state=${body.status})`);
  } catch (e) {
    console.log(`  ${cross()} Dispatcher call failed: ${e.message}`);
    return { ok: false };
  }

  if (!accessToken) {
    console.log(`  ${warn()} No SUPABASE_ACCESS_TOKEN — skip wait + verify. Check Supabase Studio manually.`);
    return { ok: true, run_id: runId, verified: false };
  }

  // Step 3: wait for pg_cron tick (~75s).
  console.log(`  ${dot()} Waiting 75s for pg_cron minion-worker-tick to claim + execute...`);
  await new Promise((r) => setTimeout(r, 75000));

  // Step 4: query consistency_checks via Supabase CLI (uses access token).
  console.log(`  ${dot()} Querying ops.consistency_checks...`);
  const supabasePath = require('child_process').execSync('which supabase', { encoding: 'utf-8' }).trim();
  const query = `SELECT invariant_id, state, severity, drift_description FROM ops.consistency_checks WHERE created_at > now() - interval '3 minutes' ORDER BY created_at DESC LIMIT 5;`;
  const queryResult = spawnSync(
    supabasePath,
    ['db', 'query', '--linked', query],
    {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken },
      timeout: 30000,
    }
  );
  if (queryResult.status !== 0) {
    console.log(`  ${cross()} Query failed: ${(queryResult.stderr || '').slice(0, 300)}`);
    return { ok: false, run_id: runId };
  }
  let rows = [];
  try {
    const parsed = JSON.parse(queryResult.stdout);
    rows = parsed.rows || [];
  } catch {
    console.log(`  ${cross()} Could not parse query result`);
    return { ok: false, run_id: runId };
  }

  let driftCount = 0;
  if (rows.length === 0) {
    console.log(`  ${warn()} No consistency_checks rows in last 3 min — sweep may not have run`);
    return { ok: false, run_id: runId };
  }
  for (const r of rows) {
    const sym = r.state === 'passed' ? tick() : cross();
    const sevTag = r.severity === 'critical' ? c.red(r.severity) : c.yellow(r.severity);
    console.log(`  ${sym} ${r.invariant_id.padEnd(40, ' ')} state=${r.state.padEnd(8)} sev=${sevTag}`);
    if (r.state !== 'passed') {
      driftCount += 1;
      if (r.drift_description) {
        console.log(`    ${c.gray('→ ' + r.drift_description.slice(0, 200))}`);
      }
    }
  }
  return { ok: true, run_id: runId, verified: true, drift_count: driftCount };
}

async function main() {
  const start = Date.now();
  console.log(c.bold('Cross-Tier Consistency Check'));
  console.log(c.gray(`Mode: ${REMOTE ? 'remote (L1+L2+L3)' : FULL ? 'full (L1+L2 incl warn)' : 'default (L1+critical L2)'}`));

  let criticalFailures = 0;
  let warnFailures = 0;

  // === L1 ============================================================
  header('L1 — Tier 1 YAML schemas');
  const r0 = runNodeCheck('validate-tier1.cjs', path.join(REPO_ROOT, 'scripts/validate-tier1.cjs'));
  if (!r0.passed) criticalFailures += 1;

  header('L1 — pillar numbering convention');
  const rPN = runNodeCheck('validate-pillar-numbering.cjs', path.join(CT_DIR, 'validate-pillar-numbering.cjs'));
  if (!rPN.passed) criticalFailures += 1;

  // === L2 critical ===================================================
  header('L2 — cross-tier validators (critical)');
  for (const v of [
    ['validate-manifest-db.cjs', 'manifest ↔ migrations'],
    ['validate-skills-references.cjs', '.from() ↔ migrations'],
    ['validate-schedules-skills.cjs', 'schedules ↔ skill registry'],
    ['validate-personas.cjs', 'workforce personas ↔ ROLES.md ↔ runtime'],
    ['validate-cla-routing-keywords.cjs', 'cla routing ↔ personas ↔ ROLES.md'],
    ['validate-eval-evo-schemas.cjs', 'eval-evo playbook + cases schemas'],
    ['validate-resolver-v2-schema.cjs', 'resolver-v2 catalog ↔ schema'],
    ['validate-resolver-v2-uniqueness.cjs', 'resolver-v2 recipient ID uniqueness'],
    ['validate-resolver-v2-link-integrity.cjs', 'resolver-v2 composes_with link integrity'],
    // capability gbrain-operational-brain v1.0 Sprint 6 — 2 NEW L2 validators
    ['validate-mcp-json-tools-consistency.cjs', '.mcp.json ↔ knowledge/mcp-tools.yaml'],
    ['validate-gbrain-invariant-handlers.cjs', 'gbrain L1/L2/L3 invariant handlers'],
    // capability resolver-v3-jit-loading Sprint 1 — INDEX.md consistency
    ['validate-resolver-v3-index-consistency.cjs', 'resolver-v3 INDEX.md ↔ catalog'],
  ]) {
    const r = runNodeCheck(v[1], path.join(CT_DIR, v[0]));
    if (!r.passed) criticalFailures += 1;
  }

  // === L2 warn (optional) ============================================
  if (FULL) {
    header('L2 — cross-tier validators (warn)');
    for (const v of [
      ['validate-governance-roles.cjs', 'governance/ROLES ↔ skills'],
      ['validate-hitl-hooks.cjs', 'HITL.md Tier-D ↔ hooks'],
      ['validate-wiki-integrity.cjs', 'wiki-integrity (file/frontmatter)'],
      ['validate-resolver-v2-coverage.cjs', 'resolver-v2 catalog coverage (warn-only)'],
    ]) {
      const r = runNodeCheck(v[1], path.join(CT_DIR, v[0]), 'warn');
      if (!r.passed) warnFailures += 1;
    }
  } else {
    console.log(c.gray('\n  (--full to also run warn-tier validators: governance-roles, hitl-hooks)'));
  }

  // === L3 (optional) =================================================
  let remoteResult = null;
  if (REMOTE) {
    header('L3 — live-DB sweep (remote)');
    remoteResult = await triggerL3Sweep();
    if (remoteResult.drift_count > 0) {
      criticalFailures += remoteResult.drift_count;
    }
  } else if (FULL) {
    console.log(c.gray('\n  (--remote to also trigger L3 nightly sweep against live DB)'));
  }

  // === Summary =======================================================
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('');
  console.log(c.bold('─'.repeat(72)));
  if (criticalFailures === 0 && warnFailures === 0) {
    console.log(`${tick()} ${c.green(c.bold('ALL CHECKS CLEAN'))}  (${elapsed}s)`);
    process.exit(0);
  }
  if (criticalFailures > 0) {
    console.log(`${cross()} ${c.red(c.bold(`${criticalFailures} CRITICAL DRIFT`))} + ${warnFailures} warn  (${elapsed}s)`);
    console.log(c.gray('  → CI will fail. Fix or run with --no-verify to push anyway.'));
    process.exit(1);
  }
  console.log(`${warn()} ${c.yellow(c.bold(`${warnFailures} WARN drift`))} (no critical)  (${elapsed}s)`);
  console.log(c.gray('  → Not CI-blocking. Heuristic gaps; review when convenient.'));
  process.exit(3);
}

main().catch((e) => {
  console.error(c.red(`\nFATAL: ${e.message}`));
  console.error(e.stack);
  process.exit(2);
});
