#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-resolver-v2-uniqueness.cjs
 *
 * L2 validator: no duplicate recipient IDs across catalog files. Mode A/B/C
 * require unique IDs (byId Map must be 1:1).
 *
 * Exit 0 = pass. 1 = fail.
 */

const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RECIPIENTS_DIR = path.join(REPO_ROOT, 'knowledge', 'recipients');
const { parseFile } = require(path.join(REPO_ROOT, 'scripts/resolver-v2/catalog-loader.cjs'));
const E = require(path.join(REPO_ROOT, 'scripts/resolver-v2/errors.cjs'));

const FILES = ['skills.md', 'commands.md', 'agents.md', 'personas.md', 'mcps.md'];

function main() {
  if (!fs.existsSync(RECIPIENTS_DIR)) {
    console.error('[FAIL] knowledge/recipients/ missing');
    process.exit(1);
  }
  const seenIds = new Map(); // id -> file
  let totalCount = 0;
  const collisions = [];

  for (const file of FILES) {
    const fp = path.join(RECIPIENTS_DIR, file);
    if (!fs.existsSync(fp)) continue;
    let entries;
    try {
      entries = parseFile(fp, fs.readFileSync(fp, 'utf-8'));
    } catch (e) {
      console.error(`[FAIL] parse error in ${file}: ${e.message}`);
      process.exit(1);
    }
    for (const e of entries) {
      totalCount++;
      if (seenIds.has(e.id)) {
        collisions.push({ id: e.id, files: [seenIds.get(e.id), fp] });
      } else {
        seenIds.set(e.id, fp);
      }
    }
  }

  if (collisions.length === 0) {
    console.log(`[PASS] ${totalCount} recipients, all IDs unique across ${FILES.length} files`);
    process.exit(0);
  }
  console.error(`[FAIL] ${collisions.length} duplicate ID(s):`);
  for (const c of collisions) {
    console.error(`  ${c.id} appears in: ${c.files.map(f => path.basename(f)).join(', ')}`);
  }
  process.exit(1);
}

main();
