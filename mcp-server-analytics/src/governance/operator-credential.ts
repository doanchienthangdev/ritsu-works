/**
 * Read-only per-human tier resolution for the analytics MCP (capability
 * multi-user-auth, Sprint 2).
 *
 * The analytics MCP is NOT the refresher of the operator's Supabase Auth token —
 * the supabase-ops MCP is (refreshing rotates the refresh token; a second
 * independent refresher would race + trip Supabase's reuse-detection → revoke).
 * The supabase-ops refresher persists the short-lived ACCESS token into the
 * shared credential file. Here we only READ that access token and decode the
 * operator's tier from it — no network call, no refresh, no race.
 *
 * Resolution is fail-closed: any miss (missing/corrupt file, no access_token, an
 * undecodable token, no tier claim) yields `null` → the caller denies analytics.
 *
 * Source precedence:
 *   1. inline RITSU_OPERATOR_ACCESS_TOKEN (the live-validation / direct path), then
 *   2. the access_token persisted in RITSU_OPERATOR_REFRESH_TOKEN_FILE (production).
 *
 * Expiry IS enforced here (the analytics copy deliberately diverges from
 * supabase-ops's decode): supabase-ops sends the same token to the DB, where
 * Supabase re-verifies the signature + exp and per-tier RLS re-checks the tier
 * server-side — so there, a stale local decode is harmless (the DB is the real
 * gate). For analytics the operator token is NEVER transmitted (the connection is
 * the fixed analytics_reader role) and the local tier decode is the ONLY tier
 * gate, so a stale/expired token must NOT keep granting access. Requiring a
 * non-expired token caps the staleness/downgrade-lag window to the access-token
 * lifetime (~1h) rather than "until supabase-ops next persists" (unbounded if the
 * refresher is absent). The analytics_reader DB role (read-only, pseudonymized,
 * isolated) remains the real boundary regardless.
 */

import { readFileSync } from "node:fs";
import { decodeJwtClaims, type OperatorTier } from "./operator-identity.ts";
import type { AnalyticsServerEnv } from "../lib/env.ts";

/** Read the persisted access token from the credential file. Fail-closed on any miss. */
export function readAccessTokenFromFile(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as { access_token?: unknown };
    if (typeof parsed.access_token === "string" && parsed.access_token) {
      return parsed.access_token;
    }
  } catch {
    // missing/corrupt file (e.g. supabase-ops hasn't persisted yet) → no token
  }
  return null;
}

/**
 * Resolve the operator's tier from the per-human credential (inline access token
 * first, then the access token persisted to the credential file). Returns null —
 * the caller denies — when no tier can be established OR the token is expired/
 * undated (see file header for why analytics enforces exp but supabase-ops need
 * not). Fail-closed on every miss.
 *
 * Note the `||` short-circuits on the raw token STRING's truthiness, not on
 * whether it decodes: a present-but-undecodable inline token is used (and yields
 * null) WITHOUT falling through to the file — so a stale/forged inline token can
 * never be silently masked by a file token. Intentional; pinned by a test.
 */
export function resolveOperatorTier(env: AnalyticsServerEnv): OperatorTier | null {
  const token =
    env.perHumanAccessToken || readAccessTokenFromFile(env.perHumanRefreshTokenFile);
  const id = decodeJwtClaims(token);
  // Reject an expired / undated token (fail-closed). exp is seconds since epoch.
  if (id.exp == null || id.exp * 1000 < Date.now()) return null;
  return id.tier;
}
