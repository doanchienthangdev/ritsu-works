import { describe, it, expect } from "vitest";
// @ts-ignore — CJS interop
const { run } = require("../../scripts/dataviz/gen.cjs");

// ============================================================================
// All-Edge-Cases-Test. Unit: scripts/dataviz/gen.cjs run() — the selection
// PROVENANCE introduced in v0.4 (LLM-native selection). run() with --dry-run is
// pure-enough (no file writes); we assert plan.select_mode + runJson.
//
// Phase 1B branches: --chart absent/auto → deterministic · --chart + --selected-by=agent
//   → agent · --chart bare → forced · cataloged --chart → nearest-built remap · invalid
//   --select-confidence → default. Phase 2J: degenerate data must not crash selection.
// ============================================================================

const DATA = '{"categories":["Reddit","YT","X"],"series":[{"name":"s","values":[40,25,12]}]}';
function plan(argv: string[]) {
  const r = run([...argv, `--data=${DATA}`, "--dry-run"]);
  expect(r.outcome).toBe("dry_run");
  return r;
}

describe("dataviz gen.cjs — v0.4 selection provenance (select_mode)", () => {
  describe("Mode A — LLM-native (the calling agent picked)", () => {
    it("--chart=bar --selected-by=agent → select_mode 'agent', intent 'llm-native', records reason", () => {
      const r = plan(["--message=rank channels", "--chart=bar", "--selected-by=agent", "--select-reason=ranking of items"]);
      expect(r.plan.select_mode).toBe("agent");
      expect(r.plan.intent).toBe("llm-native");
      expect(r.plan.chartType).toBe("bar");
      expect(r.plan.reason).toContain("ranking of items");
      expect(r.plan.confidence).toBe("high"); // default when --select-confidence omitted
      expect(r.runJson.select_mode).toBe("agent");
    });

    it("honors an explicit --select-confidence", () => {
      expect(plan(["--message=x", "--chart=bar", "--selected-by=agent", "--select-confidence=medium"]).plan.confidence).toBe("medium");
      expect(plan(["--message=x", "--chart=bar", "--selected-by=agent", "--select-confidence=low"]).plan.confidence).toBe("low");
    });

    it("falls back to 'high' for an invalid --select-confidence (never a bogus value)", () => {
      expect(plan(["--message=x", "--chart=bar", "--selected-by=agent", "--select-confidence=bogus"]).plan.confidence).toBe("high");
    });

    it("honors the agent's pick even for a DEMOTED type (donut is NOT auto-demoted on an explicit agent pick)", () => {
      const r = plan(["--message=single share", "--chart=donut", "--selected-by=agent", "--select-reason=single-share callout"]);
      expect(r.plan.chartType).toBe("donut");
      expect(r.plan.select_mode).toBe("agent");
    });

    it("remaps a cataloged pick to the nearest built type + warns, still select_mode 'agent'", () => {
      const r = plan(["--message=regions", "--chart=choropleth", "--selected-by=agent", "--select-reason=geo"]);
      expect(r.plan.chartType).toBe("tile-map"); // choropleth → tile-map fallback
      expect(r.plan.select_mode).toBe("agent");
      expect(r.warnings.join(" ")).toContain("cataloged");
    });

    it("uses a default intent label when --select-intent omitted, honors it when given", () => {
      expect(plan(["--message=x", "--chart=bar", "--selected-by=agent"]).plan.intent).toBe("llm-native");
      expect(plan(["--message=x", "--chart=bar", "--selected-by=agent", "--select-intent=ranking"]).plan.intent).toBe("ranking");
    });
  });

  describe("Mode C — deterministic fallback (headless / out-of-band)", () => {
    it("--chart=auto → select_mode 'deterministic' (the select.cjs regex selector)", () => {
      const r = plan(["--message=rank acquisition channels by signups", "--chart=auto"]);
      expect(r.plan.select_mode).toBe("deterministic");
      expect(r.plan.chartType).toBe("bar");
    });

    it("no --chart at all → also deterministic", () => {
      expect(plan(["--message=rank channels"]).plan.select_mode).toBe("deterministic");
    });
  });

  describe("hard force (no --selected-by)", () => {
    it("--chart=line bare → select_mode 'forced', confidence 'forced'", () => {
      const r = plan(["--message=x", "--chart=line"]);
      expect(r.plan.select_mode).toBe("forced");
      expect(r.plan.intent).toBe("forced");
      expect(r.plan.confidence).toBe("forced");
      expect(r.plan.chartType).toBe("line");
    });
  });

  describe("run.json + flag plumbing", () => {
    it("runJson.version is the current 0.4.0 (not the stale 0.2.0)", () => {
      expect(plan(["--message=x", "--chart=bar"]).runJson.version).toBe("0.4.0");
    });

    it("the v0.4 selection-provenance flags never produce an 'unknown flag' warning", () => {
      const r = plan(["--message=x", "--chart=bar", "--selected-by=agent", "--select-reason=r", "--select-intent=i", "--select-confidence=high"]);
      const warns = r.warnings.join(" | ");
      expect(warns).not.toContain("selected-by");
      expect(warns).not.toContain("select-reason");
      expect(warns).not.toContain("select-intent");
      expect(warns).not.toContain("select-confidence");
    });

    it("degenerate data ({}) still selects without throwing (deterministic path)", () => {
      const r = run(["--message=rank things", "--chart=auto", "--data={}", "--dry-run"]);
      expect(r.outcome).toBe("dry_run");
      expect(typeof r.plan.chartType).toBe("string");
      expect(r.plan.select_mode).toBe("deterministic");
    });
  });
});
