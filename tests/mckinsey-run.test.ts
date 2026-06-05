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
  isDataRow,
  ARTIFACTS,
  WORKPLAN_COLUMNS,
  STATUS_VALUES,
  RUN_BASE,
} = require("../scripts/thinking-toolkit/mckinsey-run.cjs");

// ============================================================================
// All-Edge-Cases-Test (global CLAUDE.md). Units: scaffoldRun(repoRoot, slug),
// checkRun(repoRoot, slug, opts) from scripts/thinking-toolkit/mckinsey-run.cjs
// (capability thinking-toolkit v1.6/v1.8/v2.0 — the deterministic run scaffolder + checker).
//
// Phase 1 — scaffoldRun: slug-invalid → error; creates dir + 9 templates;
//   idempotent (skip existing, never clobber). checkRun: slug-invalid; dir
//   missing; missing artifact; workplan no-table / missing-column / bad-status /
//   product.* firewall; analysis-log missing-provenance-col / missing-degree-col /
//   row-missing-provenance / degree-out-of-1-8; beforeSell open-rows gate;
//   v1.8 HITL receipt gate (ask-user [H#] ↔ hitl-log reconciliation);
//   v2.0 checkpoint gate (pre-wire + dissent required --before-sell; frame/prioritize warn); happy.
// Phase 2 — boundaries: invalid slugs, empty dir, malformed tables, degree
//   0/9/NaN, status casing, placeholder rows skipped, phantom <H1>/<C1> template row.
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

// v3.1: a disciplined workplan now carries >=2 data rows (the MECE minimum) with
// >=1 REAL pulled source (not all ask-user/assumption).
const GOOD_WORKPLAN = `# wp
| issue | hypothesis | analysis | source-of-data | owner | end-product | status |
|---|---|---|---|---|---|---|
| cliff | returners convert more | cohort split | supabase-ops metrics.product_dau_snapshot | me | chart | validated |
| price | price is the blocker | pricing pull test | ask-user (founder) [H1] | founder | slope | knocked-out |
`;
// v3.1: a disciplined one-day-answer fills the **Disconfirmation:** line.
const GOOD_ODA = `# One-day answer
**Situation:** free->paid stalled at 8%
**Observation:** returners convert 4x
**Resolution:** fix the 7-day cliff
**Competing hypotheses (being disconfirmed):** price is the blocker
**Disconfirmation (what would prove this wrong — must be a workplan row):** if returners and non-returners convert at the same rate, the cliff thesis dies
`;
const GOOD_LOG = `# al
| hypothesis | data pulled | provenance | degree | verdict |
|---|---|---|---|---|
| cliff | 4x | supabase-ops metrics.* | 2 | clears |
`;
// v2.0: a complete checkpoint-log carrying the gated closing sessions (pre-wire + dissent).
const GOOD_CHECKPOINT = `# cp
| id | stage | kind | presented | team input | decision |
|---|---|---|---|---|---|
| C1 | state | frame | TOSCA + core Q + day-one answer | founder agreed | frame set |
| C2 | solve | dissent | falsifier: if returners don't differ, answer flips | challenged, held | held |
| C3 | sell | pre-wire | final answer + coverage + pre-mortem | agreed | ship |
`;

describe("scaffoldRun", () => {
  it("creates the run folder + all 9 artifact templates", () => {
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
  it("a freshly-scaffolded run FAILS --before-sell (v2.0: the pre-wire + dissent closing sessions are missing)", () => {
    scaffoldRun(ROOT, "fresh");
    const errs = checkRun(ROOT, "fresh", { beforeSell: true }).errors;
    expect(has(errs, "no `pre-wire` session")).toBe(true);
    expect(has(errs, "no `dissent` session")).toBe(true);
  });
  it("a filled, disciplined run passes normal check (checkpoint gate is --before-sell only)", () => {
    scaffoldRun(ROOT, "good");
    writeArtifact("good", "workplan.md", GOOD_WORKPLAN);
    writeArtifact("good", "analysis-log.md", GOOD_LOG);
    expect(checkRun(ROOT, "good").errors).toEqual([]);
  });
  it("a COMPLETE disciplined run (workplan >=2 rows + filled disconfirmation + pre-wire + dissent) passes --before-sell", () => {
    scaffoldRun(ROOT, "good2");
    writeArtifact("good2", "workplan.md", GOOD_WORKPLAN);
    writeArtifact("good2", "analysis-log.md", GOOD_LOG);
    writeArtifact("good2", "one-day-answer.md", GOOD_ODA);
    writeArtifact("good2", "checkpoint-log.md", GOOD_CHECKPOINT);
    expect(checkRun(ROOT, "good2", { beforeSell: true }).errors).toEqual([]);
  });
});

// v3.1 deeper before-sell discipline: MECE >=2 rows · filled disconfirmation · real data.
describe("checkRun — v3.1 deeper before-sell gates", () => {
  const setup = (slug: string) => {
    scaffoldRun(ROOT, slug);
    writeArtifact(slug, "workplan.md", GOOD_WORKPLAN);
    writeArtifact(slug, "analysis-log.md", GOOD_LOG);
    writeArtifact(slug, "one-day-answer.md", GOOD_ODA);
    writeArtifact(slug, "checkpoint-log.md", GOOD_CHECKPOINT);
  };
  it("MECE gate: a 1-row workplan FAILS --before-sell", () => {
    setup("r");
    writeArtifact("r", "workplan.md", `# wp\n| issue | hypothesis | analysis | source-of-data | owner | end-product | status |\n|---|---|---|---|---|---|---|\n| only | one guess | a vibe | supabase-ops metrics.* | me | none | validated |\n`);
    expect(has(checkRun(ROOT, "r", { beforeSell: true }).errors, "MECE gate")).toBe(true);
  });
  it("MECE gate does NOT fire on a normal (non-before-sell) check", () => {
    setup("r");
    writeArtifact("r", "workplan.md", `# wp\n| issue | hypothesis | analysis | source-of-data | owner | end-product | status |\n|---|---|---|---|---|---|---|\n| only | one guess | a vibe | supabase-ops metrics.* | me | none | validated |\n`);
    expect(checkRun(ROOT, "r").errors.filter((e: string) => /MECE gate/.test(e))).toEqual([]);
  });
  it("disconfirmation gate: an EMPTY **Disconfirmation:** line FAILS --before-sell", () => {
    setup("r"); // GOOD_ODA filled; now blank it out (pristine-style)
    writeArtifact("r", "one-day-answer.md", `# oda\n**Situation:** x\n**Disconfirmation (what would prove this wrong — must be a workplan row):**\n`);
    expect(has(checkRun(ROOT, "r", { beforeSell: true }).errors, "disconfirmation gate")).toBe(true);
  });
  it("disconfirmation: an ABSENT line is a WARNING, not an error (older-format run)", () => {
    setup("r");
    writeArtifact("r", "one-day-answer.md", `# oda\n**Situation:** x\n**Observation:** y\n**Resolution:** z\n`);
    const r = checkRun(ROOT, "r", { beforeSell: true });
    expect(r.errors.filter((e: string) => /disconfirmation/.test(e))).toEqual([]);
    expect(has(r.warnings, "no `**Disconfirmation:**` line")).toBe(true);
  });
  it("data-pull gate: an all-ask-user workplan (>=2 rows) WARNS (does not block)", () => {
    setup("r");
    writeArtifact("r", "workplan.md", `# wp\n| issue | hypothesis | analysis | source-of-data | owner | end-product | status |\n|---|---|---|---|---|---|---|\n| a | h1 | x | ask-user (founder) [H1] | f | e | validated |\n| b | h2 | y | assumption | f | e | knocked-out |\n`);
    const r = checkRun(ROOT, "r", { beforeSell: true });
    expect(r.errors.filter((e: string) => /data-pull gate/.test(e))).toEqual([]);
    expect(has(r.warnings, "data-pull gate")).toBe(true);
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
  it("assumption counts as valid provenance with no receipt required (the honest no-ask path)", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", "# al\n| hypothesis | data | provenance | degree | verdict |\n|---|---|---|---|---|\n| b | est | assumption | 7 | flagged |\n");
    expect(checkRun(ROOT, "r").errors).toEqual([]);
  });
  // NB: 'ask-user' provenance now requires a [H#] receipt — see the dedicated
  // "HITL receipt gate (v1.8)" describe below (it can no longer pass bare).
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

// ---- v1.6 @cto must-fix: colIndex precedence + half-filled rows ----

describe("colIndex — a decoy column must NOT steal the match (exact-first, key-priority)", () => {
  it("a 'data source' column before 'provenance' does not steal the provenance lookup", () => {
    expect(colIndex(["data source", "provenance", "degree"], ["provenance", "tool", "source"])).toBe(1);
  });
  it("a 'data-source-note' column before 'source-of-data' does not steal the source lookup", () => {
    expect(colIndex(["data-source-note", "source-of-data", "status"], ["source-of-data", "sourceofdata", "source"])).toBe(1);
  });
  it("a 'status-note' column before 'status' does not steal the status lookup", () => {
    expect(colIndex(["status-note", "status"], ["status"])).toBe(1);
  });
  it("still falls back to substring when there is no exact match + no decoy", () => {
    expect(colIndex(["the source-of-data column"], ["source-of-data"])).toBe(0);
  });
});

describe("isDataRow — pristine template skipped, half-filled real row counted", () => {
  it("a row of only placeholders + a default status is filler (skipped)", () => {
    expect(isDataRow(["<leaf>", "<hyp>", "<a>", "<src>", "<who>", "<ep>", "open"])).toBe(false);
  });
  it("a HALF-FILLED row (any real non-status cell) is a data row", () => {
    expect(isDataRow(["cliff", "<hyp>", "<a>", "<src>", "<who>", "<ep>", "open"])).toBe(true);
  });
  it("an empty row is not a data row", () => {
    expect(isDataRow(["", "", ""])).toBe(false);
  });
});

describe("checkRun — decoy columns read the RIGHT cell (v1.6 must-fix)", () => {
  it("firewall fires on the real source-of-data even when a decoy note column precedes it", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "workplan.md", "# wp\n| issue | hypothesis | analysis | data-source-note | source-of-data | owner | end-product | status |\n|---|---|---|---|---|---|---|---|\n| cliff | h | a | (metrics ok) | product.users | me | chart | validated |\n");
    expect(has(checkRun(ROOT, "r").errors, "FIREWALL")).toBe(true);
  });
  it("empty provenance is caught even when a filled 'data source' column precedes it", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", "# al\n| hypothesis | data source | provenance | degree | verdict |\n|---|---|---|---|---|\n| cliff | cohort table | | 2 | ok |\n");
    expect(has(checkRun(ROOT, "r").errors, "missing provenance")).toBe(true);
  });
});

describe("checkRun — half-filled open row trips the stopping gate (v1.6 should-fix)", () => {
  it("a half-filled row with status open blocks Sell", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "workplan.md", "# wp\n| issue | hypothesis | analysis | source-of-data | owner | end-product | status |\n|---|---|---|---|---|---|---|\n| cliff | <hyp> | <a> | <src> | <who> | <ep> | open |\n");
    expect(has(checkRun(ROOT, "r", { beforeSell: true }).errors, "stopping gate")).toBe(true);
  });
  it("the pristine scaffold (template row only) trips no STOPPING gate --before-sell (open-row gate clear; v2.0 checkpoint gate is separate)", () => {
    scaffoldRun(ROOT, "fresh2");
    expect(checkRun(ROOT, "fresh2", { beforeSell: true }).errors.filter((e: string) => /stopping gate/.test(e))).toEqual([]);
  });
});

// ---- v1.8: HITL receipt gate (analysis-log ask-user ↔ hitl-log reconciliation) ----

const HITL_H1 = `# hitl
| id | stage | question asked | founder answer | feeds datum | assumption-if-unanswered |
|---|---|---|---|---|---|
| H1 | state | are the 25 accounts yours? | yes, all my test emails | ownership | assume external (deg 6) |
`;
const HITL_H1_H2 = `# hitl
| id | stage | question asked | founder answer | feeds datum | assumption-if-unanswered |
|---|---|---|---|---|---|
| H1 | state | q1 | a1 | d1 | x |
| H2 | solve | q2 | a2 | d2 | y |
`;
// analysis-log with one ask-user datum whose provenance cell is `prov`
const logProv = (prov: string) => `# al
| hypothesis | data pulled | provenance | degree | verdict |
|---|---|---|---|---|
| ownership | 25 = founder's | ${prov} | 2 | confirmed |
`;
const hitlErrs = (slug: string) => checkRun(ROOT, slug).errors.filter((e: string) => /hitl gate/.test(e));

describe("checkRun — HITL receipt gate (v1.8)", () => {
  it("ask-user datum WITH a matching [H1] + hitl-log row H1 → passes", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", logProv("ask-user (founder) [H1]"));
    writeArtifact("r", "hitl-log.md", HITL_H1);
    expect(checkRun(ROOT, "r").errors).toEqual([]);
  });
  it("ask-user datum with NO [H#] receipt tag → fails (missing receipt)", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", logProv("ask-user (founder)"));
    writeArtifact("r", "hitl-log.md", HITL_H1);
    expect(has(hitlErrs("r"), "no [H<n>] receipt tag")).toBe(true);
  });
  it("ask-user datum citing [H9] but no hitl-log row H9 → fails (dangling ref)", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", logProv("ask-user (founder) [H9]"));
    writeArtifact("r", "hitl-log.md", HITL_H1);
    expect(has(hitlErrs("r"), "no data row with id H9")).toBe(true);
  });
  it("MUST-FIX #1: the pristine <H1> template row does NOT satisfy a [H1] tag", () => {
    scaffoldRun(ROOT, "r"); // hitl-log.md left as the scaffold template (placeholder <H1> only)
    writeArtifact("r", "analysis-log.md", logProv("ask-user (founder) [H1]"));
    expect(has(hitlErrs("r"), "no data row with id H1")).toBe(true);
  });
  it("assumption provenance needs no receipt even when hitl-log is empty → passes the gate", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", logProv("assumption"));
    expect(hitlErrs("r")).toEqual([]);
  });
  it("a real-tool provenance (supabase-analytics) is untouched by the gate → passes", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", logProv("supabase-analytics live.profiles"));
    expect(hitlErrs("r")).toEqual([]);
  });
  it("a hitl-log row with NO matching analysis-log datum is allowed (one-way gate)", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", GOOD_LOG); // no ask-user rows
    writeArtifact("r", "hitl-log.md", HITL_H1);      // an extra receipt (e.g. a scope checkpoint)
    expect(checkRun(ROOT, "r").errors).toEqual([]);
  });
  it("an empty/malformed hitl-log table while an ask-user [H1] datum exists → fails (dangling)", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", logProv("ask-user (founder) [H1]"));
    writeArtifact("r", "hitl-log.md", "# hitl\n\njust prose, no table\n");
    expect(has(hitlErrs("r"), "no data row with id H1")).toBe(true);
  });
  it("case-insensitive: ASK-USER provenance + [h1] tag resolves against hitl row H1 → passes", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", logProv("ASK-USER (founder) [h1]"));
    writeArtifact("r", "hitl-log.md", HITL_H1);
    expect(checkRun(ROOT, "r").errors).toEqual([]);
  });
  it("multiple tags [H1][H2] on one row: both must resolve (one missing → fail)", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", logProv("ask-user (founder) [H1][H2]"));
    writeArtifact("r", "hitl-log.md", HITL_H1); // only H1 exists
    expect(has(hitlErrs("r"), "no data row with id H2")).toBe(true);
  });
  it("multiple tags [H1][H2] both present → passes", () => {
    scaffoldRun(ROOT, "r");
    writeArtifact("r", "analysis-log.md", logProv("ask-user (founder) [H1][H2]"));
    writeArtifact("r", "hitl-log.md", HITL_H1_H2);
    expect(checkRun(ROOT, "r").errors).toEqual([]);
  });
  it("decoy: 'ask-user' text in a non-provenance cell does NOT trip the gate (reads provenance col only)", () => {
    scaffoldRun(ROOT, "r");
    // 'data source' column literally mentions ask-user; the real provenance col is supabase
    writeArtifact("r", "analysis-log.md", "# al\n| hypothesis | data source | provenance | degree | verdict |\n|---|---|---|---|---|\n| ownership | scraped from an ask-user note | supabase-analytics | 2 | ok |\n");
    expect(hitlErrs("r")).toEqual([]);
  });
});

// ---- v2.0: checkpoint gate (McKinsey team-session ledger; --before-sell) ----

const cpLog = (rows: string) => `# cp
| id | stage | kind | presented | team input | decision |
|---|---|---|---|---|---|
${rows}`;
const cpErrs = (slug: string) => checkRun(ROOT, slug, { beforeSell: true }).errors.filter((e: string) => /checkpoint gate/.test(e));
const cpWarns = (slug: string) => checkRun(ROOT, slug, { beforeSell: true }).warnings.filter((e: string) => /checkpoint gate/.test(e));
const cpReady = (slug: string) => {
  scaffoldRun(ROOT, slug);
  writeArtifact(slug, "workplan.md", GOOD_WORKPLAN); // validated → stopping gate clear, isolate the checkpoint gate
};

describe("checkRun — checkpoint gate (v2.0)", () => {
  it("pre-wire + dissent rows present → no checkpoint errors --before-sell", () => {
    cpReady("r");
    writeArtifact("r", "checkpoint-log.md", cpLog("| C1 | sell | pre-wire | final | ok | ship |\n| C2 | solve | dissent | falsifier named | challenged | held |\n"));
    expect(cpErrs("r")).toEqual([]);
  });
  it("missing pre-wire → ERROR", () => {
    cpReady("r");
    writeArtifact("r", "checkpoint-log.md", cpLog("| C2 | solve | dissent | falsifier | challenged | held |\n"));
    expect(has(cpErrs("r"), "no `pre-wire` session")).toBe(true);
  });
  it("missing dissent → ERROR", () => {
    cpReady("r");
    writeArtifact("r", "checkpoint-log.md", cpLog("| C1 | sell | pre-wire | final | ok | ship |\n"));
    expect(has(cpErrs("r"), "no `dissent` session")).toBe(true);
  });
  it("MUST-FIX #4: the pristine <C1> all-placeholder template row satisfies NEITHER gate", () => {
    cpReady("r"); // checkpoint-log left as the scaffold template (all <...> placeholders)
    expect(cpErrs("r").length).toBe(2); // pre-wire + dissent both missing
  });
  it("frame + prioritize missing → WARNINGS (not errors)", () => {
    cpReady("r");
    writeArtifact("r", "checkpoint-log.md", cpLog("| C1 | sell | pre-wire | final | ok | ship |\n| C2 | solve | dissent | falsifier | challenged | held |\n"));
    expect(cpErrs("r")).toEqual([]);
    expect(has(cpWarns("r"), "no `frame` session")).toBe(true);
    expect(has(cpWarns("r"), "no `prioritize` session")).toBe(true);
  });
  it("frame + prioritize present → no warnings", () => {
    cpReady("r");
    writeArtifact("r", "checkpoint-log.md", cpLog("| C1 | state | frame | tosca | ok | set |\n| C2 | structure | prioritize | dropped branch X | ok | cut |\n| C3 | solve | dissent | falsifier | challenged | held |\n| C4 | sell | pre-wire | final | ok | ship |\n"));
    expect(cpErrs("r")).toEqual([]);
    expect(cpWarns("r")).toEqual([]);
  });
  it("case-insensitive: PRE-WIRE / Dissent kinds resolve", () => {
    cpReady("r");
    writeArtifact("r", "checkpoint-log.md", cpLog("| C1 | sell | PRE-WIRE | final | ok | ship |\n| C2 | solve | Dissent | falsifier | ok | held |\n"));
    expect(cpErrs("r")).toEqual([]);
  });
  it("a decoy `kind-note` column does NOT steal the `kind` lookup", () => {
    cpReady("r");
    writeArtifact("r", "checkpoint-log.md", "# cp\n| id | stage | kind-note | kind | presented | decision |\n|---|---|---|---|---|---|\n| C1 | sell | (n/a) | pre-wire | final | ship |\n| C2 | solve | (n/a) | dissent | falsifier | held |\n");
    expect(cpErrs("r")).toEqual([]);
  });
  it("the checkpoint gate is --before-sell ONLY (a normal check never fires it)", () => {
    cpReady("r"); // pristine checkpoint-log template (no pre-wire/dissent)
    expect(checkRun(ROOT, "r").errors.filter((e: string) => /checkpoint gate/.test(e))).toEqual([]);
  });
});
