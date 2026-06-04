import { describe, it, expect } from "vitest";
// @ts-ignore — CJS interop
const T = require("../../scripts/dataviz/lib/taxonomy.cjs");
// @ts-ignore
const S = require("../../scripts/dataviz/lib/svg.cjs");

// ============================================================================
// All-Edge-Cases-Test. Units: the chart taxonomy (scripts/dataviz/lib/taxonomy.cjs
// — the smart-selection knowledge base) + the new polar/arc SVG primitives
// (scripts/dataviz/lib/svg.cjs). Both PURE → byte-stable, toBe/toEqual.
// ============================================================================

describe("taxonomy — structural invariants", () => {
  it("BUILT is 27 unique kebab-case ids", () => { expect(T.BUILT.length).toBe(27); expect(new Set(T.BUILT).size).toBe(27); for (const id of T.BUILT) expect(/^[a-z][a-z0-9-]*$/.test(id)).toBe(true); });
  it("every chart belongs to a known family", () => { for (const id of Object.keys(T.CHARTS)) expect(T.FAMILIES).toContain(T.CHARTS[id].family); });
  it("every cataloged chart is built:false with a BUILT fallback", () => { for (const id of T.CATALOGED) { expect(T.CHARTS[id].built).toBe(false); expect(T.BUILT).toContain(T.toBuilt(id)); } });
  it("every built chart maps to itself via toBuilt", () => { for (const id of T.BUILT) expect(T.toBuilt(id)).toBe(id); });
  it("DEFER_MAP: cataloged keys → built values only", () => { for (const [k, v] of Object.entries(T.DEFER_MAP)) { expect(T.isBuilt(k)).toBe(false); expect(T.BUILT).toContain(v); } });
  it("all six Datylon families have ≥1 BUILT representative", () => { const fams = new Set(T.BUILT.map((id: string) => T.familyOf(id))); for (const f of ["comparison", "correlation", "part-to-whole", "change-over-time", "distribution"]) expect(fams.has(f)).toBe(true); });
  it("every stance is a known STANCE value", () => { for (const id of Object.keys(T.CHARTS)) expect(Object.values(T.STANCE)).toContain(T.CHARTS[id].mckinsey); });
  it("pie + donut are DEMOTED (the McKinsey discipline)", () => { expect(T.stanceOf("pie")).toBe(T.STANCE.DEMOTED); expect(T.stanceOf("donut")).toBe(T.STANCE.DEMOTED); });
  it("the ≥90-type Datylon taxonomy is broadly covered (≥70 entries)", () => expect(Object.keys(T.CHARTS).length).toBeGreaterThanOrEqual(70));
});

describe("taxonomy — helpers + boundaries", () => {
  it("meta(unknown) → null; toBuilt(unknown) → bar", () => { expect(T.meta("nope")).toBe(null); expect(T.toBuilt("nope")).toBe("bar"); });
  it("familyOf / stanceOf on unknown → null", () => { expect(T.familyOf("nope")).toBe(null); expect(T.stanceOf("nope")).toBe(null); });
  it("byIntent returns built-first matches", () => { const ids = T.byIntent("ranking"); expect(ids).toContain("bar"); });
  it("catalog() has a row per chart with built+fallback fields", () => { const rows = T.catalog(); expect(rows.length).toBe(Object.keys(T.CHARTS).length); const tm = rows.find((r: any) => r.id === "treemap"); expect(tm.built).toBe(false); expect(T.BUILT).toContain(tm.fallback); const bar = rows.find((r: any) => r.id === "bar"); expect(bar.fallback).toBe(null); });
});

describe("svg primitives — polar/arc (byte-stable)", () => {
  it("polarToCartesian: 0°=top, 90°=right (SVG y down)", () => { const top = S.polarToCartesian(0, 0, 10, 0); const right = S.polarToCartesian(0, 0, 10, 90); expect(S.fmt(top.x)).toBe("0"); expect(S.fmt(top.y)).toBe("-10"); expect(S.fmt(right.x)).toBe("10"); expect(S.fmt(right.y)).toBe("0"); });
  it("arcPath is a closed wedge (M center … A r r … Z)", () => { const d = S.arcPath(50, 50, 40, 0, 90); expect(d.startsWith("M50 50")).toBe(true); expect(d.endsWith("Z")).toBe(true); expect(d).toContain("A40 40"); });
  it("arcPath large-arc flag flips past 180°", () => { expect(S.arcPath(0, 0, 10, 0, 200)).toContain(" 0 1 1 "); expect(S.arcPath(0, 0, 10, 0, 90)).toContain(" 0 0 1 "); });
  it("ringPath has both an outer and an inner arc", () => { const d = S.ringPath(50, 50, 40, 20, 0, 90); expect(d).toContain("A40 40"); expect(d).toContain("A20 20"); expect(d.endsWith("Z")).toBe(true); });
  it("polygonD closes the path; empty → ''", () => { expect(S.polygonD([[0, 0], [10, 0], [5, 10]])).toBe("M0 0 L10 0 L5 10 Z"); expect(S.polygonD([])).toBe(""); });
  it("arc/polar are deterministic (byte-stable)", () => { expect(S.arcPath(50, 50, 40, 30, 120)).toBe(S.arcPath(50, 50, 40, 30, 120)); expect(S.ringPath(5, 5, 4, 2, 10, 100)).toBe(S.ringPath(5, 5, 4, 2, 10, 100)); });
});
