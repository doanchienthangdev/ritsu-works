#!/usr/bin/env node
'use strict';
/**
 * scripts/skillopt/cost-estimator.cjs — session-message-count estimator for /evolve skillopt.
 *
 * Capability: evolve v1.1 Sprint 2.
 * Spec: wiki/capabilities/evolve/spec.md §19.6/§19.9 (after Phase 8 promotion;
 *       current draft .archives/cla/evolve-extend-skillopt/spec.md).
 *
 * Unit: SESSION MESSAGES (not USD). Counts how many Task() subagent dispatches
 * a /evolve skillopt run will consume. This complements the per-task-kind USD
 * caps in governance/ROLES.md (which are unit: messages for SkillOpt batches —
 * see ROLES.md eval-evo-orchestrator block).
 *
 * Why messages, not USD: SkillOpt runs through the session bridge so each
 * subagent dispatch is a session-subscription call (no API key). The economic
 * variable is session messages × subscription-pricing-per-month, not per-call
 * USD. See `external-source/anthropic-api` in knowledge/external-sources.md.
 *
 * Usage:
 *   node scripts/skillopt/cost-estimator.cjs --skill=<name> [--max-messages=N] [--iterations=N]
 *
 * Args:
 *   --skill=<name>       REQUIRED. Skill name to estimate for (path-resolves
 *                        to 06-ai-ops/skills/<name>/SKILL.md OR
 *                        06-ai-ops/skills/eval-evo/<name>/SKILL.md OR
 *                        .archives/test-fixtures/<name>/SKILL.md).
 *   --max-messages=N     Optional cap (default 500 per `eval-evo-skillopt-iteration-total`).
 *                        Estimator returns min(estimated, cap).
 *   --iterations=N       Override the heuristic-derived iteration count.
 *
 * Output (stdout):
 *   {
 *     "skill_name":       "...",
 *     "skill_path":       "...",
 *     "complexity":       "low" | "medium" | "high",
 *     "iterations":       <int>,
 *     "per_iter_breakdown": {
 *       "gen_data":        <int>,
 *       "rollout":         <int>,
 *       "judge":           <int>,
 *       "reflect":         <int>,
 *       "val_gate":        <int>,
 *       "meta":            <int>
 *     },
 *     "estimated_total":  <int>,
 *     "max_messages":     <int>,
 *     "result_messages":  <int>,           // = min(estimated_total, max_messages)
 *     "headroom":         <int> | null     // = max_messages - estimated_total (null if exceeded)
 *   }
 *
 * Exit codes:
 *   0 — estimate produced
 *   1 — error (skill not found, malformed args, etc.)
 *   2 — estimate exceeds --max-messages cap (founder should pick wider cap OR reduce iterations)
 */

const fs = require('fs');
const path = require('path');

// ── Per-iteration message budget (mirrors governance/ROLES.md §eval-evo-orchestrator) ──
// Sourced from spec §19.9; if those change, update HERE and in ROLES.md together.
const PER_ITER_BUDGET = {
  gen_data: 2,        // skillopt-gen-data: 1 founder gate + 1 LLM distillation hit
  rollout: 25,        // eval-evo-skillopt-rollout-batch
  judge: 25,          // one judge call per rollout
  reflect: 4,         // eval-evo-skillopt-reflect-batch
  val_gate: 25,       // eval-evo-skillopt-val-gate-batch (held-out)
  meta: 10,           // eval-evo-skillopt-meta
};

// Hard ceiling = eval-evo-skillopt-iteration-total cap (ROLES.md)
const DEFAULT_MAX_MESSAGES = 500;

// ── Complexity heuristic ─────────────────────────────────────────────────────

/**
 * Estimate complexity from SKILL.md content.
 *
 * "Complexity" predicts how many iterations the SkillOpt outer loop needs to
 * converge. Higher complexity → more iterations. Heuristic signals:
 *   - LOC: longer skills typically test more behaviors
 *   - `<example>` blocks: more examples → more rubric variety → more iters
 *   - Rubric/criterion mentions: signal of formal evaluation surface
 *   - References to Pillar 2/3/4 (run_summaries / wiki / gbrain) → richer
 *     synth data, more iter potential
 *
 * Output:
 *   - "low"    → 1-2 iterations
 *   - "medium" → 3 iterations (default)
 *   - "high"   → 5 iterations
 */
function classifyComplexity(skillContent) {
  const loc = skillContent.split('\n').length;
  const exampleBlocks = (skillContent.match(/<example>/gi) || []).length;
  const rubricRefs = (skillContent.match(/rubric|criterion|criteria/gi) || []).length;
  const pillarHints = (skillContent.match(/pillar|run_summaries|wiki_ask|gbrain/gi) || []).length;

  // Weighted score:
  //   loc: <100 → 0, 100-400 → 1, >400 → 2
  //   exampleBlocks: 0 → 0, 1-3 → 1, ≥4 → 2
  //   rubricRefs: <5 → 0, 5-15 → 1, >15 → 2
  //   pillarHints: 0 → 0, 1-5 → 1, ≥6 → 2
  let score = 0;
  score += loc < 100 ? 0 : loc <= 400 ? 1 : 2;
  score += exampleBlocks === 0 ? 0 : exampleBlocks <= 3 ? 1 : 2;
  score += rubricRefs < 5 ? 0 : rubricRefs <= 15 ? 1 : 2;
  score += pillarHints === 0 ? 0 : pillarHints <= 5 ? 1 : 2;

  // Score 0-2 → low; 3-5 → medium; 6-8 → high
  if (score <= 2) return 'low';
  if (score <= 5) return 'medium';
  return 'high';
}

function iterationsForComplexity(complexity) {
  return { low: 2, medium: 3, high: 5 }[complexity] || 3;
}

// ── Skill path resolution ────────────────────────────────────────────────────

function resolveSkillPath(repoRoot, skillName) {
  const candidates = [
    path.join(repoRoot, '06-ai-ops', 'skills', skillName, 'SKILL.md'),
    path.join(repoRoot, '06-ai-ops', 'skills', 'eval-evo', skillName, 'SKILL.md'),
    // Sprint 4 — test fixtures live in a committable path so CI can resolve
    // them. .archives/ retains its local-only convention; fixtures moved
    // here from the original spec'd `.archives/test-fixtures/` location.
    path.join(repoRoot, '06-ai-ops', 'skills', 'eval-evo', 'test-fixtures', skillName, 'SKILL.md'),
    path.join(repoRoot, '.archives', 'test-fixtures', skillName, 'SKILL.md'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// ── Argument parsing ────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { skill: null, maxMessages: DEFAULT_MAX_MESSAGES, iterations: null };
  for (const a of argv) {
    if (a.startsWith('--skill=')) args.skill = a.slice('--skill='.length);
    else if (a.startsWith('--max-messages=')) {
      const n = parseInt(a.slice('--max-messages='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        process.stderr.write(`error: --max-messages must be a positive integer (got ${a})\n`);
        process.exit(1);
      }
      args.maxMessages = n;
    } else if (a.startsWith('--iterations=')) {
      const n = parseInt(a.slice('--iterations='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        process.stderr.write(`error: --iterations must be a positive integer (got ${a})\n`);
        process.exit(1);
      }
      args.iterations = n;
    }
  }
  return args;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const args = parseArgs(process.argv.slice(2));

  if (!args.skill) {
    process.stderr.write('usage: cost-estimator.cjs --skill=<name> [--max-messages=N] [--iterations=N]\n');
    process.exit(1);
  }

  const skillPath = resolveSkillPath(repoRoot, args.skill);
  if (!skillPath) {
    process.stderr.write(`error: skill '${args.skill}' not found under 06-ai-ops/skills/ or .archives/test-fixtures/\n`);
    process.exit(1);
  }

  const skillContent = fs.readFileSync(skillPath, 'utf8');
  const complexity = classifyComplexity(skillContent);
  const iterations = args.iterations ?? iterationsForComplexity(complexity);

  const perIterTotal = Object.values(PER_ITER_BUDGET).reduce((a, b) => a + b, 0);
  const estimatedTotal = iterations * perIterTotal;

  const result = {
    skill_name: args.skill,
    skill_path: path.relative(repoRoot, skillPath),
    complexity,
    iterations,
    per_iter_breakdown: PER_ITER_BUDGET,
    per_iter_total: perIterTotal,
    estimated_total: estimatedTotal,
    max_messages: args.maxMessages,
    result_messages: Math.min(estimatedTotal, args.maxMessages),
    headroom: estimatedTotal <= args.maxMessages ? args.maxMessages - estimatedTotal : null,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(estimatedTotal > args.maxMessages ? 2 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { classifyComplexity, iterationsForComplexity, PER_ITER_BUDGET, DEFAULT_MAX_MESSAGES };
