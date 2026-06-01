import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention; see deepask tests)
const { estimateRoute, renderPreview, FORGE_OVERHEAD_USD, ROUTE_BUILD, VALID_VERDICTS } = require("../../scripts/forge/dry-run-preview.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Functions: estimateRoute (route→cost/tier) +
// renderPreview (the --dry-run text; spends nothing).
// Phase 1: estimateRoute(route) branches = invalid→throw | extend | net-new | surface.
//   renderPreview(plan) branches = bad plan/need/sources/gates/route→throw | anyReject→REJECT
//   block | else→PASS block (+ entity label on extend).
// Phase 2: each route; total = overhead+build (rounding); surface build=0; REJECT hides
//   route/cost; empty sources; need trimmed; gate ✓/✗ marks; full validation matrix.
// Skipped: state (stateless pure fns); security (no exec surface — labels only); metamorphic
//   (single consumer, the orchestrator skill); regression (new code).

const PASS = (gate: number, reason = "ok") => ({ gate, verdict: "PASS", reason });

describe("estimateRoute", () => {
  it("extend → Tier B, build $0.70, /update delegate", () => {
    const e = estimateRoute("extend");
    expect(e.hitlTier).toBe("B");
    expect(e.buildUsd).toStrictEqual({ min: 0.7, max: 0.7 });
    expect(e.delegate).toMatch(/\/update/);
  });
  it("net-new → Tier C, build $3-5, /cla delegate", () => {
    const e = estimateRoute("net-new");
    expect(e.hitlTier).toBe("C");
    expect(e.buildUsd).toStrictEqual({ min: 3.0, max: 5.0 });
    expect(e.delegate).toMatch(/\/cla propose/);
  });
  it("surface → Tier A, build $0 (deferred until founder picks)", () => {
    const e = estimateRoute("surface");
    expect(e.hitlTier).toBe("A");
    expect(e.buildUsd).toStrictEqual({ min: 0, max: 0 });
  });
  it("total = forge overhead + build (rounded to cents)", () => {
    expect(estimateRoute("extend").totalUsd).toStrictEqual({ min: 0.8, max: 1.0 });
    expect(estimateRoute("net-new").totalUsd).toStrictEqual({ min: 3.1, max: 5.3 });
    expect(estimateRoute("surface").totalUsd).toStrictEqual({ min: 0.1, max: 0.3 });
  });
  it("invalid route throws TypeError", () => {
    expect(() => estimateRoute("extned")).toThrow(/route must be one of/);
    expect(() => estimateRoute("")).toThrow(/route must be one of/);
    expect(() => estimateRoute(null)).toThrow(/route must be one of/);
    expect(() => estimateRoute(undefined)).toThrow(/route must be one of/);
  });
});

describe("renderPreview", () => {
  describe("PASS routes render route + cost + tier", () => {
    it("extend → shows 'extend → <entity>', delegate, Tier B, cost", () => {
      const out = renderPreview({
        need: "GTM channel scorer",
        sources: ["wiki:traction#bullseye"],
        gates: [PASS(1), PASS(2), PASS(3), PASS(4), PASS(5)],
        route: "extend",
        entity: "gtm-audit",
      });
      expect(out).toContain("extend → gtm-audit");
      expect(out).toContain("/update");
      expect(out).toContain("HITL TIER: B");
      expect(out).toMatch(/EST COST: \$0\.8/);
      expect(out).toContain("NO SPEND");
    });
    it("net-new → Tier C, /cla, $3.1-$5.3", () => {
      const out = renderPreview({
        need: "brand-new framework skill",
        sources: ["wiki:hacking-growth#ice"],
        gates: [PASS(1), PASS(2), PASS(3), PASS(4), PASS(5)],
        route: "net-new",
      });
      expect(out).toContain("ROUTE:   net-new");
      expect(out).toContain("/cla propose");
      expect(out).toContain("HITL TIER: C");
      expect(out).toMatch(/\$3\.1.\$5\.3/);
    });
  });

  describe("REJECT hides route + cost (no build)", () => {
    it("any gate REJECT → VERDICT REJECT, no ROUTE/EST COST", () => {
      const out = renderPreview({
        need: "one-off pricing study",
        sources: ["wiki:marketing-management-kotler#ch11"],
        gates: [PASS(1), PASS(2), { gate: 3, verdict: "REJECT", reason: "one-off, not recurring" }, PASS(4), PASS(5)],
        route: "net-new", // route is moot; REJECT suppresses it
      });
      expect(out).toMatch(/VERDICT: REJECT/);
      expect(out).not.toContain("EST COST");
      expect(out).toContain("knowledge stays latent");
      expect(out).toContain("✗ Gate 3");
    });
  });

  describe("rendering details", () => {
    it("empty sources → '(none assembled)'", () => {
      const out = renderPreview({ need: "x", sources: [], gates: [PASS(1)], route: "net-new" });
      expect(out).toContain("(none assembled)");
    });
    it("trims whitespace in need", () => {
      const out = renderPreview({ need: "  spaced need  ", sources: [], gates: [PASS(1)], route: "net-new" });
      expect(out).toContain("NEED:    spaced need");
    });
    it("PASS gates render a ✓ mark", () => {
      const out = renderPreview({ need: "x", sources: [], gates: [PASS(1, "has citation")], route: "net-new" });
      expect(out).toContain("✓ Gate 1: PASS — has citation");
    });
  });

  describe("input validation (throws TypeError)", () => {
    it("non-object plan throws", () => {
      expect(() => renderPreview(null)).toThrow(/plan must be an object/);
      expect(() => renderPreview([])).toThrow(/plan must be an object/);
    });
    it("empty/blank need throws", () => {
      expect(() => renderPreview({ need: "", sources: [], gates: [], route: "net-new" })).toThrow(/need must be a non-empty string/);
      expect(() => renderPreview({ need: "   ", sources: [], gates: [], route: "net-new" })).toThrow(/non-empty string/);
    });
    it("bad sources throws", () => {
      expect(() => renderPreview({ need: "x", sources: "a", gates: [], route: "net-new" })).toThrow(/sources must be an array of strings/);
      expect(() => renderPreview({ need: "x", sources: [1], gates: [], route: "net-new" })).toThrow(/array of strings/);
    });
    it("bad gates throw", () => {
      expect(() => renderPreview({ need: "x", sources: [], gates: "g", route: "net-new" })).toThrow(/gates must be an array/);
      expect(() => renderPreview({ need: "x", sources: [], gates: [null], route: "net-new" })).toThrow(/gates\[0\] must be an object/);
      expect(() => renderPreview({ need: "x", sources: [], gates: [{ gate: 1, verdict: "MAYBE" }], route: "net-new" })).toThrow(/verdict must be one of/);
    });
    it("invalid route throws", () => {
      expect(() => renderPreview({ need: "x", sources: [], gates: [], route: "extned" })).toThrow(/route must be one of/);
    });
  });

  describe("exported constants", () => {
    it("expose the cost model + verdict vocab", () => {
      expect(FORGE_OVERHEAD_USD).toStrictEqual({ min: 0.1, max: 0.3 });
      expect(VALID_VERDICTS).toStrictEqual(["PASS", "REJECT"]);
      expect(Object.keys(ROUTE_BUILD).sort()).toStrictEqual(["extend", "net-new", "surface"]);
    });
  });
});
