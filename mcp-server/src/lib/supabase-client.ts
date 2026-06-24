/**
 * Singleton Supabase JS client, hardened against pointing at non-ritsu-ops.
 *
 * Use `getClient(env)` instead of constructing one inline. The factory:
 *   - Picks service key if available, else anon key
 *   - Re-asserts project_ref at construction time (defense vs in-memory env mutation)
 *   - Reuses the same client across calls (Supabase JS is HTTP, no pool to leak)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertProjectRefAllowed } from "../governance/project-ref-guard.ts";
import type { ServerEnv } from "./env.ts";

let cached: SupabaseClient | null = null;
let cachedKey: string | null = null;

export function getClient(env: ServerEnv): SupabaseClient {
  // Re-assert per construction. If env was mutated in-process to point at
  // Product, this catches it before any HTTP request.
  assertProjectRefAllowed(env.url);

  // --- per-human mode (capability multi-user-auth) -------------------------
  // Connect as `authenticated`: anon key + the operator's JWT in the
  // Authorization header. Every request then carries the verified human
  // identity, so Supabase enforces per-tier RLS (migration 00049). NO
  // service_role. The token is NOT trusted locally for authority — the DB
  // verifies its signature; a tampered token simply gets denied server-side.
  if (env.authMode === "per-human") {
    const anon = env.anonKey;
    const token = env.perHumanAccessToken;
    if (!anon || !token) {
      // loadEnv guards this; defense-in-depth here.
      throw new Error("per-human mode requires both anon key and operator access token");
    }
    // Cache key includes the token so a rotated token rebuilds the client.
    const cacheKey = `per-human:${token}`;
    if (cached && cachedKey === cacheKey) return cached;
    cached = createClient(env.url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          "X-Client-Info": "supabase-ops-mcp/0.1.0",
          Authorization: `Bearer ${token}`,
        },
      },
    });
    cachedKey = cacheKey;
    return cached;
  }

  // --- service-key mode (default, unchanged) -------------------------------
  const key = env.serviceKey ?? env.anonKey;
  if (!key) throw new Error("No key available — this should have been caught at boot");

  if (cached && cachedKey === key) return cached;

  cached = createClient(env.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        "X-Client-Info": "supabase-ops-mcp/0.1.0",
      },
    },
  });
  cachedKey = key;
  return cached;
}

/** Reset cache — for tests. */
export function resetClient(): void {
  cached = null;
  cachedKey = null;
}
