// Tests for wiki-sync v3.0 distill+extract foundation (Sprint 1).
//
// Covers:
//   - validate-wiki-integrity.cjs v0.2 extensions:
//     * sentinel string "extracted_from_source_id IS NOT NULL" present
//     * v0.2 summary includes new fields (with_extracted_from_source, with_legacy_v2_verbatim)
//     * L3 v3_orphan_extracted_source local check works on synthetic fixtures
//   - Migration 00031 structural shape (file exists, parses, contains expected blocks)
//   - Test fixtures (sample-distill.md, growth-playbook-fixture.md, sample-corpus/) exist
//
// Excludes (deferred to Sprint 5 acceptance corpus run):
//   - Actual distill skill execution (requires Anthropic API calls)
//   - Confidence > 0.85 majority assertion on fixtures
//   - DB-bound D4/D5/D6 invariants (require SUPABASE_ACCESS_TOKEN)

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, openSync, closeSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const REPO = resolve(__dirname, "..");

// The validator prints its full JSON report (100KB+ with hundreds of findings) via
// console.log then calls process.exit(). process.exit() truncates a *piped* stdout
// before it drains (Node flushes pipes asynchronously), so spawnSync({encoding}) only
// captures the first ~8KB and JSON.parse throws "Unterminated string". A regular-file
// stdout sink is written synchronously and in full, so redirect the child's stdout to
// a temp file (equivalent to `node validator --json > file`) and read it back.
function runValidator(extraArgs: string[] = []): { status: number; stdout: string; stderr: string } {
  const outFile = join(
    tmpdir(),
    `wiki-integrity-${process.pid}-${Math.random().toString(36).slice(2)}.json`
  );
  const fd = openSync(outFile, "w");
  let status: number;
  try {
    const r = spawnSync(
      "node",
      [join(REPO, "scripts/cross-tier/validate-wiki-integrity.cjs"), "--json", ...extraArgs],
      { cwd: REPO, timeout: 30000, stdio: ["ignore", fd, "pipe"] }
    );
    status = r.status ?? -1;
  } finally {
    closeSync(fd);
  }
  const stdout = readFileSync(outFile, "utf-8");
  rmSync(outFile, { force: true });
  return { status, stdout, stderr: "" };
}

// ============================================================================
// validate-wiki-integrity.cjs v0.2 extensions
// ============================================================================

describe("validate-wiki-integrity v0.2 (wiki-sync v3.0 Sprint 1)", () => {
  it("contains sentinel string for sprint-order CI gate", () => {
    const src = readFileSync(
      join(REPO, "scripts/cross-tier/validate-wiki-integrity.cjs"),
      "utf-8"
    );
    // Per spec §0 Sprint-order enforcement layer 2:
    // "Sprint 2 PR's CI step runs a 3-line grep check that
    //  scripts/cross-tier/validate-wiki-integrity.cjs exists AND contains
    //  the literal string 'extracted_from_source_id IS NOT NULL'"
    expect(src).toContain("extracted_from_source_id IS NOT NULL");
  });

  it("exposes v3 invariant SQL contracts as named constants", () => {
    const src = readFileSync(
      join(REPO, "scripts/cross-tier/validate-wiki-integrity.cjs"),
      "utf-8"
    );
    expect(src).toContain("V3_CITATION_INTEGRITY_SQL");
    expect(src).toContain("V3_EXTRACTION_FK_SQL");
    expect(src).toContain("V3_DEDUP_SQL");
  });

  it("--json output declares v0.2 version + new summary fields", () => {
    const r = runValidator();
    expect(r.status).toBe(0);
    const result = JSON.parse(r.stdout);
    expect(result.version).toMatch(/v0\.2/);
    expect(result.summary).toHaveProperty("with_extracted_from_source");
    expect(result.summary).toHaveProperty("with_legacy_v2_verbatim");
  });

  it("--json output enumerates v3 invariants in db_checks contract block", () => {
    const r = runValidator(["--with-db"]);
    const result = JSON.parse(r.stdout);
    expect(result.db_checks).toBeTruthy();
    // v3.0.5: db_checks is now executed live via runAllDbChecks. Shape:
    //   { status: 'executed', timestamp, invariants: { D4_..., D5_..., D6_... }, total_violations }
    // Each invariant entry is { violations, sample } OR { error, message }
    // depending on whether subprocess succeeded.
    expect(result.db_checks.status).toBe("executed");
    expect(result.db_checks.invariants).toBeTruthy();
    expect(result.db_checks.invariants).toHaveProperty("D4_citation_integrity");
    expect(result.db_checks.invariants).toHaveProperty("D5_extraction_fk_consistency");
    expect(result.db_checks.invariants).toHaveProperty("D6_dedup_consistency");
  });
});

// ============================================================================
// Migration 00031 structural shape
// ============================================================================

describe("migration 00031_wiki_distillation.sql", () => {
  const MIGRATION = join(
    REPO,
    "supabase/migrations/00031_wiki_distillation.sql"
  );

  it("exists at the expected path", () => {
    expect(existsSync(MIGRATION)).toBe(true);
  });

  it("creates ops.knowledge_extractions table", () => {
    const sql = readFileSync(MIGRATION, "utf-8");
    expect(sql).toMatch(/CREATE TABLE ops\.knowledge_extractions/);
  });

  it("enforces strict link_type CHECK enum (4 extracted_* values)", () => {
    const sql = readFileSync(MIGRATION, "utf-8");
    expect(sql).toContain("'extracted_concept'");
    expect(sql).toContain("'extracted_observation'");
    expect(sql).toContain("'extracted_decision'");
    expect(sql).toContain("'extracted_idea'");
  });

  it("uses CTO NIT 3 widened partial index predicate (confidence < 0.95)", () => {
    const sql = readFileSync(MIGRATION, "utf-8");
    // Per CTO P2/P3 #3: partial-index predicate should NOT hard-code
    // the auto-accept threshold (0.85). Should be `confidence < 0.95` so
    // future threshold tuning doesn't invalidate the index.
    // Check the actual DDL line for the partial index uses < 0.95 not BETWEEN.
    const indexMatch = sql.match(/CREATE INDEX idx_extractions_review_queue[^;]+;/s);
    expect(indexMatch, "idx_extractions_review_queue DDL not found").toBeTruthy();
    expect(indexMatch![0]).toMatch(/WHERE founder_reviewed = false AND confidence < 0\.95/);
    expect(indexMatch![0]).not.toMatch(/BETWEEN/);
  });

  it("adds 4 new columns to ops.knowledge_pages", () => {
    const sql = readFileSync(MIGRATION, "utf-8");
    expect(sql).toContain("extracted_from_source_id uuid REFERENCES");
    expect(sql).toContain("legacy_v2_verbatim boolean NOT NULL DEFAULT false");
    expect(sql).toContain("review_state text NOT NULL DEFAULT 'auto_accepted'");
    expect(sql).toContain("deleted_at timestamptz");
  });

  it("RLS policy restricts SELECT to authenticated (NOT anon)", () => {
    const sql = readFileSync(MIGRATION, "utf-8");
    // CTO P2/P3 #3: raw_quote may contain copyrighted source text;
    // anon read would leak it. SELECT TO authenticated only.
    expect(sql).toContain("extractions_read_authenticated");
    expect(sql).toContain("FOR SELECT\n  TO authenticated");
    // Should NOT have TO anon for extractions
    expect(sql).not.toMatch(/TO anon, authenticated USING \(true\)/);
  });

  it("Block E backfill uses RAISE WARNING not RAISE NOTICE", () => {
    const sql = readFileSync(MIGRATION, "utf-8");
    // CTO P2/P3 #2: RAISE WARNING so CI output flags abnormal row counts.
    expect(sql).toMatch(/RAISE WARNING.*Block E.*no rows updated/);
    expect(sql).toMatch(/RAISE WARNING.*Block E.*expected exactly 1/);
  });

  it("uses semantic version sentinel referencing decision row 562b2e4e", () => {
    const sql = readFileSync(MIGRATION, "utf-8");
    expect(sql).toContain("562b2e4e-7f50-47f2-a3bb-1291c30f6709");
  });
});

// ============================================================================
// Test fixtures
// ============================================================================

describe("test fixtures (Sprint 1)", () => {
  const fixturesDir = join(REPO, "tests/wiki-sync/fixtures");

  it("sample-distill.md exists with ≥3 concepts/observations/decisions narrative", () => {
    const path = join(fixturesDir, "sample-distill.md");
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, "utf-8");
    expect(content).toMatch(/^---\n.*license_status:/s);
    expect(content.length).toBeGreaterThan(800);
  });

  it("growth-playbook-fixture.md exists (per spec §3.8 + Sprint 5 acceptance)", () => {
    const path = join(fixturesDir, "growth-playbook-fixture.md");
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, "utf-8");
    expect(content).toContain("PLG");
    expect(content).toContain("wedge");
    expect(content).toContain("ICP");
  });

  it("sample-corpus/ has 3 overlapping-concept files (for Sprint 3 dedup tests)", () => {
    const corpusDir = join(fixturesDir, "sample-corpus");
    expect(existsSync(join(corpusDir, "01-plg-fundamentals.md"))).toBe(true);
    expect(existsSync(join(corpusDir, "02-wedge-and-icp.md"))).toBe(true);
    expect(existsSync(join(corpusDir, "03-activation-and-ttv.md"))).toBe(true);
    // All 3 should mention "PLG" (the dedup target concept)
    const f1 = readFileSync(join(corpusDir, "01-plg-fundamentals.md"), "utf-8");
    const f2 = readFileSync(join(corpusDir, "02-wedge-and-icp.md"), "utf-8");
    const f3 = readFileSync(join(corpusDir, "03-activation-and-ttv.md"), "utf-8");
    expect(f1).toMatch(/PLG|product-led growth/i);
    expect(f2).toMatch(/PLG|product-led growth/i);
    expect(f3).toMatch(/PLG|product-led growth/i);
  });

  it("all fixture frontmatter declares license_status (per spec A11)", () => {
    const files = [
      "sample-distill.md",
      "growth-playbook-fixture.md",
      "sample-corpus/01-plg-fundamentals.md",
      "sample-corpus/02-wedge-and-icp.md",
      "sample-corpus/03-activation-and-ttv.md",
    ];
    for (const f of files) {
      const content = readFileSync(join(fixturesDir, f), "utf-8");
      expect(content).toMatch(/license_status:\s*(public_domain|creative_commons|fair_use_excerpt|copyrighted_internal_only)/);
    }
  });
});

// ============================================================================
// ROLES.md governance drift fix (CTO P2/P3 #4)
// ============================================================================

describe("ROLES.md etl-runner grant (CTO P2/P3 #4)", () => {
  it("grants etl-runner write to ops.knowledge_extractions", () => {
    const roles = readFileSync(join(REPO, "governance/ROLES.md"), "utf-8");
    // Find the etl-runner section and verify it now lists knowledge_* writes.
    const etlSection = roles.split(/^### `etl-runner`/m)[1]?.split(/^### /m)[0] ?? "";
    expect(etlSection).toContain("ops.knowledge_extractions");
    expect(etlSection).toContain("ops.knowledge_pages");
    expect(etlSection).toContain("ops.knowledge_links");
    expect(etlSection).toContain("ops.knowledge_embeddings");
  });
});

// ============================================================================
// manifest.yaml + feature-flags.yaml v3.0 declarations
// ============================================================================

describe("Tier 1 yaml declarations for v3.0", () => {
  it("manifest.yaml lists ops.knowledge_extractions with migration_file pointer", () => {
    const manifest = readFileSync(
      join(REPO, "knowledge/manifest.yaml"),
      "utf-8"
    );
    expect(manifest).toContain("knowledge_extractions");
    expect(manifest).toContain("00031_wiki_distillation.sql");
  });

  it("manifest.yaml declares a semver version >= 0.6.0 (knowledge_extractions landed at 0.6.0)", () => {
    const manifest = readFileSync(
      join(REPO, "knowledge/manifest.yaml"),
      "utf-8"
    );
    const m = manifest.match(/^version:\s*(\d+)\.(\d+)\.(\d+)/m);
    expect(m, "manifest.yaml must declare a top-level semver version field").toBeTruthy();
    // v3.0 distillation (ops.knowledge_extractions, migration 00031) shipped at
    // manifest 0.6.0. The version only moves forward, so assert the floor — not an
    // exact value that drifts to red on every unrelated manifest bump.
    const major = Number(m![1]);
    const minor = Number(m![2]);
    expect(major > 0 || (major === 0 && minor >= 6)).toBe(true);
  });

  it("feature-flags.yaml declares 3 wiki_sync_v3 flags", () => {
    const flags = readFileSync(
      join(REPO, "knowledge/feature-flags.yaml"),
      "utf-8"
    );
    expect(flags).toContain("wiki_sync_distill_enabled");
    expect(flags).toContain("wiki_sync_review_queue_telegram_digest");
    expect(flags).toContain("wiki_sync_attribution_watcher");
  });
});

// ============================================================================
// v3.0.5 patch — Batch C (cron entries + minion-worker stubs)
// ============================================================================

describe("v3.0.5 cron + minion-worker handlers (Batch C)", () => {
  it("schedules.yaml declares wiki-embeddings-backfill + wiki-review-queue-digest", () => {
    const sched = readFileSync(join(REPO, "knowledge/schedules.yaml"), "utf-8");
    expect(sched).toContain("id: wiki-embeddings-backfill");
    expect(sched).toContain("id: wiki-review-queue-digest");
  });

  it("minion-worker SKILL_REGISTRY pairs both v3.0.5 cron entries with handlers", () => {
    const mw = readFileSync(
      join(REPO, "supabase/functions/minion-worker/index.ts"),
      "utf-8"
    );
    expect(mw).toContain('"wiki-embeddings-backfill":');
    expect(mw).toContain('"wiki-review-queue-digest":');
  });

  it("economic-architecture.md documents v3.0 wiki-distill-* task_kinds", () => {
    const econ = readFileSync(
      join(REPO, "knowledge/economic-architecture.md"),
      "utf-8"
    );
    expect(econ).toContain("wiki-distill-pdf");
    expect(econ).toContain("wiki-distill-folder");
    expect(econ).toContain("wiki-ingest-verbatim");
    expect(econ).toContain("wiki-dedup-batch");
    expect(econ).toContain("wiki-review-batch");
  });
});

// ============================================================================
// v3.0.5 patch — Batch A (wiki-ask + wiki-list-pages updates)
// ============================================================================

describe("v3.0.5 MCP tool updates (Batch A)", () => {
  it("wiki-ask.ts v0.2 entity-first description references Muse M5 citation format", () => {
    const src = readFileSync(
      join(REPO, "mcp-server/src/tools/wiki-ask.ts"),
      "utf-8"
    );
    expect(src).toContain("entity-first");
    expect(src).toContain("Muse M5");
    expect(src).toContain("text-embedding-3-small");
    expect(src).toMatch(/embedQuestion/);
  });

  it("wiki-ask.ts v0.2 falls back gracefully if OPENAI_API_KEY absent", () => {
    const src = readFileSync(
      join(REPO, "mcp-server/src/tools/wiki-ask.ts"),
      "utf-8"
    );
    expect(src).toContain("OPENAI_API_KEY");
    expect(src).toContain("embedding_search_deferred_v0_2");
    expect(src).toContain("fallback_tools");
  });

  it("wiki-list-pages.ts v0.2 supports entity_only + include_deleted filters", () => {
    const src = readFileSync(
      join(REPO, "mcp-server/src/tools/wiki-list-pages.ts"),
      "utf-8"
    );
    expect(src).toContain("entity_only");
    expect(src).toContain("include_deleted");
    expect(src).toContain('extracted_from_source_id');
  });
});

// ============================================================================
// v3.0.5 patch — Batch B (DB invariants D4/D5/D6 + M7 traceability)
// ============================================================================

describe("v3.0.5 validator + content-traceability (Batch B)", () => {
  it("validate-wiki-integrity.cjs wires runAllDbChecks for --with-db mode", () => {
    const src = readFileSync(
      join(REPO, "scripts/cross-tier/validate-wiki-integrity.cjs"),
      "utf-8"
    );
    expect(src).toContain("function runAllDbChecks");
    expect(src).toContain("runDbCheck");
    expect(src).toContain("D4_citation_integrity");
    expect(src).toContain("D5_extraction_fk_consistency");
    expect(src).toContain("D6_dedup_consistency");
  });

  it("content-traceability check script exists with day-30 + day-60 gates", () => {
    const scriptPath = join(REPO, "scripts/wiki-sync/check-content-traceability.cjs");
    expect(existsSync(scriptPath)).toBe(true);
    const src = readFileSync(scriptPath, "utf-8");
    expect(src).toContain("DAY30_SQL");
    expect(src).toContain("WIKI_ASK_RUNS_SQL");
    expect(src).toContain("correlateAskWithEdits");
    expect(src).toContain("01-marketing/");
    expect(src).toContain("02-sales/");
  });
});

// ============================================================================
// v3.0.5 patch — Batch D (merge --undo cleanup)
// ============================================================================

describe("v3.0.5 merge skill --undo cleanup (Batch D)", () => {
  it("merge SKILL.md v0.2 captures extraction_ids + link_ids in merge_executed payload", () => {
    const src = readFileSync(
      join(REPO, "06-ai-ops/skills/wiki-sync/merge/SKILL.md"),
      "utf-8"
    );
    expect(src).toContain("extraction_ids_rewired");
    expect(src).toContain("link_ids_rewired");
    expect(src).toMatch(/v0\.2.*v3\.0\.5/s);
  });
});
