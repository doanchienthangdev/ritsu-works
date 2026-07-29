#!/usr/bin/env node
'use strict';
/**
 * scripts/video/gates/lint-stage-video.cjs — pre-render composition lint
 * (capability video-platform)
 *
 * LESSON #2, caught EARLY and CHEAPLY. When several <video> elements share one
 * container, each must resolve to position:absolute. In normal flow every
 * height:100% box stacks vertically and the container's overflow:hidden clips
 * all but the first — those clips render COMPLETELY BLANK.
 *
 * LESSON #4 too: `.line{overflow:hidden}` used for GSAP mask-rise clips descenders
 * (g/y/p) unless the rule carries compensating padding-bottom + negative margin.
 *
 * ── HONEST LIMITATIONS (read before trusting a PASS) ──────────────────────────
 * This is a STATIC lint with a purpose-built tokenizer (no dependency; the repo
 * is deliberately zero-dep — see scripts/dataviz, scripts/image/lib/png-overlay).
 * It is a real tokenizer, not a regex soup, but it still CANNOT:
 *   · resolve external stylesheets (<link rel=stylesheet>)
 *   · compute the real cascade, specificity, or inheritance
 *   · evaluate styles injected at runtime by script
 * Therefore a PASS here is NOT proof the render is correct. It catches the common
 * authoring mistake at zero cost; the authoritative gate is the post-render
 * scripts/video/gates/verify-render.cjs, which measures the finished mp4.
 *
 * Usage:
 *   node scripts/video/gates/lint-stage-video.cjs --html=video/projects/<slug>/index.html [--json]
 *
 * Exit 0 = no findings, 1 = findings, 2 = usage error.
 */

const fs = require('fs');
const path = require('path');

// ── a small, real HTML tokenizer ────────────────────────────────────────────
// Character scanner → a flat element list with parent links. Handles quoted
// attribute values, self-closing tags, comments, and raw-text elements
// (script/style), which is where a regex approach goes wrong.
const VOID_TAGS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const RAW_TEXT = new Set(['script','style']);

function tokenize(html) {
  const nodes = [];          // { tag, attrs, parent, index }
  const stack = [];
  const styles = [];         // raw <style> text
  let i = 0;
  const n = html.length;

  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt === -1) break;

    // comment / doctype
    if (html.startsWith('<!--', lt)) { const e = html.indexOf('-->', lt + 4); i = e === -1 ? n : e + 3; continue; }
    if (html.startsWith('<!', lt)) { const e = html.indexOf('>', lt); i = e === -1 ? n : e + 1; continue; }

    // closing tag
    if (html[lt + 1] === '/') {
      const e = html.indexOf('>', lt);
      if (e === -1) break;
      const name = html.slice(lt + 2, e).trim().toLowerCase();
      for (let s = stack.length - 1; s >= 0; s--) {
        if (nodes[stack[s]].tag === name) { stack.length = s; break; }
      }
      i = e + 1;
      continue;
    }

    // opening tag — scan attributes respecting quotes
    let j = lt + 1;
    while (j < n && /[a-zA-Z0-9:-]/.test(html[j])) j++;
    const tag = html.slice(lt + 1, j).toLowerCase();
    if (!tag) { i = lt + 1; continue; }

    let q = null, selfClose = false, k = j;
    for (; k < n; k++) {
      const c = html[k];
      if (q) { if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '>') break;
    }
    const attrText = html.slice(j, k);
    if (attrText.trimEnd().endsWith('/')) selfClose = true;

    const attrs = parseAttrs(attrText);
    const idx = nodes.length;
    nodes.push({ tag, attrs, parent: stack.length ? stack[stack.length - 1] : -1, index: idx, line: lineAt(html, lt) });

    i = k + 1;

    if (RAW_TEXT.has(tag)) {
      const close = html.toLowerCase().indexOf(`</${tag}`, i);
      const body = html.slice(i, close === -1 ? n : close);
      if (tag === 'style') styles.push(body);
      i = close === -1 ? n : close;
      continue;
    }
    if (!selfClose && !VOID_TAGS.has(tag)) stack.push(idx);
  }
  return { nodes, styles };
}

function parseAttrs(text) {
  const attrs = {};
  let i = 0;
  const n = text.length;
  while (i < n) {
    while (i < n && /[\s/]/.test(text[i])) i++;
    if (i >= n) break;
    let s = i;
    while (i < n && !/[\s=/>]/.test(text[i])) i++;
    const name = text.slice(s, i).toLowerCase();
    if (!name) { i++; continue; }
    while (i < n && /\s/.test(text[i])) i++;
    if (text[i] === '=') {
      i++;
      while (i < n && /\s/.test(text[i])) i++;
      const q = text[i];
      if (q === '"' || q === "'") {
        const e = text.indexOf(q, i + 1);
        attrs[name] = text.slice(i + 1, e === -1 ? n : e);
        i = e === -1 ? n : e + 1;
      } else {
        s = i;
        while (i < n && !/[\s>]/.test(text[i])) i++;
        attrs[name] = text.slice(s, i);
      }
    } else attrs[name] = '';
  }
  return attrs;
}

function lineAt(text, offset) { let l = 1; for (let i = 0; i < offset && i < text.length; i++) if (text[i] === '\n') l++; return l; }

// ── minimal CSS rule extraction ─────────────────────────────────────────────
function parseCss(cssTexts) {
  const rules = [];
  for (const css of cssTexts) {
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    let i = 0;
    while (i < stripped.length) {
      const brace = stripped.indexOf('{', i);
      if (brace === -1) break;
      const close = matchBrace(stripped, brace);
      if (close === -1) break;
      const selText = stripped.slice(i, brace).trim();
      const body = stripped.slice(brace + 1, close);
      // skip at-rules with nested blocks (@media/@supports): descend into them
      if (selText.startsWith('@')) {
        if (/^@(media|supports|layer|container)/i.test(selText)) {
          rules.push(...parseCss([body]));
        }
        i = close + 1; continue;
      }
      const decls = {};
      for (const part of body.split(';')) {
        const c = part.indexOf(':');
        if (c === -1) continue;
        decls[part.slice(0, c).trim().toLowerCase()] = part.slice(c + 1).trim().toLowerCase();
      }
      for (const sel of selText.split(',')) {
        const s = sel.trim();
        if (s) rules.push({ selector: s, decls });
      }
      i = close + 1;
    }
  }
  return rules;
}

function matchBrace(s, open) {
  let d = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') d++;
    else if (s[i] === '}') { d--; if (d === 0) return i; }
  }
  return -1;
}

/** Heuristic: does this selector plausibly match this element (+ ancestors)? */
function selectorMatches(sel, node, nodes) {
  const parts = sel.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (!simpleMatches(last, node)) return false;
  // ancestor parts: require each to match SOME ancestor, in order (loose)
  let cursor = node.parent;
  for (let p = parts.length - 2; p >= 0; p--) {
    let found = false;
    while (cursor !== -1 && cursor !== undefined) {
      if (simpleMatches(parts[p], nodes[cursor])) { cursor = nodes[cursor].parent; found = true; break; }
      cursor = nodes[cursor].parent;
    }
    if (!found) return false;
  }
  return true;
}

function simpleMatches(part, node) {
  if (!node) return false;
  if (part === '*') return true;
  const cls = (node.attrs.class || '').split(/\s+/).filter(Boolean);
  const m = part.match(/^([a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)/);
  if (!m) return false;
  if (m[1] && m[1].toLowerCase() !== node.tag) return false;
  const quals = m[2] ? m[2].match(/[.#][\w-]+/g) || [] : [];
  for (const q of quals) {
    if (q[0] === '.') { if (!cls.includes(q.slice(1))) return false; }
    else if (q[0] === '#') { if (node.attrs.id !== q.slice(1)) return false; }
  }
  return true;
}

function resolvedDecl(node, nodes, rules, prop) {
  const inline = (node.attrs.style || '').toLowerCase();
  const im = inline.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`));
  if (im) return { value: im[1].trim(), from: 'inline' };
  let hit = null;
  for (const r of rules) {
    if (r.decls[prop] === undefined) continue;
    if (selectorMatches(r.selector, node, nodes)) hit = { value: r.decls[prop], from: r.selector };
  }
  return hit;
}

// ── the lint ────────────────────────────────────────────────────────────────
function lint(html) {
  const { nodes, styles } = tokenize(html);
  const rules = parseCss(styles);
  const findings = [];

  // LESSON #2 — group <video> by parent; any parent with ≥2 must have each
  // child resolve to position:absolute.
  const byParent = new Map();
  for (const nd of nodes) {
    if (nd.tag !== 'video') continue;
    const p = nd.parent;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(nd);
  }
  const stages = [];
  for (const [parentIdx, vids] of byParent) {
    if (vids.length < 2) continue;
    const parent = parentIdx === -1 ? null : nodes[parentIdx];
    const parentDesc = parent ? `${parent.tag}${parent.attrs.id ? '#' + parent.attrs.id : ''}${parent.attrs.class ? '.' + parent.attrs.class.split(/\s+/).join('.') : ''}` : '(root)';
    const offenders = [];
    for (const v of vids) {
      const pos = resolvedDecl(v, nodes, rules, 'position');
      if (!pos || pos.value !== 'absolute') {
        offenders.push({ id: v.attrs.id || '(no id)', line: v.line, resolved: pos ? `${pos.value} (via ${pos.from})` : 'not set' });
      }
    }
    stages.push({ container: parentDesc, videos: vids.length, offenders: offenders.length });
    if (offenders.length) {
      findings.push({
        rule: 'stacked-video-not-absolute',
        severity: 'error',
        container: parentDesc,
        detail: `${offenders.length} of ${vids.length} <video> in this container do not resolve to position:absolute — in normal flow they stack vertically and overflow:hidden clips every one after the first (they render BLANK)`,
        offenders,
      });
    }
  }

  // LESSON #4 — mask-rise wrapper clipping descenders
  for (const r of rules) {
    if (r.decls.overflow !== 'hidden') continue;
    const pb = r.decls['padding-bottom'];
    const mb = r.decls['margin-bottom'];
    const looksLikeTextMask = /\.line\b|\bmask|\breveal|\brise/i.test(r.selector);
    if (!looksLikeTextMask) continue;
    const compensated = pb && mb && mb.trim().startsWith('-');
    if (!compensated) {
      findings.push({
        rule: 'mask-rise-clips-descenders',
        severity: 'warn',
        container: r.selector,
        detail: 'overflow:hidden on a text-mask wrapper without compensating padding-bottom + negative margin-bottom clips descenders (g/y/p)',
        offenders: [],
      });
    }
  }

  return { findings, stages, elements: nodes.length, cssRules: rules.length };
}

// ── main ───────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  let file = null, json = false;
  for (const a of argv) {
    if (a === '--json') json = true;
    else if (a.startsWith('--html=')) file = a.slice(7);
    else if (!a.startsWith('--')) file = a;
  }
  if (!file) { console.error('usage: lint-stage-video.cjs --html=<index.html> [--json]'); process.exit(2); }
  const fp = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  if (!fs.existsSync(fp)) { console.error(`[FAIL] not found: ${file}`); process.exit(1); }

  const res = lint(fs.readFileSync(fp, 'utf-8'));
  const errors = res.findings.filter((f) => f.severity === 'error');

  if (json) { console.log(JSON.stringify({ ok: errors.length === 0, file: path.relative(process.cwd(), fp), ...res }, null, 2)); }
  else {
    console.log(`${path.relative(process.cwd(), fp)} — ${res.elements} elements, ${res.cssRules} css rules`);
    for (const s of res.stages) {
      console.log(`   ${s.offenders ? '✗' : '✓'}  ${s.container.padEnd(34)} ${s.videos} <video>${s.offenders ? `, ${s.offenders} not absolute` : ', all absolute'}`);
    }
    if (!res.findings.length) console.log('\n[PASS] no stacked-video or mask-clip findings');
    else {
      for (const f of res.findings) {
        const tag = f.severity === 'error' ? '[FAIL]' : '[WARN]';
        console[f.severity === 'error' ? 'error' : 'log'](`\n${tag} ${f.rule} — ${f.container}\n  ${f.detail}`);
        for (const o of f.offenders) console.error(`    · ${o.id} (line ${o.line}) resolved position: ${o.resolved}`);
      }
      console.log('\nNOTE: this static lint cannot resolve external stylesheets or the real cascade.');
      console.log('      A PASS is not proof — verify-render.cjs on the finished mp4 is authoritative.');
    }
  }
  process.exit(errors.length ? 1 : 0);
}

if (require.main === module) main();
module.exports = { tokenize, parseCss, lint, selectorMatches };
