'use strict';
/**
 * scripts/multi-user-auth/mint.cjs  (capability multi-user-auth)
 *
 * OWNER helper — the DEFAULT, prefetch-proof co-founder onboarding path.
 *
 *   node scripts/multi-user-auth/mint.cjs <cofounder-email>
 *
 * WHY this exists (learned on the FIRST real co-founder onboarding, 2026-07-03):
 * messaging channels (Zalo / Gmail / Messenger / Outlook SafeLinks) auto-OPEN a
 * URL to build a link-preview, which CONSUMES a single-use Supabase magic-link —
 * so forwarding the raw invite link reliably fails (`enroll` then sees
 * `#error=access_denied` / "already used"). The fix is to send NO url.
 *
 * mint mints the co-founder's session HERE (owner side), where the one clean
 * consume happens with no channel in the loop:
 *   admin generate_link({type:'magiclink', email}) → follow (redirect:'manual')
 *   → extract {access_token, refresh_token} from the redirect fragment
 * then writes a 0600 command file the owner `cat`s and forwards. The command is
 *   node scripts/multi-user-auth/enroll.cjs --refresh-token=<rt> --access-token=<at>
 * — a token-based command with NO url for a channel to prefetch. enroll's manual
 * path seeds the co-founder's credential file + redeems in one shot.
 *
 * Prerequisite: the co-founder must ALREADY be invited (auth identity + tier +
 * ops.operators row) — run `invite.cjs <email> --tier=admin|user` first. mint
 * only mints a fresh, deliverable session for that already-invited identity.
 *
 * Requires SUPABASE_URL (ritsu-ops) + SUPABASE_SERVICE_KEY (owner-only) in
 * runtime/secrets/.env.local. NEVER prints token values — the tokens go only into
 * the 0600 file, which the owner retrieves with an explicit `cat`.
 *
 * Fallback (if mint is unavailable): forward invite.cjs's raw magic-link and have
 * the co-founder run `enroll.cjs "<link>"` — but that link is prefetch-fragile.
 */

const path = require('node:path');
const S = require('./lib/session.cjs');

/** Orchestration, DI'd for tests. Returns {file, tier}. Never logs token values. */
async function mintMain(argv, opts = {}) {
  const { fetchImpl = fetch, log = console.log } = opts;
  const root = opts.root || S.repoRoot();
  const env = opts.env || S.parseEnvLocal(root);

  const args = argv.slice(2);
  const email = args.find((a) => !a.startsWith('-'));
  if (!email) {
    throw new Error('usage: mint.cjs <cofounder-email>   (owner-only; run AFTER invite.cjs <email> --tier=…)');
  }

  const url = env.SUPABASE_URL || env.SUPABASE_OPS_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_KEY || '';

  // generate_link + follow (ref/host/service guards live in the lib). This is the
  // single clean consume of the fresh magic-link.
  log(`minting a fresh session for ${email} … (owner side — no channel in the loop, so nothing can prefetch the link)`);
  const link = await S.adminGenerateMagicLink({ url, serviceKey, email, fetchImpl });
  const { access, refresh } = await S.followMagicLinkTokens(link, { fetchImpl });

  const decoded = S.decodeJwt(access);
  if (decoded.tier === 'owner') {
    // mint is the CO-FOUNDER path. An owner never enrolls this way; that would put
    // an owner session into an enroll command. Point at the owner-only reseed path.
    throw new Error(
      `${email} is an OWNER — refusing to mint a co-founder enrollment for an owner. ` +
        `For an owner's own credential use: node scripts/multi-user-auth/reseed-owner.cjs ${email}`,
    );
  }
  if (!decoded.tier) {
    log(
      `⚠  the minted session has NO tier claim — ${email} may not be invited yet. ` +
        `Run:  node scripts/multi-user-auth/invite.cjs ${email} --tier=admin|user  ` +
        `(their redeem will 404 "not_invited" until the ops.operators row exists). Continuing.`,
    );
  }

  const file = path.join(root, 'runtime', 'secrets', `enroll-command-${S.slugForEmail(email)}.txt`);
  S.writeSecretTextFile(file, S.formatEnrollCommandFile({ email, refresh, access, tier: decoded.tier }));

  log(`\n✅ minted a prefetch-proof enrollment for ${email}${decoded.tier ? `  (tier: ${decoded.tier})` : ''}.`);
  log(`\nThe enrollment COMMAND (no url — safe through any chat/email) is in a 0600 file:`);
  log(`   ${file}`);
  log(`\nDeliver it to the co-founder:`);
  log(`   cat "${file}"`);
  log(`   → copy the single 'node …enroll.cjs …' line and send THAT (not a screenshot — byte-exact).`);
  log(`They paste it in a terminal at their ritsu-works clone root; it seeds their`);
  log(`credential file and redeems (invited → active) in one shot.`);
  log(`\n⏱  The access token expires in ~1h — deliver promptly. If their redeem 401s,`);
  log(`   they start Claude Code once (the MCP refreshes the token) then re-run the command.`);
  log(`\n🧹 After sending, you may delete the file:  rm "${file}"  (the tokens self-expire`);
  log(`   anyway — access ~1h; the refresh token rotates on the co-founder's first MCP boot).`);
  return { file, tier: decoded.tier };
}

if (require.main === module) {
  mintMain(process.argv)
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('FATAL:', e.message);
      process.exit(1);
    });
}

module.exports = { mintMain };
