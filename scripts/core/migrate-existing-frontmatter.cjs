#!/usr/bin/env node
/**
 * scripts/core/migrate-existing-frontmatter.cjs — one-shot retrofit.
 *
 * Adds canonical frontmatter schema to the 3 pre-existing 00-core docs that
 * predate Sprint 1 redesign: product.md, brand_voice.md, transparency.md.
 *
 * Detection: file lacks "---\n" block at top → add frontmatter from PRESETS below.
 * If frontmatter already present (e.g. from Sprint 1 fills), preserves existing
 * and merges only missing required fields.
 *
 * Usage:
 *   node scripts/core/migrate-existing-frontmatter.cjs --dry-run   # preview
 *   node scripts/core/migrate-existing-frontmatter.cjs --apply     # write
 *
 * Exit codes: 0 ok, 1 args/parse error.
 *
 * Per Sprint 2 Build Order Step 2 — depends on scripts/core/lib/frontmatter.cjs.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { parse, serialize } = require("./lib/frontmatter.cjs");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CORE_DIR = path.join(REPO_ROOT, "00-core");

const PRESETS = {
  "product.md": {
    title: "Ritsu — Product Charter",
    type: "core-doc",
    slug: "product",
    layer: "identity",
    status: "canonical",
    owner: "founder",
    last_reviewed: "2026-05-02",
    review_cadence: "quarterly",
    cited_by: ["blog-post-drafting", "social-post-drafting", "support-reply-drafting", "growth-orchestrator"],
    auto_load: true,
  },
  "brand_voice.md": {
    title: "Ritsu Brand Voice",
    type: "core-doc",
    slug: "brand-voice",
    layer: "identity",
    status: "canonical",
    owner: "founder",
    last_reviewed: "2026-05-02",
    review_cadence: "quarterly",
    cited_by: ["blog-post-drafting", "social-post-drafting", "email-drafting", "support-reply-drafting"],
    auto_load: true,
  },
  "transparency.md": {
    title: "Ritsu Transparency Policy",
    type: "core-doc",
    slug: "transparency",
    layer: "identity",
    status: "canonical",
    owner: "founder",
    last_reviewed: "2026-05-02",
    review_cadence: "quarterly",
    cited_by: ["support-reply-drafting", "trust-safety"],
    auto_load: true,
  },
};

function parseArgs(argv) {
  const args = { dryRun: false, apply: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--apply") args.apply = true;
    else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  if (!args.dryRun && !args.apply) {
    console.error("Must pass --dry-run or --apply");
    process.exit(1);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const mode = args.apply ? "APPLY" : "DRY-RUN";
  console.log(`[migrate-existing-frontmatter] mode=${mode}`);
  console.log("");

  let changes = 0;
  for (const [filename, preset] of Object.entries(PRESETS)) {
    const filepath = path.join(CORE_DIR, filename);
    if (!fs.existsSync(filepath)) {
      console.log(`⚠ ${filename}: file does not exist; skipping`);
      continue;
    }

    const content = fs.readFileSync(filepath, "utf-8");
    const { frontmatter, body } = parse(content);

    // Detect: already has full frontmatter (status field present)?
    if (frontmatter.status && frontmatter.title && frontmatter.layer) {
      console.log(`✓ ${filename}: already has frontmatter (status=${frontmatter.status})`);
      continue;
    }

    // Merge: preset wins for required fields; preserves any extra existing fields
    const merged = { ...frontmatter, ...preset };
    // Reorder for canonical key order
    const orderedKeys = [
      "title", "type", "slug", "layer", "status", "owner",
      "last_reviewed", "review_cadence", "cited_by", "auto_load",
      "revisit_at", "revisit_trigger", "revisit_owner",
      "entry_condition", "triggered_by", "why_deferred",
    ];
    const ordered = {};
    for (const k of orderedKeys) {
      if (merged[k] !== undefined) ordered[k] = merged[k];
    }
    // Add any remaining keys not in canonical order
    for (const k of Object.keys(merged)) {
      if (!(k in ordered)) ordered[k] = merged[k];
    }

    const newContent = serialize(ordered, body);

    if (args.dryRun) {
      console.log(`→ ${filename}: would add frontmatter (status: ${preset.status})`);
      console.log(`  preview (first 200 chars):\n  ${newContent.slice(0, 200).split("\n").join("\n  ")}`);
    } else {
      fs.writeFileSync(filepath, newContent, "utf-8");
      console.log(`✓ ${filename}: frontmatter retrofitted (now status=${preset.status})`);
    }
    changes++;
  }

  console.log("");
  console.log(`[migrate-existing-frontmatter] ${mode}: changes=${changes}`);
  if (args.apply && changes > 0) {
    console.log("");
    console.log("Next: run `pnpm check` to verify drift, then `git diff 00-core/`");
  }
}

main();
