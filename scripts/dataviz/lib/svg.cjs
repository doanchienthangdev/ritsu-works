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

module.exports = {
  fmt, esc, attrs, rect, line, circle, path, text, group, polylineD,
  linearScale, bandScale, niceMax, svgDoc, estTextWidth,
};
