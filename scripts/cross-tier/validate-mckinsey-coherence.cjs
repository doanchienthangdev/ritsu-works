#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-mckinsey-coherence.cjs
 *
 * L2 coherence validator for capability `thinking-toolkit` v3.1 (the /think
 * mckinsey thinking-tool LIBRARY). It closes the gap the 2026-06-05 audit found:
 * the hand-maintained playbook (SKILL.md) + command + index README stated tool
 * counts ("460 consulting frameworks → 667 tools + 19 processes") that DRIFTED
 * from the actual registries (424 → 631 + 20). The pre-existing
 * validate-mckinsey-workflow.cjs only checks the yaml's referential integrity;
 * NOTHING checked that the human-readable counts matched the on-disk truth — so a
 * v3.0.1 update could (and did) bump the registries + index but leave the SKILL +
 * command stale, with CI green.
 *
 * This validator makes the counts a FALSIFIABLE invariant:
 *   1. Compute the TRUTH by parsing the three registries (array lengths):
 *        book        = problem-solving-frameworks.yaml .frameworks   (207)
 *        consulting  = consulting-frameworks.yaml      .frameworks   (424)
 *        processes   = consulting-processes.yaml       .processes    (20)
 *        total       = book + consulting                              (631)
 *   2. Cross-check each registry's own `count:` field == its array length.
 *   3. Scan the human docs (SKILL.md, command, index README) for LABELED count
 *      claims and assert every stated number equals the truth. Claims are
 *      OPTIONAL (a doc need not state a count) but any stated count must be right.
 *
 * It deliberately does NOT police the per-4S-step map sub-totals (frame/structure/
 * solve/sell/cross) — those legitimately differ from `total` because a tool can map
 * to >1 step or to none, which is the index generator's concern, not a drift bug.
 *
 * Registered in scripts/check-consistency.cjs (local `pnpm check`) AND as an
 * explicit job in .github/workflows/cross-tier-consistency.yml. BOTH required
 * (per the repo rule that CI runs validators as discrete jobs, not via
 * check-consistency.cjs).
 *
 * `validateCoherence(repoRoot)` is exported pure (returns {errors, truth}) so
 * tests exercise it without the CLI. Exit 0 = pass, 1 = drift.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// The three registries + the key holding their entry array.
const REGISTRIES = [
  { key: 'book',       rel: 'knowledge/problem-solving-frameworks.yaml', arr: 'frameworks' },
  { key: 'consulting', rel: 'knowledge/consulting-frameworks.yaml',      arr: 'frameworks' },
  { key: 'processes',  rel: 'knowledge/consulting-processes.yaml',       arr: 'processes' },
];

// The human-readable docs whose stated counts must match the truth.
const DOCS = [
  '06-ai-ops/skills/thinking-toolkit/mckinsey-workflow/SKILL.md',
  '.claude/commands/think.md',
  'knowledge/thinking-tool-index/README.md',
];

/**
 * Labeled count claims. Each entry: a global regex with one or two numeric
 * capture groups, and the truth key(s) those groups must equal. Claims are
 * matched against every DOC; ALL occurrences are checked. Phrasings here are the
 * CONTRACT — docs must state counts in one of these labeled forms (which also
 * keeps the wording consistent across surfaces).
 */
const CLAIMS = [
  { re: /(\d+)\s+book frameworks/gi,                                              keys: ['book'],              label: 'N book frameworks' },
  { re: /(\d+)\s+(?:consulting-toolkit|toolkit|consulting)\s+frameworks/gi,       keys: ['consulting'],        label: 'N consulting/toolkit frameworks' },
  { re: /(\d+)\s+(?:tools|frameworks)\s+\+\s+(\d+)\s+(?:inherited\s+)?(?:ex-McKinsey\s+)?(?:domain\s+)?process(?:es)?/gi, keys: ['total', 'processes'], label: 'N tools + M processes' },
  { re: /(\d+)-tool\s+(?:registry|library)/gi,                                    keys: ['total'],             label: 'N-tool registry/library' },
  { re: /unify all\s+(\d+)\s+tools/gi,                                            keys: ['total'],             label: 'unify all N tools' },
  { re: /=\s*\*{0,2}(\d+)\s+tools/gi,                                             keys: ['total'],             label: '= N tools' },
  { re: /(\d+)\s+inherited domain (?:PROCESSES|processes|process playbooks)/gi,   keys: ['processes'],         label: 'N inherited domain processes' },
  { re: /(\d+)\s+ex-McKinsey domain toolkits/gi,                                  keys: ['processes'],         label: 'N ex-McKinsey domain toolkits' },
  { re: /(\d+)\s+domain processes/gi,                                             keys: ['processes'],         label: 'N domain processes' },
  { re: /\((\d+)\s+playbooks\)/gi,                                                keys: ['processes'],         label: '(N playbooks)' },
  { re: /(\d+)\s+(?:inherited\s+)?(?:domain\s+)?process playbooks/gi,             keys: ['processes'],         label: 'N process playbooks' },
];

/**
 * Pure validation. Returns { errors: string[], truth: {book,consulting,processes,total} }.
 * @param {string} repoRoot base dir
 */
function validateCoherence(repoRoot) {
  const errors = [];
  const truth = {};

  // 1 + 2: parse registries, compute truth, cross-check `count` fields.
  for (const reg of REGISTRIES) {
    const abs = path.join(repoRoot, reg.rel);
    if (!fs.existsSync(abs)) { errors.push(`registry missing: ${reg.rel}`); continue; }
    let doc;
    try { doc = yaml.load(fs.readFileSync(abs, 'utf8')); }
    catch (e) { errors.push(`${reg.rel}: YAML parse error: ${e.message}`); continue; }
    const arr = doc && doc[reg.arr];
    if (!Array.isArray(arr)) { errors.push(`${reg.rel}: expected array under '${reg.arr}'`); continue; }
    truth[reg.key] = arr.length;
    if (typeof doc.count === 'number' && doc.count !== arr.length) {
      errors.push(`${reg.rel}: count field (${doc.count}) != actual entries (${arr.length})`);
    }
  }
  if (truth.book == null || truth.consulting == null || truth.processes == null) {
    // can't compute total / check docs without all three
    return { errors: errors.concat('cannot compute truth — a registry failed to load'), truth };
  }
  truth.total = truth.book + truth.consulting;

  // 3: scan docs for labeled count claims; every stated number must match truth.
  for (const rel of DOCS) {
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) { errors.push(`doc missing: ${rel}`); continue; }
    const text = fs.readFileSync(abs, 'utf8');
    for (const claim of CLAIMS) {
      claim.re.lastIndex = 0;
      let m;
      while ((m = claim.re.exec(text)) !== null) {
        claim.keys.forEach((key, i) => {
          const stated = parseInt(m[i + 1], 10);
          if (stated !== truth[key]) {
            errors.push(`${rel}: "${claim.label}" states ${stated} but ${key} = ${truth[key]} (matched: "${m[0].trim()}")`);
          }
        });
      }
    }
  }

  return { errors, truth };
}

function main() {
  const { errors, truth } = validateCoherence(REPO_ROOT);
  if (errors.length) {
    console.error(`[FAIL] mckinsey-coherence: ${errors.length} drift(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`[OK] mckinsey-coherence — book=${truth.book} + consulting=${truth.consulting} = ${truth.total} tools · ${truth.processes} processes · all stated doc counts match.`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { validateCoherence, REGISTRIES, DOCS, CLAIMS };
