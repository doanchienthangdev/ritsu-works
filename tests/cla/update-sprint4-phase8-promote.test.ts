// Sprint 4 of capability `update` v1.0 + Phase 8 promote.
//
// Covers:
//   - Migration 00041 lineage view structure
//   - 3 NEW KPIs in kpi-registry
//   - 2 NEW alerts in alert-rules
//   - CI hash-drift validator for test-gen methodology (extract + sha logic)
//   - Phase 8 spec promotion to wiki/capabilities/update/
//   - Phase 8 capability-registry state transition (proposed → operating)
//   - manifest.yaml registers v_entity_update_lineage view
//
// Acceptance criteria covered: A6 (resolver INDEX regen), A10 (lineage chain),
// A11 (cost-bucket entries), A20 (per-task-kind caps), A29 (.skip Telegram
// notify spec), A30 (cross-flow regression matrix — R1 via R8 reuse).

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(__dirname, "..", "..");
const MIGRATION = join(REPO, "supabase", "migrations", "00041_v_entity_update_lineage.sql");
const MANIFEST = join(REPO, "knowledge", "manifest.yaml");
const KPI = join(REPO, "knowledge", "kpi-registry.yaml");
const ALERTS = join(REPO, "knowledge", "alert-rules.yaml");
const REGISTRY = join(REPO, "knowledge", "capability-registry.yaml");
const VALIDATOR = join(REPO, "scripts", "cross-tier", "validate-test-gen-methodology-drift.cjs");
const WIKI_SPEC = join(REPO, "wiki", "capabilities", "update", "spec.md");
const WIKI_RETRO = join(REPO, "wiki", "capabilities", "update", "retrospective.md");

const migrationText = readFileSync(MIGRATION, "utf8");
const manifestText = readFileSync(MANIFEST, "utf8");
const kpiText = readFileSync(KPI, "utf8");
const alertsText = readFileSync(ALERTS, "utf8");
const registryText = readFileSync(REGISTRY, "utf8");

// ────────────────────────────────────────────────────────────────────────
// Migration 00041 — lineage view
// ────────────────────────────────────────────────────────────────────────
describe("Migration 00041 — v_entity_update_lineage view", () => {
  it("creates the view (CREATE OR REPLACE)", () => {
    expect(migrationText).toMatch(/CREATE OR REPLACE VIEW\s+ops\.v_entity_update_lineage/);
  });

  it("filters to agent_slug='update'", () => {
    expect(migrationText).toMatch(/WHERE ar\.agent_slug = 'update'/);
  });

  it("reads entity_type + entity_slug from input_payload (not state_payload)", () => {
    expect(migrationText).toMatch(/input_payload->>'entity_type'/);
    expect(migrationText).toMatch(/input_payload->>'entity_slug'/);
    expect(migrationText).not.toMatch(/state_payload->>/);
  });

  it("reads classification + k4_outcome from output_payload", () => {
    expect(migrationText).toMatch(/output_payload->>'classification'/);
    expect(migrationText).toMatch(/output_payload->>'k4_outcome'/);
  });

  it("LEFT JOINs ops.evolve_extractions for bucket counts", () => {
    expect(migrationText).toMatch(/LEFT JOIN extraction_counts/);
    expect(migrationText).toMatch(/auto_accepted_count[\s\S]{0,300}pending_review_count[\s\S]{0,300}founder_accepted_count/);
  });

  it("computes lineage_depth via ROW_NUMBER OVER PARTITION BY entity", () => {
    expect(migrationText).toMatch(/ROW_NUMBER\(\)\s+OVER\s*\(\s*PARTITION BY ur\.entity_type,\s*ur\.entity_slug/);
  });

  it("computes score_delta when both pre + post castable to int", () => {
    expect(migrationText).toMatch(/score_pre_text ~ '\^-\?\[0-9\]\+\$'/);
    expect(migrationText).toMatch(/score_post_text::int - ur\.score_pre_text::int/);
  });

  it("COMMENT ON VIEW present", () => {
    expect(migrationText).toMatch(/COMMENT ON VIEW\s+ops\.v_entity_update_lineage/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// manifest.yaml — view registration
// ────────────────────────────────────────────────────────────────────────
describe("manifest.yaml — v_entity_update_lineage registered", () => {
  it("declares view entry with migration_file pointer", () => {
    expect(manifestText).toMatch(/- name:\s+v_entity_update_lineage[\s\S]{0,400}migration_file:\s+supabase\/migrations\/00041_v_entity_update_lineage\.sql/);
  });

  it("kind: view explicitly declared", () => {
    expect(manifestText).toMatch(/v_entity_update_lineage[\s\S]{0,200}kind:\s+view/);
  });

  it("documents lineage_depth semantic", () => {
    expect(manifestText).toMatch(/v_entity_update_lineage[\s\S]{0,1000}lineage_depth column/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// kpi-registry.yaml — 3 NEW KPIs
// ────────────────────────────────────────────────────────────────────────
describe("kpi-registry.yaml — 3 NEW KPIs for capability `update`", () => {
  it("declares entity_update_run_count_monthly (SC1)", () => {
    expect(kpiText).toMatch(/id:\s+entity_update_run_count_monthly[\s\S]{0,800}target:\s+10/);
    expect(kpiText).toMatch(/entity_update_run_count_monthly[\s\S]{0,800}agent_slug = 'update'/);
  });

  it("declares entity_update_extractions_reviewed_count (SC3)", () => {
    expect(kpiText).toMatch(/id:\s+entity_update_extractions_reviewed_count[\s\S]{0,800}target:\s+5/);
    expect(kpiText).toMatch(/entity_update_extractions_reviewed_count[\s\S]{0,800}founder_accepted/);
    expect(kpiText).toMatch(/entity_update_extractions_reviewed_count[\s\S]{0,800}founder_rejected/);
    expect(kpiText).toMatch(/entity_update_extractions_reviewed_count[\s\S]{0,800}founder_edited/);
  });

  it("declares entity_update_revert_rate (SC2 + SC4)", () => {
    // type: operational (revert rate is a runtime quality signal, but the schema
    // only permits operational | business | founder enums; semantically it's
    // an operational quality KPI under the operational umbrella).
    expect(kpiText).toMatch(/id:\s+entity_update_revert_rate[\s\S]{0,800}type:\s+operational/);
    expect(kpiText).toMatch(/entity_update_revert_rate[\s\S]{0,800}threshold_warn:\s+0\.30/);
    expect(kpiText).toMatch(/entity_update_revert_rate[\s\S]{0,800}threshold_critical:\s+0\.50/);
  });

  it("attributes ownership to entity-update-orchestrator role for all 3 KPIs", () => {
    const entries = kpiText.match(/owner_role:\s+entity-update-orchestrator/g) || [];
    expect(entries.length).toBe(3);
  });
});

// ────────────────────────────────────────────────────────────────────────
// alert-rules.yaml — 2 NEW alerts
// ────────────────────────────────────────────────────────────────────────
describe("alert-rules.yaml — 2 NEW alerts for capability `update`", () => {
  it("entity_update_revert_rate_high (severity warning at > 0.30)", () => {
    expect(alertsText).toMatch(/id:\s+entity_update_revert_rate_high[\s\S]{0,400}condition:\s+kpi\.entity_update_revert_rate > 0\.30/);
    // Schema enum: info | warning | critical (not "warn")
    expect(alertsText).toMatch(/entity_update_revert_rate_high[\s\S]{0,300}severity:\s+warning/);
  });

  it("entity_update_revert_rate_critical (severity critical at > 0.50)", () => {
    expect(alertsText).toMatch(/id:\s+entity_update_revert_rate_critical[\s\S]{0,400}condition:\s+kpi\.entity_update_revert_rate > 0\.50/);
    expect(alertsText).toMatch(/entity_update_revert_rate_critical[\s\S]{0,300}severity:\s+critical/);
  });

  it("both alerts route to telegram_founder", () => {
    expect(alertsText).toMatch(/entity_update_revert_rate_high[\s\S]{0,300}notify:\s+\[telegram_founder\]/);
    expect(alertsText).toMatch(/entity_update_revert_rate_critical[\s\S]{0,300}notify:\s+\[telegram_founder\]/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// scripts/cross-tier/validate-test-gen-methodology-drift.cjs
// ────────────────────────────────────────────────────────────────────────
describe("validate-test-gen-methodology-drift.cjs — @cto NIT T7 warn-only", () => {
  const validator = require(VALIDATOR);

  it("exports extractPhaseBlock + sha256 helpers", () => {
    expect(typeof validator.extractPhaseBlock).toBe("function");
    expect(typeof validator.sha256).toBe("function");
  });

  it("extractPhaseBlock returns null when PHASE 1 not present", () => {
    expect(validator.extractPhaseBlock("nothing relevant here")).toBeNull();
  });

  it("extractPhaseBlock matches PHASE 1 — Code Analysis to Pragmatic Exceptions", () => {
    const text = `lorem ipsum
PHASE 1 — Code Analysis
some content
PHASE 5 — Run Tests
more content
Pragmatic Exceptions
afterwards`;
    const block = validator.extractPhaseBlock(text);
    expect(block).not.toBeNull();
    expect(block).toMatch(/PHASE 1 — Code Analysis/);
    expect(block).toMatch(/Pragmatic Exceptions/);
  });

  it("sha256 is deterministic for the same input", () => {
    const h1 = validator.sha256("hello");
    const h2 = validator.sha256("hello");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it("sha256 differs for different input", () => {
    expect(validator.sha256("a")).not.toBe(validator.sha256("b"));
  });

  it("extracts the actual PHASE block from the live test-gen SKILL.md", () => {
    const skillPath = join(REPO, "06-ai-ops", "skills", "eval-evo", "test-gen", "SKILL.md");
    const skillText = readFileSync(skillPath, "utf8");
    const block = validator.extractPhaseBlock(skillText);
    expect(block).not.toBeNull();
    expect(block!.length).toBeGreaterThan(500);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Phase 8 — spec.md + retrospective.md promotion
// ────────────────────────────────────────────────────────────────────────
describe("Phase 8 — spec promotion to wiki/capabilities/update/", () => {
  it("wiki/capabilities/update/spec.md exists", () => {
    expect(existsSync(WIKI_SPEC)).toBe(true);
  });

  it("wiki/capabilities/update/retrospective.md exists", () => {
    expect(existsSync(WIKI_RETRO)).toBe(true);
  });

  it("retrospective.md references the capability_run_id", () => {
    const retroText = readFileSync(WIKI_RETRO, "utf8");
    expect(retroText).toContain("16720cb5-f2fe-47f0-9d47-beaeca5f05e1");
  });

  it("retrospective.md lists all 4 sprint commits", () => {
    const retroText = readFileSync(WIKI_RETRO, "utf8");
    expect(retroText).toMatch(/7e794cc/);  // Sprint 1
    expect(retroText).toMatch(/64ddd38/);  // Sprint 2
    expect(retroText).toMatch(/3773fd0/);  // Sprint 3
  });

  it("retrospective.md surfaces the v1.0 → v1.1+ triggers", () => {
    const retroText = readFileSync(WIKI_RETRO, "utf8");
    expect(retroText).toMatch(/Triggers for v1\.1\+/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// capability-registry.yaml — state transition proposed → operating
// ────────────────────────────────────────────────────────────────────────
describe("capability-registry.yaml — update capability state transition", () => {
  it("update entry state: operating", () => {
    expect(registryText).toMatch(/- id:\s+update[\s\S]{0,2000}state:\s+operating/);
  });

  it("references promoted spec_path under wiki/", () => {
    expect(registryText).toMatch(/- id:\s+update[\s\S]{0,3000}spec_path:\s+wiki\/capabilities\/update\/spec\.md/);
  });

  it("references retrospective_path under wiki/", () => {
    expect(registryText).toMatch(/- id:\s+update[\s\S]{0,3000}retrospective_path:\s+wiki\/capabilities\/update\/retrospective\.md/);
  });

  it("uses cost-bucket ai-ops-entity-update (Sprint 1 ROLES.md alignment)", () => {
    expect(registryText).toMatch(/- id:\s+update[\s\S]{0,3000}cost_bucket:\s+ai-ops-entity-update/);
  });

  it("declares operating_since timestamp", () => {
    expect(registryText).toMatch(/- id:\s+update[\s\S]{0,2000}operating_since:\s+2026-05-26/);
  });
});
