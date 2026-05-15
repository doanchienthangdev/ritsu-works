// Phase 0 drift gate test.
//
// /cla propose runs `pnpm check` (== validate-cla-routing-keywords.cjs +
// other validators) before INSERTing the ops.capability_runs row. If the
// gate fails, the workflow MUST abort.
//
// We exercise the gate by mutating knowledge/cla-routing-keywords.yaml
// in-process to a known-bad state, running the validator script, then
// restoring. The script must exit non-zero on the bad state and zero on
// the clean state.

import { describe, it, expect, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";

const REPO = resolve(__dirname, "..", "..");
const ROUTING_YAML = join(REPO, "knowledge", "cla-routing-keywords.yaml");
const VALIDATOR = join(REPO, "scripts", "cross-tier", "validate-cla-routing-keywords.cjs");

let backup: string | null = null;

interface RoutingDoc {
  routes: Record<string, { keywords: string[]; cxo: string; fallback_role: string; notes?: string }>;
  [k: string]: unknown;
}

function corruptYaml(): void {
  backup = readFileSync(ROUTING_YAML, "utf8");
  // Parse, mutate, dump — guarantees valid yaml so we exercise the SEMANTIC
  // validator, not the schema/parse error path.
  const doc = yaml.load(backup) as RoutingDoc;
  doc.routes["__test_drift__"] = {
    // 'customer' is already in routes.growth.keywords → triggers overlap
    keywords: ["customer"],
    cxo: "nonexistent",
    fallback_role: "nonexistent-role-zzz",
  };
  writeFileSync(ROUTING_YAML, yaml.dump(doc), "utf8");
}

function restoreYaml(): void {
  if (backup !== null) {
    writeFileSync(ROUTING_YAML, backup, "utf8");
    backup = null;
  }
}

function runValidator(): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("node", [VALIDATOR], {
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

describe("Phase 0 drift pre-flight gate", () => {
  afterEach(() => {
    restoreYaml();
  });

  it("exits 0 when knowledge/cla-routing-keywords.yaml is clean", () => {
    const r = runValidator();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("✓");
  });

  it("exits non-zero when cxo references a nonexistent persona", () => {
    corruptYaml();
    const r = runValidator();
    expect(r.status).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/cxo='nonexistent'/);
  });

  it("exits non-zero when fallback_role references a nonexistent role", () => {
    corruptYaml();
    const r = runValidator();
    expect(r.status).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/fallback_role='nonexistent-role-zzz'/);
  });

  it("exits non-zero on keyword overlap across routes", () => {
    // 'customer' is in routes.growth.keywords; the corrupt route reuses it.
    corruptYaml();
    const r = runValidator();
    expect(r.status).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/'customer' appears in routes/);
  });

  it("returns to clean state after restore", () => {
    corruptYaml();
    const r1 = runValidator();
    expect(r1.status).not.toBe(0);

    restoreYaml();
    const r2 = runValidator();
    expect(r2.status).toBe(0);
  });
});
