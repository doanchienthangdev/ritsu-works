'use strict';
/** Minimal, dependency-free SVG charts for the `chart` deck layout.
 *  Supports: column, bar, line, stacked-column. Clean consulting palette.
 *  Returns an <svg> string sized to fit the deck content area. */
const { T } = require('./styles.cjs');
const PALETTE = [T.navy, T.cyan, T.gold, T.green, T.amber, '#7a8aa8', T.red];

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function niceMax(v) { if (v <= 0) return 10; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10; return m * p; }

function svgChart(spec, W = 740, H = 430) {
  const type = spec.chart_type || 'column';
  const cats = spec.categories || [];
  const series = (spec.series || []).map((s, k) => ({ name: s.name || `S${k + 1}`, values: s.values || [], color: s.color || PALETTE[k % PALETTE.length] }));
  const m = { l: 52, r: 16, t: 16, b: 46 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  let max;
  if (type === 'stacked-column') max = niceMax(Math.max(1, ...cats.map((_, i) => series.reduce((a, s) => a + (+s.values[i] || 0), 0))));
  else max = niceMax(Math.max(1, ...series.flatMap((s) => s.values.map((v) => +v || 0))));
  const y = (v) => m.t + ih - (v / max) * ih;
  const parts = [`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" font-family="${T.font}">`];
  // gridlines + y labels
  for (let g = 0; g <= 4; g++) { const v = (max / 4) * g; const yy = y(v); parts.push(`<line x1="${m.l}" y1="${yy}" x2="${W - m.r}" y2="${yy}" stroke="#E6E8EE"/>`); parts.push(`<text x="${m.l - 8}" y="${yy + 4}" font-size="11" fill="${T.gray}" text-anchor="end">${Math.round(v)}</text>`); }
  const n = cats.length || 1;
  const slot = iw / n;
  if (type === 'line') {
    cats.forEach((c, i) => parts.push(`<text x="${m.l + slot * (i + .5)}" y="${H - 24}" font-size="11.5" fill="#33384a" text-anchor="middle">${esc(c)}</text>`));
    series.forEach((s) => {
      const pts = s.values.map((v, i) => `${m.l + slot * (i + .5)},${y(+v || 0)}`).join(' ');
      parts.push(`<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="3"/>`);
      s.values.forEach((v, i) => parts.push(`<circle cx="${m.l + slot * (i + .5)}" cy="${y(+v || 0)}" r="4" fill="${s.color}"/>`));
    });
  } else if (type === 'stacked-column') {
    cats.forEach((c, i) => {
      const bw = Math.min(64, slot * .6); let acc = 0; const x = m.l + slot * i + (slot - bw) / 2;
      series.forEach((s) => { const v = +s.values[i] || 0; const h = (v / max) * ih; const yy = y(acc + v); parts.push(`<rect x="${x}" y="${yy}" width="${bw}" height="${h}" fill="${s.color}"/>`); acc += v; });
      parts.push(`<text x="${m.l + slot * (i + .5)}" y="${H - 24}" font-size="11.5" fill="#33384a" text-anchor="middle">${esc(c)}</text>`);
    });
  } else { // column / bar (column default)
    const sg = series.length || 1;
    cats.forEach((c, i) => {
      const groupW = slot * .7; const bw = groupW / sg; const x0 = m.l + slot * i + (slot - groupW) / 2;
      series.forEach((s, k) => { const v = +s.values[i] || 0; const h = (v / max) * ih; const x = x0 + bw * k; parts.push(`<rect x="${x}" y="${y(v)}" width="${bw - 3}" height="${h}" fill="${s.color}"/>`); if (sg === 1) parts.push(`<text x="${x + (bw - 3) / 2}" y="${y(v) - 5}" font-size="11" fill="${T.navy}" text-anchor="middle" font-weight="700">${v}</text>`); });
      parts.push(`<text x="${m.l + slot * (i + .5)}" y="${H - 24}" font-size="11.5" fill="#33384a" text-anchor="middle">${esc(c)}</text>`);
    });
  }
  // legend
  if (series.length > 1) {
    let lx = m.l;
    series.forEach((s) => { parts.push(`<rect x="${lx}" y="${H - 12}" width="11" height="11" fill="${s.color}"/><text x="${lx + 16}" y="${H - 2}" font-size="11" fill="#33384a">${esc(s.name)}</text>`); lx += 26 + s.name.length * 6.4; });
  }
  parts.push('</svg>');
  return parts.join('');
}
module.exports = { svgChart };
