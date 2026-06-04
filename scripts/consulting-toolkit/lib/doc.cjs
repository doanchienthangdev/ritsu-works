'use strict';
/** Handbook renderer: bundle-spec → branded A4 HTML (cover + TOC + body)
 *  printed to PDF by render.cjs. Body = document_md via the zero-dep md engine. */
const { docCss } = require('./styles.cjs');
const { mdToHtml, esc } = require('./md.cjs');

function tocFromMd(md) {
  const items = [];
  for (const line of String(md || '').split('\n')) {
    const h = line.match(/^(#{2})\s+(.*)$/); // H2 only in TOC
    if (h) items.push(h[2].replace(/[*_`]/g, '').trim());
  }
  return items;
}

function renderDocHtml(spec) {
  const md = spec.document_md || '';
  const toc = tocFromMd(md);
  const tocHtml = toc.length
    ? `<div class="toc"><h2>Contents</h2><ol>${toc.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></div>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>${docCss()}</style></head><body>
  <div class="cover">
    <div class="k">${esc(spec.domain || 'Consulting Toolkit')}</div>
    <h1>${esc(spec.title || '')}</h1>
    <div class="ol">${esc(spec.one_liner || '')}</div>
    <div class="br">Ritsu Works · Consulting Toolkit Handbook · reconstructed process &amp; toolkit</div>
  </div>
  ${tocHtml}
  <main>${mdToHtml(md)}</main>
  </body></html>`;
}
module.exports = { renderDocHtml };
