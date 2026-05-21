#!/usr/bin/env node
/**
 * scripts/core/reindex.cjs — `/core reindex` implementation.
 *
 * Regenerate INDEX.md doc table from frontmatter scan of 00-core/*.md.
 *
 * Modes:
 *   --check         Phase 1 default. Report staleness; exit 2 if stale; don't write.
 *   --write         Phase 2 (deferred). Overwrite INDEX.md doc table.
 *
 * Per CEO plan: Phase 1 uses --check only (warns); --write is Phase 2 work.
 *
 * Staleness detection:
 *   INDEX.md last_reviewed < newest doc last_reviewed → stale
 *   OR INDEX doc count ≠ filesystem doc count → stale
 *
 * Exit codes: 0 in-sync, 2 stale (warning), 1 error.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { parse, list } = require("./lib/frontmatter.cjs");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CORE_DIR = path.join(REPO_ROOT, "00-core");
const INDEX_PATH = path.join(CORE_DIR, "INDEX.md");

function parseArgs(argv) {
  const args = { check: true, write: false };
  for (const a of argv.slice(2)) {
    if (a === "--check") {
      args.check = true;
      args.write = false;
    } else if (a === "--write") {
      args.write = true;
      args.check = false;
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const mode = args.write ? "WRITE" : "CHECK";
  console.log(`[core-reindex] mode=${mode}`);

  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`[core-reindex] ✗ 00-core/INDEX.md missing`);
    process.exit(1);
  }

  // Read INDEX frontmatter
  const indexContent = fs.readFileSync(INDEX_PATH, "utf-8");
  let indexFm = {};
  try {
    indexFm = parse(indexContent).frontmatter || {};
  } catch (e) {
    console.error(`[core-reindex] ✗ INDEX.md parse error: ${e.message}`);
    process.exit(1);
  }

  // Scan all 00-core/*.md
  const docs = list(CORE_DIR);
  const indexedDocs = docs.filter((d) => path.basename(d.path) !== "INDEX.md" && path.basename(d.path) !== "README.md");
  const docCount = indexedDocs.length;

  // Compute newest last_reviewed across non-INDEX docs
  let newestReview = indexFm.last_reviewed || "1970-01-01";
  for (const d of indexedDocs) {
    if (d.frontmatter && d.frontmatter.last_reviewed && d.frontmatter.last_reviewed > newestReview) {
      newestReview = d.frontmatter.last_reviewed;
    }
  }

  // Count existing INDEX rows (rough heuristic: count "| <slug>.md |" or "| <slug> |" lines)
  const indexBody = parse(indexContent).body;
  const docRowMatches = (indexBody.match(/^\| [a-z0-9_-]+(\.md)? \|/gm) || []);
  const indexRowCount = docRowMatches.length;

  // Staleness checks
  const checks = [
    {
      name: "INDEX.last_reviewed >= newest doc last_reviewed",
      passed: indexFm.last_reviewed >= newestReview,
      detail: `INDEX=${indexFm.last_reviewed}, newest=${newestReview}`,
    },
    {
      name: "INDEX row count == filesystem doc count",
      passed: Math.abs(indexRowCount - docCount) <= 1, // ±1 tolerance
      detail: `INDEX rows=${indexRowCount}, filesystem=${docCount}`,
    },
  ];

  let allClean = true;
  for (const c of checks) {
    const marker = c.passed ? "✓" : "⚠";
    console.log(`  ${marker} ${c.name} — ${c.detail}`);
    if (!c.passed) allClean = false;
  }

  if (args.check) {
    if (allClean) {
      console.log(`[core-reindex] CHECK: in-sync ✓`);
      process.exit(0);
    } else {
      console.log(`[core-reindex] CHECK: STALE — run with --write to regenerate (Phase 2 feature)`);
      process.exit(2);
    }
  }

  if (args.write) {
    console.log(`[core-reindex] WRITE mode is Phase 2 deferred. Use --check for v1.`);
    process.exit(1);
  }
}

main();
