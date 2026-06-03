import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
// @ts-ignore — Node interop from TS to CJS
const {
  scaffoldRun,
  checkRun,
  parseFirstTable,
  colIndex,
  ARTIFACTS,
  WORKPLAN_COLUMNS,
  STATUS_VALUES,
  RUN_BASE,
} = require("../scripts/thinking-toolkit/mckinsey-run.cjs");

// ============================================================================
// All-Edge-Cases-Test (global CLAUDE.md). Units: scaffoldRun(repoRoot, slug),
// checkRun(repoRoot, slug, opts) from scripts/thinking-toolkit/mckinsey-run.cjs
// (capability thinking-toolkit v1.6 — the deterministic run scaffolder + checker).
//
// Phase 1 — scaffoldRun: slug-invalid → error; creates dir + 7 templates;
//   idempotent (skip existing, never clobber). checkRun: slug-invalid; dir
//   missing; missing artifact; workplan no-table / missing-column / bad-status /
//   product.* firewall; analysis-log missing-provenance-col / missing-degree-col /
//   row-missing-provenance / degree-out-of-1-8; beforeSell open-rows gate; happy.
// Phase 2 — boundaries: invalid slugs, empty dir, malformed tables, degree
//   0/9/NaN, status casing, placeholder rows skipped.
// Uses a fresh tmp repoRoot per test (the helper writes under
//   <root>/.archives/mckinsey/<slug>/). Skipped: security (operator paths);
//   async (sync); performance (tiny folders).
// ============================================================================

let ROOT: string;
beforeEach(() => { ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "mck-run-")); });
afterEach(() => { fs.rmSync(ROOT, { recursive: true, force: true }); });

const runDir = (slug: string) => path.join(ROOT, RUN_BASE, slug);
const writeArtifact = (slug: string, name: string, body: string) => fs.writeFileSync(path.join(runDir(slug), name), body);
const has = (errs: string[], sub: string) => errs.some((e) => e.includes(sub));

const GOOD_WORKPLAN = `# wp
| issue | hypothesis | analysis | source-of-data | owner | end-product | status |
|---|---|---|---|---|---|---|
| cliff | returners convert more | cohort split | supabase-ops metrics.product_dau_snapshot | me | chart | validated |
`;
const GOOD_LOG = `# al
| hypothesis | data pulled | provenance | degree | verdict |
|---|---|---|---|---|
| cliff | 4x | supabase-ops metrics.* | 2 | clears |
`;

describe("scaffoldRun", () => {
  it("creates the run folder + all 7 artifact templates", () => {
    const r = scaffoldRun(ROOT, "free-to-paid-stall");
    expect(r.errors).toEqual([]);
    expect(r.created.sort()).toEqual(ARTIFACTS.map((a: string) => `${a}.md`).sort());
    for (const a of ARTIFACTS) expect(fs.existsSync(path.join(runDir("free-to-paid-stall"), `${a}.md`))).toBe(true);
  });
  it("is idempotent — never clobbers an existing file", () => {
    scaffoldRun(ROOT, "x-run");
    writeArtifact("x-run", "workplan.md", "MY REAL WORK");
    const r = scaffoldRun(ROOT, "x-run");
    expect(r.created).toEqual([]);
    expect(r.skipped).toContain("workplan.md");
    expect(fs.readFileSync(path.join(runDir("x-run"), "workplan.md"), "utf8")).toBe("MY REAL WORK");
  });
  it("rejects a non-kebab slug", () => {
    const r = scaffoldRun(ROOT, "Bad_Slug");
    expect(has(r.errors, "slug must be kebab-case")).toBe(true);
    expect(r.created).toEqual([]);
  });
  it("rejects a non-string slug", () => {
    expect(has(scaffoldRun(ROOT, 42 as any).errors, "slug must be kebab-case")).toBe(true);
  });
});

describe("checkRun — happy path", () => {
  it("a freshly-scaffolded run passes (placeholders skipped, no real rows)", () => {
    scaffoldRun(ROOT, "fresh");
    const r = checkRun(ROOT, "fresh");
    expect(r.errors).toEqual([]);
  });
  it("freshly-scaffolded run passes --before-sell (no real open rows)", () => {
    scaffoldRun(ROOT, "fresh");
    expect(checkRun(ROOT, "fresh", { beforeSell: true }).errors).toEqual([]);
  });
  it("a filled, disciplined run passes", () => {
    scaffoldRun(ROOT, "good");
    writeArtifact("good", "workplan.md", GOOD_WORKPLAN);
    writeArtifact("good", "analysis-log.md", GOOD_LOG);
    expect(checkRun(ROOT, "good").errors).toEqual([]);
    expect(checkRun(ROOT, "good", { beforeSell: true }).errors).toEqual([]); // all rows validated
  });
});

describe("checkRun — folder + artifact presence", () => {
  it("missing run folder → not-found error", () => {
    expect(has(checkRun(ROOT, "ghost").errors, "run folder not found")).toBe(true);
  });
  it("missing an artifact → names it", () => {
    scaffoldRun(ROOT, "r");
    fs.rmSync(path.join(runDir("r"), "synthesis.md"));
    expect(has(checkRun(ROOT, "r").errors, "missing artifact: synthesis.md")).toBe(true);
  });
  it("invalid slug → error", () => {
    expect(has(checkRun(ROOT, "Bad Slug").errors, "slug must be kebab-case")).toBe(true);
  });
});

describe("checkRun — workplan discipline", () => {
  it("workplan with no table → error", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "workplan.md", "# just prose, no table\n");
    expect(has(checkRun(ROOT, "r").errors, "no markdown table")).toBe(true);
  });
  it("workplan missing a required column → names it", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "workplan.md", "# wp\n| issue | hypothesis | analysis | owner | end-product | status |\n|---|---|---|---|---|---|\n| a | b | c | d | e | open |\n"); // no source-of-data
    expect(has(checkRun(ROOT, "r").errors, 'missing column "source-of-data"')).toBe(true);
  });
  it("invalid status value → error", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "workplan.md", GOOD_WORKPLAN.replace("validated", "done"));
    expect(has(checkRun(ROOT, "r").errors, "invalid status")).toBe(true);
  });
  it("each known status value is accepted", () => {
    for (const st of STATUS_VALUES) {
      scaffoldRun(ROOT, "r");
      writeArtifact("r", "workplan.md", GOOD_WORKPLAN.replace("validated", st));
      expect(checkRun(ROOT, "r").errors.filter((e: string) => /invalid status/.test(e))).toEqual([]);
      fs.rmSync(runDir("r"), { recursive: true, force: true });
    }
  });
  it("product.* in source-of-data → FIREWALL error", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "workplan.md", GOOD_WORKPLAN.replace("supabase-ops metrics.product_dau_snapshot", "product.users"));
    expect(has(checkRun(ROOT, "r").errors, "FIREWALL")).toBe(true);
  });
  it("metrics.product_dau_snapshot is NOT a firewall violation (it's metrics.*, not product.*)", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "workplan.md", GOOD_WORKPLAN); // uses metrics.product_dau_snapshot
    expect(checkRun(ROOT, "r").errors.filter((e: string) => /FIREWALL/.test(e))).toEqual([]);
  });
});

describe("checkRun — analysis-log grounding", () => {
  it("missing provenance column → error", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", "# al\n| hypothesis | data | degree | verdict |\n|---|---|---|---|\n| a | b | 2 | ok |\n");
    expect(has(checkRun(ROOT, "r").errors, "missing a provenance column")).toBe(true);
  });
  it("missing degree column → error", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", "# al\n| hypothesis | data | provenance | verdict |\n|---|---|---|---|\n| a | b | gbrain | ok |\n");
    expect(has(checkRun(ROOT, "r").errors, "missing a degree")).toBe(true);
  });
  it("a datum row missing provenance → error", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", "# al\n| hypothesis | data | provenance | degree | verdict |\n|---|---|---|---|---|\n| a | 4x |  | 2 | ok |\n");
    expect(has(checkRun(ROOT, "r").errors, "missing provenance")).toBe(true);
  });
  it("degree out of 1-8 → error (0, 9, NaN)", () => {
    for (const bad of ["0", "9", "high"]) {
      scaffoldRun(ROOT, "r");
      writeArtifact("r", "analysis-log.md", `# al\n| hypothesis | data | provenance | degree | verdict |\n|---|---|---|---|---|\n| a | 4x | gbrain | ${bad} | ok |\n`);
      expect(has(checkRun(ROOT, "r").errors, "degree must be 1-8")).toBe(true);
      fs.rmSync(runDir("r"), { recursive: true, force: true });
    }
  });
  it("ask-user / assumption count as valid provenance", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", "# al\n| hypothesis | data | provenance | degree | verdict |\n|---|---|---|---|---|\n| a | guess | ask-user | 6 | pending |\n| b | est | assumption | 7 | flagged |\n");
    expect(checkRun(ROOT, "r").errors.filter((e: string) => /analysis-log/.test(e))).toEqual([]);
  });
});

describe("checkRun — stopping gate (--before-sell)", () => {
  it("an `open` real row blocks Sell", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "workplan.md", GOOD_WORKPLAN.replace("validated", "open"));
    expect(has(checkRun(ROOT, "r", { beforeSell: true }).errors, "stopping gate")).toBe(true);
  });
  it("an `open` row does NOT block a normal check (only --before-sell)", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "workplan.md", GOOD_WORKPLAN.replace("validated", "open"));
    expect(checkRun(ROOT, "r").errors.filter((e: string) => /stopping gate/.test(e))).toEqual([]);
  });
});

describe("parseFirstTable + colIndex", () => {
  it("returns null when there is no table", () => {
    expect(parseFirstTable("# just prose\n\nno pipes here")).toBeNull();
  });
  it("parses headers + rows of the first table", () => {
    const t = parseFirstTable("# x\n| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n");
    expect(t.headers).toEqual(["a", "b"]);
    expect(t.rows.length).toBe(2);
  });
  it("colIndex matches fuzzily (source-of-data ~ 'source of data')", () => {
    expect(colIndex(["Source Of Data", "Status"], ["source-of-data"])).toBe(0);
    expect(colIndex(["x", "y"], ["status"])).toBe(-1);
  });
});
