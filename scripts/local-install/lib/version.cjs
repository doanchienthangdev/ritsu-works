'use strict';
/**
 * scripts/local-install/lib/version.cjs
 *
 * Pure version parsing + comparison helpers for the local-install platform.
 * No I/O, no dependencies — safe to unit-test in isolation.
 *
 * Tool `--version` output is messy ("v20.18.0", "pnpm 9.1.0",
 * "git version 2.39.3 (Apple Git-145)", "Python 3.11.4", "ffmpeg version 6.1.1").
 * parseVersion() extracts the first dotted numeric version it can find.
 */

/**
 * Extract the first `major.minor[.patch]` version triplet from arbitrary text.
 * @param {string} text - raw `--version` output (or a bare version string)
 * @returns {{major:number, minor:number, patch:number, raw:string}|null}
 */
function parseVersion(text) {
  if (typeof text !== 'string' || text.length === 0) return null;
  // Match the first N.N or N.N.N, optionally prefixed with 'v'.
  const match = text.match(/v?(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: match[3] !== undefined ? Number(match[3]) : 0,
    raw: match[0].replace(/^v/, ''),
  };
}

/**
 * Compare two version strings (or parsed objects). Returns -1, 0, or 1
 * for (a < b), (a == b), (a > b). Unparseable inputs sort as 0.0.0.
 */
function compareVersions(a, b) {
  const pa = typeof a === 'object' && a !== null ? a : parseVersion(String(a));
  const pb = typeof b === 'object' && b !== null ? b : parseVersion(String(b));
  const za = pa || { major: 0, minor: 0, patch: 0 };
  const zb = pb || { major: 0, minor: 0, patch: 0 };
  for (const key of ['major', 'minor', 'patch']) {
    if (za[key] > zb[key]) return 1;
    if (za[key] < zb[key]) return -1;
  }
  return 0;
}

/**
 * True if `version` is >= `minimum`. A missing/unparseable version fails.
 * @param {string|object} version
 * @param {string} minimum - e.g. "20", "9.0", "3.11.0"
 */
function satisfiesMin(version, minimum) {
  if (version === null || version === undefined) return false;
  const parsed = typeof version === 'object' ? version : parseVersion(String(version));
  if (!parsed) return false;
  if (!minimum) return true;
  return compareVersions(parsed, minimum) >= 0;
}

/** Render a parsed version (or null) as a short string for display. */
function formatVersion(parsed) {
  if (!parsed) return 'unknown';
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

module.exports = { parseVersion, compareVersions, satisfiesMin, formatVersion };
