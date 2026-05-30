import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention; see resolver-v3 tests)
const {
  deriveSlug,
  buildArtifactDir,
  ARTIFACT_ROOT,
  DEFAULT_MAX_SLUG_LEN,
  EMPTY_SLUG_FALLBACK,
} = require("../../scripts/deepask/artifact-path.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Functions: deriveSlug, buildArtifactDir.
// Phase 1: deriveSlug(question, maxLen) — branches: type-guard throw | NFD+strip+kebab+trim |
//   empty→fallback | truncate-at-dash | hard-cut. buildArtifactDir(dateStr, question) —
//   date-guard throw | compose.
// Phase 2: empty/whitespace/all-punct/unicode-diacritics/mixed-case/numbers/leading-trailing
//   dash/very-long(dash-boundary + hard-cut)/custom-maxLen; invalid types; bad date format.
// Skipped (pragmatic): contract (consumer = format skill, markdown), dependency/state
//   (stateless pure), security (slug output is fs-safe by construction: only [a-z0-9-]),
//   metamorphic (single consumer).

describe("deriveSlug", () => {
  describe("happy path", () => {
    it("normal question → kebab", () => {
      expect(deriveSlug("Are we on track for 100-paying?")).toBe("are-we-on-track-for-100-paying");
    });
    it("strips Vietnamese diacritics (NFD)", () => {
      expect(deriveSlug("Chiến lược tăng trưởng")).toBe("chien-luoc-tang-truong");
    });
    it("lowercases + preserves numbers", () => {
      expect(deriveSlug("MixedCASE 100 Test")).toBe("mixedcase-100-test");
    });
  });

  describe("collapsing + trimming", () => {
    it("collapses runs of punctuation/space to a single dash", () => {
      expect(deriveSlug("a,,,   b???c")).toBe("a-b-c");
    });
    it("trims leading/trailing dashes", () => {
      expect(deriveSlug("  --Leading and trailing--  ")).toBe("leading-and-trailing");
    });
    it("single word → itself", () => {
      expect(deriveSlug("Hello")).toBe("hello");
    });
  });

  describe("empty / fallback", () => {
    it("empty string → untitled", () => {
      expect(deriveSlug("")).toBe(EMPTY_SLUG_FALLBACK);
    });
    it("whitespace-only → untitled", () => {
      expect(deriveSlug("   \t\n ")).toBe(EMPTY_SLUG_FALLBACK);
    });
    it("all punctuation → untitled", () => {
      expect(deriveSlug("???!!! ---")).toBe(EMPTY_SLUG_FALLBACK);
    });
    it("emoji-only → untitled", () => {
      expect(deriveSlug("🔮💀")).toBe(EMPTY_SLUG_FALLBACK);
    });
  });

  describe("truncation (≤ maxLen, no mid-word cut, no edge dash)", () => {
    it("very long question truncates at a dash boundary", () => {
      const q = "What is blocking our path to one hundred paying customers who genuinely love the product";
      const s = deriveSlug(q);
      expect(s.length).toBeLessThanOrEqual(DEFAULT_MAX_SLUG_LEN);
      expect(s).toMatch(/^[a-z0-9]/);
      expect(s).toMatch(/[a-z0-9]$/); // no trailing dash
      expect(q.toLowerCase()).toContain(s.split("-")[0]); // starts at the real first word
    });
    it("custom maxLen cuts at last dash", () => {
      expect(deriveSlug("alpha beta gamma", 7)).toBe("alpha"); // "alpha-b" → last dash @5 → "alpha"
    });
    it("maxLen smaller than the first word → hard cut (no dash available)", () => {
      expect(deriveSlug("alphabet", 4)).toBe("alph");
    });
    it("truncation that would leave only a dash → untitled", () => {
      expect(deriveSlug("a-bcdef", 2)).toBe("a"); // cut "a-" → lastDash@1 → "a"
    });
  });

  describe("input validation", () => {
    it("non-string question throws", () => {
      expect(() => deriveSlug(null)).toThrow(/must be a string/);
      expect(() => deriveSlug(42)).toThrow(/must be a string/);
      expect(() => deriveSlug(undefined)).toThrow(/must be a string/);
    });
    it("invalid maxLen throws", () => {
      expect(() => deriveSlug("x", 0)).toThrow(/positive integer/);
      expect(() => deriveSlug("x", -3)).toThrow(/positive integer/);
      expect(() => deriveSlug("x", 2.5)).toThrow(/positive integer/);
    });
  });
});

describe("buildArtifactDir", () => {
  it("composes root + date + slug with trailing slash", () => {
    expect(buildArtifactDir("2026-05-30", "Are we on track?")).toBe(
      `${ARTIFACT_ROOT}/2026-05-30-are-we-on-track/`,
    );
  });
  it("empty question → untitled segment", () => {
    expect(buildArtifactDir("2026-05-30", "")).toBe(`${ARTIFACT_ROOT}/2026-05-30-untitled/`);
  });
  it("rejects a malformed date", () => {
    expect(() => buildArtifactDir("2026-5-30", "x")).toThrow(/YYYY-MM-DD/);
    expect(() => buildArtifactDir("nope", "x")).toThrow(/YYYY-MM-DD/);
    expect(() => buildArtifactDir(20260530 as any, "x")).toThrow(/YYYY-MM-DD/);
  });
  it("propagates question type errors", () => {
    expect(() => buildArtifactDir("2026-05-30", null)).toThrow(/must be a string/);
  });
});

describe("exported constants", () => {
  it("are the documented defaults", () => {
    expect(ARTIFACT_ROOT).toBe(".archives/deepask");
    expect(DEFAULT_MAX_SLUG_LEN).toBe(48);
    expect(EMPTY_SLUG_FALLBACK).toBe("untitled");
  });
});
