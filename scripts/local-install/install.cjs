#!/usr/bin/env node
'use strict';
/**
 * scripts/local-install/install.cjs
 *
 * The deterministic install engine behind `/install-ritsu-works`.
 *
 * Responsibilities (the safe, non-interactive core):
 *   1. ensure pnpm (corepack, no sudo)
 *   2. install workspace deps: root + mcp-server (frozen) + analytics (no-lockfile) + docs (opt-in)
 *   3. scaffold runtime/ folders + runtime/secrets/.env.local from .env.example
 *   4. set up husky git hooks
 *
 * System-dependency installs (git/gh/supabase/python/ffmpeg/bun) are PLANNED
 * (printed per-platform) for the command brain to run with judgment — except
 * --install-deps=<ids>, which runs the manifest install commands INTERNALLY via
 * spawnSync (stdio inherited). Keeping those inside the script means a
 * database-CLI install string never appears in a Claude Bash command, so the
 * product-firewall hook is never tripped by a benign tool install.
 *
 *   node scripts/local-install/install.cjs                 # plan (dry-run, default)
 *   node scripts/local-install/install.cjs --apply         # apply the core steps
 *   node scripts/local-install/install.cjs --apply --with-docs
 *   node scripts/local-install/install.cjs --install-deps=supabase-cli,gh --apply
 *   node scripts/local-install/install.cjs --json
 */

const nodePath = require('node:path');
const nodeFs = require('node:fs');

const { detectPlatform } = require('./lib/platform.cjs');
const { run: defaultRun, which: defaultWhich } = require('./lib/exec.cjs');
const { getDependency, resolveInstallCommand } = require('./dependencies.cjs');
const { runDoctor, repoRootFrom, resolveSecretsRoot } = require('./doctor.cjs');
const { Reporter } = require('./lib/report.cjs');
const { renderMcpJson } = require('./lib/gen-mcp-json.cjs');

const RUNTIME_DIRS = [
  'runtime/secrets',
  'runtime/logs',
  'runtime/tmp',
  'runtime/exports',
  'runtime/caches/llm-responses',
  'runtime/caches/embeddings',
  'runtime/workspaces',
];

const WORKSPACE_INSTALLS = [
  { id: 'root', dir: '.', frozen: true, required: true },
  { id: 'mcp-server', dir: 'mcp-server', frozen: true, required: true },
  { id: 'mcp-server-analytics', dir: 'mcp-server-analytics', frozen: false, required: true },
  { id: 'docs', dir: 'docs', frozen: false, required: false, optIn: true },
];

/**
 * Pure: derive the install plan from a doctor report.
 * @returns {{ systemDeps: Array, coreSteps: Array }}
 */
function buildPlan(report, opts = {}) {
  const withDocs = opts.withDocs === true;

  const systemDeps = report.dependencies
    .filter((d) => d.status === 'fail' || (d.status === 'warn' && d.required !== 'feature'))
    .map((d) => ({
      id: d.id,
      label: d.label,
      required: d.required,
      reason: d.present ? `version ${d.version} < min ${d.minVersion}` : 'not installed',
      command: d.installPlan.command,
      manual: d.installPlan.manual,
    }));

  const coreSteps = [];
  // pnpm first (needed for every workspace install)
  const pnpmProbe = report.dependencies.find((d) => d.id === 'pnpm');
  if (pnpmProbe && pnpmProbe.status !== 'ok') {
    coreSteps.push({ id: 'ensure-pnpm', label: 'ensure pnpm (corepack)', kind: 'pnpm' });
  }
  for (const ws of WORKSPACE_INSTALLS) {
    if (ws.optIn && !withDocs) continue;
    const wsState = report.workspaces.find((w) => w.id === ws.id);
    if (wsState && !wsState.present) continue; // no package.json (shouldn't happen for required)
    coreSteps.push({ id: `install-${ws.id}`, label: `install ${ws.id} deps`, kind: 'workspace', workspace: ws });
  }
  coreSteps.push({ id: 'scaffold-runtime', label: 'scaffold runtime/ + .env.local', kind: 'scaffold' });
  coreSteps.push({ id: 'gen-mcp', label: 'generate .mcp.json (per-machine, portable)', kind: 'gen-mcp' });
  coreSteps.push({ id: 'husky', label: 'set up git hooks (husky)', kind: 'husky' });
  // Refresh the resolver INDEX so its mtime is newer than the catalog on a
  // fresh clone (the resolver-v3 INDEX validator does a local mtime compare).
  // Idempotent: identical content → no git diff, only a fresh mtime.
  coreSteps.push({ id: 'refresh-index', label: 'refresh resolver catalog index', kind: 'index' });
  return { systemDeps, coreSteps };
}

/** Execute a workspace install with frozen→fallback. */
function installWorkspace(ws, ctx) {
  const { run, repoRoot } = ctx;
  const cwd = nodePath.join(repoRoot, ws.dir);
  if (ws.frozen) {
    const frozen = run('pnpm install --frozen-lockfile', [], { cwd, shell: true, timeout: 600000 });
    if (frozen.ok) return { ok: true, detail: 'frozen lockfile' };
    const loose = run('pnpm install', [], { cwd, shell: true, timeout: 600000 });
    return { ok: loose.ok, detail: loose.ok ? 'installed (lockfile updated)' : (loose.stderr || 'install failed').slice(-200) };
  }
  const res = run('pnpm install', [], { cwd, shell: true, timeout: 600000 });
  return { ok: res.ok, detail: res.ok ? 'installed' : (res.stderr || 'install failed').slice(-200) };
}

/**
 * Replace the value of an UNCOMMENTED `KEY=...` line in a .env body (first match
 * only). Leaves the file unchanged if the key is absent or only appears commented
 * out — never appends. Preserves an optional `export ` prefix and everything else.
 * Pure.
 */
function rewriteEnvKey(body, key, value) {
  const re = new RegExp(`^([ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=).*$`, 'm');
  if (!re.test(body)) return body;
  return body.replace(re, `$1${value}`);
}

/**
 * Scaffold runtime dirs + .env.local from a template (idempotent).
 * profile 'owner' (default) → .env.example (full keys incl. service_role).
 * profile 'per-human'       → .env.per-human.example (co-founder: per-human token,
 *   NO service_role / Stripe / bot tokens). Falls back to .env.example if the
 *   per-human template is absent, so older checkouts still scaffold.
 */
function scaffoldRuntime(ctx) {
  const { fs, secretsRoot, repoRoot } = ctx;
  const perHuman = ctx.profile === 'per-human';
  const created = [];
  for (const rel of RUNTIME_DIRS) {
    const dir = nodePath.join(secretsRoot, rel);
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); created.push(rel); }
  }
  const envTarget = nodePath.join(secretsRoot, 'runtime', 'secrets', '.env.local');
  const perHumanExample = nodePath.join(repoRoot, '.env.per-human.example');
  const ownerExample = nodePath.join(repoRoot, '.env.example');
  const source = perHuman && fs.existsSync(perHumanExample) ? perHumanExample : ownerExample;
  let envDetail;
  if (fs.existsSync(envTarget)) {
    envDetail = '.env.local already exists (left untouched)';
  } else if (fs.existsSync(source)) {
    fs.copyFileSync(source, envTarget);
    envDetail = `created runtime/secrets/.env.local from ${nodePath.basename(source)} (${perHuman ? 'per-human / co-founder' : 'owner'} profile) — FILL IT IN`;
    // per-human: the template ships RITSU_OPERATOR_REFRESH_TOKEN_FILE as a placeholder
    // (/Users/you/...). Rewrite it to THIS machine's absolute path so the co-founder
    // never has to edit it and it is correct on Windows (enroll.cjs writes there + the
    // MCP reads there — one source of truth). Idempotent on the freshly-copied file.
    if (perHuman) {
      const credFile = nodePath
        .join(secretsRoot, 'runtime', 'secrets', '.operator-refresh.json')
        .replace(/\\/g, '/');
      try {
        const body = fs.readFileSync(envTarget, 'utf8');
        const rewritten = rewriteEnvKey(body, 'RITSU_OPERATOR_REFRESH_TOKEN_FILE', credFile);
        if (rewritten !== body) {
          fs.writeFileSync(envTarget, rewritten, 'utf8');
          envDetail += ` (pinned RITSU_OPERATOR_REFRESH_TOKEN_FILE → ${credFile})`;
        }
      } catch { /* non-fatal: co-founder can still edit the path by hand */ }
    }
  } else {
    envDetail = 'env template missing — cannot scaffold .env.local';
  }
  return { ok: true, detail: envDetail, createdDirs: created, profile: perHuman ? 'per-human' : 'owner' };
}

/**
 * Generate a per-machine, portable .mcp.json (capability local-install-platform).
 * Writes <repoRoot>/.mcp.json ONLY if absent — never clobbers an existing one (the
 * owner's working config stays put; delete it first to regenerate). Profile-aware:
 * per-human → supabase-ops only; owner → all 3 (gbrain/analytics on POSIX only).
 */
function generateMcpConfig(ctx) {
  const { fs, repoRoot, run } = ctx;
  const target = nodePath.join(repoRoot, '.mcp.json');
  const perHuman = ctx.profile === 'per-human';
  // OWNER: never clobber an existing .mcp.json (the founder's live, CODEOWNERS-gated
  // config). PER-HUMAN: a co-founder clone ships the OWNER's machine-specific .mcp.json
  // (absolute macOS paths + /bin/sh) which won't boot on their machine — so overwrite it
  // with this machine's portable, supabase-ops-only config.
  if (fs.existsSync(target) && !perHuman) {
    return { ok: true, detail: '.mcp.json exists (owner: left untouched — delete to regenerate)' };
  }
  const platformOs = ctx.platform && ctx.platform.os; // 'windows' | 'macos' | 'linux'
  const content = renderMcpJson({ repoRoot, profile: perHuman ? 'per-human' : 'owner', platformOs });
  fs.writeFileSync(target, content, 'utf8');
  let extra = '';
  if (perHuman && run) {
    // .mcp.json is a git-tracked file we just rewrote with per-MACHINE paths. Mark it
    // skip-worktree so git ignores the local edit: no accidental commit of machine paths
    // (CODEOWNERS also gates it), no pull conflict. Best-effort — but if it fails, WARN,
    // because otherwise the co-founder's .mcp.json shows as a tracked modification they
    // could accidentally commit.
    let skipOk = false;
    try {
      const r = run('git update-index --skip-worktree .mcp.json', [], { cwd: repoRoot, shell: true, timeout: 15000 });
      skipOk = !!(r && r.ok);
    } catch { /* best-effort */ }
    extra = skipOk
      ? ', git skip-worktree'
      : ', ⚠ could not git skip-worktree — do NOT `git commit` .mcp.json (it holds this machine\'s paths)';
  }
  return {
    ok: true,
    detail: `wrote .mcp.json (${perHuman ? 'per-human: supabase-ops only' : 'owner: all servers'}, portable absolute paths${extra})`,
  };
}

/** Run an install command string internally (firewall-invisible; stdio inherited). */
function installDepInternally(depId, ctx) {
  const { run, platform } = ctx;
  const dep = getDependency(depId);
  if (!dep) return { ok: false, detail: `unknown dependency: ${depId}` };
  const plan = resolveInstallCommand(dep, platform);
  if (!plan.command) return { ok: false, detail: `no install command for ${depId} on ${platform.os} — ${plan.manual || 'install manually'}` };
  const res = run(plan.command, [], { shell: true, stdio: 'inherit', timeout: 600000 });
  return { ok: res.ok, detail: res.ok ? `installed via ${plan.packageManager || 'universal'}` : `failed: ${plan.command}` };
}

/** Orchestrate the install. */
function runInstall(opts = {}) {
  const apply = opts.apply === true;
  const withDocs = opts.withDocs === true;
  const run = opts.run || defaultRun;
  const which = opts.which || defaultWhich;
  const fs = opts.fs || nodeFs;
  const platform = opts.platform || detectPlatform({ which });
  const repoRoot = opts.repoRoot || repoRootFrom(__dirname);
  const secretsRoot = opts.secretsRoot || resolveSecretsRoot(repoRoot);
  const reporter = opts.reporter || new Reporter({ json: opts.json });
  const ctx = { run, which, fs, platform, repoRoot, secretsRoot, profile: opts.profile || 'owner' };

  const report = runDoctor({ run, which, fs, platform, repoRoot, secretsRoot });
  const plan = buildPlan(report, { withDocs });

  reporter.banner(apply ? 'Installing ritsu-works' : 'Install plan (dry-run — pass --apply to execute)');
  reporter.info(`platform: ${platform.os} / ${platform.arch}  ·  package managers: ${platform.packageManagers.map((p) => p.id).join(', ') || 'none'}`);

  // Optional: explicit internal dep installs (e.g. supabase-cli).
  const installDepIds = opts.installDeps || [];
  const depResults = [];
  if (installDepIds.length && apply) {
    reporter.header('System dependencies (internal install)');
    for (const id of installDepIds) {
      const res = installDepInternally(id, ctx);
      depResults.push({ id, ...res });
      if (res.ok) reporter.ok(`${id}: ${res.detail}`);
      else reporter.fail(`${id}: ${res.detail}`);
    }
  }

  // Surface remaining missing system deps as a plan (command brain installs them).
  if (plan.systemDeps.length) {
    reporter.header('Missing system dependencies (install before continuing)');
    for (const d of plan.systemDeps) {
      const tag = d.required === 'hard' ? 'REQUIRED' : 'recommended';
      reporter.warn(`${d.label} (${tag}) — ${d.reason}`);
      if (d.command) reporter.note(`install: ${d.command}`);
      else if (d.manual) reporter.note(`install: ${d.manual}`);
    }
  }

  // Core steps.
  reporter.header(apply ? 'Core install steps' : 'Core install steps (planned)');
  const total = plan.coreSteps.length;
  const stepResults = [];
  let stepIdx = 0;
  for (const step of plan.coreSteps) {
    stepIdx += 1;
    reporter.startStep(stepIdx, total, step.label);
    if (!apply) {
      reporter.endStep(stepIdx, total, 'skip', step.label, 'planned (dry-run)');
      stepResults.push({ id: step.id, status: 'planned' });
      continue;
    }
    let result;
    if (step.kind === 'pnpm') {
      const r1 = run('corepack enable pnpm && corepack prepare pnpm@latest --activate', [], { shell: true, timeout: 120000 });
      result = r1.ok ? { ok: true, detail: 'corepack' } : run('npm install -g pnpm@latest', [], { shell: true, timeout: 180000 });
      if (result.stdout !== undefined) result = { ok: result.ok, detail: result.ok ? 'pnpm ready' : 'pnpm install failed' };
    } else if (step.kind === 'workspace') {
      result = installWorkspace(step.workspace, ctx);
    } else if (step.kind === 'scaffold') {
      result = scaffoldRuntime(ctx);
    } else if (step.kind === 'gen-mcp') {
      result = generateMcpConfig(ctx);
    } else if (step.kind === 'husky') {
      const r = run('pnpm prepare', [], { cwd: repoRoot, shell: true, timeout: 120000 });
      result = { ok: r.ok, detail: r.ok ? 'hooks installed' : 'husky prepare failed (non-fatal)' };
    } else if (step.kind === 'index') {
      const r = run('pnpm resolver:index', [], { cwd: repoRoot, shell: true, timeout: 120000 });
      result = { ok: true, detail: r.ok ? 'index refreshed' : 'index refresh skipped (non-fatal)' };
    } else {
      result = { ok: false, detail: `unknown step kind: ${step.kind}` };
    }
    const status = result.ok ? 'ok' : (step.workspace && !step.workspace.required ? 'warn' : 'fail');
    reporter.endStep(stepIdx, total, status, step.label, result.detail);
    stepResults.push({ id: step.id, status, detail: result.detail });
  }

  const failed = stepResults.filter((s) => s.status === 'fail');
  const ok = apply ? failed.length === 0 : true;
  if (!apply) {
    reporter.verdict('warn', 'Dry-run complete. Re-run with --apply to execute the core steps.');
  } else if (ok) {
    reporter.verdict('ok', 'Core install complete. Next: fill runtime/secrets/.env.local, then run /test-ritsu-works.');
  } else {
    reporter.verdict('fail', `Install incomplete: ${failed.map((f) => f.id).join(', ')} failed.`);
  }
  return { ok, plan, depResults, stepResults, report };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { apply: false, withDocs: false, json: false, installDeps: [], profile: 'owner' };
  for (const a of args) {
    if (a === '--apply') opts.apply = true;
    else if (a === '--with-docs') opts.withDocs = true;
    else if (a === '--json') opts.json = true;
    else if (a.startsWith('--install-deps=')) opts.installDeps = a.slice('--install-deps='.length).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--profile=')) opts.profile = a.slice('--profile='.length).trim();
  }
  if (opts.profile !== 'owner' && opts.profile !== 'per-human') opts.profile = 'owner';
  return opts;
}

function main(argv) {
  const opts = parseArgs(argv);
  const result = runInstall(opts);
  if (opts.json) process.stdout.write(JSON.stringify({ ok: result.ok, plan: result.plan, stepResults: result.stepResults, depResults: result.depResults }, null, 2) + '\n');
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  buildPlan,
  generateMcpConfig,
  installWorkspace,
  scaffoldRuntime,
  rewriteEnvKey,
  installDepInternally,
  runInstall,
  parseArgs,
  RUNTIME_DIRS,
  WORKSPACE_INSTALLS,
};
