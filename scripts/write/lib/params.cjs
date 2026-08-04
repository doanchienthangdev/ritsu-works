// ============================================================================
// scripts/write/lib/params.cjs — /write universal parameter layer
// ============================================================================
// Capability `write-platform` v0.1. Deterministic flag parsing + the
// consequence-honest WARN engine, shared by scripts/write/*.cjs and the skills.
// No network. I/O is confined to `readRequestFile` (the one `--request-file`
// read) — every other function here is pure, and parsing stays pure unless
// `--request-file` is passed. Mirrors the image/dataviz params convention
// exactly (parseArgs → {options, provided}; unsupported flags WARN, never
// silently drop).
// ============================================================================

'use strict';

const fs = require('fs');

// Subcommands of /write. The first positional token, if it matches one of these,
// is the subcommand; otherwise the subcommand is 'write' and positionals are the request.
const SUBCOMMANDS = Object.freeze(['write', 'distill', 'authors', 'types', 'templates', 'frameworks', 'humanize']);

// Canonical flag vocabulary (without leading `--`). Unknown flags are recorded + warned.
const UNIVERSAL_PARAMS = Object.freeze([
  'type', 'medium', 'author-style', 'template', 'framework', 'mode', 'length',
  'research', 'grounding', 'longform',
  'out', 'style', 'lang', 'image', 'dataviz', 'humanize',
  'ref', 'ref-src', 'push', 'max-cost-usd', 'dry-run', 'out-dir',
  'request', 'request-file', 'use', 'model',
]);

const RESEARCH_LEVELS = Object.freeze(['off', 'auto', 'deep']);       // --research depth
const GROUNDING_SOURCES = Object.freeze(['off', 'auto', 'deepask', 'wiki', 'brain', 'all']); // --grounding internal Ritsu sources

const MODES = Object.freeze(['standard', 'deep-research', 'workflow']);
const TRISTATE = Object.freeze(['auto', 'on', 'off']);          // image / dataviz
const OUT_FORMATS = Object.freeze(['default', 'md', 'docx', 'pdf', 'html', 'txt']);

// Multi-value flags: repeatable AND `+`-joinable (e.g. --ref=a+b --ref=c, --out=md+pdf, --grounding=deepask+wiki).
const MULTI_FLAGS = Object.freeze(['ref', 'ref-src', 'out', 'grounding']);
const BOOL_FLAGS = Object.freeze(['dry-run']);
const NUM_FLAGS = Object.freeze(['max-cost-usd']);
// Tri-state flags accept auto|on|off; a bare `--image` means `on`.
const TRISTATE_FLAGS = Object.freeze(['image', 'dataviz']);

const DEFAULTS = Object.freeze({
  mode: 'standard',
  length: 'medium',
  out: ['default'],
  style: 'ritsu',
  lang: 'en',
  image: 'auto',
  dataviz: 'auto',
  humanize: 'on',          // the whole point — on by default
  framework: 'auto',       // auto = the orchestrator decides best-fit framework OR free-style (not every piece needs one)
  research: 'auto',        // off | auto (refs + light internal) | deep (deep-research skill + web fan-out + deep Ritsu dig)
  longform: 'auto',        // auto (detect from type) | on (force bible+parallel+continuity) | off
  'max-cost-usd': 2.0,
  'dry-run': false,
});

// Consequence text for flags that don't apply in some contexts (warn names the consequence).
const CONSEQUENCE = Object.freeze({
  use: 'reserved for a future pluggable writer backend; ignored (the in-session writer is used)',
  model: 'reserved; the session model is used',
});

class ParamsError extends Error {
  constructor(message) { super(message); this.name = 'ParamsError'; }
}

function splitPlus(val) {
  return String(val).split('+').map((s) => s.trim()).filter(Boolean);
}

/**
 * Read `--request-file=<path>` into the request text. The ONLY I/O in this module.
 * Throws rather than returning empty: the request IS the input, so a missing or
 * blank file must stop the run, not produce a contentless draft.
 * @param {string|boolean} filePath value of the --request-file flag
 * @returns {string} trimmed file contents
 */
function readRequestFile(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new ParamsError('--request-file requires a path (e.g. --request-file=brief.md)');
  }
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    throw new ParamsError(`--request-file "${filePath}" could not be read: ${e.message}`);
  }
  // .trim() also strips a leading UTF-8 BOM (U+FEFF is WhiteSpace per ECMA-262).
  const text = raw.trim();
  if (!text) throw new ParamsError(`--request-file "${filePath}" is empty — no request to write about`);
  return text;
}

/**
 * Parse `/write` argv into a subcommand + options + the set of explicitly-provided flags.
 * Pure unless `--request-file` is passed (the one read; see `readRequestFile`).
 * Positional (non-`--`) tokens: first may be a subcommand; the rest join into the
 * request (for `write`/`humanize`) or the target slug (for `distill`).
 * Throws ParamsError when `--request-file` is given but unusable.
 * @param {string[]} argv
 * @returns {{ subcommand:string, options:object, provided:Set<string>, positional:string[], warnings:string[] }}
 */
function parseWriteArgs(argv) {
  // `out` starts EMPTY (not the default ['default']) so an explicit --out REPLACES rather
  // than appends to the default; the empty case is restored to ['default'] at the end.
  const options = { ...DEFAULTS, out: [], ref: [], 'ref-src': [], grounding: [] };
  const provided = new Set();
  const positional = [];
  const warnings = [];
  for (const raw of Array.isArray(argv) ? argv : []) {
    if (typeof raw !== 'string') continue;
    if (!raw.startsWith('--')) { positional.push(raw); continue; }
    const body = raw.slice(2);
    const eq = body.indexOf('=');
    const key = eq === -1 ? body : body.slice(0, eq);
    const rawVal = eq === -1 ? undefined : body.slice(eq + 1);
    provided.add(key);

    if (MULTI_FLAGS.includes(key)) {
      const vals = rawVal === undefined ? [] : splitPlus(rawVal);
      options[key] = Array.isArray(options[key]) ? options[key].concat(vals) : vals;
      continue;
    }
    if (BOOL_FLAGS.includes(key)) {
      options[key] = rawVal === undefined ? true : !/^(false|0|no|off)$/i.test(rawVal);
      continue;
    }
    if (TRISTATE_FLAGS.includes(key)) {
      const v = rawVal === undefined ? 'on' : String(rawVal).toLowerCase();
      options[key] = TRISTATE.includes(v) ? v : 'auto';
      continue;
    }
    if (key === 'humanize') {
      // humanize accepts on|off (or auto→on). Bare --humanize = on.
      const v = rawVal === undefined ? 'on' : String(rawVal).toLowerCase();
      options.humanize = /^(off|false|0|no)$/i.test(v) ? 'off' : 'on';
      continue;
    }
    if (NUM_FLAGS.includes(key)) {
      options[key] = rawVal === undefined ? true : Number(rawVal);
      continue;
    }
    options[key] = rawVal === undefined ? true : rawVal;
  }

  // Subcommand detection: first positional that is a known subcommand.
  let subcommand = 'write';
  let reqTokens = positional;
  if (positional.length && SUBCOMMANDS.includes(positional[0])) {
    subcommand = positional[0];
    reqTokens = positional.slice(1);
  }

  if (subcommand === 'distill') {
    // first remaining token = author slug; rest ignored (slug is single-token)
    if (reqTokens.length && options['author-style'] === undefined) {
      options['author-style'] = reqTokens[0];
    }
  } else if (options.request === undefined && reqTokens.length) {
    options.request = reqTokens.join(' ');
  }

  // --request-file: read the request from a file, so a long brief needs no shell
  // quoting. An inline request (--request= or positional) WINS; the file is then
  // reported as ignored rather than silently dropped.
  if (provided.has('request-file')) {
    if (options.request === undefined) {
      options.request = readRequestFile(options['request-file']);
    } else {
      warnings.push('--request-file ignored — an inline request was also given (--request/positional wins)');
    }
  }

  // out: dedupe + flatten (already split on + by MULTI handling)
  if (Array.isArray(options.out)) {
    options.out = [...new Set(options.out.flatMap(splitPlus))];
    if (options.out.length === 0) options.out = ['default'];
  }

  return { subcommand, options, provided, positional, warnings };
}

/** Normalize --mode (unknown → 'standard', never throw). */
function normalizeMode(mode) {
  return MODES.includes(mode) ? mode : 'standard';
}

/** Validate requested --out formats; unknown formats warn (returned), valid ones kept. */
function normalizeOut(outList) {
  const list = Array.isArray(outList) ? outList : [outList];
  const ok = [];
  const warnings = [];
  for (const f of list) {
    if (OUT_FORMATS.includes(f)) ok.push(f);
    else warnings.push(`--out "${f}" is not a known format (${OUT_FORMATS.join(', ')}) → ignored`);
  }
  return { formats: ok.length ? ok : ['default'], warnings };
}

/**
 * Consequence-honest WARN engine for unknown / reserved flags. Never throws.
 * @param {Set<string>} provided
 * @returns {string[]} warnings
 */
function computeWarnings(provided) {
  const warnings = [];
  for (const flag of provided) {
    if (UNIVERSAL_PARAMS.includes(flag)) {
      if (CONSEQUENCE[flag]) warnings.push(`--${flag} ${CONSEQUENCE[flag]}`);
      continue;
    }
    warnings.push(`unknown flag --${flag} → ignored (forward-compat; not in the /write vocabulary)`);
  }
  return warnings;
}

module.exports = {
  ParamsError,
  SUBCOMMANDS,
  UNIVERSAL_PARAMS,
  MODES,
  RESEARCH_LEVELS,
  GROUNDING_SOURCES,
  TRISTATE,
  OUT_FORMATS,
  MULTI_FLAGS,
  BOOL_FLAGS,
  TRISTATE_FLAGS,
  DEFAULTS,
  parseWriteArgs,
  readRequestFile,
  normalizeMode,
  normalizeOut,
  computeWarnings,
  splitPlus,
};
