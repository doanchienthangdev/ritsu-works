/**
 * Per-human refresh-token persistence (capability multi-user-auth, Sprint 2).
 *
 * Supabase rotates refresh tokens on use (theft-detection): each refresh returns
 * a NEW refresh token and invalidates the old one after a short reuse window. A
 * static token in .env.local therefore goes stale after the first session and the
 * MCP would fail to boot on the next restart.
 *
 * Fix without weakening rotation: keep the live token in a local credential FILE.
 * The MCP reads the current token from it at boot, and persists every rotated
 * token back (boot exchange + each mid-session TOKEN_REFRESHED). The file is the
 * source of truth across restarts; the inline env token only seeds first boot.
 *
 * The file lives under runtime/secrets/ (local-only, gitignored), 0600.
 *
 * CONCURRENT SESSIONS (fixed 2026-07-10). This header used to call racing sessions "a known
 * limitation". It stopped being theoretical: `.mcp.json` spawns one supabase-ops per Claude
 * session, all sharing this file, and each one refreshed at boot while keeping
 * `autoRefreshToken` on — so each held its own in-memory refresh token and rotated it hourly.
 * Presenting a token another process had already rotated trips Supabase's reuse detection,
 * which revokes the WHOLE session. Two concurrent sessions were enough. It happened on
 * 2026-07-03 and went unnoticed for seven days. Now exactly one process — the holder of the
 * lock in credential-lock.ts — ever refreshes, and only when the persisted access token is
 * genuinely near expiry. See supabase-client.ts (`ensurePerHumanClient`).
 *
 * Sprint 2 (gbrain + analytics per-human): this MCP is the SOLE refresher of the
 * operator's Supabase Auth token (refreshing rotates the refresh token; a second
 * independent refresher would race and trip Supabase's reuse-detection → revoke).
 * So besides the refresh token, it also persists the short-lived ACCESS token to
 * the same file. Other per-human consumers that only need the operator's *tier*
 * (the analytics MCP, the gbrain pre-tool hook) read that access token and decode
 * app_metadata.tier — WITHOUT ever calling refresh — so they never race this
 * writer. The tier claim is stable across access-token rotations, so a slightly
 * stale persisted token still yields the correct tier.
 */

import { readFileSync, writeFileSync, renameSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
import type { ServerEnv } from "../lib/env.ts";

/** The refresh token to use at boot: the file (source of truth) wins; inline env seeds it. */
export function readRefreshToken(env: ServerEnv): string | null {
  if (env.perHumanRefreshTokenFile) {
    try {
      const parsed = JSON.parse(readFileSync(env.perHumanRefreshTokenFile, "utf8")) as {
        refresh_token?: unknown;
      };
      if (typeof parsed.refresh_token === "string" && parsed.refresh_token) {
        return parsed.refresh_token;
      }
    } catch {
      // file missing/corrupt (e.g. first boot) → fall back to the inline seed
    }
    return env.perHumanRefreshToken; // seed
  }
  return env.perHumanRefreshToken;
}

/**
 * Read the persisted ACCESS token from the credential file (Sprint 2). Read-only;
 * never refreshes. Returns null on any miss (missing/corrupt file, no access_token
 * field) — fail-closed for the consumers that decode the tier from it.
 *
 * This is the canonical reference reader; mcp-server-analytics keeps a local copy
 * (readAccessTokenFromFile) because it is a separate package. mcp-server itself
 * never needs to read the access token (it holds it live) — this is exercised by
 * the credential tests and documents the on-disk file shape.
 */
export function readAccessToken(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as { access_token?: unknown };
    if (typeof parsed.access_token === "string" && parsed.access_token) {
      return parsed.access_token;
    }
  } catch {
    // file missing/corrupt → no access token
  }
  return null;
}

/**
 * Atomically persist a rotated refresh token (+ the fresh access token, when
 * known) back to the credential file (0600). The access token is written so the
 * read-only per-human consumers (analytics MCP, gbrain hook) can decode the
 * operator's tier without refreshing (see file header). It is omitted when not
 * provided rather than nulled, so an access-token-less call never clobbers a
 * previously-persisted one with a write — but every real caller in
 * refreshPerHumanClient passes it.
 */
export function persistRefreshToken(
  filePath: string,
  refreshToken: string,
  nowIso: string,
  accessToken?: string | null,
): void {
  // UNIQUE temp name + `wx` (O_CREAT|O_EXCL): the file is always freshly created,
  // so writeFileSync's `mode: 0o600` is honored (a fixed-name temp that already
  // existed — e.g. a crash leftover — would be truncated in place and KEEP its old,
  // possibly group/world-readable perms). The credential file now holds a live
  // access token, so a perms leak would be worse than refresh-token-only.
  const tmp = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  const payload: Record<string, unknown> = { refresh_token: refreshToken, updated_at: nowIso };
  if (accessToken) payload.access_token = accessToken;
  writeFileSync(tmp, JSON.stringify(payload) + "\n", { mode: 0o600, flag: "wx" });
  // chmod the temp BEFORE rename so the destination is born 0600 (no loose window
  // between rename and a post-rename chmod).
  try {
    chmodSync(tmp, 0o600);
  } catch {
    // best-effort on filesystems without chmod
  }
  renameSync(tmp, filePath);
}

// ─── refresh-race avoidance (2026-07-10) ────────────────────────────────────────
// The header above calls concurrent sessions "a known limitation". It stopped being
// theoretical: N Claude sessions each spawn a supabase-ops against this one file, each
// refreshed at boot, and each kept its own in-memory refresh token rotating hourly. One
// process presenting a token another had already rotated triggers Supabase's reuse
// detection, which revokes the WHOLE session — every refresh token — permanently.
//
// The cure is to refresh only when the persisted access token is actually near expiry,
// and to let only the credential-lock holder do it (see credential-lock.ts).

/** How long an access token must still be valid for a follower to accept it as-is. */
export const FRESH_MARGIN_MS = 5 * 60_000;

/** The on-disk shape. Any field may be absent on a partially-written / seeded file. */
export interface StoredCredential {
  refreshToken: string | null;
  accessToken: string | null;
  updatedAt: string | null;
}

/** Read all three fields at once. Returns null when the file is missing or unparseable. */
export function readCredential(filePath: string | null | undefined): StoredCredential | null {
  if (!filePath) return null;
  try {
    const p = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v ? v : null);
    return { refreshToken: str(p.refresh_token), accessToken: str(p.access_token), updatedAt: str(p.updated_at) };
  } catch {
    return null;
  }
}

/**
 * `exp` of a JWT, in ms since epoch. Null when the token is absent, malformed, or carries
 * no numeric `exp` — all of which callers must treat as "not fresh" (fail-closed).
 * Deliberately does NOT verify the signature: this only decides whether to spend a
 * refresh, never whether to grant authority. The DB verifies the signature.
 */
export function accessTokenExpiryMs(token: string | null | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { exp?: unknown };
    return typeof claims.exp === "number" && Number.isFinite(claims.exp) ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True when `token` is valid for at least `marginMs` beyond `nowMs`. Fail-closed on any miss. */
export function isAccessTokenFresh(
  token: string | null | undefined,
  nowMs: number,
  marginMs: number = FRESH_MARGIN_MS,
): boolean {
  const exp = accessTokenExpiryMs(token);
  return exp != null && exp - nowMs > marginMs;
}

/**
 * Raised when Supabase has revoked the refresh token — the session is gone and no retry
 * will bring it back. Distinguished from transient failures so the boot path can decide
 * between self-healing (owner machine) and a loud, actionable death (everyone else).
 */
export class CredentialRevokedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialRevokedError";
  }
}

/**
 * Does this refresh failure mean "revoked", as opposed to a network blip? Supabase says
 * `Invalid Refresh Token: Already Used` when reuse detection fires, and `... Not Found`
 * once the session is gone. Matched loosely because the wording is not a stable contract;
 * a false positive only means we self-heal (or alert) when a retry might have sufficed.
 */
export function isRevokedRefreshError(message: string): boolean {
  return /already used|invalid refresh token|refresh token not found|revoked/i.test(message);
}
