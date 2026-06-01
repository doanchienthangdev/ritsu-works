#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-secdef-rpc-exposure.cjs
 *
 * Security drift guard (L2-critical). Statically scans supabase/migrations/*.sql
 * and FAILS if any SECURITY DEFINER function in schema `ops` is left in the
 * RLS-bypass / PII-exposure configuration that migration 00047 closed:
 *
 *   SECURITY DEFINER  +  ('public' in its search_path  OR  no pinned
 *   search_path at all)  +  still EXECUTE-able by `authenticated` / PUBLIC.
 *
 * Why this is dangerous: a SECURITY DEFINER function runs as its owner
 * (postgres, BYPASSRLS). If `public` is reachable from its search_path AND any
 * `authenticated` JWT can call it, the caller can read public.customers /
 * public.persons (PII) and all of ops.* / metrics.* bypassing the RLS policies
 * in 00010_rls_policies.sql. An unpinned search_path is at least as dangerous
 * (classic mutable-search_path privilege escalation). See migration 00047.
 *
 * Fail-safe model of "executable by authenticated":
 *   `ops` is an API-exposed Supabase schema, so Postgres' default EXECUTE-to-
 *   PUBLIC grant AND Supabase's default privileges (auto-grant to anon /
 *   authenticated on every new function) BOTH make a freshly-created function
 *   reachable by `authenticated`. We therefore treat every CREATEd function as
 *   authenticated-executable UNLESS a migration explicitly REVOKEs EXECUTE from
 *   PUBLIC + authenticated. This forces every secdef-in-ops function to opt
 *   OUT of public reachability rather than relying on an implicit grant nobody
 *   sees in the SQL.
 *
 * The scanner folds the EFFECTIVE final state of each function across all
 * migrations in filename order (CREATE / CREATE OR REPLACE / ALTER FUNCTION /
 * GRANT / REVOKE / DROP), so a hardening migration that runs AFTER the original
 * CREATE (exactly what 00047 does) clears the flag.
 *
 * Registered in scripts/check-consistency.cjs L2-critical list.
 * Exit 0 = clean, 1 = exposure drift detected, 2 = script error.
 *
 * Pure functions are exported for unit testing (tests/cross-tier/).
 */

const fs = require('fs');
const path = require('path');

const { MIGRATIONS_DIR, listMigrationFiles } = require('../lib/read-migrations.cjs');

// ---------------------------------------------------------------------------
// 1. Tokenizer — split SQL into top-level statements, dollar-quote aware.
// ---------------------------------------------------------------------------
// Comments (-- and /* */) OUTSIDE dollar-quotes are collapsed to whitespace.
// Single-quoted string literals and dollar-quoted bodies are preserved verbatim
// so that `;`, `--`, and keywords inside a function body never split a
// statement or get mistaken for a SECURITY clause.
function stripAndSplitStatements(sql) {
  const statements = [];
  let cur = '';
  let i = 0;
  const n = sql.length;
  let dollarTag = null; // e.g. "$$" or "$func$" while inside a dollar body

  while (i < n) {
    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        cur += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
      } else {
        cur += sql[i++];
      }
      continue;
    }

    const two = sql[i] + (sql[i + 1] || '');

    // line comment → whitespace
    if (two === '--') {
      while (i < n && sql[i] !== '\n') i++;
      cur += ' ';
      continue;
    }
    // block comment → whitespace
    if (two === '/*') {
      i += 2;
      while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      cur += ' ';
      continue;
    }
    // single-quoted string literal (preserve; handle '' escape)
    if (sql[i] === "'") {
      cur += sql[i++];
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") { cur += "''"; i += 2; continue; }
        if (sql[i] === "'") { cur += sql[i++]; break; }
        cur += sql[i++];
      }
      continue;
    }
    // dollar-quote open ($$ or $tag$)
    if (sql[i] === '$') {
      const m = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (m) {
        dollarTag = m[0];
        cur += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }
    // top-level statement terminator
    if (sql[i] === ';') {
      if (cur.trim()) statements.push(cur.trim());
      cur = '';
      i++;
      continue;
    }
    cur += sql[i++];
  }
  if (cur.trim()) statements.push(cur.trim());
  return statements;
}

// ---------------------------------------------------------------------------
// 2. Small parsers for the fields we care about.
// ---------------------------------------------------------------------------

// The "header" of a CREATE FUNCTION statement = everything before the body
// (first dollar-quote tag, or an `AS '...'` quoted body). The header is where
// SECURITY DEFINER and SET search_path live.
function headerOf(statement) {
  const m = /\$[A-Za-z0-9_]*\$/.exec(statement);
  let head = m ? statement.slice(0, m.index) : statement;
  const asQuote = head.search(/\bAS\s+'/i);
  if (asQuote !== -1) head = head.slice(0, asQuote);
  return head;
}

// Returns an array of lowercased search_path elements, or null if `text` has no
// `SET search_path` clause (i.e. unpinned in this clause).
function extractSearchPath(text) {
  const m = /\bSET\s+search_path\s*(?:=|TO)\s*([^\n;]+)/i.exec(text);
  if (!m) return null;
  let raw = m[1];
  raw = raw.split(/\bAS\b/i)[0];
  raw = raw.split(/\bLANGUAGE\b/i)[0];
  raw = raw.split('$')[0];
  return raw
    .split(',')
    .map((s) => s.trim().replace(/^["']+|["']+$/g, '').toLowerCase())
    .filter(Boolean);
}

// Roles named after TO/FROM in a GRANT/REVOKE statement (lowercased; PUBLIC →
// 'public').
function parseGrantees(statement) {
  const m = /\b(?:TO|FROM)\s+([\s\S]+)$/i.exec(statement);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/;+$/, '').replace(/^["']+|["']+$/g, '').toLowerCase())
    .filter(Boolean);
}

const CREATE_FN = /^CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+ops\.([a-z_][a-z0-9_]*)\s*\(/i;
const ALTER_FN = /^ALTER\s+FUNCTION\s+ops\.([a-z_][a-z0-9_]*)\s*\(/i;
const DROP_FN = /^DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?ops\.([a-z_][a-z0-9_]*)\b/i;
const GRANT_FN = /^GRANT\b[\s\S]*?\bON\s+FUNCTION\s+ops\.([a-z_][a-z0-9_]*)\b/i;
const REVOKE_FN = /^REVOKE\b[\s\S]*?\bON\s+FUNCTION\s+ops\.([a-z_][a-z0-9_]*)\b/i;

// ---------------------------------------------------------------------------
// 3. Folder — compute effective final state per ops.<function>.
// ---------------------------------------------------------------------------
function freshState(name) {
  return {
    name,
    defined: false,
    securityDefiner: false,
    searchPath: undefined, // array of path elements, or null when unpinned
    publicExec: false, // PUBLIC has EXECUTE
    authExec: false, // `authenticated` has explicit EXECUTE
    definedFile: null,
  };
}

/**
 * @param {{file: string, sql: string}[]} migrations  ordered by filename
 * @returns {{functions: Map<string, object>, offenses: object[]}}
 */
function analyzeMigrations(migrations) {
  const functions = new Map();
  const get = (name) => {
    if (!functions.has(name)) functions.set(name, freshState(name));
    return functions.get(name);
  };

  for (const { file, sql } of migrations) {
    for (const stmt of stripAndSplitStatements(sql)) {
      let m;
      if ((m = CREATE_FN.exec(stmt))) {
        const st = get(m[1]);
        const firstTime = !st.defined;
        st.defined = true;
        if (!st.definedFile) st.definedFile = file;
        const head = headerOf(stmt);
        // CREATE OR REPLACE redefines SECURITY + SET clauses; re-read both.
        st.securityDefiner = /\bSECURITY\s+DEFINER\b/i.test(head);
        st.searchPath = extractSearchPath(head); // array | null (unpinned)
        // REPLACE preserves the existing ACL; only a first CREATE establishes
        // the default PUBLIC/authenticated reachability of an exposed schema.
        if (firstTime) st.publicExec = true;
      } else if ((m = DROP_FN.exec(stmt))) {
        functions.delete(m[1]);
      } else if ((m = ALTER_FN.exec(stmt))) {
        const st = get(m[1]);
        if (/\bRESET\s+search_path\b/i.test(stmt)) {
          st.searchPath = null;
        } else {
          const sp = extractSearchPath(stmt);
          if (sp !== null) st.searchPath = sp;
        }
        if (/\bSECURITY\s+DEFINER\b/i.test(stmt)) st.securityDefiner = true;
        else if (/\bSECURITY\s+INVOKER\b/i.test(stmt)) st.securityDefiner = false;
      } else if ((m = GRANT_FN.exec(stmt))) {
        const st = get(m[1]);
        const g = parseGrantees(stmt);
        if (g.includes('public')) st.publicExec = true;
        if (g.includes('authenticated')) st.authExec = true;
      } else if ((m = REVOKE_FN.exec(stmt))) {
        const st = get(m[1]);
        const g = parseGrantees(stmt);
        if (g.includes('public')) st.publicExec = false;
        if (g.includes('authenticated')) st.authExec = false;
      }
    }
  }

  return { functions, offenses: computeOffenses(functions) };
}

function computeOffenses(functions) {
  const offenses = [];
  for (const st of functions.values()) {
    if (!st.defined || !st.securityDefiner) continue;
    const executableByAuthenticated = st.publicExec || st.authExec;
    if (!executableByAuthenticated) continue;
    if (st.searchPath === null || st.searchPath === undefined) {
      offenses.push({ name: st.name, reason: 'unpinned_search_path', searchPath: null, file: st.definedFile });
    } else if (st.searchPath.includes('public')) {
      offenses.push({ name: st.name, reason: 'public_in_search_path', searchPath: st.searchPath.join(', '), file: st.definedFile });
    }
  }
  return offenses;
}

// ---------------------------------------------------------------------------
// 4. Repo entry points.
// ---------------------------------------------------------------------------
function readRepoMigrations() {
  return listMigrationFiles().map((f) => ({
    file: f,
    sql: fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'),
  }));
}

function analyzeRepo() {
  return analyzeMigrations(readRepoMigrations());
}

function main() {
  let result;
  try {
    result = analyzeRepo();
  } catch (e) {
    console.error(`[ERROR] validate-secdef-rpc-exposure: ${e.message}`);
    process.exit(2);
  }
  const { functions, offenses } = result;

  if (offenses.length === 0) {
    const secdef = [...functions.values()].filter((s) => s.defined && s.securityDefiner);
    console.log(
      `[OK] validate-secdef-rpc-exposure: ${secdef.length} SECURITY DEFINER function(s) in schema ops` +
        (secdef.length ? ` (${secdef.map((s) => s.name).join(', ')})` : '') +
        '; none expose public/unpinned search_path to authenticated/PUBLIC.',
    );
    process.exit(0);
  }

  console.error('[FAIL] SECURITY DEFINER RLS-bypass / PII-exposure drift in schema ops:');
  for (const o of offenses) {
    const what =
      o.reason === 'public_in_search_path'
        ? `search_path includes 'public' [${o.searchPath}]`
        : 'no pinned search_path (mutable — privilege-escalation risk)';
    console.error(`  ✗ ops.${o.name}  (defined in ${o.file})`);
    console.error(`      SECURITY DEFINER + ${what} + executable by authenticated/PUBLIC`);
  }
  console.error('');
  console.error(
    '  A SECURITY DEFINER function in schema ops that is reachable by `authenticated` must:',
  );
  console.error("    1. REVOKE EXECUTE ... FROM PUBLIC, authenticated, anon;  (keep service_role)");
  console.error("    2. pin search_path WITHOUT 'public' (e.g. `SET search_path = ops, metrics, pg_temp`).");
  console.error('  See migration 00047 + governance/HITL.md (Tier C schema change).');
  process.exit(1);
}

module.exports = {
  stripAndSplitStatements,
  headerOf,
  extractSearchPath,
  parseGrantees,
  analyzeMigrations,
  computeOffenses,
  analyzeRepo,
};

if (require.main === module) main();
