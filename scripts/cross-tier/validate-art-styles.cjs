#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-art-styles.cjs
 *
 * L2 validator for capability `deepask` v1.2-image (artistic genre axis):
 *   - knowledge/art-styles.yaml exists + parses + root is a mapping with an array
 *   - every entry is structurally valid (id pattern, required prose tone/layout/assets)
 *   - ids are unique
 *   - NO genre carries a brand-axis palette key (colors/background/primary/surface) —
 *     the structural orthogonality guard so a genre can never shadow the brand
 *     --style core palette (@cto Phase-5 R5).
 *
 * Registered in scripts/check-consistency.cjs (local `pnpm check`) AND as an
 * explicit job in .github/workflows/cross-tier-consistency.yml (GitHub CI runs
 * hand-listed validator jobs, NOT check-consistency.cjs — @cto Phase-5 R4 / the
 * GitHub-CI≠check-consistency gotcha). BOTH are required.
 * Exit 0 = pass, 1 = drift.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY = path.join(REPO_ROOT, 'knowledge', 'art-styles.yaml');

// Reuse the single source of truth for the name pattern + entry validation (DRY, @cto R6).
const { validateEntry } = require('../deepask/art-style-registry-io.cjs');

function main() {
  if (!fs.existsSync(REGISTRY)) {
    console.error('[FAIL] knowledge/art-styles.yaml missing. (capability deepask v1.2-image)');
    process.exit(1);
  }

  let doc;
  try {
    doc = yaml.load(fs.readFileSync(REGISTRY, 'utf-8')) || {};
  } catch (e) {
    console.error(`[FAIL] art-styles.yaml YAML parse error: ${e.message}`);
    process.exit(1);
  }

  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    console.error('[FAIL] art-styles.yaml root must be a mapping');
    process.exit(1);
  }
  const list = doc.art_styles === undefined ? [] : doc.art_styles;
  if (!Array.isArray(list)) {
    console.error('[FAIL] art-styles.yaml: art_styles must be an array');
    process.exit(1);
  }
  if (list.length === 0) {
    console.error('[FAIL] art-styles.yaml: art_styles is empty (no genres registered)');
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
    console.error(`[FAIL] art-styles.yaml: ${errs.length} error(s):`);
    for (const m of errs) console.error(`  - ${m}`);
    process.exit(1);
  }

  console.log(`[OK] art-styles.yaml — ${list.length} genres, all valid, no brand-palette leak.`);
  process.exit(0);
}

main();
