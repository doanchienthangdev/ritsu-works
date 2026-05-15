// Phase 8 promotion logic: copy spec.md + retrospective.md from
// .archives/cla/<id>/ → wiki/capabilities/<id>/.
//
// Two test layers:
// 1. Contract test: SKILL.md spec still names the promotion sources +
//    destinations + collision behavior.
// 2. Behavioral test: a small inline `promote()` helper that mirrors the
//    SKILL.md spec is exercised against tmp directories.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import os from "node:os";

const REPO = resolve(__dirname, "..", "..");
const SKILL = join(
  REPO,
  "06-ai-ops",
  "skills",
  "capability-lifecycle",
  "catalog-updater",
  "SKILL.md"
);
const skillText = readFileSync(SKILL, "utf8");

// --------------------------------------------------------------------------
// Contract layer — spec text retains promotion semantics
// --------------------------------------------------------------------------

describe("Phase 8 promotion contract (spec text)", () => {
  it("names spec.md as a promoted artifact", () => {
    expect(skillText).toMatch(/spec\.md[\s\S]{0,200}wiki\/capabilities/);
  });

  it("names retrospective.md as a promoted artifact", () => {
    expect(skillText).toMatch(/retrospective\.md[\s\S]{0,200}wiki\/capabilities/);
  });

  it("source path is .archives/cla/<id>/", () => {
    expect(skillText).toMatch(/\.archives\/cla\/.{0,30}\/spec\.md/);
    expect(skillText).toMatch(/\.archives\/cla\/.{0,30}\/retrospective\.md/);
  });

  it("destination is wiki/capabilities/<id>/", () => {
    expect(skillText).toMatch(/wiki\/capabilities\/.{0,30}\/spec\.md/);
    expect(skillText).toMatch(/wiki\/capabilities\/.{0,30}\/retrospective\.md/);
  });

  it("handles destination collision by asking the founder", () => {
    expect(skillText).toMatch(
      /(exists|collision)[\s\S]{0,300}(overwrite|append|abort)/i
    );
  });

  it(".archives/cla/<id>/ stays local after promotion (NOT deleted)", () => {
    expect(skillText).toMatch(
      /\.archives\/cla\/.{0,30}\/[\s\S]{0,200}STAYS local|don.?t delete|stays local/i
    );
  });
});

// --------------------------------------------------------------------------
// Behavioral layer — promote() helper mirrors the spec
// --------------------------------------------------------------------------

interface PromoteResult {
  ok: boolean;
  reason?: "destination_exists" | "missing_source";
  copied?: string[];
}

// Inline implementation of the promotion rule from catalog-updater/SKILL.md
// Step 3. Pure function over fs paths.
function promote(args: {
  archivesDir: string;
  wikiDir: string;
  capabilityId: string;
  collisionStrategy: "ask" | "overwrite" | "abort";
}): PromoteResult {
  const src = join(args.archivesDir, args.capabilityId);
  const dest = join(args.wikiDir, args.capabilityId);
  const required = ["spec.md", "retrospective.md"];

  for (const f of required) {
    if (!existsSync(join(src, f))) {
      return { ok: false, reason: "missing_source" };
    }
  }

  if (existsSync(dest)) {
    if (args.collisionStrategy === "ask") {
      return { ok: false, reason: "destination_exists" };
    }
    if (args.collisionStrategy === "abort") {
      return { ok: false, reason: "destination_exists" };
    }
    // overwrite — fall through to copy
  } else {
    mkdirSync(dest, { recursive: true });
  }

  const copied: string[] = [];
  for (const f of required) {
    const content = readFileSync(join(src, f), "utf8");
    writeFileSync(join(dest, f), content, "utf8");
    copied.push(join(dest, f));
  }
  return { ok: true, copied };
}

describe("Phase 8 promote() helper", () => {
  let tmp: string;
  let archivesDir: string;
  let wikiDir: string;
  const id = "test-cap";

  beforeEach(() => {
    tmp = join(os.tmpdir(), `cla-promotion-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    archivesDir = join(tmp, ".archives", "cla");
    wikiDir = join(tmp, "wiki", "capabilities");
    mkdirSync(join(archivesDir, id), { recursive: true });
    writeFileSync(join(archivesDir, id, "spec.md"), "# Spec for test-cap\n", "utf8");
    writeFileSync(join(archivesDir, id, "retrospective.md"), "# Retro for test-cap\n", "utf8");
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("copies spec.md + retrospective.md to wiki on first promote", () => {
    const r = promote({ archivesDir, wikiDir, capabilityId: id, collisionStrategy: "ask" });
    expect(r.ok).toBe(true);
    expect(r.copied).toHaveLength(2);
    expect(existsSync(join(wikiDir, id, "spec.md"))).toBe(true);
    expect(existsSync(join(wikiDir, id, "retrospective.md"))).toBe(true);
    // Source folder still exists (per spec — .archives stays local).
    expect(existsSync(join(archivesDir, id, "spec.md"))).toBe(true);
  });

  it("reports destination_exists when wiki/<id>/ already present (ask strategy)", () => {
    mkdirSync(join(wikiDir, id), { recursive: true });
    writeFileSync(join(wikiDir, id, "spec.md"), "old content\n", "utf8");
    const r = promote({ archivesDir, wikiDir, capabilityId: id, collisionStrategy: "ask" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("destination_exists");
    // Old content untouched.
    expect(readFileSync(join(wikiDir, id, "spec.md"), "utf8")).toBe("old content\n");
  });

  it("overwrites when collisionStrategy = overwrite", () => {
    mkdirSync(join(wikiDir, id), { recursive: true });
    writeFileSync(join(wikiDir, id, "spec.md"), "old content\n", "utf8");
    const r = promote({ archivesDir, wikiDir, capabilityId: id, collisionStrategy: "overwrite" });
    expect(r.ok).toBe(true);
    expect(readFileSync(join(wikiDir, id, "spec.md"), "utf8")).toBe("# Spec for test-cap\n");
  });

  it("reports missing_source when spec.md is absent", () => {
    rmSync(join(archivesDir, id, "spec.md"));
    const r = promote({ archivesDir, wikiDir, capabilityId: id, collisionStrategy: "ask" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("missing_source");
  });

  it("reports missing_source when retrospective.md is absent (Phase 8 gate)", () => {
    rmSync(join(archivesDir, id, "retrospective.md"));
    const r = promote({ archivesDir, wikiDir, capabilityId: id, collisionStrategy: "ask" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("missing_source");
  });
});
