import { describe, it, expect } from "vitest";

// vitest supports named imports from CommonJS module.exports.
import {
  DEPENDENCIES,
  getDependency,
  dependenciesByLevel,
  resolveInstallCommand,
} from "../../scripts/local-install/dependencies.cjs";

// ---------------------------------------------------------------------------
// Platform literal builders — plain objects, no real machine inspection.
// ---------------------------------------------------------------------------
const macosBrew = {
  os: "macos",
  packageManagers: [{ id: "brew" }],
  primaryPackageManager: { id: "brew" },
};

const linuxApt = {
  os: "linux",
  packageManagers: [{ id: "apt-get" }],
  primaryPackageManager: { id: "apt-get" },
};

const linuxNoPm = {
  os: "linux",
  packageManagers: [],
  primaryPackageManager: null,
};

const windowsWinget = {
  os: "windows",
  packageManagers: [{ id: "winget" }],
  primaryPackageManager: { id: "winget" },
};

const ALL_IDS = [
  "node",
  "pnpm",
  "git",
  "gh",
  "supabase-cli",
  "python3",
  "ffmpeg",
  "bun",
];

describe("local-install dependencies module", () => {
  // =========================================================================
  // DEPENDENCIES — data shape + completeness
  // =========================================================================
  describe("DEPENDENCIES array shape", () => {
    it("is an array", () => {
      expect(Array.isArray(DEPENDENCIES)).toBe(true);
    });

    it("contains exactly the 8 expected dependency ids in declaration order", () => {
      expect(DEPENDENCIES.map((d: any) => d.id)).toEqual(ALL_IDS);
    });

    it("has 8 entries", () => {
      expect(DEPENDENCIES.length).toBe(8);
    });

    it.each(ALL_IDS)("entry %s has id/label/required/detect fields", (id) => {
      const dep = DEPENDENCIES.find((d: any) => d.id === id) as any;
      expect(dep).toBeDefined();
      expect(typeof dep.id).toBe("string");
      expect(typeof dep.label).toBe("string");
      expect(typeof dep.required).toBe("string");
      expect(typeof dep.detect).toBe("object");
      expect(dep.detect).not.toBeNull();
    });

    it.each(ALL_IDS)("entry %s detect block has cmd, aliases array, args array", (id) => {
      const dep = DEPENDENCIES.find((d: any) => d.id === id) as any;
      expect(typeof dep.detect.cmd).toBe("string");
      expect(Array.isArray(dep.detect.aliases)).toBe(true);
      expect(dep.detect.aliases.length).toBeGreaterThan(0);
      expect(Array.isArray(dep.detect.args)).toBe(true);
      expect(dep.detect.args.length).toBeGreaterThan(0);
    });

    it("every required level is one of hard|recommended|feature", () => {
      const levels = new Set(["hard", "recommended", "feature"]);
      for (const dep of DEPENDENCIES as any[]) {
        expect(levels.has(dep.required)).toBe(true);
      }
    });

    it("all ids are unique", () => {
      const ids = DEPENDENCIES.map((d: any) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("python3 detect aliases include the windows-launcher alias 'python'", () => {
      const dep = DEPENDENCIES.find((d: any) => d.id === "python3") as any;
      expect(dep.detect.aliases).toEqual(["python3", "python"]);
    });
  });

  // =========================================================================
  // getDependency
  // =========================================================================
  describe("getDependency", () => {
    it("returns the node spec for id 'node'", () => {
      const dep = getDependency("node") as any;
      expect(dep).toBeDefined();
      expect(dep.id).toBe("node");
      expect(dep.label).toBe("Node.js");
    });

    it("returns the pnpm spec for id 'pnpm'", () => {
      expect((getDependency("pnpm") as any).id).toBe("pnpm");
    });

    it("returns the supabase-cli spec for id 'supabase-cli'", () => {
      const dep = getDependency("supabase-cli") as any;
      expect(dep.id).toBe("supabase-cli");
      expect(dep.label).toBe("Supabase CLI");
    });

    it("returns undefined for an unknown id 'nope'", () => {
      expect(getDependency("nope")).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      expect(getDependency("")).toBeUndefined();
    });

    it("returns undefined for null", () => {
      expect(getDependency(null as any)).toBeUndefined();
    });

    it("returns undefined for undefined", () => {
      expect(getDependency(undefined as any)).toBeUndefined();
    });

    it("is case-sensitive — 'Node' does not match 'node'", () => {
      expect(getDependency("Node")).toBeUndefined();
    });

    it("does not match on label text", () => {
      expect(getDependency("Node.js")).toBeUndefined();
    });

    it("returns the same reference held inside DEPENDENCIES", () => {
      const fromGetter = getDependency("git");
      const fromArray = DEPENDENCIES.find((d: any) => d.id === "git");
      expect(fromGetter).toBe(fromArray);
    });
  });

  // =========================================================================
  // dependenciesByLevel
  // =========================================================================
  describe("dependenciesByLevel", () => {
    it("level 'hard' includes node, pnpm, git", () => {
      const ids = dependenciesByLevel("hard").map((d: any) => d.id);
      expect(ids).toEqual(expect.arrayContaining(["node", "pnpm", "git"]));
    });

    it("level 'hard' contains exactly node/pnpm/git", () => {
      const ids = dependenciesByLevel("hard").map((d: any) => d.id).sort();
      expect(ids).toEqual(["git", "node", "pnpm"]);
    });

    it("level 'recommended' includes gh and supabase-cli", () => {
      const ids = dependenciesByLevel("recommended").map((d: any) => d.id);
      expect(ids).toEqual(expect.arrayContaining(["gh", "supabase-cli"]));
    });

    it("level 'recommended' contains exactly gh/supabase-cli", () => {
      const ids = dependenciesByLevel("recommended").map((d: any) => d.id).sort();
      expect(ids).toEqual(["gh", "supabase-cli"]);
    });

    it("level 'feature' includes python3, ffmpeg, bun", () => {
      const ids = dependenciesByLevel("feature").map((d: any) => d.id);
      expect(ids).toEqual(expect.arrayContaining(["python3", "ffmpeg", "bun"]));
    });

    it("level 'feature' contains exactly python3/ffmpeg/bun", () => {
      const ids = dependenciesByLevel("feature").map((d: any) => d.id).sort();
      expect(ids).toEqual(["bun", "ffmpeg", "python3"]);
    });

    it("the three levels partition all 8 dependencies", () => {
      const total =
        dependenciesByLevel("hard").length +
        dependenciesByLevel("recommended").length +
        dependenciesByLevel("feature").length;
      expect(total).toBe(DEPENDENCIES.length);
    });

    it("returns empty array for an unknown level", () => {
      expect(dependenciesByLevel("optional")).toEqual([]);
    });

    it("returns empty array for empty string level", () => {
      expect(dependenciesByLevel("")).toEqual([]);
    });

    it("returns empty array for null level", () => {
      expect(dependenciesByLevel(null as any)).toEqual([]);
    });

    it("returns empty array for undefined level", () => {
      expect(dependenciesByLevel(undefined as any)).toEqual([]);
    });

    it("returns specs that are references into DEPENDENCIES", () => {
      const hard = dependenciesByLevel("hard");
      for (const dep of hard) {
        expect(DEPENDENCIES).toContain(dep);
      }
    });
  });

  // =========================================================================
  // resolveInstallCommand — universal branch
  // =========================================================================
  describe("resolveInstallCommand — universal precedence", () => {
    it("pnpm resolves to kind 'universal' on macos regardless of platform", () => {
      const dep = getDependency("pnpm") as any;
      const res = resolveInstallCommand(dep, macosBrew);
      expect(res.kind).toBe("universal");
      expect(res.packageManager).toBeNull();
      expect(res.command).toBe(dep.install.universal);
    });

    it("pnpm resolves to kind 'universal' on windows too", () => {
      const dep = getDependency("pnpm") as any;
      const res = resolveInstallCommand(dep, windowsWinget);
      expect(res.kind).toBe("universal");
      expect(res.packageManager).toBeNull();
    });

    it("pnpm resolves to kind 'universal' on linux with no pm", () => {
      const dep = getDependency("pnpm") as any;
      const res = resolveInstallCommand(dep, linuxNoPm);
      expect(res.kind).toBe("universal");
    });

    it("universal command carries the dep's manual string", () => {
      const dep = getDependency("pnpm") as any;
      const res = resolveInstallCommand(dep, macosBrew);
      expect(res.manual).toBe(dep.manual);
    });

    it("bun (has universal) resolves to kind 'universal' even on macos with brew", () => {
      const dep = getDependency("bun") as any;
      const res = resolveInstallCommand(dep, macosBrew);
      expect(res.kind).toBe("universal");
      expect(res.command).toBe(dep.install.universal);
    });
  });

  // =========================================================================
  // resolveInstallCommand — package-manager branch
  // =========================================================================
  describe("resolveInstallCommand — package-manager branch", () => {
    it("git on macos/brew resolves to package-manager with brew command", () => {
      const dep = getDependency("git") as any;
      const res = resolveInstallCommand(dep, macosBrew);
      expect(res.kind).toBe("package-manager");
      expect(res.packageManager).toBe("brew");
      expect(res.command).toContain("git");
    });

    it("git on linux/apt-get resolves to apt-get command", () => {
      const dep = getDependency("git") as any;
      const res = resolveInstallCommand(dep, linuxApt);
      expect(res.kind).toBe("package-manager");
      expect(res.packageManager).toBe("apt-get");
      expect(res.command).toContain("apt-get");
      expect(res.command).toBe(dep.install.linux["apt-get"]);
    });

    it("git on windows/winget resolves to winget command", () => {
      const dep = getDependency("git") as any;
      const res = resolveInstallCommand(dep, windowsWinget);
      expect(res.kind).toBe("package-manager");
      expect(res.packageManager).toBe("winget");
      expect(res.command).toBe(dep.install.windows.winget);
    });

    it("node on macos/brew resolves to package-manager brew", () => {
      const dep = getDependency("node") as any;
      const res = resolveInstallCommand(dep, macosBrew);
      expect(res.kind).toBe("package-manager");
      expect(res.packageManager).toBe("brew");
      expect(res.command).toBe("brew install node");
    });

    it("prefers primaryPackageManager when multiple are detected", () => {
      const dep = getDependency("git") as any;
      const platform = {
        os: "windows",
        packageManagers: [{ id: "choco" }, { id: "winget" }],
        primaryPackageManager: { id: "winget" },
      };
      const res = resolveInstallCommand(dep, platform);
      expect(res.packageManager).toBe("winget");
      expect(res.command).toBe(dep.install.windows.winget);
    });

    it("falls through to a secondary detected pm when primary has no command for the dep", () => {
      // supabase-cli on windows only declares 'scoop'. Detect choco (primary, no key) + scoop.
      const dep = getDependency("supabase-cli") as any;
      const platform = {
        os: "windows",
        packageManagers: [{ id: "choco" }, { id: "scoop" }],
        primaryPackageManager: { id: "choco" },
      };
      const res = resolveInstallCommand(dep, platform);
      expect(res.kind).toBe("package-manager");
      expect(res.packageManager).toBe("scoop");
      expect(res.command).toBe(dep.install.windows.scoop);
    });

    it("uses a detected non-primary pm when primaryPackageManager is null", () => {
      const dep = getDependency("git") as any;
      const platform = {
        os: "linux",
        packageManagers: [{ id: "dnf" }],
        primaryPackageManager: null,
      };
      const res = resolveInstallCommand(dep, platform);
      expect(res.kind).toBe("package-manager");
      expect(res.packageManager).toBe("dnf");
      expect(res.command).toBe(dep.install.linux.dnf);
    });
  });

  // =========================================================================
  // resolveInstallCommand — manual branches
  // =========================================================================
  describe("resolveInstallCommand — manual fallbacks", () => {
    it("linux with NO detected pm but manifest has the key -> kind manual with command present", () => {
      const dep = getDependency("git") as any;
      const res = resolveInstallCommand(dep, linuxNoPm);
      expect(res.kind).toBe("manual");
      // command IS present (a known manifest key) even though no pm was detected.
      expect(res.command).not.toBeNull();
      expect(res.command).toBe(dep.install.linux["apt-get"]);
      // packageManager names the key it would have used.
      expect(res.packageManager).toBe("apt-get");
    });

    it("dep with no install block -> {kind:'manual', command:null}", () => {
      const fakeDep = { id: "fake", label: "Fake", required: "feature", manual: "see docs" };
      const res = resolveInstallCommand(fakeDep as any, macosBrew);
      expect(res.kind).toBe("manual");
      expect(res.command).toBeNull();
      expect(res.packageManager).toBeNull();
      expect(res.manual).toBe("see docs");
    });

    it("os with no osBlock for the platform -> kind manual, command null", () => {
      // supabase-cli has macos+windows install only, no linux block.
      const dep = getDependency("supabase-cli") as any;
      const res = resolveInstallCommand(dep, linuxApt);
      expect(res.kind).toBe("manual");
      expect(res.command).toBeNull();
      expect(res.packageManager).toBeNull();
    });

    it("unknown os (no osBlock and no universal) -> kind manual, command null", () => {
      const dep = getDependency("git") as any;
      const res = resolveInstallCommand(dep, {
        os: "freebsd",
        packageManagers: [{ id: "pkg" }],
        primaryPackageManager: { id: "pkg" },
      });
      expect(res.kind).toBe("manual");
      expect(res.command).toBeNull();
    });

    it("osBlock exists but is empty -> kind manual, command null", () => {
      const fakeDep = {
        id: "weird",
        label: "Weird",
        required: "feature",
        install: { macos: {} },
        manual: "manual-url",
      };
      const res = resolveInstallCommand(fakeDep as any, macosBrew);
      expect(res.kind).toBe("manual");
      expect(res.command).toBeNull();
      expect(res.packageManager).toBeNull();
      expect(res.manual).toBe("manual-url");
    });
  });

  // =========================================================================
  // resolveInstallCommand — manual string fallback (dep.manual || dep.note)
  // =========================================================================
  describe("resolveInstallCommand — manual string resolution", () => {
    it("uses dep.manual when present", () => {
      const dep = getDependency("ffmpeg") as any;
      const res = resolveInstallCommand(dep, linuxApt);
      expect(res.manual).toBe(dep.manual);
    });

    it("falls back to dep.note when dep.manual is absent", () => {
      const fakeDep = {
        id: "noteonly",
        label: "NoteOnly",
        required: "feature",
        note: "the note text",
      };
      const res = resolveInstallCommand(fakeDep as any, macosBrew);
      expect(res.manual).toBe("the note text");
    });

    it("manual is null when neither dep.manual nor dep.note exist", () => {
      const fakeDep = { id: "bare", label: "Bare", required: "feature" };
      const res = resolveInstallCommand(fakeDep as any, macosBrew);
      expect(res.manual).toBeNull();
    });

    it("manual string is preserved on the package-manager result too", () => {
      const dep = getDependency("git") as any;
      const res = resolveInstallCommand(dep, macosBrew);
      expect(res.manual).toBe(dep.manual);
    });
  });

  // =========================================================================
  // resolveInstallCommand — return-shape invariant + cross-parameter
  // =========================================================================
  describe("resolveInstallCommand — return shape invariant", () => {
    it("result always has the four keys regardless of branch", () => {
      const dep = getDependency("node") as any;
      const res = resolveInstallCommand(dep, macosBrew);
      expect(Object.keys(res).sort()).toEqual([
        "command",
        "kind",
        "manual",
        "packageManager",
      ]);
    });

    it("missing packageManagers array (undefined) is treated as empty -> manual fallback to manifest key", () => {
      const dep = getDependency("git") as any;
      const platform = { os: "linux", primaryPackageManager: null };
      const res = resolveInstallCommand(dep, platform as any);
      expect(res.kind).toBe("manual");
      // still surfaces the first manifest key command
      expect(res.command).toBe(dep.install.linux["apt-get"]);
      expect(res.packageManager).toBe("apt-get");
    });

    it.each(["node", "git", "gh", "ffmpeg"])(
      "%s on macos/brew yields a brew package-manager command",
      (id) => {
        const dep = getDependency(id) as any;
        const res = resolveInstallCommand(dep, macosBrew);
        expect(res.kind).toBe("package-manager");
        expect(res.packageManager).toBe("brew");
        expect(res.command).toContain("brew");
      }
    );
  });
});
