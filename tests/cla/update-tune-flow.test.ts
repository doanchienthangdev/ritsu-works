// /cla tune <id> — KPI re-tuning (lightest sub-flow, registry edit only).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";

const REPO = resolve(__dirname, "..", "..");
const FLOW = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-tune", "flow.yaml");
const README = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-tune", "README.md");

interface FlowDoc {
  id: string;
  update_mode?: string;
  steps?: Array<{ id: string; phase: number; hitl?: string; state_transition?: string }>;
}

const flowDoc = yaml.load(readFileSync(FLOW, "utf8")) as FlowDoc;
const readmeText = readFileSync(README, "utf8");

describe("SOP-AIOPS-001-tune — lightest sub-flow", () => {
  it("flow.yaml has expected SOP id + update_mode", () => {
    expect(flowDoc.id).toBe("SOP-AIOPS-001-tune");
    expect(flowDoc.update_mode).toBe("tune");
  });

  it("has 3 phases: 0, 1, 8", () => {
    const phases = flowDoc.steps?.map((s) => s.phase).sort((a, b) => a - b);
    expect(phases).toEqual([0, 1, 8]);
  });

  it("Phase 8 state transition is implementing → operating (compressed)", () => {
    const phase8 = flowDoc.steps?.find((s) => s.phase === 8);
    expect(phase8?.state_transition).toMatch(/implementing.*operating/);
  });

  it("Phase 8 hitl is B (founder approves PR)", () => {
    const phase8 = flowDoc.steps?.find((s) => s.phase === 8);
    expect(phase8?.hitl).toBe("tier_b");
  });

  it("README documents NO spec change + NO code change", () => {
    expect(readmeText).toMatch(/NO spec change/i);
    expect(readmeText).toMatch(/NO code change/i);
  });

  it("README documents patch++ version bump", () => {
    expect(readmeText).toMatch(/patch\+\+|patch version/i);
  });

  it("README documents target audience: KPI target adjustment", () => {
    expect(readmeText).toMatch(/(KPI|target_value|target adjustment)/i);
  });
});
