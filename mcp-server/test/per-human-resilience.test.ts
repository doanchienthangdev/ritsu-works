// The four P2s the adversarial review left open on PR #327, now closed.
//
//  1. CredentialBusyError at boot was FATAL and paged the founder, though it is documented
//     "retryable". A leader refresh slower than 4s killed every sibling booting alongside it.
//  2. Self-heal was not serialized. N owner sessions booting after a revoke each minted a
//     magic link; the auth provider keeps ONE per user, so each mint invalidated the
//     previous sibling's OTP. Earlier siblings died and each paged a false "won't boot".
//  3. A clean leader exit re-elected nobody until some session made its next tool call, so
//     an all-idle machine let the credential file expire under the two components that only
//     READ it.
//  4. (server.ts) The audit row was written on the stale boot client when token
//     re-resolution threw — covered by inspection, not here: server.ts has no unit harness.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const refreshSession = vi.fn();
const setSession = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { refreshSession, setSession, stopAutoRefresh: vi.fn(), onAuthStateChange: vi.fn() },
  }),
}));

const { ensurePerHumanClient, resetClient, CredentialBusyError } = await import("../src/lib/supabase-client.ts");
const { establishPerHumanSession } = await import("../src/governance/per-human-session.ts");
const { CredentialRevokedError } = await import("../src/governance/operator-credential.ts");
import type { ServerEnv } from "../src/lib/env.ts";

const OPS_URL = "https://mntobbmieuoaxipnjaau.supabase.co";
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (expMs: number) => `${b64({ alg: "HS256" })}.${b64({ exp: Math.floor(expMs / 1000), sub: "s1", email: "o@x", app_metadata: { tier: "owner" } })}.sig`;
const FRESH = () => token(Date.now() + 60 * 60_000);
const DEAD = () => token(Date.now() - 60_000);

let dir: string;
let file: string;
const env = (): ServerEnv =>
  ({ url: OPS_URL, serviceKey: "svc", anonKey: "anon", authMode: "per-human", perHumanRefreshTokenFile: file }) as ServerEnv;
const writeCred = (access: string, refresh = "rt-1") =>
  writeFileSync(file, JSON.stringify({ refresh_token: refresh, access_token: access }), { mode: 0o600 });
const foreignLock = () =>
  writeFileSync(`${file}.lock`, JSON.stringify({ pid: process.pid + 1, host: "sibling", acquired_at: "x" }));

const session = { client: {} as never, accessToken: "at", role: "leader" as const };
const deps = (over: Record<string, unknown> = {}) =>
  ({
    ensure: vi.fn().mockResolvedValue(session),
    eligible: vi.fn().mockReturnValue({ ok: true, email: "o@x", sub: "s1", file }),
    heal: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
    notify: vi.fn().mockResolvedValue({ delivered: true }),
    sleep: vi.fn().mockResolvedValue(undefined),
    ...over,
  }) as never;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "resil-"));
  file = join(dir, ".operator-refresh.json");
  refreshSession.mockReset();
  setSession.mockReset();
  resetClient();
  refreshSession.mockResolvedValue({ data: { session: { access_token: FRESH(), refresh_token: "rt-2" } }, error: null });
  setSession.mockImplementation(async ({ access_token }: { access_token: string }) => ({
    data: { session: { access_token, refresh_token: "rt-1" } },
    error: null,
  }));
});
afterEach(() => {
  resetClient();
  vi.useRealTimers();
  rmSync(dir, { recursive: true, force: true });
});

// ── P2 #1 — a busy leader is transient, not fatal ───────────────────────────────
describe("CredentialBusyError is retried, not fatal", () => {
  const busy = () => new CredentialBusyError("leader mid-refresh");

  it("retries and succeeds when the leader publishes on the second attempt", async () => {
    writeCred(DEAD());
    const ensure = vi.fn().mockRejectedValueOnce(busy()).mockResolvedValueOnce(session);
    const d = deps({ ensure });
    const out = await establishPerHumanSession(env(), d);
    expect(out.role).toBe("leader");
    expect(ensure).toHaveBeenCalledTimes(2);
    expect((d as any).sleep).toHaveBeenCalledTimes(1);
    expect((d as any).notify).not.toHaveBeenCalled(); // no founder page for a 1s hiccup
  });

  it("gives the leader several chances before giving up", async () => {
    writeCred(DEAD());
    const ensure = vi.fn().mockRejectedValue(busy());
    const d = deps({ ensure });
    await expect(establishPerHumanSession(env(), d)).rejects.toBeInstanceOf(CredentialBusyError);
    expect(ensure.mock.calls.length).toBeGreaterThanOrEqual(4); // initial + retries
  });

  it("never pages the founder for a busy leader, even after exhausting retries", async () => {
    writeCred(DEAD());
    const d = deps({ ensure: vi.fn().mockRejectedValue(busy()) });
    await establishPerHumanSession(env(), d).catch(() => {});
    expect((d as any).notify).not.toHaveBeenCalled();
    expect((d as any).heal).not.toHaveBeenCalled();
  });

  it("does NOT retry a revoked credential — that is not transient", async () => {
    writeCred(DEAD());
    const ensure = vi.fn().mockRejectedValue(new CredentialRevokedError("Already Used"));
    const d = deps({ ensure });
    await establishPerHumanSession(env(), d).catch(() => {});
    // one attempt, then straight into the heal branch
    expect(ensure).toHaveBeenCalledTimes(2); // the failing one + the post-heal re-establish
    expect((d as any).heal).toHaveBeenCalledOnce();
  });

  it("carries the name server.ts uses to classify it as transient", () => {
    expect(busy().name).toBe("CredentialBusyError");
  });
});

// ── P2 #2 — only one process may mint a magic link ──────────────────────────────
describe("self-heal is serialized on the credential lock", () => {
  const revoked = () => new CredentialRevokedError("Already Used");

  it("a sibling holding the lock makes us WAIT rather than mint a competing link", async () => {
    writeCred(DEAD());
    foreignLock(); // a sibling is healing
    const ensure = vi.fn().mockRejectedValueOnce(revoked()).mockResolvedValueOnce(session);
    // The sibling publishes while we poll.
    const sleep = vi.fn().mockImplementation(async () => writeCred(FRESH(), "rt-healed"));
    const d = deps({ ensure, sleep });

    const out = await establishPerHumanSession(env(), d);
    expect(out.role).toBe("leader");
    expect((d as any).heal).not.toHaveBeenCalled(); // we minted nothing
    expect((d as any).reset).toHaveBeenCalled();
  });

  it("we heal when the lock is ours, and release it so ensure() can lead", async () => {
    writeCred(DEAD());
    const ensure = vi.fn().mockRejectedValueOnce(revoked()).mockResolvedValueOnce(session);
    const d = deps({ ensure });
    const out = await establishPerHumanSession(env(), d);
    expect(out.selfHealed).toBe(true);
    expect((d as any).heal).toHaveBeenCalledOnce();
    // Lock released: a fresh acquirer takes it cleanly, not as a steal.
    const { tryAcquireCredentialLock } = await import("../src/governance/credential-lock.ts");
    const h = tryAcquireCredentialLock(file);
    expect(h?.stolen).toBe(false);
    h!.release();
  });

  it("skips the mint entirely if a sibling healed while we were acquiring the lock", async () => {
    writeCred(FRESH(), "rt-healed"); // already usable by the time we look under the lock
    const ensure = vi.fn().mockRejectedValueOnce(revoked()).mockResolvedValueOnce(session);
    const d = deps({ ensure });
    const out = await establishPerHumanSession(env(), d);
    expect((d as any).heal).not.toHaveBeenCalled();
    expect(out.selfHealed).toBe(false);
  });

  it("dies loudly if the sibling holding the lock never publishes", async () => {
    writeCred(DEAD());
    foreignLock();
    const d = deps({ ensure: vi.fn().mockRejectedValue(revoked()) });
    await expect(establishPerHumanSession(env(), d)).rejects.toBeInstanceOf(CredentialRevokedError);
    expect((d as any).heal).not.toHaveBeenCalled();
    const msg = (d as any).notify.mock.calls[0][0] as string;
    expect(msg).toContain("KHÔNG BOOT ĐƯỢC");
  });

  it("a non-eligible operator never touches the lock at all", async () => {
    writeCred(DEAD());
    const d = deps({
      ensure: vi.fn().mockRejectedValue(revoked()),
      eligible: vi.fn().mockReturnValue({ ok: false, reason: "no_service_key" }),
    });
    await establishPerHumanSession(env(), d).catch(() => {});
    expect((d as any).heal).not.toHaveBeenCalled();
    // no lock left lying around for the next process to have to steal
    const { tryAcquireCredentialLock } = await import("../src/governance/credential-lock.ts");
    const h = tryAcquireCredentialLock(file);
    expect(h?.stolen).toBe(false);
    h!.release();
  });
});

// ── P2 #3 — an idle follower must wake before the file expires ──────────────────
describe("a follower arms a wake-up so leadership is not purely on-demand", () => {
  it("schedules a timer when it falls back to following", async () => {
    vi.useFakeTimers();
    writeCred(FRESH());
    foreignLock(); // someone else leads
    const r = await ensurePerHumanClient(env());
    expect(r.role).toBe("follower");
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it("waking re-resolves: with the lock now free it takes over and refreshes", async () => {
    vi.useFakeTimers();
    writeCred(FRESH());
    foreignLock();
    await ensurePerHumanClient(env());

    // The leader exits: its lock is gone, and by now the token has gone stale.
    rmSync(`${file}.lock`);
    writeCred(DEAD());

    await vi.advanceTimersByTimeAsync(70 * 60_000);
    expect(refreshSession).toHaveBeenCalledTimes(1); // the follower promoted itself
  });

  it("a leader arms no follower wake — its only timer is the lock heartbeat", async () => {
    vi.useFakeTimers();
    writeCred(DEAD());
    const r = await ensurePerHumanClient(env());
    expect(r.role).toBe("leader");
    // Exactly one timer: startHeartbeat's interval. A follower wake would be a second.
    expect(vi.getTimerCount()).toBe(1);
    // And time passing never makes a leader refresh twice — the client library owns that.
    await vi.advanceTimersByTimeAsync(70 * 60_000);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
