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
 * SECOND CHECK — public MATERIALIZED VIEWs (added 2026-06-30, audit finding
 * D1-1/D1-2). A SECURITY INVOKER function relies on RLS for protection, which is
 * why the secdef rule above (intentionally) skips INVOKER functions. But the
 * per-human read RPC `ops.ops_run_select_rls` (00049) is an `authenticated`-
 * reachable INVOKER that runs caller-supplied SELECT with `public` in its
 * search_path, and a MATERIALIZED VIEW *cannot carry RLS*. So any public matview
 * left readable by `authenticated`/`anon` (the Supabase default grant) is PII-
 * exposed via that path (and via PostgREST). This scanner therefore ALSO fails if
 * any MATERIALIZED VIEW in `public` is not REVOKEd from BOTH `authenticated` and
 * `anon` (same fail-safe model as functions: exposed-by-default → must opt out).
 * The deny is a REVOKE, not RLS, because matviews can't be RLS-gated. See 00051.
 *
 * KNOWN STATIC-ANALYSIS LIMITS (forward-drift hygiene, shared with the function
 * check): this guard folds only DDL/ACL statements present in the migration SQL.
 * It does NOT model `WITH GRANT OPTION`, schema-wide `GRANT … ON ALL TABLES`, a
 * `CASCADE/RESTRICT` modifier on a REVOKE, or a matview created OUTSIDE the
 * committed migrations. ritsu-ops `public` currently has exactly one matview
 * (mv_customer_360, declared in 00007) and no such patterns, so these do not
 * affect the current repo; a future migration using them would need its own
 * coverage. Only matviews in schema `public` (unqualified or `public.`-prefixed)
 * are checked — a matview in another schema is intentionally out of scope.
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

// Public MATERIALIZED VIEWs (the second check). A matview lives in `public`
// (default schema) unless qualified; we track by bare name (optional `public.`).
const CREATE_MATVIEW = /^CREATE\s+MATERIALIZED\s+VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?\b/i;
const DROP_MATVIEW = /^DROP\s+MATERIALIZED\s+VIEW\s+(?:IF\s+EXISTS\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?\b/i;
// GRANT/REVOKE on a non-function object (TABLE/VIEW/MATERIALIZED VIEW). Excludes
// `ON FUNCTION …` so it never shadows the function grant/revoke handling above.
const GRANT_OBJ = /^GRANT\b[\s\S]*?\bON\s+(?!FUNCTION\b)(?:TABLE\s+)?(?:MATERIALIZED\s+VIEW\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s+TO\b/i;
const REVOKE_OBJ = /^REVOKE\b[\s\S]*?\bON\s+(?!FUNCTION\b)(?:TABLE\s+)?(?:MATERIALIZED\s+VIEW\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s+FROM\b/i;

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

// Fail-safe default for a public matview: a freshly-created public object is
// SELECT-able by authenticated + anon (Supabase default privileges) until a
// migration explicitly REVOKEs each. Matviews can't carry RLS, so REVOKE is the
// only deny.
function freshMatviewState(name) {
  return { name, defined: false, authRead: false, anonRead: false, definedFile: null };
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

  const matviews = new Map();
  const getMv = (name) => {
    if (!matviews.has(name)) matviews.set(name, freshMatviewState(name));
    return matviews.get(name);
  };
  // PUBLIC pseudo-role covers authenticated + anon for object SELECT.
  const clearObjReads = (mv, grantees) => {
    if (grantees.includes('public') || grantees.includes('authenticated')) mv.authRead = false;
    if (grantees.includes('public') || grantees.includes('anon')) mv.anonRead = false;
  };
  const setObjReads = (mv, grantees) => {
    if (grantees.includes('public') || grantees.includes('authenticated')) mv.authRead = true;
    if (grantees.includes('public') || grantees.includes('anon')) mv.anonRead = true;
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
      } else if ((m = CREATE_MATVIEW.exec(stmt))) {
        const mv = getMv(m[1]);
        const firstTime = !mv.defined;
        mv.defined = true;
        if (!mv.definedFile) mv.definedFile = file;
        // Only a FIRST create establishes the default authenticated/anon read
        // grant (CREATE … IF NOT EXISTS re-run preserves the ACL).
        if (firstTime) { mv.authRead = true; mv.anonRead = true; }
      } else if ((m = DROP_MATVIEW.exec(stmt))) {
        matviews.delete(m[1]);
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
      } else if ((m = GRANT_OBJ.exec(stmt))) {
        // Only meaningful for objects we track (public matviews); ignore others.
        if (matviews.has(m[1])) setObjReads(getMv(m[1]), parseGrantees(stmt));
      } else if ((m = REVOKE_OBJ.exec(stmt))) {
        if (matviews.has(m[1])) clearObjReads(getMv(m[1]), parseGrantees(stmt));
      }
    }
  }

  return {
    functions,
    matviews,
    offenses: [...computeOffenses(functions), ...computeMatviewOffenses(matviews)],
  };
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

// A public matview that is still SELECT-able by authenticated or anon is PII-
// exposed (matviews can't carry RLS; the per-human INVOKER read path resolves
// them). Must REVOKE from BOTH roles (or DROP the matview) to clear.
function computeMatviewOffenses(matviews) {
  const offenses = [];
  for (const mv of matviews.values()) {
    if (!mv.defined) continue;
    if (mv.authRead || mv.anonRead) {
      const exposedTo = [mv.authRead && 'authenticated', mv.anonRead && 'anon'].filter(Boolean).join(', ');
      offenses.push({ name: mv.name, reason: 'public_matview_exposed', searchPath: exposedTo, file: mv.definedFile });
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
  const { functions, matviews, offenses } = result;

  if (offenses.length === 0) {
    const secdef = [...functions.values()].filter((s) => s.defined && s.securityDefiner);
    const mvs = [...matviews.values()].filter((mv) => mv.defined);
    console.log(
      `[OK] validate-secdef-rpc-exposure: ${secdef.length} SECURITY DEFINER function(s) in schema ops` +
        (secdef.length ? ` (${secdef.map((s) => s.name).join(', ')})` : '') +
        '; none expose public/unpinned search_path to authenticated/PUBLIC. ' +
        `${mvs.length} public matview(s)` +
        (mvs.length ? ` (${mvs.map((mv) => mv.name).join(', ')})` : '') +
        '; none readable by authenticated/anon.',
    );
    process.exit(0);
  }

  console.error('[FAIL] RLS-bypass / PII-exposure drift in schema ops/public:');
  for (const o of offenses) {
    if (o.reason === 'public_matview_exposed') {
      console.error(`  ✗ public.${o.name}  (matview, defined in ${o.file})`);
      console.error(`      MATERIALIZED VIEW still SELECT-able by [${o.searchPath}] — matviews cannot carry RLS`);
      continue;
    }
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
  console.error('  A public MATERIALIZED VIEW reachable by the per-human INVOKER read path must:');
  console.error('    REVOKE ALL ON public.<matview> FROM authenticated, anon;  (matviews cannot carry RLS — see 00051)');
  console.error('  See migrations 00047 + 00051 + governance/HITL.md (Tier C schema change).');
  process.exit(1);
}

module.exports = {
  stripAndSplitStatements,
  headerOf,
  extractSearchPath,
  parseGrantees,
  analyzeMigrations,
  computeOffenses,
  computeMatviewOffenses,
  analyzeRepo,
};

if (require.main === module) main();
