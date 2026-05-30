// resolver-plan v1.0 (Sprint 2) — catalog-loader enrichment exposure.
//
// Phase 1 analysis (subject: catalog-loader.parseEntry + loadCatalog):
//   - parseEntry: ADDITIVELY exposes 7 enrichment fields from the **Field:** map →
//     axis, hitl_tier, side_effect, authority, freshness, grounding, columns.
//   - Branches per field: present (set) | absent (omitted) | empty-string (omitted).
//   - Columns: inline-comma string → string[]; empty → omitted.
//   - Backward-compat: a pre-enrichment entry (no enrichment fields) keeps its
//     original shape (none of the 7 keys present).
//   - loadCatalog: enrichment survives the file walk onto the real recipients.
//
// Phase 2 edge cases mapped: empty value, whitespace value, single column, many
//   columns, columns with surrounding spaces, meta entry (axis only), content vs
//   capability shaping, an entry that declares NO enrichment at all.
//
// Skipped: security — parseEntry consumes Tier-1 generator-emitted markdown, not
//   user input (the generator is the trusted producer). // Skipped: security — trusted Tier-1 input.

import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const loader = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-loader.cjs"));

const HEADER = "## skill/foo";
function baseBody(extra: string[] = []): string[] {
  return [
    "",
    "**Kind:** skill",
    "**Axis:** capability",
    "**When to use:** A sufficiently long description of the skill.",
    "",
    "**Invoke:** `Skill({ skill: \"foo\" })`",
    ...extra,
    "",
    "**Role scope:** *",
    "**Status:** active",
  ];
}

describe("catalog-loader enrichment exposure (Sprint 2)", () => {
  beforeEach(() => loader.invalidateCache());

  describe("happy path — capability axis", () => {
    it("exposes axis, hitl_tier, side_effect for a capability entry", () => {
      const body = baseBody(["**HITL tier:** B", "**Side effect:** write"]);
      const r = loader.parseEntry(HEADER, body, "/fake.md");
      expect(r.axis).toBe("capability");
      expect(r.hitl_tier).toBe("B");
      expect(r.side_effect).toBe("write");
    });

    it("does NOT set content-axis fields on a capability entry", () => {
      const body = baseBody(["**HITL tier:** A", "**Side effect:** none"]);
      const r = loader.parseEntry(HEADER, body, "/fake.md");
      expect("authority" in r).toBe(false);
      expect("freshness" in r).toBe(false);
      expect("grounding" in r).toBe(false);
      expect("columns" in r).toBe(false);
    });
  });

  describe("happy path — content axis", () => {
    it("exposes authority, freshness, grounding for a content entry", () => {
      const header = "## page/x";
      const body = [
        "",
        "**Kind:** page",
        "**Axis:** content",
        "**When to use:** A page describing something canonical.",
        "**Invoke:** `Read(\"00-core/x.md\")`",
        "**Authority:** SoR",
        "**Freshness:** static",
        "**Grounding:** 00-core/x.md",
        "**Role scope:** *",
        "**Status:** active",
      ];
      const r = loader.parseEntry(header, body, "/fake.md");
      expect(r.axis).toBe("content");
      expect(r.authority).toBe("SoR");
      expect(r.freshness).toBe("static");
      expect(r.grounding).toBe("00-core/x.md");
      // content entry must not carry capability enrichment.
      expect("hitl_tier" in r).toBe(false);
      expect("side_effect" in r).toBe(false);
    });
  });

  describe("Columns — inline-comma → string[]", () => {
    function viewBody(columnsLine: string): string[] {
      return [
        "",
        "**Kind:** view",
        "**Axis:** content",
        "**When to use:** A view exposing modeled columns.",
        "**Invoke:** `mcp__supabase_ops__query({sql: \"SELECT * FROM v\"})`",
        "**Authority:** SoR",
        "**Freshness:** hourly",
        "**Grounding:** supabase/migrations/x.sql",
        columnsLine,
        "**Role scope:** *",
        "**Status:** active",
      ];
    }

    it("parses a multi-column inline list into a trimmed array", () => {
      const r = loader.parseEntry("## view/x", viewBody("**Columns:** day, role, spend_usd"), "/fake.md");
      expect(r.columns).toEqual(["day", "role", "spend_usd"]);
    });

    it("parses a single column into a 1-element array", () => {
      const r = loader.parseEntry("## view/x", viewBody("**Columns:** day"), "/fake.md");
      expect(r.columns).toEqual(["day"]);
    });

    it("trims surrounding whitespace and drops empties", () => {
      const r = loader.parseEntry("## view/x", viewBody("**Columns:**  a ,  b ,, c "), "/fake.md");
      expect(r.columns).toEqual(["a", "b", "c"]);
    });

    it("omits columns when the value is empty", () => {
      const r = loader.parseEntry("## view/x", viewBody("**Columns:**"), "/fake.md");
      expect("columns" in r).toBe(false);
    });
  });

  describe("absent / empty enrichment fields", () => {
    it("omits all enrichment keys when an entry declares none", () => {
      // A v2-era entry with zero enrichment fields → original shape preserved.
      const body = [
        "",
        "**Kind:** skill",
        "**When to use:** A legacy entry with no enrichment.",
        "**Invoke:** `Skill({ skill: \"foo\" })`",
        "**Role scope:** *",
        "**Status:** active",
      ];
      const r = loader.parseEntry(HEADER, body, "/fake.md");
      for (const k of ["axis", "hitl_tier", "side_effect", "authority", "freshness", "grounding", "columns"]) {
        expect(k in r).toBe(false);
      }
      // base fields intact (backward-compat).
      expect(r.id).toBe("skill/foo");
      expect(r.kind).toBe("skill");
      expect(r.status).toBe("active");
    });

    it("omits an enrichment field whose value is the empty string", () => {
      // "**Axis:**" with no value must NOT produce axis="".
      const body = [
        "",
        "**Kind:** skill",
        "**Axis:**",
        "**When to use:** Entry with an empty Axis value.",
        "**Invoke:** `Skill({ skill: \"foo\" })`",
        "**Role scope:** *",
        "**Status:** active",
      ];
      const r = loader.parseEntry(HEADER, body, "/fake.md");
      expect("axis" in r).toBe(false);
    });
  });

  describe("integration — real catalog", () => {
    it("surfaces enrichment on real active recipients across axes", () => {
      const cat = loader.loadCatalog({ skipCache: true });
      const skill = cat.recipients.find((r: any) => r.kind === "skill" && r.status === "active");
      const page = cat.recipients.find((r: any) => r.kind === "page" && r.status === "active");
      const meta = cat.recipients.find((r: any) => r.kind === "capability" && r.status === "active");

      // capability axis carries hitl_tier.
      expect(skill.axis).toBe("capability");
      expect(typeof skill.hitl_tier).toBe("string");

      // content axis carries authority + freshness.
      expect(page.axis).toBe("content");
      expect(typeof page.authority).toBe("string");
      expect(typeof page.freshness).toBe("string");

      // meta axis carries axis only.
      if (meta) {
        expect(meta.axis).toBe("meta");
        expect("hitl_tier" in meta).toBe(false);
        expect("authority" in meta).toBe(false);
      }
    });

    it("exposes columns as an array on at least one real view", () => {
      const cat = loader.loadCatalog({ skipCache: true });
      const viewWithCols = cat.recipients.find(
        (r: any) => r.kind === "view" && Array.isArray(r.columns) && r.columns.length > 0,
      );
      expect(viewWithCols).toBeDefined();
      expect(Array.isArray(viewWithCols.columns)).toBe(true);
      expect(viewWithCols.columns.every((c: unknown) => typeof c === "string")).toBe(true);
    });

    it("exports the enrichment label→key maps for shared use", () => {
      expect(loader.ENRICHMENT_SCALAR_FIELDS).toMatchObject({
        Axis: "axis",
        "HITL tier": "hitl_tier",
        "Side effect": "side_effect",
        Authority: "authority",
        Freshness: "freshness",
        Grounding: "grounding",
      });
      expect(loader.ENRICHMENT_LIST_FIELDS).toMatchObject({ Columns: "columns" });
    });
  });
});
