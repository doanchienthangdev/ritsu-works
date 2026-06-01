import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS
const {
  mimeForPath,
  toDataUri,
  findBrandAssets,
  resolveStyleLogo,
  MIME_BY_EXT,
} = require("../../scripts/design-system/style-asset.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Functions: mimeForPath, toDataUri,
//   findBrandAssets, resolveStyleLogo (capability deepask v1.1 logo-embed / bug fix).
// Phase 1: mimeForPath = ext→mime|null, non-string throws. toDataUri = read+base64,
//   unsupported-ext throws. findBrandAssets = no-dir(all null) | heuristic pick
//   (mark: mark>icon>favicon-png>any-png; logo: logo>mark; favicon: favicon>.ico>mark);
//   bad designMdPath throws; case-insensitive; ignores non-images. resolveStyleLogo =
//   plain/non-styled→null | no-assets→null | prefer mark vs logo | favicon data uri.
// Phase 2: injected fs (fileExists/readDir/readFileBuffer) → pure fixtures, no FS coupling.
// Skipped (pragmatic): security (paths from registry, not user), state (stateless),
//   network/dependency (none), regression (this IS the fix — see "regression" block).

// Fixture filesystem helpers.
function fakeFs(dirListing: string[], existing: string[] = []) {
  return {
    fileExists: (p: string) => existing.includes(p) || dirListing.length > 0 && p.endsWith("/assets"),
    readDir: (_p: string) => dirListing,
    readFileBuffer: (_p: string) => Buffer.from("PNGBYTES"),
  };
}

describe("mimeForPath", () => {
  it("maps known image extensions", () => {
    expect(mimeForPath("a/b/x.png")).toBe("image/png");
    expect(mimeForPath("x.JPG")).toBe("image/jpeg");
    expect(mimeForPath("x.svg")).toBe("image/svg+xml");
    expect(mimeForPath("favicon.ico")).toBe("image/x-icon");
    expect(mimeForPath("x.webp")).toBe("image/webp");
  });
  it("returns null for non-image extension", () => {
    expect(mimeForPath("notes.txt")).toBeNull();
    expect(mimeForPath("noext")).toBeNull();
  });
  it("throws on non-string", () => {
    expect(() => mimeForPath(123 as unknown as string)).toThrow(/must be a string/);
  });
  it("MIME_BY_EXT covers the documented set", () => {
    expect(Object.keys(MIME_BY_EXT)).toEqual(expect.arrayContaining([".png", ".svg", ".ico", ".webp", ".jpg", ".jpeg", ".gif"]));
  });
});

describe("toDataUri", () => {
  it("builds a data: URI from injected bytes", () => {
    const uri = toDataUri("/x/ritsu-mark.png", { readFileBuffer: () => Buffer.from("hello") });
    expect(uri).toBe(`data:image/png;base64,${Buffer.from("hello").toString("base64")}`);
  });
  it("handles .ico", () => {
    expect(toDataUri("/x/favicon.ico", { readFileBuffer: () => Buffer.from("IC") })).toMatch(/^data:image\/x-icon;base64,/);
  });
  it("accepts a non-Buffer (string) read result", () => {
    expect(toDataUri("/x/a.svg", { readFileBuffer: () => "<svg/>" })).toMatch(/^data:image\/svg\+xml;base64,/);
  });
  it("throws on unsupported extension", () => {
    expect(() => toDataUri("/x/readme.md", { readFileBuffer: () => Buffer.from("x") })).toThrow(/unsupported image extension/);
  });
});

describe("findBrandAssets", () => {
  const designMd = "/repo/00-core/design-system/ritsu/DESIGN.md";
  const opts = (listing: string[]) => ({
    fileExists: (_p: string) => true,
    readDir: (_p: string) => listing,
  });

  it("picks ritsu-mark.png as mark, ritsu-logo.png as logo, favicon.ico as favicon", () => {
    const a = findBrandAssets(designMd, opts(["ritsu-logo.png", "ritsu-mark.png", "favicon.ico"]));
    expect(a.mark.endsWith("/assets/ritsu-mark.png")).toBe(true);
    expect(a.logo.endsWith("/assets/ritsu-logo.png")).toBe(true);
    expect(a.favicon.endsWith("/assets/favicon.ico")).toBe(true);
    expect(a.assetsDir.endsWith("/ritsu/assets")).toBe(true);
  });

  it("logo falls back to mark when no *logo* file exists", () => {
    const a = findBrandAssets(designMd, opts(["brand-mark.svg", "favicon.ico"]));
    expect(a.mark.endsWith("brand-mark.svg")).toBe(true);
    expect(a.logo.endsWith("brand-mark.svg")).toBe(true); // fell back to mark
  });

  it("prefers a png/svg mark over the .ico favicon", () => {
    const a = findBrandAssets(designMd, opts(["icon-256.png", "favicon.ico"]));
    expect(a.mark.endsWith("icon-256.png")).toBe(true); // not the .ico
  });

  it("returns all-null when the assets dir is absent", () => {
    const a = findBrandAssets(designMd, { fileExists: () => false, readDir: () => [] });
    expect(a).toStrictEqual({ assetsDir: null, mark: null, logo: null, favicon: null, all: [] });
  });

  it("ignores non-image files", () => {
    const a = findBrandAssets(designMd, opts(["README.md", "tokens.json", "mark.png"]));
    expect(a.all.length).toBe(1);
    expect(a.mark.endsWith("mark.png")).toBe(true);
  });

  it("is case-insensitive on filename heuristics", () => {
    const a = findBrandAssets(designMd, opts(["Brand-LOGO.PNG"]));
    expect(a.logo.endsWith("Brand-LOGO.PNG")).toBe(true);
  });

  it("throws on empty designMdPath", () => {
    expect(() => findBrandAssets("", opts([]))).toThrow(/non-empty string/);
  });
});

describe("resolveStyleLogo", () => {
  const styled = {
    mode: "styled",
    designMdPath: "/repo/00-core/design-system/ritsu/DESIGN.md",
  };
  const fsOpts = {
    fileExists: () => true,
    readDir: () => ["ritsu-logo.png", "ritsu-mark.png", "favicon.ico"],
    readFileBuffer: () => Buffer.from("IMG"),
  };

  it("returns a data URI for the mark by default", () => {
    const r = resolveStyleLogo(styled, fsOpts);
    expect(r.kind).toBe("mark");
    expect(r.path.endsWith("ritsu-mark.png")).toBe(true);
    expect(r.dataUri).toMatch(/^data:image\/png;base64,/);
    expect(r.faviconDataUri).toMatch(/^data:image\/x-icon;base64,/);
  });

  it("prefer:'logo' returns the full logo", () => {
    const r = resolveStyleLogo(styled, { ...fsOpts, prefer: "logo" });
    expect(r.kind).toBe("logo");
    expect(r.path.endsWith("ritsu-logo.png")).toBe(true);
  });

  it("plain style → null (caller renders a CSS wordmark)", () => {
    expect(resolveStyleLogo({ mode: "plain", designMdPath: null }, fsOpts)).toBeNull();
  });

  it("needs-download / non-styled → null", () => {
    expect(resolveStyleLogo({ mode: "needs-download", designMdPath: null }, fsOpts)).toBeNull();
  });

  it("null / non-object resolved → null (no throw)", () => {
    expect(resolveStyleLogo(null)).toBeNull();
    expect(resolveStyleLogo(undefined)).toBeNull();
  });

  it("styled but no assets dir → null", () => {
    expect(resolveStyleLogo(styled, { fileExists: () => false, readDir: () => [] })).toBeNull();
  });

  describe("regression: --format=html --style=ritsu missing-logo / path bug (2026-06-01)", () => {
    it("returns an inline data URI (NOT a sibling file path) so the logo can never break on a path", () => {
      const r = resolveStyleLogo(styled, fsOpts);
      expect(r).not.toBeNull();
      expect(r.dataUri.startsWith("data:")).toBe(true); // self-contained — the fix
      expect(r.dataUri).not.toMatch(/\.png$/); // it is bytes, not a filename ref
    });
  });
});
