#!/usr/bin/env node
/**
 * scripts/cross-tier/validate-pillar-numbering.cjs
 *
 * Locks the pillar-numbering convention:
 *   - Top-level pillars MUST match ^[0-9]{2}-[a-z][a-z0-9-]+$  (e.g., 05-customer)
 *   - Sub-pillars MUST NOT match ^[0-9]{2}-  (use unprefixed slugs)
 *
 * Only considers git-tracked directories. Untracked local cruft (stray build
 * outputs, uncommitted work-in-progress folders, typo'd dir names) is ignored,
 * matching CI behavior where only committed state is visible.
 *
 * Convention rationale: .archives/sub-pillar-renumbering/00-rationale.md (local-only)
 *
 * SOP folder names (SOP-CUSTOMER-009-foo) are unaffected; this validator does
 * not inspect SOP namespace numbering.
 *
 * Run as L1 check via scripts/check-consistency.cjs.
 *
 * Exit codes:
 *   0 — both invariants passed
 *   1 — at least one violation detected
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Top-level dirs that look like pillars but aren't — skip them.
// Anything else at repo root that's a directory AND not in this list is treated
// as a pillar candidate.
const NON_PILLAR_TOPLEVEL = new Set([
  '.archives', '.claude', '.github', '.husky', '.git',
  'node_modules', 'frontend', 'mcp-server', 'tests', 'wiki',
  'supabase', 'notes', 'knowledge', 'governance', 'raw',
  'src', 'scripts', 'placeholders', '_templates',
  'runtime', 'dist', 'build', 'coverage',
]);

// Conventional directory names that appear inside pillars but are NOT sub-pillars.
// These are allowed to exist alongside sub-pillar directories.
const PILLAR_INTERNAL_DIRS = new Set([
  'sops', 'agents', 'sub-pillars', 'modules', 'skills',
]);

const TOPLEVEL_PILLAR_REGEX = /^[0-9]{2}-[a-z][a-z0-9-]+$/;
const SUBPILLAR_FORBIDDEN_PREFIX = /^[0-9]{2}-/;

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

// A directory is "tracked" if git has at least one file recorded under it.
// Used to filter out local cruft (untracked top-level dirs like `--version/`,
// stray build outputs, work-in-progress folders) that has no bearing on the
// committed repo state. This makes the validator's behavior match CI: only
// directories present in the index/HEAD trigger pillar/subpillar checks.
//
// Implementation: `git ls-files <relpath>` lists tracked files; nonempty
// output means at least one tracked file. Untracked dirs return empty.
//
// NOTE: a tracked .gitkeep counts as "tracked content" — this is intentional.
// If a contributor commits an empty pillar dir with .gitkeep, the validator
// catches it (the shell IS the commitment).
function isTracked(relativeDir) {
  const result = spawnSync('git', ['-C', REPO_ROOT, 'ls-files', '--', relativeDir], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) return false;
  return result.stdout.trim().length > 0;
}

function verifyToplevelPillarsNumbered() {
  const allDirs = listDirs(REPO_ROOT);

  // A pillar candidate = directory at repo root that:
  //   - isn't in NON_PILLAR_TOPLEVEL allow-list
  //   - doesn't start with a dot (filesystem hidden)
  //   - is git-tracked (has at least one file recorded in the index)
  // The tracked filter ignores local cruft and uncommitted work-in-progress.
  const pillarCandidates = allDirs
    .filter((name) => !name.startsWith('.') && !NON_PILLAR_TOPLEVEL.has(name))
    .filter((name) => isTracked(name));

  const violations = pillarCandidates.filter(
    (name) => !TOPLEVEL_PILLAR_REGEX.test(name)
  );

  return {
    name: 'verify-toplevel-pillars-numbered',
    pillars_checked: pillarCandidates.length,
    violations,
    passed: violations.length === 0,
  };
}

function verifyNoSubpillarNumbering() {
  const allDirs = listDirs(REPO_ROOT);
  const pillarDirs = allDirs.filter(
    (name) => TOPLEVEL_PILLAR_REGEX.test(name)
  );

  const violations = [];
  let totalSubpillars = 0;

  for (const pillar of pillarDirs) {
    // Skip pillars that aren't git-tracked (matches verifyToplevelPillarsNumbered's
    // filter — keeps both invariants consistent in what they consider "real").
    if (!isTracked(pillar)) continue;

    const subDirs = listDirs(path.join(REPO_ROOT, pillar))
      .filter((name) => !PILLAR_INTERNAL_DIRS.has(name))
      .filter((name) => !name.startsWith('.'))
      .filter((name) => isTracked(`${pillar}/${name}`));

    totalSubpillars += subDirs.length;

    for (const sub of subDirs) {
      if (SUBPILLAR_FORBIDDEN_PREFIX.test(sub)) {
        violations.push(`${pillar}/${sub}`);
      }
    }
  }

  return {
    name: 'verify-no-subpillar-numbering',
    subpillars_checked: totalSubpillars,
    violations,
    passed: violations.length === 0,
  };
}

function main() {
  let exitCode = 0;

  const top = verifyToplevelPillarsNumbered();
  if (top.passed) {
    console.log(`✓ verify-toplevel-pillars-numbered: ${top.pillars_checked} top-level pillars OK`);
  } else {
    console.error(
      `✗ verify-toplevel-pillars-numbered: ${top.violations.length} pillar(s) ` +
      `do not match NN-slug convention:`
    );
    for (const v of top.violations) console.error(`    ${v}`);
    exitCode = 1;
  }

  const sub = verifyNoSubpillarNumbering();
  if (sub.passed) {
    console.log(`✓ verify-no-subpillar-numbering: ${sub.subpillars_checked} sub-pillars unprefixed`);
  } else {
    console.error(
      `✗ verify-no-subpillar-numbering: ${sub.violations.length} sub-pillar(s) ` +
      `still use NN- prefix:`
    );
    for (const v of sub.violations) console.error(`    ${v}`);
    exitCode = 1;
  }

  process.exit(exitCode);
}

main();
