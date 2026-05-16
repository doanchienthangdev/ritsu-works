import { describe, it, expect, beforeEach } from "vitest";
import {
  enforceTier,
  findTool,
  resetRegistry,
  TierExceededError,
  ToolNotInRoleScopeError,
  UnknownToolError,
} from "../../mcp-server/src/governance/hitl-tier-check.ts";
import { resolveRole } from "../../mcp-server/src/governance/role-resolver.ts";

// Build a synthetic registry inline so these tests don't depend on the
// committed knowledge/mcp-tools.yaml state at test time.
function fakeRegistry() {
  return {
    version: "test",
    tools: [
      {
        id: "query",
        server: "supabase-ops",
        description: "SELECT",
        tier_default: "A" as const,
        role_scope: ["gps", "founder", "content-drafter"],
      },
      {
        id: "insert",
        server: "supabase-ops",
        description: "INSERT",
        tier_default: "B" as const,
        tier_per_role: { gps: "A" as const, "etl-runner": "A" as const },
        role_scope: ["gps", "founder", "etl-runner", "growth-orchestrator", "code-reviewer"],
      },
      {
        id: "dangerous",
        server: "supabase-ops",
        description: "hypothetical D-MAX tool",
        tier_default: "D-MAX" as const,
        role_scope: ["founder"],
      },
      {
        id: "other-server-tool",
        server: "github", // not supabase-ops — shim must ignore
        description: "from another server",
        tier_default: "A" as const,
      },
    ],
  };
}

beforeEach(() => resetRegistry());

describe("findTool", () => {
  it("returns the tool when registered under supabase-ops", () => {
    const t = findTool(fakeRegistry(), "query");
    expect(t?.id).toBe("query");
  });

  it("returns null for a tool registered under a different server", () => {
    const t = findTool(fakeRegistry(), "other-server-tool");
    expect(t).toBeNull();
  });

  it("returns null for an unregistered tool", () => {
    const t = findTool(fakeRegistry(), "does-not-exist");
    expect(t).toBeNull();
  });
});

describe("enforceTier", () => {
  describe("happy path", () => {
    it("passes when tool tier ≤ caller max", () => {
      const ctx = resolveRole("gps", "x");
      const { requiredTier } = enforceTier(fakeRegistry(), "query", ctx);
      expect(requiredTier).toBe("A");
    });

    it("uses tier_per_role override when present", () => {
      const ctx = resolveRole("gps", "x");
      // insert default is B, but gps gets A override
      const { requiredTier } = enforceTier(fakeRegistry(), "insert", ctx);
      expect(requiredTier).toBe("A");
    });

    it("uses tier_default when no per-role override", () => {
      const ctx = resolveRole("growth-orchestrator", "x");
      const { requiredTier } = enforceTier(fakeRegistry(), "insert", ctx);
      expect(requiredTier).toBe("B"); // growth-orchestrator hitlMax=C, B is fine
    });

    it("D-MAX tool is allowed for founder", () => {
      const ctx = resolveRole("founder", "x");
      const { requiredTier } = enforceTier(fakeRegistry(), "dangerous", ctx);
      expect(requiredTier).toBe("D-MAX");
    });
  });

  describe("denials", () => {
    it("throws TierExceededError when tool tier > caller max", () => {
      const ctx = resolveRole("gps", "x"); // max=C
      // dangerous is D-MAX but gps isn't in role_scope so we hit ToolNotInRoleScope first.
      // Use a role that IS in scope but has lower max — content-drafter (max=A)
      // ...except content-drafter isn't in dangerous's scope either. So patch the registry:
      const reg = fakeRegistry();
      reg.tools[2]!.role_scope = ["content-drafter", "founder"];
      const ctx2 = resolveRole("content-drafter", "x");
      expect(() => enforceTier(reg, "dangerous", ctx2)).toThrowError(TierExceededError);
    });

    it("error message mentions tool, required tier, role, and caller max", () => {
      const reg = fakeRegistry();
      reg.tools[2]!.role_scope = ["content-drafter"];
      const ctx = resolveRole("content-drafter", "x");
      try {
        enforceTier(reg, "dangerous", ctx);
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TierExceededError);
        const msg = (err as Error).message;
        expect(msg).toContain("dangerous");
        expect(msg).toContain("D-MAX");
        expect(msg).toContain("content-drafter");
        expect(msg).toContain("A"); // caller max
      }
    });

    it("throws ToolNotInRoleScopeError when role not in tool's role_scope", () => {
      const ctx = resolveRole("backoffice-clerk", "x"); // not in query's scope
      expect(() => enforceTier(fakeRegistry(), "query", ctx)).toThrowError(
        ToolNotInRoleScopeError,
      );
    });

    it("throws UnknownToolError for a tool not in the registry", () => {
      const ctx = resolveRole("gps", "x");
      expect(() => enforceTier(fakeRegistry(), "phantom-tool", ctx)).toThrowError(
        UnknownToolError,
      );
    });

    it("throws UnknownToolError for a tool registered under another server", () => {
      const ctx = resolveRole("gps", "x");
      expect(() =>
        enforceTier(fakeRegistry(), "other-server-tool", ctx),
      ).toThrowError(UnknownToolError);
    });
  });

  describe("invariants", () => {
    it("registry without role_scope on a tool grants implicit access (Phase 1 behavior)", () => {
      const reg = fakeRegistry();
      delete reg.tools[0]!.role_scope;
      const ctx = resolveRole("backoffice-clerk", "x");
      // No role_scope = unrestricted; only tier matters
      expect(() => enforceTier(reg, "query", ctx)).not.toThrow();
    });
  });
});
