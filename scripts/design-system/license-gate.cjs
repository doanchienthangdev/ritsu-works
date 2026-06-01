// ============================================================================
// scripts/design-system/license-gate.cjs — R2 license gate (Muse ethical-compass)
// ============================================================================
// Capability `design-system-styling` v1.0, Sprint 3. Pure classifier: given a
// third-party design system's license, decide whether its DESIGN.md may be
// cached/redistributed into the local registry. "downloaded != redistributable"
// (Phase-5 Muse ethical-compass R2). FAIL-CLOSED: unknown/missing/empty license
// → NOT redistributable (refuse to cache until a founder records the license).
//
// Consulted by the /design-system `add` + `build --from` + seed flows BEFORE
// writing a cached DESIGN.md. Pure (no I/O); throws only on a non-string license.
// ============================================================================

'use strict';

class LicenseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LicenseError';
  }
}

// Permissive / public — safe to cache the DESIGN.md locally (SPDX-ish, lowercased).
const REDISTRIBUTABLE = new Set([
  'mit', 'isc', 'apache-2.0', 'apache2', 'bsd-2-clause', 'bsd-3-clause', 'bsd',
  '0bsd', 'cc0-1.0', 'cc0', 'cc-by-4.0', 'cc-by-3.0', 'unlicense', 'public-domain',
  'wtfpl', 'mpl-2.0', 'zlib',
]);

// Explicitly restrictive — must NOT cache (no-derivatives / non-commercial / closed).
const NON_REDISTRIBUTABLE = new Set([
  'cc-by-nc-4.0', 'cc-by-nc', 'cc-by-nd-4.0', 'cc-by-nd', 'cc-by-nc-nd-4.0',
  'proprietary', 'all-rights-reserved', 'unlicensed', 'none', 'closed',
]);

/**
 * Assess whether a design system's license permits caching/redistribution.
 *
 * @param {string|null|undefined} license  SPDX-ish id (e.g. "MIT"), or null/undefined if unknown.
 * @returns {{ redistributable: boolean, normalized: string|null, reason: string }}
 * @throws {LicenseError} if license is a non-string, non-null value.
 *
 * Fail-closed: unknown / missing / empty / unrecognized → redistributable=false
 * (the safe default — refuse to cache until a license is recorded). Known-permissive
 * → true. Known-restrictive → false.
 */
function assessLicense(license) {
  if (license === null || license === undefined) {
    return { redistributable: false, normalized: null, reason: 'no license recorded — fail-closed (R2): refuse to cache until a license is set' };
  }
  if (typeof license !== 'string') {
    throw new LicenseError(`license must be a string or null, got ${Array.isArray(license) ? 'array' : typeof license}`);
  }
  const normalized = license.trim();
  if (normalized === '') {
    return { redistributable: false, normalized: '', reason: 'empty license string — fail-closed (R2)' };
  }
  const key = normalized.toLowerCase();
  if (REDISTRIBUTABLE.has(key)) {
    return { redistributable: true, normalized, reason: `permissive license "${normalized}" — safe to cache` };
  }
  if (NON_REDISTRIBUTABLE.has(key)) {
    return { redistributable: false, normalized, reason: `restrictive license "${normalized}" — must NOT cache/redistribute (R2)` };
  }
  // Unknown / unrecognized → fail-closed + flag for founder.
  return {
    redistributable: false,
    normalized,
    reason: `unrecognized license "${normalized}" — fail-closed (R2): founder must confirm redistributability before caching`,
  };
}

/**
 * Gate used by the add/build/seed flow: throws if a system may NOT be cached,
 * so a non-redistributable system is never silently written to the cache.
 * Returns the assessment when it IS cacheable.
 */
function assertCacheable(name, license) {
  const a = assessLicense(license);
  if (!a.redistributable) {
    throw new LicenseError(`refusing to cache design system "${name}": ${a.reason}`);
  }
  return a;
}

module.exports = {
  assessLicense,
  assertCacheable,
  LicenseError,
  REDISTRIBUTABLE,
  NON_REDISTRIBUTABLE,
};
