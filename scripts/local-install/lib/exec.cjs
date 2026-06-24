'use strict';
/**
 * scripts/local-install/lib/exec.cjs
 *
 * Cross-platform command execution + PATH lookup for the local-install platform.
 *
 * Everything is dependency-injectable (spawnSync, fs, env) so the engine can be
 * unit-tested without touching the real machine. The default exports wire up the
 * real Node implementations.
 */

const nodePath = require('node:path');

/**
 * Build a `run(cmd, args, opts)` function over an injectable spawnSync.
 * Returns a normalized result: { ok, code, stdout, stderr, error }.
 * Never throws — failures surface in the returned object.
 */
function makeRunner(spawnSyncImpl) {
  const spawnSync = spawnSyncImpl || require('node:child_process').spawnSync;
  return function run(cmd, args = [], opts = {}) {
    const result = spawnSync(cmd, args, {
      encoding: 'utf8',
      shell: opts.shell === true,
      timeout: opts.timeout != null ? opts.timeout : 120000,
      cwd: opts.cwd,
      env: opts.env || process.env,
      maxBuffer: opts.maxBuffer || 32 * 1024 * 1024,
      windowsHide: true,
    });
    const stdout = (result.stdout || '').toString();
    const stderr = (result.stderr || '').toString();
    return {
      ok: result.status === 0,
      code: result.status,
      stdout,
      stderr,
      error: result.error || null,
    };
  };
}

const defaultRun = makeRunner();

/**
 * Resolve the OS family ('windows' | 'posix') without importing platform.cjs
 * (keeps this module dependency-free for `which`).
 */
function osFamily(platformId) {
  const id = platformId || process.platform;
  return id === 'win32' ? 'windows' : 'posix';
}

/**
 * Cross-platform `which` — scans PATH directories (+ PATHEXT on Windows) for an
 * executable named `cmd`. Pure: fs + env + os family are all injectable.
 *
 * @returns {string|null} absolute path to the first match, or null.
 */
function which(cmd, opts = {}) {
  const env = opts.env || process.env;
  const fs = opts.fs || require('node:fs');
  const family = opts.osFamily || osFamily(opts.platform);
  const isWindows = family === 'windows';

  const rawPath = env.PATH || env.Path || env.path || '';
  const sep = isWindows ? ';' : ':';
  const dirs = rawPath.split(sep).map((d) => d.trim()).filter(Boolean);

  const exts = isWindows
    ? (env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').map((e) => e.toLowerCase())
    : [''];

  // If cmd already carries an extension on Windows, also try it bare.
  const tryExts = isWindows ? ['', ...exts] : [''];

  for (const dir of dirs) {
    for (const ext of tryExts) {
      const candidate = nodePath.join(dir, cmd + ext);
      try {
        const stat = fs.statSync(candidate);
        if (stat && (stat.isFile() || stat.isSymbolicLink())) return candidate;
      } catch {
        // not here — keep scanning
      }
    }
  }
  return null;
}

module.exports = { makeRunner, run: defaultRun, which, osFamily };
