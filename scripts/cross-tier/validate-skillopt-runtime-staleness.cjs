#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * L2 invariant (warn-tier): skillopt-runtime-staleness
 *
 * Warns (does NOT fail) on `runtime/skillopt/<entity>/runs/<rid>/` directories
 * older than 60 days. These are run artifacts (dataset.jsonl, best-skill.md,
 * state.json, runner-state.json) that accumulate from prior /evolve skillopt
 * invocations. Fresh repos pass cleanly. Long-running developer environments
 * get a heads-up to clean up.
 *
 * Capability: evolve v1.1 Sprint 4. Spec: wiki/capabilities/evolve/spec.md
 * §19.10 (after Phase 8 promotion); draft .archives/cla/evolve-extend-skillopt/spec.md.
 *
 * Exit codes:
 *   0 — clean (no stale runs OR runtime/skillopt/ doesn't exist)
 *   2 — warn (stale runs found; not CI-blocking — caller treats as warn-tier)
 *
 * Why warn not fail: stale run dirs are housekeeping debt, not correctness
 * drift. Forcing CI red on a developer-machine artifact would block legitimate
 * PRs. The L1 staleness mechanism is advisory until the founder decides to
 * automate cleanup (separate Sprint).
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RUNTIME_SKILLOPT_DIR = path.join(REPO_ROOT, 'runtime', 'skillopt');
const STALENESS_DAYS = 60;
const STALENESS_MS = STALENESS_DAYS * 24 * 60 * 60 * 1000;

function warn(msg) {
  console.warn(`  - ${msg}`);
}

if (!fs.existsSync(RUNTIME_SKILLOPT_DIR)) {
  console.log(`[OK] runtime/skillopt/ does not exist — no runs to stale`);
  process.exit(0);
}

const stat = fs.statSync(RUNTIME_SKILLOPT_DIR);
if (!stat.isDirectory()) {
  console.log(`[OK] runtime/skillopt/ is not a directory — skipping`);
  process.exit(0);
}

const cutoffMs = Date.now() - STALENESS_MS;
const stale = [];

// Walk runtime/skillopt/<entity>/runs/<rid>/
let entities;
try {
  entities = fs.readdirSync(RUNTIME_SKILLOPT_DIR);
} catch {
  console.log(`[OK] runtime/skillopt/ not readable — skipping`);
  process.exit(0);
}

for (const entity of entities) {
  const entityDir = path.join(RUNTIME_SKILLOPT_DIR, entity);
  if (entity.startsWith('.')) continue;
  // Race-safe stats — directory could vanish between readdir and stat if
  // a concurrent /evolve skillopt session is cleaning up. Per @cto SHOULD-FIX
  // on PR #133 (Sprint 4 review): match the inner-stat try/catch pattern.
  try {
    if (!fs.statSync(entityDir).isDirectory()) continue;
  } catch {
    continue;
  }

  const runsDir = path.join(entityDir, 'runs');
  if (!fs.existsSync(runsDir)) continue;
  try {
    if (!fs.statSync(runsDir).isDirectory()) continue;
  } catch {
    continue;
  }

  let runs;
  try {
    runs = fs.readdirSync(runsDir);
  } catch {
    continue;
  }
  for (const rid of runs) {
    const runDir = path.join(runsDir, rid);
    if (rid.startsWith('.')) continue;
    let runStat;
    try {
      runStat = fs.statSync(runDir);
    } catch {
      continue;
    }
    if (!runStat.isDirectory()) continue;
    if (runStat.mtimeMs < cutoffMs) {
      const ageDays = Math.floor((Date.now() - runStat.mtimeMs) / (24 * 60 * 60 * 1000));
      stale.push({
        path: path.relative(REPO_ROOT, runDir),
        ageDays,
      });
    }
  }
}

if (stale.length === 0) {
  console.log(`[OK] no stale runs (>${STALENESS_DAYS}d) under runtime/skillopt/`);
  process.exit(0);
}

console.warn(`[WARN] ${stale.length} stale run dir(s) under runtime/skillopt/ (>${STALENESS_DAYS}d):`);
for (const s of stale) {
  warn(`${s.path} (${s.ageDays}d old)`);
}
console.warn(`  Cleanup hint: rm -rf each above OR retain forensic copies via tar.gz then rm.`);
console.warn(`  This is a warn-tier check — not CI-blocking.`);
process.exit(2);
