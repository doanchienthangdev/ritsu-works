// ============================================================================
// scripts/deepask/format-select.cjs — deepask `smartauto` format selector
// ============================================================================
// Capability `deepask` v1.0, Sprint 4. Pure deterministic selector behind
// `--format=smartauto` (the default). Maps the question-intent (classified by
// the session model from the question + synthesis IR) to the best output
// format AVAILABLE in the current Format Engine build, per spec §5.3.
//
// Availability is explicit so the selector behaves correctly across the
// incremental rollout: S4 ships the doc family (text/article/pdf/docx/pptx/
// xlsx); S5 adds the visual family (mermaid/chart/dashboard/html/interactive/
// canvas). Pass `available` accordingly; selectFormat always falls back to
// `article` (the canonical, always-written format) when an ideal pick isn't
// built yet. Explicit --format=<x> bypasses this fn (orchestrator uses x directly).
// Pure function: no I/O.
// ============================================================================

'use strict';

// Doc family — available after Sprint 4.
const DOC_FAMILY = ['text', 'article', 'pdf', 'docx', 'pptx', 'xlsx'];
// Visual family — available after Sprint 5.
const VISUAL_FAMILY = ['mermaid', 'chart', 'dashboard', 'html', 'interactive', 'canvas'];
const ALL_FORMATS = [...DOC_FAMILY, ...VISUAL_FAMILY];

// Image family — v1.1 (extend: gpt-image-2 formats). EXPLICIT-ONLY: deliberately
// NOT in ALL_FORMATS / INTENT_PREFERENCES so `smartauto` NEVER selects them
// (image generation spends OpenAI money — the operator must ask for them). Listed
// here only for the command's --format validation + isImageFormat() guards.
const IMAGE_FAMILY = ['infographics', 'img-slide'];
const ALL_FORMATS_WITH_IMAGE = [...ALL_FORMATS, ...IMAGE_FAMILY];

/** True iff `f` is one of the v1.1 gpt-image formats (explicit-only). */
function isImageFormat(f) {
  return IMAGE_FAMILY.includes(f);
}

// Per-intent preference, ideal → fallback (spec §5.3). The first entry that is
// in `available` wins; `article` is the guaranteed canonical fallback.
const INTENT_PREFERENCES = {
  comparison: ['article'],                      // table rendered inside the article
  architecture: ['mermaid', 'article'],         // flow/dependency → diagram if available
  metric_trend: ['chart', 'xlsx', 'article'],   // time-series → chart; else tabular
  exec_briefing: ['pptx', 'pdf', 'article'],    // "summary for X"
  how_to: ['article'],
  raw_data: ['xlsx', 'article'],                // data dump
  general: ['article'],                         // default
};
const VALID_INTENTS = Object.keys(INTENT_PREFERENCES);
const CANONICAL_FALLBACK = 'article';

/**
 * Choose the smartauto output format for a synthesized answer.
 *
 * @param {object} signals
 * @param {string} signals.intent  one of VALID_INTENTS (session-model classification).
 * @param {string[]} [available=ALL_FORMATS]  formats whose adapters are built
 *        (defaults to ALL_FORMATS as of Sprint 5 — every adapter now exists).
 * @returns {{ format: string, reason: string, fellBack: boolean }}
 * @throws {TypeError} on invalid signals/intent or invalid `available`.
 */
function selectFormat(signals, available = ALL_FORMATS) {
  if (signals === null || typeof signals !== 'object' || Array.isArray(signals)) {
    throw new TypeError(
      `format-select: signals must be an object, got ${signals === null ? 'null' : Array.isArray(signals) ? 'array' : typeof signals}`,
    );
  }
  if (typeof signals.intent !== 'string' || !VALID_INTENTS.includes(signals.intent)) {
    throw new TypeError(
      `format-select: signals.intent must be one of [${VALID_INTENTS.join(', ')}], got ${
        typeof signals.intent === 'string' ? `"${signals.intent}"` : typeof signals.intent
      }`,
    );
  }
  if (!Array.isArray(available) || available.length === 0) {
    throw new TypeError('format-select: available must be a non-empty array of format names');
  }
  for (const f of available) {
    if (!ALL_FORMATS.includes(f)) {
      throw new TypeError(`format-select: available contains unknown format "${f}"`);
    }
  }

  const prefs = INTENT_PREFERENCES[signals.intent];
  const ideal = prefs[0];

  // First preferred format that is actually built.
  const chosen = prefs.find((f) => available.includes(f));
  if (chosen) {
    return {
      format: chosen,
      reason: `intent "${signals.intent}" → ${chosen}${chosen === ideal ? '' : ` (ideal ${ideal} not yet built)`}`,
      fellBack: chosen !== ideal,
    };
  }

  // No preferred format built → canonical article if present, else first available.
  if (available.includes(CANONICAL_FALLBACK)) {
    return {
      format: CANONICAL_FALLBACK,
      reason: `intent "${signals.intent}" → article (canonical fallback; no preferred format available)`,
      fellBack: true,
    };
  }
  return {
    format: available[0],
    reason: `intent "${signals.intent}" → ${available[0]} (last-resort fallback; article unavailable)`,
    fellBack: true,
  };
}

module.exports = {
  selectFormat,
  DOC_FAMILY,
  VISUAL_FAMILY,
  IMAGE_FAMILY,
  ALL_FORMATS,
  ALL_FORMATS_WITH_IMAGE,
  isImageFormat,
  INTENT_PREFERENCES,
  VALID_INTENTS,
};
