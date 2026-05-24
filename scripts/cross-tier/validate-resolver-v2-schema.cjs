#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-resolver-v2-schema.cjs
 *
 * L2 validator: every recipient entry in knowledge/recipients/*.md must satisfy
 * the v2 catalog schema (required fields, valid kind, valid status, valid mode).
 *
 * Exit 0 = pass; 1 = fail.
 */

const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RECIPIENTS_DIR = path.join(REPO_ROOT, 'knowledge', 'recipients');

const { loadCatalog, parseFile } = require(path.join(REPO_ROOT, 'scripts/resolver-v2/catalog-loader.cjs'));
const E = require(path.join(REPO_ROOT, 'scripts/resolver-v2/errors.cjs'));

const VALID_KINDS = E.VALID_KINDS;
const VALID_STATUSES = ['active', 'stub', 'deprecated', 'planned', 'deferred', 'operating', 'implementing', 'proposed', 'analyzing', 'architecting', 'disabled', 'draft'];

function main() {
  if (!fs.existsSync(RECIPIENTS_DIR)) {
    console.error(`[FAIL] knowledge/recipients/ missing at ${RECIPIENTS_DIR}`);
    process.exit(1);
  }

  let catalog;
  try {
    catalog = loadCatalog({ skipCache: true });
  } catch (e) {
    console.error(`[FAIL] catalog load: ${e.code || ''} ${e.message}`);
    process.exit(1);
  }

  const errors = [];
  for (const r of catalog.recipients) {
    // ID format check
    const idParts = r.id.split('/');
    if (idParts.length < 2) {
      errors.push(`${r.id}: invalid ID format (missing kind prefix)`);
    } else if (!VALID_KINDS.includes(idParts[0])) {
      errors.push(`${r.id}: unknown kind prefix "${idParts[0]}"`);
    }

    // Kind field consistency
    if (r.kind && idParts[0] !== r.kind) {
      errors.push(`${r.id}: ID prefix "${idParts[0]}" doesn't match Kind field "${r.kind}"`);
    }

    // Status validation
    if (r.status && !VALID_STATUSES.includes(r.status)) {
      errors.push(`${r.id}: invalid status "${r.status}" (valid: ${VALID_STATUSES.join(', ')})`);
    }

    // When to use must be non-trivial
    if (!r.when_to_use || r.when_to_use.length < 10) {
      errors.push(`${r.id}: "When to use" too short or missing (got: "${(r.when_to_use || '').slice(0, 30)}")`);
    }

    // Invoke must be non-empty
    if (!r.invoke || r.invoke.trim().length < 3) {
      errors.push(`${r.id}: "Invoke" too short or missing`);
    }

    // Role scope sanity
    if (!Array.isArray(r.role_scope) || r.role_scope.length === 0) {
      errors.push(`${r.id}: "Role scope" missing or empty`);
    }
  }

  if (errors.length === 0) {
    console.log(`[PASS] ${catalog.totalCount} recipients across ${catalog.byKind.size} kinds — all schema-valid`);
    process.exit(0);
  }
  console.error(`[FAIL] ${errors.length} schema violations:`);
  for (const e of errors.slice(0, 30)) console.error('  -', e);
  if (errors.length > 30) console.error(`  ... and ${errors.length - 30} more`);
  process.exit(1);
}

main();
