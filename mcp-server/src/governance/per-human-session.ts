/**
 * Boot-time per-human session establishment (capability multi-user-auth, 2026-07-10).
 *
 * Three outcomes, in order of preference:
 *   1. A live session — either this process leads and refreshed, or a leader already
 *      published a fresh access token and we follow it. No alert; this is the normal path.
 *   2. Supabase revoked the session, but this machine holds the service key and the dead
 *      credential names an owner: mint a fresh session for the SAME identity, persist it,
 *      and tell the founder it self-healed. The MCP boots.
 *   3. Anything else: fail closed — but LOUDLY. Before 2026-07-10 this path wrote `FATAL`
 *      to a stderr nobody reads and exited, and the outage went unnoticed for seven days.
 *
 * The alert is best-effort and can never turn a recoverable failure into a fatal one:
 * `notifyFounder` swallows everything.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ensurePerHumanClient } from "../lib/supabase-client.ts";
import { resetClient } from "../lib/supabase-client.ts";
import { CredentialRevokedError, readCredential, isAccessTokenFresh } from "./operator-credential.ts";
import { tryAcquireCredentialLock } from "./credential-lock.ts";
import { canSelfHeal, selfHealCredential, SELF_HEAL_REMEDY } from "./self-heal.ts";
import { decodeJwtClaims } from "./operator-identity.ts";
import { notifyFounder, revokedCredentialAlert } from "../lib/alert.ts";
import type { ServerEnv } from "../lib/env.ts";

export interface PerHumanSession {
  client: SupabaseClient;
  accessToken: string;
  role: "leader" | "follower";
  selfHealed: boolean;
}

/** A leader mid-refresh is a transient condition, not a reason to page the founder. */
const BUSY_RETRIES = 3;
const BUSY_BACKOFF_MS = 1_500;
/** How long to wait for a sibling that is already self-healing. */
const HEAL_WAIT_MS = 10_000;
const HEAL_POLL_MS = 250;

/** Injected so tests exercise the self-heal and alert branches without network or files. */
export interface SessionDeps {
  ensure: typeof ensurePerHumanClient;
  eligible: typeof canSelfHeal;
  heal: typeof selfHealCredential;
  reset: typeof resetClient;
  notify: typeof notifyFounder;
  /** Injectable so the retry/wait paths do not put real seconds into the test suite. */
  sleep: (ms: number) => Promise<void>;
}

const defaultDeps: SessionDeps = {
  ensure: ensurePerHumanClient,
  eligible: canSelfHeal,
  heal: selfHealCredential,
  reset: resetClient,
  notify: notifyFounder,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

const isBusy = (e: unknown) => e instanceof Error && e.name === "CredentialBusyError";

/**
 * `CredentialBusyError` means a live leader is mid-refresh. It is explicitly retryable, yet
 * the first draft let it reach `main().catch`, which paged the founder with a red
 * "won't boot" alert and exited — for a condition that resolves in about a second. A slow
 * refresh (cold DNS) was enough to kill every sibling booting alongside it.
 */
async function ensureWithBusyRetry(env: ServerEnv, deps: SessionDeps): Promise<PerHumanSession> {
  let last: unknown;
  for (let attempt = 0; attempt <= BUSY_RETRIES; attempt++) {
    try {
      const s = await deps.ensure(env);
      return { ...s, selfHealed: false };
    } catch (err) {
      if (!isBusy(err)) throw err;
      last = err;
      if (attempt < BUSY_RETRIES) await deps.sleep(BUSY_BACKOFF_MS);
    }
  }
  throw last;
}

/** True once the credential file carries a token that is live enough to use. */
function credentialIsUsable(env: ServerEnv): boolean {
  const cred = readCredential(env.perHumanRefreshTokenFile);
  return !!cred?.accessToken && isAccessTokenFresh(cred.accessToken, Date.now());
}

/** The operator's email as recorded in the (possibly dead) credential — for the alert only. */
function emailFromCredential(env: ServerEnv): string | null {
  const cred = readCredential(env.perHumanRefreshTokenFile);
  return cred?.accessToken ? decodeJwtClaims(cred.accessToken).email : null;
}

/**
 * Establish a per-human session, self-healing a revoked credential when this machine is
 * entitled to. Throws (fail-closed) when it cannot — after alerting the founder.
 */
export async function establishPerHumanSession(
  env: ServerEnv,
  deps: SessionDeps = defaultDeps,
): Promise<PerHumanSession> {
  try {
    return await ensureWithBusyRetry(env, deps);
  } catch (err) {
    if (!(err instanceof CredentialRevokedError)) throw err;

    const email = emailFromCredential(env);
    const elig = deps.eligible(env);

    if (!elig.ok) {
      // Not entitled to self-heal (co-founder machine, no prior identity, non-owner).
      // Say so out loud, name the remedy, then die closed.
      await deps.notify(
        revokedCredentialAlert({
          email,
          selfHealed: false,
          detail: `${err.message} — ${SELF_HEAL_REMEDY[elig.reason]}`,
        }),
      );
      throw err;
    }

    // Entitled — but only ONE of us may mint. The auth provider stores a single magic-link
    // token per user, so N owner sessions all healing at once means each `generate_link`
    // invalidates the previous one's OTP: the earlier siblings' `verify` fails, they die,
    // and each pages the founder with a false "won't boot" — on the exact multi-session
    // machine this PR is about. Serialize on the same lock that serializes refreshes.
    const file = env.perHumanRefreshTokenFile;
    const lock = file ? tryAcquireCredentialLock(file) : null;

    if (file && !lock) {
      // A sibling is healing. Wait for its result rather than minting a competing link.
      // Bounded by ATTEMPTS, not by the wall clock: `sleep` is injectable, and a test that
      // stubs it must not be punished with ten seconds of spinning.
      const attempts = Math.ceil(HEAL_WAIT_MS / HEAL_POLL_MS);
      for (let i = 0; i < attempts; i++) {
        await deps.sleep(HEAL_POLL_MS);
        if (credentialIsUsable(env)) {
          deps.reset();
          return await ensureWithBusyRetry(env, deps);
        }
      }
      // The sibling never published. Fall through and die closed, loudly.
      await deps.notify(
        revokedCredentialAlert({
          email,
          selfHealed: false,
          detail: `${err.message} — another session held the credential lock and never published a healed token.`,
        }),
      );
      throw err;
    }

    try {
      // Re-read under the lock: a sibling may have healed while we were acquiring.
      if (credentialIsUsable(env)) {
        deps.reset();
        return await ensureWithBusyRetry(env, deps);
      }
      await deps.heal(env, elig);
    } finally {
      lock?.release(); // ensure() re-acquires it to become leader
    }

    deps.reset(); // drop the cached client built around the dead token
    const s = await ensureWithBusyRetry(env, deps);

    await deps.notify(
      revokedCredentialAlert({ email: elig.email, selfHealed: true, detail: err.message }),
    );
    return { ...s, selfHealed: true };
  }
}
