#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * L2 invariant: roles-per-task-kind-caps-unit-expected
 *
 * Validates that every `per_task_kind_caps:` entry in `governance/ROLES.md`
 * uses the unit expected by the spec for its task_kind. Catches the silent
 * USD-leak vector @cto flagged on sub-PR B review of capability evolve v1.1:
 * if an operator typos `eval-evo-iteration: {unit: messages, cap: 25}` (intending
 * USD), the pre-llm-call-budget hook dispatches to the messages-count branch
 * and the per-instance USD escalation is silently skipped.
 *
 * Capability: evolve v1.1 (SkillOpt integration) Sprint 1 sub-PR C.
 * Spec: wiki/capabilities/evolve/spec.md §19.9 (after Phase 8 promotion;
 *       current draft .archives/cla/evolve-extend-skillopt/spec.md).
 * Hook: .claude/hooks/pre-llm-call-budget.md v0.2.0 — see §"Per-task-kind cap
 *       schema (v0.2.0 — tagged units)" for the dispatch table.
 *
 * Behavior:
 *   - Scans governance/ROLES.md for every `per_task_kind_caps:` block.
 *   - For each entry, classifies as:
 *       BARE_NUMBER     — legacy v1.0 form `<task_kind>: <number>` (auto-treated as usd)
 *       TAGGED          — `<task_kind>: {unit: usd|messages, cap: <number>}`
 *       MALFORMED       — anything else (missing cap, unknown shape)
 *   - For TAGGED entries whose task_kind matches a known expectation,
 *     fails closed on unit mismatch.
 *   - Reports MALFORMED as critical (these would silently no-op the hook).
 *   - BARE_NUMBER is allowed (backward-compat); not reported here.
 *
 * Exit codes:
 *   0 — clean (all expectations satisfied)
 *   1 — drift (one or more entries violate expectations OR are MALFORMED)
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ROLES_PATH = path.join(REPO_ROOT, 'governance', 'ROLES.md');

// Expectations table — task_kind regex → expected unit.
// MUST trace to spec §19.9 or equivalent canonical source.
// When adding new task_kind families:
//   1. Update spec.
//   2. Add a row here with a comment referencing the spec section.
//   3. Update governance/ROLES.md.
const EXPECTATIONS = [
  // capability evolve v1.1 — SkillOpt session-message-count caps (spec §19.9)
  { match: /^eval-evo-skillopt-.*-batch$/, unit: 'messages',
    source: 'evolve v1.1 spec §19.9 — SkillOpt rollout/reflect/val-gate batches are message-count capped' },
  { match: /^eval-evo-skillopt-meta$/, unit: 'messages',
    source: 'evolve v1.1 spec §19.9 — SkillOpt meta-skill updates' },
  { match: /^eval-evo-skillopt-iteration-total$/, unit: 'messages',
    source: 'evolve v1.1 spec §19.9 — SkillOpt iteration hard ceiling' },
  // capability evolve v1.0 — USD caps (spec §19.9 v1.0 baseline)
  { match: /^eval-evo-(iteration|evaluation|outside-voice)$/, unit: 'usd',
    source: 'evolve v1.0 — eval-evo orchestrator per-task USD soft caps' },
  // capability docs-engine — USD caps
  { match: /^docs-(scaffold|sync-full-walk|nav-edit)$/, unit: 'usd',
    source: 'docs-engine spec — per-task USD soft caps' },
  { match: /^phase-7-implementation-pr$/, unit: 'usd',
    source: 'docs-engine spec — implementation PR cost projection' },
  // capability update — USD caps (Sprint 1 + v1.1 distill caps)
  { match: /^entity-update-distill-(skill|command|agent|sop|hook|pillar|file|workflow|tier1-file)$/, unit: 'usd',
    source: 'update capability spec — distill phase per-entity USD caps' },
  { match: /^entity-update-(score|propose|test-gen)-any$/, unit: 'usd',
    source: 'update capability spec — score/propose/test-gen entity-agnostic USD caps' },
  { match: /^entity-update-path-classify$/, unit: 'usd',
    source: 'update capability spec — deterministic path classify ($0)' },
  { match: /^entity-update-iteration$/, unit: 'usd',
    source: 'update capability spec — hard total cap per /update run' },
  // gbrain dream cycle — USD caps
  { match: /^dream-cycle-(dedup|citation-fix|contradiction-detection|synthesis)$/, unit: 'usd',
    source: 'gbrain capability spec — nightly dream cycle USD caps' },
  // gps orchestration — USD caps
  { match: /^(parent-orchestration|cost-report-query)$/, unit: 'usd',
    source: 'gps role default USD caps' },
  // capability book-to-capability (/forge) — gps-bound USD caps (spec §5)
  { match: /^forge-(orchestration|funnel-gate|route-classify)$/, unit: 'usd',
    source: 'book-to-capability spec §5 — /forge gps per-task USD soft caps' },
  // capability design-system-styling — gps-bound USD caps (cost-bucket ai-ops-design-system)
  { match: /^design-system-(build|resolve|add)$/, unit: 'usd',
    source: 'design-system-styling spec — /design-system gps per-task USD soft caps' },
  // capability deepask v1.1 — gps-bound image-gen USD cap (spec §13.5/§13.6; cost-bucket ai-ops-deepask)
  { match: /^deepask-image-gen$/, unit: 'usd',
    source: 'deepask v1.1 spec §13.5 — gpt-image-2 generation gps USD soft cap (beyond per-run --max-cost-usd)' },
  // capability image-platform v0.1 — gps-bound /image USD caps (spec §5; cost-bucket ai-ops-image)
  { match: /^image-(gen|enhance)$/, unit: 'usd',
    source: 'image-platform spec §5 — /image gpt-image-2 gen (advisory, MF1) + --enhance gps per-task USD soft caps' },
];

function lookupExpectation(taskKind) {
  for (const exp of EXPECTATIONS) {
    if (exp.match.test(taskKind)) return exp;
  }
  return null;
}

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
}

// ── Parse ROLES.md `per_task_kind_caps:` blocks ──────────────────────────────

if (!fs.existsSync(ROLES_PATH)) {
  console.error(`[FAIL] ${ROLES_PATH} not found`);
  process.exit(1);
}
const lines = fs.readFileSync(ROLES_PATH, 'utf8').split('\n');

const findings = []; // { line, taskKind, classification, expected, actual }

let i = 0;
while (i < lines.length) {
  const ln = lines[i];
  const m = ln.match(/^(\s*)per_task_kind_caps:\s*$/);
  if (!m) { i += 1; continue; }
  const blockIndent = m[1].length;
  const entryIndent = blockIndent + 2;
  i += 1;
  // Consume indented entries
  while (i < lines.length) {
    const entryLine = lines[i];
    if (entryLine.trim() === '') { i += 1; continue; }
    // Comments (`#` at any column within or beyond the block) — skip
    const leadingWs = entryLine.match(/^(\s*)/)[1].length;
    if (leadingWs < entryIndent) break;       // dedented → block ended
    if (entryLine.trimStart().startsWith('#')) { i += 1; continue; }
    // Entry: `<task_kind>: <value>` where <value> is either a bare number or a flow-mapping
    const entryMatch = entryLine.match(/^(\s*)([A-Za-z][A-Za-z0-9_-]*):\s*(.*?)\s*(#.*)?$/);
    if (!entryMatch) { i += 1; continue; }
    const taskKind = entryMatch[2];
    const valueRaw = entryMatch[3];
    const lineNo = i + 1;

    if (/^[0-9]+(\.[0-9]+)?$/.test(valueRaw)) {
      // BARE_NUMBER — backward-compat legacy; allowed but informational.
      // Expectation check is skipped because the legacy form is unit-less (auto-treated as usd).
      i += 1; continue;
    }
    // TAGGED form: parse {unit: <id>, cap: <number>}
    const taggedMatch = valueRaw.match(/^\{\s*unit:\s*([A-Za-z_][A-Za-z0-9_-]*)\s*,\s*cap:\s*([0-9]+(?:\.[0-9]+)?)\s*\}\s*$/);
    if (taggedMatch) {
      const unit = taggedMatch[1];
      // Verify unit is one this hook understands
      if (unit !== 'usd' && unit !== 'messages') {
        findings.push({
          line: lineNo, taskKind,
          msg: `unit '${unit}' is not 'usd' or 'messages'. The pre-llm-call-budget hook will fail-open (ritsu.budget.unknown_unit). Either fix the typo or extend the hook in a deliberate Tier C update.`
        });
        i += 1; continue;
      }
      const expected = lookupExpectation(taskKind);
      if (expected && expected.unit !== unit) {
        findings.push({
          line: lineNo, taskKind,
          msg: `unit mismatch: declared '${unit}' but expected '${expected.unit}' (${expected.source}). This is the silent-leak vector @cto flagged on PR #129 — a USD task tagged as messages would skip the per-instance USD escalation.`
        });
      }
      i += 1; continue;
    }
    // MALFORMED
    findings.push({
      line: lineNo, taskKind,
      msg: `unrecognized value shape '${valueRaw}'. Expected bare number (legacy) or flow-mapping {unit: usd|messages, cap: <number>}. The hook will fail-open with ritsu.budget.malformed_cap_entry.`
    });
    i += 1;
  }
}

if (findings.length === 0) {
  console.log('[OK] all per_task_kind_caps entries have spec-matching units');
  process.exit(0);
}

for (const f of findings) {
  fail(`ROLES.md:${f.line} task_kind '${f.taskKind}': ${f.msg}`);
}
process.exit(1);
