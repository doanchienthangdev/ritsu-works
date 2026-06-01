import { describe, it, expect } from "vitest";
import * as path from "path";
// @ts-ignore — Node interop from TS to CJS
const {
  getdesignCommand,
  cacheTargetDir,
  cacheDesignMdPath,
  buildFromRepoPlan,
  DownloadError,
  NAME_RE,
} = require("../../scripts/design-system/download.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Functions: pure command/path builders.
// Phase 1: getdesignCommand(name), cacheTargetDir(name,root?), cacheDesignMdPath, buildFromRepoPlan(name,repo,root?).
//   Branches = assertName (bad name → throw) | buildFromRepoPlan missing repo → throw | happy.
// Phase 2: name boundaries (empty, capital, leading digit, traversal, null, number); repo missing/empty.
// Skipped: security (NAME_RE closes traversal/injection — tested); state (pure); the actual npx exec is
//   side-effecting + out of scope for S1 (command construction only — no shell spawned here).

describe("download builders", () => {
  describe("getdesignCommand (key-free npx)", () => {
    it("builds the key-free argv for a valid name", () => {
      expect(getdesignCommand("stripe")).toEqual(["npx", "getdesign@latest", "add", "stripe"]);
    });
    it("allows hyphenated names", () => {
      expect(getdesignCommand("vercel-geist")).toEqual(["npx", "getdesign@latest", "add", "vercel-geist"]);
    });
  });

  describe("name boundaries (assertName) — all builders reject", () => {
    it.each([
      ["empty", ""],
      ["leading digit", "1stripe"],
      ["capital", "Stripe"],
      ["path traversal", "../etc/passwd"],
      ["slash", "a/b"],
      ["shell injection", "x; rm -rf /"],
      ["space", "a b"],
      ["null", null],
      ["undefined", undefined],
      ["number", 123],
    ])("getdesignCommand throws DownloadError on %s", (_l, val) => {
      expect(() => getdesignCommand(val as any)).toThrow(DownloadError);
    });
    it("NAME_RE rejects the boundary set + accepts a normal slug", () => {
      expect(NAME_RE.test("stripe")).toBe(true);
      expect(NAME_RE.test("Stripe")).toBe(false);
      expect(NAME_RE.test("")).toBe(false);
    });
  });

  describe("cache paths", () => {
    it("cacheTargetDir is under the gitignored runtime/design-systems/", () => {
      const dir = cacheTargetDir("linear");
      expect(dir.endsWith(path.join("runtime", "design-systems", "linear"))).toBe(true);
    });
    it("cacheDesignMdPath is <cacheDir>/DESIGN.md", () => {
      expect(cacheDesignMdPath("linear").endsWith(path.join("linear", "DESIGN.md"))).toBe(true);
    });
    it("honors an injected cacheRoot", () => {
      expect(cacheTargetDir("linear", "/tmp/ds")).toBe(path.join("/tmp/ds", "linear"));
    });
  });

  describe("buildFromRepoPlan (designmd hydration, no API key — AD-2)", () => {
    it("plans a build via the design-system/build skill", () => {
      const plan = buildFromRepoPlan("stripe", "https://github.com/x/stripe-design");
      expect(plan).toMatchObject({ name: "stripe", repo: "https://github.com/x/stripe-design", skill: "design-system/build" });
      expect(plan.designMdPath.endsWith(path.join("stripe", "DESIGN.md"))).toBe(true);
      expect(plan.note).toMatch(/no DESIGNMD_API_KEY/i);
    });
    it.each([["", "empty"], [null, "null"], [undefined, "undefined"], [123, "number"]])(
      "throws when repo is %s (%s)",
      (repo) => {
        expect(() => buildFromRepoPlan("stripe", repo as any)).toThrow(DownloadError);
      },
    );
    it("throws on a bad name even with a valid repo", () => {
      expect(() => buildFromRepoPlan("Bad Name", "https://x")).toThrow(DownloadError);
    });
  });
});
