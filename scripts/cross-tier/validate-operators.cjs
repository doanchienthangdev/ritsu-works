#!/usr/bin/env node
'use strict';
/**
 * L2 validator — operator registry coherence (capability multi-user-auth, Sprint 0).
 *
 * Checks governance/operators.yaml against knowledge/operator-tiers.yaml + invariants:
 *   - shape: version + operators[] with required fields
 *   - tier ∈ the tiers declared in operator-tiers.yaml (owner/admin/user)
 *   - status ∈ {invited, active, revoked, expired}
 *   - emails unique (case-insensitive)
 *   - ≥1 ACTIVE owner exists (else the system has no root of trust → FAIL)
 *   - added_by references an existing operator who is an owner
 *     (genesis exception: added_by === own email AND tier === owner)
 *   - NO secrets in the file (no key/token/password-looking values)
 *
 * Pure core `validateOperators(operatorsDoc, tiersDoc)` → {ok, errors[]} is
 * exported for unit testing; the CLI wrapper loads the files + prints + exits.
 *
 * Exit: 0 clean, 1 critical drift, 2 setup error.
 */

const VALID_STATUSES = ['invited', 'active', 'revoked', 'expired'];
const SECRET_HINT = /(key|token|secret|password|bearer)\s*[:=]\s*\S{12,}/i;

/**
 * Pure validation. `operatorsDoc` = parsed operators.yaml; `tiersDoc` = parsed
 * operator-tiers.yaml (for the valid tier set). Returns { ok, errors:[strings] }.
 */
function validateOperators(operatorsDoc, tiersDoc) {
  const errors = [];

  if (!operatorsDoc || typeof operatorsDoc !== 'object') {
    return { ok: false, errors: ['operators.yaml did not parse to an object'] };
  }
  if (!operatorsDoc.version || typeof operatorsDoc.version !== 'string') {
    errors.push('missing/invalid `version`');
  }
  const ops = operatorsDoc.operators;
  if (!Array.isArray(ops)) {
    return { ok: false, errors: [...errors, '`operators` must be an array'] };
  }

  const validTiers = tiersDoc && tiersDoc.tiers && typeof tiersDoc.tiers === 'object'
    ? Object.keys(tiersDoc.tiers)
    : ['user', 'admin', 'owner'];

  const seenEmails = new Set();
  const ownerEmails = new Set();
  const activeOwnerEmails = new Set();

  // First pass: shape + collect owners.
  ops.forEach((op, i) => {
    const at = `operators[${i}]`;
    if (!op || typeof op !== 'object') { errors.push(`${at} is not an object`); return; }
    const email = typeof op.email === 'string' ? op.email.trim().toLowerCase() : null;
    if (!email) errors.push(`${at} missing/invalid \`email\``);
    if (email) {
      if (seenEmails.has(email)) errors.push(`${at} duplicate email (case-insensitive): ${op.email}`);
      seenEmails.add(email);
    }
    if (!validTiers.includes(op.tier)) errors.push(`${at} unknown tier "${op.tier}" (valid: ${validTiers.join('/')})`);
    if (!VALID_STATUSES.includes(op.status)) errors.push(`${at} unknown status "${op.status}" (valid: ${VALID_STATUSES.join('/')})`);
    if (typeof op.added_by !== 'string' || !op.added_by.trim()) errors.push(`${at} missing \`added_by\``);
    if (typeof op.added_at !== 'string' || !op.added_at.trim()) errors.push(`${at} missing \`added_at\``);
    if (op.github_login !== undefined && typeof op.github_login !== 'string') errors.push(`${at} \`github_login\` must be a string`);
    // secret canary — this file must never carry credentials
    for (const [k, v] of Object.entries(op)) {
      if (typeof v === 'string' && SECRET_HINT.test(`${k}: ${v}`)) errors.push(`${at} looks like it contains a secret in "${k}" — secrets belong in ops.operators, never here`);
    }
    if (email && op.tier === 'owner') {
      ownerEmails.add(email);
      if (op.status === 'active') activeOwnerEmails.add(email);
    }
  });

  // Second pass: added_by must reference an existing owner (genesis self-root allowed).
  ops.forEach((op, i) => {
    if (!op || typeof op !== 'object') return;
    const email = typeof op.email === 'string' ? op.email.trim().toLowerCase() : null;
    const addedBy = typeof op.added_by === 'string' ? op.added_by.trim().toLowerCase() : null;
    if (!addedBy) return;
    const isGenesis = email && addedBy === email && op.tier === 'owner';
    if (isGenesis) return;
    if (!ownerEmails.has(addedBy)) {
      errors.push(`operators[${i}] (${op.email}) added_by "${op.added_by}" is not an owner in this registry (only owners may add operators)`);
    }
  });

  if (activeOwnerEmails.size === 0) {
    errors.push('NO active owner — the registry must have ≥1 active owner (root of trust)');
  }

  return { ok: errors.length === 0, errors };
}

module.exports = { validateOperators, VALID_STATUSES };

// ---- CLI ----------------------------------------------------------------
if (require.main === module) {
  const fs = require('node:fs');
  const path = require('node:path');
  let yaml;
  try { yaml = require('js-yaml'); } catch {
    console.error('  ✗ js-yaml not installed (run pnpm install)');
    process.exit(2);
  }
  const ROOT = path.resolve(__dirname, '..', '..');
  const opsPath = path.join(ROOT, 'governance', 'operators.yaml');
  const tiersPath = path.join(ROOT, 'knowledge', 'operator-tiers.yaml');
  if (!fs.existsSync(opsPath)) { console.error(`  ✗ ${opsPath} missing`); process.exit(2); }
  let operatorsDoc, tiersDoc;
  try { operatorsDoc = yaml.load(fs.readFileSync(opsPath, 'utf8')); } catch (e) { console.error(`  ✗ operators.yaml parse error: ${e.message}`); process.exit(1); }
  try { tiersDoc = fs.existsSync(tiersPath) ? yaml.load(fs.readFileSync(tiersPath, 'utf8')) : null; } catch { tiersDoc = null; }

  const { ok, errors } = validateOperators(operatorsDoc, tiersDoc);
  if (ok) {
    const n = Array.isArray(operatorsDoc.operators) ? operatorsDoc.operators.length : 0;
    const owners = operatorsDoc.operators.filter((o) => o && o.tier === 'owner' && o.status === 'active').length;
    console.log(`  ✓ operators registry coherent  (${n} operator(s), ${owners} active owner(s))`);
    process.exit(0);
  }
  console.log('  ✗ operator registry drift:');
  for (const e of errors) console.log(`    - ${e}`);
  process.exit(1);
}
