// Resolver-plan v1.0 (Sprint 1) — kind→axis map test suite.
//
// Phase 1 analysis: axisForKind(kind) — 1 param (string), returns one of
// {content, capability, meta}, throws UnknownAxisKind on unknown kind.
// Branches: lookup hit (per bucket) / undefined → throw. The map MUST cover
// exactly VALID_KINDS (no gaps, no extras) so the catalog never has an
// un-classified entry. Deterministic static lookup — no I/O, no async.
//
// Contract boundary (2N): the axes set is consumed by enrichment.cjs +
// catalog-generator.cjs; the kind set is consumed by errors.cjs VALID_KINDS.

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const axisMap = cjsRequire(join(REPO, "scripts/resolver-v2/axis-map.cjs"));
const E = cjsRequire(join(REPO, "scripts/resolver-v2/errors.cjs"));

describe("axis-map.cjs", () => {
  describe("AXES (the closed set)", () => {
    it("is exactly the three axes content|capability|meta", () => {
      expect(axisMap.AXES).toEqual(["content", "capability", "meta"]);
    });

    it("is frozen (cannot be mutated)", () => {
      expect(Object.isFrozen(axisMap.AXES)).toBe(true);
    });
  });

  describe("KIND_TO_AXIS map completeness (contract with VALID_KINDS)", () => {
    it("maps EVERY VALID_KIND to exactly one axis", () => {
      for (const kind of E.VALID_KINDS) {
        const axis = axisMap.KIND_TO_AXIS[kind];
        expect(axis, `kind "${kind}" has no axis`).toBeDefined();
        expect(axisMap.AXES).toContain(axis);
      }
    });

    it("has no axis entry for a kind that is NOT a VALID_KIND (no extras)", () => {
      for (const kind of Object.keys(axisMap.KIND_TO_AXIS)) {
        expect(E.VALID_KINDS, `mapped kind "${kind}" missing from VALID_KINDS`).toContain(kind);
      }
    });

    it("covers all 16 VALID_KINDS (map size == VALID_KINDS size)", () => {
      expect(Object.keys(axisMap.KIND_TO_AXIS).length).toBe(E.VALID_KINDS.length);
    });

    it("is frozen", () => {
      expect(Object.isFrozen(axisMap.KIND_TO_AXIS)).toBe(true);
    });
  });

  describe("bucket membership matches the spec (refs/03-design-decisions.md)", () => {
    it("content kinds = page, view, metric, wiki, runbook, external-source", () => {
      const content = E.VALID_KINDS.filter((k: string) => axisMap.KIND_TO_AXIS[k] === "content");
      expect(content.sort()).toEqual(
        ["external-source", "metric", "page", "runbook", "view", "wiki"].sort()
      );
    });

    it("capability kinds = skill, command, agent, persona, mcp, sop, workflow, schedule, hook", () => {
      const capability = E.VALID_KINDS.filter((k: string) => axisMap.KIND_TO_AXIS[k] === "capability");
      expect(capability.sort()).toEqual(
        ["agent", "command", "hook", "mcp", "persona", "schedule", "skill", "sop", "workflow"].sort()
      );
    });

    it("meta kind = capability only", () => {
      const meta = E.VALID_KINDS.filter((k: string) => axisMap.KIND_TO_AXIS[k] === "meta");
      expect(meta).toEqual(["capability"]);
    });

    it("the three buckets are mutually exclusive and exhaustive (MECE)", () => {
      const all = [
        ...axisMap.CONTENT_KINDS,
        ...axisMap.CAPABILITY_KINDS,
        ...axisMap.META_KINDS,
      ];
      // No duplicates across buckets.
      expect(new Set(all).size).toBe(all.length);
      // Union == VALID_KINDS.
      expect(all.sort()).toEqual([...E.VALID_KINDS].sort());
    });
  });

  describe("axisForKind(kind) — happy path", () => {
    it("returns 'capability' for skill", () => {
      expect(axisMap.axisForKind("skill")).toBe("capability");
    });
    it("returns 'content' for page", () => {
      expect(axisMap.axisForKind("page")).toBe("content");
    });
    it("returns 'content' for view", () => {
      expect(axisMap.axisForKind("view")).toBe("content");
    });
    it("returns 'content' for metric", () => {
      expect(axisMap.axisForKind("metric")).toBe("content");
    });
    it("returns 'capability' for mcp", () => {
      expect(axisMap.axisForKind("mcp")).toBe("capability");
    });
    it("returns 'meta' for capability", () => {
      expect(axisMap.axisForKind("capability")).toBe("meta");
    });

    it("resolves every VALID_KIND without throwing", () => {
      for (const kind of E.VALID_KINDS) {
        expect(() => axisMap.axisForKind(kind)).not.toThrow();
      }
    });
  });

  describe("axisForKind(kind) — unknown kind throws", () => {
    it("throws UnknownAxisKind for a kind not in the map", () => {
      expect(() => axisMap.axisForKind("nonsense-kind")).toThrow(E.UnknownAxisKind);
    });

    it("error carries code UNKNOWN_AXIS_KIND and the offending kind", () => {
      try {
        axisMap.axisForKind("totally-not-a-kind");
        throw new Error("expected throw");
      } catch (err: any) {
        expect(err).toBeInstanceOf(E.UnknownAxisKind);
        expect(err.code).toBe("UNKNOWN_AXIS_KIND");
        expect(err.unknownKind).toBe("totally-not-a-kind");
        expect(err.message).toContain("totally-not-a-kind");
        expect(Array.isArray(err.mappedKinds)).toBe(true);
      }
    });

    // Boundary inputs — runtime nulls/empties can come from a corrupt entry, not just TS.
    it("throws on empty string", () => {
      expect(() => axisMap.axisForKind("")).toThrow(E.UnknownAxisKind);
    });
    it("throws on undefined", () => {
      expect(() => axisMap.axisForKind(undefined)).toThrow(E.UnknownAxisKind);
    });
    it("throws on null", () => {
      expect(() => axisMap.axisForKind(null)).toThrow(E.UnknownAxisKind);
    });
    it("is case-sensitive (Skill != skill) — throws on wrong case", () => {
      expect(() => axisMap.axisForKind("Skill")).toThrow(E.UnknownAxisKind);
    });
    it("throws on a kind with surrounding whitespace (no implicit trim)", () => {
      expect(() => axisMap.axisForKind(" skill ")).toThrow(E.UnknownAxisKind);
    });
  });
});
