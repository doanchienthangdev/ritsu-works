import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
// @ts-ignore — Node interop from TS to CJS (repo convention; see deepask/resolver-v3 tests)
const { parseDesignMd, DesignMdParseError, SRGB_HEX, sanitizeFrontmatterScalars, isRiskyPlainScalar } = require("../../scripts/design-system/parse-design-md.cjs");

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

  // ==========================================================================
  // /cla fix design-system-styling (Tier B, 2026-06-01): real `npx getdesign add`
  // output broke two ways. (1) spotify = tokenless prose (no frontmatter) → was an
  // uncaught throw that crashed the consuming command (resolve-style now degrades).
  // (2) supabase = valid colors/typography but a long unquoted `description:` with an
  // embedded ": " → js-yaml "bad indentation of a mapping entry (3:323)".
  // Phase 1: NEW units sanitizeFrontmatterScalars (string→string|null; branches:
  //   BOM/CRLF · no-fence→null · unterminated→null · nothing-risky→null · repair),
  //   isRiskyPlainScalar (3 OR'd predicates), coerceRiskyScalarLine (verbatim vs
  //   quote+escape), + resolveString ref regex now allows hyphens (getdesign keys).
  //   Recovery wired into parseDesignMd's catch (null→throw / retry-ok / retry-fail).
  // Phase 2: real captured fixtures (2N contract w/ live getdesign), embedded/trailing
  //   ":", " #", indicator-start, escaping " and \, nested-not-touched, idempotence,
  //   CRLF+BOM. 2K: malicious-looking description is double-quoted (can't break out).
  // ==========================================================================

  describe("hyphenated token {ref} resolution (getdesign keys are hyphenated)", () => {
    it("resolves a hyphenated single-segment ref {x.a-b}", () => {
      const r = parseDesignMd(fm(`name: F\nx:\n  a-b: "deep"\n  use: "{x.a-b}"`));
      expect(r.tokens.x.use).toBe("deep");
    });
    it("resolves a hyphenated path ref {colors.on-primary} (the supabase pattern)", () => {
      const r = parseDesignMd(fm(`name: F\ncolors:\n  on-primary: "#171717"\ncomponents:\n  btn:\n    textColor: "{colors.on-primary}"`));
      expect(r.components.btn.textColor).toBe("#171717");
    });
    it("resolves an EMBEDDED hyphenated ref (radius: r={rounded.full-pill})", () => {
      const r = parseDesignMd(fm(`name: F\nrounded:\n  full-pill: "9999px"\ncomponents:\n  c:\n    radius: "r={rounded.full-pill}"`));
      expect(r.components.c.radius).toBe("r=9999px");
    });
    it("regression: a NON-hyphen ref still resolves (no regression from the hyphen change)", () => {
      const r = parseDesignMd(fm(`name: F\ncolors:\n  primary: "#0ABCD0"\ncomponents:\n  b:\n    bg: "{colors.primary}"`));
      expect(r.components.b.bg).toBe("#0ABCD0");
    });
  });

  describe("isRiskyPlainScalar (the recovery predicate)", () => {
    it.each([
      ["embedded colon-space", "reads as quietly technical: minimal chrome"],
      ["trailing colon", "the value ends here:"],
      ["inline comment", "green primary # the only accent"],
      ["leading '#' (would be a YAML comment → null value)", "#3ecf8e"],
      ["leading bang", "!secret"],
      ["leading at", "@handle stuff"],
      ["leading backtick", "`code`"],
      ["leading percent", "%directive"],
      ["leading comma", ",leading"],
    ])("flags %s as risky", (_l, v) => {
      expect(isRiskyPlainScalar(v)).toBe(true);
    });
    it.each([
      ["plain prose", "An inspired interpretation of the design language"],
      ["css shorthand (space, no colon)", "8px 16px"],
      ["negative dimension", "-1.92px"],
      ["url (colon not followed by space)", "https://example.com/path"],
      ["hyphenated word", "near-monochrome palette"],
      ["empty string", ""],
    ])("does NOT flag %s", (_l, v) => {
      expect(isRiskyPlainScalar(v)).toBe(false);
    });
  });

  describe("sanitizeFrontmatterScalars (frontmatter repair, top-level scalars only)", () => {
    it("returns null when there is no frontmatter block (tokenless prose)", () => {
      expect(sanitizeFrontmatterScalars("# Heading\n\nprose only")).toBeNull();
    });
    it("returns null for an unterminated frontmatter (--- open, no closing fence)", () => {
      expect(sanitizeFrontmatterScalars("---\nname: F\nno closing fence here")).toBeNull();
    });
    it("returns null when nothing at the top level is risky (clean frontmatter)", () => {
      expect(sanitizeFrontmatterScalars(fm(`name: F\nversion: alpha`))).toBeNull();
    });
    it("quotes a risky top-level description (embedded colon-space) → re-parses cleanly", () => {
      const out = sanitizeFrontmatterScalars(fm(`name: F\ndescription: reads as quietly technical: minimal chrome`));
      expect(out).toContain(`description: "reads as quietly technical: minimal chrome"`);
      expect(() => parseDesignMd(out as string)).not.toThrow();
    });
    it("does NOT touch a nested (indented) risky line — only column-0 scalars are in scope", () => {
      // `meta:` is a block-parent (no value); `  note:` is indented → neither is rewritten,
      // so nothing top-level is risky and the repair declines (returns null). Nested token
      // blocks (colors/typography/components) are therefore never corrupted by the repair.
      expect(sanitizeFrontmatterScalars(fm(`name: F\nmeta:\n  note: a: b risky nested`))).toBeNull();
    });
    it("does NOT re-quote an already double-quoted value", () => {
      expect(sanitizeFrontmatterScalars(fm(`name: F\ndescription: "already: quoted"`))).toBeNull();
    });
    it("leaves an intentional flow-collection value ([...]) alone", () => {
      expect(sanitizeFrontmatterScalars(fm(`name: F\ntags: [a, b, c]`))).toBeNull();
    });
    it("escapes embedded double-quotes when coercing (round-trips to the exact string)", () => {
      const out = sanitizeFrontmatterScalars(fm(`name: F\ndescription: say "hi": and more`));
      expect(out).toContain(`description: "say \\"hi\\": and more"`);
      expect(parseDesignMd(out as string).description).toBe(`say "hi": and more`);
    });
    it("escapes embedded backslashes when coercing (round-trips to the exact string)", () => {
      // value has one backslash AND a ": " (so it is risky → gets double-quoted).
      const out = sanitizeFrontmatterScalars(fm(`name: F\ndescription: a\\b: c`));
      expect(parseDesignMd(out as string).description).toBe(`a\\b: c`);
    });
    it("idempotence: repairing an already-repaired doc offers no further change", () => {
      const once = sanitizeFrontmatterScalars(fm(`name: F\ndescription: a: b`));
      expect(once).not.toBeNull();
      expect(sanitizeFrontmatterScalars(once as string)).toBeNull();
    });
    it("preserves the markdown body verbatim across repair", () => {
      const out = sanitizeFrontmatterScalars(fm(`name: F\ndescription: x: y`, "\n## Body\n\nhello\n"));
      expect(parseDesignMd(out as string).body).toBe("\n## Body\n\nhello\n");
    });
    it("handles BOM + CRLF input", () => {
      const bom = "﻿" + fm(`name: F\ndescription: a: b`).replace(/\n/g, "\r\n");
      const out = sanitizeFrontmatterScalars(bom);
      expect(out).not.toBeNull();
      expect(() => parseDesignMd(out as string)).not.toThrow();
    });
  });

  describe("frontmatter recovery via parseDesignMd (malformed → repair → retry)", () => {
    it("recovers a malformed unquoted description and resolves the rest of the tokens", () => {
      const r = parseDesignMd(fm(`name: Supa\ndescription: clean and technical: minimal — green CTA\ncolors:\n  primary: "#3ecf8e"`));
      expect(r.name).toBe("Supa");
      expect(r.description).toBe("clean and technical: minimal — green CTA");
      expect(r.colors.primary).toBe("#3ecf8e");
    });
    it("still throws 'no YAML token frontmatter' on tokenless input (nothing to repair)", () => {
      expect(() => parseDesignMd("# Design System Inspired by X\n\nprose only")).toThrow(/no YAML token frontmatter/);
    });
    it("throws 'malformed YAML frontmatter:' when nothing top-level is repairable", () => {
      // `broken: [unclosed` starts with `[` → left as an intentional flow value → repair declines → original error.
      expect(() => parseDesignMd(`---\nbroken: [unclosed flow\n---\nbody`)).toThrow(/malformed YAML frontmatter: /);
    });
    it("throws 'recovery failed' when repair quotes a scalar but a second error remains", () => {
      const bad = `---\ndescription: risky: colon here\nbroken: [unclosed flow\n---\nbody`;
      expect(() => parseDesignMd(bad)).toThrow(/recovery failed/);
    });
    it("recovery NEVER triggers for valid frontmatter (initial parse succeeds first)", () => {
      const r = parseDesignMd(fm(`name: F\ncolors:\n  primary: "#0ABCD0"`));
      expect(r.colors.primary).toBe("#0ABCD0");
    });
    it("security: a malicious-looking description is double-quoted, not injected as YAML", () => {
      // The ": " would otherwise let "evil: true" read as a sibling key; quoting neutralizes it.
      const r = parseDesignMd(fm(`name: F\ndescription: harmless prose: evil: true\ncolors:\n  primary: "#0ABCD0"`));
      expect(typeof r.description).toBe("string");
      expect((r.tokens as any).evil).toBeUndefined();
      expect(r.colors.primary).toBe("#0ABCD0");
    });
  });

  describe("real getdesign fixtures (regression — captured from npx getdesign@latest add)", () => {
    const fxDir = path.join(__dirname, "fixtures");
    const spotify = fs.readFileSync(path.join(fxDir, "spotify-DESIGN.md"), "utf-8");
    const supabase = fs.readFileSync(path.join(fxDir, "supabase-DESIGN.md"), "utf-8");

    it("spotify (tokenless prose) throws 'no YAML token frontmatter'; repair declines", () => {
      expect(() => parseDesignMd(spotify)).toThrow(/no YAML token frontmatter/);
      expect(sanitizeFrontmatterScalars(spotify)).toBeNull();
    });

    it("supabase (malformed description) RECOVERS to fully-resolved, sRGB-valid tokens", () => {
      const r = parseDesignMd(supabase);
      // 27 colors, every one a valid sRGB hex — sRGB validation stayed strict through the repair.
      expect(Object.keys(r.colors).length).toBe(27);
      for (const v of Object.values(r.colors)) expect(SRGB_HEX.test(v as string)).toBe(true);
      // The description that broke js-yaml is recovered as a string.
      expect(typeof r.description).toBe("string");
      expect(r.description.length).toBeGreaterThan(100);
      // Invariant (Phase 2M): no unresolved {a.b.c} token references leak into the styled tokens
      // (the hyphen-ref fix resolved every {colors.on-primary}-style reference).
      expect(JSON.stringify(r.tokens)).not.toMatch(/\{[a-zA-Z0-9_][a-zA-Z0-9_.-]*\}/);
    });
  });
});
