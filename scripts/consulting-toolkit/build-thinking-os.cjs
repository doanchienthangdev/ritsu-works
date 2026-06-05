#!/usr/bin/env node
/**
 * build-thinking-os.cjs — assemble the McKinsey thinking-OS selection substrate.
 *
 * Inputs (runtime/thinking-os/): registry-base.json (460 fw), processes-base.json (19),
 *   enriched/<toolkit>.json (precision tags + routing cards from the enrich workflow).
 * Also reads knowledge/problem-solving-frameworks.yaml (the existing 207 book frameworks).
 *
 * Outputs (knowledge/):
 *   consulting-frameworks.yaml      — the deduped toolkit frameworks (424 after slug-dedup of ~460 raw occurrences), fully tagged.
 *   consulting-processes.yaml       — the 20 domain process playbooks + routing cards.
 *   thinking-tool-index/{frame,structure,solve,sell,cross}.md  — UNIFIED per-4S-step compact
 *     maps (toolkit + book frameworks), 1 line/tool → fast checkpoint loading (no context-lost).
 *   thinking-tool-index/processes.md — the domain-process router (trigger → process).
 *   thinking-tool-index/README.md    — how /think mckinsey uses the maps.
 *
 * Runs MAIN loop. Usage: node build-thinking-os.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WT = '/Users/doanchienthang/ritsu-works/.claude/worktrees/epic-jennings-6198c5';
const RT = `${WT}/runtime/thinking-os`;
const K = `${WT}/knowledge`;
const IDX = `${K}/thinking-tool-index`;
fs.mkdirSync(IDX, { recursive: true });

const base = JSON.parse(fs.readFileSync(`${RT}/registry-base.json`, 'utf8'));
const procBase = JSON.parse(fs.readFileSync(`${RT}/processes-base.json`, 'utf8'));

// load enrichment tags
const tags = {}; // slug -> [{fours_step, cognitive_moves, select_when, checkpoint_fit}]
const cards = {}; // toolkit -> routing_card
let enrichedCount = 0, missingEnrich = [];
for (const f of fs.readdirSync(`${RT}/enriched`).filter((x) => x.endsWith('.json'))) {
  let o; try { o = JSON.parse(fs.readFileSync(`${RT}/enriched/${f}`, 'utf8')); } catch { missingEnrich.push(f + ' (bad json)'); continue; }
  enrichedCount++;
  if (o.routing_card) cards[o.toolkit] = o.routing_card;
  for (const fw of o.frameworks || []) { (tags[fw.slug] = tags[fw.slug] || []).push(fw); }
}

function mode(arr) { const c = {}; arr.forEach((x) => { if (x) c[x] = (c[x] || 0) + 1; }); return Object.keys(c).sort((a, b) => c[b] - c[a])[0]; }
const VALID_STEP = ['frame', 'structure', 'solve', 'sell', 'cross'];
const STEP_COERCE = { decide: 'solve', analyze: 'solve', diagnose: 'solve', design: 'solve', prototype: 'solve', forecast: 'solve', value: 'solve', prioritize: 'structure', plan: 'structure', synthesize: 'sell', communicate: 'sell', frame: 'frame' };
function coerceStep(s) { return VALID_STEP.includes(s) ? s : (STEP_COERCE[s] || 'solve'); }
function unionTop(arrs, n) { const c = {}; arrs.flat().forEach((x) => { if (x) c[x] = (c[x] || 0) + 1; }); return Object.keys(c).sort((a, b) => c[b] - c[a]).slice(0, n); }

// ---- dedup the 460 toolkit frameworks by slug → unified entries ----
const bySlug = {};
for (const b of base) {
  const e = bySlug[b.slug] = bySlug[b.slug] || { slug: b.slug, name: b.name, toolkits: [], domains: [], category: b.category, jtbd: b.jtbd, wiki_path: b.wiki_path, type: 'framework' };
  e.toolkits.push(b.toolkit); if (!e.domains.includes(b.domain)) e.domains.push(b.domain);
  if ((b.jtbd || '').length > (e.jtbd || '').length) e.jtbd = b.jtbd;
}
const tkFrameworks = Object.values(bySlug).map((e) => {
  const t = tags[e.slug] || [];
  return {
    slug: e.slug, name: e.name, toolkits: e.toolkits, domains: e.domains, category: e.category, type: 'framework',
    fours_step: coerceStep(mode(t.map((x) => x.fours_step))),
    cognitive_moves: unionTop(t.map((x) => x.cognitive_moves || []), 3),
    select_when: (t.map((x) => x.select_when).filter(Boolean).sort((a, b) => b.length - a.length)[0]) || e.jtbd.slice(0, 110),
    checkpoint_fit: unionTop(t.map((x) => x.checkpoint_fit || []), 3),
    jtbd: e.jtbd, wiki_path: e.wiki_path,
  };
});
tkFrameworks.sort((a, b) => a.slug.localeCompare(b.slug));

// ---- write consulting-frameworks.yaml ----
fs.writeFileSync(`${K}/consulting-frameworks.yaml`, yaml.dump({
  version: '1.0.0', schema: 'knowledge/schemas/consulting-frameworks.schema.json',
  source: 'Reconstructed from the 19-toolkit consulting library (raw/consultant/tookits) → wiki/consulting-toolkits/. Precision selection tags by the thinking-os-enrich workflow.',
  note: 'The toolkit half of the unified /think mckinsey thinking-tool registry; the book half is knowledge/problem-solving-frameworks.yaml (207). The per-4S-step maps in knowledge/thinking-tool-index/ unify both for fast checkpoint selection.',
  count: tkFrameworks.length, frameworks: tkFrameworks,
}, { lineWidth: 120, noRefs: true }));

// ---- write consulting-processes.yaml (the 19 domain playbooks) ----
const processes = procBase.map((p) => ({ ...p, routing_card: cards[p.slug] || null }));
fs.writeFileSync(`${K}/consulting-processes.yaml`, yaml.dump({
  version: '1.0.0', schema: 'knowledge/schemas/consulting-processes.schema.json',
  source: 'The 19 reconstructed domain process playbooks (wiki/consulting-toolkits/<slug>/process.md). Each plugs into /think mckinsey STRUCTURE as a domain-specific issue-tree/workplan spine.',
  count: processes.length, processes,
}, { lineWidth: 120, noRefs: true }));

// ---- unified per-4S-step maps (toolkit + book frameworks) ----
let bookFw = [];
try {
  const psf = yaml.load(fs.readFileSync(`${K}/problem-solving-frameworks.yaml`, 'utf8'));
  bookFw = (psf.frameworks || []).map((f) => ({ slug: f.slug, name: f.title, fours_step: f.fours_step, source: 'book:' + (f.book || '?'), type: f.type, wiki_path: f.wiki_path, select_when: '', domains: [], cognitive_moves: [], checkpoint_fit: [] }));
} catch (e) { console.warn('could not load problem-solving-frameworks.yaml:', e.message); }
const tkForMap = tkFrameworks.map((f) => ({ ...f, source: 'toolkit:' + f.toolkits[0] }));
const all = [...tkForMap, ...bookFw];
const STEPS = ['frame', 'structure', 'solve', 'sell', 'cross'];
for (const step of STEPS) {
  const rows = all.filter((f) => (f.fours_step || 'solve') === step).sort((a, b) => a.name.localeCompare(b.name));
  const lines = [
    `# Thinking-tool map — 4S step: ${step.toUpperCase()}`,
    `\n> Fast checkpoint-selection map. Load ONLY this file when the engine is at a \`${step}\` checkpoint. ${rows.length} tools. Filter by domain / cognitive-move / select-when, pick 2-3 complementary lenses (latticework), then READ the chosen tool's wiki page before applying. Full tags: \`knowledge/consulting-frameworks.yaml\`.`,
    `\n| tool | select when | moves | domains | checkpoint | → page |`,
    `|---|---|---|---|---|---|`,
    ...rows.map((f) => `| **${f.name}** \`${f.slug}\` ${f.source ? '·' + f.source.replace('toolkit:', 'tk:').replace('book:', 'bk:') : ''} | ${(f.select_when || '').replace(/\|/g, '/').slice(0, 90)} | ${(f.cognitive_moves || []).join(',')} | ${(f.domains || []).join(',')} | ${(f.checkpoint_fit || []).join(',')} | ${f.wiki_path ? f.wiki_path.replace('wiki/', '') : '—'} |`),
  ];
  fs.writeFileSync(`${IDX}/${step}.md`, lines.join('\n') + '\n');
}

// ---- the domain-process router ----
const procLines = [
  `# Domain-process router — pull an inherited ex-McKinsey process as the structuring spine`,
  `\n> At /think mckinsey STRUCTURE: if the problem signature matches a row, load that domain process (\`wiki/consulting-toolkits/<slug>/process.md\`) as the issue-tree/workplan spine instead of building one ad-hoc. The gated phase spine + frameworks-per-phase come pre-built. Full spine: \`knowledge/consulting-processes.yaml\`.`,
  `\n| domain process | pull when (trigger) | core question | plugs into | phases |`,
  `|---|---|---|---|---|`,
  ...processes.map((p) => { const c = p.routing_card || {}; return `| **${p.title}** \`${p.slug}\` | ${(c.trigger || p.when_to_use || '').replace(/\|/g, '/').slice(0, 100)} | ${(c.key_question || '').replace(/\|/g, '/').slice(0, 80)} | ${c.plugs_into || 'structure'} | ${(p.phases || []).map((x) => x.name).join(' → ').slice(0, 110)} |`; }),
];
fs.writeFileSync(`${IDX}/processes.md`, procLines.join('\n') + '\n');

// ---- index README ----
const counts = STEPS.map((s) => `${s}=${all.filter((f) => (f.fours_step || 'solve') === s).length}`).join(' · ');
fs.writeFileSync(`${IDX}/README.md`, [
  `# Thinking-tool index — the /think mckinsey fast checkpoint selector`,
  `\n> The "load fast, select precisely, no context-lost" structure. Unifies **${tkFrameworks.length} toolkit frameworks** + **${bookFw.length} book frameworks** = ${all.length} tools, split by 4S step, plus **${processes.length} domain processes**.`,
  `\n## How the engine uses it (per checkpoint)`,
  `1. Know your 4S step + cognitive move (CLASSIFY, per the mckinsey-workflow SKILL).`,
  `2. **Load ONLY \`${'{step}'}.md\`** (frame/structure/solve/sell/cross) — the compact map for that step (not the full ${all.length}-tool registry). This is the context-lost guard.`,
  `3. Filter the map by domain + cognitive-move + scan \`select when\`; pick **2-3 complementary** tools (latticework; debias against the familiar tool).`,
  `4. **READ each finalist's wiki page** before applying (the map is a pointer; the page is the how-to).`,
  `5. At STRUCTURE, also check \`processes.md\` — if the problem matches a domain, pull that inherited process as the spine.`,
  `\n## Files`,
  `- \`frame.md · structure.md · solve.md · sell.md · cross.md\` — per-4S-step tool maps (${counts}).`,
  `- \`processes.md\` — the domain-process router (${processes.length} playbooks).`,
  `- Full tags: \`knowledge/consulting-frameworks.yaml\` (toolkit) + \`knowledge/problem-solving-frameworks.yaml\` (book) + \`knowledge/consulting-processes.yaml\` (processes).`,
  `\n_Generated by \`scripts/consulting-toolkit/build-thinking-os.cjs\`._`,
].join('\n') + '\n');

console.log(`✓ consulting-frameworks.yaml: ${tkFrameworks.length} deduped toolkit frameworks (from ${base.length} occurrences)`);
console.log(`✓ consulting-processes.yaml: ${processes.length} domain processes (${Object.keys(cards).length} routing cards)`);
console.log(`✓ thinking-tool-index/: per-step maps [${counts}] + processes.md (unified ${all.length} tools)`);
console.log(`  enriched toolkits: ${enrichedCount}/${processes.length}${missingEnrich.length ? ' · ISSUES: ' + missingEnrich.join(', ') : ''}`);
const untagged = tkFrameworks.filter((f) => !(tags[f.slug] || []).length).length;
if (untagged) console.log(`  ⚠ ${untagged} frameworks had no enrichment tags (defaulted fours_step=solve) — re-run enrich for missing toolkits`);
