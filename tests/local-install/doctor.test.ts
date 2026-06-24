import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as nodePath from "node:path";

// ESM named imports from a CommonJS module. If any are undefined at runtime,
// the default-import fallback below will repopulate them.
import {
  probeDependency as _probeDependency,
  dependencyStatus as _dependencyStatus,
  probeWorkspaces as _probeWorkspaces,
  probeEnv as _probeEnv,
  parseEnvFile as _parseEnvFile,
  runDoctor as _runDoctor,
  repoRootFrom as _repoRootFrom,
  resolveSecretsRoot as _resolveSecretsRoot,
  WORKSPACES as _WORKSPACES,
  REQUIRED_ENV_KEYS as _REQUIRED_ENV_KEYS,
  // @ts-ignore — also pull the whole module for the fallback path
} from "../../scripts/local-install/doctor.cjs";

// @ts-ignore — CJS default-import fallback
import doctorMod from "../../scripts/local-install/doctor.cjs";

const probeDependency = _probeDependency ?? doctorMod.probeDependency;
const dependencyStatus = _dependencyStatus ?? doctorMod.dependencyStatus;
const probeWorkspaces = _probeWorkspaces ?? doctorMod.probeWorkspaces;
const probeEnv = _probeEnv ?? doctorMod.probeEnv;
const parseEnvFile = _parseEnvFile ?? doctorMod.parseEnvFile;
const runDoctor = _runDoctor ?? doctorMod.runDoctor;
const repoRootFrom = _repoRootFrom ?? doctorMod.repoRootFrom;
const resolveSecretsRoot = _resolveSecretsRoot ?? doctorMod.resolveSecretsRoot;
const WORKSPACES = _WORKSPACES ?? doctorMod.WORKSPACES;
const REQUIRED_ENV_KEYS = _REQUIRED_ENV_KEYS ?? doctorMod.REQUIRED_ENV_KEYS;

const SEP = nodePath.sep;

// ----------------------------------------------------------------------------
// Deterministic fake builders. None of these touch the real machine.
// ----------------------------------------------------------------------------

/** Fake `which(alias, opts) -> path|null` from an alias->path map. */
function fakeWhich(map: Record<string, string | null>) {
  return (alias: string, _opts?: any) =>
    Object.prototype.hasOwnProperty.call(map, alias) ? map[alias] : null;
}

/** Fake `run(cmd, args, opts) -> {ok,stdout,stderr,code}` from a cmd->result map. */
function fakeRun(map: Record<string, { stdout?: string; stderr?: string; code?: number }>) {
  return (cmd: string, _args?: any, _opts?: any) => {
    const r = map[cmd] || { stdout: "", stderr: "", code: 127 };
    const code = r.code ?? 0;
    return { ok: code === 0, code, stdout: r.stdout || "", stderr: r.stderr || "", error: null };
  };
}

/** Fake fs whose existsSync consults a set of paths and readFileSync a path->text map. */
function fakeFs(opts: {
  existing?: Set<string>;
  files?: Record<string, string>;
  readThrows?: boolean;
}) {
  const existing = opts.existing || new Set<string>();
  const files = opts.files || {};
  return {
    existsSync: (p: string) => existing.has(p),
    readFileSync: (p: string, _enc?: any) => {
      if (opts.readThrows) throw new Error("EACCES");
      if (Object.prototype.hasOwnProperty.call(files, p)) return files[p];
      throw new Error("ENOENT: " + p);
    },
  };
}

const posixPlatform = { os: "linux", isWindows: false };
const macosPlatform = { os: "macos", isWindows: false };
const windowsPlatform = { os: "windows", isWindows: true };

// Minimal dependency fixtures (the contract only needs id/label/required/
// category/minVersion/detect; resolveInstallCommand tolerates missing install).
function hardDep(overrides: any = {}) {
  return {
    id: "node",
    label: "Node.js",
    category: "runtime",
    required: "hard",
    minVersion: "20",
    detect: { cmd: "node", aliases: ["node"], args: ["--version"] },
    ...overrides,
  };
}

// ============================================================================
describe("doctor.cjs", () => {
  // --------------------------------------------------------------------------
  describe("exports", () => {
    it("exposes every documented function and constant", () => {
      expect(typeof probeDependency).toBe("function");
      expect(typeof dependencyStatus).toBe("function");
      expect(typeof probeWorkspaces).toBe("function");
      expect(typeof probeEnv).toBe("function");
      expect(typeof parseEnvFile).toBe("function");
      expect(typeof runDoctor).toBe("function");
      expect(typeof repoRootFrom).toBe("function");
      expect(typeof resolveSecretsRoot).toBe("function");
      expect(Array.isArray(WORKSPACES)).toBe(true);
      expect(Array.isArray(REQUIRED_ENV_KEYS)).toBe(true);
    });

    it("REQUIRED_ENV_KEYS holds the three supabase keys", () => {
      expect(REQUIRED_ENV_KEYS).toStrictEqual([
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_KEY",
      ]);
    });

    it("WORKSPACES lists root + the two MCP servers + optional docs", () => {
      const ids = WORKSPACES.map((w: any) => w.id);
      expect(ids).toStrictEqual(["root", "mcp-server", "mcp-server-analytics", "docs"]);
      const docs = WORKSPACES.find((w: any) => w.id === "docs");
      expect(docs.optional).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  describe("probeDependency", () => {
    it("happy path: present (which path) + run v20.18.0 -> present, version, satisfiesMin", () => {
      const ctx = {
        which: fakeWhich({ node: "/usr/bin/node" }),
        run: fakeRun({ node: { stdout: "v20.18.0\n" } }),
        platform: posixPlatform,
      };
      const probe = probeDependency(hardDep(), ctx);
      expect(probe.present).toBe(true);
      expect(probe.path).toBe("/usr/bin/node");
      expect(probe.version).toBe("20.18.0");
      expect(probe.versionRaw).toBe("v20.18.0");
      expect(probe.satisfiesMin).toBe(true);
      expect(probe.id).toBe("node");
    });

    it("absent: which() returns null -> present false, path null, satisfiesMin false", () => {
      const ctx = {
        which: fakeWhich({}),
        run: fakeRun({}),
        platform: posixPlatform,
      };
      const probe = probeDependency(hardDep(), ctx);
      expect(probe.present).toBe(false);
      expect(probe.path).toBe(null);
      expect(probe.satisfiesMin).toBe(false);
      expect(probe.versionRaw).toBe(null);
      expect(probe.version).toBe("unknown");
    });

    it("present but too old: run v18.0.0 vs dotted minVersion 20.0 -> satisfiesMin false", () => {
      // NOTE: parseVersion() requires a dotted N.N to parse a minimum; a bare
      // integer like "20" parses to null and compares as 0.0.0 (always
      // satisfied). The too-old branch therefore only fires with a dotted min.
      const ctx = {
        which: fakeWhich({ node: "/usr/bin/node" }),
        run: fakeRun({ node: { stdout: "v18.0.0\n" } }),
        platform: posixPlatform,
      };
      const probe = probeDependency(hardDep({ minVersion: "20.0" }), ctx);
      expect(probe.present).toBe(true);
      expect(probe.version).toBe("18.0.0");
      expect(probe.satisfiesMin).toBe(false);
    });

    it("bare-integer minVersion '20' is unparseable -> compares as 0.0.0 -> always satisfied", () => {
      // Documents the REAL DEPENDENCIES behavior: every dep uses a bare integer
      // minVersion, so probeDependency never reports them as too old.
      const ctx = {
        which: fakeWhich({ node: "/usr/bin/node" }),
        run: fakeRun({ node: { stdout: "v18.0.0\n" } }),
        platform: posixPlatform,
      };
      const probe = probeDependency(hardDep({ minVersion: "20" }), ctx);
      expect(probe.present).toBe(true);
      expect(probe.satisfiesMin).toBe(true);
    });

    it("present exactly at the dotted minimum boundary -> satisfiesMin true", () => {
      const ctx = {
        which: fakeWhich({ node: "/usr/bin/node" }),
        run: fakeRun({ node: { stdout: "v20.0.0\n" } }),
        platform: posixPlatform,
      };
      const probe = probeDependency(hardDep({ minVersion: "20.0" }), ctx);
      expect(probe.satisfiesMin).toBe(true);
    });

    it("aliases: first alias which() null, second alias found -> uses second", () => {
      const dep = hardDep({
        id: "python3",
        label: "Python 3",
        category: "feature",
        required: "feature",
        minVersion: "3",
        detect: { cmd: "python3", aliases: ["python3", "python"], args: ["--version"] },
      });
      const ctx = {
        which: fakeWhich({ python3: null, python: "/usr/bin/python" }),
        run: fakeRun({ python: { stdout: "Python 3.11.4\n" } }),
        platform: posixPlatform,
      };
      const probe = probeDependency(dep, ctx);
      expect(probe.present).toBe(true);
      expect(probe.path).toBe("/usr/bin/python");
      expect(probe.version).toBe("3.11.4");
      expect(probe.satisfiesMin).toBe(true);
    });

    it("falls back to dep.detect.cmd when aliases is absent", () => {
      const dep = hardDep({ detect: { cmd: "node", args: ["--version"] } });
      const ctx = {
        which: fakeWhich({ node: "/opt/node" }),
        run: fakeRun({ node: { stdout: "v22.1.0" } }),
        platform: posixPlatform,
      };
      const probe = probeDependency(dep, ctx);
      expect(probe.present).toBe(true);
      expect(probe.path).toBe("/opt/node");
    });

    it("reads version from stderr when stdout is empty (e.g. some CLIs)", () => {
      const ctx = {
        which: fakeWhich({ node: "/usr/bin/node" }),
        run: fakeRun({ node: { stdout: "", stderr: "v21.3.0\n" } }),
        platform: posixPlatform,
      };
      const probe = probeDependency(hardDep(), ctx);
      expect(probe.version).toBe("21.3.0");
      expect(probe.versionRaw).toBe("v21.3.0");
    });

    it("present but unparseable version -> version unknown, satisfiesMin false", () => {
      const ctx = {
        which: fakeWhich({ node: "/usr/bin/node" }),
        run: fakeRun({ node: { stdout: "garbage output no numbers" } }),
        platform: posixPlatform,
      };
      const probe = probeDependency(hardDep(), ctx);
      expect(probe.present).toBe(true);
      expect(probe.version).toBe("unknown");
      expect(probe.satisfiesMin).toBe(false);
      expect(probe.versionRaw).toBe("garbage output no numbers");
    });

    it("windows platform uses the windows family when probing which", () => {
      const seen: string[] = [];
      const which = (alias: string, opts: any) => {
        seen.push(opts.osFamily);
        return alias === "node" ? "C:\\node\\node.exe" : null;
      };
      const ctx = { which, run: fakeRun({ node: { stdout: "v20.5.0" } }), platform: windowsPlatform };
      const probe = probeDependency(hardDep(), ctx);
      expect(probe.present).toBe(true);
      expect(seen).toContain("windows");
    });

    it("posix platform passes the posix family to which", () => {
      const seen: string[] = [];
      const which = (alias: string, opts: any) => {
        seen.push(opts.osFamily);
        return null;
      };
      const ctx = { which, run: fakeRun({}), platform: posixPlatform };
      probeDependency(hardDep(), ctx);
      expect(seen).toContain("posix");
    });

    it("only the first matching alias triggers a run() call", () => {
      const run = vi.fn((cmd: string) => ({ ok: true, code: 0, stdout: "v20.0.0", stderr: "", error: null }));
      const dep = hardDep({ detect: { cmd: "node", aliases: ["nodejs", "node"], args: ["--version"] } });
      const ctx = { which: fakeWhich({ nodejs: null, node: "/usr/bin/node" }), run, platform: posixPlatform };
      probeDependency(dep, ctx);
      expect(run).toHaveBeenCalledTimes(1);
      expect(run.mock.calls[0][0]).toBe("node");
    });

    it("does NOT call run() when the dependency is absent", () => {
      const run = vi.fn(() => ({ ok: true, code: 0, stdout: "v20.0.0", stderr: "", error: null }));
      const ctx = { which: fakeWhich({}), run, platform: posixPlatform };
      probeDependency(hardDep(), ctx);
      expect(run).not.toHaveBeenCalled();
    });

    it("propagates feature/note metadata onto the probe", () => {
      const dep = hardDep({ feature: "x feature", note: "x note" });
      const ctx = { which: fakeWhich({}), run: fakeRun({}), platform: posixPlatform };
      const probe = probeDependency(dep, ctx);
      expect(probe.feature).toBe("x feature");
      expect(probe.note).toBe("x note");
    });

    it("sets feature/note/manual to null when the dep omits them", () => {
      const dep = hardDep();
      const ctx = { which: fakeWhich({}), run: fakeRun({}), platform: posixPlatform };
      const probe = probeDependency(dep, ctx);
      expect(probe.feature).toBe(null);
      expect(probe.note).toBe(null);
      expect(probe.manual).toBe(null);
    });

    it("carries through id/label/required/category/minVersion from the dep", () => {
      const dep = hardDep({ required: "recommended", category: "tooling", minVersion: "2" });
      const ctx = { which: fakeWhich({}), run: fakeRun({}), platform: posixPlatform };
      const probe = probeDependency(dep, ctx);
      expect(probe.required).toBe("recommended");
      expect(probe.category).toBe("tooling");
      expect(probe.minVersion).toBe("2");
      expect(probe.label).toBe("Node.js");
    });
  });

  // --------------------------------------------------------------------------
  describe("dependencyStatus", () => {
    it("present + satisfiesMin -> ok", () => {
      expect(dependencyStatus({ present: true, satisfiesMin: true, required: "hard" })).toBe("ok");
    });

    it("present + !satisfiesMin -> warn (too old), regardless of required level", () => {
      expect(dependencyStatus({ present: true, satisfiesMin: false, required: "hard" })).toBe("warn");
      expect(dependencyStatus({ present: true, satisfiesMin: false, required: "feature" })).toBe("warn");
    });

    it("absent + required hard -> fail", () => {
      expect(dependencyStatus({ present: false, satisfiesMin: false, required: "hard" })).toBe("fail");
    });

    it("absent + required recommended -> warn", () => {
      expect(dependencyStatus({ present: false, satisfiesMin: false, required: "recommended" })).toBe("warn");
    });

    it("absent + required feature -> skip", () => {
      expect(dependencyStatus({ present: false, satisfiesMin: false, required: "feature" })).toBe("skip");
    });

    it("absent + unknown required level -> skip (default branch)", () => {
      expect(dependencyStatus({ present: false, satisfiesMin: false, required: "weird" })).toBe("skip");
    });
  });

  // --------------------------------------------------------------------------
  describe("parseEnvFile", () => {
    it("ignores blanks, # comments, and lines without '=' ; trims keys/values", () => {
      expect(parseEnvFile("A=1\n# c\n\nB = 2")).toStrictEqual({ A: "1", B: "2" });
    });

    it("keeps a value that itself contains '=' (split on first '=' only)", () => {
      expect(parseEnvFile("TOKEN=a=b=c")).toStrictEqual({ TOKEN: "a=b=c" });
    });

    it("returns {} for an empty string", () => {
      expect(parseEnvFile("")).toStrictEqual({});
    });

    it("returns {} when every line is a comment or blank", () => {
      expect(parseEnvFile("# only\n\n   \n# comments")).toStrictEqual({});
    });

    it("handles CRLF line endings", () => {
      expect(parseEnvFile("A=1\r\nB=2\r\n")).toStrictEqual({ A: "1", B: "2" });
    });

    it("trims surrounding whitespace from both key and value", () => {
      expect(parseEnvFile("  KEY   =   value  ")).toStrictEqual({ KEY: "value" });
    });

    it("a key with an empty value is preserved as empty string", () => {
      expect(parseEnvFile("EMPTY=")).toStrictEqual({ EMPTY: "" });
    });

    it("ignores a line that is only a '#'-prefixed comment with an '=' inside", () => {
      expect(parseEnvFile("# A=should-be-ignored")).toStrictEqual({});
    });

    it("records a leading-'=' line under the empty-string key", () => {
      // eq=0 -> key slice is "" ; still recorded.
      expect(parseEnvFile("=novalue")).toStrictEqual({ "": "novalue" });
    });

    it("last assignment of a duplicate key wins", () => {
      expect(parseEnvFile("A=1\nA=2")).toStrictEqual({ A: "2" });
    });
  });

  // --------------------------------------------------------------------------
  describe("probeEnv", () => {
    const secretsRoot = "/repo";
    const envPath = nodePath.join(secretsRoot, "runtime", "secrets", ".env.local");

    it("missing file -> exists false, every key state 'missing-file', never values", () => {
      const fs = fakeFs({ existing: new Set() });
      const res = probeEnv(secretsRoot, fs);
      expect(res.exists).toBe(false);
      expect(res.path).toBe(envPath);
      expect(res.keys).toStrictEqual(
        REQUIRED_ENV_KEYS.map((k: string) => ({ key: k, state: "missing-file" }))
      );
      // never leaks a value field
      for (const k of res.keys) expect(Object.keys(k).sort()).toStrictEqual(["key", "state"]);
    });

    it("present: one real value (set), one placeholder, one missing", () => {
      const text = [
        "SUPABASE_URL=https://realproject.supabase.co",
        "SUPABASE_ANON_KEY=eyJhbGc...",
        // SUPABASE_SERVICE_KEY omitted entirely
      ].join("\n");
      const fs = fakeFs({ existing: new Set([envPath]), files: { [envPath]: text } });
      const res = probeEnv(secretsRoot, fs);
      expect(res.exists).toBe(true);
      const byKey = Object.fromEntries(res.keys.map((k: any) => [k.key, k.state]));
      expect(byKey["SUPABASE_URL"]).toBe("set");
      expect(byKey["SUPABASE_ANON_KEY"]).toBe("placeholder");
      expect(byKey["SUPABASE_SERVICE_KEY"]).toBe("missing");
    });

    it("a value containing 'your-project' is classified placeholder", () => {
      const text = "SUPABASE_URL=https://your-project.supabase.co\nSUPABASE_ANON_KEY=real\nSUPABASE_SERVICE_KEY=real2";
      const fs = fakeFs({ existing: new Set([envPath]), files: { [envPath]: text } });
      const res = probeEnv(secretsRoot, fs);
      const byKey = Object.fromEntries(res.keys.map((k: any) => [k.key, k.state]));
      expect(byKey["SUPABASE_URL"]).toBe("placeholder");
      expect(byKey["SUPABASE_ANON_KEY"]).toBe("set");
    });

    it("the literal placeholder ref 'your-project-ref' is placeholder", () => {
      const text = "SUPABASE_URL=your-project-ref\nSUPABASE_ANON_KEY=a\nSUPABASE_SERVICE_KEY=b";
      const fs = fakeFs({ existing: new Set([envPath]), files: { [envPath]: text } });
      const res = probeEnv(secretsRoot, fs);
      const byKey = Object.fromEntries(res.keys.map((k: any) => [k.key, k.state]));
      expect(byKey["SUPABASE_URL"]).toBe("placeholder");
    });

    it("an empty value is treated as a placeholder", () => {
      const text = "SUPABASE_URL=\nSUPABASE_ANON_KEY=x\nSUPABASE_SERVICE_KEY=y";
      const fs = fakeFs({ existing: new Set([envPath]), files: { [envPath]: text } });
      const res = probeEnv(secretsRoot, fs);
      const byKey = Object.fromEntries(res.keys.map((k: any) => [k.key, k.state]));
      expect(byKey["SUPABASE_URL"]).toBe("placeholder");
    });

    it("readFileSync throws -> exists true, every key state 'unreadable', no values", () => {
      const fs = fakeFs({ existing: new Set([envPath]), readThrows: true });
      const res = probeEnv(secretsRoot, fs);
      expect(res.exists).toBe(true);
      expect(res.path).toBe(envPath);
      expect(res.keys).toStrictEqual(
        REQUIRED_ENV_KEYS.map((k: string) => ({ key: k, state: "unreadable" }))
      );
    });

    it("all three set -> all states 'set'", () => {
      const text = "SUPABASE_URL=https://abc.supabase.co\nSUPABASE_ANON_KEY=tok1\nSUPABASE_SERVICE_KEY=tok2";
      const fs = fakeFs({ existing: new Set([envPath]), files: { [envPath]: text } });
      const res = probeEnv(secretsRoot, fs);
      expect(res.keys.every((k: any) => k.state === "set")).toBe(true);
    });

    it("never returns the raw value under any key entry", () => {
      const text = "SUPABASE_URL=https://abc.supabase.co\nSUPABASE_ANON_KEY=secret-token\nSUPABASE_SERVICE_KEY=svc-99";
      const fs = fakeFs({ existing: new Set([envPath]), files: { [envPath]: text } });
      const res = probeEnv(secretsRoot, fs);
      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain("secret-token");
      expect(serialized).not.toContain("svc-99");
    });

    it("defaults fs to node:fs when omitted (missing real path -> exists false)", () => {
      const res = probeEnv("/definitely/not/a/real/path/xyz123");
      expect(res.exists).toBe(false);
      expect(res.keys.every((k: any) => k.state === "missing-file")).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  describe("probeWorkspaces", () => {
    const repoRoot = "/repo";
    function pkg(dir: string) {
      return nodePath.join(repoRoot, dir, "package.json");
    }
    function modules(dir: string) {
      return nodePath.join(repoRoot, dir, "node_modules");
    }

    it("installed only when BOTH package.json and node_modules exist", () => {
      const existing = new Set([pkg("."), modules(".")]);
      const fs = fakeFs({ existing });
      const res = probeWorkspaces(repoRoot, fs);
      const root = res.find((w: any) => w.id === "root");
      expect(root.present).toBe(true);
      expect(root.installed).toBe(true);
    });

    it("present but not installed when package.json exists without node_modules", () => {
      const existing = new Set([pkg("mcp-server")]);
      const fs = fakeFs({ existing });
      const res = probeWorkspaces(repoRoot, fs);
      const ws = res.find((w: any) => w.id === "mcp-server");
      expect(ws.present).toBe(true);
      expect(ws.installed).toBe(false);
    });

    it("absent when neither exists", () => {
      const fs = fakeFs({ existing: new Set() });
      const res = probeWorkspaces(repoRoot, fs);
      const ws = res.find((w: any) => w.id === "mcp-server-analytics");
      expect(ws.present).toBe(false);
      expect(ws.installed).toBe(false);
    });

    it("node_modules without package.json is NOT present (needs the pkg)", () => {
      const existing = new Set([modules("docs")]);
      const fs = fakeFs({ existing });
      const res = probeWorkspaces(repoRoot, fs);
      const ws = res.find((w: any) => w.id === "docs");
      expect(ws.present).toBe(false);
      expect(ws.installed).toBe(false);
    });

    it("preserves the optional flag from WORKSPACES", () => {
      const fs = fakeFs({ existing: new Set() });
      const res = probeWorkspaces(repoRoot, fs);
      const docs = res.find((w: any) => w.id === "docs");
      const root = res.find((w: any) => w.id === "root");
      expect(docs.optional).toBe(true);
      expect(root.optional).toBeUndefined();
    });

    it("returns one entry per WORKSPACES entry in declared order", () => {
      const fs = fakeFs({ existing: new Set() });
      const res = probeWorkspaces(repoRoot, fs);
      expect(res.map((w: any) => w.id)).toStrictEqual(WORKSPACES.map((w: any) => w.id));
    });

    it("carries label and dir through from the WORKSPACES spec", () => {
      const fs = fakeFs({ existing: new Set() });
      const res = probeWorkspaces(repoRoot, fs);
      const root = res.find((w: any) => w.id === "root");
      expect(root.dir).toBe(".");
      expect(root.label).toBe("root deps");
    });
  });

  // --------------------------------------------------------------------------
  describe("repoRootFrom", () => {
    it("resolves two levels up from a scripts/local-install dir", () => {
      const dir = nodePath.join("/repo", "scripts", "local-install");
      expect(repoRootFrom(dir)).toBe(nodePath.resolve("/repo"));
    });

    it("is path-resolved (collapses the ../..)", () => {
      const dir = "/a/b/c";
      expect(repoRootFrom(dir)).toBe(nodePath.resolve("/a"));
    });
  });

  // --------------------------------------------------------------------------
  describe("resolveSecretsRoot", () => {
    it("returns the part before the .claude/worktrees marker", () => {
      const base = ["", "Users", "me", "ritsu-works"].join(SEP);
      const root = [base, ".claude", "worktrees", "wt-x", "sub"].join(SEP);
      expect(resolveSecretsRoot(root)).toBe(base);
    });

    it("returns the path unchanged for a normal repo path (no marker)", () => {
      const root = ["", "Users", "me", "ritsu-works"].join(SEP);
      expect(resolveSecretsRoot(root)).toBe(root);
    });

    it("strips at the FIRST marker occurrence", () => {
      const marker = `${SEP}.claude${SEP}worktrees${SEP}`;
      const root = `${SEP}base${marker}a${marker}b`;
      expect(resolveSecretsRoot(root)).toBe(`${SEP}base`);
    });
  });

  // --------------------------------------------------------------------------
  describe("runDoctor", () => {
    const repoRoot = "/repo";

    // node/pnpm/git/gh/supabase present+ok; python/ffmpeg/bun absent (features).
    function allGoodWhich(): Record<string, string | null> {
      return {
        node: "/b/node",
        pnpm: "/b/pnpm",
        git: "/b/git",
        gh: "/b/gh",
        supabase: "/b/supabase",
        python3: null,
        python: null,
        ffmpeg: null,
        bun: null,
      };
    }
    function allGoodRun(): Record<string, { stdout?: string }> {
      return {
        node: { stdout: "v20.18.0" },
        pnpm: { stdout: "9.1.0" },
        git: { stdout: "git version 2.39.3" },
        gh: { stdout: "gh version 2.40.0" },
        supabase: { stdout: "1.100.0" },
      };
    }

    function wsExisting(repo: string, installed = true): Set<string> {
      const out = new Set<string>();
      for (const ws of WORKSPACES) {
        out.add(nodePath.join(repo, ws.dir, "package.json"));
        if (installed) out.add(nodePath.join(repo, ws.dir, "node_modules"));
      }
      return out;
    }

    it("all hard deps present + satisfying + env set -> summary.ok true, no hardMissing", () => {
      const envPath = nodePath.join(repoRoot, "runtime", "secrets", ".env.local");
      const fs = fakeFs({
        existing: new Set([...wsExisting(repoRoot, true), envPath]),
        files: {
          [envPath]:
            "SUPABASE_URL=https://x.supabase.co\nSUPABASE_ANON_KEY=a\nSUPABASE_SERVICE_KEY=b",
        },
      });
      const report = runDoctor({
        platform: macosPlatform,
        which: fakeWhich(allGoodWhich()),
        run: fakeRun(allGoodRun()),
        fs,
        repoRoot,
        secretsRoot: repoRoot,
      });
      expect(report.summary.ok).toBe(true);
      expect(report.summary.hardMissing).toStrictEqual([]);
      expect(report.summary.tooOld).toStrictEqual([]);
      expect(report.summary.envReady).toBe(true);
      expect(report.repoRoot).toBe(repoRoot);
      expect(report.secretsRoot).toBe(repoRoot);
      expect(report.platform).toStrictEqual(macosPlatform);
    });

    it("a hard dep absent -> summary.ok false and its id in hardMissing", () => {
      const which = allGoodWhich();
      which.node = null; // node missing
      const fs = fakeFs({ existing: wsExisting(repoRoot, true) });
      const report = runDoctor({
        platform: macosPlatform,
        which: fakeWhich(which),
        run: fakeRun(allGoodRun()),
        fs,
        repoRoot,
        secretsRoot: repoRoot,
      });
      expect(report.summary.ok).toBe(false);
      expect(report.summary.hardMissing).toContain("node");
    });

    it("a present-but-old node IS flagged tooOld (minVersion is dotted, so gating works)", () => {
      // The real DEPENDENCIES use dotted minVersions ("20.0") so parseVersion()
      // parses the minimum and the comparison gates correctly: v18 < 20.0 -> tooOld.
      // Pins runDoctor against the real dependency matrix.
      const run = allGoodRun();
      run.node = { stdout: "v18.0.0" };
      const fs = fakeFs({ existing: wsExisting(repoRoot, true) });
      const report = runDoctor({
        platform: macosPlatform,
        which: fakeWhich(allGoodWhich()),
        run: fakeRun(run),
        fs,
        repoRoot,
        secretsRoot: repoRoot,
      });
      expect(report.summary.tooOld).toStrictEqual(["node"]);
      expect(report.summary.ok).toBe(false);
      const node = report.dependencies.find((d: any) => d.id === "node");
      expect(node.version).toBe("18.0.0");
      expect(node.satisfiesMin).toBe(false);
      expect(node.status).toBe("warn");
    });

    it("a missing recommended dep does NOT break summary.ok", () => {
      const which = allGoodWhich();
      which.gh = null; // gh is recommended
      const fs = fakeFs({ existing: wsExisting(repoRoot, true) });
      const report = runDoctor({
        platform: macosPlatform,
        which: fakeWhich(which),
        run: fakeRun(allGoodRun()),
        fs,
        repoRoot,
        secretsRoot: repoRoot,
      });
      expect(report.summary.ok).toBe(true);
      const gh = report.dependencies.find((d: any) => d.id === "gh");
      expect(gh.status).toBe("warn");
    });

    it("a missing feature dep -> status skip, summary.ok unaffected", () => {
      const fs = fakeFs({ existing: wsExisting(repoRoot, true) });
      const report = runDoctor({
        platform: macosPlatform,
        which: fakeWhich(allGoodWhich()), // ffmpeg/bun/python absent
        run: fakeRun(allGoodRun()),
        fs,
        repoRoot,
        secretsRoot: repoRoot,
      });
      const ffmpeg = report.dependencies.find((d: any) => d.id === "ffmpeg");
      expect(ffmpeg.status).toBe("skip");
      expect(report.summary.ok).toBe(true);
    });

    it("workspaces with pkg but no node_modules show up in workspacesMissing", () => {
      const existing = new Set<string>();
      // root has both; mcp-server pkg-only; analytics+docs nothing
      existing.add(nodePath.join(repoRoot, ".", "package.json"));
      existing.add(nodePath.join(repoRoot, ".", "node_modules"));
      existing.add(nodePath.join(repoRoot, "mcp-server", "package.json"));
      const fs = fakeFs({ existing });
      const report = runDoctor({
        platform: macosPlatform,
        which: fakeWhich(allGoodWhich()),
        run: fakeRun(allGoodRun()),
        fs,
        repoRoot,
        secretsRoot: repoRoot,
      });
      expect(report.summary.workspacesMissing).toStrictEqual(["mcp-server"]);
    });

    it("missing env file -> envReady false but does not affect summary.ok", () => {
      const fs = fakeFs({ existing: wsExisting(repoRoot, true) }); // no env file
      const report = runDoctor({
        platform: macosPlatform,
        which: fakeWhich(allGoodWhich()),
        run: fakeRun(allGoodRun()),
        fs,
        repoRoot,
        secretsRoot: repoRoot,
      });
      expect(report.env.exists).toBe(false);
      expect(report.summary.envReady).toBe(false);
      expect(report.summary.ok).toBe(true);
    });

    it("placeholder env value -> envReady false", () => {
      const envPath = nodePath.join(repoRoot, "runtime", "secrets", ".env.local");
      const fs = fakeFs({
        existing: new Set([...wsExisting(repoRoot, true), envPath]),
        files: {
          [envPath]: "SUPABASE_URL=eyJhbGc...\nSUPABASE_ANON_KEY=a\nSUPABASE_SERVICE_KEY=b",
        },
      });
      const report = runDoctor({
        platform: macosPlatform,
        which: fakeWhich(allGoodWhich()),
        run: fakeRun(allGoodRun()),
        fs,
        repoRoot,
        secretsRoot: repoRoot,
      });
      expect(report.summary.envReady).toBe(false);
    });

    it("every dependency probe carries a status field in the allowed set", () => {
      const fs = fakeFs({ existing: wsExisting(repoRoot, true) });
      const report = runDoctor({
        platform: macosPlatform,
        which: fakeWhich(allGoodWhich()),
        run: fakeRun(allGoodRun()),
        fs,
        repoRoot,
        secretsRoot: repoRoot,
      });
      for (const d of report.dependencies) {
        expect(["ok", "warn", "fail", "skip"]).toContain(d.status);
      }
    });

    it("respects an explicitly injected secretsRoot distinct from repoRoot", () => {
      const secretsRoot = "/main-repo";
      const envPath = nodePath.join(secretsRoot, "runtime", "secrets", ".env.local");
      const fs = fakeFs({
        existing: new Set([...wsExisting(repoRoot, true), envPath]),
        files: {
          [envPath]: "SUPABASE_URL=https://x.supabase.co\nSUPABASE_ANON_KEY=a\nSUPABASE_SERVICE_KEY=b",
        },
      });
      const report = runDoctor({
        platform: macosPlatform,
        which: fakeWhich(allGoodWhich()),
        run: fakeRun(allGoodRun()),
        fs,
        repoRoot,
        secretsRoot,
      });
      expect(report.secretsRoot).toBe(secretsRoot);
      expect(report.env.exists).toBe(true);
      expect(report.summary.envReady).toBe(true);
    });

    it("windows platform produces a valid report (cross-platform smoke)", () => {
      const winRepo = "C:\\repo";
      const which: Record<string, string | null> = {
        node: "C:\\b\\node.exe",
        pnpm: "C:\\b\\pnpm.exe",
        git: "C:\\b\\git.exe",
        gh: null,
        supabase: null,
        python3: null,
        python: null,
        ffmpeg: null,
        bun: null,
      };
      const fs = fakeFs({ existing: wsExisting(winRepo, true) });
      const report = runDoctor({
        platform: windowsPlatform,
        which: fakeWhich(which),
        run: fakeRun(allGoodRun()),
        fs,
        repoRoot: winRepo,
        secretsRoot: winRepo,
      });
      expect(report.summary.ok).toBe(true); // gh/supabase are recommended/feature
      expect(report.platform.isWindows).toBe(true);
    });

    it("returns the full DoctorReport shape", () => {
      const fs = fakeFs({ existing: wsExisting(repoRoot, true) });
      const report = runDoctor({
        platform: macosPlatform,
        which: fakeWhich(allGoodWhich()),
        run: fakeRun(allGoodRun()),
        fs,
        repoRoot,
        secretsRoot: repoRoot,
      });
      expect(Object.keys(report).sort()).toStrictEqual(
        ["dependencies", "env", "platform", "repoRoot", "secretsRoot", "summary", "workspaces"]
      );
      expect(report.workspaces).toHaveLength(WORKSPACES.length);
    });
  });
});
