// Resolver v2 — catalog-generator test suite.
// Phase 1 analysis: generators walk source frontmatter → emit MDX entries

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const gen = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-generator.cjs"));

describe("catalog-generator.cjs", () => {
  describe("parseFrontmatter", () => {
    it("extracts frontmatter from markdown with --- delimiter", () => {
      const md = "---\nname: foo\nstatus: active\n---\n\n# Body";
      const result = gen.parseFrontmatter(md);
      expect(result.frontmatter.name).toBe("foo");
      expect(result.frontmatter.status).toBe("active");
      expect(result.body).toContain("# Body");
    });

    it("returns empty frontmatter for content without delimiter", () => {
      const result = gen.parseFrontmatter("# Just a heading\n\nNo frontmatter.");
      expect(result.frontmatter).toEqual({});
    });

    it("handles malformed YAML in frontmatter gracefully", () => {
      const md = "---\nname: [unclosed\n---\nBody";
      const result = gen.parseFrontmatter(md);
      expect(result.frontmatter).toEqual({});
      expect(result.body).toContain("Body");
    });
  });

  describe("emitEntry", () => {
    it("emits valid catalog entry structure", () => {
      const out = gen.emitEntry({
        id: "skill/test",
        kind: "skill",
        when_to_use: "Test description.",
        invoke: "`Skill({skill:'test'})`",
        composes_with: [],
        role_scope: ["*"],
        status: "active",
      });
      expect(out).toContain("## skill/test");
      expect(out).toContain("**Kind:** skill");
      expect(out).toContain("**When to use:** Test description.");
      expect(out).toContain("**Invoke:** `Skill({skill:'test'})`");
      expect(out).toContain("**Role scope:** *");
      expect(out).toContain("**Status:** active");
    });

    it("emits composes_with list when present", () => {
      const out = gen.emitEntry({
        id: "skill/x",
        kind: "skill",
        when_to_use: "x",
        invoke: "x",
        composes_with: ["persona/cto", "mcp/foo"],
        role_scope: ["*"],
        status: "active",
      });
      expect(out).toContain("**Composes with:**");
      expect(out).toContain("- persona/cto");
      expect(out).toContain("- mcp/foo");
    });

    it("emits aliases when present", () => {
      const out = gen.emitEntry({
        id: "persona/ceo",
        kind: "persona",
        when_to_use: "x",
        invoke: "x",
        role_scope: ["*"],
        status: "active",
        aliases: ["CEO", "Chief Executive Officer"],
      });
      expect(out).toContain("**Aliases:** CEO, Chief Executive Officer");
    });

    it("emits pillar when present", () => {
      const out = gen.emitEntry({
        id: "skill/x",
        kind: "skill",
        when_to_use: "x", invoke: "x",
        role_scope: ["*"], status: "active",
        pillar: "06-ai-ops",
      });
      expect(out).toContain("**Pillar:** 06-ai-ops");
    });

    it("emits disambiguator when present", () => {
      const out = gen.emitEntry({
        id: "skill/x",
        kind: "skill",
        when_to_use: "x", invoke: "x",
        role_scope: ["*"], status: "active",
        disambiguator: "test only",
      });
      expect(out).toContain("**Disambiguator:** test only");
    });

    it("multiple comma-separated roles in role_scope", () => {
      const out = gen.emitEntry({
        id: "skill/x",
        kind: "skill",
        when_to_use: "x", invoke: "x",
        role_scope: ["founder", "cofounder", "gps"],
        status: "active",
      });
      expect(out).toContain("**Role scope:** founder, cofounder, gps");
    });
  });

  describe("generators (smoke)", () => {
    it("generateSkills returns non-empty array", () => {
      const skills = gen.generateSkills();
      expect(skills.length).toBeGreaterThan(0);
      expect(skills[0].id).toMatch(/^skill\//);
    });

    it("generateCommands returns non-empty array", () => {
      const cmds = gen.generateCommands();
      expect(cmds.length).toBeGreaterThan(0);
      expect(cmds[0].id).toMatch(/^command\//);
    });

    it("generateAgents returns non-empty array", () => {
      const agents = gen.generateAgents();
      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].id).toMatch(/^agent\//);
    });

    it("generatePersonas returns non-empty array (workforce + cla routing)", () => {
      const personas = gen.generatePersonas();
      expect(personas.length).toBeGreaterThan(0);
      expect(personas.every((p: any) => p.id.startsWith("persona/"))).toBe(true);
    });

    it("generateMcps returns non-empty array", () => {
      const mcps = gen.generateMcps();
      expect(mcps.length).toBeGreaterThan(0);
      expect(mcps.every((m: any) => m.id.startsWith("mcp/"))).toBe(true);
    });

    it("all generators produce entries with required fields", () => {
      const all = [
        ...gen.generateSkills(),
        ...gen.generateCommands(),
        ...gen.generateAgents(),
        ...gen.generatePersonas(),
        ...gen.generateMcps(),
      ];
      for (const r of all) {
        expect(r.id).toBeDefined();
        expect(r.kind).toBeDefined();
        expect(r.when_to_use).toBeDefined();
        expect(r.invoke).toBeDefined();
        expect(r.status).toBeDefined();
      }
    });

    it("generated entries sort alphabetically by ID", () => {
      const skills = gen.generateSkills();
      const ids = skills.map((s: any) => s.id);
      const sorted = [...ids].sort();
      expect(ids).toEqual(sorted);
    });
  });
});
