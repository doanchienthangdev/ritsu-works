#!/usr/bin/env node
'use strict';
/**
 * scripts/local-install/test-suite/run.cjs
 *
 * The ritsu-works full system test suite — the engine behind `/test-ritsu-works`.
 * Runs every group in groups.cjs, streams [i/N] progress, and (optionally)
 * self-heals failures by running each group's autoRemedy once before a retry.
 *
 *   node scripts/local-install/test-suite/run.cjs            # full suite (no docs)
 *   node scripts/local-install/test-suite/run.cjs --heal      # + auto-remedy + retry
 *   node scripts/local-install/test-suite/run.cjs --quick     # skip slow groups (vitest)
 *   node scripts/local-install/test-suite/run.cjs --full      # + cold docs build
 *   node scripts/local-install/test-suite/run.cjs --only=drift,unit
 *   node scripts/local-install/test-suite/run.cjs --json
 *
 * Verdict: success iff every HARD group passes. recommended/feature failures
 * are reported as warnings and never block "installation successful".
 *
 * Exit: 0 on success, 1 if any HARD group failed.
 */

const nodePath = require('node:path');
const nodeFs = require('node:fs');

const { run: defaultRun, which: defaultWhich } = require('../lib/exec.cjs');
const { detectPlatform } = require('../lib/platform.cjs');
const { Reporter } = require('../lib/report.cjs');
const { runDoctor, repoRootFrom, resolveSecretsRoot } = require('../doctor.cjs');
const { selectGroups, CAPABILITY_FILES } = require('./groups.cjs');

function lastLines(text, n = 6) {
  return (text || '').trim().split('\n').slice(-n).join('\n');
}

// ---- Probes -------------------------------------------------------------

function probeEnvDeps(doctor) {
  const hard = doctor.dependencies.filter((d) => d.required === 'hard');
  const bad = hard.filter((d) => !(d.present && d.satisfiesMin));
  return bad.length === 0
    ? { status: 'ok', detail: hard.map((d) => `${d.id} ${d.version}`).join(', ') }
    : { status: 'fail', detail: `missing/old: ${bad.map((d) => d.id).join(', ')}` };
}

function probeWorkspaces(doctor) {
  const required = doctor.workspaces.filter((w) => !w.optional);
  const bad = required.filter((w) => w.present && !w.installed);
  return bad.length === 0
    ? { status: 'ok', detail: 'all installed' }
    : { status: 'fail', detail: `not installed: ${bad.map((w) => w.id).join(', ')}` };
}

function probeEnvWiring(doctor) {
  if (!doctor.env.exists) return { status: 'warn', detail: '.env.local not found' };
  const unset = doctor.env.keys.filter((k) => k.state !== 'set');
  return unset.length === 0
    ? { status: 'ok', detail: 'Supabase keys set' }
    : { status: 'warn', detail: `${unset.map((k) => k.key).join(', ')} ${unset.length === 1 ? 'is' : 'are'} not set` };
}

function probeCommands(repoRoot, fs) {
  const missing = [];
  const malformed = [];
  for (const rel of CAPABILITY_FILES) {
    const full = nodePath.join(repoRoot, rel);
    if (!fs.existsSync(full)) { missing.push(rel); continue; }
    if (rel.endsWith('.md')) {
      const text = fs.readFileSync(full, 'utf8');
      if (!/^---\r?\n[\s\S]*?\r?\n---/.test(text.trimStart())) malformed.push(rel);
    }
  }
  if (missing.length) return { status: 'fail', detail: `missing: ${missing.join(', ')}` };
  if (malformed.length) return { status: 'fail', detail: `no frontmatter: ${malformed.join(', ')}` };
  return { status: 'ok', detail: `${CAPABILITY_FILES.length} files present` };
}

function runProbe(group, ctx, doctor) {
  switch (group.probe) {
    case 'env': return probeEnvDeps(doctor);
    case 'workspaces': return probeWorkspaces(doctor);
    case 'env-wiring': return probeEnvWiring(doctor);
    case 'commands': return probeCommands(ctx.repoRoot, ctx.fs);
    default: return { status: 'fail', detail: `unknown probe: ${group.probe}` };
  }
}

function runShell(group, ctx) {
  const cwd = nodePath.join(ctx.repoRoot, group.cwd || '.');
  const timeout = group.slow ? 900000 : 180000;
  const res = ctx.run(group.command, [], { shell: true, cwd, timeout });
  return res.ok
    ? { status: 'ok', detail: '' }
    : { status: 'fail', detail: lastLines(res.stderr || res.stdout) || `exit ${res.code}` };
}

function execGroup(group, ctx, doctor) {
  return group.kind === 'probe' ? runProbe(group, ctx, doctor) : runShell(group, ctx);
}

// ---- Orchestrator -------------------------------------------------------

function runSuite(opts = {}) {
  const run = opts.run || defaultRun;
  const which = opts.which || defaultWhich;
  const fs = opts.fs || nodeFs;
  const platform = opts.platform || detectPlatform({ which });
  const repoRoot = opts.repoRoot || repoRootFrom(nodePath.join(__dirname, '..'));
  const secretsRoot = opts.secretsRoot || resolveSecretsRoot(repoRoot);
  const reporter = opts.reporter || new Reporter({ json: opts.json });
  const ctx = { run, which, fs, platform, repoRoot, secretsRoot };

  const freshDoctor = () => runDoctor({ run, which, fs, platform, repoRoot, secretsRoot });
  let doctor = freshDoctor();
  const envReady = doctor.env.exists && doctor.env.keys.every((k) => k.state === 'set');

  const groups = selectGroups(opts);
  const total = groups.length;
  reporter.banner('ritsu-works — full system test suite');
  reporter.info(`platform: ${platform.os} / ${platform.arch}  ·  ${total} groups${opts.heal ? '  ·  self-heal on' : ''}`);

  const results = [];
  let index = 0;
  for (const group of groups) {
    index += 1;
    reporter.startStep(index, total, group.label);

    if (group.skipIfNoEnv && !envReady) {
      reporter.endStep(index, total, 'skip', group.label, 'no env wired — skipped');
      results.push({ id: group.id, required: group.required, status: 'skip', detail: 'no env' });
      continue;
    }

    const started = Date.now();
    let res = execGroup(group, ctx, doctor);
    let healed = false;

    if (res.status === 'fail' && opts.heal && group.autoRemedy) {
      reporter.note(`self-heal → ${group.autoRemedy.command}`);
      const remedyCwd = nodePath.join(repoRoot, group.autoRemedy.cwd || '.');
      run(group.autoRemedy.command, [], { shell: true, cwd: remedyCwd, timeout: 600000 });
      doctor = freshDoctor(); // probes need fresh state
      res = execGroup(group, ctx, doctor);
      healed = true;
    }

    let status = res.status;
    if (status === 'fail' && group.required !== 'hard') status = 'warn';
    const ms = Date.now() - started;
    const detailParts = [];
    if (res.detail) detailParts.push(res.detail.replace(/\n/g, ' ⏎ ').slice(0, 160));
    if (healed) detailParts.push('(after self-heal)');
    detailParts.push(`${(ms / 1000).toFixed(1)}s`);
    reporter.endStep(index, total, status, group.label, detailParts.join('  '));
    if ((status === 'fail' || status === 'warn') && group.remedy) reporter.note(`remedy: ${group.remedy}`);

    results.push({ id: group.id, required: group.required, status, detail: res.detail, ms, healed });
  }

  const hardFails = results.filter((r) => r.status === 'fail');
  const warns = results.filter((r) => r.status === 'warn');
  const passed = results.filter((r) => r.status === 'ok');
  const skipped = results.filter((r) => r.status === 'skip');

  if (hardFails.length === 0) {
    const extra = [];
    if (warns.length) extra.push(`${warns.length} warning(s)`);
    if (skipped.length) extra.push(`${skipped.length} skipped`);
    reporter.verdict('ok', `Installation successful — ritsu-works is ready. ${passed.length}/${total} groups passed${extra.length ? '  ·  ' + extra.join(', ') : ''}.`);
  } else {
    reporter.verdict('fail', `${hardFails.length} required group(s) failed: ${hardFails.map((r) => r.id).join(', ')}. Fix the remedy above and re-run (add --heal to auto-retry).`);
  }

  return { ok: hardFails.length === 0, results, doctor };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { json: false, quick: false, full: false, heal: false, only: null };
  for (const a of args) {
    if (a === '--json') opts.json = true;
    else if (a === '--quick') opts.quick = true;
    else if (a === '--full') opts.full = true;
    else if (a === '--heal') opts.heal = true;
    else if (a.startsWith('--only=')) opts.only = a.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean);
  }
  return opts;
}

function main(argv) {
  const opts = parseArgs(argv);
  const result = runSuite(opts);
  if (opts.json) {
    process.stdout.write(JSON.stringify({ ok: result.ok, results: result.results.map((r) => ({ id: r.id, required: r.required, status: r.status, ms: r.ms })) }, null, 2) + '\n');
  }
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  runSuite,
  parseArgs,
  probeEnvDeps,
  probeWorkspaces,
  probeEnvWiring,
  probeCommands,
  runProbe,
  runShell,
  execGroup,
  lastLines,
};
