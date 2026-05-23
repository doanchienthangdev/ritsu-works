// Resolver v2 — catalog-loader test suite.
// Phase 1 analysis:
//   - parseEntry: 1 param, 8+ branches (required fields, list fields, scalar fields, error paths)
//   - parseFile: walks lines, detects entry boundaries
//   - loadCatalog: file walking, dedup, caching, mtime invalidation
//   - I/O: filesystem ops; dependency: js-yaml (frontmatter parser via require chain)
//
// Phase 2 edge cases:
//   - Strings: empty, malformed, unicode, very long
//   - Files: missing, empty, malformed, frozen, permission
//   - Cache: mtime drift, concurrent access, manual invalidate

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const loader = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-loader.cjs"));
const E = cjsRequire(join(REPO, "scripts/resolver-v2/errors.cjs"));

describe("catalog-loader.cjs", () => {
  beforeEach(() => loader.invalidateCache());

  describe("happy path", () => {
    it("loadCatalog returns recipients + indexes from real catalog", () => {
      const cat = loader.loadCatalog();
      expect(cat.totalCount).toBeGreaterThan(100);
      expect(cat.recipients).toBeInstanceOf(Array);
      expect(cat.byId).toBeInstanceOf(Map);
      expect(cat.byKind).toBeInstanceOf(Map);
      expect(cat.byKind.has("skill")).toBe(true);
      expect(cat.byKind.has("persona")).toBe(true);
      expect(typeof cat.loadedAt).toBe("number");
    });

    it("byId map contains known recipient", () => {
      const cat = loader.loadCatalog();
      const ctop = cat.byId.get("persona/cto");
      expect(ctop).toBeDefined();
      expect(ctop.kind).toBe("persona");
      expect(ctop.when_to_use.length).toBeGreaterThan(20);
    });

    it("byKind groups recipients by kind correctly", () => {
      const cat = loader.loadCatalog();
      const personas = cat.byKind.get("persona");
      expect(personas.every((r: any) => r.kind === "persona")).toBe(true);
    });
  });

  describe("parseEntry happy path", () => {
    it("parses minimal valid entry", () => {
      const header = "## skill/foo";
      const body = [
        "",
        "**Kind:** skill",
        "**When to use:** Test skill description.",
        "",
        "**Invoke:** `Skill({ skill: \"foo\" })`",
        "",
        "**Role scope:** *",
        "**Status:** active",
      ];
      const r = loader.parseEntry(header, body, "/fake.md");
      expect(r.id).toBe("skill/foo");
      expect(r.kind).toBe("skill");
      expect(r.when_to_use).toBe("Test skill description.");
      expect(r.invoke).toContain("Skill");
      expect(r.role_scope).toEqual(["*"]);
      expect(r.status).toBe("active");
    });

    it("parses entry with composes_with list", () => {
      const header = "## skill/bar";
      const body = [
        "**Kind:** skill",
        "**When to use:** Bar skill.",
        "**Invoke:** `bar`",
        "**Composes with:**",
        "- persona/cto",
        "- skill/baz",
        "**Role scope:** *",
        "**Status:** active",
      ];
      const r = loader.parseEntry(header, body, "/x.md");
      expect(r.composes_with).toEqual(["persona/cto", "skill/baz"]);
    });

    it("parses entry with inline aliases", () => {
      const header = "## persona/ceo";
      const body = [
        "**Kind:** persona",
        "**When to use:** CEO persona.",
        "**Invoke:** `/ceo`",
        "**Aliases:** Chief Executive Officer, the founder",
        "**Role scope:** *",
        "**Status:** active",
      ];
      const r = loader.parseEntry(header, body, "/x.md");
      expect(r.aliases).toEqual(["Chief Executive Officer", "the founder"]);
    });

    it("parses entry with disambiguator and pillar", () => {
      const header = "## skill/x";
      const body = [
        "**Kind:** skill",
        "**When to use:** Test.",
        "**Invoke:** `x`",
        "**Role scope:** founder, gps",
        "**Status:** active",
        "**Pillar:** 06-ai-ops",
        "**Disambiguator:** test purposes only",
      ];
      const r = loader.parseEntry(header, body, "/x.md");
      expect(r.role_scope).toEqual(["founder", "gps"]);
      expect(r.pillar).toBe("06-ai-ops");
      expect(r.disambiguator).toBe("test purposes only");
    });

    it("multi-line When to use is collected into single string", () => {
      const header = "## skill/multi";
      const body = [
        "**Kind:** skill",
        "**When to use:** First line of description.",
        "Second line continuation.",
        "Third line.",
        "**Invoke:** `x`",
        "**Status:** active",
      ];
      const r = loader.parseEntry(header, body, "/x.md");
      expect(r.when_to_use).toContain("First line");
      expect(r.when_to_use).toContain("Second line");
      expect(r.when_to_use).toContain("Third line");
    });
  });

  describe("parseEntry error paths", () => {
    it("throws MissingRequiredField if Kind absent", () => {
      const header = "## skill/x";
      const body = ["**When to use:** x", "**Invoke:** x", "**Status:** active"];
      expect(() => loader.parseEntry(header, body, "/x.md"))
        .toThrow(E.MissingRequiredField);
    });

    it("throws MissingRequiredField if When to use absent", () => {
      const header = "## skill/x";
      const body = ["**Kind:** skill", "**Invoke:** x", "**Status:** active"];
      expect(() => loader.parseEntry(header, body, "/x.md"))
        .toThrow(E.MissingRequiredField);
    });

    it("throws MissingRequiredField if Invoke absent", () => {
      const header = "## skill/x";
      const body = ["**Kind:** skill", "**When to use:** x", "**Status:** active"];
      expect(() => loader.parseEntry(header, body, "/x.md"))
        .toThrow(E.MissingRequiredField);
    });

    it("throws MissingRequiredField if Status absent", () => {
      const header = "## skill/x";
      const body = ["**Kind:** skill", "**When to use:** x", "**Invoke:** x"];
      expect(() => loader.parseEntry(header, body, "/x.md"))
        .toThrow(E.MissingRequiredField);
    });

    it("throws CatalogParseError on malformed header", () => {
      expect(() => loader.parseEntry("not a header", [], "/x.md"))
        .toThrow(E.CatalogParseError);
    });

    it("throws CatalogParseError on ID with whitespace", () => {
      expect(() => loader.parseEntry("## skill/has whitespace", [], "/x.md"))
        .toThrow(E.CatalogParseError);
    });
  });

  describe("parseFile happy path", () => {
    it("parses file with header + multiple entries", () => {
      const content = `# Recipient Catalog: skills

Some header text.

## skill/first

**Kind:** skill
**When to use:** First skill.
**Invoke:** \`first\`
**Status:** active

## skill/second

**Kind:** skill
**When to use:** Second skill.
**Invoke:** \`second\`
**Status:** active
`;
      const entries = loader.parseFile("/test.md", content);
      expect(entries.length).toBe(2);
      expect(entries[0].id).toBe("skill/first");
      expect(entries[1].id).toBe("skill/second");
    });

    it("returns empty array on file with no entries", () => {
      const content = "# Just header\n\nNo entries here.\n";
      expect(loader.parseFile("/x.md", content)).toEqual([]);
    });

    it("returns empty array on empty file", () => {
      expect(loader.parseFile("/x.md", "")).toEqual([]);
    });
  });

  describe("parseFile edge cases", () => {
    it("handles entry with unicode in description", () => {
      const content = `## skill/unicode

**Kind:** skill
**When to use:** Khách hàng — emoji 🎯 cũng được.
**Invoke:** \`x\`
**Status:** active
`;
      const entries = loader.parseFile("/x.md", content);
      expect(entries[0].when_to_use).toContain("Khách hàng");
      expect(entries[0].when_to_use).toContain("🎯");
    });

    it("handles very long description", () => {
      const longDesc = "Lorem ipsum ".repeat(500);
      const content = `## skill/long

**Kind:** skill
**When to use:** ${longDesc}
**Invoke:** \`x\`
**Status:** active
`;
      const entries = loader.parseFile("/x.md", content);
      expect(entries[0].when_to_use.length).toBeGreaterThan(1000);
    });

    it("rejects duplicate IDs within same file", () => {
      const content = `## skill/dup

**Kind:** skill
**When to use:** first
**Invoke:** \`x\`
**Status:** active

## skill/dup

**Kind:** skill
**When to use:** second
**Invoke:** \`y\`
**Status:** active
`;
      // parseFile doesn't dedup; loadCatalog does. parseFile returns both.
      const entries = loader.parseFile("/x.md", content);
      expect(entries.length).toBe(2);
    });
  });

  describe("loadCatalog with tmp directories", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(join(os.tmpdir(), "resolver-v2-test-"));
      loader.invalidateCache();
    });

    afterEach(() => {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_e) { /* */ }
    });

    it("throws CatalogDown if directory missing", () => {
      expect(() => loader.loadCatalog({ recipientsDir: "/nonexistent/path" }))
        .toThrow(E.CatalogDown);
    });

    it("loads single catalog file", () => {
      fs.writeFileSync(join(tmpDir, "skills.md"),
        `## skill/only
**Kind:** skill
**When to use:** Only skill.
**Invoke:** \`only\`
**Status:** active
`);
      const cat = loader.loadCatalog({ recipientsDir: tmpDir });
      expect(cat.totalCount).toBe(1);
      expect(cat.byId.get("skill/only")).toBeDefined();
    });

    it("merges multiple catalog files", () => {
      fs.writeFileSync(join(tmpDir, "skills.md"),
        `## skill/a
**Kind:** skill
**When to use:** A.
**Invoke:** \`a\`
**Status:** active
`);
      fs.writeFileSync(join(tmpDir, "commands.md"),
        `## command/b
**Kind:** command
**When to use:** B.
**Invoke:** \`/b\`
**Status:** active
`);
      const cat = loader.loadCatalog({ recipientsDir: tmpDir });
      expect(cat.totalCount).toBe(2);
      expect(cat.byKind.get("skill")?.length).toBe(1);
      expect(cat.byKind.get("command")?.length).toBe(1);
    });

    it("throws DuplicateRecipientId on cross-file dup", () => {
      fs.writeFileSync(join(tmpDir, "skills.md"),
        `## skill/dup
**Kind:** skill
**When to use:** first
**Invoke:** \`x\`
**Status:** active
`);
      fs.writeFileSync(join(tmpDir, "commands.md"),
        `## skill/dup
**Kind:** skill
**When to use:** second
**Invoke:** \`y\`
**Status:** active
`);
      expect(() => loader.loadCatalog({ recipientsDir: tmpDir }))
        .toThrow(E.DuplicateRecipientId);
    });

    it("missing optional catalog file is not error", () => {
      // Only write skills.md; commands.md/agents.md/personas.md/mcps.md absent
      fs.writeFileSync(join(tmpDir, "skills.md"),
        `## skill/x
**Kind:** skill
**When to use:** x
**Invoke:** \`x\`
**Status:** active
`);
      const cat = loader.loadCatalog({ recipientsDir: tmpDir });
      expect(cat.totalCount).toBe(1); // soft-skip missing files
    });

    it("cache returns same object on repeat load with no mtime change", () => {
      fs.writeFileSync(join(tmpDir, "skills.md"),
        `## skill/x
**Kind:** skill
**When to use:** x
**Invoke:** \`x\`
**Status:** active
`);
      const cat1 = loader.loadCatalog({ recipientsDir: tmpDir });
      const cat2 = loader.loadCatalog({ recipientsDir: tmpDir });
      expect(cat1).toBe(cat2); // same reference
    });

    it("cache invalidates on mtime change", async () => {
      const fp = join(tmpDir, "skills.md");
      fs.writeFileSync(fp,
        `## skill/x
**Kind:** skill
**When to use:** x
**Invoke:** \`x\`
**Status:** active
`);
      const cat1 = loader.loadCatalog({ recipientsDir: tmpDir });
      // Wait + touch to ensure mtime difference
      await new Promise(r => setTimeout(r, 50));
      fs.writeFileSync(fp,
        `## skill/y
**Kind:** skill
**When to use:** y
**Invoke:** \`y\`
**Status:** active
`);
      const cat2 = loader.loadCatalog({ recipientsDir: tmpDir });
      expect(cat2.byId.has("skill/y")).toBe(true);
      expect(cat2.byId.has("skill/x")).toBe(false);
    });

    it("skipCache forces fresh load", () => {
      fs.writeFileSync(join(tmpDir, "skills.md"),
        `## skill/x
**Kind:** skill
**When to use:** x
**Invoke:** \`x\`
**Status:** active
`);
      const cat1 = loader.loadCatalog({ recipientsDir: tmpDir });
      const cat2 = loader.loadCatalog({ recipientsDir: tmpDir, skipCache: true });
      expect(cat1).not.toBe(cat2);
      expect(cat1.totalCount).toBe(cat2.totalCount);
    });

    it("malformed entry throws CatalogParseError or MissingRequiredField", () => {
      fs.writeFileSync(join(tmpDir, "skills.md"),
        `## skill/broken
**Kind:** skill
(missing required When to use)
**Invoke:** \`x\`
**Status:** active
`);
      expect(() => loader.loadCatalog({ recipientsDir: tmpDir, skipCache: true }))
        .toThrow();
    });
  });

  describe("constants", () => {
    it("CATALOG_FILES lists all 5 kinds", () => {
      expect(loader.CATALOG_FILES).toEqual([
        "skills.md", "commands.md", "agents.md", "personas.md", "mcps.md",
      ]);
    });

    it("REQUIRED_FIELDS includes Kind, When to use, Invoke, Status", () => {
      expect(loader.REQUIRED_FIELDS).toContain("Kind");
      expect(loader.REQUIRED_FIELDS).toContain("When to use");
      expect(loader.REQUIRED_FIELDS).toContain("Invoke");
      expect(loader.REQUIRED_FIELDS).toContain("Status");
    });
  });
});
