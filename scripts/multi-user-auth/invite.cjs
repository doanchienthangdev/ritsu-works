'use strict';
/**
 * scripts/multi-user-auth/invite.cjs  (capability multi-user-auth)
 *
 * OWNER helper: invite a co-founder via the deployed operator-broker Edge Function,
 * so you don't hand-craft a curl. Reads YOUR owner access token from the per-human
 * credential file the supabase-ops MCP maintains, POSTs {action:'invite'}, and
 * prints the single-use magic-link for you to forward.
 *
 *   node scripts/multi-user-auth/invite.cjs <email> --tier=admin
 *   node scripts/multi-user-auth/invite.cjs <email> --tier=user
 *   node scripts/multi-user-auth/invite.cjs --list                 # list operators
 *   node scripts/multi-user-auth/invite.cjs --whoami               # verify you're owner
 *
 * Requires SUPABASE_URL (ritsu-ops) + a live owner access token (from
 * RITSU_OPERATOR_ACCESS_TOKEN, or the access_token in RITSU_OPERATOR_REFRESH_TOKEN_FILE,
 * or runtime/secrets/.operator-refresh.json). Never prints secret values.
 * `/users add` still owns the governance/operators.yaml PR — run that too.
 */
const fs = require('node:fs');
const path = require('node:path');

const REF = 'mntobbmieuoaxipnjaau'; // ritsu-ops
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (name, def) => {
  const a = args.find((x) => x.startsWith(name + '='));
  return a ? a.slice(name.length + 1) : def;
};
const positional = args.find((a) => !a.startsWith('-'));

function repoRoot() {
  const cwd = process.cwd();
  const MARKER = `${path.sep}.claude${path.sep}worktrees${path.sep}`;
  return cwd.includes(MARKER) ? cwd.slice(0, cwd.indexOf(MARKER)) : cwd;
}
function parseEnvLocal() {
  const p = path.join(repoRoot(), 'runtime', 'secrets', '.env.local');
  const out = {};
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v[0] === '"' || v[0] === "'") { const q = v[0]; const e = v.indexOf(q, 1); v = e === -1 ? v.slice(1) : v.slice(1, e); }
    else { const c = v.search(/\s#/); if (c !== -1) v = v.slice(0, c); v = v.trim(); }
    out[m[1]] = v;
  }
  return out;
}
function ownerAccessToken(env) {
  if (env.RITSU_OPERATOR_ACCESS_TOKEN) return env.RITSU_OPERATOR_ACCESS_TOKEN;
  const file = env.RITSU_OPERATOR_REFRESH_TOKEN_FILE || path.join(repoRoot(), 'runtime', 'secrets', '.operator-refresh.json');
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (typeof j.access_token === 'string' && j.access_token) return j.access_token;
  } catch { /* fall through */ }
  return null;
}

async function broker(url, token, body) {
  const r = await fetch(`${url}/functions/v1/operator-broker`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, ok: r.ok, body: j };
}

(async () => {
  const env = parseEnvLocal();
  const url = env.SUPABASE_URL || env.SUPABASE_OPS_URL || '';
  if (!url.includes(REF)) throw new Error(`SUPABASE_URL is not the ritsu-ops project (${REF}) — refusing`);
  const token = ownerAccessToken(env);
  if (!token) throw new Error('no owner access token found (start Claude Code so supabase-ops persists one, or set RITSU_OPERATOR_ACCESS_TOKEN)');

  if (has('--whoami')) {
    const r = await broker(url, token, { action: 'whoami' });
    console.log(JSON.stringify(r.body, null, 2));
    process.exit(r.ok ? 0 : 1);
  }
  if (has('--list')) {
    const r = await broker(url, token, { action: 'list' });
    console.log(JSON.stringify(r.body, null, 2));
    process.exit(r.ok ? 0 : 1);
  }

  const email = positional;
  const tier = val('--tier', 'admin');
  if (!email) throw new Error('usage: invite.cjs <email> --tier=admin|user   (or --whoami | --list)');
  if (tier !== 'admin' && tier !== 'user') throw new Error(`--tier must be admin or user (got "${tier}"); owner cannot be minted via the broker`);

  // Confirm we are owner first (clear error instead of a raw 403).
  const who = await broker(url, token, { action: 'whoami' });
  const callerTier = who.body && who.body.caller && who.body.caller.tier;
  if (!who.ok) throw new Error(`whoami failed (${who.status}) — token may be expired; restart Claude Code to refresh: ${JSON.stringify(who.body)}`);
  if (callerTier !== 'owner') throw new Error(`you are tier="${callerTier}", not owner — only an owner may invite`);

  const r = await broker(url, token, { action: 'invite', email, tier });
  if (!r.ok) throw new Error(`invite failed (${r.status}): ${JSON.stringify(r.body)}`);
  const link = r.body && r.body.magic_link;
  console.log(`\n✅ invited ${email} as ${tier}.`);
  if (link) {
    console.log('\nForward this single-use magic-link to the co-founder (no email is sent):\n');
    console.log('  ' + link + '\n');
    console.log('They run:  node scripts/multi-user-auth/enroll.cjs "<that link>"');
  } else {
    console.log('No magic_link returned:', JSON.stringify(r.body));
  }
  console.log('\nReminder: also run  /users add ' + email + ' --tier=' + tier + '  (the governance/operators.yaml PR).');
  process.exit(0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
