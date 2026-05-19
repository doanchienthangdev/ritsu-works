#!/usr/bin/env node
/**
 * scripts/validate-docs-coverage.cjs — L2 validator for docs-engine.
 *
 * Compares filesystem inventory of walker scope (per Phase 1 Q3) against the
 * MDX pages under docs/content/docs/. Reports missing pages (source exists,
 * no MDX), orphan pages (MDX exists, no source), and stale source_hash.
 *
 * v0.1 (Sprint 1 PR-3): **soft mode**. Returns 0 even if drift found, just
 * prints the count. When `/docs sync` is run + has populated docs/content/,
 * this validator will become meaningful. Promote to hard-gate in v1.0.1 once
 * Sprint 3 ships the docs site + GitHub workflow.
 *
 * Pre-Sprint 1: empty content dir → 0 drift, 0 expected → clean.
 *
 * Exit codes:
 *   0 — clean (or soft-mode pass)
 *   1 — drift detected AND --strict mode
 */

"use strict";

const fs = require("fs");
const path = require("path");

// Reuse the walker from scripts/docs-sync.cjs
const docsSync = require("./docs-sync.cjs");

const REPO_ROOT = path.resolve(__dirname, "..");
const DOCS_CONTENT = path.join(REPO_ROOT, "docs", "content", "docs");

function* walkMdx(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkMdx(full);
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      yield full;
    }
  }
}

function main() {
  const strict = process.argv.includes("--strict");
  const sources = docsSync.listSources("all");

  // Build source map: relPath → sha256(canonicalize(content))
  const sourceMap = new Map();
  for (const { absPath, relPath } of sources) {
    try {
      const raw = fs.readFileSync(absPath, "utf8");
      sourceMap.set(relPath, docsSync.sha256(raw));
    } catch (_e) {
      // ignore unreadable
    }
  }

  // Walk MDX pages
  const mdxFiles = Array.from(walkMdx(DOCS_CONTENT));

  let missing = 0;
  let orphan = 0;
  let stale = 0;
  const errors = [];

  const seenSources = new Set();
  for (const mdxPath of mdxFiles) {
    try {
      const text = fs.readFileSync(mdxPath, "utf8");
      const { frontmatter } = docsSync.parseFrontmatter(text);
      if (!frontmatter || !frontmatter.source_path) continue; // hand-written tutorial (no source)

      const srcRel = frontmatter.source_path;
      seenSources.add(srcRel);

      if (!sourceMap.has(srcRel)) {
        orphan++;
        errors.push(`ORPHAN ${path.relative(REPO_ROOT, mdxPath)} → source missing: ${srcRel}`);
        continue;
      }
      if (frontmatter.source_hash && frontmatter.source_hash !== sourceMap.get(srcRel)) {
        stale++;
        errors.push(`STALE ${path.relative(REPO_ROOT, mdxPath)} → source_hash mismatch (run /docs sync)`);
      }
    } catch (_e) {
      // ignore
    }
  }

  // Missing = sources not yet covered by any MDX
  for (const relPath of sourceMap.keys()) {
    if (!seenSources.has(relPath)) {
      missing++;
      // Don't print every missing source pre-Sprint 1 (it'd be ~215 lines)
      if (errors.length < 20) {
        errors.push(`MISSING ${relPath} → no MDX with this source_path`);
      }
    }
  }

  const drift = missing + orphan + stale;

  console.log("");
  console.log(`[validate-docs-coverage] sources=${sources.length}, mdx=${mdxFiles.length}, drift=${drift}`);
  console.log(`  missing=${missing}, orphan=${orphan}, stale=${stale}`);

  if (drift === 0) {
    console.log("  ✓ docs-coverage clean");
    return 0;
  }

  // Print first 20 errors
  for (const e of errors.slice(0, 20)) {
    console.log(`    ${e}`);
  }
  if (errors.length > 20) {
    console.log(`    ... ${errors.length - 20} more`);
  }

  // v0.1 soft-mode: pre-Sprint 1, the docs/content/ folder is empty so missing=N
  // but we don't want CI to fail on PR-3 (the very PR that ships the validator).
  // After Sprint 1 ships + /docs sync runs, future PRs are expected clean.
  if (!strict) {
    console.log("  (soft mode — exit 0; promote to strict in v1.0.1 once Sprint 3 ships)");
    return 0;
  }

  console.log("  ✗ STRICT MODE — drift > 0, failing");
  return 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { main };
