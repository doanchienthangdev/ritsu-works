'use strict';
/** Compact zero-dep Markdown→HTML for the handbook (GFM subset:
 *  ATX headings, bold/italic/code, links, ul/ol (indent-nested), GFM tables,
 *  blockquote, hr, fenced code, paragraphs). Good enough for agent-authored
 *  document_md; not a general CommonMark engine. */

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function inline(s) {
  let t = esc(s);
  t = t.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (_, txt, url) => `<a href="${url}">${txt}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  return t;
}

function splitRow(line) {
  return line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

function mdToHtml(md) {
  const lines = String(md || '').replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  const listStack = []; // {type, indent}
  function closeListsTo(indent) {
    while (listStack.length && listStack[listStack.length - 1].indent >= indent) {
      out.push(listStack.pop().type === 'ol' ? '</ol>' : '</ul>');
    }
  }
  function closeAllLists() { while (listStack.length) out.push(listStack.pop().type === 'ol' ? '</ol>' : '</ul>'); }

  while (i < lines.length) {
    let line = lines[i];
    // fenced code
    if (/^```/.test(line)) {
      closeAllLists(); const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(esc(lines[i])); i++; }
      i++; out.push(`<pre><code>${buf.join('\n')}</code></pre>`); continue;
    }
    // blank
    if (/^\s*$/.test(line)) { closeAllLists(); i++; continue; }
    // hr
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { closeAllLists(); out.push('<hr>'); i++; continue; }
    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { closeAllLists(); const lv = h[1].length; out.push(`<h${lv}>${inline(h[2].trim())}</h${lv}>`); i++; continue; }
    // table (header + separator)
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      closeAllLists();
      const head = splitRow(line); i += 2; const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(splitRow(lines[i])); i++; }
      let t = '<table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
      for (const r of rows) t += '<tr>' + head.map((_, k) => `<td>${inline(r[k] || '')}</td>`).join('') + '</tr>';
      out.push(t + '</tbody></table>'); continue;
    }
    // blockquote
    if (/^\s*>\s?/.test(line)) {
      closeAllLists(); const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`); continue;
    }
    // list item
    const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (li) {
      const indent = li[1].length;
      const type = /\d/.test(li[2]) ? 'ol' : 'ul';
      closeListsTo(indent + 1);
      const top = listStack[listStack.length - 1];
      if (!top || top.indent < indent) { out.push(type === 'ol' ? '<ol>' : '<ul>'); listStack.push({ type, indent }); }
      else if (top.indent === indent && top.type !== type) { out.push(top.type === 'ol' ? '</ol>' : '</ul>'); listStack.pop(); out.push(type === 'ol' ? '<ol>' : '<ul>'); listStack.push({ type, indent }); }
      out.push(`<li>${inline(li[3])}</li>`); i++; continue;
    }
    // paragraph (gather until blank/structural)
    closeAllLists();
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*([-*+]|\d+[.)])\s|>\s|```|\s*(-{3,}|\*{3,})\s*$)/.test(lines[i]) && !(lines[i].includes('|') && i + 1 < lines.length && /^[\s:|-]+$/.test(lines[i + 1]))) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  closeAllLists();
  return out.join('\n');
}

module.exports = { mdToHtml, esc, inline };
