#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-resolver-axis-tags.cjs
 *
 * Capability: resolver-plan v1.0 (Sprint 2). L2 CRITICAL validator.
 *
 * Asserts the 2-axis split + axis-shaped enrichment is present + correct on every
 * ACTIVE catalog entry in knowledge/recipients/*.md:
 *   - `Axis` (→ entry.axis) is present AND equals axisForKind(kind) — the
 *     deterministic kind→axis map in scripts/resolver-v2/axis-map.cjs. A wrong or
 *     missing axis is the one thing a downstream planner (deepask) cannot recover
 *     from, so it gates CI.
 *   - capability-axis entries carry `HITL tier` (→ entry.hitl_tier). Missing tier →
 *     a side-effecting capability could be auto-run downstream; gate it.
 *   - content-axis entries carry `Authority` AND `Freshness`. A content recipient
 *     with no authority/freshness can't be trusted as a source-of-record.
 *   - meta-axis entries (the `capability` registry kind) need ONLY a valid axis.
 *
 * CONTENT-compare, NOT mtime: this loads + parses the catalog and compares the
 * emitted axis to the in-memory expected axis (axisForKind). It does NOT statSync
 * or compare file modification times — deliberately, to avoid the known worktree
 * INDEX-mtime false-positive (memory: resolver-v3 INDEX mtime check is local-only).
 *
 * Scope: only `status === 'active'` entries are checked. Stub/deprecated/planned
 * entries are intentionally skipped — they are not yet (or no longer) part of the
 * live planning surface, and the generator does not always enrich them.
 *
 * Exit 0 = pass; 1 = at least one axis-tag/enrichment violation (CI-blocking);
 *          2 = catalog could not be loaded (engine error).
 */

const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RECIPIENTS_DIR = path.join(REPO_ROOT, 'knowledge', 'recipients');

const { loadCatalog } = require(path.join(REPO_ROOT, 'scripts/resolver-v2/catalog-loader.cjs'));
const { axisForKind, AXES } = require(path.join(REPO_ROOT, 'scripts/resolver-v2/axis-map.cjs'));
const {
  VALID_HITL_TIERS,
  VALID_SIDE_EFFECTS,
  VALID_AUTHORITIES,
  VALID_FRESHNESS,
} = require(path.join(REPO_ROOT, 'scripts/resolver-v2/enrichment.cjs'));

const CAPABILITY_AXIS = 'capability';
const CONTENT_AXIS = 'content';
const META_AXIS = 'meta';

/**
 * Validate one already-parsed recipient. Pure: returns an array of violation
 * strings (empty = clean). Exported for unit tests so a hand-built entry can be
 * checked without writing files.
 *
 * @param {Object} r — a parsed Recipient (catalog-loader shape, with enrichment).
 * @returns {string[]} violation messages for this entry.
 */
function checkEntry(r) {
  const violations = [];
  const id = r.id || '<no-id>';

  // 1. Axis present.
  if (!r.axis) {
    violations.push(`${id}: missing Axis (expected "${safeAxisForKind(r.kind)}")`);
    return violations; // can't check the rest without an axis.
  }

  // 2. Axis is a recognized value.
  if (!AXES.includes(r.axis)) {
    violations.push(`${id}: invalid Axis "${r.axis}" (valid: ${AXES.join(', ')})`);
    return violations;
  }

  // 3. Axis matches the deterministic kind→axis map.
  let expectedAxis;
  try {
    expectedAxis = axisForKind(r.kind);
  } catch (e) {
    // Kind has no axis mapping at all — a programmer error (new kind unclassified).
    violations.push(`${id}: kind "${r.kind}" has no axis mapping (${e.code || e.message})`);
    return violations;
  }
  if (r.axis !== expectedAxis) {
    violations.push(`${id}: Axis "${r.axis}" != expected "${expectedAxis}" for kind "${r.kind}"`);
    // Continue checking enrichment against the DECLARED axis below, so the operator
    // sees every problem at once rather than one-at-a-time.
  }

  // 4. Axis-shaped enrichment presence + value validity.
  if (r.axis === CAPABILITY_AXIS) {
    if (!r.hitl_tier) {
      violations.push(`${id}: capability-axis entry missing "HITL tier"`);
    } else if (!VALID_HITL_TIERS.includes(r.hitl_tier)) {
      violations.push(`${id}: invalid HITL tier "${r.hitl_tier}" (valid: ${VALID_HITL_TIERS.join(', ')})`);
    }
    // Side effect is generator-emitted alongside tier; if present, it must be valid.
    if (r.side_effect !== undefined && !VALID_SIDE_EFFECTS.includes(r.side_effect)) {
      violations.push(`${id}: invalid Side effect "${r.side_effect}" (valid: ${VALID_SIDE_EFFECTS.join(', ')})`);
    }
  } else if (r.axis === CONTENT_AXIS) {
    if (!r.authority) {
      violations.push(`${id}: content-axis entry missing "Authority"`);
    } else if (!VALID_AUTHORITIES.includes(r.authority)) {
      violations.push(`${id}: invalid Authority "${r.authority}" (valid: ${VALID_AUTHORITIES.join(', ')})`);
    }
    if (!r.freshness) {
      violations.push(`${id}: content-axis entry missing "Freshness"`);
    } else if (!VALID_FRESHNESS.includes(r.freshness)) {
      violations.push(`${id}: invalid Freshness "${r.freshness}" (valid: ${VALID_FRESHNESS.join(', ')})`);
    }
  }
  // META_AXIS: axis-only; nothing further required.

  return violations;
}

/** axisForKind that never throws — for the error-message path only. */
function safeAxisForKind(kind) {
  try {
    return axisForKind(kind);
  } catch (_e) {
    return '?';
  }
}

/**
 * Validate a whole catalog object (already loaded). Pure over its input; returns
 * { violations, checked }. Exported for unit tests to pass a synthetic catalog.
 */
function checkCatalog(catalog) {
  const violations = [];
  let checked = 0;
  for (const r of catalog.recipients) {
    if (r.status !== 'active') continue; // only the live planning surface.
    checked += 1;
    for (const v of checkEntry(r)) violations.push(v);
  }
  return { violations, checked };
}

function main() {
  if (!fs.existsSync(RECIPIENTS_DIR)) {
    console.error(`[FAIL] knowledge/recipients/ missing at ${RECIPIENTS_DIR}`);
    process.exit(2);
  }

  let catalog;
  try {
    catalog = loadCatalog({ skipCache: true });
  } catch (e) {
    console.error(`[FAIL] catalog load: ${e.code || ''} ${e.message}`);
    process.exit(2);
  }

  const { violations, checked } = checkCatalog(catalog);

  if (violations.length === 0) {
    console.log(`[PASS] axis tags valid on ${checked} active recipients (META/${META_AXIS} axis-only; capability→hitl_tier; content→authority+freshness)`);
    process.exit(0);
  }

  console.error(`[FAIL] ${violations.length} axis-tag/enrichment violation(s):`);
  for (const v of violations.slice(0, 30)) console.error('  -', v);
  if (violations.length > 30) console.error(`  ... and ${violations.length - 30} more`);
  process.exit(1);
}

// Exported helpers for unit tests; only run main() when invoked as a script.
module.exports = { checkEntry, checkCatalog };

if (require.main === module) {
  main();
}
