#!/usr/bin/env node
'use strict';
/**
 * scripts/local-install/update.cjs
 *
 * The engine behind `/update-ritsu-works`: pull the latest ritsu-works and
 * re-sync dependencies, cross-platform.
 *
 *   node scripts/local-install/update.cjs            # plan (fetch + status, no pull)
 *   node scripts/local-install/update.cjs --apply     # pull --ff-only + re-install
 *   node scripts/local-install/update.cjs --apply --with-docs
 *   node scripts/local-install/update.cjs --json
 *
 * Safety: never pulls over a dirty tree (reports + aborts so the user decides);
 * uses --ff-only so it never creates surprise merge commits. The re-install step
 * reuses install.cjs's deterministic core.
 */

const { run: defaultRun, which: defaultWhich } = require('./lib/exec.cjs');
const { repoRootFrom } = require('./doctor.cjs');
const { runInstall } = require('./install.cjs');
const { Reporter } = require('./lib/report.cjs');

/** Inspect the git working tree. Pure over an injected runner. */
function gitStatus(ctx) {
  const { run, repoRoot } = ctx;
  const git = (args) => run('git', args, { cwd: repoRoot, shell: false, timeout: 30000 });

  const branchRes = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const branch = branchRes.ok ? branchRes.stdout.trim() : null;

  // Ignore artifacts that are deterministically regenerated and not meaningful
  // to a pull: the skillopt vendor submodule (patched by postinstall) and the
  // _shared/*.generated.ts bundles (rewritten by the bundler vitest tests).
  const IGNORE_DIRTY = [/vendor\/skillopt/, /_shared\/.*\.generated\.ts/, /pnpm-lock\.yaml$/];
  const dirtyRes = git(['status', '--porcelain']);
  const dirtyLines = dirtyRes.ok
    ? dirtyRes.stdout.split('\n').filter((l) => l.trim() && !IGNORE_DIRTY.some((re) => re.test(l)))
    : [];
  const dirty = dirtyLines.length > 0;

  const upstreamRes = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const upstream = upstreamRes.ok ? upstreamRes.stdout.trim() : null;

  return { ok: branchRes.ok, branch, dirty, dirtyCount: dirtyLines.length, upstream };
}

/** Orchestrate the update. */
function runUpdate(opts = {}) {
  const apply = opts.apply === true;
  const run = opts.run || defaultRun;
  const which = opts.which || defaultWhich;
  const repoRoot = opts.repoRoot || repoRootFrom(__dirname);
  const reporter = opts.reporter || new Reporter({ json: opts.json });
  const git = (args, o = {}) => run('git', args, { cwd: repoRoot, shell: false, timeout: 120000, ...o });

  reporter.banner(apply ? 'Updating ritsu-works' : 'Update plan (dry-run — pass --apply to pull + re-install)');

  // 1. fetch (read-only, always safe)
  reporter.header('Fetch latest');
  const fetchRes = git(['fetch', '--all', '--prune']);
  if (fetchRes.ok) reporter.ok('fetched origin');
  else { reporter.fail(`git fetch failed: ${(fetchRes.stderr || '').slice(-200)}`); return finish(reporter, false, opts); }

  // 2. status
  const status = gitStatus({ run, repoRoot });
  reporter.info(`branch: ${status.branch || '(unknown)'}  ·  upstream: ${status.upstream || '(none)'}`);
  if (status.dirty) {
    reporter.warn(`working tree has ${status.dirtyCount} uncommitted change(s) — commit or stash before updating`);
    if (apply) {
      reporter.verdict('fail', 'Update aborted: working tree not clean. Commit/stash your changes, then re-run.');
      return finish(reporter, false, opts);
    }
  }

  // 3. show what's incoming
  const upstreamRef = status.upstream || 'origin/main';
  const logRes = git(['log', '--oneline', `HEAD..${upstreamRef}`]);
  const incoming = logRes.ok ? logRes.stdout.split('\n').filter(Boolean) : [];
  if (incoming.length === 0) reporter.ok('already up to date with ' + upstreamRef);
  else { reporter.info(`${incoming.length} new commit(s) on ${upstreamRef}:`); for (const c of incoming.slice(0, 8)) reporter.note(c); }

  if (!apply) {
    reporter.verdict('warn', incoming.length ? `Dry-run: ${incoming.length} commit(s) to pull. Re-run with --apply.` : 'Dry-run: nothing to pull.');
    return finish(reporter, true, opts);
  }

  // 4. pull --ff-only
  if (incoming.length > 0) {
    reporter.header('Pull');
    const pullArgs = status.upstream ? ['pull', '--ff-only'] : ['pull', '--ff-only', 'origin', 'main'];
    const pullRes = git(pullArgs);
    if (pullRes.ok) reporter.ok('pulled (fast-forward)');
    else { reporter.fail(`git pull failed: ${(pullRes.stderr || '').slice(-200)}`); reporter.note('Resolve manually (e.g. `git pull --rebase`), then re-run.'); return finish(reporter, false, opts); }
  }

  // 5. re-install deps (they may have changed)
  reporter.header('Re-sync dependencies');
  const install = runInstall({ apply: true, withDocs: opts.withDocs, run, which, repoRoot, reporter });

  const ok = install.ok;
  if (ok) reporter.verdict('ok', 'Update complete. Run /test-ritsu-works to verify the system.');
  else reporter.verdict('fail', 'Update pulled, but dependency re-sync had failures. See above.');
  return finish(reporter, ok, opts);
}

function finish(reporter, ok, opts) {
  return { ok, captured: reporter.captured ? reporter.captured() : '' };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    apply: args.includes('--apply'),
    withDocs: args.includes('--with-docs'),
    json: args.includes('--json'),
  };
}

function main(argv) {
  const opts = parseArgs(argv);
  const result = runUpdate(opts);
  if (opts.json) process.stdout.write(JSON.stringify({ ok: result.ok }, null, 2) + '\n');
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { gitStatus, runUpdate, parseArgs };
