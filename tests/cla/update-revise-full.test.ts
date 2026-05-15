// /cla revise <id> — architecture revision (Tier C always, full ceremony).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";

const REPO = resolve(__dirname, "..", "..");
const FLOW = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-revise", "flow.yaml");
const README = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-revise", "README.md");

interface FlowDoc {
  id: string;
  update_mode?: string;
  cxo_routing?: { phase: number; cto_review?: string; muse_panel?: string };
  steps?: Array<{ id: string; phase: number; hitl?: string; skill?: string; skill_mode?: string; decision_persona_panel?: string }>;
}

const flowDoc = yaml.load(readFileSync(FLOW, "utf8")) as FlowDoc;
const readmeText = readFileSync(README, "utf8");

describe("SOP-AIOPS-001-revise — full ceremony, Tier C always", () => {
  it("flow.yaml has expected SOP id + update_mode", () => {
    expect(flowDoc.id).toBe("SOP-AIOPS-001-revise");
    expect(flowDoc.update_mode).toBe("revise");
  });

  it("has 8 phases: 0, 1, 3, 4, 5, 6, 7, 8 (full minus Phase 2)", () => {
    const phases = flowDoc.steps?.map((s) => s.phase).sort((a, b) => a - b);
    expect(phases).toEqual([0, 1, 3, 4, 5, 6, 7, 8]);
  });

  it("Phase 5 is ALWAYS Tier C (no auto-escalate; revise is intrinsically C)", () => {
    const phase5 = flowDoc.steps?.find((s) => s.phase === 5);
    expect(phase5?.hitl).toBe("tier_c");
  });

  it("Phase 5 invokes high-stakes-decision-panel Muse panel", () => {
    const phase5 = flowDoc.steps?.find((s) => s.phase === 5);
    expect(phase5?.decision_persona_panel).toBe("high-stakes-decision-panel");
  });

  it("cxo_routing requires @cto review at Phase 5", () => {
    expect(flowDoc.cxo_routing?.phase).toBe(5);
    expect(flowDoc.cxo_routing?.cto_review).toBe("required");
    expect(flowDoc.cxo_routing?.muse_panel).toBe("high-stakes-decision-panel");
  });

  it("Phase 4 (options regen) invoked with skill_mode=revise", () => {
    const phase4 = flowDoc.steps?.find((s) => s.phase === 4);
    expect(phase4?.skill).toBe("capability-lifecycle/options-generator");
    expect(phase4?.skill_mode).toBe("revise");
  });

  it("README documents major version bump", () => {
    expect(readmeText).toMatch(/major\+\+|major version/i);
  });

  it("README documents multi-week, multi-session expectation", () => {
    expect(readmeText).toMatch(/(multi-week|1-2 weeks|multi-session)/i);
  });

  it("README documents that Phase 2 (domain) is skipped", () => {
    expect(readmeText).toMatch(/(no Phase 2|skip.*Phase 2|domain inherited)/i);
  });
});
