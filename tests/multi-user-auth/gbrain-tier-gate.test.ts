// All-Edge tests for the per-human gbrain tier gate (capability multi-user-auth,
// Sprint 2 — ITEM B). The hook is .cjs; we import the pure decision engine and
// test it against the REAL knowledge/operator-tiers.yaml so a contract change
// (e.g. removing gbrain from admin) is caught here.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import {
  decideGbrainTier,
  decodeTierClaims,
  tierMayUseGbrain,
  GBRAIN_TOOL_RE,
} from "../../.claude/hooks/runtime/lib/gbrain-tier-gate.cjs";

const REPO_ROOT = process.cwd();
const tiersDoc = yaml.load(
  readFileSync(join(REPO_ROOT, "knowledge", "operator-tiers.yaml"), "utf8"),
) as object;

const NOW_MS = 1_900_000_000_000; // fixed deterministic "now"
const FUTURE = Math.floor(NOW_MS / 1000) + 3600;
const PAST = Math.floor(NOW_MS / 1000) - 60;

function makeJwt(payload: Record<string, unknown>): string {
  const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${seg({ alg: "HS256", typ: "JWT" })}.${seg(payload)}.sig`;
}
const tierJwt = (tier: string, exp: number = FUTURE) => makeJwt({ app_metadata: { tier }, exp });

const decide = (over: Partial<Parameters<typeof decideGbrainTier>[0]>) =>
  decideGbrainTier({
    toolName: "mcp__gbrain__search",
    authMode: "per-human",
    accessToken: null,
    tiersDoc,
    nowMs: NOW_MS,
    ...over,
  });

describe("decodeTierClaims", () => {
  it("extracts tier + exp from a valid token", () => {
    expect(decodeTierClaims(tierJwt("owner"))).toStrictEqual({ tier: "owner", exp: FUTURE });
    expect(decodeTierClaims(tierJwt("admin")).tier).toBe("admin");
    expect(decodeTierClaims(tierJwt("user")).tier).toBe("user");
  });
  it("fail-closed (tier null) on malformed / missing / unknown tier", () => {
    expect(decodeTierClaims(tierJwt("wizard")).tier).toBeNull();
    expect(decodeTierClaims(makeJwt({ exp: FUTURE })).tier).toBeNull();
    expect(decodeTierClaims("not-a-jwt")).toStrictEqual({ tier: null, exp: null });
    expect(decodeTierClaims("")).toStrictEqual({ tier: null, exp: null });
    expect(decodeTierClaims(null as unknown as string)).toStrictEqual({ tier: null, exp: null });
    expect(decodeTierClaims(undefined as unknown as string)).toStrictEqual({ tier: null, exp: null });
  });
  it("exp null when absent or non-numeric", () => {
    expect(decodeTierClaims(makeJwt({ app_metadata: { tier: "owner" } })).exp).toBeNull();
    expect(decodeTierClaims(makeJwt({ app_metadata: { tier: "owner" }, exp: "soon" })).exp).toBeNull();
  });
});

describe("tierMayUseGbrain — against the REAL operator-tiers.yaml contract", () => {
  it("owner + admin may use gbrain; user may NOT; unknown → false", () => {
    expect(tierMayUseGbrain("owner", tiersDoc)).toBe(true);
    expect(tierMayUseGbrain("admin", tiersDoc)).toBe(true);
    expect(tierMayUseGbrain("user", tiersDoc)).toBe(false);
    expect(tierMayUseGbrain("wizard", tiersDoc)).toBe(false);
    expect(tierMayUseGbrain(null as unknown as string, tiersDoc)).toBe(false);
  });
});

describe("GBRAIN_TOOL_RE", () => {
  it("matches only mcp__gbrain__* tools", () => {
    expect(GBRAIN_TOOL_RE.test("mcp__gbrain__search")).toBe(true);
    expect(GBRAIN_TOOL_RE.test("mcp__gbrain__put_page")).toBe(true);
    expect(GBRAIN_TOOL_RE.test("mcp__supabase-ops__query")).toBe(false);
    expect(GBRAIN_TOOL_RE.test("mcp__gbrainX__y")).toBe(false); // requires exactly the mcp__gbrain__ prefix
    expect(GBRAIN_TOOL_RE.test("Bash")).toBe(false);
  });
});

describe("decideGbrainTier", () => {
  describe("no-op (default unchanged)", () => {
    it("service-key mode → allow, even for a gbrain tool with a user token", () => {
      const d = decideGbrainTier({ toolName: "mcp__gbrain__search", authMode: "service-key", accessToken: tierJwt("user"), tiersDoc, nowMs: NOW_MS });
      expect(d.decision).toBe("allow");
      expect(d.matchRule).toBe("service-key");
    });
    it("undefined / empty authMode → allow (treated as not-per-human)", () => {
      expect(decide({ authMode: "", accessToken: tierJwt("user") }).decision).toBe("allow");
      expect(decide({ authMode: undefined as unknown as string, accessToken: tierJwt("user") }).decision).toBe("allow");
    });
    it("per-human but NON-gbrain tool → allow", () => {
      expect(decide({ toolName: "mcp__supabase-ops__query", accessToken: tierJwt("user") }).decision).toBe("allow");
      expect(decide({ toolName: "Bash", accessToken: tierJwt("user") }).decision).toBe("allow");
    });
  });

  describe("per-human gbrain — allow paths", () => {
    it("owner → allow", () => {
      const d = decide({ accessToken: tierJwt("owner") });
      expect(d.decision).toBe("allow");
      expect(d.tier).toBe("owner");
    });
    it("admin → allow (read + write tools)", () => {
      expect(decide({ toolName: "mcp__gbrain__search", accessToken: tierJwt("admin") }).decision).toBe("allow");
      expect(decide({ toolName: "mcp__gbrain__put_page", accessToken: tierJwt("admin") }).decision).toBe("allow");
    });
  });

  describe("per-human gbrain — block paths (fail-closed)", () => {
    it("user → BLOCK tier-denied", () => {
      const d = decide({ accessToken: tierJwt("user") });
      expect(d.decision).toBe("block");
      expect(d.matchRule).toBe("tier-denied");
      expect(d.tier).toBe("user");
    });
    it("no access token → BLOCK unresolved-or-expired", () => {
      const d = decide({ accessToken: null });
      expect(d.decision).toBe("block");
      expect(d.matchRule).toBe("unresolved-or-expired");
    });
    it("EXPIRED owner token → BLOCK (stale tier cannot keep granting)", () => {
      const d = decide({ accessToken: tierJwt("owner", PAST) });
      expect(d.decision).toBe("block");
      expect(d.matchRule).toBe("unresolved-or-expired");
    });
    it("token with no exp claim → BLOCK (undated)", () => {
      const d = decide({ accessToken: makeJwt({ app_metadata: { tier: "owner" } }) });
      expect(d.decision).toBe("block");
      expect(d.matchRule).toBe("unresolved-or-expired");
    });
    it("token with future exp but NO tier claim → BLOCK no-tier", () => {
      const d = decide({ accessToken: makeJwt({ exp: FUTURE }) });
      expect(d.decision).toBe("block");
      expect(d.matchRule).toBe("no-tier");
    });
    it("unknown tier string (future exp) → BLOCK no-tier (fail-closed)", () => {
      const d = decide({ accessToken: tierJwt("wizard") });
      expect(d.decision).toBe("block");
      expect(d.matchRule).toBe("no-tier");
    });
    it("garbage token → BLOCK", () => {
      expect(decide({ accessToken: "garbage" }).decision).toBe("block");
    });
  });

  describe("totality — never throws on hostile input", () => {
    it("empty tiersDoc with a valid token → block (tier can't be resolved to a grant)", () => {
      const d = decideGbrainTier({ toolName: "mcp__gbrain__search", authMode: "per-human", accessToken: tierJwt("admin"), tiersDoc: {}, nowMs: NOW_MS });
      expect(d.decision).toBe("block");
      expect(d.matchRule).toBe("tier-denied");
    });
    it("empty/garbage params object → does not throw", () => {
      expect(() => decideGbrainTier({} as never)).not.toThrow();
      expect(() => decideGbrainTier(null as never)).not.toThrow();
    });
    it("a maliciously self-referential `inherits` chain in tiers.yaml → no infinite loop; still fail-closed", () => {
      // effectiveTier guards cycles with a `seen` Set. A user-corrupted tiers.yaml
      // with inheritance cycles must neither hang nor fail-open.
      const cyclic = {
        tiers: {
          user: { inherits: "user", mcp: { read: [], write: [] } }, // self-cycle
          admin: { inherits: "owner", mcp: { read: ["gbrain"], write: ["gbrain"] } },
          owner: { inherits: "admin", mcp: { read: ["*"], write: ["*"] } }, // owner↔admin cycle
        },
      };
      const u = decideGbrainTier({ toolName: "mcp__gbrain__search", authMode: "per-human", accessToken: tierJwt("user"), tiersDoc: cyclic, nowMs: NOW_MS });
      expect(u.decision).toBe("block");
      // the cycle guard still lets a valid owner resolve (terminates, merges grants)
      const o = decideGbrainTier({ toolName: "mcp__gbrain__search", authMode: "per-human", accessToken: tierJwt("owner"), tiersDoc: cyclic, nowMs: NOW_MS });
      expect(o.decision).toBe("allow");
    });
  });
});
