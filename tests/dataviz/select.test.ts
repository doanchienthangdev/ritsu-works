import { describe, it, expect } from "vitest";
// @ts-ignore — CJS interop
const { selectChart, resolve, detectIntent, BUILT, DEFER_MAP } = require("../../scripts/dataviz/select.cjs");

// ============================================================================
// All-Edge-Cases-Test. Unit: selectChart(message, hints, context) ->
// {chartType, ideal, family, intent, reason, alternatives[], warnings[], confidence}
// (scripts/dataviz/select.cjs — the v0.2 intelligent, context-aware selector, PURE).
// Branches: 18 intent rules, the resolve refinements (component/timeseries/stacked100
// → pie|area|stacked-area|line|column|lollipop), the guard-rails (entity-x⇒item,
// pie/donut demote, grouped/radar caps), alternatives, confidence, context, fallback.
// v0.2 INTENTIONALLY changes 4 v0.1 outcomes (marimekko/bubble/histogram now BUILT;
// pie now buildable but auto-demoted) — assertions updated to the stronger behavior,
// never weakened (per the global All-Edge-Cases rule).
// ============================================================================

const ct = (m: string, h: any = {}, c: any = {}) => selectChart(m, h, c).chartType;

describe("selectChart — comparison-type matcher (v0.1 cases preserved)", () => {
  it("ranking/item → bar", () => { expect(ct("top 5 products by revenue")).toBe("bar"); expect(ct("which region leads on sales")).toBe("bar"); });
  it("time-series few periods → column", () => expect(ct("revenue grew over the year", { has_time_axis: true, n_periods: 5 })).toBe("column"));
  it("time-series many periods → line", () => expect(ct("the trend since 2015", { has_time_axis: true, n_periods: 11 })).toBe("line"));
  it("time-series multi-series → line", () => expect(ct("revenue change over time", { has_time_axis: true, n_periods: 4, n_series: 3 })).toBe("line"));
  it("component over time → stacked100", () => expect(ct("share of adoption by function over time", { has_time_axis: true })).toBe("stacked100"));
  it("component single period → bar (pie auto-demoted)", () => { const r = selectChart("composition of revenue by segment", { n_categories: 4 }); expect(r.chartType).toBe("bar"); expect(r.ideal).toBe("pie"); expect(r.reason).toMatch(/demote/i); });
  it("correlation → scatter", () => { expect(ct("relationship between spend and growth")).toBe("scatter"); expect(ct("anything", { n_measures: 2 })).toBe("scatter"); });
  it("waterfall via bridge word", () => { expect(ct("EBIT bridge from base to target")).toBe("waterfall"); expect(ct("how did we get from $100M to $140M")).toBe("waterfall"); });
  it("waterfall via has_negatives", () => expect(ct("the drivers of margin", { has_negatives: true })).toBe("waterfall"));
  it("leader-vs-laggard triad → grouped", () => expect(ct("winners vs laggards on EBIT", { n_series: 2 })).toBe("grouped"));
});

describe("selectChart — guard-rails", () => {
  it("GUARD #1: 'from 2020 to 2025' is a time range, NOT a waterfall", () => expect(ct("revenue grew from 2020 to 2025", { has_time_axis: true, n_periods: 6 })).toBe("column"));
  it("GUARD #1: entity x-axis reads like a trend but is an Item → bar", () => expect(ct("market share by salesperson", { has_time_axis: false })).toBe("bar"));
  it("GUARD #2: pie is now BUILDABLE but auto-mode DEMOTES it to a ranked bar", () => { expect(BUILT).toContain("pie"); const r = selectChart("composition by segment", { n_categories: 8 }); expect(r.chartType).toBe("bar"); expect(r.warnings.some((w: string) => /demot/i.test(w))).toBe(true); });
  it("anti-pattern: >6 slices warns even when relevant", () => { const r = selectChart("composition by segment", { n_categories: 9 }); expect(r.warnings.some((w: string) => /9 slices|too many/i.test(w))).toBe(true); });
  it("anti-pattern: too many grouped series warns", () => { const r = selectChart("winners vs others", { n_series: 7 }); expect(r.chartType).toBe("grouped"); expect(r.warnings.some((w: string) => /series|small-multiples/i.test(w))).toBe(true); });
});

describe("selectChart — NEW v0.2 intents", () => {
  it("funnel", () => expect(ct("conversion funnel from signup to paid")).toBe("funnel"));
  it("bullet via target word", () => expect(ct("Q3 revenue vs target by region")).toBe("bullet"));
  it("bullet via has_target hint", () => expect(ct("revenue by region", { has_target: true })).toBe("bullet"));
  it("diverging via Likert words", () => expect(ct("satisfaction: agree vs disagree by cohort")).toBe("diverging"));
  it("quadrant via 2x2", () => { expect(ct("a 2x2 positioning matrix of competitors")).toBe("quadrant"); expect(ct("impact vs effort prioritization matrix")).toBe("quadrant"); });
  it("radar via profile words", () => expect(ct("capability profile across 5 dimensions")).toBe("radar"));
  it("box via spread/quartiles", () => { expect(ct("the spread and quartiles of deal sizes")).toBe("box"); expect(ct("median and range with outliers by class")).toBe("box"); });
  it("histogram via distribution/buckets", () => expect(ct("the distribution of deal sizes across buckets")).toBe("histogram"));
  it("slope via before/after with ≥4 items over 2 periods", () => expect(ct("market share before and after launch", { n_periods: 2, n_series: 5 })).toBe("slope"));
  it("dumbbell via gap word + 2 series", () => expect(ct("the pay gap between men and women by role", { n_series: 2 })).toBe("dumbbell"));
  it("bubble via 3 measures (size dimension)", () => expect(ct("market map", { has_size: true })).toBe("bubble"));
  it("area via magnitude + single series time", () => expect(ct("cumulative volume over time", { has_time_axis: true, n_series: 1 })).toBe("area"));
  it("stacked-area via absolute composition over time", () => expect(ct("volume composition by segment over time", { has_time_axis: true })).toBe("stacked-area"));
});

describe("selectChart — v0.1 deferred ideals are now BUILT (intentional v0.2 change)", () => {
  it("two-share-dimensions → marimekko (built natively now, not stacked100)", () => { const r = selectChart("market size and share by segment"); expect(r.ideal).toBe("marimekko"); expect(r.chartType).toBe("marimekko"); });
  it("three measures → bubble (built natively now, not scatter)", () => { const r = selectChart("size by spend and growth", { n_measures: 3 }); expect(r.ideal).toBe("bubble"); expect(r.chartType).toBe("bubble"); });
  it("frequency → histogram (built natively now, not column)", () => { const r = selectChart("the distribution of deal sizes across buckets"); expect(r.ideal).toBe("histogram"); expect(r.chartType).toBe("histogram"); });
  it("every DEFER_MAP fallback is a real BUILT type", () => { for (const v of Object.values(DEFER_MAP)) expect(BUILT).toContain(v); });
  it("BUILT has 27 types and contains the new ones", () => { expect(BUILT.length).toBe(27); for (const t of ["pie", "donut", "marimekko", "bubble", "heatmap", "dumbbell", "lollipop", "dot", "slope", "bullet", "diverging", "histogram", "funnel", "quadrant", "radar", "box", "area", "stacked-area"]) expect(BUILT).toContain(t); });
});

describe("selectChart — explainability contract", () => {
  it("returns chartType, ideal, family, intent, reason, alternatives, warnings, confidence", () => {
    const r = selectChart("conversion funnel signup to paid");
    expect(typeof r.chartType).toBe("string"); expect(typeof r.ideal).toBe("string");
    expect(typeof r.family).toBe("string"); expect(typeof r.intent).toBe("string");
    expect(typeof r.reason).toBe("string"); expect(r.reason.length).toBeGreaterThan(0);
    expect(Array.isArray(r.alternatives)).toBe(true); expect(Array.isArray(r.warnings)).toBe(true);
    expect(["high", "medium", "low", "forced"]).toContain(r.confidence);
  });
  it("alternatives are BUILT types, exclude the chosen chartType, carry a 'why'", () => {
    const r = selectChart("top 5 products by revenue");
    expect(r.alternatives.length).toBeGreaterThan(0);
    for (const a of r.alternatives) { expect(BUILT).toContain(a.type); expect(a.type).not.toBe(r.chartType); expect(typeof a.why).toBe("string"); }
  });
  it("confidence: high for a strong unambiguous match", () => expect(selectChart("conversion funnel signup to paid").confidence).toBe("high"));
  it("confidence: medium when the ideal is remapped (pie→bar demote)", () => expect(selectChart("composition by segment", { n_categories: 4 }).confidence).toBe("medium"));
  it("confidence: low when nothing matched (item fallback, no trigger)", () => expect(selectChart("an opaque statement with no signal").confidence).toBe("low"));
});

describe("selectChart — context (audience) modifier", () => {
  it("exec audience + long ranking → lollipop (space-efficient)", () => expect(ct("ranking of all stores", { n_categories: 20 }, { audience: "exec" })).toBe("lollipop"));
  it("general audience + same ranking → bar (the safe default)", () => expect(ct("ranking of all stores", { n_categories: 20 }, { audience: "general" })).toBe("bar"));
});

describe("selectChart — boundaries", () => {
  it("empty message → fallback bar", () => expect(ct("")).toBe("bar"));
  it("null message → fallback bar (no throw)", () => expect(ct(null as any)).toBe("bar"));
  it("non-string message → fallback bar", () => expect(selectChart(42 as any).chartType).toBe("bar"));
  it("whitespace-only message → fallback bar", () => expect(ct("   \t  ")).toBe("bar"));
  it("no trigger word → fallback bar, low confidence", () => { const r = selectChart("an opaque statement with no signal"); expect(r.chartType).toBe("bar"); expect(r.confidence).toBe("low"); });
  it("hints null / non-object are tolerated", () => { expect(selectChart("top 5", null as any).chartType).toBe("bar"); expect(selectChart("top 5", "x" as any).chartType).toBe("bar"); });
  it("context null is tolerated", () => expect(selectChart("top 5", {}, null as any).chartType).toBe("bar"));
});

describe("detectIntent + resolve — internals", () => {
  it("detectIntent falls back to 'item' on no match", () => expect(detectIntent("nothing here", {})).toBe("item"));
  it("resolve maps a cataloged ideal to its built fallback with a reason", () => { const r = resolve("component", "treemap of folders", { has_time_axis: false, n_categories: 3 }, {}); expect(BUILT).toContain(r.chartType); });
});

describe("selectChart — tightened heuristics (review hardening)", () => {
  it("bare 'customer satisfaction by region' is NOT forced to diverging", () => expect(selectChart("customer satisfaction by region").chartType).not.toBe("diverging"));
  it("explicit agree/disagree still → diverging", () => expect(selectChart("agree vs disagree by cohort").chartType).toBe("diverging"));
  it("two-period 'both X and Y by dimension' is NOT forced to marimekko", () => expect(selectChart("compare both this year and last year by dimension", { n_periods: 2 }).intent).not.toBe("marimekko"));
  it("size-and-share still → marimekko", () => expect(selectChart("market size and share by segment").chartType).toBe("marimekko"));
});
