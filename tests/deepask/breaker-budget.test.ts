import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention; see resolver-v3 tests)
const {
  computeBreakerBudget,
  DEFAULT_HARD_CAP,
  DEFAULT_FOLLOW_UP_RESERVE,
  DEFAULT_MIN_VIABLE,
} = require("../../scripts/deepask/breaker-budget.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Function under test: computeBreakerBudget.
// Phase 1 analysis: 5 params (sessionFindsCount, subNeedCount, hardCap, followUpReserve,
//   minViable); branches = invalid-input(throw) | no_sub_needs | viable | capped | exhausted.
// remaining = max(0, hardCap - sessionFindsCount). The breaker boundary (resolver-find.ts
//   `count <= cap`) makes sessionFindsCount === hardCap the off-by-one to pin.
// Skipped categories (pragmatic exceptions, noted): contract (no in-repo upstream — orchestrator
//   is markdown), dependency-degradation/state-sequence (stateless pure fn, no I/O), security
//   (no user-input/string surface — all numeric), metamorphic (single consumer). Stateless,
//   no JSDoc-spec beyond this module, no prior bugs → no spec/regression blocks.

describe("computeBreakerBudget", () => {
  describe("happy path (viable, full decomposition fits)", () => {
    it("fresh session + standard depth (6 sub-needs) → viable, no degrade, reserves follow-up", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 0, subNeedCount: 6 });
      expect(r).toStrictEqual({
        viable: true,
        degrade: false,
        allowedSubNeeds: 6,
        reservedForFollowUp: 2,
        remaining: 20,
        reason: null,
      });
    });

    it("fresh session + deep depth (12 sub-needs) → fits (12+2=14 ≤ 20)", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 0, subNeedCount: 12 });
      expect(r.viable).toBe(true);
      expect(r.degrade).toBe(false);
      expect(r.allowedSubNeeds).toBe(12);
      expect(r.reason).toBeNull();
    });

    it("mid-session but still fits (10 used, 6 needed +2 reserve = 8 ≤ 10 remaining)", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 10, subNeedCount: 6 });
      expect(r.viable).toBe(true);
      expect(r.degrade).toBe(false);
      expect(r.allowedSubNeeds).toBe(6);
      expect(r.remaining).toBe(10);
    });
  });

  describe("branch: capped_to_budget (over budget but a minimal run still fits)", () => {
    it("14 used, 6 sub-needs → remaining 6, caps initial to 4 (6-2 reserve), degrade", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 14, subNeedCount: 6 });
      expect(r).toStrictEqual({
        viable: true,
        degrade: true,
        allowedSubNeeds: 4,
        reservedForFollowUp: 2,
        remaining: 6,
        reason: "capped_to_budget",
      });
    });

    it("followUpReserve=0 lets the initial decomposition use all remaining", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 18, subNeedCount: 6, followUpReserve: 0 });
      expect(r.reason).toBe("capped_to_budget");
      expect(r.allowedSubNeeds).toBe(2); // remaining 2 - 0 reserve
      expect(r.reservedForFollowUp).toBe(0);
    });
  });

  describe("branch: breaker_budget (exhausted — honest PARTIAL up front, never fake no_coverage)", () => {
    it("near cap (19 used) → remaining 1 < reserve+minViable → not viable", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 19, subNeedCount: 6 });
      expect(r).toStrictEqual({
        viable: false,
        degrade: true,
        allowedSubNeeds: 0,
        reservedForFollowUp: 0,
        remaining: 1,
        reason: "breaker_budget",
      });
    });

    it("exactly at cap (20 used) → remaining 0 → not viable", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 20, subNeedCount: 6 });
      expect(r.viable).toBe(false);
      expect(r.reason).toBe("breaker_budget");
      expect(r.remaining).toBe(0);
    });

    it("defensively over cap (25 used > 20) → remaining clamps to 0, not viable", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 25, subNeedCount: 6 });
      expect(r.remaining).toBe(0);
      expect(r.viable).toBe(false);
      expect(r.reason).toBe("breaker_budget");
    });
  });

  describe("branch: no_sub_needs (degenerate)", () => {
    it("subNeedCount 0 → viable trivially, nothing resolved, no degrade", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 5, subNeedCount: 0 });
      expect(r).toStrictEqual({
        viable: true,
        degrade: false,
        allowedSubNeeds: 0,
        reservedForFollowUp: 0,
        remaining: 15,
        reason: "no_sub_needs",
      });
    });

    it("subNeedCount 0 even at full cap is still viable (no finds needed)", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 20, subNeedCount: 0 });
      expect(r.viable).toBe(true);
      expect(r.reason).toBe("no_sub_needs");
      expect(r.remaining).toBe(0);
    });
  });

  describe("business-logic edge cases (cap boundary off-by-one + threshold interplay)", () => {
    it("sessionFindsCount = cap-1 (one find left) with reserve 2 → exhausted", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 19, subNeedCount: 1 });
      expect(r.remaining).toBe(1);
      expect(r.reason).toBe("breaker_budget"); // 1 - 2 reserve < 1 minViable
    });

    it("the exact pivot: remaining == needed → still viable (≤, not <)", () => {
      // sessionFindsCount=12 → remaining 8; subNeedCount=6 +2 reserve = 8; 8<=8 → viable
      const r = computeBreakerBudget({ sessionFindsCount: 12, subNeedCount: 6 });
      expect(r.viable).toBe(true);
      expect(r.degrade).toBe(false);
      expect(r.allowedSubNeeds).toBe(6);
    });

    it("one find tighter than the pivot → caps by exactly one", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 13, subNeedCount: 6 });
      expect(r.reason).toBe("capped_to_budget");
      expect(r.allowedSubNeeds).toBe(5); // remaining 7 - 2 reserve
    });

    it("higher minViable forces exhaustion where minViable=1 would cap", () => {
      const capped = computeBreakerBudget({ sessionFindsCount: 16, subNeedCount: 6, minViable: 1 });
      expect(capped.reason).toBe("capped_to_budget");
      expect(capped.allowedSubNeeds).toBe(2); // remaining 4 - 2 reserve
      const exhausted = computeBreakerBudget({ sessionFindsCount: 16, subNeedCount: 6, minViable: 3 });
      expect(exhausted.reason).toBe("breaker_budget"); // 2 < minViable 3
      expect(exhausted.viable).toBe(false);
    });

    it("custom hardCap is honored", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 0, subNeedCount: 6, hardCap: 5 });
      expect(r.remaining).toBe(5);
      expect(r.reason).toBe("capped_to_budget"); // 6+2 > 5 → cap to 3
      expect(r.allowedSubNeeds).toBe(3);
    });

    it("large inputs do not overflow or misbehave", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 0, subNeedCount: 1000, hardCap: 1000000 });
      expect(r.viable).toBe(true);
      expect(r.allowedSubNeeds).toBe(1000);
    });
  });

  describe("defaults", () => {
    it("exports the documented default constants", () => {
      expect(DEFAULT_HARD_CAP).toBe(20);
      expect(DEFAULT_FOLLOW_UP_RESERVE).toBe(2);
      expect(DEFAULT_MIN_VIABLE).toBe(1);
    });

    it("applies defaults when optional params omitted", () => {
      const r = computeBreakerBudget({ sessionFindsCount: 0, subNeedCount: 1 });
      expect(r.reservedForFollowUp).toBe(DEFAULT_FOLLOW_UP_RESERVE);
      expect(r.remaining).toBe(DEFAULT_HARD_CAP);
    });
  });

  describe("input validation (contract violations throw TypeError with message)", () => {
    it("missing args object throws", () => {
      expect(() => computeBreakerBudget()).toThrow(TypeError);
      expect(() => computeBreakerBudget()).toThrow(/args must be an object/);
    });

    it("null args throws", () => {
      expect(() => computeBreakerBudget(null)).toThrow(/args must be an object/);
    });

    it("NaN sessionFindsCount throws (finite check)", () => {
      expect(() => computeBreakerBudget({ sessionFindsCount: NaN, subNeedCount: 6 })).toThrow(
        /sessionFindsCount must be a finite number/,
      );
    });

    it("Infinity throws (finite check)", () => {
      expect(() => computeBreakerBudget({ sessionFindsCount: Infinity, subNeedCount: 6 })).toThrow(
        /finite number/,
      );
    });

    it("negative sessionFindsCount throws", () => {
      expect(() => computeBreakerBudget({ sessionFindsCount: -1, subNeedCount: 6 })).toThrow(
        /sessionFindsCount must be >= 0/,
      );
    });

    it("non-integer (float) subNeedCount throws", () => {
      expect(() => computeBreakerBudget({ sessionFindsCount: 0, subNeedCount: 2.5 })).toThrow(
        /subNeedCount must be an integer/,
      );
    });

    it("string sessionFindsCount throws (type check, no coercion)", () => {
      expect(() => computeBreakerBudget({ sessionFindsCount: "5", subNeedCount: 6 })).toThrow(
        /finite number/,
      );
    });

    it("missing subNeedCount throws", () => {
      expect(() => computeBreakerBudget({ sessionFindsCount: 0 })).toThrow(
        /subNeedCount must be a finite number/,
      );
    });

    it("invalid optional param (negative followUpReserve) throws", () => {
      expect(() =>
        computeBreakerBudget({ sessionFindsCount: 0, subNeedCount: 6, followUpReserve: -2 }),
      ).toThrow(/followUpReserve must be >= 0/);
    });
  });
});
