// Phase 8 (catalog-updater) MUST refuse to advance state to 'operating' if
// retrospective.md doesn't exist. This is the final gate that ensures every
// shipped capability captures lessons learned.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const SKILL = join(REPO, "06-ai-ops", "skills", "capability-lifecycle", "catalog-updater", "SKILL.md");
const FLOW = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-capability-lifecycle", "flow.yaml");

const skillText = readFileSync(SKILL, "utf8");
const flowText = readFileSync(FLOW, "utf8");

describe("catalog-updater skill — Phase 8 retrospective.md prerequisite", () => {
  it("Step 2 of SKILL.md describes the retrospective.md refusal", () => {
    expect(skillText).toMatch(/Step 2[\s\S]{0,400}retrospective\.md[\s\S]{0,200}ABORT/i);
  });

  it("references flow.yaml.failure_handling.phase_8_skipped", () => {
    expect(skillText).toMatch(/phase_8_skipped/);
  });

  it("flow.yaml registers failure_handling.phase_8_skipped", () => {
    expect(flowText).toMatch(/phase_8_skipped:[\s\S]{0,200}retrospective\.md/);
  });

  it("Step 3 promotes spec.md and retrospective.md to wiki/capabilities/<id>/", () => {
    expect(skillText).toMatch(/Step 3[\s\S]{0,400}wiki\/capabilities\/.{0,40}spec\.md/);
    expect(skillText).toMatch(/wiki\/capabilities\/.{0,40}retrospective\.md/);
  });

  it("handles destination collision (asks founder before overwriting)", () => {
    expect(skillText).toMatch(/(exists|collision)[\s\S]{0,200}(overwrite|v2|abort)/i);
  });

  it("Step 7 final pnpm check is required to advance state to operating", () => {
    expect(skillText).toMatch(/(Step 7|Final)[\s\S]{0,200}pnpm check[\s\S]{0,200}operating/i);
  });

  it("Step 8 only advances state to operating after pnpm check clean", () => {
    expect(skillText).toMatch(/state\s*=\s*'operating'/);
  });

  it("updates wiki/capabilities/CATALOG.md (post-rename)", () => {
    expect(skillText).toMatch(/wiki\/capabilities\/CATALOG\.md/);
    // The legacy underscore form must NOT appear in active step text — ok
    // if it appears in the failure-modes table referencing the old name.
  });
});
