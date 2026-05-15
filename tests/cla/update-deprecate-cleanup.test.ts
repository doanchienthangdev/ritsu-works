// /cla deprecate <id> — sunset sub-flow.
// Tests: dependency-scanner is mandatory blocker; schedule cleanup logic;
// terminal state is 'deprecated' (NOT 'superseded'); resolves Bài #20 OQ-CLA-2.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";

const REPO = resolve(__dirname, "..", "..");
const FLOW = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-deprecate", "flow.yaml");
const README = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-deprecate", "README.md");
const CATALOG_SKILL = join(REPO, "06-ai-ops", "skills", "capability-lifecycle", "catalog-updater", "SKILL.md");

interface FlowDoc {
  id: string;
  update_mode?: string;
  steps?: Array<{ id: string; phase: number; hitl?: string; skill?: string }>;
  failure_handling?: Record<string, { detection: string; response: string }>;
}

const flowDoc = yaml.load(readFileSync(FLOW, "utf8")) as FlowDoc;
const readmeText = readFileSync(README, "utf8");
const catalogText = readFileSync(CATALOG_SKILL, "utf8");

describe("SOP-AIOPS-001-deprecate — sunset sub-flow", () => {
  it("flow.yaml has expected SOP id + update_mode", () => {
    expect(flowDoc.id).toBe("SOP-AIOPS-001-deprecate");
    expect(flowDoc.update_mode).toBe("deprecate");
  });

  it("has 4 phases: 0, 1, 3, 8", () => {
    const phases = flowDoc.steps?.map((s) => s.phase).sort((a, b) => a - b);
    expect(phases).toEqual([0, 1, 3, 8]);
  });

  it("Phase 3 invokes dependency-scanner directly (NEW skill)", () => {
    const phase3 = flowDoc.steps?.find((s) => s.phase === 3);
    expect(phase3?.skill).toBe("capability-lifecycle/dependency-scanner");
  });

  it("Phase 8 hitl is C (irreversible)", () => {
    const phase8 = flowDoc.steps?.find((s) => s.phase === 8);
    expect(phase8?.hitl).toBe("tier_c");
  });

  it("registers failure_handling for dependents block", () => {
    expect(Object.keys(flowDoc.failure_handling || {})).toContain("dependents_block");
  });

  it("registers failure_handling for schedule cancellation failure", () => {
    expect(Object.keys(flowDoc.failure_handling || {})).toContain("schedule_cancel_fails");
  });

  it("README mentions Bài #20 OQ-CLA-2 (resolves open question)", () => {
    expect(readmeText).toMatch(/(OQ-CLA-2|Bài #20)/);
  });

  it("README states deprecation is IRREVERSIBLE", () => {
    expect(readmeText).toMatch(/IRREVERSIBLE|irreversible/);
  });

  it("README documents terminal state is 'deprecated' NOT 'superseded'", () => {
    expect(readmeText).toMatch(/'deprecated'.*NOT.*'superseded'|deprecated.*not.*superseded/i);
  });

  it("README documents schedule cleanup actions", () => {
    expect(readmeText).toMatch(/(schedule.*disable|knowledge\/schedules\.yaml)/i);
  });

  it("catalog-updater skill describes :deprecate cleanup logic", () => {
    expect(catalogText).toMatch(/Mode `deprecate`/);
    expect(catalogText).toMatch(/schedule.*cleanup|knowledge\/schedules\.yaml/i);
  });

  it("catalog-updater documents CATALOG.md row move (Operating → Deprecated)", () => {
    expect(catalogText).toMatch(/Operating.*Deprecated|CATALOG.*move/i);
  });

  it("catalog-updater documents spec.md retention (NOT deleted)", () => {
    expect(catalogText).toMatch(/(KEEP|kept|not deleted|spec retention)/i);
  });
});
