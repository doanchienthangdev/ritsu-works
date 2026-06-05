// ============================================================================
// scripts/deepask/chart-embed.cjs — deepask × dataviz chart embedding (v1.3)
// ============================================================================
// Capability `deepask` v1.3. Bridges deepask's synthesis IR `charts[]` (series-data,
// NOT pixels) to the /dataviz renderer so EVERY rich format can carry McKinsey-grade
// charts where they raise quality. deepask (the agent) is the LLM-native selector:
// it reads the dataviz catalog (06-ai-ops/skills/dataviz/catalog.md), picks the chart
// type per IR chart, and this helper renders it via scripts/dataviz/gen.cjs
// (--selected-by=agent), then embeds it per the target format:
//   svg-inline  → html/dashboard/interactive/canvas/article/pdf-via-html (native SVG)
//   png         → pptx/docx  (SVG→PNG via headless Chrome; graceful-degrade)
//   data-slide  → img-slide  (a chart slide renders via dataviz, NOT gpt-image-2 —
//                 deterministic + accurate + $0, vs a model that fabricates numbers)
//   native      → xlsx       (keep the spreadsheet's own chart object; dataviz optional)
//   companion   → infographics (single gpt-image poster; emit a dataviz chart alongside)
//   none        → inline/text/mermaid (no chart surface)
//
// The pure parts (embedModeForFormat / buildDatavizInvocation / selectChartsToEmbed)
// are unit-tested; the render + rasterize are side-effecting (spawn) and graceful —
// they NEVER throw the deepask run; on failure they degrade (SVG kept, note recorded).
// dataviz is PURE/OFFLINE ($0, no API key) so embedding charts costs nothing.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DATAVIZ_GEN = path.join(REPO_ROOT, 'scripts', 'dataviz', 'gen.cjs');

// ── PURE: format → how a chart is embedded in that artifact ─────────────────
const EMBED_MODE = Object.freeze({
  // code-rendered: SVG embeds natively (perfect fidelity, $0)
  html: 'svg-inline', dashboard: 'svg-inline', interactive: 'svg-inline',
  canvas: 'svg-inline', article: 'svg-inline', pdf: 'svg-inline',
  // office: need raster
  pptx: 'png', docx: 'png',
  // spreadsheet keeps its native chart object (dataviz is optional there)
  xlsx: 'native',
  // image deck: a data slide renders via dataviz (accurate), concept slides via gpt-image
  'img-slide': 'data-slide',
  // single AI poster: chart goes as a companion artifact (can't composite into gpt-image)
  infographics: 'companion',
  // no chart surface
  inline: 'none', text: 'none', mermaid: 'none',
});
function embedModeForFormat(format) {
  return EMBED_MODE[String(format || '').toLowerCase()] || 'none';
}
/** Does this format carry embedded dataviz charts at all? */
function formatEmbedsCharts(format) {
  const m = embedModeForFormat(format);
  return m !== 'none' && m !== 'native';
}

// ── PURE: which IR charts to render (cap for cost/clutter control) ──────────
function selectChartsToEmbed(ir, { maxCharts = 12 } = {}) {
  const charts = ir && Array.isArray(ir.charts) ? ir.charts : [];
  return charts.slice(0, Math.max(0, maxCharts));
}

// ── PURE: build the dataviz gen.cjs argv for ONE chart (the agent's pick) ───
// chart: { type (agent's --chart pick), data (IR series-data), message, source?, reason?,
//          select_confidence?, audience? }
function buildDatavizInvocation(chart, { style, artStyle, outPath, format = 'svg' } = {}) {
  const c = chart && typeof chart === 'object' ? chart : {};
  const argv = [DATAVIZ_GEN];
  if (c.type) argv.push(`--chart=${c.type}`);
  argv.push('--selected-by=agent');
  argv.push(`--select-reason=${c.reason || 'deepask synthesis IR chart — selected from the catalog for this exhibit'}`);
  if (c.select_confidence) argv.push(`--select-confidence=${c.select_confidence}`);
  if (c.message) argv.push(`--message=${c.message}`);
  if (c.source) argv.push(`--source=${c.source}`);
  if (c.audience) argv.push(`--audience=${c.audience}`);
  // IR series-data → --data inline JSON (dataviz loadData parses inline JSON)
  if (c.data != null) argv.push(`--data=${typeof c.data === 'string' ? c.data : JSON.stringify(c.data)}`);
  // brand + genre design context flow straight through (dataviz consumes the SAME axes)
  if (style && style !== 'plain') argv.push(`--style=${style}`);
  if (artStyle && artStyle !== 'plain') argv.push(`--art-style=${artStyle}`);
  argv.push('--format=svg');                 // dataviz always emits SVG; we rasterize after if needed
  if (outPath) argv.push(`--out=${outPath}`);
  return argv;
}

// ── PURE: discover a headless Chrome binary (mac / linux candidates) ────────
const CHROME_CANDIDATES = Object.freeze([
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
]);
function findChrome(env) {
  const override = env && env.CHROME_BIN;
  if (override && fs.existsSync(override)) return override;
  for (const p of CHROME_CANDIDATES) { if (fs.existsSync(p)) return p; }
  return null;
}

// ── PURE: read width/height from a dataviz <svg ...> string (for raster sizing) ──
function svgDims(svg) {
  const s = String(svg || '');
  const w = /<svg[^>]*\bwidth="(\d+)"/.exec(s);
  const h = /<svg[^>]*\bheight="(\d+)"/.exec(s);
  return { width: w ? Number(w[1]) : 720, height: h ? Number(h[1]) : 540 };
}

// ── SIDE-EFFECT: render ONE chart via dataviz → SVG file. Never throws. ─────
function renderChartSvg(chart, opts = {}) {
  const argv = buildDatavizInvocation(chart, { ...opts, format: 'svg' });
  try {
    // gen.cjs --out=<file.svg> writes the SVG + a run.json sibling; stdout = [OK] line.
    execFileSync('node', argv, { cwd: REPO_ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024 });
    const out = opts.outPath;
    if (out && fs.existsSync(out)) return { ok: true, svgPath: out, argv };
    return { ok: false, reason: 'dataviz produced no SVG at the expected path', argv };
  } catch (e) {
    return { ok: false, reason: `dataviz render failed: ${String(e.message || e).split('\n')[0]}`, argv };
  }
}

// ── SIDE-EFFECT: rasterize an SVG file → PNG via headless Chrome. Graceful. ─
function rasterizeSvgToPng({ svgPath, pngPath, env = process.env } = {}) {
  const chrome = findChrome(env);
  if (!chrome) return { ok: false, reason: 'no headless Chrome found (set CHROME_BIN) — SVG kept, PNG skipped' };
  if (!svgPath || !fs.existsSync(svgPath)) return { ok: false, reason: 'svg source missing' };
  const svg = fs.readFileSync(svgPath, 'utf-8');
  const { width, height } = svgDims(svg);
  // wrap so Chrome lays the SVG out at its intrinsic size on a white page
  const htmlPath = svgPath.replace(/\.svg$/, '.wrap.html');
  fs.writeFileSync(htmlPath, `<!doctype html><meta charset="utf-8"><style>*{margin:0;padding:0}html,body{background:#fff}</style>${svg}`);
  try {
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      `--screenshot=${pngPath}`, `--window-size=${width},${height}`,
      '--default-background-color=FFFFFFFF', '--force-device-scale-factor=2',
      `file://${htmlPath}`,
    ], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
    try { fs.unlinkSync(htmlPath); } catch (_) { /* leave the wrap file */ }
    if (fs.existsSync(pngPath)) return { ok: true, pngPath, width, height };
    return { ok: false, reason: 'Chrome ran but no PNG written' };
  } catch (e) {
    return { ok: false, reason: `Chrome rasterize failed: ${String(e.message || e).split('\n')[0]}` };
  }
}

// ── SIDE-EFFECT: render + embed ONE chart for a target format. Never throws. ─
// Returns { ok, embedMode, svgPath?, pngPath?, svg?, warnings[] }. On any failure the
// deepask run continues (the chart degrades to a note); charts are an ENHANCEMENT.
function embedChart(chart, { format, style, artStyle, outDir, index = 0, env = process.env } = {}) {
  const mode = embedModeForFormat(format);
  const warnings = [];
  if (mode === 'none' || mode === 'native') return { ok: false, embedMode: mode, warnings: [`format ${format} embeds no dataviz chart (mode=${mode})`] };
  const chartsDir = path.join(outDir || REPO_ROOT, 'charts');
  fs.mkdirSync(chartsDir, { recursive: true });
  const base = `${String(index + 1).padStart(2, '0')}-${(chart && chart.type) || 'chart'}`;
  const svgPath = path.join(chartsDir, `${base}.svg`);

  const r = renderChartSvg(chart, { style, artStyle, outPath: svgPath });
  if (!r.ok) { warnings.push(r.reason); return { ok: false, embedMode: mode, warnings }; }
  const svg = fs.readFileSync(svgPath, 'utf-8');

  // svg-inline → the SVG string IS the embed (caller inlines it).
  if (mode === 'svg-inline') return { ok: true, embedMode: mode, svgPath, svg, warnings };

  // png / data-slide → rasterize (graceful-degrade keeps the SVG).
  const pngPath = path.join(chartsDir, `${base}.png`);
  const ras = rasterizeSvgToPng({ svgPath, pngPath, env });
  if (!ras.ok) { warnings.push(`${ras.reason} (format ${format} wanted PNG) → embedding the SVG instead where supported`); return { ok: true, embedMode: 'svg-inline-fallback', svgPath, svg, warnings }; }
  return { ok: true, embedMode: mode, svgPath, pngPath, svg, warnings };
}

module.exports = {
  EMBED_MODE, embedModeForFormat, formatEmbedsCharts, selectChartsToEmbed,
  buildDatavizInvocation, svgDims, findChrome,
  renderChartSvg, rasterizeSvgToPng, embedChart, DATAVIZ_GEN, REPO_ROOT,
};
