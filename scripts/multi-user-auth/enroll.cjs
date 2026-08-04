'use strict';
/**
 * scripts/multi-user-auth/enroll.cjs  (capability multi-user-auth)
 *
 * CO-FOUNDER helper: complete per-human enrollment in one command, instead of
 * hand-copying tokens out of a browser URL. Two input shapes:
 *
 *   node scripts/multi-user-auth/enroll.cjs --refresh-token=<rt> --access-token=<at> [--force]
 *       # DEFAULT today: the owner ran mint.cjs and sent you this token COMMAND
 *       # (prefetch-proof — no url). Seeds your credential file + redeems in one shot.
 *
 *   node scripts/multi-user-auth/enroll.cjs "<magic-link>"
 *       # FALLBACK: follow a raw magic-link the owner forwarded. FRAGILE — any
 *       # chat/email link-preview may have consumed the single-use link first
 *       # (→ #error=access_denied). If that happens, ask the owner to run mint.cjs.
 *
 * Requires SUPABASE_URL (ritsu-ops) in runtime/secrets/.env.local (from install
 * --profile=per-human + your fill). With the magic-link form, do NOT also open the
 * link in a browser — it is single-use; let THIS command consume it. Never prints
 * secret values.
 *
 * NOTE on the token form: the tokens are live secrets; passing them as CLI args
 * puts them in your shell history + process listing (`ps`). That is the accepted
 * cost of the prefetch-proof path — clear your history after (`history -c` / close
 * the terminal). Do NOT re-run with an OLD refresh token once the MCP has booted
 * once (Supabase rotates refresh tokens on use) — the guard below refuses it
 * unless you pass --force.
 *
 * Shared, unit-tested primitives (ref-guard, host-guard, fragment extraction,
 * atomic 0600 write) live in ./lib/session.cjs.
 */
const S = require('./lib/session.cjs');

/** Orchestration, DI'd for tests. `process.exit` lives only in the CLI guard
 *  below — this returns normally on success, throws on failure. */
async function enrollMain(argv = process.argv, opts = {}) {
  const { log = console.log, fetchImpl = fetch } = opts;
  const args = argv.slice(2);
  const val = (name) => {
    const a = args.find((x) => x.startsWith(name + '='));
    return a ? a.slice(name.length + 1) : null;
  };
  const magicLink = args.find((a) => !a.startsWith('-'));

  const root = opts.root || S.repoRoot();
  const env = opts.env || S.parseEnvLocal(root);
  const url = env.SUPABASE_URL || env.SUPABASE_OPS_URL || '';
  if (!url.includes(S.REF)) {
    throw new Error(`SUPABASE_URL is not the ritsu-ops project (${S.REF}) in runtime/secrets/.env.local — run install --profile=per-human first and fill SUPABASE_URL`);
  }

  const file = S.credentialFilePath(env, root);
  let access;
  let refresh;
  const rtFlag = val('--refresh-token');
  const atFlag = val('--access-token');
  const force = args.includes('--force');

  if (rtFlag) {
    refresh = rtFlag;
    access = atFlag; // manual/token fallback (access optional but needed for redeem)
    // Footgun guard: overwriting a LIVE refresh token with a possibly-stale one
    // (Supabase rotates on use) breaks the next MCP boot. Refuse unless --force.
    const existing = S.readCredential(file);
    const existingRt = existing && existing.refresh_token;
    if (existingRt && existingRt !== rtFlag && !force) {
      throw new Error('a refresh token already exists in your credential file — refusing to overwrite it with a command-line token (it may be stale; Supabase rotates refresh tokens on use). If you are sure this token is newer, re-run with --force.');
    }
    log('using tokens passed on the command line (⚠ they are now in your shell history / process list — clear it after)');
  } else if (magicLink) {
    log('following the magic-link to obtain your session … (⚠ this CONSUMES the single-use link — do not also open it in a browser)');
    ({ access, refresh } = await S.followMagicLinkTokens(magicLink, { fetchImpl }));
    log('got a session ✓');
  } else {
    throw new Error('usage: enroll.cjs --refresh-token=<rt> --access-token=<at> [--force]   OR   enroll.cjs "<magic-link>"');
  }

  S.writeCredentialFile({ file, refresh });
  log(`wrote credential file: ${file}`);

  if (!access) {
    log('\n⚠️  No access token available to call redeem. The credential file is seeded; start Claude Code (supabase-ops will refresh + persist an access token), then run:');
    log('   node scripts/multi-user-auth/enroll.cjs --refresh-token=<rt> --access-token=<the access_token now in the credential file>');
    return { file, redeemed: false };
  }

  const r = await S.brokerCall({ url, token: access, body: { action: 'redeem' }, fetchImpl });
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
    if (r.status === 401) {
      throw new Error(
        `redeem: unauthorized (401) — the access token likely expired (it lives ~1h; the owner's mint command may be stale). ` +
          `Your credential file IS seeded (${file}). Start Claude Code once (supabase-ops refreshes + persists a fresh access token), ` +
          `then re-run: enroll.cjs --refresh-token=<the refresh_token in ${file}> --access-token=<the fresh access_token now in ${file}>. ` +
          `(${JSON.stringify(r.body)})`,
      );
    }
    throw new Error(`redeem failed (${r.status}): ${JSON.stringify(r.body)}`);
  }
  log('\n✅ enrolled + redeemed:', JSON.stringify(r.body));
  log('\nNext: run  node scripts/local-install/doctor.cjs  then fully restart Claude Code and approve the MCP servers.');
  return { file, redeemed: true };
}

if (require.main === module) {
  enrollMain()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('FATAL:', e.message);
      process.exit(1);
    });
}

module.exports = { enrollMain };
