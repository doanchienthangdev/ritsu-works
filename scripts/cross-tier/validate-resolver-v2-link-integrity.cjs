#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-resolver-v2-link-integrity.cjs
 *
 * L2 validator: every "Composes with" reference points to an existing recipient
 * ID in the catalog. Prevents dangling cross-references in composition output.
 *
 * Exit 0 = pass. 1 = fail.
 */

const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RECIPIENTS_DIR = path.join(REPO_ROOT, 'knowledge', 'recipients');
const { loadCatalog } = require(path.join(REPO_ROOT, 'scripts/resolver-v2/catalog-loader.cjs'));

function main() {
  if (!fs.existsSync(RECIPIENTS_DIR)) {
    console.error('[FAIL] knowledge/recipients/ missing');
    process.exit(1);
  }
  const catalog = loadCatalog({ skipCache: true });
  const validIds = new Set(catalog.recipients.map(r => r.id));

  const dangling = [];
  for (const r of catalog.recipients) {
    if (!Array.isArray(r.composes_with)) continue;
    for (const ref of r.composes_with) {
      const refTrimmed = ref.trim();
      if (!refTrimmed) continue;
      // Allow well-known kinds not yet in catalog (wiki, sop, capability)
      const kindPrefix = refTrimmed.split('/')[0];
      if (['wiki', 'sop', 'capability'].includes(kindPrefix)) continue; // v2.1 kinds
      if (!validIds.has(refTrimmed)) {
        dangling.push({ from: r.id, ref: refTrimmed });
      }
    }
  }

  if (dangling.length === 0) {
    console.log(`[PASS] all "Composes with" references resolve (${catalog.totalCount} recipients checked)`);
    process.exit(0);
  }
  console.error(`[FAIL] ${dangling.length} dangling reference(s):`);
  for (const d of dangling.slice(0, 30)) {
    console.error(`  ${d.from} → ${d.ref}  (target not in catalog)`);
  }
  if (dangling.length > 30) console.error(`  ... and ${dangling.length - 30} more`);
  process.exit(1);
}

main();
