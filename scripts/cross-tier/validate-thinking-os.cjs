#!/usr/bin/env node
/**
 * validate-thinking-os.cjs — L2 cross-tier invariant for the McKinsey thinking-OS.
 *
 * Guards the /think mckinsey v3.0 thinking-tool library against drift:
 *  - every consulting-frameworks.yaml framework has a wiki_path that EXISTS on disk
 *    (the selector reads it; a dangling pointer = a tool you can't apply);
 *  - fours_step values are valid; select_when present (the disambiguator);
 *  - every consulting-processes.yaml process points to a real wiki process page;
 *  - the fast per-4S-step maps + the process router exist (the load-fast structure).
 *
 * Registered in scripts/check-consistency.cjs (local `pnpm check`). Pure Node.
 * Exit 0 = clean, 1 = drift. Usage: node scripts/cross-tier/validate-thinking-os.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '../..');
const r = (p) => path.join(ROOT, p);
const errs = [];
const warns = [];
const STEPS = ['frame', 'structure', 'solve', 'sell', 'cross'];
const VALID_STEP = new Set(STEPS);

function load(rel) { try { return yaml.load(fs.readFileSync(r(rel), 'utf8')); } catch (e) { errs.push(`cannot load ${rel}: ${e.message}`); return null; } }

// --- consulting-frameworks.yaml ---
const cf = load('knowledge/consulting-frameworks.yaml');
if (cf) {
  const fws = cf.frameworks || [];
  if (cf.count != null && cf.count !== fws.length) warns.push(`consulting-frameworks count=${cf.count} but ${fws.length} entries`);
  let missingPages = 0, missingSelect = 0, badStep = 0;
  const seen = new Set();
  for (const f of fws) {
    if (seen.has(f.slug)) errs.push(`duplicate framework slug: ${f.slug}`); seen.add(f.slug);
    if (!VALID_STEP.has(f.fours_step)) { badStep++; if (badStep <= 5) errs.push(`framework ${f.slug}: invalid fours_step '${f.fours_step}'`); }
    if (!f.wiki_path || !fs.existsSync(r(f.wiki_path))) { missingPages++; if (missingPages <= 8) errs.push(`framework ${f.slug}: wiki_path missing on disk → ${f.wiki_path}`); }
    if (!f.select_when || !String(f.select_when).trim()) missingSelect++;
  }
  if (missingPages > 8) errs.push(`…and ${missingPages - 8} more frameworks with missing wiki pages`);
  if (missingSelect) warns.push(`${missingSelect}/${fws.length} frameworks lack a select_when disambiguator`);
  console.log(`  consulting-frameworks.yaml: ${fws.length} frameworks · pages-missing ${missingPages} · bad-step ${badStep}`);
}

// --- consulting-processes.yaml ---
const cp = load('knowledge/consulting-processes.yaml');
if (cp) {
  const procs = cp.processes || [];
  let missingProc = 0;
  for (const p of procs) {
    const pp = `wiki/consulting-toolkits/${p.slug}/process.md`;
    if (!fs.existsSync(r(pp))) { missingProc++; errs.push(`process ${p.slug}: wiki process page missing → ${pp}`); }
    if (!(p.phases && p.phases.length)) errs.push(`process ${p.slug}: no phases`);
  }
  console.log(`  consulting-processes.yaml: ${procs.length} processes · pages-missing ${missingProc}`);
}

// --- the fast per-step maps + router ---
const idx = 'knowledge/thinking-tool-index';
for (const f of [...STEPS.map((s) => `${idx}/${s}.md`), `${idx}/processes.md`, `${idx}/README.md`]) {
  if (!fs.existsSync(r(f))) errs.push(`missing fast-load map: ${f}`);
}

if (errs.length) {
  console.error(`\n✗ thinking-os: ${errs.length} error(s)`);
  errs.forEach((e) => console.error('  - ' + e));
  if (warns.length) warns.forEach((w) => console.error('  ⚠ ' + w));
  process.exit(1);
}
if (warns.length) warns.forEach((w) => console.log('  ⚠ ' + w));
console.log('  ✓ thinking-os registries ↔ wiki pages ↔ fast-load maps coherent');
process.exit(0);
