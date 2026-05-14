// Tests for scripts/lib/load-invariants.cjs
//
// Phase 1 — Code Analysis:
//   loadInvariants(filePath?)  : 1 param, 4 branches (missing/parse-err/non-obj/non-array/ok)
//   invariantsFor(filter, fp?) : 2 params, branches per filter key
//   invariantById(id, fp?)     : 2 params, 1 branch (found/not-found)
//
// Classification: pure functions over file IO. Test with temp fixture files.
// Dependencies (js-yaml) loaded internally; mock not needed — real load is cheap.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// CJS import via createRequire (works in Vitest ESM context)
import { createRequire } from "node:module";
const cjsRequire = createRequire(import.meta.url);

const REPO = join(__dirname, "..");
const lib = cjsRequire(join(REPO, "scripts/lib/load-invariants.cjs"));

const VALID_YAML = `version: "1.0.0"
invariants:
  - id: a-invariant
    description: "test"
    kind: subset
    layer: L1
    source: { tier: 1, ref: "foo.yaml" }
    target: { tier: 1, ref: "bar.yaml" }
    severity: critical
    hitl_tier: B
    fix_strategy: patch_yaml
  - id: b-invariant
    description: "test2"
    kind: exists
    layer: L2
    source: { tier: 1, ref: "baz.yaml" }
    target: { tier: 1, ref: "." }
    severity: warn
    hitl_tier: A
    fix_strategy: regen_bundle
`;

describe("loadInvariants", () => {
  let dir: string;
  let fp: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "invariants-test-"));
    fp = join(dir, "cross-tier-invariants.yaml");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("happy path", () => {
    it("returns parsed invariants array", () => {
      writeFileSync(fp, VALID_YAML, "utf8");
      const result = lib.loadInvariants(fp);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("a-invariant");
      expect(result[1].id).toBe("b-invariant");
    });
  });

  describe("error handling", () => {
    it("throws with clear message when file missing", () => {
      expect(() => lib.loadInvariants(join(dir, "nope.yaml"))).toThrow(
        /missing at/,
      );
    });

    it("throws with parse error context on malformed yaml", () => {
      writeFileSync(fp, "version: 1\n  invalid: : indent", "utf8");
      expect(() => lib.loadInvariants(fp)).toThrow(/parse error/);
    });

    it("throws when yaml parses to non-object (string)", () => {
      writeFileSync(fp, "just a string", "utf8");
      expect(() => lib.loadInvariants(fp)).toThrow(/non-object/);
    });

    it("throws when invariants field is not an array", () => {
      writeFileSync(fp, 'version: "1.0.0"\ninvariants: not-an-array\n', "utf8");
      expect(() => lib.loadInvariants(fp)).toThrow(/must be an array/);
    });
  });

  describe("edge cases", () => {
    it("returns empty array when invariants key absent", () => {
      writeFileSync(fp, 'version: "1.0.0"\n', "utf8");
      expect(lib.loadInvariants(fp)).toEqual([]);
    });

    it("returns empty array when invariants is explicit empty list", () => {
      writeFileSync(fp, 'version: "1.0.0"\ninvariants: []\n', "utf8");
      expect(lib.loadInvariants(fp)).toEqual([]);
    });
  });
});

describe("invariantsFor", () => {
  let dir: string;
  let fp: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "invariants-test-"));
    fp = join(dir, "cross-tier-invariants.yaml");
    writeFileSync(fp, VALID_YAML, "utf8");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns all when no filter", () => {
    expect(lib.invariantsFor(undefined, fp)).toHaveLength(2);
    expect(lib.invariantsFor({}, fp)).toHaveLength(2);
  });

  it("filters by kind", () => {
    const subset = lib.invariantsFor({ kind: "subset" }, fp);
    expect(subset).toHaveLength(1);
    expect(subset[0].id).toBe("a-invariant");
  });

  it("filters by layer", () => {
    const l1 = lib.invariantsFor({ layer: "L1" }, fp);
    expect(l1).toHaveLength(1);
    expect(l1[0].id).toBe("a-invariant");
  });

  it("filters by severity", () => {
    const critical = lib.invariantsFor({ severity: "critical" }, fp);
    expect(critical).toHaveLength(1);
    expect(critical[0].id).toBe("a-invariant");
  });

  it("returns empty array when no match", () => {
    expect(lib.invariantsFor({ kind: "regex_match" }, fp)).toEqual([]);
  });

  it("combines multiple filters (AND)", () => {
    const l1critical = lib.invariantsFor({ layer: "L1", severity: "critical" }, fp);
    expect(l1critical).toHaveLength(1);
    expect(l1critical[0].id).toBe("a-invariant");
    const l1warn = lib.invariantsFor({ layer: "L1", severity: "warn" }, fp);
    expect(l1warn).toEqual([]);
  });
});

describe("invariantById", () => {
  let dir: string;
  let fp: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "invariants-test-"));
    fp = join(dir, "cross-tier-invariants.yaml");
    writeFileSync(fp, VALID_YAML, "utf8");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns invariant when id matches", () => {
    const inv = lib.invariantById("b-invariant", fp);
    expect(inv).not.toBeNull();
    expect(inv.kind).toBe("exists");
  });

  it("returns null when id not found", () => {
    expect(lib.invariantById("does-not-exist", fp)).toBeNull();
  });
});

// ============================================================================
// REAL-FILE smoke test — ensures the actual cross-tier-invariants.yaml file
// in the repo is loadable. Catches breakage from yaml edits.
// ============================================================================

describe("real cross-tier-invariants.yaml", () => {
  it("loads successfully (regression: schema must remain parseable)", () => {
    const invariants = lib.loadInvariants();
    expect(Array.isArray(invariants)).toBe(true);
    expect(invariants.length).toBeGreaterThan(0);
    // Every entry must have required fields
    for (const inv of invariants) {
      expect(inv).toHaveProperty("id");
      expect(inv).toHaveProperty("kind");
      expect(inv).toHaveProperty("severity");
      expect(inv).toHaveProperty("hitl_tier");
    }
  });
});
