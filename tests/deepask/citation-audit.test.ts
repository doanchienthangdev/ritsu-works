import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention; see resolver-v3 tests)
const { auditCitations, isClaimCited, isValidCitation } = require("../../scripts/deepask/citation-audit.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Function under test: auditCitations.
// Phase 1 analysis: 1 param (ir); branches = throw on non-object | iterate sections
//   (default []) | iterate claims (default []) | per-claim cited-iff citations is an
//   array with ≥1 non-empty-string. Returns {ok,totalClaims,citedClaims,uncited[],uncitedRate}.
// Phase 2 edge cases: missing/empty/non-array sections|claims|citations; empty/whitespace
//   citation strings; malformed claim (null/number/string); multiple sections; total=0 rate
//   division; input-validation throws.
// Skipped (pragmatic): contract (consumer = synthesize skill, markdown), dependency/state
//   (stateless pure fn, no I/O), security (pure structural counter; injection in claim text
//   doesn't affect counting — ref path-traversal is a separate execute/format concern),
//   metamorphic (single consumer). No prior bugs → no regression block.

describe("auditCitations", () => {
  describe("happy path (all claims cited)", () => {
    it("every claim with ≥1 citation → ok, zero uncited, rate 0", () => {
      const ir = {
        sections: [
          {
            heading: "On track?",
            claims: [
              { text: "MRR up 8% MoM", citations: ["metric/mrr"] },
              { text: "week-4 retention 22%", citations: ["metric/paid_retention_week_4", "view/ops-x"] },
            ],
          },
        ],
      };
      expect(auditCitations(ir)).toStrictEqual({
        ok: true,
        totalClaims: 2,
        citedClaims: 2,
        uncited: [],
        uncitedRate: 0,
      });
    });
  });

  describe("uncited detection (the citation-discipline guardrail)", () => {
    it("flags every flavor of missing citation; counts a claim cited iff it has one valid ref", () => {
      const ir = {
        sections: [
          {
            heading: "S1",
            claims: [
              { text: "cited", citations: ["page/x"] },        // cited
              { text: "empty-array", citations: [] },           // uncited
              { text: "no-key" },                               // uncited (missing)
              { text: "non-array", citations: "page/x" },       // uncited (string, not array)
              { text: "empty-string", citations: [""] },        // uncited
              { text: "whitespace", citations: ["   "] },       // uncited
              { text: "mixed", citations: ["", "page/ok"] },    // cited (one valid)
            ],
          },
        ],
      };
      const r = auditCitations(ir);
      expect(r.ok).toBe(false);
      expect(r.totalClaims).toBe(7);
      expect(r.citedClaims).toBe(2); // "cited" + "mixed"
      expect(r.uncited.map((u: any) => u.text)).toEqual([
        "empty-array",
        "no-key",
        "non-array",
        "empty-string",
        "whitespace",
      ]);
      expect(r.uncited[0]).toStrictEqual({ section: "S1", claimIndex: 1, text: "empty-array" });
      expect(r.uncitedRate).toBeCloseTo(5 / 7, 10);
    });

    it("malformed claims (null / number / string) count as uncited with placeholder text", () => {
      const ir = { sections: [{ heading: "S", claims: [null, 42, "x", { citations: ["ok"] }] }] };
      const r = auditCitations(ir);
      expect(r.totalClaims).toBe(4);
      expect(r.citedClaims).toBe(1);
      expect(r.uncited).toHaveLength(3);
      expect(r.uncited.every((u: any) => u.text === "<no claim text>")).toBe(true);
    });
  });

  describe("structure edge cases (no claims = vacuously ok)", () => {
    it("ir with no sections key → 0 claims, ok", () => {
      expect(auditCitations({})).toStrictEqual({
        ok: true, totalClaims: 0, citedClaims: 0, uncited: [], uncitedRate: 0,
      });
    });

    it("empty sections array → ok", () => {
      expect(auditCitations({ sections: [] }).ok).toBe(true);
    });

    it("non-array sections → treated as empty → ok", () => {
      expect(auditCitations({ sections: "nope" }).totalClaims).toBe(0);
    });

    it("section without claims / non-array claims → contributes 0 claims", () => {
      expect(auditCitations({ sections: [{ heading: "S" }] }).totalClaims).toBe(0);
      expect(auditCitations({ sections: [{ heading: "S", claims: "x" }] }).totalClaims).toBe(0);
    });

    it("section without heading → violations use '<untitled section>'", () => {
      const r = auditCitations({ sections: [{ claims: [{ text: "u", citations: [] }] }] });
      expect(r.uncited[0].section).toBe("<untitled section>");
    });

    it("aggregates across multiple sections with correct headings", () => {
      const ir = {
        sections: [
          { heading: "A", claims: [{ text: "a1", citations: ["x"] }] },
          { heading: "B", claims: [{ text: "b1", citations: [] }, { text: "b2", citations: ["y"] }] },
        ],
      };
      const r = auditCitations(ir);
      expect(r.totalClaims).toBe(3);
      expect(r.citedClaims).toBe(2);
      expect(r.uncited).toStrictEqual([{ section: "B", claimIndex: 0, text: "b1" }]);
    });
  });

  describe("business logic (uncitedRate math + thresholds)", () => {
    it("rate is uncited/total", () => {
      const ir = { sections: [{ heading: "S", claims: [
        { text: "1", citations: ["x"] }, { text: "2", citations: ["x"] },
        { text: "3", citations: ["x"] }, { text: "4", citations: [] },
      ] }] };
      expect(auditCitations(ir).uncitedRate).toBe(0.25);
    });

    it("rate is 0 when there are no claims (no division by zero)", () => {
      expect(auditCitations({ sections: [] }).uncitedRate).toBe(0);
    });

    it("a single uncited claim flips ok to false (the KPI guardrail is strict)", () => {
      const ir = { sections: [{ heading: "S", claims: [
        ...Array.from({ length: 99 }, (_, i) => ({ text: `c${i}`, citations: ["x"] })),
        { text: "the one bad claim", citations: [] },
      ] }] };
      const r = auditCitations(ir);
      expect(r.ok).toBe(false);
      expect(r.totalClaims).toBe(100);
      expect(r.uncited).toHaveLength(1);
    });
  });

  describe("input validation (throws TypeError)", () => {
    it("null throws", () => {
      expect(() => auditCitations(null)).toThrow(TypeError);
      expect(() => auditCitations(null)).toThrow(/non-null object/);
    });
    it("undefined throws", () => {
      expect(() => auditCitations(undefined)).toThrow(/non-null object/);
    });
    it("array throws (IR must be an object, not an array)", () => {
      expect(() => auditCitations([])).toThrow(/array/);
    });
    it("string / number throw", () => {
      expect(() => auditCitations("ir")).toThrow(/non-null object/);
      expect(() => auditCitations(42)).toThrow(/non-null object/);
    });
  });

  describe("exported helpers", () => {
    it("isValidCitation: non-empty trimmed string only", () => {
      expect(isValidCitation("page/x")).toBe(true);
      expect(isValidCitation("")).toBe(false);
      expect(isValidCitation("   ")).toBe(false);
      expect(isValidCitation(null)).toBe(false);
      expect(isValidCitation(5)).toBe(false);
    });
    it("isClaimCited: object with ≥1 valid citation", () => {
      expect(isClaimCited({ citations: ["x"] })).toBe(true);
      expect(isClaimCited({ citations: ["", " "] })).toBe(false);
      expect(isClaimCited({ citations: [] })).toBe(false);
      expect(isClaimCited({})).toBe(false);
      expect(isClaimCited(null)).toBe(false);
    });
  });

  describe("broken citation shapes (all → uncited, never a crash)", () => {
    it("citations: null → uncited (not missing, not array)", () => {
      const r = auditCitations({ sections: [{ heading: "S", claims: [{ text: "x", citations: null }] }] });
      expect(r.uncited).toHaveLength(1);
      expect(r.ok).toBe(false);
    });
    it("citations: a number or object (non-array) → uncited", () => {
      const r = auditCitations({ sections: [{ heading: "S", claims: [
        { text: "n", citations: 5 }, { text: "o", citations: { ref: "x" } },
      ] }] });
      expect(r.citedClaims).toBe(0);
      expect(r.uncited).toHaveLength(2);
    });
    it("citations array of non-strings → uncited unless ≥1 valid string present", () => {
      expect(auditCitations({ sections: [{ claims: [{ text: "x", citations: [1, null, {}] }] }] }).ok).toBe(false);
      expect(auditCitations({ sections: [{ claims: [{ text: "y", citations: [1, "page/ok"] }] }] }).ok).toBe(true);
    });
  });
});
