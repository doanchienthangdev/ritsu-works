import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
// @ts-ignore — Node interop from TS to CJS
const { validateEntry, FORBIDDEN_BRAND_KEYS, AUDIENCE } = require("../scripts/cross-tier/validate-mckinsey-templates.cjs");

// ============================================================================
// All-Edge-Cases-Test (global CLAUDE.md). Unit: validateEntry(e) -> string[]
// from scripts/cross-tier/validate-mckinsey-templates.cjs (capability
// thinking-toolkit v2.0 — the McKinsey Sell template registry).
//
// Phase 1 — signature: (e:any) -> string[] (errors; []=valid). Pure (no I/O).
//   Branches: not-mapping | id missing/non-string/non-kebab | name empty |
//   when_to_use empty | audience missing/not-in-enum | structure not-array/empty/
//   non-string-item | rules not-array/empty/non-string-item | default_format empty |
//   FORBIDDEN_BRAND_KEYS present (orthogonality guard).
// Phase 2N (spec/contract): the REAL committed knowledge/mckinsey-templates.yaml
//   passes validateEntry for every entry + ids unique.
// Skipped: security (validator reads an operator-maintained registry, not user
//   input); async (pure sync); performance (small registry).
// ============================================================================

const REPO_ROOT = process.cwd();
const REGISTRY = path.join(REPO_ROOT, "knowledge", "mckinsey-templates.yaml");

const GOOD = () => ({
  id: "governing-thought-memo",
  name: "Governing-Thought Memo",
  when_to_use: "The default decision-ready recommendation.",
  audience: "both",
  structure: ["Governing thought", "MECE key line", "Support"],
  rules: ["Pyramid", "APK guard"],
  default_format: "article",
  grounded_in: ["McKinsey exec summary SCR/Pyramid — slideuplift.com"],
});
const has = (errs: string[], sub: string) => errs.some((e) => e.includes(sub));

describe("validateEntry — happy path", () => {
  it("a structurally valid template entry returns no errors", () => {
    expect(validateEntry(GOOD())).toEqual([]);
  });
  it("each allowed audience value is accepted", () => {
    for (const a of AUDIENCE) expect(validateEntry({ ...GOOD(), audience: a })).toEqual([]);
  });
});

describe("validateEntry — specification / real-catalog conformance", () => {
  it("the committed knowledge/mckinsey-templates.yaml: every entry is valid + ids unique", () => {
    const doc: any = yaml.load(fs.readFileSync(REGISTRY, "utf-8"));
    expect(Array.isArray(doc.mckinsey_templates)).toBe(true);
    expect(doc.mckinsey_templates.length).toBeGreaterThanOrEqual(9); // v2.1: 6 refined + 3 real types
    const seen = new Set<string>();
    for (const e of doc.mckinsey_templates) {
      expect(validateEntry(e)).toEqual([]);
      expect(seen.has(e.id)).toBe(false);
      seen.add(e.id);
      // v2.1 "not guessed" anchor: every template cites a real McKinsey report
      expect(Array.isArray(e.grounded_in) && e.grounded_in.length > 0).toBe(true);
    }
  });
  it("exports the audience enum + a non-empty forbidden-brand-key set", () => {
    expect(AUDIENCE).toEqual(["receptive", "skeptical", "both"]);
    expect(Array.isArray(FORBIDDEN_BRAND_KEYS)).toBe(true);
    expect(FORBIDDEN_BRAND_KEYS.length).toBeGreaterThan(0);
  });
});

describe("validateEntry — root boundaries", () => {
  it("null → 'entry must be a mapping'", () => expect(validateEntry(null)).toEqual(["entry must be a mapping"]));
  it("array → 'entry must be a mapping'", () => expect(validateEntry([])).toEqual(["entry must be a mapping"]));
  it("string → 'entry must be a mapping'", () => expect(validateEntry("x")).toEqual(["entry must be a mapping"]));
  it("number → 'entry must be a mapping'", () => expect(validateEntry(42 as any)).toEqual(["entry must be a mapping"]));
});

describe("validateEntry — id", () => {
  it("missing id → error", () => { const e = GOOD(); delete (e as any).id; expect(has(validateEntry(e), "id must be kebab-case")).toBe(true); });
  it("non-string id → error", () => expect(has(validateEntry({ ...GOOD(), id: 7 }), "id must be kebab-case")).toBe(true));
  it("uppercase id → error", () => expect(has(validateEntry({ ...GOOD(), id: "Memo" }), "id must be kebab-case")).toBe(true));
  it("underscore id → error", () => expect(has(validateEntry({ ...GOOD(), id: "exec_pager" }), "id must be kebab-case")).toBe(true));
  it("dotted id → error", () => expect(has(validateEntry({ ...GOOD(), id: "a.b" }), "id must be kebab-case")).toBe(true));
  it("leading-hyphen id → error", () => expect(has(validateEntry({ ...GOOD(), id: "-x" }), "id must be kebab-case")).toBe(true));
});

describe("validateEntry — required prose fields", () => {
  it("empty name → error", () => expect(has(validateEntry({ ...GOOD(), name: "  " }), "name must be a non-empty string")).toBe(true));
  it("missing when_to_use → error", () => { const e = GOOD(); delete (e as any).when_to_use; expect(has(validateEntry(e), "when_to_use must be")).toBe(true); });
  it("empty default_format → error", () => expect(has(validateEntry({ ...GOOD(), default_format: "" }), "default_format must be")).toBe(true));
});

describe("validateEntry — audience enum", () => {
  it("missing audience → error", () => { const e = GOOD(); delete (e as any).audience; expect(has(validateEntry(e), "audience must be one of")).toBe(true); });
  it("invalid audience value → error", () => expect(has(validateEntry({ ...GOOD(), audience: "everyone" }), "audience must be one of")).toBe(true));
});

describe("validateEntry — structure + rules arrays", () => {
  it("structure not an array → error", () => expect(has(validateEntry({ ...GOOD(), structure: "x" }), "structure must be a non-empty array")).toBe(true));
  it("structure empty → error", () => expect(has(validateEntry({ ...GOOD(), structure: [] }), "structure must be a non-empty array")).toBe(true));
  it("structure with a non-string item → error", () => expect(has(validateEntry({ ...GOOD(), structure: ["ok", 3] }), "structure must be a non-empty array")).toBe(true));
  it("structure with a whitespace item → error", () => expect(has(validateEntry({ ...GOOD(), structure: ["ok", "  "] }), "structure must be a non-empty array")).toBe(true));
  it("rules not an array → error", () => expect(has(validateEntry({ ...GOOD(), rules: 5 }), "rules must be a non-empty array")).toBe(true));
  it("rules empty → error", () => expect(has(validateEntry({ ...GOOD(), rules: [] }), "rules must be a non-empty array")).toBe(true));
});

describe("validateEntry — FORBIDDEN brand/design keys (orthogonality guard)", () => {
  it("every forbidden key is caught (case-insensitive)", () => {
    for (const k of FORBIDDEN_BRAND_KEYS) {
      expect(has(validateEntry({ ...GOOD(), [k]: "x" }), "forbidden brand/design key")).toBe(true);
      expect(has(validateEntry({ ...GOOD(), [k.toUpperCase()]: "x" }), "forbidden brand/design key")).toBe(true);
    }
  });
  it("a colors token is rejected (a template must not shadow the resolved --style)", () => {
    expect(has(validateEntry({ ...GOOD(), colors: "#fff" }), "forbidden brand/design key")).toBe(true);
  });
  it("secondary_palette (allowed in art-styles) is FORBIDDEN here", () => {
    expect(has(validateEntry({ ...GOOD(), secondary_palette: "orange" }), "forbidden brand/design key")).toBe(true);
  });
});

describe("validateEntry — multiple errors accumulate", () => {
  it("a fully-malformed entry reports several distinct errors", () => {
    const errs = validateEntry({ id: "BAD", audience: "nope", structure: [], rules: [], colors: "x" });
    expect(errs.length).toBeGreaterThanOrEqual(4);
    expect(has(errs, "id must be kebab-case")).toBe(true);
    expect(has(errs, "audience must be one of")).toBe(true);
    expect(has(errs, "forbidden brand/design key")).toBe(true);
  });
});

describe("validateEntry — grounded_in (v2.1 'not guessed' anchor)", () => {
  it("missing grounded_in → error", () => { const e = GOOD(); delete (e as any).grounded_in; expect(has(validateEntry(e), "grounded_in must be a non-empty array")).toBe(true); });
  it("grounded_in not an array → error", () => expect(has(validateEntry({ ...GOOD(), grounded_in: "a report" }), "grounded_in must be a non-empty array")).toBe(true));
  it("empty grounded_in → error", () => expect(has(validateEntry({ ...GOOD(), grounded_in: [] }), "grounded_in must be a non-empty array")).toBe(true));
  it("grounded_in with a non-string item → error", () => expect(has(validateEntry({ ...GOOD(), grounded_in: ["ok", 7] }), "grounded_in must be a non-empty array")).toBe(true));
  it("grounded_in with a whitespace item → error", () => expect(has(validateEntry({ ...GOOD(), grounded_in: ["  "] }), "grounded_in must be a non-empty array")).toBe(true));
  it("a valid grounded_in citation passes", () => expect(validateEntry({ ...GOOD(), grounded_in: ["MGI 'AI: The Next Digital Frontier' (anyflip.com/hhxry/mlmg)"] })).toEqual([]));
});
