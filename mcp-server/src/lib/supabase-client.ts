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
