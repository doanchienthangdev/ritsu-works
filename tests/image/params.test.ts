import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const {
  UNIVERSAL_PARAMS,
  TIER_TO_LONG_EDGE,
  DEFAULTS,
  MAX_AR,
  MAX_EDGE,
  MIN_PIXEL_BUDGET,
  parseImageArgs,
  tierToQuality,
  resolveAspectRatio,
  estimateFlexibleCost,
  computeWarnings,
  round16,
} = require("../../scripts/image/lib/params.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Pure functions of the image-platform universal
// param layer (capability image-platform v0.1 PR-1).
// Phase 1: parseImageArgs (positional|--flag, =val|bare, bool|num|str, unknown, prompt-from-positional);
//   tierToQuality (known|unknown→medium); round16 (round + min/max clamp); resolveAspectRatio
//   (valid|malformed|non-positive|landscape|portrait|square|clamp>3:1|clamp<1:3|×16|tier-budget);
//   estimateFlexibleCost (invalid-dims throw|area below/within/above table|auto→high|invalid-quality throw);
//   computeWarnings (supported|unsupported-with/without-consequence|stretch|NEVER_WARN|provided-filter).
// Phase 2 boundaries: AR exactly 3:1 / just over; edge<3840 ceiling; ×16 at odd inputs; count via Number().
// Skipped: security (numeric/enum inputs only, no injection surface — pure math/string); state/dependency
//   (stateless pure); contract (consumer = gen.cjs, covered in gen.test.ts); regression (new module).

describe("UNIVERSAL_PARAMS + DEFAULTS (the contract)", () => {
  it("is a frozen non-empty array including the core flags", () => {
    expect(Array.isArray(UNIVERSAL_PARAMS)).toBe(true);
    expect(UNIVERSAL_PARAMS).toContain("ar");
    expect(UNIVERSAL_PARAMS).toContain("use");
    expect(UNIVERSAL_PARAMS).toContain("tier");
    expect(UNIVERSAL_PARAMS).toContain("max-cost-usd");
    expect(Object.isFrozen(UNIVERSAL_PARAMS)).toBe(true);
  });
  it("DEFAULTS match the spec (1:1, standard, png, gpt-image-2, $1 cap)", () => {
    expect(DEFAULTS.ar).toBe("1:1");
    expect(DEFAULTS.tier).toBe("standard");
    expect(DEFAULTS.format).toBe("png");
    expect(DEFAULTS.use).toBe("gpt-image-2");
    expect(DEFAULTS["max-cost-usd"]).toBe(1.0);
  });
});

describe("parseImageArgs", () => {
  it("returns defaults for empty argv", () => {
    const { options, provided } = parseImageArgs([]);
    expect(options.ar).toBe("1:1");
    expect(options.tier).toBe("standard");
    expect(provided.size).toBe(0);
  });
  it("joins positional tokens into the prompt", () => {
    const { options } = parseImageArgs(["a", "calm", "lake"]);
    expect(options.prompt).toBe("a calm lake");
  });
  it("--key=value sets the value and records provided", () => {
    const { options, provided } = parseImageArgs(["--ar=16:9", "--tier=high"]);
    expect(options.ar).toBe("16:9");
    expect(options.tier).toBe("high");
    expect(provided.has("ar")).toBe(true);
    expect(provided.has("tier")).toBe(true);
  });
  it("coerces numeric flags via Number()", () => {
    const { options } = parseImageArgs(["--count=3", "--max-cost-usd=0.5"]);
    expect(options.count).toBe(3);
    expect(options["max-cost-usd"]).toBe(0.5);
  });
  it("treats bare bool flags as true; --flag=false as false", () => {
    expect(parseImageArgs(["--dry-run"]).options["dry-run"]).toBe(true);
    expect(parseImageArgs(["--enhance"]).options.enhance).toBe(true);
    expect(parseImageArgs(["--dry-run=false"]).options["dry-run"]).toBe(false);
    expect(parseImageArgs(["--enhance=no"]).options.enhance).toBe(false);
  });
  it("records unknown flags (forward-compat, never throws)", () => {
    const { options, provided } = parseImageArgs(["--totally-made-up=x"]);
    expect(provided.has("totally-made-up")).toBe(true);
    expect(options["totally-made-up"]).toBe("x");
  });
  it("does not overwrite an explicit prompt with positional", () => {
    const { options } = parseImageArgs(["--prompt=explicit", "positional", "text"]);
    expect(options.prompt).toBe("explicit");
  });
});

describe("tierToQuality", () => {
  it("maps the three tiers", () => {
    expect(tierToQuality("draft")).toBe("low");
    expect(tierToQuality("standard")).toBe("medium");
    expect(tierToQuality("high")).toBe("high");
  });
  it("unknown tier → medium (never throws on a convenience flag)", () => {
    expect(tierToQuality("ultra")).toBe("medium");
    expect(tierToQuality(undefined)).toBe("medium");
  });
});

describe("round16", () => {
  it("rounds to the nearest multiple of 16", () => {
    expect(round16(1024)).toBe(1024);
    expect(round16(1020)).toBe(1024);
    expect(round16(1000)).toBe(1008); // 62.5 → 63 → 1008
  });
  it("clamps to MIN_EDGE (256) and MAX_EDGE (<3840)", () => {
    expect(round16(10)).toBe(256);
    expect(round16(99999)).toBe(MAX_EDGE);
    expect(MAX_EDGE % 16).toBe(0);
    expect(MAX_EDGE).toBeLessThan(3840);
  });
});

describe("resolveAspectRatio", () => {
  it("square 1:1 standard → 1024x1024, no clamp", () => {
    const r = resolveAspectRatio("1:1", "standard");
    expect(r.size).toBe("1024x1024");
    expect(r.clamped).toBe(false);
    expect(r.warnings).toEqual([]);
  });
  it("16:9 high → 2048x1152 (matches deepask img-slide), edges ×16", () => {
    const r = resolveAspectRatio("16:9", "high");
    expect(r.size).toBe("2048x1152");
    expect(r.width % 16).toBe(0);
    expect(r.height % 16).toBe(0);
  });
  it("portrait 9:16 high → 1152x2048 (taller than wide)", () => {
    const r = resolveAspectRatio("9:16", "high");
    expect(r.width).toBeLessThan(r.height);
    expect(r.size).toBe("1152x2048");
  });
  it("tier budgets: draft/standard long-edge 1024, high 2048", () => {
    expect(TIER_TO_LONG_EDGE.draft).toBe(1024);
    expect(TIER_TO_LONG_EDGE.standard).toBe(1024);
    expect(TIER_TO_LONG_EDGE.high).toBe(2048);
  });
  it("clamps AR above 3:1 and warns (exactly 3:1 does NOT clamp)", () => {
    const exact = resolveAspectRatio("3:1", "high");
    expect(exact.clamped).toBe(false);
    const over = resolveAspectRatio("5:1", "high");
    expect(over.clamped).toBe(true);
    expect(over.warnings.join(" ")).toMatch(/3:1 limit/);
    // effective ratio must not exceed 3 after clamp+rounding (allow ×16 rounding slack)
    expect(over.width / over.height).toBeLessThanOrEqual(MAX_AR + 0.05);
  });
  it("clamps AR below 1:3 (extreme portrait) and warns", () => {
    const r = resolveAspectRatio("1:5", "high");
    expect(r.clamped).toBe(true);
    expect(r.height / r.width).toBeLessThanOrEqual(MAX_AR + 0.05);
  });
  it("malformed --ar falls back to 1:1 + warning (never throws)", () => {
    const r = resolveAspectRatio("not-a-ratio", "standard");
    expect(r.size).toBe("1024x1024");
    expect(r.warnings.join(" ")).toMatch(/not "W:H"/);
  });
  it("non-positive edge (16:0) falls back to 1:1 + warning", () => {
    const r = resolveAspectRatio("16:0", "standard");
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.size).toBe("1024x1024");
  });
  it("never produces an edge ≥ 3840", () => {
    for (const ar of ["1:1", "3:1", "16:9", "1:3", "21:9"]) {
      const r = resolveAspectRatio(ar, "high");
      expect(r.width).toBeLessThan(3840);
      expect(r.height).toBeLessThan(3840);
    }
  });
});

// Regression (All-Edge-Cases Phase 1F + 2L). gpt-image-2 enforces a MINIMUM pixel
// budget (an area floor), not just a max edge. Pre-fix, 16:9 at standard tier resolved
// to 1024x576 (0.59 MP), which the OpenAI Images API rejects 400 with "Requested
// resolution is below the current minimum pixel budget" — observed LIVE 2026-06-02 on
// `/image "...contratubex ad" --ar=16:9`. The dry-run couldn't catch it (no API call)
// and no prior test covered a standard-tier WIDE AR. resolveAspectRatio now lifts the
// long edge so every AR ≤ 3:1, at every tier, clears MIN_PIXEL_BUDGET — ratio preserved,
// warned, never silent.
describe("resolveAspectRatio — minimum pixel budget (regression: gpt-image-2 area floor)", () => {
  it("exposes MIN_PIXEL_BUDGET as the known-good 1024x1024 area (~1 MP)", () => {
    expect(MIN_PIXEL_BUDGET).toBe(1024 * 1024);
  });

  it("regression (2026-06-02): 16:9 standard no longer yields the rejected 1024x576", () => {
    const r = resolveAspectRatio("16:9", "standard");
    expect(r.size).not.toBe("1024x576");
    expect(r.width * r.height).toBeGreaterThanOrEqual(MIN_PIXEL_BUDGET);
  });

  it("16:9 standard upscales to 1376x768 and warns honestly (never silent)", () => {
    const r = resolveAspectRatio("16:9", "standard");
    expect(r.size).toBe("1376x768");
    expect(r.warnings.join(" ")).toMatch(/minimum/);
    expect(r.warnings.join(" ")).toMatch(/1376x768/);
  });

  it("every AR ≤ 3:1 at every tier clears MIN_PIXEL_BUDGET (the invariant)", () => {
    for (const ar of ["1:1", "4:3", "3:2", "16:9", "3:1", "2:3", "9:16", "1:3"]) {
      for (const tier of ["draft", "standard", "high"]) {
        const r = resolveAspectRatio(ar, tier);
        expect(r.width * r.height).toBeGreaterThanOrEqual(MIN_PIXEL_BUDGET);
      }
    }
  });

  it("the upscale preserves the requested aspect ratio (within ×16 rounding slack)", () => {
    const r = resolveAspectRatio("16:9", "standard");
    expect(r.width / r.height).toBeCloseTo(16 / 9, 1);
  });

  it("portrait 9:16 standard upscales symmetrically (taller than wide, ≥ budget, warns)", () => {
    const r = resolveAspectRatio("9:16", "standard");
    expect(r.width).toBeLessThan(r.height);
    expect(r.width * r.height).toBeGreaterThanOrEqual(MIN_PIXEL_BUDGET);
    expect(r.warnings.join(" ")).toMatch(/minimum/);
  });

  it("draft tier (same long-edge budget as standard) upscales 16:9 identically", () => {
    expect(resolveAspectRatio("16:9", "draft").size).toBe(resolveAspectRatio("16:9", "standard").size);
  });

  it("high tier wide ARs already clear the floor → NOT upscaled, NO budget warning", () => {
    const r = resolveAspectRatio("16:9", "high");
    expect(r.size).toBe("2048x1152"); // identical to pre-fix
    expect(r.warnings.join(" ")).not.toMatch(/minimum/);
  });

  it("square 1:1 standard sits exactly at the floor → valid, no budget warning (boundary ==, not <)", () => {
    const r = resolveAspectRatio("1:1", "standard");
    expect(r.width * r.height).toBe(MIN_PIXEL_BUDGET);
    expect(r.warnings.join(" ")).not.toMatch(/minimum/);
  });

  it("upscaled edges stay ×16 and strictly below MAX_EDGE (incl. extreme 3:1 standard)", () => {
    for (const ar of ["16:9", "9:16", "3:1", "1:3", "21:9"]) {
      const r = resolveAspectRatio(ar, "standard");
      expect(r.width % 16).toBe(0);
      expect(r.height % 16).toBe(0);
      expect(r.width).toBeLessThan(3840);
      expect(r.height).toBeLessThan(3840);
    }
  });

  it("budget upscale composes with the >3:1 clamp (5:1 standard → clamp AND raise, both warnings)", () => {
    const r = resolveAspectRatio("5:1", "standard");
    expect(r.clamped).toBe(true);
    expect(r.width * r.height).toBeGreaterThanOrEqual(MIN_PIXEL_BUDGET);
    const joined = r.warnings.join(" ");
    expect(joined).toMatch(/3:1 limit/); // clamp warning preserved
    expect(joined).toMatch(/minimum/); // budget warning added
  });
});

describe("estimateFlexibleCost", () => {
  it("throws on non-positive / non-finite dims", () => {
    expect(() => estimateFlexibleCost({ width: 0, height: 100, quality: "medium" })).toThrow(/positive finite/);
    expect(() => estimateFlexibleCost({ width: NaN, height: 100, quality: "medium" })).toThrow();
    expect(() => estimateFlexibleCost({ width: -1024, height: 1024, quality: "low" })).toThrow();
  });
  it("1024x1024 medium ≈ COST_TABLE anchor ($0.042)", () => {
    const r = estimateFlexibleCost({ width: 1024, height: 1024, quality: "medium" });
    expect(r.usd).toBeCloseTo(0.042, 3);
    expect(r.isEstimate).toBe(true);
  });
  it("2048x1152 high ≈ COST_TABLE anchor ($0.40)", () => {
    const r = estimateFlexibleCost({ width: 2048, height: 1152, quality: "high" });
    expect(r.usd).toBeCloseTo(0.4, 2);
  });
  it("monotonic in area at a fixed quality (bigger costs more)", () => {
    const small = estimateFlexibleCost({ width: 512, height: 512, quality: "medium" }).usd;
    const mid = estimateFlexibleCost({ width: 1024, height: 1024, quality: "medium" }).usd;
    const big = estimateFlexibleCost({ width: 2048, height: 2048, quality: "medium" }).usd;
    expect(small).toBeLessThan(mid);
    expect(mid).toBeLessThan(big);
  });
  it("monotonic in quality at a fixed area (high ≥ medium ≥ low)", () => {
    const dims = { width: 1024, height: 1024 };
    const low = estimateFlexibleCost({ ...dims, quality: "low" }).usd;
    const med = estimateFlexibleCost({ ...dims, quality: "medium" }).usd;
    const high = estimateFlexibleCost({ ...dims, quality: "high" }).usd;
    expect(low).toBeLessThanOrEqual(med);
    expect(med).toBeLessThanOrEqual(high);
  });
  it("'auto' quality normalizes to 'high' (conservative)", () => {
    const auto = estimateFlexibleCost({ width: 1024, height: 1024, quality: "auto" });
    const high = estimateFlexibleCost({ width: 1024, height: 1024, quality: "high" });
    expect(auto.usd).toBe(high.usd);
    expect(auto.quality).toBe("high");
  });
  it("invalid quality throws (via costQuality)", () => {
    expect(() => estimateFlexibleCost({ width: 1024, height: 1024, quality: "ultra" })).toThrow();
  });
  it("extrapolates above the table's largest area without crashing", () => {
    const r = estimateFlexibleCost({ width: 3200, height: 3200, quality: "high" });
    expect(r.usd).toBeGreaterThan(0.4);
    expect(Number.isFinite(r.usd)).toBe(true);
  });
});

describe("computeWarnings (supports/WARN — never silent-drop)", () => {
  const caps = {
    supports: ["ar", "tier", "count", "format", "enhance"],
    supports_stretch: ["ref", "mask"],
    unsupported_warn: ["seed", "stylize", "background"],
  };
  it("no warning for a supported flag", () => {
    const w = computeWarnings(caps, new Set(["enhance"]));
    expect(w).toEqual([]);
  });
  it("consequence-honest warning for --seed (names non-reproducibility)", () => {
    const w = computeWarnings(caps, new Set(["seed"]));
    expect(w.length).toBe(1);
    expect(w[0]).toMatch(/NOT reproducible/);
  });
  it("stretch param → 'requires the edits endpoint' warning", () => {
    const w = computeWarnings(caps, new Set(["ref"]));
    expect(w[0]).toMatch(/edits endpoint/);
  });
  it("unsupported flag with no consequence entry → generic warning", () => {
    // `deck` is not in this synthetic cap set, not in NEVER_WARN, and has no
    // CONSEQUENCE entry → exercises the generic fallback branch.
    const w = computeWarnings(caps, new Set(["deck"]));
    expect(w[0]).toMatch(/not supported/);
  });
  it("flag WITH a consequence entry names the consequence (not the generic msg)", () => {
    const w = computeWarnings(caps, new Set(["weird"]));
    expect(w[0]).toMatch(/Midjourney-only/);
  });
  it("NEVER_WARN plumbing flags (prompt/use/out/tier/ar) produce no warning", () => {
    const w = computeWarnings(caps, new Set(["prompt", "use", "out", "tier", "ar", "max-cost-usd", "dry-run"]));
    expect(w).toEqual([]);
  });
  it("only warns on EXPLICITLY-provided flags", () => {
    // seed is in unsupported_warn but NOT provided → no warning.
    const w = computeWarnings(caps, new Set(["enhance"]));
    expect(w).toEqual([]);
  });
  it("empty/absent caps → generic warnings for provided generation flags", () => {
    const w = computeWarnings({}, new Set(["seed"]));
    expect(w.length).toBe(1);
  });
});
