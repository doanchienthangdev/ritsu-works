import { describe, it, expect } from "vitest";
// @ts-ignore — CJS interop
const P = require("../../scripts/dataviz/lib/params.cjs");
// @ts-ignore
const { checkRenderers } = require("../../scripts/cross-tier/validate-dataviz-renderers.cjs");
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

// ============================================================================
// All-Edge-Cases-Test. Units: parseDatavizArgs / resolveSize / numberFormat /
// computeWarnings (scripts/dataviz/lib/params.cjs, PURE) + checkRenderers
// (validate-dataviz-renderers.cjs) + the real registry spec-conformance.
// ============================================================================

describe("parseDatavizArgs", () => {
  it("positional tokens join into message", () => expect(P.parseDatavizArgs(["revenue", "grew"]).options.message).toBe("revenue grew"));
  it("--key=value", () => expect(P.parseDatavizArgs(["--chart=column", "--source=x"]).options.chart).toBe("column"));
  it("bool flags (--dry-run, --percent)", () => { const { options } = P.parseDatavizArgs(["--dry-run", "--percent"]); expect(options["dry-run"]).toBe(true); expect(options.percent).toBe(true); });
  it("--sort=false coerces to boolean false", () => expect(P.parseDatavizArgs(["--sort=false"]).options.sort).toBe(false));
  it("num flags coerce (--width)", () => expect(P.parseDatavizArgs(["--width=800"]).options.width).toBe(800));
  it("provided set records explicit flags", () => expect(P.parseDatavizArgs(["--chart=bar"]).provided.has("chart")).toBe(true));
  it("defaults applied when absent", () => { const { options } = P.parseDatavizArgs([]); expect(options.use).toBe("svg-native"); expect(options.chart).toBe("auto"); expect(options.format).toBe("inline"); });
});

describe("resolveSize — aspect is semantic", () => {
  it("default 4:3 @ 720", () => expect(P.resolveSize({ ar: "4:3" })).toEqual({ width: 720, height: 540 }));
  it("16:9", () => expect(P.resolveSize({ ar: "16:9" })).toEqual({ width: 720, height: 405 }));
  it("explicit width+height override the ratio", () => expect(P.resolveSize({ ar: "4:3", width: 1000, height: 200 })).toEqual({ width: 1000, height: 200 }));
  it("malformed ar → 4:3 default", () => expect(P.resolveSize({ ar: "junk" })).toEqual({ width: 720, height: 540 }));
});

describe("numberFormat + normalizers", () => {
  it("percent flag → percent format", () => expect(P.numberFormat({ percent: true }).percent).toBe(true));
  it("currency derived from --unit", () => expect(P.numberFormat({ unit: "$" }).currency).toBe("$"));
  it("normalizeFormat clamps unknown → inline", () => expect(P.normalizeFormat("gif")).toBe("inline"));
  it("normalizeTheme clamps unknown → mckinsey", () => expect(P.normalizeTheme("rainbow")).toBe("mckinsey"));
});

describe("computeWarnings — consequence-honest", () => {
  it("art-style warns (no-op on a data chart)", () => { const w = P.computeWarnings({ supports: ["style"], unsupported_warn: ["art-style"] }, new Set(["art-style"])); expect(w.length).toBe(1); expect(w[0]).toMatch(/art-style/); });
  it("a supported flag does NOT warn", () => expect(P.computeWarnings({ supports: ["chart"] }, new Set(["chart"]))).toEqual([]));
  it("an unknown flag warns", () => expect(P.computeWarnings({ supports: [] }, new Set(["bogus"]))[0]).toMatch(/not a known/));
  it("plumbing flags never warn", () => expect(P.computeWarnings({ supports: [] }, new Set(["message", "data", "source"]))).toEqual([]));
});

describe("parseDatavizArgs — v0.2 flags", () => {
  it("--explain is a bool flag", () => expect(P.parseDatavizArgs(["--explain"]).options.explain).toBe(true));
  it("--target coerces to number", () => expect(P.parseDatavizArgs(["--target=100"]).options.target).toBe(100));
  it("--audience / --x-label / --y-label parse as strings", () => { const { options } = P.parseDatavizArgs(["--audience=exec", "--x-label=Spend", "--y-label=Growth"]); expect(options.audience).toBe("exec"); expect(options["x-label"]).toBe("Spend"); expect(options["y-label"]).toBe("Growth"); });
  it("all 5 new flags are in UNIVERSAL_PARAMS", () => { for (const f of ["explain", "audience", "target", "x-label", "y-label"]) expect(P.UNIVERSAL_PARAMS).toContain(f); });
  it("explain/audience never warn (plumbing); target warns when unsupported (renderer capability)", () => { expect(P.computeWarnings({ supports: [] }, new Set(["explain", "audience"]))).toEqual([]); expect(P.computeWarnings({ supports: [] }, new Set(["target"])).length).toBe(1); });
});

describe("checkRenderers — the registry validator", () => {
  const REPO = process.cwd();
  const good = () => ({ renderers: [{ id: "svg-native", status: "installed", generator: "scripts/dataviz/render.cjs", supports: ["chart"], unsupported_warn: ["art-style"] }] });
  it("the committed knowledge/dataviz-renderers.yaml passes", () => { const doc: any = yaml.load(fs.readFileSync(path.join(REPO, "knowledge/dataviz-renderers.yaml"), "utf-8")); expect(checkRenderers(doc, REPO)).toEqual([]); });
  it("a supports param not in UNIVERSAL_PARAMS → error", () => expect(checkRenderers({ renderers: [{ id: "x", status: "registered-not-built", supports: ["bogus-param"] }] }, REPO).some((e: string) => /UNIVERSAL_PARAM/.test(e))).toBe(true));
  it("installed without an on-disk generator → error", () => expect(checkRenderers({ renderers: [{ id: "x", status: "installed", generator: "scripts/dataviz/does-not-exist.cjs", supports: [] }] }, REPO).some((e: string) => /not found on disk/.test(e))).toBe(true));
  it("registered-not-built needs NO generator", () => expect(checkRenderers({ renderers: [{ id: "stub", status: "registered-not-built", supports: [] }] }, REPO)).toEqual([]));
  it("invalid status → error", () => expect(checkRenderers({ renderers: [{ id: "x", status: "bogus" }] }, REPO).some((e: string) => /status must be/.test(e))).toBe(true));
  it("non-kebab id → error", () => expect(checkRenderers({ renderers: [{ id: "Bad_Id", status: "registered-not-built" }] }, REPO).some((e: string) => /kebab/.test(e))).toBe(true));
  it("empty renderers → error", () => expect(checkRenderers({ renderers: [] }, REPO).length).toBeGreaterThan(0));
});
