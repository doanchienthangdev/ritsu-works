#!/usr/bin/env node
/**
 * build-all.cjs — merge reconstruction outputs + render bundles.
 *
 * For each toolkit: read <specs>/<slug>.core.json (+ optional .deck.json),
 * validate, merge → bundle-spec.json in the output bundle dir, then run
 * render.cjs to produce the handbook PDF + deck PDF + all bundle files.
 *
 * Runs in the MAIN loop (writes to main-root raw/).
 * Usage: node build-all.cjs [--specs <dir>] [--out <dir>] [--only slug1,slug2] [--no-pdf]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { TOOLKITS, bundleDir } = require('./lib/toolkits.cjs');

function arg(f, d) { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; }
const SPECS = arg('--specs', '/Users/doanchienthang/ritsu-works/.claude/worktrees/epic-jennings-6198c5/runtime/consulting-toolkit/specs');
const OUT = arg('--out', '/Users/doanchienthang/ritsu-works/raw/consultant/tookits');
const ONLY = (arg('--only', '') || '').split(',').filter(Boolean);
const NOPDF = process.argv.includes('--no-pdf');
const REQUIRED = ['id', 'slug', 'title', 'process', 'frameworks', 'document_md'];

const summary = [];
for (const tk of TOOLKITS) {
  if (ONLY.length && !ONLY.includes(tk.slug)) continue;
  const coreP = path.join(SPECS, `${tk.slug}.core.json`);
  const deckP = path.join(SPECS, `${tk.slug}.deck.json`);
  if (!fs.existsSync(coreP)) { summary.push({ slug: tk.slug, status: 'MISSING_CORE' }); continue; }
  let core, deck = null, parseErr = null;
  try { core = JSON.parse(fs.readFileSync(coreP, 'utf8')); } catch (e) { summary.push({ slug: tk.slug, status: 'CORE_BAD_JSON', err: e.message }); continue; }
  if (fs.existsSync(deckP)) { try { deck = JSON.parse(fs.readFileSync(deckP, 'utf8')); } catch (e) { parseErr = 'DECK_BAD_JSON:' + e.message; } }
  // backfill identity from registry (defensive)
  core.id = core.id ?? tk.num; core.slug = core.slug || tk.slug; core.title = core.title || tk.title; core.domain = core.domain || tk.domain;
  const missing = REQUIRED.filter((k) => !core[k] || (Array.isArray(core[k]) && !core[k].length));
  const merged = Object.assign({}, core, { deck: { subtitle: (deck && deck.subtitle) || 'Reconstructed process & toolkit', slides: (deck && deck.slides) || [] } });
  const dir = bundleDir(OUT, tk);
  fs.mkdirSync(dir, { recursive: true });
  const specPath = path.join(dir, 'bundle-spec.json');
  fs.writeFileSync(specPath, JSON.stringify(merged, null, 2));
  const renderArgs = [path.join(__dirname, 'render.cjs'), specPath, dir];
  if (NOPDF) renderArgs.push('--no-pdf');
  const r = cp.spawnSync('node', renderArgs, { stdio: 'inherit' });
  summary.push({
    slug: tk.slug, status: r.status === 0 ? 'OK' : 'RENDER_FAIL',
    phases: ((core.process || {}).phases || []).length,
    frameworks: (core.frameworks || []).length,
    slides: ((merged.deck || {}).slides || []).length,
    doc_words: (core.document_md || '').split(/\s+/).length,
    missing: missing.length ? missing : undefined,
    deckErr: parseErr || undefined,
  });
}

console.log('\n===== BUILD SUMMARY =====');
for (const s of summary) console.log(`${(s.status === 'OK' ? '✓' : '✗')} ${s.slug.padEnd(42)} ${s.status.padEnd(14)} ${s.phases || '-'}p ${s.frameworks || '-'}f ${s.slides || '-'}sl ${s.doc_words || '-'}w${s.missing ? ' MISSING:' + s.missing.join(',') : ''}${s.deckErr ? ' ' + s.deckErr : ''}`);
const okN = summary.filter((s) => s.status === 'OK').length;
console.log(`\n${okN}/${summary.length} bundles built OK`);
