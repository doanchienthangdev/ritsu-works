import { describe, it, expect } from "vitest";
import * as fs from "fs";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const CE = require("../../scripts/deepask/chart-embed.cjs");

// ============================================================================
// All-Edge-Cases-Test. Units: scripts/deepask/chart-embed.cjs PURE functions —
// embedModeForFormat / formatEmbedsCharts / selectChartsToEmbed /
// buildDatavizInvocation / svgDims / findChrome. (The render/rasterize are
// side-effecting spawns — smoke-tested out of band; here we lock the pure logic.)
//
// Phase 1B branches: format→mode table + unknown fallback; charts cap + degenerate
// IR; invocation flag presence/omission; svg dim parse + defaults; chrome override.
// ============================================================================

describe("deepask chart-embed — embedModeForFormat()", () => {
  it("maps code-rendered formats to svg-inline", () => {
    for (const f of ["html", "dashboard", "interactive", "canvas", "article", "pdf"]) {
      expect(CE.embedModeForFormat(f)).toBe("svg-inline");
    }
  });
  it("maps office formats to png", () => {
    expect(CE.embedModeForFormat("pptx")).toBe("png");
    expect(CE.embedModeForFormat("docx")).toBe("png");
  });
  it("maps img-slide to data-slide, xlsx to native, infographics to companion", () => {
    expect(CE.embedModeForFormat("img-slide")).toBe("data-slide");
    expect(CE.embedModeForFormat("xlsx")).toBe("native");
    expect(CE.embedModeForFormat("infographics")).toBe("companion");
  });
  it("maps no-chart-surface formats to none", () => {
    for (const f of ["inline", "text", "mermaid"]) expect(CE.embedModeForFormat(f)).toBe("none");
  });
  it("is case-insensitive and falls back to none for unknown/empty/null", () => {
    expect(CE.embedModeForFormat("HTML")).toBe("svg-inline");
    expect(CE.embedModeForFormat("bogus")).toBe("none");
    expect(CE.embedModeForFormat("")).toBe("none");
    expect(CE.embedModeForFormat(null)).toBe("none");
    expect(CE.embedModeForFormat(undefined)).toBe("none");
  });
});

describe("deepask chart-embed — formatEmbedsCharts()", () => {
  it("true for svg-inline / png / data-slide / companion", () => {
    for (const f of ["html", "pptx", "img-slide", "infographics"]) expect(CE.formatEmbedsCharts(f)).toBe(true);
  });
  it("false for native (xlsx) and none (inline/text/mermaid/unknown)", () => {
    for (const f of ["xlsx", "inline", "text", "mermaid", "bogus"]) expect(CE.formatEmbedsCharts(f)).toBe(false);
  });
});

describe("deepask chart-embed — selectChartsToEmbed()", () => {
  const ir = { charts: Array.from({ length: 20 }, (_, i) => ({ type: "bar", id: i })) };
  it("returns all charts under the cap, capped at maxCharts (default 12)", () => {
    expect(CE.selectChartsToEmbed(ir).length).toBe(12);
    expect(CE.selectChartsToEmbed(ir, { maxCharts: 5 }).length).toBe(5);
    expect(CE.selectChartsToEmbed({ charts: [{ type: "bar" }] }).length).toBe(1);
  });
  it("handles missing/empty/non-array charts without throwing → []", () => {
    expect(CE.selectChartsToEmbed({}).length).toBe(0);
    expect(CE.selectChartsToEmbed(null).length).toBe(0);
    expect(CE.selectChartsToEmbed({ charts: null }).length).toBe(0);
    expect(CE.selectChartsToEmbed({ charts: "nope" } as any).length).toBe(0);
    expect(CE.selectChartsToEmbed(ir, { maxCharts: 0 }).length).toBe(0);
  });
});

describe("deepask chart-embed — buildDatavizInvocation()", () => {
  const chart = { type: "bar", message: "Reddit leads", source: "Ritsu", data: { categories: ["a"], series: [{ name: "s", values: [1] }] }, reason: "ranking" };

  it("always sets --selected-by=agent + --format=svg + the agent's reason (LLM-native provenance)", () => {
    const a = CE.buildDatavizInvocation(chart, { outPath: "/tmp/x.svg" });
    expect(a).toContain("--selected-by=agent");
    expect(a).toContain("--format=svg");
    expect(a.some((s: string) => s.startsWith("--select-reason=ranking"))).toBe(true);
    expect(a).toContain("--chart=bar");
    expect(a).toContain("--out=/tmp/x.svg");
  });

  it("serializes object --data as JSON and passes a string --data through unchanged", () => {
    const objA = CE.buildDatavizInvocation(chart, {});
    expect(objA.some((s: string) => s === `--data=${JSON.stringify(chart.data)}`)).toBe(true);
    const strA = CE.buildDatavizInvocation({ type: "bar", data: '{"x":1}' }, {});
    expect(strA).toContain('--data={"x":1}');
  });

  it("includes --style / --art-style only when set and not 'plain' (design context flows to dataviz)", () => {
    expect(CE.buildDatavizInvocation(chart, { style: "ritsu" })).toContain("--style=ritsu");
    expect(CE.buildDatavizInvocation(chart, { style: "plain" }).some((s: string) => s.startsWith("--style="))).toBe(false);
    expect(CE.buildDatavizInvocation(chart, {}).some((s: string) => s.startsWith("--style="))).toBe(false);
    expect(CE.buildDatavizInvocation(chart, { artStyle: "swiss-international" })).toContain("--art-style=swiss-international");
  });

  it("the first argv element is the dataviz gen.cjs path", () => {
    expect(CE.buildDatavizInvocation(chart, {})[0]).toBe(CE.DATAVIZ_GEN);
    expect(CE.DATAVIZ_GEN).toContain("scripts/dataviz/gen.cjs");
  });

  it("omits optional flags gracefully on a bare chart (no message/source/data)", () => {
    const a = CE.buildDatavizInvocation({ type: "kpi" }, {});
    expect(a).toContain("--chart=kpi");
    expect(a.some((s: string) => s.startsWith("--message="))).toBe(false);
    expect(a.some((s: string) => s.startsWith("--data="))).toBe(false);
  });
});

describe("deepask chart-embed — svgDims()", () => {
  it("parses width/height from an <svg> string", () => {
    expect(CE.svgDims('<svg width="800" height="600" viewBox="0 0 800 600">')).toEqual({ width: 800, height: 600 });
  });
  it("defaults to 720x540 when missing/empty/null (never NaN)", () => {
    expect(CE.svgDims("<svg viewBox='0 0 1 1'>")).toEqual({ width: 720, height: 540 });
    expect(CE.svgDims("")).toEqual({ width: 720, height: 540 });
    expect(CE.svgDims(null)).toEqual({ width: 720, height: 540 });
  });
});

describe("deepask chart-embed — findChrome()", () => {
  it("honors CHROME_BIN when the file exists", () => {
    // use this very test file as a guaranteed-existing path
    expect(CE.findChrome({ CHROME_BIN: __filename })).toBe(__filename);
  });
  it("ignores a non-existent CHROME_BIN and returns a candidate or null (never throws)", () => {
    const r = CE.findChrome({ CHROME_BIN: "/no/such/chrome/binary" });
    expect(r === null || (typeof r === "string" && fs.existsSync(r))).toBe(true);
  });
});
