#!/usr/bin/env node
/**
 * to-wiki-and-registry.cjs — deterministic foundation for the thinking-OS integration.
 *
 * Reads the 19 reconstructed bundle-spec.json (raw/) and:
 *  1. WIKI: writes wiki/consulting-toolkits/{source.md, <toolkit>/process.md,
 *     <toolkit>/concepts/<framework>.md} — the searchable knowledge layer (ask 1).
 *     One top-level wiki source ("consulting-toolkits") → +1 resolver entry (INDEX-safe).
 *  2. REGISTRY BASE: emits runtime/thinking-os/registry-base.json (per framework:
 *     slug, name, toolkit, domain, category, jtbd, type, wiki_path, phases_used) +
 *     processes-base.json (per toolkit: domain, when_to_use, model, phase spine).
 *  3. ENRICHMENT INPUT: emits runtime/thinking-os/enrich/<toolkit>.md — the compact
 *     per-toolkit input the tagging workflow reads to add fours_step / cognitive_move /
 *     select_when / checkpoint_fit (the precision tags) — ask 3.
 *
 * Runs MAIN loop (reads main-root raw/). Pure Node. Usage: node to-wiki-and-registry.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { TOOLKITS, pad } = require('./lib/toolkits.cjs');

const RAW = '/Users/doanchienthang/ritsu-works/raw/consultant/tookits';
const WT = '/Users/doanchienthang/ritsu-works/.claude/worktrees/epic-jennings-6198c5';
const WIKI = `${WT}/wiki/consulting-toolkits`;
const RT = `${WT}/runtime/thinking-os`;
const ENRICH = `${RT}/enrich`;
fs.mkdirSync(WIKI, { recursive: true });
fs.mkdirSync(ENRICH, { recursive: true });

function fm(obj) { // minimal YAML frontmatter
  const lines = ['---'];
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) lines.push(`${k}: [${v.map((x) => JSON.stringify(x)).join(', ')}]`);
    else lines.push(`${k}: ${typeof v === 'string' && /[:#]/.test(v) ? JSON.stringify(v) : v}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

function frameworkMd(f, tk) {
  const v = f.visual || {};
  const body = [
    fm({ type: 'concept', slug: f.slug, title: f.name, source_collection: 'consulting-toolkits', toolkit: tk.slug, domain: tk.domain, category: f.category || 'framework', generated_by: 'consulting-toolkit reconstruction', license_status: 'internal_reconstruction_original_synthesis' }),
    `# ${f.name}`,
    f.category ? `\n*Category: ${f.category} · Toolkit: ${tk.title}*` : '',
    `\n## What it is\n${f.what || ''}`,
    f.origin ? `\n**Origin:** ${f.origin}` : '',
    f.logic ? `\n## Why it works\n${f.logic}` : '',
    f.when_to_use ? `\n## When to use\n${f.when_to_use}` : '',
    `\n## Visual\n\`${v.kind || 'none'}\``,
    `\n## Step-by-step tutorial\n${(f.tutorial || []).map((s, i) => `${i + 1}. ${s}`).join('\n') || '_n/a_'}`,
    f.example ? `\n## Real-life example — ${f.example.company || ''}\n${f.example.narrative || ''}${f.example.takeaway ? `\n\n**So what:** ${f.example.takeaway}` : ''}` : '',
    f.template ? `\n## Template\n${(f.template.instructions || '')}\n\n${(f.template.fields || []).map((x) => `- [ ] ${x}`).join('\n')}` : '',
    (f.pitfalls && f.pitfalls.length) ? `\n## Pitfalls\n${f.pitfalls.map((p) => `- ${p}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
  return body + '\n';
}

const registryBase = [];
const processesBase = [];
let nFw = 0, nWiki = 0;

for (const tk of TOOLKITS) {
  const specPath = `${RAW}/${pad(tk.num)}-${tk.slug}/bundle-spec.json`;
  if (!fs.existsSync(specPath)) { console.error('skip (no spec):', tk.slug); continue; }
  const o = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const tkWiki = `${WIKI}/${tk.slug}`;
  fs.mkdirSync(`${tkWiki}/concepts`, { recursive: true });

  // process.md (the handbook) → wiki
  fs.writeFileSync(`${tkWiki}/process.md`, fm({ type: 'process', slug: tk.slug, title: `${tk.title} — Process`, source_collection: 'consulting-toolkits', domain: tk.domain, model_name: (o.process || {}).model_name || '' }) + (o.document_md || `# ${tk.title}\n`));
  nWiki++;

  // framework → which phases use it (for base + enrichment context)
  const phases = (o.process || {}).phases || [];
  const fwPhases = {};
  phases.forEach((ph) => { (ph.frameworks || []).forEach((s) => { (fwPhases[s] = fwPhases[s] || []).push(ph.n); }); (ph.steps || []).forEach((st) => (st.frameworks || []).forEach((s) => { (fwPhases[s] = fwPhases[s] || []).push(ph.n); })); });

  // concept pages + registry base
  const enrichRows = [];
  for (const f of o.frameworks || []) {
    fs.writeFileSync(`${tkWiki}/concepts/${f.slug}.md`, frameworkMd(f, tk));
    nFw++;
    const wiki_path = `wiki/consulting-toolkits/${tk.slug}/concepts/${f.slug}.md`;
    const phasesUsed = [...new Set(fwPhases[f.slug] || [])].sort((a, b) => a - b);
    registryBase.push({ slug: f.slug, name: f.name, toolkit: tk.slug, domain: tk.domain, category: f.category || 'framework', jtbd: (f.when_to_use || f.what || '').slice(0, 240), type: 'framework', wiki_path, phases_used: phasesUsed });
    enrichRows.push(`- **${f.slug}** | ${f.name} | cat:${f.category || '?'} | phase(s):${phasesUsed.join(',') || '—'} | what: ${(f.what || '').slice(0, 110)} | when: ${(f.when_to_use || '').slice(0, 130)}`);
  }

  // process registry base
  processesBase.push({
    slug: tk.slug, title: tk.title, domain: tk.domain,
    model_name: (o.process || {}).model_name || '', when_to_use: o.when_to_use || '', core_value: o.core_value || '',
    phases: phases.map((p) => ({ n: p.n, name: p.name, goal: p.goal, key_question: p.key_question, gate: p.gate, frameworks: [...new Set([...(p.frameworks || []), ...((p.steps || []).flatMap((s) => s.frameworks || []))])] })),
  });

  // enrichment input (compact, per toolkit)
  const enrichMd = [
    `# Tagging input — ${tk.title} (toolkit: ${tk.slug}, domain: ${tk.domain})`,
    `\nModel: ${(o.process || {}).model_name || ''}`,
    `\nPhase spine (in order): ${phases.map((p) => `${p.n}.${p.name} [${p.key_question || ''}]`).join('  →  ')}`,
    `\n## Frameworks to tag (${(o.frameworks || []).length}):\n`,
    enrichRows.join('\n'),
  ].join('\n');
  fs.writeFileSync(`${ENRICH}/${tk.slug}.md`, enrichMd + '\n');
}

// wiki library source.md (the ONE top-level resolver entry)
fs.writeFileSync(`${WIKI}/source.md`, fm({ type: 'source-collection', slug: 'consulting-toolkits', title: 'Consulting Toolkits — Reconstructed Process & Framework Library', source_kind: 'reconstructed_collection', license_status: 'internal_reconstruction_original_synthesis', collection_size: TOOLKITS.length }) +
  `# Consulting Toolkits — Reconstructed Process & Framework Library\n\n${TOOLKITS.length} world-class consulting processes (strategy, M&A, supply chain, Lean Six Sigma, risk, FP&A, …), each reconstructed into an executable playbook with full per-framework anatomy. The searchable knowledge layer behind the \`/think mckinsey\` checkpoint tool-selector. Original synthesis in the consulting genre — not a copy of any source.\n\n## Toolkits\n\n${TOOLKITS.map((t) => `- **[${t.title}](${t.slug}/process.md)** (\`${t.slug}\`, ${t.domain}) — ${t.slug}/concepts/`).join('\n')}\n\n_Frameworks are registered (with selection tags) in \`knowledge/consulting-frameworks.yaml\`; processes in \`knowledge/consulting-processes.yaml\`. See \`06-ai-ops/skills/thinking-toolkit/\` for how \`/think mckinsey\` selects from them._\n`);

fs.writeFileSync(`${RT}/registry-base.json`, JSON.stringify(registryBase, null, 2));
fs.writeFileSync(`${RT}/processes-base.json`, JSON.stringify(processesBase, null, 2));
console.log(`✓ wiki: ${nWiki} process pages + ${nFw} concept pages → wiki/consulting-toolkits/ (1 source)`);
console.log(`✓ registry-base: ${registryBase.length} frameworks → ${RT}/registry-base.json`);
console.log(`✓ processes-base: ${processesBase.length} processes → ${RT}/processes-base.json`);
console.log(`✓ enrichment inputs: ${TOOLKITS.length} files → ${ENRICH}/`);
