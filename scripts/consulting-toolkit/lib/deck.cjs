'use strict';
/** Deck layout engine — renders a bundle-spec `deck` into a full 16:9 HTML deck
 *  (printed to PDF by render.cjs via headless Chrome). Dispatches on slide.layout. */
const { deckCss, quadColor } = require('./styles.cjs');
const { svgChart } = require('./chart.cjs');
const { esc, inline } = require('./md.cjs');

const BRAND = 'Ritsu Works · Consulting Toolkit';

// Tolerate an agent writing a group/gate marker as a LITERAL string
// (e.g. '{grp:"Gate"} Sponsor approves…') instead of a {grp} object — split it.
function expandGrp(items) {
  const out = [];
  for (const it of (items || [])) {
    if (typeof it === 'string') {
      const m = it.match(/^\s*\{\s*grp:\s*["']?([^"'}]+)["']?\s*\}\s*(.*)$/);
      if (m) { out.push({ grp: m[1].trim() }); if (m[2].trim()) out.push(m[2].trim()); continue; }
    }
    out.push(it);
  }
  return out;
}

function bullets(items, cls = 'b') {
  items = expandGrp(items);
  if (!items.length) return '';
  const li = items.map((it) => {
    if (typeof it === 'string') return `<li>${inline(it)}</li>`;
    if (it && it.grp) return `<li class="grp">${inline(it.grp)}</li>`;
    if (it && it.sub) return `<li>${inline(it.text || '')}<ul>${it.sub.map((s) => `<li>${inline(s)}</li>`).join('')}</ul></li>`;
    return `<li>${inline(it.text || '')}</li>`;
  }).join('');
  return `<ul class="${cls}">${li}</ul>`;
}

function block(b) {
  if (typeof b === 'string') return `<p class="lead">${inline(b)}</p>`;
  if (b.bullets) return (b.sub ? `<div class="sub-h">${inline(b.sub)}</div>` : '') + bullets(b.bullets);
  if (b.text) return `<p class="lead">${inline(b.text)}</p>`;
  return '';
}

// ---- layout body builders (return inner HTML of .body) ----
const L = {
  toc: (s) => bullets((s.items || []).map((it) => `${it.n ? it.n + '. ' : ''}${it.label || it}`)),

  'process-map': (s) => {
    const ph = s.phases || [];
    return `<div class="chev">${ph.map((p, i) => `
      <div class="ph ${s.active === (p.n ?? i + 1) ? 'active' : ''}">
        <div class="cap"><div class="n">${p.n ?? i + 1}</div><div class="nm">${inline(p.name || '')}</div></div>
        <ul class="bul">${expandGrp(p.bullets).map((b) => (typeof b === 'object' && b.grp) ? `<li class="grp">${inline(b.grp)}</li>` : `<li>${inline(typeof b === 'string' ? b : b.text)}</li>`).join('')}</ul>
      </div>`).join('')}</div>`;
  },

  section: (s) => {
    const ph = s.phases || [];
    return `<div class="prog">${ph.map((nm, i) => `<div class="c ${s.active === i + 1 ? 'on' : ''}">${i + 1}. ${inline(typeof nm === 'string' ? nm : nm.name)}</div>`).join('')}</div>
      <div class="big"><div class="num">${s.n ?? ''}</div><div class="nm">${inline(s.name || '')}</div></div>
      ${s.goal ? `<div class="goal">${inline(s.goal)}</div>` : ''}`;
  },

  'exec-summary': (s) => `<div class="exec">
      <div class="gov">${inline(s.governing || '')}</div>
      <div class="reasons">${(s.reasons || []).map((r) => `<div class="r"><div class="rt">${inline(r.title || '')}</div><div class="rb">${inline(r.body || '')}</div></div>`).join('')}</div></div>`,

  content: (s) => {
    const body = (s.body || []).map(block).join('');
    const tk = s.takeaways ? `<div class="panel" style="margin-top:16px"><div class="sub-h">Key takeaways</div>${bullets(s.takeaways)}</div>` : '';
    if (s.columns === 2) {
      const mid = Math.ceil((s.body || []).length / 2);
      return `<div class="two"><div>${(s.body || []).slice(0, mid).map(block).join('')}</div><div>${(s.body || []).slice(mid).map(block).join('')}${tk}</div></div>`;
    }
    return body + tk;
  },

  'two-col': (s) => `<div class="two">
      <div><div class="sub-h">${inline((s.left || {}).title || '')}</div>${((s.left || {}).body || []).map(block).join('')}</div>
      <div><div class="sub-h">${inline((s.right || {}).title || '')}</div>${((s.right || {}).body || []).map(block).join('')}</div></div>`,

  'framework-desc': (s) => `<div class="two">
      <div><p class="lead">${inline(s.what || '')}</p>${s.logic ? `<p class="lead" style="margin-top:12px">${inline(s.logic)}</p>` : ''}${s.origin ? `<p class="lead" style="margin-top:12px;color:#6B6B6B;font-size:14px">Origin: ${inline(s.origin)}</p>` : ''}</div>
      <div class="panel panel2"><div class="sub-h">Key points</div>${bullets(s.points || [])}</div></div>`,

  'matrix-2x2': (s) => {
    const pos = { tl: 0, tr: 1, bl: 2, br: 3 };
    const cells = ['', '', '', ''];
    (s.quadrants || []).forEach((q) => {
      const idx = pos[q.pos] ?? 0;
      cells[idx] = `<div class="q" style="background:${quadColor(q.color || (q.pos === 'tr' ? 'green' : q.pos === 'tl' ? 'gold' : q.pos === 'bl' ? 'red' : 'amber'))}">
        <div class="ql">${inline(q.label || '')}</div>${q.desc ? `<div class="qd">${inline(q.desc)}</div>` : ''}${q.strategy ? `<div class="qs">→ ${inline(q.strategy)}</div>` : ''}</div>`;
    });
    return `<div class="quadwrap">
      <div class="ylab">${inline(s.y_label || '')}</div>
      <div class="quad">${cells.join('')}</div>
      <div></div><div class="xlab">${inline(s.x_label || '')}</div></div>`;
  },

  staircase: (s) => `<div class="stair">${(s.steps || []).map((st, i) => `
      <div class="st" style="height:${30 + (i + 1) * (100 / ((s.steps || []).length + 1))}%">
        <div class="box"><div class="n">${st.n ?? i + 1}</div><div class="lb">${inline(st.label || '')}</div>${st.desc ? `<div class="ds">${inline(st.desc)}</div>` : ''}</div></div>`).join('')}</div>`,

  'process-flow': (s) => {
    const boxes = (s.boxes || []).map((b) => `<div class="fb">${inline(b.label || '')}${b.sub ? `<div class="fs">${inline(b.sub)}</div>` : ''}</div>`);
    const joined = boxes.join('<div class="ar">▸</div>');
    return `<div class="flow">${joined}${s.note ? `<div class="note">${inline(s.note)}</div>` : ''}</div>`;
  },

  tutorial: (s) => `<div class="tut">${(s.steps || []).map((st, i) => `
      <div class="ts"><div class="n">${st.n ?? i + 1}</div><div class="c"><div class="tt">${inline(st.title || '')}</div>${st.desc ? `<div class="td">${inline(st.desc)}</div>` : ''}</div></div>`).join('')}</div>`,

  table: (s) => {
    const head = (s.headers || []).map((h) => `<th>${inline(h)}</th>`).join('');
    const rows = (s.rows || []).map((r) => '<tr>' + r.map((c, k) => `<td${(s.firstcol_head && k === 0) ? ' class="fh"' : ''}>${inline(String(c))}</td>`).join('') + '</tr>').join('');
    const dense = (s.rows || []).length > 12 ? ' t-dense' : (s.rows || []).length > 8 ? ' t-mid' : '';
    return `<table class="t${dense}"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  },

  comparison: (s) => {
    const cols = s.columns || [];
    const n = cols.length || 1;
    const maxRows = Math.max(...cols.map((c) => (c.rows || []).length), 0);
    let html = `<div class="cmp" style="grid-template-columns:repeat(${n},1fr)">`;
    html += cols.map((c) => `<div class="col-h" style="background:${quadColor(c.color || 'navy')}">${inline(c.title || '')}</div>`).join('');
    for (let r = 0; r < maxRows; r++) html += cols.map((c) => `<div class="cell panel">${inline((c.rows || [])[r] || '')}</div>`).join('');
    return html + '</div>';
  },

  'kpi-tiles': (s) => `<div class="tiles">${(s.tiles || []).map((t) => `<div class="tile" style="${t.color ? `border-color:${quadColor(t.color)}` : ''}"><div class="v">${inline(t.value)}</div><div class="l">${inline(t.label || '')}</div></div>`).join('')}</div>`,

  chart: (s) => {
    const key = s.key_takeaways && s.key_takeaways.length;
    return `<div class="chart-wrap ${key ? '' : 'nokey'}"><div class="cc">${svgChart(s)}</div>${key ? `<div class="chart-key"><div class="kt">Key takeaways</div><ul>${s.key_takeaways.map((k) => `<li>${inline(k)}</li>`).join('')}</ul></div>` : ''}</div>`;
  },

  example: (s) => `<div class="ex">
      <div><div class="co">${inline(s.company || '')}</div><div class="nr">${inline(s.narrative || '')}</div></div>
      ${(s.data && s.data.length) ? `<div class="data"><div class="sub-h">Numbers</div>${s.data.map((d) => `<div class="d"><span>${inline(d.label)}</span><span class="dv">${inline(d.value)}</span></div>`).join('')}</div>` : '<div></div>'}</div>`,

  quote: (s) => `<div class="quote"><div><div class="qt">"${inline(s.text || '')}"</div>${s.attribution ? `<div class="at">— ${inline(s.attribution)}</div>` : ''}</div></div>`,

  close: (s) => `<div class="close"><div class="msg">${inline(s.message || '')}</div>${(s.next_steps && s.next_steps.length) ? bullets(s.next_steps) : ''}</div>`,

  html: (s) => `<div class="htmlbody">${s.html || ''}</div>`,
};

function coverSlide(spec) {
  const d = spec.deck || {};
  return `<section class="slide cover">
    <div class="band"><div class="kicker">${esc(spec.domain || 'Consulting Toolkit')}</div><div class="ttl">${esc(spec.title || '')}</div></div>
    <div class="meta"><div class="st">${esc(d.subtitle || 'Reconstructed process & toolkit')}</div>
      <div class="brand">${esc(spec.one_liner || '')}<br><b>Ritsu Works</b> · reconstructed from a consulting-toolkit clue</div></div>
  </section>`;
}

function shell(s, page, total) {
  const layout = s.layout || 'content';
  if (layout === 'cover') return ''; // handled separately
  const body = (L[layout] || L.content)(s);
  const src = s.source ? `<div class="src">Source: ${esc(s.source)}</div>` : '';
  const sub = s.subtitle ? `<div class="sub">${esc(s.subtitle)}</div>` : '';
  // Titleless slides (e.g. quote) get no header chrome — the body fills the full height.
  const hd = s.title ? `<div class="hd"><div class="title">${inline(s.title)}</div>${sub}<div class="rule"></div></div>` : '';
  return `<section class="slide ${layout === 'section' ? 'section' : ''}">
    ${hd}
    <div class="body">${body}</div>${src}
    <div class="ft"><div class="frule"></div><div class="meta"><span>${BRAND}</span><span>${page}</span></div></div>
  </section>`;
}

function renderDeckHtml(spec) {
  const slides = (spec.deck && spec.deck.slides) || [];
  const total = slides.length;
  const hasCover = slides[0] && slides[0].layout === 'cover';
  const parts = [];
  parts.push(hasCover ? coverSlide(Object.assign({}, spec, { deck: Object.assign({}, spec.deck, slides[0]) })) : coverSlide(spec));
  let page = 1;
  slides.forEach((s, i) => {
    if (i === 0 && hasCover) return;
    page++;
    parts.push(shell(s, page, total));
  });
  return `<!doctype html><html><head><meta charset="utf-8"><style>${deckCss()}</style></head><body>${parts.join('\n')}</body></html>`;
}

module.exports = { renderDeckHtml };
