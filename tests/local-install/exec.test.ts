import { describe, it, expect } from "vitest";
import nodePath from "node:path";

// vitest supports named imports from CommonJS module.exports; fall back to
// default-import destructuring if a named binding ever comes through undefined.
import * as execModule from "../../scripts/local-install/lib/exec.cjs";

const { makeRunner, run, which, osFamily } = execModule as unknown as {
  makeRunner: (spawnSyncImpl?: any) => (cmd: string, args?: string[], opts?: any) => any;
  run: (cmd: string, args?: string[], opts?: any) => any;
  which: (cmd: string, opts?: any) => string | null;
  osFamily: (platformId?: string) => string;
};

// ---------------------------------------------------------------------------
// Test helpers — deterministic fakes only (no real machine / network / spawn).
// ---------------------------------------------------------------------------

/**
 * A fake spawnSync returning a caller-supplied result object. Records the
 * args it was invoked with so we can assert wiring.
 */
function fakeSpawnSync(result: any) {
  const calls: any[] = [];
  const fn = (cmd: string, args: string[], opts: any) => {
    calls.push({ cmd, args, opts });
    return result;
  };
  (fn as any).calls = calls;
  return fn as ((cmd: string, args: string[], opts: any) => any) & { calls: any[] };
}

/**
 * Build a fake fs whose statSync(path) consults a map. A value of:
 *   - {isFile, isSymbolicLink} object → returned as the stat
 *   - the string "throw"             → statSync throws (ENOENT-like)
 * Anything not in the map → statSync throws (path absent).
 */
function fakeFs(map: Record<string, any>) {
  return {
    statSync(p: string) {
      const entry = map[p];
      if (entry === undefined || entry === "throw") {
        const e: any = new Error(`ENOENT: no such file, stat '${p}'`);
        e.code = "ENOENT";
        throw e;
      }
      return entry;
    },
  };
}

const FILE_STAT = { isFile: () => true, isSymbolicLink: () => false };
const SYMLINK_STAT = { isFile: () => false, isSymbolicLink: () => true };
const DIR_STAT = { isFile: () => false, isSymbolicLink: () => false };

// The module builds candidates with nodePath.join(dir, cmd + ext). On a POSIX
// host nodePath.join uses '/' as the separator even for Windows-looking dirs,
// and the module LOWERCASES every PATHEXT entry. So we compute the candidate
// keys exactly the way the module does, making the test host-OS-independent.
function candidate(dir: string, cmd: string, ext = ""): string {
  return nodePath.join(dir, cmd + ext);
}

// ===========================================================================

describe("exec.cjs", () => {
  describe("module surface", () => {
    it("exports makeRunner, run, which, osFamily as functions", () => {
      expect(typeof makeRunner).toBe("function");
      expect(typeof run).toBe("function");
      expect(typeof which).toBe("function");
      expect(typeof osFamily).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // osFamily
  // -------------------------------------------------------------------------
  describe("osFamily", () => {
    describe("happy path", () => {
      it("maps win32 to windows", () => {
        expect(osFamily("win32")).toBe("windows");
      });

      it("maps darwin to posix", () => {
        expect(osFamily("darwin")).toBe("posix");
      });

      it("maps linux to posix", () => {
        expect(osFamily("linux")).toBe("posix");
      });
    });

    describe("input boundaries", () => {
      it("falls back to process.platform when platformId is undefined", () => {
        const expected = process.platform === "win32" ? "windows" : "posix";
        expect(osFamily(undefined)).toBe(expected);
      });

      it("falls back to process.platform when platformId is empty string", () => {
        const expected = process.platform === "win32" ? "windows" : "posix";
        expect(osFamily("")).toBe(expected);
      });

      it("treats an unknown platform id as posix", () => {
        expect(osFamily("freebsd")).toBe("posix");
      });

      it("treats aix as posix (only win32 is special-cased)", () => {
        expect(osFamily("aix")).toBe("posix");
      });
    });
  });

  // -------------------------------------------------------------------------
  // makeRunner / run
  // -------------------------------------------------------------------------
  describe("makeRunner", () => {
    describe("happy path", () => {
      it("returns ok:true with code 0 when status is 0", () => {
        const runner = makeRunner(
          fakeSpawnSync({ status: 0, stdout: "hello", stderr: "", error: null })
        );
        const res = runner("echo", ["hello"]);
        expect(res.ok).toBe(true);
        expect(res.code).toBe(0);
        expect(res.stdout).toBe("hello");
        expect(res.stderr).toBe("");
        expect(res.error).toBe(null);
      });

      it("returns the full normalized shape", () => {
        const runner = makeRunner(
          fakeSpawnSync({ status: 0, stdout: "out", stderr: "err", error: null })
        );
        const res = runner("cmd");
        expect(res).toStrictEqual({
          ok: true,
          code: 0,
          stdout: "out",
          stderr: "err",
          error: null,
        });
      });
    });

    describe("failure (non-zero exit)", () => {
      it("returns ok:false with code 1 when status is 1", () => {
        const runner = makeRunner(
          fakeSpawnSync({ status: 1, stdout: "", stderr: "boom", error: null })
        );
        const res = runner("false");
        expect(res.ok).toBe(false);
        expect(res.code).toBe(1);
        expect(res.stderr).toBe("boom");
        expect(res.error).toBe(null);
      });

      it("treats any non-zero status as not ok", () => {
        const runner = makeRunner(
          fakeSpawnSync({ status: 127, stdout: "", stderr: "not found", error: null })
        );
        const res = runner("nope");
        expect(res.ok).toBe(false);
        expect(res.code).toBe(127);
      });

      it("treats a negative status (signal) as not ok", () => {
        const runner = makeRunner(
          fakeSpawnSync({ status: -1, stdout: "", stderr: "", error: null })
        );
        const res = runner("killed");
        expect(res.ok).toBe(false);
        expect(res.code).toBe(-1);
      });

      it("treats null status (process error / never started) as not ok", () => {
        const runner = makeRunner(
          fakeSpawnSync({ status: null, stdout: "", stderr: "", error: null })
        );
        const res = runner("missing");
        expect(res.ok).toBe(false);
        expect(res.code).toBe(null);
      });

      it("treats undefined status as not ok with code undefined", () => {
        const runner = makeRunner(
          fakeSpawnSync({ stdout: "", stderr: "", error: null })
        );
        const res = runner("weird");
        expect(res.ok).toBe(false);
        expect(res.code).toBe(undefined);
      });
    });

    describe("error path (result.error set)", () => {
      it("surfaces the spawn error object in res.error", () => {
        const err = new Error("spawn ENOENT");
        const runner = makeRunner(
          fakeSpawnSync({ status: null, stdout: "", stderr: "", error: err })
        );
        const res = runner("ghost");
        expect(res.error).toBe(err);
        expect(res.error.message).toBe("spawn ENOENT");
        expect(res.ok).toBe(false);
      });

      it("normalizes a missing error field to null", () => {
        const runner = makeRunner(
          fakeSpawnSync({ status: 0, stdout: "", stderr: "" })
        );
        const res = runner("ok");
        expect(res.error).toBe(null);
      });

      it("normalizes an undefined error field to null", () => {
        const runner = makeRunner(
          fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: undefined })
        );
        const res = runner("ok");
        expect(res.error).toBe(null);
      });
    });

    describe("stdout/stderr Buffer coercion", () => {
      it("coerces Buffer stdout to a string", () => {
        const runner = makeRunner(
          fakeSpawnSync({
            status: 0,
            stdout: Buffer.from("buffered-out"),
            stderr: Buffer.from("buffered-err"),
            error: null,
          })
        );
        const res = runner("buf");
        expect(typeof res.stdout).toBe("string");
        expect(res.stdout).toBe("buffered-out");
        expect(typeof res.stderr).toBe("string");
        expect(res.stderr).toBe("buffered-err");
      });

      it("coerces null stdout/stderr to empty strings", () => {
        const runner = makeRunner(
          fakeSpawnSync({ status: 0, stdout: null, stderr: null, error: null })
        );
        const res = runner("nulls");
        expect(res.stdout).toBe("");
        expect(res.stderr).toBe("");
      });

      it("coerces undefined (missing) stdout/stderr to empty strings", () => {
        const runner = makeRunner(fakeSpawnSync({ status: 0, error: null }));
        const res = runner("missing-streams");
        expect(res.stdout).toBe("");
        expect(res.stderr).toBe("");
      });

      it("preserves an already-string stdout unchanged", () => {
        const runner = makeRunner(
          fakeSpawnSync({ status: 0, stdout: "plain", stderr: "", error: null })
        );
        expect(runner("s").stdout).toBe("plain");
      });
    });

    describe("argument defaults and option wiring", () => {
      it("defaults args to [] when omitted", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("solo");
        expect(spy.calls[0].args).toStrictEqual([]);
      });

      it("passes args through verbatim", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("git", ["status", "--short"]);
        expect(spy.calls[0].args).toStrictEqual(["status", "--short"]);
      });

      it("defaults shell to false (only true enables it)", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("cmd");
        expect(spy.calls[0].opts.shell).toBe(false);
      });

      it("enables shell only when opts.shell === true", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("cmd", [], { shell: true });
        expect(spy.calls[0].opts.shell).toBe(true);
      });

      it("does not enable shell for a truthy-but-non-true shell value", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("cmd", [], { shell: "yes" as any });
        expect(spy.calls[0].opts.shell).toBe(false);
      });

      it("defaults timeout to 120000ms when not provided", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("cmd");
        expect(spy.calls[0].opts.timeout).toBe(120000);
      });

      it("honors an explicit timeout, including 0 (not coerced to default)", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("cmd", [], { timeout: 0 });
        expect(spy.calls[0].opts.timeout).toBe(0);
      });

      it("honors a positive explicit timeout", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("cmd", [], { timeout: 5000 });
        expect(spy.calls[0].opts.timeout).toBe(5000);
      });

      it("defaults maxBuffer to 32MiB when not provided", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("cmd");
        expect(spy.calls[0].opts.maxBuffer).toBe(32 * 1024 * 1024);
      });

      it("honors an explicit maxBuffer", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("cmd", [], { maxBuffer: 1024 });
        expect(spy.calls[0].opts.maxBuffer).toBe(1024);
      });

      it("passes cwd through", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("cmd", [], { cwd: "/tmp/work" });
        expect(spy.calls[0].opts.cwd).toBe("/tmp/work");
      });

      it("uses opts.env when provided", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        const env = { FOO: "bar" };
        runner("cmd", [], { env });
        expect(spy.calls[0].opts.env).toBe(env);
      });

      it("falls back to process.env when opts.env is absent", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("cmd");
        expect(spy.calls[0].opts.env).toBe(process.env);
      });

      it("always sets encoding utf8 and windowsHide true", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("cmd");
        expect(spy.calls[0].opts.encoding).toBe("utf8");
        expect(spy.calls[0].opts.windowsHide).toBe(true);
      });

      it("defaults opts to {} when omitted (no throw)", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "", stderr: "", error: null });
        const runner = makeRunner(spy);
        expect(() => runner("cmd")).not.toThrow();
        expect(spy.calls[0].opts.shell).toBe(false);
      });
    });

    describe("makeRunner dependency injection", () => {
      it("uses the injected spawnSync, never the real one", () => {
        const spy = fakeSpawnSync({ status: 0, stdout: "fake", stderr: "", error: null });
        const runner = makeRunner(spy);
        runner("anything");
        expect(spy.calls).toHaveLength(1);
        expect(spy.calls[0].cmd).toBe("anything");
      });

      it("returns a callable run function with no impl (real fallback) — not invoked here", () => {
        // We only assert the factory returns a function; we never CALL it, so
        // the real child_process.spawnSync is never touched.
        const runner = makeRunner();
        expect(typeof runner).toBe("function");
      });

      it("treats a null spawnSyncImpl as 'use the real one' (factory still returns a function)", () => {
        const runner = makeRunner(null as any);
        expect(typeof runner).toBe("function");
      });

      it("each makeRunner call yields an independent runner", () => {
        const a = makeRunner(fakeSpawnSync({ status: 0, stdout: "A", stderr: "", error: null }));
        const b = makeRunner(fakeSpawnSync({ status: 1, stdout: "B", stderr: "", error: null }));
        expect(a("x").stdout).toBe("A");
        expect(a("x").ok).toBe(true);
        expect(b("y").stdout).toBe("B");
        expect(b("y").ok).toBe(false);
      });
    });

    describe("default run export", () => {
      it("is a function (wired to the real spawnSync; not invoked)", () => {
        expect(typeof run).toBe("function");
      });
    });
  });

  // -------------------------------------------------------------------------
  // which
  // -------------------------------------------------------------------------
  describe("which", () => {
    describe("posix family", () => {
      const baseOpts = (fs: any, PATH: string) => ({
        env: { PATH },
        fs,
        osFamily: "posix",
      });

      it("finds the first matching directory (no extension on posix)", () => {
        const key = candidate("/usr/local/bin", "node");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("node", baseOpts(fs, "/usr/local/bin:/usr/bin"));
        expect(result).toBe(key);
      });

      it("scans subsequent PATH dirs when the first has no match", () => {
        const key = candidate("/usr/bin", "git");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("git", baseOpts(fs, "/usr/local/bin:/usr/bin"));
        expect(result).toBe(key);
      });

      it("returns the FIRST match when multiple dirs contain the command", () => {
        const a = candidate("/a", "tool");
        const b = candidate("/b", "tool");
        const fs = fakeFs({ [a]: FILE_STAT, [b]: FILE_STAT });
        const result = which("tool", baseOpts(fs, "/a:/b"));
        expect(result).toBe(a);
      });

      it("returns null when the command is absent from every PATH dir", () => {
        const fs = fakeFs({});
        const result = which("ghost", baseOpts(fs, "/usr/local/bin:/usr/bin"));
        expect(result).toBe(null);
      });

      it("splits PATH on colon for posix", () => {
        const key = candidate("/three", "cmd");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("cmd", baseOpts(fs, "/one:/two:/three"));
        expect(result).toBe(key);
      });

      it("does not append any extension on posix (extensioned file ignored)", () => {
        // Only "/bin/foo.exe" exists; on posix we look for bare "foo" → null.
        const fs = fakeFs({ [candidate("/bin", "foo.exe")]: FILE_STAT });
        const result = which("foo", baseOpts(fs, "/bin"));
        expect(result).toBe(null);
      });
    });

    describe("windows family", () => {
      // The module lowercases PATHEXT entries, so candidate extensions are
      // lowercase (e.g. ".exe"). nodePath.join applies the HOST separator,
      // so we always derive keys via candidate().
      const winEnv = { PATH: "C:\\Windows;C:\\tools", PATHEXT: ".EXE;.CMD" };

      it("tries extensions and finds the .exe variant", () => {
        const key = candidate("C:\\Windows", "node", ".exe");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("node", { env: winEnv, fs, osFamily: "windows" });
        expect(result).toBe(key);
      });

      it("tries the bare name first (empty ext) before extensions", () => {
        const bare = candidate("C:\\Windows", "python");
        const exe = candidate("C:\\Windows", "python", ".exe");
        const fs = fakeFs({ [bare]: FILE_STAT, [exe]: FILE_STAT });
        // tryExts = ['', '.exe', '.cmd'] → bare wins.
        const result = which("python", { env: winEnv, fs, osFamily: "windows" });
        expect(result).toBe(bare);
      });

      it("falls through to .cmd when .exe is absent", () => {
        const key = candidate("C:\\tools", "npm", ".cmd");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("npm", { env: winEnv, fs, osFamily: "windows" });
        expect(result).toBe(key);
      });

      it("splits PATH on semicolon for windows", () => {
        const key = candidate("C:\\tools", "thing", ".exe");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("thing", { env: winEnv, fs, osFamily: "windows" });
        expect(result).toBe(key);
      });

      it("uses the default PATHEXT when none is set in env", () => {
        // default ".COM;.EXE;.BAT;.CMD" → lowercased → .bat matches.
        const key = candidate("C:\\Windows", "app", ".bat");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("app", {
          env: { PATH: "C:\\Windows" }, // no PATHEXT
          fs,
          osFamily: "windows",
        });
        expect(result).toBe(key);
      });

      it("returns null on windows when no extension matches", () => {
        const fs = fakeFs({ [candidate("C:\\Windows", "node", ".txt")]: FILE_STAT });
        const result = which("node", { env: winEnv, fs, osFamily: "windows" });
        expect(result).toBe(null);
      });

      it("matches a cmd that already carries an extension via the bare try", () => {
        const key = candidate("C:\\tools", "setup.exe");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("setup.exe", { env: winEnv, fs, osFamily: "windows" });
        expect(result).toBe(key);
      });

      it("lowercases PATHEXT entries before joining", () => {
        const key = candidate("C:\\Windows", "mix", ".cmd");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("mix", {
          env: { PATH: "C:\\Windows", PATHEXT: ".EXE;.CMD" },
          fs,
          osFamily: "windows",
        });
        expect(result).toBe(key);
      });
    });

    describe("PATH variants and env fallbacks", () => {
      it("returns null when PATH is empty string", () => {
        const fs = fakeFs({ [candidate("/bin", "x")]: FILE_STAT });
        const result = which("x", { env: { PATH: "" }, fs, osFamily: "posix" });
        expect(result).toBe(null);
      });

      it("returns null when env has no PATH-like variable at all", () => {
        const fs = fakeFs({ [candidate("/bin", "x")]: FILE_STAT });
        const result = which("x", { env: {}, fs, osFamily: "posix" });
        expect(result).toBe(null);
      });

      it("falls back to env.Path when PATH is absent (windows casing)", () => {
        const key = candidate("C:\\w", "tool", ".exe");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("tool", {
          env: { Path: "C:\\w", PATHEXT: ".EXE" },
          fs,
          osFamily: "windows",
        });
        expect(result).toBe(key);
      });

      it("falls back to env.path (lowercase) when PATH and Path are absent", () => {
        const key = candidate("/opt/bin", "tool");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("tool", {
          env: { path: "/opt/bin" },
          fs,
          osFamily: "posix",
        });
        expect(result).toBe(key);
      });

      it("trims whitespace around PATH entries", () => {
        const key = candidate("/usr/bin", "git");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("git", {
          env: { PATH: "  /usr/local/bin  :  /usr/bin  " },
          fs,
          osFamily: "posix",
        });
        expect(result).toBe(key);
      });

      it("filters out empty PATH segments (double colon)", () => {
        const key = candidate("/usr/bin", "git");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("git", {
          env: { PATH: "/usr/local/bin::/usr/bin" },
          fs,
          osFamily: "posix",
        });
        expect(result).toBe(key);
      });

      it("derives os family from opts.platform when osFamily is not given (win32)", () => {
        const key = candidate("C:\\w", "tool", ".exe");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("tool", {
          env: { PATH: "C:\\w", PATHEXT: ".EXE" },
          fs,
          platform: "win32",
        });
        expect(result).toBe(key);
      });

      it("derives os family from opts.platform when osFamily is not given (linux → posix)", () => {
        const key = candidate("/usr/bin", "tool");
        const fs = fakeFs({ [key]: FILE_STAT });
        const result = which("tool", {
          env: { PATH: "/usr/bin" },
          fs,
          platform: "linux",
        });
        expect(result).toBe(key);
      });
    });

    describe("statSync error handling and stat semantics", () => {
      it("keeps scanning when statSync throws for a candidate", () => {
        const a = candidate("/a", "tool");
        const b = candidate("/b", "tool");
        const fs = fakeFs({ [a]: "throw", [b]: FILE_STAT });
        const result = which("tool", {
          env: { PATH: "/a:/b" },
          fs,
          osFamily: "posix",
        });
        expect(result).toBe(b);
      });

      it("returns null when every candidate throws", () => {
        const fs = fakeFs({
          [candidate("/a", "tool")]: "throw",
          [candidate("/b", "tool")]: "throw",
        });
        const result = which("tool", {
          env: { PATH: "/a:/b" },
          fs,
          osFamily: "posix",
        });
        expect(result).toBe(null);
      });

      it("counts a symbolic link as a found executable", () => {
        const key = candidate("/usr/bin", "node");
        const fs = fakeFs({ [key]: SYMLINK_STAT });
        const result = which("node", {
          env: { PATH: "/usr/bin" },
          fs,
          osFamily: "posix",
        });
        expect(result).toBe(key);
      });

      it("does NOT match a directory (neither file nor symlink)", () => {
        const fs = fakeFs({ [candidate("/usr/bin", "node")]: DIR_STAT });
        const result = which("node", {
          env: { PATH: "/usr/bin" },
          fs,
          osFamily: "posix",
        });
        expect(result).toBe(null);
      });

      it("skips a directory-stat candidate then finds a file in a later dir", () => {
        const a = candidate("/a", "tool");
        const b = candidate("/b", "tool");
        const fs = fakeFs({ [a]: DIR_STAT, [b]: FILE_STAT });
        const result = which("tool", {
          env: { PATH: "/a:/b" },
          fs,
          osFamily: "posix",
        });
        expect(result).toBe(b);
      });

      it("treats a falsy stat return as not found", () => {
        const fs = {
          statSync(_p: string) {
            return null; // pathological fs returning falsy
          },
        };
        const result = which("tool", {
          env: { PATH: "/a:/b" },
          fs,
          osFamily: "posix",
        });
        expect(result).toBe(null);
      });
    });

    describe("which dependency injection", () => {
      it("uses the injected fs.statSync exclusively and scans in PATH order", () => {
        const firstKey = candidate("/usr/local/bin", "git");
        const secondKey = candidate("/usr/bin", "git");
        const seen: string[] = [];
        const fs = {
          statSync(p: string) {
            seen.push(p);
            if (p === secondKey) return FILE_STAT;
            throw new Error("ENOENT");
          },
        };
        const result = which("git", {
          env: { PATH: "/usr/local/bin:/usr/bin" },
          fs,
          osFamily: "posix",
        });
        expect(result).toBe(secondKey);
        expect(seen).toStrictEqual([firstKey, secondKey]);
      });
    });
  });
});
