#!/usr/bin/env node
'use strict';
/**
 * scripts/dataviz/gen.cjs — /dataviz orchestrator (the impure edge)
 * ----------------------------------------------------------------------------
 * Capability `dataviz` v0.1. The ONLY impure file: it reads --data, resolves
 * --style, and writes output. The brains (select.cjs, render.cjs, lib/theme.cjs,
 * lib/params.cjs) are PURE + unit-tested. NO secret / NO API key (the renderer is
 * pure/offline — unlike /image's OPENAI_API_KEY).
 *
 *   node scripts/dataviz/gen.cjs --message="..." --data=<path|json> [flags]
 *
 * Flow: parse → resolveStyle (catch StyleResolveError → classic + warn; @cto #10)
 *   → buildTheme → load data → selectChart (if --chart=auto) → renderChart
 *   → inline (return svg) OR write .archives/dataviz/<date>-<slug>/ + run.json.
 * Output: { ok, outcome, chartType, ideal, files, svg, warnings, runJson }
 *   outcome ∈ { inline, written, dry_run, error }.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { parseDatavizArgs, normalizeFormat, normalizeTheme, resolveSize, numberFormat, computeWarnings } = require('./lib/params.cjs');
const { buildTheme } = require('./lib/theme.cjs');
const { selectChart, BUILT } = require('./select.cjs');
const { renderChart } = require('./render.cjs');

let resolveStyle;
try { ({ resolveStyle } = require('../design-system/resolve-style.cjs')); } catch (_) { resolveStyle = null; }

const RENDERERS_YAML = path.join(REPO_ROOT, 'knowledge', 'dataviz-renderers.yaml');

function slugify(s) {
  return String(s || 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'chart';
}

/** Minimal CSV → {categories, series}. First column = categories; header row = series names. */
function parseCsv(text) {
  const lines = String(text).trim().split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return {};
  const cells = (l) => l.split(',').map((c) => c.trim());
  const header = cells(lines[0]);
  const seriesNames = header.slice(1);
  const categories = [];
  const series = seriesNames.map((n) => ({ name: n, values: [] }));
  for (let i = 1; i < lines.length; i++) {
    const row = cells(lines[i]);
    categories.push(row[0]);
    seriesNames.forEach((_, si) => series[si].values.push(Number(row[si + 1])));
  }
  return { categories, series };
}

/** Load --data: a file path (.json/.csv), inline JSON, or inline CSV. */
function loadData(raw) {
  if (raw == null || raw === true) return {};
  let text = String(raw);
  const asPath = path.isAbsolute(text) ? text : path.join(process.cwd(), text);
  if (/\.(json|csv)$/i.test(text) && fs.existsSync(asPath)) {
    text = fs.readFileSync(asPath, 'utf-8');
    if (/\.csv$/i.test(asPath)) return parseCsv(text);
  }
  try { return JSON.parse(text); } catch (_) { /* fall through */ }
  if (text.includes(',') && /\n/.test(text)) return parseCsv(text);
  return {};
}

function buildHints(data, options) {
  const series = Array.isArray(data && data.series) ? data.series : (Array.isArray(data && data.values) ? [{ values: data.values }] : []);
  const cats = Array.isArray(data && data.categories) ? data.categories : [];
  const allVals = series.flatMap((s) => (s.values || []).map(Number));
  const isYearAxis = cats.some((c) => /^(19|20)\d{2}$/.test(String(c))) || cats.some((c) => /^q[1-4]/i.test(String(c)));
  return {
    n_categories: cats.length,
    n_periods: cats.length,
    n_series: series.length || 1,
    n_measures: Array.isArray(data && data.points) ? 2 : 0,
    has_negatives: allVals.some((v) => v < 0) || Array.isArray(data && data.steps && data.steps.some((s) => Number(s.delta) < 0)),
    has_time_axis: isYearAxis,
  };
}

function run(argv) {
  const { options, provided } = parseDatavizArgs(argv);
  const warnings = [];

  // 1. resolve --style (catch StyleResolveError → classic + warn).
  let resolved = null;
  if (typeof options.style === 'string' && options.style && options.style !== 'auto' && resolveStyle) {
    try { resolved = resolveStyle(options.style, { interactive: false }); }
    catch (e) { warnings.push(`--style "${options.style}" could not be resolved (${e && e.message ? e.message.split('\n')[0] : 'error'}) → classic McKinsey theme`); resolved = { mode: 'plain' }; }
  }
  const themeName = normalizeTheme(options.theme);
  const { theme, warnings: themeWarns } = buildTheme(resolved, themeName);
  warnings.push(...themeWarns);

  // 2. load data.
  const data = loadData(options.data);

  // 3. select chart (auto) or honor --chart.
  let chartType; let ideal; let reason = '';
  if (!options.chart || options.chart === 'auto') {
    const sel = selectChart(options.message || options.title || '', buildHints(data, options));
    chartType = sel.chartType; ideal = sel.ideal; reason = sel.reason;
  } else {
    ideal = options.chart;
    chartType = BUILT.includes(options.chart) ? options.chart : 'bar';
    if (!BUILT.includes(options.chart)) { reason = `chart "${options.chart}" is not a v0.1 built type → rendered as bar`; warnings.push(reason); }
  }
  if (reason) warnings.push(`chart selection: ${reason}`);

  // 4. spec.
  const { width, height } = resolveSize(options);
  const spec = {
    title: options.title || options.message || '',
    titleStyle: options['title-style'] === 'topic' ? 'topic' : 'action',
    source: typeof options.source === 'string' ? options.source : '',
    footnotes: typeof options.footnotes === 'string' ? options.footnotes.split('|').map((s) => s.trim()).filter(Boolean) : [],
    highlight: options.highlight,
    sort: options.sort !== false,
    width, height,
    numberFormat: numberFormat(options),
  };

  // adapter warnings (art-style etc.)
  warnings.push(...computeWarnings({ supports: require('./lib/params.cjs').UNIVERSAL_PARAMS.filter((p) => p !== 'art-style') }, provided));

  const format = normalizeFormat(options.format);
  const runJson = { capability: 'dataviz', version: '0.1.0', chartType, ideal, reason, theme: theme.name, styled: theme.styled, format, width, height, title: spec.title, source: spec.source, warnings, generated_at: new Date().toISOString() };

  if (options['dry-run']) {
    return { ok: true, outcome: 'dry_run', chartType, ideal, files: [], svg: null, warnings, runJson, plan: { chartType, ideal, reason, theme: theme.name, width, height, title: spec.title, source: spec.source } };
  }

  // 5. render.
  let svg;
  try { svg = renderChart(chartType, data, spec, theme); }
  catch (e) { return { ok: false, outcome: 'error', chartType, ideal, files: [], svg: null, warnings, error: e && e.message, runJson }; }

  if (format === 'png' || format === 'pdf') warnings.push(`--format=${format} raster output is a v0.2 stretch → wrote SVG instead`);

  // 6. inline vs write.
  if (format === 'inline' && !options.out) {
    return { ok: true, outcome: 'inline', chartType, ideal, files: [], svg, warnings, runJson };
  }
  const date = new Date().toISOString().slice(0, 10);
  const dir = options.out && /\/$/.test(String(options.out)) ? path.resolve(process.cwd(), options.out) : path.join(REPO_ROOT, '.archives', 'dataviz', `${date}-${slugify(spec.title)}`);
  fs.mkdirSync(dir, { recursive: true });
  const svgPath = options.out && !/\/$/.test(String(options.out)) ? path.resolve(process.cwd(), options.out) : path.join(dir, `${slugify(spec.title)}.svg`);
  fs.writeFileSync(svgPath, svg);
  const files = [svgPath];
  if (format === 'html') { const htmlPath = svgPath.replace(/\.svg$/, '.html'); fs.writeFileSync(htmlPath, `<!doctype html><meta charset="utf-8"><title>${spec.title}</title><body style="margin:0">${svg}</body>`); files.push(htmlPath); }
  const runPath = path.join(path.dirname(svgPath), 'run.json'); fs.writeFileSync(runPath, JSON.stringify(runJson, null, 2)); files.push(runPath);
  return { ok: true, outcome: 'written', chartType, ideal, files, svg, warnings, runJson };
}

function main() {
  const r = run(process.argv.slice(2));
  if (r.outcome === 'inline') { process.stdout.write(r.svg); }
  else if (r.outcome === 'dry_run') { console.log(JSON.stringify(r.plan, null, 2)); }
  else if (r.outcome === 'written') { console.log(`[OK] dataviz ${r.chartType} → ${r.files.join(', ')}`); }
  else if (r.outcome === 'error') { console.error(`[FAIL] ${r.error}`); process.exit(1); }
  if (r.warnings && r.warnings.length) r.warnings.forEach((w) => console.error(`[warn] ${w}`));
}

if (require.main === module) main();

module.exports = { run, loadData, parseCsv, buildHints, slugify };
