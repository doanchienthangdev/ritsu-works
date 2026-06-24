// All-Edge-Cases tests for scripts/local-install/lib/operator-tier.cjs.
//
// Phase 1 — Analysis: normEmail, resolveOperator(email, registry),
// effectiveTier(tierName, tiersDoc) [hierarchy merge + wildcard collapse +
// requires_hitl = own-tier], can(email, cap, registry, tiers) [FAIL CLOSED].
// Pure, no I/O. Injected registry + tiers literals + a contract test vs the
// real knowledge/operator-tiers.yaml.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { normEmail, resolveOperator, effectiveTier, can } from "../../scripts/local-install/lib/operator-tier.cjs";

// Minimal tiers doc mirroring the real structure (owner ⊇ admin ⊇ user).
const TIERS = {
  tiers: {
    user: {
      inherits: null,
      commands: { allow: ["write", "voice"] },
      mcp: { read: [], write: [] },
      db_schemas: { read: [], write: [] },
      git: { tier1_edit: false, merge_main: false, push_branch: true },
      publish: { external_stores: true, brand_channels: false, requires_hitl: true },
      user_management: false,
    },
    admin: {
      inherits: "user",
      commands: { allow: ["deepask", "wiki"] },
      mcp: { read: ["o", "g"], write: ["o", "g"] },
      db_schemas: { read: ["ops"], write: ["ops"] },
      git: { tier1_edit: false, merge_main: false, push_branch: true },
      publish: { external_stores: true, brand_channels: false, requires_hitl: true },
      user_management: false,
    },
    owner: {
      inherits: "admin",
      commands: { allow: ["*"] },
      mcp: { read: ["*"], write: ["*"] },
      db_schemas: { read: ["*"], write: ["*"] },
      git: { tier1_edit: true, merge_main: true, push_branch: true },
      publish: { external_stores: true, brand_channels: true, requires_hitl: false },
      user_management: true,
    },
  },
};

const reg = (ops: any[]) => ({ version: "1.0.0", operators: ops });
const O = { email: "o@x.com", tier: "owner", status: "active" };
const A = { email: "a@x.com", tier: "admin", status: "active" };
const U = { email: "u@x.com", tier: "user", status: "active" };

describe("normEmail", () => {
  it("lowercases + trims", () => expect(normEmail("  A@X.com ")).toBe("a@x.com"));
  it("non-string → null", () => { expect(normEmail(123 as any)).toBeNull(); expect(normEmail(undefined as any)).toBeNull(); });
});

describe("resolveOperator", () => {
  const r = reg([O, A, U]);
  it("finds by exact email", () => expect(resolveOperator("a@x.com", r)?.tier).toBe("admin"));
  it("is case + whitespace insensitive", () => expect(resolveOperator(" A@X.COM ", r)?.tier).toBe("admin"));
  it("not found → null", () => expect(resolveOperator("nobody@x.com", r)).toBeNull());
  it("null email → null", () => expect(resolveOperator(null as any, r)).toBeNull());
  it("null registry → null", () => expect(resolveOperator("a@x.com", null as any)).toBeNull());
  it("registry without operators[] → null", () => expect(resolveOperator("a@x.com", { version: "1" } as any)).toBeNull());
});

describe("effectiveTier", () => {
  it("unknown tier → null", () => expect(effectiveTier("ghost", TIERS)).toBeNull());
  it("null tiersDoc → null", () => expect(effectiveTier("owner", null as any)).toBeNull());
  it("user has only its own grants", () => {
    const e = effectiveTier("user", TIERS)!;
    expect(e.commands.allow).toStrictEqual(["write", "voice"]);
    expect(e.mcp.write).toStrictEqual([]);
    expect(e.user_management).toBe(false);
  });
  it("admin INHERITS user (commands union)", () => {
    const e = effectiveTier("admin", TIERS)!;
    expect(e.commands.allow.sort()).toStrictEqual(["deepask", "voice", "wiki", "write"]);
    expect(e.mcp.write.sort()).toStrictEqual(["g", "o"]);
    expect(e.git.push_branch).toBe(true);
    expect(e.git.merge_main).toBe(false);
  });
  it("owner WILDCARD collapses lists to ['*'] (regression: in-place mutation)", () => {
    const e = effectiveTier("owner", TIERS)!;
    expect(e.commands.allow).toStrictEqual(["*"]);
    expect(e.mcp.write).toStrictEqual(["*"]);
    expect(e.db_schemas.write).toStrictEqual(["*"]);
    expect(e.git.tier1_edit).toBe(true);
    expect(e.user_management).toBe(true);
  });
  it("requires_hitl = the OWN tier value, not inherited (owner=false despite inheriting admin=true)", () => {
    expect(effectiveTier("owner", TIERS)!.publish.requires_hitl).toBe(false);
    expect(effectiveTier("admin", TIERS)!.publish.requires_hitl).toBe(true);
    expect(effectiveTier("user", TIERS)!.publish.requires_hitl).toBe(true);
  });
});

describe("can — FAIL CLOSED decision function", () => {
  const r = reg([O, A, U, { email: "gone@x.com", tier: "admin", status: "revoked" }, { email: "inv@x.com", tier: "user", status: "invited" }]);

  describe("identity / status gating", () => {
    it("unknown email → deny", () => expect(can("nobody@x.com", { kind: "command", value: "write" }, r, TIERS).allow).toBe(false));
    it("revoked → deny", () => { const d = can("gone@x.com", { kind: "command", value: "write" }, r, TIERS); expect(d.allow).toBe(false); expect(d.reason).toMatch(/revoked/); });
    it("invited (not active) → deny", () => expect(can("inv@x.com", { kind: "command", value: "write" }, r, TIERS).allow).toBe(false));
  });

  describe("malformed inputs → fail closed", () => {
    it("no cap → deny", () => expect(can("o@x.com", null as any, r, TIERS).allow).toBe(false));
    it("unknown cap kind → deny", () => expect(can("o@x.com", { kind: "launch-missiles" } as any, r, TIERS).allow).toBe(false));
    it("operator with unknown tier → deny", () => {
      const r2 = reg([O, { email: "weird@x.com", tier: "wizard", status: "active" }]);
      expect(can("weird@x.com", { kind: "command", value: "write" }, r2, TIERS).allow).toBe(false);
    });
  });

  describe("owner — everything", () => {
    it("system command", () => expect(can("o@x.com", { kind: "command", value: "cla" }, r, TIERS).allow).toBe(true));
    it("git tier1 + merge", () => { expect(can("o@x.com", { kind: "git-tier1" }, r, TIERS).allow).toBe(true); expect(can("o@x.com", { kind: "git-merge" }, r, TIERS).allow).toBe(true); });
    it("user-management", () => expect(can("o@x.com", { kind: "user-management" }, r, TIERS).allow).toBe(true));
    it("publish-brand", () => expect(can("o@x.com", { kind: "publish-brand" }, r, TIERS).allow).toBe(true));
  });

  describe("admin — data + content, NOT system/owner", () => {
    it("inherited content command (write)", () => expect(can("a@x.com", { kind: "command", value: "write" }, r, TIERS).allow).toBe(true));
    it("own data command (deepask)", () => expect(can("a@x.com", { kind: "command", value: "deepask" }, r, TIERS).allow).toBe(true));
    it("mcp-write to a granted system", () => expect(can("a@x.com", { kind: "mcp-write", value: "g" }, r, TIERS).allow).toBe(true));
    it("db-write ops", () => expect(can("a@x.com", { kind: "db-write", value: "ops" }, r, TIERS).allow).toBe(true));
    it("system command DENIED", () => expect(can("a@x.com", { kind: "command", value: "cla" }, r, TIERS).allow).toBe(false));
    it("git-merge DENIED", () => expect(can("a@x.com", { kind: "git-merge" }, r, TIERS).allow).toBe(false));
    it("git-tier1 DENIED", () => expect(can("a@x.com", { kind: "git-tier1" }, r, TIERS).allow).toBe(false));
    it("user-management DENIED", () => expect(can("a@x.com", { kind: "user-management" }, r, TIERS).allow).toBe(false));
    it("publish-brand DENIED", () => expect(can("a@x.com", { kind: "publish-brand" }, r, TIERS).allow).toBe(false));
  });

  describe("user — content production only", () => {
    it("content command (voice)", () => expect(can("u@x.com", { kind: "command", value: "voice" }, r, TIERS).allow).toBe(true));
    it("data command DENIED (deepask)", () => expect(can("u@x.com", { kind: "command", value: "deepask" }, r, TIERS).allow).toBe(false));
    it("mcp-write DENIED", () => expect(can("u@x.com", { kind: "mcp-write", value: "o" }, r, TIERS).allow).toBe(false));
    it("db-write DENIED", () => expect(can("u@x.com", { kind: "db-write", value: "ops" }, r, TIERS).allow).toBe(false));
    it("publish-store ALLOWED (with HITL)", () => expect(can("u@x.com", { kind: "publish-store" }, r, TIERS).allow).toBe(true));
    it("publish-brand DENIED", () => expect(can("u@x.com", { kind: "publish-brand" }, r, TIERS).allow).toBe(false));
    it("push-branch allowed, merge denied", () => { expect(can("u@x.com", { kind: "git-push-branch" }, r, TIERS).allow).toBe(true); expect(can("u@x.com", { kind: "git-merge" }, r, TIERS).allow).toBe(false); });
  });

  it("email match is case-insensitive end-to-end", () => expect(can("U@X.COM", { kind: "command", value: "write" }, r, TIERS).allow).toBe(true));
});

// Contract test against the REAL tier map — the shipped owner/admin/user model.
describe("contract: real knowledge/operator-tiers.yaml", () => {
  const ROOT = resolve(__dirname, "..", "..");
  const realTiers: any = yaml.load(readFileSync(resolve(ROOT, "knowledge/operator-tiers.yaml"), "utf8"));
  const r = reg([
    { email: "o@x.com", tier: "owner", status: "active" },
    { email: "a@x.com", tier: "admin", status: "active" },
    { email: "u@x.com", tier: "user", status: "active" },
  ]);
  it("has all three tiers with inherits chain user←admin←owner", () => {
    expect(realTiers.tiers.user.inherits).toBeNull();
    expect(realTiers.tiers.admin.inherits).toBe("user");
    expect(realTiers.tiers.owner.inherits).toBe("admin");
  });
  it("owner may run /cla; admin + user may NOT", () => {
    expect(can("o@x.com", { kind: "command", value: "cla" }, r, realTiers).allow).toBe(true);
    expect(can("a@x.com", { kind: "command", value: "cla" }, r, realTiers).allow).toBe(false);
    expect(can("u@x.com", { kind: "command", value: "cla" }, r, realTiers).allow).toBe(false);
  });
  it("user may run /write; admin inherits it", () => {
    expect(can("u@x.com", { kind: "command", value: "write" }, r, realTiers).allow).toBe(true);
    expect(can("a@x.com", { kind: "command", value: "write" }, r, realTiers).allow).toBe(true);
  });
  it("only owner has user-management + git-merge + tier1", () => {
    for (const cap of [{ kind: "user-management" }, { kind: "git-merge" }, { kind: "git-tier1" }] as const) {
      expect(can("o@x.com", cap, r, realTiers).allow).toBe(true);
      expect(can("a@x.com", cap, r, realTiers).allow).toBe(false);
      expect(can("u@x.com", cap, r, realTiers).allow).toBe(false);
    }
  });
  it("the seeded founder is an active owner with full grants", () => {
    const realReg: any = yaml.load(readFileSync(resolve(ROOT, "governance/operators.yaml"), "utf8"));
    const founder = realReg.operators.find((o: any) => o.tier === "owner" && o.status === "active");
    expect(founder).toBeTruthy();
    expect(can(founder.email, { kind: "command", value: "evolve" }, realReg, realTiers).allow).toBe(true);
  });
});
