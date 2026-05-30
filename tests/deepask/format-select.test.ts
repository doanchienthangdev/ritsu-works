import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention; see resolver-v3 tests)
const {
  selectFormat,
  DOC_FAMILY,
  VISUAL_FAMILY,
  ALL_FORMATS,
  VALID_INTENTS,
} = require("../../scripts/deepask/format-select.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Function under test: selectFormat (smartauto).
// Phase 1 analysis: 2 params (signals{intent}, available[]); branches = invalid signals/intent/
//   available → throw | first-pref-in-available | article fallback | available[0] last-resort.
// Phase 2 edge cases: every intent × {DOC_FAMILY (S4) vs ALL_FORMATS (S5+) vs ['article'] vs
//   ['text']}; fellBack flag; invalid intent / non-array / empty / unknown-format.
// Skipped (pragmatic): contract (consumer = deepask/format skill, markdown), dependency/state
//   (stateless pure fn), security (closed enums), metamorphic (single consumer).

describe("selectFormat (smartauto)", () => {
  describe("Sprint-4 availability = DOC_FAMILY (visual formats not built yet)", () => {
    it.each([
      ["comparison", "article", false],
      ["architecture", "article", true], // ideal mermaid not built → article
      ["metric_trend", "xlsx", true],    // ideal chart not built → xlsx
      ["exec_briefing", "pptx", false],  // pptx is in the doc family
      ["how_to", "article", false],
      ["raw_data", "xlsx", false],
      ["general", "article", false],
    ])("intent %s → %s (fellBack=%s)", (intent: string, fmt: string, fellBack: boolean) => {
      const r = selectFormat({ intent }, DOC_FAMILY);
      expect(r.format).toBe(fmt);
      expect(r.fellBack).toBe(fellBack);
      expect(typeof r.reason).toBe("string");
    });
  });

  describe("Sprint-5+ availability = ALL_FORMATS (visual ideals now reachable)", () => {
    it("architecture → mermaid (no fallback once built)", () => {
      const r = selectFormat({ intent: "architecture" }, ALL_FORMATS);
      expect(r.format).toBe("mermaid");
      expect(r.fellBack).toBe(false);
    });
    it("metric_trend → chart (first preference once built)", () => {
      expect(selectFormat({ intent: "metric_trend" }, ALL_FORMATS).format).toBe("chart");
    });
    it("exec_briefing stays pptx (it was already in the doc family)", () => {
      expect(selectFormat({ intent: "exec_briefing" }, ALL_FORMATS).format).toBe("pptx");
    });
  });

  describe("default availability is ALL_FORMATS when omitted (Sprint 5: all adapters built)", () => {
    it("metric_trend with no `available` arg → chart (visual now reachable)", () => {
      expect(selectFormat({ intent: "metric_trend" }).format).toBe("chart");
    });
    it("architecture with no `available` arg → mermaid", () => {
      expect(selectFormat({ intent: "architecture" }).format).toBe("mermaid");
    });
    it("exec_briefing with no `available` arg → pptx", () => {
      expect(selectFormat({ intent: "exec_briefing" }).format).toBe("pptx");
    });
  });

  describe("constrained availability falls back to canonical article", () => {
    it.each(["comparison", "architecture", "metric_trend", "raw_data", "general"])(
      "intent %s with available=['article'] → article",
      (intent: string) => {
        const r = selectFormat({ intent }, ["article"]);
        expect(r.format).toBe("article");
      },
    );
    it("article fallback sets fellBack=true when the ideal differs", () => {
      expect(selectFormat({ intent: "metric_trend" }, ["article"]).fellBack).toBe(true);
      expect(selectFormat({ intent: "general" }, ["article"]).fellBack).toBe(false); // article IS the ideal
    });
    it("last-resort: no preferred + no article → first available element", () => {
      const r = selectFormat({ intent: "comparison" }, ["text"]);
      expect(r.format).toBe("text");
      expect(r.fellBack).toBe(true);
      expect(r.reason).toMatch(/last-resort/);
    });
  });

  describe("input validation (throws TypeError)", () => {
    it("invalid intent throws", () => {
      expect(() => selectFormat({ intent: "rant" })).toThrow(/intent must be one of/);
      expect(() => selectFormat({})).toThrow(/intent must be one of/);
    });
    it("non-object signals throws", () => {
      expect(() => selectFormat(null)).toThrow(/must be an object/);
      expect(() => selectFormat("article")).toThrow(/must be an object/);
      expect(() => selectFormat([])).toThrow(/must be an object/);
    });
    it("invalid available throws", () => {
      expect(() => selectFormat({ intent: "general" }, [])).toThrow(/non-empty array/);
      expect(() => selectFormat({ intent: "general" }, "doc" as any)).toThrow(/non-empty array/);
      expect(() => selectFormat({ intent: "general" }, ["bogusfmt"])).toThrow(/unknown format/);
    });
  });

  describe("exported vocab", () => {
    it("families partition the 12 formats", () => {
      expect(DOC_FAMILY).toHaveLength(6);
      expect(VISUAL_FAMILY).toHaveLength(6);
      expect(ALL_FORMATS).toHaveLength(12);
      expect(new Set(ALL_FORMATS).size).toBe(12); // no dupes
    });
    it("7 intents are mapped", () => {
      expect(VALID_INTENTS).toHaveLength(7);
    });
  });
});
