#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-analytics-readonly.cjs
 *
 * L2-CRITICAL validator for capability `product-db-readonly-access` (Door 2).
 * Checks the COMMITTED ops-side contract (knowledge/analytics-sync-contract.yaml)
 * for the invariants that are deterministically checkable from this repo:
 *
 *   1. no-content-in-sync   — synced_tables ∩ forbidden_content_tables == ∅
 *                             (content/identity tables must NEVER be synced)
 *   2. allowlist-no-drift   — contract.consumer_allowlist == the ANALYTICS_ALLOWED_ROLES
 *                             Set in mcp-server-analytics/src/governance/role-allowlist.ts
 *   3. mcp-registered       — contract.mcp_server is present in .mcp.json mcpServers
 *   4. shape                — read_surface_schema == 'live'; consumer + product_export roles set
 *   5. sync_all-no-drift    — the live.sync_all() table array in
 *                             mcp-server-analytics/sql/analytics-machinery.sql == synced_tables
 *                             (as a set). A table in the contract but not in sync_all() never
 *                             syncs (silent data gap); a table in sync_all() but not in the
 *                             contract bypasses check 1 (no-content-in-sync).
 *
 * (The product-side invariants — "no direct-identifier/JSONB/*_token column in any
 * analytics_export.* view", "salt product-only", "PII-canary per text col" — live in
 * the Product DB + a local-only SQL file and CANNOT be checked from the ops repo; they
 * are enforced product-side and documented in SOP-AIOPS-009. This validator covers the
 * ops-side, repo-checkable subset.)
 *
 * Registered in BOTH scripts/check-consistency.cjs (local `pnpm check`) AND
 * .github/workflows/cross-tier-consistency.yml (CI runs a hand-picked subset — the
 * two-edit rule). Exit 0 = pass, 1 = drift.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONTRACT = path.join(REPO_ROOT, 'knowledge', 'analytics-sync-contract.yaml');
const ALLOWLIST_TS = path.join(
  REPO_ROOT,
  'mcp-server-analytics',
  'src',
  'governance',
  'role-allowlist.ts',
);
const MCP_JSON = path.join(REPO_ROOT, '.mcp.json');
const MACHINERY_SQL = path.join(REPO_ROOT, 'mcp-server-analytics', 'sql', 'analytics-machinery.sql');

function fail(msg, extra) {
  console.error(`[FAIL] analytics-sync-contract: ${msg}`);
  if (extra && extra.length) for (const x of extra) console.error('  - ' + x);
  process.exit(1);
}

/** Extract the string members of `new Set([ ... ])` from the allowlist .ts source. */
function parseAllowlistTs(src) {
  const m = src.match(/ANALYTICS_ALLOWED_ROLES[^=]*=\s*new Set\(\s*\[([\s\S]*?)\]\s*\)/);
  if (!m) return null;
  const inner = m[1];
  const roles = [];
  const re = /["']([^"']+)["']/g;
  let g;
  while ((g = re.exec(inner)) !== null) roles.push(g[1]);
  return roles;
}

/**
 * Extract the quoted table names from the `tables text[] := array[ ... ]` literal
 * inside `create or replace procedure live.sync_all()`. Returns null when the
 * procedure or its array literal cannot be located (treated as a validation failure —
 * fail-closed, never "assume it matches").
 */
function parseSyncAllTables(src) {
  const m = src.match(
    /create\s+or\s+replace\s+procedure\s+live\.sync_all\s*\(\s*\)[\s\S]*?tables\s+text\s*\[\s*\]\s*:=\s*array\s*\[([^\]]*)\]/i,
  );
  if (!m) return null;
  const tables = [];
  const re = /'([^']+)'/g;
  let g;
  while ((g = re.exec(m[1])) !== null) tables.push(g[1]);
  return tables;
}

function main() {
  // ── load contract ──────────────────────────────────────────────────────
  if (!fs.existsSync(CONTRACT)) {
    fail('knowledge/analytics-sync-contract.yaml missing.');
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(CONTRACT, 'utf-8')) || {};
  } catch (e) {
    fail(`YAML parse error: ${e.message}`);
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    fail('root must be a mapping');
  }

  const errs = [];
  const synced = Array.isArray(doc.synced_tables) ? doc.synced_tables : null;
  const forbidden = Array.isArray(doc.forbidden_content_tables) ? doc.forbidden_content_tables : null;
  const allowlist = Array.isArray(doc.consumer_allowlist) ? doc.consumer_allowlist : null;

  // ── 4. shape ───────────────────────────────────────────────────────────
  if (!doc.project || doc.project.read_surface_schema !== 'live') {
    errs.push("project.read_surface_schema must be 'live' (the only readable schema)");
  }
  if (!doc.roles || typeof doc.roles.consumer !== 'string' || typeof doc.roles.product_export !== 'string') {
    errs.push('roles.consumer + roles.product_export must both be set');
  } else if (doc.roles.consumer !== 'analytics_reader') {
    errs.push(`roles.consumer must be "analytics_reader" (the least-priv MCP role), got "${doc.roles.consumer}"`);
  }
  if (!synced) errs.push('synced_tables must be an array');
  if (!forbidden) errs.push('forbidden_content_tables must be an array');
  if (!allowlist) errs.push('consumer_allowlist must be an array');
  if (typeof doc.mcp_server !== 'string' || !doc.mcp_server) errs.push('mcp_server must be set');

  // ── 1. no content table in the sync list ───────────────────────────────
  if (synced && forbidden) {
    const fset = new Set(forbidden);
    const leaked = synced.filter((t) => fset.has(t));
    if (leaked.length) {
      errs.push(`CONTENT TABLE(S) IN SYNC LIST (must never sync content/identity): ${leaked.join(', ')}`);
    }
  }

  // ── 2. allowlist drift vs role-allowlist.ts ────────────────────────────
  if (allowlist) {
    if (!fs.existsSync(ALLOWLIST_TS)) {
      errs.push(`mcp-server-analytics/src/governance/role-allowlist.ts missing — cannot verify allowlist`);
    } else {
      const tsRoles = parseAllowlistTs(fs.readFileSync(ALLOWLIST_TS, 'utf-8'));
      if (!tsRoles) {
        errs.push('could not parse ANALYTICS_ALLOWED_ROLES Set from role-allowlist.ts');
      } else {
        const a = [...allowlist].sort();
        const b = [...tsRoles].sort();
        if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
          errs.push(
            `consumer_allowlist DRIFT: contract=[${a.join(', ')}] vs role-allowlist.ts=[${b.join(', ')}]`,
          );
        }
      }
    }
  }

  // ── 3. mcp_server registered in .mcp.json ──────────────────────────────
  if (typeof doc.mcp_server === 'string' && doc.mcp_server) {
    if (!fs.existsSync(MCP_JSON)) {
      errs.push('.mcp.json missing — cannot verify mcp_server registration');
    } else {
      let mcp;
      try {
        mcp = JSON.parse(fs.readFileSync(MCP_JSON, 'utf-8'));
      } catch (e) {
        errs.push(`.mcp.json parse error: ${e.message}`);
      }
      if (mcp && (!mcp.mcpServers || !mcp.mcpServers[doc.mcp_server])) {
        errs.push(`mcp_server "${doc.mcp_server}" is NOT registered in .mcp.json mcpServers`);
      }
    }
  }

  // ── 5. sync_all() drift vs contract.synced_tables ──────────────────────
  // Sprint 5 grew the live proc 17 → 30 without touching the committed file; the
  // header calls it "idempotent — safe to re-apply", so re-applying would have
  // silently dropped 13 tables (incl. every revenue table). Pin both directions.
  if (synced) {
    if (!fs.existsSync(MACHINERY_SQL)) {
      errs.push('mcp-server-analytics/sql/analytics-machinery.sql missing — cannot verify sync_all()');
    } else {
      const syncAll = parseSyncAllTables(fs.readFileSync(MACHINERY_SQL, 'utf-8'));
      if (!syncAll) {
        errs.push('could not parse the live.sync_all() table array from analytics-machinery.sql');
      } else {
        const dupes = syncAll.filter((t, i) => syncAll.indexOf(t) !== i);
        if (dupes.length) errs.push(`sync_all() lists duplicate table(s): ${[...new Set(dupes)].join(', ')}`);

        const syncedSet = new Set(synced);
        const syncAllSet = new Set(syncAll);
        const missing = synced.filter((t) => !syncAllSet.has(t));
        const extra = syncAll.filter((t) => !syncedSet.has(t));
        if (missing.length) {
          errs.push(
            `sync_all() DRIFT — in contract.synced_tables but NOT synced (silent data gap): ${missing.join(', ')}`,
          );
        }
        if (extra.length) {
          errs.push(
            `sync_all() DRIFT — synced but NOT in contract.synced_tables (bypasses no-content-in-sync): ${extra.join(', ')}`,
          );
        }
      }
    }
  }

  if (errs.length) fail(`${errs.length} issue(s):`, errs);

  console.log(
    `[PASS] analytics-sync-contract (${synced.length} synced, ${allowlist.length} allowlisted roles; ` +
      `no content leak; allowlist + .mcp.json + sync_all() in sync)`,
  );
  process.exit(0);
}

module.exports = { parseAllowlistTs, parseSyncAllTables };

if (require.main === module) main();
