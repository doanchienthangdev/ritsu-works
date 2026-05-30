#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-resolver-v2-coverage.cjs
 *
 * L2 CRITICAL validator: every source entity (across ALL 16 recipient kinds) MUST
 * have a catalog entry, and every catalog entry MUST have a source. A missing entry
 * (a real component invisible to the resolver) or an orphan (a catalog entry whose
 * source was removed) is now BLOCKING.
 *
 * resolver-plan v1.0 (Sprint 2): expected-set extended from 5 kinds
 * (skills/commands/agents/personas/mcps) to ALL 16 kinds (+ wiki, sop, capability,
 * workflow, schedule, hook, page, view, metric, runbook, external-source). A
 * CRITICAL gate that only covered 5/16 kinds would give false "no silent invisible
 * component" confidence — so Sprint 2 widened coverage to all 16 FIRST.
 *
 * resolver-plan v1.0 (Sprint 4): promoted WARN→CRITICAL in check-consistency.cjs.
 * Drift now exits non-zero (was exit 0 warn-only). The nightly resolver-catalog-sync
 * GitHub Action (`.github/workflows/resolver-catalog-sync.yml`) regenerates the
 * catalog and opens a DRAFT PR when it drifts, so this gate stays green between
 * source changes and their catalog refresh.
 *
 * CONTENT-compare, NOT mtime: builds the expected id-set in-memory from the
 * catalog-generator's per-kind source walks and diffs it against the loaded
 * catalog ids. No statSync / mtime comparison (avoids the worktree mtime
 * false-positive).
 *
 * Exit 0 = pass. 1 = drift (missing/orphan) OR catalog completely missing.
 */

const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RECIPIENTS_DIR = path.join(REPO_ROOT, 'knowledge', 'recipients');

const { loadCatalog } = require(path.join(REPO_ROOT, 'scripts/resolver-v2/catalog-loader.cjs'));
const gen = require(path.join(REPO_ROOT, 'scripts/resolver-v2/catalog-generator.cjs'));

// All 16 per-kind generators (resolver-plan v1.0 Sprint 2). Order mirrors KINDS.
// Each returns the recipients the generator would emit for that kind FROM the live
// system (SKILL.md files, command/agent/persona .md, mcp-tools.yaml, wiki sources,
// SOP flow.yaml, capability-registry.yaml, schedules.yaml, hooks, Tier-1 pages,
// view/metric DDL, runbooks, external-sources.yaml).
const GENERATORS = [
  gen.generateSkills,
  gen.generateCommands,
  gen.generateAgents,
  gen.generatePersonas,
  gen.generateMcps,
  // v2.1 composition expansion
  gen.generateWikis,
  gen.generateSops,
  gen.generateCapabilities,
  gen.generateWorkflows,
  gen.generateSchedules,
  gen.generateHooks,
  // v2.2 context sources
  gen.generatePages,
  gen.generateViews,
  gen.generateMetrics,
  gen.generateRunbooks,
  gen.generateExternalSources,
];

/**
 * Build the expected id-set from all 16 generators. A generator that throws (e.g.
 * a kind whose source dir is absent in this checkout) is treated as "no expected
 * entities for that kind" rather than failing the whole sweep — coverage is WARN,
 * so a partial source tree must not hard-fail. Exported for unit tests.
 */
function expectedIds(generators = GENERATORS) {
  const ids = new Set();
  for (const g of generators) {
    let recipients;
    try {
      recipients = g();
    } catch (_e) {
      continue; // source for this kind unavailable here; skip (warn-only validator).
    }
    for (const r of recipients) ids.add(r.id);
  }
  return ids;
}

function main() {
  if (!fs.existsSync(RECIPIENTS_DIR)) {
    console.error('[FAIL] knowledge/recipients/ missing');
    process.exit(1);
  }
  const catalog = loadCatalog({ skipCache: true });
  const expected = expectedIds();
  const actualIds = new Set(catalog.recipients.map(r => r.id));

  const missing = [...expected].filter(id => !actualIds.has(id));
  const orphan = [...actualIds].filter(id => !expected.has(id));

  if (missing.length === 0 && orphan.length === 0) {
    console.log(`[PASS] coverage complete across 16 kinds: ${actualIds.size} recipients indexed`);
    process.exit(0);
  }
  if (missing.length > 0) {
    console.error(`[FAIL] ${missing.length} source entities missing from catalog (run sync to add):`);
    for (const id of missing.slice(0, 20)) console.error('  -', id);
    if (missing.length > 20) console.error(`  ... and ${missing.length - 20} more`);
  }
  if (orphan.length > 0) {
    console.error(`[FAIL] ${orphan.length} catalog entries have no source (run sync to prune):`);
    for (const id of orphan.slice(0, 20)) console.error('  -', id);
    if (orphan.length > 20) console.error(`  ... and ${orphan.length - 20} more`);
  }
  // resolver-plan v1.0 Sprint 4: promoted WARN→CRITICAL in check-consistency.cjs.
  // A real drift (missing or orphan) now BLOCKS — the nightly resolver-catalog-sync
  // GitHub Action regenerates the catalog and opens a draft PR to clear it. The
  // generator-throws tolerance (a kind whose source dir is absent in this checkout)
  // is still handled in expectedIds(), so a partial source tree does not hard-fail.
  process.exit(1);
}

// Exported for unit tests; only run main() when invoked as a script.
module.exports = { expectedIds, GENERATORS };

if (require.main === module) {
  main();
}
