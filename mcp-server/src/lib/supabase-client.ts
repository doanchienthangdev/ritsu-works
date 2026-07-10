/**
 * Singleton Supabase JS client, hardened against pointing at non-ritsu-ops.
 *
 * Use `getClient(env)` instead of constructing one inline. The factory:
 *   - Picks service key if available, else anon key
 *   - Re-asserts project_ref at construction time (defense vs in-memory env mutation)
 *   - Reuses the same client across calls (Supabase JS is HTTP, no pool to leak)
 *
 * PER-HUMAN MODE — leader / follower (2026-07-10). Supabase rotates refresh tokens on use
 * and treats a rotated token presented outside a 10s window as theft, revoking the WHOLE
 * session. `.mcp.json` spawns one supabase-ops per Claude session against one shared
 * credential file, and the previous code had every instance refresh at boot AND keep
 * `autoRefreshToken: true` — so each held its own in-memory refresh token and rotated it
 * hourly. Two concurrent sessions sufficed to kill the session for everyone. See
 * credential-lock.ts for the full account.
 *
 * Now: exactly one process (the credential-lock holder, the LEADER) ever refreshes, and
 * only when the persisted access token is actually near expiry. Every other process is a
 * FOLLOWER: it reads the access token the leader persisted and never touches the refresh
 * token. A follower whose token goes stale because the leader died steals the lock (its
 * heartbeat has lapsed) and becomes the leader itself.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertProjectRefAllowed } from "../governance/project-ref-guard.ts";
import {
  readRefreshToken,
  readCredential,
  persistRefreshToken,
  isAccessTokenFresh,
  accessTokenExpiryMs,
  isRevokedRefreshError,
  CredentialRevokedError,
  FRESH_MARGIN_MS,
} from "../governance/operator-credential.ts";
import {
  tryAcquireCredentialLock,
  startHeartbeat,
  type LockHandle,
} from "../governance/credential-lock.ts";
import type { ServerEnv } from "./env.ts";

let cached: SupabaseClient | null = null;
let cachedKey: string | null = null;

/** Once this process wins the lock it leads for its whole lifetime. */
let leader: {
  client: SupabaseClient;
  accessToken: string;
  lock: LockHandle;
  stopHeartbeat: () => void;
} | null = null;

/** How long a follower waits for a mid-refresh leader before giving up. */
const FOLLOWER_WAIT_MS = 4_000;
const FOLLOWER_POLL_MS = 200;

/** Raised when a live leader is refreshing and no fresh token appeared in time. Retryable. */
export class CredentialBusyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialBusyError";
  }
}

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
    return bearerClient(env.url, anon, token);
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

/** A read-only `authenticated` client pinned to one access token. Never refreshes. */
function bearerClient(url: string, anon: string, token: string): SupabaseClient {
  const cacheKey = `per-human:${token}`;
  if (cached && cachedKey === cacheKey) return cached;
  cached = createClient(url, anon, {
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The no-op handle used when there is no credential file or the escape hatch is on. */
const NOOP_LOCK: LockHandle = {
  lockPath: "",
  stolen: false,
  isOwned: () => true,
  touch: () => true,
  release() {},
};

/** One pending follower wake-up at a time. `unref`'d, so it never holds the process open. */
let followerTimer: ReturnType<typeof setTimeout> | null = null;
/** Never wake sooner than this, however close to expiry the token already is. */
const MIN_WAKE_MS = 30_000;

/**
 * Followers only re-resolve when a tool call arrives. Leadership therefore changes hands
 * only on demand — so when a busy session (the leader) closes while other sessions sit idle,
 * NOBODY refreshes, and the credential file expires under two components that merely read it
 * (the analytics MCP and the gbrain hook). This one-shot timer wakes a follower just before
 * its token stops being fresh; whoever finds the lock free becomes the new leader.
 */
function scheduleFollowerWake(env: ServerEnv, accessToken: string): void {
  if (leader) return;
  if (followerTimer) clearTimeout(followerTimer);
  const exp = accessTokenExpiryMs(accessToken);
  if (exp == null) return;
  // Fire a little before the token stops counting as fresh, so the takeover is not a scramble.
  const delay = Math.max(MIN_WAKE_MS, exp - FRESH_MARGIN_MS - 30_000 - Date.now());
  followerTimer = setTimeout(() => {
    followerTimer = null;
    // Transient failures are fine: the next tool call, or the next wake, retries.
    void ensurePerHumanClient(env).catch(() => {});
  }, delay);
  followerTimer.unref?.();
}

/** Build the follower result and arm the wake-up. */
function asFollower(
  env: ServerEnv,
  anon: string,
  token: string,
): { client: SupabaseClient; accessToken: string; role: "follower" } {
  scheduleFollowerWake(env, token);
  return { client: bearerClient(env.url, anon, token), accessToken: token, role: "follower" };
}

/**
 * Step down. Called when we lapsed and were stolen from, or when the background refresh
 * died. Both cases MUST stop this process refreshing: a leader that keeps its auto-refresh
 * ticker after losing the lock becomes a second refresher, and a leader whose refresh is
 * dead but whose heartbeat still beats starves every follower out of taking over. Either
 * way the next `ensurePerHumanClient` re-resolves us from the file, as a follower.
 */
function demoteLeader(reason: string): void {
  if (!leader) return;
  const { client, lock, stopHeartbeat } = leader;
  leader = null;
  cached = null;
  cachedKey = null;
  stopHeartbeat();
  try {
    // Silence supabase-js's own refresh ticker. Optional-chained: older clients lack it.
    (client.auth as { stopAutoRefresh?: () => void }).stopAutoRefresh?.();
  } catch {
    /* best-effort */
  }
  lock.release(); // no-op unless we still own it
  process.stderr.write(`[supabase-ops] leader demoted: ${reason}\n`);
}

/**
 * Resolve a usable per-human client, refreshing only if this process is the leader AND the
 * persisted access token is actually near expiry.
 *
 * Cheap on the hot path: a follower with a fresh token does one `readFileSync` plus one
 * base64 decode, then returns the cached client. Safe to call on every tool invocation —
 * and it must be, so a follower picks up the token the leader rotates each hour.
 *
 * Throws `CredentialRevokedError` when Supabase has killed the session (the caller may
 * self-heal), and `CredentialBusyError` when a live leader is mid-refresh.
 */
export async function ensurePerHumanClient(
  env: ServerEnv,
  nowMs: number = Date.now(),
): Promise<{ client: SupabaseClient; accessToken: string; role: "leader" | "follower" }> {
  assertProjectRefAllowed(env.url);
  const anon = env.anonKey;
  if (!anon) throw new Error("per-human refresh requires the anon key");

  // Already leading — but only if we still hold the lock. A lapsed leader (laptop sleep,
  // blocked event loop) can have been legitimately stolen from; it must not keep refreshing.
  // The heartbeat normally catches this; this per-call check closes the window between the
  // theft and the next 30s tick.
  if (leader) {
    if (leader.lock.isOwned()) {
      return { client: leader.client, accessToken: leader.accessToken, role: "leader" };
    }
    demoteLeader("lock was stolen while we lapsed");
  }

  const file = env.perHumanRefreshTokenFile;
  const stored = readCredential(file);
  const storedIsFresh = isAccessTokenFresh(stored?.accessToken, nowMs);

  // Try to LEAD even when the token is fresh. Someone must keep the file current: the
  // analytics MCP and the gbrain hook only ever READ the access token persisted here, so
  // if no process holds a session with auto-refresh on, both go dark the moment it expires.
  // The leader with a fresh token adopts the session (`setSession`) rather than refreshing —
  // no rotation is spent, and supabase-js then refreshes it *before* expiry, as before.
  const lock = file ? tryAcquireCredentialLock(file) : NOOP_LOCK;

  if (!lock) {
    // Someone else leads. A fresh token is all a follower needs.
    if (stored?.accessToken && storedIsFresh) {
      return asFollower(env, anon, stored.accessToken);
    }
    // The leader is mid-refresh. Wait briefly for it to publish.
    const deadline = Date.now() + FOLLOWER_WAIT_MS;
    while (Date.now() < deadline) {
      await sleep(FOLLOWER_POLL_MS);
      const again = readCredential(file);
      if (again?.accessToken && isAccessTokenFresh(again.accessToken, Date.now())) {
        return asFollower(env, anon, again.accessToken);
      }
    }
    throw new CredentialBusyError(
      "another supabase-ops instance holds the credential lock and has not published a fresh token; retry shortly",
    );
  }

  try {
    // Re-read under the lock: a previous holder may have persisted while we were acquiring.
    const underLock = readCredential(file);
    return await becomeLeader(env, anon, lock, underLock ?? stored);
  } catch (err) {
    lock.release();
    throw err;
  }
}

/**
 * Take the one session this machine is allowed to drive, and hold the lock for our lifetime.
 *
 * Two ways in. If `stored` still carries a live access token we ADOPT it (`setSession`) —
 * no rotation is spent, and supabase-js schedules the refresh before expiry. Only when the
 * token is stale (or adoption fails) do we spend a rotation via `refreshSession`. Either
 * way this process, and only this process, keeps the credential file current for the
 * read-only consumers.
 */
async function becomeLeader(
  env: ServerEnv,
  anon: string,
  lock: LockHandle,
  stored: { accessToken: string | null; refreshToken: string | null } | null,
): Promise<{ client: SupabaseClient; accessToken: string; role: "leader" }> {
  const refreshToken = readRefreshToken(env); // file (source of truth) > inline seed
  if (!refreshToken) {
    throw new Error(
      "per-human refresh requires a refresh token (RITSU_OPERATOR_REFRESH_TOKEN_FILE / _TOKEN)",
    );
  }

  const client = createClient(env.url, anon, {
    // Only the leader auto-refreshes. Followers must never construct a client with this on.
    auth: { persistSession: false, autoRefreshToken: true },
    global: { headers: { "X-Client-Info": "supabase-ops-mcp/0.1.0" } },
  });

  const file = env.perHumanRefreshTokenFile;
  if (file) {
    client.auth.onAuthStateChange((event, session) => {
      if (session?.refresh_token) {
        try {
          persistRefreshToken(file, session.refresh_token, new Date().toISOString(), session.access_token);
          if (leader && session.access_token) leader.accessToken = session.access_token;
        } catch {
          /* non-fatal: the next boot re-reads whatever did land */
        }
        return;
      }
      // No session: the background refresh failed, or the session was signed out/revoked.
      // Persisting nothing and beating on regardless is the ZOMBIE LEADER — the credential
      // file freezes at a dead token while our heartbeat keeps every follower from taking
      // over. Step down so someone else can.
      if (event === "SIGNED_OUT" || session === null) {
        demoteLeader(`auth state '${event}' with no session — background refresh is dead`);
      }
    });
  }

  // ADOPT — the token is still good. Costs no rotation; supabase-js takes over from here.
  let accessToken: string | null = null;
  if (stored?.accessToken && isAccessTokenFresh(stored.accessToken, Date.now())) {
    const { data, error } = await client.auth.setSession({
      access_token: stored.accessToken,
      refresh_token: refreshToken,
    });
    if (!error && data?.session?.access_token) accessToken = data.session.access_token;
    // On error we fall through to a real refresh: a rotation is cheaper than a dark gate.
  }

  // REFRESH — the token is stale (or adoption failed). This is the one rotation.
  if (!accessToken) {
    const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session?.access_token) {
      const detail = error?.message ?? "no session returned";
      if (isRevokedRefreshError(detail)) {
        throw new CredentialRevokedError(`per-human refresh failed (session revoked): ${detail}`);
      }
      throw new Error(`per-human refresh failed (token revoked/expired/rotated?): ${detail}`);
    }
    accessToken = data.session.access_token;
    // Belt-and-suspenders: onAuthStateChange may fire asynchronously, so persist now too.
    if (file && data.session.refresh_token) {
      try {
        persistRefreshToken(file, data.session.refresh_token, new Date().toISOString(), accessToken);
      } catch {
        /* non-fatal */
      }
    }
  }

  // The heartbeat also WATCHES: the moment the lock stops being ours, we stand down.
  const stopHeartbeat = startHeartbeat(lock, undefined, () =>
    demoteLeader("heartbeat found the lock no longer ours"),
  );
  process.once("exit", () => {
    stopHeartbeat();
    lock.release();
  });

  if (followerTimer) {
    clearTimeout(followerTimer);
    followerTimer = null;
  }
  cached = client;
  cachedKey = "per-human-leader";
  leader = { client, accessToken, lock, stopHeartbeat };
  return { client, accessToken, role: "leader" };
}

/**
 * Back-compat shim for the original boot entrypoint. Same contract minus the race: it no
 * longer refreshes unconditionally, and it no longer leaves `autoRefreshToken` on in every
 * process. Kept so existing callers and tests keep working.
 */
export async function refreshPerHumanClient(
  env: ServerEnv,
): Promise<{ client: SupabaseClient; accessToken: string }> {
  const { client, accessToken } = await ensurePerHumanClient(env);
  return { client, accessToken };
}

/** Reset cache — for tests. */
export function resetClient(): void {
  if (followerTimer) {
    clearTimeout(followerTimer);
    followerTimer = null;
  }
  if (leader) {
    leader.stopHeartbeat();
    leader.lock.release();
  }
  leader = null;
  cached = null;
  cachedKey = null;
}
