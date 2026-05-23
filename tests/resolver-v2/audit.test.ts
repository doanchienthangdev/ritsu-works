// Resolver v2 — audit module test suite.
// Phase 1 analysis:
//   - buildRecord: 2 params (queryResult, opts), normalizes shape for DB insert
//   - writeRecord: async, takes insertFn dependency injection
//   - validateRecord: pre-flight check
//   - clamp: utility for confidence

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const audit = cjsRequire(join(REPO, "scripts/resolver-v2/audit.cjs"));
const E = cjsRequire(join(REPO, "scripts/resolver-v2/errors.cjs"));

describe("audit.cjs", () => {
  describe("clamp utility", () => {
    it("clamps within bounds", () => {
      expect(audit.clamp(0.5, 0, 1)).toBe(0.5);
      expect(audit.clamp(0, 0, 1)).toBe(0);
      expect(audit.clamp(1, 0, 1)).toBe(1);
    });

    it("clamps above max", () => {
      expect(audit.clamp(1.5, 0, 1)).toBe(1);
      expect(audit.clamp(Infinity, 0, 1)).toBe(1);
    });

    it("clamps below min", () => {
      expect(audit.clamp(-0.5, 0, 1)).toBe(0);
      expect(audit.clamp(-Infinity, 0, 1)).toBe(0);
    });

    it("returns min on NaN", () => {
      expect(audit.clamp(NaN, 0, 1)).toBe(0);
    });

    it("returns min on non-number", () => {
      expect(audit.clamp("0.5", 0, 1)).toBe(0);
      expect(audit.clamp(null, 0, 1)).toBe(0);
      expect(audit.clamp(undefined, 0, 1)).toBe(0);
    });
  });

  describe("buildRecord happy path", () => {
    const sampleQuery = {
      trigger: "evolve a skill",
      trigger_normalized: "evolve a skill",
      caller_role: "founder",
      decision: "dispatch_silently",
      matched: { id: "skill/evolve", confidence: 0.95 },
      alternatives: [
        { id: "skill/x", confidence: 0.8 },
        { id: "skill/y", confidence: 0.7 },
      ],
      latency_ms: 5,
      perf: { load_ms: 2, candidate_count: 3 },
    };

    it("builds minimal valid record", () => {
      const r = audit.buildRecord(sampleQuery);
      expect(r.trigger).toBe("evolve a skill");
      expect(r.matched_route_id).toBe("skill/evolve");
      expect(r.confidence).toBe(0.95);
      expect(r.decision).toBe("dispatch_silently");
      expect(r.mode).toBe("B"); // default
      expect(r.semantic_used).toBe(false);
    });

    it("respects opts.mode override", () => {
      const r = audit.buildRecord(sampleQuery, { mode: "A" });
      expect(r.mode).toBe("A");
    });

    it("accepts mode C", () => {
      const r = audit.buildRecord(sampleQuery, { mode: "C" });
      expect(r.mode).toBe("C");
    });

    it("throws on invalid mode", () => {
      expect(() => audit.buildRecord(sampleQuery, { mode: "Z" }))
        .toThrow(E.AuditWriteFailed);
    });

    it("includes llm_reasoning when provided", () => {
      const r = audit.buildRecord(sampleQuery, { llm_reasoning: "because evolve matches" });
      expect(r.llm_reasoning).toBe("because evolve matches");
    });

    it("truncates llm_reasoning over 2000 chars", () => {
      const huge = "x".repeat(3000);
      const r = audit.buildRecord(sampleQuery, { llm_reasoning: huge });
      expect(r.llm_reasoning?.length).toBeLessThan(2100);
      expect(r.llm_reasoning).toContain("[truncated]");
    });

    it("includes composition_supporting array", () => {
      const r = audit.buildRecord(sampleQuery, {
        composition_supporting: ["persona/cto", "mcp/supabase-ops__query"],
      });
      expect(r.composition_supporting).toEqual(["persona/cto", "mcp/supabase-ops__query"]);
    });

    it("limits composition_supporting to 20 entries", () => {
      const huge = Array(50).fill(0).map((_, i) => `skill/x${i}`);
      const r = audit.buildRecord(sampleQuery, { composition_supporting: huge });
      expect(r.composition_supporting?.length).toBe(20);
    });

    it("filters non-string composition entries", () => {
      const r = audit.buildRecord(sampleQuery, {
        composition_supporting: ["skill/a", null, 123, "skill/b"] as any,
      });
      expect(r.composition_supporting).toEqual(["skill/a", "skill/b"]);
    });

    it("captures caller_role from queryResult.caller_role", () => {
      const r = audit.buildRecord({ ...sampleQuery, caller_role: "gps" });
      expect(r.caller_role).toBe("gps");
    });

    it("falls back to MCP_CALLER_ROLE env if caller_role absent", () => {
      const original = process.env.MCP_CALLER_ROLE;
      process.env.MCP_CALLER_ROLE = "test-role";
      const r = audit.buildRecord({ ...sampleQuery, caller_role: null });
      expect(r.caller_role).toBe("test-role");
      if (original) process.env.MCP_CALLER_ROLE = original;
      else delete process.env.MCP_CALLER_ROLE;
    });
  });

  describe("buildRecord edge cases", () => {
    it("throws when queryResult is null", () => {
      expect(() => audit.buildRecord(null)).toThrow(E.AuditWriteFailed);
    });

    it("throws when queryResult is undefined", () => {
      expect(() => audit.buildRecord(undefined)).toThrow(E.AuditWriteFailed);
    });

    it("throws when queryResult is non-object", () => {
      expect(() => audit.buildRecord("x")).toThrow(E.AuditWriteFailed);
      expect(() => audit.buildRecord(123)).toThrow(E.AuditWriteFailed);
    });

    it("handles missing matched (no_match scenario)", () => {
      const r = audit.buildRecord({
        trigger: "foo", trigger_normalized: "foo",
        decision: "no_match", matched: null,
        alternatives: [], latency_ms: 1,
      });
      expect(r.matched_route_id).toBeNull();
      expect(r.confidence).toBeNull();
      expect(r.alternatives).toEqual([]);
    });

    it("handles matched with recipient nested (Mode C shape)", () => {
      const r = audit.buildRecord({
        trigger: "x", trigger_normalized: "x",
        decision: "dispatch_silently",
        matched: { recipient: { id: "skill/x" }, confidence: 0.9 },
        alternatives: [], latency_ms: 1,
      });
      expect(r.matched_route_id).toBe("skill/x");
    });

    it("handles matched with route nested (v1 backward-compat shape)", () => {
      const r = audit.buildRecord({
        trigger: "x", trigger_normalized: "x",
        decision: "dispatch_silently",
        matched: { route: { id: "skill/x" }, confidence: 0.9 },
        alternatives: [], latency_ms: 1,
      });
      expect(r.matched_route_id).toBe("skill/x");
    });

    it("clamps confidence above 1", () => {
      const r = audit.buildRecord({
        trigger: "x", trigger_normalized: "x",
        matched: { id: "skill/x", confidence: 1.5 },
        alternatives: [], latency_ms: 1,
      });
      expect(r.confidence).toBe(1);
    });

    it("clamps confidence below 0", () => {
      const r = audit.buildRecord({
        trigger: "x", trigger_normalized: "x",
        matched: { id: "skill/x", confidence: -0.3 },
        alternatives: [], latency_ms: 1,
      });
      expect(r.confidence).toBe(0);
    });

    it("truncates trigger over 500 chars", () => {
      const huge = "x".repeat(1000);
      const r = audit.buildRecord({
        trigger: huge, trigger_normalized: "x",
        matched: null, alternatives: [], latency_ms: 1,
      });
      expect(r.trigger.length).toBeLessThanOrEqual(500);
    });

    it("normalizes alternatives shape", () => {
      const r = audit.buildRecord({
        trigger: "x", trigger_normalized: "x",
        matched: null,
        alternatives: [
          { id: "skill/a", confidence: 0.7 },
          { route: { id: "skill/b" }, confidence: 0.6 },
          { recipient: { id: "skill/c" }, confidence: 0.5, matchedToken: "x" },
        ],
        latency_ms: 1,
      });
      expect(r.alternatives.length).toBe(3);
      expect(r.alternatives[0].id).toBe("skill/a");
      expect(r.alternatives[1].id).toBe("skill/b");
      expect(r.alternatives[2].id).toBe("skill/c");
      expect(r.alternatives[2].matched_token).toBe("x");
    });

    it("filters alternatives missing id", () => {
      const r = audit.buildRecord({
        trigger: "x", trigger_normalized: "x",
        matched: null,
        alternatives: [
          { id: "skill/a", confidence: 0.7 },
          { confidence: 0.5 }, // no id
          {},
        ],
        latency_ms: 1,
      });
      expect(r.alternatives.length).toBe(1);
    });

    it("throws on invalid decision value", () => {
      expect(() => audit.buildRecord({
        trigger: "x", trigger_normalized: "x",
        decision: "made_up_decision",
        matched: null, alternatives: [], latency_ms: 1,
      })).toThrow(E.AuditWriteFailed);
    });

    it("handles missing perf gracefully", () => {
      const r = audit.buildRecord({
        trigger: "x", trigger_normalized: "x",
        decision: "no_match", matched: null,
        alternatives: [], latency_ms: 1,
      });
      expect(r.metadata.perf).toEqual({});
    });
  });

  describe("writeRecord", () => {
    it("requires insertFn function", async () => {
      await expect(audit.writeRecord({}, null)).rejects.toThrow(E.AuditWriteFailed);
    });

    it("calls insertFn with correct table + row + returning", async () => {
      const calls: any[] = [];
      const insertFn = async (table: string, rows: any[], opts: any) => {
        calls.push({ table, rows, opts });
        return { inserted_count: 1, returned_rows: [{ run_id: "uuid-123", ts: "2026-01-01" }] };
      };
      const result = await audit.writeRecord({ mode: "A", trigger: "x" }, insertFn);
      expect(calls[0].table).toBe("ops.resolver_decisions");
      expect(calls[0].rows[0].trigger).toBe("x");
      expect(calls[0].opts.returning).toEqual(["run_id", "ts"]);
      expect(result?.run_id).toBe("uuid-123");
    });

    it("returns null on insertFn failure (best-effort)", async () => {
      const failingInsert = async () => { throw new Error("db down"); };
      const result = await audit.writeRecord({ mode: "A" }, failingInsert);
      expect(result).toBeNull();
    });

    it("returns null when insertFn returns empty", async () => {
      const emptyInsert = async () => ({ inserted_count: 0, returned_rows: [] });
      const result = await audit.writeRecord({ mode: "A" }, emptyInsert);
      expect(result).toBeNull();
    });
  });

  describe("validateRecord", () => {
    it("returns null on valid record", () => {
      const valid = { trigger: "x", mode: "A", confidence: 0.5, decision: "no_match" };
      expect(audit.validateRecord(valid)).toBeNull();
    });

    it("flags missing trigger", () => {
      expect(audit.validateRecord({ mode: "A" })).toContain("trigger");
    });

    it("flags invalid mode", () => {
      expect(audit.validateRecord({ trigger: "x", mode: "Z" })).toContain("mode");
    });

    it("flags invalid decision", () => {
      expect(audit.validateRecord({ trigger: "x", mode: "A", decision: "foo" })).toContain("decision");
    });

    it("flags confidence out of bounds", () => {
      expect(audit.validateRecord({ trigger: "x", mode: "A", confidence: 1.5 })).toContain("confidence");
    });

    it("accepts null confidence", () => {
      expect(audit.validateRecord({ trigger: "x", mode: "A", confidence: null })).toBeNull();
    });
  });

  describe("buildBatch", () => {
    it("processes array of query results", () => {
      const results = [
        { trigger: "a", matched: null, alternatives: [], latency_ms: 1 },
        { trigger: "b", matched: null, alternatives: [], latency_ms: 1 },
      ];
      const batch = audit.buildBatch(results);
      expect(batch.length).toBe(2);
      expect(batch[0].trigger).toBe("a");
      expect(batch[1].trigger).toBe("b");
    });
  });

  describe("constants", () => {
    it("exposes max lengths", () => {
      expect(audit.MAX_TRIGGER_AUDIT_LEN).toBe(500);
      expect(audit.MAX_REASONING_LEN).toBe(2000);
      expect(audit.MAX_SUPPORTING_COUNT).toBe(20);
    });
  });
});
