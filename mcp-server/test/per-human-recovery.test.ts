// Covers the three halves of the 2026-07-10 fix that are not the lock itself:
//   freshness  — never spend a refresh on a token that is still good
//   self-heal  — an owner machine restores ITS OWN identity, never another
//   alert      — a guard that dies must say so, and must never die while saying it
//   session    — boot picks exactly one of: live / self-healed / loud death
//
// Nothing here touches the network or the real credential file.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  readCredential,
  accessTokenExpiryMs,
  isAccessTokenFresh,
  isRevokedRefreshError,
  CredentialRevokedError,
  FRESH_MARGIN_MS,
} from "../src/governance/operator-credential.ts";
import { canSelfHeal, selfHealCredential, SELF_HEAL_REMEDY } from "../src/governance/self-heal.ts";
import { notifyFounder, revokedCredentialAlert } from "../src/lib/alert.ts";
import { establishPerHumanSession } from "../src/governance/per-human-session.ts";
import type { ServerEnv } from "../src/lib/env.ts";

const OPS_URL = "https://mntobbmieuoaxipnjaau.supabase.co";
const NOW = 1_800_000_000_000;

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
/** A structurally-valid JWT. Signature is garbage — nothing here verifies it, by design. */
const jwt = (payload: Record<string, unknown>) => `${b64({ alg: "HS256" })}.${b64(payload)}.sig`;
const tokenFor = (opts: { expMs: number; tier?: string; email?: string; sub?: string }) =>
  jwt({
    exp: Math.floor(opts.expMs / 1000),
    email: opts.email ?? "owner@example.com",
    sub: opts.sub ?? "sub-1",
    app_metadata: { tier: opts.tier ?? "owner" },
  });

let dir: string;
let file: string;

const env = (over: Partial<ServerEnv> = {}): ServerEnv =>
  ({
    url: OPS_URL,
    serviceKey: "svc",
    anonKey: "anon",
    authMode: "per-human",
    perHumanAccessToken: null,
    perHumanRefreshToken: null,
    perHumanRefreshTokenFile: file,
    ...over,
  }) as ServerEnv;

const writeCred = (o: Record<string, unknown>) => writeFileSync(file, JSON.stringify(o), { mode: 0o600 });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "perhuman-"));
  file = join(dir, ".operator-refresh.json");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("token freshness — deciding whether to spend a rotation", () => {
  it("reads all three fields", () => {
    writeCred({ refresh_token: "rt", access_token: "at", updated_at: "t" });
    expect(readCredential(file)).toEqual({ refreshToken: "rt", accessToken: "at", updatedAt: "t" });
  });

  it.each([
    ["no path", null],
    ["missing file", "/nope/nowhere.json"],
  ])("returns null on %s", (_label, p) => {
    expect(readCredential(p as string | null)).toBeNull();
  });

  it("returns null on unparseable JSON rather than throwing", () => {
    writeFileSync(file, "{ not json");
    expect(readCredential(file)).toBeNull();
  });

  it("coerces empty-string fields to null", () => {
    writeCred({ refresh_token: "", access_token: "", updated_at: "" });
    expect(readCredential(file)).toEqual({ refreshToken: null, accessToken: null, updatedAt: null });
  });

  it("decodes exp to ms", () => {
    expect(accessTokenExpiryMs(tokenFor({ expMs: NOW }))).toBe(Math.floor(NOW / 1000) * 1000);
  });

  it.each([
    ["null", null],
    ["empty", ""],
    ["not three parts", "a.b"],
    ["undecodable payload", "a.!!!.c"],
    ["no exp claim", jwt({ sub: "x" })],
    ["non-numeric exp", jwt({ exp: "soon" })],
    ["infinite exp", jwt({ exp: Infinity })],
  ])("returns null exp for %s", (_label, t) => {
    expect(accessTokenExpiryMs(t as string | null)).toBeNull();
  });

  it("is fresh strictly beyond the margin", () => {
    expect(isAccessTokenFresh(tokenFor({ expMs: NOW + FRESH_MARGIN_MS + 1_000 }), NOW)).toBe(true);
  });

  it("is NOT fresh exactly at the margin — a boundary that must fail closed", () => {
    expect(isAccessTokenFresh(tokenFor({ expMs: NOW + FRESH_MARGIN_MS }), NOW)).toBe(false);
  });

  it.each([
    ["already expired", NOW - 1],
    ["expiring inside the margin", NOW + FRESH_MARGIN_MS - 1],
  ])("is NOT fresh when %s", (_l, expMs) => {
    expect(isAccessTokenFresh(tokenFor({ expMs }), NOW)).toBe(false);
  });

  it("fails closed on an undecodable token", () => {
    expect(isAccessTokenFresh("garbage", NOW)).toBe(false);
    expect(isAccessTokenFresh(null, NOW)).toBe(false);
  });

  it.each([
    "Invalid Refresh Token: Already Used",
    "invalid refresh token: not found",
    "Refresh Token Not Found",
    "session revoked",
  ])("classifies %j as revoked", (m) => expect(isRevokedRefreshError(m)).toBe(true));

  it.each(["fetch failed", "network timeout", "503 upstream"])(
    "does NOT classify %j as revoked — a blip must not trigger self-heal",
    (m) => expect(isRevokedRefreshError(m)).toBe(false),
  );
});

// ─────────────────────────────────────────────────────────────────────────────
describe("canSelfHeal", () => {
  it("permits an owner on a machine holding the service key", () => {
    writeCred({ access_token: tokenFor({ expMs: NOW, tier: "owner", sub: "s1" }), refresh_token: "rt" });
    const e = canSelfHeal(env());
    expect(e.ok).toBe(true);
    if (e.ok) expect(e).toMatchObject({ email: "owner@example.com", sub: "s1", file });
  });

  it("refuses without a service key — the co-founder machine, fail-closed", () => {
    writeCred({ access_token: tokenFor({ expMs: NOW }) });
    expect(canSelfHeal(env({ serviceKey: null }))).toEqual({ ok: false, reason: "no_service_key" });
  });

  it("refuses a non-owner tier even when a service key is present", () => {
    writeCred({ access_token: tokenFor({ expMs: NOW, tier: "admin" }) });
    expect(canSelfHeal(env())).toEqual({ ok: false, reason: "not_owner" });
  });

  it.each([
    ["no credential file configured", () => env({ perHumanRefreshTokenFile: null }), "no_credential_file"],
    ["file has no access token", () => (writeCred({ refresh_token: "rt" }), env()), "no_prior_credential"],
    ["token is not a JWT", () => (writeCred({ access_token: "junk" }), env()), "prior_token_undecodable"],
  ])("refuses when %s", (_l, mk, reason) => {
    expect(canSelfHeal(mk())).toEqual({ ok: false, reason });
  });

  it("every blocked reason carries an actionable remedy", () => {
    for (const [reason, text] of Object.entries(SELF_HEAL_REMEDY)) {
      expect(text.length, reason).toBeGreaterThan(20);
      expect(text, reason).toMatch(/enroll|identity|owner/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("selfHealCredential", () => {
  const elig = () => ({ ok: true as const, email: "owner@example.com", sub: "s1", file });

  const deps = (doFetch: unknown) => ({
    doFetch: doFetch as typeof fetch,
    persist: vi.fn(),
    nowIso: () => "2026-07-10T00:00:00.000Z",
  });

  const okFetch = (accessToken: string) =>
    vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ properties: { hashed_token: "th" } }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: accessToken, refresh_token: "new-rt" }),
      });

  it("mints, verifies the identity, and persists", async () => {
    const at = tokenFor({ expMs: NOW + 3_600_000, sub: "s1" });
    const d = deps(okFetch(at));
    const out = await selfHealCredential(env(), elig(), d);
    expect(out).toEqual({ accessToken: at, refreshToken: "new-rt" });
    expect(d.persist).toHaveBeenCalledWith(file, "new-rt", "2026-07-10T00:00:00.000Z", at);
  });

  it("REFUSES when the minted sub differs — never restore a different human", async () => {
    const d = deps(okFetch(tokenFor({ expMs: NOW + 3_600_000, sub: "SOMEONE-ELSE" })));
    await expect(selfHealCredential(env(), elig(), d)).rejects.toThrow(/minted sub does not match/i);
    expect(d.persist).not.toHaveBeenCalled();
  });

  it("throws and persists nothing when generate_link fails", async () => {
    const d = deps(vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }));
    await expect(selfHealCredential(env(), elig(), d)).rejects.toThrow(/generate_link failed/);
    expect(d.persist).not.toHaveBeenCalled();
  });

  it("throws when verify returns no session", async () => {
    const d = deps(
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ hashed_token: "th" }) })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }),
    );
    await expect(selfHealCredential(env(), elig(), d)).rejects.toThrow(/verify failed/);
  });

  it("refuses to point at anything but ritsu-ops", async () => {
    const d = deps(okFetch(tokenFor({ expMs: NOW, sub: "s1" })));
    await expect(selfHealCredential(env({ url: "https://ixfvqxnohlmayzuesrrq.supabase.co" }), elig(), d)).rejects.toThrow();
    expect(d.persist).not.toHaveBeenCalled();
  });

  it("requires the service key even if eligibility said otherwise", async () => {
    const d = deps(okFetch(tokenFor({ expMs: NOW, sub: "s1" })));
    await expect(selfHealCredential(env({ serviceKey: null }), elig(), d)).rejects.toThrow(/service key/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("notifyFounder", () => {
  const cfg = { TELEGRAM_BOT_TOKEN: "bot", TELEGRAM_FOUNDER_CHAT_ID: "42" } as NodeJS.ProcessEnv;

  it("is a silent no-op when unconfigured (fresh clone / CI)", async () => {
    const f = vi.fn();
    const r = await notifyFounder("x", {} as NodeJS.ProcessEnv, f as never);
    expect(r.delivered).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("posts to Telegram when configured", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    expect(await notifyFounder("hello", cfg, f as never)).toEqual({ delivered: true });
    expect(f.mock.calls[0][0]).toContain("/botbot/sendMessage");
  });

  it("reports a non-2xx without throwing", async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    expect(await notifyFounder("x", cfg, f as never)).toEqual({ delivered: false, reason: "telegram HTTP 429" });
  });

  it("SWALLOWS a thrown fetch — alerting must never turn a recoverable failure fatal", async () => {
    const f = vi.fn().mockRejectedValue(new Error("dns dead"));
    const r = await notifyFounder("x", cfg, f as never);
    expect(r).toEqual({ delivered: false, reason: "dns dead" });
  });
});

describe("revokedCredentialAlert", () => {
  it("names the remedy when it could NOT self-heal", () => {
    const m = revokedCredentialAlert({ email: "a@b.c", selfHealed: false, detail: "Already Used" });
    expect(m).toContain("KHÔNG BOOT ĐƯỢC");
    expect(m).toContain("enroll.cjs");
    expect(m).toContain("a@b.c");
  });

  it("says so, and stays non-critical, when it DID self-heal", () => {
    const m = revokedCredentialAlert({ email: "a@b.c", selfHealed: true, detail: "Already Used" });
    expect(m).toContain("ĐÃ TỰ CHỮA");
    expect(m).not.toContain("enroll.cjs");
  });

  it("tolerates an unknown operator", () => {
    expect(revokedCredentialAlert({ email: null, selfHealed: false, detail: "x" })).toContain("không rõ operator");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("establishPerHumanSession", () => {
  const session = { client: {} as never, accessToken: "at", role: "leader" as const };

  const deps = (over: Record<string, unknown> = {}) =>
    ({
      ensure: vi.fn().mockResolvedValue(session),
      eligible: vi.fn(),
      heal: vi.fn(),
      reset: vi.fn(),
      notify: vi.fn().mockResolvedValue({ delivered: true }),
      ...over,
    }) as never;

  it("normal path: no alert, no heal", async () => {
    const d = deps();
    const out = await establishPerHumanSession(env(), d);
    expect(out.selfHealed).toBe(false);
    expect((d as any).notify).not.toHaveBeenCalled();
    expect((d as any).heal).not.toHaveBeenCalled();
  });

  it("rethrows a NON-revoked error untouched, and does not alert twice", async () => {
    const d = deps({ ensure: vi.fn().mockRejectedValue(new Error("boom")) });
    await expect(establishPerHumanSession(env(), d)).rejects.toThrow("boom");
    expect((d as any).notify).not.toHaveBeenCalled();
    expect((d as any).heal).not.toHaveBeenCalled();
  });

  it("revoked + eligible → heals, resets the cached client, re-establishes, alerts", async () => {
    writeCred({ access_token: tokenFor({ expMs: NOW }) });
    const ensure = vi
      .fn()
      .mockRejectedValueOnce(new CredentialRevokedError("Already Used"))
      .mockResolvedValueOnce(session);
    const d = deps({ ensure, eligible: vi.fn().mockReturnValue({ ok: true, email: "o@x", sub: "s1", file }) });

    const out = await establishPerHumanSession(env(), d);
    expect(out.selfHealed).toBe(true);
    expect((d as any).heal).toHaveBeenCalledOnce();
    expect((d as any).reset).toHaveBeenCalledOnce();
    expect(ensure).toHaveBeenCalledTimes(2);
    expect((d as any).notify.mock.calls[0][0]).toContain("ĐÃ TỰ CHỮA");
  });

  it("revoked + NOT eligible → alerts loudly with the remedy, then dies closed", async () => {
    writeCred({ access_token: tokenFor({ expMs: NOW }) });
    const d = deps({
      ensure: vi.fn().mockRejectedValue(new CredentialRevokedError("Already Used")),
      eligible: vi.fn().mockReturnValue({ ok: false, reason: "no_service_key" }),
    });

    await expect(establishPerHumanSession(env(), d)).rejects.toBeInstanceOf(CredentialRevokedError);
    expect((d as any).heal).not.toHaveBeenCalled();
    const msg = (d as any).notify.mock.calls[0][0] as string;
    expect(msg).toContain("KHÔNG BOOT ĐƯỢC");
    expect(msg).toContain(SELF_HEAL_REMEDY.no_service_key.slice(0, 20));
  });

  it("still dies closed when the alert itself fails", async () => {
    writeCred({ access_token: tokenFor({ expMs: NOW }) });
    const d = deps({
      ensure: vi.fn().mockRejectedValue(new CredentialRevokedError("Already Used")),
      eligible: vi.fn().mockReturnValue({ ok: false, reason: "no_service_key" }),
      notify: vi.fn().mockResolvedValue({ delivered: false, reason: "telegram down" }),
    });
    await expect(establishPerHumanSession(env(), d)).rejects.toBeInstanceOf(CredentialRevokedError);
  });
});
