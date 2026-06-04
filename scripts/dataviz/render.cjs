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
const { fmt, rect, line, circle, text, group, polylineD, polygonD, linearScale, bandScale, niceMax, svgDoc, arcPath, ringPath, polarToCartesian } = S;
const { BUILT } = require('./lib/taxonomy.cjs');   // v0.2: the taxonomy is the source of truth for the built set.

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
  const pts = objs(data && data.points);
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
  const steps = objs(data && data.steps).map((s) => ({ label: String(s.label), delta: Number(s.delta), total: !!s.total }));
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
  let stats = objs(data && data.stats);
  if (!stats.length) stats = [{ value: data && data.value, label: data && data.label, sub: data && data.sub }];
  const n = Math.max(1, stats.length);
  const colW = plot.w / n;
  let out = '';
  stats.forEach((st, i) => {
    const cx = plot.x + colW * i + colW / 2;
    const cy = plot.y + plot.h / 2;
    const v = st.value;  // NaN/Infinity must not render the literal "NaN"/"Infinity" string.
    const disp = typeof v === 'number' ? (Number.isFinite(v) ? String(v) : '') : (v != null ? String(v) : '');
    out += text(disp, { x: cx, y: cy, fill: i === 0 ? theme.highlight : theme.ink, 'font-size': Math.min(64, plot.h * 0.42), 'font-family': theme.headingFont, 'font-weight': 'bold', 'text-anchor': 'middle' });
    if (st.label) out += text(String(st.label), { x: cx, y: cy + 26, fill: theme.inkMuted, 'font-size': SUB_FS, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
    if (st.sub) out += text(String(st.sub), { x: cx, y: cy + 26 + SUB_FS + 4, fill: theme.inkMuted, 'font-size': LABEL_FS - 1, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
  });
  return out;
}

// ============================================================================
// v0.2 renderers — all PURE, byte-stable, defensive (empty/degenerate/wrong-shape
// data → a valid SVG with no NaN/undefined; the frame always supplies the footer).
// ============================================================================

// ── small pure helpers ──
function lerpHex(c0, c1, t) {
  const p = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : null; };
  const a = p(c0); const b = p(c1); if (!a || !b) return c1 || c0 || '#000000';
  const k = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  const ch = (i) => Math.round(a[i] + (b[i] - a[i]) * k).toString(16).padStart(2, '0');
  return ('#' + ch(0) + ch(1) + ch(2)).toUpperCase();
}
function binValues(arr, nbins) {
  const v = (Array.isArray(arr) ? arr : []).map(Number).filter(Number.isFinite);
  if (!v.length) return [];
  const lo = Math.min(...v); const hi = Math.max(...v); const k = Math.max(1, nbins || 8);
  const w = (hi - lo) / k || 1;
  const bins = Array.from({ length: k }, (_, i) => ({ label: `${fmt(lo + i * w)}–${fmt(lo + (i + 1) * w)}`, count: 0 }));
  v.forEach((x) => { let idx = Math.floor((x - lo) / w); if (idx >= k) idx = k - 1; if (idx < 0) idx = 0; bins[idx].count++; });
  return bins;
}
function fiveNum(arr) {
  const v = (Array.isArray(arr) ? arr : []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  const q = (p) => { const idx = (v.length - 1) * p; const lo = Math.floor(idx); const hi = Math.ceil(idx); return v[lo] + (v[hi] - v[lo]) * (idx - lo); };
  return { min: v[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: v[v.length - 1] };
}
const tlab = (theme, extra) => ({ fill: theme.inkMuted, 'font-size': LABEL_FS, 'font-family': theme.bodyFont, ...extra });
// Defensive intake: keep only real object elements (a stray null/scalar inside a
// correctly-named array must not throw — invariant: a renderer never throws).
const objs = (x) => (Array.isArray(x) ? x : []).filter((e) => e && typeof e === 'object');

// ── AREA (magnitude over time; series[0] filled, others as lines) ──
function renderArea(data, spec, theme, plot) {
  const cats = normCats(data); const series = normSeries(data);
  const allV = series.flatMap((s) => s.values); const max = niceMax(Math.max(0, ...allV));
  const base = plot.y + plot.h - 22; const y = linearScale(0, max, base, plot.y + 14);
  const n = Math.max(1, cats.length - 1); const x = (i) => plot.x + (plot.w - 60) * (n === 0 ? 0 : i / n);
  const hi = highlightIndexFor(spec, series);
  let out = line(plot.x, base, plot.x + plot.w - 60, base, { stroke: theme.neutral1, 'stroke-width': 1 });
  cats.forEach((c, i) => { out += text(c, { x: x(i), y: base + 14, 'text-anchor': 'middle', ...tlab(theme) }); });
  series.forEach((s, si) => {
    if (!s.values.length) return;
    const loud = hi != null ? si === hi : si === 0;
    const color = loud ? theme.highlight : theme.neutral1;
    const pts = s.values.map((v, i) => [x(i), y(v)]);
    if (loud) out += S.path(polygonD([...pts, [x(s.values.length - 1), base], [x(0), base]]), { fill: color, 'fill-opacity': '0.18', stroke: 'none' });
    out += S.path(polylineD(pts), { fill: 'none', stroke: color, 'stroke-width': loud ? 2.5 : 1.5 });
    const last = s.values.length - 1;
    out += text(`${s.name} ${valFmt(s.values[last], spec)}`, { x: x(last) + 6, y: y(s.values[last]) + 4, fill: color, 'font-size': LABEL_FS, 'font-family': theme.bodyFont });
  });
  return out;
}

// ── STACKED AREA (composition over time) ──
function renderStackedArea(data, spec, theme, plot) {
  const cats = normCats(data); const series = normSeries(data);
  const totals = cats.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0));
  const max = niceMax(Math.max(0, ...totals));
  const base = plot.y + plot.h - 22; const y = linearScale(0, max, base, plot.y + 14);
  const n = Math.max(1, cats.length - 1); const x = (i) => plot.x + (plot.w - 70) * (n === 0 ? 0 : i / n);
  let out = line(plot.x, base, plot.x + plot.w - 70, base, { stroke: theme.neutral1, 'stroke-width': 1 });
  cats.forEach((c, i) => { out += text(c, { x: x(i), y: base + 14, 'text-anchor': 'middle', ...tlab(theme) }); });
  const cum = cats.map(() => 0);
  series.forEach((s, si) => {
    if (!cats.length) return;
    const lower = []; const upper = [];
    cats.forEach((_, i) => { const v = s.values[i] || 0; lower.push([x(i), y(cum[i])]); cum[i] += v; upper.push([x(i), y(cum[i])]); });
    const color = si === 0 ? theme.highlight : (si === 1 ? theme.neutral1 : theme.neutral2);
    out += S.path(polygonD([...upper, ...lower.reverse()]), { fill: color, 'fill-opacity': si === 0 ? '0.85' : '0.6', stroke: 'none' });
    const last = cats.length - 1;
    out += text(s.name, { x: x(last) + 5, y: y(cum[last]) + 4, fill: si === 0 ? theme.highlight : theme.inkMuted, 'font-size': LABEL_FS - 1, 'font-family': theme.bodyFont });
  });
  return out;
}

// ── PIE (≤~6 slices; % + label outside) ──
function renderPie(data, spec, theme, plot) {
  const cats = normCats(data); const series = normSeries(data);
  const vals = (series[0] ? series[0].values : []).map((v) => Math.max(0, Number(v) || 0));
  const total = vals.reduce((a, b) => a + b, 0);
  const cx = plot.x + plot.w / 2; const cy = plot.y + plot.h / 2; const r = Math.max(10, Math.min(plot.w, plot.h) / 2 - 30);
  if (total <= 0 || !vals.length) return text('—', { x: cx, y: cy, 'text-anchor': 'middle', ...tlab(theme) });
  const hi = typeof spec.highlight === 'number' ? spec.highlight : 0;
  let ang = 0; let out = '';
  vals.forEach((v, i) => {
    const frac = v / total; const end = ang + frac * 360;
    out += S.path(arcPath(cx, cy, r, ang, Math.min(end, ang + 359.999)), { fill: i === hi ? theme.highlight : lerpHex(theme.neutral1, theme.neutral2, (i % 4) / 3) });
    const mid = (ang + end) / 2; const lp = polarToCartesian(cx, cy, r + 14, mid);
    if (frac > 0.03) out += text(`${cats[i] ? cats[i] + ' ' : ''}${Math.round(frac * 1000) / 10}%`, { x: lp.x, y: lp.y + 3, fill: theme.ink, 'font-size': LABEL_FS - 1, 'font-family': theme.bodyFont, 'text-anchor': lp.x < cx ? 'end' : 'start' });
    ang = end;
  });
  return out;
}

// ── DONUT (pie with a center hole + center total) ──
function renderDonut(data, spec, theme, plot) {
  const cats = normCats(data); const series = normSeries(data);
  const vals = (series[0] ? series[0].values : []).map((v) => Math.max(0, Number(v) || 0));
  const total = vals.reduce((a, b) => a + b, 0);
  const cx = plot.x + plot.w / 2; const cy = plot.y + plot.h / 2; const rO = Math.max(12, Math.min(plot.w, plot.h) / 2 - 30); const rI = rO * 0.58;
  if (total <= 0 || !vals.length) return text('—', { x: cx, y: cy, 'text-anchor': 'middle', ...tlab(theme) });
  const hi = typeof spec.highlight === 'number' ? spec.highlight : 0;
  let ang = 0; let out = '';
  vals.forEach((v, i) => {
    const frac = v / total; const end = ang + frac * 360;
    out += S.path(ringPath(cx, cy, rO, rI, ang, Math.min(end, ang + 359.999)), { fill: i === hi ? theme.highlight : lerpHex(theme.neutral1, theme.neutral2, (i % 4) / 3) });
    const mid = (ang + end) / 2; const lp = polarToCartesian(cx, cy, rO + 14, mid);
    if (frac > 0.03) out += text(`${cats[i] ? cats[i] + ' ' : ''}${Math.round(frac * 1000) / 10}%`, { x: lp.x, y: lp.y + 3, fill: theme.ink, 'font-size': LABEL_FS - 1, 'font-family': theme.bodyFont, 'text-anchor': lp.x < cx ? 'end' : 'start' });
    ang = end;
  });
  out += text(valFmt(total, spec), { x: cx, y: cy + 4, fill: theme.ink, 'font-size': 22, 'font-family': theme.headingFont, 'font-weight': 'bold', 'text-anchor': 'middle' });
  return out;
}

// ── MARIMEKKO / MEKKO (variable-width stacked columns: width=size, height=share) ──
function renderMarimekko(data, spec, theme, plot) {
  const cats = normCats(data); const series = normSeries(data);
  const colTotals = cats.map((_, i) => series.reduce((a, s) => a + Math.max(0, s.values[i] || 0), 0));
  const grand = colTotals.reduce((a, b) => a + b, 0);
  const base = plot.y + plot.h - 22; const top = plot.y + 14; const H = base - top;
  if (grand <= 0 || !cats.length) return '';
  const gap = 4; const usableW = plot.w - gap * Math.max(0, cats.length - 1);
  let xcur = plot.x; let out = '';
  cats.forEach((c, i) => {
    const w = Math.max(0, (colTotals[i] / grand) * usableW); let acc = 0;
    series.forEach((s, si) => {
      const v = Math.max(0, s.values[i] || 0); const share = colTotals[i] ? v / colTotals[i] : 0; const segH = share * H;
      out += rect(xcur, top + acc * H, w, segH, { fill: si === 0 ? theme.highlight : (si === 1 ? theme.neutral1 : theme.neutral2) });
      if (share > 0.08 && w > 24) out += text(`${Math.round(share * 100)}%`, { x: xcur + w / 2, y: top + acc * H + segH / 2 + 4, fill: '#FFFFFF', 'font-size': LABEL_FS - 2, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
      acc += share;
    });
    out += text(String(c), { x: xcur + w / 2, y: base + 14, 'text-anchor': 'middle', ...tlab(theme, { 'font-size': LABEL_FS - 1 }) });
    xcur += w + gap;
  });
  return out;
}

// ── BUBBLE (scatter + size-encoded radius — 3 measures) ──
function renderBubble(data, spec, theme, plot) {
  const pts = objs(data && data.points);
  const xs = pts.map((p) => Number(p.x)); const ys = pts.map((p) => Number(p.y));
  const smax = Math.max(1, ...pts.map((p) => Number(p.size) || 1));
  const xmax = niceMax(Math.max(1, ...xs)); const ymax = niceMax(Math.max(1, ...ys));
  const base = plot.y + plot.h - 22; const x = linearScale(0, xmax, plot.x + 30, plot.x + plot.w - 30); const y = linearScale(0, ymax, base, plot.y + 20);
  let out = line(plot.x + 30, base, plot.x + plot.w - 30, base, { stroke: theme.neutral1, 'stroke-width': 1 });
  out += line(plot.x + 30, base, plot.x + 30, plot.y + 20, { stroke: theme.neutral1, 'stroke-width': 1 });
  pts.forEach((p) => {
    const rr = 6 + 22 * Math.sqrt(Math.max(0, Number(p.size) || 1) / smax);
    out += circle(x(Number(p.x)), y(Number(p.y)), rr, { fill: p.highlight ? theme.highlight : theme.neutral1, 'fill-opacity': '0.65' });
    if (p.label) out += text(String(p.label), { x: x(Number(p.x)), y: y(Number(p.y)) + 3, 'text-anchor': 'middle', ...tlab(theme, { fill: theme.ink, 'font-size': LABEL_FS - 2 }) });
  });
  if (spec.xLabel) out += text(spec.xLabel, { x: plot.x + plot.w / 2, y: base + 16, 'text-anchor': 'middle', ...tlab(theme) });
  if (spec.yLabel) out += text(spec.yLabel, { x: plot.x + 30, y: plot.y + 12, ...tlab(theme) });
  return out;
}

// ── HEATMAP (row×col matrix; color intensity = value) ──
function renderHeatmap(data, spec, theme, plot) {
  const cols = normCats(data); const rows = normSeries(data);
  const allV = rows.flatMap((r) => r.values.map((v) => Math.abs(Number(v) || 0))); const max = Math.max(1, ...allV);
  const labelW = Math.min(plot.w * 0.22, 110); const x0 = plot.x + labelW; const topPad = 18;
  const cw = (plot.x + plot.w - x0) / Math.max(1, cols.length); const ch = (plot.h - topPad - 14) / Math.max(1, rows.length);
  let out = '';
  cols.forEach((c, j) => { out += text(String(c), { x: x0 + cw * j + cw / 2, y: plot.y + 12, 'text-anchor': 'middle', ...tlab(theme, { 'font-size': LABEL_FS - 1 }) }); });
  rows.forEach((r, i) => {
    out += text(r.name, { x: x0 - 6, y: plot.y + topPad + ch * i + ch / 2 + 4, 'text-anchor': 'end', ...tlab(theme, { 'font-size': LABEL_FS - 1 }) });
    cols.forEach((_, j) => {
      const v = r.values[j] || 0; const t = Math.max(0, Math.min(1, Math.abs(v) / max));
      out += rect(x0 + cw * j, plot.y + topPad + ch * i, cw - 2, ch - 2, { fill: lerpHex(theme.bg, theme.highlight, t) });
      out += text(valFmt(v, spec), { x: x0 + cw * j + cw / 2, y: plot.y + topPad + ch * i + ch / 2 + 4, fill: t > 0.55 ? '#FFFFFF' : theme.ink, 'font-size': LABEL_FS - 2, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
    });
  });
  return out;
}

// ── DUMBBELL (two dots per category + connector — paired delta) ──
function renderDumbbell(data, spec, theme, plot) {
  const cats = normCats(data); const series = normSeries(data);
  const s0 = series[0] || { name: '', values: [] }; const s1 = series[1] || { name: '', values: [] };
  const allV = [...s0.values, ...s1.values]; const max = niceMax(Math.max(0, ...allV));
  const labelW = Math.min(plot.w * 0.28, 120); const x0 = plot.x + labelW; const x = linearScale(0, max, x0, plot.x + plot.w - 50);
  const band = bandScale(cats.length, plot.y, plot.y + plot.h, 0.5);
  let out = '';
  cats.forEach((c, i) => {
    const yy = band.pos(i) + band.bandwidth / 2; const a = s0.values[i] || 0; const b = s1.values[i] || 0;
    out += line(x(a), yy, x(b), yy, { stroke: theme.neutral2, 'stroke-width': 2 });
    out += circle(x(a), yy, 5, { fill: theme.neutral1 });
    out += circle(x(b), yy, 5, { fill: theme.highlight });
    out += text(c, { x: x0 - 8, y: yy + 4, 'text-anchor': 'end', ...tlab(theme, { fill: theme.ink }) });
    out += text(valFmt(b, spec), { x: x(b) + 8, y: yy + 4, ...tlab(theme, { fill: theme.ink }) });
  });
  return out;
}

// ── LOLLIPOP (horizontal stem + dot; sorted desc) ──
function renderLollipop(data, spec, theme, plot) {
  const cats = normCats(data); const series = normSeries(data); const vals = series[0] ? series[0].values : [];
  let rows = cats.map((c, i) => ({ c, v: vals[i] || 0, i }));
  if (spec.sort !== false) rows = rows.slice().sort((a, b) => b.v - a.v);
  const max = niceMax(Math.max(0, ...rows.map((r) => r.v)));
  const labelW = Math.min(plot.w * 0.32, 120); const x0 = plot.x + labelW; const x = linearScale(0, max, x0, plot.x + plot.w - 40);
  const band = bandScale(rows.length, plot.y, plot.y + plot.h, 0.35);
  let out = '';
  rows.forEach((r, idx) => {
    const yy = band.pos(idx) + band.bandwidth / 2; const loud = idx === 0;
    out += line(x0, yy, x(r.v), yy, { stroke: loud ? theme.highlight : theme.neutral1, 'stroke-width': 2 });
    out += circle(x(r.v), yy, 6, { fill: loud ? theme.highlight : theme.neutral1 });
    out += text(r.c, { x: x0 - 8, y: yy + 4, 'text-anchor': 'end', ...tlab(theme, { fill: theme.ink }) });
    out += text(valFmt(r.v, spec), { x: x(r.v) + 10, y: yy + 4, ...tlab(theme, { fill: theme.ink, 'font-weight': loud ? 'bold' : 'normal' }) });
  });
  return out;
}

// ── DOT PLOT (non-zero baseline; zoom into a value range) ──
function renderDot(data, spec, theme, plot) {
  const cats = normCats(data); const series = normSeries(data); const vals = series[0] ? series[0].values : [];
  if (!cats.length) return '';
  const lo = Math.min(...vals.map(Number)); const hi = Math.max(...vals.map(Number));
  const pad = (hi - lo) * 0.12 || 1; const d0 = lo - pad; const d1 = hi + pad;
  const labelW = Math.min(plot.w * 0.3, 120); const x0 = plot.x + labelW; const x = linearScale(d0, d1, x0, plot.x + plot.w - 40);
  const band = bandScale(cats.length, plot.y, plot.y + plot.h, 0.4);
  const hiIdx = typeof spec.highlight === 'number' ? spec.highlight : -1;
  let out = '';
  cats.forEach((c, i) => {
    const yy = band.pos(i) + band.bandwidth / 2; const v = vals[i] || 0; const loud = i === hiIdx;
    out += line(x0, yy, x(d1), yy, { stroke: theme.gridline, 'stroke-width': 1 });
    out += circle(x(v), yy, 6, { fill: loud ? theme.highlight : theme.neutral1 });
    out += text(c, { x: x0 - 8, y: yy + 4, 'text-anchor': 'end', ...tlab(theme, { fill: theme.ink }) });
    out += text(valFmt(v, spec), { x: x(v) + 10, y: yy + 4, ...tlab(theme, { fill: theme.ink }) });
  });
  return out;
}

// ── SLOPE (two-period change; items as series) ──
function renderSlope(data, spec, theme, plot) {
  const cats = normCats(data); const series = normSeries(data);
  const allV = series.flatMap((s) => s.values); const max = niceMax(Math.max(0, ...allV));
  const base = plot.y + plot.h - 22; const y = linearScale(0, max, base, plot.y + 20);
  const xL = plot.x + 100; const xR = plot.x + plot.w - 100;
  let out = text(cats[0] || 'Before', { x: xL, y: base + 14, 'text-anchor': 'middle', ...tlab(theme) }) + text(cats[1] || 'After', { x: xR, y: base + 14, 'text-anchor': 'middle', ...tlab(theme) });
  const hi = highlightIndexFor(spec, series);
  series.forEach((s, si) => {
    const v0 = s.values[0] || 0; const v1 = s.values[1] != null ? s.values[1] : v0; const loud = hi != null ? si === hi : si === 0;
    const color = loud ? theme.highlight : theme.neutral1;
    out += S.path(polylineD([[xL, y(v0)], [xR, y(v1)]]), { fill: 'none', stroke: color, 'stroke-width': loud ? 2.5 : 1.5 });
    out += circle(xL, y(v0), 3.5, { fill: color }); out += circle(xR, y(v1), 3.5, { fill: color });
    out += text(`${s.name} ${valFmt(v0, spec)}`, { x: xL - 6, y: y(v0) + 4, 'text-anchor': 'end', ...tlab(theme, { fill: color }) });
    out += text(valFmt(v1, spec), { x: xR + 6, y: y(v1) + 4, ...tlab(theme, { fill: color }) });
  });
  return out;
}

// ── BULLET (actual vs target — performance KPI bars) ──
function renderBullet(data, spec, theme, plot) {
  let measures = Array.isArray(data && data.measures) ? objs(data.measures) : null;
  if (!measures) { const cats = normCats(data); const s0 = normSeries(data)[0] || { values: [] }; measures = cats.map((c, i) => ({ label: c, value: s0.values[i] || 0, target: Number(spec.target) || 0 })); }
  if (!measures.length) return '';
  const maxV = niceMax(Math.max(1, ...measures.map((m) => Math.max(Number(m.value) || 0, Number(m.target) || 0, Number(m.max) || 0))));
  const labelW = Math.min(plot.w * 0.28, 130); const x0 = plot.x + labelW; const x = linearScale(0, maxV, x0, plot.x + plot.w - 40);
  const band = bandScale(measures.length, plot.y, plot.y + plot.h, 0.5);
  let out = '';
  measures.forEach((m, i) => {
    const yy = band.pos(i); const bh = band.bandwidth; const val = Number(m.value) || 0;
    out += rect(x0, yy, x(maxV) - x0, bh, { fill: theme.gridline });
    out += rect(x0, yy + bh * 0.3, x(val) - x0, bh * 0.4, { fill: theme.highlight });
    if (m.target != null && Number(m.target)) { const tx = x(Number(m.target)); out += line(tx, yy + bh * 0.12, tx, yy + bh * 0.88, { stroke: theme.ink, 'stroke-width': 2 }); }
    out += text(String(m.label == null ? '' : m.label), { x: x0 - 8, y: yy + bh / 2 + 4, 'text-anchor': 'end', ...tlab(theme, { fill: theme.ink }) });
    out += text(valFmt(val, spec), { x: x(val) + 6, y: yy + bh / 2 + 4, ...tlab(theme, { fill: theme.ink }) });
  });
  return out;
}

// ── DIVERGING STACKED BAR (Likert / sentiment around a center) ──
function renderDiverging(data, spec, theme, plot) {
  const cats = normCats(data); const series = normSeries(data);
  const leftExt = cats.map((_, i) => series.reduce((a, s) => a + ((s.values[i] || 0) < 0 ? Math.abs(s.values[i]) : 0), 0));
  const rightExt = cats.map((_, i) => series.reduce((a, s) => a + ((s.values[i] || 0) > 0 ? s.values[i] : 0), 0));
  const maxExt = niceMax(Math.max(1, ...leftExt, ...rightExt));
  const cx = plot.x + plot.w / 2; const halfW = plot.w / 2 - 54;
  const xPos = linearScale(0, maxExt, cx, cx + halfW); const xNeg = linearScale(0, maxExt, cx, cx - halfW);
  const band = bandScale(cats.length, plot.y, plot.y + plot.h, 0.4);
  let out = line(cx, plot.y, cx, plot.y + plot.h - 8, { stroke: theme.neutral1, 'stroke-width': 1 });
  cats.forEach((c, i) => {
    const yy = band.pos(i); let accNeg = 0; let accPos = 0; let negI = 0; let posI = 0;
    // colour by SIDE-position (not global series index): first negative = amber (warm),
    // deeper negatives fade toward neutral; first positive = highlight, rest = accent (cool).
    series.forEach((s) => {
      const v = s.values[i] || 0;
      if (v < 0) { const x1 = xNeg(accNeg); const x2 = xNeg(accNeg + Math.abs(v)); out += rect(Math.min(x1, x2), yy, Math.abs(x2 - x1), band.bandwidth, { fill: negI === 0 ? theme.amber : lerpHex(theme.amber, theme.neutral2, Math.min(1, negI / 3)) }); accNeg += Math.abs(v); negI += 1; }
      else if (v > 0) { const x1 = xPos(accPos); const x2 = xPos(accPos + v); out += rect(Math.min(x1, x2), yy, Math.abs(x2 - x1), band.bandwidth, { fill: posI === 0 ? theme.highlight : theme.accent }); accPos += v; posI += 1; }
    });
    out += text(c, { x: plot.x, y: yy + band.bandwidth / 2 + 4, ...tlab(theme, { fill: theme.ink, 'font-size': LABEL_FS - 1 }) });
  });
  return out;
}

// ── HISTOGRAM (binned frequency; adjacent columns) ──
function renderHistogram(data, spec, theme, plot) {
  let bins;
  if (Array.isArray(data && data.bins)) bins = objs(data.bins).map((b) => ({ label: String(b.label), count: Number(b.count) || 0 }));
  else if (Array.isArray(data && data.values)) bins = binValues(data.values, 8);
  else { const cats = normCats(data); const s0 = normSeries(data)[0] || { values: [] }; bins = cats.map((c, i) => ({ label: String(c), count: s0.values[i] || 0 })); }
  if (!bins.length) return '';
  const max = niceMax(Math.max(0, ...bins.map((b) => b.count)));
  const base = plot.y + plot.h - 26; const y = linearScale(0, max, base, plot.y + 14);
  const bw = plot.w / Math.max(1, bins.length);
  let out = line(plot.x, base, plot.x + plot.w, base, { stroke: theme.neutral1, 'stroke-width': 1 });
  bins.forEach((b, i) => {
    const xx = plot.x + bw * i;
    out += rect(xx + 1, y(b.count), bw - 2, base - y(b.count), { fill: theme.highlight });
    out += text(valFmt(b.count, spec), { x: xx + bw / 2, y: y(b.count) - 4, 'text-anchor': 'middle', ...tlab(theme, { fill: theme.ink, 'font-size': LABEL_FS - 1 }) });
    if (bins.length <= 14) out += text(b.label, { x: xx + bw / 2, y: base + 14, 'text-anchor': 'middle', ...tlab(theme, { 'font-size': LABEL_FS - 3 }) });
  });
  return out;
}

// ── FUNNEL (descending centered stages + conversion %) ──
function renderFunnel(data, spec, theme, plot) {
  let stages;
  if (Array.isArray(data && data.stages)) stages = data.stages.map((s) => ({ label: String(s.label), value: Number(s.value) || 0 }));
  else { const cats = normCats(data); const s0 = normSeries(data)[0] || { values: [] }; stages = cats.map((c, i) => ({ label: String(c), value: s0.values[i] || 0 })); }
  if (!stages.length) return '';
  const max = Math.max(1, ...stages.map((s) => s.value));
  const cx = plot.x + plot.w / 2; const rowH = plot.h / Math.max(1, stages.length); const maxW = plot.w * 0.66;
  let out = '';
  stages.forEach((st, i) => {
    const w = (st.value / max) * maxW; const yy = plot.y + rowH * i + rowH * 0.16; const h = rowH * 0.6;
    out += rect(cx - w / 2, yy, w, h, { fill: i === 0 ? theme.highlight : lerpHex(theme.highlight, theme.neutral1, Math.min(1, i / Math.max(1, stages.length - 1))) });
    out += text(`${st.label}: ${valFmt(st.value, spec)}`, { x: cx, y: yy + h / 2 + 4, fill: '#FFFFFF', 'font-size': LABEL_FS, 'font-family': theme.bodyFont, 'text-anchor': 'middle' });
    if (i > 0) { const prev = stages[i - 1].value; const conv = prev ? Math.round((st.value / prev) * 100) : 0; out += text(`${conv}%`, { x: cx + maxW / 2 + 10, y: yy + h / 2 + 4, ...tlab(theme) }); }
  });
  return out;
}

// ── QUADRANT (2×2 matrix — the consulting positioning chart) ──
function renderQuadrant(data, spec, theme, plot) {
  const pts = objs(data && data.points);
  const xs = pts.map((p) => Number(p.x)); const ys = pts.map((p) => Number(p.y));
  const xmax = niceMax(Math.max(1, ...xs)); const ymax = niceMax(Math.max(1, ...ys)); const smax = Math.max(1, ...pts.map((p) => Number(p.size) || 1));
  const px = plot.x + 24; const pw = plot.w - 48; const py = plot.y + 8; const ph = plot.h - 30;
  const x = linearScale(0, xmax, px, px + pw); const y = linearScale(0, ymax, py + ph, py);
  const midX = px + pw / 2; const midY = py + ph / 2;
  let out = rect(px, py, pw, ph, { fill: 'none', stroke: theme.gridline, 'stroke-width': 1 });
  out += line(midX, py, midX, py + ph, { stroke: theme.neutral1, 'stroke-width': 1, 'stroke-dasharray': '3,3' });
  out += line(px, midY, px + pw, midY, { stroke: theme.neutral1, 'stroke-width': 1, 'stroke-dasharray': '3,3' });
  const ql = Array.isArray(spec.quadrantLabels) ? spec.quadrantLabels : (Array.isArray(data && data.quadrants) ? data.quadrants : []);
  if (ql.length === 4) {
    const anc = [[px + pw - 6, py + 14, 'end'], [px + 6, py + 14, 'start'], [px + 6, py + ph - 6, 'start'], [px + pw - 6, py + ph - 6, 'end']];
    ql.forEach((q, i) => { const a = anc[i]; out += text(String(q), { x: a[0], y: a[1], 'text-anchor': a[2], ...tlab(theme, { 'font-size': LABEL_FS - 1, 'font-style': 'italic' }) }); });
  }
  pts.forEach((p) => {
    const rr = p.size != null ? 6 + 14 * Math.sqrt(Math.max(0, Number(p.size)) / smax) : 6;
    out += circle(x(Number(p.x)), y(Number(p.y)), rr, { fill: p.highlight ? theme.highlight : theme.neutral1, 'fill-opacity': '0.75' });
    if (p.label) out += text(String(p.label), { x: x(Number(p.x)) + rr + 3, y: y(Number(p.y)) + 3, ...tlab(theme, { fill: theme.ink, 'font-size': LABEL_FS - 1 }) });
  });
  if (spec.xLabel) out += text(spec.xLabel, { x: midX, y: py + ph + 16, 'text-anchor': 'middle', ...tlab(theme) });
  if (spec.yLabel) out += text(spec.yLabel, { x: px - 4, y: py - 2, ...tlab(theme) });
  return out;
}

// ── RADAR / SPIDER (multi-dimensional profile) ──
function renderRadar(data, spec, theme, plot) {
  const axes = Array.isArray(data && data.axes) ? data.axes.map(String) : normCats(data);
  const series = normSeries(data); const n = axes.length;
  if (n < 3) return '';
  const cx = plot.x + plot.w / 2; const cy = plot.y + plot.h / 2; const r = Math.max(20, Math.min(plot.w, plot.h) / 2 - 36);
  const allV = series.flatMap((s) => s.values); const max = niceMax(Math.max(1, ...allV));
  let out = '';
  for (let k = 1; k <= 3; k++) { const rr = (r * k) / 3; const ring = axes.map((_, i) => { const p = polarToCartesian(cx, cy, rr, (i / n) * 360); return [p.x, p.y]; }); out += S.path(polygonD(ring), { fill: 'none', stroke: theme.gridline, 'stroke-width': 1 }); }
  axes.forEach((ax, i) => { const a = (i / n) * 360; const tip = polarToCartesian(cx, cy, r, a); out += line(cx, cy, tip.x, tip.y, { stroke: theme.gridline, 'stroke-width': 1 }); const lp = polarToCartesian(cx, cy, r + 16, a); out += text(String(ax), { x: lp.x, y: lp.y + 3, 'text-anchor': 'middle', ...tlab(theme, { 'font-size': LABEL_FS - 1 }) }); });
  const hi = highlightIndexFor(spec, series);
  series.forEach((s, si) => {
    const loud = hi != null ? si === hi : si === 0; const color = loud ? theme.highlight : theme.neutral1;
    const pts = axes.map((_, i) => { const a = (i / n) * 360; const p = polarToCartesian(cx, cy, ((s.values[i] || 0) / max) * r, a); return [p.x, p.y]; });
    out += S.path(polygonD(pts), { fill: color, 'fill-opacity': '0.12', stroke: color, 'stroke-width': loud ? 2.5 : 1.5 });
  });
  return out;
}

// ── BOX PLOT (quartiles + whiskers — distribution summary) ──
function renderBox(data, spec, theme, plot) {
  let boxes;
  if (Array.isArray(data && data.boxes)) boxes = objs(data.boxes).map((b) => ({ label: String(b.label), min: Number(b.min) || 0, q1: Number(b.q1) || 0, median: Number(b.median) || 0, q3: Number(b.q3) || 0, max: Number(b.max) || 0 }));
  else if (Array.isArray(data && data.samples)) boxes = objs(data.samples).map((s) => ({ label: String(s.label), ...fiveNum(s.values) }));
  else return '';
  if (!boxes.length) return '';
  const allV = boxes.flatMap((b) => [b.min, b.max]); const lo = Math.min(...allV); const hi = Math.max(...allV); const pad = (hi - lo) * 0.1 || 1;
  const base = plot.y + plot.h - 22; const y = linearScale(lo - pad, hi + pad, base, plot.y + 14);
  const band = bandScale(boxes.length, plot.x + 20, plot.x + plot.w, 0.55);
  let out = '';
  boxes.forEach((b, i) => {
    const xc = band.pos(i) + band.bandwidth / 2; const bw = band.bandwidth; const loud = i === 0;
    out += line(xc, y(b.min), xc, y(b.max), { stroke: theme.neutral1, 'stroke-width': 1 });
    out += line(xc - bw * 0.2, y(b.min), xc + bw * 0.2, y(b.min), { stroke: theme.neutral1, 'stroke-width': 1 });
    out += line(xc - bw * 0.2, y(b.max), xc + bw * 0.2, y(b.max), { stroke: theme.neutral1, 'stroke-width': 1 });
    out += rect(xc - bw / 2, Math.min(y(b.q1), y(b.q3)), bw, Math.abs(y(b.q3) - y(b.q1)), { fill: loud ? theme.highlight : theme.neutral1, 'fill-opacity': '0.5', stroke: theme.ink, 'stroke-width': 1 });
    out += line(xc - bw / 2, y(b.median), xc + bw / 2, y(b.median), { stroke: theme.ink, 'stroke-width': 2 });
    out += text(b.label, { x: xc, y: base + 14, 'text-anchor': 'middle', ...tlab(theme) });
  });
  return out;
}

const DISPATCH = {
  bar: renderBar, column: renderColumn, line: renderLine,
  stacked: (d, s, t, p) => renderStacked(d, s, t, p, false),
  stacked100: (d, s, t, p) => renderStacked(d, s, t, p, true),
  grouped: renderGrouped, scatter: renderScatter, waterfall: renderWaterfall, kpi: renderKpi,
  // v0.2
  area: renderArea, 'stacked-area': renderStackedArea, pie: renderPie, donut: renderDonut,
  marimekko: renderMarimekko, bubble: renderBubble, heatmap: renderHeatmap, dumbbell: renderDumbbell,
  lollipop: renderLollipop, dot: renderDot, slope: renderSlope, bullet: renderBullet,
  diverging: renderDiverging, histogram: renderHistogram, funnel: renderFunnel,
  quadrant: renderQuadrant, radar: renderRadar, box: renderBox,
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
  // A renderer must NEVER throw out of renderChart — on any unexpected/malformed shape,
  // degrade to a titled, footed, empty exhibit (valid SVG, no throw, no NaN).
  let plotBody = '';
  try { plotBody = (DISPATCH[ct] || renderBar)(data || {}, sp, theme, f.plot); } catch (_) { plotBody = ''; }
  return svgDoc(f.W, f.H, f.head + plotBody + f.foot, theme.bg);
}

module.exports = { renderChart, valFmt, frame, seriesColor, BUILT, DISPATCH };
