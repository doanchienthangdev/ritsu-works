#!/usr/bin/env node
/**
 * scripts/cross-tier/validate-core-pillar.cjs — cross-tier wrapper.
 *
 * Thin wrapper that delegates to `scripts/core/validate.cjs` for pnpm check
 * integration. Phase 1: standalone (run-on-demand). Phase 2: wired to
 * scripts/check-consistency.cjs L2 critical list.
 *
 * Exit codes mirror validate.cjs: 0 pass, 1 critical, 2 warnings only.
 */

"use strict";

const { spawnSync } = require("node:child_process");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const VALIDATE_CJS = path.join(REPO_ROOT, "scripts", "core", "validate.cjs");

function main() {
  const r = spawnSync("node", [VALIDATE_CJS, ...process.argv.slice(2)], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}

main();
