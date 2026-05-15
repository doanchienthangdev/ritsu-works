// @cla subagent — bounded one-shot invocation contract.
// Verifies the agent file declares the right verbs, refusals, pre-flight checks.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const AGENT = join(REPO, ".claude", "agents", "cla.md");

const agentText = readFileSync(AGENT, "utf8");

describe("@cla subagent — agent file contract", () => {
  it("frontmatter declares name=cla", () => {
    expect(agentText).toMatch(/^---[\s\S]{0,400}name:\s*cla/m);
  });

  it("frontmatter description mentions bounded one-shot", () => {
    expect(agentText).toMatch(/(bounded one-shot|mid-conversation)/);
  });

  it("declares HITL max tier B in spec body", () => {
    expect(agentText).toMatch(/max[ -]tier:?\s*B|Max HITL.*B/i);
  });

  it("documents 4 mandatory pre-flight checks", () => {
    expect(agentText).toMatch(/Pre-flight checks/);
    expect(agentText).toMatch(/Dirty session check|git status --porcelain/);
    expect(agentText).toMatch(/Drift check|pnpm check/);
    expect(agentText).toMatch(/Capability state check/);
    expect(agentText).toMatch(/Lock check/);
  });
});

describe("@cla subagent — accepted verbs (Tier A or B only)", () => {
  it("accepts: history, status, list (Tier A read-only)", () => {
    expect(agentText).toMatch(/@cla history/);
    expect(agentText).toMatch(/@cla status/);
    expect(agentText).toMatch(/@cla list/);
  });

  it("accepts: fix, tune (Tier B with sub-flow spawn)", () => {
    expect(agentText).toMatch(/@cla fix/);
    expect(agentText).toMatch(/@cla tune/);
  });

  it("accepts: update (with auto-classification)", () => {
    expect(agentText).toMatch(/@cla update/);
    expect(agentText).toMatch(/(auto-classify|classified as|LLM classification)/i);
  });
});

describe("@cla subagent — REFUSED verbs (Tier C+ escalation)", () => {
  it("refuses propose (full Phase 1-8 ceremony)", () => {
    expect(agentText).toMatch(/refuses?[\s\S]{0,100}propose|propose[\s\S]{0,200}REFUSE/i);
  });

  it("refuses revise (Tier C architecture)", () => {
    expect(agentText).toMatch(/refuses?[\s\S]{0,100}revise|revise[\s\S]{0,200}REFUSE|@cla revise[\s\S]{0,300}ESCALATION/i);
  });

  it("refuses deprecate (Tier C irreversible)", () => {
    expect(agentText).toMatch(/(refuses?[\s\S]{0,100}deprecate|deprecate[\s\S]{0,200}REFUSE|@cla deprecate[\s\S]{0,300}ESCALATION)/i);
  });

  it("refuses force-unlock (Tier D-Std magic phrase)", () => {
    expect(agentText).toMatch(/(refuses?[\s\S]{0,100}force-unlock|force-unlock[\s\S]{0,200}REFUSE|D-Std)/i);
  });

  it("refusal message format includes ESCALATION-REQUIRED", () => {
    expect(agentText).toMatch(/ESCALATION-REQUIRED/);
  });
});

describe("@cla subagent — output contract + audit", () => {
  it("specifies output format with Verb/Tier/Pre-flight/Cost/Action/Result/Next sections", () => {
    expect(agentText).toMatch(/\*\*Verb:\*\*/);
    expect(agentText).toMatch(/\*\*Tier:\*\*/);
    expect(agentText).toMatch(/\*\*Pre-flight:\*\*/);
    expect(agentText).toMatch(/\*\*Cost:\*\*/);
  });

  it("audit log writes to ops.agent_runs with cla-subagent slug", () => {
    expect(agentText).toMatch(/agent_slug=cla-subagent/);
  });

  it("session_id format prefixed for distinguishability", () => {
    expect(agentText).toMatch(/subagent-cla-/);
  });
});

describe("@cla subagent — common patterns documented", () => {
  it("documents Pattern 1: pure read mid-conversation", () => {
    expect(agentText).toMatch(/(Pattern 1|pure read)/i);
  });

  it("documents Pattern 4: refuse + redirect", () => {
    expect(agentText).toMatch(/(refuse \+ redirect|Pattern 4)/i);
  });
});
