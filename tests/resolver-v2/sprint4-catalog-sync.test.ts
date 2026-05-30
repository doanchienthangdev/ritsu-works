// resolver-plan v1.0 (Sprint 4) — nightly catalog-sync GitHub Action + sync.cjs
// --draft flag + coverage WARN→CRITICAL promotion.
//
// Phase 1 analysis (DETERMINISTIC subjects under test):
//   A. scripts/resolver-v2/sync.cjs
//      - parseArgs(argv): pure. Branches per flag (--dry-run/--apply/--auto-pr/
//        --draft/--kind=). NEW: --draft sets args.draft=true; default false.
//        Cross-param: --draft combines with --auto-pr and is orthogonal to mode.
//      - buildAutoPrCommands(branch, written, options): pure, side-effect-free.
//        Branch: options.draft === true → `gh pr create --draft ...`; else no
//        `--draft`. Returns the ordered 5-command git+gh sequence; the gh command
//        is last. STRICT equality on draft (truthy-but-not-true must NOT enable it).
//      Why pure-function tests, not execSync mocking: the I/O path runs real
//      git/gh (push/PR) which is forbidden in tests. The --draft threading — the
//      only Sprint-4 logic — lives entirely in the pure builder. We assert the
//      composed command STRING includes/excludes `--draft` (the task's intent).
//   B. .github/workflows/resolver-catalog-sync.yml — shape contract: valid YAML;
//      schedule(cron 30 3 * * *) + workflow_dispatch triggers; contents:write +
//      pull-requests:write permissions; sync.cjs + resolver:index steps; drift
//      detection guards the PR step (no drift → no PR). YAML quirk: a bare `on:`
//      key parses as the JS boolean `true` — the test reads doc.on ?? doc[true].
//   C. scripts/check-consistency.cjs — validate-resolver-v2-coverage.cjs promoted
//      from the FULL-only WARN array into the always-run CRITICAL L2 array, and is
//      NO LONGER in the warn array (not run twice).
//   D. scripts/cross-tier/validate-resolver-v2-coverage.cjs — now a blocking gate:
//      exits 0 on clean coverage today (CONTENT-compare, 16 kinds).
//
// NOT unit-tested (documented): the live `gh`/`git` execution + GitHub-side PR
//   creation (integration-only, forbidden here); the SESSION-MODEL resolver-plan
//   assembly (S3, non-deterministic). // Skipped: live-VCS-side-effects — forbidden.

import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const sync = cjsRequire(join(REPO, "scripts/resolver-v2/sync.cjs"));
const { parseArgs, buildAutoPrCommands } = sync;

const WORKFLOW_PATH = join(REPO, ".github/workflows/resolver-catalog-sync.yml");
const CHECK_CONSISTENCY_PATH = join(REPO, "scripts/check-consistency.cjs");
const COVERAGE_VALIDATOR_PATH = join(
  REPO,
  "scripts/cross-tier/validate-resolver-v2-coverage.cjs"
);

function ghCommandOf(commands: string[]): string {
  const gh = commands.find((c) => c.startsWith("gh pr create"));
  if (!gh) throw new Error("no `gh pr create` command in sequence");
  return gh;
}

// ───────────────────────────────────────────────────────────────────────────
// A. sync.cjs --draft
// ───────────────────────────────────────────────────────────────────────────
describe("sync.cjs parseArgs — --draft modifier", () => {
  describe("happy path", () => {
    it("sets draft=true when --draft is present with --auto-pr", () => {
      expect(parseArgs(["--auto-pr", "--draft"])).toEqual({
        mode: "auto-pr",
        kind: null,
        draft: true,
      });
    });
  });

  describe("opt-in / default", () => {
    it("defaults draft=false when --draft is absent", () => {
      expect(parseArgs(["--auto-pr"]).draft).toBe(false);
    });

    it("defaults draft=false for an empty argv", () => {
      expect(parseArgs([]).draft).toBe(false);
    });

    it("accepts --draft alone (orthogonal to mode; mode stays default dry-run)", () => {
      const a = parseArgs(["--draft"]);
      expect(a.draft).toBe(true);
      expect(a.mode).toBe("dry-run");
    });
  });

  describe("cross-parameter interactions", () => {
    it("preserves --kind alongside --auto-pr --draft", () => {
      const a = parseArgs(["--auto-pr", "--draft", "--kind=skill"]);
      expect(a).toEqual({ mode: "auto-pr", kind: "skill", draft: true });
    });

    it("is order-independent (--draft before --auto-pr)", () => {
      expect(parseArgs(["--draft", "--auto-pr"]).draft).toBe(true);
    });

    it("does not let --draft change the mode away from --apply", () => {
      const a = parseArgs(["--apply", "--draft"]);
      expect(a.mode).toBe("apply");
      expect(a.draft).toBe(true);
    });
  });

  describe("input boundaries", () => {
    it("ignores unknown flags and still parses --draft", () => {
      const a = parseArgs(["--draft", "--unknown-flag", "--auto-pr"]);
      expect(a.draft).toBe(true);
      expect(a.mode).toBe("auto-pr");
    });
  });
});

describe("sync.cjs buildAutoPrCommands — --draft threads to gh pr create", () => {
  describe("happy path", () => {
    it("produces a `gh pr create --draft ...` invocation when draft:true", () => {
      const gh = ghCommandOf(buildAutoPrCommands("branch-x", 3, { draft: true }));
      expect(gh).toContain("--draft");
      // --draft sits between `gh pr create` and the --title (correct position).
      expect(gh).toMatch(/^gh pr create --draft --title /);
    });

    it("returns the full ordered git+gh sequence (gh last)", () => {
      const cmds = buildAutoPrCommands("branch-x", 1, { draft: true });
      expect(cmds).toHaveLength(5);
      expect(cmds[0]).toBe("git checkout -b branch-x");
      expect(cmds[1]).toBe("git add knowledge/recipients/");
      expect(cmds[2]).toContain("git commit -m");
      expect(cmds[3]).toBe("git push -u origin branch-x");
      expect(cmds[4]).toMatch(/^gh pr create/);
    });
  });

  describe("opt-in / default (absent → no --draft)", () => {
    it("omits --draft when options.draft is absent", () => {
      const gh = ghCommandOf(buildAutoPrCommands("branch-x", 3, {}));
      expect(gh).not.toContain("--draft");
      expect(gh).toMatch(/^gh pr create --title /);
    });

    it("omits --draft when options omitted entirely (default param)", () => {
      const gh = ghCommandOf(buildAutoPrCommands("branch-x", 3));
      expect(gh).not.toContain("--draft");
    });

    it("omits --draft when options.draft is false", () => {
      const gh = ghCommandOf(buildAutoPrCommands("branch-x", 3, { draft: false }));
      expect(gh).not.toContain("--draft");
    });
  });

  describe("business logic edge cases — strict draft semantics", () => {
    // draft must be enabled ONLY by the boolean `true`, mirroring options.draft===true.
    // A truthy-but-not-true value (e.g. the string "true") must NOT enable --draft,
    // so a stray CLI-string can never silently flip the unattended PR to draft/non-draft.
    it("does NOT enable --draft for a truthy-but-not-true value", () => {
      const gh = ghCommandOf(
        buildAutoPrCommands("b", 1, { draft: "true" as unknown as boolean })
      );
      expect(gh).not.toContain("--draft");
    });

    it("does NOT enable --draft for draft:1 (number truthy)", () => {
      const gh = ghCommandOf(
        buildAutoPrCommands("b", 1, { draft: 1 as unknown as boolean })
      );
      expect(gh).not.toContain("--draft");
    });

    it("interpolates the written-count into the commit message", () => {
      const cmds = buildAutoPrCommands("b", 7, { draft: true });
      expect(cmds[2]).toContain("(7 files updated)");
    });

    it("interpolates the branch name into checkout and push", () => {
      const cmds = buildAutoPrCommands("automation/foo", 1, {});
      expect(cmds[0]).toContain("automation/foo");
      expect(cmds[3]).toContain("automation/foo");
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// B. .github/workflows/resolver-catalog-sync.yml shape contract
// ───────────────────────────────────────────────────────────────────────────
describe(".github/workflows/resolver-catalog-sync.yml — shape", () => {
  let doc: any;
  let raw: string;
  let on: any;
  let steps: any[];

  beforeAll(() => {
    expect(existsSync(WORKFLOW_PATH)).toBe(true);
    raw = readFileSync(WORKFLOW_PATH, "utf-8");
    doc = yaml.load(raw);
    // YAML 1.1: a bare `on:` key parses as the boolean true. Accept both forms.
    on = doc.on ?? doc[true as unknown as string];
    steps = doc.jobs?.sync?.steps ?? [];
  });

  describe("valid YAML", () => {
    it("parses to a non-null object", () => {
      expect(doc).toBeTypeOf("object");
      expect(doc).not.toBeNull();
    });

    it("has a name", () => {
      expect(doc.name).toBe("Resolver Catalog Sync");
    });
  });

  describe("triggers", () => {
    it("has both schedule and workflow_dispatch", () => {
      expect(on).toBeTypeOf("object");
      expect(on).toHaveProperty("schedule");
      expect(on).toHaveProperty("workflow_dispatch");
    });

    it("schedules a nightly cron at 30 3 * * *", () => {
      expect(Array.isArray(on.schedule)).toBe(true);
      expect(on.schedule[0].cron).toBe("30 3 * * *");
    });
  });

  describe("permissions (least privilege)", () => {
    it("grants contents: write", () => {
      expect(doc.permissions.contents).toBe("write");
    });
    it("grants pull-requests: write", () => {
      expect(doc.permissions["pull-requests"]).toBe("write");
    });
    it("grants exactly those two scopes (no over-grant)", () => {
      expect(Object.keys(doc.permissions).sort()).toEqual([
        "contents",
        "pull-requests",
      ]);
    });
  });

  describe("steps — regenerate + drift-guarded PR", () => {
    it("runs the catalog sync + INDEX regen", () => {
      const runScript = steps
        .map((s) => s.run || "")
        .join("\n");
      expect(runScript).toContain("scripts/resolver-v2/sync.cjs --apply");
      expect(runScript).toContain("pnpm resolver:index");
    });

    it("detects drift via git status --porcelain on knowledge/recipients/", () => {
      const runScript = steps.map((s) => s.run || "").join("\n");
      expect(runScript).toContain("git status --porcelain knowledge/recipients/");
    });

    it("opens the PR as a DRAFT", () => {
      const runScript = steps.map((s) => s.run || "").join("\n");
      expect(runScript).toContain("gh pr create");
      expect(runScript).toContain("--draft");
    });

    it("gates the PR step on drift (no drift → no PR)", () => {
      const prStep = steps.find((s) =>
        (s.run || "").includes("gh pr create")
      );
      expect(prStep).toBeDefined();
      // The PR step must be conditional on the drift detection output.
      expect(prStep.if).toContain("drift");
    });

    it("checks out full history (fetch-depth: 0) for branch push", () => {
      const checkout = steps.find((s) =>
        (s.uses || "").startsWith("actions/checkout")
      );
      expect(checkout).toBeDefined();
      expect(checkout.with["fetch-depth"]).toBe(0);
    });

    it("provides GH_TOKEN from the built-in GITHUB_TOKEN secret", () => {
      const env = doc.jobs.sync.env || {};
      expect(env.GH_TOKEN).toContain("secrets.GITHUB_TOKEN");
    });
  });

  describe("setup matches the other workflows", () => {
    it("uses node 20 + pnpm 9 + frozen-lockfile install", () => {
      const node = steps.find((s) => (s.uses || "").includes("setup-node"));
      const pnpm = steps.find((s) => (s.uses || "").includes("pnpm/action-setup"));
      expect(node.with["node-version"]).toBe("20");
      expect(String(pnpm.with.version)).toBe("9");
      expect(steps.some((s) => (s.run || "").includes("pnpm install --frozen-lockfile"))).toBe(true);
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// C. coverage validator promoted WARN → CRITICAL in check-consistency.cjs
// ───────────────────────────────────────────────────────────────────────────
describe("check-consistency.cjs — resolver-v2-coverage promoted to CRITICAL", () => {
  let src: string;

  beforeAll(() => {
    src = readFileSync(CHECK_CONSISTENCY_PATH, "utf-8");
  });

  it("references the coverage validator exactly once", () => {
    const occurrences = src.split("validate-resolver-v2-coverage.cjs").length - 1;
    expect(occurrences).toBe(1);
  });

  it("places the coverage validator in the CRITICAL L2 block, before the warn block", () => {
    const covIdx = src.indexOf("validate-resolver-v2-coverage.cjs");
    const criticalHeaderIdx = src.indexOf("L2 — cross-tier validators (critical)");
    const fullGateIdx = src.indexOf("if (FULL) {");
    expect(covIdx).toBeGreaterThan(criticalHeaderIdx);
    expect(criticalHeaderIdx).toBeGreaterThan(-1);
    // The coverage entry must appear BEFORE the `if (FULL)` warn gate (i.e. in the
    // always-run critical array, not the FULL-only warn array).
    expect(covIdx).toBeLessThan(fullGateIdx);
  });
});

describe("validate-resolver-v2-coverage.cjs — blocking gate is clean today", () => {
  it("exits 0 on the current tree (CONTENT-compare, 16 kinds)", () => {
    // Run as a subprocess; a non-zero exit throws. Clean today (verified pre-promotion).
    const out = execFileSync("node", [COVERAGE_VALIDATOR_PATH], {
      cwd: REPO,
      encoding: "utf-8",
    });
    expect(out).toContain("[PASS]");
    expect(out).toContain("16 kinds");
  });
});
