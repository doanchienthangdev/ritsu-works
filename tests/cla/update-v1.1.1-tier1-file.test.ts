// /update v1.1.1 — tier1-file entity type (Tier 1 content fix via D-Std ceremony).
//
// Covers:
//   - Migration 00043 extends entity_type CHECK to include tier1_file
//   - scripts/update/tier1-allowlist.cjs (hardcoded allowlist + REFUSED-stricter)
//   - .claude/commands/update.md documents tier1-file argv + ceremony
//   - orchestrator SKILL.md extends Phase -1 ceremony for tier1-file +
//     adds Phase 0d allowlist check + Phase 0e skip list
//   - governance/ROLES.md adds tier1_paths + per_task_kind cap
//   - knowledge/capability-registry.yaml bumps 1.1.0 → 1.1.1

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const MIGRATION = join(REPO, "supabase", "migrations", "00043_v1_1_1_tier1_file_entity_type.sql");
const ALLOWLIST_SCRIPT = join(REPO, "scripts", "update", "tier1-allowlist.cjs");
const CMD = join(REPO, ".claude", "commands", "update.md");
const ORCH = join(REPO, "06-ai-ops", "skills", "entity-update", "orchestrator", "SKILL.md");
const ROLES = join(REPO, "governance", "ROLES.md");
const REGISTRY = join(REPO, "knowledge", "capability-registry.yaml");

const migrationText = readFileSync(MIGRATION, "utf8");
const cmdText = readFileSync(CMD, "utf8");
const orchText = readFileSync(ORCH, "utf8");
const rolesText = readFileSync(ROLES, "utf8");
const registryText = readFileSync(REGISTRY, "utf8");

// ──────────────────────────────────────────────────────────────────
// Migration 00043
// ──────────────────────────────────────────────────────────────────
describe("Migration 00043 — tier1_file entity_type", () => {
  it("DROP + ADD CONSTRAINT pattern", () => {
    expect(migrationText).toMatch(/DROP CONSTRAINT[\s\S]{0,200}entity_edit_locks_entity_type_check/);
    expect(migrationText).toMatch(/ADD CONSTRAINT[\s\S]{0,200}entity_edit_locks_entity_type_check/);
  });

  it("includes tier1_file alongside all prior types", () => {
    for (const t of ["skill", "command", "agent", "sop", "capability", "hook", "pillar", "folder", "workflow", "file", "tier1_file"]) {
      expect(migrationText).toContain(`'${t}'`);
    }
  });
});

// ──────────────────────────────────────────────────────────────────
// scripts/update/tier1-allowlist.cjs
// ──────────────────────────────────────────────────────────────────
describe("scripts/update/tier1-allowlist.cjs", () => {
  const al = require(ALLOWLIST_SCRIPT);

  it("exports parseArgs + classifyTier1Path + validatePathSafety + globToRegex + constants", () => {
    expect(typeof al.parseArgs).toBe("function");
    expect(typeof al.classifyTier1Path).toBe("function");
    expect(typeof al.validatePathSafety).toBe("function");
    expect(typeof al.globToRegex).toBe("function");
    expect(Array.isArray(al.ALLOWLIST)).toBe(true);
    expect(Array.isArray(al.REFUSED_TIER1_PATHS)).toBe(true);
  });

  describe("ALLOWED paths (D-Std ceremony enough)", () => {
    it("00-core/product.md", () => {
      const r = al.classifyTier1Path("00-core/product.md");
      expect(r.allowed).toBe(true);
      expect(r.reason).toMatch(/tier1_d_std_allowed_core_identity_doc/);
    });

    it("00-core/sub/dir/anything.md", () => {
      const r = al.classifyTier1Path("00-core/sub/dir/anything.md");
      expect(r.allowed).toBe(true);
    });

    it("governance/HITL.md", () => {
      const r = al.classifyTier1Path("governance/HITL.md");
      expect(r.allowed).toBe(true);
      expect(r.reason).toMatch(/governance_hitl/);
    });

    it("governance/ROLES.md", () => {
      expect(al.classifyTier1Path("governance/ROLES.md").allowed).toBe(true);
    });

    it("governance/IDENTITY.md", () => {
      expect(al.classifyTier1Path("governance/IDENTITY.md").allowed).toBe(true);
    });

    it("governance/BUDGET.md", () => {
      expect(al.classifyTier1Path("governance/BUDGET.md").allowed).toBe(true);
    });

    it("knowledge/manifest.yaml", () => {
      expect(al.classifyTier1Path("knowledge/manifest.yaml").allowed).toBe(true);
    });

    it("knowledge/cross-tier-invariants.yaml", () => {
      expect(al.classifyTier1Path("knowledge/cross-tier-invariants.yaml").allowed).toBe(true);
    });
  });

  describe("REFUSED paths (require stricter ceremony)", () => {
    it("governance/SECRETS.md → D-MAX hand-edit", () => {
      const r = al.classifyTier1Path("governance/SECRETS.md");
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("secrets_d_max_required");
      expect(r.forward_to).toMatch(/D-MAX/);
    });

    it("supabase/migrations/00099_test.sql → /cla propose", () => {
      const r = al.classifyTier1Path("supabase/migrations/00099_test.sql");
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("migrations_schema_discipline");
      expect(r.forward_to).toMatch(/\/cla propose/);
    });

    it(".mcp.json → D-MAX hand-edit", () => {
      const r = al.classifyTier1Path(".mcp.json");
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("mcp_config_d_max_required");
    });
  });

  describe("REFUSED — not a Tier 1 path", () => {
    it("01-marketing/icp.md → use /update file", () => {
      const r = al.classifyTier1Path("01-marketing/icp.md");
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("not_tier1_path_use_update_file_or_typed_entity_command");
      expect(r.forward_to).toMatch(/\/update file/);
    });

    it("scripts/foo.cjs → use /update file", () => {
      const r = al.classifyTier1Path("scripts/foo.cjs");
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("not_tier1_path_use_update_file_or_typed_entity_command");
    });

    it("06-ai-ops/skills/foo/SKILL.md → use /update skill instead", () => {
      const r = al.classifyTier1Path("06-ai-ops/skills/foo/SKILL.md");
      expect(r.allowed).toBe(false);
    });
  });

  describe("Path safety", () => {
    it("absolute path → safety reject", () => {
      const r = al.classifyTier1Path("/etc/passwd");
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/path_safety_absolute_path/);
    });

    it("path traversal → safety reject", () => {
      const r = al.classifyTier1Path("00-core/../etc/passwd");
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/path_safety_path_traversal_dotdot/);
    });

    it("empty path → safety reject", () => {
      const r = al.classifyTier1Path("");
      expect(r.allowed).toBe(false);
      expect(r.reason).toMatch(/path_safety_empty_path/);
    });
  });

  describe("REFUSED-list precedence over ALLOWLIST", () => {
    it("governance/SECRETS.md REFUSED even though governance/* would otherwise be allowed", () => {
      // SECRETS.md path doesn't match the .md-named exact governance entries,
      // and is hit by the REFUSED list. Confirms REFUSED is evaluated first.
      const r = al.classifyTier1Path("governance/SECRETS.md");
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("secrets_d_max_required");
    });
  });
});

// ──────────────────────────────────────────────────────────────────
// .claude/commands/update.md
// ──────────────────────────────────────────────────────────────────
describe(".claude/commands/update.md — tier1-file argv + docs", () => {
  it("entity-type enum includes tier1-file (v1.1.1)", () => {
    expect(cmdText).toMatch(/tier1-file.*v1\.1\.1|v1\.1\.1.*tier1-file/);
  });

  it("documents the hardcoded allowlist", () => {
    expect(cmdText).toMatch(/`tier1-file` type.*v1\.1\.1/);
    expect(cmdText).toMatch(/00-core\/\*\*/);
    expect(cmdText).toMatch(/governance\/HITL\.md/);
    expect(cmdText).toMatch(/knowledge\/manifest\.yaml/);
  });

  it("documents REFUSED-stricter paths (SECRETS, migrations, .mcp.json)", () => {
    expect(cmdText).toMatch(/governance\/SECRETS\.md.*D-MAX/);
    expect(cmdText).toMatch(/supabase\/migrations\/\*\*/);
    expect(cmdText).toMatch(/\.mcp\.json.*D-MAX/);
  });

  it("describes founder use case (muse session + refresh discipline)", () => {
    expect(cmdText).toMatch(/muse session|founder has insight/i);
  });
});

// ──────────────────────────────────────────────────────────────────
// orchestrator SKILL.md
// ──────────────────────────────────────────────────────────────────
describe("orchestrator SKILL.md — tier1-file phase additions", () => {
  it("Phase -1 ceremony now covers hook + tier1-file", () => {
    expect(orchText).toMatch(/Phase -1.*hook.*tier1-file|hook \+ tier1-file/);
  });

  it("D-Std ceremony abort covers both hook AND tier1-file", () => {
    expect(orchText).toMatch(/entity_type.*IN.*'hook',\s*'tier1-file'/);
  });

  it("Phase 0d tier1 allowlist check documented", () => {
    expect(orchText).toMatch(/Phase 0d.*Tier 1 allowlist.*tier1-file/);
    expect(orchText).toMatch(/aborted_tier1_path_not_allowed/);
  });

  it("Phase 0e tier1-file phase skips listed", () => {
    expect(orchText).toMatch(/Phase 0e.*tier1-file phase skips/);
    expect(orchText).toMatch(/SKIP Phase 2.*score pre.*no playbook/);
    expect(orchText).toMatch(/SKIP Phase 7.*test-gen.*no testable surface/);
  });

  it("documents Tier C floor for tier1-file (no in-place; PR only)", () => {
    expect(orchText).toMatch(/tier1-file.*ALWAYS Tier C.*no in-place|tier1-file.*ALWAYS Tier C/);
  });
});

// ──────────────────────────────────────────────────────────────────
// governance/ROLES.md
// ──────────────────────────────────────────────────────────────────
describe("governance/ROLES.md — entity-update-orchestrator v1.1.1 extension", () => {
  it("entity-update-distill-tier1-file cap declared ($0.30)", () => {
    expect(rolesText).toMatch(/entity-update-distill-tier1-file:\s+0\.30/);
  });

  it("tier1_paths extended with 00-core/** + governance/* + knowledge/manifest + invariants", () => {
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,5000}"00-core\/\*\*".*v1\.1\.1/);
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,5000}"governance\/HITL\.md".*v1\.1\.1/);
    expect(rolesText).toMatch(/role:\s+entity-update-orchestrator[\s\S]{0,5000}"knowledge\/manifest\.yaml".*v1\.1\.1/);
  });

  it("STILL REFUSED list documents D-MAX + schema-discipline paths", () => {
    expect(rolesText).toMatch(/STILL REFUSED.*D-Std[\s\S]{0,500}governance\/SECRETS\.md.*D-MAX/);
    expect(rolesText).toMatch(/STILL REFUSED.*D-Std[\s\S]{0,500}supabase\/migrations\/\*\*/);
    expect(rolesText).toMatch(/STILL REFUSED.*D-Std[\s\S]{0,500}\.mcp\.json/);
  });
});

// ──────────────────────────────────────────────────────────────────
// capability-registry.yaml
// ──────────────────────────────────────────────────────────────────
describe("capability-registry.yaml — update bumped to v1.1.1", () => {
  it("update entry version: 1.1.1", () => {
    expect(registryText).toMatch(/- id:\s+update[\s\S]{0,2500}version:\s+"1\.1\.1"/);
  });

  it("state remains operating across patch bump", () => {
    expect(registryText).toMatch(/- id:\s+update[\s\S]{0,2500}state:\s+operating/);
  });
});
