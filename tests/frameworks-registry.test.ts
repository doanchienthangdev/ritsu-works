import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as yaml from "js-yaml";
// @ts-ignore — Node interop from TS to CJS
const {
  validateRegistry,
  BOOKS,
  FOURS,
  TYPES,
  REGISTRY_REL,
  conceptsOnDisk,
} = require("../scripts/cross-tier/validate-frameworks-registry.cjs");

// ============================================================================
// All-Edge-Cases-Test (global CLAUDE.md). Unit: validateRegistry(doc, repoRoot)
// from scripts/cross-tier/validate-frameworks-registry.cjs (capability
// thinking-toolkit v1.5 — the McKinsey toolkit CANDIDATE REGISTRY).
//
// Phase 1 — signature: (doc:any, repoRoot:string) -> string[] (errors; []=valid).
//   Pure except fs (conceptsOnDisk + existsSync against repoRoot).
//   Branches: root not-mapping | version invalid | frameworks not-array | empty |
//   per-entry{not-mapping, slug kebab/dup-by-(book,slug), book∈BOOKS,
//   fours_step∈FOURS, type∈TYPES, title non-empty, wiki_path non-empty +
//   canonical-shape + exists-on-disk} | COMPLETENESS (every on-disk concept
//   registered).
// Phase 2 — boundaries: null/array/"x"/number root; version missing/non-string/
//   blank; frameworks missing/non-array/empty; entry null; slug non-kebab/dup;
//   book invalid; fours_step invalid; type invalid; title blank; wiki_path
//   missing/mismatch/phantom; cross-book same-slug ALLOWED; completeness gap.
// Phase 2N (contract): the REAL committed knowledge/problem-solving-frameworks.yaml
//   must pass against the REAL repo (every wiki_path real + registry complete).
// Synthetic docs use a TEMP FIXTURE root (a controlled wiki/ tree) because the
//   completeness check is against repoRoot's real concept dirs — a minimal doc
//   would otherwise fail "206 concepts not registered".
// Skipped: security (repoRoot is operator path, not user input); async (pure
//   sync); performance (registry is ~207 small entries).
// ============================================================================

const REPO_ROOT = process.cwd();

// ---- temp fixture: a controlled 2-book wiki tree -------------------------
// cracked-it: alpha, beta, dual   |   bulletproof: gamma, dual
// `dual` lives in BOTH books on purpose — to prove (book, slug) is the unique
// key (same slug in two books is legitimate, like the real mece/wicked-problems).
let FIXTURE: string;
beforeAll(() => {
  FIXTURE = fs.mkdtempSync(path.join(os.tmpdir(), "fwk-reg-"));
  const tree: Record<string, string[]> = {
    "cracked-it": ["alpha", "beta", "dual"],
    "bulletproof-problem-solving": ["gamma", "dual"],
  };
  for (const [book, slugs] of Object.entries(tree)) {
    const dir = path.join(FIXTURE, "wiki", book, "concepts");
    fs.mkdirSync(dir, { recursive: true });
    for (const s of slugs) fs.writeFileSync(path.join(dir, `${s}.md`), `# ${s}\n`);
  }
});
afterAll(() => { fs.rmSync(FIXTURE, { recursive: true, force: true }); });

// A COMPLETE, valid set of entries for the fixture (registers all 5 concepts).
function frames() {
  return [
    { slug: "alpha", book: "cracked-it", fours_step: "state", type: "framework", wiki_path: "wiki/cracked-it/concepts/alpha.md", title: "Alpha" },
    { slug: "beta", book: "cracked-it", fours_step: "solve", type: "technique", wiki_path: "wiki/cracked-it/concepts/beta.md", title: "Beta" },
    { slug: "dual", book: "cracked-it", fours_step: "cross", type: "concept", wiki_path: "wiki/cracked-it/concepts/dual.md", title: "Dual (CI)" },
    { slug: "gamma", book: "bulletproof-problem-solving", fours_step: "sell", type: "bias", wiki_path: "wiki/bulletproof-problem-solving/concepts/gamma.md", title: "Gamma" },
    { slug: "dual", book: "bulletproof-problem-solving", fours_step: "cross", type: "concept", wiki_path: "wiki/bulletproof-problem-solving/concepts/dual.md", title: "Dual (BP)" },
  ];
}
function fixtureDoc(over: Record<string, any> = {}) {
  return { version: "1.0.0", frameworks: frames(), ...over };
}
const has = (errs: string[], sub: string) => errs.some((e) => e.includes(sub));

describe("validateRegistry — happy path", () => {
  it("returns no errors for a complete, valid fixture doc", () => {
    expect(validateRegistry(fixtureDoc(), FIXTURE)).toEqual([]);
  });
  it("the same slug in BOTH books is allowed (unique key is (book, slug))", () => {
    // frames() includes `dual` in both cracked-it and bulletproof — must NOT dup-error.
    expect(validateRegistry(fixtureDoc(), FIXTURE)).toEqual([]);
  });
});

describe("validateRegistry — specification / real-catalog conformance", () => {
  it("the committed knowledge/problem-solving-frameworks.yaml passes against the real repo", () => {
    const doc = yaml.load(fs.readFileSync(path.join(REPO_ROOT, REGISTRY_REL), "utf-8"));
    expect(validateRegistry(doc, REPO_ROOT)).toEqual([]);
  });
  it("exports the known enums", () => {
    expect(BOOKS).toEqual(["cracked-it", "bulletproof-problem-solving"]);
    expect(FOURS).toEqual(["state", "structure", "solve", "sell", "cross"]);
    expect(TYPES).toContain("framework");
    expect(TYPES).toContain("bias");
    expect(TYPES).toContain("antipattern");
  });
  it("conceptsOnDisk returns the sorted slugs for a book", () => {
    expect(conceptsOnDisk(FIXTURE, "cracked-it")).toEqual(["alpha", "beta", "dual"]);
    expect(conceptsOnDisk(FIXTURE, "bulletproof-problem-solving")).toEqual(["dual", "gamma"]);
  });
  it("conceptsOnDisk returns [] for a missing dir", () => {
    expect(conceptsOnDisk(FIXTURE, "no-such-book")).toEqual([]);
  });
});

describe("validateRegistry — root + version boundaries", () => {
  it("null root", () => expect(validateRegistry(null, FIXTURE)).toEqual(["root must be a mapping"]));
  it("array root", () => expect(validateRegistry([], FIXTURE)).toEqual(["root must be a mapping"]));
  it("string root", () => expect(validateRegistry("x", FIXTURE)).toEqual(["root must be a mapping"]));
  it("number root", () => expect(validateRegistry(5, FIXTURE)).toEqual(["root must be a mapping"]));
  it("missing version", () => {
    const d = fixtureDoc(); delete (d as any).version;
    expect(has(validateRegistry(d, FIXTURE), "version must be a non-empty string")).toBe(true);
  });
  it("non-string version", () => expect(has(validateRegistry(fixtureDoc({ version: 5 }), FIXTURE), "version must be")).toBe(true));
  it("blank version", () => expect(has(validateRegistry(fixtureDoc({ version: "  " }), FIXTURE), "version must be")).toBe(true));
});

describe("validateRegistry — frameworks array boundaries", () => {
  it("missing frameworks -> 'frameworks must be an array'", () => {
    const d = fixtureDoc(); delete (d as any).frameworks;
    expect(has(validateRegistry(d, FIXTURE), "frameworks must be an array")).toBe(true);
  });
  it("non-array frameworks -> 'frameworks must be an array'", () => {
    expect(has(validateRegistry(fixtureDoc({ frameworks: {} }), FIXTURE), "frameworks must be an array")).toBe(true);
  });
  it("empty frameworks -> 'frameworks is empty'", () => {
    expect(has(validateRegistry(fixtureDoc({ frameworks: [] }), FIXTURE), "frameworks is empty")).toBe(true);
  });
});

describe("validateRegistry — per-entry structural", () => {
  it("null entry -> 'must be a mapping'", () => {
    const f = frames(); f.push(null as any);
    expect(has(validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE), "must be a mapping")).toBe(true);
  });
  it("non-kebab slug -> 'slug must be kebab-case'", () => {
    const f = frames(); f[0] = { ...f[0], slug: "Bad_Slug" };
    expect(has(validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE), "slug must be kebab-case")).toBe(true);
  });
  it("duplicate (book, slug) -> 'duplicate candidate'", () => {
    const f = frames(); f.push({ ...f[0] }); // alpha@cracked-it twice
    expect(has(validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE), "duplicate candidate: cracked-it/alpha")).toBe(true);
  });
  it("invalid book -> 'book must be one of'", () => {
    const f = frames(); f[0] = { ...f[0], book: "not-a-book" };
    expect(has(validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE), "book must be one of")).toBe(true);
  });
  it("invalid fours_step -> 'fours_step must be one of'", () => {
    const f = frames(); f[0] = { ...f[0], fours_step: "diagnose" };
    expect(has(validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE), "fours_step must be one of")).toBe(true);
  });
  it("invalid type -> 'type must be one of'", () => {
    const f = frames(); f[0] = { ...f[0], type: "gizmo" };
    expect(has(validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE), "type must be one of")).toBe(true);
  });
  it("blank title -> 'title must be a non-empty string'", () => {
    const f = frames(); f[0] = { ...f[0], title: "  " };
    expect(has(validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE), "title must be a non-empty string")).toBe(true);
  });
  it("each known type is accepted", () => {
    for (const t of TYPES) {
      const f = frames(); f[0] = { ...f[0], type: t };
      expect(validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE)).toEqual([]);
    }
  });
  it("each known fours_step is accepted", () => {
    for (const s of FOURS) {
      const f = frames(); f[0] = { ...f[0], fours_step: s };
      expect(validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE)).toEqual([]);
    }
  });
});

describe("validateRegistry — wiki_path checks", () => {
  it("missing wiki_path -> 'wiki_path must be a non-empty string'", () => {
    const f = frames(); delete (f[0] as any).wiki_path;
    expect(has(validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE), "wiki_path must be a non-empty string")).toBe(true);
  });
  it("wiki_path mismatching slug/book -> 'wiki_path should be'", () => {
    // alpha entry pointed at beta.md (exists → no phantom, only the should-be mismatch)
    const f = frames(); f[0] = { ...f[0], wiki_path: "wiki/cracked-it/concepts/beta.md" };
    expect(has(validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE), "wiki_path should be wiki/cracked-it/concepts/alpha.md")).toBe(true);
  });
  it("phantom wiki_path (no file) -> 'not found on disk'", () => {
    const f = frames();
    f.push({ slug: "phantom", book: "cracked-it", fours_step: "cross", type: "concept", wiki_path: "wiki/cracked-it/concepts/phantom.md", title: "Phantom" });
    expect(has(validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE), "not found on disk")).toBe(true);
  });
});

describe("validateRegistry — completeness (every on-disk concept registered)", () => {
  it("dropping a registered concept -> completeness error names the missing slug", () => {
    const f = frames().filter((e) => !(e.book === "cracked-it" && e.slug === "beta")); // drop beta
    const errs = validateRegistry(fixtureDoc({ frameworks: f }), FIXTURE);
    expect(has(errs, "cracked-it:")).toBe(true);
    expect(has(errs, "beta")).toBe(true);
  });
  it("a complete registry passes the completeness check", () => {
    expect(validateRegistry(fixtureDoc(), FIXTURE)).toEqual([]);
  });
});
