#!/usr/bin/env node
// L2 validator: every .from('<table>') in supabase/functions/ must point to a
// real CREATE TABLE in supabase/migrations/.
//
// Invariant enforced: code-table-references-exist.

'use strict';

const fs = require('fs');
const path = require('path');

const { REPO_ROOT } = require('../lib/load-invariants.cjs');
const { extractCreateTables } = require('../lib/read-migrations.cjs');

const SCAN_DIRS = ['supabase/functions'];

// Tables that are valid Supabase-managed targets we don't migrate ourselves
// (storage, auth, realtime). Skill code may reference these legitimately.
const SYSTEM_TABLES = new Set([
  // Supabase-managed (auth, storage)
  'audit_log_entries',
  'objects',
  'buckets',
  'users',
  'identities',
  'sessions',
  // Product Supabase tables we read via a separate `productSb` client.
  // These intentionally do NOT have local migrations. Listed here explicitly
  // so we don't lose visibility — adding one here is a deliberate decision.
  'v_ops_dau_export',
]);

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, acc);
    } else if (entry.isFile() && /\.(ts|tsx|js|cjs|mjs)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function scanFromCalls(file) {
  const text = fs.readFileSync(file, 'utf8');
  const re = /\.from\(\s*['"`]([a-z_][a-z0-9_]*)['"`]\s*[,)]/g;
  const hits = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(0, m.index);
    const line = before.split('\n').length;
    hits.push({ table: m[1], line });
  }
  return hits;
}

function main() {
  const dbTables = extractCreateTables();
  const known = new Set(dbTables.map((t) => t.table));

  const errors = [];
  for (const rel of SCAN_DIRS) {
    const files = walk(path.join(REPO_ROOT, rel));
    for (const file of files) {
      const refs = scanFromCalls(file);
      for (const r of refs) {
        if (known.has(r.table)) continue;
        if (SYSTEM_TABLES.has(r.table)) continue;
        const relFile = path.relative(REPO_ROOT, file);
        errors.push(`${relFile}:${r.line} references table '${r.table}' which no migration CREATE TABLEs`);
      }
    }
  }

  if (errors.length === 0) {
    console.log(`✓ skills-references: clean (all .from() targets exist in migrations)`);
    process.exit(0);
  }
  console.error('❌ skills-references drift detected:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

if (require.main === module) main();

module.exports = { main, scanFromCalls };
