import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const { parseLength, WORDS_PER_PAGE, DEFAULT_PRESETS, DEFAULT_PRESET } = require("../../scripts/write/lib/length.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). parseLength: presets | <N>w | <N>p | bare int | invalid.

describe("parseLength", () => {
  describe("presets", () => {
    it.each(Object.keys(DEFAULT_PRESETS))("resolves preset '%s' to its word target", (p: string) => {
      const r = parseLength(p);
      expect(r.kind).toBe("preset");
      expect(r.words).toBe(DEFAULT_PRESETS[p]);
      expect(r.label).toBe(p);
      expect(r.warnings).toEqual([]);
    });
    it("is case-insensitive", () => {
      expect(parseLength("LONG").words).toBe(DEFAULT_PRESETS.long);
    });
    it("a registry presets arg overrides defaults", () => {
      expect(parseLength("medium", { medium: 999 }).words).toBe(999);
    });
  });

  describe("words form <N>w", () => {
    it.each([["1500w", 1500], ["250 w", 250], ["1000words", 1000], ["80word", 80]])(
      "%s → %i words", (spec, words) => {
        const r = parseLength(spec);
        expect(r.kind).toBe("words");
        expect(r.words).toBe(words);
      });
    it("rounds a decimal word count", () => {
      expect(parseLength("99.6w").words).toBe(100);
    });
  });

  describe("pages form <N>p", () => {
    it("5p → 5 * WORDS_PER_PAGE", () => {
      const r = parseLength("5p");
      expect(r.kind).toBe("pages");
      expect(r.words).toBe(5 * WORDS_PER_PAGE);
      expect(r.label).toBe("5p");
    });
    it.each(["1page", "3pages", "2pg", "10pgs"])("accepts the page alias %s", (spec) => {
      expect(parseLength(spec).kind).toBe("pages");
    });
  });

  describe("bare numbers", () => {
    it("a numeric type is treated as words", () => {
      const r = parseLength(1200);
      expect(r.kind).toBe("words");
      expect(r.words).toBe(1200);
    });
    it("a bare integer string is words", () => {
      expect(parseLength("800").kind).toBe("words");
      expect(parseLength("800").words).toBe(800);
    });
  });

  describe("defaults + invalid", () => {
    it.each([undefined, null, ""])("empty spec %s → default preset", (spec) => {
      const r = parseLength(spec as any);
      expect(r.label).toBe(DEFAULT_PRESET);
      expect(r.words).toBe(DEFAULT_PRESETS[DEFAULT_PRESET]);
    });
    it("unintelligible spec → default + warning", () => {
      const r = parseLength("ginormous");
      expect(r.label).toBe(DEFAULT_PRESET);
      expect(r.warnings.length).toBe(1);
      expect(r.warnings[0]).toMatch(/not understood/);
    });
    it("zero / negative numbers fall back to default", () => {
      expect(parseLength(0).label).toBe(DEFAULT_PRESET);
      expect(parseLength(-500).label).toBe(DEFAULT_PRESET);
      expect(parseLength("0w").label).toBe(DEFAULT_PRESET);
    });
  });

  describe("output invariants", () => {
    it("words is always >= 1 and pages is derived", () => {
      const r = parseLength("1p");
      expect(r.words).toBeGreaterThanOrEqual(1);
      expect(r.pages).toBeCloseTo(r.words / WORDS_PER_PAGE, 1);
    });
    it("always returns a warnings array", () => {
      expect(Array.isArray(parseLength("medium").warnings)).toBe(true);
    });
  });
});
