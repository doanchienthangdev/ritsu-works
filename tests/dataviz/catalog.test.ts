import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
// @ts-ignore — CJS interop
const C = require("../../scripts/dataviz/lib/catalog.cjs");
// @ts-ignore
const T = require("../../scripts/dataviz/lib/taxonomy.cjs");
// @ts-ignore
const { OUT } = require("../../scripts/dataviz/gen-catalog.cjs");

// ============================================================================
// All-Edge-Cases-Test. Units: scripts/dataviz/lib/catalog.cjs (buildCatalog /
// renderCatalogMarkdown / shapeHint, PURE) + the gen-catalog drift guard.
//
// Phase 1: catalog.cjs — 3 exported fns (buildCatalog, renderCatalogMarkdown,
//   shapeHint) + FAMILY_GUIDE/GENERATED_MARKER. No branches with user input
//   beyond shapeHint(needs). Deterministic (no Date.now/Math.random) → byte-stable.
// Phase 1D: data transform (taxonomy → catalog rows + markdown) → invariant +
//   contract tests (the catalog MUST be the BUILT set; the on-disk file MUST equal
//   the generator output — the drift guard).
// ============================================================================

describe("dataviz catalog.cjs — the LLM-native selection substrate", () => {
  describe("buildCatalog()", () => {
    const rows = C.buildCatalog();

    it("returns exactly one row per BUILT chart type (contract with taxonomy)", () => {
      expect(rows.length).toBe(T.BUILT.length);
      expect(rows.length).toBe(60);
      const ids = rows.map((r: any) => r.type).sort();
      expect(ids).toEqual([...T.BUILT].sort());
    });

    it("every row carries type, a known family, a known stance, and a non-empty when", () => {
      const fams = new Set(T.FAMILIES);
      const stances = new Set(Object.values(T.STANCE));
      for (const r of rows) {
        expect(typeof r.type).toBe("string");
        expect(r.type.length).toBeGreaterThan(0);
        expect(fams.has(r.family)).toBe(true);
        expect(stances.has(r.stance)).toBe(true);
        expect(typeof r.when).toBe("string");
        expect(r.when.length).toBeGreaterThan(0); // every built type explains when to use it
        expect(Array.isArray(r.aka)).toBe(true);
        expect(Array.isArray(r.intents)).toBe(true);
      }
    });

    it("contains NO cataloged-not-built type (e.g. choropleth, gauge, euler)", () => {
      const ids = new Set(rows.map((r: any) => r.type));
      for (const cat of ["choropleth", "geo-heatmap", "contour", "euler", "gauge", "nightingale"]) {
        expect(ids.has(cat)).toBe(false);
      }
    });

    it("is byte-stable (two calls deep-equal)", () => {
      expect(C.buildCatalog()).toEqual(C.buildCatalog());
    });
  });

  describe("shapeHint()", () => {
    it("renders a measures need (scatter → '2 measures')", () => {
      expect(C.shapeHint(T.meta("scatter"))).toContain("2 measures");
    });
    it("renders a series need (grouped → '≥2 series')", () => {
      expect(C.shapeHint(T.meta("grouped"))).toContain("series");
    });
    it("renders a target need (bullet → 'a target value')", () => {
      expect(C.shapeHint(T.meta("bullet"))).toContain("target");
    });
    it("returns '' for a type with no needs (bar)", () => {
      expect(C.shapeHint(T.meta("bar"))).toBe("");
    });
    // edge cases — must never throw on degenerate input
    it("returns '' for null / undefined / {} without throwing", () => {
      expect(C.shapeHint(null)).toBe("");
      expect(C.shapeHint(undefined)).toBe("");
      expect(C.shapeHint({})).toBe("");
      expect(C.shapeHint({ needs: null })).toBe("");
    });
  });

  describe("FAMILY_GUIDE", () => {
    it("has a non-empty guide line for every taxonomy family", () => {
      for (const fam of T.FAMILIES) {
        expect(typeof C.FAMILY_GUIDE[fam]).toBe("string");
        expect(C.FAMILY_GUIDE[fam].length).toBeGreaterThan(0);
      }
    });
  });

  describe("renderCatalogMarkdown()", () => {
    const md = C.renderCatalogMarkdown();

    it("starts with the generated marker (so it is never hand-edited silently)", () => {
      expect(md.startsWith(C.GENERATED_MARKER)).toBe(true);
    });

    it("mentions every one of the 60 built types as inline code", () => {
      const missing = T.BUILT.filter((t: string) => !md.includes("`" + t + "`"));
      expect(missing).toEqual([]);
    });

    it("renders a section header for every non-empty family", () => {
      for (const fam of T.FAMILIES) {
        const has = T.BUILT.some((t: string) => T.familyOf(t) === fam);
        if (has) expect(md).toContain(`## ${fam}`);
      }
    });

    it("documents the cataloged non-goal boundary (anti-McKinsey + infeasible)", () => {
      expect(md).toContain("Not built (cataloged)");
      expect(md).toContain("anti-McKinsey");
      for (const cat of ["choropleth", "contour", "euler", "gauge"]) {
        expect(md).toContain(cat);
      }
    });

    it("teaches the LLM-native protocol (--selected-by=agent) and Zelazny", () => {
      expect(md).toContain("--selected-by=agent");
      expect(md).toContain("MESSAGE");
      expect(md.toLowerCase()).toContain("zelazny");
    });

    it("includes a multilingual worked example (the regex-miss motivation)", () => {
      expect(md).toContain("Reddit dẫn đầu");
    });

    it("is byte-stable (two calls identical string)", () => {
      expect(C.renderCatalogMarkdown()).toBe(C.renderCatalogMarkdown());
    });
  });

  describe("drift guard — the on-disk catalog.md is in sync with the generator", () => {
    it("06-ai-ops/skills/dataviz/catalog.md byte-equals renderCatalogMarkdown()", () => {
      // Regenerate with: node scripts/dataviz/gen-catalog.cjs
      expect(fs.existsSync(OUT)).toBe(true);
      const onDisk = fs.readFileSync(OUT, "utf8");
      expect(onDisk).toBe(C.renderCatalogMarkdown());
    });

    it("OUT resolves under 06-ai-ops/skills/dataviz/", () => {
      expect(OUT.replace(/\\/g, "/")).toContain("06-ai-ops/skills/dataviz/catalog.md");
      expect(path.basename(OUT)).toBe("catalog.md");
    });
  });
});
