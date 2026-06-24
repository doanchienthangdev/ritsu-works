// Tests for scripts/local-install/test-suite/run.cjs + groups.cjs
//
// Phase 1 analysis (per All-Edge-Cases discipline):
//   run.cjs exports: runSuite, parseArgs, probeEnvDeps, probeWorkspaces,
//     probeEnvWiring, probeCommands, runProbe, runShell, execGroup, lastLines
//   groups.cjs exports: TEST_GROUPS, CAPABILITY_FILES, selectGroups
//
// DI surfaces: probes take fake doctor-report literals; runShell/runSuite take
//   a fake `run`; probeCommands takes a fake `fs`. No real machine, network, or
//   package managers are touched. runSuite is exercised with `only:[...]` so the
//   selected group's result is driven purely by an injected fake.
//
// Skipped categories (with justification):
//   - security: these are internal build/test utilities, not user-input handlers.
//   - performance: pure data + small literals; no large-input path.

import { describe, it, expect, vi, beforeEach } from "vitest";

import * as runModule from "../../scripts/local-install/test-suite/run.cjs";
import * as groupsModule from "../../scripts/local-install/test-suite/groups.cjs";

// Named-import-from-CJS fallback (vitest usually surfaces module.exports as
// named exports, but be defensive if any come through undefined).
const {
  runSuite,
  parseArgs,
  probeEnvDeps,
  probeWorkspaces,
  probeEnvWiring,
  probeCommands,
  runProbe,
  runShell,
  execGroup,
  lastLines,
} = (runModule as any).default ?? runModule;

const { TEST_GROUPS, CAPABILITY_FILES, selectGroups } =
  (groupsModule as any).default ?? groupsModule;

// ---- Test fakes ---------------------------------------------------------

/** A no-op reporter that satisfies every method runSuite calls. */
function fakeReporter() {
  return {
    banner: vi.fn(),
    header: vi.fn(),
    info: vi.fn(),
    note: vi.fn(),
    startStep: vi.fn(),
    endStep: vi.fn(),
    ok: vi.fn(),
    fail: vi.fn(),
    warn: vi.fn(),
    skip: vi.fn(),
    plain: vi.fn(),
    verdict: vi.fn(),
  };
}

/** Doctor literal where all deps/workspaces pass + env fully wired. */
function doctorAllGood() {
  return {
    dependencies: [
      { id: "node", version: "v22.0.0", required: "hard", present: true, satisfiesMin: true },
      { id: "pnpm", version: "9.1.0", required: "hard", present: true, satisfiesMin: true },
      { id: "git", version: "2.40.0", required: "hard", present: true, satisfiesMin: true },
      { id: "gh", version: "missing", required: "recommended", present: false, satisfiesMin: false },
    ],
    workspaces: [
      { id: "root", optional: false, present: true, installed: true },
      { id: "mcp-server", optional: false, present: true, installed: true },
      { id: "docs", optional: true, present: false, installed: false },
    ],
    env: {
      exists: true,
      keys: [
        { key: "SUPABASE_URL", state: "set" },
        { key: "SUPABASE_ANON_KEY", state: "set" },
        { key: "SUPABASE_SERVICE_KEY", state: "set" },
      ],
    },
  };
}

/**
 * A fake `which` that finds nothing — keeps runSuite's internal runDoctor
 * deterministic (no real binary detection) without affecting the groups we
 * select via `only`.
 */
const whichNothing = () => null;

/** A fake fs whose existsSync always returns false (no node_modules, no env). */
function fsAllAbsent() {
  return {
    existsSync: () => false,
    readFileSync: () => "",
  };
}

// =========================================================================
// groups.cjs — selectGroups
// =========================================================================

describe("selectGroups", () => {
  describe("happy path", () => {
    it("default (no opts) excludes opt-in groups (docs-build)", () => {
      const ids = selectGroups().map((g: any) => g.id);
      expect(ids).not.toContain("docs-build");
    });

    it("default selection includes the hard probe + shell groups", () => {
      const ids = selectGroups({}).map((g: any) => g.id);
      expect(ids).toContain("env");
      expect(ids).toContain("drift");
      expect(ids).toContain("unit");
      expect(ids).toContain("commands");
    });

    it("default selection equals all non-optIn groups, in declared order", () => {
      const expected = TEST_GROUPS.filter((g: any) => !g.optIn).map((g: any) => g.id);
      expect(selectGroups({}).map((g: any) => g.id)).toEqual(expected);
    });
  });

  describe("full flag", () => {
    it("{full:true} includes the opt-in docs-build group", () => {
      const ids = selectGroups({ full: true }).map((g: any) => g.id);
      expect(ids).toContain("docs-build");
    });

    it("{full:true} returns every declared group", () => {
      expect(selectGroups({ full: true })).toHaveLength(TEST_GROUPS.length);
    });
  });

  describe("quick flag", () => {
    it("{quick:true} drops slow groups (unit, docs-build)", () => {
      const ids = selectGroups({ quick: true }).map((g: any) => g.id);
      expect(ids).not.toContain("unit");
      expect(ids).not.toContain("docs-build");
    });

    it("{quick:true} retains non-slow hard groups", () => {
      const ids = selectGroups({ quick: true }).map((g: any) => g.id);
      expect(ids).toContain("env");
      expect(ids).toContain("drift");
      expect(ids).toContain("commands");
    });

    it("{quick:true} returns only groups whose slow flag is falsy", () => {
      const slowSelected = selectGroups({ quick: true }).filter((g: any) => g.slow);
      expect(slowSelected).toEqual([]);
    });

    it("{full:true,quick:true} keeps docs-build out because it is slow", () => {
      const ids = selectGroups({ full: true, quick: true }).map((g: any) => g.id);
      expect(ids).not.toContain("docs-build");
      expect(ids).not.toContain("unit");
    });
  });

  describe("only filter", () => {
    it('{only:["drift","unit"]} returns exactly those two groups', () => {
      const ids = selectGroups({ only: ["drift", "unit"] }).map((g: any) => g.id);
      expect(ids).toEqual(["drift", "unit"]);
    });

    it("only preserves declared order regardless of the order in the array", () => {
      const ids = selectGroups({ only: ["unit", "drift"] }).map((g: any) => g.id);
      // groups.cjs filters TEST_GROUPS, so original declared order is preserved.
      expect(ids).toEqual(["drift", "unit"]);
    });

    it("only takes precedence over full + quick", () => {
      const ids = selectGroups({ only: ["docs-build"], quick: true, full: false }).map(
        (g: any) => g.id,
      );
      expect(ids).toEqual(["docs-build"]);
    });

    it("only with an unknown id returns an empty array", () => {
      expect(selectGroups({ only: ["does-not-exist"] })).toEqual([]);
    });

    it("only with a single id returns exactly one group", () => {
      const groups = selectGroups({ only: ["env"] });
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe("env");
    });

    it("empty only array falls through to default selection (not empty)", () => {
      // `opts.only && opts.only.length` is false for [], so falls through.
      const ids = selectGroups({ only: [] }).map((g: any) => g.id);
      expect(ids).not.toContain("docs-build");
      expect(ids).toContain("env");
    });
  });

  describe("immutability", () => {
    it("does not mutate the TEST_GROUPS source array", () => {
      const before = TEST_GROUPS.length;
      selectGroups({ quick: true });
      selectGroups({ full: true });
      expect(TEST_GROUPS.length).toBe(before);
    });
  });
});

describe("CAPABILITY_FILES", () => {
  it("includes the three install commands and the run.cjs entry", () => {
    expect(CAPABILITY_FILES).toContain(".claude/commands/install-ritsu-works.md");
    expect(CAPABILITY_FILES).toContain(".claude/commands/update-ritsu-works.md");
    expect(CAPABILITY_FILES).toContain(".claude/commands/test-ritsu-works.md");
    expect(CAPABILITY_FILES).toContain("scripts/local-install/test-suite/run.cjs");
  });
});

// =========================================================================
// run.cjs — lastLines
// =========================================================================

describe("lastLines", () => {
  it('returns the last 3 lines of "a..g" when n=3', () => {
    expect(lastLines("a\nb\nc\nd\ne\nf\ng", 3)).toBe("e\nf\ng");
  });

  it("defaults to 6 lines when n is omitted", () => {
    expect(lastLines("a\nb\nc\nd\ne\nf\ng")).toBe("b\nc\nd\ne\nf\ng");
  });

  it("returns the whole text when n exceeds the line count", () => {
    expect(lastLines("a\nb", 10)).toBe("a\nb");
  });

  it("returns empty string for empty input", () => {
    expect(lastLines("", 3)).toBe("");
  });

  it("returns empty string for null input", () => {
    expect(lastLines(null as any, 3)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(lastLines(undefined as any, 3)).toBe("");
  });

  it("trims surrounding whitespace before slicing", () => {
    expect(lastLines("\n\na\nb\nc\n\n", 2)).toBe("b\nc");
  });

  it("returns the single line for single-line input", () => {
    expect(lastLines("solo", 3)).toBe("solo");
  });

  it("returns the whole text when n is 0 (slice(-0) === slice(0), JS semantics)", () => {
    // -0 collapses to 0, so .slice(-0) keeps the entire array.
    expect(lastLines("a\nb\nc", 0)).toBe("a\nb\nc");
  });
});

// =========================================================================
// run.cjs — probeEnvDeps
// =========================================================================

describe("probeEnvDeps", () => {
  it("status ok when all hard deps are present and satisfy min", () => {
    const result = probeEnvDeps(doctorAllGood());
    expect(result.status).toBe("ok");
  });

  it("ok detail lists hard deps with their versions", () => {
    const result = probeEnvDeps(doctorAllGood());
    expect(result.detail).toBe("node v22.0.0, pnpm 9.1.0, git 2.40.0");
  });

  it("ignores recommended/feature deps when computing ok", () => {
    // gh is recommended + absent in doctorAllGood; status must still be ok.
    expect(probeEnvDeps(doctorAllGood()).status).toBe("ok");
  });

  it("fail when a hard dep is present but does not satisfy min (too old)", () => {
    const d = doctorAllGood();
    d.dependencies[1].satisfiesMin = false; // pnpm too old
    const result = probeEnvDeps(d);
    expect(result.status).toBe("fail");
    expect(result.detail).toBe("missing/old: pnpm");
  });

  it("fail when a hard dep is absent entirely", () => {
    const d = doctorAllGood();
    d.dependencies[2] = { id: "git", version: "missing", required: "hard", present: false, satisfiesMin: false };
    const result = probeEnvDeps(d);
    expect(result.status).toBe("fail");
    expect(result.detail).toBe("missing/old: git");
  });

  it("lists every failing hard dep in the detail", () => {
    const d = doctorAllGood();
    d.dependencies[0].present = false; // node
    d.dependencies[1].satisfiesMin = false; // pnpm
    const result = probeEnvDeps(d);
    expect(result.status).toBe("fail");
    expect(result.detail).toBe("missing/old: node, pnpm");
  });

  it("ok with empty detail string when there are no hard deps", () => {
    const result = probeEnvDeps({ dependencies: [] });
    expect(result.status).toBe("ok");
    expect(result.detail).toBe("");
  });
});

// =========================================================================
// run.cjs — probeWorkspaces
// =========================================================================

describe("probeWorkspaces", () => {
  it("ok when every required workspace is installed", () => {
    const result = probeWorkspaces(doctorAllGood());
    expect(result).toStrictEqual({ status: "ok", detail: "all installed" });
  });

  it("ignores optional workspaces (docs absent) and stays ok", () => {
    // docs is optional + not present in doctorAllGood.
    expect(probeWorkspaces(doctorAllGood()).status).toBe("ok");
  });

  it("fail when a required workspace is present but not installed", () => {
    const d = doctorAllGood();
    d.workspaces[1].installed = false; // mcp-server present, no node_modules
    const result = probeWorkspaces(d);
    expect(result.status).toBe("fail");
    expect(result.detail).toBe("not installed: mcp-server");
  });

  it("does not flag a required workspace whose package.json is absent", () => {
    // bad = present && !installed; an absent (present:false) ws is not bad.
    const d = doctorAllGood();
    d.workspaces[0] = { id: "root", optional: false, present: false, installed: false };
    expect(probeWorkspaces(d).status).toBe("ok");
  });

  it("lists every present-but-uninstalled required workspace", () => {
    const d = doctorAllGood();
    d.workspaces[0].installed = false;
    d.workspaces[1].installed = false;
    const result = probeWorkspaces(d);
    expect(result.detail).toBe("not installed: root, mcp-server");
  });

  it("ok when there are no workspaces at all", () => {
    expect(probeWorkspaces({ workspaces: [] })).toStrictEqual({
      status: "ok",
      detail: "all installed",
    });
  });
});

// =========================================================================
// run.cjs — probeEnvWiring
// =========================================================================

describe("probeEnvWiring", () => {
  it("warn when .env.local does not exist", () => {
    const result = probeEnvWiring({ env: { exists: false, keys: [] } });
    expect(result).toStrictEqual({ status: "warn", detail: ".env.local not found" });
  });

  it("ok when all keys are set", () => {
    const result = probeEnvWiring(doctorAllGood());
    expect(result).toStrictEqual({ status: "ok", detail: "Supabase keys set" });
  });

  it("warn (singular 'is') when exactly one key is unset", () => {
    const d = doctorAllGood();
    d.env.keys[0].state = "missing";
    const result = probeEnvWiring(d);
    expect(result.status).toBe("warn");
    expect(result.detail).toBe("SUPABASE_URL is not set");
  });

  it("warn (plural 'are') when multiple keys are unset", () => {
    const d = doctorAllGood();
    d.env.keys[0].state = "placeholder";
    d.env.keys[2].state = "missing";
    const result = probeEnvWiring(d);
    expect(result.status).toBe("warn");
    expect(result.detail).toBe("SUPABASE_URL, SUPABASE_SERVICE_KEY are not set");
  });

  it("treats a 'placeholder' state as unset", () => {
    const d = doctorAllGood();
    d.env.keys[1].state = "placeholder";
    expect(probeEnvWiring(d).status).toBe("warn");
  });

  it("ok when env exists with no keys to check", () => {
    expect(probeEnvWiring({ env: { exists: true, keys: [] } })).toStrictEqual({
      status: "ok",
      detail: "Supabase keys set",
    });
  });
});

// =========================================================================
// run.cjs — probeCommands
// =========================================================================

describe("probeCommands", () => {
  const REPO = "/repo";

  /** fs where every CAPABILITY_FILE exists and .md files have frontmatter. */
  function fsAllPresentValid() {
    return {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => "---\ntitle: x\n---\nbody"),
    };
  }

  it("ok when all files exist and every .md has frontmatter", () => {
    const result = probeCommands(REPO, fsAllPresentValid());
    expect(result.status).toBe("ok");
    expect(result.detail).toBe(`${CAPABILITY_FILES.length} files present`);
  });

  it("fail (missing:) when one file is absent", () => {
    const fs = fsAllPresentValid();
    const missingFile = CAPABILITY_FILES[0];
    fs.existsSync = vi.fn((p: string) => !p.endsWith(missingFile));
    const result = probeCommands(REPO, fs);
    expect(result.status).toBe("fail");
    expect(result.detail).toBe(`missing: ${missingFile}`);
  });

  it("fail (no frontmatter:) when a .md lacks frontmatter", () => {
    const fs = fsAllPresentValid();
    const mdFile = CAPABILITY_FILES.find((f: string) => f.endsWith(".md"))!;
    fs.readFileSync = vi.fn((p: string) =>
      p.endsWith(mdFile) ? "# heading\nno frontmatter here" : "---\nk: v\n---\n",
    );
    const result = probeCommands(REPO, fs);
    expect(result.status).toBe("fail");
    expect(result.detail).toBe(`no frontmatter: ${mdFile}`);
  });

  it("missing takes precedence over malformed frontmatter", () => {
    const fs = fsAllPresentValid();
    const missingNonMd = CAPABILITY_FILES.find((f: string) => !f.endsWith(".md"))!;
    fs.existsSync = vi.fn((p: string) => !p.endsWith(missingNonMd));
    fs.readFileSync = vi.fn(() => "no frontmatter at all");
    const result = probeCommands(REPO, fs);
    expect(result.status).toBe("fail");
    expect(result.detail).toBe(`missing: ${missingNonMd}`);
  });

  it("accepts CRLF frontmatter delimiters", () => {
    const fs = {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => "---\r\ntitle: x\r\n---\r\nbody"),
    };
    expect(probeCommands(REPO, fs).status).toBe("ok");
  });

  it("accepts leading whitespace before the frontmatter (trimStart)", () => {
    const fs = {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => "\n\n---\ntitle: x\n---\nbody"),
    };
    expect(probeCommands(REPO, fs).status).toBe("ok");
  });

  it("does not read non-.md files for frontmatter", () => {
    const readFileSync = vi.fn(() => "---\nk: v\n---\n");
    const fs = { existsSync: vi.fn(() => true), readFileSync };
    probeCommands(REPO, fs);
    // Only the .md capability files should be read.
    const mdCount = CAPABILITY_FILES.filter((f: string) => f.endsWith(".md")).length;
    expect(readFileSync).toHaveBeenCalledTimes(mdCount);
  });

  it("joins repoRoot with the relative capability path when probing existence", () => {
    const existsSync = vi.fn(() => true);
    const fs = { existsSync, readFileSync: vi.fn(() => "---\nk: v\n---\n") };
    probeCommands("/abc/def", fs);
    const firstArg = existsSync.mock.calls[0][0] as string;
    expect(firstArg.startsWith("/abc/def")).toBe(true);
  });
});

// =========================================================================
// run.cjs — runProbe (dispatch by group.probe)
// =========================================================================

describe("runProbe", () => {
  const ctxWithFs = (fs: any) => ({ repoRoot: "/repo", fs });

  it("routes probe 'env' to probeEnvDeps", () => {
    const res = runProbe({ probe: "env" }, ctxWithFs(fsAllAbsent()), doctorAllGood());
    expect(res.status).toBe("ok");
  });

  it("routes probe 'workspaces' to probeWorkspaces", () => {
    const res = runProbe({ probe: "workspaces" }, ctxWithFs(fsAllAbsent()), doctorAllGood());
    expect(res.status).toBe("ok");
  });

  it("routes probe 'env-wiring' to probeEnvWiring", () => {
    const res = runProbe({ probe: "env-wiring" }, ctxWithFs(fsAllAbsent()), doctorAllGood());
    expect(res.status).toBe("ok");
  });

  it("routes probe 'commands' to probeCommands using ctx.fs + ctx.repoRoot", () => {
    const fs = { existsSync: () => true, readFileSync: () => "---\nk: v\n---\n" };
    const res = runProbe({ probe: "commands" }, ctxWithFs(fs), doctorAllGood());
    expect(res.status).toBe("ok");
  });

  it("returns fail with a diagnostic detail for an unknown probe", () => {
    const res = runProbe({ probe: "mystery" }, ctxWithFs(fsAllAbsent()), doctorAllGood());
    expect(res.status).toBe("fail");
    expect(res.detail).toBe("unknown probe: mystery");
  });
});

// =========================================================================
// run.cjs — runShell
// =========================================================================

describe("runShell", () => {
  const baseGroup = { id: "drift", command: "pnpm check", cwd: "." };

  it("ok with empty detail when run reports success", () => {
    const run = vi.fn(() => ({ ok: true, code: 0, stdout: "all good", stderr: "" }));
    const res = runShell(baseGroup, { run, repoRoot: "/repo" });
    expect(res).toStrictEqual({ status: "ok", detail: "" });
  });

  it("fail with last-lines of stderr when run fails", () => {
    const run = vi.fn(() => ({
      ok: false,
      code: 1,
      stdout: "",
      stderr: "l1\nl2\nl3\nl4\nl5\nl6\nl7\nl8",
    }));
    const res = runShell(baseGroup, { run, repoRoot: "/repo" });
    expect(res.status).toBe("fail");
    // lastLines default n=6 over the stderr.
    expect(res.detail).toBe("l3\nl4\nl5\nl6\nl7\nl8");
  });

  it("fail falls back to stdout when stderr is empty", () => {
    const run = vi.fn(() => ({ ok: false, code: 2, stdout: "out-line", stderr: "" }));
    const res = runShell(baseGroup, { run, repoRoot: "/repo" });
    expect(res.status).toBe("fail");
    expect(res.detail).toBe("out-line");
  });

  it("fail uses 'exit N' when both stderr and stdout are empty", () => {
    const run = vi.fn(() => ({ ok: false, code: 7, stdout: "", stderr: "" }));
    const res = runShell(baseGroup, { run, repoRoot: "/repo" });
    expect(res.status).toBe("fail");
    expect(res.detail).toBe("exit 7");
  });

  it("invokes run with the command, empty args, shell:true, and a timeout", () => {
    const run = vi.fn(() => ({ ok: true, code: 0, stdout: "", stderr: "" }));
    runShell(baseGroup, { run, repoRoot: "/repo" });
    expect(run).toHaveBeenCalledTimes(1);
    const [cmd, args, options] = run.mock.calls[0];
    expect(cmd).toBe("pnpm check");
    expect(args).toEqual([]);
    expect(options.shell).toBe(true);
    expect(options.timeout).toBe(180000);
  });

  it("uses the 900000ms timeout for slow groups", () => {
    const run = vi.fn(() => ({ ok: true, code: 0, stdout: "", stderr: "" }));
    runShell({ ...baseGroup, slow: true }, { run, repoRoot: "/repo" });
    expect(run.mock.calls[0][2].timeout).toBe(900000);
  });

  it("resolves cwd by joining repoRoot with the group cwd", () => {
    const run = vi.fn(() => ({ ok: true, code: 0, stdout: "", stderr: "" }));
    runShell({ ...baseGroup, cwd: "mcp-server" }, { run, repoRoot: "/repo" });
    expect(run.mock.calls[0][2].cwd).toBe("/repo/mcp-server");
  });

  it("defaults cwd to repoRoot when the group has no cwd", () => {
    const run = vi.fn(() => ({ ok: true, code: 0, stdout: "", stderr: "" }));
    runShell({ id: "x", command: "echo" }, { run, repoRoot: "/repo" });
    expect(run.mock.calls[0][2].cwd).toBe("/repo");
  });
});

// =========================================================================
// run.cjs — execGroup (dispatch by group.kind)
// =========================================================================

describe("execGroup", () => {
  it("routes kind 'probe' to runProbe", () => {
    const run = vi.fn();
    const ctx = { run, repoRoot: "/repo", fs: fsAllAbsent() };
    const res = execGroup({ kind: "probe", probe: "env" }, ctx, doctorAllGood());
    expect(res.status).toBe("ok");
    expect(run).not.toHaveBeenCalled(); // probe path must not run shell
  });

  it("routes kind 'shell' to runShell", () => {
    const run = vi.fn(() => ({ ok: true, code: 0, stdout: "", stderr: "" }));
    const ctx = { run, repoRoot: "/repo" };
    const res = execGroup({ kind: "shell", command: "pnpm check", cwd: "." }, ctx, doctorAllGood());
    expect(res.status).toBe("ok");
    expect(run).toHaveBeenCalledTimes(1);
  });
});

// =========================================================================
// run.cjs — parseArgs
// =========================================================================

describe("parseArgs", () => {
  it("parses --heal --quick --only=drift,unit into the expected opts", () => {
    const opts = parseArgs(["node", "x", "--heal", "--quick", "--only=drift,unit"]);
    expect(opts).toStrictEqual({
      json: false,
      quick: true,
      full: false,
      heal: true,
      only: ["drift", "unit"],
    });
  });

  it("returns all-false defaults with only:null for no flags", () => {
    expect(parseArgs(["node", "x"])).toStrictEqual({
      json: false,
      quick: false,
      full: false,
      heal: false,
      only: null,
    });
  });

  it("parses --json", () => {
    expect(parseArgs(["node", "x", "--json"]).json).toBe(true);
  });

  it("parses --full", () => {
    expect(parseArgs(["node", "x", "--full"]).full).toBe(true);
  });

  it("trims whitespace inside --only and drops empty entries", () => {
    const opts = parseArgs(["node", "x", "--only= drift , , unit "]);
    expect(opts.only).toEqual(["drift", "unit"]);
  });

  it("--only= with an empty value yields an empty array", () => {
    expect(parseArgs(["node", "x", "--only="]).only).toEqual([]);
  });

  it("--only with a single id yields a one-element array", () => {
    expect(parseArgs(["node", "x", "--only=drift"]).only).toEqual(["drift"]);
  });

  it("ignores unknown flags", () => {
    const opts = parseArgs(["node", "x", "--bogus", "positional"]);
    expect(opts).toStrictEqual({
      json: false,
      quick: false,
      full: false,
      heal: false,
      only: null,
    });
  });

  it("combines all flags together", () => {
    const opts = parseArgs(["node", "x", "--json", "--full", "--heal", "--quick"]);
    expect(opts).toStrictEqual({
      json: true,
      quick: true,
      full: true,
      heal: true,
      only: null,
    });
  });
});

// =========================================================================
// run.cjs — runSuite (orchestrator, integration with injected fakes)
// =========================================================================

describe("runSuite", () => {
  let reporter: ReturnType<typeof fakeReporter>;

  beforeEach(() => {
    reporter = fakeReporter();
  });

  /** Shared base opts: fully injected, no real machine access. */
  function baseOpts(extra: Record<string, any> = {}) {
    return {
      reporter,
      which: whichNothing,
      fs: fsAllAbsent(),
      platform: { os: "linux", arch: "x64", isWindows: false },
      repoRoot: "/repo",
      secretsRoot: "/repo",
      ...extra,
    };
  }

  it("ok:true when the only selected hard shell group passes", () => {
    const run = vi.fn(() => ({ ok: true, code: 0, stdout: "", stderr: "" }));
    const result = runSuite(baseOpts({ run, only: ["drift"] }));
    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({ id: "drift", required: "hard", status: "ok" });
  });

  it("ok:false when a selected hard shell group fails", () => {
    const run = vi.fn(() => ({ ok: false, code: 1, stdout: "boom", stderr: "" }));
    const result = runSuite(baseOpts({ run, only: ["drift"] }));
    expect(result.ok).toBe(false);
    expect(result.results[0].status).toBe("fail");
  });

  it("downgrades a failing non-hard group to a warn (does not block ok)", () => {
    // mcp-analytics is 'recommended' + shell.
    const run = vi.fn(() => ({ ok: false, code: 1, stdout: "ts error", stderr: "" }));
    const result = runSuite(baseOpts({ run, only: ["mcp-analytics"] }));
    expect(result.ok).toBe(true);
    expect(result.results[0]).toMatchObject({ id: "mcp-analytics", status: "warn" });
  });

  it("commands probe passes (ok) when fs reports all files present + valid", () => {
    const fs = { existsSync: () => true, readFileSync: () => "---\nk: v\n---\n" };
    const run = vi.fn();
    const result = runSuite(baseOpts({ run, fs, only: ["commands"] }));
    expect(result.ok).toBe(true);
    expect(result.results[0]).toMatchObject({ id: "commands", status: "ok" });
    expect(run).not.toHaveBeenCalled(); // probe-only selection runs no shell
  });

  it("commands probe fails the suite when a capability file is missing", () => {
    const fs = { existsSync: () => false, readFileSync: () => "" };
    const result = runSuite(baseOpts({ run: vi.fn(), fs, only: ["commands"] }));
    expect(result.ok).toBe(false);
    expect(result.results[0].status).toBe("fail");
  });

  it("self-heals a failing group then re-runs and passes under --heal", () => {
    // First execGroup call fails → remedy runs → second execGroup passes.
    const run = vi
      .fn()
      // 1st: the group's shell command (drift) → fail
      .mockReturnValueOnce({ ok: false, code: 1, stdout: "drift!", stderr: "" })
      // 2nd: the autoRemedy command (pnpm resolver:index) → ignored result
      .mockReturnValueOnce({ ok: true, code: 0, stdout: "", stderr: "" })
      // 3rd: the retried group's shell command → ok
      .mockReturnValueOnce({ ok: true, code: 0, stdout: "", stderr: "" });
    const result = runSuite(baseOpts({ run, heal: true, only: ["drift"] }));
    expect(result.ok).toBe(true);
    expect(result.results[0]).toMatchObject({ id: "drift", status: "ok", healed: true });
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("does not attempt self-heal when --heal is absent (healed stays false)", () => {
    const run = vi.fn(() => ({ ok: false, code: 1, stdout: "drift!", stderr: "" }));
    const result = runSuite(baseOpts({ run, only: ["drift"] }));
    expect(result.ok).toBe(false);
    expect(result.results[0].healed).toBe(false);
    expect(run).toHaveBeenCalledTimes(1); // single attempt, no remedy
  });

  it("skips a skipIfNoEnv group when the env is not wired", () => {
    // fsAllAbsent → env.exists false → envReady false → mcp-smoke skipped.
    const run = vi.fn();
    const result = runSuite(baseOpts({ run, only: ["mcp-smoke"] }));
    expect(result.ok).toBe(true); // skip never blocks
    expect(result.results[0]).toMatchObject({ id: "mcp-smoke", status: "skip" });
    expect(run).not.toHaveBeenCalled();
  });

  it("runs a skipIfNoEnv group (not skipped) when env is fully wired", () => {
    // fs that makes the doctor see a wired .env.local with all keys set.
    const envText = "SUPABASE_URL=https://real.supabase.co\nSUPABASE_ANON_KEY=realanon\nSUPABASE_SERVICE_KEY=realservice\n";
    const fs = {
      existsSync: (p: string) => p.includes(".env.local"),
      readFileSync: () => envText,
    };
    const run = vi.fn(() => ({ ok: true, code: 0, stdout: "", stderr: "" }));
    const result = runSuite(baseOpts({ run, fs, only: ["mcp-smoke"] }));
    expect(result.results[0].status).toBe("ok");
    expect(run).toHaveBeenCalledTimes(1); // the shell command ran (not skipped)
  });

  it("returns one result per selected group, preserving order", () => {
    const run = vi.fn(() => ({ ok: true, code: 0, stdout: "", stderr: "" }));
    const result = runSuite(baseOpts({ run, only: ["tier1", "drift"] }));
    expect(result.results.map((r: any) => r.id)).toEqual(["tier1", "drift"]);
  });

  it("includes the doctor report in the return value", () => {
    const run = vi.fn(() => ({ ok: true, code: 0, stdout: "", stderr: "" }));
    const result = runSuite(baseOpts({ run, only: ["drift"] }));
    expect(result.doctor).toBeTypeOf("object");
    expect(result.doctor.summary).toBeTypeOf("object");
  });

  it("emits an ok verdict to the reporter when all hard groups pass", () => {
    const run = vi.fn(() => ({ ok: true, code: 0, stdout: "", stderr: "" }));
    runSuite(baseOpts({ run, only: ["drift"] }));
    expect(reporter.verdict).toHaveBeenCalledWith("ok", expect.any(String));
  });

  it("emits a fail verdict to the reporter when a hard group fails", () => {
    const run = vi.fn(() => ({ ok: false, code: 1, stdout: "x", stderr: "" }));
    runSuite(baseOpts({ run, only: ["drift"] }));
    expect(reporter.verdict).toHaveBeenCalledWith("fail", expect.any(String));
  });

  it("defaults the heal path off (no throw) and still returns a structured result", () => {
    const run = vi.fn(() => ({ ok: true, code: 0, stdout: "", stderr: "" }));
    const result = runSuite(baseOpts({ run, only: ["drift"], heal: undefined }));
    expect(result.ok).toBe(true);
  });
});
