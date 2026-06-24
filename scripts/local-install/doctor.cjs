#!/usr/bin/env node
'use strict';
/**
 * scripts/local-install/doctor.cjs
 *
 * Probe the local machine for everything ritsu-works needs:
 *   - dependencies (node, pnpm, git, gh, supabase CLI, python, ffmpeg, bun)
 *   - workspace installs (root + mcp-server + mcp-server-analytics + docs node_modules)
 *   - env wiring (runtime/secrets/.env.local present + required keys non-placeholder)
 *
 * Pure probe functions (inject run/which/fs/platform) + a CLI wrapper.
 *   node scripts/local-install/doctor.cjs           # human report
 *   node scripts/local-install/doctor.cjs --json     # machine report
 *
 * Exit: 0 if all HARD dependencies are present + satisfy min version, else 1.
 *
 * Never prints secret VALUES — only present / placeholder / missing.
 */

const nodePath = require('node:path');
const nodeFs = require('node:fs');

const { detectPlatform } = require('./lib/platform.cjs');
const { run: defaultRun, which: defaultWhich } = require('./lib/exec.cjs');
const { parseVersion, satisfiesMin, formatVersion } = require('./lib/version.cjs');
const { DEPENDENCIES, resolveInstallCommand } = require('./dependencies.cjs');
const { Reporter } = require('./lib/report.cjs');

const WORKSPACES = [
  { id: 'root', dir: '.', label: 'root deps' },
  { id: 'mcp-server', dir: 'mcp-server', label: 'supabase-ops MCP deps' },
  { id: 'mcp-server-analytics', dir: 'mcp-server-analytics', label: 'analytics MCP deps' },
  { id: 'docs', dir: 'docs', label: 'docs site deps', optional: true },
];

const REQUIRED_ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'];
const PLACEHOLDER_VALUES = new Set(['', 'https://your-project.supabase.co', 'eyJhbGc...', 'your-project-ref']);

function repoRootFrom(dir) {
  return nodePath.resolve(dir, '..', '..');
}

/** runtime/ lives only in the main repo, never in a `.claude/worktrees/<x>` checkout. */
function resolveSecretsRoot(repoRoot) {
  const marker = `${nodePath.sep}.claude${nodePath.sep}worktrees${nodePath.sep}`;
  const idx = repoRoot.indexOf(marker);
  return idx !== -1 ? repoRoot.slice(0, idx) : repoRoot;
}

/** Probe one dependency. ctx = { run, which, platform }. */
function probeDependency(dep, ctx) {
  const { run, which, platform } = ctx;
  const family = platform.isWindows ? 'windows' : 'posix';
  const aliases = dep.detect.aliases || [dep.detect.cmd];

  let foundPath = null;
  let cmdUsed = null;
  for (const alias of aliases) {
    const p = which(alias, { osFamily: family });
    if (p) {
      foundPath = p;
      cmdUsed = alias;
      break;
    }
  }

  let version = null;
  let versionRaw = null;
  if (foundPath) {
    const res = run(cmdUsed, dep.detect.args || ['--version'], { timeout: 15000 });
    const text = `${res.stdout || ''}${res.stderr || ''}`.trim();
    versionRaw = text.split('\n')[0] || null;
    version = parseVersion(text);
  }

  const satisfies = foundPath ? satisfiesMin(version, dep.minVersion) : false;
  return {
    id: dep.id,
    label: dep.label,
    required: dep.required,
    category: dep.category,
    minVersion: dep.minVersion,
    present: !!foundPath,
    path: foundPath,
    version: formatVersion(version),
    versionRaw,
    satisfiesMin: satisfies,
    installPlan: resolveInstallCommand(dep, platform),
    feature: dep.feature || null,
    note: dep.note || null,
    manual: dep.manual || null,
  };
}

/** Classify a dependency probe into a display status. */
function dependencyStatus(probe) {
  if (probe.present && probe.satisfiesMin) return 'ok';
  if (probe.present && !probe.satisfiesMin) return 'warn'; // too old
  if (probe.required === 'hard') return 'fail';
  if (probe.required === 'recommended') return 'warn';
  return 'skip'; // feature, absent
}

/** Probe workspace node_modules presence. */
function probeWorkspaces(repoRoot, fs = nodeFs) {
  return WORKSPACES.map((ws) => {
    const dir = nodePath.join(repoRoot, ws.dir);
    const hasPkg = fs.existsSync(nodePath.join(dir, 'package.json'));
    const hasModules = fs.existsSync(nodePath.join(dir, 'node_modules'));
    return { ...ws, present: hasPkg, installed: hasPkg && hasModules };
  });
}

/** Parse an .env file into a key→value map (never returned to callers wholesale). */
function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

/** Probe env wiring. Returns presence info only — NEVER values. */
function probeEnv(secretsRoot, fs = nodeFs) {
  const envPath = nodePath.join(secretsRoot, 'runtime', 'secrets', '.env.local');
  if (!fs.existsSync(envPath)) {
    return { exists: false, path: envPath, keys: REQUIRED_ENV_KEYS.map((k) => ({ key: k, state: 'missing-file' })) };
  }
  let parsed = {};
  try {
    parsed = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  } catch {
    return { exists: true, path: envPath, keys: REQUIRED_ENV_KEYS.map((k) => ({ key: k, state: 'unreadable' })) };
  }
  const keys = REQUIRED_ENV_KEYS.map((key) => {
    const val = parsed[key];
    let state;
    if (val === undefined) state = 'missing';
    else if (PLACEHOLDER_VALUES.has(val) || val.includes('your-project')) state = 'placeholder';
    else state = 'set';
    return { key, state };
  });
  return { exists: true, path: envPath, keys };
}

/** Run the full doctor probe. Returns a structured DoctorReport. */
function runDoctor(opts = {}) {
  const run = opts.run || defaultRun;
  const which = opts.which || defaultWhich;
  const fs = opts.fs || nodeFs;
  const platform = opts.platform || detectPlatform({ which });
  const repoRoot = opts.repoRoot || repoRootFrom(__dirname);
  const secretsRoot = opts.secretsRoot || resolveSecretsRoot(repoRoot);

  const ctx = { run, which, platform };
  const dependencies = DEPENDENCIES.map((dep) => {
    const probe = probeDependency(dep, ctx);
    probe.status = dependencyStatus(probe);
    return probe;
  });
  const workspaces = probeWorkspaces(repoRoot, fs);
  const env = probeEnv(secretsRoot, fs);

  const hardMissing = dependencies.filter((d) => d.required === 'hard' && d.status === 'fail');
  const tooOld = dependencies.filter((d) => d.present && !d.satisfiesMin);
  const summary = {
    ok: hardMissing.length === 0 && tooOld.length === 0,
    hardMissing: hardMissing.map((d) => d.id),
    tooOld: tooOld.map((d) => d.id),
    workspacesMissing: workspaces.filter((w) => w.present && !w.installed).map((w) => w.id),
    envReady: env.exists && env.keys.every((k) => k.state === 'set'),
  };

  return { platform, repoRoot, secretsRoot, dependencies, workspaces, env, summary };
}

/** Print a human-readable doctor report. */
function printDoctor(report, reporter) {
  const r = reporter || new Reporter();
  r.banner('ritsu-works doctor');
  r.info(`platform: ${report.platform.os} / ${report.platform.arch}  ·  shell: ${report.platform.shell}`);
  const pms = report.platform.packageManagers.map((p) => p.id).join(', ') || 'none detected';
  r.info(`package managers: ${pms}`);

  r.header('Dependencies');
  for (const d of report.dependencies) {
    const reqTag = d.required === 'hard' ? 'required' : d.required;
    if (d.status === 'ok') r.ok(`${d.label.padEnd(16)} ${d.version}  (${reqTag})`);
    else if (d.status === 'warn' && d.present) r.warn(`${d.label.padEnd(16)} ${d.version} < min ${d.minVersion}  (${reqTag}) — upgrade needed`);
    else if (d.status === 'warn') r.warn(`${d.label.padEnd(16)} missing  (${reqTag})${d.feature ? ' — ' + d.feature : ''}`);
    else if (d.status === 'skip') r.skip(`${d.label.padEnd(16)} missing  (optional — ${d.feature || 'feature'})`);
    else r.fail(`${d.label.padEnd(16)} MISSING  (required)`);
    if (d.status === 'fail' || (d.status === 'warn' && d.required !== 'feature')) {
      if (d.installPlan.command) r.note(`install: ${d.installPlan.command}`);
      else if (d.manual) r.note(`install: ${d.manual}`);
    }
  }

  r.header('Workspaces (node_modules)');
  for (const w of report.workspaces) {
    if (!w.present) { if (!w.optional) r.warn(`${w.label.padEnd(28)} package.json absent`); continue; }
    if (w.installed) r.ok(`${w.label.padEnd(28)} installed`);
    else if (w.optional) r.skip(`${w.label.padEnd(28)} not installed (optional)`);
    else r.warn(`${w.label.padEnd(28)} NOT installed — run install`);
  }

  r.header('Env wiring (runtime/secrets/.env.local)');
  if (!report.env.exists) {
    r.warn('.env.local not found — copy .env.example and fill credentials');
  } else {
    for (const k of report.env.keys) {
      if (k.state === 'set') r.ok(`${k.key.padEnd(24)} set`);
      else if (k.state === 'placeholder') r.warn(`${k.key.padEnd(24)} still a placeholder — fill it`);
      else r.warn(`${k.key.padEnd(24)} ${k.state}`);
    }
  }

  const s = report.summary;
  if (s.ok && s.envReady) r.verdict('ok', 'All dependencies present + env wired. Ready.');
  else if (s.ok) r.verdict('warn', 'Dependencies OK; env not fully wired (fill runtime/secrets/.env.local).');
  else r.verdict('fail', `Missing required: ${s.hardMissing.join(', ') || s.tooOld.join(', ')}. Run /install-ritsu-works.`);
  return r;
}

function main(argv) {
  const args = new Set(argv.slice(2));
  const asJson = args.has('--json');
  const report = runDoctor();
  if (asJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    printDoctor(report);
  }
  process.exit(report.summary.ok ? 0 : 1);
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  probeDependency,
  dependencyStatus,
  probeWorkspaces,
  probeEnv,
  parseEnvFile,
  runDoctor,
  printDoctor,
  repoRootFrom,
  resolveSecretsRoot,
  WORKSPACES,
  REQUIRED_ENV_KEYS,
};
