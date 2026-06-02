import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
// @ts-ignore — Node interop from TS to CJS
const {
  validateWorkflow,
  CANONICAL_4S,
  ARTIFACTS,
  TOOLS,
  ENGINE_SECTIONS,
  REGISTRY_REL,
} = require("../scripts/cross-tier/validate-mckinsey-workflow.cjs");

// ============================================================================
// All-Edge-Cases-Test (global CLAUDE.md). Unit: validateWorkflow(doc, repoRoot)
// from scripts/cross-tier/validate-mckinsey-workflow.cjs (capability
// thinking-toolkit v1.4 — the McKinsey 4S dynamic-engine catalog).
//
// Phase 1 — signature: (doc:any, repoRoot:string) -> string[] (errors; []=valid).
//   Pure except fs.existsSync against repoRoot for skill + concept file checks.
//   Branches: root not-mapping | version invalid | steps not-array | steps empty |
//   per-step{not-mapping, id kebab/dup, order int/>=1, name/intent non-empty,
//   skills non-empty + exist, key_concepts non-empty + {book,slug} + exist,
//   produces non-empty + ∈ARTIFACTS, retrieval{query,sources}} | orders unique |
//   orders contiguous 1..N | canonical 4S | artifacts{run_folder, files[name∈
//   ARTIFACTS, stage∈stepIds, contents]} | data_routing[need, tool∈TOOLS,
//   invoke, hitl] | each engine section non-empty + concept refs exist |
//   back_edges from/to ∈ stepIds.
// Phase 2N (contract): the REAL committed knowledge/mckinsey-workflow.yaml must
//   pass against the REAL repo (every skill + concept + tool + artifact real).
// Skipped: security (repoRoot is operator path, not user input); async (pure
//   sync); performance (catalog is ~4 steps + small sections).
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
    produces: ["problem-statement"],
    retrieval: { query: "find things", sources: ["cracked-it"] },
    ...over,
  };
}
function validDoc(over: Record<string, any> = {}) {
  return {
    version: "1.4.0",
    steps: [step("state", 1), step("structure", 2), step("solve", 3), step("sell", 4)],
    artifacts: {
      run_folder: ".archives/mckinsey/<slug>/",
      files: [{ name: "problem-statement", stage: "state", contents: "TOSCA + Core Question" }],
    },
    data_routing: [{ need: "internal evidence", tool: "deepask", invoke: '/deepask "q"', hitl: "A" }],
    validation_gate: [{ check: "knock-out", test: "moves the answer?", concept: { ...REAL_CONCEPT } }],
    routing_rules: [{ when: "analysis clears gate", then: "update one-day answer", concept: { ...REAL_CONCEPT } }],
    hitl_triggers: [{ when: "founder-only data", ask: "request it", concept: { ...REAL_CONCEPT } }],
    back_edges: [{ from: "solve", to: "state", trigger: "mis-framed", concept: { ...REAL_CONCEPT } }],
    stopping_criterion: [{ condition: "proven + robust", concept: { ...REAL_CONCEPT } }],
    ...over,
  };
}
const has = (errs: string[], sub: string) => errs.some((e) => e.includes(sub));

describe("validateWorkflow — happy path", () => {
  it("returns no errors for a structurally valid v1.4 doc", () => {
    expect(validateWorkflow(validDoc(), REPO_ROOT)).toEqual([]);
  });
});

describe("validateWorkflow — specification / real-catalog conformance", () => {
  it("the committed knowledge/mckinsey-workflow.yaml passes against the real repo", () => {
    const doc = yaml.load(fs.readFileSync(path.join(REPO_ROOT, REGISTRY_REL), "utf-8"));
    expect(validateWorkflow(doc, REPO_ROOT)).toEqual([]);
  });
  it("exports the canonical 4S ids + the v1.4 known sets", () => {
    expect(CANONICAL_4S).toEqual(["state", "structure", "solve", "sell"]);
    expect(ARTIFACTS).toContain("workplan");
    expect(ARTIFACTS).toContain("one-day-answer");
    expect(TOOLS).toContain("deepask");
    expect(TOOLS).toContain("ask-user");
    expect(ENGINE_SECTIONS).toContain("validation_gate");
    expect(ENGINE_SECTIONS).toContain("back_edges");
  });
});

describe("validateWorkflow — root + version + steps boundaries", () => {
  it("null root", () => expect(validateWorkflow(null, REPO_ROOT)).toEqual(["root must be a mapping"]));
  it("array root", () => expect(validateWorkflow([], REPO_ROOT)).toEqual(["root must be a mapping"]));
  it("string root", () => expect(validateWorkflow("x", REPO_ROOT)).toEqual(["root must be a mapping"]));
  it("missing version", () => {
    const d = validDoc(); delete (d as any).version;
    expect(has(validateWorkflow(d, REPO_ROOT), "version must be")).toBe(true);
  });
  it("non-string version", () => expect(has(validateWorkflow(validDoc({ version: 5 }), REPO_ROOT), "version must be")).toBe(true));
  it("missing steps -> 'steps must be an array'", () => {
    const d = validDoc(); delete (d as any).steps;
    expect(has(validateWorkflow(d, REPO_ROOT), "steps must be an array")).toBe(true);
  });
  it("empty steps -> 'steps is empty'", () => expect(has(validateWorkflow(validDoc({ steps: [] }), REPO_ROOT), "steps is empty")).toBe(true));
});

describe("validateWorkflow — per-step structural", () => {
  it("null step -> 'must be a mapping'", () => {
    const d = validDoc({ steps: [step("state", 1), step("structure", 2), step("solve", 3), null] });
    expect(has(validateWorkflow(d, REPO_ROOT), "must be a mapping")).toBe(true);
  });
  it("non-kebab id", () => {
    const d = validDoc({ steps: [step("State", 1), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "id must be kebab-case")).toBe(true);
  });
  it("duplicate id", () => {
    const d = validDoc({ steps: [step("state", 1), step("state", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "duplicate step id")).toBe(true);
  });
  it("non-integer order", () => {
    const d = validDoc({ steps: [step("state", 1.5), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "order must be an integer")).toBe(true);
  });
  it("order < 1", () => {
    const d = validDoc({ steps: [step("state", 0), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "order must be an integer >= 1")).toBe(true);
  });
  it("empty name", () => {
    const d = validDoc({ steps: [step("state", 1, { name: " " }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "name must be a non-empty string")).toBe(true);
  });
  it("empty intent", () => {
    const d = validDoc({ steps: [step("state", 1, { intent: "" }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "intent must be a non-empty string")).toBe(true);
  });
  it("empty skills", () => {
    const d = validDoc({ steps: [step("state", 1, { skills: [] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "skills must be a non-empty array")).toBe(true);
  });
  it("non-string skill entry", () => {
    const d = validDoc({ steps: [step("state", 1, { skills: [42] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "skill entry must be a non-empty string")).toBe(true);
  });
  it("empty key_concepts", () => {
    const d = validDoc({ steps: [step("state", 1, { key_concepts: [] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "key_concepts must be a non-empty array")).toBe(true);
  });
  it("malformed key_concept (missing slug)", () => {
    const d = validDoc({ steps: [step("state", 1, { key_concepts: [{ book: "cracked-it" }] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "concept must be a {book, slug}")).toBe(true);
  });
  it("missing retrieval", () => {
    const d = validDoc({ steps: [step("state", 1, { retrieval: undefined }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "retrieval must be a mapping")).toBe(true);
  });
  it("empty retrieval.query", () => {
    const d = validDoc({ steps: [step("state", 1, { retrieval: { query: "", sources: ["cracked-it"] } }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "retrieval.query must be a non-empty string")).toBe(true);
  });
});

describe("validateWorkflow — file-existence (broken cross-tier refs)", () => {
  it("nonexistent skill", () => {
    const d = validDoc({ steps: [step("state", 1, { skills: ["thinking-toolkit/nope"] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "skill not found on disk")).toBe(true);
  });
  it("nonexistent concept slug", () => {
    const d = validDoc({ steps: [step("state", 1, { key_concepts: [{ book: "cracked-it", slug: "no-such-concept" }] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "concept not found on disk")).toBe(true);
  });
  it("nonexistent book", () => {
    const d = validDoc({ steps: [step("state", 1, { key_concepts: [{ book: "not-a-book", slug: "tosca-framework" }] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "concept not found on disk")).toBe(true);
  });
  it("non-kebab slug", () => {
    const d = validDoc({ steps: [step("state", 1, { key_concepts: [{ book: "cracked-it", slug: "Tosca_X" }] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "concept slug not kebab-case")).toBe(true);
  });
});

describe("validateWorkflow — cross-step invariants", () => {
  it("duplicate order", () => {
    const d = validDoc({ steps: [step("state", 1), step("structure", 1), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "orders must be unique")).toBe(true);
  });
  it("order gap", () => {
    const d = validDoc({ steps: [step("state", 1), step("structure", 2), step("solve", 3), step("sell", 5)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "contiguous")).toBe(true);
  });
  it("missing canonical step 'sell'", () => {
    const d = validDoc({ steps: [step("state", 1), step("structure", 2), step("solve", 3), step("extra", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "missing canonical 4S step: 'sell'")).toBe(true);
  });
});

// ---- v1.4 ENGINE FIELDS (the dynamic-engine additions) ----

describe("validateWorkflow — v1.4 produces", () => {
  it("missing produces -> error", () => {
    const d = validDoc({ steps: [step("state", 1, { produces: undefined }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "produces must be a non-empty array")).toBe(true);
  });
  it("empty produces -> error", () => {
    const d = validDoc({ steps: [step("state", 1, { produces: [] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "produces must be a non-empty array")).toBe(true);
  });
  it("unknown artifact in produces -> error", () => {
    const d = validDoc({ steps: [step("state", 1, { produces: ["nonsense"] }), step("structure", 2), step("solve", 3), step("sell", 4)] });
    expect(has(validateWorkflow(d, REPO_ROOT), "unknown artifact in produces")).toBe(true);
  });
});

describe("validateWorkflow — v1.4 artifacts", () => {
  it("missing artifacts -> error", () => {
    const d = validDoc(); delete (d as any).artifacts;
    expect(has(validateWorkflow(d, REPO_ROOT), "artifacts must be a mapping")).toBe(true);
  });
  it("empty artifacts.files -> error", () => {
    expect(has(validateWorkflow(validDoc({ artifacts: { run_folder: "x/", files: [] } }), REPO_ROOT), "artifacts.files must be a non-empty array")).toBe(true);
  });
  it("missing run_folder -> error", () => {
    expect(has(validateWorkflow(validDoc({ artifacts: { files: [{ name: "synthesis", stage: "sell", contents: "x" }] } }), REPO_ROOT), "run_folder must be a non-empty string")).toBe(true);
  });
  it("unknown artifact file name -> error", () => {
    expect(has(validateWorkflow(validDoc({ artifacts: { run_folder: "x/", files: [{ name: "bogus", stage: "state", contents: "x" }] } }), REPO_ROOT), "unknown artifact name")).toBe(true);
  });
  it("artifact file stage not a step id -> error", () => {
    expect(has(validateWorkflow(validDoc({ artifacts: { run_folder: "x/", files: [{ name: "synthesis", stage: "nope", contents: "x" }] } }), REPO_ROOT), "is not a step id")).toBe(true);
  });
});

describe("validateWorkflow — v1.4 data_routing", () => {
  it("missing data_routing -> error", () => {
    const d = validDoc(); delete (d as any).data_routing;
    expect(has(validateWorkflow(d, REPO_ROOT), "data_routing must be a non-empty array")).toBe(true);
  });
  it("unknown tool -> error", () => {
    expect(has(validateWorkflow(validDoc({ data_routing: [{ need: "x", tool: "magic-llm", invoke: "y", hitl: "A" }] }), REPO_ROOT), "unknown tool")).toBe(true);
  });
  it("missing invoke -> error", () => {
    expect(has(validateWorkflow(validDoc({ data_routing: [{ need: "x", tool: "deepask", hitl: "A" }] }), REPO_ROOT), "invoke must be a non-empty string")).toBe(true);
  });
  it("each known tool is accepted", () => {
    for (const t of TOOLS) {
      const d = validDoc({ data_routing: [{ need: "x", tool: t, invoke: "y", hitl: "A" }] });
      expect(validateWorkflow(d, REPO_ROOT)).toEqual([]);
    }
  });
});

describe("validateWorkflow — v1.4 engine sections", () => {
  for (const sec of ["validation_gate", "routing_rules", "hitl_triggers", "back_edges", "stopping_criterion"]) {
    it(`missing ${sec} -> error`, () => {
      const d = validDoc(); delete (d as any)[sec];
      expect(has(validateWorkflow(d, REPO_ROOT), `${sec} must be a non-empty array`)).toBe(true);
    });
    it(`empty ${sec} -> error`, () => {
      expect(has(validateWorkflow(validDoc({ [sec]: [] }), REPO_ROOT), `${sec} must be a non-empty array`)).toBe(true);
    });
  }
  it("engine-section concept ref that doesn't exist -> 'concept not found on disk'", () => {
    const d = validDoc({ validation_gate: [{ check: "x", test: "y", concept: { book: "cracked-it", slug: "ghost-concept" } }] });
    expect(has(validateWorkflow(d, REPO_ROOT), "concept not found on disk")).toBe(true);
  });
  it("back_edge with a from that isn't a step id -> error", () => {
    const d = validDoc({ back_edges: [{ from: "nope", to: "state", trigger: "x", concept: { ...REAL_CONCEPT } }] });
    expect(has(validateWorkflow(d, REPO_ROOT), "from 'nope' is not a step id")).toBe(true);
  });
  it("back_edge with a to that isn't a step id -> error", () => {
    const d = validDoc({ back_edges: [{ from: "solve", to: "nowhere", trigger: "x", concept: { ...REAL_CONCEPT } }] });
    expect(has(validateWorkflow(d, REPO_ROOT), "to 'nowhere' is not a step id")).toBe(true);
  });
});
