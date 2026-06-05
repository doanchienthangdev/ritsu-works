import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
// @ts-ignore — Node interop from TS to CJS
const { evaluate, SELL_RE } = require("../.claude/hooks/runtime/pre-write-mckinsey-gate.cjs");
// @ts-ignore
const { scaffoldRun } = require("../scripts/thinking-toolkit/mckinsey-run.cjs");

// ============================================================================
// pre-write-mckinsey-gate hook — capability thinking-toolkit v3.1.
// Unit: evaluate(payload, repoRoot) — the pure decision core.
//   { match:false } = not a Sell write (allow silently).
//   { match:true, slug, root, result } = a Sell write; result=checkRun|null.
// repoRoot is the REAL repo (where mckinsey-run.cjs lives) = process.cwd();
// the run folder lives in a temp dir whose path we feed as file_path.
// ============================================================================

const REPO_ROOT = process.cwd();
let RUN_ROOT: string; // temp dir standing in for an .archives root
beforeEach(() => { RUN_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "mck-hook-")); });
afterEach(() => { try { fs.rmSync(RUN_ROOT, { recursive: true, force: true }); } catch {} });

const sellPath = (slug: string) => path.join(RUN_ROOT, ".archives/mckinsey", slug, "communication.md");
const writeIn = (slug: string, f: string, b: string) => fs.writeFileSync(path.join(RUN_ROOT, ".archives/mckinsey", slug, f), b);

const GOOD_WP = `# wp
| issue | hypothesis | analysis | source-of-data | owner | end-product | status |
|---|---|---|---|---|---|---|
| cliff | returners convert | cohort | supabase-ops metrics.* | me | chart | validated |
| price | price blocks | pull test | ask-user [H1] | f | slope | knocked-out |
`;
const GOOD_ODA = `# oda
**Disconfirmation (what would prove this wrong — must be a workplan row):** if A==B the thesis dies
`;
const GOOD_CP = `# cp
| id | stage | kind | presented | team input | decision |
|---|---|---|---|---|---|
| C1 | solve | dissent | falsifier | held | keep |
| C2 | sell | pre-wire | final | agreed | ship |
`;
// v3.6: the disciplined run records per-checkpoint tool-selection covering its checkpoint
// stages (GOOD_CP = C1 solve/dissent, C2 sell/pre-wire) + a rejected note.
const GOOD_TK = `# tk
| id | step | checkpoint | sub-need | classify | loaded | selected | rejected |
|---|---|---|---|---|---|---|---|
| T1 | solve | C1 | is the cliff causal | causation | cohort-split, regression | cohort-split — cheap heuristic | regression — big gun, not needed |
| T2 | sell | C2 | structure the recommendation | checklist | pyramid, chronological | pyramid — answer-first | chronological — APK |
`;
function disciplined(slug: string) {
  scaffoldRun(RUN_ROOT, slug);
  writeIn(slug, "workplan.md", GOOD_WP);
  writeIn(slug, "one-day-answer.md", GOOD_ODA);
  writeIn(slug, "checkpoint-log.md", GOOD_CP);
  writeIn(slug, "toolkit-log.md", GOOD_TK);
}
function undisciplined(slug: string) {
  scaffoldRun(RUN_ROOT, slug); // pristine: 0 rows, empty disconfirmation, no dissent/pre-wire
}

describe("SELL_RE — only the Sell artifact of a mckinsey run matches", () => {
  it("absolute main-repo path matches; captures root + slug", () => {
    const m = "/Users/x/ritsu-works/.archives/mckinsey/free-to-paid/communication.md".match(SELL_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe("/Users/x/ritsu-works");
    expect(m[2]).toBe("free-to-paid");
  });
  it("worktree path matches; root is the worktree", () => {
    const m = "/Users/x/ritsu-works/.claude/worktrees/wt/.archives/mckinsey/run-1/communication.md".match(SELL_RE);
    expect(m).not.toBeNull();
    expect(m[1]).toBe("/Users/x/ritsu-works/.claude/worktrees/wt");
    expect(m[2]).toBe("run-1");
  });
  it("repo-relative path matches with empty root", () => {
    const m = ".archives/mckinsey/run-1/communication.md".match(SELL_RE);
    expect(m).not.toBeNull();
    expect(m[2]).toBe("run-1");
  });
  it("rejects a non-communication artifact (synthesis.md)", () => {
    expect(".archives/mckinsey/run-1/synthesis.md".match(SELL_RE)).toBeNull();
  });
  it("rejects the bundle dir (mckinsey-rigor-fix, not mckinsey/)", () => {
    expect(".archives/mckinsey-rigor-fix-2026-06-05/communication.md".match(SELL_RE)).toBeNull();
  });
  it("rejects a non-kebab slug", () => {
    expect(".archives/mckinsey/Bad_Slug/communication.md".match(SELL_RE)).toBeNull();
  });
});

describe("evaluate — non-Sell writes are ignored (allow silently)", () => {
  it("a non-Write/Edit tool → no match", () => {
    expect(evaluate({ tool_name: "Bash", tool_input: { command: "ls" } }, REPO_ROOT).match).toBe(false);
  });
  it("a Write to a non-mckinsey path → no match", () => {
    expect(evaluate({ tool_name: "Write", tool_input: { file_path: "/tmp/README.md" } }, REPO_ROOT).match).toBe(false);
  });
  it("a Write to a mckinsey NON-Sell artifact (workplan.md) → no match", () => {
    expect(evaluate({ tool_name: "Write", tool_input: { file_path: ".archives/mckinsey/r/workplan.md" } }, REPO_ROOT).match).toBe(false);
  });
  it("null payload → no match", () => {
    expect(evaluate(null, REPO_ROOT).match).toBe(false);
  });
  it("missing file_path → no match", () => {
    expect(evaluate({ tool_name: "Write", tool_input: {} }, REPO_ROOT).match).toBe(false);
  });
});

describe("evaluate — gates a Sell write against the run folder", () => {
  it("an UNDISCIPLINED Sell → match + gate fails (errors > 0)", () => {
    undisciplined("bad");
    const ev = evaluate({ tool_name: "Write", tool_input: { file_path: sellPath("bad") } }, REPO_ROOT);
    expect(ev.match).toBe(true);
    expect(ev.slug).toBe("bad");
    expect(ev.result.errors.length).toBeGreaterThan(0);
  });
  it("a DISCIPLINED Sell → match + gate passes (errors == 0)", () => {
    disciplined("good");
    const ev = evaluate({ tool_name: "Write", tool_input: { file_path: sellPath("good") } }, REPO_ROOT);
    expect(ev.match).toBe(true);
    expect(ev.result.errors).toEqual([]);
  });
  it("an Edit (not just Write) to the Sell artifact is gated too", () => {
    undisciplined("bad2");
    const ev = evaluate({ tool_name: "Edit", tool_input: { file_path: sellPath("bad2") } }, REPO_ROOT);
    expect(ev.match).toBe(true);
    expect(ev.result.errors.length).toBeGreaterThan(0);
  });
  it("fail-open: an unresolvable repoRoot (no helper) → match true, result null (never throws)", () => {
    const ev = evaluate({ tool_name: "Write", tool_input: { file_path: sellPath("x") } }, "/nonexistent-repo-root-xyz");
    expect(ev.match).toBe(true);
    expect(ev.result).toBeNull();
  });
});
