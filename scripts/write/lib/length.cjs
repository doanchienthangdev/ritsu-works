// ============================================================================
// scripts/write/lib/length.cjs — /write length resolver
// ============================================================================
// Parse the --length spec into a concrete word target the orchestrator budgets
// sections against. Pure. Accepts: presets (short|medium|long|very-long|
// extremely-long), `<N>w` (≈N words), `<N>p` (≈N pages → N×WORDS_PER_PAGE), or a
// bare integer (treated as words). Unknown → default preset + a warning.
// ============================================================================

'use strict';

const WORDS_PER_PAGE = 450;     // a reasonable prose page (double-spaced ≈ 250; single ≈ 500)

// Self-contained defaults so the lib is testable without the registry. The registry
// (knowledge/write-types.yaml `length_presets`) may override via the `presets` arg.
const DEFAULT_PRESETS = Object.freeze({
  short: 250,
  medium: 800,
  long: 2000,
  'very-long': 4000,
  'extremely-long': 8000,
});

const DEFAULT_PRESET = 'medium';

/**
 * Resolve a length spec to a word target.
 * @param {string|number|undefined} spec  e.g. "long", "1500w", "5p", 1200, undefined
 * @param {object} [presets]  optional {presetName: words} overriding DEFAULT_PRESETS
 * @returns {{ words:number, pages:number, label:string, kind:'preset'|'words'|'pages', warnings:string[] }}
 */
function parseLength(spec, presets) {
  const table = { ...DEFAULT_PRESETS, ...(presets && typeof presets === 'object' ? presets : {}) };
  const warnings = [];

  if (spec === undefined || spec === null || spec === '') {
    return finalize(table[DEFAULT_PRESET], DEFAULT_PRESET, 'preset', warnings);
  }

  // numeric (bare words)
  if (typeof spec === 'number' && Number.isFinite(spec) && spec > 0) {
    return finalize(Math.round(spec), `${Math.round(spec)}w`, 'words', warnings);
  }

  const s = String(spec).trim().toLowerCase();

  // preset
  if (Object.prototype.hasOwnProperty.call(table, s)) {
    return finalize(table[s], s, 'preset', warnings);
  }

  // <N>w  (words)
  let m = /^(\d+(?:\.\d+)?)\s*w(?:ords?)?$/.exec(s);
  if (m) {
    const w = Math.round(Number(m[1]));
    if (w > 0) return finalize(w, `${w}w`, 'words', warnings);
  }

  // <N>p  (pages)
  m = /^(\d+(?:\.\d+)?)\s*p(?:ages?|gs?)?$/.exec(s);
  if (m) {
    const pages = Number(m[1]);
    if (pages > 0) return finalize(Math.round(pages * WORDS_PER_PAGE), `${pages}p`, 'pages', warnings);
  }

  // bare integer string
  m = /^(\d+)$/.exec(s);
  if (m) {
    const w = Number(m[1]);
    if (w > 0) return finalize(w, `${w}w`, 'words', warnings);
  }

  warnings.push(`--length "${spec}" not understood (use short|medium|long|very-long|extremely-long, or 1000w, or 5p) → defaulting to ${DEFAULT_PRESET}`);
  return finalize(table[DEFAULT_PRESET], DEFAULT_PRESET, 'preset', warnings);
}

function finalize(words, label, kind, warnings) {
  const w = Math.max(1, Math.round(words));
  return {
    words: w,
    pages: Math.round((w / WORDS_PER_PAGE) * 10) / 10,
    label,
    kind,
    warnings,
  };
}

module.exports = { parseLength, WORDS_PER_PAGE, DEFAULT_PRESETS, DEFAULT_PRESET };
