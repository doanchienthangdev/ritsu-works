import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const {
  estimateImageCost,
  estimateRunCost,
  checkCostBudget,
  costSizeKey,
  costQuality,
  COST_TABLE,
  QUALITIES,
  DEFAULT_QUALITY,
} = require("../../scripts/deepask/image-cost.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Functions: estimateImageCost, estimateRunCost,
//   checkCostBudget, costSizeKey, costQuality (capability deepask v1.1 image cost dial).
// Phase 1: branches = invalid-args(throw) | unknown-size(throw) | size-alias(map) |
//   quality 'auto'→'high' | quality invalid(throw) | count non-positive(throw) | budget
//   ok | over_cost_cap. The budget boundary (estimatedUsd === maxCostUsd ⇒ ok) is the == to pin.
// Phase 2 edge cases: every size×quality in COST_TABLE; the 1536x864 alias (img-slide crop);
//   count 1 / large; estimatedUsd 0; estimatedUsd == cap; cap 0; negative inputs; non-int count.
// Behavioral relationship (2M): totalUsd is monotonic & linear in count (n×perImage).
// Skipped (pragmatic): security (numeric/enum), state/dependency (stateless), contract (single
//   consumer markdown), regression (new module).

describe("costQuality", () => {
  it("defaults undefined/null → medium", () => {
    expect(costQuality(undefined)).toBe("medium");
    expect(costQuality(null)).toBe(DEFAULT_QUALITY);
  });
  it("maps 'auto' → 'high' (conservative estimate)", () => {
    expect(costQuality("auto")).toBe("high");
  });
  it("passes through low/medium/high", () => {
    expect(costQuality("low")).toBe("low");
    expect(costQuality("high")).toBe("high");
  });
  it("throws on unknown quality", () => {
    expect(() => costQuality("ultra")).toThrow(/quality must be one of/);
  });
  it("QUALITIES enum is the closed set", () => {
    expect(QUALITIES).toStrictEqual(["low", "medium", "high", "auto"]);
  });
});

describe("costSizeKey", () => {
  it("returns known sizes unchanged", () => {
    expect(costSizeKey("1024x1024")).toBe("1024x1024");
    expect(costSizeKey("1536x1024")).toBe("1536x1024");
    expect(costSizeKey("1024x1536")).toBe("1024x1536");
  });
  it("maps the img-slide cropped 1536x864 → landscape 1536x1024 price tier", () => {
    expect(costSizeKey("1536x864")).toBe("1536x1024");
  });
  it("2048x1152 (img-slide native 16:9, v1.2.1) is a direct COST_TABLE size", () => {
    expect(costSizeKey("2048x1152")).toBe("2048x1152");
    expect(estimateImageCost({ size: "2048x1152", quality: "medium" })).toBe(0.1);
  });
  it("throws on unknown size", () => {
    expect(() => costSizeKey("4096x4096")).toThrow(/unknown size/);
  });
  it("throws on non-string", () => {
    expect(() => costSizeKey(1024 as unknown as string)).toThrow(/must be a string/);
  });
});

describe("estimateImageCost", () => {
  it("matches the COST_TABLE for each size×quality", () => {
    for (const size of Object.keys(COST_TABLE)) {
      for (const q of ["low", "medium", "high"]) {
        expect(estimateImageCost({ size, quality: q })).toBe(COST_TABLE[size][q]);
      }
    }
  });
  it("'auto' quality bills as 'high'", () => {
    expect(estimateImageCost({ size: "1536x1024", quality: "auto" })).toBe(COST_TABLE["1536x1024"].high);
  });
  it("defaults quality to medium", () => {
    expect(estimateImageCost({ size: "1024x1024" })).toBe(COST_TABLE["1024x1024"].medium);
  });
  it("throws on null args", () => {
    expect(() => estimateImageCost(null)).toThrow(/args must be an object/);
  });
});

describe("estimateRunCost", () => {
  it("8 medium img-slide pages (1536x864) → 8 × 0.063 = 0.504", () => {
    const r = estimateRunCost({ size: "1536x864", quality: "medium", count: 8 });
    expect(r.perImageUsd).toBe(0.063);
    expect(r.totalUsd).toBe(0.504);
    expect(r.count).toBe(8);
    expect(r.size).toBe("1536x1024");
    expect(r.quality).toBe("medium");
    expect(r.isEstimate).toBe(true);
  });
  it("1 high portrait infographic → 0.25", () => {
    expect(estimateRunCost({ size: "1024x1536", quality: "high", count: 1 }).totalUsd).toBe(0.25);
  });
  it("default model is gpt-image-2", () => {
    expect(estimateRunCost({ size: "1024x1024", count: 1 }).model).toBe("gpt-image-2");
  });
  it("behavioral relationship (2M): total is linear in count", () => {
    const one = estimateRunCost({ size: "1024x1024", quality: "low", count: 1 }).totalUsd;
    const ten = estimateRunCost({ size: "1024x1024", quality: "low", count: 10 }).totalUsd;
    expect(ten).toBeCloseTo(one * 10, 4);
  });
  it("throws on zero count", () => {
    expect(() => estimateRunCost({ size: "1024x1024", count: 0 })).toThrow(/count must be a positive integer/);
  });
  it("throws on negative count", () => {
    expect(() => estimateRunCost({ size: "1024x1024", count: -3 })).toThrow(/positive integer/);
  });
  it("throws on non-integer count", () => {
    expect(() => estimateRunCost({ size: "1024x1024", count: 2.5 })).toThrow(/positive integer/);
  });
});

describe("checkCostBudget (circuit-breaker)", () => {
  it("ok when estimate < cap", () => {
    expect(checkCostBudget({ estimatedUsd: 0.5, maxCostUsd: 1.0 })).toStrictEqual({ ok: true, estimatedUsd: 0.5, maxCostUsd: 1.0, reason: null });
  });
  it("ok at the exact boundary (estimate == cap)", () => {
    expect(checkCostBudget({ estimatedUsd: 1.0, maxCostUsd: 1.0 }).ok).toBe(true);
  });
  it("trips just over the boundary", () => {
    expect(checkCostBudget({ estimatedUsd: 1.0001, maxCostUsd: 1.0 })).toStrictEqual({ ok: false, estimatedUsd: 1.0001, maxCostUsd: 1.0, reason: "over_cost_cap" });
  });
  it("zero estimate is always ok (even cap 0)", () => {
    expect(checkCostBudget({ estimatedUsd: 0, maxCostUsd: 0 }).ok).toBe(true);
  });
  it("throws on negative estimate", () => {
    expect(() => checkCostBudget({ estimatedUsd: -1, maxCostUsd: 1 })).toThrow(/estimatedUsd must be a non-negative number/);
  });
  it("throws on negative cap", () => {
    expect(() => checkCostBudget({ estimatedUsd: 1, maxCostUsd: -1 })).toThrow(/maxCostUsd must be a non-negative number/);
  });
  it("throws on NaN", () => {
    expect(() => checkCostBudget({ estimatedUsd: NaN, maxCostUsd: 1 })).toThrow(/non-negative number/);
  });
});
