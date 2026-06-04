#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-dataviz-renderers.cjs
 *
 * L2 validator for capability `dataviz` v0.1 (mirrors validate-image-adapters.cjs):
 *   - knowledge/dataviz-renderers.yaml exists + parses + root mapping with a
 *     non-empty `renderers` array
 *   - each renderer: valid kebab `id` (unique), valid `status` enum
 *   - supports[] ∪ supports_stretch[] ∪ unsupported_warn[] ⊆ UNIVERSAL_PARAMS
 *     (imported from scripts/dataviz/lib/params.cjs — the dataviz vocabulary, NOT
 *     image's; @cto v0.1 must-fix #6)
 *   - status=installed ⇒ the `generator` path MUST exist on disk (split-registry:
 *     registered-not-built stubs need no file)
 *
 * Registered in scripts/check-consistency.cjs (local `pnpm check`) AND as an explicit
 * job in .github/workflows/cross-tier-consistency.yml (GitHub CI runs the hand-listed
 * validator jobs, NOT check-consistency.cjs — the GitHub-CI≠check gotcha). BOTH required.
 * Exit 0 = pass, 1 = drift. `checkRenderers` exported pure for tests.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY_REL = 'knowledge/dataviz-renderers.yaml';

const { UNIVERSAL_PARAMS } = require('../dataviz/lib/params.cjs');
const UNIVERSAL = new Set(UNIVERSAL_PARAMS);
const NAME_RE = /^[a-z][a-z0-9-]*$/;
const VALID_STATUSES = ['installed', 'registered-not-built'];
const MATERIALIZED = ['installed']; // only these require the generator file on disk.

function checkSubset(listName, list, tag, errs) {
  if (list === undefined) return;
  if (!Array.isArray(list)) { errs.push(`${tag}: ${listName} must be an array`); return; }
  for (const p of list) {
    if (typeof p !== 'string' || !UNIVERSAL.has(p)) errs.push(`${tag}: ${listName} contains "${p}" which is not a UNIVERSAL_PARAM (scripts/dataviz/lib/params.cjs)`);
  }
}

/** Pure validation. Returns string[] (empty = valid). */
function checkRenderers(doc, repoRoot) {
  const errs = [];
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) return ['dataviz-renderers.yaml root must be a mapping'];
  const list = doc.renderers === undefined ? [] : doc.renderers;
  if (!Array.isArray(list)) return ['dataviz-renderers.yaml: renderers must be an array'];
  if (list.length === 0) return ['dataviz-renderers.yaml: renderers is empty'];

  const seen = new Set();
  for (const r of list) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) { errs.push('renderers: entry must be a mapping'); continue; }
    const id = typeof r.id === 'string' ? r.id : JSON.stringify(r.id);
    const tag = `renderer "${id}"`;
    if (typeof r.id !== 'string' || !NAME_RE.test(r.id)) errs.push(`${tag}: id must be kebab-case (^[a-z][a-z0-9-]*$)`);
    else { if (seen.has(r.id)) errs.push(`duplicate renderer id: ${r.id}`); seen.add(r.id); }
    if (!VALID_STATUSES.includes(r.status)) errs.push(`${tag}: status must be one of ${VALID_STATUSES.join('|')} (got ${JSON.stringify(r.status)})`);

    checkSubset('supports', r.supports, tag, errs);
    checkSubset('supports_stretch', r.supports_stretch, tag, errs);
    checkSubset('unsupported_warn', r.unsupported_warn, tag, errs);

    if (MATERIALIZED.includes(r.status)) {
      if (typeof r.generator !== 'string' || !r.generator.trim()) {
        errs.push(`${tag}: status=installed requires a "generator" path`);
      } else if (!fs.existsSync(path.join(repoRoot, r.generator))) {
        errs.push(`${tag}: generator not found on disk: ${r.generator} (status=installed ⇒ file must exist)`);
      }
    }
  }
  return errs;
}

function main() {
  const REGISTRY = path.join(REPO_ROOT, REGISTRY_REL);
  if (!fs.existsSync(REGISTRY)) { console.error(`[FAIL] ${REGISTRY_REL} missing. (capability dataviz v0.1)`); process.exit(1); }
  let doc;
  try { doc = yaml.load(fs.readFileSync(REGISTRY, 'utf-8')) || {}; } catch (e) { console.error(`[FAIL] dataviz-renderers.yaml YAML parse error: ${e.message}`); process.exit(1); }
  const errs = checkRenderers(doc, REPO_ROOT);
  if (errs.length) { console.error(`[FAIL] dataviz-renderers.yaml: ${errs.length} error(s):`); errs.forEach((m) => console.error(`  - ${m}`)); process.exit(1); }
  const n = doc.renderers.length;
  const installed = doc.renderers.filter((r) => r.status === 'installed').length;
  console.log(`[OK] dataviz-renderers.yaml — ${n} renderers (${installed} installed), supports ⊆ UNIVERSAL_PARAMS, generators on disk.`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { checkRenderers, UNIVERSAL_PARAMS, VALID_STATUSES, REGISTRY_REL };
