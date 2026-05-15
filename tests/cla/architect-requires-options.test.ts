// Phase 5 (architect) MUST refuse to run if Phase 4 hasn't produced an
// options.md AND a Tier B option pick. The skill's spec encodes this; the
// test enforces that the spec text still contains the refusal logic so a
// future edit can't silently delete it.
//
// We assert at the SKILL.md text level (regex), not at runtime — the skill
// is invoked by an LLM that follows the markdown. This is a "documentation
// as test" pattern that catches drift in the contract.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const SKILL = join(REPO, "06-ai-ops", "skills", "capability-lifecycle", "architect", "SKILL.md");
const FLOW = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-capability-lifecycle", "flow.yaml");

const skillText = readFileSync(SKILL, "utf8");
const flowText = readFileSync(FLOW, "utf8");

describe("architect skill — Phase 4 prerequisite refusal", () => {
  it("Step 1 in SKILL.md describes the refusal explicitly", () => {
    // Step 1 should mention options.md OR selected_option_id and ABORT.
    expect(skillText).toMatch(/Step 1[\s\S]{0,400}(options\.md|selected_option_id)[\s\S]{0,200}ABORT/i);
  });

  it("references flow.yaml.failure_handling.phase_4_skipped", () => {
    expect(skillText).toMatch(/phase_4_skipped/);
  });

  it("refusal mentions Phase 4 must complete first", () => {
    expect(skillText).toMatch(/Phase 4[\s\S]{0,80}(must|requires|first)/i);
  });

  it("flow.yaml registers the failure_handling.phase_4_skipped block", () => {
    expect(flowText).toMatch(/phase_4_skipped:[\s\S]{0,200}options\.md/);
  });

  it("HITL tier C surfaces in skill body and frontmatter", () => {
    // Frontmatter description.
    expect(skillText).toMatch(/Tier C HITL/i);
    // Body section calling out the ceremony.
    expect(skillText).toMatch(/HITL[\s\S]{0,80}Tier C/i);
  });

  it("invokes @cto for sanity review", () => {
    expect(skillText).toMatch(/@cto/);
  });

  it("invokes Muse panel high-stakes-decision-panel", () => {
    expect(skillText).toMatch(/high-stakes-decision-panel/);
  });

  it("writes ops.decisions row at Tier C", () => {
    expect(skillText).toMatch(/ops\.decisions/);
    // SQL block has hitl_tier as a column then 'C' as a value, separated by
    // other columns/values. Match within a 200-char window.
    expect(skillText).toMatch(/hitl_tier[\s\S]{0,200}'C'/);
  });
});
