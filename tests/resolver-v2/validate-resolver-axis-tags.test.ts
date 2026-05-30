// resolver-plan v1.0 (Sprint 2) — validate-resolver-axis-tags.cjs.
//
// Phase 1 analysis (subject: checkEntry / checkCatalog — pure functions):
//   - checkEntry(r): 1 param. Branches: missing axis | invalid axis value |
//     unmapped kind | axis != axisForKind(kind) | capability missing hitl_tier |
//     capability invalid hitl_tier | capability invalid side_effect |
//     content missing authority | content missing freshness | content invalid
//     authority | content invalid freshness | meta (axis only). 12 branches.
//   - checkCatalog(catalog): iterates recipients, SKIPS status != 'active',
//     aggregates checkEntry violations. Branch: active vs non-active.
//   - Deps: axisForKind (axis-map), enrichment constant sets. No I/O in the pure
//     functions (the main() path loads the real catalog; tested via "clean catalog"
//     contract below using the real loader, not mtime).
//
// Phase 2 edge values mapped: each axis, each invalid enrichment value, the exact
//   boundary that flips a pass→fail (drop ONE required field), and a clean entry of
//   every axis. Content-compare: the clean-catalog test calls the REAL loadCatalog
//   (no statSync / mtime anywhere).
//
// Contract test (2N): checkCatalog consumes catalog-loader.loadCatalog() output
//   directly — real upstream, not a hand-built mock.

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const validator = cjsRequire(join(REPO, "scripts/cross-tier/validate-resolver-axis-tags.cjs"));
const loader = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-loader.cjs"));
const { checkEntry, checkCatalog } = validator;

// Minimal clean entries per axis (the generator's real output shape).
const cleanCapability = { id: "skill/x", kind: "skill", axis: "capability", hitl_tier: "B", side_effect: "write", status: "active" };
const cleanContent = { id: "page/x", kind: "page", axis: "content", authority: "SoR", freshness: "static", status: "active" };
const cleanMeta = { id: "capability/x", kind: "capability", axis: "meta", status: "active" };

describe("validate-resolver-axis-tags — checkEntry", () => {
  describe("clean entries (no violations)", () => {
    it("passes a clean capability entry", () => {
      expect(checkEntry(cleanCapability)).toEqual([]);
    });
    it("passes a clean content entry", () => {
      expect(checkEntry(cleanContent)).toEqual([]);
    });
    it("passes a clean meta entry (axis only)", () => {
      expect(checkEntry(cleanMeta)).toEqual([]);
    });
  });

  describe("missing / invalid axis", () => {
    it("flags a missing Axis and reports the expected axis", () => {
      const v = checkEntry({ id: "skill/x", kind: "skill", status: "active" });
      expect(v.length).toBe(1);
      expect(v[0]).toContain("missing Axis");
      expect(v[0]).toContain("capability"); // expected axis for a skill
    });

    it("flags an invalid Axis value", () => {
      const v = checkEntry({ id: "skill/x", kind: "skill", axis: "bogus", status: "active" });
      expect(v.length).toBe(1);
      expect(v[0]).toContain('invalid Axis "bogus"');
    });

    it("flags an axis that disagrees with the kind→axis map", () => {
      // skill is capability; tagging it content is the classic mis-classification.
      const v = checkEntry({ id: "skill/x", kind: "skill", axis: "content", status: "active" });
      expect(v.some((m: string) => m.includes('Axis "content" != expected "capability"'))).toBe(true);
    });
  });

  describe("capability-axis enrichment", () => {
    it("flags a capability entry missing HITL tier", () => {
      const v = checkEntry({ id: "skill/x", kind: "skill", axis: "capability", status: "active" });
      expect(v.some((m: string) => m.includes('missing "HITL tier"'))).toBe(true);
    });

    it("flags an invalid HITL tier value", () => {
      const v = checkEntry({ id: "skill/x", kind: "skill", axis: "capability", hitl_tier: "Z", status: "active" });
      expect(v.some((m: string) => m.includes('invalid HITL tier "Z"'))).toBe(true);
    });

    it("flags an invalid Side effect value when present", () => {
      const v = checkEntry({ id: "skill/x", kind: "skill", axis: "capability", hitl_tier: "B", side_effect: "explode", status: "active" });
      expect(v.some((m: string) => m.includes('invalid Side effect "explode"'))).toBe(true);
    });

    it("accepts a capability entry with a valid D-Std tier and no side_effect", () => {
      const v = checkEntry({ id: "command/x", kind: "command", axis: "capability", hitl_tier: "D-Std", status: "active" });
      expect(v).toEqual([]);
    });
  });

  describe("content-axis enrichment", () => {
    it("flags a content entry missing Authority", () => {
      const v = checkEntry({ id: "page/x", kind: "page", axis: "content", freshness: "static", status: "active" });
      expect(v.some((m: string) => m.includes('missing "Authority"'))).toBe(true);
    });

    it("flags a content entry missing Freshness", () => {
      const v = checkEntry({ id: "page/x", kind: "page", axis: "content", authority: "SoR", status: "active" });
      expect(v.some((m: string) => m.includes('missing "Freshness"'))).toBe(true);
    });

    it("flags invalid Authority and invalid Freshness values together", () => {
      const v = checkEntry({ id: "page/x", kind: "page", axis: "content", authority: "nope", freshness: "soon", status: "active" });
      expect(v.some((m: string) => m.includes('invalid Authority "nope"'))).toBe(true);
      expect(v.some((m: string) => m.includes('invalid Freshness "soon"'))).toBe(true);
    });
  });
});

describe("validate-resolver-axis-tags — checkCatalog", () => {
  it("returns no violations for an all-clean catalog and counts checked", () => {
    const cat = { recipients: [cleanCapability, cleanContent, cleanMeta] };
    const { violations, checked } = checkCatalog(cat);
    expect(violations).toEqual([]);
    expect(checked).toBe(3);
  });

  it("SKIPS non-active entries (stub/deprecated not checked)", () => {
    const cat = {
      recipients: [
        cleanCapability,
        { id: "skill/broken", kind: "skill", status: "stub" }, // no axis, but stub → skipped
        { id: "page/dep", kind: "page", axis: "content", status: "deprecated" }, // missing auth/fresh, but deprecated → skipped
      ],
    };
    const { violations, checked } = checkCatalog(cat);
    expect(violations).toEqual([]);
    expect(checked).toBe(1); // only the active capability was checked
  });

  it("catches a single corrupted entry amid clean ones", () => {
    const cat = {
      recipients: [
        cleanCapability,
        { id: "page/bad", kind: "page", axis: "content", status: "active" }, // missing auth+fresh
        cleanMeta,
      ],
    };
    const { violations, checked } = checkCatalog(cat);
    expect(checked).toBe(3);
    expect(violations.length).toBe(2); // missing Authority + missing Freshness
    expect(violations.every((m: string) => m.startsWith("page/bad:"))).toBe(true);
  });
});

describe("validate-resolver-axis-tags — contract with real catalog (content-compare)", () => {
  it("passes the REAL loaded catalog (Sprint 1 enrichment is complete)", () => {
    // This is the content-compare assertion: load + parse the actual catalog and
    // check axis correctness against the in-memory axis-map. No mtime is consulted.
    const cat = loader.loadCatalog({ skipCache: true });
    const { violations, checked } = checkCatalog(cat);
    expect(checked).toBeGreaterThan(100); // hundreds of active recipients
    expect(violations).toEqual([]);
  });
});
