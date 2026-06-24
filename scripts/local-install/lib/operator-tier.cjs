'use strict';
/**
 * scripts/local-install/lib/operator-tier.cjs
 *
 * Pure operator-tier resolution for the multi-user-auth capability (Sprint 0,
 * advisory). Given an operator email + the registry (governance/operators.yaml)
 * + the tier map (knowledge/operator-tiers.yaml), answers "may this human do X?"
 *
 * Sprint 0 = ADVISORY (a UX gate + the contract). Sprint 1 wires the SAME logic
 * to the server-side per-human credential (the broker reads the verified tier
 * claim, not a self-asserted env var). This module is therefore the reference
 * decision function; it must FAIL CLOSED (deny on any uncertainty).
 *
 * No I/O in the core — registry + tiers are passed in (the CLI/caller loads them).
 */

/** Normalize an email for comparison (trim + lowercase). */
function normEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : null;
}

/** Find an operator by email (case-insensitive). Returns the record or null. */
function resolveOperator(email, registry) {
  const target = normEmail(email);
  if (!target || !registry || !Array.isArray(registry.operators)) return null;
  return registry.operators.find((o) => o && normEmail(o.email) === target) || null;
}

function mergeList(into, from) {
  if (into.includes('*')) return into;
  for (const x of from || []) {
    // Wildcard collapses the list — mutate `into` IN PLACE (callers rely on the
    // reference, not the return value), so set length 0 then push '*'.
    if (x === '*') { into.length = 0; into.push('*'); return into; }
    if (!into.includes(x)) into.push(x);
  }
  return into;
}

/**
 * Merge a tier's grants with everything it inherits (owner ⊇ admin ⊇ user).
 * Returns the effective grant object, or null if the tier is unknown.
 * Wildcards ("*") in any list collapse that list to ["*"]. Booleans OR upward,
 * EXCEPT publish.requires_hitl, which takes the operator's OWN tier value
 * (owner=false even though it inherits admin=true).
 */
function effectiveTier(tierName, tiersDoc) {
  const tiers = tiersDoc && tiersDoc.tiers;
  if (!tiers || !tiers[tierName]) return null;
  const chain = [];
  const seen = new Set();
  let cur = tierName;
  while (cur && tiers[cur] && !seen.has(cur)) {
    seen.add(cur);
    chain.push(tiers[cur]);
    cur = tiers[cur].inherits;
  }
  const merged = {
    commands: { allow: [], system: [] },
    mcp: { read: [], write: [] },
    db_schemas: { read: [], write: [] },
    git: { tier1_edit: false, merge_main: false, push_branch: false },
    publish: { external_stores: false, brand_channels: false, requires_hitl: true },
    user_management: false,
  };
  for (const t of chain) {
    mergeList(merged.commands.allow, (t.commands && t.commands.allow) || []);
    mergeList(merged.commands.system, (t.commands && t.commands.system) || []);
    mergeList(merged.mcp.read, (t.mcp && t.mcp.read) || []);
    mergeList(merged.mcp.write, (t.mcp && t.mcp.write) || []);
    mergeList(merged.db_schemas.read, (t.db_schemas && t.db_schemas.read) || []);
    mergeList(merged.db_schemas.write, (t.db_schemas && t.db_schemas.write) || []);
    if (t.git) {
      merged.git.tier1_edit = merged.git.tier1_edit || !!t.git.tier1_edit;
      merged.git.merge_main = merged.git.merge_main || !!t.git.merge_main;
      merged.git.push_branch = merged.git.push_branch || !!t.git.push_branch;
    }
    if (t.publish) {
      merged.publish.external_stores = merged.publish.external_stores || !!t.publish.external_stores;
      merged.publish.brand_channels = merged.publish.brand_channels || !!t.publish.brand_channels;
    }
    merged.user_management = merged.user_management || !!t.user_management;
  }
  // requires_hitl = the operator's OWN tier value (chain[0]), not inherited.
  if (chain[0] && chain[0].publish && typeof chain[0].publish.requires_hitl === 'boolean') {
    merged.publish.requires_hitl = chain[0].publish.requires_hitl;
  }
  return merged;
}

function listAllows(list, value) {
  return Array.isArray(list) && (list.includes('*') || list.includes(value));
}

/**
 * The decision function. FAIL CLOSED.
 * @param {string} email
 * @param {{kind:string, value?:string}} cap - e.g. {kind:'command', value:'write'},
 *   {kind:'mcp-write', value:'supabase-ops'}, {kind:'db-write', value:'ops'},
 *   {kind:'git-tier1'}, {kind:'git-merge'}, {kind:'publish-brand'},
 *   {kind:'publish-store'}, {kind:'user-management'}.
 * @param {object} registry - parsed operators.yaml
 * @param {object} tiersDoc - parsed operator-tiers.yaml
 * @returns {{allow:boolean, reason:string, tier:string|null}}
 */
function can(email, cap, registry, tiersDoc) {
  const op = resolveOperator(email, registry);
  if (!op) return { allow: false, reason: 'not an enrolled operator', tier: null };
  if (op.status !== 'active') return { allow: false, reason: `operator status is "${op.status}" (not active)`, tier: op.tier || null };
  const eff = effectiveTier(op.tier, tiersDoc);
  if (!eff) return { allow: false, reason: `unknown tier "${op.tier}"`, tier: op.tier || null };
  if (!cap || typeof cap !== 'object') return { allow: false, reason: 'no capability specified', tier: op.tier };

  let allow = false;
  switch (cap.kind) {
    case 'command': allow = listAllows(eff.commands.allow, cap.value); break;
    case 'mcp-read': allow = listAllows(eff.mcp.read, cap.value); break;
    case 'mcp-write': allow = listAllows(eff.mcp.write, cap.value); break;
    case 'db-read': allow = listAllows(eff.db_schemas.read, cap.value); break;
    case 'db-write': allow = listAllows(eff.db_schemas.write, cap.value); break;
    case 'git-tier1': allow = eff.git.tier1_edit; break;
    case 'git-merge': allow = eff.git.merge_main; break;
    case 'git-push-branch': allow = eff.git.push_branch; break;
    case 'publish-store': allow = eff.publish.external_stores; break;
    case 'publish-brand': allow = eff.publish.brand_channels; break;
    case 'user-management': allow = eff.user_management; break;
    default: allow = false; // unknown capability kind → fail closed
  }
  return {
    allow,
    reason: allow ? `${op.tier} grants ${cap.kind}${cap.value ? ':' + cap.value : ''}` : `${op.tier} does not grant ${cap.kind}${cap.value ? ':' + cap.value : ''}`,
    tier: op.tier,
  };
}

module.exports = { normEmail, resolveOperator, effectiveTier, can };
