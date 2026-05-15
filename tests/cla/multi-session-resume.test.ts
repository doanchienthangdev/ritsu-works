// Phase 7 (implementation-coordinator) MUST persist state to
// ops.capability_runs.state_payload.completed_sprints[] so that
// /cla resume <id> picks up at the next incomplete sprint.
//
// This test asserts the SKILL.md spec retains the resume contract.
// It also exercises the "select next sprint" pure function inline so
// future regressions in the math get caught.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const SKILL = join(
  REPO,
  "06-ai-ops",
  "skills",
  "capability-lifecycle",
  "implementation-coordinator",
  "SKILL.md"
);
const CMD = join(REPO, ".claude", "commands", "cla.md");

const skillText = readFileSync(SKILL, "utf8");
const cmdText = readFileSync(CMD, "utf8");

// Pure function mirroring the "next sprint" rule from SKILL.md.
function nextSprint(payload: { completed_sprints?: number[] }, totalSprints: number): number | "done" {
  const completed = (payload.completed_sprints ?? []).slice().sort((a, b) => a - b);
  for (let i = 1; i <= totalSprints; i += 1) {
    if (!completed.includes(i)) return i;
  }
  return "done";
}

describe("Phase 7 multi-session resume contract", () => {
  it("SKILL.md describes state_payload.completed_sprints persistence", () => {
    expect(skillText).toMatch(/state_payload[\s\S]{0,80}completed_sprints/);
  });

  it("SKILL.md references current_sprint persistence", () => {
    expect(skillText).toMatch(/current_sprint/);
  });

  it("SKILL.md describes /cla resume <id> entry point", () => {
    expect(skillText).toMatch(/\/cla resume/);
  });

  it("SKILL.md re-runs Phase 0 drift check on resume", () => {
    // The resume semantics block calls out re-running Phase 0.
    expect(skillText).toMatch(/(resume|Resume)[\s\S]{0,300}Phase 0/i);
  });

  it("SKILL.md fires phase_7_session_lost when idle > 7 days", () => {
    expect(skillText).toMatch(/7\s*days|interval\s*'7\s*days'/);
    expect(skillText).toMatch(/phase_7_session_lost/);
  });

  it("/cla command describes resume semantics", () => {
    expect(cmdText).toMatch(/Resume semantics/i);
    expect(cmdText).toMatch(/\/cla resume/);
  });

  it("/cla command notes the founder-merges-not-auto invariant", () => {
    // The cla.md spec uses "Founder reviews + merges per PR" language.
    expect(cmdText).toMatch(/Founder reviews \+ merges|never auto-merge|founder merges/i);
  });

  it("nextSprint returns 1 when no sprints completed", () => {
    expect(nextSprint({}, 3)).toBe(1);
    expect(nextSprint({ completed_sprints: [] }, 3)).toBe(1);
  });

  it("nextSprint returns N+1 when sprints 1..N are complete", () => {
    expect(nextSprint({ completed_sprints: [1] }, 3)).toBe(2);
    expect(nextSprint({ completed_sprints: [1, 2] }, 3)).toBe(3);
  });

  it("nextSprint handles out-of-order completion arrays", () => {
    expect(nextSprint({ completed_sprints: [2, 1] }, 3)).toBe(3);
    expect(nextSprint({ completed_sprints: [3, 1] }, 3)).toBe(2);
  });

  it("nextSprint returns 'done' when all sprints complete", () => {
    expect(nextSprint({ completed_sprints: [1, 2, 3] }, 3)).toBe("done");
  });

  it("nextSprint returns 'done' even with extras (defensive)", () => {
    expect(nextSprint({ completed_sprints: [1, 2, 3, 4] }, 3)).toBe("done");
  });
});
