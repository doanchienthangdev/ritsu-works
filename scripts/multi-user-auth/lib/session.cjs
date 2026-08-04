'use strict';
/**
 * scripts/multi-user-auth/lib/session.cjs  (capability multi-user-auth)
 *
 * Shared, DEPENDENCY-INJECTED toolkit for the co-founder-onboarding helpers
 * (enroll / invite / mint / reseed-owner). Everything here is a pure function or
 * a thin async wrapper whose only side effects (fetch, fs) are injectable, so the
 * whole surface is unit-tested in Node without a live Supabase project.
 *
 * WHY it exists: the four helpers all need the SAME security-critical primitives —
 * the ritsu-ops ref-guard, the magic-link host-guard, the `#`-fragment token
 * extraction, and the atomic 0600 credential write. Duplicating those across four
 * scripts is a drift hazard for auth code (a fix to the host-guard must land in
 * every copy). This module is the single source of truth; the *.cjs entry scripts
 * are thin CLI wrappers over it.
 *
 * Conventions (kept in lockstep with the shipped enroll.cjs / invite.cjs):
 *   - REF-guard every SUPABASE_URL + every magic-link host to the ritsu-ops project.
 *   - repoRoot() collapses a worktree path back to the main checkout (runtime/
 *     secrets/ lives only at the main root).
 *   - parseEnvLocal is export/quote/inline-comment tolerant, CRLF-safe.
 *   - the credential file is written atomically (unique temp born 0600 via `wx`,
 *     chmod-before-rename) — never a partial file, never stale perms.
 *   - NEVER print token values (callers surface file paths + `cat` instructions).
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REF = 'mntobbmieuoaxipnjaau'; // ritsu-ops — the ONLY project any of these helpers may touch
const VALID_TIERS = ['owner', 'admin', 'user'];

// ---------------------------------------------------------------------------
// Repo + env
// ---------------------------------------------------------------------------

/** Collapse a `.claude/worktrees/<name>/…` path back to the main checkout root
 *  (runtime/secrets/.env.local + the credential file live only at the main root). */
function repoRoot(cwd = process.cwd()) {
  const MARKER = `${path.sep}.claude${path.sep}worktrees${path.sep}`;
  return cwd.includes(MARKER) ? cwd.slice(0, cwd.indexOf(MARKER)) : cwd;
}

/** Pure parse of a dotenv-style string: `export KEY=val`, quoted values, and
 *  trailing ` # comment` on unquoted values are all handled; CRLF-safe. */
function parseEnvContent(text) {
  const out = {};
  if (typeof text !== 'string') return out;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v[0] === '"' || v[0] === "'") {
      const q = v[0];
      const e = v.indexOf(q, 1);
      v = e === -1 ? v.slice(1) : v.slice(1, e);
    } else {
      const c = v.search(/\s#/);
      if (c !== -1) v = v.slice(0, c);
      v = v.trim();
    }
    out[m[1]] = v;
  }
  return out;
}

/** Read runtime/secrets/.env.local at `root`; returns {} if absent. */
function parseEnvLocal(root = repoRoot()) {
  const p = path.join(root, 'runtime', 'secrets', '.env.local');
  try {
    return parseEnvContent(fs.readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

/** Where the shared per-human credential file lives (env override wins). */
function credentialFilePath(env, root = repoRoot()) {
  return (env && env.RITSU_OPERATOR_REFRESH_TOKEN_FILE) || path.join(root, 'runtime', 'secrets', '.operator-refresh.json');
}

// ---------------------------------------------------------------------------
// Atomic secret writes (mirror mcp-server/.../operator-credential.ts)
// ---------------------------------------------------------------------------

/** Atomic 0600 write of arbitrary text: a UNIQUE temp (born 0600 via `wx` so a
 *  crash-leftover fixed-name temp can never be truncated-in-place with stale
 *  perms) + rename over the target. chmod BEFORE rename so the destination is
 *  born 0600 with no loose window. */
function writeSecretTextFile(file, content) {
  if (!file) throw new Error('writeSecretTextFile: file path required');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, content, { mode: 0o600, flag: 'wx' });
  try {
    fs.chmodSync(tmp, 0o600);
  } catch {
    /* filesystems without chmod (Windows) — best-effort */
  }
  fs.renameSync(tmp, file);
  return file;
}

/** Atomic 0600 write of the credential file. `access` is written only when
 *  provided (so a refresh-only caller never clobbers a persisted access token).
 *  Shape matches what the supabase-ops MCP persists + reads. */
function writeCredentialFile({ file, refresh, access, now }) {
  if (!refresh || typeof refresh !== 'string') throw new Error('writeCredentialFile: refresh token required');
  const payload = { refresh_token: refresh, updated_at: now || new Date().toISOString() };
  if (access) payload.access_token = access;
  return writeSecretTextFile(file, JSON.stringify(payload, null, 2) + '\n');
}

/** Read the credential file → {refresh_token, access_token, updated_at} with
 *  null for any missing/blank field; null on a missing/corrupt file. */
function readCredential(file) {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      refresh_token: typeof j.refresh_token === 'string' && j.refresh_token ? j.refresh_token : null,
      access_token: typeof j.access_token === 'string' && j.access_token ? j.access_token : null,
      updated_at: typeof j.updated_at === 'string' ? j.updated_at : null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// JWT (decode-only — the DB verifies the signature; this is advisory)
// ---------------------------------------------------------------------------

function decodeBase64Url(segment) {
  const pad = segment.length % 4 === 0 ? '' : '='.repeat(4 - (segment.length % 4));
  return Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString('utf8');
}

/** Decode a JWT's payload. Fail-closed: any malformed input → all-null (mirrors
 *  mcp-server operator-identity.decodeJwtClaims, plus `exp`). The signature is
 *  NOT verified — the decoded tier is advisory (RLS / the broker's getUser is the
 *  real authority). Here it is used only for local sanity checks (right tier?
 *  expired?), never as a security boundary. */
function decodeJwt(token) {
  const empty = { email: null, tier: null, sub: null, exp: null, claims: null };
  if (!token || typeof token !== 'string') return empty;
  const parts = token.split('.');
  if (parts.length !== 3) return empty;
  let claims;
  try {
    claims = JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return empty;
  }
  if (!claims || typeof claims !== 'object') return empty;
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : null;
  const sub = typeof claims.sub === 'string' ? claims.sub : null;
  const exp = typeof claims.exp === 'number' ? claims.exp : null;
  let tier = null;
  const am = claims.app_metadata;
  if (am && typeof am === 'object' && typeof am.tier === 'string' && VALID_TIERS.includes(am.tier)) {
    tier = am.tier;
  }
  return { email, tier, sub, exp, claims };
}

/** Is an access token stale (expired, or unparseable, or lacking `exp`)?
 *  Fail-closed: no readable exp ⇒ treat as stale so a bad token triggers a
 *  reseed rather than a confusing downstream 401. */
function isAccessTokenStale(token, nowSec = Math.floor(Date.now() / 1000), skewSec = 30) {
  const { exp } = decodeJwt(token);
  if (typeof exp !== 'number') return true;
  return exp <= nowSec + skewSec;
}

// ---------------------------------------------------------------------------
// Magic-link consumption (implicit flow → tokens in the redirect fragment)
// ---------------------------------------------------------------------------

/** Does a URL point at the ritsu-ops Supabase project? (host-guard against a
 *  socially-engineered link resolving to an attacker host.) EXACT host match — a
 *  substring test would accept `<ref>.evil.com` or `evil-<ref>.supabase.co`.
 *  ASSUMES ritsu-ops uses the default Supabase auth domain `<ref>.supabase.co`
 *  (true today — no custom auth domain configured). If a custom auth domain is
 *  ever set, generate_link's action_link would resolve elsewhere and this guard
 *  would (safely) reject it — update the allowed host here at that point. */
function hostIsRitsuOps(urlStr) {
  let host;
  try {
    host = new URL(urlStr).host;
  } catch {
    return false;
  }
  return host === `${REF}.supabase.co`;
}

/** The `#`-fragment of a redirect Location (or '' if none, null on no input). */
function fragmentFromLocation(loc) {
  if (!loc) return null;
  const i = loc.indexOf('#');
  return i === -1 ? '' : loc.slice(i + 1);
}

/** Pull {access, refresh} out of a redirect fragment; throw a clear, actionable
 *  error on an `error=…` fragment (the classic prefetch-consumed case) or when
 *  either token is missing. */
function parseFragmentTokens(fragment) {
  const q = new URLSearchParams(fragment || '');
  const err = q.get('error') || q.get('error_code') || q.get('error_description');
  if (err) {
    throw new Error(
      `magic-link error: ${decodeURIComponent(err)} — the single-use link was likely ` +
        `already consumed (a chat/email/SafeLinks preview may have opened it first). ` +
        `Re-mint with mint.cjs and deliver the token COMMAND (no url to prefetch).`,
    );
  }
  const access = q.get('access_token');
  const refresh = q.get('refresh_token');
  if (!access || !refresh) {
    throw new Error('magic-link redirect had no {access_token, refresh_token} in the fragment');
  }
  return { access, refresh };
}

/** Follow a Supabase magic-link (action_link) and return {access, refresh} from
 *  the redirect fragment. Host-guarded to ritsu-ops. Consumes the single-use link.
 *  `fetchImpl` is injected for testing. */
async function followMagicLinkTokens(link, { fetchImpl = fetch } = {}) {
  if (!hostIsRitsuOps(link)) {
    throw new Error(
      `magic-link host is not the ritsu-ops project (${REF}) — refusing to follow it. ` +
        `A real link always resolves under ${REF}.supabase.co.`,
    );
  }
  const r = await fetchImpl(link, { redirect: 'manual' });
  const loc = r.headers.get('location');
  if (!loc) {
    throw new Error(`magic-link did not redirect (status ${r.status}); it may be expired/consumed — re-mint`);
  }
  return parseFragmentTokens(fragmentFromLocation(loc));
}

// ---------------------------------------------------------------------------
// Supabase admin + broker calls (service_role / bearer; injectable fetch)
// ---------------------------------------------------------------------------

/** Owner-only: mint a single-use magic-link (action_link) for `email` via the
 *  GoTrue admin API (service_role). Ref-guards the URL and requires a service key.
 *  Throws with an actionable message if the user does not exist yet. */
async function adminGenerateMagicLink({ url, serviceKey, email, redirectTo, fetchImpl = fetch }) {
  if (!url || !url.includes(REF)) {
    throw new Error(`SUPABASE_URL is not the ritsu-ops project (${REF}) — refusing`);
  }
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_KEY (service_role) is required — minting a magic-link is an OWNER-only operation');
  }
  if (!email) throw new Error('email required');
  const body = { type: 'magiclink', email };
  if (redirectTo) body.redirect_to = redirectTo;
  const r = await fetchImpl(`${url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  let j;
  try {
    j = JSON.parse(t);
  } catch {
    j = null;
  }
  if (!r.ok) {
    const msg = (j && (j.msg || j.error_description || j.error || j.message)) || t || '(no body)';
    throw new Error(`generate_link failed (${r.status}): ${msg}`);
  }
  const link = j && ((j.properties && j.properties.action_link) || j.action_link);
  if (!link) {
    throw new Error(
      `generate_link returned no action_link (${r.status}) — ${email} may not exist yet. ` +
        `Run: node scripts/multi-user-auth/invite.cjs ${email} --tier=admin|user  first.`,
    );
  }
  return link;
}

/** POST an action to the operator-broker Edge Function with a bearer token. */
async function brokerCall({ url, token, body, fetchImpl = fetch }) {
  const r = await fetchImpl(`${url}/functions/v1/operator-broker`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  let j;
  try {
    j = JSON.parse(t);
  } catch {
    j = t;
  }
  return { status: r.status, ok: r.ok, body: j };
}

// ---------------------------------------------------------------------------
// Enrollment-command shaping (mint) + owner reseed
// ---------------------------------------------------------------------------

/** The prefetch-proof enrollment command a co-founder runs. It carries the
 *  tokens as flags — NO url — so a chat/email link-preview has nothing to
 *  consume. (The tokens are still live secrets; the atomic-0600 command file +
 *  a prompt delivery are how we keep the exposure bounded.) */
function buildEnrollCommand({ refresh, access }) {
  if (!refresh || !access) throw new Error('buildEnrollCommand: both refresh and access tokens required');
  // Positive ALLOWLIST (not a denylist): a real Supabase access token is a JWT and
  // a refresh token is URL-safe base64 — both are exactly [A-Za-z0-9._-]. Reject
  // anything else (shell metachars, glob chars, backslash, null byte, whitespace)
  // rather than emit an injectable / corrupted command line into the file the owner
  // forwards. Tokens minted here always pass; a failure means a corrupted paste.
  const TOKEN = /^[A-Za-z0-9._-]+$/;
  if (!TOKEN.test(refresh) || !TOKEN.test(access)) {
    throw new Error('token contains unexpected characters — refusing to build a command (corrupted paste / not a Supabase token?)');
  }
  return `node scripts/multi-user-auth/enroll.cjs --refresh-token=${refresh} --access-token=${access}`;
}

/** email → filesystem-safe slug (for the per-co-founder command file name). */
function slugForEmail(email) {
  return (
    String(email || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cofounder'
  );
}

/** The contents of the 0600 command file the owner `cat`s. Header explains the
 *  one live command line to forward + the ~1h access-token TTL. */
function formatEnrollCommandFile({ email, refresh, access, tier, now }) {
  const cmd = buildEnrollCommand({ refresh, access });
  return (
    [
      `# ritsu-works co-founder enrollment — ${email}${tier ? `  (tier: ${tier})` : ''}`,
      `# generated: ${now || new Date().toISOString()}`,
      `#`,
      `# OWNER: send the SINGLE 'node …enroll.cjs …' line below to the co-founder`,
      `# through ANY channel (chat/email is fine — it has NO url to link-preview).`,
      `# They paste it into a terminal at the root of their ritsu-works clone; it`,
      `# seeds their credential file and redeems (invited → active) in one shot.`,
      `#`,
      `# The tokens are LIVE secrets and the access token expires in ~1 hour —`,
      `# deliver promptly. If their redeem 401s, they start Claude Code once (the`,
      `# MCP refreshes the token) then re-run the command.`,
      ``,
      cmd,
      ``,
    ].join('\n')
  );
}

/** Owner-only: mint a fresh OWNER session (service_role, no existing token
 *  needed) and atomically seed the credential file. Refuses to write a
 *  non-owner session into the owner credential file. Creates a new session;
 *  revokes nothing. Returns {decoded, file}. */
async function reseedOwnerCredential({ url, serviceKey, email, file, fetchImpl = fetch, now }) {
  const link = await adminGenerateMagicLink({ url, serviceKey, email, fetchImpl });
  const { access, refresh } = await followMagicLinkTokens(link, { fetchImpl });
  const decoded = decodeJwt(access);
  if (decoded.tier !== 'owner') {
    throw new Error(
      `reseed refused: the minted session for ${email} has tier="${decoded.tier}", not owner. ` +
        `reseed-owner is for OWNER credentials only (a co-founder enrolls via mint.cjs/enroll.cjs).`,
    );
  }
  writeCredentialFile({ file, refresh, access, now });
  return { decoded, file };
}

module.exports = {
  REF,
  VALID_TIERS,
  repoRoot,
  parseEnvContent,
  parseEnvLocal,
  credentialFilePath,
  writeSecretTextFile,
  writeCredentialFile,
  readCredential,
  decodeJwt,
  isAccessTokenStale,
  hostIsRitsuOps,
  fragmentFromLocation,
  parseFragmentTokens,
  followMagicLinkTokens,
  adminGenerateMagicLink,
  brokerCall,
  buildEnrollCommand,
  slugForEmail,
  formatEnrollCommandFile,
  reseedOwnerCredential,
};
