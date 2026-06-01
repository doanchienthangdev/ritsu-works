import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const {
  selectFormat,
  IMAGE_FAMILY,
  ALL_FORMATS,
  ALL_FORMATS_WITH_IMAGE,
  isImageFormat,
  VALID_INTENTS,
} = require("../../scripts/deepask/format-select.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Surface: the v1.1 image-family additions to
//   format-select (isImageFormat, IMAGE_FAMILY, ALL_FORMATS_WITH_IMAGE) + the INVARIANT
//   that smartauto NEVER selects an image format (explicit-only cost gate).
// Phase 1: isImageFormat = membership; the invariant is enforced structurally (image formats
//   are absent from ALL_FORMATS + INTENT_PREFERENCES), so selectFormat over EVERY intent ×
//   EVERY available-subset can never return one.

describe("image-family registration", () => {
  it("IMAGE_FAMILY is exactly the two gpt-image formats", () => {
    expect(IMAGE_FAMILY).toStrictEqual(["infographics", "img-slide"]);
  });
  it("image formats are NOT in ALL_FORMATS (so smartauto can't reach them)", () => {
    expect(ALL_FORMATS).not.toContain("infographics");
    expect(ALL_FORMATS).not.toContain("img-slide");
  });
  it("ALL_FORMATS_WITH_IMAGE = ALL_FORMATS ∪ IMAGE_FAMILY (command --format validation set)", () => {
    expect(ALL_FORMATS_WITH_IMAGE).toStrictEqual([...ALL_FORMATS, "infographics", "img-slide"]);
  });
  it("isImageFormat true for the two, false otherwise", () => {
    expect(isImageFormat("infographics")).toBe(true);
    expect(isImageFormat("img-slide")).toBe(true);
    expect(isImageFormat("html")).toBe(false);
    expect(isImageFormat("article")).toBe(false);
    expect(isImageFormat("")).toBe(false);
  });
});

describe("INVARIANT — smartauto never returns an image format (explicit-only)", () => {
  it("no intent over the full ALL_FORMATS availability yields an image format", () => {
    for (const intent of VALID_INTENTS) {
      const { format } = selectFormat({ intent }); // default available = ALL_FORMATS
      expect(isImageFormat(format)).toBe(false);
    }
  });

  it("selectFormat rejects an image format passed in `available` (not a smartauto-eligible format)", () => {
    expect(() => selectFormat({ intent: "general" }, ["infographics"])).toThrow(/unknown format/);
  });
});
