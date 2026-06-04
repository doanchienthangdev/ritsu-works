#!/usr/bin/env node
/**
 * build-index.cjs — assemble the master INDEX.md for the toolkit library.
 * Reads every built bundle's bundle-spec.json, groups by a curated taxonomy,
 * and emits raw/consultant/tookits/INDEX.md (the library map + per-toolkit rows).
 * Runs in the MAIN loop. Usage: node build-index.cjs [--out <dir>]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { TOOLKITS, bundleDir, pad } = require('./lib/toolkits.cjs');

function arg(f, d) { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; }
const OUT = arg('--out', '/Users/doanchienthang/ritsu-works/raw/consultant/tookits');

// Curated taxonomy (group → [toolkit nums]) + the composition note.
const GROUPS = [
  { title: 'Diagnose & Strategize', nums: [5, 1, 10], note: 'The problem-solving spine: run the engagement (5), set strategy (1), or stand up a venture (10).' },
  { title: 'Organize & Lead', nums: [2, 6, 16], note: 'Translate strategy into an operating model + org (2), staff & develop it (6), and lead it (16).' },
  { title: 'Transform & Build with Tech', nums: [3, 19, 4], note: 'Digital/IT strategy (3) and data/AI strategy (19), delivered through disciplined program & change management (4).' },
  { title: 'Grow & Sell', nums: [9], note: 'Take it to market: segmentation, marketing mix, pricing, sales and communication (9).' },
  { title: 'Operate & Improve', nums: [11, 12], note: 'Run the value chain (11) and relentlessly remove waste & variation (12, DMAIC).' },
  { title: 'Buy & Integrate', nums: [7, 8], note: 'Acquire (7, deal funnel) then capture the value (8, post-merger integration).' },
  { title: 'Fund, Measure & De-risk', nums: [14, 17, 15, 13, 20], note: 'Justify the spend (14), model the money (17), watch the dials (15), manage risk (13) — and the personal-wealth corollary (20).' },
];

function readSpec(tk) {
  const p = path.join(bundleDir(OUT, tk), 'bundle-spec.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

const specs = {};
for (const tk of TOOLKITS) specs[tk.num] = readSpec(tk);
const built = TOOLKITS.filter((t) => specs[t.num]);

function row(tk) {
  const s = specs[tk.num];
  const dir = `${pad(tk.num)}-${tk.slug}`;
  if (!s) return `| ${tk.num} | ${tk.title} | _pending_ | — | — | — |`;
  const model = (s.process || {}).model_name || '—';
  const ph = ((s.process || {}).phases || []).length;
  const fw = (s.frameworks || []).length;
  const one = (s.one_liner || '').replace(/\|/g, '\\|');
  return `| ${tk.num} | **[${tk.title}](${dir}/)** | ${model} | ${ph} | ${fw} | ${one} |`;
}

const lines = [];
lines.push('# Consulting Toolkits — Reconstructed Process Library');
lines.push('');
lines.push('> A library of world-class business-problem-solving **processes**, reconstructed from consulting-toolkit clues into full, *executable* playbooks. Each bundle = a detailed handbook PDF + a board-ready 16:9 deck + a machine-readable `process.yaml` spine + per-framework anatomy (description · visual · step-by-step tutorial · real example · template · pitfalls).');
lines.push('');
lines.push(`Built by the \`consulting-toolkit\` capability (\`/toolkit\`). ${built.length}/${TOOLKITS.length} toolkit bundles + a master index. Original synthesis in the consulting-deck genre — not copies of any source deck.`);
lines.push('');
lines.push('## How to use this library');
lines.push('');
lines.push('1. **Pick the toolkit** that matches your situation (use the groups below).');
lines.push('2. **Read the handbook PDF** (`<slug>-handbook.pdf`) — the full executable process: phases, gated steps, and every framework with a how-to + template.');
lines.push('3. **Present the deck** (`<slug>-deck.pdf`) — the board-ready version of the same process.');
lines.push('4. **Run it** — `process.yaml` is the machine-readable spine; `frameworks/` and `templates/` are the working tools. Edit `bundle-spec.json` and `/toolkit render <slug>` to regenerate both PDFs.');
lines.push('');
lines.push('Start with **#5 Management Consulting** — the meta-toolkit whose 5-phase engagement (business plan → proposal → diagnose → solve → present) is the operating system the others plug into.');
lines.push('');
lines.push('## The library at a glance');
lines.push('');
for (const g of GROUPS) {
  lines.push(`### ${g.title}`);
  lines.push('');
  lines.push(`_${g.note}_`);
  lines.push('');
  lines.push('| # | Toolkit | Process model | Phases | Frameworks | What you get |');
  lines.push('|---|---|---|---|---|---|');
  for (const num of g.nums) { const tk = TOOLKITS.find((t) => t.num === num); if (tk) lines.push(row(tk)); }
  lines.push('');
}
const totFw = built.reduce((a, t) => a + ((specs[t.num].frameworks || []).length), 0);
const totPh = built.reduce((a, t) => a + (((specs[t.num].process || {}).phases || []).length), 0);
lines.push('## Totals');
lines.push('');
lines.push(`- **${built.length}** reconstructed toolkits · **${totPh}** phases · **${totFw}** frameworks (each with full 6-part anatomy).`);
lines.push('- Each bundle: 1 handbook PDF + 1 deck PDF + `process.md`/`process.yaml` + `frameworks/*.md` + `templates/*` + `sources.md` + `README.md`.');
lines.push('');
lines.push('---');
lines.push('');
lines.push('_See `_structure/STRUCTURE.md` for the bundle contract and `_structure/domont-deliverable-anatomy.md` for the slide grammar. Generated by `scripts/consulting-toolkit/build-index.cjs`._');

fs.writeFileSync(path.join(OUT, 'INDEX.md'), lines.join('\n') + '\n');
console.log(`Wrote INDEX.md — ${built.length}/${TOOLKITS.length} bundles, ${totPh} phases, ${totFw} frameworks`);
for (const tk of TOOLKITS) console.log(`  ${specs[tk.num] ? '✓' : '·'} ${pad(tk.num)}-${tk.slug}`);
