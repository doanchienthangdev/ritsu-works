'use strict';
/**
 * scripts/multi-user-auth/invite.cjs  (capability multi-user-auth)
 *
 * OWNER helper: invite a co-founder via the deployed operator-broker Edge Function,
 * so you don't hand-craft a curl. Reads YOUR owner access token from the per-human
 * credential file the supabase-ops MCP maintains, POSTs {action:'invite'}, and
 * prints the next step.
 *
 *   node scripts/multi-user-auth/invite.cjs <email> --tier=admin
 *   node scripts/multi-user-auth/invite.cjs <email> --tier=user
 *   node scripts/multi-user-auth/invite.cjs --list                 # list operators
 *   node scripts/multi-user-auth/invite.cjs --whoami               # verify you're owner
 *   node scripts/multi-user-auth/invite.cjs <email> --tier=admin --reseed          # force a fresh owner token first
 *   node scripts/multi-user-auth/invite.cjs <email> --tier=admin --reseed=<owner>  # …for a specific owner mailbox
 *
 * SELF-HEALING owner token (learned 2026-07-03): the owner access token is
 * refreshed ONLY by the supabase-ops MCP booting per-human at the MAIN ROOT, and a
 * prior boot can rotate the refresh token without persisting the replacement — so
 * invite.cjs used to fail with a broker 401 "Invalid JWT". Now, when it detects a
 * stale/missing/rejected owner token AND SUPABASE_SERVICE_KEY is present, it
 * auto-reseeds a fresh owner session (service_role; nothing revoked) and retries.
 * `--reseed` forces this up front.
 *
 * Requires SUPABASE_URL (ritsu-ops); an owner access token (from
 * RITSU_OPERATOR_ACCESS_TOKEN, or the access_token in the credential file) OR
 * SUPABASE_SERVICE_KEY to auto-reseed one. Never prints secret values.
 * `/users add` still owns the governance/operators.yaml PR — run that too.
 */

const fs = require('node:fs');
const path = require('node:path');
const S = require('./lib/session.cjs');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (name, def) => {
  const a = args.find((x) => x.startsWith(name + '='));
  return a ? a.slice(name.length + 1) : def;
};

/** Owner access token: explicit env override wins, else the credential file. */
function ownerAccessToken(env, credFile) {
  if (env.RITSU_OPERATOR_ACCESS_TOKEN) return env.RITSU_OPERATOR_ACCESS_TOKEN;
  const cred = S.readCredential(credFile);
  return (cred && cred.access_token) || null;
}

/** Active owner emails from governance/operators.yaml (best-effort; js-yaml may be
 *  absent in some contexts → []). Used only as a last-resort reseed target. */
function activeOwnersFromRegistry(root) {
  try {
    // eslint-disable-next-line global-require
    const yaml = require('js-yaml');
    const doc = yaml.load(fs.readFileSync(path.join(root, 'governance', 'operators.yaml'), 'utf8'));
    const ops = (doc && Array.isArray(doc.operators) && doc.operators) || [];
    return ops
      .filter((o) => o && o.tier === 'owner' && o.status === 'active' && typeof o.email === 'string')
      .map((o) => o.email.toLowerCase());
  } catch {
    return [];
  }
}

/** Decide which owner email to reseed. Precedence: explicit --reseed=<email> >
 *  RITSU_OWNER_EMAIL > the (possibly-expired) credential token's own email claim >
 *  a SOLE active owner in operators.yaml. Ambiguous (≥2 owners, no hint) → null. */
function resolveOwnerEmailForReseed({ reseedVal, env, credAccessToken, root, owners }) {
  if (reseedVal && typeof reseedVal === 'string') return reseedVal.toLowerCase();
  if (env.RITSU_OWNER_EMAIL) return env.RITSU_OWNER_EMAIL.toLowerCase();
  const fromToken = S.decodeJwt(credAccessToken).email;
  if (fromToken) return fromToken;
  const list = owners || activeOwnersFromRegistry(root);
  return list.length === 1 ? list[0] : null;
}

/** Ensure we hold a usable owner access token, auto-reseeding when stale/missing
 *  (or when forced). Returns {token, reseeded}. Throws with actionable guidance
 *  when it can neither find nor mint one. */
async function ensureOwnerToken({ url, env, credFile, root, serviceKey, reseedVal, forceReseed, fetchImpl, log }) {
  let token = ownerAccessToken(env, credFile);
  const stale = !token || S.isAccessTokenStale(token);
  if (!forceReseed && !stale) return { token, reseeded: false };

  if (!serviceKey) {
    if (!token) {
      throw new Error(
        'no owner access token, and no SUPABASE_SERVICE_KEY to auto-reseed one. ' +
          'Start Claude Code at the MAIN ROOT (the supabase-ops MCP refreshes + persists a token), ' +
          'or run: node scripts/multi-user-auth/reseed-owner.cjs <your-owner-email>.',
      );
    }
    log('⚠ owner token looks stale and no service_role to auto-reseed — trying it anyway; if it 401s, restart Claude Code at the main root (or set SUPABASE_SERVICE_KEY).');
    return { token, reseeded: false };
  }

  const ownerEmail = resolveOwnerEmailForReseed({ reseedVal, env, credAccessToken: token, root });
  if (!ownerEmail) {
    throw new Error('could not determine which owner mailbox to reseed — re-run with --reseed=<your-owner-email>.');
  }
  const reason = !token ? 'is missing' : stale ? 'is stale' : 'refresh forced';
  log(`↻ owner token ${reason} — reseeding a fresh owner session for ${ownerEmail} (service_role; nothing revoked) …`);
  await S.reseedOwnerCredential({ url, serviceKey, email: ownerEmail, file: credFile, fetchImpl });
  token = ownerAccessToken(env, credFile);
  if (!token) throw new Error('reseed did not yield an access token (unexpected) — run reseed-owner.cjs manually.');
  log('↻ reseeded ✓');
  return { token, reseeded: true };
}

/** Call the broker; on a 401 (a token that looked fresh by exp but the server
 *  rejects — e.g. a rotated/dead session) reseed ONCE and retry, when possible. */
async function brokerWithReseedRetry({ url, tokenRef, body, env, credFile, root, serviceKey, fetchImpl, log }) {
  let r = await S.brokerCall({ url, token: tokenRef.token, body, fetchImpl });
  if (r.status === 401 && serviceKey && !tokenRef.reseeded) {
    const ownerEmail = resolveOwnerEmailForReseed({ reseedVal: null, env, credAccessToken: tokenRef.token, root });
    if (ownerEmail) {
      log(`↻ broker returned 401 — the owner token was rejected; reseeding ${ownerEmail} and retrying once …`);
      await S.reseedOwnerCredential({ url, serviceKey, email: ownerEmail, file: credFile, fetchImpl });
      tokenRef.token = ownerAccessToken(env, credFile);
      tokenRef.reseeded = true;
      r = await S.brokerCall({ url, token: tokenRef.token, body, fetchImpl });
    }
  }
  return r;
}

/** Orchestration, DI'd for tests. Returns an exit code (0 ok, 1 fail). */
async function inviteMain(argv, opts = {}) {
  const { fetchImpl = fetch, log = console.log } = opts;
  const a = argv.slice(2);
  const hasFlag = (f) => a.includes(f);
  const valFlag = (name, def) => {
    const x = a.find((y) => y.startsWith(name + '='));
    return x ? x.slice(name.length + 1) : def;
  };
  const positional = a.find((x) => !x.startsWith('-'));

  const root = opts.root || S.repoRoot();
  const env = opts.env || S.parseEnvLocal(root);
  const url = env.SUPABASE_URL || env.SUPABASE_OPS_URL || '';
  if (!url.includes(S.REF)) throw new Error(`SUPABASE_URL is not the ritsu-ops project (${S.REF}) — refusing`);

  const credFile = S.credentialFilePath(env, root);
  const serviceKey = env.SUPABASE_SERVICE_KEY || '';
  const reseedVal = valFlag('--reseed', null);
  const forceReseed = hasFlag('--reseed') || reseedVal !== null;

  const ensured = await ensureOwnerToken({ url, env, credFile, root, serviceKey, reseedVal, forceReseed, fetchImpl, log });
  // Track whether we already reseeded so the 401-retry below can't double-reseed.
  const tokenRef = { token: ensured.token, reseeded: forceReseed || ensured.reseeded };

  const broker = (body) => brokerWithReseedRetry({ url, tokenRef, body, env, credFile, root, serviceKey, fetchImpl, log });

  if (hasFlag('--whoami')) {
    const r = await broker({ action: 'whoami' });
    log(JSON.stringify(r.body, null, 2));
    return r.ok ? 0 : 1;
  }
  if (hasFlag('--list')) {
    const r = await broker({ action: 'list' });
    log(JSON.stringify(r.body, null, 2));
    return r.ok ? 0 : 1;
  }

  const email = positional;
  const tier = valFlag('--tier', 'admin');
  if (!email) throw new Error('usage: invite.cjs <email> --tier=admin|user   (or --whoami | --list)');
  if (tier !== 'admin' && tier !== 'user') {
    throw new Error(`--tier must be admin or user (got "${tier}"); owner cannot be minted via the broker`);
  }

  // Confirm we are owner first (clear error instead of a raw 403).
  const who = await broker({ action: 'whoami' });
  if (!who.ok) {
    throw new Error(`whoami failed (${who.status}) — token may be expired/rejected; try --reseed (needs SUPABASE_SERVICE_KEY) or restart Claude Code: ${JSON.stringify(who.body)}`);
  }
  const callerTier = who.body && who.body.caller && who.body.caller.tier;
  if (callerTier !== 'owner') throw new Error(`you are tier="${callerTier}", not owner — only an owner may invite`);

  const r = await broker({ action: 'invite', email, tier });
  if (!r.ok) throw new Error(`invite failed (${r.status}): ${JSON.stringify(r.body)}`);
  const link = r.body && r.body.magic_link;

  log(`\n✅ invited ${email} as ${tier}.`);
  log(`\nNext — DELIVER the enrollment. Two paths:`);
  log(`\n  ▶ DEFAULT (prefetch-proof, recommended):`);
  log(`      node scripts/multi-user-auth/mint.cjs ${email}`);
  log(`    → writes a 0600 file with a token-based enroll COMMAND (no url for a chat/email`);
  log(`      preview to consume). cat it and send the single line to ${email}.`);
  log(`\n  ▷ FALLBACK (raw magic-link — fragile: any link-preview consumes it):`);
  if (link) {
    log(`      forward this single-use link, they run  enroll.cjs "<link>":`);
    log(`      ${link}`);
  } else {
    log(`      (no magic_link returned: ${JSON.stringify(r.body)})`);
  }
  log(`\nReminder: also run  /users add ${email} --tier=${tier}  (the governance/operators.yaml PR).`);
  return 0;
}

if (require.main === module) {
  inviteMain(process.argv)
    .then((code) => process.exit(code))
    .catch((e) => {
      console.error('FATAL:', e.message);
      process.exit(1);
    });
}

module.exports = {
  inviteMain,
  ownerAccessToken,
  activeOwnersFromRegistry,
  resolveOwnerEmailForReseed,
  ensureOwnerToken,
  brokerWithReseedRetry,
};
