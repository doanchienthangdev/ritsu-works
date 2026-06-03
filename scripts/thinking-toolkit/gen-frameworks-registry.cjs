#!/usr/bin/env node
'use strict';
/**
 * scripts/thinking-toolkit/gen-frameworks-registry.cjs
 *
 * Bootstrap / refresh knowledge/problem-solving-frameworks.yaml — the CANDIDATE
 * REGISTRY for the mckinsey-workflow (thinking-toolkit v1.5) `tool_selection`
 * LOAD layer. Enumerates every problem-solving concept distilled from the two
 * McKinsey books (Cracked It! + Bulletproof Problem Solving) as a structured,
 * filterable, extensible pool the engine LOADs + SELECTs from — instead of
 * relying only on fuzzy `wiki_ask` (which can't filter "give me Structure-step
 * frameworks") or the catalog's small per-step curated subset.
 *
 * DETERMINISTIC (regenerable; no LLM): every field derives from the wiki
 * concept frontmatter / filename:
 *   - slug, title, book, wiki_path  ← frontmatter / path
 *   - fours_step                    ← source chapter → 4S stage (per-book map)
 *   - type                          ← keyword heuristic on the slug
 * The registry is SEEDED by this generator then HAND-MAINTAINABLE (like
 * design-systems.yaml / art-styles.yaml) — fix a mis-typed entry by editing the
 * yaml; re-run to discover concepts newly synced into the wiki (extensible:
 * "thêm sau này"). The engine reads each candidate's actual content via
 * wiki_path at SELECT time, so a coarse `type` is a filter hint, not a verdict.
 *
 * Usage:  node scripts/thinking-toolkit/gen-frameworks-registry.cjs [--check]
 *   (default) writes knowledge/problem-solving-frameworks.yaml
 *   --check   prints the candidate count + any concept missing from the registry
 *             (does not write) — used to detect drift after a wiki sync.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const OUT_REL = 'knowledge/problem-solving-frameworks.yaml';
const BOOKS = ['cracked-it', 'bulletproof-problem-solving'];

// Source chapter → 4S stage. Cracked It! follows 4S directly (Ch4 State, Ch5-6
// Structure, Ch7-9 Solve, Ch10 Sell). Bulletproof's 7-step maps: Ch2 Define→State,
// Ch3-4 disaggregate/workplan→Structure, Ch5-6 analyse→Solve, Ch7 synthesise→Sell.
const STEP_MAP = {
  'cracked-it': (c) => (c === 4 ? 'state' : (c === 5 || c === 6) ? 'structure' : (c >= 7 && c <= 9) ? 'solve' : c >= 10 ? 'sell' : 'cross'),
  'bulletproof-problem-solving': (c) => (c === 2 ? 'state' : (c === 3 || c === 4) ? 'structure' : (c === 5 || c === 6) ? 'solve' : c === 7 ? 'sell' : 'cross'),
};

// Marquee-framework overrides. Cracked It! Ch3 ("The 4S Method") is the OVERVIEW
// that introduces tools whose real home is a later, step-specific chapter — so
// the chapter→step map dumps them into `cross`. These canonical frameworks have
// a clear home step; pin it (deterministic, survives re-seed). Finer corrections
// can also be made by hand-editing the yaml (it is hand-maintainable). Keep
// genuinely cross-cutting items (4s-method, psac, design-thinking, system-1/2,
// and all biases/antipatterns used as guard-rails at every step) as `cross`.
const OVERRIDES = {
  'tosca-framework': { fours_step: 'state' },
  'issue-tree': { fours_step: 'structure' },
  'hypothesis-pyramid': { fours_step: 'structure' },
  'hypothesis-driven-problem-solving': { fours_step: 'structure' },
  'issue-driven-problem-solving': { fours_step: 'structure' },
  'solution-imperatives': { fours_step: 'state' },
  'solution-confirmation': { fours_step: 'solve' },
};

// Coarse type by slug keyword (a FILTER HINT — the engine reads content to decide).
function typeOf(slug) {
  const s = slug.toLowerCase();
  if (/(^|-)(confirmation|anchoring|availability|survivor|wysiati|overconfidence|overoptimism|loss-aversion|narrow-framing|groupthink)(-|$)|maslows-hammer|cognitive-bias|five-cognitive/.test(s)) return 'bias';
  if (/pitfall|antipattern|anti-pattern|\btrap\b|danger|curse|fallacy|paralysis|jumping-to|parade|story-of-the-search|wrong-framework|unknown-unknowns|miscommunication|expertise-trap|field-of-dreams/.test(s)) return 'antipattern';
  if (/framework|matrix|\btree\b|pyramid|\bmap\b|canvas|2x2|five-forces|portfolio|typology|checklist|\bmodel\b|tosca|\bmece\b|scamper|morphological|s-curve|theory-of-change|staircase|empathy-map|journey-map/.test(s)) return 'framework';
  if (/heuristic|rule-of|occams|order-of-magnitude|80-20|pareto|knock-out/.test(s)) return 'heuristic';
  if (/analysis|calculation|simulation|regression|statistics|sampling|sensitivity|monte-carlo|bayesian|\brct\b|experiment|degrees-of-analysis|expected-value|break-even|marginal|distribution|prototyp|interview|test-phase|crowdsourc|game-theory|machine-learning|natural-experiment|cost-curve/.test(s)) return 'technique';
  return 'concept';
}

function parseFrontmatter(txt) {
  const m = txt.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^([a-z][a-z0-9_]*):\s*(.*)$/i);
    if (mm) fm[mm[1]] = mm[2].trim();
  }
  return fm;
}

function build() {
  const entries = [];
  for (const book of BOOKS) {
    const dir = path.join(REPO, 'wiki', book, 'concepts');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
      const fm = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
      const slug = f.replace(/\.md$/, '');
      const ch = parseInt(fm.source_chapter_index, 10);
      let title = (fm.title || slug).replace(/^["']|["']$/g, '');
      const ov = OVERRIDES[slug] || {};
      entries.push({
        slug,
        book,
        fours_step: ov.fours_step || STEP_MAP[book](Number.isNaN(ch) ? -1 : ch),
        type: ov.type || typeOf(slug),
        wiki_path: `wiki/${book}/concepts/${slug}.md`,
        title,
      });
    }
  }
  return entries;
}

function emit(entries) {
  const total = entries.length;
  const byStep = {};
  const byType = {};
  for (const e of entries) { byStep[e.fours_step] = (byStep[e.fours_step] || 0) + 1; byType[e.type] = (byType[e.type] || 0) + 1; }
  let out = `# ============================================================================
# problem-solving-frameworks.yaml — the McKinsey toolkit CANDIDATE REGISTRY
# ============================================================================
# Capability: thinking-toolkit v1.5. The structured, filterable, extensible pool
# of ${total} problem-solving frameworks / models / heuristics / techniques /
# concepts / biases distilled from the two McKinsey books — the LOAD substrate
# for the mckinsey-workflow \`tool_selection\` layer. The engine FILTERs this
# registry (by fours_step + type) to shortlist candidates for a sub-need, then
# reads each candidate's content via wiki_path (or wiki_ask) at SELECT time.
#
# Why this exists (founder, 2026-06-03): the ~207 candidates EXISTED as wiki
# files, but there was no structured/classified/enumerable registry — wiki_ask
# is fuzzy RAG (can't filter "Structure-step frameworks"), and the resolver
# indexes recipients, not individual concepts. This is that registry.
#
# SEEDED by scripts/thinking-toolkit/gen-frameworks-registry.cjs (deterministic:
# fours_step from source chapter, type from slug keyword) then HAND-MAINTAINABLE
# (fix a mis-typed entry by editing here; re-run the generator with --check to
# find concepts newly synced into the wiki — extensible). \`type\` is a coarse
# filter hint; the engine reads the real content to decide.
#
# Schema:    knowledge/schemas/problem-solving-frameworks.schema.json
# Validator: scripts/cross-tier/validate-frameworks-registry.cjs (L2 critical;
#            check-consistency.cjs + CI). Proves COMPLETENESS (every book concept
#            is registered) + every wiki_path exists + enums valid.
#
# Counts: ${total} total | by step ${JSON.stringify(byStep)} | by type ${JSON.stringify(byType)}
# ============================================================================

version: "1.0.0"
schema: knowledge/schemas/problem-solving-frameworks.schema.json
source_books: [cracked-it, bulletproof-problem-solving]

frameworks:
`;
  for (const e of entries) {
    out += `  - slug: ${e.slug}\n    book: ${e.book}\n    fours_step: ${e.fours_step}\n    type: ${e.type}\n    wiki_path: ${e.wiki_path}\n    title: ${JSON.stringify(e.title)}\n`;
  }
  return out;
}

function main() {
  const check = process.argv.includes('--check');
  const entries = build();
  if (check) {
    console.log(`[check] ${entries.length} candidates found in the 2 books.`);
    const out = path.join(REPO, OUT_REL);
    if (fs.existsSync(out)) {
      const registered = new Set([...fs.readFileSync(out, 'utf8').matchAll(/^\s+- slug:\s*(\S+)/gm)].map((m) => m[1]));
      const missing = entries.filter((e) => !registered.has(e.slug));
      console.log(missing.length ? `[check] ${missing.length} concept(s) NOT in registry: ${missing.map((m) => m.slug).join(', ')}` : '[check] registry is complete.');
    }
    return;
  }
  fs.writeFileSync(path.join(REPO, OUT_REL), emit(entries));
  console.log(`[OK] wrote ${OUT_REL} — ${entries.length} candidates.`);
}

main();
