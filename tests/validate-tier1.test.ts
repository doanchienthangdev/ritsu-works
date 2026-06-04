// Tests for scripts/validate-tier1.cjs
//
// Phase 1 — Code Analysis:
//   The script is top-level (no exports). It iterates 27 entries in FILE_TO_SCHEMA,
//   reads each yaml + schema, validates with Ajv, prints, exits 0/1/2.
//   Branches: deps-missing(2), yaml-missing(1), schema-missing(1), parse-error(1),
//             validation-error(1), success-all(0).
//
// Test approach: spawn the script as a child process against the live repo + a
// temp fixture for failure cases. This is what CI does, so test parity is highest.
//
// Maintenance note: the COVERED_YAMLS list MUST be updated whenever
// scripts/validate-tier1.cjs adds or removes a FILE_TO_SCHEMA entry. Keep
// counts in the test descriptions consistent.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const REPO = resolve(__dirname, "..");
const VALIDATOR = join(REPO, "scripts", "validate-tier1.cjs");

// 27 yamls FILE_TO_SCHEMA covers (matches scripts/validate-tier1.cjs)
const COVERED_YAMLS = [
  "feature-flags.yaml",
  "schedules.yaml",
  "state-machines.yaml",
  "muse-personas.yaml",
  "channels.yaml",
  "event-subscriptions.yaml",
  "event-aggregation.yaml",
  "kpi-registry.yaml",
  "alert-rules.yaml",
  "mcp-tools.yaml",
  "mcp-roles.yaml",
  "link-inference-rules.yaml",
  "data-retention.yaml",
  "locales.yaml",
  "surface-compliance.yaml",
  "ingestion-sources.yaml",
  "ingestion-routing.yaml",
  "founder-rhythm.yaml",
  "cross-tier-invariants.yaml",
  "workforce-personas.yaml",
  "cla-routing-keywords.yaml",
  "update-file-paths.yaml",
  // added since (image-platform #?, dataviz #235, thinking-toolkit) — realigned 2026-06-04:
  "image-adapters.yaml",
  "dataviz-renderers.yaml",
  "mckinsey-workflow.yaml",
  "mckinsey-templates.yaml",
  "problem-solving-frameworks.yaml",
];

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runValidator(cwd: string): RunResult {
  // The validator uses __dirname-relative paths to find knowledge/. Run the COPY
  // located inside cwd so it reads cwd/knowledge/, not the real repo's.
  const localValidator = join(cwd, "scripts", "validate-tier1.cjs");
  const validatorPath = existsSync(localValidator) ? localValidator : VALIDATOR;
  try {
    const stdout = execFileSync("node", [validatorPath], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      status: e.status ?? -1,
      stdout: e.stdout ? e.stdout.toString() : "",
      stderr: e.stderr ? e.stderr.toString() : "",
    };
  }
}

// ============================================================================
// Happy path against the real repo
// ============================================================================

describe("validate-tier1 — real repo (current state)", () => {
  it("exits 0 with all 27 yamls valid", () => {
    const r = runValidator(REPO);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Valid:\s+27\/27/);
    expect(r.stdout).toMatch(/Invalid:\s+0/);
    expect(r.stdout).toMatch(/Missing:\s+0/);
    expect(r.stdout).toContain("All present files valid");
  });

  it.each(COVERED_YAMLS)("validator output mentions %s", (yaml) => {
    const r = runValidator(REPO);
    expect(r.stdout).toContain(yaml);
  });
});

// ============================================================================
// Fixture-based failure cases — copy the real validator + schemas into a temp
// dir, mutate one yaml at a time, ensure the validator fails appropriately.
// ============================================================================

// Resolve the nearest ancestor node_modules that actually contains the validator's
// runtime deps (js-yaml + ajv). In a git worktree the local node_modules is empty —
// deps are hoisted to the main checkout — so `join(REPO, "node_modules")` would point
// at an empty dir, the fixture's symlink would resolve nothing, and the copied
// validator would fail to require() its deps (exit 2 instead of the asserted 0/1).
function findDepsNodeModules(): string {
  let dir = REPO;
  for (;;) {
    const nm = join(dir, "node_modules");
    if (existsSync(join(nm, "js-yaml")) && existsSync(join(nm, "ajv"))) return nm;
    const parent = resolve(dir, "..");
    if (parent === dir) {
      throw new Error("Could not locate a node_modules containing js-yaml + ajv");
    }
    dir = parent;
  }
}

function makeFixtureRepo(): string {
  const fixture = join(tmpdir(), `validate-tier1-fixture-${Date.now()}-${Math.random()}`);
  mkdirSync(join(fixture, "knowledge", "schemas"), { recursive: true });
  mkdirSync(join(fixture, "scripts"), { recursive: true });

  // Copy the validator
  copyFileSync(VALIDATOR, join(fixture, "scripts", "validate-tier1.cjs"));

  // Copy all covered yamls + their schemas + node_modules-style deps
  for (const yaml of COVERED_YAMLS) {
    const src = join(REPO, "knowledge", yaml);
    const dst = join(fixture, "knowledge", yaml);
    if (existsSync(src)) copyFileSync(src, dst);
    const schemaName = yaml.replace(".yaml", ".schema.json");
    const schemaSrc = join(REPO, "knowledge", "schemas", schemaName);
    const schemaDst = join(fixture, "knowledge", "schemas", schemaName);
    if (existsSync(schemaSrc)) copyFileSync(schemaSrc, schemaDst);
  }

  // node_modules: symlink to the real one (the ancestor that actually has the deps,
  // not the empty worktree-local node_modules) so the copied validator's require()
  // resolves js-yaml + ajv.
  const realNm = findDepsNodeModules();
  const fixtureNm = join(fixture, "node_modules");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("node:fs").symlinkSync(realNm, fixtureNm, "dir");

  return fixture;
}

function cleanupFixture(path: string) {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}

describe("validate-tier1 — fixture failure cases", () => {
  let fixture: string;

  beforeEach(() => {
    fixture = makeFixtureRepo();
  });

  afterEach(() => {
    cleanupFixture(fixture);
  });

  it("exits 1 when one yaml has malformed YAML", () => {
    writeFileSync(
      join(fixture, "knowledge", "feature-flags.yaml"),
      "this is: not [valid yaml: malformed",
      "utf-8",
    );
    const r = runValidator(fixture);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/❌|Invalid/);
  });

  it("exits 1 when one yaml fails schema validation (type mismatch)", () => {
    // schedules.yaml schema requires `schedules` to be an array. A string violates type.
    writeFileSync(
      join(fixture, "knowledge", "schedules.yaml"),
      'version: "1.0.0"\ntimezone: "UTC"\nschedules: "not an array"\n',
      "utf-8",
    );
    const r = runValidator(fixture);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/❌/);
    expect(r.stdout).toContain("schedules.yaml");
  });

  it("exits 1 when a schema file is missing (referenced but absent)", () => {
    rmSync(join(fixture, "knowledge", "schemas", "feature-flags.schema.json"));
    const r = runValidator(fixture);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/schema missing/);
  });

  it("does NOT exit 1 when a yaml is missing — counts as Missing not Invalid", () => {
    rmSync(join(fixture, "knowledge", "feature-flags.yaml"));
    const r = runValidator(fixture);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Missing:\s+1/);
    expect(r.stdout).toMatch(/file missing/);
    expect(r.stdout).toContain("All present files valid");
  });

  it("counts multiple invalids correctly", () => {
    // Make both yamls fail with parse errors (most reliable across schemas).
    writeFileSync(
      join(fixture, "knowledge", "feature-flags.yaml"),
      "key: [unclosed bracket\n",
      "utf-8",
    );
    writeFileSync(
      join(fixture, "knowledge", "schedules.yaml"),
      "another: [unclosed\n",
      "utf-8",
    );
    const r = runValidator(fixture);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/Invalid:\s+2/);
  });

  it("handles empty yaml file (parses to null, fails schema)", () => {
    writeFileSync(join(fixture, "knowledge", "feature-flags.yaml"), "", "utf-8");
    const r = runValidator(fixture);
    // Empty yaml parses to undefined which fails most schemas requiring object root.
    // Result MUST be exit 1 (validation error) or pass (if schema allows null/empty).
    // Either way — exit must NOT be 2 (setup error).
    expect([0, 1]).toContain(r.status);
  });

  it("preserves exit code 0 when all 27 covered files present + valid", () => {
    // Don't mutate anything — fixture is a copy of the working real repo, so it
    // should match the full COVERED_YAMLS length (27).
    const r = runValidator(fixture);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Valid:\s+27\/27/);
  });
});

// ============================================================================
// Behavioral relationships
// ============================================================================

describe("validate-tier1 — invariants", () => {
  it("idempotent: running twice gives identical exit code", () => {
    const r1 = runValidator(REPO);
    const r2 = runValidator(REPO);
    expect(r1.status).toBe(r2.status);
  });

  it("output mentions exactly 27 yamls (matches FILE_TO_SCHEMA size)", () => {
    const r = runValidator(REPO);
    // Count occurrences of yaml filenames in output
    const mentioned = COVERED_YAMLS.filter((y) => r.stdout.includes(y));
    expect(mentioned).toHaveLength(27);
  });
});
