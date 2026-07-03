#!/usr/bin/env node
// validate-eval-evo-schemas.cjs
//
// L1 validator: enforces eval-evo's three JSON schemas + structural invariants.
// Wired into pnpm check via scripts/check-consistency.cjs (L1 layer).
//
// Schemas validated:
//   1. 06-ai-ops/skills/eval-evo/_SCHEMA.yaml — ops.agent_runs.input_payload shape
//      (informational, not enforced at insert; documented contract).
//      NOTE: schema renamed 2026-05-27 — ops.agent_runs has input_payload, NOT
//      state_payload (state_payload exists only on ops.tasks per migration 00002).
//   2. 06-ai-ops/skills/eval-evo/playbooks/_SCHEMA.yaml — playbook frontmatter shape
//      → ALL 5 playbooks must conform
//   3. 06-ai-ops/skills/eval-evo/cases/_SCHEMA.yaml — golden case file shape
//      → ALL cases/<type>/<name>/case-*.yaml must conform
//
// Exit codes:
//   0 — all clean
//   1 — at least one violation

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '../..');
const EVAL_EVO_DIR = path.join(REPO_ROOT, '06-ai-ops/skills/eval-evo');

const ENTITY_TYPES = ['skill', 'command', 'agent', 'hook', 'sop'];
// Extended playbooks: not entity types per se, but additional rubric playbooks
// that apply to a specific entity type with a different measurement axis.
// Validated for schema conformance like ENTITY_TYPES playbooks but their
// `cases/<type>/` directory is OPTIONAL (walkCases returns when missing).
// v1.2 (2026-05-27 — capability `evolve` v1.1 Sprint 2): skill-skillopt added
// for SkillOpt held-out task-completion rubric on skill-type entities.
const EXTENDED_PLAYBOOK_TYPES = ['skill-skillopt'];

const violations = [];

function fail(msg) {
  violations.push(msg);
}

// ---------------------------------------------------------------------------
// Load schemas (skip strict draft-07 validation lib for v1.0 — do structural)
// ---------------------------------------------------------------------------
function loadYaml(p) {
  if (!fs.existsSync(p)) {
    fail(`schema missing: ${path.relative(REPO_ROOT, p)}`);
    return null;
  }
  try {
    return yaml.load(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    fail(`schema parse error: ${path.relative(REPO_ROOT, p)} — ${e.message}`);
    return null;
  }
}

const stateSchemaPath = path.join(EVAL_EVO_DIR, '_SCHEMA.yaml');
const playbookSchemaPath = path.join(EVAL_EVO_DIR, 'playbooks/_SCHEMA.yaml');
const caseSchemaPath = path.join(EVAL_EVO_DIR, 'cases/_SCHEMA.yaml');

loadYaml(stateSchemaPath);  // existence check only for input_payload schema
loadYaml(playbookSchemaPath);
loadYaml(caseSchemaPath);

// ---------------------------------------------------------------------------
// Validate playbooks
// ---------------------------------------------------------------------------
function parseFrontmatter(mdPath) {
  if (!fs.existsSync(mdPath)) return null;
  const content = fs.readFileSync(mdPath, 'utf8');
  // Tolerate CRLF (Windows checkouts): `---\r\n` must still match the fence.
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try {
    return yaml.load(m[1]);
  } catch (e) {
    fail(`playbook frontmatter parse error: ${path.relative(REPO_ROOT, mdPath)} — ${e.message}`);
    return null;
  }
}

for (const type of [...ENTITY_TYPES, ...EXTENDED_PLAYBOOK_TYPES]) {
  const pbPath = path.join(EVAL_EVO_DIR, `playbooks/${type}.md`);
  const fm = parseFrontmatter(pbPath);
  if (!fm) {
    fail(`playbook missing or empty frontmatter: ${path.relative(REPO_ROOT, pbPath)}`);
    continue;
  }

  // Required fields
  for (const field of ['playbook_for', 'judge_persona', 'proposer_persona', 'sub_score_count', 'sub_scores', 'allowed_paths_for_proposer']) {
    if (!(field in fm)) fail(`${type} playbook missing field: ${field}`);
  }

  // playbook_for matches filename
  if (fm.playbook_for !== type) {
    fail(`${type} playbook: playbook_for=${fm.playbook_for} mismatches filename`);
  }

  // judge_persona is valid
  const validJudges = ['@cto', '@ceo', '@cgo', '@cpo'];
  if (!validJudges.includes(fm.judge_persona)) {
    fail(`${type} playbook: judge_persona=${fm.judge_persona} not in ${validJudges.join(',')}`);
  }

  // sub_score_count == 10
  if (fm.sub_score_count !== 10) {
    fail(`${type} playbook: sub_score_count=${fm.sub_score_count}, must be exactly 10`);
  }

  // Exactly 10 sub_scores with required fields
  if (Array.isArray(fm.sub_scores)) {
    if (fm.sub_scores.length !== 10) {
      fail(`${type} playbook: sub_scores length=${fm.sub_scores.length}, must be exactly 10`);
    }
    fm.sub_scores.forEach((ss, i) => {
      for (const field of ['id', 'name', 'what_10_looks_like', 'what_0_looks_like']) {
        if (!(field in ss)) fail(`${type} playbook sub_scores[${i}] missing field: ${field}`);
      }
      const expectedId = `C${i + 1}`;
      if (ss.id !== expectedId) {
        fail(`${type} playbook sub_scores[${i}].id=${ss.id}, expected ${expectedId}`);
      }
    });
  } else {
    fail(`${type} playbook: sub_scores is not an array`);
  }

  // allowed_paths must be non-empty array
  if (!Array.isArray(fm.allowed_paths_for_proposer) || fm.allowed_paths_for_proposer.length === 0) {
    fail(`${type} playbook: allowed_paths_for_proposer must be a non-empty array`);
  }
}

// ---------------------------------------------------------------------------
// Validate cases (each case file conforms; cases/<type>/<name>/case-*.yaml)
// ---------------------------------------------------------------------------
function walkCases(typeDir, type) {
  if (!fs.existsSync(typeDir)) return;
  const stat = fs.statSync(typeDir);
  if (!stat.isDirectory()) return;
  const entries = fs.readdirSync(typeDir);
  for (const e of entries) {
    if (e.startsWith('_') || e === '.gitkeep') continue;  // skip _HOLDOUT.yaml and similar
    const entityDir = path.join(typeDir, e);
    if (!fs.statSync(entityDir).isDirectory()) continue;
    const caseFiles = fs.readdirSync(entityDir).filter(f => f.startsWith('case-') && f.endsWith('.yaml'));
    for (const caseFile of caseFiles) {
      const casePath = path.join(entityDir, caseFile);
      let parsed;
      try {
        parsed = yaml.load(fs.readFileSync(casePath, 'utf8'));
      } catch (err) {
        fail(`case file parse error: ${path.relative(REPO_ROOT, casePath)} — ${err.message}`);
        continue;
      }
      if (!parsed || typeof parsed !== 'object') {
        fail(`case file not an object: ${path.relative(REPO_ROOT, casePath)}`);
        continue;
      }
      for (const field of ['case_id', 'entity_type', 'entity_name', 'input', 'expected_traits']) {
        if (!(field in parsed)) fail(`case ${path.relative(REPO_ROOT, casePath)} missing field: ${field}`);
      }
      if (parsed.entity_type && parsed.entity_type !== type) {
        fail(`case ${path.relative(REPO_ROOT, casePath)}: entity_type=${parsed.entity_type} mismatches dir type=${type}`);
      }
      if (parsed.expected_traits && (!Array.isArray(parsed.expected_traits) || parsed.expected_traits.length === 0)) {
        fail(`case ${path.relative(REPO_ROOT, casePath)}: expected_traits must be non-empty array`);
      }
    }
  }
}

for (const type of ENTITY_TYPES) {
  walkCases(path.join(EVAL_EVO_DIR, `cases/${type}`), type);
}

// ---------------------------------------------------------------------------
// _HOLDOUT.yaml shape (if present)
// ---------------------------------------------------------------------------
const holdoutPath = path.join(EVAL_EVO_DIR, 'cases/_HOLDOUT.yaml');
if (fs.existsSync(holdoutPath)) {
  let ho;
  try {
    ho = yaml.load(fs.readFileSync(holdoutPath, 'utf8'));
  } catch (e) {
    fail(`_HOLDOUT.yaml parse error: ${e.message}`);
  }
  if (ho && typeof ho === 'object' && ho.ratings) {
    if (!Array.isArray(ho.ratings)) {
      fail('_HOLDOUT.yaml: ratings must be an array');
    } else {
      // Sprint 1 ship: ratings may be all PENDING-FOUNDER placeholders
      // We just check shape, not content
      ho.ratings.forEach((r, i) => {
        for (const field of ['entity_type', 'entity_name', 'founder_rating']) {
          if (!(field in r)) fail(`_HOLDOUT.yaml ratings[${i}] missing field: ${field}`);
        }
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Exit
// ---------------------------------------------------------------------------
if (violations.length > 0) {
  console.error('  ✗ validate-eval-evo-schemas.cjs                    ' + violations.length + ' violation(s):');
  for (const v of violations) {
    console.error('      - ' + v);
  }
  process.exit(1);
} else {
  console.log('  ✓ validate-eval-evo-schemas.cjs                    clean');
  process.exit(0);
}
