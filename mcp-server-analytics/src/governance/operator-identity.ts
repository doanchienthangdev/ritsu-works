/**
 * Per-human identity for the analytics MCP's per-human auth mode
 * (capability multi-user-auth, Sprint 2).
 *
 * This is a COPY of mcp-server/src/governance/operator-identity.ts, kept local
 * because mcp-server-analytics is a separate package (no @supabase/supabase-js,
 * separate node_modules, and cross-package .ts-extension imports are fragile).
 * The two files must stay behaviour-identical for `tier`; they are tiny + pure.
 *
 * It DECODES a JWT's claims to learn the operator's app_metadata.tier. It does
 * NOT verify the signature and is NOT a cryptographic boundary on the laptop.
 * For the analytics MCP the REAL confidentiality boundary stays the least-priv
 * `analytics_reader` Postgres role (SELECT-only over the pseudonymized `live.*`
 * surface, no PII, isolated project) — this tier check is least-privilege
 * defense-in-depth that correctly denies a non-malicious `user`. A malicious
 * laptop owner who forges a local token still reaches only that pseudonymized,
 * read-only data; they cannot reach Product, PII, or any write.
 */

export type OperatorTier = "owner" | "admin" | "user";

export interface HumanIdentity {
  email: string | null;
  /** app_metadata.tier — null if absent/invalid. Advisory (defense-in-depth). */
  tier: OperatorTier | null;
  sub: string | null;
  /** JWT `exp` (seconds since epoch) — null if absent/invalid. Used to reject stale tokens. */
  exp: number | null;
}

const VALID_TIERS: readonly OperatorTier[] = ["owner", "admin", "user"];

/** base64url → utf8. */
function decodeBase64Url(segment: string): string {
  const pad = segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}

/**
 * Decode a JWT's payload to a plain claims object, or null when the token is not a
 * decodable 3-part JWT with an object payload.
 *
 * Exists so callers can tell "this token is garbage" apart from "this token is a
 * real JWT that happens to lack the claim I want" — `decodeJwtClaims` collapses
 * both to all-null, which makes a denial undiagnosable. Additive: `decodeJwtClaims`
 * is unchanged in behavior (it now delegates the parse), so this file stays
 * behaviour-identical to mcp-server's copy for `tier`.
 */
export function decodeJwtPayload(
  token: string | null | undefined,
): Record<string, unknown> | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(decodeBase64Url(parts[1]!));
  } catch {
    return null;
  }
  // Arrays/numbers/null are valid JSON but not a claims object.
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  return payload as Record<string, unknown>;
}

/**
 * Decode a JWT payload's claims. Returns all-null on any malformed input
 * (fail-closed: a token we can't parse yields no identity → no grant).
 */
export function decodeJwtClaims(token: string | null | undefined): HumanIdentity {
  const empty: HumanIdentity = { email: null, tier: null, sub: null, exp: null };
  const payload = decodeJwtPayload(token);
  if (!payload) return empty;

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
  const sub = typeof payload.sub === "string" ? payload.sub : null;
  const exp =
    typeof payload.exp === "number" && Number.isFinite(payload.exp) ? payload.exp : null;

  const appMeta = payload.app_metadata;
  let tier: OperatorTier | null = null;
  if (appMeta && typeof appMeta === "object") {
    const t = (appMeta as Record<string, unknown>).tier;
    if (typeof t === "string" && (VALID_TIERS as readonly string[]).includes(t)) {
      tier = t as OperatorTier;
    }
  }
  return { email, tier, sub, exp };
}
