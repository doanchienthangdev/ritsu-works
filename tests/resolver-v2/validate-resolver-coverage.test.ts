// resolver-plan v1.0 (Sprint 2) — validate-resolver-v2-coverage.cjs extension to
// all 16 kinds (still WARN; promotion to CRITICAL is Sprint 4).
//
// Phase 1 analysis (subject: expectedIds(generators), GENERATORS):
//   - GENERATORS: the 16 per-kind generate* functions (was 5 pre-Sprint-2).
//   - expectedIds(generators?): aggregates r.id from each generator into a Set.
//     Branch: a generator that THROWS (source dir absent in this checkout) is
//     caught and skipped (coverage is warn-only → must not hard-fail).
//   - Deps: catalog-generator's source walks (filesystem). Tested against the real
//     tree (content-compare: id-set diff, never mtime).
//
// Phase 2 mapped: the 11 NEW kinds are present in the expected-set; a generator
//   that throws is tolerated; the expected-set is a superset of the previous
//   5-kind set; the real catalog ids are all accounted for (the validator's PASS
//   condition) so the future CRITICAL promotion won't false-fail.

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const coverage = cjsRequire(join(REPO, "scripts/cross-tier/validate-resolver-v2-coverage.cjs"));
const loader = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-loader.cjs"));
const { expectedIds, GENERATORS } = coverage;

// The 5 kinds the validator covered BEFORE Sprint 2.
const PRE_SPRINT2_KINDS = ["skill", "command", "agent", "persona", "mcp"];
// The 11 kinds added in Sprint 2 (workflow has no source tree yet → 0 entries, but
// its generator is still wired so a future workflow source is covered automatically).
const NEW_KINDS = [
  "wiki", "sop", "capability", "schedule", "hook",
  "page", "view", "metric", "runbook", "external-source",
];

function kindOf(id: string): string {
  return id.split("/")[0];
}

describe("validate-resolver-v2-coverage — 16-kind expected-set (Sprint 2)", () => {
  it("wires all 16 per-kind generators", () => {
    expect(Array.isArray(GENERATORS)).toBe(true);
    expect(GENERATORS.length).toBe(16);
    expect(GENERATORS.every((g: unknown) => typeof g === "function")).toBe(true);
  });

  it("expected-set still includes the original 5 kinds", () => {
    const kinds = new Set([...expectedIds()].map(kindOf));
    for (const k of PRE_SPRINT2_KINDS) {
      expect(kinds.has(k)).toBe(true);
    }
  });

  it("expected-set now ALSO includes the 11 new kinds present in the source tree", () => {
    const kinds = new Set([...expectedIds()].map(kindOf));
    for (const k of NEW_KINDS) {
      // Each of these has at least one real source in the repo today.
      expect(kinds.has(k)).toBe(true);
    }
  });

  it("expected-set is a strict superset of the pre-Sprint-2 (5-generator) set", () => {
    const fiveGen = GENERATORS.slice(0, 5);
    const fiveSet = expectedIds(fiveGen);
    const fullSet = expectedIds();
    expect(fullSet.size).toBeGreaterThan(fiveSet.size);
    for (const id of fiveSet) {
      expect(fullSet.has(id)).toBe(true);
    }
  });

  it("tolerates a generator that throws (warn-only must not hard-fail)", () => {
    const throwing = () => {
      throw new Error("source dir missing");
    };
    const ok = () => [{ id: "skill/ok" }];
    // A throwing generator is skipped; the surviving generator's ids still appear.
    const ids = expectedIds([throwing, ok]);
    expect(ids.has("skill/ok")).toBe(true);
    expect(ids.size).toBe(1);
  });

  it("accounts for every active real catalog id (no orphan → promotion-safe)", () => {
    // The validator PASSES when actual ⊆ expected (no orphans). Assert that here so
    // the Sprint-4 WARN→CRITICAL promotion is known-safe across all 16 kinds.
    const expected = expectedIds();
    const cat = loader.loadCatalog({ skipCache: true });
    const orphans = cat.recipients
      .filter((r: any) => r.status === "active")
      .map((r: any) => r.id)
      .filter((id: string) => !expected.has(id));
    expect(orphans).toEqual([]);
  });
});
