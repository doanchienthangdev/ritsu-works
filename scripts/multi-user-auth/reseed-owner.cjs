'use strict';
/**
 * scripts/multi-user-auth/reseed-owner.cjs  (capability multi-user-auth)
 *
 * OWNER helper — non-destructively refresh YOUR OWN owner credential file.
 *
 *   node scripts/multi-user-auth/reseed-owner.cjs <owner-email>
 *
 * WHY this exists (learned on the FIRST real co-founder onboarding, 2026-07-03):
 * invite.cjs reads the owner ACCESS token from the credential file
 * (runtime/secrets/.operator-refresh.json), which is refreshed ONLY by the
 * supabase-ops MCP booting per-human at the MAIN ROOT. A worktree has no
 * runtime/secrets/.env.local → can't boot per-human → never refreshes; and a
 * prior boot may have rotated the refresh token without persisting the
 * replacement. Symptom: invite.cjs → broker 401 "Invalid JWT" and the stored
 * refresh token is `refresh_token_already_used`.
 *
 * The fix needs NO fresh owner token — it is pure service_role:
 *   admin generate_link({type:'magiclink', email:<owner>}) → follow
 *   (redirect:'manual') → {access, refresh} from the fragment → atomically seed
 *   the credential file (0600). This CREATES a new owner session; it revokes
 *   nothing and is safe to run repeatedly. (invite.cjs now also does this
 *   automatically when it detects a stale owner token — this script is the
 *   explicit / standalone form.)
 *
 * Requires SUPABASE_URL (ritsu-ops) + SUPABASE_SERVICE_KEY (owner-only) in
 * runtime/secrets/.env.local. Refuses to write a non-owner session into the owner
 * credential file. NEVER prints token values.
 */

const S = require('./lib/session.cjs');

/** Orchestration, DI'd for tests. Returns {file, tier}. Never logs token values. */
async function reseedMain(argv, opts = {}) {
  const { fetchImpl = fetch, log = console.log } = opts;
  const root = opts.root || S.repoRoot();
  const env = opts.env || S.parseEnvLocal(root);

  const args = argv.slice(2);
  const email = args.find((a) => !a.startsWith('-'));
  if (!email) {
    throw new Error('usage: reseed-owner.cjs <owner-email>   (owner-only; uses service_role, needs no fresh owner token)');
  }

  const url = env.SUPABASE_URL || env.SUPABASE_OPS_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_KEY || '';
  const file = S.credentialFilePath(env, root);

  log(`reseeding a fresh owner session for ${email} … (service_role; a new session is created, nothing is revoked)`);
  const { decoded } = await S.reseedOwnerCredential({ url, serviceKey, email, file, fetchImpl });

  log(`\n✅ reseeded the owner credential file  (tier: ${decoded.tier}).`);
  log(`   ${file}`);
  log(`\ninvite.cjs can now read a live owner access token. Nothing was revoked;`);
  log(`your other owner sessions keep working.`);
  return { file, tier: decoded.tier };
}

if (require.main === module) {
  reseedMain(process.argv)
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('FATAL:', e.message);
      process.exit(1);
    });
}

module.exports = { reseedMain };
