// /update v1.1 Sprint 1 — hook + pillar entity types.
//
// Covers:
//   - Migration 00042 extends entity_type CHECK to v1.1 types
//   - Eval-evo playbook schema enum extended (+ pillar + workflow)
//   - NEW playbook eval-evo/playbooks/pillar.md
//   - .claude/commands/update.md documents v1.1 hook + pillar ceremonies
//   - 06-ai-ops/skills/entity-update/orchestrator/SKILL.md adds Phase -1
//     ceremony for hook + extends per-type tier floors
//   - scripts/update/classify-diff.cjs exports hook + pillar structural matrices
//   - scripts/update/ref-source-allowlist.cjs STRICT_TYPES includes hook
//   - governance/ROLES.md adds 4 new per-task-kind caps + tier1_paths extension
//   - knowledge/capability-registry.yaml version bumped 1.0.0 → 1.1.0

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";

const REPO = resolve(__dirname, "..", "..");
const MIGRATION = join(REPO, "supabase", "migrations", "00042_v1_1_entity_edit_locks_extend.sql");
const SCHEMA = join(REPO, "06-ai-ops", "skills", "eval-evo", "playbooks", "_SCHEMA.yaml");
const PILLAR_PLAYBOOK = join(REPO, "06-ai-ops", "skills", "eval-evo", "playbooks", "pillar.md");
const CMD = join(REPO, ".claude", "commands", "update.md");
const ORCH = join(REPO, "06-ai-ops", "skills", "entity-update", "orchestrator", "SKILL.md");
const CLASSIFY = join(REPO, "scripts", "update", "classify-diff.cjs");
const ALLOWLIST = join(REPO, "scripts", "update", "ref-source-allowlist.cjs");
const ROLES = join(REPO, "governance", "ROLES.md");
const REGISTRY = join(REPO, "knowledge", "capability-registry.yaml");

const migrationText = readFileSync(MIGRATION, "utf8");
const schemaText = readFileSync(SCHEMA, "utf8");
const pillarPlaybookText = readFileSync(PILLAR_PLAYBOOK, "utf8");
const cmdText = readFileSync(CMD, "utf8");
const orchText = readFileSync(ORCH, "utf8");
const rolesText = readFileSync(ROLES, "utf8");
const registryText = readFileSync(REGISTRY, "utf8");

// ──────────────────────────────────────────────────────────────────
// Migration 00042 — entity_type CHECK extension
// ──────────────────────────────────────────────────────────────────
describe("Migration 00042 — entity_edit_locks CHECK extension", () => {
  it("DROPs old constraint + adds new one with v1.1 types", () => {
    expect(migrationText).toMatch(/DROP CONSTRAINT[\s\S]{0,200}entity_edit_locks_entity_type_check/);
    expect(migrationText).toMatch(/ADD CONSTRAINT[\s\S]{0,200}entity_edit_locks_entity_type_check/);
  });

  it("includes all 5 v1.1 types (hook, pillar, folder, workflow, file)", () => {
    for (const t of ["hook", "pillar", "folder", "workflow", "file"]) {
      expect(migrationText).toContain(`'${t}'`);
    }
  });

  it("preserves all 5 v1.0 types (skill, command, agent, sop, capability)", () => {
    for (const t of ["skill", "command", "agent", "sop", "capability"]) {
      expect(migrationText).toContain(`'${t}'`);
    }
  });
});

// ──────────────────────────────────────────────────────────────────
// Eval-evo playbook schema — enum extension
// ──────────────────────────────────────────────────────────────────
describe("eval-evo/playbooks/_SCHEMA.yaml — playbook_for enum", () => {
  it("includes pillar + workflow v1.1 additions", () => {
    const schema = yaml.load(schemaText) as any;
    const enumValues = schema.properties.playbook_for.enum;
    expect(enumValues).toContain("pillar");
    expect(enumValues).toContain("workflow");
  });

  it("preserves v1.0 enum values (skill, command, agent, hook, sop)", () => {
    const schema = yaml.load(schemaText) as any;
    const enumValues = schema.properties.playbook_for.enum;
    for (const t of ["skill", "command", "agent", "hook", "sop"]) {
      expect(enumValues).toContain(t);
    }
  });
});

// ──────────────────────────────────────────────────────────────────
// NEW playbook eval-evo/playbooks/pillar.md
// ──────────────────────────────────────────────────────────────────
describe("eval-evo/playbooks/pillar.md — pillar playbook", () => {
  it("declares correct frontmatter (playbook_for=pillar, judge=@ceo)", () => {
    expect(pillarPlaybookText).toMatch(/playbook_for:\s+pillar/);
    expect(pillarPlaybookText).toMatch(/judge_persona:\s+"@ceo"/);
  });

  it("allowed_paths_for_proposer = README.md + CLAUDE.md only", () => {
    expect(pillarPlaybookText).toMatch(/allowed_paths_for_proposer:[\s\S]{0,200}README\.md/);
    expect(pillarPlaybookText).toMatch(/allowed_paths_for_proposer:[\s\S]{0,200}CLAUDE\.md/);
  });

  it("documents 10 sub_scores (per Karpathy K3)", () => {
    const subScoreMatches = pillarPlaybookText.match(/- id: C\d+/g) || [];
    expect(subScoreMatches.length).toBe(10);
  });

  it("documents sub-pillar deferral", () => {
    expect(pillarPlaybookText).toMatch(/sub-pillar/i);
  });

  it("references Sprint 1 origin in body", () => {
    expect(pillarPlaybookText).toMatch(/v1\.1.*Sprint 1/i);
  });
});

// ──────────────────────────────────────────────────────────────────
// .claude/commands/update.md — v1.1 argv extensions
// ──────────────────────────────────────────────────────────────────
describe(".claude/commands/update.md — v1.1 type registration", () => {
  it("entity-type enum includes hook + pillar (v1.1 Sprint 1)", () => {
    expect(cmdText).toMatch(/hook,\s+pillar/);
  });

  it("documents hook D-Std magic-phrase ceremony", () => {
    expect(cmdText).toMatch(/`hook` type.*D-Std/i);
    expect(cmdText).toMatch(/override:\s+<reason 5\+ words>/);
    expect(cmdText).toMatch(/30s timer/);
  });

  it("documents pillar Tier C floor + alias resolver", () => {
    expect(cmdText).toMatch(/`pillar` type.*Tier C/i);
    expect(cmdText).toMatch(/marketing.*01-marketing/);
    expect(cmdText).toMatch(/core.*00-core/);
  });

  it("declares sub-pillar refused for /update pillar", () => {
    expect(cmdText).toMatch(/Sub-pillar.*REFUSED|sub-pillar.*refused/i);
  });

  it("v1.1 type enum also lists file, folder, workflow (Sprint 2+3)", () => {
    expect(cmdText).toMatch(/v1\.1 Sprint 2/);
    expect(cmdText).toMatch(/v1\.1 Sprint 3/);
  });
});

// ──────────────────────────────────────────────────────────────────
// orchestrator SKILL.md — Phase -1 D-Std ceremony for hook
// ──────────────────────────────────────────────────────────────────
describe("entity-update/orchestrator/SKILL.md — v1.1 type extensions", () => {
  it("Phase -1 D-Std ceremony for hook type", () => {
    expect(orchText).toMatch(/Phase -1.*D-Std ceremony.*hook/);
  });

  it("orchestrator ABORTs hook run without magic_phrase_override_reason", () => {
    expect(orchText).toMatch(/aborted_d_std_required/);
  });

  it("ref-source-allowlist documented for agent + hook (v1.1 STRICT_TYPES)", () => {
    expect(orchText).toMatch(/agent \+ hook types.*STRICT_TYPES/);
  });

  it("hook + pillar tier floor = C; classify-diff promotion documented", () => {
    expect(orchText).toMatch(/hook.*Tier C minimum/);
    expect(orchText).toMatch(/pillar.*Tier C minimum/);
    expect(orchText).toMatch(/hook_tier_floor_enforced/);
    expect(orchText).toMatch(/pillar_tier_floor_enforced/);
  });

  it("documents hook + pillar structural matrices in classify-diff", () => {
    expect(orchText).toMatch(/hitl_tier change.*block:.*denied_patterns/);
    expect(orchText).toMatch(/pillar_code.*status.*composes_from/);
  });

  it("input contract entity_type enum extended for v1.1 types", () => {
    expect(orchText).toMatch(/skill \| command \| agent \| sop \| hook \| pillar \| file \| folder \| workflow/);
  });
});

// ──────────────────────────────────────────────────────────────────
// scripts/update/classify-diff.cjs — hook + pillar structural matrices
// ──────────────────────────────────────────────────────────────────
describe("classify-diff.cjs — v1.1 hook + pillar matrices", () => {
  const classifier = require(CLASSIFY);

  it("exports classifyHookChange + classifyPillarChange (v1.1)", () => {
    expect(typeof classifier.classifyHookChange).toBe("function");
    expect(typeof classifier.classifyPillarChange).toBe("function");
  });

  it("classifyHookChange detects hitl_tier change", () => {
    const diff = {
      additions: ["hitl_tier: C"],
      deletions: ["hitl_tier: B"],
      context_lines: [],
    };
    const rules = classifier.classifyHookChange(diff);
    expect(rules.some((r: string) => r.includes("hook_hitl_tier_change_B_to_C"))).toBe(true);
  });

  it("classifyHookChange detects block: directive change", () => {
    const diff = {
      additions: ["block: action"],
      deletions: [],
      context_lines: [],
    };
    const rules = classifier.classifyHookChange(diff);
    expect(rules).toContain("hook_block_directive_modified");
  });

  it("classifyHookChange detects denied_patterns modification", () => {
    const diff = {
      additions: ["  denied_patterns:"],
      deletions: [],
      context_lines: [],
    };
    const rules = classifier.classifyHookChange(diff);
    expect(rules).toContain("hook_denied_patterns_modified");
  });

  it("classifyPillarChange detects pillar_code field change", () => {
    const diff = {
      additions: ["pillar_code: NEW"],
      deletions: ["pillar_code: OLD"],
      context_lines: [],
    };
    const rules = classifier.classifyPillarChange(diff);
    expect(rules).toContain("pillar_pillar_code_modified");
  });

  it("classifyPillarChange detects composes_from field change", () => {
    const diff = {
      additions: ["composes_from: [marketing, sales]"],
      deletions: [],
      context_lines: [],
    };
    const rules = classifier.classifyPillarChange(diff);
    expect(rules).toContain("pillar_composes_from_modified");
  });

  it("classifyDiff with entity_type='hook' surfaces hook structural rules", () => {
    const diff = `+++ b/.claude/hooks/pre-bash-dangerous.md
@@ -1,3 +1,3 @@
-hitl_tier: B
+hitl_tier: C
`;
    const files = classifier.parseUnifiedDiff(diff);
    const result = classifier.classifyDiff(files, "hook");
    expect(result.classification).toBe("structural");
    expect(result.structural_rules_hit.some((r: string) => r.includes("hook_hitl_tier_change"))).toBe(true);
  });

  it("classifyDiff with entity_type='pillar' surfaces pillar structural rules", () => {
    const diff = `+++ b/01-marketing/README.md
@@ -1,3 +1,3 @@
-status: alive
+status: skeleton
`;
    const files = classifier.parseUnifiedDiff(diff);
    const result = classifier.classifyDiff(files, "pillar");
    expect(result.classification).toBe("structural");
    expect(result.structural_rules_hit).toContain("pillar_status_modified");
  });
});

// ──────────────────────────────────────────────────────────────────
// scripts/update/ref-source-allowlist.cjs — hook joins STRICT_TYPES
// ──────────────────────────────────────────────────────────────────
describe("ref-source-allowlist.cjs — v1.1 hook + agent strict", () => {
  const allowlist = require(ALLOWLIST);

  it("STRICT_TYPES exported and includes both agent + hook", () => {
    expect(allowlist.STRICT_TYPES).toBeInstanceOf(Set);
    expect(allowlist.STRICT_TYPES.has("agent")).toBe(true);
    expect(allowlist.STRICT_TYPES.has("hook")).toBe(true);
  });

  it("hook type follows same strict allowlist as agent", () => {
    expect(allowlist.classifyRef("raw/notes.md", "hook").allowed).toBe(false);
    expect(allowlist.classifyRef(".archives/scratch.md", "hook").allowed).toBe(false);
    expect(allowlist.classifyRef("https://example.com", "hook").allowed).toBe(false);
    expect(allowlist.classifyRef("00-core/product.md", "hook").allowed).toBe(true);
    expect(allowlist.classifyRef("wiki:src=foo", "hook").allowed).toBe(true);
  });

  it("non-strict types (skill, sop, pillar, file) remain looser", () => {
    for (const type of ["skill", "sop", "pillar", "file", "folder", "workflow", "command"]) {
      expect(allowlist.classifyRef("raw/notes.md", type).allowed).toBe(true);
    }
  });
});

// ──────────────────────────────────────────────────────────────────
// governance/ROLES.md — new per_task_kind caps + tier1_paths
// ──────────────────────────────────────────────────────────────────
describe("governance/ROLES.md — entity-update-orchestrator v1.1 extensions", () => {
  it("declares 4 v1.1 distill caps (hook, pillar, file, workflow)", () => {
    const roleSection = rolesText.split("### `entity-update-orchestrator`")[1] || "";
    const nextSection = roleSection.split("### ")[0];
    for (const cap of [
      "entity-update-distill-hook",
      "entity-update-distill-pillar",
      "entity-update-distill-file",
      "entity-update-distill-workflow",
    ]) {
      expect(nextSection).toContain(cap);
    }
  });

  it("declares entity-update-path-classify cap ($0.00, deterministic)", () => {
    const roleSection = rolesText.split("### `entity-update-orchestrator`")[1] || "";
    const nextSection = roleSection.split("### ")[0];
    expect(nextSection).toContain("entity-update-path-classify");
    expect(nextSection).toMatch(/entity-update-path-classify:\s+0\.00/);
  });

  it("tier1_paths extended with hook + pillar README/CLAUDE", () => {
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,4000}\.claude\/hooks\/<entity-name>\.md/);
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,4000}<pillar>\/README\.md/);
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,4000}<pillar>\/CLAUDE\.md/);
  });
});

// ──────────────────────────────────────────────────────────────────
// capability-registry.yaml — version bump 1.0.0 → 1.1.0
// ──────────────────────────────────────────────────────────────────
describe("capability-registry.yaml — update entry v1.1 bump", () => {
  it("update entry version: 1.1.0", () => {
    expect(registryText).toMatch(/- id:\s+update[\s\S]{0,2000}version:\s+"1\.1\.0"/);
  });

  it("state remains operating across version bump", () => {
    expect(registryText).toMatch(/- id:\s+update[\s\S]{0,2000}state:\s+operating/);
  });

  it("sprint_plan references v1.1-brainstorming folder", () => {
    expect(registryText).toMatch(/- id:\s+update[\s\S]{0,2500}v1\.1-brainstorming/);
  });
});
