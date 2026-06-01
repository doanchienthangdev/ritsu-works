import { describe, it, expect } from "vitest";
import * as fs from "fs";
// @ts-ignore — Node interop from TS to CJS (repo convention; see deepask/resolver-v3 tests)
const { parseDesignMd, DesignMdParseError, SRGB_HEX } = require("../../scripts/design-system/parse-design-md.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Function under test: parseDesignMd (pure data transform).
// Phase 1: 1 param (content:string). Branches = non-string→throw | no/empty frontmatter→throw |
//   malformed YAML→throw(wrapped) | {ref} resolve (embedded·chained·cycle→throw·unresolved→throw) |
//   colors non-object→throw | colors value non-sRGB-hex→throw | happy. Dep: frontmatter.parse (reused).
// Phase 2: strings (empty, no-fm), objects (colors map variants), refs (cycle/unresolved/chained/embedded),
//   the REAL ritsu draft (contract w/ the seed). Phase 2M invariant: resolved output has no `{...}` left.
// Skipped: security (our own DESIGN.md, not user input — but malformed/adversarial YAML still tested);
//   state/timing (stateless pure); contract upstream = frontmatter.parse (exercised via real fixture).

const fm = (yaml: string, body = "\n# Title\n") => `---\n${yaml}\n---\n${body}`;

describe("parseDesignMd", () => {
  describe("happy path", () => {
    it("parses minimal frontmatter (name only, no colors → colors {})", () => {
      const r = parseDesignMd(fm(`name: Foo\nversion: alpha`));
      expect(r.name).toBe("Foo");
      expect(r.version).toBe("alpha");
      expect(r.colors).toEqual({});
      expect(r.body).toContain("# Title");
    });

    it("parses + preserves the markdown body verbatim", () => {
      const r = parseDesignMd(fm(`name: Foo`, "\n## Overview\n\nbody text\n"));
      expect(r.body).toBe("\n## Overview\n\nbody text\n");
    });
  });

  describe("input boundaries — content param", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
      ["number", 123],
      ["object", { a: 1 }],
      ["array", []],
    ])("throws DesignMdParseError when content is %s", (_label, val) => {
      expect(() => parseDesignMd(val as any)).toThrow(DesignMdParseError);
    });

    it("throws on empty string (no frontmatter)", () => {
      expect(() => parseDesignMd("")).toThrow(/no YAML token frontmatter/);
    });

    it("throws on a body with no frontmatter block", () => {
      expect(() => parseDesignMd("# Just a heading\n\ntext")).toThrow(DesignMdParseError);
    });

    it("throws (wrapped) on malformed YAML frontmatter", () => {
      // invalid YAML: a bad indent/mapping
      const bad = `---\nname: Foo\n  : : :\n\tbad\n---\nbody`;
      expect(() => parseDesignMd(bad)).toThrow(DesignMdParseError);
    });
  });

  describe("colors sRGB validation", () => {
    it.each([
      ["#0ABCD0", true],
      ["#fff", true],
      ["#0ABCD0FF", true],
    ])("accepts valid hex %s", (hex) => {
      const r = parseDesignMd(fm(`name: F\ncolors:\n  primary: "${hex}"`));
      expect(r.colors.primary).toBe(hex);
      expect(SRGB_HEX.test(hex)).toBe(true);
    });

    it.each([
      ["blue"],
      ["#12"],
      ["#1234"],
      ["#12345"],
      ["rgb(0,0,0)"],
      ["0ABCD0"], // missing #
      ["#GGGGGG"], // non-hex chars
    ])("throws on non-sRGB-hex color value %s", (bad) => {
      expect(() => parseDesignMd(fm(`name: F\ncolors:\n  primary: "${bad}"`))).toThrow(/not a valid sRGB hex/);
    });

    it("throws when a colors value is a number (not a string)", () => {
      expect(() => parseDesignMd(fm(`name: F\ncolors:\n  primary: 123456`))).toThrow(/not a valid sRGB hex/);
    });

    it("throws when colors is not a mapping (array)", () => {
      expect(() => parseDesignMd(fm(`name: F\ncolors:\n  - "#fff"`))).toThrow(/colors.* must be a mapping/);
    });
  });

  describe("token {ref} resolution", () => {
    it("resolves a pure ref (button.bg = {colors.primary})", () => {
      const r = parseDesignMd(fm(`name: F\ncolors:\n  primary: "#0ABCD0"\ncomponents:\n  button:\n    backgroundColor: "{colors.primary}"`));
      expect(r.components.button.backgroundColor).toBe("#0ABCD0");
    });

    it("resolves an EMBEDDED ref inside a composite string (border: 1px solid {colors.border})", () => {
      const r = parseDesignMd(fm(`name: F\ncolors:\n  border: "#E2E8F0"\ncomponents:\n  card:\n    border: "1px solid {colors.border}"`));
      expect(r.components.card.border).toBe("1px solid #E2E8F0");
    });

    it("resolves a CHAINED ref (a → b → literal)", () => {
      const r = parseDesignMd(fm(`name: F\nx:\n  a: "{x.b}"\n  b: "{x.c}"\n  c: "deep"`));
      expect(r.tokens.x.a).toBe("deep");
    });

    it("throws on a CIRCULAR ref (a ↔ b)", () => {
      expect(() => parseDesignMd(fm(`name: F\nx:\n  a: "{x.b}"\n  b: "{x.a}"`))).toThrow(/circular token reference/);
    });

    it("throws on an UNRESOLVED ref", () => {
      expect(() => parseDesignMd(fm(`name: F\ncomponents:\n  button:\n    backgroundColor: "{colors.nope}"`))).toThrow(/unresolved token reference/);
    });

    it("invariant: no unresolved {a.b} tokens remain anywhere after a successful parse", () => {
      const r = parseDesignMd(fm(`name: F\ncolors:\n  p: "#0ABCD0"\nrounded:\n  lg: "8px"\ncomponents:\n  button:\n    backgroundColor: "{colors.p}"\n    rounded: "{rounded.lg}"`));
      expect(JSON.stringify(r.tokens)).not.toMatch(/\{[a-zA-Z0-9_.]+\}/);
    });
  });

  describe("contract — the REAL ritsu DESIGN draft", () => {
    const draftPath = "/Users/doanchienthang/ritsu-works/.archives/cla/design-system-styling/refs/01-ritsu-DESIGN.draft.md";
    // Skipped: gracefully no-op if the staged draft is absent (CI checkout may not include root .archives).
    const exists = fs.existsSync(draftPath);
    (exists ? it : it.skip)("parses the seed: name=Ritsu, primary #0ABCD0, button.bg resolves to the primary", () => {
      const r = parseDesignMd(fs.readFileSync(draftPath, "utf-8"));
      expect(r.name).toBe("Ritsu");
      expect(r.colors.primary).toBe("#0ABCD0");
      expect(r.components.button.backgroundColor).toBe("#0ABCD0");
      expect(r.rounded.lg).toBe("8px");
      expect(r.body).toContain("Design System");
    });
  });

  describe("regressions", () => {
    // PR #175 @cto review: getByPath used `key in node` (walks the prototype chain),
    // so {toString}/{constructor}/{__proto__}/{hasOwnProperty} resolved to native
    // built-ins instead of throwing. Reachable via an untrusted downloaded DESIGN.md.
    // Fixed with Object.prototype.hasOwnProperty.call — these MUST throw unresolved.
    it.each(["toString", "constructor", "__proto__", "hasOwnProperty", "valueOf"])(
      "regression: inherited Object key {%s} throws 'unresolved token reference' (not a native built-in)",
      (key) => {
        expect(() => parseDesignMd(fm(`name: F\ncomponents:\n  x:\n    v: "{${key}}"`))).toThrow(/unresolved token reference/);
      },
    );
  });
});
