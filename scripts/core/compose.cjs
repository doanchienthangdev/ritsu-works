#!/usr/bin/env node
/**
 * scripts/core/compose.cjs — `/core compose <bundle>` implementation.
 *
 * Assemble a context bundle from 00-core/*.md docs into a single markdown
 * suitable for piping into another command's prompt OR writing to a file.
 *
 * Mirrors `scripts/wiki-sync/get.cjs` shape per CTO Phase 2 mandate.
 * Uses shared `scripts/core/lib/frontmatter.cjs`.
 *
 * Usage:
 *   node scripts/core/compose.cjs --bundle=<name> [--to=<path>] [--summary]
 *
 * Bundles (hardcoded v1; externalize to YAML in v1.1):
 *   identity   = product + brand_voice + transparency + charter + founder-profile + values + ai-native-philosophy
 *   strategy   = north-star + icp-summary + positioning
 *   operating  = principles (v1: stubs excluded until graduate)
 *   all        = every canonical + v0.1-draft doc
 *
 * Flags:
 *   --bundle=<name>   REQUIRED. One of identity|strategy|operating|all.
 *   --to=<path>       Write to file; else stdout.
 *   --summary         Compact: stub frontmatter only; v0.1 first paragraph; canonical full body.
 *
 * Exit codes: 0 ok, 1 unknown bundle, 2 partial (warnings), 3 write error.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { parse } = require("./lib/frontmatter.cjs");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CORE_DIR = path.join(REPO_ROOT, "00-core");

const BUNDLES = {
  identity: ["product", "brand_voice", "transparency", "charter", "founder-profile", "values", "ai-native-philosophy"],
  strategy: ["north-star", "icp-summary", "positioning"],
  operating: ["principles"],
  // 'all' computed dynamically from filesystem (filled + v0.1-draft only)
};

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([a-z-]+)(?:=(.+))?$/);
    if (m) args[m[1]] = m[2] === undefined ? true : m[2];
  }
  return args;
}

function dieErr(msg, code = 1) {
  console.error(`[core-compose] ✗ ${msg}`);
  process.exit(code);
}

function resolveBundle(bundleName) {
  if (bundleName === "all") {
    // Dynamic: every .md in 00-core/ with status in (canonical, v0.1-draft)
    return fs
      .readdirSync(CORE_DIR)
      .filter((f) => f.endsWith(".md") && !f.startsWith(".") && f !== "README.md")
      .map((f) => f.replace(/\.md$/, ""))
      .sort();
  }
  if (BUNDLES[bundleName]) return BUNDLES[bundleName];
  return null;
}

function readDoc(slug) {
  const filepath = path.join(CORE_DIR, `${slug}.md`);
  if (!fs.existsSync(filepath)) {
    return { slug, missing: true };
  }
  const content = fs.readFileSync(filepath, "utf-8");
  let parsed;
  try {
    parsed = parse(content);
  } catch (e) {
    return { slug, parse_error: e.message };
  }
  return { slug, ...parsed };
}

function renderDoc(doc, summary) {
  const lines = [];
  if (doc.missing) {
    lines.push(`### ⚠ MISSING: ${doc.slug}`);
    lines.push(`File \`00-core/${doc.slug}.md\` not found.`);
    return lines.join("\n");
  }
  if (doc.parse_error) {
    lines.push(`### ⚠ PARSE ERROR: ${doc.slug}`);
    lines.push(`\`${doc.parse_error}\``);
    return lines.join("\n");
  }

  const fm = doc.frontmatter || {};
  const status = fm.status || "unknown";
  const title = fm.title || doc.slug;

  // Banner per status
  let banner = "";
  if (status === "stub") {
    banner = `> ⚠ **STUB** — entry condition: ${fm.entry_condition || "(unspecified)"}\n> triggered_by: ${fm.triggered_by || "(unspecified)"}\n> why_deferred: ${fm.why_deferred || "(unspecified)"}\n\n`;
  } else if (status === "v0.1-draft") {
    banner = `> ⚠ **v0.1-DRAFT** — revisit_at: ${fm.revisit_at || "?"} (trigger: ${fm.revisit_trigger || "?"})\n\n`;
  } else if (status === "deprecated") {
    return `### DEPRECATED: ${title}\n> Skipping deprecated doc.\n`;
  }

  // Coerce last_reviewed Date → YYYY-MM-DD string (js-yaml auto-parses dates)
  const lastReviewed = fm.last_reviewed instanceof Date
    ? fm.last_reviewed.toISOString().slice(0, 10)
    : fm.last_reviewed || "?";

  lines.push(`### ${title}`);
  lines.push(`_Source: \`00-core/${doc.slug}.md\` | status: ${status} | layer: ${fm.layer || "?"} | owner: ${fm.owner || "?"} | last_reviewed: ${lastReviewed}_`);
  lines.push("");
  lines.push(banner);

  if (summary) {
    if (status === "stub") {
      // Already showed banner; no body for stubs in summary mode
    } else {
      // First paragraph only
      const body = (doc.body || "").trim();
      const para = body.split(/\n\n/)[0] || body.slice(0, 200);
      lines.push(para);
    }
  } else {
    if (status !== "stub") {
      lines.push(doc.body || "");
    }
  }
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv);
  const bundleName = args.bundle;
  if (!bundleName) {
    console.error(`Usage: node scripts/core/compose.cjs --bundle=<name> [--to=<path>] [--summary]`);
    console.error(`  Known bundles: identity | strategy | operating | all`);
    process.exit(1);
  }

  const slugs = resolveBundle(bundleName);
  if (!slugs) {
    dieErr(`Unknown bundle "${bundleName}". Valid: identity, strategy, operating, all.`);
  }

  const docs = slugs.map(readDoc);
  const summary = !!args.summary;

  // Assemble bundle
  const lines = [];
  lines.push(`<!-- core-context-bundle generated by /core compose v1 -->`);
  lines.push(`<!-- bundle: ${bundleName} | generated_at: ${new Date().toISOString()} | docs: ${docs.length} -->`);
  lines.push("");
  lines.push(`# 00-core context bundle: ${bundleName}`);
  lines.push("");

  // Inventory table
  lines.push("## Inventory");
  lines.push("");
  lines.push("| Doc | Status | Layer | Owner |");
  lines.push("|---|---|---|---|");
  let warningCount = 0;
  for (const d of docs) {
    if (d.missing || d.parse_error) {
      warningCount++;
      lines.push(`| ${d.slug} | ⚠ ${d.missing ? "missing" : "parse-error"} | — | — |`);
    } else {
      const fm = d.frontmatter || {};
      lines.push(`| ${d.slug} | ${fm.status || "?"} | ${fm.layer || "?"} | ${fm.owner || "?"} |`);
    }
  }
  lines.push("");

  // Docs body
  for (const d of docs) {
    lines.push(renderDoc(d, summary));
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push("_Generated by /core compose. Do not edit this bundle directly — edit source docs in 00-core/._");

  const output = lines.join("\n") + "\n";

  // Write or print
  if (args.to) {
    const outPath = path.isAbsolute(args.to) ? args.to : path.join(REPO_ROOT, args.to);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, output, "utf-8");
    console.error(`[core-compose] wrote bundle "${bundleName}" → ${outPath} (${docs.length} docs, ${output.length} bytes${warningCount ? `, ${warningCount} warnings` : ""})`);
  } else {
    process.stdout.write(output);
    console.error(`[core-compose] bundle "${bundleName}" → stdout (${docs.length} docs, ${output.length} bytes${warningCount ? `, ${warningCount} warnings` : ""})`);
  }

  if (warningCount > 0) process.exit(2);
}

main();
