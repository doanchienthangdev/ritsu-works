#!/usr/bin/env node
// L2 validator: knowledge/manifest.yaml ↔ supabase/migrations/*.sql
//
// Checks:
// - Every ops.*/metrics.* table listed in manifest.tier2_operational must be
//   CREATE TABLE'd by some migration.
// - Reverse: every CREATE TABLE in migrations (ops + metrics schemas) must
//   appear in manifest.tier2_operational (closes the "drift class 5" we hit:
//   18 tables in DB undocumented in manifest).
//
// Invariants enforced: manifest-tier2-tables-subset, manifest-tier2-metrics-tables-subset.
//
// Exit codes: 0 = clean, 1 = drift detected.

'use strict';

const fs = require('fs');
const path = require('path');

const { REPO_ROOT } = require('../lib/load-invariants.cjs');
const { extractCreateTables } = require('../lib/read-migrations.cjs');

let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  console.error('❌ js-yaml not installed. Run: pnpm install');
  process.exit(2);
}

function loadManifest() {
  const p = path.join(REPO_ROOT, 'knowledge', 'manifest.yaml');
  return yaml.load(fs.readFileSync(p, 'utf8'));
}

function manifestTables(manifest, schemaName) {
  const schemas = manifest && manifest.tier2_operational && manifest.tier2_operational.schemas;
  if (!schemas || !schemas[schemaName]) return [];
  const tables = schemas[schemaName].tables;
  if (!Array.isArray(tables)) return [];
  return tables
    .filter((t) => !t.kind || t.kind !== 'view')
    .map((t) => t.name)
    .filter(Boolean);
}

function main() {
  const manifest = loadManifest();
  const dbTables = extractCreateTables();
  const dbByName = {
    ops: new Set(dbTables.filter((t) => t.schema === 'ops').map((t) => t.table)),
    metrics: new Set(dbTables.filter((t) => t.schema === 'metrics').map((t) => t.table)),
  };

  const errors = [];

  // Forward direction: manifest ⊆ migrations (for ops + metrics).
  for (const schemaName of ['ops', 'metrics']) {
    const declared = manifestTables(manifest, schemaName);
    for (const name of declared) {
      if (!dbByName[schemaName].has(name)) {
        errors.push(
          `manifest declares ${schemaName}.${name} but no migration CREATE TABLEs it`,
        );
      }
    }
  }

  // Reverse direction: migrations ⊆ manifest (for ops + metrics).
  for (const schemaName of ['ops', 'metrics']) {
    const declared = new Set(manifestTables(manifest, schemaName));
    for (const name of dbByName[schemaName]) {
      if (!declared.has(name)) {
        errors.push(
          `migration creates ${schemaName}.${name} but manifest does not list it under tier2_operational.schemas.${schemaName}.tables`,
        );
      }
    }
  }

  if (errors.length === 0) {
    console.log('✓ manifest-db: clean (manifest ↔ migrations agree)');
    process.exit(0);
  }
  console.error('❌ manifest-db drift detected:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error(`\n${errors.length} issue(s). See knowledge/cross-tier-invariants.yaml for invariants.`);
  process.exit(1);
}

if (require.main === module) main();

module.exports = { main, manifestTables };
