// Shared loader for knowledge/cross-tier-invariants.yaml.
// Consumed by validate-tier1.cjs (L1) + all scripts/cross-tier/*.cjs (L2) +
// (future) supabase/functions/_shared/invariants.ts (L3).
//
// Single source of truth for parsing invariants — prevents the 5 L2 validators
// from each re-implementing yaml load + filter.

'use strict';

const fs = require('fs');
const path = require('path');

let _yaml;
function getYaml() {
  if (!_yaml) {
    try {
      _yaml = require('js-yaml');
    } catch (e) {
      throw new Error('js-yaml not installed. Run: pnpm add -D js-yaml');
    }
  }
  return _yaml;
}

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const INVARIANTS_PATH = path.join(REPO_ROOT, 'knowledge', 'cross-tier-invariants.yaml');

function loadInvariants(filePath = INVARIANTS_PATH) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`cross-tier-invariants.yaml missing at ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed;
  try {
    parsed = getYaml().load(raw);
  } catch (e) {
    throw new Error(`cross-tier-invariants.yaml parse error: ${e.message}`);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('cross-tier-invariants.yaml parsed to non-object');
  }
  const invariants = parsed.invariants || [];
  if (!Array.isArray(invariants)) {
    throw new Error('cross-tier-invariants.yaml `invariants` must be an array');
  }
  return invariants;
}

function invariantsFor(filter, filePath = INVARIANTS_PATH) {
  const all = loadInvariants(filePath);
  if (!filter || typeof filter !== 'object') return all;
  return all.filter((inv) => {
    if (filter.kind && inv.kind !== filter.kind) return false;
    if (filter.layer && inv.layer !== filter.layer) return false;
    if (filter.severity && inv.severity !== filter.severity) return false;
    if (filter.id && inv.id !== filter.id) return false;
    return true;
  });
}

function invariantById(id, filePath = INVARIANTS_PATH) {
  return loadInvariants(filePath).find((inv) => inv.id === id) || null;
}

module.exports = {
  loadInvariants,
  invariantsFor,
  invariantById,
  REPO_ROOT,
  INVARIANTS_PATH,
};
