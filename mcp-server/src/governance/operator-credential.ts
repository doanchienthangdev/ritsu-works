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
 * Single-machine / single-session assumption (concurrent sessions racing on the
 * same file is a known limitation — the Sprint 2 hosted broker handles multi-user
 * credential lifecycle properly).
 */

import { readFileSync, writeFileSync, renameSync, chmodSync } from "node:fs";
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

/** Atomically persist a rotated refresh token back to the credential file (0600). */
export function persistRefreshToken(filePath: string, refreshToken: string, nowIso: string): void {
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, JSON.stringify({ refresh_token: refreshToken, updated_at: nowIso }) + "\n", {
    mode: 0o600,
  });
  renameSync(tmp, filePath);
  try {
    chmodSync(filePath, 0o600);
  } catch {
    // best-effort perms; non-fatal on filesystems that don't support chmod
  }
}
