// Sprint 3 of capability `update` v1.0 — /update command + orchestrator skill +
// test-gen skill + entity-update-orchestrator role + ref-source-allowlist.
//
// Acceptance criteria covered:
//   A1 — end-to-end happy path documentation (command + orchestrator contracts)
//   A4 — K4 ratchet with ±5pt slack documented in orchestrator
//   A14 — test-gen output follows All-Edge-Cases-Test 5-phase structure
//   A15 — install marker pattern present + documented
//   A26 — test-gen body contains All-Edge-Cases-Test rule VERBATIM
//   A27 — --skip-drift-check emits Tier-C audit event
//   A32 — orchestrator dispatches to shared eval-evo skills (no direct LLM)
//
// Plus T9 — ref-source-allowlist for agent type prompt-injection guard.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const CMD = join(REPO, ".claude", "commands", "update.md");
const ORCH_SKILL = join(REPO, "06-ai-ops", "skills", "entity-update", "orchestrator", "SKILL.md");
const TESTGEN_SKILL = join(REPO, "06-ai-ops", "skills", "eval-evo", "test-gen", "SKILL.md");
const ROLES = join(REPO, "governance", "ROLES.md");
const ALLOWLIST_SCRIPT = join(REPO, "scripts", "update", "ref-source-allowlist.cjs");

const cmdText = readFileSync(CMD, "utf8");
const orchText = readFileSync(ORCH_SKILL, "utf8");
const testgenText = readFileSync(TESTGEN_SKILL, "utf8");
const rolesText = readFileSync(ROLES, "utf8");

// ────────────────────────────────────────────────────────────────────────
// .claude/commands/update.md
// ────────────────────────────────────────────────────────────────────────
describe(".claude/commands/update.md — argv + subcommand schema", () => {
  it("declares required frontmatter (name, capability, role, cost_bucket)", () => {
    expect(cmdText).toMatch(/^---[\s\S]{0,400}name:\s+update/);
    expect(cmdText).toMatch(/capability:\s+update/);
    expect(cmdText).toMatch(/role:\s+entity-update-orchestrator/);
    expect(cmdText).toMatch(/cost_bucket:\s+entity-update-orchestrator/);
  });

  it("documents primary form: /update <type> <name> --refs=<csv>", () => {
    expect(cmdText).toMatch(/\/update <type> <name> --refs=<csv>/);
  });

  it("constrains entity-type enum to skill | command | agent | sop (v1.0 scope)", () => {
    expect(cmdText).toMatch(/enum:\s+skill,\s+command,\s+agent,\s+sop/);
  });

  it("declares 10 subcommands (review/status/history/resume/reject/discard/list/cancel/force-unlock + primary)", () => {
    for (const sub of ["review", "status", "history", "resume", "reject", "discard", "list", "cancel", "force-unlock"]) {
      expect(cmdText).toMatch(new RegExp(`\\/update ${sub}`));
    }
  });

  it("documents 3 Tier C override flags (--force-pr, --skip-drift-check, --allow-untrusted-refs)", () => {
    expect(cmdText).toMatch(/--force-pr/);
    expect(cmdText).toMatch(/--skip-drift-check/);
    expect(cmdText).toMatch(/--allow-untrusted-refs/);
  });

  it("A27 — --skip-drift-check emits Tier C audit event", () => {
    expect(cmdText).toMatch(/--skip-drift-check[\s\S]{0,400}ops\.audit_log/);
    expect(cmdText).toMatch(/update_skip_drift_check_audit/);
  });

  it("force-unlock declared as Tier D-Std with magic-phrase ceremony", () => {
    expect(cmdText).toMatch(/force-unlock[\s\S]{0,500}D-Std|D-Std[\s\S]{0,500}force-unlock/);
    expect(cmdText).toMatch(/magic-phrase/i);
  });

  it("documents the mental model table (hand-edit / /update / /cla extend / /evolve)", () => {
    expect(cmdText).toMatch(/Mental model[\s\S]{0,200}\/update vs \/evolve vs \/cla extend/);
  });

  it("references the universal entity-edit lock acquired/released by orchestrator", () => {
    expect(cmdText).toMatch(/universal entity-edit lock/);
  });

  it("references the capability_runs id (Phase 7 delivery audit)", () => {
    expect(cmdText).toMatch(/16720cb5-f2fe-47f0-9d47-beaeca5f05e1/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 06-ai-ops/skills/entity-update/orchestrator/SKILL.md
// ────────────────────────────────────────────────────────────────────────
describe("entity-update/orchestrator/SKILL.md — phase chain", () => {
  it("declares required frontmatter", () => {
    expect(orchText).toMatch(/^---[\s\S]{0,500}name:\s+entity-update\/orchestrator/);
    expect(orchText).toMatch(/role:\s+entity-update-orchestrator/);
    expect(orchText).toMatch(/budget_caps:[\s\S]{0,500}entity-update-iteration:\s+1\.50/);
  });

  it("documents all 8 per-task-kind caps", () => {
    for (const cap of [
      "entity-update-iteration",
      "entity-update-distill-skill",
      "entity-update-distill-command",
      "entity-update-distill-agent",
      "entity-update-distill-sop",
      "entity-update-score-any",
      "entity-update-propose-any",
      "entity-update-test-gen-any",
    ]) {
      expect(orchText).toContain(cap);
    }
  });

  it("declares all 10 phases (0..9)", () => {
    for (const phase of ["Phase 0", "Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6", "Phase 7", "Phase 8", "Phase 9"]) {
      expect(orchText).toContain(phase);
    }
  });

  it("A32 — composes from shared eval-evo skills (no direct LLM)", () => {
    for (const skill of [
      "eval-evo/distill-from-refs",
      "eval-evo/review-extractions",
      "eval-evo/propose-improvement",
      "eval-evo/install-improvement",
      "eval-evo/test-gen",
    ]) {
      expect(orchText).toContain(skill);
    }
    expect(orchText).toMatch(/NEVER calls Anthropic API directly/);
  });

  it("A4 — K4 ratchet with ±5pt slack documented", () => {
    expect(orchText).toMatch(/score_post >= score_pre - 5/);
    expect(orchText).toMatch(/REVERT/);
    expect(orchText).toMatch(/aborted_quality_regression/);
  });

  it("A15 — install marker pattern present", () => {
    expect(orchText).toMatch(/<!-- updated-by:\s+\/update v1\.0/);
  });

  it("invokes ops.acquire_entity_edit_lock + release in phase 0 + 9", () => {
    expect(orchText).toMatch(/ops\.acquire_entity_edit_lock/);
    expect(orchText).toMatch(/ops\.release_entity_edit_lock/);
  });

  it("structural classification ABORTs with /cla extend forward message", () => {
    expect(orchText).toMatch(/aborted_classification_structural/);
    expect(orchText).toMatch(/\/cla extend/);
  });

  it("documents the agent_runs state_payload.phase state machine", () => {
    for (const phase of ["pre_flight", "distill", "awaiting_review", "propose", "classify", "install", "test_gen", "score_post", "k4_decision", "finalize"]) {
      expect(orchText).toContain(phase);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// 06-ai-ops/skills/eval-evo/test-gen/SKILL.md (A14 + A26)
// ────────────────────────────────────────────────────────────────────────
describe("eval-evo/test-gen/SKILL.md — All-Edge-Cases-Test verbatim", () => {
  it("declares required frontmatter", () => {
    expect(testgenText).toMatch(/^---[\s\S]{0,300}name:\s+eval-evo\/test-gen/);
    expect(testgenText).toMatch(/budget_cap_task_kind:\s+entity-update-test-gen-any/);
  });

  it("A26 — All-Edge-Cases-Test rule body committed VERBATIM (5 phases visible)", () => {
    expect(testgenText).toMatch(/PHASE 1 — Code Analysis/);
    expect(testgenText).toMatch(/PHASE 2 — Edge Case Mapping/);
    expect(testgenText).toMatch(/PHASE 3 — Test Generation/);
    expect(testgenText).toMatch(/PHASE 4 — Verification Sweep/);
    expect(testgenText).toMatch(/PHASE 5 — Run Tests and Fix/);
  });

  it("contains the mandatory test structure template (Phase 3)", () => {
    expect(testgenText).toMatch(/describe\('functionName'/);
    expect(testgenText).toMatch(/'happy path'/);
    expect(testgenText).toMatch(/'input boundaries'/);
    expect(testgenText).toMatch(/'error handling'/);
    expect(testgenText).toMatch(/'security'/);
    expect(testgenText).toMatch(/'regressions'/);
  });

  it("contains Phase 2 edge case categories 2A..2P", () => {
    for (const cat of ["2A. Numbers", "2B. Strings", "2C. Arrays", "2D. Objects", "2E. Booleans", "2K. Security", "2L. Business Logic", "2M. Behavioral", "2N. Contract Boundaries", "2O. Dependency Degradation", "2P. State Sequences"]) {
      expect(testgenText).toContain(cat);
    }
  });

  it("A14 — output uses Arrange-Act-Assert + sentence test names", () => {
    expect(testgenText).toMatch(/Arrange-Act-Assert/);
    expect(testgenText).toMatch(/sentence describing input \+ expected outcome/);
  });

  it("@cto T7 NIT — references the hash-drift CI check vs CLAUDE.md", () => {
    expect(testgenText).toMatch(/hash-drift|sha-?256/i);
    expect(testgenText).toMatch(/CLAUDE\.md/);
  });

  it("documents skip cases (trivial_doc_only)", () => {
    expect(testgenText).toMatch(/trivial_doc_only/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// governance/ROLES.md — entity-update-orchestrator role
// ────────────────────────────────────────────────────────────────────────
describe("governance/ROLES.md — entity-update-orchestrator role", () => {
  it("declares the role with NEW 2026-05-26 marker", () => {
    expect(rolesText).toMatch(/### `entity-update-orchestrator`[\s\S]{0,300}NEW 2026-05-26.*capability `update` v1\.0/);
  });

  it("hitl_max_tier: C", () => {
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,4000}hitl_max_tier:\s+C/);
  });

  it("declares economic_budget with $30/mo cap + 80% alert", () => {
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,3000}monthly_cap_usd:\s+30/);
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,3000}alert_at_pct:\s+0\.80/);
  });

  it("declares all 8 per_task_kind_caps", () => {
    const roleSection = rolesText.split("### `entity-update-orchestrator`")[1] || "";
    const nextSection = roleSection.split("### ")[0]; // bounded to this role's section
    for (const cap of [
      "entity-update-iteration",
      "entity-update-distill-skill",
      "entity-update-distill-command",
      "entity-update-distill-agent",
      "entity-update-distill-sop",
      "entity-update-score-any",
      "entity-update-propose-any",
      "entity-update-test-gen-any",
    ]) {
      expect(nextSection).toContain(cap);
    }
  });

  it("preferred_models: Sonnet default + Haiku for light tasks", () => {
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,4000}default:\s+claude-sonnet-4-6/);
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,4000}light_tasks:\s+claude-haiku-4-5/);
  });

  it("gbrain mcp grant READ-only (no writes v1.0)", () => {
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,4000}gbrain[\s\S]{0,400}READ-only/);
  });

  it("references the Tier C decision id from Sprint 1", () => {
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,5000}a683a371-0611-49c7-9650-53503027d60e/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// scripts/update/ref-source-allowlist.cjs (T9)
// ────────────────────────────────────────────────────────────────────────
describe("scripts/update/ref-source-allowlist.cjs — T9 prompt-injection guard", () => {
  const allowlist = require(ALLOWLIST_SCRIPT);

  it("exports parseArgs + classifyRef + checkAllowlist + constants", () => {
    expect(typeof allowlist.parseArgs).toBe("function");
    expect(typeof allowlist.classifyRef).toBe("function");
    expect(typeof allowlist.checkAllowlist).toBe("function");
    expect(allowlist.TRUSTED_PREFIXES).toEqual(["00-core/", "governance/", "06-ai-ops/", "wiki/"]);
    expect(allowlist.REFUSED_PREFIXES).toEqual(["raw/", ".archives/", "runtime/"]);
  });

  it("non-agent entity types: allow all refs (looser policy)", () => {
    for (const type of ["skill", "command", "sop"]) {
      const { allowed } = allowlist.classifyRef("raw/uncatalogued.md", type);
      expect(allowed).toBe(true);
    }
  });

  it("agent type: ALLOWS wiki: refs", () => {
    expect(allowlist.classifyRef("wiki:src=foo/bar", "agent").allowed).toBe(true);
    expect(allowlist.classifyRef('wiki:query="something"', "agent").allowed).toBe(true);
  });

  it("agent type: ALLOWS trusted prefixes (00-core/, governance/, 06-ai-ops/, wiki/)", () => {
    for (const ref of ["00-core/product.md", "governance/HITL.md", "06-ai-ops/skills/foo/SKILL.md", "wiki/note.md"]) {
      expect(allowlist.classifyRef(ref, "agent").allowed).toBe(true);
    }
  });

  it("agent type: REFUSES raw/, .archives/, runtime/ prefixes", () => {
    for (const ref of ["raw/notes.md", ".archives/scratch.md", "runtime/local.md"]) {
      const result = allowlist.classifyRef(ref, "agent");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("refused_prefix");
    }
  });

  it("agent type: REFUSES http(s) URLs (no provenance)", () => {
    const result = allowlist.classifyRef("https://example.com/page", "agent");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("http_url_no_provenance");
  });

  it("agent type: REFUSES paths outside trusted prefixes (default deny)", () => {
    const result = allowlist.classifyRef("01-marketing/icp.md", "agent");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("outside_trusted_prefixes");
  });

  it("checkAllowlist surfaces refused list when not overridden", () => {
    const result = allowlist.checkAllowlist(["raw/notes.md", "wiki:src=ok"], "agent", false);
    expect(result.allowed).toBe(false);
    expect(result.refused_refs).toHaveLength(1);
    expect(result.refused_refs[0].ref).toBe("raw/notes.md");
  });

  it("--allow-untrusted-refs override emits audit payload for orchestrator", () => {
    const result = allowlist.checkAllowlist(["raw/notes.md"], "agent", true);
    expect(result.allowed).toBe(true);
    expect(result.overridden).toBe(true);
    expect(result.audit_event_payload).toBeDefined();
    expect(result.audit_event_payload.action).toBe("ref_source_allowlist_overridden");
    expect(result.audit_event_payload.tier).toBe("C");
  });

  it("checkAllowlist with empty refused list does not need override", () => {
    const result = allowlist.checkAllowlist(["wiki:src=foo", "06-ai-ops/skills/foo/SKILL.md"], "agent", false);
    expect(result.allowed).toBe(true);
    expect(result.refused_refs).toEqual([]);
    expect(result.overridden).toBe(false);
  });
});
