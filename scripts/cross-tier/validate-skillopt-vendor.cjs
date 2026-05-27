#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * L1 invariant: skillopt-vendor-sha-pinned
 *
 * Verifies vendor/skillopt submodule integrity for capability `evolve` v1.1:
 *   1. vendor/skillopt.pin exists and is well-formed
 *   2. Pinned SHA matches the submodule's gitlink in HEAD
 *      (with a working-tree fallback for pre-commit state)
 *   3. Required patch sources exist in scripts/skillopt/upstream-patches/
 *   4. If vendor/skillopt has been hydrated, the router signature line is
 *      present (proves install-vendor.sh ran)
 *
 * Exit codes: 0 = clean, 1 = drift.
 *
 * Spec: .archives/cla/evolve-extend-skillopt/spec.md §19.4 (promoted to
 * wiki/capabilities/evolve/spec.md at Phase 8).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return process.cwd();
  }
})();

const PIN_FILE = path.join(REPO_ROOT, 'vendor', 'skillopt.pin');
const VENDOR_DIR = path.join(REPO_ROOT, 'vendor', 'skillopt');
const PATCHES_DIR = path.join(REPO_ROOT, 'scripts', 'skillopt', 'upstream-patches');
const BACKEND_BASENAME = 'ritsu_file_queue.py';
const ROUTER_SIGNATURE = '# ritsu-works:ritsu_file_queue:v1';

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

// 1. Pin file
if (!fs.existsSync(PIN_FILE)) {
  fail(`vendor/skillopt.pin missing. Add the pin file per spec §19.4.`);
}
const pinContent = fs.readFileSync(PIN_FILE, 'utf8');
const pinLine = pinContent
  .split('\n')
  .map((line) => line.trim())
  .find((line) => line.startsWith('vendor/skillopt:'));
if (!pinLine) {
  fail(`vendor/skillopt.pin has no 'vendor/skillopt: <sha>' line.`);
}
const pinnedSha = pinLine.split(':').slice(1).join(':').trim();
if (!/^[0-9a-f]{40}$/.test(pinnedSha)) {
  fail(`malformed SHA in vendor/skillopt.pin: '${pinnedSha}'`);
}

// 2. Actual SHA from gitlink (HEAD) or working tree fallback
let actualSha = '';
try {
  const lsTree = execFileSync(
    'git',
    ['ls-tree', 'HEAD', 'vendor/skillopt'],
    { encoding: 'utf8', cwd: REPO_ROOT },
  ).trim();
  if (lsTree) {
    const fields = lsTree.split(/\s+/);
    if (fields[1] === 'commit') {
      actualSha = fields[2];
    }
  }
} catch {
  // HEAD may not yet contain the submodule (first add not committed) — fall through
}

if (!actualSha) {
  // Working-tree fallback: submodule is checked out but not yet in HEAD
  if (fs.existsSync(path.join(VENDOR_DIR, '.git'))) {
    try {
      actualSha = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: VENDOR_DIR,
        encoding: 'utf8',
      }).trim();
    } catch (e) {
      fail(`cannot read submodule HEAD at ${VENDOR_DIR}: ${e.message}`);
    }
  } else {
    fail(
      `vendor/skillopt is neither committed as a submodule nor checked out. ` +
        `Run: bash scripts/skillopt/install-vendor.sh`,
    );
  }
}

if (pinnedSha !== actualSha) {
  console.error(`[FAIL] vendor/skillopt SHA drift:`);
  console.error(`  pinned : ${pinnedSha}`);
  console.error(`  actual : ${actualSha}`);
  console.error(`  Re-pin via:`);
  console.error(`    git submodule update --remote vendor/skillopt`);
  console.error(
    `    echo "vendor/skillopt: $(git -C vendor/skillopt rev-parse HEAD)" > vendor/skillopt.pin`,
  );
  process.exit(1);
}

// 3. Required patch sources
const requiredPatchFiles = [
  path.join(PATCHES_DIR, BACKEND_BASENAME),
  path.join(PATCHES_DIR, 'router.patch'),
  path.join(PATCHES_DIR, 'train.patch'),
];
for (const p of requiredPatchFiles) {
  if (!fs.existsSync(p)) {
    fail(
      `${path.relative(REPO_ROOT, p)} missing — required by install-vendor.sh.`,
    );
  }
}

// 4. Signature check (only if vendor is hydrated)
const routerPath = path.join(
  VENDOR_DIR,
  'skillopt',
  'model',
  'router.py',
);
const vendorHydrated = fs.existsSync(routerPath);
if (vendorHydrated) {
  const router = fs.readFileSync(routerPath, 'utf8');
  if (!router.includes(ROUTER_SIGNATURE)) {
    fail(
      `vendor/skillopt/skillopt/model/router.py lacks signature '${ROUTER_SIGNATURE}'. ` +
        `Run: bash scripts/skillopt/install-vendor.sh`,
    );
  }
  const backendDest = path.join(
    VENDOR_DIR,
    'skillopt',
    'model',
    BACKEND_BASENAME,
  );
  if (!fs.existsSync(backendDest)) {
    fail(
      `${path.relative(REPO_ROOT, backendDest)} missing post-install. ` +
        `Run: bash scripts/skillopt/install-vendor.sh`,
    );
  }
  // train.py argparse choices must include ritsu_file_queue (train.patch applied).
  const trainPath = path.join(VENDOR_DIR, 'scripts', 'train.py');
  if (fs.existsSync(trainPath)) {
    const train = fs.readFileSync(trainPath, 'utf8');
    if (!train.includes('"ritsu_file_queue"')) {
      fail(
        `vendor/skillopt/scripts/train.py argparse --backend choices lack "ritsu_file_queue" — train.patch not applied. ` +
          `Run: bash scripts/skillopt/install-vendor.sh`,
      );
    }
  }
}

console.log(
  `[OK] vendor/skillopt SHA pinned: ${pinnedSha}${vendorHydrated ? ' (hydrated, patched)' : ' (not hydrated; install-vendor.sh skipped)'}`,
);
process.exit(0);
