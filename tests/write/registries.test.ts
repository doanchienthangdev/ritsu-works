import { describe, it, expect } from "vitest";
// @ts-ignore
const Types = require("../../scripts/write/lib/types.cjs");
// @ts-ignore
const Authors = require("../../scripts/write/lib/authors.cjs");
// @ts-ignore
const Templates = require("../../scripts/write/lib/templates.cjs");
// @ts-ignore
const AP = require("../../scripts/write/lib/artifact-path.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Registry resolvers + artifact-path. These read the
// REAL committed registries (contract tests: the libs against the actual write-types/author-styles/
// write-templates yaml). Pure resolve functions are also tested over the loaded docs.

describe("types.cjs", () => {
  const doc = Types.loadTypes();
  it("loads the real registry with >= 20 types (founder requirement)", () => {
    expect(Types.listTypeIds(doc).length).toBeGreaterThanOrEqual(20);
  });
  describe("resolveType", () => {
    it("resolves by id", () => expect(Types.resolveType("blog", doc)?.id).toBe("blog"));
    it("resolves by alias", () => expect(Types.resolveType("blog-post", doc)?.id).toBe("blog"));
    it("is case-insensitive", () => expect(Types.resolveType("BLOG", doc)?.id).toBe("blog"));
    it("unknown → null", () => expect(Types.resolveType("nope", doc)).toBeNull());
    it("empty / null → null", () => {
      expect(Types.resolveType("", doc)).toBeNull();
      expect(Types.resolveType(null, doc)).toBeNull();
    });
  });
  describe("resolveMedium", () => {
    const blog = Types.resolveType("blog", doc);
    it("valid medium passes through (lowercased)", () => {
      const r = Types.resolveMedium(blog, "Substack");
      expect(r.medium).toBe("substack");
      expect(r.warnings).toEqual([]);
    });
    it("omitted medium → the type default", () => {
      expect(Types.resolveMedium(blog, undefined).medium).toBe(blog.default_medium);
    });
    it("unknown medium → default + warning", () => {
      const r = Types.resolveMedium(blog, "tiktok");
      expect(r.medium).toBe(blog.default_medium);
      expect(r.warnings[0]).toMatch(/not a known medium/);
    });
    it("no type → returns the requested medium verbatim, no warning", () => {
      expect(Types.resolveMedium(null, "anything").medium).toBe("anything");
    });
  });
  it("every type's default_medium is one of its mediums (contract)", () => {
    for (const t of doc.types) expect(t.mediums).toContain(t.default_medium);
  });
});

describe("authors.cjs", () => {
  const doc = Authors.loadAuthors();
  it("loads the real registry with seth-godin + david-ogilvy", () => {
    const slugs = Authors.listAuthorSlugs(doc);
    expect(slugs).toContain("seth-godin");
    expect(slugs).toContain("david-ogilvy");
  });
  it("resolveAuthor by slug, case-insensitive; unknown → null", () => {
    expect(Authors.resolveAuthor("seth-godin", doc)?.full_name).toBe("Seth Godin");
    expect(Authors.resolveAuthor("SETH-GODIN", doc)?.slug).toBe("seth-godin");
    expect(Authors.resolveAuthor("nobody", doc)).toBeNull();
  });
  it("authorArtifactPaths derives the 6 file paths under the author dir", () => {
    const p = Authors.authorArtifactPaths(Authors.resolveAuthor("seth-godin", doc));
    expect(p.style).toMatch(/seth-godin\/STYLE\.md$/);
    expect(p.voiceCard).toMatch(/voice-card\.md$/);
    expect(p.meta).toMatch(/meta\.yaml$/);
  });
  it("isInstalled is false for a non-existent author", () => {
    expect(Authors.isInstalled(null)).toBe(false);
  });
});

describe("templates.cjs", () => {
  const doc = Templates.loadTemplates();
  it("loads the real registry with >= 1 template", () => {
    expect(Templates.listTemplateIds(doc).length).toBeGreaterThanOrEqual(1);
  });
  it("resolves a registered id to an existing file", () => {
    const r = Templates.resolveTemplate("direct-response-ad", doc);
    expect(r?.source).toBe("registry");
    expect(r?.exists).toBe(true);
  });
  it("falls back to a direct path when id is unknown", () => {
    const r = Templates.resolveTemplate("06-ai-ops/write/templates/blog/listicle.md", doc);
    expect(r?.source).toBe("path");
    expect(r?.exists).toBe(true);
  });
  it("reports exists=false for a path that doesn't exist", () => {
    const r = Templates.resolveTemplate("nope/missing.md", doc);
    expect(r?.exists).toBe(false);
  });
  it("returns null when nothing requested", () => {
    expect(Templates.resolveTemplate("", doc)).toBeNull();
  });
  it("every registered template path exists on disk (contract)", () => {
    for (const t of doc.templates) {
      const r = Templates.resolveTemplate(t.id, doc);
      expect(r?.exists).toBe(true);
    }
  });
});

describe("artifact-path.cjs", () => {
  describe("deriveSlug", () => {
    it("kebab-cases plain text", () => {
      expect(AP.deriveSlug("Hello World Post")).toBe("hello-world-post");
    });
    it("strips Vietnamese diacritics", () => {
      expect(AP.deriveSlug("Viết bài blog về Purple Cow")).toBe("viet-bai-blog-ve-purple-cow");
    });
    it("collapses punctuation + emoji to dashes", () => {
      expect(AP.deriveSlug("Q3!! funnel 🔮 readout")).toBe("q3-funnel-readout");
    });
    it.each([undefined, null, "", "!!!", "🔮💀"])("empty/all-special %s → 'untitled'", (t) => {
      expect(AP.deriveSlug(t as any)).toBe("untitled");
    });
    it("truncates at a dash boundary within maxLen", () => {
      const s = AP.deriveSlug("one two three four five six seven eight nine ten", 20);
      expect(s.length).toBeLessThanOrEqual(20);
      expect(s.endsWith("-")).toBe(false);
    });
  });
  describe("buildArtifactDir", () => {
    it("builds .archives/write/<date>-<slug> (relative by default)", () => {
      expect(AP.buildArtifactDir("2026-06-10", "Launch post")).toBe(".archives/write/2026-06-10-launch-post");
    });
    it("absolute option joins the repo root", () => {
      const d = AP.buildArtifactDir("2026-06-10", "x", { absolute: true });
      expect(d).toMatch(/\.archives\/write\/2026-06-10-x$/);
      expect(d.startsWith("/")).toBe(true);
    });
  });
});
