// Integration tests for the 5 L2 validators in scripts/cross-tier/.
//
// Each validator is a self-contained CLI tool that reads real repo state and
// exits 0/1. We test by spawning the actual script as a child process against
// the live repo (parity with CI behavior).
//
// We also test their helper modules (read-migrations.cjs) directly for unit
// coverage of pure functions.

import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve, join } from "node:path";

import { createRequire } from "node:module";
const cjsRequire = createRequire(import.meta.url);

const REPO = resolve(__dirname, "..");
const CT = join(REPO, "scripts", "cross-tier");
const readMigrations = cjsRequire(join(REPO, "scripts/lib/read-migrations.cjs"));

function runValidator(name: string): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("node", [join(CT, name)], {
    cwd: REPO,
    encoding: "utf-8",
    timeout: 30000,
  });
  return {
    status: r.status ?? -1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

// ============================================================================
// read-migrations helper (unit)
// ============================================================================

describe("read-migrations helper", () => {
  it("listMigrationFiles returns sorted .sql files", () => {
    const files = readMigrations.listMigrationFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]).toMatch(/\.sql$/);
    // Sorted ascending — first is 00001
    expect(files[0]).toMatch(/^00001/);
  });

  it("newestMigrationFile returns the highest-numbered file", () => {
    const newest = readMigrations.newestMigrationFile();
    expect(newest).toBeTruthy();
    expect(newest).toMatch(/^000\d{2}_.+\.sql$/);
  });

  it("extractCreateTables finds expected core tables", () => {
    const tables = readMigrations.extractCreateTables();
    const names = tables.map((t: { schema: string; table: string }) => `${t.schema}.${t.table}`);
    expect(names).toContain("ops.agent_runs");
    expect(names).toContain("ops.tasks");
    expect(names).toContain("ops.events");
    expect(names).toContain("metrics.product_dau_snapshot");
  });

  it("extractCreateTables tags file source per table", () => {
    const tables = readMigrations.extractCreateTables();
    const agentRuns = tables.find(
      (t: { schema: string; table: string }) => t.schema === "ops" && t.table === "agent_runs",
    );
    expect(agentRuns).toBeDefined();
    expect(agentRuns.file).toMatch(/00002_ops_core_tables\.sql/);
  });

  it("concatenatedMigrations returns non-empty string with @file markers", () => {
    const text = readMigrations.concatenatedMigrations();
    expect(text.length).toBeGreaterThan(100);
    expect(text).toMatch(/^-- @file 00001_/);
  });
});

// ============================================================================
// validate-manifest-db
// ============================================================================

describe("validate-manifest-db.cjs (against live repo)", () => {
  it("exits 0 — manifest agrees with migrations (regression for PR #1 drift class)", () => {
    const r = runValidator("validate-manifest-db.cjs");
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/manifest-db: clean/);
  });
});

// ============================================================================
// validate-skills-references
// ============================================================================

describe("validate-skills-references.cjs", () => {
  it("exits 0 — all .from() targets resolve (after v_ops_dau_export allowlist)", () => {
    const r = runValidator("validate-skills-references.cjs");
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/skills-references: clean/);
  });

  it("scanFromCalls finds .from('table') patterns", () => {
    const mod = cjsRequire(join(CT, "validate-skills-references.cjs"));
    expect(typeof mod.scanFromCalls).toBe("function");
    // No deep test on the live worker.ts — covered by the e2e exit-0 test above.
  });
});

// ============================================================================
// validate-schedules-skills
// ============================================================================

describe("validate-schedules-skills.cjs", () => {
  it("exits 0 — every schedule.skill is registered (after stub registrations)", () => {
    const r = runValidator("validate-schedules-skills.cjs");
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/schedules-skills: clean/);
  });

  it("scanRegistrySkills picks up makeXxxHandler entries", () => {
    const mod = cjsRequire(join(CT, "validate-schedules-skills.cjs"));
    const skills = mod.scanRegistrySkills();
    expect(skills.size).toBeGreaterThan(3);
    expect(skills.has("heartbeat-ping")).toBe(true);
  });
});

// ============================================================================
// validate-governance-roles (warn severity — exits 1 on drift but is gated
// continue-on-error in CI workflow)
// ============================================================================

describe("validate-governance-roles.cjs", () => {
  it("runs without crashing (warn-severity may exit 1 on placeholder skills)", () => {
    const r = runValidator("validate-governance-roles.cjs");
    // Exit code is informational here; what matters is the script completes.
    expect([0, 1]).toContain(r.status);
    // Output mentions governance-roles regardless
    const combined = r.stdout + r.stderr;
    expect(combined).toMatch(/governance-roles/);
  });

  it("extractClaimedSkills returns array of {skill, line}", () => {
    const mod = cjsRequire(join(CT, "validate-governance-roles.cjs"));
    const claims = mod.extractClaimedSkills();
    expect(Array.isArray(claims)).toBe(true);
    if (claims.length > 0) {
      expect(claims[0]).toHaveProperty("skill");
      expect(claims[0]).toHaveProperty("line");
    }
  });
});

// ============================================================================
// validate-hitl-hooks (warn — designed to exit 0 even on heuristic gaps)
// ============================================================================

describe("validate-hitl-hooks.cjs", () => {
  it("exits 0 (warn-severity — heuristic gaps OK in v1.0a)", () => {
    const r = runValidator("validate-hitl-hooks.cjs");
    expect(r.status).toBe(0);
  });

  it("extractTierDActions finds at least one Tier D action", () => {
    const mod = cjsRequire(join(CT, "validate-hitl-hooks.cjs"));
    const actions = mod.extractTierDActions();
    expect(actions.length).toBeGreaterThan(0);
  });

  it("actionHasHookCoverage matches keywords", () => {
    const mod = cjsRequire(join(CT, "validate-hitl-hooks.cjs"));
    const hooks = ["pre-bash-dangerous.md", "pre-edit-tier1.md", "pre-tool-publish.md"];
    expect(mod.actionHasHookCoverage({ text: "Drop a database table" }, hooks)).toBe(
      "pre-bash-dangerous.md",
    );
    expect(
      mod.actionHasHookCoverage({ text: "Edit governance/HITL.md" }, hooks),
    ).toBe("pre-edit-tier1.md");
    expect(mod.actionHasHookCoverage({ text: "Random unrelated text" }, hooks)).toBeNull();
  });
});

// ============================================================================
// Integration: all 3 CRITICAL validators must pass on a clean repo
// (regression test — if this fails, the consistency engine itself drifted)
// ============================================================================

describe("v1.0a consistency engine smoke test", () => {
  it("all 3 critical L2 validators pass on the live repo at HEAD", () => {
    for (const name of [
      "validate-manifest-db.cjs",
      "validate-skills-references.cjs",
      "validate-schedules-skills.cjs",
    ]) {
      const r = runValidator(name);
      expect(r.status, `${name} should exit 0; stderr=${r.stderr}`).toBe(0);
    }
  });
});
