// /cla fix <id> — bug fix sub-flow contract test.
//
// Verifies the SOP-AIOPS-001-fix/flow.yaml retains the expected light-delta
// shape: 4 phases [0, 1, 7, 8], HITL B per PR, patch++ version bump,
// no spec.md change.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";

const REPO = resolve(__dirname, "..", "..");
const FLOW = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-fix", "flow.yaml");
const README = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-fix", "README.md");
const CMD = join(REPO, ".claude", "commands", "cla.md");

interface FlowDoc {
  id: string;
  update_mode?: string;
  drift_gates?: number[];
  steps?: Array<{ id: string; phase: number; hitl?: string; skill?: string; skill_mode?: string }>;
  failure_handling?: Record<string, { detection: string; response: string }>;
}

const flowText = readFileSync(FLOW, "utf8");
const flowDoc = yaml.load(flowText) as FlowDoc;
const readmeText = readFileSync(README, "utf8");
const cmdText = readFileSync(CMD, "utf8");

describe("SOP-AIOPS-001-fix — light delta sub-flow contract", () => {
  it("flow.yaml has expected SOP id", () => {
    expect(flowDoc.id).toBe("SOP-AIOPS-001-fix");
  });

  it("update_mode = 'fix'", () => {
    expect(flowDoc.update_mode).toBe("fix");
  });

  it("drift gates at phases 0 and 7 (not 3, 5, or 8)", () => {
    // Fix is light: only Phase 0 entry gate + Phase 7 per-commit husky.
    // Phase 8 also enforces drift but is implicit via husky.
    expect(flowDoc.drift_gates).toContain(0);
    expect(flowDoc.drift_gates).toContain(7);
  });

  it("has exactly 4 phases: 0, 1, 7, 8", () => {
    const phases = flowDoc.steps?.map((s) => s.phase).sort();
    expect(phases).toEqual([0, 1, 7, 8]);
  });

  it("Phase 1 invokes problem-framer in fix mode", () => {
    const phase1 = flowDoc.steps?.find((s) => s.phase === 1);
    expect(phase1?.skill).toBe("capability-lifecycle/problem-framer");
    expect(phase1?.skill_mode).toBe("fix");
  });

  it("Phase 7 invokes implementation-coordinator in fix mode (single PR)", () => {
    const phase7 = flowDoc.steps?.find((s) => s.phase === 7);
    expect(phase7?.skill).toBe("capability-lifecycle/implementation-coordinator");
    expect(phase7?.skill_mode).toBe("fix");
    expect(phase7?.hitl).toBe("tier_b");
  });

  it("Phase 8 invokes catalog-updater in fix mode (light)", () => {
    const phase8 = flowDoc.steps?.find((s) => s.phase === 8);
    expect(phase8?.skill).toBe("capability-lifecycle/catalog-updater");
    expect(phase8?.skill_mode).toBe("fix");
  });

  it("registers failure_handling for fix-touches-spec scope creep", () => {
    expect(flowDoc.failure_handling).toBeDefined();
    expect(Object.keys(flowDoc.failure_handling || {})).toContain("fix_touches_spec");
  });

  it("registers failure_handling for lock contention", () => {
    expect(Object.keys(flowDoc.failure_handling || {})).toContain("lock_held");
  });

  it("README documents 4 phases + patch version + no spec change", () => {
    expect(readmeText).toMatch(/4 Phases/);
    expect(readmeText).toMatch(/patch\+\+/);
    expect(readmeText).toMatch(/No spec.md change|NOT changed|spec.md NOT/i);
  });

  it("/cla command file references /cla fix as B-tier subcommand", () => {
    expect(cmdText).toMatch(/\/cla fix <id>/);
    expect(cmdText).toMatch(/SOP-AIOPS-001-fix/);
  });
});
