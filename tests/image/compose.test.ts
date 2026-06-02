import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const { composePrompt, buildBrandBlock, buildGenreBlock, extractLogoPolicy } = require("../../scripts/image/lib/compose.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). image-platform v0.2 deterministic prompt
// composer (--style brand + --art-style genre). composePrompt / buildBrandBlock /
// buildGenreBlock. The resolveStyle/resolveArtStyle calls are real (contract test 2N:
// uses the actual `ritsu` design system + a real art-style id), so this exercises the
// genuine handoff — NOT hand-crafted mocks.
// Phase 1: style plain|styled|unknown(non-interactive throw→caught→plain+warn);
//   artStyle plain|styled|unknown; brand block (colors/typo present|absent, personality
//   cap + paren-strip); genre block (assets/layout/tone/...); assembly (prompt+blocks);
//   never-throws. Phase 2: empty/undefined prompt; null style; both axes; precedence note.
// Skipped: security (no injection surface — reads structured tokens); state (stateless pure).

describe("buildBrandBlock", () => {
  it("plain/null/empty resolved → '' (no brand block)", () => {
    expect(buildBrandBlock(null)).toBe("");
    expect(buildBrandBlock({ mode: "plain" })).toBe("");
    expect(buildBrandBlock({ mode: "styled", tokens: null })).toBe("");
  });
  it("synthetic styled tokens → palette + typography + precedence line", () => {
    const block = buildBrandBlock({
      mode: "styled", name: "acme",
      tokens: { colors: { primary: "#FF0000", background: "#FFFFFF", foreground: "#000000" }, typography: { display: "Inter" }, description: "Bold playful brand." },
    });
    expect(block).toMatch(/"acme"/);
    expect(block).toMatch(/#FF0000/);
    expect(block).toMatch(/Inter typography/);
    expect(block).toMatch(/Brand personality: Bold playful brand\./);
    expect(block).toMatch(/take precedence/);
  });
  it("missing colors/typography → falls back to 'its defined palette', never throws", () => {
    const block = buildBrandBlock({ mode: "styled", name: "bare", tokens: { colors: {}, typography: {} } });
    expect(block).toMatch(/its defined palette/);
  });
  it("strips a trailing parenthetical (e.g. a source path) from the personality", () => {
    const block = buildBrandBlock({
      mode: "styled", name: "x",
      tokens: { colors: { primary: "#111111" }, typography: {}, description: "Calm and precise (/Users/me/repo/theme)." },
    });
    expect(block).not.toMatch(/\/Users\//);
    expect(block).toMatch(/Calm and precise/);
  });
  it("caps an over-long personality at a word boundary with an ellipsis", () => {
    const long = "word ".repeat(80).trim();
    const block = buildBrandBlock({ mode: "styled", name: "x", tokens: { colors: { primary: "#111" }, typography: {}, description: long } });
    expect(block).toMatch(/…/);
  });
});

describe("buildGenreBlock", () => {
  it("plain/null → ''", () => {
    expect(buildGenreBlock(null)).toBe("");
    expect(buildGenreBlock({ mode: "plain" })).toBe("");
    expect(buildGenreBlock({ mode: "styled", genre: null })).toBe("");
  });
  it("styled genre → assets/layout/tone + the 'brand wins' note", () => {
    const block = buildGenreBlock({
      mode: "styled", name: "swiss",
      genre: { assets: "grids, thin rules", layout: "modular grid", tone: "rational", secondary_palette: "red accent" },
    });
    expect(block).toMatch(/"swiss"/);
    expect(block).toMatch(/draw: grids, thin rules/);
    expect(block).toMatch(/SECONDARY accent ONLY/);
    expect(block).toMatch(/brand palette above still wins/);
  });
  it("genre with no usable fields → ''", () => {
    expect(buildGenreBlock({ mode: "styled", name: "empty", genre: {} })).toBe("");
  });
});

describe("composePrompt (contract: real resolveStyle / resolveArtStyle)", () => {
  it("plain (no style/art-style) → prompt passes through unchanged, no warnings", () => {
    const r = composePrompt({ prompt: "a calm lake" });
    expect(r.prompt).toBe("a calm lake");
    expect(r.warnings).toEqual([]);
    expect(r.style.mode).toBe("plain");
    expect(r.artStyle.mode).toBe("plain");
  });
  it("--style=ritsu (real, installed) → styled, brand block appended, no warning", () => {
    const r = composePrompt({ prompt: "a calm lake", style: "ritsu" });
    expect(r.style.mode).toBe("styled");
    expect(r.style.name).toBe("ritsu");
    expect(r.warnings).toEqual([]);
    expect(r.prompt).toMatch(/a calm lake/);
    expect(r.prompt).toMatch(/brand design system/);
    expect(r.prompt).not.toMatch(/\/Users\//); // personality path stripped
  });
  it("unknown --style in non-interactive → plain + honest warning (never throws, AD-3)", () => {
    const r = composePrompt({ prompt: "x", style: "totally-not-a-real-system" });
    expect(r.style.mode).toBe("plain");
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0]).toMatch(/rendering plain/);
    expect(r.prompt).toBe("x"); // no brand block when plain
  });
  it("unknown --art-style → no genre + warning, never throws", () => {
    const r = composePrompt({ prompt: "x", artStyle: "not-a-genre" });
    expect(r.artStyle.mode).toBe("plain");
    expect(r.warnings.length).toBe(1);
  });
  it("empty / nullish prompt is tolerated (trims to the blocks or '')", () => {
    expect(composePrompt({ prompt: "" }).prompt).toBe("");
    expect(composePrompt({}).prompt).toBe("");
    expect(composePrompt({ prompt: null }).prompt).toBe("");
  });
  it("both axes (ritsu + a real genre) → both styled, both blocks present, brand before genre", () => {
    const r = composePrompt({ prompt: "hero", style: "ritsu", artStyle: "swiss-international" });
    expect(r.style.mode).toBe("styled");
    expect(r.artStyle.mode).toBe("styled");
    const brandIdx = r.prompt.indexOf("brand design system");
    const genreIdx = r.prompt.indexOf("Artistic genre");
    expect(brandIdx).toBeGreaterThan(-1);
    expect(genreIdx).toBeGreaterThan(brandIdx); // brand block precedes genre block
  });
});

// v0.3 — brand corner logo-overlay policy + hasRef-gated "draw no logo" directive.
describe("extractLogoPolicy", () => {
  it("null for a non-styled / missing resolution", () => {
    expect(extractLogoPolicy(null)).toBeNull();
    expect(extractLogoPolicy({ mode: "plain" })).toBeNull();
  });
  it("null when the design system declares no logo block", () => {
    // shape mirrors resolveStyle→parseDesignMd: tokens.tokens = full frontmatter
    expect(extractLogoPolicy({ mode: "styled", tokens: { tokens: { colors: {} } } })).toBeNull();
  });
  it("null when a logo block exists but overlay is not true", () => {
    expect(extractLogoPolicy({ mode: "styled", tokens: { tokens: { logo: { overlay: false, position: "top-left" } } } })).toBeNull();
  });
  it("returns the policy object when logo.overlay === true", () => {
    const pol = { overlay: true, position: "top-left", scale: 0.12, margin: 0.05 };
    expect(extractLogoPolicy({ mode: "styled", tokens: { tokens: { logo: pol } } })).toEqual(pol);
  });
  it("contract: the REAL ritsu design system declares an active top-left overlay policy", () => {
    // resolveStyle is exercised through composePrompt below; here assert the policy surfaces.
    const r = composePrompt({ prompt: "x", style: "ritsu", hasRef: true });
    expect(r.logoPolicy).toBeTruthy();
    expect(r.logoPolicy.overlay).toBe(true);
    expect(r.logoPolicy.position).toBe("top-left");
    expect(typeof r.logoPolicy.scale).toBe("number");
  });
});

describe("buildBrandBlock — logo overlay directive", () => {
  const styled = {
    mode: "styled", name: "ritsu",
    tokens: { colors: { primary: "#0ABCD0" }, typography: { display: "Inter" }, description: "Calm." },
  };
  it("with an overlay policy → emits the 'do NOT draw any logo, keep the corner clean' directive", () => {
    const block = buildBrandBlock(styled, { overlay: true, position: "top-left" });
    expect(block).toMatch(/Do NOT draw/);
    expect(block).toMatch(/top left corner/);
    expect(block).toMatch(/composited there separately/);
    expect(block).not.toMatch(/logo and typography take precedence/); // original line replaced
  });
  it("a non-top-left position is reflected in the directive text", () => {
    const block = buildBrandBlock(styled, { overlay: true, position: "bottom-right" });
    expect(block).toMatch(/bottom right corner/);
  });
  it("without a policy (null) → keeps the original 'logo … take precedence' line, no suppression", () => {
    const block = buildBrandBlock(styled, null);
    expect(block).toMatch(/logo and typography take precedence/);
    expect(block).not.toMatch(/Do NOT draw/);
  });
});

describe("composePrompt — overlay directive is gated on hasRef", () => {
  it("ritsu + hasRef:true → logoPolicy set, overlayWillApply, directive in the composed prompt", () => {
    const r = composePrompt({ prompt: "poster", style: "ritsu", hasRef: true });
    expect(r.logoPolicy).toBeTruthy();
    expect(r.overlayWillApply).toBe(true);
    expect(r.prompt).toMatch(/Do NOT draw/);
  });
  it("ritsu + hasRef:false (no ref) → policy still surfaced BUT no suppression directive (backward compatible)", () => {
    const r = composePrompt({ prompt: "poster", style: "ritsu", hasRef: false });
    expect(r.logoPolicy).toBeTruthy();      // policy still reported (for callers)
    expect(r.overlayWillApply).toBe(false);
    expect(r.prompt).not.toMatch(/Do NOT draw/);
    expect(r.prompt).toMatch(/take precedence/); // original line retained
  });
  it("default (no hasRef arg) behaves as hasRef:false", () => {
    const r = composePrompt({ prompt: "poster", style: "ritsu" });
    expect(r.overlayWillApply).toBe(false);
    expect(r.prompt).not.toMatch(/Do NOT draw/);
  });
});
