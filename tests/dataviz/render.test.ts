import { describe, it, expect } from "vitest";
// @ts-ignore — CJS interop
const { renderChart, valFmt, BUILT } = require("../../scripts/dataviz/render.cjs");
// @ts-ignore
const { fmt } = require("../../scripts/dataviz/lib/svg.cjs");
// @ts-ignore
const { buildTheme } = require("../../scripts/dataviz/lib/theme.cjs");

// ============================================================================
// All-Edge-Cases-Test. Units: renderChart(type,data,spec,theme)->svg (PURE),
// valFmt, fmt (scripts/dataviz/render.cjs + lib/svg.cjs). Byte-stable → asserted
// with toBe/toEqual (the repo forbids vitest snapshots; @cto must-fix #2).
// ============================================================================

const THEME = buildTheme(null, "mckinsey").theme;
const BARS = { categories: ["A", "B", "C"], series: [{ name: "v", values: [30, 55, 20] }] };
const SPEC = { title: "B leads on revenue", source: "Internal; analysis", width: 600, height: 400, numberFormat: {} };

describe("fmt — byte-stable coordinate formatter", () => {
  it("rounds to 2 dp", () => expect(fmt(142.857142)).toBe("142.86"));
  it("strips trailing zeros", () => { expect(fmt(100)).toBe("100"); expect(fmt(100.5)).toBe("100.5"); });
  it("normalizes -0 → 0", () => expect(fmt(-0)).toBe("0"));
  it("non-finite → 0", () => { expect(fmt(NaN)).toBe("0"); expect(fmt(Infinity)).toBe("0"); });
  it("is locale-independent (1/3)", () => expect(fmt(1 / 3)).toBe("0.33"));
});

describe("valFmt — data-label formatter", () => {
  it("integers by default", () => expect(valFmt(55, { numberFormat: {} })).toBe("55"));
  it("percent", () => expect(valFmt(39, { numberFormat: { percent: true } })).toBe("39%"));
  it("thousands separator", () => expect(valFmt(1234567, { numberFormat: { thousandsSep: true } })).toBe("1,234,567"));
  it("scale abbreviation", () => expect(valFmt(2500000, { numberFormat: { scaleAbbrev: true } })).toBe("2.5M"));
  it("non-finite → empty", () => expect(valFmt(NaN, {})).toBe(""));
});

describe("renderChart — determinism + validity", () => {
  it("is deterministic (same input → identical bytes)", () => expect(renderChart("bar", BARS, SPEC, THEME)).toBe(renderChart("bar", BARS, SPEC, THEME)));
  it("emits a valid SVG root", () => { const s = renderChart("bar", BARS, SPEC, THEME); expect(s.startsWith("<svg")).toBe(true); expect(s.endsWith("</svg>")).toBe(true); expect(s).toContain('xmlns="http://www.w3.org/2000/svg"'); });
  it("renders the action-title", () => expect(renderChart("bar", BARS, SPEC, THEME)).toContain("B leads on revenue"));
  it("renders the source footer on EVERY exhibit", () => { for (const t of BUILT) { const d = t === "waterfall" ? { steps: [{ label: "X", delta: 10 }] } : t === "scatter" ? { points: [{ x: 1, y: 2 }] } : t === "kpi" ? { stats: [{ value: "9", label: "k" }] } : BARS; expect(renderChart(t, d, SPEC, THEME)).toContain("Source: Internal"); } });
  it("an unknown chartType falls back to bar (no throw)", () => expect(renderChart("nonsense" as any, BARS, SPEC, THEME).startsWith("<svg")).toBe(true));
});

describe("renderChart — bar discipline", () => {
  it("sorts descending by default (B=55 first → its bar widest)", () => { const s = renderChart("bar", BARS, SPEC, THEME); const firstLabelIdx = s.indexOf(">B<"); const aIdx = s.indexOf(">A<"); expect(firstLabelIdx).toBeGreaterThan(0); expect(firstLabelIdx).toBeLessThan(aIdx); });
  it("the top bar uses the highlight color (one-highlight rule)", () => expect(renderChart("bar", BARS, SPEC, THEME)).toContain(THEME.highlight));
  it("3 categories → 3 bar rects", () => { const s = renderChart("bar", BARS, SPEC, THEME); expect((s.match(/<rect[^>]*fill="#005EB8"/g) || []).length + (s.match(/<rect[^>]*fill="#A2AAAD"/g) || []).length).toBe(3); });
});

describe("renderChart — waterfall (running cumulative; @cto must-fix #4)", () => {
  const WF = { steps: [{ label: "Base", delta: 100 }, { label: "Up", delta: 40 }, { label: "Down", delta: -15 }, { label: "Target", delta: 0, total: true }] };
  it("renders without throwing + valid svg", () => expect(renderChart("waterfall", WF, SPEC, THEME).startsWith("<svg")).toBe(true));
  it("rising step uses the accent (teal), falling uses amber", () => { const s = renderChart("waterfall", WF, SPEC, THEME); expect(s).toContain(THEME.accent); expect(s).toContain(THEME.amber); });
  it("signed delta labels (+40 / -15)", () => { const s = renderChart("waterfall", WF, SPEC, THEME); expect(s).toContain("+40"); expect(s).toContain("-15"); });
  it("has dashed connectors between bars", () => expect(renderChart("waterfall", WF, SPEC, THEME)).toContain("stroke-dasharray"));
});

describe("renderChart — edge cases", () => {
  it("empty data → valid svg, no throw", () => { for (const t of BUILT) expect(renderChart(t, {}, SPEC, THEME).startsWith("<svg")).toBe(true); });
  it("single datum bar", () => expect(renderChart("bar", { categories: ["solo"], series: [{ name: "v", values: [10] }] }, SPEC, THEME)).toContain(">solo<"));
  it("all-equal values (degenerate scale, no NaN)", () => { const s = renderChart("column", { categories: ["A", "B"], series: [{ name: "v", values: [5, 5] }] }, SPEC, THEME); expect(s).not.toContain("NaN"); expect(s).not.toContain("undefined"); });
  it("stacked100 normalizes to percentages", () => { const s = renderChart("stacked100", { categories: ["X"], series: [{ name: "a", values: [1] }, { name: "b", values: [3] }] }, { ...SPEC }, THEME); expect(s).toContain("25%"); });
  it("no NaN / undefined anywhere across all types", () => { for (const t of BUILT) { const d = t === "waterfall" ? { steps: [{ label: "X", delta: -5 }] } : t === "scatter" ? { points: [{ x: 0, y: 0 }] } : t === "kpi" ? { stats: [{ value: "9" }] } : BARS; const s = renderChart(t, d, SPEC, THEME); expect(s.includes("NaN")).toBe(false); expect(s.includes("undefined")).toBe(false); } });
});

describe("renderChart — --style brand override (structure ⊥ brand)", () => {
  it("a styled theme paints the highlight in the brand primary, keeps structure", () => {
    const styled = buildTheme({ mode: "styled", name: "acme", tokens: { colors: { primary: "#FF0000" }, typography: { body: { fontFamily: "Inter" } } } }, "mckinsey").theme;
    const s = renderChart("bar", BARS, SPEC, styled);
    expect(s).toContain("#FF0000");   // brand highlight
    expect(s).toContain("Inter");      // brand body font
    expect(s).toContain("acme");       // brand wordmark
    expect(s).toContain("Source: Internal"); // structure (source footer) unchanged
  });
});

// ============================================================================
// v0.2 (extend): the 18 NEW chart types. The BUILT-loop edge tests above already
// assert valid-svg + no-NaN + source-footer for ALL 27 types; these add the
// type-SPECIFIC rendering behavior + byte-stability + degenerate safety.
// ============================================================================
describe("renderChart — v0.2 chart types render type-specific SVG", () => {
  const SP = { ...SPEC };
  it("pie renders wedges (<path>) + % labels", () => { const s = renderChart("pie", { categories: ["A", "B", "C"], series: [{ name: "v", values: [50, 30, 20] }] }, SP, THEME); expect(s).toContain("<path"); expect(s).toMatch(/\d+(\.\d+)?%/); });
  it("donut renders a ring + a center total", () => { const s = renderChart("donut", { categories: ["A", "B"], series: [{ name: "v", values: [60, 40] }] }, SP, THEME); expect(s).toContain("<path"); expect(s).toContain(">100<"); });
  it("area fills under the line (fill-opacity)", () => expect(renderChart("area", { categories: ["19", "20", "21"], series: [{ name: "v", values: [10, 20, 30] }] }, SP, THEME)).toContain("fill-opacity"));
  it("stacked-area stacks filled bands", () => expect(renderChart("stacked-area", { categories: ["19", "20"], series: [{ name: "a", values: [10, 20] }, { name: "b", values: [5, 15] }] }, SP, THEME)).toContain("<path"));
  it("marimekko emits variable-width columns (>2 rects)", () => expect((renderChart("marimekko", { categories: ["X", "Y"], series: [{ name: "a", values: [30, 10] }, { name: "b", values: [10, 20] }] }, SP, THEME).match(/<rect/g) || []).length).toBeGreaterThan(2));
  it("bubble sizes circles by the size measure", () => { const s = renderChart("bubble", { points: [{ x: 10, y: 20, size: 5, label: "P" }, { x: 30, y: 15, size: 20 }] }, SP, THEME); expect(s).toContain("<circle"); expect(s).toContain("fill-opacity"); });
  it("heatmap colors ≥4 cells (interpolated hex)", () => expect((renderChart("heatmap", { categories: ["c1", "c2"], series: [{ name: "r1", values: [1, 9] }, { name: "r2", values: [5, 2] }] }, SP, THEME).match(/<rect/g) || []).length).toBeGreaterThanOrEqual(4));
  it("dumbbell draws two dots + a connector per category", () => { const s = renderChart("dumbbell", { categories: ["A", "B"], series: [{ name: "before", values: [10, 20] }, { name: "after", values: [40, 25] }] }, SP, THEME); expect((s.match(/<circle/g) || []).length).toBeGreaterThanOrEqual(4); expect(s).toContain("<line"); });
  it("lollipop draws stem (<line>) + dot (<circle>)", () => { const s = renderChart("lollipop", { categories: ["A", "B", "C"], series: [{ name: "v", values: [3, 7, 5] }] }, SP, THEME); expect(s).toContain("<line"); expect(s).toContain("<circle"); });
  it("dot plot draws dots", () => expect(renderChart("dot", { categories: ["A", "B"], series: [{ name: "v", values: [95, 98] }] }, SP, THEME)).toContain("<circle"));
  it("slope connects two periods", () => { const s = renderChart("slope", { categories: ["2023", "2024"], series: [{ name: "A", values: [10, 30] }, { name: "B", values: [20, 15] }] }, SP, THEME); expect(s).toContain("<path"); expect(s).toContain("2024"); });
  it("bullet draws a measure bar + a target tick", () => { const s = renderChart("bullet", { measures: [{ label: "Rev", value: 80, target: 100 }] }, SP, THEME); expect((s.match(/<rect/g) || []).length).toBeGreaterThanOrEqual(2); expect(s).toContain("<line"); });
  it("diverging splits negatives (amber) around center", () => expect(renderChart("diverging", { categories: ["Q1"], series: [{ name: "agree", values: [40] }, { name: "disagree", values: [-25] }] }, SP, THEME)).toContain(THEME.amber));
  it("histogram bins values into adjacent columns", () => expect((renderChart("histogram", { values: [1, 2, 2, 3, 3, 3, 4, 5, 9] }, SP, THEME).match(/<rect/g) || []).length).toBeGreaterThanOrEqual(3));
  it("funnel renders descending stages + conversion %", () => expect(renderChart("funnel", { stages: [{ label: "Visit", value: 1000 }, { label: "Paid", value: 100 }] }, SP, THEME)).toMatch(/\d+%/));
  it("quadrant draws a dashed 2x2 cross + points", () => { const s = renderChart("quadrant", { points: [{ x: 10, y: 20, label: "P", highlight: true }], quadrants: ["Q1", "Q2", "Q3", "Q4"] }, SP, THEME); expect(s).toContain("stroke-dasharray"); expect(s).toContain("<circle"); });
  it("radar draws closed polygons (path ending in Z)", () => { const s = renderChart("radar", { axes: ["A", "B", "C", "D"], series: [{ name: "Us", values: [8, 6, 9, 7] }] }, SP, THEME); expect(s).toContain("<path"); expect(s).toContain(" Z"); });
  it("box draws a quartile box + median + whiskers", () => { const s = renderChart("box", { samples: [{ label: "G1", values: [1, 2, 3, 4, 5, 9] }] }, SP, THEME); expect(s).toContain("<rect"); expect(s).toContain("<line"); });
});

describe("renderChart — v0.2 byte-stability + degenerate safety", () => {
  const NEW = ["pie", "donut", "area", "stacked-area", "marimekko", "bubble", "heatmap", "dumbbell", "lollipop", "dot", "slope", "bullet", "diverging", "histogram", "funnel", "quadrant", "radar", "box"];
  const properData = (t: string): any => t === "bubble" || t === "quadrant" ? { points: [{ x: 1, y: 2, size: 3 }] }
    : t === "box" ? { samples: [{ label: "g", values: [1, 2, 3] }] }
      : t === "bullet" ? { measures: [{ label: "m", value: 5, target: 8 }] }
        : t === "funnel" ? { stages: [{ label: "s", value: 9 }] }
          : t === "histogram" ? { values: [1, 2, 3, 3] }
            : t === "radar" ? { axes: ["a", "b", "c"], series: [{ name: "s", values: [1, 2, 3] }] } : BARS;
  it("every v0.2 type is byte-stable (same input → identical bytes)", () => { for (const t of NEW) expect(renderChart(t, properData(t), SPEC, THEME)).toBe(renderChart(t, properData(t), SPEC, THEME)); });
  it("degenerate inputs never yield NaN/undefined and stay valid SVG", () => {
    const cases: [string, any][] = [["pie", { categories: ["A", "B"], series: [{ name: "v", values: [1, 1] }] }], ["marimekko", { categories: ["A"], series: [{ name: "v", values: [0] }] }], ["radar", { axes: ["A", "B"], series: [{ name: "s", values: [1, 2] }] }], ["box", {}], ["bubble", {}], ["heatmap", {}], ["funnel", { stages: [] }], ["pie", { categories: [], series: [] }]];
    for (const [t, d] of cases) { const s = renderChart(t, d, SPEC, THEME); expect(s.includes("NaN")).toBe(false); expect(s.includes("undefined")).toBe(false); expect(s.startsWith("<svg")).toBe(true); }
  });
});

// ============================================================================
// Review hardening (adversarial code-review findings, 2026-06-04): a renderer
// must NEVER throw + NEVER emit "NaN"/"undefined" — even on a null/scalar element
// inside a correctly-named array, and kpi must not render a non-finite number.
// ============================================================================
describe("renderChart — malformed array elements never throw / no NaN", () => {
  const MALFORMED: [string, any][] = [
    ["scatter", { points: [null, { x: 1, y: 2 }, 3] }],
    ["bubble", { points: [null] }],
    ["quadrant", { points: [null, undefined] }],
    ["waterfall", { steps: [null, { label: "x", delta: 5 }] }],
    ["funnel", { stages: [null] }],
    ["bullet", { measures: [null] }],
    ["histogram", { bins: [null] }],
    ["box", { boxes: [null] }],
    ["box", { samples: [null] }],
    ["kpi", { stats: [null] }],
  ];
  it("never throws + emits valid NaN-free SVG for null/scalar elements", () => {
    for (const [t, d] of MALFORMED) { let s = ""; expect(() => { s = renderChart(t, d, SPEC, THEME); }).not.toThrow(); expect(s.startsWith("<svg")).toBe(true); expect(s.includes("NaN")).toBe(false); expect(s.includes("undefined")).toBe(false); }
  });
  it("renders the valid elements alongside a null (graceful, not all-or-nothing)", () => { const s = renderChart("scatter", { points: [null, { x: 5, y: 5, label: "P" }] }, SPEC, THEME); expect(s).toContain("<circle"); expect(s).toContain(">P<"); });
  it("kpi never renders literal 'NaN'/'Infinity' for a non-finite numeric value", () => { const s = renderChart("kpi", { stats: [{ value: NaN, label: "x" }, { value: Infinity }] }, SPEC, THEME); expect(s.includes("NaN")).toBe(false); expect(s.includes("Infinity")).toBe(false); });
  it("kpi keeps string + finite-number values", () => { const s = renderChart("kpi", { stats: [{ value: "42%" }, { value: 9 }] }, SPEC, THEME); expect(s).toContain("42%"); expect(s).toContain(">9<"); });
  it("the renderChart try/catch net wraps a throwing renderer into a valid footed exhibit", () => { const s = renderChart("scatter", { get points() { throw new Error("boom"); } }, SPEC, THEME); expect(s.startsWith("<svg")).toBe(true); expect(s).toContain("Source: Internal"); });
});

// ============================================================================
// v0.3: the remaining 33 chart types (→60 built) + the de-branded wordmark.
// ============================================================================
describe("renderChart — v0.3 chart types render + byte-stable + de-branded", () => {
  const SP = { ...SPEC };
  const PTS = { points: [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 1 }] };
  const SAMP = { samples: [{ label: "G1", values: [1, 2, 3, 4, 5, 9] }, { label: "G2", values: [2, 4, 5, 7] }] };
  const CASES: [string, any, string][] = [
    ["range", { ranges: [{ label: "A", low: 10, high: 40 }] }, "<rect"],
    ["step-line", { categories: ["a", "b", "c"], series: [{ name: "v", values: [1, 3, 2] }] }, "<path"],
    ["spline", { categories: ["a", "b", "c"], series: [{ name: "v", values: [1, 3, 2] }] }, "<path"],
    ["barcode", { values: [3, 5, 2, 8] }, "<line"],
    ["strip", SAMP, "<circle"], ["jitter", SAMP, "<circle"],
    ["connected-scatter", PTS, "<path"],
    ["hexbin", { points: [{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 5, y: 5 }] }, "<path"],
    ["semicircle-donut", { categories: ["A", "B"], series: [{ name: "m", values: [60, 40] }] }, "<path"],
    ["waffle", { categories: ["A", "B"], series: [{ name: "m", values: [70, 30] }] }, "<rect"],
    ["population-pyramid", { categories: ["0-18", "19+"], series: [{ name: "M", values: [30, 40] }, { name: "F", values: [28, 42] }] }, "<rect"],
    ["matrix-chart", { categories: ["c1", "c2"], series: [{ name: "r1", values: [1, 9] }] }, "<circle"],
    ["table-chart", { categories: ["c1", "c2"], series: [{ name: "r1", values: [1, 9] }] }, "<rect"],
    ["bump", { categories: ["Q1", "Q2", "Q3"], series: [{ name: "A", values: [10, 30, 20] }, { name: "B", values: [20, 10, 30] }] }, "<path"],
    ["gantt", { tasks: [{ label: "T", start: 0, end: 5 }] }, "<rect"],
    ["candlestick", { candles: [{ label: "M", open: 10, high: 14, low: 8, close: 12 }] }, "<rect"],
    ["ohlc", { candles: [{ label: "M", open: 10, high: 14, low: 8, close: 12 }] }, "<line"],
    ["density", SAMP, "<path"], ["ridgeline", SAMP, "<path"], ["violin", SAMP, "<path"],
    ["horizon", { categories: ["a", "b", "c"], series: [{ name: "v", values: [2, 5, 3] }] }, "<path"],
    ["small-multiples", { categories: ["a", "b"], series: [{ name: "S1", values: [1, 2] }, { name: "S2", values: [3, 1] }] }, "<rect"],
    ["treemap", { items: [{ label: "A", value: 4 }, { label: "B", value: 6 }] }, "<rect"],
    ["sunburst", { items: [{ label: "A", value: 4 }, { label: "B", value: 6 }] }, "<path"],
    ["dendrogram", { categories: ["l1", "l2", "l3"] }, "<line"],
    ["venn", { sets: [{ label: "A", size: 30 }, { label: "B", size: 20 }] }, "<circle"],
    ["tile-map", { tiles: [{ label: "CA", row: 0, col: 0, value: 9 }] }, "<rect"],
    ["arc", { nodes: ["A", "B", "C"], links: [{ source: "A", target: "C" }] }, "<path"],
    ["network", { nodes: ["A", "B", "C"], links: [{ source: "A", target: "B" }] }, "<circle"],
    ["flowchart", { steps: ["A", "B", "C"] }, "<rect"],
    ["sankey", { nodes: ["A", "B"], links: [{ source: "A", target: "B", value: 5 }] }, "<rect"],
    ["chord", { matrix: [[0, 5], [5, 0]] }, "<path"],
  ];
  it("each v0.3 type renders valid SVG with its marker, byte-stable, no NaN", () => {
    for (const [t, d, marker] of CASES) {
      const s = renderChart(t, d, SP, THEME);
      expect(s.startsWith("<svg")).toBe(true);
      expect(s).toContain(marker);
      expect(s.includes("NaN")).toBe(false); expect(s.includes("undefined")).toBe(false);
      expect(renderChart(t, d, SP, THEME)).toBe(s);
    }
  });
  it("the default wordmark is Ritsu, not 'McKinsey & Company' (de-branded)", () => { const s = renderChart("bar", BARS, SPEC, THEME); expect(s).toContain(">Ritsu<"); expect(s.includes("McKinsey")).toBe(false); });
  it("a --style brand still overrides the wordmark", () => { const styled = buildTheme({ mode: "styled", name: "acme", tokens: { colors: { primary: "#FF0000" }, typography: {} } }, "mckinsey").theme; expect(renderChart("bar", BARS, SPEC, styled)).toContain(">acme<"); });
});

describe("renderChart — dispatch coverage (no built type silently falls back to bar)", () => {
  // @ts-ignore
  const { DISPATCH } = require("../../scripts/dataviz/render.cjs");
  it("every one of the 60 BUILT types has a real dispatch function", () => { expect(BUILT.length).toBe(60); for (const t of BUILT) expect(typeof DISPATCH[t]).toBe("function"); });
  it("beeswarm renders a value-swarm (circles), not a bar fallback", () => { const s = renderChart("beeswarm", { samples: [{ label: "g", values: [1, 2, 3, 4, 5, 6] }] }, SPEC, THEME); expect(s).toContain("<circle"); });
});
