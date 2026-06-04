import { describe, it, expect } from "vitest";
// @ts-ignore — CJS interop
const { buildTheme, CLASSIC, familyOf, pick } = require("../../scripts/dataviz/lib/theme.cjs");

// ============================================================================
// All-Edge-Cases-Test. Unit: buildTheme(resolvedStyle, themeName) -> {theme,warnings}
// (scripts/dataviz/lib/theme.cjs — PURE). @cto must-fix #1: the resolve-style token
// shape is {mode, tokens:{colors:{ARBITRARY keys}, typography:{role:{fontFamily}|str}}};
// read resolved.tokens.colors (NOT .colors), guard every key. #10: mode!=='styled' → classic.
// ============================================================================

describe("buildTheme — classic default", () => {
  it("null resolvedStyle → classic McKinsey theme", () => { const { theme } = buildTheme(null, "mckinsey"); expect(theme.highlight).toBe("#005EB8"); expect(theme.styled).toBe(false); });
  it("unknown themeName → classic", () => expect(buildTheme(null, "nope").theme.highlight).toBe(CLASSIC.highlight));
  it("mckinsey-rebrand → the rebrand highlight", () => expect(buildTheme(null, "mckinsey-rebrand").theme.highlight).toBe("#1A4FB0"));
  it("classic series palette leads with the highlight", () => expect(buildTheme(null, "mckinsey").theme.series[0]).toBe("#005EB8"));
  it("carries the structural constants (data-ink minimalism)", () => { const { theme } = buildTheme(null, "mckinsey"); expect(theme.gridlines).toBe(false); expect(theme.legend).toBe(false); expect(theme.barZeroBaseline).toBe(true); });
});

describe("buildTheme — mode degradation (@cto must-fix #10)", () => {
  it("mode='plain' → classic, no extra warning", () => { const { theme, warnings } = buildTheme({ mode: "plain" }, "mckinsey"); expect(theme.styled).toBe(false); expect(warnings).toEqual([]); });
  it("mode='needs-download' → classic + a warning (never crash)", () => { const { theme, warnings } = buildTheme({ mode: "needs-download", name: "foo" }, "mckinsey"); expect(theme.styled).toBe(false); expect(warnings.length).toBeGreaterThan(0); });
  it("a resolved.warning is surfaced", () => { const { warnings } = buildTheme({ mode: "plain", warning: "present but unusable" }, "mckinsey"); expect(warnings).toContain("present but unusable"); });
});

describe("buildTheme — styled override (arbitrary keys, guarded)", () => {
  const styled = (over: any = {}) => buildTheme({ mode: "styled", name: "ds", tokens: { colors: { primary: "#FF5500", chart1: "#FF5500", chart2: "#0088CC", foreground: "#111111", ...over.colors }, typography: { body: { fontFamily: "Inter" }, display: { fontFamily: "Fraunces" }, ...over.typography } } }, "mckinsey").theme;
  it("highlight ← colors.primary", () => expect(styled().highlight).toBe("#FF5500"));
  it("ink ← colors.foreground", () => expect(styled().ink).toBe("#111111"));
  it("series ← the chart ramp when present", () => expect(styled().series).toEqual(["#FF5500", "#0088CC"]));
  it("bodyFont ← typography.body.fontFamily (object)", () => expect(styled().bodyFont).toBe("Inter"));
  it("headingFont ← typography.display.fontFamily", () => expect(styled().headingFont).toBe("Fraunces"));
  it("styled=true + styleName carried", () => { const t = styled(); expect(t.styled).toBe(true); expect(t.styleName).toBe("ds"); });
});

describe("buildTheme — guards against missing/odd keys (a non-Ritsu design system)", () => {
  it("missing primary/accent → falls back to classic highlight (no crash)", () => expect(buildTheme({ mode: "styled", name: "x", tokens: { colors: { foo: "#abc" }, typography: {} } }, "mckinsey").theme.highlight).toBe(CLASSIC.highlight));
  it("typography role as a STRING (not object) → used as the family", () => expect(buildTheme({ mode: "styled", name: "x", tokens: { colors: {}, typography: { body: "Comic Sans" } } }, "mckinsey").theme.bodyFont).toBe("Comic Sans"));
  it("tokens null → classic", () => expect(buildTheme({ mode: "styled", name: "x", tokens: null }, "mckinsey").theme.styled).toBe(false));
  it("colors not an object → classic palette (no crash)", () => expect(buildTheme({ mode: "styled", name: "x", tokens: { colors: "nope", typography: {} } }, "mckinsey").theme.highlight).toBe(CLASSIC.highlight));
});

describe("helpers", () => {
  it("familyOf handles object / string / missing", () => { expect(familyOf({ fontFamily: "A" }, "fb")).toBe("A"); expect(familyOf("B", "fb")).toBe("B"); expect(familyOf(null, "fb")).toBe("fb"); expect(familyOf({}, "fb")).toBe("fb"); });
  it("pick returns the first present key, else fallback", () => { expect(pick({ b: "#1" }, ["a", "b"], "#fb")).toBe("#1"); expect(pick({}, ["a"], "#fb")).toBe("#fb"); expect(pick(null, ["a"], "#fb")).toBe("#fb"); });
});
