#!/usr/bin/env node
'use strict';
// ============================================================================
// scripts/write/longform/plan.cjs — long-form scaffolder (bible + part plan)
// ============================================================================
// For a long-form /write run: copies the type's BIBLE template into the artifact
// dir + computes a part/chapter plan (parts.json) the orchestrator fills + fans
// out. DETERMINISTIC. The bible is the single source of truth every part drafts
// against (see 06-ai-ops/skills/write/longform/SKILL.md).
//
// CLI: node scripts/write/longform/plan.cjs --type=novel --request="..." --words=70000 --out-dir=<dir> [--parts=N]
// Output: one line of JSON {ok, type, bible, partsPlanPath, parts, dir, warnings}.
// ============================================================================

const fs = require('fs');
const path = require('path');
const { MAIN_ROOT } = require('../lib/artifact-path.cjs');

const HERE = __dirname;
const WT_ROOT = path.resolve(HERE, '..', '..', '..');                  // worktree root (where the bible templates live, committed)
const BIBLES = path.join(WT_ROOT, '06-ai-ops', 'write', 'longform', 'bibles');

// per-type part granularity (≈ words per chapter/scene/lesson/installment) + label + bounds.
const PART_SPEC = {
  book:           { per: 4000, label: 'Chapter', min: 5, max: 30 },
  novel:          { per: 3500, label: 'Chapter', min: 8, max: 40 },
  'film-script':  { per: 1800, label: 'Sequence', min: 6, max: 16 },
  'research-paper': { per: 0, label: 'Section', min: 8, max: 8,
    fixed: ['Abstract', 'Introduction', 'Related Work', 'Method', 'Results', 'Discussion', 'Conclusion', 'References'] },
  'article-series': { per: 1500, label: 'Installment', min: 3, max: 12 },
  course:         { per: 1800, label: 'Lesson', min: 4, max: 24 },
};

function planParts(type, words) {
  const spec = PART_SPEC[type] || { per: 3000, label: 'Part', min: 3, max: 20 };
  if (spec.fixed) {
    return spec.fixed.map((title, i) => ({ n: i + 1, title, word_budget: Math.round(words / spec.fixed.length), must_accomplish: '', owns: [] }));
  }
  const n = Math.max(spec.min, Math.min(spec.max, Math.round(words / spec.per) || spec.min));
  const each = Math.round(words / n);
  return Array.from({ length: n }, (_, i) => ({ n: i + 1, title: `${spec.label} ${i + 1}`, word_budget: each, must_accomplish: '', owns: [] }));
}

function plan(opts) {
  const warnings = [];
  const type = opts.type;
  const words = Math.max(1000, Number(opts.words) || 30000);
  const outDir = path.isAbsolute(opts.outDir) ? opts.outDir : path.join(MAIN_ROOT, opts.outDir || path.join('.archives', 'write', 'longform'));
  fs.mkdirSync(outDir, { recursive: true });

  // copy the bible template
  const tplPath = path.join(BIBLES, `${type}.md`);
  const biblePath = path.join(outDir, 'bible.md');
  if (fs.existsSync(tplPath)) {
    if (!fs.existsSync(biblePath)) fs.copyFileSync(tplPath, biblePath);
  } else { warnings.push(`no bible template for type "${type}" — using the generic one`); fs.writeFileSync(biblePath, `# ${type} bible\n\n> Fill + LOCK before drafting. Single source of truth for all parts.\n`); }

  // part plan
  const parts = opts.parts ? Array.from({ length: Number(opts.parts) }, (_, i) => ({ n: i + 1, title: `Part ${i + 1}`, word_budget: Math.round(words / Number(opts.parts)), must_accomplish: '', owns: [] })) : planParts(type, words);
  const partsPlanPath = path.join(outDir, 'parts.json');
  fs.writeFileSync(partsPlanPath, JSON.stringify({ type, request: opts.request || null, target_words: words, parts }, null, 2));

  return { ok: true, type, bible: biblePath, partsPlanPath, parts: parts.length, total_words: words, dir: outDir, warnings };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const get = (k) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : undefined; };
  const out = plan({ type: get('type'), request: get('request'), words: get('words'), outDir: get('out-dir'), parts: get('parts') });
  process.stdout.write(JSON.stringify(out) + '\n');
}

module.exports = { plan, planParts, PART_SPEC };
