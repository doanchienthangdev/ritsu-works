import { describe, it, expect } from "vitest";

// vitest supports named imports from CommonJS module.exports.
import mod from "../../scripts/local-install/lib/version.cjs";
const { parseVersion, compareVersions, satisfiesMin, formatVersion } = mod;

/**
 * Phase 1 analysis (version.cjs):
 *   - parseVersion(text): 1 param (string), branches: non-string/empty → null;
 *     regex no-match → null; patch present vs defaulted-to-0; 'v' prefix strip on raw.
 *   - compareVersions(a,b): 2 params (string OR parsed object); branches: object-vs-parse
 *     for each side; unparseable → 0.0.0; major/minor/patch greater/less/equal.
 *   - satisfiesMin(version, minimum): null/undefined → false; unparseable → false;
 *     falsy minimum → true; else compareVersions >= 0.
 *   - formatVersion(parsed): falsy → 'unknown'; else "M.m.p".
 * Pure functions, no DI, no I/O. Skipped: contract tests (no upstream consumer here),
 * state-sequence + dependency-degradation (stateless pure), security (not user-facing input
 * beyond version strings — but messy-string boundaries are exercised).
 *
 * BEHAVIORAL NOTE (load-bearing): a BARE INTEGER like "20" is UNPARSEABLE
 * (parseVersion requires N.N at minimum). As a `minimum`, an unparseable string sorts
 * as 0.0.0 in compareVersions, so any parseable version satisfies it. To gate "below 20",
 * a caller must use a dotted minimum like "20.0".
 */

describe("parseVersion", () => {
  describe("happy path", () => {
    it("parses a bare major.minor.patch string", () => {
      expect(parseVersion("1.2.3")).toStrictEqual({
        major: 1,
        minor: 2,
        patch: 3,
        raw: "1.2.3",
      });
    });

    it("parses a v-prefixed version and strips the v from raw", () => {
      expect(parseVersion("v20.18.0")).toStrictEqual({
        major: 20,
        minor: 18,
        patch: 0,
        raw: "20.18.0",
      });
    });
  });

  describe("messy real-world --version output", () => {
    it("parses 'pnpm 9.1.0' embedded in a tool banner", () => {
      expect(parseVersion("pnpm 9.1.0")).toStrictEqual({
        major: 9,
        minor: 1,
        patch: 0,
        raw: "9.1.0",
      });
    });

    it("parses git's 'git version 2.39.3 (Apple Git-145)' picking the first triplet", () => {
      // First dotted version is 2.39.3 — the trailing 145 must NOT pollute it.
      expect(parseVersion("git version 2.39.3 (Apple Git-145)")).toStrictEqual({
        major: 2,
        minor: 39,
        patch: 3,
        raw: "2.39.3",
      });
    });

    it("parses 'Python 3.11.4'", () => {
      expect(parseVersion("Python 3.11.4")).toStrictEqual({
        major: 3,
        minor: 11,
        patch: 4,
        raw: "3.11.4",
      });
    });

    it("parses 'ffmpeg version 6.1.1'", () => {
      expect(parseVersion("ffmpeg version 6.1.1")).toStrictEqual({
        major: 6,
        minor: 1,
        patch: 1,
        raw: "6.1.1",
      });
    });

    it("parses multi-line output and grabs the first version on it", () => {
      const text = "node\nv20.18.0\nbuilt with v8";
      expect(parseVersion(text)).toStrictEqual({
        major: 20,
        minor: 18,
        patch: 0,
        raw: "20.18.0",
      });
    });
  });

  describe("two-component versions default patch to 0", () => {
    it("parses '9.0' with patch 0", () => {
      expect(parseVersion("9.0")).toStrictEqual({
        major: 9,
        minor: 0,
        patch: 0,
        raw: "9.0",
      });
    });

    it("parses 'pnpm 9.1' (no patch) with patch defaulted to 0", () => {
      expect(parseVersion("pnpm 9.1")).toStrictEqual({
        major: 9,
        minor: 1,
        patch: 0,
        raw: "9.1",
      });
    });
  });

  describe("input boundaries", () => {
    it("returns null for null", () => {
      expect(parseVersion(null as unknown as string)).toBe(null);
    });

    it("returns null for undefined", () => {
      expect(parseVersion(undefined as unknown as string)).toBe(null);
    });

    it("returns null for empty string", () => {
      expect(parseVersion("")).toBe(null);
    });

    it("returns null for a number (non-string type)", () => {
      expect(parseVersion(20 as unknown as string)).toBe(null);
    });

    it("returns null for a parsed-object input (non-string type)", () => {
      expect(parseVersion({ major: 1, minor: 2, patch: 3 } as unknown as string)).toBe(null);
    });

    it("returns null for whitespace-only text with no version", () => {
      expect(parseVersion("   \t\n  ")).toBe(null);
    });

    it("returns null for text containing only a single integer (no dot)", () => {
      // "20" has no minor → regex requires N.N at minimum.
      expect(parseVersion("20")).toBe(null);
    });

    it("returns null for text with no dotted number at all", () => {
      expect(parseVersion("no version here")).toBe(null);
    });

    it("parses a version with large multi-digit components", () => {
      expect(parseVersion("123.456.789")).toStrictEqual({
        major: 123,
        minor: 456,
        patch: 789,
        raw: "123.456.789",
      });
    });

    it("parses 0.0.0", () => {
      expect(parseVersion("0.0.0")).toStrictEqual({
        major: 0,
        minor: 0,
        patch: 0,
        raw: "0.0.0",
      });
    });

    it("parses a leading-zero-ish component as a number", () => {
      expect(parseVersion("01.02.03")).toStrictEqual({
        major: 1,
        minor: 2,
        patch: 3,
        raw: "01.02.03",
      });
    });

    it("grabs the FIRST version when multiple appear", () => {
      expect(parseVersion("1.2.3 then 4.5.6")).toStrictEqual({
        major: 1,
        minor: 2,
        patch: 3,
        raw: "1.2.3",
      });
    });
  });
});

describe("compareVersions", () => {
  describe("string inputs — equality", () => {
    it("returns 0 for identical full versions", () => {
      expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
    });

    it("returns 0 when one omits patch but it defaults to 0", () => {
      expect(compareVersions("1.2", "1.2.0")).toBe(0);
    });

    it("returns 0 for v-prefixed vs bare equal version", () => {
      expect(compareVersions("v20.18.0", "20.18.0")).toBe(0);
    });
  });

  describe("string inputs — major differences", () => {
    it("returns 1 when a.major > b.major", () => {
      expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    });

    it("returns -1 when a.major < b.major", () => {
      expect(compareVersions("1.9.9", "2.0.0")).toBe(-1);
    });
  });

  describe("string inputs — minor differences", () => {
    it("returns 1 when major equal and a.minor > b.minor", () => {
      expect(compareVersions("1.3.0", "1.2.9")).toBe(1);
    });

    it("returns -1 when major equal and a.minor < b.minor", () => {
      expect(compareVersions("1.2.9", "1.3.0")).toBe(-1);
    });
  });

  describe("string inputs — patch differences", () => {
    it("returns 1 when major+minor equal and a.patch > b.patch", () => {
      expect(compareVersions("1.2.4", "1.2.3")).toBe(1);
    });

    it("returns -1 when major+minor equal and a.patch < b.patch", () => {
      expect(compareVersions("1.2.3", "1.2.4")).toBe(-1);
    });
  });

  describe("unparseable inputs treated as 0.0.0", () => {
    it("returns 0 when both sides are unparseable", () => {
      expect(compareVersions("garbage", "nonsense")).toBe(0);
    });

    it("returns -1 when a is unparseable (0.0.0) and b is a real version", () => {
      expect(compareVersions("garbage", "1.0.0")).toBe(-1);
    });

    it("returns 1 when a is a real version and b is unparseable (0.0.0)", () => {
      expect(compareVersions("1.0.0", "garbage")).toBe(1);
    });

    it("treats empty string as 0.0.0", () => {
      expect(compareVersions("", "0.0.0")).toBe(0);
    });

    it("treats a bare integer '20' (unparseable) as 0.0.0", () => {
      expect(compareVersions("20", "0.0.0")).toBe(0);
    });
  });

  describe("object inputs", () => {
    it("accepts parsed objects on both sides", () => {
      const a = { major: 2, minor: 0, patch: 0, raw: "2.0.0" };
      const b = { major: 1, minor: 0, patch: 0, raw: "1.0.0" };
      expect(compareVersions(a, b)).toBe(1);
    });

    it("accepts a parsed object vs a string", () => {
      const a = { major: 1, minor: 2, patch: 3, raw: "1.2.3" };
      expect(compareVersions(a, "1.2.3")).toBe(0);
    });

    it("accepts a string vs a parsed object", () => {
      const b = { major: 9, minor: 0, patch: 0, raw: "9.0.0" };
      expect(compareVersions("8.9.9", b)).toBe(-1);
    });
  });

  describe("messy real-world strings", () => {
    it("compares two tool banners by their embedded versions", () => {
      expect(compareVersions("pnpm 9.1.0", "pnpm 9.0.5")).toBe(1);
    });

    it("ignores trailing parenthetical build info", () => {
      expect(
        compareVersions("git version 2.39.3 (Apple Git-145)", "git version 2.39.3"),
      ).toBe(0);
    });
  });
});

describe("satisfiesMin", () => {
  describe("null/undefined version", () => {
    it("returns false for a null version", () => {
      expect(satisfiesMin(null as unknown as string, "1.0.0")).toBe(false);
    });

    it("returns false for an undefined version", () => {
      expect(satisfiesMin(undefined as unknown as string, "1.0.0")).toBe(false);
    });
  });

  describe("unparseable version", () => {
    it("returns false for an unparseable version string", () => {
      expect(satisfiesMin("not-a-version", "1.0.0")).toBe(false);
    });

    it("returns false for an empty version string", () => {
      expect(satisfiesMin("", "1.0.0")).toBe(false);
    });

    it("returns false for a bare integer '20' (unparseable) even when min is satisfiable", () => {
      // parseVersion("20") is null → version unparseable → false.
      expect(satisfiesMin("20", "1.0.0")).toBe(false);
    });
  });

  describe("missing/falsy minimum returns true for any parseable version", () => {
    it("returns true when minimum is undefined", () => {
      expect(satisfiesMin("1.0.0", undefined as unknown as string)).toBe(true);
    });

    it("returns true when minimum is null", () => {
      expect(satisfiesMin("1.0.0", null as unknown as string)).toBe(true);
    });

    it("returns true when minimum is an empty string", () => {
      expect(satisfiesMin("1.0.0", "")).toBe(true);
    });
  });

  describe("comparison against minimum", () => {
    it("returns true for 20.18.0 vs bare-integer min '20' (min '20' unparseable → 0.0.0)", () => {
      expect(satisfiesMin("20.18.0", "20")).toBe(true);
    });

    it("returns true even for 19.x vs bare-integer min '20' (min unparseable → 0.0.0)", () => {
      // parseVersion("20") is null (single integer, no dot). In compareVersions
      // the unparseable minimum sorts as 0.0.0, so any real version >= it.
      // This documents the load-bearing quirk: bare-integer minimums never gate.
      expect(satisfiesMin("19.9.9", "20")).toBe(true);
    });

    it("returns true for 20.18.0 vs a dotted min '20.0'", () => {
      expect(satisfiesMin("20.18.0", "20.0")).toBe(true);
    });

    it("returns false for 19.x vs a dotted min '20.0'", () => {
      expect(satisfiesMin("19.9.9", "20.0")).toBe(false);
    });

    it("returns true for an exactly-equal version", () => {
      expect(satisfiesMin("3.11.0", "3.11.0")).toBe(true);
    });

    it("returns true when version exceeds minimum on patch", () => {
      expect(satisfiesMin("3.11.4", "3.11.0")).toBe(true);
    });

    it("returns false when version falls below minimum on patch", () => {
      expect(satisfiesMin("3.11.0", "3.11.4")).toBe(false);
    });

    it("returns true when version exceeds minimum on minor", () => {
      expect(satisfiesMin("9.1.0", "9.0")).toBe(true);
    });

    it("returns false when version falls below minimum on minor", () => {
      expect(satisfiesMin("9.0.0", "9.1")).toBe(false);
    });
  });

  describe("object version input", () => {
    it("accepts a parsed-object version and satisfies a dotted min string", () => {
      const v = { major: 20, minor: 18, patch: 0, raw: "20.18.0" };
      expect(satisfiesMin(v, "20.0")).toBe(true);
    });

    it("accepts a parsed-object version that fails a dotted min", () => {
      const v = { major: 19, minor: 9, patch: 9, raw: "19.9.9" };
      expect(satisfiesMin(v, "20.0")).toBe(false);
    });

    it("returns true for a parsed-object version with a falsy min", () => {
      const v = { major: 1, minor: 0, patch: 0, raw: "1.0.0" };
      expect(satisfiesMin(v, "")).toBe(true);
    });
  });

  describe("messy real-world version strings", () => {
    it("satisfies a min from a tool banner", () => {
      expect(satisfiesMin("pnpm 9.1.0", "9.0.0")).toBe(true);
    });

    it("fails a min from a tool banner below threshold", () => {
      expect(satisfiesMin("Python 3.11.4", "3.12")).toBe(false);
    });
  });
});

describe("formatVersion", () => {
  describe("falsy / null inputs", () => {
    it("returns 'unknown' for null", () => {
      expect(formatVersion(null)).toBe("unknown");
    });

    it("returns 'unknown' for undefined", () => {
      expect(formatVersion(undefined)).toBe("unknown");
    });

    it("returns 'unknown' for the result of an unparseable parseVersion", () => {
      expect(formatVersion(parseVersion("garbage"))).toBe("unknown");
    });
  });

  describe("parsed inputs", () => {
    it("renders a full triplet", () => {
      expect(formatVersion({ major: 1, minor: 2, patch: 3, raw: "1.2.3" })).toBe("1.2.3");
    });

    it("renders a patch defaulted to 0", () => {
      expect(formatVersion({ major: 20, minor: 18, patch: 0, raw: "20.18.0" })).toBe(
        "20.18.0",
      );
    });

    it("renders all-zero version (not treated as falsy)", () => {
      expect(formatVersion({ major: 0, minor: 0, patch: 0, raw: "0.0.0" })).toBe("0.0.0");
    });

    it("renders large multi-digit components", () => {
      expect(formatVersion({ major: 123, minor: 456, patch: 789, raw: "123.456.789" })).toBe(
        "123.456.789",
      );
    });
  });

  describe("roundtrip parseVersion → formatVersion", () => {
    it("formatVersion(parseVersion(x)) yields the canonical triplet", () => {
      expect(formatVersion(parseVersion("v20.18.0"))).toBe("20.18.0");
    });

    it("normalizes a two-component version to a full triplet", () => {
      expect(formatVersion(parseVersion("9.1"))).toBe("9.1.0");
    });

    it("extracts and formats from a messy banner", () => {
      expect(formatVersion(parseVersion("git version 2.39.3 (Apple Git-145)"))).toBe(
        "2.39.3",
      );
    });
  });
});
