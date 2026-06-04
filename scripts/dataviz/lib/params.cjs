// ============================================================================
// scripts/dataviz/lib/params.cjs — dataviz universal parameter layer
// ============================================================================
// Capability `dataviz` v0.1. PURE helpers shared by scripts/dataviz/gen.cjs + the
// adapter skills + the L2 validator (validate-dataviz-renderers.cjs imports
// UNIVERSAL_PARAMS from HERE, not from image's — the vocabularies are different).
// Mirrors scripts/image/lib/params.cjs in shape; the dataviz vocabulary is its OWN.
// ============================================================================

'use strict';

// Flag names WITHOUT the leading `--`. An adapter's supports[]/supports_stretch[]/
// unsupported_warn[] in knowledge/dataviz-renderers.yaml must each be ⊆ this.
const UNIVERSAL_PARAMS = Object.freeze([
  'message', 'chart', 'data', 'title', 'title-style', 'source', 'footnotes',
  'highlight', 'sort', 'unit', 'decimals', 'percent', 'thousands',
  'style', 'art-style', 'theme', 'format', 'ar', 'width', 'height',
  'use', 'out', 'max-cost-usd', 'dry-run',
  // v0.2 (extend): the intelligent-selection + new-chart inputs.
  'explain', 'audience', 'target', 'x-label', 'y-label',
  // v0.4 (extend): LLM-native selection provenance — the calling agent records
  // THAT it selected the chart (and why) so run.json distinguishes an agent's
  // reasoned pick from the deterministic fallback or a hard human force.
  'selected-by', 'select-reason', 'select-intent', 'select-confidence',
]);

const FORMATS = Object.freeze(['svg', 'png', 'html', 'inline']);
const THEMES = Object.freeze(['mckinsey', 'mckinsey-rebrand']);
const TITLE_STYLES = Object.freeze(['action', 'topic']);

const DEFAULTS = Object.freeze({
  use: 'svg-native', chart: 'auto', theme: 'mckinsey', 'title-style': 'action',
  ar: '4:3', format: 'inline', sort: true, percent: false, thousands: false,
  'max-cost-usd': 0.05, 'dry-run': false,
});

const BOOL_FLAGS = Object.freeze(['dry-run', 'sort', 'percent', 'thousands', 'explain']);
const NUM_FLAGS = Object.freeze(['width', 'height', 'decimals', 'max-cost-usd', 'highlight', 'target']);

// Params that are operational plumbing, never a "renderer can't do this" warning.
// NB: `art-style` is deliberately NOT here — it falls to the unsupported_warn path
// (a pure data chart has no illustration surface; honest no-op + consequence).
// `explain` + `audience` are selection PLUMBING (never a "renderer can't do this" warning).
// `target`/`x-label`/`y-label` are renderer CAPABILITIES — they fall to the supports/warn path
// (a future renderer without axis labels SHOULD warn), so they are NOT listed here.
const NEVER_WARN = Object.freeze(['message', 'chart', 'data', 'title', 'title-style', 'source', 'footnotes', 'highlight', 'sort', 'unit', 'decimals', 'percent', 'thousands', 'style', 'theme', 'format', 'ar', 'width', 'height', 'use', 'out', 'max-cost-usd', 'dry-run', 'explain', 'audience', 'selected-by', 'select-reason', 'select-intent', 'select-confidence']);

// Consequence text for params a backend doesn't honor (consequence-honest, never silent).
const CONSEQUENCE = Object.freeze({
  'art-style': 'a pure data chart has no illustration surface; genre applies only as a secondary accent',
});

/**
 * Parse `/dataviz` argv into options + the set of explicitly-provided flags. Pure.
 * Positional (non `--`) tokens join into `message`. @returns {{options, provided}}
 */
function parseDatavizArgs(argv) {
  const options = { ...DEFAULTS };
  const provided = new Set();
  const positional = [];
  for (const raw of Array.isArray(argv) ? argv : []) {
    if (typeof raw !== 'string') continue;
    if (!raw.startsWith('--')) { positional.push(raw); continue; }
    const body = raw.slice(2);
    const eq = body.indexOf('=');
    const key = eq === -1 ? body : body.slice(0, eq);
    provided.add(key);
    if (BOOL_FLAGS.includes(key)) {
      options[key] = eq === -1 ? true : !/^(false|0|no)$/i.test(body.slice(eq + 1));
    } else {
      const val = eq === -1 ? true : body.slice(eq + 1);
      options[key] = NUM_FLAGS.includes(key) && val !== true ? Number(val) : val;
    }
  }
  if (positional.length && options.message === undefined) options.message = positional.join(' ');
  return { options, provided };
}

/** Validate --format (default inline). */
function normalizeFormat(f) { return FORMATS.includes(f) ? f : 'inline'; }
/** Validate --theme (default mckinsey). */
function normalizeTheme(t) { return THEMES.includes(t) ? t : 'mckinsey'; }

/**
 * Resolve --ar "W:H" → {width,height}. Default 4:3 @ 720 wide; --width/--height override.
 * Aspect is SEMANTIC (never auto-stretched) — we honor the requested ratio exactly.
 */
function resolveSize(options) {
  let w = Number(options.width);
  let h = Number(options.height);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
  const m = /^(\d+)\s*:\s*(\d+)$/.exec(typeof options.ar === 'string' ? options.ar.trim() : '4:3');
  const rw = m ? Number(m[1]) : 4;
  const rh = m ? Number(m[2]) : 3;
  const baseW = Number.isFinite(w) && w > 0 ? Math.round(w) : 720;
  const height = Math.round((baseW * rh) / Math.max(1, rw));
  return { width: baseW, height };
}

/** Build the numberFormat config from flags (for the renderer's valFmt). */
function numberFormat(options) {
  return {
    decimals: Number.isFinite(Number(options.decimals)) ? Number(options.decimals) : 0,
    percent: !!options.percent,
    percentDecimals: Number.isFinite(Number(options.decimals)) ? Number(options.decimals) : 0,
    thousandsSep: !!options.thousands,
    scaleAbbrev: true,
    currency: typeof options.unit === 'string' && /^[$€£¥]/.test(options.unit) ? options.unit[0] : undefined,
  };
}

/** supports()/WARN engine — consequence-honest, never throws, never silent-drop. */
function computeWarnings(caps, provided) {
  const supports = new Set(caps && Array.isArray(caps.supports) ? caps.supports : []);
  const stretch = new Set(caps && Array.isArray(caps.supports_stretch) ? caps.supports_stretch : []);
  const warnings = [];
  for (const flag of provided) {
    if (NEVER_WARN.includes(flag) || supports.has(flag)) continue;
    if (!UNIVERSAL_PARAMS.includes(flag)) { warnings.push(`--${flag} is not a known /dataviz flag → ignored`); continue; }
    if (stretch.has(flag)) { warnings.push(`--${flag} is a stretch param not built on this renderer → ignored for this run`); continue; }
    const why = CONSEQUENCE[flag];
    warnings.push(why ? `--${flag} ignored — ${why}` : `--${flag} is not supported by this renderer → ignored`);
  }
  return warnings;
}

module.exports = {
  UNIVERSAL_PARAMS, FORMATS, THEMES, TITLE_STYLES, DEFAULTS, BOOL_FLAGS, NUM_FLAGS, CONSEQUENCE,
  parseDatavizArgs, normalizeFormat, normalizeTheme, resolveSize, numberFormat, computeWarnings,
};
