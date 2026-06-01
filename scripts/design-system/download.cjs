// ============================================================================
// scripts/design-system/download.cjs — on-demand fetch command + path construction
// ============================================================================
// Capability `design-system-styling` v1.0, Sprint 1. PURE command/path builders
// for the two download paths (locked decision #3: CLI-first, NO MCP, NO API key):
//   - getdesign  → `npx getdesign@latest add <name>` (key-free; ships previews)
//   - designmd   → hydrate via the `build --from=<public repo>` verb (no key) —
//                  build is the design-system/build skill; this module only plans it.
//
// The actual side-effecting execution (spawning npx / running the build) lives in
// the /design-system command + the build skill (Sprint 2/4). Keeping construction
// pure here makes it unit-testable and keeps the no-silent-download discipline
// honest (resolve-style HARD-FAILS in non-interactive; nothing here auto-runs).
// ============================================================================

'use strict';

const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_CACHE_ROOT = path.join(REPO_ROOT, 'runtime', 'design-systems');
const NAME_RE = /^[a-z][a-z0-9-]*$/;

class DownloadError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DownloadError';
  }
}

function assertName(name) {
  if (typeof name !== 'string' || !NAME_RE.test(name)) {
    throw new DownloadError(`invalid design-system name (must match ${NAME_RE}): ${JSON.stringify(name)}`);
  }
}

/** argv for the key-free getdesign fetch. Caller spawns it (Tier A/B) in interactive mode only. */
function getdesignCommand(name) {
  assertName(name);
  return ['npx', 'getdesign@latest', 'add', name];
}

/** Cache directory a downloaded system materializes into (gitignored runtime/). */
function cacheTargetDir(name, cacheRoot = DEFAULT_CACHE_ROOT) {
  assertName(name);
  return path.join(cacheRoot, name);
}

/** Cache path of a downloaded system's DESIGN.md. */
function cacheDesignMdPath(name, cacheRoot = DEFAULT_CACHE_ROOT) {
  return path.join(cacheTargetDir(name, cacheRoot), 'DESIGN.md');
}

/**
 * Plan a designmd (or any) build-from-repo hydration — NO DESIGNMD_API_KEY (AD-2).
 * The /design-system command hands this to the design-system/build skill.
 */
function buildFromRepoPlan(name, repo, cacheRoot = DEFAULT_CACHE_ROOT) {
  assertName(name);
  if (typeof repo !== 'string' || !repo) {
    throw new DownloadError('buildFromRepoPlan: repo (path or public URL) is required');
  }
  return {
    name,
    repo,
    skill: 'design-system/build-from-repo',
    targetDir: cacheTargetDir(name, cacheRoot),
    designMdPath: cacheDesignMdPath(name, cacheRoot),
    note: 'hydrate via the build --from verb (no DESIGNMD_API_KEY; honors locked decision #3)',
  };
}

module.exports = {
  getdesignCommand,
  cacheTargetDir,
  cacheDesignMdPath,
  buildFromRepoPlan,
  DownloadError,
  NAME_RE,
  DEFAULT_CACHE_ROOT,
};
