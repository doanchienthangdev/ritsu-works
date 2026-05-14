// Tests for scripts/wave2-bundle-invariants.cjs
//
// Phase 1 — Code Analysis:
//   bundle({yamlPath, outPath, now}) : 3 params (all optional). Branches:
//     - yaml missing → throw
//     - yaml parse error → throw
//     - non-object yaml → throw
//     - invariants not array → throw
//     - missing/non-string id → throw
//     - duplicate id → throw
//     - happy path → writes file, returns {count, layer_counts, ids, outPath}
//   Status filter: writes both ALL_INVARIANTS and L*_INVARIANTS_LIVE filtering
//                  status='live' (default when status omitted).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createRequire } from "node:module";
const cjsRequire = createRequire(import.meta.url);
const { bundle } = cjsRequire(
  join(__dirname, "..", "scripts", "wave2-bundle-invariants.cjs"),
);

const VALID_YAML = `version: "1.0.0"
invariants:
  - id: a-live
    description: "live invariant"
    kind: subset
    layer: L3
    status: live
    source: { tier: 1, ref: "foo" }
    target: { tier: 1, ref: "bar" }
    severity: critical
    hitl_tier: B
    fix_strategy: patch_yaml
  - id: b-deferred
    description: "deferred invariant"
    kind: exists
    layer: L3
    status: deferred
    source: { tier: 1, ref: "baz" }
    target: { tier: 1, ref: "." }
    severity: info
    hitl_tier: A
    fix_strategy: regen_bundle
  - id: c-default-status
    description: "no explicit status — defaults to live"
    kind: subset
    layer: L1
    source: { tier: 1, ref: "src" }
    target: { tier: 1, ref: "tgt" }
    severity: warn
    hitl_tier: A
    fix_strategy: regen_bundle
`;

describe("wave2-bundle-invariants", () => {
  let dir: string;
  let yamlPath: string;
  let outPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bundler-test-"));
    yamlPath = join(dir, "invariants.yaml");
    outPath = join(dir, "invariants.generated.ts");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("happy path", () => {
    it("writes generated TS file with correct shape", () => {
      writeFileSync(yamlPath, VALID_YAML, "utf8");
      const result = bundle({ yamlPath, outPath, now: () => "2026-05-14T00:00:00Z" });
      expect(result.count).toBe(3);
      expect(result.ids).toEqual(["a-live", "b-deferred", "c-default-status"]);
      expect(existsSync(outPath)).toBe(true);
      const written = readFileSync(outPath, "utf8");
      expect(written).toContain("AUTO-GENERATED");
      expect(written).toContain("ALL_INVARIANTS");
      expect(written).toContain("L1_INVARIANTS_LIVE");
      expect(written).toContain("L2_INVARIANTS_LIVE");
      expect(written).toContain("L3_INVARIANTS_LIVE");
      expect(written).toContain('"a-live"');
      expect(written).toContain('"b-deferred"');
    });

    it("counts by layer correctly", () => {
      writeFileSync(yamlPath, VALID_YAML, "utf8");
      const result = bundle({ yamlPath, outPath });
      expect(result.layer_counts.L1).toBe(1);
      expect(result.layer_counts.L2).toBe(0);
      expect(result.layer_counts.L3).toBe(2);
    });

    it("default status filter (status omitted → treated as live)", () => {
      writeFileSync(yamlPath, VALID_YAML, "utf8");
      bundle({ yamlPath, outPath });
      const written = readFileSync(outPath, "utf8");
      // Both a-live and c-default-status (no status) should be in L*_LIVE arrays
      // after the runtime filter runs. We can't execute the TS here, but we can
      // verify the filter function is emitted with the right shape.
      expect(written).toMatch(/return \(i\.status \?\? "live"\) === "live";/);
    });
  });

  describe("error handling", () => {
    it("throws when yaml file missing", () => {
      expect(() => bundle({ yamlPath: join(dir, "nope.yaml"), outPath })).toThrow(
        /source yaml not found/,
      );
    });

    it("throws on malformed yaml", () => {
      writeFileSync(yamlPath, "  : invalid :\n   ::", "utf8");
      expect(() => bundle({ yamlPath, outPath })).toThrow(/yaml parse error/);
    });

    it("throws when invariants field is not array", () => {
      writeFileSync(yamlPath, 'version: "1"\ninvariants: "string"\n', "utf8");
      expect(() => bundle({ yamlPath, outPath })).toThrow(/must be an array/);
    });

    it("throws on duplicate id", () => {
      const dupe = `version: "1"
invariants:
  - { id: dup, description: x, kind: subset, source: {tier: 1, ref: a}, target: {tier: 1, ref: b}, severity: warn, hitl_tier: A, fix_strategy: open_pr }
  - { id: dup, description: x, kind: subset, source: {tier: 1, ref: a}, target: {tier: 1, ref: b}, severity: warn, hitl_tier: A, fix_strategy: open_pr }
`;
      writeFileSync(yamlPath, dupe, "utf8");
      expect(() => bundle({ yamlPath, outPath })).toThrow(/duplicate invariant id: dup/);
    });

    it("throws when invariant missing id", () => {
      const noId = `version: "1"
invariants:
  - { description: x, kind: subset, source: {tier: 1, ref: a}, target: {tier: 1, ref: b}, severity: warn, hitl_tier: A, fix_strategy: open_pr }
`;
      writeFileSync(yamlPath, noId, "utf8");
      expect(() => bundle({ yamlPath, outPath })).toThrow(/missing string id/);
    });
  });

  describe("edge cases", () => {
    it("handles empty invariants list", () => {
      writeFileSync(yamlPath, 'version: "1"\ninvariants: []\n', "utf8");
      const result = bundle({ yamlPath, outPath });
      expect(result.count).toBe(0);
      expect(result.ids).toEqual([]);
      const written = readFileSync(outPath, "utf8");
      expect(written).toContain("ALL_INVARIANTS: Invariant[] = []");
    });

    it("handles missing invariants key (treated as empty)", () => {
      writeFileSync(yamlPath, 'version: "1"\n', "utf8");
      const result = bundle({ yamlPath, outPath });
      expect(result.count).toBe(0);
    });
  });

  describe("regression — real repo yaml", () => {
    it("real cross-tier-invariants.yaml bundles successfully", () => {
      const result = bundle({}); // uses default paths
      expect(result.count).toBeGreaterThan(10);
      expect(result.layer_counts.L1 + result.layer_counts.L2 + result.layer_counts.L3).toBe(result.count);
    });
  });
});
