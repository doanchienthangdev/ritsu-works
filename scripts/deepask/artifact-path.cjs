// ============================================================================
// scripts/deepask/artifact-path.cjs — deepask artifact directory layout
// ============================================================================
// Capability `deepask` v1.0, Sprint 5. Pure deterministic helpers for the
// artifact layout (spec §5.4): every /deepask run writes to
//   .archives/deepask/<YYYY-MM-DD>-<slug>/
// containing answer.md + plan.json + sources.json + the rendered artifact.
//
// The slug is derived deterministically from the question so the same question
// on the same day maps to a stable directory. Date is PASSED IN (not read from
// the clock) so this stays a pure, testable function — the orchestrator stamps
// the date. Pure: no I/O.
// ============================================================================

'use strict';

const ARTIFACT_ROOT = '.archives/deepask';
const DEFAULT_MAX_SLUG_LEN = 48;
const EMPTY_SLUG_FALLBACK = 'untitled';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Derive a stable, filesystem-safe kebab slug from a question.
 * Strips diacritics, lowercases, collapses non-alphanumerics to single dashes,
 * trims, and truncates at a dash boundary (no mid-word cut). Empty -> 'untitled'.
 *
 * @param {string} question
 * @param {number} [maxLen=48]
 * @returns {string}
 * @throws {TypeError} if question is not a string or maxLen is not a positive integer.
 */
function deriveSlug(question, maxLen = DEFAULT_MAX_SLUG_LEN) {
  if (typeof question !== 'string') {
    throw new TypeError(`artifact-path: question must be a string, got ${typeof question}`);
  }
  if (typeof maxLen !== 'number' || !Number.isInteger(maxLen) || maxLen <= 0) {
    throw new TypeError(`artifact-path: maxLen must be a positive integer, got ${maxLen}`);
  }

  let slug = question
    .normalize('NFD')                    // decompose accented chars
    .replace(/[̀-ͯ]/g, '')     // strip combining diacritics (U+0300-U+036F)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')         // any run of non-alphanumerics -> single dash
    .replace(/^-+|-+$/g, '');            // trim leading/trailing dashes

  if (slug.length === 0) return EMPTY_SLUG_FALLBACK;

  if (slug.length > maxLen) {
    const cut = slug.slice(0, maxLen);
    const lastDash = cut.lastIndexOf('-');
    // Prefer cutting at the last dash (no partial trailing word); else hard cut.
    slug = (lastDash > 0 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '');
    if (slug.length === 0) return EMPTY_SLUG_FALLBACK;
  }

  return slug;
}

/**
 * Build the artifact directory path for a deepask run.
 *
 * @param {string} dateStr  YYYY-MM-DD (the orchestrator stamps it).
 * @param {string} question
 * @param {number} [maxLen=48]
 * @returns {string}  e.g. ".archives/deepask/2026-05-30-are-we-on-track-for-100-paying/"
 * @throws {TypeError} on a malformed date or non-string question.
 */
function buildArtifactDir(dateStr, question, maxLen = DEFAULT_MAX_SLUG_LEN) {
  if (typeof dateStr !== 'string' || !DATE_RE.test(dateStr)) {
    throw new TypeError(`artifact-path: dateStr must be YYYY-MM-DD, got ${JSON.stringify(dateStr)}`);
  }
  return `${ARTIFACT_ROOT}/${dateStr}-${deriveSlug(question, maxLen)}/`;
}

module.exports = { deriveSlug, buildArtifactDir, ARTIFACT_ROOT, DEFAULT_MAX_SLUG_LEN, EMPTY_SLUG_FALLBACK };
