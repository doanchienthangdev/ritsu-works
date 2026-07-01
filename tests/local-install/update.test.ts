import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as nodeFs from "node:fs";
import * as nodeOs from "node:os";
import * as nodePath from "node:path";

// vitest supports named imports from CommonJS module.exports; fall back below if undefined.
import * as updateMod from "../../scripts/local-install/update.cjs";
import { Reporter } from "../../scripts/local-install/lib/report.cjs";

const { gitStatus, runUpdate, parseArgs, detectProfile, mcpSkipWorktree } = updateMod as unknown as {
  gitStatus: (ctx: any) => any;
  runUpdate: (opts?: any) => any;
  parseArgs: (argv: string[]) => any;
  detectProfile: (repoRoot: string) => string;
  mcpSkipWorktree: (git: (args: string[]) => any) => boolean;
};

/**
 * Build a fake `run(cmd, args, opts)` matching the real exec.cjs contract:
 *   returns { ok, code, stdout, stderr, error }
 *
 * `responses` maps an args-join key (`args.join(" ")`) to a partial result.
 * Unknown keys default to a successful empty result so a single unmatched git
 * probe never silently throws — tests that care assert the recorded calls.
 */
type RunResult = {
  ok: boolean;
  code?: number | null;
  stdout?: string;
  stderr?: string;
  error?: unknown;
};

function makeFakeRun(responses: Record<string, RunResult>, calls?: string[][]) {
  return function fakeRun(_cmd: string, args: string[] = [], _opts: any = {}) {
    if (calls) calls.push(args.slice());
    const key = args.join(" ");
    const r = responses[key];
    if (r) {
      return {
        ok: r.ok,
        code: r.code != null ? r.code : r.ok ? 0 : 1,
        stdout: r.stdout != null ? r.stdout : "",
        stderr: r.stderr != null ? r.stderr : "",
        error: r.error != null ? r.error : null,
      };
    }
    return { ok: true, code: 0, stdout: "", stderr: "", error: null };
  };
}

/** A reporter that captures into an array sink and never writes to stdout. */
function makeCapturingReporter() {
  const captured: string[] = [];
  const reporter = new Reporter({ write: (s: string) => captured.push(s), color: false });
  return { reporter, captured };
}

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------
describe("parseArgs", () => {
  describe("happy path", () => {
    it("parses all three flags when present in any order", () => {
      const result = parseArgs(["node", "update.cjs", "--apply", "--with-docs", "--json"]);
      expect(result).toStrictEqual({ apply: true, withDocs: true, json: true });
    });

    it("returns all-false defaults when no flags are passed", () => {
      const result = parseArgs(["node", "update.cjs"]);
      expect(result).toStrictEqual({ apply: false, withDocs: false, json: false });
    });
  });

  describe("input boundaries", () => {
    it("returns all-false defaults for the minimal 2-element argv (node + script only)", () => {
      const result = parseArgs(["node", "script"]);
      expect(result).toStrictEqual({ apply: false, withDocs: false, json: false });
    });

    it("returns all-false defaults for an empty argv (slice(2) yields [])", () => {
      const result = parseArgs([]);
      expect(result).toStrictEqual({ apply: false, withDocs: false, json: false });
    });

    it("returns all-false defaults for a single-element argv", () => {
      const result = parseArgs(["node"]);
      expect(result).toStrictEqual({ apply: false, withDocs: false, json: false });
    });
  });

  describe("individual flag isolation", () => {
    it("sets only apply when only --apply is present", () => {
      const result = parseArgs(["node", "x", "--apply"]);
      expect(result).toStrictEqual({ apply: true, withDocs: false, json: false });
    });

    it("sets only withDocs when only --with-docs is present", () => {
      const result = parseArgs(["node", "x", "--with-docs"]);
      expect(result).toStrictEqual({ apply: false, withDocs: true, json: false });
    });

    it("sets only json when only --json is present", () => {
      const result = parseArgs(["node", "x", "--json"]);
      expect(result).toStrictEqual({ apply: false, withDocs: false, json: true });
    });
  });

  describe("unknown / noise arguments", () => {
    it("ignores unrecognized flags and positional args", () => {
      const result = parseArgs(["node", "x", "--apply", "--unknown", "positional", "-v"]);
      expect(result).toStrictEqual({ apply: true, withDocs: false, json: false });
    });

    it("does not treat a substring like --apply-now as --apply (exact includes match)", () => {
      const result = parseArgs(["node", "x", "--apply-now"]);
      expect(result).toStrictEqual({ apply: false, withDocs: false, json: false });
    });

    it("treats the first two argv slots as node+script regardless of their content", () => {
      // --apply in slot 0 or 1 is sliced off and ignored.
      const result = parseArgs(["--apply", "--json"]);
      expect(result).toStrictEqual({ apply: false, withDocs: false, json: false });
    });
  });

  describe("duplicate flags", () => {
    it("a flag repeated stays true (includes is idempotent)", () => {
      const result = parseArgs(["node", "x", "--apply", "--apply"]);
      expect(result).toStrictEqual({ apply: true, withDocs: false, json: false });
    });
  });
});

// ---------------------------------------------------------------------------
// gitStatus
// ---------------------------------------------------------------------------
describe("gitStatus", () => {
  const REPO = "/tmp/fake-repo";

  describe("happy path", () => {
    it("reports branch, no dirt, and upstream for a clean tracked tree", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        "status --porcelain": { ok: true, stdout: "" },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result).toStrictEqual({
        ok: true,
        branch: "main",
        dirty: false,
        dirtyCount: 0,
        upstream: "origin/main",
      });
    });
  });

  describe("branch resolution", () => {
    it("trims trailing newline from the branch name", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "feature/x\n" },
        "status --porcelain": { ok: true, stdout: "" },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: false },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.branch).toBe("feature/x");
    });

    it("sets branch null and ok false when rev-parse HEAD fails", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: false, stderr: "not a git repo" },
        "status --porcelain": { ok: true, stdout: "" },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: false },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.ok).toBe(false);
      expect(result.branch).toBe(null);
    });
  });

  describe("dirty detection", () => {
    it("clean porcelain output is not dirty and counts zero", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        "status --porcelain": { ok: true, stdout: "" },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.dirty).toBe(false);
      expect(result.dirtyCount).toBe(0);
    });

    it("real changes mark the tree dirty with an accurate count", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        "status --porcelain": {
          ok: true,
          stdout: " M src/a.ts\n?? src/b.ts\n M README.md\n",
        },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.dirty).toBe(true);
      expect(result.dirtyCount).toBe(3);
    });

    it("a single real change is dirty with count 1", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        "status --porcelain": { ok: true, stdout: " M one-file.ts\n" },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.dirty).toBe(true);
      expect(result.dirtyCount).toBe(1);
    });

    it("whitespace-only porcelain lines are filtered out (not dirty)", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        // a trailing blank line plus a pure-whitespace line
        "status --porcelain": { ok: true, stdout: "\n   \n" },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.dirty).toBe(false);
      expect(result.dirtyCount).toBe(0);
    });

    it("treats status as clean when the porcelain command itself fails", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        "status --porcelain": { ok: false, stderr: "fatal" },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.dirty).toBe(false);
      expect(result.dirtyCount).toBe(0);
    });
  });

  describe("ignored-dirty artifacts", () => {
    it("a porcelain output containing ONLY vendor/skillopt lines is NOT dirty", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        "status --porcelain": {
          ok: true,
          stdout: " M vendor/skillopt/foo.py\n?? vendor/skillopt/bar.json\n",
        },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.dirty).toBe(false);
      expect(result.dirtyCount).toBe(0);
    });

    it("a porcelain output containing ONLY _shared/*.generated.ts lines is NOT dirty", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        "status --porcelain": {
          ok: true,
          stdout: " M mcp-server/src/_shared/server.generated.ts\n",
        },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.dirty).toBe(false);
      expect(result.dirtyCount).toBe(0);
    });

    it("a porcelain output containing ONLY pnpm-lock.yaml line is NOT dirty", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        "status --porcelain": { ok: true, stdout: " M pnpm-lock.yaml\n" },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.dirty).toBe(false);
      expect(result.dirtyCount).toBe(0);
    });

    it("counts ONLY the non-ignored lines when ignored + real changes are mixed", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        "status --porcelain": {
          ok: true,
          stdout:
            " M vendor/skillopt/foo.py\n" +
            " M _shared/x.generated.ts\n" +
            " M pnpm-lock.yaml\n" +
            " M src/real-change.ts\n",
        },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.dirty).toBe(true);
      expect(result.dirtyCount).toBe(1);
    });

    it("does not ignore a pnpm-lock.yaml that is NOT at the end of the path (anchored $)", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        // pnpm-lock.yaml.bak should NOT be ignored — the regex is anchored to end
        "status --porcelain": { ok: true, stdout: " M pnpm-lock.yaml.bak\n" },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.dirty).toBe(true);
      expect(result.dirtyCount).toBe(1);
    });
  });

  describe("upstream resolution", () => {
    it("trims and returns the upstream ref when @{u} resolves", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        "status --porcelain": { ok: true, stdout: "" },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/develop\n" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.upstream).toBe("origin/develop");
    });

    it("sets upstream null when @{u} resolution fails (no upstream tracking)", () => {
      const run = makeFakeRun({
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        "status --porcelain": { ok: true, stdout: "" },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: false, stderr: "no upstream" },
      });
      const result = gitStatus({ run, repoRoot: REPO });
      expect(result.upstream).toBe(null);
    });
  });

  describe("dependency invocation", () => {
    it("invokes git with cwd=repoRoot and shell:false for every probe", () => {
      const calls: string[][] = [];
      let lastOpts: any = null;
      const responses: Record<string, RunResult> = {
        "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
        "status --porcelain": { ok: true, stdout: "" },
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      };
      const run = (_cmd: string, args: string[] = [], opts: any = {}) => {
        calls.push(args.slice());
        lastOpts = opts;
        const r = responses[args.join(" ")] || { ok: true };
        return { ok: r.ok, code: r.ok ? 0 : 1, stdout: r.stdout || "", stderr: "", error: null };
      };
      gitStatus({ run, repoRoot: REPO });
      expect(calls).toStrictEqual([
        ["rev-parse", "--abbrev-ref", "HEAD"],
        ["status", "--porcelain"],
        ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
      ]);
      expect(lastOpts.cwd).toBe(REPO);
      expect(lastOpts.shell).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// detectProfile — reads runtime/secrets/.env.local
// ---------------------------------------------------------------------------
describe("detectProfile", () => {
  let tmp: string;
  beforeEach(() => { tmp = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "upd-profile-")); });
  afterEach(() => nodeFs.rmSync(tmp, { recursive: true, force: true }));

  const writeEnv = (body: string) => {
    const dir = nodePath.join(tmp, "runtime", "secrets");
    nodeFs.mkdirSync(dir, { recursive: true });
    nodeFs.writeFileSync(nodePath.join(dir, ".env.local"), body);
  };

  it("returns 'per-human' when RITSU_AUTH_MODE=per-human", () => {
    writeEnv("SUPABASE_URL=x\nRITSU_AUTH_MODE=per-human\n");
    expect(detectProfile(tmp)).toBe("per-human");
  });

  it("returns 'owner' when RITSU_AUTH_MODE is service-key (or anything else)", () => {
    writeEnv("RITSU_AUTH_MODE=service-key\n");
    expect(detectProfile(tmp)).toBe("owner");
  });

  it("returns 'owner' when the key is absent", () => {
    writeEnv("SUPABASE_URL=x\n");
    expect(detectProfile(tmp)).toBe("owner");
  });

  it("returns 'owner' (safe default) when .env.local does not exist", () => {
    expect(detectProfile(tmp)).toBe("owner");
  });

  it("handles an `export ` prefix and a quoted value", () => {
    writeEnv('export RITSU_AUTH_MODE="per-human"\n');
    expect(detectProfile(tmp)).toBe("per-human");
  });

  it("does NOT match a commented-out per-human line", () => {
    writeEnv("# RITSU_AUTH_MODE=per-human\nRITSU_AUTH_MODE=service-key\n");
    expect(detectProfile(tmp)).toBe("owner");
  });
});

// ---------------------------------------------------------------------------
// mcpSkipWorktree — parses `git ls-files -v .mcp.json`
// ---------------------------------------------------------------------------
describe("mcpSkipWorktree", () => {
  it("true when git ls-files -v tags .mcp.json with 'S' (skip-worktree)", () => {
    const git = () => ({ ok: true, stdout: "S .mcp.json\n" });
    expect(mcpSkipWorktree(git)).toBe(true);
  });

  it("false when tracked normally (tag 'H')", () => {
    const git = () => ({ ok: true, stdout: "H .mcp.json\n" });
    expect(mcpSkipWorktree(git)).toBe(false);
  });

  it("false when the git call fails", () => {
    const git = () => ({ ok: false, stdout: "" });
    expect(mcpSkipWorktree(git)).toBe(false);
  });

  it("false on empty output (file not tracked)", () => {
    const git = () => ({ ok: true, stdout: "" });
    expect(mcpSkipWorktree(git)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// runUpdate — dry-run only (apply:false fully faked; never touches git/install)
// ---------------------------------------------------------------------------
describe("runUpdate (dry-run paths)", () => {
  const REPO = "/tmp/fake-repo";

  let baseResponses: Record<string, RunResult>;

  beforeEach(() => {
    // A clean, tracked, up-to-date tree by default.
    baseResponses = {
      "fetch --all --prune": { ok: true, stdout: "" },
      "rev-parse --abbrev-ref HEAD": { ok: true, stdout: "main\n" },
      "status --porcelain": { ok: true, stdout: "" },
      "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: true, stdout: "origin/main\n" },
      "log --oneline HEAD..origin/main": { ok: true, stdout: "" },
    };
  });

  describe("happy path", () => {
    it("returns ok:true and captured output for a clean, up-to-date dry-run", () => {
      const { reporter, captured } = makeCapturingReporter();
      const run = makeFakeRun(baseResponses);
      const result = runUpdate({ apply: false, run, repoRoot: REPO, reporter });
      expect(result.ok).toBe(true);
      expect(typeof result.captured).toBe("string");
      expect(captured.join("\n")).toContain("already up to date with origin/main");
    });

    it("does NOT invoke any pull command on a dry-run with incoming commits", () => {
      const calls: string[][] = [];
      const responses = {
        ...baseResponses,
        "log --oneline HEAD..origin/main": { ok: true, stdout: "abc123 commit one\ndef456 commit two\n" },
      };
      const run = makeFakeRun(responses, calls);
      const { reporter } = makeCapturingReporter();
      const result = runUpdate({ apply: false, run, repoRoot: REPO, reporter });
      expect(result.ok).toBe(true);
      const pulled = calls.some((c) => c[0] === "pull");
      expect(pulled).toBe(false);
    });
  });

  describe("fetch failure", () => {
    it("returns ok:false and aborts when git fetch fails", () => {
      const calls: string[][] = [];
      const responses = {
        ...baseResponses,
        "fetch --all --prune": { ok: false, stderr: "could not reach origin" },
      };
      const run = makeFakeRun(responses, calls);
      const { reporter, captured } = makeCapturingReporter();
      const result = runUpdate({ apply: false, run, repoRoot: REPO, reporter });
      expect(result.ok).toBe(false);
      expect(captured.join("\n")).toContain("git fetch failed");
      // It aborts before ever computing status / log.
      const ranStatus = calls.some((c) => c.join(" ") === "status --porcelain");
      expect(ranStatus).toBe(false);
    });
  });

  describe("incoming-commit reporting", () => {
    it("reports 'nothing to pull' verdict when there are no incoming commits", () => {
      const { reporter, captured } = makeCapturingReporter();
      const run = makeFakeRun(baseResponses);
      const result = runUpdate({ apply: false, run, repoRoot: REPO, reporter });
      expect(result.ok).toBe(true);
      expect(captured.join("\n")).toContain("Dry-run: nothing to pull.");
    });

    it("counts incoming commits and reports the count in the verdict", () => {
      const responses = {
        ...baseResponses,
        "log --oneline HEAD..origin/main": {
          ok: true,
          stdout: "a1 c1\nb2 c2\nc3 c3\n",
        },
      };
      const { reporter, captured } = makeCapturingReporter();
      const run = makeFakeRun(responses);
      const result = runUpdate({ apply: false, run, repoRoot: REPO, reporter });
      expect(result.ok).toBe(true);
      expect(captured.join("\n")).toContain("Dry-run: 3 commit(s) to pull. Re-run with --apply.");
    });

    it("treats a failed log command as zero incoming commits", () => {
      const responses = {
        ...baseResponses,
        "log --oneline HEAD..origin/main": { ok: false, stderr: "bad revision" },
      };
      const { reporter, captured } = makeCapturingReporter();
      const run = makeFakeRun(responses);
      const result = runUpdate({ apply: false, run, repoRoot: REPO, reporter });
      expect(result.ok).toBe(true);
      expect(captured.join("\n")).toContain("Dry-run: nothing to pull.");
    });
  });

  describe("dirty tree on dry-run", () => {
    it("warns but still returns ok:true (dry-run does not abort on dirt)", () => {
      const responses = {
        ...baseResponses,
        "status --porcelain": { ok: true, stdout: " M src/a.ts\n" },
      };
      const { reporter, captured } = makeCapturingReporter();
      const run = makeFakeRun(responses);
      const result = runUpdate({ apply: false, run, repoRoot: REPO, reporter });
      expect(result.ok).toBe(true);
      expect(captured.join("\n")).toContain("uncommitted change(s)");
    });
  });

  describe("upstream fallback", () => {
    it("falls back to origin/main in the log range when no upstream is tracked", () => {
      const calls: string[][] = [];
      const responses = {
        ...baseResponses,
        "rev-parse --abbrev-ref --symbolic-full-name @{u}": { ok: false, stderr: "no upstream" },
        "log --oneline HEAD..origin/main": { ok: true, stdout: "" },
      };
      const run = makeFakeRun(responses, calls);
      const { reporter, captured } = makeCapturingReporter();
      const result = runUpdate({ apply: false, run, repoRoot: REPO, reporter });
      expect(result.ok).toBe(true);
      const loggedAgainstOriginMain = calls.some(
        (c) => c.join(" ") === "log --oneline HEAD..origin/main",
      );
      expect(loggedAgainstOriginMain).toBe(true);
      expect(captured.join("\n")).toContain("upstream: (none)");
    });
  });

  describe("banner / branch reporting", () => {
    it("emits the dry-run banner and the resolved branch + upstream info line", () => {
      const { reporter, captured } = makeCapturingReporter();
      const run = makeFakeRun(baseResponses);
      runUpdate({ apply: false, run, repoRoot: REPO, reporter });
      const text = captured.join("\n");
      expect(text).toContain("Update plan (dry-run");
      expect(text).toContain("branch: main");
      expect(text).toContain("upstream: origin/main");
    });

    it("reports '(unknown)' branch when rev-parse HEAD fails on the dry-run path", () => {
      const responses = {
        ...baseResponses,
        "rev-parse --abbrev-ref HEAD": { ok: false, stderr: "detached?" },
      };
      const { reporter, captured } = makeCapturingReporter();
      const run = makeFakeRun(responses);
      const result = runUpdate({ apply: false, run, repoRoot: REPO, reporter });
      expect(result.ok).toBe(true);
      expect(captured.join("\n")).toContain("branch: (unknown)");
    });
  });

  describe("captured fallback", () => {
    it("returns an empty captured string when the reporter exposes no captured()", () => {
      // A minimal reporter stub with no captured() method exercises finish()'s guard.
      const noop = () => {};
      const stubReporter: any = {
        banner: noop,
        header: noop,
        ok: noop,
        fail: noop,
        warn: noop,
        info: noop,
        note: noop,
        verdict: noop,
      };
      const run = makeFakeRun(baseResponses);
      const result = runUpdate({ apply: false, run, repoRoot: REPO, reporter: stubReporter });
      expect(result.ok).toBe(true);
      expect(result.captured).toBe("");
    });
  });
});
