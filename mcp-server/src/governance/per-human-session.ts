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
import { CredentialRevokedError, readCredential } from "./operator-credential.ts";
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

/** Injected so tests exercise the self-heal and alert branches without network or files. */
export interface SessionDeps {
  ensure: typeof ensurePerHumanClient;
  eligible: typeof canSelfHeal;
  heal: typeof selfHealCredential;
  reset: typeof resetClient;
  notify: typeof notifyFounder;
}

const defaultDeps: SessionDeps = {
  ensure: ensurePerHumanClient,
  eligible: canSelfHeal,
  heal: selfHealCredential,
  reset: resetClient,
  notify: notifyFounder,
};

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
    const s = await deps.ensure(env);
    return { ...s, selfHealed: false };
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

    // Entitled. Mint a fresh session for the same `sub`, persist, and re-establish.
    await deps.heal(env, elig);
    deps.reset(); // drop the cached client built around the dead token
    const s = await deps.ensure(env);

    await deps.notify(
      revokedCredentialAlert({ email: elig.email, selfHealed: true, detail: err.message }),
    );
    return { ...s, selfHealed: true };
  }
}
