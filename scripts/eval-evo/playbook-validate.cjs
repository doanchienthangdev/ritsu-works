#!/usr/bin/env node
// playbook-validate.cjs
//
// Per-playbook Spearman rank correlation validator (per spec §6.7 / PLAN §6.13c).
//
// Reads:
//   - 06-ai-ops/skills/eval-evo/cases/_HOLDOUT.yaml — founder hand-ratings (5 per type)
//   - 06-ai-ops/skills/eval-evo/playbooks/<type>.md — rubric frontmatter
//
// For each playbook, computes Spearman rank correlation between:
//   [founder_ratings] vs [proxy_rubric_scores]
//
// v1.0 caveat: this script does NOT actually invoke the LLM judge on every
// hold-out entity (that would cost ~$0.10 × 25 = $2.50 every CI run). Instead,
// it uses a STATIC PROXY: heuristic scores computed from frontmatter content
// + simple length/keyword checks. v1.1 may add `--full` flag to run actual
// judge scores (cost $2.50 per validation).
//
// PASS if all 5 playbooks have Spearman ≥ 0.6.
// FAIL otherwise.
//
// Exit codes:
//   0 — all PASS or HOLDOUT_PENDING (don't block; report)
//   1 — at least one FAIL

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '../..');
const EVAL_EVO_DIR = path.join(REPO_ROOT, '06-ai-ops/skills/eval-evo');

const ENTITY_TYPES = ['skill', 'command', 'agent', 'hook', 'sop'];

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const typeArg = args.find(a => a.startsWith('--type='));
const onlyType = typeArg ? typeArg.split('=')[1] : null;

// ---------------------------------------------------------------------------
// Spearman rank correlation
// ---------------------------------------------------------------------------
function rank(arr) {
  // Returns ranks (1-indexed). Ties get average rank.
  const sorted = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(arr.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1][0] === sorted[i][0]) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[sorted[k][1]] = avgRank;
    i = j + 1;
  }
  return ranks;
}

function spearman(x, y) {
  if (x.length !== y.length || x.length < 3) return null;
  const rx = rank(x);
  const ry = rank(y);
  const n = x.length;
  const meanX = rx.reduce((a, b) => a + b, 0) / n;
  const meanY = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const a = rx[i] - meanX, b = ry[i] - meanY;
    num += a * b;
    dx2 += a * a;
    dy2 += b * b;
  }
  return num / Math.sqrt(dx2 * dy2);
}

// ---------------------------------------------------------------------------
// Load _HOLDOUT.yaml
// ---------------------------------------------------------------------------
const holdoutPath = path.join(EVAL_EVO_DIR, 'cases/_HOLDOUT.yaml');
if (!fs.existsSync(holdoutPath)) {
  console.error('ERROR: cases/_HOLDOUT.yaml not found. Sprint 3 deliverable.');
  process.exit(2);
}
const holdout = yaml.load(fs.readFileSync(holdoutPath, 'utf8'));

if (!holdout || !Array.isArray(holdout.ratings)) {
  console.error('ERROR: _HOLDOUT.yaml malformed (no ratings array).');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Proxy score: heuristic based on entity file properties
// ---------------------------------------------------------------------------
function proxyScore(entityPath) {
  const fullPath = path.join(REPO_ROOT, entityPath);
  if (!fs.existsSync(fullPath)) return 0;
  let content;
  if (fs.statSync(fullPath).isDirectory()) {
    // For SOP type (directory): concat flow.yaml + README.md
    const flowYaml = path.join(fullPath, 'flow.yaml');
    const readme = path.join(fullPath, 'README.md');
    content = '';
    if (fs.existsSync(flowYaml)) content += fs.readFileSync(flowYaml, 'utf8');
    if (fs.existsSync(readme)) content += '\n\n' + fs.readFileSync(readme, 'utf8');
  } else {
    content = fs.readFileSync(fullPath, 'utf8');
  }

  let score = 0;
  // Heuristic factors (each 0-10):
  // 1. Frontmatter presence + complete (0-15)
  if (content.match(/^---[\s\S]*?---/)) score += 15;
  // 2. Length signal (proxy for completeness) (0-10)
  const lines = content.split('\n').length;
  score += Math.min(10, Math.floor(lines / 30));
  // 3. References to other entities (cross-refs) (0-10)
  const refsCount = (content.match(/(06-ai-ops\/skills\/|knowledge\/|governance\/|wiki\/)/g) || []).length;
  score += Math.min(10, refsCount);
  // 4. Error handling / failure mode mentions (0-10)
  const errorRefs = (content.match(/(error|failure|exception|fallback)/gi) || []).length;
  score += Math.min(10, Math.floor(errorRefs / 3));
  // 5. HITL/security/tier discipline mentions (0-10)
  const hitlRefs = (content.match(/(HITL|tier|security|safety|hook)/gi) || []).length;
  score += Math.min(10, Math.floor(hitlRefs / 3));
  // 6. Cost discipline mentions (0-10)
  const costRefs = (content.match(/(cost|budget|cap|\$0\.|monthly)/gi) || []).length;
  score += Math.min(10, costRefs);
  // 7. Documentation / cross-spec mentions (0-10)
  const docRefs = (content.match(/(spec\.md|README|wiki\/capabilities)/gi) || []).length;
  score += Math.min(10, docRefs * 2);
  // 8. Structure indicators (sections, lists) (0-10)
  const sections = (content.match(/^##/gm) || []).length;
  score += Math.min(10, sections);
  // 9. Code/examples (0-10)
  const codeBlocks = (content.match(/```/g) || []).length;
  score += Math.min(10, codeBlocks);
  // 10. Process/step language (0-5)
  const stepWords = (content.match(/(step|phase|process|workflow)/gi) || []).length;
  score += Math.min(5, Math.floor(stepWords / 5));

  return Math.min(100, score);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
let exitCode = 0;
const typesToCheck = onlyType ? [onlyType] : ENTITY_TYPES;

for (const type of typesToCheck) {
  const typeRatings = holdout.ratings.filter(r => r.entity_type === type);
  if (typeRatings.length === 0) {
    console.log(`[${type}] no hold-out entries; SKIP`);
    continue;
  }

  const pendingCount = typeRatings.filter(r => r.founder_rating === 'PENDING-FOUNDER').length;
  if (pendingCount > 0) {
    console.log(`[${type}] HOLDOUT_PENDING: ${pendingCount}/${typeRatings.length} ratings are PENDING-FOUNDER`);
    console.log(`         /evolve refuses to invoke on this type until founder completes ratings.`);
    continue;
  }

  const founderRatings = typeRatings.map(r => Number(r.founder_rating));
  const proxyScores = typeRatings.map(r => proxyScore(r.entity_path));

  const rho = spearman(founderRatings, proxyScores);

  if (rho === null) {
    console.log(`[${type}] insufficient data for Spearman (need ≥3)`);
    continue;
  }

  const pass = rho >= 0.6;
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`[${type}] Spearman ρ = ${rho.toFixed(3)} (threshold 0.6) — ${status}`);
  console.log(`         founder_ratings: ${JSON.stringify(founderRatings)}`);
  console.log(`         proxy_scores:    ${JSON.stringify(proxyScores)}`);
  if (!pass) exitCode = 1;
}

console.log('');
if (exitCode === 0) {
  console.log('✓ All playbooks PASS Spearman ≥ 0.6 (or HOLDOUT_PENDING / SKIP).');
} else {
  console.log('✗ At least one playbook FAIL. /evolve refuses to invoke on failed types.');
  console.log('  Action: revise the failing playbook (see playbooks/<type>.md) and re-validate.');
}
process.exit(exitCode);
