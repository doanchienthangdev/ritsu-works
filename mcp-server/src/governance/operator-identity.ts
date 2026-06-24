/**
 * Per-human identity for the per-human auth mode (capability multi-user-auth).
 *
 * The MCP holds a per-human Supabase Auth access token (JWT). This module DECODES
 * its claims (email, app_metadata.tier, sub) for two LOCAL purposes only:
 *   1. app-layer pre-checks (fail fast before a DB round-trip), and
 *   2. audit attribution (which human did this).
 *
 * It does NOT verify the JWT signature — and it must NOT be trusted as the
 * authority. The REAL enforcement is server-side: the DB receives the same token,
 * Supabase verifies its signature, and per-tier RLS (migration 00049) decides
 * what the connection may read/write. A user who tampers with their local token
 * gets nothing server-side (the signature check fails at the DB). So a decoded
 * tier here is advisory; RLS is authoritative.
 */

import type { OperatorTier } from "../types.ts";

export interface HumanIdentity {
  email: string | null;
  /** app_metadata.tier — null if absent/invalid. NOT trusted for authority (RLS is). */
  tier: OperatorTier | null;
  sub: string | null;
}

const VALID_TIERS: readonly OperatorTier[] = ["owner", "admin", "user"];

/** base64url → utf8 (no Buffer dependency assumptions; works in Node). */
function decodeBase64Url(segment: string): string {
  const pad = segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}

/**
 * Decode a JWT's payload claims. Returns all-null on any malformed input
 * (fail-closed: a token we can't parse yields no identity → no app-layer grant).
 */
export function decodeJwtClaims(token: string | null | undefined): HumanIdentity {
  const empty: HumanIdentity = { email: null, tier: null, sub: null };
  if (!token || typeof token !== "string") return empty;
  const parts = token.split(".");
  if (parts.length !== 3) return empty;
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
  } catch {
    return empty;
  }
  if (!payload || typeof payload !== "object") return empty;

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
  const sub = typeof payload.sub === "string" ? payload.sub : null;

  const appMeta = payload.app_metadata;
  let tier: OperatorTier | null = null;
  if (appMeta && typeof appMeta === "object") {
    const t = (appMeta as Record<string, unknown>).tier;
    if (typeof t === "string" && (VALID_TIERS as readonly string[]).includes(t)) {
      tier = t as OperatorTier;
    }
  }
  return { email, tier, sub };
}
