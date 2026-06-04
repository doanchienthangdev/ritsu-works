#!/usr/bin/env node
/**
 * render.cjs — capability `consulting-toolkit` deterministic renderer.
 *
 * Reads a bundle-spec.json (the reconstruction agent's output, per
 * 06-ai-ops/skills/consulting-toolkit/STRUCTURE.md §3) and materializes the
 * full artifact bundle into <out-dir>:
 *   process.md · process.yaml · frameworks/*.md · templates/* · sources.md
 *   README.md · slides/deck.html · slides/deck.spec.json · bundle-spec.json
 *   <slug>-deck.pdf      (16:9, headless Chrome)
 *   <slug>-handbook.pdf  (A4, weasyprint — proper paged page numbers)
 *
 * Pure-Node + two external renderers (Chrome, weasyprint), both verified.
 * Runs in the MAIN loop (writes to main-root raw/; not a workflow agent).
 *
 * Usage: node render.cjs <bundle-spec.json> <out-dir> [--no-pdf] [--deck-only] [--doc-only]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const yaml = require('js-yaml');
const { renderDeckHtml } = require('./lib/deck.cjs');
const { renderDocHtml } = require('./lib/doc.cjs');

const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PY = process.env.PYTHON_BIN || '/opt/anaconda3/bin/python3';
const DYLD = process.env.DYLD_FALLBACK_LIBRARY_PATH || '/opt/homebrew/lib';

function die(m) { console.error('ERROR: ' + m); process.exit(1); }
function flag(f) { return process.argv.includes(f); }

const specPath = process.argv[2];
const outDir = process.argv[3];
if (!specPath || !outDir) die('usage: render.cjs <bundle-spec.json> <out-dir> [--no-pdf|--deck-only|--doc-only]');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const slug = spec.slug || 'toolkit';

// ---- validate cross-refs (warn, don't die — partial bundles still useful) ----
const fwSlugs = new Set((spec.frameworks || []).map((f) => f.slug));
const srcKeys = new Set((spec.sources || []).map((s) => s.key));
const warns = [];
for (const ph of (spec.process && spec.process.phases) || [])
  for (const st of ph.steps || [])
    for (const fr of st.frameworks || []) if (!fwSlugs.has(fr)) warns.push(`step ${ph.n}.${st.n} → unknown framework '${fr}'`);
for (const f of spec.frameworks || [])
  for (const k of f.sources || []) if (!srcKeys.has(k)) warns.push(`framework '${f.slug}' → unknown source '${k}'`);
if (warns.length) console.warn(`[render ${slug}] ${warns.length} cross-ref warnings:\n  - ` + warns.slice(0, 8).join('\n  - '));

fs.mkdirSync(path.join(outDir, 'frameworks'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'templates'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'slides'), { recursive: true });

// ---- bundle-spec.json (kept for re-render) ----
fs.writeFileSync(path.join(outDir, 'bundle-spec.json'), JSON.stringify(spec, null, 2));

// ---- process.md ----
fs.writeFileSync(path.join(outDir, 'process.md'), spec.document_md || `# ${spec.title}\n\n_${spec.one_liner || ''}_\n`);

// ---- process.yaml (machine-readable spine) ----
const pyaml = {
  id: spec.id, slug: spec.slug, title: spec.title, domain: spec.domain,
  core_value: spec.core_value, one_liner: spec.one_liner, when_to_use: spec.when_to_use,
  audience: spec.audience,
  process: {
    model_name: (spec.process || {}).model_name,
    model_rationale: (spec.process || {}).model_rationale,
    phases: ((spec.process || {}).phases || []).map((p) => ({
      n: p.n, name: p.name, goal: p.goal, key_question: p.key_question, duration: p.duration,
      steps: (p.steps || []).map((s) => ({ n: s.n, name: s.name, how: s.how, frameworks: s.frameworks, input: s.input, output: s.output, owner: s.owner })),
      frameworks: p.frameworks, deliverable: p.deliverable, kpis: p.kpis, gate: p.gate,
    })),
  },
  frameworks: (spec.frameworks || []).map((f) => ({ slug: f.slug, name: f.name, category: f.category, when_to_use: f.when_to_use })),
};
fs.writeFileSync(path.join(outDir, 'process.yaml'), yaml.dump( pyaml, { lineWidth: 100, noRefs: true }));

// ---- frameworks/*.md (6-part anatomy) ----
for (const f of spec.frameworks || []) {
  const v = f.visual || {};
  const md = [
    `# ${f.name}`,
    f.category ? `\n*Category: ${f.category}*` : '',
    `\n## What it is\n${f.what || ''}`,
    f.origin ? `\n**Origin:** ${f.origin}` : '',
    f.logic ? `\n## Why it works\n${f.logic}` : '',
    `\n## Visual\n\`${v.kind || 'none'}\` — see the deck. ${v.spec ? '\n\n```json\n' + JSON.stringify(v.spec, null, 2) + '\n```' : ''}`,
    `\n## Step-by-step tutorial\n${(f.tutorial || []).map((s, i) => `${i + 1}. ${s}`).join('\n') || '_n/a_'}`,
    f.example ? `\n## Real-life example — ${f.example.company || ''}\n${f.example.narrative || ''}${f.example.takeaway ? `\n\n**So what:** ${f.example.takeaway}` : ''}` : '',
    f.template ? `\n## Template\n${f.template.instructions || ''}\n\n${(f.template.fields || []).map((x) => `- [ ] ${x}`).join('\n')}` : '',
    (f.pitfalls && f.pitfalls.length) ? `\n## Pitfalls\n${f.pitfalls.map((p) => `- ${p}`).join('\n')}` : '',
    f.when_to_use ? `\n## When to use\n${f.when_to_use}` : '',
  ].filter(Boolean).join('\n');
  fs.writeFileSync(path.join(outDir, 'frameworks', `${f.slug}.md`), md + '\n');
}

// ---- templates/* ----
for (const t of spec.templates || []) {
  const ext = t.format === 'csv' ? 'csv' : 'md';
  const name = (t.name || 'template').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  fs.writeFileSync(path.join(outDir, 'templates', `${name}.${ext}`), t.content || '');
}
if (spec.worked_example) fs.writeFileSync(path.join(outDir, 'templates', 'worked-example.md'), `# ${spec.worked_example.title || 'Worked example'}\n\n${spec.worked_example.content_md || ''}\n`);

// ---- sources.md ----
fs.writeFileSync(path.join(outDir, 'sources.md'),
  `# Sources — ${spec.title}\n\nResearch provenance for the reconstruction.\n\n` +
  (spec.sources || []).map((s) => `- **[${s.key}]** ${s.title}${s.url ? ` — ${s.url}` : ''}${s.note ? ` _(${s.note})_` : ''}`).join('\n') + '\n');

// ---- slides/deck.spec.json + deck.html ----
fs.writeFileSync(path.join(outDir, 'slides', 'deck.spec.json'), JSON.stringify(spec.deck || {}, null, 2));
const deckHtml = renderDeckHtml(spec);
const deckHtmlPath = path.join(outDir, 'slides', 'deck.html');
fs.writeFileSync(deckHtmlPath, deckHtml);

// ---- README.md ----
const phases = (spec.process || {}).phases || [];
const spineRows = phases.map((p) => `| ${p.n} | **${p.name}** | ${p.goal || ''} | ${p.deliverable || ''} |`).join('\n');
fs.writeFileSync(path.join(outDir, 'README.md'), [
  `# ${spec.title} — Toolkit Bundle`,
  `\n> ${spec.one_liner || ''}`,
  `\n**Core value:** ${spec.core_value || ''}`,
  `\n**When to use:** ${spec.when_to_use || ''}`,
  `\n## Process at a glance — ${(spec.process || {}).model_name || ''}`,
  `\n| # | Phase | Goal | Deliverable |\n|---|---|---|---|\n${spineRows}`,
  `\n## Files`,
  `\n- \`${slug}-handbook.pdf\` — the detailed handbook (read this first).`,
  `- \`${slug}-deck.pdf\` — the consulting deck (present this).`,
  `- \`process.md\` — handbook source (markdown).`,
  `- \`process.yaml\` — machine-readable process spine.`,
  `- \`frameworks/\` — ${(spec.frameworks || []).length} frameworks, each with full anatomy.`,
  `- \`templates/\` — fill-in working templates + worked example.`,
  `- \`sources.md\` — research provenance.`,
  `- \`slides/deck.html\` — editable deck source.`,
  `\n## Frameworks included`,
  `\n${(spec.frameworks || []).map((f) => `- **${f.name}** — ${f.what || ''}`).join('\n')}`,
  `\n---\n_Reconstructed by the \`consulting-toolkit\` capability. Original synthesis in the consulting-deck genre; not a copy of any source. Self-grade: coverage ${Math.round((spec.self_grade || {}).coverage_pct * 100) || '?'}%._`,
].join('\n') + '\n');

// ---- PDFs ----
function chromePdf(htmlPath, pdfPath) {
  cp.execFileSync(CHROME, ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, htmlPath],
    { stdio: 'ignore', timeout: 120000 });
}
function weasyPdf(htmlPath, pdfPath) {
  cp.execFileSync(PY, ['-m', 'weasyprint', htmlPath, pdfPath],
    { stdio: 'ignore', timeout: 180000, env: Object.assign({}, process.env, { DYLD_FALLBACK_LIBRARY_PATH: DYLD }) });
}

const noPdf = flag('--no-pdf');
if (!noPdf && !flag('--doc-only')) {
  try { chromePdf(deckHtmlPath, path.join(outDir, `${slug}-deck.pdf`)); console.log(`  ✓ deck.pdf`); }
  catch (e) { console.error(`  ✗ deck.pdf: ${e.message}`); }
}
if (!noPdf && !flag('--deck-only')) {
  const docHtmlPath = path.join(outDir, 'slides', '_handbook.html');
  fs.writeFileSync(docHtmlPath, renderDocHtml(spec));
  try { weasyPdf(docHtmlPath, path.join(outDir, `${slug}-handbook.pdf`)); console.log(`  ✓ handbook.pdf`); }
  catch (e) { console.error(`  ✗ handbook.pdf: ${e.message}`); }
}

console.log(`[render ${slug}] bundle written → ${outDir}  (${phases.length} phases, ${(spec.frameworks || []).length} frameworks, ${((spec.deck || {}).slides || []).length} slides)`);
