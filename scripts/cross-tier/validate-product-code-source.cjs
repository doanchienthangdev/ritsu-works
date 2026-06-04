#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-product-code-source.cjs
 *
 * L2-CRITICAL validator for capability `product-code-readonly-access` — the CODE
 * sibling of product-db-readonly-access. Checks the COMMITTED ops-side contract
 * (knowledge/product-code-source-contract.yaml) for the read-only + secret-gate +
 * no-drift invariants that are deterministically checkable from this repo:
 *
 *   1. read-only        — contract.read_only === true AND repo.write_forbidden === true
 *   2. secret-gate      — read_surface === 'committed-remote-tree' (never the local
 *                         clone with uncommitted .env) AND secret_denylist non-empty
 *                         AND covers '.env'
 *   3. registered       — external_source_id is in external-sources.yaml with
 *                         source_type === 'code-repo-readonly' AND status active
 *   4. allowlist-no-drift — contract.consumer_allowlist == that source's role_scope
 *   5. read-modes       — >=1 'active' mode whose freshness is 'live' (the zero-cost
 *                         v1 mode); every mode status is from the known set; any
 *                         gbrain mode must NOT be silently 'active' without the gate
 *
 * The structured fields are checked (NOT a prose grep of invoke_pattern — the
 * read-only guarantee lives in the typed `read_only` / `source_type` fields).
 *
 * Registered in BOTH scripts/check-consistency.cjs (local `pnpm check`) AND
 * .github/workflows/cross-tier-consistency.yml (the two-edit rule). Exit 0/1.
 *
 * `validateContract(contract, extSources)` is exported PURE (returns string[] of
 * errors) so tests exercise edge + broken cases without a CLI.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONTRACT = path.join(REPO_ROOT, 'knowledge', 'product-code-source-contract.yaml');
const EXT_SOURCES = path.join(REPO_ROOT, 'knowledge', 'external-sources.yaml');

const KNOWN_MODE_STATUS = ['active', 'planned', 'deferred', 'disabled'];

/**
 * Pure validation. Returns an array of error strings (empty = valid).
 * @param {*} contract    parsed product-code-source-contract.yaml (any shape)
 * @param {*} extSources  parsed external-sources.yaml (any shape)
 */
function validateContract(contract, extSources) {
  const errs = [];
  if (contract === null || typeof contract !== 'object' || Array.isArray(contract)) {
    return ['root must be a mapping'];
  }

  // ── shape ────────────────────────────────────────────────────────────────
  if (typeof contract.version !== 'string' || !contract.version.trim()) errs.push('version must be a non-empty string');
  if (typeof contract.external_source_id !== 'string' || !contract.external_source_id.trim()) {
    errs.push('external_source_id must be a non-empty string');
  }
  const repo = contract.repo;
  if (!repo || typeof repo !== 'object' || Array.isArray(repo)) {
    errs.push('repo must be a mapping');
  } else {
    if (typeof repo.owner !== 'string' || !repo.owner.trim()) errs.push('repo.owner must be a non-empty string');
    if (typeof repo.name !== 'string' || !repo.name.trim()) errs.push('repo.name must be a non-empty string');
    // ── 1. read-only invariant ──────────────────────────────────────────────
    if (repo.write_forbidden !== true) errs.push('repo.write_forbidden must be true (read-only invariant)');
  }
  if (contract.read_only !== true) errs.push('read_only must be true (this is a READ-ONLY source)');

  // ── 2. secret-gate ─────────────────────────────────────────────────────────
  if (contract.read_surface !== 'committed-remote-tree') {
    errs.push("read_surface must be 'committed-remote-tree' (the secret-gate by construction — never the local clone with uncommitted .env)");
  }
  const denylist = Array.isArray(contract.secret_denylist) ? contract.secret_denylist : null;
  if (!denylist || denylist.length === 0) {
    errs.push('secret_denylist must be a non-empty array');
  } else if (!denylist.some((p) => typeof p === 'string' && p.includes('.env'))) {
    errs.push("secret_denylist must cover '.env' (the must-have secret pattern)");
  }

  // ── 5. read modes ──────────────────────────────────────────────────────────
  const modes = Array.isArray(contract.read_modes) ? contract.read_modes : null;
  if (!modes || modes.length === 0) {
    errs.push('read_modes must be a non-empty array');
  } else {
    let liveActive = 0;
    modes.forEach((m, i) => {
      if (!m || typeof m !== 'object' || Array.isArray(m)) { errs.push(`read_modes[${i}] must be a mapping`); return; }
      if (typeof m.id !== 'string' || !m.id.trim()) errs.push(`read_modes[${i}].id must be a non-empty string`);
      if (!KNOWN_MODE_STATUS.includes(m.status)) {
        errs.push(`read_modes[${i}] (${m.id}): unknown status '${m.status}' (known: ${KNOWN_MODE_STATUS.join(', ')})`);
      }
      if (m.status === 'active' && m.freshness === 'live') liveActive += 1;
    });
    if (liveActive < 1) {
      errs.push("read_modes must include >=1 'active' mode with freshness 'live' (the zero-cost v1 ground-truth mode)");
    }
  }

  // ── consumer_allowlist shape ───────────────────────────────────────────────
  const allowlist = Array.isArray(contract.consumer_allowlist) ? contract.consumer_allowlist : null;
  if (!allowlist || allowlist.length === 0) errs.push('consumer_allowlist must be a non-empty array');

  // ── 3 + 4. external-source registration + allowlist no-drift ───────────────
  const sources = extSources && Array.isArray(extSources.sources) ? extSources.sources : null;
  if (!sources) {
    errs.push('external-sources.yaml has no sources array — cannot verify registration');
  } else if (typeof contract.external_source_id === 'string') {
    const src = sources.find((s) => s && s.id === contract.external_source_id);
    if (!src) {
      errs.push(`external_source_id '${contract.external_source_id}' is NOT registered in external-sources.yaml`);
    } else {
      if (src.source_type !== 'code-repo-readonly') {
        errs.push(`external source '${src.id}': source_type must be 'code-repo-readonly', got '${src.source_type}'`);
      }
      if (src.status !== 'active') {
        errs.push(`external source '${src.id}': status must be 'active', got '${src.status}'`);
      }
      // allowlist no-drift: contract.consumer_allowlist == source.role_scope
      if (allowlist) {
        const scope = Array.isArray(src.role_scope) ? src.role_scope : null;
        if (!scope) {
          errs.push(`external source '${src.id}': role_scope must be an array to match consumer_allowlist`);
        } else {
          const a = [...allowlist].sort();
          const b = [...scope].sort();
          if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
            errs.push(`consumer_allowlist DRIFT: contract=[${a.join(', ')}] vs external-source role_scope=[${b.join(', ')}]`);
          }
        }
      }
    }
  }

  return errs;
}

function main() {
  if (!fs.existsSync(CONTRACT)) {
    console.error('[FAIL] product-code-source: knowledge/product-code-source-contract.yaml missing.');
    process.exit(1);
  }
  let contract, extSources;
  try {
    contract = yaml.load(fs.readFileSync(CONTRACT, 'utf-8')) || {};
  } catch (e) {
    console.error(`[FAIL] product-code-source: contract YAML parse error: ${e.message}`);
    process.exit(1);
  }
  try {
    extSources = fs.existsSync(EXT_SOURCES) ? yaml.load(fs.readFileSync(EXT_SOURCES, 'utf-8')) : null;
  } catch (e) {
    console.error(`[FAIL] product-code-source: external-sources.yaml parse error: ${e.message}`);
    process.exit(1);
  }

  const errs = validateContract(contract, extSources);
  if (errs.length) {
    console.error(`[FAIL] product-code-source-contract: ${errs.length} issue(s):`);
    for (const m of errs) console.error('  - ' + m);
    process.exit(1);
  }

  const modes = contract.read_modes.map((m) => `${m.id}:${m.status}`).join(', ');
  console.log(
    `[PASS] product-code-source-contract (read-only, secret-gated remote tree; ` +
      `${contract.consumer_allowlist.length} roles; modes: ${modes}; ` +
      `external-source registered + no allowlist drift)`,
  );
  process.exit(0);
}

if (require.main === module) main();

module.exports = { validateContract, KNOWN_MODE_STATUS };
