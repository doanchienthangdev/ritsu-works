import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
// @ts-ignore — Node interop from TS to CJS
const {
  validateWorkflow,
  CANONICAL_4S,
  REGISTRY_REL,
} = require("../scripts/cross-tier/validate-mckinsey-workflow.cjs");

// ============================================================================
// All-Edge-Cases-Test (global CLAUDE.md). Unit: validateWorkflow(doc, repoRoot)
// from scripts/cross-tier/validate-mckinsey-workflow.cjs (capability
// thinking-toolkit v1.3).
//
// Phase 1 — signature: (doc:any, repoRoot:string) -> string[] (errors; []=valid).
//   Pure except fs.existsSync against repoRoot for skill + concept file checks.
//   Branches: root not-mapping | version invalid | steps not-array | steps empty |
//   per-step{not-mapping, id kebab/dup, order int/>=1, name/intent non-empty,
//   skills non-empty-array + each exists on disk, key_concepts non-empty-array +
//   each {book,slug} + slug kebab + exists on disk, retrieval mapping{query,sources}} |
//   orders unique | orders contiguous 1..N | canonical 4S coverage.
// Phase 2 — edge values: null/array/string root; missing/non-string/empty version;
//   non-array/empty steps; null step; non-kebab + dup id; float/zero/negative order;
//   empty name/intent; empty/missing skills; non-string skill; missing/nonexistent
//   skill file; empty key_concepts; malformed concept; nonexistent concept/book;
//   non-kebab slug; missing/empty retrieval fields; dup order; order gap; missing
//   canonical step.
// Phase 2N (contract): the REAL committed knowledge/mckinsey-workflow.yaml must
//   pass against the REAL repo (skills + concepts exist) — the integration spine.
// Skipped: security (repoRoot is operator-supplied repo path, not user input);
//   async/state-sequences (pure sync function); performance (catalog is ~4 steps).
// ============================================================================

const REPO_ROOT = process.cwd(); // vitest runs from repo root
const REAL_SKILL = "thinking-toolkit/tosca-problem-framing";
const REAL_CONCEPT = { book: "cracked-it", slug: "tosca-framework" };

function step(id: string, order: number, over: Record<string, any> = {}) {
  return {
    id,
    order,
    name: `${id} step`,
    intent: `do the ${id} step`,
    skills: [REAL_SKILL],
    key_concepts: [{ ...REAL_CONCEPT }],
    retrieval: { query: "find things", sources: ["cracked-it"] },
    ...over,
  };
}
function validDoc(over: Record<string, any> = {}) {
  return {
    version: "1.0.0",
    steps: [step("state", 1), step("structure", 2), step("solve", 3), step("sell", 4)],
    ...over,
  };
}
const has = (errs: string[], sub: string) => errs.some((e) => e.includes(sub));

describe("validateWorkflow — happy path", () => {
  it("returns no errors for a structurally valid doc with real skill + concept refs", () => {
    expect(validateWorkflow(validDoc(), REPO_ROOT)).toEqual([]);
  });
});

describe("validateWorkflow — specification / real-catalog conformance", () => {
  it("the committed knowledge/mckinsey-workflow.yaml passes against the real repo", () => {
    const doc = yaml.load(fs.readFileSync(path.join(REPO_ROOT, REGISTRY_REL), "utf-8"));
    expect(validateWorkflow(doc, REPO_ROOT)).toEqual([]);
  });
  it("exports the 4 canonical 4S step ids", () => {
    expect(CANONICAL_4S).toEqual(["state", "structure", "solve", "sell"]);
  });
});

describe("validateWorkflow — root boundaries", () => {
  it("null root -> 'root must be a mapping'", () => {
    expect(validateWorkflow(null, REPO_ROOT)).toEqual(["root must be a mapping"]);
  });
  it("array root -> 'root must be a mapping'", () => {
    expect(validateWorkflow([], REPO_ROOT)).toEqual(["root must be a mapping"]);
  });
  it("string root -> 'root must be a mapping'", () => {
    expect(validateWorkflow("nope", REPO_ROOT)).toEqual(["root must be a mapping"]);
  });
});

describe("validateWorkflow — version boundaries", () => {
  it("missing version -> error", () => {
    const d = validDoc();
    delete (d as any).version;
    expect(has(validateWorkflow(d, REPO_ROOT), "version must be a non-empty string")).toBe(true);
  });
  it("non-string version -> error", () => {
    expect(has(validateWorkflow(validDoc({ version: 123 }), REPO_ROOT), "version must be")).toBe(true);
  });
  it("empty/whitespace version -> error", () => {
    expect(has(validateWorkflow(validDoc({ version: "   " }), REPO_ROOT), "version must be")).toBe(true);
  });
});

describe("validateWorkflow — steps boundaries", () => {
  it("missing steps -> 'steps must be an array'", () => {
    const d = validDoc();
    delete (d as any).steps;
    expect(has(validateWorkflow(d, REPO_ROOT), "steps must be an array")).toBe(true);
  });
  it("non-array steps -> 'steps must be an array'", () => {
    expect(has(validateWorkflow(validDoc({ steps: "x" }), REPO_ROOT), "steps must be an array")).toBe(true);
  });
  it("empty steps -> 'steps is empty'", () => {
    expect(has(validateWorkflow(validDoc({ steps: [] }), REPO_ROOT), "steps is empty")).toBe(true);
  });
});

describe("validateWorkflow — per-step structural", () => {
  it("null step entry -> 'must be a mapping'", () => {
    const d = validDoc({ steps: [step("state", 1), step("structure", 2), step("solve", 3), null] });
    expect(has(validateWorkflow(d, REPO_ROOT), "must be a mapping")).toBe(true);
  });
  it("non-kebab id -> 'id must be kebab-case'", () => {
    const d = validDoc({ steps: [step("State", 1), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "id must be kebab-case")).toBe(true);
  });
  it("duplicate id -> 'duplicate step id'", () => {
    const d = validDoc({ steps: [step("state", 1), step("state", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "duplicate step id")).toBe(true);
  });
  it("non-integer order -> 'order must be an integer'", () => {
    const d = validDoc({ steps: [step("state", 1.5), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "order must be an integer")).toBe(true);
  });
  it("order < 1 -> 'order must be'", () => {
    const d = validDoc({ steps: [step("state", 0), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "order must be an integer >= 1")).toBe(true);
  });
  it("empty name -> 'name must be'", () => {
    const d = validDoc({ steps: [step("state", 1, { name: "  " }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "name must be a non-empty string")).toBe(true);
  });
  it("empty intent -> 'intent must be'", () => {
    const d = validDoc({ steps: [step("state", 1, { intent: "" }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "intent must be a non-empty string")).toBe(true);
  });
  it("missing/empty skills -> 'skills must be a non-empty array'", () => {
    const d = validDoc({ steps: [step("state", 1, { skills: [] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "skills must be a non-empty array")).toBe(true);
  });
  it("non-string skill entry -> 'skill entry must be a non-empty string'", () => {
    const d = validDoc({ steps: [step("state", 1, { skills: [42] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "skill entry must be a non-empty string")).toBe(true);
  });
  it("empty key_concepts -> 'key_concepts must be a non-empty array'", () => {
    const d = validDoc({ steps: [step("state", 1, { key_concepts: [] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "key_concepts must be a non-empty array")).toBe(true);
  });
  it("malformed key_concept (missing slug) -> 'key_concept must be'", () => {
    const d = validDoc({ steps: [step("state", 1, { key_concepts: [{ book: "cracked-it" }] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "key_concept must be a {book, slug}")).toBe(true);
  });
  it("missing retrieval -> 'retrieval must be a mapping'", () => {
    const d = validDoc({ steps: [step("state", 1, { retrieval: undefined }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "retrieval must be a mapping")).toBe(true);
  });
  it("empty retrieval.query -> 'retrieval.query must be'", () => {
    const d = validDoc({ steps: [step("state", 1, { retrieval: { query: "", sources: ["cracked-it"] } }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "retrieval.query must be a non-empty string")).toBe(true);
  });
  it("empty retrieval.sources -> 'retrieval.sources must be'", () => {
    const d = validDoc({ steps: [step("state", 1, { retrieval: { query: "x", sources: [] } }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "retrieval.sources must be a non-empty array")).toBe(true);
  });
});

describe("validateWorkflow — file-existence (broken cross-tier refs)", () => {
  it("nonexistent skill -> 'skill not found on disk'", () => {
    const d = validDoc({ steps: [step("state", 1, { skills: ["thinking-toolkit/does-not-exist"] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "skill not found on disk")).toBe(true);
  });
  it("nonexistent concept slug -> 'concept not found on disk'", () => {
    const d = validDoc({ steps: [step("state", 1, { key_concepts: [{ book: "cracked-it", slug: "no-such-concept" }] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "concept not found on disk")).toBe(true);
  });
  it("nonexistent book -> 'concept not found on disk'", () => {
    const d = validDoc({ steps: [step("state", 1, { key_concepts: [{ book: "not-a-book", slug: "tosca-framework" }] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "concept not found on disk")).toBe(true);
  });
  it("non-kebab slug -> 'concept slug not kebab-case'", () => {
    const d = validDoc({ steps: [step("state", 1, { key_concepts: [{ book: "cracked-it", slug: "Tosca_Framework" }] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "concept slug not kebab-case")).toBe(true);
  });
});

describe("validateWorkflow — cross-step invariants", () => {
  it("duplicate order -> 'orders must be unique'", () => {
    const d = validDoc({ steps: [step("state", 1), step("structure", 1), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "orders must be unique")).toBe(true);
  });
  it("order gap (1,2,3,5) -> 'contiguous'", () => {
    const d = validDoc({ steps: [step("state", 1), step("structure", 2), step("solve", 3), step("sell", 5)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "contiguous")).toBe(true);
  });
  it("missing canonical step ('sell' renamed) -> \"missing canonical 4S step: 'sell'\"", () => {
    const d = validDoc({ steps: [step("state", 1), step("structure", 2), step("solve", 3), step("extra", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "missing canonical 4S step: 'sell'")).toBe(true);
  });
  it("missing ALL canonical steps -> 4 'missing canonical' errors", () => {
    const d = validDoc({ steps: [step("a", 1), step("b", 2), step("c", 3), step("d", 4)] });
    const errs = validateWorkflow(d, REPO_ROOT);
    for (const c of CANONICAL_4S) expect(has(errs, `missing canonical 4S step: '${c}'`)).toBe(true);
  });
});
