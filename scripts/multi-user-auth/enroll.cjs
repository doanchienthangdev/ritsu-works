'use strict';
/**
 * scripts/multi-user-auth/enroll.cjs  (capability multi-user-auth)
 *
 * CO-FOUNDER helper: complete per-human enrollment in one command, instead of
 * hand-copying tokens out of a browser URL. Give it the owner-forwarded magic-link;
 * it follows the link to obtain your Supabase session (access + refresh token),
 * writes your credential file (runtime/secrets/.operator-refresh.json), and POSTs
 * {action:'redeem'} to flip your ops.operators row invited→active.
 *
 *   node scripts/multi-user-auth/enroll.cjs "<magic-link>"
 *   # Fallback if the link was already opened in a browser (single-use): paste the
 *   # tokens from the browser URL fragment (#access_token=…&refresh_token=…):
 *   node scripts/multi-user-auth/enroll.cjs --refresh-token=<rt> --access-token=<at> [--force]
 *
 * Requires SUPABASE_URL (ritsu-ops) in runtime/secrets/.env.local (from install
 * --profile=per-human + your fill). Do NOT also click the magic-link in a browser —
 * it is single-use; let THIS command consume it. Never prints secret values.
 *
 * NOTE on the fallback: passing tokens as CLI args puts live secrets in your shell
 * history + process listing (`ps`). Prefer the magic-link form. Do NOT re-run the
 * fallback with an OLD refresh token once the MCP has booted once (Supabase rotates
 * refresh tokens on use) — that overwrites the live token with a dead one; the guard
 * below refuses it unless you pass --force.
 */
const fs = require('node:fs');
const path = require('node:path');

const REF = 'mntobbmieuoaxipnjaau'; // ritsu-ops
const args = process.argv.slice(2);
const val = (name) => { const a = args.find((x) => x.startsWith(name + '=')); return a ? a.slice(name.length + 1) : null; };
const magicLink = args.find((a) => !a.startsWith('-'));

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

/** Follow a Supabase magic-link (action_link) and pull {access_token, refresh_token}
 *  out of the redirect's URL fragment. Does not require a browser (magiclink is not PKCE).
 *  Refuses a link whose host is not the ritsu-ops Supabase project (a legitimate
 *  action_link always resolves under <ref>.supabase.co) — closes a confused-deputy
 *  where a socially-engineered link points at an attacker host. */
async function tokensFromMagicLink(link) {
  let host;
  try { host = new URL(link).host; } catch { throw new Error(`not a valid URL: ${String(link).slice(0, 60)}…`); }
  if (!host.includes(REF)) {
    throw new Error(`magic-link host "${host}" is not the ritsu-ops project (${REF}) — refusing to follow it. A real invite link always points at ${REF}.supabase.co.`);
  }
  const r = await fetch(link, { redirect: 'manual' });
  const loc = r.headers.get('location');
  if (!loc) throw new Error(`magic-link did not redirect (status ${r.status}); it may be expired/consumed — ask the owner to re-invite`);
  const hashIdx = loc.indexOf('#');
  const frag = hashIdx === -1 ? '' : loc.slice(hashIdx + 1);
  const q = new URLSearchParams(frag);
  const err = q.get('error') || q.get('error_description');
  if (err) throw new Error(`magic-link error: ${decodeURIComponent(err)} — likely expired/single-use-consumed; ask the owner to re-invite`);
  const access = q.get('access_token');
  const refresh = q.get('refresh_token');
  if (!access || !refresh) throw new Error(`magic-link redirect had no tokens (redirect=${loc.split('#')[0]}#…); paste them manually with --refresh-token= --access-token=`);
  return { access, refresh };
}

async function broker(url, token, body) {
  const res = await fetch(`${url}/functions/v1/operator-broker`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await res.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: res.status, ok: res.ok, body: j };
}

function credentialFilePath(env) {
  return env.RITSU_OPERATOR_REFRESH_TOKEN_FILE || path.join(repoRoot(), 'runtime', 'secrets', '.operator-refresh.json');
}

/** Does the credential file already hold a refresh token? (used to guard the manual path) */
function existingRefreshToken(file) {
  try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); return typeof j.refresh_token === 'string' && j.refresh_token ? j.refresh_token : null; }
  catch { return null; }
}

/** Atomic 0600 write: temp file (born 0600) + rename over the target — never leaves a
 *  partial file and never truncates-in-place with stale perms (mirrors the MCP's
 *  persistRefreshToken). */
function writeCredentialFile(env, refresh) {
  const file = credentialFilePath(env);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  const body = JSON.stringify({ refresh_token: refresh, updated_at: new Date().toISOString() }, null, 2) + '\n';
  fs.writeFileSync(tmp, body, { encoding: 'utf8', mode: 0o600 });
  try { fs.chmodSync(tmp, 0o600); } catch { /* no-op on Windows */ }
  fs.renameSync(tmp, file);
  return file;
}

(async () => {
  const env = parseEnvLocal();
  const url = env.SUPABASE_URL || env.SUPABASE_OPS_URL || '';
  if (!url.includes(REF)) throw new Error(`SUPABASE_URL is not the ritsu-ops project (${REF}) in runtime/secrets/.env.local — run install --profile=per-human first and fill SUPABASE_URL`);

  let access, refresh;
  const rtFlag = val('--refresh-token');
  const atFlag = val('--access-token');
  const force = args.includes('--force');
  if (rtFlag) {
    refresh = rtFlag; access = atFlag; // manual fallback (access optional but needed for redeem)
    // Footgun guard: overwriting a LIVE refresh token with a possibly-stale one (Supabase
    // rotates on use) breaks the next MCP boot. Refuse unless --force.
    const existing = existingRefreshToken(credentialFilePath(env));
    if (existing && existing !== rtFlag && !force) {
      throw new Error('a refresh token already exists in your credential file — refusing to overwrite it with a command-line token (it may be stale; Supabase rotates refresh tokens on use). If you are sure this token is newer, re-run with --force.');
    }
    console.log('using tokens passed on the command line (⚠ they are now in your shell history / process list)');
  } else if (magicLink) {
    console.log('following the magic-link to obtain your session … (⚠ this CONSUMES the single-use link — do not also open it in a browser)');
    ({ access, refresh } = await tokensFromMagicLink(magicLink));
    console.log('got a session ✓');
  } else {
    throw new Error('usage: enroll.cjs "<magic-link>"   OR   enroll.cjs --refresh-token=<rt> --access-token=<at> [--force]');
  }

  const file = writeCredentialFile(env, refresh);
  console.log(`wrote credential file: ${file}`);

  if (!access) {
    console.log('\n⚠️  No access token available to call redeem. The credential file is seeded; start Claude Code (supabase-ops will refresh + persist an access token), then run:');
    console.log('   node scripts/multi-user-auth/enroll.cjs --refresh-token=<rt> --access-token=<the access_token now in the credential file>');
    process.exit(0);
  }

  const r = await broker(url, access, { action: 'redeem' });
  if (!r.ok) {
    if (r.status === 404) {
      throw new Error(
        `redeem: not_invited — the owner has not run invite.cjs for your email yet. ` +
        `Your credential file IS already seeded (${file}), so nothing is lost: ask the owner to run ` +
        `\`invite.cjs <you> --tier=…\`, then complete redeem WITHOUT re-consuming the (spent) link by running ` +
        `\`enroll.cjs --refresh-token=<the refresh_token in ${file}>\` — start Claude Code first so supabase-ops ` +
        `mints a fresh access token. (${JSON.stringify(r.body)})`,
      );
    }
    throw new Error(`redeem failed (${r.status}): ${JSON.stringify(r.body)}`);
  }
  console.log('\n✅ enrolled + redeemed:', JSON.stringify(r.body));
  console.log('\nNext: run  node scripts/local-install/doctor.cjs  then fully restart Claude Code and approve the MCP servers.');
  process.exit(0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
