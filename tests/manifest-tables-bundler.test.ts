// Tests for scripts/wave2-bundle-manifest-tables.cjs

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createRequire } from "node:module";
const cjsRequire = createRequire(import.meta.url);
const { bundle, extractTables } = cjsRequire(
  join(__dirname, "..", "scripts", "wave2-bundle-manifest-tables.cjs"),
);

const VALID_MANIFEST = `version: "0.2.0"
tier2_operational:
  schemas:
    ops:
      tables:
        - name: agent_runs
          status: live
        - name: tasks
          status: live
        - name: v_capability_pipeline
          kind: view
          status: live
    metrics:
      tables:
        - name: product_dau_snapshot
          status: live
`;

describe("wave2-bundle-manifest-tables", () => {
  let dir: string;
  let yamlPath: string;
  let outPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mtables-test-"));
    yamlPath = join(dir, "manifest.yaml");
    outPath = join(dir, "manifest-tables.generated.ts");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("happy path", () => {
    it("emits sorted ops + metrics tables, excludes views", () => {
      writeFileSync(yamlPath, VALID_MANIFEST, "utf8");
      const result = bundle({ yamlPath, outPath });
      expect(result.ops_count).toBe(2);
      expect(result.metrics_count).toBe(1);
      expect(result.ops_tables).toEqual(["agent_runs", "tasks"]);
      expect(result.metrics_tables).toEqual(["product_dau_snapshot"]);
      expect(existsSync(outPath)).toBe(true);
      const written = readFileSync(outPath, "utf8");
      expect(written).toContain("MANIFEST_OPS_TABLES");
      expect(written).toContain("MANIFEST_METRICS_TABLES");
      expect(written).toContain('"agent_runs"');
      expect(written).not.toContain("v_capability_pipeline"); // views excluded
    });

    it("ops_tables returned sorted alphabetically", () => {
      const out = `version: "1"
tier2_operational:
  schemas:
    ops:
      tables:
        - { name: zzz }
        - { name: aaa }
        - { name: mmm }
    metrics:
      tables: []
`;
      writeFileSync(yamlPath, out, "utf8");
      const result = bundle({ yamlPath, outPath });
      expect(result.ops_tables).toEqual(["aaa", "mmm", "zzz"]);
    });
  });

  describe("error handling", () => {
    it("throws when yaml missing", () => {
      expect(() => bundle({ yamlPath: join(dir, "nope.yaml"), outPath })).toThrow(
        /source yaml not found/,
      );
    });

    it("throws on malformed yaml", () => {
      writeFileSync(yamlPath, "  : invalid : :", "utf8");
      expect(() => bundle({ yamlPath, outPath })).toThrow(/yaml parse error/);
    });

    it("throws on duplicate table name within schema", () => {
      const dupe = `version: "1"
tier2_operational:
  schemas:
    ops:
      tables:
        - { name: agent_runs }
        - { name: agent_runs }
    metrics:
      tables: []
`;
      writeFileSync(yamlPath, dupe, "utf8");
      expect(() => bundle({ yamlPath, outPath })).toThrow(/duplicate ops\.agent_runs/);
    });
  });

  describe("edge cases", () => {
    it("returns empty arrays when no tier2_operational present", () => {
      writeFileSync(yamlPath, 'version: "1"\n', "utf8");
      const result = bundle({ yamlPath, outPath });
      expect(result.ops_count).toBe(0);
      expect(result.metrics_count).toBe(0);
    });

    it("skips entries with empty/non-string name", () => {
      const yaml = `version: "1"
tier2_operational:
  schemas:
    ops:
      tables:
        - { name: valid_one }
        - { name: "" }
        - {}
    metrics:
      tables: []
`;
      writeFileSync(yamlPath, yaml, "utf8");
      const result = bundle({ yamlPath, outPath });
      expect(result.ops_tables).toEqual(["valid_one"]);
    });
  });

  describe("real-file regression", () => {
    it("bundles the real manifest.yaml without throwing", () => {
      const result = bundle({});
      expect(result.ops_count).toBeGreaterThan(20);
      expect(result.metrics_count).toBeGreaterThan(0);
      expect(result.ops_tables).toContain("consistency_checks");
    });
  });
});

// ============================================================================
// extractTables helper (unit)
// ============================================================================

describe("extractTables", () => {
  it("filters views by `kind: view`", () => {
    const parsed = {
      tier2_operational: {
        schemas: {
          ops: {
            tables: [
              { name: "a" },
              { name: "v_x", kind: "view" },
              { name: "b" },
            ],
          },
        },
      },
    };
    expect(extractTables(parsed, "ops")).toEqual(["a", "b"]);
  });

  it("returns empty array when schema missing", () => {
    expect(extractTables({}, "ops")).toEqual([]);
    expect(extractTables({ tier2_operational: {} }, "ops")).toEqual([]);
  });
});
