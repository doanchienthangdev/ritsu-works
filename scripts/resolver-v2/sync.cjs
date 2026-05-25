#!/usr/bin/env node
'use strict';
/**
 * scripts/resolver-v2/sync.cjs — wraps catalog-generator with diff/dry-run/lock logic.
 *
 * Per spec.md §11 INV-2: defaults to --dry-run.
 *
 * Usage:
 *   node scripts/resolver-v2/sync.cjs [--dry-run] [--apply] [--auto-pr] [--kind=<k>]
 *
 * Modes:
 *   --dry-run    (default) print diff, write nothing
 *   --apply      atomic write to working tree (Tier B)
 *   --auto-pr    apply + commit + open PR via gh CLI (Tier C, rate-limited)
 *
 * Lock file: .archives/resolver-v2-sync.lock (10-min staleness)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const E = require('./errors.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RECIPIENTS_DIR = path.join(REPO_ROOT, 'knowledge', 'recipients');
const LOCK_FILE = path.join(REPO_ROOT, '.archives', 'resolver-v2-sync.lock');
const LOCK_STALE_MS = 10 * 60 * 1000;
const GENERATOR = require('./catalog-generator.cjs');

// v1.2.0 (capability-lifecycle-architecture extend): wire ALL 16 kinds defined in
// catalog-generator.cjs KINDS array, not just the original 5. This fixes the
// pre-existing bug where --kind=sop|hook|schedule|page|view|metric|runbook|
// external-source|wiki|capability|workflow crashed sync.cjs.
const ALL_GENERATORS = {
  skill: GENERATOR.generateSkills,
  command: GENERATOR.generateCommands,
  agent: GENERATOR.generateAgents,
  persona: GENERATOR.generatePersonas,
  mcp: GENERATOR.generateMcps,
  wiki: GENERATOR.generateWikis,
  sop: GENERATOR.generateSops,
  capability: GENERATOR.generateCapabilities,
  workflow: GENERATOR.generateWorkflows,
  schedule: GENERATOR.generateSchedules,
  hook: GENERATOR.generateHooks,
  page: GENERATOR.generatePages,
  view: GENERATOR.generateViews,
  metric: GENERATOR.generateMetrics,
  runbook: GENERATOR.generateRunbooks,
  'external-source': GENERATOR.generateExternalSources,
};
const ALL_KINDS = Object.keys(ALL_GENERATORS);

// Filename per kind comes from CONFIG[kind].file (source of truth) — handles
// irregular plurals (capability → capabilities.md) and hyphenated kinds
// (external-source → external-sources.md).
function filenameFor(kind) {
  const cfg = GENERATOR.CONFIG && GENERATOR.CONFIG[kind];
  if (cfg && cfg.file) return cfg.file;
  // Fallback: append 's' (works for skill/command/agent/persona/mcp/wiki/sop/etc.)
  return `${kind}s.md`;
}

function catalogTitleFor(kind) {
  return filenameFor(kind).replace(/\.md$/, '');
}

function parseArgs(argv) {
  const args = { mode: 'dry-run', kind: null };
  for (const a of argv) {
    if (a === '--dry-run') args.mode = 'dry-run';
    else if (a === '--apply') args.mode = 'apply';
    else if (a === '--auto-pr') args.mode = 'auto-pr';
    else if (a.startsWith('--kind=')) args.kind = a.split('=')[1];
  }
  return args;
}

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const stat = fs.statSync(LOCK_FILE);
    const age = Date.now() - stat.mtimeMs;
    if (age < LOCK_STALE_MS) {
      throw new E.SyncLocked(age);
    }
    // Stale — remove
    fs.unlinkSync(LOCK_FILE);
  }
  const dir = path.dirname(LOCK_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }));
}

function releaseLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch (_e) { /* ignore */ }
}

function ensureCleanWorkingTree() {
  try {
    const status = execSync('git status --porcelain knowledge/recipients/ scripts/resolver-v2/', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
    if (status) {
      throw new E.WorkingTreeDirty(`uncommitted changes in recipients/ or resolver-v2/:\n${status}`);
    }
  } catch (e) {
    if (e instanceof E.WorkingTreeDirty) throw e;
    throw new E.WorkingTreeDirty(`git status check failed: ${e.message}`);
  }
}

function diffCatalog(kind, options) {
  // Generate to temp buffer, compare with current file
  if (!ALL_GENERATORS[kind]) {
    throw new Error(`Unknown kind: ${kind}. Valid: ${ALL_KINDS.join(', ')}`);
  }
  const newEntries = ALL_GENERATORS[kind]();
  const filename = filenameFor(kind);
  const fp = path.join(RECIPIENTS_DIR, filename);
  const newContent = renderCatalog(kind, newEntries);

  if (!fs.existsSync(fp)) {
    return { kind, exists: false, willChange: true, newEntryCount: newEntries.length, oldEntryCount: 0, diff: '(new file)' };
  }
  const oldContent = fs.readFileSync(fp, 'utf-8');
  if (oldContent === newContent) {
    return { kind, exists: true, willChange: false, newEntryCount: newEntries.length, oldEntryCount: newEntries.length, diff: null };
  }
  // Compute basic diff stats
  const oldEntryCount = (oldContent.match(/^## /gm) || []).length;
  const addedBytes = newContent.length - oldContent.length;
  return {
    kind,
    exists: true,
    willChange: true,
    newEntryCount: newEntries.length,
    oldEntryCount,
    diff: `${oldEntryCount} entries → ${newEntries.length} entries (${addedBytes > 0 ? '+' : ''}${addedBytes} bytes)`,
  };
}

function renderCatalog(kind, entries) {
  // Reuse generator's render path by calling writeCatalog with dryRun + capturing
  // Simpler: replicate header + emit logic from generator
  const filename = filenameFor(kind);
  const title = catalogTitleFor(kind);
  const header = `<!-- AUTO-GENERATED by scripts/resolver-v2/catalog-generator.cjs -->
<!-- Per-entry overrides MUST be inside <!-- override-start --> ... <!-- override-end --> markers -->
<!-- DO NOT manually edit outside override markers; changes will be lost on next sync -->

# Recipient Catalog: ${title}

This file is THE source of truth for ${kind} recipients in the resolver v2 catalog.
Read in any Claude Code session via \`@knowledge/recipients/${filename}\` import.

**Total entries:** ${entries.length}
**Format spec:** \`.archives/cla/resolver-v2/spec.md\` §3

---

`;
  const body = entries.map(e => GENERATOR.emitEntry(e)).join('\n');
  return header + body;
}

function runDryRun(targetKinds) {
  console.log('[resolver-v2 sync] DRY-RUN — diff only, no writes');
  console.log('');
  const diffs = targetKinds.map(k => diffCatalog(k));
  for (const d of diffs) {
    if (d.willChange) {
      console.log(`  ${d.kind.padEnd(16)} CHANGED  ${d.diff}`);
    } else {
      console.log(`  ${d.kind.padEnd(16)} no-change (${d.newEntryCount} entries)`);
    }
  }
  const changed = diffs.filter(d => d.willChange).length;
  console.log('');
  console.log(`[resolver-v2 sync] would update ${changed}/${diffs.length} catalog file(s)`);
  console.log(`[resolver-v2 sync] re-run with --apply to write`);
  return changed;
}

function runApply(targetKinds) {
  console.log('[resolver-v2 sync] APPLY — atomic write');
  console.log('');
  let written = 0;
  for (const kind of targetKinds) {
    if (!ALL_GENERATORS[kind]) {
      console.error(`  ${kind.padEnd(16)} SKIP — unknown kind`);
      continue;
    }
    const entries = ALL_GENERATORS[kind]();
    const filename = filenameFor(kind);
    const fp = path.join(RECIPIENTS_DIR, filename);
    const newContent = renderCatalog(kind, entries);
    if (!fs.existsSync(RECIPIENTS_DIR)) fs.mkdirSync(RECIPIENTS_DIR, { recursive: true });
    const oldContent = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf-8') : null;
    if (oldContent === newContent) {
      console.log(`  ${kind.padEnd(16)} no-change`);
      continue;
    }
    // Atomic write: temp file → rename
    const tmpFp = fp + '.tmp.' + process.pid;
    fs.writeFileSync(tmpFp, newContent, 'utf-8');
    fs.renameSync(tmpFp, fp);
    written++;
    console.log(`  ${kind.padEnd(16)} wrote ${entries.length} entries`);
  }
  console.log('');
  console.log(`[resolver-v2 sync] wrote ${written}/${targetKinds.length} catalog file(s)`);
  return written;
}

function runAutoPr(targetKinds) {
  console.log('[resolver-v2 sync] AUTO-PR mode');
  ensureCleanWorkingTree();
  const written = runApply(targetKinds);
  if (written === 0) {
    console.log('[resolver-v2 sync] no changes; skip PR');
    return 0;
  }
  const branch = `resolver-v2-sync-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
  try {
    execSync(`git checkout -b ${branch}`, { cwd: REPO_ROOT, stdio: 'inherit' });
    execSync(`git add knowledge/recipients/`, { cwd: REPO_ROOT, stdio: 'inherit' });
    execSync(`git commit -m "chore(resolver-v2): auto-sync catalog (${written} files updated)"`, { cwd: REPO_ROOT, stdio: 'inherit' });
    execSync(`git push -u origin ${branch}`, { cwd: REPO_ROOT, stdio: 'inherit' });
    execSync(`gh pr create --title "chore(resolver-v2): auto-sync catalog" --body "Auto-generated by /resolver sync --auto-pr"`, { cwd: REPO_ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error('[resolver-v2 sync] auto-pr failed:', e.message);
    return 1;
  }
  return 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  // v1.2.0: default to ALL 16 kinds (was 5). Phase 8 catalog-updater relies on
  // this — every CLA-built capability may add SOPs / schedules / hooks / new
  // recipient kinds beyond the original 5.
  const targetKinds = args.kind ? [args.kind] : ALL_KINDS;

  try {
    acquireLock();
  } catch (e) {
    if (e instanceof E.SyncLocked) {
      console.error(`[resolver-v2 sync] lock held (${e.lockAgeMs}ms old); wait or remove ${LOCK_FILE}`);
      process.exit(2);
    }
    throw e;
  }

  try {
    if (args.mode === 'dry-run') {
      runDryRun(targetKinds);
    } else if (args.mode === 'apply') {
      runApply(targetKinds);
    } else if (args.mode === 'auto-pr') {
      runAutoPr(targetKinds);
    }
  } finally {
    releaseLock();
  }
}

if (require.main === module) main();

module.exports = { parseArgs, diffCatalog, renderCatalog, runDryRun, runApply };
