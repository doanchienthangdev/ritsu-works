'use strict';
/**
 * params.cjs — flag/config parsing for the /translate command (capability `translate`).
 * Pure + deterministic (no I/O) so it is fully unit-testable. The CLI (cli.cjs)
 * injects the detected source format; this module turns raw argv into a typed config.
 *
 * Contract: parseArgs(argv) -> {src, flags, warnings}
 *           resolveConfig({src, srcFormat, flags, cwd}) -> Config
 */
const path = require('path');
const { SRC_FORMATS } = require('./detect.cjs');

const OUT_FORMATS = ['pdf', 'epub', 'docx', 'pptx', 'md', 'txt', 'html'];

// A pragmatic, extensible language table (code -> display + endonym). Unknown
// codes pass through honestly (name = the code) rather than failing.
const LANGS = {
  vi: { code: 'vi', name: 'Vietnamese', endonym: 'Tiếng Việt' },
  en: { code: 'en', name: 'English', endonym: 'English' },
  ja: { code: 'ja', name: 'Japanese', endonym: '日本語' },
  zh: { code: 'zh', name: 'Chinese (Simplified)', endonym: '简体中文' },
  'zh-tw': { code: 'zh-tw', name: 'Chinese (Traditional)', endonym: '繁體中文' },
  ko: { code: 'ko', name: 'Korean', endonym: '한국어' },
  fr: { code: 'fr', name: 'French', endonym: 'Français' },
  es: { code: 'es', name: 'Spanish', endonym: 'Español' },
  de: { code: 'de', name: 'German', endonym: 'Deutsch' },
  pt: { code: 'pt', name: 'Portuguese', endonym: 'Português' },
  it: { code: 'it', name: 'Italian', endonym: 'Italiano' },
  ru: { code: 'ru', name: 'Russian', endonym: 'Русский' },
  th: { code: 'th', name: 'Thai', endonym: 'ไทย' },
  id: { code: 'id', name: 'Indonesian', endonym: 'Bahasa Indonesia' },
  hi: { code: 'hi', name: 'Hindi', endonym: 'हिन्दी' },
  ar: { code: 'ar', name: 'Arabic', endonym: 'العربية', rtl: true },
};
const LANG_ALIASES = {
  vietnamese: 'vi', 'tiếng việt': 'vi', 'tieng viet': 'vi', viet: 'vi',
  english: 'en', anh: 'en',
  japanese: 'ja', 'nhật': 'ja', nhat: 'ja',
  chinese: 'zh', mandarin: 'zh', 'trung': 'zh', 'trung quốc': 'zh',
  korean: 'ko', 'hàn': 'ko',
  french: 'fr', 'pháp': 'fr', spanish: 'es', 'tây ban nha': 'es',
  german: 'de', 'đức': 'de', portuguese: 'pt', italian: 'it',
  russian: 'ru', thai: 'th', indonesian: 'id', hindi: 'hi', arabic: 'ar',
};

function resolveLang(s, dflt = 'vi') {
  if (s == null || s === true || String(s).trim() === '') return { ...LANGS[dflt] };
  const k = String(s).trim().toLowerCase();
  if (LANGS[k]) return { ...LANGS[k] };
  if (LANG_ALIASES[k]) return { ...LANGS[LANG_ALIASES[k]] };
  return { code: k.replace(/[^a-z0-9-]/g, '') || k, name: String(s).trim(), endonym: String(s).trim(), unknown: true };
}

/** Parse the `--out=pdf+epub` spec into a deduped list of known output formats. */
function parseOut(spec, srcFormat, warnings = []) {
  const fallback = () => {
    // default: same format as source; webpage/html source defaults to pdf
    if (srcFormat === 'html') return ['pdf'];
    return SRC_FORMATS.includes(srcFormat) ? [srcFormat] : ['pdf'];
  };
  if (spec == null || spec === true || String(spec).trim() === '') return fallback();
  const out = [];
  for (let tok of String(spec).split('+')) {
    tok = tok.trim().toLowerCase().replace(/^\./, '');
    if (!tok) continue;
    const fmt = tok === 'markdown' ? 'md' : tok;
    if (OUT_FORMATS.includes(fmt)) {
      if (!out.includes(fmt)) out.push(fmt);
    } else {
      warnings.push(`unknown output format '${tok}' — ignored`);
    }
  }
  return out.length ? out : fallback();
}

/** Parse `--split` into auto | toc | heading | none | {count:N}. */
function parseSplit(v, warnings = []) {
  if (v == null || v === true || String(v).trim() === '') return 'auto';
  const s = String(v).trim().toLowerCase();
  if (['auto', 'toc', 'heading', 'none'].includes(s)) return s;
  const m = s.match(/^count=(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 2 && n <= 200) return { count: n };
    warnings.push(`--split=count=${m[1]} out of range (2..200) — using auto`);
    return 'auto';
  }
  warnings.push(`unknown --split='${v}' — using auto`);
  return 'auto';
}

const MODES = ['auto', 'book', 'doc', 'slides'];

/** Split argv into {src, flags, warnings}. argv = tokens after the command word. */
function parseArgs(argv) {
  const warnings = [];
  const flags = {};
  let src = null;
  for (const aRaw of (Array.isArray(argv) ? argv : [])) {
    const a = String(aRaw);
    if (a.startsWith('--')) {
      const body = a.slice(2);
      const eq = body.indexOf('=');
      if (eq === -1) flags[body] = true;
      else flags[body.slice(0, eq)] = body.slice(eq + 1);
    } else if (src === null) {
      src = a;
    } else {
      warnings.push(`unexpected extra argument '${a}' — ignored`);
    }
  }
  return { src, flags, warnings };
}

const KNOWN_FLAGS = new Set([
  'to', 'from', 'out', 'style', 'mode', 'split', 'out-dir', 'name',
  'workflow', 'no-workflow', 'dry-run', 'max-cost-usd', 'glossary',
  'src', 'from-format',
]);

/** Build the full typed Config from a parsed {src, srcFormat, flags}. */
function resolveConfig({ src, srcFormat, flags = {}, cwd = process.cwd() }) {
  const warnings = [];
  src = flags.src || src;
  if (!src) throw new Error('translate: no source given (pass a file path or URL)');

  const fmt = flags['from-format'] ? String(flags['from-format']).toLowerCase() : srcFormat;
  if (!fmt) {
    throw new Error(`translate: could not detect source format for '${src}' — pass --from-format=<pdf|docx|pptx|html|md|txt>`);
  }
  if (!SRC_FORMATS.includes(fmt)) {
    throw new Error(`translate: unsupported source format '${fmt}' (supported: ${SRC_FORMATS.join(', ')})`);
  }

  const to = resolveLang(flags.to, 'vi');
  const from = flags.from ? resolveLang(flags.from) : null;
  const out = parseOut(flags.out, fmt, warnings);
  const split = parseSplit(flags.split, warnings);

  let mode = String(flags.mode || 'auto').toLowerCase();
  if (!MODES.includes(mode)) { warnings.push(`unknown --mode='${flags.mode}' — using auto`); mode = 'auto'; }

  const style = (flags.style == null || flags.style === true || String(flags.style).trim() === '')
    ? 'claude' : String(flags.style).trim();

  let workflow = 'auto';
  if (flags['no-workflow']) workflow = false;
  else if (flags.workflow === true || String(flags.workflow).toLowerCase() === 'true') workflow = true;
  else if (String(flags.workflow).toLowerCase() === 'false') workflow = false;

  const isUrl = /^https?:\/\//i.test(src);
  const base = isUrl
    ? (src.replace(/[#?].*$/, '').replace(/\/+$/, '').split('/').pop() || 'webpage')
    : path.basename(src).replace(/\.[^.]+$/, '');
  const name = (flags.name && flags.name !== true) ? String(flags.name) : base;
  const outDir = (flags['out-dir'] && flags['out-dir'] !== true)
    ? path.resolve(cwd, String(flags['out-dir']))
    : (isUrl ? path.resolve(cwd) : path.resolve(path.dirname(path.resolve(cwd, src))));

  let maxCost = 8.0;
  if (flags['max-cost-usd'] != null && flags['max-cost-usd'] !== true) {
    const n = Number(flags['max-cost-usd']);
    if (Number.isFinite(n) && n > 0) maxCost = n;
    else warnings.push(`invalid --max-cost-usd='${flags['max-cost-usd']}' — using ${maxCost}`);
  }

  for (const k of Object.keys(flags)) {
    if (!KNOWN_FLAGS.has(k)) warnings.push(`unknown flag --${k} — ignored`);
  }

  return {
    src, isUrl, srcFormat: fmt,
    to, from,
    out, style, mode, split,
    outDir, name,
    workflow,
    dryRun: !!flags['dry-run'],
    maxCostUsd: maxCost,
    glossary: (flags.glossary && flags.glossary !== true) ? String(flags.glossary) : null,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'doc',
    warnings: warnings.concat(flags.__warnings || []),
  };
}

module.exports = {
  parseArgs, resolveConfig, resolveLang, parseOut, parseSplit,
  OUT_FORMATS, SRC_FORMATS, LANGS, MODES,
};
