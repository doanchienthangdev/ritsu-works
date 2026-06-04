// ============================================================================
// scripts/dataviz/lib/svg.cjs — byte-stable, dependency-free SVG primitives + scales
// ============================================================================
// Capability `dataviz` v0.1. PURE, deterministic, zero-dependency. The foundation
// the renderer (render.cjs) builds on. NO d3 (d3-scale/d3-shape v4+ are ESM-only →
// not require()-able from a .cjs; the scale math is elementary). NO DOM, NO canvas,
// NO Date.now()/Math.random() — so every chart is a byte-stable string, asserted
// with toBe()/toEqual() (the repo forbids vitest snapshots; @cto must-fix #2/#3).
//
// THE byte-stability contract (@cto must-fix #3): every coordinate/number emitted
// into SVG goes through fmt() — fixed 2-dp, trailing zeros stripped, -0 normalized,
// locale-independent. Attribute order is fixed. \n line endings. → identical bytes
// on every platform, every run.
// ============================================================================

'use strict';

/** Byte-stable number → string. Round to 2 dp, strip trailing zeros, normalize -0. */
function fmt(n) {
  if (!Number.isFinite(n)) return '0';
  let v = Math.round(n * 100) / 100;
  if (Object.is(v, -0)) v = 0;
  // toFixed(2) then strip trailing zeros + a dangling dot — locale-independent.
  let s = v.toFixed(2).replace(/\.?0+$/, '');
  if (s === '' || s === '-') s = '0';
  return s;
}

/** XML-escape text content / attribute values. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Serialize an attribute map in a FIXED key order (sorted) → byte-stable. */
function attrs(a) {
  return Object.keys(a)
    .filter((k) => a[k] !== undefined && a[k] !== null && a[k] !== '')
    .sort()
    .map((k) => `${k}="${esc(a[k])}"`)
    .join(' ');
}

const rect = (x, y, w, h, a = {}) => `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(Math.max(0, w))}" height="${fmt(Math.max(0, h))}"${a && Object.keys(a).length ? ' ' + attrs(a) : ''}/>`;
const line = (x1, y1, x2, y2, a = {}) => `<line x1="${fmt(x1)}" y1="${fmt(y1)}" x2="${fmt(x2)}" y2="${fmt(y2)}"${a && Object.keys(a).length ? ' ' + attrs(a) : ''}/>`;
const circle = (cx, cy, r, a = {}) => `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}"${a && Object.keys(a).length ? ' ' + attrs(a) : ''}/>`;
const path = (d, a = {}) => `<path d="${d}"${a && Object.keys(a).length ? ' ' + attrs(a) : ''}/>`;

/** Text element. `t` is the content; `a` the attributes (x/y/fill/font-size/text-anchor/…). */
function text(t, a = {}) {
  const x = a.x !== undefined ? fmt(a.x) : '0';
  const y = a.y !== undefined ? fmt(a.y) : '0';
  const rest = { ...a };
  delete rest.x; delete rest.y;
  return `<text x="${x}" y="${y}"${Object.keys(rest).length ? ' ' + attrs(rest) : ''}>${esc(t)}</text>`;
}

/** Group wrapper. */
const group = (children, a = {}) => `<g${a && Object.keys(a).length ? ' ' + attrs(a) : ''}>${Array.isArray(children) ? children.join('') : children}</g>`;

/** Polyline path d-string from [[x,y],…] (M then L…). Byte-stable via fmt. */
function polylineD(points) {
  if (!Array.isArray(points) || points.length === 0) return '';
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`).join(' ');
}

/**
 * Linear scale: domain [d0,d1] → range [r0,r1]. Pure. Degenerate domain (d0===d1)
 * maps everything to the range midpoint (no divide-by-zero).
 */
function linearScale(d0, d1, r0, r1) {
  const span = d1 - d0;
  return (v) => (span === 0 ? (r0 + r1) / 2 : r0 + ((v - d0) / span) * (r1 - r0));
}

/**
 * Band scale: n categories across [r0,r1] with inner padding (0..1 fraction of step).
 * Returns { pos(i), bandwidth, step }. Pure.
 */
function bandScale(n, r0, r1, pad = 0.2) {
  const count = Math.max(1, n);
  const range = r1 - r0;
  const step = range / count;
  const bandwidth = step * (1 - pad);
  const offset = (step - bandwidth) / 2;
  return { pos: (i) => r0 + i * step + offset, bandwidth, step };
}

/** "nice" axis max ≥ raw max (1/2/2.5/5 × 10^k ladder). Pure; for zero-baseline value axes. */
function niceMax(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const f = raw / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * base;
}

/**
 * Wrap the body in a full SVG document. width/height fixed; viewBox for crisp scaling.
 * No xmlns prefixing noise beyond the required xmlns.
 */
function svgDoc(width, height, body, bg) {
  const background = bg ? rect(0, 0, width, height, { fill: bg }) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}" height="${fmt(height)}" viewBox="0 0 ${fmt(width)} ${fmt(height)}">${background}${body}</svg>`;
}

/** Coarse text-width ESTIMATE (no measurement engine; @cto must-fix #5 — axis ticks only). */
const estTextWidth = (s, fontSize) => String(s == null ? '' : s).length * fontSize * 0.6;

// ── polar / arc primitives (pie, donut, radar) — byte-stable via fmt ──────────
// Angles in DEGREES, measured CLOCKWISE from 12 o'clock (the natural pie convention):
// 0° = top, 90° = right, 180° = bottom, 270° = left. SVG y grows downward.
function polarToCartesian(cx, cy, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

/** Closed polygon path d-string from [[x,y],…] (M…L…Z). For radar. */
function polygonD(points) {
  if (!Array.isArray(points) || points.length === 0) return '';
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`).join(' ') + ' Z';
}

/** Pie wedge path (filled from center): start→end clockwise. Full circle handled by caller (split). */
function arcPath(cx, cy, r, startDeg, endDeg) {
  const p1 = polarToCartesian(cx, cy, r, startDeg);
  const p2 = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M${fmt(cx)} ${fmt(cy)} L${fmt(p1.x)} ${fmt(p1.y)} A${fmt(r)} ${fmt(r)} 0 ${largeArc} 1 ${fmt(p2.x)} ${fmt(p2.y)} Z`;
}

/** Donut ring-segment path: start→end clockwise between rInner and rOuter. */
function ringPath(cx, cy, rOuter, rInner, startDeg, endDeg) {
  const o1 = polarToCartesian(cx, cy, rOuter, startDeg);
  const o2 = polarToCartesian(cx, cy, rOuter, endDeg);
  const i2 = polarToCartesian(cx, cy, rInner, endDeg);
  const i1 = polarToCartesian(cx, cy, rInner, startDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M${fmt(o1.x)} ${fmt(o1.y)} A${fmt(rOuter)} ${fmt(rOuter)} 0 ${largeArc} 1 ${fmt(o2.x)} ${fmt(o2.y)} L${fmt(i2.x)} ${fmt(i2.y)} A${fmt(rInner)} ${fmt(rInner)} 0 ${largeArc} 0 ${fmt(i1.x)} ${fmt(i1.y)} Z`;
}

// ── v0.3 layout primitives (spline, hex, treemap, deterministic jitter, bezier) ──

/** Smooth open path through points via Catmull-Rom → cubic bezier. Byte-stable. */
function splinePath(pts) {
  if (!Array.isArray(pts) || pts.length < 2) return polylineD(pts || []);
  let d = `M${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6; const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6; const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d;
}

/** Horizontal S-curve cubic-bezier d-segment (sankey/arc links). Control points at mid-x. */
function bezierH(x0, y0, x1, y1) {
  const mx = (x0 + x1) / 2;
  return `M${fmt(x0)} ${fmt(y0)} C${fmt(mx)} ${fmt(y0)} ${fmt(mx)} ${fmt(y1)} ${fmt(x1)} ${fmt(y1)}`;
}

/** Pointy-top hexagon path (hexbin). */
function hexPath(cx, cy, r) {
  let d = '';
  for (let k = 0; k < 6; k++) { const a = (Math.PI / 180) * (60 * k - 90); d += (k === 0 ? 'M' : 'L') + fmt(cx + r * Math.cos(a)) + ' ' + fmt(cy + r * Math.sin(a)); }
  return d + ' Z';
}

/**
 * Binary slice-and-dice treemap: values → rects filling [x,y,w,h]. Deterministic,
 * always-valid (guards empties + non-positive dims). Sorts desc, splits the value
 * list near its half, splits the rect along its longer axis proportionally, recurses.
 */
function squarify(values, x, y, w, h) {
  const items = (Array.isArray(values) ? values : []).map((v, i) => ({ v: Math.max(0, Number(v) || 0), i })).sort((a, b) => b.v - a.v);
  const out = [];
  (function rec(list, rx, ry, rw, rh) {
    if (!list.length || rw <= 0 || rh <= 0) return;
    if (list.length === 1) { out.push({ x: rx, y: ry, w: rw, h: rh, i: list[0].i, v: list[0].v }); return; }
    const total = list.reduce((a, it) => a + it.v, 0) || 1;
    let acc = 0; let split = 1; const half = total / 2;
    for (let k = 0; k < list.length; k++) { if (acc + list[k].v / 2 >= half && k > 0) { split = k; break; } acc += list[k].v; split = k + 1; }
    split = Math.max(1, Math.min(list.length - 1, split));
    const a = list.slice(0, split); const b = list.slice(split);
    const frac = (a.reduce((s, it) => s + it.v, 0) / total) || 0.5;
    if (rw >= rh) { const aw = rw * frac; rec(a, rx, ry, aw, rh); rec(b, rx + aw, ry, rw - aw, rh); }
    else { const ah = rh * frac; rec(a, rx, ry, rw, ah); rec(b, rx, ry + ah, rw, rh - ah); }
  })(items, x, y, w, h);
  return out;
}

/** Deterministic pseudo-random offset in [-amp, amp] from an index (no Math.random — byte-stable). */
function jitterOffset(i, amp) {
  const s = Math.sin((Number(i) || 0) * 12.9898 + 1) * 43758.5453;
  return ((s - Math.floor(s)) * 2 - 1) * amp;
}

module.exports = {
  fmt, esc, attrs, rect, line, circle, path, text, group, polylineD, polygonD,
  linearScale, bandScale, niceMax, svgDoc, estTextWidth,
  polarToCartesian, arcPath, ringPath,
  splinePath, bezierH, hexPath, squarify, jitterOffset,
};
