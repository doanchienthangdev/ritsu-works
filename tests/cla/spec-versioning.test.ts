// version-bumper skill + spec versioning behavior.
//
// The skill is pure semver computation. Tests verify:
// 1. Spec contract (version-bumper SKILL.md retains deterministic rules)
// 2. Inline bump() helper produces correct next version per sub-flow
// 3. Spec archiving path convention (wiki/capabilities/<id>/spec-v<X.Y.Z>.md)

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const SKILL = join(REPO, "06-ai-ops", "skills", "capability-lifecycle", "version-bumper", "SKILL.md");
const CATALOG_SKILL = join(REPO, "06-ai-ops", "skills", "capability-lifecycle", "catalog-updater", "SKILL.md");
const SPEC = join(REPO, "06-ai-ops", "sops", "SOP-AIOPS-001-extend", "flow.yaml");

const skillText = readFileSync(SKILL, "utf8");
const catalogText = readFileSync(CATALOG_SKILL, "utf8");
const extendFlow = readFileSync(SPEC, "utf8");

describe("version-bumper — spec contract", () => {
  it("frontmatter declares pure semver, no LLM", () => {
    expect(skillText).toMatch(/[Pp]ure semver|no LLM/);
  });

  it("documents 4 sub-flow rules: fix=patch++, tune=patch++, extend=minor++, revise=major++", () => {
    expect(skillText).toMatch(/fix.*patch\+\+/);
    expect(skillText).toMatch(/tune.*patch\+\+/);
    expect(skillText).toMatch(/extend.*minor\+\+/);
    expect(skillText).toMatch(/revise.*major\+\+/);
  });

  it("documents NOT used by deprecate (state transition only)", () => {
    expect(skillText).toMatch(/[Nn]ot used by .{0,10}deprecate|deprecate.*no.*bump/i);
  });

  it("registers idempotency check via concurrent bump detection", () => {
    expect(skillText).toMatch(/[Ii]dempotency|VersionBumpConflict/);
  });

  it("documents missing-version field default to '1.0.0' (backward compat)", () => {
    expect(skillText).toMatch(/(missing|absent).*['"]1\.0\.0['"]|default.*['"]1\.0\.0['"]/);
  });
});

// --------------------------------------------------------------------------
// Behavioral layer — inline bump() helper
// --------------------------------------------------------------------------

type SubFlow = "fix" | "tune" | "extend" | "revise" | "deprecate";

function bumpVersion(current: string, sub_flow: SubFlow): string | null {
  if (sub_flow === "deprecate") return null; // no bump
  const m = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`InvalidVersion: ${current}`);
  let [, maj, min, pat] = m.map((x) => parseInt(x, 10) as number) as unknown as [number, number, number, number];
  // normalize types
  let major = maj as number, minor = min as number, patch = pat as number;
  switch (sub_flow) {
    case "fix":
    case "tune":
      patch += 1;
      break;
    case "extend":
      minor += 1;
      patch = 0;
      break;
    case "revise":
      major += 1;
      minor = 0;
      patch = 0;
      break;
  }
  return `${major}.${minor}.${patch}`;
}

describe("version-bumper — inline bump() helper", () => {
  it("fix bumps patch", () => {
    expect(bumpVersion("1.0.0", "fix")).toBe("1.0.1");
    expect(bumpVersion("1.5.3", "fix")).toBe("1.5.4");
  });

  it("tune bumps patch (same as fix)", () => {
    expect(bumpVersion("1.0.0", "tune")).toBe("1.0.1");
    expect(bumpVersion("2.7.9", "tune")).toBe("2.7.10");
  });

  it("extend bumps minor and resets patch", () => {
    expect(bumpVersion("1.0.5", "extend")).toBe("1.1.0");
    expect(bumpVersion("1.0.0", "extend")).toBe("1.1.0");
    expect(bumpVersion("3.7.99", "extend")).toBe("3.8.0");
  });

  it("revise bumps major and resets minor + patch", () => {
    expect(bumpVersion("1.5.3", "revise")).toBe("2.0.0");
    expect(bumpVersion("1.0.0", "revise")).toBe("2.0.0");
    expect(bumpVersion("9.99.99", "revise")).toBe("10.0.0");
  });

  it("deprecate returns null (no bump)", () => {
    expect(bumpVersion("1.0.0", "deprecate")).toBeNull();
  });

  it("throws InvalidVersion for malformed input", () => {
    expect(() => bumpVersion("abc", "fix")).toThrow(/InvalidVersion/);
    expect(() => bumpVersion("1.0", "fix")).toThrow(/InvalidVersion/);
    expect(() => bumpVersion("1.0.0-beta", "fix")).toThrow(/InvalidVersion/);
  });
});

// --------------------------------------------------------------------------
// Spec archiving convention
// --------------------------------------------------------------------------

describe("Spec versioning — archiving convention", () => {
  it("catalog-updater (extend mode) archives prior spec to spec-v<X.Y.Z>.md", () => {
    expect(catalogText).toMatch(/spec-v.{0,10}\.md/);
    expect(catalogText).toMatch(/(Archive prior|prior_version)/i);
  });

  it("catalog-updater (revise mode) also archives prior retrospective", () => {
    expect(catalogText).toMatch(/retrospective-v.{0,10}\.md|retrospective.*archive/i);
  });

  it("catalog-updater (deprecate mode) KEEPS spec.md (NOT deleted)", () => {
    expect(catalogText).toMatch(/(KEEP.*spec\.md|spec.*retention|not deleted)/i);
  });

  it("extend flow.yaml output declares spec.md (new version) + spec-v<prior>.md", () => {
    expect(extendFlow).toMatch(/spec\.md.*new version/i);
    expect(extendFlow).toMatch(/spec-v.{0,10}\.md/);
  });
});
