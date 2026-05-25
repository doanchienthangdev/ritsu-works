#!/usr/bin/env node
/**
 * scripts/cross-tier/validate-gbrain-invariant-handlers.cjs
 *
 * L2 validator — capability gbrain-operational-brain v1.0 (Sprint 6).
 *
 * For each gbrain L1/L2/L3 invariant registered in
 * knowledge/cross-tier-invariants.yaml (id-prefix `gbrain-`), this validator
 * checks the corresponding handler exists in scripts/cross-tier/ OR is
 * explicitly marked `status: deferred`.
 *
 * v1.0 (Sprint 6 land time): all 6 gbrain invariants are `status: deferred`
 * — handlers ship in v1.1 follow-up. This validator therefore PASSES at
 * land time. It activates as invariants flip to `status: live` and surfaces
 * any without handlers.
 *
 * Run as L2 check via scripts/check-consistency.cjs.
 *
 * Exit codes:
 *   0 — every live gbrain invariant has a handler (or all are deferred)
 *   1 — at least one live invariant lacks a handler
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const INVARIANTS_PATH = path.join(REPO_ROOT, 'knowledge', 'cross-tier-invariants.yaml');
const HANDLERS_DIR = path.join(REPO_ROOT, 'scripts', 'cross-tier');

function loadInvariantsYaml(p) {
  // Minimal YAML reader: extract id + status pairs for top-level `invariants:` list.
  // Each invariant is delimited by `  - id: <slug>` and may contain `    status: <state>`.
  const raw = fs.readFileSync(p, 'utf-8');
  const result = [];
  let current = null;
  for (const line of raw.split('\n')) {
    const idMatch = line.match(/^\s\s-\sid:\s([a-z][a-z0-9-]*)\s*$/);
    if (idMatch) {
      if (current) result.push(current);
      current = { id: idMatch[1], status: 'live' };
      continue;
    }
    if (!current) continue;
    const statusMatch = line.match(/^\s{4}status:\s([a-z_]+)\s*$/);
    if (statusMatch) current.status = statusMatch[1];
  }
  if (current) result.push(current);
  return result;
}

function main() {
  if (!fs.existsSync(INVARIANTS_PATH)) {
    console.log('  ⚠ cross-tier-invariants.yaml missing — skipping');
    return 0;
  }

  const invariants = loadInvariantsYaml(INVARIANTS_PATH);
  const gbrainInvariants = invariants.filter(i => i.id.startsWith('gbrain-'));

  if (gbrainInvariants.length === 0) {
    console.log('  ⚠ no gbrain invariants registered — skipping');
    return 0;
  }

  const liveGbrain = gbrainInvariants.filter(i => i.status === 'live');
  const deferredGbrain = gbrainInvariants.filter(i => i.status === 'deferred');

  // For each LIVE gbrain invariant, expect a handler script
  // scripts/cross-tier/gbrain-handler-<id>.cjs OR scripts/cross-tier/handle-<id>.cjs
  const errors = [];
  for (const inv of liveGbrain) {
    const candidates = [
      path.join(HANDLERS_DIR, `gbrain-handler-${inv.id}.cjs`),
      path.join(HANDLERS_DIR, `handle-${inv.id}.cjs`),
      path.join(HANDLERS_DIR, `validate-${inv.id}.cjs`),
    ];
    const exists = candidates.some(c => fs.existsSync(c));
    if (!exists) {
      errors.push(`gbrain invariant '${inv.id}' is LIVE but no handler found at any of: ${candidates.map(c => path.relative(REPO_ROOT, c)).join(', ')}`);
    }
  }

  if (errors.length > 0) {
    console.log(`  ✗ gbrain invariant handlers missing (${errors.length}):`);
    for (const e of errors) console.log(`      - ${e}`);
    console.log('');
    console.log('  Fix: implement the handler OR mark invariant `status: deferred` in cross-tier-invariants.yaml');
    return 1;
  }

  console.log(`  ✓ gbrain invariants: ${liveGbrain.length} live (all handled), ${deferredGbrain.length} deferred`);
  return 0;
}

process.exit(main());
