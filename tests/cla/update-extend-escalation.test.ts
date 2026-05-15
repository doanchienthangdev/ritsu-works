// /cla extend <id> — scope expansion sub-flow contract test.
//
// Verifies the auto-escalation logic: HITL B by default, escalates to C
// when spec diff is substantial. dependency-scanner invoked at Phase 3.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";

const REPO = resolve(__dirname, "..", "..");
const FLOW = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-extend", "flow.yaml");
const README = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-extend", "README.md");
const ARCH_SKILL = join(REPO, "06-ai-ops", "skills", "capability-lifecycle", "architect", "SKILL.md");

interface FlowDoc {
  id: string;
  update_mode?: string;
  drift_gates?: number[];
  steps?: Array<{ id: string; phase: number; hitl?: string; skill?: string; skill_mode?: string }>;
  failure_handling?: Record<string, { detection: string; response: string }>;
}

const flowDoc = yaml.load(readFileSync(FLOW, "utf8")) as FlowDoc;
const readmeText = readFileSync(README, "utf8");
const archText = readFileSync(ARCH_SKILL, "utf8");

describe("SOP-AIOPS-001-extend — scope expansion + Tier C auto-escalation", () => {
  it("flow.yaml has expected SOP id + update_mode", () => {
    expect(flowDoc.id).toBe("SOP-AIOPS-001-extend");
    expect(flowDoc.update_mode).toBe("extend");
  });

  it("has 7 phases: 0, 1, 3, 5, 6, 7, 8", () => {
    const phases = flowDoc.steps?.map((s) => s.phase).sort((a, b) => a - b);
    expect(phases).toEqual([0, 1, 3, 5, 6, 7, 8]);
  });

  it("Phase 5 hitl is tier_b (auto-escalates to C per skill logic)", () => {
    const phase5 = flowDoc.steps?.find((s) => s.phase === 5);
    expect(phase5?.hitl).toBe("tier_b");
    // The auto-escalate happens inside architect skill, not declared here.
  });

  it("architect skill spec describes auto-escalate to Tier C on substantial diff", () => {
    expect(archText).toMatch(/(auto-escalate|escalate to Tier C|escalates to)/i);
    expect(archText).toMatch(/(20%|substantial)/i);
  });

  it("Phase 3 invokes dependency-scanner indirectly via system-inventory-scanner", () => {
    const phase3 = flowDoc.steps?.find((s) => s.phase === 3);
    expect(phase3?.skill).toBe("capability-lifecycle/system-inventory-scanner");
    expect(phase3?.skill_mode).toBe("extend");
  });

  it("registers failure_handling for dependents block", () => {
    expect(Object.keys(flowDoc.failure_handling || {})).toContain("dependents_block");
  });

  it("registers failure_handling for substantial spec diff", () => {
    expect(Object.keys(flowDoc.failure_handling || {})).toContain("spec_diff_substantial");
  });

  it("README documents auto-escalation logic (B → C)", () => {
    expect(readmeText).toMatch(/(B → C|auto-escalation|auto-Tier C)/);
    expect(readmeText).toMatch(/20%/);
  });

  it("README documents minor++ version bump", () => {
    expect(readmeText).toMatch(/minor\+\+|minor version/i);
  });
});
