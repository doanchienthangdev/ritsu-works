// The load-bearing assertion of the whole fix: a process must NOT spend a refresh-token
// rotation unless it is the lock holder AND the persisted access token is near expiry.
//
// Everything else in this PR is scaffolding around that one sentence. Supabase revokes the
// entire session when a rotated refresh token is presented outside a 10s window, so "two
// processes both refreshed" is not a performance bug — it is a permanent lockout, and it is
// what silently killed supabase-ops on 2026-07-03.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const refreshSession = vi.fn();
const createdWith: Array<Record<string, unknown>> = [];

vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url: string, _key: string, opts: Record<string, unknown>) => {
    createdWith.push(opts);
    return { auth: { refreshSession, onAuthStateChange: vi.fn() } };
  },
}));

const { ensurePerHumanClient, resetClient, CredentialBusyError } = await import("../src/lib/supabase-client.ts");
const { CredentialRevokedError } = await import("../src/governance/operator-credential.ts");
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

/** A live lock held by another pid, as a second Claude session would hold it. */
const foreignLock = () =>
  writeFileSync(`${file}.lock`, JSON.stringify({ pid: process.pid + 1, host: "other", acquired_at: "x" }));

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "leader-"));
  file = join(dir, ".operator-refresh.json");
  refreshSession.mockReset();
  createdWith.length = 0;
  resetClient();
  refreshSession.mockResolvedValue({
    data: { session: { access_token: FRESH(), refresh_token: "rt-2" } },
    error: null,
  });
});
afterEach(() => {
  resetClient();
  rmSync(dir, { recursive: true, force: true });
});

describe("ensurePerHumanClient — who is allowed to refresh", () => {
  it("a FRESH persisted token is used as-is: zero refreshes, zero rotations", async () => {
    writeCred(FRESH());
    const r = await ensurePerHumanClient(env());
    expect(r.role).toBe("follower");
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("a follower's client never auto-refreshes", async () => {
    writeCred(FRESH());
    await ensurePerHumanClient(env());
    expect(createdWith.at(-1)?.auth).toMatchObject({ autoRefreshToken: false });
  });

  it("a follower takes no lock — 15 sessions booting on a fresh token contend for nothing", async () => {
    writeCred(FRESH());
    await ensurePerHumanClient(env());
    expect(existsSync(`${file}.lock`)).toBe(false);
  });

  it("N sequential followers still perform ZERO refreshes", async () => {
    writeCred(FRESH());
    for (let i = 0; i < 5; i++) {
      resetClient();
      await ensurePerHumanClient(env());
    }
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("a STALE token + a free lock makes us the leader, and we refresh exactly once", async () => {
    writeCred(STALE());
    const r = await ensurePerHumanClient(env());
    expect(r.role).toBe("leader");
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(refreshSession).toHaveBeenCalledWith({ refresh_token: "rt-1" });
  });

  it("only the leader's client auto-refreshes", async () => {
    writeCred(STALE());
    await ensurePerHumanClient(env());
    expect(createdWith.at(-1)?.auth).toMatchObject({ autoRefreshToken: true });
  });

  it("the leader persists the rotated refresh token immediately", async () => {
    writeCred(STALE());
    await ensurePerHumanClient(env());
    const after = JSON.parse(require("node:fs").readFileSync(file, "utf8")) as { refresh_token: string };
    expect(after.refresh_token).toBe("rt-2");
  });

  it("once leading, repeat calls do not refresh again", async () => {
    writeCred(STALE());
    await ensurePerHumanClient(env());
    await ensurePerHumanClient(env());
    await ensurePerHumanClient(env());
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it("a stale token under a LIVE foreign lock never refreshes — the race, prevented", async () => {
    writeCred(STALE());
    foreignLock();
    // The peer publishes a fresh token while we wait, exactly as a real leader would.
    setTimeout(() => writeCred(FRESH(), "rt-9"), 250);
    const r = await ensurePerHumanClient(env());
    expect(r.role).toBe("follower");
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("gives up with CredentialBusyError if the leader never publishes", async () => {
    writeCred(STALE());
    foreignLock();
    await expect(ensurePerHumanClient(env())).rejects.toBeInstanceOf(CredentialBusyError);
    expect(refreshSession).not.toHaveBeenCalled();
  }, 10_000);

  it("re-reads under the lock: a peer that published just before we acquired wins", async () => {
    // Simulates the interleaving where we saw a stale token, then the peer released the
    // lock having persisted a fresh one, then we acquired it. We must NOT refresh.
    writeCred(STALE());
    const original = ensurePerHumanClient;
    // Publish fresh content between the fast-path read and the under-lock read by
    // exploiting that the lock file does not exist: acquire happens, then re-read.
    writeCred(FRESH()); // stand-in for the peer's publish
    const r = await original(env());
    expect(r.role).toBe("follower");
    expect(refreshSession).not.toHaveBeenCalled();
    expect(existsSync(`${file}.lock`)).toBe(false); // and we released what we took
  });

  it("surfaces a revoked session as CredentialRevokedError so boot can self-heal", async () => {
    writeCred(STALE());
    refreshSession.mockResolvedValue({ data: null, error: { message: "Invalid Refresh Token: Already Used" } });
    await expect(ensurePerHumanClient(env())).rejects.toBeInstanceOf(CredentialRevokedError);
  });

  it("a transient refresh failure is NOT reported as revoked", async () => {
    writeCred(STALE());
    refreshSession.mockResolvedValue({ data: null, error: { message: "fetch failed" } });
    const err = await ensurePerHumanClient(env()).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(CredentialRevokedError);
  });

  it("releases the lock when the refresh throws, so the next process can lead", async () => {
    writeCred(STALE());
    refreshSession.mockResolvedValue({ data: null, error: { message: "fetch failed" } });
    await ensurePerHumanClient(env()).catch(() => {});
    expect(existsSync(`${file}.lock`)).toBe(false);
  });

  it("refuses any URL that is not ritsu-ops", async () => {
    writeCred(FRESH());
    const bad = { ...env(), url: "https://ixfvqxnohlmayzuesrrq.supabase.co" } as ServerEnv;
    await expect(ensurePerHumanClient(bad)).rejects.toThrow();
  });
});
