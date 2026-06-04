#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-mckinsey-workflow.cjs
 *
 * L2 validator for capability `thinking-toolkit` v1.4 (the McKinsey 4S workflow
 * ENGINE catalog — knowledge/mckinsey-workflow.yaml). Beyond the L1 JSON-schema
 * shape check (validate-tier1.cjs), this enforces the CROSS-TIER invariants:
 *   STEPS:  non-empty; ids unique; orders unique + contiguous 1..N; the 4
 *           canonical 4S ids present (state/structure/solve/sell); every
 *           referenced skill exists (06-ai-ops/skills/<skill>/SKILL.md); every
 *           key_concept exists (wiki/<book>/concepts/<slug>.md); each step's
 *           `produces` is from the known ARTIFACT set.
 *   ENGINE (v1.4-v1.7): `artifacts` (run_folder + files, each name∈ARTIFACTS,
 *           stage∈stepIds), `data_routing` (each tool∈TOOLS), and the
 *           non-empty sections tool_selection / validation_gate / routing_rules /
 *           hitl_triggers / back_edges (from+to∈stepIds) / stopping_criterion /
 *           composition_guards (v1.7). EVERY `concept` {book,slug} ref across ALL
 *           sections must exist on disk.
 *
 * The file-existence checks are the whole point: the catalog must never drift
 * into citing a skill/concept/tool/artifact that isn't real — that would
 * silently break the /think mckinsey engine.
 *
 * Registered in scripts/check-consistency.cjs (local `pnpm check`) AND as an
 * explicit job in .github/workflows/cross-tier-consistency.yml. BOTH required.
 *
 * `validateWorkflow(doc, repoRoot)` is exported pure (returns string[] of
 * errors) so tests exercise edge + broken cases without a CLI.
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

// v1.4/v1.5 known sets — the catalog may only reference these.
// v1.5: +'communication' (the step-7 story artifact, distinct from step-6 'synthesis').
// v1.8: +'hitl-log' (the HITL receipt ledger; MUST stay set-equal to mckinsey-run.cjs
//   ARTIFACTS — the catalog↔run-helper coherence check below enforces it).
const ARTIFACTS = ['problem-statement', 'decomposition', 'workplan', 'analysis-log', 'hitl-log', 'one-day-answer', 'synthesis', 'communication'];
const TOOLS = ['deepask', 'wiki_ask', 'gbrain', 'supabase-ops-query', 'deep-research', 'think-skills', 'ask-user'];
// Engine sections that must each be a non-empty array (v1.4 dynamic engine; each
// element may carry a `concept` {book,slug} ref that is file-existence-checked).
// v1.5: +'tool_selection' (the load + select mechanism over the candidate registry).
// v1.7: +'composition_guards' (the contract for composing a heavyweight sub-
//   capability — deepask — as a Solve data tool: anti-recursion, cost-valve,
//   evidence-not-decider; same generic non-empty + concept-ref enforcement).
const ENGINE_SECTIONS = ['tool_selection', 'validation_gate', 'routing_rules', 'hitl_triggers', 'back_edges', 'stopping_criterion', 'composition_guards'];

/**
 * Pure validation. Returns an array of error strings (empty = valid).
 * @param {*} doc       parsed YAML (any shape — defends against garbage)
 * @param {string} repoRoot base dir for skill/concept file-existence checks
 */
function validateWorkflow(doc, repoRoot) {
  const errs = [];
  const conceptExists = (book, slug) =>
    typeof book === 'string' && typeof slug === 'string' &&
    fs.existsSync(path.join(repoRoot, 'wiki', book, 'concepts', `${slug}.md`));
  // Validate a {book, slug} concept ref; push errors tagged by `where`.
  const checkConcept = (kc, where) => {
    if (!kc || typeof kc !== 'object' || Array.isArray(kc) ||
        typeof kc.book !== 'string' || !kc.book.trim() ||
        typeof kc.slug !== 'string' || !kc.slug.trim()) {
      errs.push(`${where}: concept must be a {book, slug} mapping of non-empty strings`);
      return;
    }
    if (!SLUG_RE.test(kc.slug)) errs.push(`${where}: concept slug not kebab-case: ${kc.slug}`);
    if (!conceptExists(kc.book, kc.slug)) {
      errs.push(`${where}: concept not found on disk: ${kc.book}/${kc.slug} (expected wiki/${kc.book}/concepts/${kc.slug}.md)`);
    }
  };

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
    if (!Number.isInteger(s.order) || s.order < 1) errs.push(`${where}: order must be an integer >= 1`);
    else orders.push(s.order);

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
        if (!fs.existsSync(path.join(repoRoot, '06-ai-ops', 'skills', sk, 'SKILL.md'))) {
          errs.push(`${where}: skill not found on disk: ${sk} (expected 06-ai-ops/skills/${sk}/SKILL.md)`);
        }
      }
    }

    // key_concepts — must exist on disk
    if (!Array.isArray(s.key_concepts) || s.key_concepts.length === 0) {
      errs.push(`${where}: key_concepts must be a non-empty array`);
    } else {
      for (const kc of s.key_concepts) checkConcept(kc, where);
    }

    // produces (v1.4) — non-empty array of known artifact names
    if (!Array.isArray(s.produces) || s.produces.length === 0) {
      errs.push(`${where}: produces must be a non-empty array of artifact names`);
    } else {
      for (const a of s.produces) {
        if (!ARTIFACTS.includes(a)) errs.push(`${where}: unknown artifact in produces: ${a} (known: ${ARTIFACTS.join(', ')})`);
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
  for (const c of CANONICAL_4S) if (!ids.has(c)) errs.push(`missing canonical 4S step: '${c}'`);

  // ---- v1.4 ENGINE SECTIONS ----

  // artifacts: run_folder + files (each name∈ARTIFACTS, stage∈stepIds)
  const art = doc.artifacts;
  if (!art || typeof art !== 'object' || Array.isArray(art)) {
    errs.push('artifacts must be a mapping (v1.4 engine)');
  } else {
    if (typeof art.run_folder !== 'string' || !art.run_folder.trim()) errs.push('artifacts.run_folder must be a non-empty string');
    if (!Array.isArray(art.files) || art.files.length === 0) {
      errs.push('artifacts.files must be a non-empty array');
    } else {
      for (const f of art.files) {
        if (!f || typeof f !== 'object' || Array.isArray(f)) { errs.push('artifacts.files entry must be a mapping'); continue; }
        if (!ARTIFACTS.includes(f.name)) errs.push(`artifacts.files: unknown artifact name: ${f.name}`);
        if (!ids.has(f.stage)) errs.push(`artifacts.files '${f.name}': stage '${f.stage}' is not a step id`);
        if (typeof f.contents !== 'string' || !f.contents.trim()) errs.push(`artifacts.files '${f.name}': contents must be a non-empty string`);
      }
    }
  }

  // data_routing: each {need, tool∈TOOLS, invoke, hitl}
  if (!Array.isArray(doc.data_routing) || doc.data_routing.length === 0) {
    errs.push('data_routing must be a non-empty array (v1.4 engine)');
  } else {
    for (const dr of doc.data_routing) {
      if (!dr || typeof dr !== 'object' || Array.isArray(dr)) { errs.push('data_routing entry must be a mapping'); continue; }
      if (typeof dr.need !== 'string' || !dr.need.trim()) errs.push('data_routing entry: need must be a non-empty string');
      if (!TOOLS.includes(dr.tool)) errs.push(`data_routing entry: unknown tool: ${dr.tool} (known: ${TOOLS.join(', ')})`);
      if (typeof dr.invoke !== 'string' || !dr.invoke.trim()) errs.push(`data_routing '${dr.tool}': invoke must be a non-empty string`);
      if (dr.hitl === undefined || dr.hitl === null || `${dr.hitl}`.trim() === '') errs.push(`data_routing '${dr.tool}': hitl must be set`);
    }
  }

  // engine sections: non-empty arrays + every concept ref exists
  const stepIds = ids; // alias for readability
  for (const sec of ENGINE_SECTIONS) {
    const v = doc[sec];
    if (!Array.isArray(v) || v.length === 0) {
      errs.push(`${sec} must be a non-empty array (v1.4 engine)`);
      continue;
    }
    v.forEach((e, i) => {
      if (!e || typeof e !== 'object' || Array.isArray(e)) { errs.push(`${sec}[${i}]: must be a mapping`); return; }
      if (e.concept !== undefined) checkConcept(e.concept, `${sec}[${i}]`);
      if (sec === 'back_edges') {
        if (!stepIds.has(e.from)) errs.push(`back_edges[${i}]: from '${e.from}' is not a step id`);
        if (!stepIds.has(e.to)) errs.push(`back_edges[${i}]: to '${e.to}' is not a step id`);
      }
      // v1.7: composition_guards.applies_to (optional) must reference known data tools.
      if (sec === 'composition_guards' && e.applies_to !== undefined) {
        if (!Array.isArray(e.applies_to)) {
          errs.push(`composition_guards[${i}]: applies_to must be an array of tool names`);
        } else {
          for (const t of e.applies_to) {
            if (!TOOLS.includes(t)) errs.push(`composition_guards[${i}]: applies_to references unknown tool: ${t} (known: ${TOOLS.join(', ')})`);
          }
        }
      }
    });
  }

  // produces ⊆ artifacts.files.name (coherence: every artifact a step produces must be declared in artifacts.files)
  if (art && typeof art === 'object' && Array.isArray(art.files)) {
    const declared = new Set(art.files.map((f) => f && f.name).filter(Boolean));
    const produced = new Set();
    for (const s of steps) if (s && Array.isArray(s.produces)) for (const a of s.produces) produced.add(a);
    for (const a of produced) {
      if (!declared.has(a)) errs.push(`artifact '${a}' is produced by a step but not declared in artifacts.files`);
    }
  }

  return errs;
}

function main() {
  const REGISTRY = path.join(REPO_ROOT, REGISTRY_REL);
  if (!fs.existsSync(REGISTRY)) {
    console.error(`[FAIL] ${REGISTRY_REL} missing. (capability thinking-toolkit v1.4)`);
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

  // v1.6 coherence: the run-folder scaffolder/checker (mckinsey-run.cjs) must
  // agree with the catalog on the 7 artifact names (catalog spec ↔ run folder).
  try {
    const { ARTIFACTS: RUN_ARTIFACTS } = require('../thinking-toolkit/mckinsey-run.cjs');
    if (Array.isArray(doc.artifacts && doc.artifacts.files)) { // guaranteed by validateWorkflow; belt-and-suspenders
      const catalogArtifacts = JSON.stringify([...new Set(doc.artifacts.files.map((f) => f.name))].sort());
      const runArtifacts = JSON.stringify([...RUN_ARTIFACTS].sort());
      if (catalogArtifacts !== runArtifacts) {
        console.error(`[FAIL] mckinsey-workflow.yaml ↔ scripts/thinking-toolkit/mckinsey-run.cjs artifact drift:\n  catalog    = ${catalogArtifacts}\n  run-helper = ${runArtifacts}`);
        process.exit(1);
      }
    }
  } catch (e) {
    if (e && e.code !== 'MODULE_NOT_FOUND') throw e; // helper absent (partial checkout) → skip
  }

  const nSkills = doc.steps.reduce((a, s) => a + (Array.isArray(s.skills) ? s.skills.length : 0), 0);
  const nConcepts = doc.steps.reduce((a, s) => a + (Array.isArray(s.key_concepts) ? s.key_concepts.length : 0), 0);
  console.log(`[OK] mckinsey-workflow.yaml — ${doc.steps.length} 4S steps · ${nSkills} skill + ${nConcepts} step-concept refs exist · ${doc.data_routing.length} data-routing tools · ${doc.artifacts.files.length} artifacts · engine sections valid.`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { validateWorkflow, CANONICAL_4S, ARTIFACTS, TOOLS, ENGINE_SECTIONS, REGISTRY_REL };
