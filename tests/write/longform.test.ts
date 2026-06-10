import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
// @ts-ignore
const LF = require("../../scripts/write/longform/plan.cjs");
// @ts-ignore
const Cont = require("../../scripts/write/longform/continuity.cjs");
// @ts-ignore
const Types = require("../../scripts/write/lib/types.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Long-form scaffolder + continuity floor (v0.4).

describe("types.cjs isLongform", () => {
  const doc = Types.loadTypes();
  it.each(["book", "novel", "film-script", "research-paper", "article-series", "course"])(
    "%s is long-form in the registry", (id) => {
      expect(Types.isLongform(Types.resolveType(id, doc))).toBe(true);
    });
  it("a normal type is not long-form", () => {
    expect(Types.isLongform(Types.resolveType("blog", doc))).toBe(false);
    expect(Types.isLongform(null)).toBe(false);
  });
});

describe("longform planParts", () => {
  it("research-paper has the 8 fixed sections", () => {
    const parts = LF.planParts("research-paper", 8000);
    expect(parts.length).toBe(8);
    expect(parts.map((p: any) => p.title)).toContain("Method");
    expect(parts.map((p: any) => p.title)).toContain("References");
  });
  it("a novel scales chapters to word count, clamped", () => {
    expect(LF.planParts("novel", 70000).length).toBeGreaterThanOrEqual(8);
    expect(LF.planParts("novel", 70000).length).toBeLessThanOrEqual(40);
    expect(LF.planParts("novel", 5000).length).toBeGreaterThanOrEqual(8); // min clamp
  });
  it("every part has a word_budget + an owns array", () => {
    for (const p of LF.planParts("book", 60000)) {
      expect(p.word_budget).toBeGreaterThan(0);
      expect(Array.isArray(p.owns)).toBe(true);
    }
  });
  it("PART_SPEC covers all 6 long-form types", () => {
    for (const id of ["book", "novel", "film-script", "research-paper", "article-series", "course"]) {
      expect(LF.PART_SPEC[id]).toBeDefined();
    }
  });
});

describe("longform plan scaffolder", () => {
  it("writes bible.md + parts.json under the out dir", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lf-"));
    const r = LF.plan({ type: "novel", request: "x", words: 40000, outDir: tmp });
    expect(r.ok).toBe(true);
    expect(fs.existsSync(r.bible)).toBe(true);
    expect(fs.existsSync(r.partsPlanPath)).toBe(true);
    const parts = JSON.parse(fs.readFileSync(r.partsPlanPath, "utf8"));
    expect(parts.parts.length).toBe(r.parts);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
  it("an explicit --parts overrides the heuristic", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lf-"));
    const r = LF.plan({ type: "book", words: 60000, outDir: tmp, parts: 7 });
    expect(r.parts).toBe(7);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("continuity floor", () => {
  it("flags a near-duplicate name as drift (Alyce vs Alice)", () => {
    const r = Cont.check(
      writeTmp("# s\nAlice studied. Alyce forgot."),
      writeTmp("# bible\n## characters\nAlice — the student."),
    );
    expect(r.ok).toBe(true);
    expect(r.possible_drift.some((d: any) => d.in_draft === "Alyce" && d.bible === "Alice")).toBe(true);
  });
  it("flags a bible term that never appears in the draft", () => {
    const r = Cont.check(
      writeTmp("# s\nNothing relevant here at all today."),
      writeTmp("# bible\nThe `Memory Palace` is central."),
    );
    expect(r.missing_from_draft).toContain("Memory Palace");
  });
  it("clean draft → no drift, term present", () => {
    const r = Cont.check(
      writeTmp("# s\nThe Memory Palace works. Alice used it."),
      writeTmp("# bible\n## characters\nAlice.\n`Memory Palace` — a technique."),
    );
    expect(r.possible_drift.length).toBe(0);
    expect(r.missing_from_draft).not.toContain("Memory Palace");
  });
  it("missing draft file → ok:false", () => {
    expect(Cont.check("/no/such/file.md", null).ok).toBe(false);
  });
  it("lev distance is bounded + correct for ≤2", () => {
    expect(Cont.lev("Alice", "Alyce")).toBe(1);
    expect(Cont.lev("cat", "dog")).toBeGreaterThanOrEqual(3);
  });
});

function writeTmp(content: string): string {
  const p = path.join(os.tmpdir(), `lf-${Math.abs(hashish(content))}.md`);
  fs.writeFileSync(p, content);
  return p;
}
function hashish(s: string): number {
  let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return h;
}
