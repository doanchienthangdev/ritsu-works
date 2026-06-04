// ============================================================================
// scripts/dataviz/render.cjs — the McKinsey-grade SVG chart renderer
// ============================================================================
// Capability `dataviz` v0.1. PURE, deterministic, zero-dependency.
//   renderChart(chartType, data, spec, theme) -> svgString
// No DOM, no canvas, no async, no Date.now()/Math.random(). Every number routes
// through fmt() (svg.cjs) → byte-stable output, asserted with toBe()/toEqual().
//
// Encodes the McKinsey aesthetic (dataviz-design-brief): one-highlight-only,
// data-ink minimalism (no border/fill/3D/gridline/legend), bar value-axis FROM
// ZERO, DIRECT data labels (no legend), ONE message per exhibit, action-title ON
// the chart, SOURCE footer on EVERY exhibit, fixed title→plot→footer rhythm.
// Label de-collision on dense data is a documented v0.1 non-goal (no text-
// measurement engine; @cto must-fix #5) — we position with text-anchor + a coarse
// width estimate for axis ticks only.
// ============================================================================

'use strict';

const S = require('./lib/svg.cjs');
const { fmt, rect, line, circle, text, group, polylineD, linearScale, bandScale, niceMax, svgDoc } = S;

const BUILT = ['bar', 'column', 'line', 'stacked', 'stacked100', 'grouped', 'scatter', 'waterfall', 'kpi'];

// ── value formatting (data labels; distinct from fmt() which is for coordinates) ──
function valFmt(v, spec) {
  if (!Number.isFinite(v)) return '';
  const nf = (spec && spec.numberFormat) || {};
  const dec = nf.percent ? (nf.percentDecimals != null ? nf.percentDecimals : 0) : (nf.decimals != null ? nf.decimals : 0);
  let s;
  if (nf.scaleAbbrev && Math.abs(v) >= 1000) {
    const abs = Math.abs(v); let d = v; let u = '';
    if (abs >= 1e9) { d = v / 1e9; u = 'B'; } else if (abs >= 1e6) { d = v / 1e6; u = 'M'; } else { d = v / 1e3; u = 'K'; }
    s = (Math.round(d * 10) / 10).toFixed(1).replace(/\.0$/, '') + u;
  } else {
    s = v.toFixed(dec);
    if (nf.thousandsSep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  if (nf.currency) s = nf.currency + s;
  if (nf.percent) s += '%';
  return s;
}

// ── shared frame: title band (top) → plot rect (middle) → source band (bottom) ──
const PAD = 28;
const TITLE_FS = 17;
const SUB_FS = 12;
const LABEL_FS = 11;
const SRC_FS = 10;

function frame(spec, theme) {
  const W = spec.width;
  const H = spec.height;
  const titleLines = spec.title ? 1 : 0;
  const subLines = spec.subtitle ? 1 : 0;
  const titleBandH = PAD + titleLines * (TITLE_FS + 6) + subLines * (SUB_FS + 4) + 8;
  const footerBandH = (spec.source ? SRC_FS + 6 : 0) + ((spec.footnotes && spec.footnotes.length) ? spec.footnotes.length * (SRC_FS + 2) : 0) + PAD * 0.7;
  const plot = { x: PAD, y: titleBandH, w: W - PAD * 2, h: H - titleBandH - footerBandH };

  let head = '';
  if (spec.title) {
    head += text(spec.title, { x: PAD, y: PAD + TITLE_FS, fill: theme.ink, 'font-size': TITLE_FS, 'font-family': spec.titleStyle === 'topic' ? theme.headingFont : theme.headingFont, 'font-weight': 'bold' });
  }
  if (spec.subtitle) {
    head += text(spec.subtitle, { x: PAD, y: PAD + (titleLines ? TITLE_FS + 6 + SUB_FS : SUB_FS), fill: theme.inkMuted, 'font-size': SUB_FS, 'font-family': theme.bodyFont });
  }

  let foot = '';
  let fy = H - footerBandH + SRC_FS + 4;
  if (spec.footnotes && spec.footnotes.length) {
    for (const fn of spec.footnotes) { foot += text(fn, { x: PAD, y: fy, fill: theme.inkMuted, 'font-size': SRC_FS, 'font-family': theme.bodyFont }); fy += SRC_FS + 2; }
  }
  if (spec.source) {
    const src = /^source\s*:/i.test(spec.source) ? spec.source : `Source: ${spec.source}`;
    foot += text(src, { x: PAD, y: fy, fill: theme.inkMuted, 'font-size': SRC_FS, 'font-family': theme.bodyFont });
  }
  // wordmark lower-right (the --style logo name or the McKinsey-equivalent placeholder)
  const mark = theme.styleName ? theme.styleName : 'McKinsey & Company';
  foot += text(mark, { x: W - PAD, y: H - PAD * 0.5, fill: theme.inkMuted, 'font-size': SRC_FS, 'font-family': theme.bodyFont, 'text-anchor': 'end' });

  return { W, H, plot, head, foot };
}

// pick a series color applying the one-highlight rule: highlighted index = highlight, else neutral ramp.
function seriesColor(i, highlightIdx, theme) {
  if (highlightIdx != null && i === highlightIdx) return theme.highlight;
  if (highlightIdx == null && i === 0) return theme.highlight;  // default: first series is the loud one
  const neutrals = [theme.neutral1, theme.neutral2];
  return neutrals[(highlightIdx == null ? i - 1 : i) % neutrals.length] || theme.neutral1;
}

function normCats(data) { return Array.isArray(data && data.categories) ? data.categories.map((c) => String(c)) : []; }
function normSeries(data) {
  if (Array.isArray(data && data.series) && data.series.length) return data.series.map((s, i) => ({ name: String(s.name != null ? s.name : `S${i + 1}`), values: (s.values || []).map(Number) }));
  if (Array.isArray(data && data.values)) return [{ name: String((data && data.name) || 'value'), values: data.values.map(Number) }];
  return [];
}
function highlightIndexFor(spec, series) {
  if (spec.highlight == null) return null;
  if (typeof spec.highlight === 'number') return spec.highlight;
  const i = series.findIndex((s) => s.name.toLowerCase() === String(spec.highlight).toLowerCase());
  return i >= 0 ? i : null;
}

// ── BAR (horizontal, sorted desc) ──
function renderBar(data, spec, theme, plot) {
  const cats = normCats(data);
  const series = normSeries(data);
  const vals = series[0] ? series[0].values : [];
  let rows = cats.map((c, i) => ({ c, v: vals[i] || 0, i }));
  if (spec.sort !== false) rows = rows.slice().sort((a, b) => b.v - a.v);
  const max = niceMax(Math.max(0, ...rows.map((r) => r.v)));
  const labelW = Math.min(plot.w * 0.32, 120);
  const x0 = plot.x + labelW;
  const x = linearScale(0, max, x0, plot.x + plot.w - 40);
  const band = bandScale(rows.length, plot.y, plot.y + plot.h, 0.35);
  const hi = highlightIndexFor(spec, series);
  let out = '';
  rows.forEach((r, idx) => {
    const yy = band.pos(idx);
    const color = (hi != null ? r.i === hi : idx === 0) ? theme.highlight : theme.neutral1;
    out += rect(x0, yy, x(r.v) - x0, band.bandwidth, { fill: color });
    out += text(r.c, { x: x0 - 8, y: yy + band.bandwidth / 2 + 4, fill: theme.ink, 'font-size': LABEL_FS, 'font-family': theme.bodyFont, 'text-anchor': 'end' });
    out += text(valFmt(r.v, spec), { x: x(r.v) + 5, y: yy + band.bandwidth / 2 + 4, fill: theme.ink, 'font-size': LABEL_FS, 'font-family': theme.bodyFont, 'font-weight': (hi != null ? r.i === hi : idx === 0) ? 'bold' : 'normal' });
  });
  return out;
}

// ── COLUMN (vertical, zero-baseline) ──
function renderColumn(data, spec, theme, plot) {
  const cats = normCats(data);
  const series = normSeries(data);
  const vals = series[0] ? series[0].values : [];
  const max = niceMax(Math.max(0, ...vals));
  const base = plot.y + plot.h - 22;
  const y = linearScale(0, max, base, plot.y + 14);
  const band = bandScale(cats.length, plot.x, plot.x + plot.w, 0.4);
  const hi = spec.highlight;
  let out = line(plot.x, base, plot.x + plot.w, base, { stroke: theme.neutral1, 'stroke-width': 1 });
  cats.forEach((c, i) => {
    const xx = band.pos(i);
    const v = vals[i] || 0;
    const color = (typeof hi === 'number' ? i === hi : i === cats.length - 1) ? theme.highlight : theme.neutral1;
    out += rect(xx, y(v), band.bandwidth, base - y(v), { fill: color });
    out += text(valFmt(v, spec), { x: xx + band.bandwidth / 2, y: y(v) - 5, fill: theme.ink, 'font-size': LABEL_FS, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
    out += text(c, { x: xx + band.bandwidth / 2, y: base + 14, fill: theme.inkMuted, 'font-size': LABEL_FS, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
  });
  return out;
}

// ── LINE (multi-series, end-labels) ──
function renderLine(data, spec, theme, plot) {
  const cats = normCats(data);
  const series = normSeries(data);
  const allV = series.flatMap((s) => s.values);
  const max = niceMax(Math.max(0, ...allV));
  const base = plot.y + plot.h - 22;
  const y = linearScale(0, max, base, plot.y + 14);
  const n = Math.max(1, cats.length - 1);
  const x = (i) => plot.x + (plot.w - 60) * (n === 0 ? 0 : i / n);
  const hi = highlightIndexFor(spec, series);
  let out = line(plot.x, base, plot.x + plot.w - 60, base, { stroke: theme.neutral1, 'stroke-width': 1 });
  cats.forEach((c, i) => { out += text(c, { x: x(i), y: base + 14, fill: theme.inkMuted, 'font-size': LABEL_FS, 'font-family': theme.bodyFont, 'text-anchor': 'middle' }); });
  series.forEach((s, si) => {
    const color = (hi != null ? si === hi : si === 0) ? theme.highlight : theme.neutral1;
    const pts = s.values.map((v, i) => [x(i), y(v)]);
    out += S.path(polylineD(pts), { fill: 'none', stroke: color, 'stroke-width': (hi != null ? si === hi : si === 0) ? 2.5 : 1.5 });
    const last = s.values.length - 1;
    if (last >= 0) out += text(`${s.name} ${valFmt(s.values[last], spec)}`, { x: x(last) + 6, y: y(s.values[last]) + 4, fill: color, 'font-size': LABEL_FS, 'font-family': theme.bodyFont });
  });
  return out;
}

// ── STACKED / STACKED100 (column) ──
function renderStacked(data, spec, theme, plot, normalized) {
  const cats = normCats(data);
  const series = normSeries(data);
  const totals = cats.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0));
  const max = normalized ? 100 : niceMax(Math.max(0, ...totals));
  const base = plot.y + plot.h - 22;
  const y = linearScale(0, max, base, plot.y + 14);
  const band = bandScale(cats.length, plot.x, plot.x + plot.w, 0.45);
  let out = '';
  cats.forEach((c, i) => {
    const xx = band.pos(i);
    let acc = 0;
    series.forEach((s, si) => {
      const raw = s.values[i] || 0;
      const v = normalized ? (totals[i] ? (raw / totals[i]) * 100 : 0) : raw;
      const top = y(acc + v);
      const bot = y(acc);
      out += rect(xx, top, band.bandwidth, bot - top, { fill: si === 0 ? theme.highlight : (si === 1 ? theme.neutral1 : theme.neutral2) });
      if (v > (normalized ? 6 : max * 0.05)) out += text(valFmt(normalized ? v : raw, spec) + (normalized ? '%' : ''), { x: xx + band.bandwidth / 2, y: (top + bot) / 2 + 4, fill: '#FFFFFF', 'font-size': LABEL_FS - 1, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
      acc += v;
    });
    if (!normalized) out += text(valFmt(totals[i], spec), { x: xx + band.bandwidth / 2, y: y(totals[i]) - 5, fill: theme.ink, 'font-size': LABEL_FS, 'font-family': theme.bodyFont, 'font-weight': 'bold', 'text-anchor': 'middle' });
    out += text(c, { x: xx + band.bandwidth / 2, y: base + 14, fill: theme.inkMuted, 'font-size': LABEL_FS, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
  });
  return out;
}

// ── GROUPED (paired bars) ──
function renderGrouped(data, spec, theme, plot) {
  const cats = normCats(data);
  const series = normSeries(data);
  const allV = series.flatMap((s) => s.values);
  const max = niceMax(Math.max(0, ...allV));
  const base = plot.y + plot.h - 22;
  const y = linearScale(0, max, base, plot.y + 14);
  const band = bandScale(cats.length, plot.x, plot.x + plot.w, 0.3);
  const hi = highlightIndexFor(spec, series);
  const inner = bandScale(series.length, 0, band.bandwidth, 0.12);
  let out = line(plot.x, base, plot.x + plot.w, base, { stroke: theme.neutral1, 'stroke-width': 1 });
  cats.forEach((c, i) => {
    const xx = band.pos(i);
    series.forEach((s, si) => {
      const v = s.values[i] || 0;
      const bx = xx + inner.pos(si);
      const color = (hi != null ? si === hi : si === 0) ? theme.highlight : theme.neutral1;
      out += rect(bx, y(v), inner.bandwidth, base - y(v), { fill: color });
      out += text(valFmt(v, spec), { x: bx + inner.bandwidth / 2, y: y(v) - 4, fill: theme.ink, 'font-size': LABEL_FS - 1, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
    });
    out += text(c, { x: xx + band.bandwidth / 2, y: base + 14, fill: theme.inkMuted, 'font-size': LABEL_FS, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
  });
  return out;
}

// ── SCATTER ──
function renderScatter(data, spec, theme, plot) {
  const pts = Array.isArray(data && data.points) ? data.points : [];
  const xs = pts.map((p) => Number(p.x));
  const ys = pts.map((p) => Number(p.y));
  const xmax = niceMax(Math.max(1, ...xs));
  const ymax = niceMax(Math.max(1, ...ys));
  const base = plot.y + plot.h - 22;
  const x = linearScale(0, xmax, plot.x + 30, plot.x + plot.w - 20);
  const y = linearScale(0, ymax, base, plot.y + 14);
  let out = line(plot.x + 30, base, plot.x + plot.w - 20, base, { stroke: theme.neutral1, 'stroke-width': 1 });
  out += line(plot.x + 30, base, plot.x + 30, plot.y + 14, { stroke: theme.neutral1, 'stroke-width': 1 });
  pts.forEach((p) => {
    out += circle(x(Number(p.x)), y(Number(p.y)), 4, { fill: p.highlight ? theme.highlight : theme.neutral1 });
    if (p.label) out += text(String(p.label), { x: x(Number(p.x)) + 6, y: y(Number(p.y)) + 3, fill: theme.inkMuted, 'font-size': LABEL_FS - 1, 'font-family': theme.bodyFont });
  });
  if (spec.xLabel) out += text(spec.xLabel, { x: plot.x + plot.w / 2, y: base + 16, fill: theme.inkMuted, 'font-size': LABEL_FS, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
  return out;
}

// ── WATERFALL (running-cumulative bridge; @cto must-fix #4) ──
function renderWaterfall(data, spec, theme, plot) {
  const steps = Array.isArray(data && data.steps) ? data.steps.map((s) => ({ label: String(s.label), delta: Number(s.delta), total: !!s.total })) : [];
  // running cumulative — total steps sit at absolute (0..cumulative); delta steps float.
  let cum = 0;
  const bars = steps.map((s) => {
    if (s.total) { const start = 0; const end = cum; cum = end; return { ...s, start, end }; }
    const start = cum; const end = cum + s.delta; cum = end; return { ...s, start, end };
  });
  const allY = bars.flatMap((b) => [b.start, b.end]).concat([0]);
  const lo = Math.min(...allY);
  const hi = Math.max(...allY, 1);
  const base = plot.y + plot.h - 22;
  const y = linearScale(lo, niceMax(hi - lo) + lo, base, plot.y + 14);
  const band = bandScale(bars.length, plot.x, plot.x + plot.w, 0.42);
  const zeroY = y(0);
  let out = line(plot.x, zeroY, plot.x + plot.w, zeroY, { stroke: theme.neutral1, 'stroke-width': 1 });
  let prevX = null; let prevTopY = null;
  bars.forEach((b, i) => {
    const xx = band.pos(i);
    const top = Math.min(y(b.start), y(b.end));
    const h = Math.abs(y(b.end) - y(b.start));
    const color = b.total ? theme.highlight : (b.delta >= 0 ? theme.accent : theme.amber);
    out += rect(xx, top, band.bandwidth, h, { fill: color });
    out += text((b.total ? '' : (b.delta >= 0 ? '+' : '')) + valFmt(b.delta, spec), { x: xx + band.bandwidth / 2, y: top - 5, fill: theme.ink, 'font-size': LABEL_FS - 1, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
    out += text(b.label, { x: xx + band.bandwidth / 2, y: base + 14, fill: theme.inkMuted, 'font-size': LABEL_FS - 1, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
    // connector from prev bar's end-top to this bar's start-top
    const startTopY = y(b.end >= b.start ? b.start : b.start);
    if (prevX != null) out += line(prevX, prevTopY, xx, y(b.start), { stroke: theme.neutral2, 'stroke-width': 1, 'stroke-dasharray': '2,2' });
    prevX = xx + band.bandwidth; prevTopY = y(b.end);
  });
  return out;
}

// ── KPI (big-number callout; can be a stack of several) ──
function renderKpi(data, spec, theme, plot) {
  const stats = Array.isArray(data && data.stats) ? data.stats : [{ value: data && data.value, label: data && data.label, sub: data && data.sub }];
  const n = Math.max(1, stats.length);
  const colW = plot.w / n;
  let out = '';
  stats.forEach((st, i) => {
    const cx = plot.x + colW * i + colW / 2;
    const cy = plot.y + plot.h / 2;
    out += text(String(st.value != null ? st.value : ''), { x: cx, y: cy, fill: i === 0 ? theme.highlight : theme.ink, 'font-size': Math.min(64, plot.h * 0.42), 'font-family': theme.headingFont, 'font-weight': 'bold', 'text-anchor': 'middle' });
    if (st.label) out += text(String(st.label), { x: cx, y: cy + 26, fill: theme.inkMuted, 'font-size': SUB_FS, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
    if (st.sub) out += text(String(st.sub), { x: cx, y: cy + 26 + SUB_FS + 4, fill: theme.inkMuted, 'font-size': LABEL_FS - 1, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
  });
  return out;
}

const DISPATCH = {
  bar: renderBar, column: renderColumn, line: renderLine,
  stacked: (d, s, t, p) => renderStacked(d, s, t, p, false),
  stacked100: (d, s, t, p) => renderStacked(d, s, t, p, true),
  grouped: renderGrouped, scatter: renderScatter, waterfall: renderWaterfall, kpi: renderKpi,
};

/**
 * @param {string} chartType  one of BUILT.
 * @param {object} data       normalized series-data (see per-renderer shapes).
 * @param {object} spec       { title, subtitle, titleStyle, source, footnotes, highlight, sort, width, height, numberFormat, xLabel }.
 * @param {object} theme      buildTheme() result.
 * @returns {string} svg
 */
function renderChart(chartType, data, spec, theme) {
  const ct = BUILT.includes(chartType) ? chartType : 'bar';
  const sp = { width: 720, height: 540, titleStyle: 'action', ...(spec || {}) };
  const f = frame(sp, theme);
  const plotBody = DISPATCH[ct](data || {}, sp, theme, f.plot);
  return svgDoc(f.W, f.H, f.head + plotBody + f.foot, theme.bg);
}

module.exports = { renderChart, valFmt, frame, seriesColor, BUILT, DISPATCH };
