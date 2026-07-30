#!/usr/bin/env node
'use strict';
/**
 * scripts/prompt/lib/library.cjs — capability `prompt-platform` v0.1
 *
 * Reads the parameter library at 06-ai-ops/skills/prompt/library/ and turns it into
 * a queryable index, so the direction skill can pull EXACTLY the parameters it needs
 * instead of the calling agent loading all 450KB into context.
 *
 * The library format is the contract:
 *   - each per-parameter file opens with
 *     `<!-- param: <key> | order: NN | label_en: … | label_vi: … | group: A-G | source: … -->`
 *   - values live in 4-column tables: `| # | Value (EN) | Ý nghĩa (VI) | Src |`
 *   - `Src` is `L` (from the source Notion catalog) or `+` (added here)
 *
 * Pure Node, zero API, zero secret. Every function here is a pure read.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_LIBRARY_REL = '06-ai-ops/skills/prompt/library';

const HEADER_RE = /<!--\s*param:\s*([^|]+?)\s*\|\s*order:\s*(\d+)\s*\|\s*label_en:\s*([^|]+?)\s*\|\s*label_vi:\s*([^|]+?)\s*\|\s*group:\s*([A-G])\s*\|\s*source:\s*(\S+)\s*-->/;
const ROW_RE = /^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*([L+])\s*\|\s*$/gm;
const SECTION_RE = /^##\s+([A-Z]{1,2})\.\s*(.+?)\s*$/gm;
const REQUIRED_RE = /^>\s*\*\*Bắt buộc:\*\*\s*(.+)$/m;
const QUESTION_RE = /^>\s*\*\*Câu hỏi:\*\*\s*\*(.+?)\*/m;
const PARAM_FILE_RE = /^(?!00-)(\d{2})-([a-z0-9-]+)\.md$/;

function libraryDir(repoRoot = REPO_ROOT, rel = DEFAULT_LIBRARY_REL) {
  return path.join(repoRoot, rel);
}

/** Parse one per-parameter markdown file into a structured record. */
function parseParamFile(text, file) {
  const h = HEADER_RE.exec(text);
  if (!h) return null;
  const [, key, order, labelEn, labelVi, group, source] = h;

  const required = (REQUIRED_RE.exec(text) || [])[1] || '';
  const question = (QUESTION_RE.exec(text) || [])[1] || '';

  // Walk sections so every value keeps its sub-group label.
  const sections = [];
  const marks = [];
  SECTION_RE.lastIndex = 0;
  let m;
  while ((m = SECTION_RE.exec(text)) !== null) marks.push({ letter: m[1], label: m[2], start: m.index + m[0].length });
  for (let i = 0; i < marks.length; i += 1) {
    const body = text.slice(marks[i].start, i + 1 < marks.length ? marks[i + 1].start : undefined);
    const rows = [];
    ROW_RE.lastIndex = 0;
    let r;
    while ((r = ROW_RE.exec(body)) !== null) {
      rows.push({ n: Number(r[1]), value: r[2], meaning: r[3], src: r[4] });
    }
    if (rows.length) sections.push({ letter: marks[i].letter, label: marks[i].label, rows });
  }

  const total = sections.reduce((a, s) => a + s.rows.length, 0);
  return {
    key: key.trim(),
    order: Number(order),
    labelEn: labelEn.trim(),
    labelVi: labelVi.trim(),
    group,
    source: source.trim(),
    required: required.trim(),
    question: question.trim(),
    file,
    sections,
    valueCount: total,
    fromCatalog: sections.reduce((a, s) => a + s.rows.filter((x) => x.src === 'L').length, 0),
  };
}

/** Load every parameter in the library. Returns { params[], byKey, totals }. */
function loadLibrary(repoRoot = REPO_ROOT, rel = DEFAULT_LIBRARY_REL) {
  const dir = libraryDir(repoRoot, rel);
  if (!fs.existsSync(dir)) throw new Error(`prompt library not found at ${rel}`);

  const params = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (!PARAM_FILE_RE.test(f)) continue;
    const rec = parseParamFile(fs.readFileSync(path.join(dir, f), 'utf-8'), f);
    if (rec) params.push(rec);
  }
  params.sort((a, b) => a.order - b.order);

  const byKey = new Map();
  for (const p of params) byKey.set(p.key, p);

  return {
    params,
    byKey,
    totals: {
      params: params.length,
      values: params.reduce((a, p) => a + p.valueCount, 0),
      fromCatalog: params.reduce((a, p) => a + p.fromCatalog, 0),
    },
  };
}

/** One parameter by key (`lighting`) or by order number (19). */
function getParam(lib, ref) {
  if (typeof ref === 'number') return lib.params.find((p) => p.order === ref) || null;
  return lib.byKey.get(String(ref)) || null;
}

/** Compact listing for a menu: key, label, group, required, count. */
function listParams(lib) {
  return lib.params.map((p) => ({
    order: p.order,
    key: p.key,
    labelEn: p.labelEn,
    labelVi: p.labelVi,
    group: p.group,
    required: p.required,
    valueCount: p.valueCount,
  }));
}

/** Free-text search across every value in the library. Case-insensitive substring. */
function searchValues(lib, term, limit = 40) {
  const t = String(term).toLowerCase();
  const hits = [];
  for (const p of lib.params) {
    for (const s of p.sections) {
      for (const r of s.rows) {
        if (r.value.toLowerCase().includes(t) || r.meaning.toLowerCase().includes(t)) {
          hits.push({ param: p.key, order: p.order, section: s.label, value: r.value, meaning: r.meaning, src: r.src });
          if (hits.length >= limit) return hits;
        }
      }
    }
  }
  return hits;
}

/**
 * The values of one parameter, flattened — what a skill actually wants when it has
 * decided "I need a lighting value" and is choosing among them.
 */
function valuesOf(lib, ref) {
  const p = getParam(lib, ref);
  if (!p) return [];
  return p.sections.flatMap((s) => s.rows.map((r) => ({ section: s.label, value: r.value, meaning: r.meaning, src: r.src })));
}

/**
 * Parameters a direction should consider first, by required-ness.
 * `✅` = always · `⚠️` = strongly recommended · `⭕` = optional.
 */
function requiredTiers(lib) {
  const tier = (p) => (p.required.startsWith('✅') ? 'always' : p.required.startsWith('⚠️') ? 'recommended' : 'optional');
  const out = { always: [], recommended: [], optional: [] };
  for (const p of lib.params) out[tier(p)].push(p.key);
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const lib = loadLibrary();
  const cmd = args[0] || 'list';

  if (cmd === 'list') {
    console.log(JSON.stringify({ totals: lib.totals, params: listParams(lib) }, null, 2));
  } else if (cmd === 'get') {
    const p = getParam(lib, /^\d+$/.test(args[1]) ? Number(args[1]) : args[1]);
    if (!p) { console.error(`[FAIL] no such parameter: ${args[1]}`); process.exit(1); }
    console.log(JSON.stringify(p, null, 2));
  } else if (cmd === 'values') {
    console.log(JSON.stringify(valuesOf(lib, /^\d+$/.test(args[1]) ? Number(args[1]) : args[1]), null, 2));
  } else if (cmd === 'search') {
    console.log(JSON.stringify(searchValues(lib, args.slice(1).join(' ')), null, 2));
  } else if (cmd === 'tiers') {
    console.log(JSON.stringify(requiredTiers(lib), null, 2));
  } else {
    console.error('usage: library.cjs [list|get <key|order>|values <key|order>|search <term>|tiers]');
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  DEFAULT_LIBRARY_REL,
  libraryDir,
  parseParamFile,
  loadLibrary,
  getParam,
  listParams,
  searchValues,
  valuesOf,
  requiredTiers,
};
