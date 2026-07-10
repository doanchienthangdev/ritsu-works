/**
 * Self-healing for a revoked per-human credential (capability multi-user-auth, 2026-07-10).
 *
 * Once Supabase's reuse detection fires, the session and every refresh token belonging to it
 * are revoked. No retry recovers it; someone must authenticate again. On the OWNER's machine
 * that "someone" can be this process, because `SUPABASE_SERVICE_KEY` is already sitting in
 * `.env.local`: it mints a magic link for the operator's own email and exchanges it.
 *
 * SECURITY, STATED HONESTLY. This grants nothing new. A process holding the service key can
 * already read and write every table in ritsu-ops, bypassing RLS entirely; minting a token
 * for an identity it could already impersonate is strictly less power than it has. What this
 * does add is a way to get the SAME identity back without a human at a dashboard.
 *
 * Two guards keep that honest:
 *   1. `sub` must match. We restore the identity recorded in the dead credential; we never
 *      mint a session for a different user, even if the local token's claims were tampered
 *      with. (The tier claim, being local, is not trusted for authority — the DB's RLS is.)
 *   2. No service key ⇒ no self-heal. A co-founder machine (`.env.per-human.example` ships
 *      god-key-free) fails closed with an actionable enroll instruction, exactly as before.
 *
 * The alternative — silently dying and letting analytics + gbrain go dark for a week — is
 * what we are replacing.
 */

import { assertProjectRefAllowed } from "./project-ref-guard.ts";
import { decodeJwtClaims } from "./operator-identity.ts";
import { readCredential, persistRefreshToken } from "./operator-credential.ts";
import type { ServerEnv } from "../lib/env.ts";

export type SelfHealBlockedReason =
  | "no_service_key"
  | "no_credential_file"
  | "no_prior_credential"
  | "prior_token_undecodable"
  | "not_owner";

export type SelfHealEligibility =
  | { ok: true; email: string; sub: string; file: string }
  | { ok: false; reason: SelfHealBlockedReason };

/** Human-readable, action-bearing text for each blocked reason. */
export const SELF_HEAL_REMEDY: Record<SelfHealBlockedReason, string> = {
  no_service_key:
    "No SUPABASE_SERVICE_KEY on this machine (expected on a co-founder install). Re-enroll: node scripts/multi-user-auth/enroll.cjs \"<magic-link>\".",
  no_credential_file:
    "RITSU_OPERATOR_REFRESH_TOKEN_FILE is not configured, so there is no identity to restore.",
  no_prior_credential:
    "The credential file carries no access token, so the identity to restore is unknown. Re-enroll.",
  prior_token_undecodable:
    "The stored access token is not a decodable JWT. Re-enroll rather than guess an identity.",
  not_owner:
    "Self-heal is owner-only. Ask an owner for a fresh magic link, then run scripts/multi-user-auth/enroll.cjs.",
};

/**
 * May this process mint itself a new session? Pure — no network, no writes.
 * Fail-closed: every uncertainty returns `ok: false`.
 */
export function canSelfHeal(env: ServerEnv): SelfHealEligibility {
  if (!env.serviceKey) return { ok: false, reason: "no_service_key" };
  const file = env.perHumanRefreshTokenFile;
  if (!file) return { ok: false, reason: "no_credential_file" };

  const cred = readCredential(file);
  if (!cred?.accessToken) return { ok: false, reason: "no_prior_credential" };

  const claims = decodeJwtClaims(cred.accessToken);
  if (!claims.email || !claims.sub) return { ok: false, reason: "prior_token_undecodable" };
  // Advisory, not an authority check (see header): keeps a co-founder machine that somehow
  // has a service key from silently self-healing a non-owner identity.
  if (claims.tier !== "owner") return { ok: false, reason: "not_owner" };

  return { ok: true, email: claims.email, sub: claims.sub, file };
}

export interface MintedSession {
  accessToken: string;
  refreshToken: string;
}

/** Injectable so tests never touch the network or the real credential file. */
export interface SelfHealDeps {
  doFetch: typeof fetch;
  persist: typeof persistRefreshToken;
  nowIso: () => string;
}

const defaultDeps: SelfHealDeps = {
  doFetch: fetch,
  persist: persistRefreshToken,
  nowIso: () => new Date().toISOString(),
};

/**
 * Mint a fresh session for `elig.email` and persist it. Throws on any deviation — including
 * a `sub` that does not match the identity we set out to restore.
 *
 * Mirrors the committed, live-validated pattern in
 * scripts/multi-user-auth/validate-instant-revocation.cjs (generate_link → verify).
 * Never logs or returns the magic link.
 */
export async function selfHealCredential(
  env: ServerEnv,
  elig: Extract<SelfHealEligibility, { ok: true }>,
  deps: SelfHealDeps = defaultDeps,
): Promise<MintedSession> {
  assertProjectRefAllowed(env.url);
  if (!env.serviceKey) throw new Error("self-heal requires the service key");
  if (!env.anonKey) throw new Error("self-heal requires the anon key");

  const admin = {
    apikey: env.serviceKey,
    Authorization: `Bearer ${env.serviceKey}`,
    "Content-Type": "application/json",
  };

  const gen = await deps.doFetch(`${env.url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: admin,
    body: JSON.stringify({ type: "magiclink", email: elig.email }),
  });
  const genBody = (await gen.json()) as { properties?: { hashed_token?: string }; hashed_token?: string };
  const tokenHash = genBody.properties?.hashed_token ?? genBody.hashed_token;
  if (!gen.ok || !tokenHash) throw new Error(`self-heal: generate_link failed (HTTP ${gen.status})`);

  const ver = await deps.doFetch(`${env.url}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: env.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "email", token_hash: tokenHash }),
  });
  const session = (await ver.json()) as { access_token?: string; refresh_token?: string };
  if (!ver.ok || !session.access_token || !session.refresh_token) {
    throw new Error(`self-heal: verify failed (HTTP ${ver.status})`);
  }

  // Identity guard — the whole point. Restore who we were, never someone else.
  const minted = decodeJwtClaims(session.access_token);
  if (minted.sub !== elig.sub) {
    throw new Error(`self-heal: refusing — minted sub does not match the restored identity`);
  }

  deps.persist(elig.file, session.refresh_token, deps.nowIso(), session.access_token);
  return { accessToken: session.access_token, refreshToken: session.refresh_token };
}
