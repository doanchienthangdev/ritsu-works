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

// @ts-ignore
const Frameworks = require("../../scripts/write/lib/frameworks.cjs");

describe("frameworks.cjs", () => {
  const doc = Frameworks.loadFrameworks();
  it("loads the real registry (100+ frameworks; grows via /write learn)", () => {
    // Base library was 100; /write learn appends net-new master-book formulas
    // (183 after the 14-book distill). Assert the floor + a clean, unique, non-empty set
    // rather than a brittle exact count that every /write learn run would re-break.
    const ids = Frameworks.listFrameworkIds(doc);
    expect(ids.length).toBeGreaterThanOrEqual(100);
    expect(new Set(ids).size).toBe(ids.length); // all unique
    expect(ids.every((id: string) => typeof id === "string" && id.length > 0)).toBe(true);
  });
  it("resolveFramework by id, case-insensitive; unknown → null", () => {
    expect(Frameworks.resolveFramework("pas", doc)?.family).toBe("copy");
    expect(Frameworks.resolveFramework("PAS", doc)?.id).toBe("pas");
    expect(Frameworks.resolveFramework("nope", doc)).toBeNull();
    expect(Frameworks.resolveFramework("", doc)).toBeNull();
  });
  it("every framework has structure + when_to_use + a non-empty applies_to_types (contract)", () => {
    for (const f of doc.frameworks) {
      expect(typeof f.structure).toBe("string");
      expect(f.structure.length).toBeGreaterThan(0);
      expect(typeof f.when_to_use).toBe("string");
      expect(Array.isArray(f.applies_to_types) && f.applies_to_types.length).toBeTruthy();
    }
  });
  it("frameworksForType returns rank-ordered matches for a type", () => {
    const forAd = Frameworks.frameworksForType("ad", doc);
    expect(forAd.length).toBeGreaterThan(0);
    expect(forAd.map((f: any) => f.id)).toContain("pas");
    // rank-ordered ascending
    const ranks = forAd.map((f: any) => f.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
  it("frameworksInFamily filters by family", () => {
    const learn = Frameworks.frameworksInFamily("learn", doc);
    expect(learn.length).toBeGreaterThan(0);
    expect(learn.every((f: any) => f.family === "learn")).toBe(true);
  });
  it("ids are unique", () => {
    const ids = Frameworks.listFrameworkIds(doc);
    expect(new Set(ids).size).toBe(ids.length);
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
  describe("main-root resolution (worktree fix — artifacts go to the MAIN repo .archives)", () => {
    it("mainRepoRoot() never contains the worktree marker", () => {
      expect(AP.mainRepoRoot()).not.toContain("/.claude/worktrees/");
      expect(AP.MAIN_ROOT).not.toContain("/.claude/worktrees/");
    });
    it("an absolute artifact dir lands under the MAIN root, not the worktree", () => {
      const d = AP.buildArtifactDir("2026-06-10", "x", { absolute: true });
      expect(d).not.toContain("/.claude/worktrees/");
      expect(d).toContain(".archives/write/");
    });
    it("strips only the worktree suffix (a non-worktree root is unchanged)", () => {
      // mainRepoRoot is pure over WORKTREE_ROOT; on a non-worktree checkout it's a no-op.
      // Invariant: MAIN_ROOT is a prefix of WORKTREE_ROOT (equal when not in a worktree).
      expect(AP.WORKTREE_ROOT.startsWith(AP.MAIN_ROOT)).toBe(true);
    });
    it("an explicit --out-dir-style repoRoot override is honored", () => {
      const d = AP.buildArtifactDir("2026-06-10", "x", { absolute: true, repoRoot: "/tmp/custom" });
      expect(d).toBe("/tmp/custom/.archives/write/2026-06-10-x");
    });
  });
});
