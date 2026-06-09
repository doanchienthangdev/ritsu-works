// ============================================================================
// scripts/write/lib/artifact-path.cjs — /write output-dir convention
// ============================================================================
// Pure slug + artifact-dir helpers (mirrors scripts/deepask/artifact-path.cjs).
// Output lands in .archives/write/<YYYY-MM-DD>-<slug>/ so same-request-same-day
// maps to one dir. The DATE is PASSED IN (the orchestrator stamps it — Date.now()
// is intentionally not called here, keeping the module pure + resume-safe).
// ============================================================================

'use strict';

const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Deterministic slug from a request string. NFD-decompose accents, lowercase,
 * collapse non-alphanumerics to dashes, truncate at a dash boundary. Pure.
 */
function deriveSlug(text, maxLen = 48) {
  if (!text || typeof text !== 'string') return 'untitled';
  let s = text.normalize('NFD').replace(/[̀-ͯ]/g, '');   // strip combining diacritics
  s = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!s) return 'untitled';
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen);
  const lastDash = cut.lastIndexOf('-');
  return (lastDash > 8 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '') || 'untitled';
}

/**
 * Build the artifact dir (repo-relative). Date is passed in (e.g. "2026-06-10").
 * @returns {string} e.g. ".archives/write/2026-06-10-purple-cow-launch-post"
 */
function buildArtifactDir(dateStr, text, opts = {}) {
  const root = opts.repoRoot || REPO_ROOT;
  const slug = deriveSlug(text, opts.maxLen || 48);
  const rel = path.join('.archives', 'write', `${dateStr}-${slug}`);
  return opts.absolute ? path.join(root, rel) : rel;
}

module.exports = { deriveSlug, buildArtifactDir, REPO_ROOT };
