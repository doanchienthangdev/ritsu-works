import { describe, it, expect, beforeEach, vi } from "vitest";

// vitest supports named imports from CommonJS module.exports.
import {
  detectPlatform as _detectPlatform,
  osFamilyFromId as _osFamilyFromId,
  PACKAGE_MANAGERS as _PACKAGE_MANAGERS,
} from "../../scripts/local-install/lib/platform.cjs";
import mod from "../../scripts/local-install/lib/platform.cjs";

// Fall back to default-export destructuring if a named import is undefined.
const detectPlatform = _detectPlatform ?? mod.detectPlatform;
const osFamilyFromId = _osFamilyFromId ?? mod.osFamilyFromId;
const PACKAGE_MANAGERS = _PACKAGE_MANAGERS ?? mod.PACKAGE_MANAGERS;

/**
 * Build a deterministic fake `which` that returns a synthetic absolute path
 * for any binary id in `available`, and null for everything else.
 * Records every call so cross-parameter behavior can be asserted.
 */
function makeWhich(available: string[], pathPrefix = "/usr/bin") {
  const set = new Set(available);
  const calls: Array<{ id: string; opts: any }> = [];
  const fn = (id: string, opts: any) => {
    calls.push({ id, opts });
    return set.has(id) ? `${pathPrefix}/${id}` : null;
  };
  // expose calls for inspection
  (fn as any).calls = calls;
  return fn as ((id: string, opts: any) => string | null) & {
    calls: Array<{ id: string; opts: any }>;
  };
}

// A `which` that finds nothing.
const whichNone = () => null;

describe("platform.cjs", () => {
  describe("module exports", () => {
    it("exports detectPlatform as a function", () => {
      expect(typeof detectPlatform).toBe("function");
    });

    it("exports osFamilyFromId as a function", () => {
      expect(typeof osFamilyFromId).toBe("function");
    });

    it("exports PACKAGE_MANAGERS as an object", () => {
      expect(typeof PACKAGE_MANAGERS).toBe("object");
      expect(PACKAGE_MANAGERS).not.toBeNull();
    });
  });

  describe("osFamilyFromId", () => {
    describe("happy path", () => {
      it("maps darwin to macos", () => {
        expect(osFamilyFromId("darwin")).toBe("macos");
      });

      it("maps win32 to windows", () => {
        expect(osFamilyFromId("win32")).toBe("windows");
      });

      it("maps linux to linux", () => {
        expect(osFamilyFromId("linux")).toBe("linux");
      });
    });

    describe("input boundaries", () => {
      it("returns unknown for an unrecognized id 'other'", () => {
        expect(osFamilyFromId("other")).toBe("unknown");
      });

      it("returns unknown for undefined", () => {
        expect(osFamilyFromId(undefined)).toBe("unknown");
      });

      it("returns unknown for null", () => {
        expect(osFamilyFromId(null)).toBe("unknown");
      });

      it("returns unknown for empty string", () => {
        expect(osFamilyFromId("")).toBe("unknown");
      });

      it("returns unknown for a near-miss casing 'Darwin'", () => {
        expect(osFamilyFromId("Darwin")).toBe("unknown");
      });

      it("returns unknown for 'freebsd'", () => {
        expect(osFamilyFromId("freebsd")).toBe("unknown");
      });
    });
  });

  describe("PACKAGE_MANAGERS table", () => {
    it("macos has exactly Homebrew in preference order", () => {
      expect(PACKAGE_MANAGERS.macos).toStrictEqual([
        { id: "brew", label: "Homebrew" },
      ]);
    });

    it("linux preference order is apt-get, dnf, yum, pacman, zypper, apk", () => {
      expect(PACKAGE_MANAGERS.linux.map((p: any) => p.id)).toStrictEqual([
        "apt-get",
        "dnf",
        "yum",
        "pacman",
        "zypper",
        "apk",
      ]);
    });

    it("windows preference order is winget, choco, scoop", () => {
      expect(PACKAGE_MANAGERS.windows.map((p: any) => p.id)).toStrictEqual([
        "winget",
        "choco",
        "scoop",
      ]);
    });

    it("unknown has an empty candidate list", () => {
      expect(PACKAGE_MANAGERS.unknown).toStrictEqual([]);
    });
  });

  describe("detectPlatform", () => {
    describe("macos (darwin)", () => {
      it("detects os=macos and isWindows=false", () => {
        const result = detectPlatform({
          platformId: "darwin",
          archId: "arm64",
          env: { SHELL: "/bin/zsh" },
          which: makeWhich(["brew"]),
        });
        expect(result.os).toBe("macos");
        expect(result.isWindows).toBe(false);
      });

      it("probes brew and sets it as primary when found", () => {
        const result = detectPlatform({
          platformId: "darwin",
          archId: "arm64",
          env: { SHELL: "/bin/zsh" },
          which: makeWhich(["brew"], "/opt/homebrew/bin"),
        });
        expect(result.packageManagers).toStrictEqual([
          { id: "brew", label: "Homebrew", path: "/opt/homebrew/bin/brew" },
        ]);
        expect(result.primaryPackageManager).toStrictEqual({
          id: "brew",
          label: "Homebrew",
          path: "/opt/homebrew/bin/brew",
        });
      });

      it("returns empty package managers and null primary when brew not found", () => {
        const result = detectPlatform({
          platformId: "darwin",
          archId: "x64",
          env: { SHELL: "/bin/zsh" },
          which: whichNone,
        });
        expect(result.packageManagers).toStrictEqual([]);
        expect(result.primaryPackageManager).toBeNull();
      });

      it("passes posix osFamily to which on macos", () => {
        const fake = makeWhich(["brew"]);
        detectPlatform({
          platformId: "darwin",
          archId: "arm64",
          env: { SHELL: "/bin/zsh" },
          which: fake,
        });
        expect(fake.calls[0].opts.osFamily).toBe("posix");
      });
    });

    describe("linux", () => {
      it("selects dnf as primary when only dnf is present", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "/bin/bash" },
          which: makeWhich(["dnf"]),
        });
        expect(result.primaryPackageManager).toStrictEqual({
          id: "dnf",
          label: "DNF (Fedora/RHEL)",
          path: "/usr/bin/dnf",
        });
        expect(result.packageManagers).toStrictEqual([
          { id: "dnf", label: "DNF (Fedora/RHEL)", path: "/usr/bin/dnf" },
        ]);
      });

      it("preserves preference order: apt-get wins over dnf when both present", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "/bin/bash" },
          which: makeWhich(["dnf", "apt-get"]),
        });
        // apt-get is earlier in the preference order than dnf
        expect(result.packageManagers.map((p: any) => p.id)).toStrictEqual([
          "apt-get",
          "dnf",
        ]);
        expect(result.primaryPackageManager.id).toBe("apt-get");
      });

      it("preserves preference order across all six managers when all present", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "/bin/bash" },
          which: makeWhich(["apt-get", "dnf", "yum", "pacman", "zypper", "apk"]),
        });
        expect(result.packageManagers.map((p: any) => p.id)).toStrictEqual([
          "apt-get",
          "dnf",
          "yum",
          "pacman",
          "zypper",
          "apk",
        ]);
        expect(result.primaryPackageManager.id).toBe("apt-get");
      });

      it("detects pacman correctly when it is the only manager", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "/bin/bash" },
          which: makeWhich(["pacman"]),
        });
        expect(result.primaryPackageManager).toStrictEqual({
          id: "pacman",
          label: "pacman (Arch)",
          path: "/usr/bin/pacman",
        });
      });

      it("detects zypper and apk together preserving order", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "/bin/bash" },
          which: makeWhich(["apk", "zypper"]),
        });
        expect(result.packageManagers.map((p: any) => p.id)).toStrictEqual([
          "zypper",
          "apk",
        ]);
        expect(result.primaryPackageManager.id).toBe("zypper");
      });

      it("returns null primary and empty list when no linux pm found", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "/bin/bash" },
          which: whichNone,
        });
        expect(result.packageManagers).toStrictEqual([]);
        expect(result.primaryPackageManager).toBeNull();
      });

      it("probes the linux candidates in declared order", () => {
        const fake = makeWhich([]);
        detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "/bin/bash" },
          which: fake,
        });
        expect(fake.calls.map((c) => c.id)).toStrictEqual([
          "apt-get",
          "dnf",
          "yum",
          "pacman",
          "zypper",
          "apk",
        ]);
      });

      it("isWindows is false on linux", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "/bin/bash" },
          which: makeWhich(["dnf"]),
        });
        expect(result.isWindows).toBe(false);
      });
    });

    describe("windows (win32)", () => {
      it("detects os=windows and isWindows=true", () => {
        const result = detectPlatform({
          platformId: "win32",
          archId: "x64",
          env: {},
          which: makeWhich(["winget"]),
        });
        expect(result.os).toBe("windows");
        expect(result.isWindows).toBe(true);
      });

      it("selects pwsh as shell when pwsh is found", () => {
        const result = detectPlatform({
          platformId: "win32",
          archId: "x64",
          env: {},
          which: makeWhich(["pwsh"]),
        });
        expect(result.shell).toBe("pwsh");
      });

      it("falls back to powershell when pwsh is not found", () => {
        const result = detectPlatform({
          platformId: "win32",
          archId: "x64",
          env: {},
          which: makeWhich(["winget"]), // pwsh absent
        });
        expect(result.shell).toBe("powershell");
      });

      it("falls back to powershell when nothing is found at all", () => {
        const result = detectPlatform({
          platformId: "win32",
          archId: "x64",
          env: {},
          which: whichNone,
        });
        expect(result.shell).toBe("powershell");
      });

      it("detects winget as primary among winget/choco/scoop preference order", () => {
        const result = detectPlatform({
          platformId: "win32",
          archId: "x64",
          env: {},
          which: makeWhich(["choco", "winget", "scoop"], "C:/bin"),
        });
        expect(result.packageManagers.map((p: any) => p.id)).toStrictEqual([
          "winget",
          "choco",
          "scoop",
        ]);
        expect(result.primaryPackageManager).toStrictEqual({
          id: "winget",
          label: "winget",
          path: "C:/bin/winget",
        });
      });

      it("detects choco as primary when winget absent", () => {
        const result = detectPlatform({
          platformId: "win32",
          archId: "x64",
          env: {},
          which: makeWhich(["choco", "scoop"]),
        });
        expect(result.primaryPackageManager.id).toBe("choco");
      });

      it("returns empty list and null primary when no windows pm found", () => {
        const result = detectPlatform({
          platformId: "win32",
          archId: "x64",
          env: {},
          which: whichNone,
        });
        expect(result.packageManagers).toStrictEqual([]);
        expect(result.primaryPackageManager).toBeNull();
      });

      it("passes windows osFamily to which on win32", () => {
        const fake = makeWhich(["winget"]);
        detectPlatform({
          platformId: "win32",
          archId: "x64",
          env: {},
          which: fake,
        });
        // every probe (package managers + shell) should carry windows family
        for (const call of fake.calls) {
          expect(call.opts.osFamily).toBe("windows");
        }
      });

      it("ignores env.SHELL on windows (shell is pwsh/powershell only)", () => {
        const result = detectPlatform({
          platformId: "win32",
          archId: "x64",
          env: { SHELL: "/bin/zsh" }, // should be ignored on windows
          which: makeWhich(["pwsh"]),
        });
        expect(result.shell).toBe("pwsh");
      });
    });

    describe("unknown os", () => {
      it("returns empty package managers and null primary for 'other'", () => {
        const result = detectPlatform({
          platformId: "other",
          archId: "x64",
          env: { SHELL: "/bin/sh" },
          which: makeWhich(["brew", "dnf", "winget"]),
        });
        expect(result.os).toBe("unknown");
        expect(result.packageManagers).toStrictEqual([]);
        expect(result.primaryPackageManager).toBeNull();
      });

      it("does not probe any package manager when os is unknown", () => {
        const fake = makeWhich([]);
        detectPlatform({
          platformId: "freebsd",
          archId: "x64",
          env: { SHELL: "/bin/sh" },
          which: fake,
        });
        // only the posix shell path uses env (no which calls for pm),
        // and posix shell does not call which at all -> zero calls.
        expect(fake.calls.length).toBe(0);
      });

      it("isWindows is false for unknown os", () => {
        const result = detectPlatform({
          platformId: "other",
          archId: "x64",
          env: { SHELL: "/bin/sh" },
          which: whichNone,
        });
        expect(result.isWindows).toBe(false);
      });

      it("derives posix shell from env.SHELL even on unknown os", () => {
        const result = detectPlatform({
          platformId: "other",
          archId: "x64",
          env: { SHELL: "/usr/local/bin/fish" },
          which: whichNone,
        });
        expect(result.shell).toBe("fish");
      });
    });

    describe("posix shell derivation", () => {
      it("derives zsh from /bin/zsh", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "/bin/zsh" },
          which: whichNone,
        });
        expect(result.shell).toBe("zsh");
      });

      it("derives bash from /usr/bin/bash", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "/usr/bin/bash" },
          which: whichNone,
        });
        expect(result.shell).toBe("bash");
      });

      it("defaults to sh when env.SHELL is missing", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: {}, // no SHELL
          which: whichNone,
        });
        expect(result.shell).toBe("sh");
      });

      it("defaults to sh when env.SHELL is empty string", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "" },
          which: whichNone,
        });
        expect(result.shell).toBe("sh");
      });

      it("derives the basename when SHELL has no directory component", () => {
        const result = detectPlatform({
          platformId: "darwin",
          archId: "arm64",
          env: { SHELL: "zsh" },
          which: whichNone,
        });
        expect(result.shell).toBe("zsh");
      });
    });

    describe("arch passthrough", () => {
      it("passes archId through unchanged (arm64)", () => {
        const result = detectPlatform({
          platformId: "darwin",
          archId: "arm64",
          env: { SHELL: "/bin/zsh" },
          which: whichNone,
        });
        expect(result.arch).toBe("arm64");
      });

      it("passes archId through unchanged (x64)", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "/bin/bash" },
          which: whichNone,
        });
        expect(result.arch).toBe("x64");
      });

      it("passes an arbitrary archId through unchanged (riscv64)", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "riscv64",
          env: { SHELL: "/bin/bash" },
          which: whichNone,
        });
        expect(result.arch).toBe("riscv64");
      });
    });

    describe("return shape", () => {
      it("returns exactly the documented keys", () => {
        const result = detectPlatform({
          platformId: "darwin",
          archId: "arm64",
          env: { SHELL: "/bin/zsh" },
          which: makeWhich(["brew"]),
        });
        expect(Object.keys(result).sort()).toStrictEqual(
          [
            "arch",
            "isWindows",
            "os",
            "packageManagers",
            "primaryPackageManager",
            "shell",
          ].sort(),
        );
      });

      it("primaryPackageManager is the same object reference as packageManagers[0]", () => {
        const result = detectPlatform({
          platformId: "linux",
          archId: "x64",
          env: { SHELL: "/bin/bash" },
          which: makeWhich(["yum", "apk"]),
        });
        expect(result.primaryPackageManager).toBe(result.packageManagers[0]);
      });
    });

    describe("which call contract", () => {
      it("passes the injected env into which opts", () => {
        const fake = makeWhich(["brew"]);
        const env = { SHELL: "/bin/zsh", PATH: "/opt/homebrew/bin" };
        detectPlatform({
          platformId: "darwin",
          archId: "arm64",
          env,
          which: fake,
        });
        expect(fake.calls[0].opts.env).toBe(env);
      });

      it("invokes which with the candidate id as first argument", () => {
        const fake = makeWhich(["brew"]);
        detectPlatform({
          platformId: "darwin",
          archId: "arm64",
          env: { SHELL: "/bin/zsh" },
          which: fake,
        });
        expect(fake.calls[0].id).toBe("brew");
      });
    });

    describe("default opts handling", () => {
      it("does not throw when called with an empty opts object (uses real process.platform)", () => {
        // The only real ambient read; we don't assert machine-specific values,
        // only that the shape is well-formed and deterministic in structure.
        const result = detectPlatform({
          // platformId omitted -> falls back to process.platform
          archId: "x64",
          env: { SHELL: "/bin/sh" },
          which: whichNone,
        });
        expect(typeof result.os).toBe("string");
        expect(result.arch).toBe("x64");
        expect(typeof result.isWindows).toBe("boolean");
        expect(Array.isArray(result.packageManagers)).toBe(true);
      });
    });
  });
});
