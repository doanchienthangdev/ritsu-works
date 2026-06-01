import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention; see resolver-v3 tests)
const {
  resolveImageSpec,
  centeredCropBox,
  parseSize,
  IMAGE_FORMATS,
  ORIENTATIONS,
  DEFAULT_ORIENTATION,
} = require("../../scripts/deepask/image-spec.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Functions under test: resolveImageSpec,
//   centeredCropBox, parseSize (capability deepask v1.1 image formats).
// Phase 1: resolveImageSpec(args{format,orientation}) branches = invalid-args(throw) |
//   invalid-format(throw) | orientation null/undefined→default | invalid-orientation(throw) |
//   img-slide(force 16:9 landscape + crop) | infographics landscape(3:2,no crop) |
//   infographics portrait(2:3,no crop). centeredCropBox = geometry (srcAR>target clamp width |
//   else clamp height | equal AR → no-op). parseSize = "WxH" regex | reject.
// Phase 2 edge cases mapped: format ∈/∉ enum, orientation ∈/∉ enum + null/undefined, args
//   null/non-object; crop math at the exact img-slide size (1536x1024→16:9=1536x864, top=80),
//   square/wide/tall/exact-ratio sources; parseSize "", "auto", "0x10", "12x", non-string.
// Behavioral relationship (2M): the crop box ALWAYS yields the target ratio (within ±1px round).
// Skipped (pragmatic, noted): security (closed enums + numeric), state/dependency (stateless
//   pure fns, no I/O), contract (single consumer = deepask/image-compose markdown), regression
//   (new module, no prior bugs).

describe("resolveImageSpec", () => {
  describe("happy path", () => {
    it("img-slide → always 16:9 (gen 1536x1024, center-crop to 1536x864, top=80)", () => {
      expect(resolveImageSpec({ format: "img-slide" })).toStrictEqual({
        format: "img-slide",
        orientation: "landscape",
        apiSize: "1536x1024",
        ratio: "16:9",
        crop: { left: 0, top: 80, width: 1536, height: 864 },
        finalSize: "1536x864",
      });
    });

    it("infographics default orientation → landscape 3:2 (1536x1024), no crop", () => {
      expect(resolveImageSpec({ format: "infographics" })).toStrictEqual({
        format: "infographics",
        orientation: "landscape",
        apiSize: "1536x1024",
        ratio: "3:2",
        crop: null,
        finalSize: "1536x1024",
      });
    });

    it("infographics portrait → 2:3 (1024x1536), no crop", () => {
      expect(resolveImageSpec({ format: "infographics", orientation: "portrait" })).toStrictEqual({
        format: "infographics",
        orientation: "portrait",
        apiSize: "1024x1536",
        ratio: "2:3",
        crop: null,
        finalSize: "1024x1536",
      });
    });
  });

  describe("img-slide ignores --orientation (always 16:9)", () => {
    it("portrait request on img-slide is overridden to landscape 16:9", () => {
      const r = resolveImageSpec({ format: "img-slide", orientation: "portrait" });
      expect(r.orientation).toBe("landscape");
      expect(r.ratio).toBe("16:9");
      expect(r.finalSize).toBe("1536x864");
    });
  });

  describe("orientation defaulting", () => {
    it("undefined orientation → DEFAULT_ORIENTATION (landscape)", () => {
      expect(resolveImageSpec({ format: "infographics", orientation: undefined }).orientation).toBe(DEFAULT_ORIENTATION);
    });
    it("null orientation → DEFAULT_ORIENTATION (landscape)", () => {
      expect(resolveImageSpec({ format: "infographics", orientation: null }).orientation).toBe("landscape");
    });
  });

  describe("input boundaries / errors", () => {
    it("throws when args is null", () => {
      expect(() => resolveImageSpec(null)).toThrow(/args must be an object/);
    });
    it("throws when args is not an object", () => {
      expect(() => resolveImageSpec("img-slide")).toThrow(/args must be an object/);
    });
    it("throws on unknown format", () => {
      expect(() => resolveImageSpec({ format: "html" })).toThrow(/format must be one of/);
    });
    it("throws on empty-string format", () => {
      expect(() => resolveImageSpec({ format: "" })).toThrow(/format must be one of/);
    });
    it("throws on unknown orientation", () => {
      expect(() => resolveImageSpec({ format: "infographics", orientation: "diagonal" })).toThrow(/orientation must be one of/);
    });
  });

  it("exposes the format/orientation enums", () => {
    expect(IMAGE_FORMATS).toStrictEqual(["infographics", "img-slide"]);
    expect(ORIENTATIONS).toStrictEqual(["landscape", "portrait"]);
  });
});

describe("centeredCropBox", () => {
  describe("business logic — geometry", () => {
    it("1536x1024 → 16:9 yields 1536x864 centered (the img-slide case)", () => {
      expect(centeredCropBox(1536, 1024, 16, 9)).toStrictEqual({ left: 0, top: 80, width: 1536, height: 864 });
    });
    it("wide source (2000x1000) → 16:9 clamps width, centered horizontally", () => {
      const c = centeredCropBox(2000, 1000, 16, 9);
      expect(c.height).toBe(1000);
      expect(c.width).toBe(1778); // round(1000 * 16/9)
      expect(c.left).toBe(111); // floor((2000-1778)/2)
      expect(c.top).toBe(0);
    });
    it("tall source (1024x1536 portrait) → 16:9 clamps height", () => {
      const c = centeredCropBox(1024, 1536, 16, 9);
      expect(c.width).toBe(1024);
      expect(c.height).toBe(576); // round(1024 * 9/16)
      expect(c.left).toBe(0);
      expect(c.top).toBe(480); // floor((1536-576)/2)
    });
    it("already-16:9 source (1600x900) → no-op full-frame box", () => {
      expect(centeredCropBox(1600, 900, 16, 9)).toStrictEqual({ left: 0, top: 0, width: 1600, height: 900 });
    });
    it("square source (1024x1024) → 16:9 crops to 1024x576", () => {
      const c = centeredCropBox(1024, 1024, 16, 9);
      expect(c.width).toBe(1024);
      expect(c.height).toBe(576);
      expect(c.top).toBe(224);
    });
  });

  describe("behavioral relationship (2M) — output always matches target ratio (±1px)", () => {
    for (const [w, h] of [[1536, 1024], [2000, 1000], [1024, 1536], [800, 800], [1920, 1080]]) {
      it(`${w}x${h} → crop AR ≈ 16/9`, () => {
        const c = centeredCropBox(w, h, 16, 9);
        expect(Math.abs(c.width / c.height - 16 / 9)).toBeLessThan(0.01);
        expect(c.left + c.width).toBeLessThanOrEqual(w);
        expect(c.top + c.height).toBeLessThanOrEqual(h);
      });
    }
  });

  describe("input errors", () => {
    it("throws on non-positive dimension", () => {
      expect(() => centeredCropBox(0, 100, 16, 9)).toThrow(/positive finite numbers/);
    });
    it("throws on NaN", () => {
      expect(() => centeredCropBox(NaN, 100, 16, 9)).toThrow(/positive finite numbers/);
    });
  });
});

describe("parseSize", () => {
  it("parses WxH", () => {
    expect(parseSize("1536x1024")).toStrictEqual({ w: 1536, h: 1024 });
  });
  it("throws on non-string", () => {
    expect(() => parseSize(1536 as unknown as string)).toThrow(/must be a string/);
  });
  it("throws on malformed (no x)", () => {
    expect(() => parseSize("1536-1024")).toThrow(/must be "WxH"/);
  });
  it("throws on 'auto' (not a concrete WxH)", () => {
    expect(() => parseSize("auto")).toThrow(/must be "WxH"/);
  });
  it("throws on empty string", () => {
    expect(() => parseSize("")).toThrow(/must be "WxH"/);
  });
  it("throws on zero dimension", () => {
    expect(() => parseSize("0x10")).toThrow(/dims must be > 0/);
  });
  it("throws on partial (12x)", () => {
    expect(() => parseSize("12x")).toThrow(/must be "WxH"/);
  });
});
