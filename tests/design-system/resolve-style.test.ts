import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
// @ts-ignore — Node interop from TS to CJS
const { resolveStyle, StyleResolveError, PLAIN } = require("../../scripts/design-system/resolve-style.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Function: resolveStyle (the --style resolution state machine).
// Phase 1: resolveStyle(name, opts{interactive,registryPath,fileExists,readFile}). Branches =
//   opts not-object→throw | name undefined/null/''→plain | name non-string→throw |
//   not-found ×interactive(needs-download:search) / ×non-interactive(throw) |
//   file present→styled(parse) | owned+missing→throw(both modes) |
//   downloaded+missing ×interactive(needs-download) / ×non-interactive(throw, AD-3) | preview present/absent.
//   Deps: findSystem (registry-io), parseDesignMd. Injected fileExists/readFile/registryPath → no real FS coupling.
// Phase 2: full origin×status×presence×interactive matrix via a fixture registry + a suffix-based present-set.
//   Phase 2N contract: consumes a REAL registry-io fixture (not hand-mocked findSystem). 2O degradation:
//   downloaded-not-cached miss in CI hard-fails (the AD-3 determinism guarantee). Skipped: security (closed enums).

let tmp: string;
let reg: string;

const FIXTURE = `version: "1.0.0"
design_systems:
  - name: owned-ok
    origin: owned
    source: built-from-repo
    path: 00-core/design-system/owned-ok/DESIGN.md
    status: installed
  - name: owned-pending
    origin: owned
    source: built-from-repo
    path: 00-core/design-system/owned-pending/DESIGN.md
    status: pending
  - name: dl-cached
    origin: downloaded
    source: getdesign
    path: runtime/design-systems/dl-cached/DESIGN.md
    status: cached
  - name: dl-missing
    origin: downloaded
    source: getdesign
    path: runtime/design-systems/dl-missing/DESIGN.md
    status: not_cached
`;

const VALID_DESIGN_MD = `---\nname: X\ncolors:\n  primary: "#0ABCD0"\n---\n# X\n`;

// Present files (matched by path suffix → decoupled from REPO_ROOT):
const PRESENT = [
  "00-core/design-system/owned-ok/DESIGN.md",
  "00-core/design-system/owned-ok/preview.html",
  "runtime/design-systems/dl-cached/DESIGN.md",
];
const mkOpts = (over: Record<string, unknown> = {}) => ({
  registryPath: reg,
  fileExists: (p: string) => PRESENT.some((suf) => p.endsWith(suf)),
  readFile: () => VALID_DESIGN_MD,
  ...over,
});

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ds-resolve-"));
  reg = path.join(tmp, "design-systems.yaml");
  fs.writeFileSync(reg, FIXTURE, "utf-8");
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe("resolveStyle", () => {
  describe("default → plain", () => {
    it.each([
      ["undefined", undefined],
      ["null", null],
      ["empty string", ""],
    ])("returns {mode:'plain'} when name is %s", (_l, name) => {
      const r = resolveStyle(name, mkOpts());
      expect(r.mode).toBe("plain");
      expect(r.tokens).toBeNull();
      expect(r.name).toBeNull();
    });
    it("the exported PLAIN constant is frozen + shaped", () => {
      expect(PLAIN.mode).toBe("plain");
      expect(Object.isFrozen(PLAIN)).toBe(true);
    });
    it("plain works even with no opts (default arg)", () => {
      expect(resolveStyle(undefined).mode).toBe("plain");
    });
  });

  describe("input guards", () => {
    it.each([[123, "number"], [{}, "object"], [[], "array"], [true, "boolean"]])(
      "throws StyleResolveError when name is a non-string %s (%s)",
      (name) => {
        expect(() => resolveStyle(name as any, mkOpts())).toThrow(StyleResolveError);
      },
    );
    it("throws when opts is not an object", () => {
      expect(() => resolveStyle("owned-ok", null as any)).toThrow(/opts must be an object/);
    });
  });

  describe("not in registry", () => {
    it("interactive → needs-download (search)", () => {
      const r = resolveStyle("nope", mkOpts({ interactive: true }));
      expect(r.mode).toBe("needs-download");
      expect(r.source).toBe("search");
    });
    it("non-interactive → throws (AD-3: no silent download in CI)", () => {
      expect(() => resolveStyle("nope", mkOpts({ interactive: false }))).toThrow(/non-interactive/);
    });
    it("non-interactive is the default (omitted interactive → throw)", () => {
      expect(() => resolveStyle("nope", mkOpts())).toThrow(StyleResolveError);
    });
  });

  describe("present on disk → styled", () => {
    it("owned + installed + present → styled with parsed tokens + origin owned", () => {
      const r = resolveStyle("owned-ok", mkOpts());
      expect(r.mode).toBe("styled");
      expect(r.origin).toBe("owned");
      expect(r.tokens.colors.primary).toBe("#0ABCD0");
      expect(r.designMdPath.endsWith("owned-ok/DESIGN.md")).toBe(true);
    });
    it("attaches previewPath when preview.html is present", () => {
      expect(resolveStyle("owned-ok", mkOpts()).previewPath?.endsWith("owned-ok/preview.html")).toBe(true);
    });
    it("previewPath is null when no preview sibling exists", () => {
      // dl-cached has a present DESIGN.md but no preview.html in PRESENT
      expect(resolveStyle("dl-cached", mkOpts()).previewPath).toBeNull();
    });
    it("downloaded + cached + present → styled with origin downloaded", () => {
      const r = resolveStyle("dl-cached", mkOpts());
      expect(r.mode).toBe("styled");
      expect(r.origin).toBe("downloaded");
    });
    it("styled resolution is interactive-agnostic (present file → styled in both modes)", () => {
      expect(resolveStyle("owned-ok", mkOpts({ interactive: true })).mode).toBe("styled");
      expect(resolveStyle("owned-ok", mkOpts({ interactive: false })).mode).toBe("styled");
    });
  });

  describe("owned but missing → always throws (owned installs, never downloads)", () => {
    it.each([[true, "interactive"], [false, "non-interactive"]])(
      "owned-pending missing throws in %s mode",
      (interactive) => {
        expect(() => resolveStyle("owned-pending", mkOpts({ interactive }))).toThrow(/registered .* not yet installed/);
      },
    );
  });

  describe("downloaded but cache-missing", () => {
    it("interactive → needs-download (origin downloaded, source getdesign)", () => {
      const r = resolveStyle("dl-missing", mkOpts({ interactive: true }));
      expect(r.mode).toBe("needs-download");
      expect(r.origin).toBe("downloaded");
      expect(r.source).toBe("getdesign");
    });
    it("non-interactive → throws (AD-3: no silent npx in CI/cron)", () => {
      expect(() => resolveStyle("dl-missing", mkOpts({ interactive: false }))).toThrow(/no silent npx/i);
    });
  });

  // /cla fix design-system-styling (Tier B, 2026-06-01): a PRESENT-but-unusable
  // DESIGN.md must never hard-crash the consuming command. Phase 1: the present-file
  // branch now wraps parseDesignMd — DesignMdParseError → {mode:'plain', warning}; any
  // other (real IO) error still propagates. Phase 2: real captured getdesign fixtures
  // (2N contract w/ live output), non-sRGB + ref-cycle (validation stays strict, no
  // crash), an IO error (must NOT be swallowed). The two layers compose: supabase is
  // recovered by the parse layer → styled; spotify is unrecoverable → plain + warning.
  describe("present but unusable DESIGN.md → plain + warning (never crash)", () => {
    const fxDir = path.join(__dirname, "fixtures");
    const spotify = fs.readFileSync(path.join(fxDir, "spotify-DESIGN.md"), "utf-8");
    const supabase = fs.readFileSync(path.join(fxDir, "supabase-DESIGN.md"), "utf-8");

    it("tokenless content (real spotify) → plain + warning; tokens null, name + origin preserved", () => {
      const r = resolveStyle("dl-cached", mkOpts({ readFile: () => spotify }));
      expect(r.mode).toBe("plain");
      expect(r.tokens).toBeNull();
      expect(r.name).toBe("dl-cached"); // requested name preserved (not the bare PLAIN null)
      expect(r.origin).toBe("downloaded");
      expect(r.warning).toMatch(/no usable design tokens/);
    });

    it("malformed-but-recoverable content (real supabase) → styled (parse layer recovers it)", () => {
      const r = resolveStyle("dl-cached", mkOpts({ readFile: () => supabase }));
      expect(r.mode).toBe("styled");
      expect(r.warning).toBeUndefined();
      expect(r.tokens.colors.primary).toBe("#3ecf8e");
    });

    it("non-sRGB colors → plain + warning (sRGB validation stays strict, no crash)", () => {
      const r = resolveStyle("dl-cached", mkOpts({ readFile: () => `---\nname: X\ncolors:\n  primary: "rgb(0,0,0)"\n---\n# X\n` }));
      expect(r.mode).toBe("plain");
      expect(r.warning).toMatch(/no usable design tokens/);
    });

    it("a {ref} cycle → plain + warning (cycle detection stays strict, no crash)", () => {
      const r = resolveStyle("dl-cached", mkOpts({ readFile: () => `---\nname: X\nx:\n  a: "{x.b}"\n  b: "{x.a}"\n---\n# X\n` }));
      expect(r.mode).toBe("plain");
      expect(r.warning).toMatch(/no usable design tokens/);
    });

    it("a real (non-parse) read/IO error still PROPAGATES — only DesignMdParseError degrades", () => {
      const boom = () => { throw new Error("EACCES: permission denied"); };
      expect(() => resolveStyle("dl-cached", mkOpts({ readFile: boom }))).toThrow(/EACCES/);
    });

    it("valid present content is unaffected → still styled (no regression)", () => {
      const r = resolveStyle("dl-cached", mkOpts()); // default readFile → VALID_DESIGN_MD
      expect(r.mode).toBe("styled");
      expect(r.tokens.colors.primary).toBe("#0ABCD0");
    });
  });
});
