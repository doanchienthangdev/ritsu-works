import { describe, it, expect } from "vitest";

const { resolveArtStyle, ArtStyleResolveError, PLAIN } = require("../../scripts/deepask/art-style.cjs");
const {
  validateEntry,
  findArtStyle,
  NAME_RE,
  FORBIDDEN_BRAND_KEYS,
} = require("../../scripts/deepask/art-style-registry-io.cjs");

// art-style.cjs — the deepask --art-style (genre axis) resolver + its registry-io.
// Capability deepask v1.2-image. Closed registry (no download): a miss is a HARD
// error in every mode (AD-3). Orthogonality guard: a genre may NOT carry a brand
// palette key (colors/background/primary/surface) — @cto Phase-5 R5.

describe("resolveArtStyle", () => {
  describe("plain (no --art-style)", () => {
    it("returns plain for undefined", () => {
      expect(resolveArtStyle(undefined)).toEqual({ mode: "plain", name: null, genre: null });
    });
    it("returns plain for null", () => {
      expect(resolveArtStyle(null)).toEqual({ mode: "plain", name: null, genre: null });
    });
    it("returns plain for empty string", () => {
      expect(resolveArtStyle("")).toEqual({ mode: "plain", name: null, genre: null });
    });
    it("plain is a fresh object (not the frozen PLAIN reference)", () => {
      const r = resolveArtStyle(undefined);
      expect(r).not.toBe(PLAIN);
      expect(Object.isFrozen(r)).toBe(false);
    });
  });

  describe("happy path (known genre)", () => {
    it("resolves a known id to styled with full genre context", () => {
      const r = resolveArtStyle("isometric-kingdom");
      expect(r.mode).toBe("styled");
      expect(r.name).toBe("isometric-kingdom");
      expect(typeof r.genre.assets).toBe("string");
      expect(r.genre.assets.length).toBeGreaterThan(0);
      expect(r.genre.tone).toBeTruthy();
      expect(r.genre.layout).toBeTruthy();
    });
    it("never exposes a brand palette key on the resolved genre", () => {
      const r = resolveArtStyle("isometric-kingdom");
      for (const k of FORBIDDEN_BRAND_KEYS) {
        expect(k in r.genre).toBe(false);
      }
    });
  });

  describe("errors", () => {
    it("throws ArtStyleResolveError on a registry miss (closed registry, AD-3)", () => {
      expect(() => resolveArtStyle("definitely-not-a-real-style-xyz")).toThrow(ArtStyleResolveError);
    });
    it("throws on a non-string name", () => {
      expect(() => resolveArtStyle(42 as any)).toThrow(ArtStyleResolveError);
      expect(() => resolveArtStyle({} as any)).toThrow(ArtStyleResolveError);
    });
    it("throws on non-object opts", () => {
      expect(() => resolveArtStyle("isometric-kingdom", null as any)).toThrow(ArtStyleResolveError);
    });
    it("miss error names the registry + the closed-registry reason", () => {
      try {
        resolveArtStyle("nope-nope");
      } catch (e: any) {
        expect(e.message).toMatch(/art-styles\.yaml/);
        expect(e.message).toMatch(/closed registry|AD-3/);
      }
    });
  });

  describe("registryPath injection", () => {
    it("returns null from findArtStyle for an unknown id against the real registry", () => {
      expect(findArtStyle("nope-nope")).toBeNull();
    });
    it("findArtStyle returns null for non-string id", () => {
      expect(findArtStyle(undefined as any)).toBeNull();
      expect(findArtStyle("")).toBeNull();
    });
  });
});

describe("validateEntry (art-style-registry-io)", () => {
  const good = { id: "x-style", name: "X Style", tone: "t", layout: "l", assets: "a" };

  it("accepts a minimal valid entry", () => {
    expect(validateEntry(good)).toEqual([]);
  });
  it("accepts an id starting with a digit (e.g. 8-bit-pixel-adventure)", () => {
    expect(NAME_RE.test("8-bit-pixel-adventure")).toBe(true);
    expect(validateEntry({ ...good, id: "8-bit-pixel-adventure" })).toEqual([]);
  });
  it("rejects a non-kebab id", () => {
    expect(validateEntry({ ...good, id: "Bad Id" }).some((e: string) => /id invalid/.test(e))).toBe(true);
  });
  it("rejects an id with a dot", () => {
    expect(validateEntry({ ...good, id: "linear.app" }).some((e: string) => /id invalid/.test(e))).toBe(true);
  });
  it("rejects empty required prose (assets)", () => {
    expect(validateEntry({ ...good, assets: "" }).some((e: string) => /assets required/.test(e))).toBe(true);
  });
  it("rejects whitespace-only required prose (tone)", () => {
    expect(validateEntry({ ...good, tone: "   " }).some((e: string) => /tone required/.test(e))).toBe(true);
  });
  it("rejects a forbidden brand key: colors (@cto R5)", () => {
    expect(validateEntry({ ...good, colors: "red" }).some((e: string) => /colors/.test(e))).toBe(true);
  });
  it("rejects a forbidden brand key: background", () => {
    expect(validateEntry({ ...good, background: "#000" }).some((e: string) => /background/.test(e))).toBe(true);
  });
  it("rejects a forbidden brand key: primary", () => {
    expect(validateEntry({ ...good, primary: "#fff" }).some((e: string) => /primary/.test(e))).toBe(true);
  });
  it("rejects a non-object entry", () => {
    expect(validateEntry(null).length).toBeGreaterThan(0);
    expect(validateEntry([] as any).length).toBeGreaterThan(0);
  });
  it("rejects a non-string optional field when present", () => {
    expect(validateEntry({ ...good, secondary_palette: 5 as any }).some((e: string) => /secondary_palette/.test(e))).toBe(true);
  });
});
