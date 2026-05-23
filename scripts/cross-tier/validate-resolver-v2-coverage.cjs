#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-resolver-v2-coverage.cjs
 *
 * L2 WARN validator: every source entity (SKILL.md, command.md, agent.md,
 * PERSONA.md, MCP tool) should have a catalog entry. Missing entries are
 * warnings (sync.cjs picks them up next run), not errors.
 *
 * Exit 0 = pass (or warn). 1 = catalog completely missing.
 */

const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RECIPIENTS_DIR = path.join(REPO_ROOT, 'knowledge', 'recipients');

const { loadCatalog } = require(path.join(REPO_ROOT, 'scripts/resolver-v2/catalog-loader.cjs'));
const { generateSkills, generateCommands, generateAgents, generatePersonas, generateMcps } =
  require(path.join(REPO_ROOT, 'scripts/resolver-v2/catalog-generator.cjs'));

function main() {
  if (!fs.existsSync(RECIPIENTS_DIR)) {
    console.error('[FAIL] knowledge/recipients/ missing');
    process.exit(1);
  }
  const catalog = loadCatalog({ skipCache: true });
  const expectedIds = new Set([
    ...generateSkills().map(r => r.id),
    ...generateCommands().map(r => r.id),
    ...generateAgents().map(r => r.id),
    ...generatePersonas().map(r => r.id),
    ...generateMcps().map(r => r.id),
  ]);
  const actualIds = new Set(catalog.recipients.map(r => r.id));

  const missing = [...expectedIds].filter(id => !actualIds.has(id));
  const orphan = [...actualIds].filter(id => !expectedIds.has(id));

  if (missing.length === 0 && orphan.length === 0) {
    console.log(`[PASS] coverage complete: ${actualIds.size} recipients indexed`);
    process.exit(0);
  }
  if (missing.length > 0) {
    console.warn(`[WARN] ${missing.length} source entities missing from catalog (run sync to add):`);
    for (const id of missing.slice(0, 20)) console.warn('  -', id);
    if (missing.length > 20) console.warn(`  ... and ${missing.length - 20} more`);
  }
  if (orphan.length > 0) {
    console.warn(`[WARN] ${orphan.length} catalog entries have no source (run sync to prune):`);
    for (const id of orphan.slice(0, 20)) console.warn('  -', id);
    if (orphan.length > 20) console.warn(`  ... and ${orphan.length - 20} more`);
  }
  process.exit(0); // warn-only
}

main();
