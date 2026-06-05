import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const WP = require("../../scripts/deepask/workflow-plan.cjs");

// ============================================================================
// All-Edge-Cases-Test. Units: scripts/deepask/workflow-plan.cjs PURE functions —
// assessComplexity / resolveWorkflowMode / buildWorkflowScript / jsStr. (The actual
// Workflow-tool invocation is the orchestrator-skill Stage 0.5 edge.)
//
// Phase 1B branches: complexity scoring per signal + threshold; mode precedence
// (off/on win, auto defers); script-builder shape + escaping + cap clamp.
// ============================================================================

describe("deepask workflow-plan — assessComplexity()", () => {
  it("flags many sub-needs (≥8) as complex", () => {
    const c = WP.assessComplexity({ subNeedCount: 9, depth: "standard", format: "inline" });
    expect(c.complex).toBe(true);
    expect(c.reasons.join(" ")).toMatch(/sub-needs/);
  });
  it("flags exhaustive depth + a rich format as complex", () => {
    expect(WP.assessComplexity({ subNeedCount: 4, depth: "exhaustive", format: "dashboard" }).complex).toBe(true);
  });
  it("does NOT flag a simple quick inline question", () => {
    const c = WP.assessComplexity({ subNeedCount: 3, depth: "quick", format: "inline", sourcesCount: 1 });
    expect(c.complex).toBe(false);
    expect(c.score).toBeLessThan(3);
  });
  it("accumulates signals: deep + pptx + many sources → complex", () => {
    expect(WP.assessComplexity({ subNeedCount: 5, depth: "deep", format: "pptx", sourcesCount: 4 }).complex).toBe(true);
  });
  it("handles empty/garbage input without throwing (never NaN score)", () => {
    const c = WP.assessComplexity({});
    expect(c.complex).toBe(false);
    expect(Number.isFinite(c.score)).toBe(true);
    expect(WP.assessComplexity(undefined).score).toBe(0);
    expect(WP.assessComplexity({ subNeedCount: "x", depth: null, format: null }).score).toBe(0);
  });
  it("respects a custom threshold", () => {
    expect(WP.assessComplexity({ subNeedCount: 5 }, { threshold: 1 }).complex).toBe(true);
    expect(WP.assessComplexity({ subNeedCount: 5 }, { threshold: 99 }).complex).toBe(false);
  });
});

describe("deepask workflow-plan — resolveWorkflowMode()", () => {
  it("--workflow=off → inline (always, even if complex)", () => {
    expect(WP.resolveWorkflowMode({ workflow: "off", complexity: { complex: true, reasons: [] } }).mode).toBe("inline");
  });
  it("--workflow=on → workflow (always, even if simple)", () => {
    expect(WP.resolveWorkflowMode({ workflow: "on", complexity: { complex: false, reasons: [] } }).mode).toBe("workflow");
  });
  it("auto → defers to complexity (complex→workflow, simple→inline)", () => {
    expect(WP.resolveWorkflowMode({ workflow: "auto", complexity: { complex: true, reasons: ["x"] } }).mode).toBe("workflow");
    expect(WP.resolveWorkflowMode({ workflow: "auto", complexity: { complex: false, reasons: [] } }).mode).toBe("inline");
  });
  it("default (no flag) behaves as auto", () => {
    expect(WP.resolveWorkflowMode({ complexity: { complex: true, reasons: ["y"] } }).mode).toBe("workflow");
    expect(WP.resolveWorkflowMode({}).mode).toBe("inline"); // assessComplexity({}) is not complex
  });
  it("accepts truthy/falsy synonyms (true/yes/force, false/no)", () => {
    expect(WP.resolveWorkflowMode({ workflow: "force", complexity: { complex: false } }).mode).toBe("workflow");
    expect(WP.resolveWorkflowMode({ workflow: "no", complexity: { complex: true } }).mode).toBe("inline");
  });
  it("always returns a why string", () => {
    expect(typeof WP.resolveWorkflowMode({ workflow: "on" }).why).toBe("string");
  });
});

describe("deepask workflow-plan — buildWorkflowScript()", () => {
  const script = WP.buildWorkflowScript({ question: "what is our path to 100 paying users?", format: "dashboard", style: "ritsu", depth: "deep", subNeedHint: 8 });

  it("is a valid Workflow DSL script (meta-first, 4 phases, parallel fan-out)", () => {
    expect(script.startsWith("export const meta")).toBe(true);
    for (const ph of ["Decompose", "Resolve+Execute", "Synthesize", "Critic"]) expect(script).toContain(`phase('${ph}')`);
    expect(script).toContain("parallel(");
    expect(script).toContain("await agent(");
    expect(script).toContain("return {");
  });
  it("embeds the question + format + brand style (design context flows down)", () => {
    expect(script).toContain("path to 100 paying users");
    expect(script).toContain("dashboard");
    expect(script).toContain("--style=ritsu");
  });
  it("clamps subNeedHint into [2,12]", () => {
    expect(WP.buildWorkflowScript({ question: "q", subNeedHint: 99 })).toContain("(≤12)");
    expect(WP.buildWorkflowScript({ question: "q", subNeedHint: 1 })).toContain("(≤2)");
    expect(WP.buildWorkflowScript({ question: "q", subNeedHint: 6 })).toContain("(≤6)");
  });
  it("escapes single quotes + newlines in the question (no broken JS string)", () => {
    const s = WP.buildWorkflowScript({ question: "it's a test\nwith a newline", format: "inline" });
    expect(s).toContain("it\\'s a test with a newline");
    expect(s).not.toMatch(/it's a test/); // raw apostrophe would break the generated quote
  });
  it("omits the style note when no --style given", () => {
    expect(WP.buildWorkflowScript({ question: "q" })).not.toContain("--style=");
  });
});

describe("deepask workflow-plan — jsStr()", () => {
  it("escapes backslash, single quote, newline; tolerates null", () => {
    expect(WP.jsStr("a'b")).toBe("a\\'b");
    expect(WP.jsStr("a\\b")).toBe("a\\\\b");
    expect(WP.jsStr("a\nb")).toBe("a b");
    expect(WP.jsStr(null)).toBe("");
    expect(WP.jsStr(undefined)).toBe("");
  });
});
