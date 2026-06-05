import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
// @ts-ignore — Node interop from TS to CJS
const { validateCoherence, DOCS, REGISTRIES } = require("../scripts/cross-tier/validate-mckinsey-coherence.cjs");

// ============================================================================
// validate-mckinsey-coherence — capability thinking-toolkit v3.1.
// Unit: validateCoherence(repoRoot) -> { errors:string[], truth:{book,consulting,
//   processes,total} }. Computes the truth from the 3 registries, cross-checks
//   each registry `count:` field, and asserts every LABELED count claim in the
//   docs (SKILL.md / command / index README) equals the truth.
// Strategy: mirror the real repo into a temp dir, then mutate single files to
//   prove each drift class is caught (the 2026-06-05 460/667/19 regression).
// ============================================================================

const REAL_ROOT = process.cwd();

// Build a minimal temp "repo" containing only the files the validator reads,
// copied from the real repo so the happy path is the real truth (207/424/20).
let ROOT: string;
function copyInto(rel: string) {
  const src = path.join(REAL_ROOT, rel);
  const dst = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}
beforeEach(() => {
  ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "mck-coh-"));
  for (const r of REGISTRIES) copyInto(r.rel);
  for (const d of DOCS) copyInto(d);
});
afterEach(() => { try { fs.rmSync(ROOT, { recursive: true, force: true }); } catch {} });

const patch = (rel: string, from: string, to: string) => {
  const p = path.join(ROOT, rel);
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(from, to));
};
const has = (errs: string[], sub: string) => errs.some((e) => e.includes(sub));

describe("validateCoherence — happy path = the real truth", () => {
  it("the real repo's docs all match the registries (207 + 424 = 631, 20)", () => {
    const { errors, truth } = validateCoherence(REAL_ROOT);
    expect(errors).toEqual([]);
    expect(truth).toEqual({ book: 207, consulting: 424, processes: 20, total: 631 });
  });
  it("the mirrored temp repo is clean too", () => {
    expect(validateCoherence(ROOT).errors).toEqual([]);
  });
});

describe("validateCoherence — catches the exact 2026-06-05 drift class", () => {
  it("SKILL says 460 consulting frameworks (the old wrong number) -> error", () => {
    patch("06-ai-ops/skills/thinking-toolkit/mckinsey-workflow/SKILL.md", "424 consulting-toolkit frameworks", "460 consulting-toolkit frameworks");
    expect(has(validateCoherence(ROOT).errors, "states 460 but consulting = 424")).toBe(true);
  });
  it("SKILL says 667 tools + 19 processes -> two errors", () => {
    patch("06-ai-ops/skills/thinking-toolkit/mckinsey-workflow/SKILL.md", "631 tools + 20 processes", "667 tools + 19 processes");
    const errs = validateCoherence(ROOT).errors;
    expect(has(errs, "states 667 but total = 631")).toBe(true);
    expect(has(errs, "states 19 but processes = 20")).toBe(true);
  });
  it("command says 19 inherited processes -> error", () => {
    patch(".claude/commands/think.md", "20 inherited ex-McKinsey domain processes", "19 inherited ex-McKinsey domain processes");
    expect(has(validateCoherence(ROOT).errors, "states 19 but processes = 20")).toBe(true);
  });
  it("index README stray 667-tool registry -> error", () => {
    patch("knowledge/thinking-tool-index/README.md", "631-tool registry", "667-tool registry");
    expect(has(validateCoherence(ROOT).errors, "states 667 but total = 631")).toBe(true);
  });
});

describe("validateCoherence — registry count-field self-check", () => {
  it("a consulting-frameworks count field != actual entries -> error", () => {
    patch("knowledge/consulting-frameworks.yaml", "count: 424", "count: 999");
    expect(has(validateCoherence(ROOT).errors, "count field (999) != actual entries (424)")).toBe(true);
  });
  it("a missing registry -> error + cannot compute truth", () => {
    fs.rmSync(path.join(ROOT, "knowledge/consulting-processes.yaml"));
    const { errors } = validateCoherence(ROOT);
    expect(has(errors, "registry missing")).toBe(true);
    expect(has(errors, "cannot compute truth")).toBe(true);
  });
});

describe("validateCoherence — claims are optional but must be right if present", () => {
  it("a doc with NO count claims contributes no errors", () => {
    fs.writeFileSync(path.join(ROOT, "knowledge/thinking-tool-index/README.md"), "# no counts here\n");
    expect(validateCoherence(ROOT).errors).toEqual([]);
  });
});
