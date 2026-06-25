// All-Edge unit tests for the multi-user-auth per-human MCP path (Sprint 1).
// Default (service-key) behavior MUST be unchanged; per-human is additive + gated.

import { describe, it, expect, beforeEach } from "vitest";
import { loadEnv, MissingEnvError } from "../src/lib/env.ts";
import { decodeJwtClaims } from "../src/governance/operator-identity.ts";
import { resolveRole, resolveOperator, MissingTierError } from "../src/governance/role-resolver.ts";
import { getClient, resetClient } from "../src/lib/supabase-client.ts";
import { handleQuery } from "../src/tools/query.ts";
import { enforceTier, ToolNotInRoleScopeError, TierExceededError } from "../src/governance/hitl-tier-check.ts";
import type { ServerEnv } from "../src/lib/env.ts";

const OPS_URL = "https://mntobbmieuoaxipnjaau.supabase.co"; // the allowlisted ritsu-ops ref
const base = {
  SUPABASE_URL: OPS_URL,
  SUPABASE_SERVICE_KEY: "svc-key",
  SUPABASE_ANON_KEY: "anon-key",
  RITSU_REPO_ROOT: "/tmp",
} as NodeJS.ProcessEnv;

function makeJwt(payload: Record<string, unknown>): string {
  const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${seg({ alg: "HS256", typ: "JWT" })}.${seg(payload)}.sig`;
}

describe("env.loadEnv — RITSU_AUTH_MODE", () => {
  it("defaults to service-key, no operator token", () => {
    const e = loadEnv(base);
    expect(e.authMode).toBe("service-key");
    expect(e.perHumanAccessToken).toBeNull();
  });
  it("rejects an invalid mode", () => {
    expect(() => loadEnv({ ...base, RITSU_AUTH_MODE: "bogus" })).toThrow(MissingEnvError);
  });
  it("per-human requires a token (access OR refresh) — neither → throw", () => {
    expect(() => loadEnv({ ...base, RITSU_AUTH_MODE: "per-human" })).toThrow(/RITSU_OPERATOR_REFRESH_TOKEN|RITSU_OPERATOR_ACCESS_TOKEN/);
  });
  it("per-human requires an anon key (no service_role in this mode)", () => {
    expect(() =>
      loadEnv({ SUPABASE_URL: OPS_URL, SUPABASE_SERVICE_KEY: "svc", RITSU_REPO_ROOT: "/tmp", RITSU_AUTH_MODE: "per-human", RITSU_OPERATOR_ACCESS_TOKEN: "tok" } as NodeJS.ProcessEnv),
    ).toThrow(/ANON_KEY/);
  });
  it("per-human with access token + anon parses", () => {
    const e = loadEnv({ ...base, RITSU_AUTH_MODE: "per-human", RITSU_OPERATOR_ACCESS_TOKEN: "tok-123" });
    expect(e.authMode).toBe("per-human");
    expect(e.perHumanAccessToken).toBe("tok-123");
    expect(e.perHumanRefreshToken).toBeNull();
  });
  it("per-human with ONLY a refresh token parses (preferred production path)", () => {
    const e = loadEnv({ ...base, RITSU_AUTH_MODE: "per-human", RITSU_OPERATOR_REFRESH_TOKEN: "refresh-xyz" });
    expect(e.authMode).toBe("per-human");
    expect(e.perHumanRefreshToken).toBe("refresh-xyz");
    expect(e.perHumanAccessToken).toBeNull();
  });
  it("per-human with a refresh token still requires the anon key", () => {
    expect(() =>
      loadEnv({ SUPABASE_URL: OPS_URL, SUPABASE_SERVICE_KEY: "svc", RITSU_REPO_ROOT: "/tmp", RITSU_AUTH_MODE: "per-human", RITSU_OPERATOR_REFRESH_TOKEN: "r" } as NodeJS.ProcessEnv),
    ).toThrow(/ANON_KEY/);
  });
});

describe("decodeJwtClaims — fail-closed", () => {
  it("extracts email (lowercased), tier, sub from a valid JWT", () => {
    const jwt = makeJwt({ email: "O@X.com", sub: "uuid-1", app_metadata: { tier: "owner" } });
    expect(decodeJwtClaims(jwt)).toStrictEqual({ email: "o@x.com", tier: "owner", sub: "uuid-1" });
  });
  it("tier null when app_metadata absent", () => {
    expect(decodeJwtClaims(makeJwt({ email: "a@x.com", sub: "u" })).tier).toBeNull();
  });
  it("tier null for an unrecognized tier value", () => {
    expect(decodeJwtClaims(makeJwt({ app_metadata: { tier: "wizard" } })).tier).toBeNull();
  });
  it("admin + user tiers accepted", () => {
    expect(decodeJwtClaims(makeJwt({ app_metadata: { tier: "admin" } })).tier).toBe("admin");
    expect(decodeJwtClaims(makeJwt({ app_metadata: { tier: "user" } })).tier).toBe("user");
  });
  it("all-null on malformed input", () => {
    const empty = { email: null, tier: null, sub: null };
    expect(decodeJwtClaims("not-a-jwt")).toStrictEqual(empty);
    expect(decodeJwtClaims("a.@@@notbase64@@@.c")).toStrictEqual(empty);
    expect(decodeJwtClaims("")).toStrictEqual(empty);
    expect(decodeJwtClaims(null)).toStrictEqual(empty);
    expect(decodeJwtClaims(undefined)).toStrictEqual(empty);
  });
  it("non-string email/sub → null (not coerced)", () => {
    const d = decodeJwtClaims(makeJwt({ email: 123, sub: { x: 1 }, app_metadata: { tier: "user" } }));
    expect(d.email).toBeNull();
    expect(d.sub).toBeNull();
    expect(d.tier).toBe("user");
  });
});

describe("role-resolver — service-key vs per-human", () => {
  it("resolveRole stamps authMode='service-key'", () => {
    expect(resolveRole("founder", "s").authMode).toBe("service-key");
  });
  it("owner → full scope, D-MAX, per-human, attributed", () => {
    const c = resolveOperator({ email: "o@x.com", tier: "owner", sub: "u1" }, "s");
    expect(c.role).toBe("owner");
    expect(c.hitlMaxTier).toBe("D-MAX");
    expect(c.tier2SchemasRead).toContain("ops.*");
    expect(c.tier2SchemasWrite).toContain("ops.*");
    expect(c.authMode).toBe("per-human");
    expect(c.humanEmail).toBe("o@x.com");
    expect(c.humanSub).toBe("u1");
  });
  it("admin → ops only (metrics is owner-only at the DB), C, no public/metrics", () => {
    const c = resolveOperator({ email: "a@x.com", tier: "admin", sub: "u2" }, "s");
    expect(c.hitlMaxTier).toBe("C");
    expect(c.tier2SchemasRead).toStrictEqual(["ops.*"]);
    expect(c.tier2SchemasWrite).toStrictEqual(["ops.*"]);
    expect(c.tier2SchemasRead).not.toContain("metrics.*");
    expect(c.tier2SchemasRead).not.toContain("public.*");
  });
  it("user → empty scopes, A (no ops access)", () => {
    const c = resolveOperator({ email: "u@x.com", tier: "user", sub: "u3" }, "s");
    expect(c.hitlMaxTier).toBe("A");
    expect(c.tier2SchemasRead).toStrictEqual([]);
    expect(c.tier2SchemasWrite).toStrictEqual([]);
  });
  it("no tier → MissingTierError (fail-closed)", () => {
    expect(() => resolveOperator({ email: "x@x.com", tier: null, sub: null }, "s")).toThrow(MissingTierError);
  });
});

describe("supabase-client — per-human builds an authenticated client", () => {
  beforeEach(() => resetClient());
  const perHumanEnv = (token: string): ServerEnv => loadEnv({ ...base, RITSU_AUTH_MODE: "per-human", RITSU_OPERATOR_ACCESS_TOKEN: token });
  it("builds a client in per-human mode without throwing", () => {
    expect(getClient(perHumanEnv("tok-a"))).toBeTruthy();
  });
  it("rebuilds the client when the token rotates", () => {
    const c1 = getClient(perHumanEnv("tok-a"));
    const c2 = getClient(perHumanEnv("tok-a"));
    expect(c2).toBe(c1); // same token → cached
    const c3 = getClient(perHumanEnv("tok-b"));
    expect(c3).not.toBe(c1); // rotated token → fresh client
  });
  it("service-key mode still builds a client", () => {
    resetClient();
    expect(getClient(loadEnv(base))).toBeTruthy();
  });
});

describe("query — RPC selection by authMode", () => {
  function mockClient(): { client: any; calls: string[] } {
    const calls: string[] = [];
    const client = {
      schema: () => ({
        rpc: (name: string) => {
          calls.push(name);
          return Promise.resolve({ data: { rows: [], row_count: 0, truncated: false }, error: null });
        },
      }),
    };
    return { client, calls };
  }
  it("per-human → SECURITY INVOKER RPC (ops_run_select_rls)", async () => {
    const { client, calls } = mockClient();
    const ctx = resolveOperator({ email: "o@x.com", tier: "owner", sub: "u" }, "s");
    const r = await handleQuery({ sql: "select 1" }, ctx, client);
    expect(r.state).toBe("completed");
    expect(calls).toStrictEqual(["ops_run_select_rls"]);
  });
  it("service-key → SECURITY DEFINER RPC (ops_run_select)", async () => {
    const { client, calls } = mockClient();
    const ctx = resolveRole("founder", "s");
    await handleQuery({ sql: "select 1" }, ctx, client);
    expect(calls).toStrictEqual(["ops_run_select"]);
  });
  it("user tier (empty read scope) → denied before any RPC", async () => {
    const { client, calls } = mockClient();
    const ctx = resolveOperator({ email: "u@x.com", tier: "user", sub: "u" }, "s");
    const r = await handleQuery({ sql: "select 1" }, ctx, client);
    expect(r.state).toBe("denied");
    expect(calls).toStrictEqual([]);
  });
});

describe("enforceTier — per-human skips the agent-role allowlist, keeps the tier gate", () => {
  const registry = {
    version: "test",
    tools: [
      { id: "query", server: "supabase-ops", description: "", tier_default: "A" as const, role_scope: ["founder"] },
      { id: "danger", server: "supabase-ops", description: "", tier_default: "D-MAX" as const },
    ],
  };
  it("service-key: role NOT in role_scope → ToolNotInRoleScope", () => {
    const ctx = resolveRole("gps", "s"); // gps not in ['founder']
    expect(() => enforceTier(registry, "query", ctx)).toThrow(ToolNotInRoleScopeError);
  });
  it("per-human: tier not in role_scope → ALLOWED (allowlist skipped)", () => {
    const ctx = resolveOperator({ email: "a@x.com", tier: "admin", sub: "u" }, "s");
    expect(enforceTier(registry, "query", ctx).requiredTier).toBe("A");
  });
  it("per-human: HITL tier still enforced (user A < D-MAX tool → TierExceeded)", () => {
    const ctx = resolveOperator({ email: "u@x.com", tier: "user", sub: "u" }, "s");
    expect(() => enforceTier(registry, "danger", ctx)).toThrow(TierExceededError);
  });
  it("per-human owner: D-MAX tool allowed", () => {
    const ctx = resolveOperator({ email: "o@x.com", tier: "owner", sub: "u" }, "s");
    expect(enforceTier(registry, "danger", ctx).requiredTier).toBe("D-MAX");
  });
});
