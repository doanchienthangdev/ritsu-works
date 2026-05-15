// Phase 6 (sprint-planner) MUST refuse to run if no Tier C decision exists
// for this capability's architecture. This is the gate that prevents sprint
// plans being made against unapproved specs.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const SKILL = join(REPO, "06-ai-ops", "skills", "capability-lifecycle", "sprint-planner", "SKILL.md");
const FLOW = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-capability-lifecycle", "flow.yaml");

const skillText = readFileSync(SKILL, "utf8");
const flowText = readFileSync(FLOW, "utf8");

describe("sprint-planner skill — Phase 5 Tier C prerequisite refusal", () => {
  it("Step 1 of SKILL.md describes the Tier C refusal", () => {
    // Step 1 spans header → SQL query → ABORT (~360 chars in v1.0).
    expect(skillText).toMatch(/Step 1[\s\S]{0,600}ABORT/);
    expect(skillText).toMatch(/Refuse if no Tier C approval/);
  });

  it("queries ops.decisions for Tier C approval", () => {
    expect(skillText).toMatch(/ops\.decisions/);
    expect(skillText).toMatch(/hitl_tier\s*=\s*'C'|hitl_tier\s+=\s+'C'/);
  });

  it("references the join through ops.capability_runs.phase_5_decision_id", () => {
    expect(skillText).toMatch(/phase_5_decision_id/);
  });

  it("flow.yaml registers failure_handling.phase_5_no_tier_c_approval", () => {
    expect(flowText).toMatch(/phase_5_no_tier_c_approval:/);
  });

  it("refusal message mentions Phase 5 / architecture / Tier C", () => {
    expect(skillText).toMatch(/(Phase 5|Tier C)[\s\S]{0,80}(approval|architecture|approve)/i);
  });

  it("HITL tier B surfaces in skill body and frontmatter", () => {
    expect(skillText).toMatch(/Tier B HITL|\*\*Tier B\*\*/i);
  });

  it("references playbook chương 28 Wave alignment", () => {
    expect(skillText).toMatch(/Wave alignment/i);
  });
});
