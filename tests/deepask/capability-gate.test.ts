import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention; see resolver-v3 tests)
const { classifyCapabilityLeg, VALID_TIERS, VALID_SIDE_EFFECTS, RECURSION_DENYLIST } = require("../../scripts/deepask/capability-gate.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Function under test: classifyCapabilityLeg.
// Phase 1 analysis: 1 param (obj w/ hitl_tier, side_effect); branches = invalid→throw |
//   D-MAX→refuse | (A & none)→auto_run | A→surface(defensive) | else→surface.
// Phase 2 edge cases: full tier × side_effect matrix; A-with-side-effect; invalid enum;
//   missing field; null/array/non-object arg.
// Skipped (pragmatic): contract (consumer = execute skill, markdown), dependency/state
//   (stateless pure fn), security (closed enum inputs, no string-content surface),
//   metamorphic (single consumer). No prior bugs → no regression block.

describe("classifyCapabilityLeg", () => {
  describe("auto_run (Tier-A, no side effect ONLY)", () => {
    it("{A, none} → auto_run", () => {
      expect(classifyCapabilityLeg({ hitl_tier: "A", side_effect: "none" })).toStrictEqual({
        action: "auto_run",
        reason: "Tier-A read/compute with no side effect",
      });
    });
  });

  describe("refuse (D-MAX is never actionable)", () => {
    it.each(VALID_SIDE_EFFECTS)("{D-MAX, %s} → refuse regardless of side_effect", (se: string) => {
      const r = classifyCapabilityLeg({ hitl_tier: "D-MAX", side_effect: se });
      expect(r.action).toBe("refuse");
      expect(r.reason).toMatch(/beyond deepask/);
    });
  });

  describe("surface (Tier-B+ side-effecting → HITL suggestion, never auto-run)", () => {
    it.each(["B", "C", "D-Std"])("{%s, none} → surface", (tier: string) => {
      const r = classifyCapabilityLeg({ hitl_tier: tier, side_effect: "none" });
      expect(r.action).toBe("surface");
      expect(r.reason).toMatch(new RegExp(`Tier-${tier.replace("-", "\\-")}`));
    });

    it.each(["write", "send", "money", "publish"])("{B, %s} (side-effecting) → surface", (se: string) => {
      expect(classifyCapabilityLeg({ hitl_tier: "B", side_effect: se }).action).toBe("surface");
    });

    it("{C, publish} → surface", () => {
      expect(classifyCapabilityLeg({ hitl_tier: "C", side_effect: "publish" }).action).toBe("surface");
    });

    it("{D-Std, money} → surface (NOT refuse — only D-MAX refuses)", () => {
      expect(classifyCapabilityLeg({ hitl_tier: "D-Std", side_effect: "money" }).action).toBe("surface");
    });
  });

  describe("defensive: Tier-A with a declared side effect must NOT auto-run", () => {
    it.each(["write", "send", "money", "publish"])("{A, %s} → surface (mistagged Tier-A is not trusted to auto-run)", (se: string) => {
      const r = classifyCapabilityLeg({ hitl_tier: "A", side_effect: se });
      expect(r.action).toBe("surface");
      expect(r.reason).toMatch(/Tier-A but declares side_effect/);
    });
  });

  describe("full tier × side_effect matrix sanity (25 combos, exactly one auto_run)", () => {
    it("only {A,none} auto-runs; D-MAX always refuses; everything else surfaces", () => {
      const results: Record<string, number> = { auto_run: 0, surface: 0, refuse: 0 };
      for (const tier of VALID_TIERS) {
        for (const se of VALID_SIDE_EFFECTS) {
          results[classifyCapabilityLeg({ hitl_tier: tier, side_effect: se }).action] += 1;
        }
      }
      expect(results.auto_run).toBe(1);   // exactly {A, none}
      expect(results.refuse).toBe(5);     // all 5 D-MAX rows
      expect(results.surface).toBe(19);   // remaining 25 - 1 - 5
    });
  });

  describe("input validation (throws TypeError)", () => {
    it("invalid hitl_tier throws", () => {
      expect(() => classifyCapabilityLeg({ hitl_tier: "X", side_effect: "none" })).toThrow(/hitl_tier must be one of/);
      expect(() => classifyCapabilityLeg({ hitl_tier: "", side_effect: "none" })).toThrow(/hitl_tier must be one of/);
      expect(() => classifyCapabilityLeg({ hitl_tier: 1 as any, side_effect: "none" })).toThrow(TypeError);
    });
    it("invalid side_effect throws", () => {
      expect(() => classifyCapabilityLeg({ hitl_tier: "A", side_effect: "delete" })).toThrow(/side_effect must be one of/);
    });
    it("missing field throws", () => {
      expect(() => classifyCapabilityLeg({ hitl_tier: "A" })).toThrow(/side_effect must be one of/);
      expect(() => classifyCapabilityLeg({ side_effect: "none" })).toThrow(/hitl_tier must be one of/);
      expect(() => classifyCapabilityLeg({})).toThrow(/hitl_tier must be one of/);
    });
    it("non-object arg throws", () => {
      expect(() => classifyCapabilityLeg(null)).toThrow(/must be an object/);
      expect(() => classifyCapabilityLeg([])).toThrow(/array/);
      expect(() => classifyCapabilityLeg("A")).toThrow(/must be an object/);
      expect(() => classifyCapabilityLeg(undefined)).toThrow(/must be an object/);
    });
  });

  // v1.7 — anti-recursion guard (thinking-toolkit ↔ deepask composition contract):
  // the /think mckinsey ENGINE composes deepask as a leaf data tool, so deepask must
  // refuse to re-run that engine (else mckinsey → deepask → mckinsey recurses).
  describe("anti-recursion guard (recipient_id denylist, v1.7)", () => {
    it("refuses the mckinsey engine even at {A, none} (which would otherwise auto_run)", () => {
      const r = classifyCapabilityLeg({ recipient_id: "thinking-toolkit/mckinsey-workflow", hitl_tier: "A", side_effect: "none" });
      expect(r.action).toBe("refuse");
      expect(r.reason).toMatch(/anti-recursion/);
    });
    it("the guard is ABSOLUTE — refuses across the full tier × side_effect matrix", () => {
      for (const t of VALID_TIERS) {
        for (const se of VALID_SIDE_EFFECTS) {
          expect(classifyCapabilityLeg({ recipient_id: "thinking-toolkit/mckinsey-workflow", hitl_tier: t, side_effect: se }).action).toBe("refuse");
        }
      }
    });
    it("a NON-denylisted recipient_id is unaffected — {A, none} still auto_run", () => {
      expect(classifyCapabilityLeg({ recipient_id: "thinking-toolkit/pyramid-principle-output", hitl_tier: "A", side_effect: "none" }).action).toBe("auto_run");
    });
    it("ABSENT recipient_id → unchanged legacy behavior ({A, none} → auto_run)", () => {
      expect(classifyCapabilityLeg({ hitl_tier: "A", side_effect: "none" }).action).toBe("auto_run");
    });
    it("a non-string recipient_id is ignored (falls through to tier logic)", () => {
      expect(classifyCapabilityLeg({ recipient_id: 123 as any, hitl_tier: "A", side_effect: "none" }).action).toBe("auto_run");
    });
    it("every entry in RECURSION_DENYLIST is refused", () => {
      for (const id of RECURSION_DENYLIST) {
        expect(classifyCapabilityLeg({ recipient_id: id, hitl_tier: "A", side_effect: "none" }).action).toBe("refuse");
      }
    });
  });

  describe("exported constants", () => {
    it("enumerate the governance vocab", () => {
      expect(VALID_TIERS).toStrictEqual(["A", "B", "C", "D-Std", "D-MAX"]);
      expect(VALID_SIDE_EFFECTS).toStrictEqual(["none", "write", "send", "money", "publish"]);
      expect(RECURSION_DENYLIST).toContain("thinking-toolkit/mckinsey-workflow"); // v1.7
    });
  });
});
