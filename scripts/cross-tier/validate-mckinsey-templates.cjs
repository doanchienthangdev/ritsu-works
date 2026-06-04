#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-mckinsey-templates.cjs
 *
 * L2 validator for capability `thinking-toolkit` v2.0 (the McKinsey Sell template
 * registry):
 *   - knowledge/mckinsey-templates.yaml exists + parses + root is a mapping with a
 *     non-empty `mckinsey_templates` array
 *   - every entry structurally valid (id kebab; required prose name / when_to_use /
 *     audience ∈ receptive|skeptical|both / structure[] / rules[] / default_format)
 *   - ids unique
 *   - NO entry carries a brand/design-axis key (colors/background/primary/surface/
 *     palette/secondary_palette/logo/brand/font/typography) — the structural
 *     orthogonality guard so a McKinsey STRUCTURE template can never shadow the
 *     resolved --style brand design-system (the art-styles no-palette-leak analog,
 *     @cto v2.0 must-fix #3).
 *
 * Registered in scripts/check-consistency.cjs (local `pnpm check`) AND as an
 * explicit job in .github/workflows/cross-tier-consistency.yml (GitHub CI runs the
 * hand-listed validator jobs, NOT check-consistency.cjs — the GitHub-CI≠check
 * gotcha). BOTH are required. `validateEntry` is exported pure for tests.
 * Exit 0 = pass, 1 = drift.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY = path.join(REPO_ROOT, 'knowledge', 'mckinsey-templates.yaml');
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const AUDIENCE = ['receptive', 'skeptical', 'both'];
// A McKinsey template carries STRUCTURE prose only — never a brand/design token —
// so it can't shadow the orthogonal --style core palette (the resolved design-system).
const FORBIDDEN_BRAND_KEYS = ['colors', 'color', 'background', 'primary', 'surface', 'palette', 'secondary_palette', 'logo', 'brand', 'font', 'typography'];

/** Pure entry validation. Returns string[] (empty = valid). */
function validateEntry(e) {
  const errs = [];
  if (!e || typeof e !== 'object' || Array.isArray(e)) return ['entry must be a mapping'];
  if (typeof e.id !== 'string' || !ID_RE.test(e.id)) errs.push('id must be kebab-case (^[a-z0-9][a-z0-9-]*$)');
  if (typeof e.name !== 'string' || !e.name.trim()) errs.push('name must be a non-empty string');
  if (typeof e.when_to_use !== 'string' || !e.when_to_use.trim()) errs.push('when_to_use must be a non-empty string');
  if (typeof e.audience !== 'string' || !AUDIENCE.includes(e.audience)) errs.push(`audience must be one of ${AUDIENCE.join('|')}`);
  if (!Array.isArray(e.structure) || e.structure.length === 0 || !e.structure.every((s) => typeof s === 'string' && s.trim())) {
    errs.push('structure must be a non-empty array of non-empty strings');
  }
  if (!Array.isArray(e.rules) || e.rules.length === 0 || !e.rules.every((s) => typeof s === 'string' && s.trim())) {
    errs.push('rules must be a non-empty array of non-empty strings');
  }
  if (typeof e.default_format !== 'string' || !e.default_format.trim()) {
    errs.push('default_format must be a non-empty string (a deepask/format medium id)');
  }
  // v2.1: the "not guessed" anchor — every template MUST cite the real McKinsey
  // report(s) its structure was extracted from.
  if (!Array.isArray(e.grounded_in) || e.grounded_in.length === 0 || !e.grounded_in.every((s) => typeof s === 'string' && s.trim())) {
    errs.push('grounded_in must be a non-empty array of citation strings (the real McKinsey report(s) the structure was extracted from)');
  }
  if (e && typeof e === 'object') {
    for (const k of Object.keys(e)) {
      if (FORBIDDEN_BRAND_KEYS.includes(String(k).toLowerCase())) {
        errs.push(`forbidden brand/design key '${k}' — a McKinsey template carries STRUCTURE prose only; brand/design is the orthogonal --style axis (so it can't shadow the resolved design-system)`);
      }
    }
  }
  return errs;
}

function main() {
  if (!fs.existsSync(REGISTRY)) {
    console.error('[FAIL] knowledge/mckinsey-templates.yaml missing. (capability thinking-toolkit v2.0)');
    process.exit(1);
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(REGISTRY, 'utf-8')) || {};
  } catch (e) {
    console.error(`[FAIL] mckinsey-templates.yaml YAML parse error: ${e.message}`);
    process.exit(1);
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    console.error('[FAIL] mckinsey-templates.yaml root must be a mapping');
    process.exit(1);
  }
  const list = doc.mckinsey_templates === undefined ? [] : doc.mckinsey_templates;
  if (!Array.isArray(list)) {
    console.error('[FAIL] mckinsey-templates.yaml: mckinsey_templates must be an array');
    process.exit(1);
  }
  if (list.length === 0) {
    console.error('[FAIL] mckinsey-templates.yaml: mckinsey_templates is empty (no templates registered)');
    process.exit(1);
  }

  const errs = [];
  const seen = new Set();
  for (const e of list) {
    const id = e && typeof e.id === 'string' ? e.id : JSON.stringify(e && e.id);
    for (const msg of validateEntry(e)) errs.push(`${id}: ${msg}`);
    if (e && typeof e.id === 'string') {
      if (seen.has(e.id)) errs.push(`duplicate id: ${e.id}`);
      seen.add(e.id);
    }
  }

  if (errs.length) {
    console.error(`[FAIL] mckinsey-templates.yaml: ${errs.length} error(s):`);
    for (const m of errs) console.error(`  - ${m}`);
    process.exit(1);
  }

  console.log(`[OK] mckinsey-templates.yaml — ${list.length} templates, all valid, no brand-key leak.`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { validateEntry, FORBIDDEN_BRAND_KEYS, AUDIENCE };
