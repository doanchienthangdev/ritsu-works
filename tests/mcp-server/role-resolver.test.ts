import { describe, it, expect } from "vitest";
import {
  resolveRole,
  canReadSchema,
  canWriteTable,
  UnknownRoleError,
} from "../../mcp-server/src/governance/role-resolver.ts";

describe("resolveRole", () => {
  describe("happy path", () => {
    it("returns full context for founder", () => {
      const ctx = resolveRole("founder", "test-sess");
      expect(ctx.role).toBe("founder");
      expect(ctx.hitlMaxTier).toBe("D-MAX");
      expect(ctx.tier2SchemasWrite).toContain("ops.*");
    });

    it("returns scoped context for gps", () => {
      const ctx = resolveRole("gps", "test-sess");
      expect(ctx.hitlMaxTier).toBe("C");
      expect(ctx.tier2SchemasRead).toContain("ops.*");
      expect(ctx.tier2SchemasWrite).toContain("ops.tasks");
      expect(ctx.tier2SchemasWrite).not.toContain("ops.*"); // gps cannot write to all of ops
    });

    it("returns A-tier context for content-drafter", () => {
      const ctx = resolveRole("content-drafter", "x");
      expect(ctx.hitlMaxTier).toBe("A");
    });

    it("includes mcp_calls in write scope for every role that calls the shim", () => {
      // The shim itself logs to ops.mcp_calls; every caller role needs INSERT
      const ctx = resolveRole("gps", "x");
      expect(ctx.tier2SchemasWrite).toContain("ops.mcp_calls");
    });
  });

  describe("error handling", () => {
    it("throws UnknownRoleError for a role not in the registry", () => {
      // @ts-expect-error — intentionally bypass type check
      expect(() => resolveRole("nonexistent-role", "x")).toThrowError(UnknownRoleError);
    });
  });

  describe("session id propagation", () => {
    it("preserves the session id in the returned context", () => {
      const ctx = resolveRole("gps", "my-session-123");
      expect(ctx.sessionId).toBe("my-session-123");
    });
  });
});

describe("canReadSchema", () => {
  it("returns true when schema is in scope as wildcard", () => {
    const ctx = resolveRole("founder", "x");
    expect(canReadSchema(ctx, "ops")).toBe(true);
    expect(canReadSchema(ctx, "metrics")).toBe(true);
    expect(canReadSchema(ctx, "public")).toBe(true);
  });

  it("returns true when schema has any qualified table in scope", () => {
    const ctx = resolveRole("alert-router", "x");
    // alert-router has 'ops.alerts' + 'ops.kpi_snapshots' — both are 'ops' schema
    expect(canReadSchema(ctx, "ops")).toBe(true);
  });

  it("returns false when schema is unrelated", () => {
    const ctx = resolveRole("content-drafter", "x");
    // content-drafter has only metrics.product_dau_snapshot, ops.agent_runs, ops.run_summaries
    expect(canReadSchema(ctx, "public")).toBe(false);
  });
});

describe("canWriteTable", () => {
  describe("happy path", () => {
    it("returns true for an exact table match", () => {
      const ctx = resolveRole("gps", "x");
      expect(canWriteTable(ctx, "ops.tasks")).toBe(true);
    });

    it("returns true for a wildcard-schema match", () => {
      const ctx = resolveRole("founder", "x");
      expect(canWriteTable(ctx, "ops.anything")).toBe(true);
      expect(canWriteTable(ctx, "ops.future_table_xyz")).toBe(true);
    });

    it("returns true for etl-runner writing to metrics.*", () => {
      const ctx = resolveRole("etl-runner", "x");
      expect(canWriteTable(ctx, "metrics.product_dau_snapshot")).toBe(true);
      expect(canWriteTable(ctx, "metrics.anything")).toBe(true);
    });
  });

  describe("denials", () => {
    it("returns false for a table not in scope", () => {
      const ctx = resolveRole("gps", "x");
      expect(canWriteTable(ctx, "public.customers")).toBe(false);
    });

    it("returns false for cross-schema write that role lacks", () => {
      const ctx = resolveRole("support-agent", "x");
      // support-agent can write to ops.tasks but NOT metrics
      expect(canWriteTable(ctx, "metrics.product_dau_snapshot")).toBe(false);
    });
  });

  describe("input boundaries", () => {
    it("returns false for malformed table name (no dot)", () => {
      const ctx = resolveRole("founder", "x");
      expect(canWriteTable(ctx, "tasks")).toBe(false);
    });

    it("returns false for empty string", () => {
      const ctx = resolveRole("founder", "x");
      expect(canWriteTable(ctx, "")).toBe(false);
    });
  });
});
