// All-Edge unit tests for the analytics MCP per-human tier gate
// (capability multi-user-auth, Sprint 2 — ITEM A).
//
// Default (service-key) behavior MUST be unchanged: the 6-role ANALYTICS_ALLOWED_ROLES
// allowlist still gates. per-human is additive + gated on RITSU_AUTH_MODE=per-human and
// keys analytics access off the operator's VERIFIED tier (owner/admin allowed, user/null
// denied — fail-closed). The analytics_reader DB role stays the real boundary.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadEnv, MissingEnvError, MissingPerHumanCredentialError } from "../src/lib/env.ts";
import { decodeJwtClaims } from "../src/governance/operator-identity.ts";
import {
  readAccessTokenFromFile,
  resolveOperatorTier,
} from "../src/governance/operator-credential.ts";
import {
  isRoleAllowedAnalytics,
  isTierAllowedAnalytics,
  analyticsDenialReason,
} from "../src/governance/role-allowlist.ts";
import { handleQuery } from "../src/tools/query.ts";
import { handleListTables } from "../src/tools/list-tables.ts";
import type { AnalyticsCallerContext, AnalyticsQuerier } from "../src/types.ts";

// A valid-shaped analytics_reader pooler URL on the analytics project ref (NOT Product).
const ANALYTICS_DB_URL =
  "postgres://analytics_reader.ddgbabvbfjrsznvzhizf:pw@aws-0-us-west-1.pooler.supabase.com:5432/postgres";
const base = { ANALYTICS_READER_DB_URL: ANALYTICS_DB_URL } as NodeJS.ProcessEnv;

function makeJwt(payload: Record<string, unknown>): string {
  const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${seg({ alg: "HS256", typ: "JWT" })}.${seg(payload)}.sig`;
}
const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600; // ~1h out (a fresh token)
const PAST_EXP = Math.floor(Date.now() / 1000) - 60; // expired a minute ago
// A token shaped like a real Supabase access token: carries a future exp.
const tierJwt = (tier: string, exp: number = FUTURE_EXP) =>
  makeJwt({ email: "x@x.com", sub: "u", app_metadata: { tier }, exp });

// ── env ──────────────────────────────────────────────────────────────────────
describe("analytics env.loadEnv — RITSU_AUTH_MODE", () => {
  it("defaults to service-key, no operator credential", () => {
    const e = loadEnv(base);
    expect(e.authMode).toBe("service-key");
    expect(e.perHumanAccessToken).toBeNull();
    expect(e.perHumanRefreshTokenFile).toBeNull();
  });
  it("rejects an invalid mode", () => {
    expect(() => loadEnv({ ...base, RITSU_AUTH_MODE: "bogus" })).toThrow(MissingEnvError);
  });
  it("per-human with NO credential source → MissingPerHumanCredentialError (fail fast)", () => {
    expect(() => loadEnv({ ...base, RITSU_AUTH_MODE: "per-human" })).toThrow(
      MissingPerHumanCredentialError,
    );
  });
  it("per-human with a credential FILE path parses (token may appear later)", () => {
    const e = loadEnv({ ...base, RITSU_AUTH_MODE: "per-human", RITSU_OPERATOR_REFRESH_TOKEN_FILE: "/run/op.json" });
    expect(e.authMode).toBe("per-human");
    expect(e.perHumanRefreshTokenFile).toBe("/run/op.json");
  });
  it("per-human with an inline access token parses", () => {
    const e = loadEnv({ ...base, RITSU_AUTH_MODE: "per-human", RITSU_OPERATOR_ACCESS_TOKEN: "tok" });
    expect(e.authMode).toBe("per-human");
    expect(e.perHumanAccessToken).toBe("tok");
  });
  it("still requires ANALYTICS_READER_DB_URL in per-human mode (DB role unchanged)", () => {
    expect(() =>
      loadEnv({ RITSU_AUTH_MODE: "per-human", RITSU_OPERATOR_ACCESS_TOKEN: "tok" } as NodeJS.ProcessEnv),
    ).toThrow(/ANALYTICS_READER_DB_URL/);
  });
  it("service-key mode (RITSU_AUTH_MODE absent) IGNORES a stray RITSU_OPERATOR_ACCESS_TOKEN", () => {
    // A leaked/stray per-human token in a default install must not flip behavior.
    const e = loadEnv({ ...base, RITSU_OPERATOR_ACCESS_TOKEN: "tok" });
    expect(e.authMode).toBe("service-key");
    expect(e.perHumanAccessToken).toBe("tok"); // captured but never consulted in service-key mode
  });
});

// ── decodeJwtClaims (copy of mcp-server's; must stay behaviour-identical) ─────
describe("analytics decodeJwtClaims — fail-closed", () => {
  it("extracts the tier from a valid JWT", () => {
    expect(decodeJwtClaims(tierJwt("owner")).tier).toBe("owner");
    expect(decodeJwtClaims(tierJwt("admin")).tier).toBe("admin");
    expect(decodeJwtClaims(tierJwt("user")).tier).toBe("user");
  });
  it("tier null when app_metadata absent / unrecognized / malformed", () => {
    expect(decodeJwtClaims(makeJwt({ email: "a@x.com" })).tier).toBeNull();
    expect(decodeJwtClaims(tierJwt("wizard")).tier).toBeNull();
    expect(decodeJwtClaims("not-a-jwt").tier).toBeNull();
    expect(decodeJwtClaims("").tier).toBeNull();
    expect(decodeJwtClaims(null).tier).toBeNull();
    expect(decodeJwtClaims(undefined).tier).toBeNull();
  });
  it("exp is extracted as a number, null when absent/non-numeric", () => {
    expect(decodeJwtClaims(tierJwt("owner", 1234567890)).exp).toBe(1234567890);
    expect(decodeJwtClaims(makeJwt({ app_metadata: { tier: "owner" } })).exp).toBeNull();
    expect(decodeJwtClaims(makeJwt({ app_metadata: { tier: "owner" }, exp: "soon" })).exp).toBeNull();
    expect(decodeJwtClaims(null).exp).toBeNull();
  });
});

// ── credential file reader + tier resolution ─────────────────────────────────
describe("operator-credential — read-only tier resolution (never refreshes)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "an-cred-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const env = (over: Partial<ReturnType<typeof loadEnv>>) => ({ ...loadEnv(base), ...over });

  it("readAccessTokenFromFile reads access_token written by supabase-ops", () => {
    const f = join(dir, "cred.json");
    writeFileSync(f, JSON.stringify({ refresh_token: "R", access_token: tierJwt("admin") }));
    expect(readAccessTokenFromFile(f)).toBe(tierJwt("admin"));
  });
  it("readAccessTokenFromFile fail-closed: missing file, no access_token field, non-string, null path", () => {
    expect(readAccessTokenFromFile(join(dir, "nope.json"))).toBeNull();
    const f1 = join(dir, "refresh-only.json");
    writeFileSync(f1, JSON.stringify({ refresh_token: "R" })); // cold-start: ops hasn't persisted access yet
    expect(readAccessTokenFromFile(f1)).toBeNull();
    const f2 = join(dir, "weird.json");
    writeFileSync(f2, JSON.stringify({ access_token: 12345 }));
    expect(readAccessTokenFromFile(f2)).toBeNull();
    const f3 = join(dir, "corrupt.json");
    writeFileSync(f3, "{ not json");
    expect(readAccessTokenFromFile(f3)).toBeNull();
    expect(readAccessTokenFromFile(null)).toBeNull();
    expect(readAccessTokenFromFile(undefined)).toBeNull();
  });
  it("resolveOperatorTier: inline access token wins over the file", () => {
    const f = join(dir, "cred.json");
    writeFileSync(f, JSON.stringify({ access_token: tierJwt("user") }));
    expect(
      resolveOperatorTier(env({ perHumanAccessToken: tierJwt("owner"), perHumanRefreshTokenFile: f })),
    ).toBe("owner");
  });
  it("resolveOperatorTier: falls back to the file's access token", () => {
    const f = join(dir, "cred.json");
    writeFileSync(f, JSON.stringify({ access_token: tierJwt("admin") }));
    expect(resolveOperatorTier(env({ perHumanAccessToken: null, perHumanRefreshTokenFile: f }))).toBe("admin");
  });
  it("resolveOperatorTier: null when no credential (cold-start file lacks access_token) → fail-closed deny", () => {
    const f = join(dir, "refresh-only.json");
    writeFileSync(f, JSON.stringify({ refresh_token: "R" }));
    expect(resolveOperatorTier(env({ perHumanAccessToken: null, perHumanRefreshTokenFile: f }))).toBeNull();
    expect(resolveOperatorTier(env({ perHumanAccessToken: null, perHumanRefreshTokenFile: null }))).toBeNull();
  });
  it("resolveOperatorTier: EXPIRED owner token → null (fail-closed) — the local decode is the only gate", () => {
    // The crux of the red-team finding: analytics has no server-side re-check, so a
    // stale/expired owner token must NOT keep unlocking analytics.
    expect(resolveOperatorTier(env({ perHumanAccessToken: tierJwt("owner", PAST_EXP) }))).toBeNull();
    const f = join(dir, "stale.json");
    writeFileSync(f, JSON.stringify({ access_token: tierJwt("admin", PAST_EXP) }));
    expect(resolveOperatorTier(env({ perHumanAccessToken: null, perHumanRefreshTokenFile: f }))).toBeNull();
  });
  it("resolveOperatorTier: token with NO exp claim → null (undated → fail-closed)", () => {
    const noExp = makeJwt({ email: "x@x.com", sub: "u", app_metadata: { tier: "owner" } });
    expect(resolveOperatorTier(env({ perHumanAccessToken: noExp }))).toBeNull();
  });
  it("resolveOperatorTier: a present-but-undecodable INLINE token does NOT fall through to a valid file token", () => {
    // `||` short-circuits on the raw string's truthiness, not on decode success:
    // a non-empty garbage inline token is selected, decodes to null, and is NOT
    // masked by the file's valid token. Pins the fail-closed precedence.
    const f = join(dir, "valid.json");
    writeFileSync(f, JSON.stringify({ access_token: tierJwt("owner") }));
    expect(resolveOperatorTier(env({ perHumanAccessToken: "garbage-not-a-jwt", perHumanRefreshTokenFile: f }))).toBeNull();
    // an inline JWT with no tier also short-circuits to null without using the file
    const noTier = makeJwt({ email: "x@x.com", sub: "u", exp: FUTURE_EXP });
    expect(resolveOperatorTier(env({ perHumanAccessToken: noTier, perHumanRefreshTokenFile: f }))).toBeNull();
  });
});

// ── the gate logic ───────────────────────────────────────────────────────────
describe("role-allowlist — tier gate + mode-aware denial", () => {
  it("service-key role allowlist unchanged (the 6 consumer roles)", () => {
    for (const r of ["founder", "cofounder", "customer-lead", "product-orchestrator", "gtm-orchestrator", "feedback-aggregator"]) {
      expect(isRoleAllowedAnalytics(r)).toBe(true);
    }
    for (const r of ["gps", "etl-runner", "content-drafter", "code-reviewer", ""]) {
      expect(isRoleAllowedAnalytics(r)).toBe(false);
    }
  });
  it("tier gate: owner + admin allowed; user + null + unknown denied (fail-closed)", () => {
    expect(isTierAllowedAnalytics("owner")).toBe(true);
    expect(isTierAllowedAnalytics("admin")).toBe(true);
    expect(isTierAllowedAnalytics("user")).toBe(false);
    expect(isTierAllowedAnalytics(null)).toBe(false);
    expect(isTierAllowedAnalytics(undefined)).toBe(false);
    expect(isTierAllowedAnalytics("wizard")).toBe(false);
  });
  it("denial reason is mode-aware (per-human → tier_not_allowed; service-key → role_not_allowed)", () => {
    expect(analyticsDenialReason({ authMode: "per-human", role: "operator:user", tier: "user" }).code).toBe("tier_not_allowed");
    expect(analyticsDenialReason({ authMode: "per-human", role: "operator:unknown", tier: null }).detail).toMatch(/owner\/admin only/);
    expect(analyticsDenialReason({ authMode: "service-key", role: "gps", tier: null }).code).toBe("role_not_allowed");
  });
});

// ── Supplementary All-Edge: decoder hardening, exp precedence, env parsing ───
describe("All-Edge supplement — decodeJwtClaims hardening", () => {
  it("a 4-segment (or 1/2-segment) token → all-null (only 3-part JWTs decode)", () => {
    expect(decodeJwtClaims("a.b.c.d")).toStrictEqual({ email: null, tier: null, sub: null, exp: null });
    expect(decodeJwtClaims("a.b")).toStrictEqual({ email: null, tier: null, sub: null, exp: null });
  });
  it("payload that is a JSON array / number / literal-null → tier+exp null (not an object with claims)", () => {
    const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const tok = (payload: unknown) => `${seg({ alg: "HS256" })}.${seg(payload)}.sig`;
    expect(decodeJwtClaims(tok([1, 2, 3])).tier).toBeNull();
    expect(decodeJwtClaims(tok(12345)).tier).toBeNull();
    expect(decodeJwtClaims(tok(null)).tier).toBeNull();
  });
  it("app_metadata that is an array / null / string → tier null (must be a plain object)", () => {
    expect(decodeJwtClaims(makeJwt({ app_metadata: ["owner"] })).tier).toBeNull();
    expect(decodeJwtClaims(makeJwt({ app_metadata: null })).tier).toBeNull();
    expect(decodeJwtClaims(makeJwt({ app_metadata: "owner" })).tier).toBeNull();
  });
  it("exp accepts negative / zero / float numbers verbatim (rejection is resolveOperatorTier's job, not decode's)", () => {
    expect(decodeJwtClaims(makeJwt({ app_metadata: { tier: "owner" }, exp: -5 })).exp).toBe(-5);
    expect(decodeJwtClaims(makeJwt({ app_metadata: { tier: "owner" }, exp: 0 })).exp).toBe(0);
    expect(decodeJwtClaims(makeJwt({ app_metadata: { tier: "owner" }, exp: 1.9 })).exp).toBe(1.9);
    expect(decodeJwtClaims(makeJwt({ app_metadata: { tier: "owner" }, exp: Infinity })).exp).toBeNull(); // not finite
  });
});

describe("All-Edge supplement — resolveOperatorTier precedence + expiry", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "an-supp-")); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const env = (over: Partial<ReturnType<typeof loadEnv>>) => ({ ...loadEnv(base), ...over });

  it("an EXPIRED inline token does NOT fall through to a valid file token (fail-closed precedence)", () => {
    const f = join(dir, "valid.json");
    writeFileSync(f, JSON.stringify({ access_token: tierJwt("owner") }));
    // inline is selected (truthy string), decodes to owner but is expired → null, file NOT consulted
    expect(resolveOperatorTier(env({ perHumanAccessToken: tierJwt("owner", PAST_EXP), perHumanRefreshTokenFile: f }))).toBeNull();
  });
  it("a token expiring exactly at/just-after now is still valid (boundary)", () => {
    const justFuture = Math.floor(Date.now() / 1000) + 5; // +5s — robust against test latency
    expect(resolveOperatorTier(env({ perHumanAccessToken: tierJwt("admin", justFuture) }))).toBe("admin");
  });
});

describe("All-Edge supplement — env parsing", () => {
  it("RITSU_AUTH_MODE is trimmed (whitespace tolerated)", () => {
    const e = loadEnv({ ...base, RITSU_AUTH_MODE: "  per-human  ", RITSU_OPERATOR_ACCESS_TOKEN: "t" });
    expect(e.authMode).toBe("per-human");
  });
  it("an uppercase/typo RITSU_AUTH_MODE is rejected (only exact 'per-human'/'service-key')", () => {
    expect(() => loadEnv({ ...base, RITSU_AUTH_MODE: "PER-HUMAN" })).toThrow(MissingEnvError);
    expect(() => loadEnv({ ...base, RITSU_AUTH_MODE: "perhuman" })).toThrow(MissingEnvError);
  });
  it("whitespace-only credential values are treated as absent in per-human (fail fast)", () => {
    expect(() =>
      loadEnv({ ...base, RITSU_AUTH_MODE: "per-human", RITSU_OPERATOR_ACCESS_TOKEN: "   ", RITSU_OPERATOR_REFRESH_TOKEN_FILE: "  " }),
    ).toThrow(MissingPerHumanCredentialError);
  });
});

// ── handlers end-to-end through the ctx ──────────────────────────────────────
describe("handlers — per-human tier gate end-to-end", () => {
  const fakeQuerier: AnalyticsQuerier = {
    async query() {
      return { rows: [{ n: 1 }], rowCount: 1 };
    },
  };
  const ctx = (over: Partial<AnalyticsCallerContext>): AnalyticsCallerContext => ({
    role: "x",
    sessionId: "s",
    allowedAnalytics: false,
    authMode: "per-human",
    tier: null,
    ...over,
  });

  it("per-human owner → query allowed", async () => {
    const r = await handleQuery({ sql: "select 1" }, ctx({ role: "operator:owner", tier: "owner", allowedAnalytics: true }), fakeQuerier);
    expect(r.state).toBe("completed");
  });
  it("per-human admin → list_tables allowed", async () => {
    const r = await handleListTables({}, ctx({ role: "operator:admin", tier: "admin", allowedAnalytics: true }), fakeQuerier);
    expect(r.state).toBe("completed");
  });
  it("per-human user → query DENIED tier_not_allowed (before any DB call)", async () => {
    let called = false;
    const spyQuerier: AnalyticsQuerier = { async query() { called = true; return { rows: [], rowCount: 0 }; } };
    const r = await handleQuery({ sql: "select 1" }, ctx({ role: "operator:user", tier: "user", allowedAnalytics: false }), spyQuerier);
    expect(r.state).toBe("denied");
    expect(r.errorCode).toBe("tier_not_allowed");
    expect(called).toBe(false);
  });
  it("per-human unknown tier (forged/missing) → DENIED tier_not_allowed", async () => {
    const r = await handleListTables({}, ctx({ role: "operator:unknown", tier: null, allowedAnalytics: false }), fakeQuerier);
    expect(r.state).toBe("denied");
    expect(r.errorCode).toBe("tier_not_allowed");
  });
  it("service-key allowed role still works (role_not_allowed code preserved for denied)", async () => {
    const allowed = await handleQuery({ sql: "select 1" }, ctx({ role: "founder", authMode: "service-key", tier: null, allowedAnalytics: true }), fakeQuerier);
    expect(allowed.state).toBe("completed");
    const denied = await handleListTables({}, ctx({ role: "gps", authMode: "service-key", tier: null, allowedAnalytics: false }), fakeQuerier);
    expect(denied.state).toBe("denied");
    expect(denied.errorCode).toBe("role_not_allowed");
  });
});
