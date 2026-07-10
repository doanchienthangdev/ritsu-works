// Two claims hold this fix up, and they pull against each other:
//
//   (1) A process must NEVER spend a refresh-token rotation unless it holds the lock.
//       Supabase revokes the entire session when a rotated token is presented outside a
//       10s window, so "two processes both refreshed" is a permanent lockout. That is what
//       killed supabase-ops on 2026-07-03.
//
//   (2) SOMEONE must keep the credential file current. The analytics MCP and the gbrain
//       hook only READ the access token persisted there. If no process holds a session with
//       auto-refresh on, both go dark the moment the token expires.
//
// Satisfying (1) alone is easy and wrong — the first draft of this PR did exactly that, and
// would have traded a revoked-credential outage for a silently-expiring one. The leader
// therefore ADOPTS a still-fresh session (`setSession`, no rotation) instead of skipping
// leadership entirely.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const refreshSession = vi.fn();
const setSession = vi.fn();
const createdWith: Array<Record<string, unknown>> = [];

vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url: string, _key: string, opts: Record<string, unknown>) => {
    createdWith.push(opts);
    return { auth: { refreshSession, setSession, onAuthStateChange: vi.fn() } };
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

const lastAuthOpts = () => createdWith.at(-1)?.auth as Record<string, unknown> | undefined;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "leader-"));
  file = join(dir, ".operator-refresh.json");
  refreshSession.mockReset();
  setSession.mockReset();
  createdWith.length = 0;
  resetClient();
  refreshSession.mockResolvedValue({
    data: { session: { access_token: FRESH(), refresh_token: "rt-2" } },
    error: null,
  });
  setSession.mockImplementation(async ({ access_token }: { access_token: string }) => ({
    data: { session: { access_token, refresh_token: "rt-1" } },
    error: null,
  }));
});
afterEach(() => {
  resetClient();
  rmSync(dir, { recursive: true, force: true });
});

// ── claim (1): never rotate unless you lead ─────────────────────────────────────
describe("only the lock holder may spend a rotation", () => {
  it("a stale token + a free lock makes us leader; exactly one refresh", async () => {
    writeCred(STALE());
    const r = await ensurePerHumanClient(env());
    expect(r.role).toBe("leader");
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(refreshSession).toHaveBeenCalledWith({ refresh_token: "rt-1" });
  });

  it("persists the rotated refresh token immediately", async () => {
    writeCred(STALE());
    await ensurePerHumanClient(env());
    expect(JSON.parse(readFileSync(file, "utf8")).refresh_token).toBe("rt-2");
  });

  it("a stale token under a LIVE foreign lock NEVER refreshes — the race, prevented", async () => {
    writeCred(STALE());
    foreignLock();
    setTimeout(() => writeCred(FRESH(), "rt-9"), 250); // the peer publishes, as a leader would
    const r = await ensurePerHumanClient(env());
    expect(r.role).toBe("follower");
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("gives up with CredentialBusyError rather than refreshing behind the leader's back", async () => {
    writeCred(STALE());
    foreignLock();
    await expect(ensurePerHumanClient(env())).rejects.toBeInstanceOf(CredentialBusyError);
    expect(refreshSession).not.toHaveBeenCalled();
  }, 10_000);

  it("once leading, repeat calls neither re-refresh nor re-adopt", async () => {
    writeCred(STALE());
    await ensurePerHumanClient(env());
    await ensurePerHumanClient(env());
    await ensurePerHumanClient(env());
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(setSession).not.toHaveBeenCalled();
  });
});

// ── claim (2): someone must keep the file current ───────────────────────────────
describe("a fresh token still gets a leader — the regression this PR nearly shipped", () => {
  it("ADOPTS the live session instead of skipping leadership", async () => {
    writeCred(FRESH());
    const r = await ensurePerHumanClient(env());
    expect(r.role).toBe("leader");
  });

  it("adoption spends NO rotation", async () => {
    writeCred(FRESH());
    await ensurePerHumanClient(env());
    expect(refreshSession).not.toHaveBeenCalled();
    expect(setSession).toHaveBeenCalledTimes(1);
  });

  it("adopts with BOTH tokens, so supabase-js can refresh before expiry", async () => {
    const at = FRESH();
    writeCred(at, "rt-1");
    await ensurePerHumanClient(env());
    expect(setSession).toHaveBeenCalledWith({ access_token: at, refresh_token: "rt-1" });
  });

  it("the leader's client auto-refreshes — otherwise analytics + gbrain go dark at expiry", async () => {
    writeCred(FRESH());
    await ensurePerHumanClient(env());
    expect(lastAuthOpts()).toMatchObject({ autoRefreshToken: true });
  });

  it("falls back to a real refresh when adoption fails — a rotation beats a dark gate", async () => {
    writeCred(FRESH());
    setSession.mockResolvedValue({ data: null, error: { message: "setSession blew up" } });
    const r = await ensurePerHumanClient(env());
    expect(r.role).toBe("leader");
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});

// ── followers ──────────────────────────────────────────────────────────────────
describe("followers", () => {
  it("a fresh token under a foreign lock yields a follower that touches nothing", async () => {
    writeCred(FRESH());
    foreignLock();
    const r = await ensurePerHumanClient(env());
    expect(r.role).toBe("follower");
    expect(refreshSession).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
  });

  it("a follower's client never auto-refreshes", async () => {
    writeCred(FRESH());
    foreignLock();
    await ensurePerHumanClient(env());
    expect(lastAuthOpts()).toMatchObject({ autoRefreshToken: false });
  });

  it("a follower does not evict the leader's lock", async () => {
    writeCred(FRESH());
    foreignLock();
    await ensurePerHumanClient(env());
    expect(JSON.parse(readFileSync(`${file}.lock`, "utf8")).pid).toBe(process.pid + 1);
  });

  it("15 sessions on a fresh token perform ZERO rotations between them", async () => {
    writeCred(FRESH());
    await ensurePerHumanClient(env()); // the first leads (adopts)
    foreignLock(); // it now holds the lock, as far as everyone else can see
    for (let i = 0; i < 14; i++) {
      resetClient();
      expect((await ensurePerHumanClient(env())).role).toBe("follower");
    }
    expect(refreshSession).not.toHaveBeenCalled();
  });
});

// ── failure surfaces ───────────────────────────────────────────────────────────
describe("failures", () => {
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
