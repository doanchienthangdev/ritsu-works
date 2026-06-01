#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-design-systems.cjs
 *
 * L1 validator for capability `design-system-styling`:
 *   - knowledge/design-systems.yaml exists + parses
 *   - every entry is structurally valid (name pattern, origin/status enums, source, path)
 *   - names are unique
 *   - owned systems live under 00-core/design-system/ (NOT the gitignored runtime/ cache)
 *   - file-existence: status installed|cached|vendored ⇒ the DESIGN.md must exist
 *     (pending|not_cached|cache-pending-key are registered-but-not-materialized — no file check, per AD-2)
 *
 * Registered in scripts/check-consistency.cjs L2-critical list.
 * Exit 0 = pass, 1 = drift.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY = path.join(REPO_ROOT, 'knowledge', 'design-systems.yaml');

// Reuse the single source of truth for the enums + name pattern (DRY).
const {
  VALID_ORIGINS,
  VALID_STATUSES,
  MATERIALIZED_STATUSES,
  NAME_RE,
} = require('../design-system/registry-io.cjs');

function main() {
  if (!fs.existsSync(REGISTRY)) {
    console.error('[FAIL] knowledge/design-systems.yaml missing. (capability design-system-styling)');
    process.exit(1);
  }

  let doc;
  try {
    doc = yaml.load(fs.readFileSync(REGISTRY, 'utf-8')) || {};
  } catch (e) {
    console.error(`[FAIL] design-systems.yaml YAML parse error: ${e.message}`);
    process.exit(1);
  }

  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    console.error('[FAIL] design-systems.yaml root must be a mapping');
    process.exit(1);
  }
  const list = doc.design_systems === undefined ? [] : doc.design_systems;
  if (!Array.isArray(list)) {
    console.error('[FAIL] design-systems.yaml: design_systems must be an array');
    process.exit(1);
  }

  const errs = [];
  const seen = new Set();

  for (const e of list) {
    const tag = e && typeof e === 'object' && e.name ? e.name : JSON.stringify(e);
    if (e === null || typeof e !== 'object' || Array.isArray(e)) {
      errs.push(`entry not an object: ${tag}`);
      continue;
    }
    if (typeof e.name !== 'string' || !NAME_RE.test(e.name)) {
      errs.push(`${tag}: invalid name (must match ${NAME_RE})`);
    } else {
      if (seen.has(e.name)) errs.push(`${e.name}: duplicate name`);
      seen.add(e.name);
    }
    if (!VALID_ORIGINS.includes(e.origin)) {
      errs.push(`${tag}: invalid origin "${e.origin}" (one of ${VALID_ORIGINS.join('|')})`);
    }
    if (!VALID_STATUSES.includes(e.status)) {
      errs.push(`${tag}: invalid status "${e.status}" (one of ${VALID_STATUSES.join('|')})`);
    }
    if (typeof e.source !== 'string' || !e.source) errs.push(`${tag}: missing source`);
    if (typeof e.path !== 'string' || !e.path) {
      errs.push(`${tag}: missing path`);
      continue;
    }

    // owned must NOT live in the gitignored runtime/ cache; downloaded must NOT be in Tier-1 00-core/.
    if (e.origin === 'owned' && e.path.includes('runtime/')) {
      errs.push(`${e.name}: owned system must not live under runtime/ (got ${e.path})`);
    }
    if ((e.origin === 'downloaded' || e.origin === 'built-from-repo') && e.path.startsWith('00-core/') && e.status !== 'vendored') {
      errs.push(`${e.name}: ${e.origin} system in 00-core/ must have status=vendored (got ${e.status})`);
    }

    // file-existence: only for materialized statuses.
    if (MATERIALIZED_STATUSES.includes(e.status)) {
      const fp = path.isAbsolute(e.path) ? e.path : path.join(REPO_ROOT, e.path);
      if (!fs.existsSync(fp)) {
        errs.push(`${e.name}: status="${e.status}" requires the DESIGN.md to exist, but ${e.path} is missing`);
      }
    }
  }

  if (errs.length) {
    console.error(`[FAIL] design-systems.yaml: ${errs.length} issue(s):`);
    for (const x of errs) console.error('  - ' + x);
    process.exit(1);
  }
  console.log(`[PASS] design-systems.yaml (${list.length} system${list.length === 1 ? '' : 's'})`);
  process.exit(0);
}

main();
