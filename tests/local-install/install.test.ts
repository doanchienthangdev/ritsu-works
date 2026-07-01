import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as nodeFs from "node:fs";
import * as nodeOs from "node:os";
import * as nodePath from "node:path";

// ESM named imports from a CommonJS module. If any are undefined at runtime,
// the default-import fallback below repopulates them.
import {
  buildPlan as _buildPlan,
  installWorkspace as _installWorkspace,
  scaffoldRuntime as _scaffoldRuntime,
  installDepInternally as _installDepInternally,
  parseArgs as _parseArgs,
  RUNTIME_DIRS as _RUNTIME_DIRS,
  WORKSPACE_INSTALLS as _WORKSPACE_INSTALLS,
  // @ts-ignore — also pull the whole module for the fallback path
} from "../../scripts/local-install/install.cjs";

// @ts-ignore — CJS default-import fallback
import installMod from "../../scripts/local-install/install.cjs";

const buildPlan = _buildPlan ?? installMod.buildPlan;
const installWorkspace = _installWorkspace ?? installMod.installWorkspace;
const scaffoldRuntime = _scaffoldRuntime ?? installMod.scaffoldRuntime;
const installDepInternally = _installDepInternally ?? installMod.installDepInternally;
const parseArgs = _parseArgs ?? installMod.parseArgs;
const RUNTIME_DIRS = _RUNTIME_DIRS ?? installMod.RUNTIME_DIRS;
const WORKSPACE_INSTALLS = _WORKSPACE_INSTALLS ?? installMod.WORKSPACE_INSTALLS;

// ----------------------------------------------------------------------------
// Deterministic fakes — never touch the real machine, network, or pkg managers.
// ----------------------------------------------------------------------------

type DepStatus = "ok" | "warn" | "fail" | "skip";

interface FakeDepInput {
  id: string;
  status?: DepStatus;
  required?: string; // 'hard' | 'recommended' | 'feature'
  present?: boolean;
  version?: string;
  minVersion?: string;
  label?: string;
  command?: string | null;
  manual?: string | null;
}

/** Build a fake doctor-report dependency literal with the fields buildPlan reads. */
function dep(input: FakeDepInput) {
  return {
    id: input.id,
    label: input.label ?? input.id,
    status: input.status ?? "ok",
    required: input.required ?? "hard",
    present: input.present ?? true,
    version: input.version ?? "1.0.0",
    minVersion: input.minVersion ?? "1",
    installPlan: {
      command: input.command === undefined ? `install ${input.id}` : input.command,
      manual: input.manual === undefined ? `manual ${input.id}` : input.manual,
    },
  };
}

interface FakeWsInput {
  id: string;
  present?: boolean;
  installed?: boolean;
  optional?: boolean;
}

function ws(input: FakeWsInput) {
  return {
    id: input.id,
    present: input.present ?? true,
    installed: input.installed ?? false,
    optional: input.optional ?? false,
  };
}

/** A full, healthy report: pnpm ok, every workspace present. */
function healthyReport(overrides: { dependencies?: any[]; workspaces?: any[] } = {}) {
  return {
    dependencies: overrides.dependencies ?? [dep({ id: "pnpm", status: "ok" })],
    workspaces:
      overrides.workspaces ??
      [
        ws({ id: "root", present: true }),
        ws({ id: "mcp-server", present: true }),
        ws({ id: "mcp-server-analytics", present: true }),
        ws({ id: "docs", present: true, optional: true }),
      ],
  };
}

/**
 * Fake `run(cmd, args, opts)`. Decides ok/stderr from a predicate over the cmd
 * string. Records every invocation for assertions.
 */
function makeFakeRun(decide: (cmd: string, args: any[], opts: any) => { ok: boolean; stderr?: string }) {
  const calls: Array<{ cmd: string; args: any[]; opts: any }> = [];
  const run = (cmd: string, args: any[] = [], opts: any = {}) => {
    calls.push({ cmd, args, opts });
    const d = decide(cmd, args, opts);
    return { ok: d.ok, code: d.ok ? 0 : 1, stdout: "", stderr: d.stderr ?? "", error: null };
  };
  return { run, calls };
}

/** Fake platform with brew available (macos). */
function macosPlatformWithBrew() {
  return {
    os: "macos",
    arch: "arm64",
    shell: "zsh",
    isWindows: false,
    packageManagers: [{ id: "brew", label: "Homebrew", path: "/opt/homebrew/bin/brew" }],
    primaryPackageManager: { id: "brew", label: "Homebrew", path: "/opt/homebrew/bin/brew" },
  };
}

/** Fake platform with NO package managers (linux). */
function linuxPlatformNoPm() {
  return {
    os: "linux",
    arch: "x64",
    shell: "bash",
    isWindows: false,
    packageManagers: [],
    primaryPackageManager: null,
  };
}

const idsOf = (steps: any[]) => steps.map((s) => s.id);

// ============================================================================
// buildPlan
// ============================================================================
describe("buildPlan", () => {
  describe("happy path", () => {
    it("returns systemDeps and coreSteps arrays for a healthy report", () => {
      const plan = buildPlan(healthyReport(), {});
      expect(Array.isArray(plan.systemDeps)).toBe(true);
      expect(Array.isArray(plan.coreSteps)).toBe(true);
    });

    it("includes scaffold-runtime, husky, refresh-index in that order at the tail", () => {
      const plan = buildPlan(healthyReport(), {});
      const ids = idsOf(plan.coreSteps);
      const tail = ids.slice(-3);
      expect(tail).toStrictEqual(["scaffold-runtime", "husky", "refresh-index"]);
    });
  });

  describe("pnpm probe branch", () => {
    it("pushes ensure-pnpm step when pnpm status is not ok (fail)", () => {
      const report = healthyReport({ dependencies: [dep({ id: "pnpm", status: "fail" })] });
      const plan = buildPlan(report, {});
      expect(idsOf(plan.coreSteps)).toContain("ensure-pnpm");
    });

    it("pushes ensure-pnpm step when pnpm status is warn (too old)", () => {
      const report = healthyReport({ dependencies: [dep({ id: "pnpm", status: "warn" })] });
      const plan = buildPlan(report, {});
      expect(idsOf(plan.coreSteps)).toContain("ensure-pnpm");
    });

    it("does NOT push ensure-pnpm when pnpm status is ok", () => {
      const report = healthyReport({ dependencies: [dep({ id: "pnpm", status: "ok" })] });
      const plan = buildPlan(report, {});
      expect(idsOf(plan.coreSteps)).not.toContain("ensure-pnpm");
    });

    it("does NOT push ensure-pnpm when pnpm probe is absent from the report", () => {
      const report = healthyReport({ dependencies: [dep({ id: "git", status: "fail" })] });
      const plan = buildPlan(report, {});
      expect(idsOf(plan.coreSteps)).not.toContain("ensure-pnpm");
    });

    it("places ensure-pnpm first when present", () => {
      const report = healthyReport({ dependencies: [dep({ id: "pnpm", status: "fail" })] });
      const plan = buildPlan(report, {});
      expect(plan.coreSteps[0].id).toBe("ensure-pnpm");
      expect(plan.coreSteps[0].kind).toBe("pnpm");
    });
  });

  describe("withDocs branch", () => {
    it("excludes install-docs when withDocs is false", () => {
      const plan = buildPlan(healthyReport(), { withDocs: false });
      expect(idsOf(plan.coreSteps)).not.toContain("install-docs");
    });

    it("excludes install-docs when withDocs option is omitted (default false)", () => {
      const plan = buildPlan(healthyReport(), {});
      expect(idsOf(plan.coreSteps)).not.toContain("install-docs");
    });

    it("excludes install-docs when opts is undefined (default param)", () => {
      const plan = buildPlan(healthyReport());
      expect(idsOf(plan.coreSteps)).not.toContain("install-docs");
    });

    it("includes install-docs when withDocs is true", () => {
      const plan = buildPlan(healthyReport(), { withDocs: true });
      expect(idsOf(plan.coreSteps)).toContain("install-docs");
    });

    it("treats a truthy-but-not-true withDocs (string) as false (strict === true)", () => {
      // @ts-ignore — intentionally pass a non-boolean
      const plan = buildPlan(healthyReport(), { withDocs: "yes" });
      expect(idsOf(plan.coreSteps)).not.toContain("install-docs");
    });
  });

  describe("workspace inclusion", () => {
    it("includes install-root, install-mcp-server, install-mcp-server-analytics for a present report", () => {
      const ids = idsOf(buildPlan(healthyReport(), {}).coreSteps);
      expect(ids).toContain("install-root");
      expect(ids).toContain("install-mcp-server");
      expect(ids).toContain("install-mcp-server-analytics");
    });

    it("skips a workspace whose package.json is absent (present === false)", () => {
      const report = healthyReport({
        workspaces: [
          ws({ id: "root", present: true }),
          ws({ id: "mcp-server", present: false }),
          ws({ id: "mcp-server-analytics", present: true }),
        ],
      });
      const ids = idsOf(buildPlan(report, {}).coreSteps);
      expect(ids).toContain("install-root");
      expect(ids).not.toContain("install-mcp-server");
      expect(ids).toContain("install-mcp-server-analytics");
    });

    it("includes a workspace step when its state row is missing entirely (wsState undefined => not skipped)", () => {
      const report = healthyReport({ workspaces: [] });
      const ids = idsOf(buildPlan(report, {}).coreSteps);
      // root/mcp-server/analytics still planned because there's no `present: false` row.
      expect(ids).toContain("install-root");
      expect(ids).toContain("install-mcp-server");
      expect(ids).toContain("install-mcp-server-analytics");
    });

    it("attaches the matching WORKSPACE_INSTALLS object on a workspace step", () => {
      const step = buildPlan(healthyReport(), {}).coreSteps.find((s: any) => s.id === "install-root");
      expect(step.kind).toBe("workspace");
      expect(step.workspace.id).toBe("root");
      expect(step.workspace.frozen).toBe(true);
    });
  });

  describe("systemDeps filtering", () => {
    it("includes a dep whose status is fail", () => {
      const report = healthyReport({
        dependencies: [dep({ id: "pnpm", status: "ok" }), dep({ id: "git", status: "fail", required: "hard" })],
      });
      const sysIds = buildPlan(report, {}).systemDeps.map((d: any) => d.id);
      expect(sysIds).toContain("git");
    });

    it("includes a warn dep whose required is NOT feature (recommended)", () => {
      const report = healthyReport({
        dependencies: [dep({ id: "pnpm", status: "ok" }), dep({ id: "gh", status: "warn", required: "recommended" })],
      });
      const sysIds = buildPlan(report, {}).systemDeps.map((d: any) => d.id);
      expect(sysIds).toContain("gh");
    });

    it("EXCLUDES a warn dep whose required IS feature", () => {
      const report = healthyReport({
        dependencies: [dep({ id: "pnpm", status: "ok" }), dep({ id: "ffmpeg", status: "warn", required: "feature" })],
      });
      const sysIds = buildPlan(report, {}).systemDeps.map((d: any) => d.id);
      expect(sysIds).not.toContain("ffmpeg");
    });

    it("EXCLUDES an ok dep", () => {
      const report = healthyReport({
        dependencies: [dep({ id: "pnpm", status: "ok" }), dep({ id: "node", status: "ok" })],
      });
      const sysIds = buildPlan(report, {}).systemDeps.map((d: any) => d.id);
      expect(sysIds).not.toContain("node");
    });

    it("EXCLUDES a skip dep (feature absent => not fail, not warn)", () => {
      const report = healthyReport({
        dependencies: [dep({ id: "pnpm", status: "ok" }), dep({ id: "bun", status: "skip", required: "feature" })],
      });
      const sysIds = buildPlan(report, {}).systemDeps.map((d: any) => d.id);
      expect(sysIds).not.toContain("bun");
    });

    it("INCLUDES a fail dep even when required is feature (fail short-circuits the OR)", () => {
      const report = healthyReport({
        dependencies: [dep({ id: "pnpm", status: "ok" }), dep({ id: "python3", status: "fail", required: "feature" })],
      });
      const sysIds = buildPlan(report, {}).systemDeps.map((d: any) => d.id);
      expect(sysIds).toContain("python3");
    });

    it("maps reason to 'not installed' when the dep is absent (present false)", () => {
      const report = healthyReport({
        dependencies: [dep({ id: "pnpm", status: "ok" }), dep({ id: "git", status: "fail", present: false })],
      });
      const entry = buildPlan(report, {}).systemDeps.find((d: any) => d.id === "git");
      expect(entry.reason).toBe("not installed");
    });

    it("maps reason to a version string when the dep is present but too old (warn)", () => {
      const report = healthyReport({
        dependencies: [
          dep({ id: "pnpm", status: "ok" }),
          dep({ id: "node", status: "warn", required: "recommended", present: true, version: "18.0.0", minVersion: "20" }),
        ],
      });
      const entry = buildPlan(report, {}).systemDeps.find((d: any) => d.id === "node");
      expect(entry.reason).toBe("version 18.0.0 < min 20");
    });

    it("propagates command + manual from installPlan into the systemDeps entry", () => {
      const report = healthyReport({
        dependencies: [
          dep({ id: "pnpm", status: "ok" }),
          dep({ id: "git", status: "fail", command: "brew install git", manual: "https://git-scm.com" }),
        ],
      });
      const entry = buildPlan(report, {}).systemDeps.find((d: any) => d.id === "git");
      expect(entry.command).toBe("brew install git");
      expect(entry.manual).toBe("https://git-scm.com");
    });

    it("returns an empty systemDeps array when every dep is ok", () => {
      const report = healthyReport({
        dependencies: [dep({ id: "pnpm", status: "ok" }), dep({ id: "node", status: "ok" })],
      });
      expect(buildPlan(report, {}).systemDeps).toStrictEqual([]);
    });
  });
});

// ============================================================================
// parseArgs
// ============================================================================
describe("parseArgs", () => {
  it("parses the full flag set from the contract example", () => {
    const opts = parseArgs(["node", "x", "--apply", "--with-docs", "--install-deps=supabase-cli,gh", "--json"]);
    expect(opts).toStrictEqual({
      apply: true,
      withDocs: true,
      json: true,
      installDeps: ["supabase-cli", "gh"],
      profile: "owner",
    });
  });

  it("returns defaults (all false, empty installDeps, owner profile) for no flags", () => {
    const opts = parseArgs(["node", "x"]);
    expect(opts).toStrictEqual({ apply: false, withDocs: false, json: false, installDeps: [], profile: "owner" });
  });

  it("parses --profile=per-human and rejects an unknown profile (falls back to owner)", () => {
    expect(parseArgs(["node", "x", "--profile=per-human"]).profile).toBe("per-human");
    expect(parseArgs(["node", "x", "--profile=owner"]).profile).toBe("owner");
    expect(parseArgs(["node", "x", "--profile=root"]).profile).toBe("owner"); // unknown → safe default
    expect(parseArgs(["node", "x"]).profile).toBe("owner");
  });

  it("sets only apply when only --apply is passed", () => {
    const opts = parseArgs(["node", "x", "--apply"]);
    expect(opts.apply).toBe(true);
    expect(opts.withDocs).toBe(false);
    expect(opts.json).toBe(false);
    expect(opts.installDeps).toStrictEqual([]);
  });

  it("trims whitespace around install-deps ids", () => {
    const opts = parseArgs(["node", "x", "--install-deps= supabase-cli , gh "]);
    expect(opts.installDeps).toStrictEqual(["supabase-cli", "gh"]);
  });

  it("filters empty tokens out of install-deps (trailing comma)", () => {
    const opts = parseArgs(["node", "x", "--install-deps=gh,,"]);
    expect(opts.installDeps).toStrictEqual(["gh"]);
  });

  it("yields an empty installDeps array for --install-deps= with no value", () => {
    const opts = parseArgs(["node", "x", "--install-deps="]);
    expect(opts.installDeps).toStrictEqual([]);
  });

  it("handles a single install-dep id", () => {
    const opts = parseArgs(["node", "x", "--install-deps=ffmpeg"]);
    expect(opts.installDeps).toStrictEqual(["ffmpeg"]);
  });

  it("ignores unknown flags", () => {
    const opts = parseArgs(["node", "x", "--bogus", "--apply"]);
    expect(opts.apply).toBe(true);
    expect(opts.withDocs).toBe(false);
  });

  it("the last --install-deps wins when repeated", () => {
    const opts = parseArgs(["node", "x", "--install-deps=a,b", "--install-deps=c"]);
    expect(opts.installDeps).toStrictEqual(["c"]);
  });

  it("ignores positional arguments that are not flags", () => {
    const opts = parseArgs(["node", "x", "subcommand", "--json"]);
    expect(opts.json).toBe(true);
    expect(opts.apply).toBe(false);
  });
});

// ============================================================================
// scaffoldRuntime — REAL temp dirs (the only allowed real side effect)
// ============================================================================
describe("scaffoldRuntime", () => {
  let tmpRoot: string;
  let secretsRoot: string;
  let repoRoot: string;

  beforeEach(() => {
    tmpRoot = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "install-scaffold-"));
    secretsRoot = nodePath.join(tmpRoot, "secrets-root");
    repoRoot = nodePath.join(tmpRoot, "repo-root");
    nodeFs.mkdirSync(secretsRoot, { recursive: true });
    nodeFs.mkdirSync(repoRoot, { recursive: true });
  });

  afterEach(() => {
    nodeFs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function ctx() {
    return { fs: nodeFs, secretsRoot, repoRoot };
  }

  it("creates every RUNTIME_DIRS folder under secretsRoot", () => {
    scaffoldRuntime(ctx());
    for (const rel of RUNTIME_DIRS) {
      expect(nodeFs.existsSync(nodePath.join(secretsRoot, rel))).toBe(true);
    }
  });

  it("reports the created dirs in createdDirs and returns ok true", () => {
    const res = scaffoldRuntime(ctx());
    expect(res.ok).toBe(true);
    expect(res.createdDirs).toStrictEqual(RUNTIME_DIRS);
  });

  it("copies .env.example to runtime/secrets/.env.local when target is absent (detail mentions FILL)", () => {
    nodeFs.writeFileSync(nodePath.join(repoRoot, ".env.example"), "SUPABASE_URL=https://example\n");
    const res = scaffoldRuntime(ctx());
    const target = nodePath.join(secretsRoot, "runtime", "secrets", ".env.local");
    expect(nodeFs.existsSync(target)).toBe(true);
    expect(nodeFs.readFileSync(target, "utf8")).toBe("SUPABASE_URL=https://example\n");
    expect(res.detail).toContain("FILL");
  });

  it("leaves an existing .env.local untouched (detail says left untouched, content unchanged)", () => {
    const target = nodePath.join(secretsRoot, "runtime", "secrets", ".env.local");
    nodeFs.mkdirSync(nodePath.dirname(target), { recursive: true });
    nodeFs.writeFileSync(target, "EXISTING=value\n");
    // an .env.example also present — must NOT clobber the existing local.
    nodeFs.writeFileSync(nodePath.join(repoRoot, ".env.example"), "SUPABASE_URL=https://other\n");

    const res = scaffoldRuntime(ctx());
    expect(res.detail).toContain("left untouched");
    expect(nodeFs.readFileSync(target, "utf8")).toBe("EXISTING=value\n");
  });

  it("reports missing .env.example when neither target nor example exists", () => {
    const res = scaffoldRuntime(ctx());
    expect(res.detail).toContain("missing");
    const target = nodePath.join(secretsRoot, "runtime", "secrets", ".env.local");
    expect(nodeFs.existsSync(target)).toBe(false);
  });

  it("is idempotent — a second run creates no new dirs (createdDirs empty)", () => {
    scaffoldRuntime(ctx());
    const res2 = scaffoldRuntime(ctx());
    expect(res2.createdDirs).toStrictEqual([]);
    expect(res2.ok).toBe(true);
  });

  it("does not throw when only some RUNTIME_DIRS already exist (partial pre-existing)", () => {
    nodeFs.mkdirSync(nodePath.join(secretsRoot, "runtime", "logs"), { recursive: true });
    const res = scaffoldRuntime(ctx());
    expect(res.createdDirs).not.toContain("runtime/logs");
    expect(res.createdDirs).toContain("runtime/tmp");
    expect(res.ok).toBe(true);
  });

  // multi-user: per-human (co-founder) profile — god-key-free template.
  const target = () => nodePath.join(secretsRoot, "runtime", "secrets", ".env.local");
  const writeOwnerTpl = () => nodeFs.writeFileSync(nodePath.join(repoRoot, ".env.example"), "SUPABASE_SERVICE_KEY=owner-god-key\n");
  const writePerHumanTpl = () => nodeFs.writeFileSync(nodePath.join(repoRoot, ".env.per-human.example"), "RITSU_AUTH_MODE=per-human\n");

  it("per-human profile copies from .env.per-human.example (NOT .env.example)", () => {
    writeOwnerTpl();
    writePerHumanTpl();
    const res = scaffoldRuntime({ ...ctx(), profile: "per-human" });
    expect(nodeFs.readFileSync(target(), "utf8")).toBe("RITSU_AUTH_MODE=per-human\n");
    expect(nodeFs.readFileSync(target(), "utf8")).not.toContain("SERVICE_KEY");
    expect(res.detail).toContain("per-human");
    expect(res.profile).toBe("per-human");
  });

  it("per-human profile FALLS BACK to .env.example when the per-human template is absent", () => {
    writeOwnerTpl(); // only the owner template present
    const res = scaffoldRuntime({ ...ctx(), profile: "per-human" });
    expect(nodeFs.readFileSync(target(), "utf8")).toBe("SUPABASE_SERVICE_KEY=owner-god-key\n");
    expect(res.detail).toContain("per-human"); // still labeled per-human profile
  });

  it("owner profile (default) uses .env.example even when the per-human template also exists", () => {
    writeOwnerTpl();
    writePerHumanTpl();
    const res = scaffoldRuntime(ctx()); // no profile → owner
    expect(nodeFs.readFileSync(target(), "utf8")).toBe("SUPABASE_SERVICE_KEY=owner-god-key\n");
    expect(res.profile).toBe("owner");
  });
});

// ============================================================================
// installWorkspace — fully faked `run`
// ============================================================================
describe("installWorkspace", () => {
  const repoRoot = "/fake/repo";

  it("returns ok with detail 'frozen lockfile' when a frozen install succeeds", () => {
    const { run, calls } = makeFakeRun((cmd) => ({ ok: cmd.includes("--frozen-lockfile") }));
    const res = installWorkspace({ id: "root", dir: ".", frozen: true, required: true }, { run, repoRoot });
    expect(res.ok).toBe(true);
    expect(res.detail).toBe("frozen lockfile");
    // only the frozen command should have run (no fallback).
    expect(calls).toHaveLength(1);
    expect(calls[0].cmd).toContain("--frozen-lockfile");
  });

  it("falls back to a loose install when frozen fails and loose succeeds (detail mentions lockfile updated)", () => {
    const { run, calls } = makeFakeRun((cmd) => ({
      ok: !cmd.includes("--frozen-lockfile"),
      stderr: cmd.includes("--frozen-lockfile") ? "lockfile mismatch" : "",
    }));
    const res = installWorkspace({ id: "root", dir: ".", frozen: true, required: true }, { run, repoRoot });
    expect(res.ok).toBe(true);
    expect(res.detail).toContain("lockfile updated");
    expect(calls).toHaveLength(2);
    expect(calls[0].cmd).toContain("--frozen-lockfile");
    expect(calls[1].cmd).toBe("pnpm install");
  });

  it("returns ok false with trailing stderr when both frozen and loose fail", () => {
    const longStderr = "x".repeat(300) + "FATAL_END";
    const { run } = makeFakeRun(() => ({ ok: false, stderr: longStderr }));
    const res = installWorkspace({ id: "root", dir: ".", frozen: true, required: true }, { run, repoRoot });
    expect(res.ok).toBe(false);
    // only the last 200 chars are surfaced.
    expect(res.detail.length).toBe(200);
    expect(res.detail.endsWith("FATAL_END")).toBe(true);
  });

  it("uses 'install failed' fallback text when a failing loose install has empty stderr", () => {
    const { run } = makeFakeRun(() => ({ ok: false, stderr: "" }));
    const res = installWorkspace({ id: "root", dir: ".", frozen: true, required: true }, { run, repoRoot });
    expect(res.ok).toBe(false);
    expect(res.detail).toBe("install failed");
  });

  it("runs a plain install once for a non-frozen workspace (detail 'installed')", () => {
    const { run, calls } = makeFakeRun(() => ({ ok: true }));
    const res = installWorkspace({ id: "mcp-server-analytics", dir: "mcp-server-analytics", frozen: false, required: true }, { run, repoRoot });
    expect(res.ok).toBe(true);
    expect(res.detail).toBe("installed");
    expect(calls).toHaveLength(1);
    expect(calls[0].cmd).toBe("pnpm install");
  });

  it("returns ok false with trailing stderr for a failing non-frozen install", () => {
    const { run } = makeFakeRun(() => ({ ok: false, stderr: "boom" }));
    const res = installWorkspace({ id: "docs", dir: "docs", frozen: false, required: false }, { run, repoRoot });
    expect(res.ok).toBe(false);
    expect(res.detail).toBe("boom");
  });

  it("invokes run with the joined cwd of repoRoot + ws.dir", () => {
    const { run, calls } = makeFakeRun(() => ({ ok: true }));
    installWorkspace({ id: "mcp-server", dir: "mcp-server", frozen: false, required: true }, { run, repoRoot });
    expect(calls[0].opts.cwd).toBe(nodePath.join(repoRoot, "mcp-server"));
  });
});

// ============================================================================
// installDepInternally — real dependency manifest + faked run
// ============================================================================
describe("installDepInternally", () => {
  it("returns ok false for an unknown dependency id", () => {
    const { run, calls } = makeFakeRun(() => ({ ok: true }));
    const res = installDepInternally("not-a-real-dep", { run, platform: macosPlatformWithBrew() });
    expect(res.ok).toBe(false);
    expect(res.detail).toContain("unknown dependency");
    expect(calls).toHaveLength(0); // never runs anything
  });

  it("runs the resolved install command for a known dep on a platform that resolves a command (brew)", () => {
    const { run, calls } = makeFakeRun(() => ({ ok: true }));
    const res = installDepInternally("gh", { run, platform: macosPlatformWithBrew() });
    expect(res.ok).toBe(true);
    expect(res.detail).toContain("installed via");
    expect(calls).toHaveLength(1);
    expect(calls[0].cmd).toBe("brew install gh");
    expect(calls[0].opts.stdio).toBe("inherit");
  });

  it("returns ok false with 'failed:' when the resolved command run fails", () => {
    const { run } = makeFakeRun(() => ({ ok: false }));
    const res = installDepInternally("gh", { run, platform: macosPlatformWithBrew() });
    expect(res.ok).toBe(false);
    expect(res.detail).toContain("failed:");
    expect(res.detail).toContain("brew install gh");
  });

  it("returns ok false (no install command) when the platform resolves no command for the dep", () => {
    // supabase-cli has no linux install block → resolveInstallCommand yields no command.
    const { run, calls } = makeFakeRun(() => ({ ok: true }));
    const res = installDepInternally("supabase-cli", { run, platform: linuxPlatformNoPm() });
    expect(res.ok).toBe(false);
    expect(res.detail).toContain("no install command for supabase-cli");
    expect(res.detail).toContain("linux");
    expect(calls).toHaveLength(0);
  });

  it("uses the universal command path for a dep with a universal install (bun)", () => {
    const { run, calls } = makeFakeRun(() => ({ ok: true }));
    const res = installDepInternally("bun", { run, platform: linuxPlatformNoPm() });
    expect(res.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].cmd).toContain("bun.sh/install");
  });
});

// ============================================================================
// Exported constants
// ============================================================================
describe("RUNTIME_DIRS constant", () => {
  it("is a non-empty array of relative runtime/ paths", () => {
    expect(Array.isArray(RUNTIME_DIRS)).toBe(true);
    expect(RUNTIME_DIRS.length).toBeGreaterThan(0);
    for (const rel of RUNTIME_DIRS) expect(rel.startsWith("runtime/")).toBe(true);
  });

  it("includes runtime/secrets (the .env.local home)", () => {
    expect(RUNTIME_DIRS).toContain("runtime/secrets");
  });
});

describe("WORKSPACE_INSTALLS constant", () => {
  it("lists root, mcp-server, mcp-server-analytics, docs in order", () => {
    expect(WORKSPACE_INSTALLS.map((w: any) => w.id)).toStrictEqual([
      "root",
      "mcp-server",
      "mcp-server-analytics",
      "docs",
    ]);
  });

  it("marks docs as the only optIn workspace", () => {
    const optIn = WORKSPACE_INSTALLS.filter((w: any) => w.optIn === true).map((w: any) => w.id);
    expect(optIn).toStrictEqual(["docs"]);
  });

  it("marks root and mcp-server as frozen", () => {
    const frozen = WORKSPACE_INSTALLS.filter((w: any) => w.frozen === true).map((w: any) => w.id);
    expect(frozen).toStrictEqual(["root", "mcp-server"]);
  });
});
