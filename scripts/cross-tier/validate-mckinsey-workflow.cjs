#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-mckinsey-workflow.cjs
 *
 * L2 validator for capability `thinking-toolkit` v1.3 (the McKinsey 4S workflow
 * catalog — knowledge/mckinsey-workflow.yaml). Beyond the L1 JSON-schema shape
 * check (validate-tier1.cjs), this enforces the CROSS-TIER invariants a schema
 * can't express:
 *   - steps non-empty; step ids unique; orders unique + contiguous 1..N
 *   - the 4 canonical 4S step ids are present: state, structure, solve, sell
 *   - EVERY referenced skill exists on disk: 06-ai-ops/skills/<skill>/SKILL.md
 *   - EVERY referenced concept exists on disk: wiki/<book>/concepts/<slug>.md
 *
 * The file-existence checks are the whole point: the catalog must never drift
 * into citing a skill or concept that isn't there (that would silently break
 * the /think mckinsey workflow + the per-step retrieval recipe).
 *
 * Registered in scripts/check-consistency.cjs (local `pnpm check`) AND as an
 * explicit job in .github/workflows/cross-tier-consistency.yml (GitHub CI runs
 * hand-listed validator jobs, NOT check-consistency.cjs — the GitHub-CI ≠
 * check-consistency gotcha). BOTH are required.
 *
 * `validateWorkflow(doc, repoRoot)` is exported pure (returns string[] of
 * errors) so tests can exercise edge + broken cases without a CLI.
 * Exit 0 = pass, 1 = drift.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY_REL = 'knowledge/mckinsey-workflow.yaml';
const CANONICAL_4S = ['state', 'structure', 'solve', 'sell'];
const ID_RE = /^[a-z][a-z0-9-]*$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Pure validation. Returns an array of error strings (empty = valid).
 * @param {*} doc       parsed YAML (any shape — defends against garbage)
 * @param {string} repoRoot base dir for skill/concept file-existence checks
 */
function validateWorkflow(doc, repoRoot) {
  const errs = [];

  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    return ['root must be a mapping'];
  }
  if (typeof doc.version !== 'string' || !doc.version.trim()) {
    errs.push('version must be a non-empty string');
  }

  const steps = doc.steps;
  if (!Array.isArray(steps)) return errs.concat('steps must be an array');
  if (steps.length === 0) return errs.concat('steps is empty (no 4S steps defined)');

  const ids = new Set();
  const orders = [];

  steps.forEach((s, i) => {
    const where = s && typeof s.id === 'string' ? `step '${s.id}'` : `step[${i}]`;
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      errs.push(`${where}: must be a mapping`);
      return;
    }

    // id
    if (typeof s.id !== 'string' || !ID_RE.test(s.id)) {
      errs.push(`${where}: id must be kebab-case (^[a-z][a-z0-9-]*$)`);
    } else {
      if (ids.has(s.id)) errs.push(`duplicate step id: ${s.id}`);
      ids.add(s.id);
    }

    // order
    if (!Number.isInteger(s.order) || s.order < 1) {
      errs.push(`${where}: order must be an integer >= 1`);
    } else {
      orders.push(s.order);
    }

    // name / intent
    if (typeof s.name !== 'string' || !s.name.trim()) errs.push(`${where}: name must be a non-empty string`);
    if (typeof s.intent !== 'string' || !s.intent.trim()) errs.push(`${where}: intent must be a non-empty string`);

    // skills — must exist on disk
    if (!Array.isArray(s.skills) || s.skills.length === 0) {
      errs.push(`${where}: skills must be a non-empty array`);
    } else {
      for (const sk of s.skills) {
        if (typeof sk !== 'string' || !sk.trim()) {
          errs.push(`${where}: skill entry must be a non-empty string`);
          continue;
        }
        const p = path.join(repoRoot, '06-ai-ops', 'skills', sk, 'SKILL.md');
        if (!fs.existsSync(p)) {
          errs.push(`${where}: skill not found on disk: ${sk} (expected 06-ai-ops/skills/${sk}/SKILL.md)`);
        }
      }
    }

    // key_concepts — must exist on disk
    if (!Array.isArray(s.key_concepts) || s.key_concepts.length === 0) {
      errs.push(`${where}: key_concepts must be a non-empty array`);
    } else {
      for (const kc of s.key_concepts) {
        if (!kc || typeof kc !== 'object' || Array.isArray(kc) ||
            typeof kc.book !== 'string' || !kc.book.trim() ||
            typeof kc.slug !== 'string' || !kc.slug.trim()) {
          errs.push(`${where}: key_concept must be a {book, slug} mapping of non-empty strings`);
          continue;
        }
        if (!SLUG_RE.test(kc.slug)) errs.push(`${where}: concept slug not kebab-case: ${kc.slug}`);
        const p = path.join(repoRoot, 'wiki', kc.book, 'concepts', `${kc.slug}.md`);
        if (!fs.existsSync(p)) {
          errs.push(`${where}: concept not found on disk: ${kc.book}/${kc.slug} (expected wiki/${kc.book}/concepts/${kc.slug}.md)`);
        }
      }
    }

    // retrieval
    const r = s.retrieval;
    if (!r || typeof r !== 'object' || Array.isArray(r)) {
      errs.push(`${where}: retrieval must be a mapping`);
    } else {
      if (typeof r.query !== 'string' || !r.query.trim()) errs.push(`${where}: retrieval.query must be a non-empty string`);
      if (!Array.isArray(r.sources) || r.sources.length === 0) errs.push(`${where}: retrieval.sources must be a non-empty array`);
    }
  });

  // orders unique + contiguous 1..N
  if (orders.length) {
    const sorted = [...orders].sort((a, b) => a - b);
    if (sorted.some((v, i) => i > 0 && v === sorted[i - 1])) errs.push('step orders must be unique');
    if (!sorted.every((v, i) => v === i + 1)) {
      errs.push(`step orders must be contiguous 1..${orders.length} (got ${sorted.join(',')})`);
    }
  }

  // canonical 4S coverage
  for (const c of CANONICAL_4S) {
    if (!ids.has(c)) errs.push(`missing canonical 4S step: '${c}'`);
  }

  return errs;
}

function main() {
  const REGISTRY = path.join(REPO_ROOT, REGISTRY_REL);
  if (!fs.existsSync(REGISTRY)) {
    console.error(`[FAIL] ${REGISTRY_REL} missing. (capability thinking-toolkit v1.3)`);
    process.exit(1);
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(REGISTRY, 'utf-8'));
  } catch (e) {
    console.error(`[FAIL] ${REGISTRY_REL} YAML parse error: ${e.message}`);
    process.exit(1);
  }

  const errs = validateWorkflow(doc, REPO_ROOT);
  if (errs.length) {
    console.error(`[FAIL] mckinsey-workflow.yaml: ${errs.length} error(s):`);
    for (const m of errs) console.error(`  - ${m}`);
    process.exit(1);
  }

  const nSkills = doc.steps.reduce((a, s) => a + (Array.isArray(s.skills) ? s.skills.length : 0), 0);
  const nConcepts = doc.steps.reduce((a, s) => a + (Array.isArray(s.key_concepts) ? s.key_concepts.length : 0), 0);
  console.log(`[OK] mckinsey-workflow.yaml — ${doc.steps.length} 4S steps, ${nSkills} skill refs + ${nConcepts} concept refs all exist on disk.`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { validateWorkflow, CANONICAL_4S, REGISTRY_REL };
