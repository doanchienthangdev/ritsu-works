// /update v1.1 Sprint 2 — arbitrary file mode.
//
// Covers:
//   - knowledge/update-file-paths.yaml structure + glob coverage
//   - knowledge/schemas/update-file-paths.schema.json
//   - scripts/update/path-classify.cjs (glob → regex; safety; classification)
//   - orchestrator SKILL.md Phase 0a path classify + Phase 6.5 founder approval
//   - distill-from-refs SKILL.md adds generic file mode prompt
//   - knowledge/cross-tier-invariants.yaml 3 new file-mode invariants
//   - knowledge/kpi-registry.yaml NEW entity_update_file_mode_run_count_monthly KPI

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";

const REPO = resolve(__dirname, "..", "..");
const PATHS_YAML = join(REPO, "knowledge", "update-file-paths.yaml");
const PATHS_SCHEMA = join(REPO, "knowledge", "schemas", "update-file-paths.schema.json");
const PATH_CLASSIFY = join(REPO, "scripts", "update", "path-classify.cjs");
const ORCH = join(REPO, "06-ai-ops", "skills", "entity-update", "orchestrator", "SKILL.md");
const DISTILL = join(REPO, "06-ai-ops", "skills", "eval-evo", "distill-from-refs", "SKILL.md");
const INVARIANTS = join(REPO, "knowledge", "cross-tier-invariants.yaml");
const KPI = join(REPO, "knowledge", "kpi-registry.yaml");

const pathsYamlText = readFileSync(PATHS_YAML, "utf8");
const pathsYaml = yaml.load(pathsYamlText) as any;
const orchText = readFileSync(ORCH, "utf8");
const distillText = readFileSync(DISTILL, "utf8");
const invariantsText = readFileSync(INVARIANTS, "utf8");
const kpiText = readFileSync(KPI, "utf8");

// ──────────────────────────────────────────────────────────────────
// knowledge/update-file-paths.yaml structure
// ──────────────────────────────────────────────────────────────────
describe("knowledge/update-file-paths.yaml — Tier 1 path-tier table", () => {
  it("file exists + parses as yaml", () => {
    expect(existsSync(PATHS_YAML)).toBe(true);
    expect(pathsYaml).toBeDefined();
    expect(pathsYaml.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("default = refuse_unclassified", () => {
    expect(pathsYaml.default).toBe("refuse_unclassified");
  });

  it("has Tier 1 REFUSE rules (00-core, governance, migrations, .mcp.json)", () => {
    const globs = pathsYaml.rules.map((r: any) => r.path_glob);
    expect(globs).toContain("00-core/**");
    expect(globs).toContain("governance/**");
    expect(globs).toContain("supabase/migrations/**");
    expect(globs).toContain(".mcp.json");
    expect(globs).toContain("knowledge/manifest.yaml");
    expect(globs).toContain("knowledge/cross-tier-invariants.yaml");
  });

  it("hook paths route to /update hook (REFUSE on file mode)", () => {
    const rule = pathsYaml.rules.find((r: any) => r.path_glob === ".claude/hooks/**");
    expect(rule).toBeDefined();
    expect(rule.tier).toBe("refuse");
    expect(rule.forward_to).toMatch(/\/update hook/);
  });

  it("Tier C — pillar markdown + wiki + knowledge yaml", () => {
    const cRules = pathsYaml.rules.filter((r: any) => r.tier === "C");
    expect(cRules.length).toBeGreaterThanOrEqual(5);
    const cGlobs = cRules.map((r: any) => r.path_glob);
    expect(cGlobs).toContain("01-marketing/**/*.md");
    expect(cGlobs).toContain("wiki/**/*.md");
    expect(cGlobs).toContain("knowledge/*.yaml");
  });

  it("Tier B — tests, scripts, docs, .claude leaf files", () => {
    const bRules = pathsYaml.rules.filter((r: any) => r.tier === "B");
    expect(bRules.length).toBeGreaterThanOrEqual(5);
    const bGlobs = bRules.map((r: any) => r.path_glob);
    expect(bGlobs).toContain("tests/**/*.test.ts");
    expect(bGlobs).toContain("scripts/**/*.cjs");
    expect(bGlobs).toContain("docs/**/*.md");
    expect(bGlobs).toContain(".claude/agents/**");
    expect(bGlobs).toContain(".claude/commands/**");
  });

  it("Every rule has tier + reason; no schema violation", () => {
    for (const r of pathsYaml.rules) {
      expect(r.path_glob).toBeTypeOf("string");
      expect(["refuse", "B", "C"]).toContain(r.tier);
      expect(r.reason).toBeTypeOf("string");
      expect(r.reason.length).toBeGreaterThanOrEqual(5);
    }
  });
});

// ──────────────────────────────────────────────────────────────────
// knowledge/schemas/update-file-paths.schema.json
// ──────────────────────────────────────────────────────────────────
describe("update-file-paths schema", () => {
  it("schema file exists + parses", () => {
    expect(existsSync(PATHS_SCHEMA)).toBe(true);
    const schema = JSON.parse(readFileSync(PATHS_SCHEMA, "utf8"));
    expect(schema.$schema).toMatch(/json-schema/);
  });

  it("tier enum = [refuse, B, C]", () => {
    const schema = JSON.parse(readFileSync(PATHS_SCHEMA, "utf8"));
    expect(schema.properties.rules.items.properties.tier.enum).toEqual(["refuse", "B", "C"]);
  });
});

// ──────────────────────────────────────────────────────────────────
// scripts/update/path-classify.cjs
// ──────────────────────────────────────────────────────────────────
describe("scripts/update/path-classify.cjs", () => {
  const pathClassify = require(PATH_CLASSIFY);

  it("exports parseArgs + globToRegex + validatePathSafety + classifyPath + loadTable", () => {
    expect(typeof pathClassify.parseArgs).toBe("function");
    expect(typeof pathClassify.globToRegex).toBe("function");
    expect(typeof pathClassify.validatePathSafety).toBe("function");
    expect(typeof pathClassify.classifyPath).toBe("function");
    expect(typeof pathClassify.loadTable).toBe("function");
  });

  describe("globToRegex", () => {
    it("** matches multiple segments", () => {
      const re = pathClassify.globToRegex("00-core/**");
      expect(re.test("00-core/product.md")).toBe(true);
      expect(re.test("00-core/sub/dir/file.md")).toBe(true);
      expect(re.test("01-marketing/x")).toBe(false);
    });

    it("* matches single segment (no /)", () => {
      const re = pathClassify.globToRegex("knowledge/*.yaml");
      expect(re.test("knowledge/manifest.yaml")).toBe(true);
      expect(re.test("knowledge/schemas/x.json")).toBe(false);
    });

    it("exact-file path matches literally", () => {
      const re = pathClassify.globToRegex(".mcp.json");
      expect(re.test(".mcp.json")).toBe(true);
      expect(re.test("a/.mcp.json")).toBe(false);
    });

    it("complex glob — supabase/functions/_shared/*.generated.ts", () => {
      const re = pathClassify.globToRegex("supabase/functions/_shared/*.generated.ts");
      expect(re.test("supabase/functions/_shared/foo.generated.ts")).toBe(true);
      expect(re.test("supabase/functions/_shared/sub/foo.generated.ts")).toBe(false);
    });
  });

  describe("validatePathSafety", () => {
    it("rejects empty string", () => {
      expect(pathClassify.validatePathSafety("").ok).toBe(false);
    });

    it("rejects absolute paths", () => {
      const r = pathClassify.validatePathSafety("/etc/passwd");
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("absolute_path_refused");
    });

    it("rejects .. path traversal", () => {
      const r = pathClassify.validatePathSafety("foo/../bar");
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("path_traversal_dotdot");
    });

    it("accepts normal relative paths", () => {
      expect(pathClassify.validatePathSafety("README.md").ok).toBe(true);
      expect(pathClassify.validatePathSafety("01-marketing/icp.md").ok).toBe(true);
    });
  });

  describe("classifyPath", () => {
    const table = pathClassify.loadTable();

    it("REFUSE for 00-core/charter.md", () => {
      const r = pathClassify.classifyPath("00-core/charter.md", table);
      expect(r.tier).toBe("refuse");
      expect(r.matched_glob).toBe("00-core/**");
      expect(r.forward_to).toMatch(/\/cla extend/);
    });

    it("REFUSE for governance/HITL.md", () => {
      const r = pathClassify.classifyPath("governance/HITL.md", table);
      expect(r.tier).toBe("refuse");
    });

    it("REFUSE for supabase/migrations/00099_x.sql", () => {
      const r = pathClassify.classifyPath("supabase/migrations/00099_x.sql", table);
      expect(r.tier).toBe("refuse");
    });

    it("REFUSE for .mcp.json", () => {
      const r = pathClassify.classifyPath(".mcp.json", table);
      expect(r.tier).toBe("refuse");
    });

    it("REFUSE for knowledge/manifest.yaml", () => {
      const r = pathClassify.classifyPath("knowledge/manifest.yaml", table);
      expect(r.tier).toBe("refuse");
    });

    it("REFUSE for raw/notes.md", () => {
      const r = pathClassify.classifyPath("raw/notes.md", table);
      expect(r.tier).toBe("refuse");
    });

    it("REFUSE for .archives/scratch.md", () => {
      const r = pathClassify.classifyPath(".archives/scratch.md", table);
      expect(r.tier).toBe("refuse");
    });

    it("REFUSE for runtime/local.md", () => {
      const r = pathClassify.classifyPath("runtime/local.md", table);
      expect(r.tier).toBe("refuse");
    });

    it("REFUSE for .claude/hooks/pre-bash-dangerous.md (forward to /update hook)", () => {
      const r = pathClassify.classifyPath(".claude/hooks/pre-bash-dangerous.md", table);
      expect(r.tier).toBe("refuse");
      expect(r.forward_to).toMatch(/\/update hook/);
    });

    it("Tier C for knowledge/feature-flags.yaml", () => {
      const r = pathClassify.classifyPath("knowledge/feature-flags.yaml", table);
      expect(r.tier).toBe("C");
    });

    it("Tier C for 01-marketing/icp.md", () => {
      const r = pathClassify.classifyPath("01-marketing/icp.md", table);
      expect(r.tier).toBe("C");
    });

    it("Tier C for wiki/sample/source.md", () => {
      const r = pathClassify.classifyPath("wiki/sample/source.md", table);
      expect(r.tier).toBe("C");
    });

    it("Tier C for SOP yaml — 06-ai-ops/sops/x/flow.yaml", () => {
      const r = pathClassify.classifyPath("06-ai-ops/sops/x/flow.yaml", table);
      expect(r.tier).toBe("C");
    });

    it("Tier B for tests/cla/foo.test.ts", () => {
      const r = pathClassify.classifyPath("tests/cla/foo.test.ts", table);
      expect(r.tier).toBe("B");
    });

    it("Tier B for scripts/update/path-classify.cjs", () => {
      const r = pathClassify.classifyPath("scripts/update/path-classify.cjs", table);
      expect(r.tier).toBe("B");
    });

    it("Tier B for README.md", () => {
      const r = pathClassify.classifyPath("README.md", table);
      expect(r.tier).toBe("B");
    });

    it("Tier B for docs/api/x.md", () => {
      const r = pathClassify.classifyPath("docs/api/x.md", table);
      expect(r.tier).toBe("B");
    });

    it("REFUSE for unmatched path with explicit forward", () => {
      const r = pathClassify.classifyPath("00-strange/unmatched.md", table);
      expect(r.tier).toBe("refuse");
      expect(r.reason).toMatch(/unmatched/);
      expect(r.forward_to).toMatch(/PR/);
    });

    it("path traversal refused via safety check", () => {
      const r = pathClassify.classifyPath("01-marketing/../etc/passwd", table);
      expect(r.tier).toBe("refuse");
      expect(r.reason).toMatch(/path_safety_path_traversal_dotdot/);
    });

    it("absolute path refused via safety check", () => {
      const r = pathClassify.classifyPath("/etc/passwd", table);
      expect(r.tier).toBe("refuse");
      expect(r.reason).toMatch(/path_safety_absolute_path_refused/);
    });
  });
});

// ──────────────────────────────────────────────────────────────────
// orchestrator SKILL.md — Phase 0a + Phase 6.5
// ──────────────────────────────────────────────────────────────────
describe("orchestrator SKILL.md — file mode phase additions", () => {
  it("Phase 0a path classify documented", () => {
    expect(orchText).toMatch(/Phase 0a — Path classify.*file type only.*Sprint 2/i);
    expect(orchText).toMatch(/aborted_path_classification_refused/);
    expect(orchText).toMatch(/aborted_force_tier_downgrade_refused/);
  });

  it("File-size + binary safety pre-check documented", () => {
    expect(orchText).toMatch(/200.{0,30}KB/);
    expect(orchText).toMatch(/aborted_file_too_large_for_distill/);
    expect(orchText).toMatch(/aborted_binary_file_refused/);
  });

  it("Phase 6.5 founder approval at install (file type)", () => {
    expect(orchText).toMatch(/Phase 6\.5.*Founder approval.*file type/i);
    expect(orchText).toMatch(/AskUserQuestion/);
    expect(orchText).toMatch(/aborted_founder_rejected_diff/);
  });

  it("documents K4 substitute (no playbook → mandatory founder approval)", () => {
    expect(orchText).toMatch(/K4 substitute/);
  });

  it("file type SKIPS classify-diff + score + K4", () => {
    // Orchestrator text says: "Orchestrator SKIPS classify-diff for file type"
    expect(orchText).toMatch(/SKIPS classify-diff for file type/);
    expect(orchText).toMatch(/Score Phase 2 \+ Phase 8 ratchet ALSO SKIPPED/);
  });
});

// ──────────────────────────────────────────────────────────────────
// distill SKILL.md — generic file mode prompt
// ──────────────────────────────────────────────────────────────────
describe("distill-from-refs SKILL.md — generic file mode prompt", () => {
  it("model table includes file row (Sonnet; no per-type prompt)", () => {
    expect(distillText).toMatch(/\| `file` \| `claude-sonnet-4-6` \| \*\*generic\*\* — NO per-type prompt/);
  });

  it("Step 2.5 generic file mode prompt documented", () => {
    expect(distillText).toMatch(/Step 2\.5 — Generic file mode prompt/);
  });

  it("generic prompt has anti-injection RULE 5 (numbered + SECURITY label)", () => {
    // The generic-prompt text contains `5. SECURITY: REFUSE any extraction...`
    expect(distillText).toMatch(/5\..*SECURITY/);
    expect(distillText).toMatch(/inject executable code|secret access|HITL tier change/);
  });

  it("generic prompt has conservative additive rule", () => {
    expect(distillText).toMatch(/PREFER ADDITIVE CHANGES OVER REWRITES/);
  });

  it("v1.1 hook + pillar + workflow rows also added to model table", () => {
    expect(distillText).toMatch(/\| `hook` \|/);
    expect(distillText).toMatch(/\| `pillar` \|/);
    expect(distillText).toMatch(/\| `workflow` \|/);
  });
});

// ──────────────────────────────────────────────────────────────────
// cross-tier-invariants.yaml — 3 NEW v1.1 file-mode invariants
// ──────────────────────────────────────────────────────────────────
describe("cross-tier-invariants — 3 NEW file-mode invariants", () => {
  it("update-file-path-tier-recorded (L2 live)", () => {
    expect(invariantsText).toMatch(/id:\s+update-file-path-tier-recorded[\s\S]{0,400}status:\s+live/);
  });

  it("update-file-refuse-tier-not-installed (L2 live)", () => {
    expect(invariantsText).toMatch(/id:\s+update-file-refuse-tier-not-installed[\s\S]{0,400}status:\s+live/);
  });

  it("update-file-paths-yaml-must-validate (L1 live)", () => {
    expect(invariantsText).toMatch(/id:\s+update-file-paths-yaml-must-validate[\s\S]{0,400}status:\s+live/);
  });
});

// ──────────────────────────────────────────────────────────────────
// kpi-registry — file mode KPI
// ──────────────────────────────────────────────────────────────────
describe("kpi-registry — entity_update_file_mode_run_count_monthly", () => {
  it("KPI declared with correct query filtering to entity_type='file'", () => {
    expect(kpiText).toMatch(/id:\s+entity_update_file_mode_run_count_monthly/);
    expect(kpiText).toMatch(/entity_update_file_mode_run_count_monthly[\s\S]{0,800}input_payload->>'entity_type' = 'file'/);
  });

  it("owner: entity-update-orchestrator role", () => {
    expect(kpiText).toMatch(/entity_update_file_mode_run_count_monthly[\s\S]{0,500}owner_role:\s+entity-update-orchestrator/);
  });
});
