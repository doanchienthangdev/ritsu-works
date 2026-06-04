import { describe, it, expect } from "vitest";
// @ts-ignore — CJS interop
const { selectChart, BUILT, DEFER_MAP } = require("../../scripts/dataviz/select.cjs");

// ============================================================================
// All-Edge-Cases-Test. Unit: selectChart(message, hints) -> {chartType, ideal, reason}
// (scripts/dataviz/select.cjs — the Zelazny message→chart-type matcher, PURE).
// Branches: each of the 10 comparison rules, the 2 hard guard-rails (entity-x⇒item,
// >6 slices⇒bar), vs./% disambiguation, deferred→nearest map, fallback.
// ============================================================================

const ct = (m: string, h: any = {}) => selectChart(m, h).chartType;

describe("selectChart — comparison-type matcher", () => {
  it("ranking/item → bar", () => { expect(ct("top 5 products by revenue")).toBe("bar"); expect(ct("which region leads on sales")).toBe("bar"); });
  it("time-series few periods → column", () => expect(ct("revenue grew over the year", { has_time_axis: true, n_periods: 5 })).toBe("column"));
  it("time-series many periods → line", () => expect(ct("the trend since 2015", { has_time_axis: true, n_periods: 11 })).toBe("line"));
  it("time-series multi-series → line", () => expect(ct("revenue change over time", { has_time_axis: true, n_periods: 4, n_series: 3 })).toBe("line"));
  it("component over time → stacked100", () => expect(ct("share of adoption by function over time", { has_time_axis: true })).toBe("stacked100"));
  it("component single period → bar (pie demoted)", () => { const r = selectChart("composition of revenue by segment", { n_categories: 4 }); expect(r.chartType).toBe("bar"); expect(r.ideal).toBe("pie"); expect(r.reason).toMatch(/demote/i); });
  it("correlation → scatter", () => { expect(ct("relationship between spend and growth")).toBe("scatter"); expect(ct("anything", { n_measures: 2 })).toBe("scatter"); });
  it("waterfall via bridge word", () => { expect(ct("EBIT bridge from base to target")).toBe("waterfall"); expect(ct("how did we get from $100M to $140M")).toBe("waterfall"); });
  it("waterfall via has_negatives", () => expect(ct("the drivers of margin", { has_negatives: true })).toBe("waterfall"));
  it("leader-vs-laggard triad → grouped", () => expect(ct("winners vs laggards on EBIT", { n_series: 2 })).toBe("grouped"));
});

describe("selectChart — guard-rails", () => {
  it("GUARD #1: 'from 2020 to 2025' is a time range, NOT a waterfall", () => expect(ct("revenue grew from 2020 to 2025", { has_time_axis: true, n_periods: 6 })).toBe("column"));
  it("GUARD #1: entity x-axis reads like a trend but is an Item → bar", () => expect(ct("market share by salesperson", { has_time_axis: false })).toBe("bar"));
  it("GUARD #2: component is rendered as a ranked bar (pie demoted), not pie", () => expect(BUILT).not.toContain("pie"));
});

describe("selectChart — deferred ideals map to nearest built", () => {
  it("two-share-dimensions ideal marimekko → stacked100 (built)", () => { const r = selectChart("market size and share by segment"); expect(r.ideal).toBe("marimekko"); expect(r.chartType).toBe("stacked100"); expect(r.reason).toMatch(/v0\.2|nearest/i); });
  it("three measures ideal bubble → scatter (built)", () => { const r = selectChart("size by spend and growth", { n_measures: 3 }); expect(r.ideal).toBe("bubble"); expect(r.chartType).toBe("scatter"); });
  it("frequency ideal histogram → column (built)", () => { const r = selectChart("the distribution of deal sizes across buckets"); expect(r.ideal).toBe("histogram"); expect(r.chartType).toBe("column"); });
  it("every BUILT chartType is a real built type", () => { for (const v of Object.values(DEFER_MAP)) expect(BUILT).toContain(v); });
});

describe("selectChart — boundaries", () => {
  it("empty message → fallback bar", () => expect(ct("")).toBe("bar"));
  it("null message → fallback bar (no throw)", () => expect(ct(null as any)).toBe("bar"));
  it("non-string message → fallback bar", () => expect(selectChart(42 as any).chartType).toBe("bar"));
  it("no trigger word → fallback bar", () => expect(ct("an opaque statement with no signal")).toBe("bar"));
  it("returns the message-driven ideal even when mapped (reason explains)", () => { const r = selectChart("size and share by player"); expect(r.ideal).not.toBe(r.chartType); expect(r.reason).toBeTruthy(); });
});
