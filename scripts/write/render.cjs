#!/usr/bin/env node
'use strict';
// ============================================================================
// scripts/write/render.cjs — /write output renderer
// ============================================================================
// Renders a final markdown draft into the requested --out formats.
//   default → INLINE (no file; the orchestrator presents it in-conversation, deepask-style)
//   md      → write the .md (native, node)
//   html|pdf|docx → scripts/write/render.py (ANACONDA python: markdown + python-docx;
//                   pdf via the standalone weasyprint CLI). Reuses translate/design.py palette.
//
// CLI:  node scripts/write/render.cjs <draft.md> --out=md+pdf --out-dir=DIR [--title=..] [--author=..] [--style=ritsu] [--name=slug]
// Output: one line of JSON {ok, files[], inline, warnings[]}.
// ============================================================================

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const HERE = __dirname;
const REPO_ROOT = path.resolve(HERE, '..', '..');
const ANACONDA = process.env.WRITE_PY || process.env.TRANSLATE_PY || '/opt/anaconda3/bin/python3';
const RENDER_PY = path.join(HERE, 'render.py');

function parse(argv) {
  const o = { out: ['md'], style: 'ritsu' };
  let src = null;
  for (const a of argv) {
    if (!a.startsWith('--')) { if (!src) src = a; continue; }
    const [k, v] = a.slice(2).split(/=(.*)/s);
    if (k === 'out') o.out = String(v || '').split('+').map((s) => s.trim()).filter(Boolean);
    else o[k] = v === undefined ? true : v;
  }
  return { src, o };
}

function pyAvailable() {
  return fs.existsSync(ANACONDA) || spawnSync(ANACONDA, ['--version'], { encoding: 'utf8' }).status === 0;
}

/**
 * @param {string} src absolute path to the markdown draft
 * @param {{out:string[], outDir:string, title?:string, author?:string, style?:string, name?:string}} opt
 */
function render(src, opt) {
  const warnings = [];
  const files = [];
  let inline = null;
  if (!src || !fs.existsSync(src)) return { ok: false, error: `draft not found: ${src}`, files, warnings };
  const md = fs.readFileSync(src, 'utf8');
  const outDir = opt.outDir || path.dirname(src);
  fs.mkdirSync(outDir, { recursive: true });
  const name = opt.name || path.basename(src).replace(/\.md$/, '') || 'document';

  for (const fmt of opt.out) {
    if (fmt === 'default') { inline = md; continue; }
    if (fmt === 'md') {
      const p = path.join(outDir, `${name}.md`);
      if (path.resolve(p) !== path.resolve(src)) fs.writeFileSync(p, md);
      files.push(p);
      continue;
    }
    if (['html', 'pdf', 'docx'].includes(fmt)) {
      const out = path.join(outDir, `${name}.${fmt}`);
      const args = [RENDER_PY, src, fmt, `--out=${out}`, `--style=${opt.style || 'ritsu'}`, `--repo-root=${REPO_ROOT}`];
      if (opt.title) args.push(`--title=${opt.title}`);
      if (opt.author) args.push(`--author=${opt.author}`);
      const r = spawnSync(ANACONDA, args, { encoding: 'utf8', timeout: 120000 });
      let res = null;
      try { res = JSON.parse(((r.stdout || '').trim().split('\n').pop()) || '{}'); } catch { /* */ }
      if (res && res.ok) { files.push(out); if (res.warnings) warnings.push(...res.warnings); }
      else warnings.push(`--out=${fmt} failed: ${(res && res.error) || (r.stderr || '').trim().slice(0, 160) || 'unknown'}`);
      continue;
    }
    warnings.push(`--out "${fmt}" not a renderable format → skipped`);
  }
  return { ok: true, files, inline: inline !== null, warnings };
}

if (require.main === module) {
  const { src, o } = parse(process.argv.slice(2));
  const res = render(src && path.isAbsolute(src) ? src : path.join(process.cwd(), src || ''), {
    out: o.out, outDir: o['out-dir'], title: o.title, author: o.author, style: o.style, name: o.name,
  });
  process.stdout.write(JSON.stringify(res) + '\n');
}

module.exports = { render };
