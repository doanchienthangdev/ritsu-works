import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS
const { assessLicense, assertCacheable, LicenseError } = require("../../scripts/design-system/license-gate.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Functions: assessLicense (pure classifier) + assertCacheable (gate).
// Phase 1: assessLicense(license) branches = null/undefined→{false, fail-closed} | non-string→throw |
//   empty/whitespace→{false} | known-permissive→{true} | known-restrictive→{false} | unknown→{false, fail-closed}.
//   assertCacheable(name,license) = throws on !redistributable, returns assessment otherwise.
// Phase 2: case-insensitivity, whitespace trim, the full permissive/restrictive/unknown matrix, type guards.
//   Security relevance (R2): FAIL-CLOSED is the safety property — "downloaded != redistributable". Skipped:
//   state/timing (pure), contract (consumed by add/build flow — covered by assertCacheable tests).

describe("assessLicense", () => {
  describe("fail-closed (the R2 safety property)", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
      ["empty", ""],
      ["whitespace", "   "],
    ])("%s license → NOT redistributable (fail-closed)", (_l, lic) => {
      const a = assessLicense(lic as any);
      expect(a.redistributable).toBe(false);
      expect(a.reason).toMatch(/fail-closed/);
    });

    it.each([
      ["GPL-3.0"],
      ["SSPL-1.0"],
      ["some-weird-license"],
      ["©2026"],
    ])("unrecognized license %s → NOT redistributable (fail-closed, founder must confirm)", (lic) => {
      const a = assessLicense(lic);
      expect(a.redistributable).toBe(false);
      expect(a.reason).toMatch(/unrecognized|fail-closed/);
      expect(a.normalized).toBe(lic);
    });
  });

  describe("permissive → redistributable", () => {
    it.each(["MIT", "mit", "  MIT  ", "ISC", "Apache-2.0", "BSD-3-Clause", "CC0-1.0", "Unlicense", "public-domain", "MPL-2.0"])(
      "permissive %s → redistributable",
      (lic) => {
        const a = assessLicense(lic);
        expect(a.redistributable).toBe(true);
        expect(a.normalized).toBe(lic.trim());
      },
    );
  });

  describe("restrictive → NOT redistributable", () => {
    it.each(["CC-BY-NC-4.0", "cc-by-nd-4.0", "proprietary", "all-rights-reserved", "UNLICENSED", "closed"])(
      "restrictive %s → NOT redistributable",
      (lic) => {
        const a = assessLicense(lic);
        expect(a.redistributable).toBe(false);
        expect(a.reason).toMatch(/restrictive|must NOT/i);
      },
    );
  });

  describe("input guards", () => {
    it.each([
      ["number", 123],
      ["array", ["MIT"]],
      ["object", { spdx: "MIT" }],
      ["boolean", true],
    ])("throws LicenseError on non-string %s", (_l, lic) => {
      expect(() => assessLicense(lic as any)).toThrow(LicenseError);
    });
  });

  describe("case-insensitivity + trim", () => {
    it("matches regardless of case/whitespace", () => {
      expect(assessLicense("  ApAcHe-2.0 ").redistributable).toBe(true);
      expect(assessLicense("PROPRIETARY").redistributable).toBe(false);
    });
  });
});

describe("assertCacheable (the gate)", () => {
  it("returns the assessment when redistributable", () => {
    const a = assertCacheable("stripe", "MIT");
    expect(a.redistributable).toBe(true);
  });
  it.each([
    ["null license", null],
    ["restrictive", "proprietary"],
    ["unknown", "GPL-3.0"],
    ["empty", ""],
  ])("throws LicenseError when NOT cacheable (%s) — never silently caches", (_l, lic) => {
    expect(() => assertCacheable("x", lic as any)).toThrow(LicenseError);
    expect(() => assertCacheable("x", lic as any)).toThrow(/refusing to cache/);
  });
  it("propagates the type guard (non-string throws)", () => {
    expect(() => assertCacheable("x", 42 as any)).toThrow(LicenseError);
  });
});
