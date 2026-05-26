// Sprint 2 of capability `update` v1.0 — citation spine + distill/review tests.
//
// Covers:
//   - Migration 00040 structure (table, indices, trigger, RLS)
//   - knowledge/manifest.yaml registers ops.evolve_extractions
//   - knowledge/cross-tier-invariants.yaml flips review-state-machine invariant live
//   - 2 new skills exist with required frontmatter + sections
//   - 4 helper scripts have expected exports + module behavior
//
// Acceptance criteria covered: A2 (citation spine), A3 (review queue),
// A22 (wiki:query= dispatch hook), A23 (size estimator).
// Behavioral assertions for R4 (classify-diff SOP rules), R5 (3-way diff
// conflict detection), R7 (Big-ref ABORT) live in separate test files
// (resolve-refs-multi-flag.test.ts has the R8 prior); R4/R5/R7 in this file.

import { describe, it, expect } from "vitest";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const REPO = resolve(__dirname, "..", "..");
const MIGRATION = join(REPO, "supabase", "migrations", "00040_evolve_extractions.sql");
const MANIFEST = join(REPO, "knowledge", "manifest.yaml");
const INVARIANTS = join(REPO, "knowledge", "cross-tier-invariants.yaml");
const DISTILL_SKILL = join(REPO, "06-ai-ops", "skills", "eval-evo", "distill-from-refs", "SKILL.md");
const REVIEW_SKILL = join(REPO, "06-ai-ops", "skills", "eval-evo", "review-extractions", "SKILL.md");

const migrationText = readFileSync(MIGRATION, "utf8");
const manifestText = readFileSync(MANIFEST, "utf8");
const invariantsText = readFileSync(INVARIANTS, "utf8");
const distillSkillText = readFileSync(DISTILL_SKILL, "utf8");
const reviewSkillText = readFileSync(REVIEW_SKILL, "utf8");

// ────────────────────────────────────────────────────────────────────────
// Migration 00040 structural assertions
// ────────────────────────────────────────────────────────────────────────
describe("Migration 00040 — citation spine table + trigger", () => {
  it("creates ops.evolve_extractions table", () => {
    expect(migrationText).toMatch(/CREATE TABLE\s+IF NOT EXISTS\s+ops\.evolve_extractions/);
  });

  it("constrains ref_source_kind to known kinds", () => {
    expect(migrationText).toMatch(/ref_source_kind[\s\S]{0,200}CHECK[\s\S]{0,200}'file'[\s\S]{0,200}'wiki-src'[\s\S]{0,200}'wiki-query'[\s\S]{0,200}'raw'/);
  });

  it("caps raw_quote at 2000 chars", () => {
    expect(migrationText).toMatch(/length\(raw_quote\)\s*<=\s*2000/);
  });

  it("constrains confidence to [0, 1]", () => {
    expect(migrationText).toMatch(/confidence\s+NUMERIC\(3,\s*2\)[\s\S]{0,200}confidence >= 0\.0[\s\S]{0,200}confidence <= 1\.0/);
  });

  it("declares review_state enum with all 6 states", () => {
    for (const state of ["auto_accepted", "pending_review", "rejected_low_confidence", "founder_accepted", "founder_rejected", "founder_edited"]) {
      expect(migrationText).toContain(`'${state}'`);
    }
  });

  it("FK agent_run_id ON DELETE CASCADE", () => {
    expect(migrationText).toMatch(/agent_run_id[\s\S]{0,200}REFERENCES ops\.agent_runs\(id\)[\s\S]{0,100}ON DELETE CASCADE/);
  });

  it("indexes pending_review for queue hot path", () => {
    expect(migrationText).toMatch(/CREATE INDEX[\s\S]{0,200}idx_evolve_extractions_pending[\s\S]{0,200}WHERE review_state = 'pending_review'/);
  });

  it("indexes ref_path + ref_chunk_index for re-distill dedup", () => {
    expect(migrationText).toMatch(/CREATE INDEX[\s\S]{0,200}idx_evolve_extractions_ref[\s\S]{0,200}\(ref_path,\s*ref_chunk_index\)/);
  });

  it("creates updated_at auto-update trigger", () => {
    expect(migrationText).toMatch(/CREATE OR REPLACE FUNCTION\s+ops\.evolve_extractions_set_updated_at/);
    expect(migrationText).toMatch(/BEFORE UPDATE ON ops\.evolve_extractions/);
  });

  it("creates review-state transition enforcement trigger", () => {
    expect(migrationText).toMatch(/CREATE OR REPLACE FUNCTION\s+ops\.evolve_extractions_check_review_transition/);
  });

  it("trigger raises on terminal-state mutation (auto_accepted)", () => {
    expect(migrationText).toMatch(/OLD\.review_state IN \('auto_accepted',\s*'rejected_low_confidence'\)/);
  });

  it("trigger restricts pending_review transitions to founder_* states", () => {
    expect(migrationText).toMatch(/'founder_accepted'[\s\S]{0,200}'founder_rejected'[\s\S]{0,200}'founder_edited'/);
  });

  it("enables RLS + declares founder + writers + readers policies", () => {
    expect(migrationText).toMatch(/ALTER TABLE\s+ops\.evolve_extractions\s+ENABLE ROW LEVEL SECURITY/);
    expect(migrationText).toMatch(/CREATE POLICY\s+evolve_extractions_founder_all/);
    expect(migrationText).toMatch(/CREATE POLICY\s+evolve_extractions_writers_all/);
    expect(migrationText).toMatch(/CREATE POLICY\s+evolve_extractions_readers/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Tier 1 yaml registrations
// ────────────────────────────────────────────────────────────────────────
describe("knowledge/manifest.yaml — ops.evolve_extractions entry", () => {
  it("registers the table under tier2_operational.schemas.ops.tables", () => {
    expect(manifestText).toMatch(/- name:\s+evolve_extractions[\s\S]{0,500}migration_file:\s+supabase\/migrations\/00040_evolve_extractions\.sql/);
  });

  it("documents the 3-bucket confidence convention", () => {
    expect(manifestText).toMatch(/3-bucket confidence convention[\s\S]{0,500}>= 0\.85[\s\S]{0,200}0\.6[\s\S]{0,200}< 0\.6/);
  });
});

describe("knowledge/cross-tier-invariants.yaml — review-state invariant flipped live", () => {
  it("evolve-extractions-review-state-machine-valid: status: live", () => {
    expect(invariantsText).toMatch(/id:\s+evolve-extractions-review-state-machine-valid[\s\S]{0,300}status:\s+live/);
  });

  it("references the DB trigger as the enforcement mechanism", () => {
    expect(invariantsText).toMatch(/evolve-extractions-review-state-machine-valid[\s\S]{0,1000}trg_evolve_extractions_review_transition/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// distill-from-refs SKILL.md
// ────────────────────────────────────────────────────────────────────────
describe("06-ai-ops/skills/eval-evo/distill-from-refs/SKILL.md", () => {
  it("declares required frontmatter (name + description + trigger + budget_cap_task_kind)", () => {
    expect(distillSkillText).toMatch(/^---[\s\S]{0,500}name:\s+eval-evo\/distill-from-refs/);
    expect(distillSkillText).toMatch(/description:/);
    expect(distillSkillText).toMatch(/trigger:\s+invoked-by-orchestrator-only/);
    expect(distillSkillText).toMatch(/budget_cap_task_kind:\s+entity-update-distill-skill/);
  });

  it("documents per-type model picker (Haiku for command, Sonnet for skill/agent/sop)", () => {
    expect(distillSkillText).toMatch(/\| `command` \| `claude-haiku-4-5`/);
    expect(distillSkillText).toMatch(/\| `skill` \| `claude-sonnet-4-6`/);
    expect(distillSkillText).toMatch(/\| `agent` \| `claude-sonnet-4-6`/);
    expect(distillSkillText).toMatch(/\| `sop` \| `claude-sonnet-4-6`/);
  });

  it("R7 acceptance — Big-ref ABORT before any LLM call", () => {
    expect(distillSkillText).toMatch(/cost_estimate_usd[\s\S]{0,300}per_task_kind_cap_usd\s*[×x*]\s*2/);
    expect(distillSkillText).toMatch(/aborted_reason:\s*'estimate_exceeds_2x_cap'/);
  });

  it("documents 3-bucket confidence rounding", () => {
    expect(distillSkillText).toMatch(/>= 0\.85.*auto_accepted/);
    expect(distillSkillText).toMatch(/0\.6-0\.85.*pending_review/);
    expect(distillSkillText).toMatch(/< 0\.6.*rejected_low_confidence/);
  });

  it("documents citation spine rule (proposed_change must cite raw_quote)", () => {
    expect(distillSkillText).toMatch(/EVERY proposed_change MUST cite a raw_quote/);
  });

  it("documents anti-fabrication instruction", () => {
    expect(distillSkillText).toMatch(/NEVER fabricate quotes/);
  });

  it("references ops.evolve_extractions as the insert target", () => {
    expect(distillSkillText).toMatch(/INSERT to ops\.evolve_extractions/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// review-extractions SKILL.md
// ────────────────────────────────────────────────────────────────────────
describe("06-ai-ops/skills/eval-evo/review-extractions/SKILL.md", () => {
  it("declares required frontmatter", () => {
    expect(reviewSkillText).toMatch(/^---[\s\S]{0,300}name:\s+eval-evo\/review-extractions/);
    expect(reviewSkillText).toMatch(/description:/);
    expect(reviewSkillText).toMatch(/budget_cap_task_kind:\s+entity-update-review-extractions/);
  });

  it("documents the 4-action UX (Accept / Edit / Reject / Skip)", () => {
    expect(reviewSkillText).toMatch(/Accept \(Recommended\)/);
    expect(reviewSkillText).toMatch(/Edit/);
    expect(reviewSkillText).toMatch(/Reject/);
    expect(reviewSkillText).toMatch(/Skip \+ finish later/);
  });

  it("documents the legal state machine transitions (pending_review → founder_*)", () => {
    expect(reviewSkillText).toMatch(/founder_accepted/);
    expect(reviewSkillText).toMatch(/founder_rejected/);
    expect(reviewSkillText).toMatch(/founder_edited/);
  });

  it("declares multi-session resumability", () => {
    expect(reviewSkillText).toMatch(/Multi-session resumab/i);
    expect(reviewSkillText).toMatch(/\/update resume/);
  });

  it("documents the 25-item soft cap on queue size", () => {
    expect(reviewSkillText).toMatch(/25/);
    expect(reviewSkillText).toMatch(/queue fatigue|fatigue/i);
  });

  it("invokes AskUserQuestion as the founder UI mechanism", () => {
    expect(reviewSkillText).toMatch(/AskUserQuestion/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Helper script: scripts/update/size-estimator.cjs
// ────────────────────────────────────────────────────────────────────────
describe("scripts/update/size-estimator.cjs — module behavior", () => {
  const sizer = require(join(REPO, "scripts", "update", "size-estimator.cjs"));

  it("exports parseArgs + estimate + constants", () => {
    expect(typeof sizer.parseArgs).toBe("function");
    expect(typeof sizer.estimate).toBe("function");
    expect(sizer.DIFF_LOC_PER_KB).toBe(8);
    expect(sizer.COST_USD_PER_KB_SONNET).toBe(0.020);
    expect(sizer.COST_USD_PER_KB_HAIKU).toBe(0.005);
  });

  it("estimate returns warnings for missing refs", () => {
    const result = sizer.estimate(["/nonexistent/path-xyz-test.md"], "skill");
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings[0]).toMatch(/not found/);
  });

  it("estimate uses Haiku cost for command entity type", () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "size-est-"));
    const refPath = join(tmpDir, "ref.md");
    writeFileSync(refPath, "x".repeat(1024)); // 1 KB
    try {
      const result = sizer.estimate([refPath], "command");
      expect(result.llm_model).toBe("claude-haiku-4-5");
      // 1 KB × $0.005/KB = $0.005
      expect(result.estimated_distill_cost_usd).toBeCloseTo(0.005, 4);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("estimate uses Sonnet cost for skill entity type", () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "size-est-"));
    const refPath = join(tmpDir, "ref.md");
    writeFileSync(refPath, "x".repeat(1024)); // 1 KB
    try {
      const result = sizer.estimate([refPath], "skill");
      expect(result.llm_model).toBe("claude-sonnet-4-6");
      expect(result.estimated_distill_cost_usd).toBeCloseTo(0.020, 4);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("estimate predicts diff_loc as 8 × KB", () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "size-est-"));
    const refPath = join(tmpDir, "ref.md");
    writeFileSync(refPath, "x".repeat(2048)); // 2 KB
    try {
      const result = sizer.estimate([refPath], "skill");
      expect(result.estimated_diff_loc).toBe(16); // 2 KB × 8 loc/KB
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("estimate aggregates multiple refs", () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "size-est-"));
    const r1 = join(tmpDir, "a.md");
    const r2 = join(tmpDir, "b.md");
    writeFileSync(r1, "x".repeat(512));
    writeFileSync(r2, "x".repeat(512));
    try {
      const result = sizer.estimate([r1, r2], "skill");
      expect(result.total_ref_bytes).toBe(1024);
      expect(result.ref_files).toHaveLength(2);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// Helper script: scripts/update/classify-diff.cjs (R4 acceptance)
// ────────────────────────────────────────────────────────────────────────
describe("scripts/update/classify-diff.cjs — R4 SOP structural matrix", () => {
  const classifier = require(join(REPO, "scripts", "update", "classify-diff.cjs"));

  it("exports parseArgs + parseUnifiedDiff + classifyDiff + classifySopChange + HITL helpers", () => {
    expect(typeof classifier.parseArgs).toBe("function");
    expect(typeof classifier.parseUnifiedDiff).toBe("function");
    expect(typeof classifier.classifyDiff).toBe("function");
    expect(typeof classifier.classifySopChange).toBe("function");
    expect(typeof classifier.isHitlTightening).toBe("function");
    expect(typeof classifier.hitlOrderIndex).toBe("function");
    expect(classifier.HITL_ORDER).toEqual(["A", "B", "C", "D-Std", "D-MAX"]);
  });

  it("hitlOrderIndex orders tiers correctly", () => {
    expect(classifier.hitlOrderIndex("A")).toBe(0);
    expect(classifier.hitlOrderIndex("B")).toBe(1);
    expect(classifier.hitlOrderIndex("C")).toBe(2);
    expect(classifier.hitlOrderIndex("D-MAX")).toBe(4);
    expect(classifier.hitlOrderIndex("invalid")).toBe(-1);
  });

  it("isHitlTightening detects B → C as tightening", () => {
    const result = classifier.isHitlTightening({ hitl: "B" }, { hitl: "C" });
    expect(result.tightened).toBe(true);
    expect(result.field).toBe("hitl");
    expect(result.before).toBe("B");
    expect(result.after).toBe("C");
  });

  it("isHitlTightening does NOT flag C → B as tightening (loosening)", () => {
    const result = classifier.isHitlTightening({ hitl: "C" }, { hitl: "B" });
    expect(result.tightened).toBe(false);
  });

  it("R4 — classifySopChange detects step removal (shape-level)", () => {
    const before = `
steps:
  - step: drift_check
  - step: lock_acquire
  - step: distill
`;
    const after = `
steps:
  - step: drift_check
  - step: distill
`;
    const fakeDiff = { additions: [], deletions: [], context_lines: [] };
    const rules = classifier.classifySopChange(before, after, fakeDiff);
    expect(rules.some((r) => r.includes("sop_step_removed"))).toBe(true);
  });

  it("R4 — classifySopChange detects step reorder (shape-level)", () => {
    const before = `
steps:
  - step: a
  - step: b
  - step: c
`;
    const after = `
steps:
  - step: a
  - step: c
  - step: b
`;
    const fakeDiff = { additions: [], deletions: [], context_lines: [] };
    const rules = classifier.classifySopChange(before, after, fakeDiff);
    expect(rules).toContain("sop_step_reordered");
  });

  it("R4 — classifySopChange detects HITL tightening (B → C)", () => {
    const before = `
hitl: B
steps:
  - step: a
`;
    const after = `
hitl: C
steps:
  - step: a
`;
    const fakeDiff = { additions: [], deletions: [], context_lines: [] };
    const rules = classifier.classifySopChange(before, after, fakeDiff);
    expect(rules.some((r) => r.includes("hitl_tightening"))).toBe(true);
  });

  it("R4 — classifySopChange detects drift_check toggle", () => {
    const before = `
drift_check: true
steps:
  - step: a
`;
    const after = `
drift_check: false
steps:
  - step: a
`;
    const fakeDiff = { additions: [], deletions: [], context_lines: [] };
    const rules = classifier.classifySopChange(before, after, fakeDiff);
    expect(rules.some((r) => r.includes("drift_check_toggle"))).toBe(true);
  });

  it("R4 fallback — diff-only heuristic detects step removal when yaml unavailable", () => {
    const fakeDiff = {
      additions: ["other content"],
      deletions: ["  - step: removed_step", "  - step: another"],
      context_lines: [],
    };
    const rules = classifier.classifySopChange(null, null, fakeDiff);
    expect(rules.some((r) => r.includes("sop_step_removed"))).toBe(true);
  });

  it("classifyDiff returns 'structural' for diffs touching migration files", () => {
    const diff = `+++ b/supabase/migrations/00099_test.sql
@@ -0,0 +1,1 @@
+CREATE TABLE ops.foo (id uuid);
`;
    const files = classifier.parseUnifiedDiff(diff);
    const result = classifier.classifyDiff(files, "skill");
    expect(result.classification).toBe("structural");
    expect(result.structural_rules_hit).toContain("migration_added_or_modified");
  });

  it("classifyDiff returns 'structural' for diffs touching governance/", () => {
    const diff = `+++ b/governance/HITL.md
@@ -1,3 +1,3 @@
 line1
-old
+new
`;
    const files = classifier.parseUnifiedDiff(diff);
    const result = classifier.classifyDiff(files, "skill");
    expect(result.classification).toBe("structural");
    expect(result.structural_rules_hit).toContain("governance_modified");
  });

  it("classifyDiff returns 'trivial' for ≤ 5 lines in single file", () => {
    const diff = `+++ b/06-ai-ops/skills/foo/SKILL.md
@@ -1,3 +1,3 @@
 line1
-old
+new
`;
    const files = classifier.parseUnifiedDiff(diff);
    const result = classifier.classifyDiff(files, "skill");
    expect(result.classification).toBe("trivial");
  });
});

// ────────────────────────────────────────────────────────────────────────
// Helper script: scripts/update/three-way-diff.cjs (R5 acceptance)
// ────────────────────────────────────────────────────────────────────────
describe("scripts/update/three-way-diff.cjs — R5 conflict detection", () => {
  const tw = require(join(REPO, "scripts", "update", "three-way-diff.cjs"));

  it("exports parseArgs + extractMarker + threeWayDiff + helpers", () => {
    expect(typeof tw.parseArgs).toBe("function");
    expect(typeof tw.extractMarker).toBe("function");
    expect(typeof tw.lineDiff).toBe("function");
    expect(typeof tw.threeWayDiff).toBe("function");
  });

  it("extractMarker reads HTML-comment update marker (markdown)", () => {
    const text = "# Title\n<!-- updated-by: /update v1.0 16720cb5-f2fe-47f0-9d47-beaeca5f05e1 @ 2026-05-26 -->\nbody";
    const marker = tw.extractMarker(text);
    expect(marker?.run_id).toBe("16720cb5-f2fe-47f0-9d47-beaeca5f05e1");
    expect(marker?.version).toBe("1.0");
  });

  it("extractMarker reads YAML-style marker (# updated-by)", () => {
    const text = "name: foo\n# updated-by: /update v1.0 11111111-2222-3333-4444-555555555555\nbody: bar";
    const marker = tw.extractMarker(text);
    expect(marker?.run_id).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("extractMarker reads SQL-style marker (-- updated-by)", () => {
    const text = "CREATE TABLE x();\n-- updated-by: /update v1.0 22222222-3333-4444-5555-666666666666\nINSERT INTO x VALUES();";
    const marker = tw.extractMarker(text);
    expect(marker?.run_id).toBe("22222222-3333-4444-5555-666666666666");
  });

  it("extractMarker returns null when no marker present", () => {
    expect(tw.extractMarker("plain text")).toBeNull();
  });

  it("threeWayDiff returns fast_forward when yours == base", () => {
    const base = "line1\nline2\nline3";
    const result = tw.threeWayDiff(base, base, "line1\nNEW\nline3");
    expect(result.status).toBe("fast_forward");
    expect(result.conflict_regions).toHaveLength(0);
  });

  it("R5 — threeWayDiff returns conflict when yours AND theirs both modify same line", () => {
    const base = "line1\nline2\nline3";
    const yours = "line1\nYOURS-modified\nline3";
    const theirs = "line1\nTHEIRS-modified\nline3";
    const result = tw.threeWayDiff(base, yours, theirs);
    expect(result.status).toBe("conflict");
    expect(result.conflict_regions).toHaveLength(1);
    expect(result.conflict_regions[0].base_snippet).toBe("line2");
    expect(result.conflict_regions[0].yours_snippet).toBe("YOURS-modified");
    expect(result.conflict_regions[0].theirs_snippet).toBe("THEIRS-modified");
  });

  it("threeWayDiff returns merge_ok when yours and theirs modify disjoint lines", () => {
    const base = "line1\nline2\nline3\nline4";
    const yours = "YOURS\nline2\nline3\nline4";
    const theirs = "line1\nline2\nline3\nTHEIRS";
    const result = tw.threeWayDiff(base, yours, theirs);
    expect(result.status).toBe("merge_ok");
    expect(result.conflict_regions).toHaveLength(0);
  });

  it("R5 — threeWayDiff surfaces prior_marker when present in yours", () => {
    const base = "<!-- updated-by: /update v1.0 aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee -->\nbody";
    const yours = "<!-- updated-by: /update v1.0 aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee -->\nyours-modified-body";
    const theirs = "<!-- updated-by: /update v1.0 aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee -->\ntheirs-modified-body";
    const result = tw.threeWayDiff(base, yours, theirs);
    expect(result.status).toBe("conflict");
    expect(result.prior_marker?.run_id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  });

  it("lineDiff identifies modified line indices", () => {
    const result = tw.lineDiff("a\nb\nc", "a\nXX\nc");
    expect(result.modified_lines.has(1)).toBe(true);
    expect(result.modified_lines.has(0)).toBe(false);
    expect(result.modified_lines.has(2)).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Helper script: scripts/update/refs-resolver.cjs
// ────────────────────────────────────────────────────────────────────────
describe("scripts/update/refs-resolver.cjs — module behavior", () => {
  const rr = require(join(REPO, "scripts", "update", "refs-resolver.cjs"));

  it("exports parseArgs + delegateToClaResolveRefs", () => {
    expect(typeof rr.parseArgs).toBe("function");
    expect(typeof rr.delegateToClaResolveRefs).toBe("function");
  });

  it("parseArgs accepts --run-id + multi --refs + comma-split CSV", () => {
    const args = rr.parseArgs(["node", "script.js", "--run-id=abc-123", "--refs=a,b", "--refs=c"]);
    expect(args.runId).toBe("abc-123");
    expect(args.refs).toEqual(["a", "b", "c"]);
  });

  it("parseArgs handles --dry-run flag", () => {
    const args = rr.parseArgs(["node", "script.js", "--run-id=x", "--refs=foo", "--dry-run"]);
    expect(args.dryRun).toBe(true);
  });
});
