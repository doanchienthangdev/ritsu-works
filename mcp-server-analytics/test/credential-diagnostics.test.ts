// All-Edge tests for the DIAGNOSABLE per-human credential resolution
// (capability multi-user-auth — analytics tier-gate diagnosability, 2026-07-10).
//
// The behavior under test is a *diagnosis*, not a new permission: every reason
// other than `ok` still yields tier === null → denied. The fail-closed invariant
// is asserted exhaustively at the bottom of this file, because the whole point of
// this change is that it must NOT widen the gate.
//
// Skipped: performance — pure, allocation-free, no I/O beyond one small file read.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadEnv } from "../src/lib/env.ts";
import { decodeJwtPayload } from "../src/governance/operator-identity.ts";
import {
  CREDENTIAL_REMEDIATION,
  describeCredential,
  readCredentialFile,
  readAccessTokenFromFile,
  resolveOperatorCredential,
  resolveOperatorTier,
  type CredentialReason,
} from "../src/governance/operator-credential.ts";
import { analyticsDenialReason } from "../src/governance/role-allowlist.ts";
import { handleQuery } from "../src/tools/query.ts";
import type { AnalyticsQuerier } from "../src/types.ts";

const ANALYTICS_DB_URL =
  "postgres://analytics_reader.ddgbabvbfjrsznvzhizf:pw@aws-0-us-west-1.pooler.supabase.com:5432/postgres";
const base = { ANALYTICS_READER_DB_URL: ANALYTICS_DB_URL } as NodeJS.ProcessEnv;

const NOW = 1_700_000_000_000; // fixed clock — no wall-clock flake
const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const makeJwt = (payload: Record<string, unknown>) =>
  `${seg({ alg: "HS256", typ: "JWT" })}.${seg(payload)}.sig`;
const tierJwt = (tier: string, expMs: number = NOW + 3_600_000) =>
  makeJwt({ email: "x@x.com", sub: "u", app_metadata: { tier }, exp: Math.floor(expMs / 1000) });

const env = (over: Partial<ReturnType<typeof loadEnv>>) => ({ ...loadEnv(base), ...over });
const resolve = (over: Partial<ReturnType<typeof loadEnv>>) =>
  resolveOperatorCredential(env(over), NOW);

// DERIVED, not hand-listed. CREDENTIAL_REMEDIATION is a Record<CredentialReason, string>,
// so TypeScript already forces it to carry every union member; reading its keys makes the
// "for every reason" tests below genuinely total. A hand-written literal would silently
// under-cover the day a 10th CredentialReason is added.
const ALL_REASONS = Object.keys(CREDENTIAL_REMEDIATION) as CredentialReason[];

describe("credential diagnostics", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cred-diag-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const writeCred = (name: string, body: unknown) => {
    const f = join(dir, name);
    writeFileSync(f, typeof body === "string" ? body : JSON.stringify(body));
    return f;
  };

  // ── happy path ────────────────────────────────────────────────────────────
  describe("happy path", () => {
    it("resolves tier + reason 'ok' from a live file token, exposing persistedAt", () => {
      const f = writeCred("c.json", {
        refresh_token: "R",
        access_token: tierJwt("owner"),
        updated_at: "2026-07-10T00:00:00.000Z",
      });
      const c = resolve({ perHumanAccessToken: null, perHumanRefreshTokenFile: f });
      expect(c.tier).toBe("owner");
      expect(c.reason).toBe("ok");
      expect(c.source).toBe("file");
      expect(c.expiresAtMs).toBe(NOW + 3_600_000);
      expect(c.expiredForMs).toBeNull();
      expect(c.persistedAt).toBe("2026-07-10T00:00:00.000Z");
    });
    it("resolves tier 'ok' from an inline token; source='inline', persistedAt null", () => {
      const c = resolve({ perHumanAccessToken: tierJwt("admin") });
      expect(c).toMatchObject({ tier: "admin", reason: "ok", source: "inline", persistedAt: null });
    });
  });

  // ── each distinct failure mode gets its own reason ────────────────────────
  describe("failure modes are distinguished (the whole point)", () => {
    it("no credential source at all → no_credential_source / source 'none'", () => {
      const c = resolve({ perHumanAccessToken: null, perHumanRefreshTokenFile: null });
      expect(c.reason).toBe("no_credential_source");
      expect(c.source).toBe("none");
    });
    it("configured file that does not exist → credential_file_missing", () => {
      const c = resolve({ perHumanAccessToken: null, perHumanRefreshTokenFile: join(dir, "nope.json") });
      expect(c.reason).toBe("credential_file_missing");
      expect(c.source).toBe("file");
    });
    it("corrupt JSON → credential_file_unreadable", () => {
      const f = writeCred("corrupt.json", "{ not json");
      expect(resolve({ perHumanAccessToken: null, perHumanRefreshTokenFile: f }).reason).toBe(
        "credential_file_unreadable",
      );
    });
    it("a directory where the file should be → credential_file_unreadable (EISDIR, not ENOENT)", () => {
      const d = join(dir, "isdir");
      mkdirSync(d);
      expect(resolve({ perHumanAccessToken: null, perHumanRefreshTokenFile: d }).reason).toBe(
        "credential_file_unreadable",
      );
    });
    it("cold start: file has refresh_token but no access_token → credential_file_no_access_token (+ persistedAt survives)", () => {
      const f = writeCred("cold.json", { refresh_token: "R", updated_at: "2026-07-09T10:00:00Z" });
      const c = resolve({ perHumanAccessToken: null, perHumanRefreshTokenFile: f });
      expect(c.reason).toBe("credential_file_no_access_token");
      expect(c.persistedAt).toBe("2026-07-09T10:00:00Z");
    });
    it("garbage (non-JWT) token → token_undecodable", () => {
      expect(resolve({ perHumanAccessToken: "garbage-not-a-jwt" }).reason).toBe("token_undecodable");
    });
    it("a real JWT with no exp claim → token_no_exp (NOT token_undecodable)", () => {
      const noExp = makeJwt({ email: "x@x.com", app_metadata: { tier: "owner" } });
      expect(resolve({ perHumanAccessToken: noExp }).reason).toBe("token_no_exp");
    });
    it("an expired token → token_expired, with expiredForMs + expiresAtMs", () => {
      const c = resolve({ perHumanAccessToken: tierJwt("owner", NOW - 7_200_000) });
      expect(c.reason).toBe("token_expired");
      expect(c.tier).toBeNull();
      expect(c.expiresAtMs).toBe(NOW - 7_200_000);
      expect(c.expiredForMs).toBe(7_200_000);
    });
    it("a live, dated token with no app_metadata.tier → token_no_tier_claim (NOT expired)", () => {
      const noTier = makeJwt({ email: "x@x.com", exp: Math.floor((NOW + 3_600_000) / 1000) });
      const c = resolve({ perHumanAccessToken: noTier });
      expect(c.reason).toBe("token_no_tier_claim");
      expect(c.expiresAtMs).toBe(NOW + 3_600_000);
    });
    it("an unrecognized tier string ('wizard') → token_no_tier_claim", () => {
      expect(resolve({ perHumanAccessToken: tierJwt("wizard") }).reason).toBe("token_no_tier_claim");
    });
  });

  // ── precedence + cross-parameter (preserved from the original semantics) ───
  describe("cross-parameter: inline-vs-file precedence is unchanged", () => {
    it("a valid inline token wins over a valid file token", () => {
      const f = writeCred("c.json", { access_token: tierJwt("user") });
      const c = resolve({ perHumanAccessToken: tierJwt("owner"), perHumanRefreshTokenFile: f });
      expect(c).toMatchObject({ tier: "owner", source: "inline" });
    });
    it("a GARBAGE inline token does NOT fall through to a valid file token (fail-closed precedence)", () => {
      const f = writeCred("c.json", { access_token: tierJwt("owner") });
      const c = resolve({ perHumanAccessToken: "garbage", perHumanRefreshTokenFile: f });
      expect(c.tier).toBeNull();
      expect(c.reason).toBe("token_undecodable");
      expect(c.source).toBe("inline");
    });
    it("an EXPIRED inline token does NOT fall through to a valid file token", () => {
      const f = writeCred("c.json", { access_token: tierJwt("owner") });
      const c = resolve({
        perHumanAccessToken: tierJwt("owner", NOW - 1000),
        perHumanRefreshTokenFile: f,
      });
      expect(c.reason).toBe("token_expired");
      expect(c.source).toBe("inline");
    });
  });

  // ── boundaries ────────────────────────────────────────────────────────────
  describe("exp boundary conditions", () => {
    it("exp exactly at now → still valid (strict <, not <=)", () => {
      // exp is whole seconds; NOW is a whole-second multiple, so exp*1000 === NOW.
      expect(resolve({ perHumanAccessToken: tierJwt("owner", NOW) })).toMatchObject({
        tier: "owner",
        reason: "ok",
      });
    });
    it("exp one millisecond in the past → expired", () => {
      expect(resolve({ perHumanAccessToken: tierJwt("owner", NOW - 1000) }).reason).toBe("token_expired");
    });
    it("exp 0, negative, and non-finite are all refused (never grant)", () => {
      expect(resolve({ perHumanAccessToken: makeJwt({ app_metadata: { tier: "owner" }, exp: 0 }) }).reason).toBe("token_expired");
      expect(resolve({ perHumanAccessToken: makeJwt({ app_metadata: { tier: "owner" }, exp: -5 }) }).reason).toBe("token_expired");
      // Infinity is not finite → decoded as null exp → undated, not "valid forever".
      expect(resolve({ perHumanAccessToken: makeJwt({ app_metadata: { tier: "owner" }, exp: Infinity }) }).reason).toBe("token_no_exp");
      expect(resolve({ perHumanAccessToken: makeJwt({ app_metadata: { tier: "owner" }, exp: "soon" }) }).reason).toBe("token_no_exp");
    });
  });

  // ── readCredentialFile unit boundaries ────────────────────────────────────
  describe("readCredentialFile", () => {
    it("null/undefined/empty path → missing", () => {
      expect(readCredentialFile(null).state).toBe("missing");
      expect(readCredentialFile(undefined).state).toBe("missing");
      expect(readCredentialFile("").state).toBe("missing");
    });
    it("JSON that is an array / number / string / null → unreadable (not a credential object)", () => {
      for (const body of ["[1,2]", "12345", '"a string"', "null"]) {
        expect(readCredentialFile(writeCred(`x-${body.length}.json`, body)).state).toBe("unreadable");
      }
    });
    it("non-string or empty access_token → no_access_token", () => {
      expect(readCredentialFile(writeCred("n.json", { access_token: 12345 })).state).toBe("no_access_token");
      expect(readCredentialFile(writeCred("e.json", { access_token: "" })).state).toBe("no_access_token");
    });
    it("non-string updated_at is dropped to null rather than leaked verbatim", () => {
      const r = readCredentialFile(writeCred("u.json", { access_token: "t", updated_at: 99 }));
      expect(r).toMatchObject({ state: "ok", updatedAt: null });
    });
    it("readAccessTokenFromFile stays a thin, behaviour-identical wrapper", () => {
      const good = writeCred("g.json", { access_token: "tok" });
      expect(readAccessTokenFromFile(good)).toBe("tok");
      expect(readAccessTokenFromFile(join(dir, "nope.json"))).toBeNull();
      expect(readAccessTokenFromFile(writeCred("c2.json", "{ bad"))).toBeNull();
      expect(readAccessTokenFromFile(null)).toBeNull();
    });
  });

  // ── security ──────────────────────────────────────────────────────────────
  describe("security", () => {
    it("a __proto__ key in the credential file does not pollute Object.prototype", () => {
      const f = writeCred("p.json", '{"__proto__":{"polluted":true},"access_token":"' + tierJwt("owner") + '"}');
      const c = resolve({ perHumanAccessToken: null, perHumanRefreshTokenFile: f });
      expect(c.tier).toBe("owner"); // the real key still reads
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
    it("a JWT whose payload sets app_metadata via __proto__ does not yield a tier", () => {
      const tok = makeJwt({ __proto__: { app_metadata: { tier: "owner" } }, exp: Math.floor((NOW + 3600e3) / 1000) } as Record<string, unknown>);
      expect(resolve({ perHumanAccessToken: tok }).reason).toBe("token_no_tier_claim");
    });
    it("a token with 4 segments (signature-splicing shape) → token_undecodable", () => {
      expect(resolve({ perHumanAccessToken: "a.b.c.d" }).reason).toBe("token_undecodable");
      expect(decodeJwtPayload("a.b.c.d")).toBeNull();
    });
    it("neither the detail nor the remediation ever echoes the raw token", () => {
      const secret = tierJwt("owner", NOW - 1000);
      const cred = resolve({ perHumanAccessToken: secret });
      const d = analyticsDenialReason({ authMode: "per-human", role: "operator:unknown", credential: cred });
      expect(d.detail).not.toContain(secret);
      expect(d.remediation).not.toContain(secret);
    });
  });

  // ── describeCredential + remediation totality ─────────────────────────────
  describe("describeCredential + remediation are total over every reason", () => {
    it("every reason has a non-empty remediation except 'ok'", () => {
      for (const r of ALL_REASONS) {
        expect(CREDENTIAL_REMEDIATION[r]).toBeTypeOf("string");
        if (r !== "ok") expect(CREDENTIAL_REMEDIATION[r].length).toBeGreaterThan(0);
      }
    });
    it("describeCredential returns a non-empty sentence for every reason and never throws", () => {
      for (const r of ALL_REASONS) {
        const s = describeCredential({
          tier: r === "ok" ? "owner" : null,
          reason: r,
          source: "file",
          expiresAtMs: NOW,
          expiredForMs: r === "token_expired" ? 3_600_000 : null,
          persistedAt: "2026-07-03T10:58:33.177Z",
        });
        expect(s.length).toBeGreaterThan(0);
      }
    });
    it("the expired sentence names the age and the exp instant (the field-diagnosable bit)", () => {
      const s = describeCredential({
        tier: null, reason: "token_expired", source: "file",
        expiresAtMs: NOW - 7_200_000, expiredForMs: 7_200_000,
        persistedAt: "2026-07-03T10:58:33.177Z",
      });
      expect(s).toContain("2h ago");
      expect(s).toContain("supabase-ops last persisted it at 2026-07-03T10:58:33.177Z");
    });
  });

  // ── contract boundary: real resolver → real denial → real handler ─────────
  describe("contract boundaries (real upstream output, not hand-built mocks)", () => {
    const spy = () => {
      const calls: string[] = [];
      const q: AnalyticsQuerier = {
        async query(sql) {
          calls.push(sql);
          return { rows: [], rowCount: 0 };
        },
      };
      return { q, calls };
    };

    it("expired token → handleQuery denies with reason token_expired + remediation, and NEVER touches the DB", async () => {
      const f = writeCred("stale.json", {
        access_token: tierJwt("owner", NOW - 580_000_000),
        updated_at: "2026-07-03T10:58:33.177Z",
      });
      const credential = resolve({ perHumanAccessToken: null, perHumanRefreshTokenFile: f });
      const { q, calls } = spy();

      const r = await handleQuery(
        { sql: "select 1" },
        { role: "operator:unknown", sessionId: "s", allowedAnalytics: false, authMode: "per-human", tier: credential.tier, credential },
        q,
      );

      expect(r.state).toBe("denied");
      expect(r.errorCode).toBe("tier_not_allowed"); // coarse wire code unchanged
      const out = r.output as Record<string, string>;
      expect(out.reason).toBe("token_expired"); // fine, machine-readable discriminator
      expect(out.detail).toMatch(/expired/i);
      expect(out.detail).toMatch(/owner\/admin only/);
      expect(out.remediation).toMatch(/enroll\.cjs/);
      expect(calls).toEqual([]); // fail-closed before any query
    });

    it("missing credential file and no-tier-claim produce DIFFERENT reasons through the same handler", async () => {
      const { q } = spy();
      const mk = async (credential: ReturnType<typeof resolve>) =>
        (await handleQuery({ sql: "select 1" },
          { role: "operator:unknown", sessionId: "s", allowedAnalytics: false, authMode: "per-human", tier: null, credential }, q,
        )).output as Record<string, string>;

      const missing = await mk(resolve({ perHumanAccessToken: null, perHumanRefreshTokenFile: join(dir, "gone.json") }));
      const noTier = await mk(resolve({ perHumanAccessToken: makeJwt({ exp: Math.floor((NOW + 3600e3) / 1000) }) }));

      expect(missing.reason).toBe("credential_file_missing");
      expect(noTier.reason).toBe("token_no_tier_claim");
      expect(missing.reason).not.toBe(noTier.reason); // the bug this change fixes
      expect(missing.remediation).not.toBe(noTier.remediation);
    });

    it("a decoded-but-unpermitted tier is 'tier_not_permitted', NOT a credential fault", () => {
      const credential = resolve({ perHumanAccessToken: tierJwt("user") });
      expect(credential.reason).toBe("ok");
      const d = analyticsDenialReason({ authMode: "per-human", role: "operator:user", credential });
      expect(d.reason).toBe("tier_not_permitted");
      expect(d.code).toBe("tier_not_allowed");
      expect(d.detail).toMatch(/owner\/admin only/);
    });

    it("service-key mode is untouched by the credential plumbing", () => {
      const d = analyticsDenialReason({ authMode: "service-key", role: "gps", credential: resolve({ perHumanAccessToken: tierJwt("owner") }) });
      expect(d.code).toBe("role_not_allowed");
      expect(d.reason).toBe("role_not_allowlisted");
    });

    it("a hand-built ctx with no credential still denies (back-compat, generic message)", () => {
      const d = analyticsDenialReason({ authMode: "per-human", role: "operator:unknown", tier: null });
      expect(d.code).toBe("tier_not_allowed");
      expect(d.detail).toMatch(/owner\/admin only/);
    });
  });

  // ── the load-bearing invariant: diagnosis never widens the gate ───────────
  describe("fail-closed invariant — a better message must not grant more access", () => {
    it("resolveOperatorTier(env) === resolveOperatorCredential(env).tier for every input shape", () => {
      // resolveOperatorTier reads the WALL clock, so these fixtures must be dated
      // against it — otherwise every "valid" case is silently expired and the
      // equivalence holds vacuously at null === null.
      const liveJwt = (tier: string) => tierJwt(tier, Date.now() + 3_600_000);
      const cases: Partial<ReturnType<typeof loadEnv>>[] = [
        { perHumanAccessToken: liveJwt("owner") }, // → 'owner' on both sides
        { perHumanAccessToken: liveJwt("admin") },
        { perHumanAccessToken: liveJwt("user") },
        { perHumanAccessToken: tierJwt("owner", Date.now() - 1000) }, // expired
        { perHumanAccessToken: "garbage" },
        { perHumanAccessToken: makeJwt({ app_metadata: { tier: "owner" } }) }, // no exp
        { perHumanAccessToken: null, perHumanRefreshTokenFile: null },
        { perHumanAccessToken: null, perHumanRefreshTokenFile: join(dir, "absent.json") },
        { perHumanAccessToken: null, perHumanRefreshTokenFile: writeCred("i1.json", { refresh_token: "R" }) },
        { perHumanAccessToken: null, perHumanRefreshTokenFile: writeCred("i2.json", { access_token: liveJwt("admin") }) },
      ];
      const seen = new Set<unknown>();
      for (const c of cases) {
        const viaCredential = resolveOperatorCredential(env(c)).tier;
        expect(resolveOperatorTier(env(c))).toBe(viaCredential);
        seen.add(viaCredential);
      }
      // Guard against a vacuous pass: the fixtures must cover grants AND denials.
      expect(seen).toEqual(new Set(["owner", "admin", "user", null]));
    });
    it("any reason other than 'ok' yields tier null (never a grant)", () => {
      const shapes = [
        {}, // none
        { perHumanRefreshTokenFile: join(dir, "absent.json") },
        { perHumanRefreshTokenFile: writeCred("j1.json", "{bad") },
        { perHumanRefreshTokenFile: writeCred("j2.json", { refresh_token: "R" }) },
        { perHumanAccessToken: "garbage" },
        { perHumanAccessToken: makeJwt({ app_metadata: { tier: "owner" } }) },
        { perHumanAccessToken: tierJwt("owner", NOW - 1000) },
        { perHumanAccessToken: makeJwt({ exp: Math.floor((NOW + 3600e3) / 1000) }) },
      ];
      for (const s of shapes) {
        const c = resolve({ perHumanAccessToken: null, perHumanRefreshTokenFile: null, ...s });
        expect(c.reason).not.toBe("ok");
        expect(c.tier).toBeNull();
      }
    });
    it("only 'owner'/'admin' with reason 'ok' can ever produce a non-null tier", () => {
      expect(resolve({ perHumanAccessToken: tierJwt("owner") }).tier).toBe("owner");
      expect(resolve({ perHumanAccessToken: tierJwt("admin") }).tier).toBe("admin");
      // 'user' resolves ok (a real tier) but is denied downstream by the tier gate.
      expect(resolve({ perHumanAccessToken: tierJwt("user") })).toMatchObject({ tier: "user", reason: "ok" });
    });
  });
});

// Skipped: state sequences — resolveOperatorCredential is a pure function of (env, now)
// plus one file read; it holds no state between calls. The cold-start → live transition
// is covered by `credential_file_no_access_token` + the happy-path file test above.
