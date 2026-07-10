// The P0 from the PR #327 adversarial review, and the P1 next to it.
//
// P0. Once a process became leader, `if (leader) return` short-circuited every later call
//     and nothing re-checked lock ownership. A leader whose heartbeat merely LAPSED (laptop
//     sleep, a blocked event loop) and was therefore legitimately stolen from kept its
//     supabase-js auto-refresh ticker running forever — a second, unsanctioned refresher.
//     Two refreshers more than 10s apart is exactly what makes Supabase revoke the whole
//     session. The fix's own premise, reopened.
//
// P1. `onAuthStateChange` persisted only on success. A background refresh failure left the
//     credential file frozen at a dead token while the heartbeat kept beating, so no
//     follower could ever steal the lock and take over. The ZOMBIE LEADER.
//
// Both are now cured by demotion. These tests fail if either cure is removed.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const refreshSession = vi.fn();
const setSession = vi.fn();
const stopAutoRefresh = vi.fn();
/** Captured so a test can drive the auth-state callback the leader registers. */
let authCb: ((event: string, session: unknown) => void) | null = null;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      refreshSession,
      setSession,
      stopAutoRefresh,
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
        authCb = cb;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  }),
}));

const { ensurePerHumanClient, resetClient } = await import("../src/lib/supabase-client.ts");
import type { ServerEnv } from "../src/lib/env.ts";

const OPS_URL = "https://mntobbmieuoaxipnjaau.supabase.co";
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (expMs: number) => `${b64({ alg: "HS256" })}.${b64({ exp: Math.floor(expMs / 1000), sub: "s1" })}.sig`;
const FRESH = () => token(Date.now() + 60 * 60_000);
const STALE = () => token(Date.now() - 60_000);

let dir: string;
let file: string;
const env = (): ServerEnv =>
  ({ url: OPS_URL, serviceKey: "svc", anonKey: "anon", authMode: "per-human", perHumanRefreshTokenFile: file }) as ServerEnv;

const writeCred = (access: string, refresh = "rt-1") =>
  writeFileSync(file, JSON.stringify({ refresh_token: refresh, access_token: access }), { mode: 0o600 });
const readCred = () => JSON.parse(readFileSync(file, "utf8")) as { refresh_token: string; access_token: string };
/** Overwrite the lock with another pid's ownership — a thief took it while we lapsed. */
const stealFromUs = () =>
  writeFileSync(`${file}.lock`, JSON.stringify({ pid: process.pid + 1, host: "thief", acquired_at: "x" }));

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "demote-"));
  file = join(dir, ".operator-refresh.json");
  authCb = null;
  refreshSession.mockReset();
  setSession.mockReset();
  stopAutoRefresh.mockReset();
  resetClient();
  refreshSession.mockResolvedValue({ data: { session: { access_token: FRESH(), refresh_token: "rt-2" } }, error: null });
  setSession.mockImplementation(async ({ access_token }: { access_token: string }) => ({
    data: { session: { access_token, refresh_token: "rt-1" } },
    error: null,
  }));
});
afterEach(() => {
  resetClient();
  rmSync(dir, { recursive: true, force: true });
});

async function becomeLeaderNow() {
  writeCred(STALE());
  const r = await ensurePerHumanClient(env());
  expect(r.role).toBe("leader");
  expect(refreshSession).toHaveBeenCalledTimes(1);
  return r;
}

// ── P0: a stolen-from leader must stop refreshing ───────────────────────────────
describe("P0 — a leader that lost the lock stands down", () => {
  it("demotes on the next call instead of returning its leader client", async () => {
    await becomeLeaderNow();
    stealFromUs();
    writeCred(FRESH(), "rt-9"); // the new leader published

    const again = await ensurePerHumanClient(env());
    expect(again.role).toBe("follower");
  });

  it("silences its own auto-refresh ticker — otherwise it is a second refresher", async () => {
    await becomeLeaderNow();
    stealFromUs();
    writeCred(FRESH(), "rt-9");
    await ensurePerHumanClient(env());
    expect(stopAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it("never refreshes again after demotion, even across many calls", async () => {
    await becomeLeaderNow();
    stealFromUs();
    writeCred(FRESH(), "rt-9");
    await ensurePerHumanClient(env());
    await ensurePerHumanClient(env());
    await ensurePerHumanClient(env());
    expect(refreshSession).toHaveBeenCalledTimes(1); // the one from becoming leader
  });

  it("does NOT evict the thief's lock when it stands down", async () => {
    await becomeLeaderNow();
    stealFromUs();
    writeCred(FRESH(), "rt-9");
    await ensurePerHumanClient(env());
    const lock = JSON.parse(readFileSync(`${file}.lock`, "utf8")) as { pid: number };
    expect(lock.pid).toBe(process.pid + 1);
  });

  it("keeps leading while the lock is still ours", async () => {
    await becomeLeaderNow();
    const again = await ensurePerHumanClient(env());
    expect(again.role).toBe("leader");
    expect(stopAutoRefresh).not.toHaveBeenCalled();
  });
});

// ── P1: the zombie leader ───────────────────────────────────────────────────────
describe("P1 — a leader whose background refresh died stands down", () => {
  it("registers an auth-state callback at all", async () => {
    await becomeLeaderNow();
    expect(authCb).toBeTypeOf("function");
  });

  it("persists every rotated token, so followers stay alive", async () => {
    await becomeLeaderNow();
    const rotated = FRESH();
    authCb!("TOKEN_REFRESHED", { access_token: rotated, refresh_token: "rt-3" });
    expect(readCred()).toMatchObject({ refresh_token: "rt-3", access_token: rotated });
  });

  it("keeps the leader's own access token current on rotation", async () => {
    await becomeLeaderNow();
    const rotated = FRESH();
    authCb!("TOKEN_REFRESHED", { access_token: rotated, refresh_token: "rt-3" });
    const still = await ensurePerHumanClient(env());
    expect(still.role).toBe("leader");
    expect(still.accessToken).toBe(rotated);
  });

  it("demotes on SIGNED_OUT rather than beating on with a dead session", async () => {
    await becomeLeaderNow();
    authCb!("SIGNED_OUT", null);
    expect(stopAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it("after demoting it yields to whoever took over, instead of handing out its dead client", async () => {
    await becomeLeaderNow();
    authCb!("SIGNED_OUT", null);
    stealFromUs(); // a sibling grabbed the freed lock
    writeCred(FRESH(), "rt-9"); // and published a token
    expect((await ensurePerHumanClient(env())).role).toBe("follower");
  });

  it("if nobody else takes the freed lock it re-elects itself with a FRESH session", async () => {
    // Recovery, not zombie persistence: it must build a new client and adopt the live token,
    // never reuse the supabase-js session whose refresh just died.
    await becomeLeaderNow();
    authCb!("SIGNED_OUT", null);
    writeCred(FRESH(), "rt-9");
    setSession.mockClear();
    const again = await ensurePerHumanClient(env());
    expect(again.role).toBe("leader");
    expect(setSession).toHaveBeenCalledTimes(1); // adopted afresh
    expect(refreshSession).toHaveBeenCalledTimes(1); // and spent no extra rotation
  });

  it("releases the lock when it demotes, so a follower can take over", async () => {
    await becomeLeaderNow();
    authCb!("SIGNED_OUT", null);
    // The lock is ours no longer; a fresh acquirer succeeds cleanly, not as a steal.
    const { tryAcquireCredentialLock } = await import("../src/governance/credential-lock.ts");
    const h = tryAcquireCredentialLock(file);
    expect(h).not.toBeNull();
    expect(h!.stolen).toBe(false);
    h!.release();
  });

  it("a null session on any event demotes — a dead refresh has no event name we can trust", async () => {
    await becomeLeaderNow();
    authCb!("TOKEN_REFRESHED", null);
    expect(stopAutoRefresh).toHaveBeenCalledTimes(1);
  });
});
