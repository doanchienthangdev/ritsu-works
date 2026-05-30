#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-resolver-v2-coverage.cjs
 *
 * L2 WARN validator: every source entity (across ALL 16 recipient kinds) should
 * have a catalog entry, and every catalog entry should have a source. Missing
 * entries are warnings (the resolver-catalog-sync cron / `sync.cjs --apply` picks
 * them up next run), not errors.
 *
 * resolver-plan v1.0 (Sprint 2): expected-set extended from 5 kinds
 * (skills/commands/agents/personas/mcps) to ALL 16 kinds (+ wiki, sop, capability,
 * workflow, schedule, hook, page, view, metric, runbook, external-source). This is
 * a PREREQUISITE for the Sprint-4 WARN→CRITICAL promotion: a CRITICAL gate that
 * only covered 5/16 kinds would give false "no silent invisible component"
 * confidence. STILL WARN here (process.exit(0)) — the promotion happens in Sprint 4
 * after one clean resolver-catalog-sync cron cycle.
 *
 * CONTENT-compare, NOT mtime: builds the expected id-set in-memory from the
 * catalog-generator's per-kind source walks and diffs it against the loaded
 * catalog ids. No statSync / mtime comparison (avoids the worktree mtime
 * false-positive).
 *
 * Exit 0 = pass (or warn). 1 = catalog completely missing.
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
    console.warn(`[WARN] ${missing.length} source entities missing from catalog (run sync to add):`);
    for (const id of missing.slice(0, 20)) console.warn('  -', id);
    if (missing.length > 20) console.warn(`  ... and ${missing.length - 20} more`);
  }
  if (orphan.length > 0) {
    console.warn(`[WARN] ${orphan.length} catalog entries have no source (run sync to prune):`);
    for (const id of orphan.slice(0, 20)) console.warn('  -', id);
    if (orphan.length > 20) console.warn(`  ... and ${orphan.length - 20} more`);
  }
  process.exit(0); // warn-only (Sprint 4 promotes to CRITICAL after one clean cron cycle)
}

// Exported for unit tests; only run main() when invoked as a script.
module.exports = { expectedIds, GENERATORS };

if (require.main === module) {
  main();
}
