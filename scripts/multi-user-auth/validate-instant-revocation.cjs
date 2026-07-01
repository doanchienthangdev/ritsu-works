'use strict';
/**
 * scripts/multi-user-auth/validate-instant-revocation.cjs
 *
 * Post-apply LIVE validation for migration 00050 (DB-side instant revocation,
 * Sprint 3). Run this AFTER applying 00050 to ritsu-ops, to prove that:
 *   1. a genesis owner (tier=owner, NOT enrolled in ops.operators) is NOT locked out;
 *   2. an enrolled active admin is allowed;
 *   3. revoking that admin (ops.operators.status='revoked') DENIES the SAME
 *      still-valid access token immediately (closing the ~1h stale-token window);
 *   4. the off-JWT (service-role) path is unaffected (is_owner() falsy, no error).
 *
 * It does NOT apply any DDL. It creates + deletes throwaway *@example.com Auth users
 * and ops.operators rows, and uses ops_run_select_rls (the real per-human read path).
 *
 * Usage (from the repo root, with creds in runtime/secrets/.env.local):
 *   set -a; . runtime/secrets/.env.local; set +a
 *   node scripts/multi-user-auth/validate-instant-revocation.cjs
 *
 * Requires SUPABASE_URL (ritsu-ops), SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY.
 * Never prints secret values. Exit 0 = all checks pass.
 */

// @supabase/supabase-js is a WORKSPACE dependency (mcp-server), NOT hoisted to the
// repo root, so a bare require from this root-level script fails. Resolve it from
// whichever workspace provides it. Run `pnpm install` if none is found.
const { createRequire } = require('node:module');
const nodePath = require('node:path');
function loadCreateClient() {
  const repoRoot = nodePath.join(__dirname, '..', '..');
  // A createRequire base is resolved relative to its DIRECTORY; the file need not exist.
  const bases = [
    __filename,
    nodePath.join(repoRoot, 'mcp-server', 'noop.js'),
    nodePath.join(repoRoot, 'mcp-server-analytics', 'noop.js'),
    nodePath.join(repoRoot, 'noop.js'),
  ];
  for (const base of bases) {
    try { return createRequire(base)('@supabase/supabase-js').createClient; } catch { /* try next */ }
  }
  throw new Error(
    "@supabase/supabase-js not found. It lives in the mcp-server workspace — run `pnpm install` " +
    "(or `cd mcp-server && pnpm install`) at the repo root, then re-run this script.",
  );
}
const createClient = loadCreateClient();

const REF = 'mntobbmieuoaxipnjaau'; // ritsu-ops
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

if (!URL_ || !URL_.includes(REF)) throw new Error('SUPABASE_URL is not the allowlisted ritsu-ops project — refusing');
if (!SERVICE || !ANON) throw new Error('missing SUPABASE_SERVICE_KEY / SUPABASE_ANON_KEY');

let pass = 0, fail = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); pass++; };
const bad = (m) => { console.log(`  ✗ ${m}`); fail++; };

const svc = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const hdr = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };

async function createUser(email, tier) {
  const r = await fetch(`${URL_}/auth/v1/admin/users`, { method: 'POST', headers: hdr, body: JSON.stringify({ email, email_confirm: true, app_metadata: { tier } }) });
  const j = await r.json();
  if (!j.id) throw new Error(`createUser ${r.status} ${JSON.stringify(j)}`);
  return j.id;
}
async function mint(email) {
  const g = await fetch(`${URL_}/auth/v1/admin/generate_link`, { method: 'POST', headers: hdr, body: JSON.stringify({ type: 'magiclink', email }) });
  const gj = await g.json();
  const th = gj.properties?.hashed_token ?? gj.hashed_token;
  const v = await fetch(`${URL_}/auth/v1/verify`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'email', token_hash: th }) });
  const vj = await v.json();
  if (!vj.access_token) throw new Error(`verify ${v.status} ${JSON.stringify(vj)}`);
  return vj.access_token;
}
async function delUser(id) { await fetch(`${URL_}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: hdr }).catch(() => {}); }
async function asOperator(token, sqlText) {
  const c = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  return c.schema('ops').rpc('ops_run_select_rls', { sql_text: sqlText });
}

async function main() {
  const created = [];
  const ts = Date.now();
  try {
    // (a) genesis OWNER (tier=owner, NOT enrolled) → NOT locked out
    const ownerEmail = `mua-s3-owner-${ts}@example.com`;
    created.push(await createUser(ownerEmail, 'owner'));
    const ownerTok = await mint(ownerEmail);
    let r = await asOperator(ownerTok, 'select ops.is_owner() as ok');
    if (!r.error && r.data?.rows?.[0]?.ok === true) ok('[owner/genesis-not-enrolled] is_owner() = true (NOT locked out)');
    else bad(`[owner] is_owner()=${JSON.stringify(r.data?.rows?.[0])} err=${r.error?.message}`);

    // (b) ADMIN enrolled active → allowed
    const adminEmail = `mua-s3-admin-${ts}@example.com`;
    const adminId = await createUser(adminEmail, 'admin');
    created.push(adminId);
    await svc.schema('ops').from('operators').insert({ email: adminEmail, tier: 'admin', status: 'active', supabase_user_id: adminId, added_by: 'sprint3-validation' });
    const adminTok = await mint(adminEmail);
    r = await asOperator(adminTok, 'select ops.is_admin_or_above() as ok');
    if (!r.error && r.data?.rows?.[0]?.ok === true) ok('[admin/active] is_admin_or_above() = true (allowed)');
    else bad(`[admin/active] = ${JSON.stringify(r.data?.rows?.[0])} err=${r.error?.message}`);
    r = await asOperator(adminTok, 'select count(*)::int as n from ops.agent_runs');
    const beforeN = r.data?.rows?.[0]?.n;
    if (!r.error && typeof beforeN === 'number') ok(`[admin/active] reads ops.agent_runs (n=${beforeN})`);
    else bad(`[admin/active] agent_runs read failed: ${r.error?.message}`);

    // (c) REVOKE → SAME still-valid token now DENIED (instant revocation)
    await svc.schema('ops').from('operators').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('email', adminEmail);
    r = await asOperator(adminTok, 'select ops.is_admin_or_above() as ok');
    if (!r.error && r.data?.rows?.[0]?.ok === false) ok('[admin/REVOKED] is_admin_or_above() = FALSE with the SAME token (INSTANT REVOCATION)');
    else bad(`[admin/revoked] expected false, got ${JSON.stringify(r.data?.rows?.[0])} err=${r.error?.message}`);
    r = await asOperator(adminTok, 'select count(*)::int as n from ops.agent_runs');
    const afterN = r.data?.rows?.[0]?.n;
    if (afterN === 0 || afterN === undefined) ok(`[admin/REVOKED] ops.agent_runs starved (n=${afterN ?? 'denied'}, was ${beforeN})`);
    else bad(`[admin/revoked] still reads ${afterN} rows — revocation FAILED`);
  } finally {
    await svc.schema('ops').from('operators').delete().ilike('email', 'mua-s3-%@example.com');
    for (const id of created) await delUser(id);
  }
  console.log(`\ninstant-revocation validation: ${fail === 0 ? 'PASS' : 'FAIL'} (${pass} passed, ${fail} failed)`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
