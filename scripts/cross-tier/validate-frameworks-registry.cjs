#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-frameworks-registry.cjs
 *
 * L2 validator for capability `thinking-toolkit` v1.5 — the McKinsey toolkit
 * CANDIDATE REGISTRY (knowledge/problem-solving-frameworks.yaml). Beyond the L1
 * JSON-schema shape check (validate-tier1.cjs), this enforces the cross-tier
 * invariants that make the registry trustworthy as the engine's LOAD substrate:
 *
 *   PER ENTRY:  slug kebab + unique; book ∈ {cracked-it, bulletproof-...};
 *               fours_step ∈ 4S∪{cross}; type ∈ TYPES; wiki_path is the
 *               canonical wiki/<book>/concepts/<slug>.md AND exists on disk
 *               (no phantom candidate); title non-empty.
 *   COMPLETENESS (the whole point): EVERY concept file in the two books'
 *               wiki/<book>/concepts/ dirs MUST appear in the registry. A
 *               registry that silently drops candidates is worse than none —
 *               the engine would believe a tool doesn't exist. This check makes
 *               the registry provably complete; after a wiki sync adds concepts,
 *               re-run scripts/thinking-toolkit/gen-frameworks-registry.cjs.
 *
 * Registered in scripts/check-consistency.cjs (local `pnpm check`) AND as an
 * explicit job in .github/workflows/cross-tier-consistency.yml. BOTH required.
 *
 * `validateRegistry(doc, repoRoot)` is exported pure (returns string[] of
 * errors) so tests exercise edge + broken cases without a CLI.
 * Exit 0 = pass, 1 = drift.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY_REL = 'knowledge/problem-solving-frameworks.yaml';
const BOOKS = ['cracked-it', 'bulletproof-problem-solving'];
const FOURS = ['state', 'structure', 'solve', 'sell', 'cross'];
const FOURS_CANONICAL = ['state', 'structure', 'solve', 'sell']; // the 4 real steps (cross = catch-all)
const TYPES = ['framework', 'model', 'heuristic', 'technique', 'concept', 'bias', 'antipattern'];
// SELECTABLE = tools you LOAD + apply (vs bias/antipattern = guard-rails, concept = principle).
// Every 4S step must have ≥1 selectable candidate so the tool_selection LOAD never comes up empty.
const SELECTABLE_TYPES = ['framework', 'model', 'heuristic', 'technique'];
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/** All concept slugs that exist on disk for a given book (sorted). */
function conceptsOnDisk(repoRoot, book) {
  const dir = path.join(repoRoot, 'wiki', book, 'concepts');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')).sort();
}

/**
 * Pure validation. Returns an array of error strings (empty = valid).
 * @param {*} doc        parsed YAML (any shape — defends against garbage)
 * @param {string} repoRoot base dir for concept file-existence + completeness checks
 */
function validateRegistry(doc, repoRoot) {
  const errs = [];

  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    return ['root must be a mapping'];
  }
  if (typeof doc.version !== 'string' || !doc.version.trim()) {
    errs.push('version must be a non-empty string');
  }

  const fw = doc.frameworks;
  if (!Array.isArray(fw)) return errs.concat('frameworks must be an array');
  if (fw.length === 0) return errs.concat('frameworks is empty (no candidates registered)');

  const seen = new Set();
  // registered slugs per book — for the completeness check
  const registeredByBook = Object.fromEntries(BOOKS.map((b) => [b, new Set()]));
  // count of SELECTABLE candidates per canonical step — for the coverage check
  const selectableByStep = Object.fromEntries(FOURS_CANONICAL.map((s) => [s, 0]));

  fw.forEach((e, i) => {
    const where = e && typeof e.slug === 'string' ? `framework '${e.slug}'` : `frameworks[${i}]`;
    if (!e || typeof e !== 'object' || Array.isArray(e)) {
      errs.push(`${where}: must be a mapping`);
      return;
    }

    // slug — unique key is (book, slug): the same concept slug can legitimately
    // exist in BOTH books (e.g. mece, wicked-problems) as distinct wiki files.
    if (typeof e.slug !== 'string' || !SLUG_RE.test(e.slug)) {
      errs.push(`${where}: slug must be kebab-case (^[a-z0-9][a-z0-9-]*$)`);
    } else {
      const key = `${e.book}/${e.slug}`;
      if (seen.has(key)) errs.push(`duplicate candidate: ${key}`);
      seen.add(key);
    }

    // book
    if (!BOOKS.includes(e.book)) {
      errs.push(`${where}: book must be one of ${BOOKS.join(', ')} (got ${JSON.stringify(e.book)})`);
    }

    // fours_step / type enums
    if (!FOURS.includes(e.fours_step)) errs.push(`${where}: fours_step must be one of ${FOURS.join(', ')} (got ${JSON.stringify(e.fours_step)})`);
    if (!TYPES.includes(e.type)) errs.push(`${where}: type must be one of ${TYPES.join(', ')} (got ${JSON.stringify(e.type)})`);

    // source_chapter: integer >= -1 (provenance; -1 = source omitted it)
    if (!Number.isInteger(e.source_chapter) || e.source_chapter < -1) {
      errs.push(`${where}: source_chapter must be an integer >= -1 (got ${JSON.stringify(e.source_chapter)})`);
    }

    // title
    if (typeof e.title !== 'string' || !e.title.trim()) errs.push(`${where}: title must be a non-empty string`);

    // coverage accounting: count selectable tools per canonical step
    if (FOURS_CANONICAL.includes(e.fours_step) && SELECTABLE_TYPES.includes(e.type)) {
      selectableByStep[e.fours_step]++;
    }

    // wiki_path: canonical shape + matches slug/book + exists on disk
    if (typeof e.wiki_path !== 'string' || !e.wiki_path.trim()) {
      errs.push(`${where}: wiki_path must be a non-empty string`);
    } else {
      if (BOOKS.includes(e.book) && SLUG_RE.test(e.slug || '')) {
        const expected = `wiki/${e.book}/concepts/${e.slug}.md`;
        if (e.wiki_path !== expected) errs.push(`${where}: wiki_path should be ${expected} (got ${e.wiki_path})`);
      }
      if (!fs.existsSync(path.join(repoRoot, e.wiki_path))) {
        errs.push(`${where}: wiki_path not found on disk: ${e.wiki_path} (phantom candidate)`);
      }
    }

    if (BOOKS.includes(e.book) && typeof e.slug === 'string') registeredByBook[e.book].add(e.slug);
  });

  // COMPLETENESS — every concept on disk must be registered.
  for (const book of BOOKS) {
    const onDisk = conceptsOnDisk(repoRoot, book);
    const missing = onDisk.filter((s) => !registeredByBook[book].has(s));
    if (missing.length) {
      errs.push(`${book}: ${missing.length} concept(s) on disk not registered: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', …' : ''} (re-run scripts/thinking-toolkit/gen-frameworks-registry.cjs)`);
    }
  }

  // COVERAGE — every canonical 4S step must have ≥1 selectable candidate
  // (framework/model/heuristic/technique), so the tool_selection LOAD layer can
  // always shortlist something to apply at that step (cross candidates also
  // apply, but a step with zero of its OWN selectable tools is a real gap).
  for (const step of FOURS_CANONICAL) {
    if (selectableByStep[step] === 0) {
      errs.push(`coverage: step '${step}' has 0 selectable candidates (framework/model/heuristic/technique) — the engine cannot LOAD a tool for it`);
    }
  }

  return errs;
}

function main() {
  const REGISTRY = path.join(REPO_ROOT, REGISTRY_REL);
  if (!fs.existsSync(REGISTRY)) {
    console.error(`[FAIL] ${REGISTRY_REL} missing. (capability thinking-toolkit v1.5)`);
    process.exit(1);
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(REGISTRY, 'utf-8'));
  } catch (e) {
    console.error(`[FAIL] ${REGISTRY_REL} YAML parse error: ${e.message}`);
    process.exit(1);
  }

  const errs = validateRegistry(doc, REPO_ROOT);
  if (errs.length) {
    console.error(`[FAIL] problem-solving-frameworks.yaml: ${errs.length} error(s):`);
    for (const m of errs) console.error(`  - ${m}`);
    process.exit(1);
  }

  const byStep = {};
  for (const e of doc.frameworks) byStep[e.fours_step] = (byStep[e.fours_step] || 0) + 1;
  const stepStr = FOURS.map((s) => `${s}:${byStep[s] || 0}`).join(' ');
  console.log(`[OK] problem-solving-frameworks.yaml — ${doc.frameworks.length} candidates, all wiki_paths exist, registry complete (${stepStr}).`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { validateRegistry, BOOKS, FOURS, FOURS_CANONICAL, TYPES, SELECTABLE_TYPES, REGISTRY_REL, conceptsOnDisk };
