#!/usr/bin/env node
/**
 * scripts/core/validate.cjs — `/core check` implementation.
 *
 * Validates all 00-core/*.md docs against canonical frontmatter schema.
 * Per CEO plan §4.8 + §10 acceptance criteria.
 *
 * Validation rules:
 *   1. All expected docs exist (per manifest.yaml or hardcoded list)
 *   2. Frontmatter parses (valid YAML)
 *   3. Required fields present per status enum
 *   4. Enum values valid (layer, status, review_cadence)
 *   5. v0.1-draft has revisit_at + revisit_trigger
 *   6. Stub has entry_condition + triggered_by + why_deferred
 *
 * Usage:
 *   node scripts/core/validate.cjs [--json] [--report]
 *
 * Exit codes: 0 pass, 1 critical errors, 2 warnings only.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { parse, validate, CORE_SCHEMA } = require("./lib/frontmatter.cjs");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CORE_DIR = path.join(REPO_ROOT, "00-core");

const EXPECTED_DOCS = [
  // Canonical (filled)
  "product.md", "brand_voice.md", "transparency.md", "charter.md",
  "founder-profile.md", "north-star.md", "icp-summary.md", "positioning.md", "INDEX.md",
  // v0.1-draft
  "values.md", "principles.md", "ai-native-philosophy.md",
  // Stubs (Sprint 2 creates these)
  "glossary.md", "design-system.md", "wedge.md", "pricing-philosophy.md",
  "operating-cadence.md", "decision-rights-narrative.md",
  // Meta
  "README.md",
];

function parseArgs(argv) {
  const args = { json: false, report: false };
  for (const a of argv.slice(2)) {
    if (a === "--json") args.json = true;
    else if (a === "--report") args.report = true;
    else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const results = {
    timestamp: new Date().toISOString(),
    pass: 0,
    fail: 0,
    warn: 0,
    docs: {},
  };
  const issues = [];

  // Check expected docs exist
  for (const filename of EXPECTED_DOCS) {
    const filepath = path.join(CORE_DIR, filename);
    if (!fs.existsSync(filepath)) {
      // README and stubs may be missing in early Sprints — warn not fail
      const isStubExpected = ["glossary.md", "design-system.md", "wedge.md", "pricing-philosophy.md", "operating-cadence.md", "decision-rights-narrative.md"].includes(filename);
      if (isStubExpected) {
        issues.push({ file: filename, severity: "warn", message: "expected stub file missing" });
        results.warn++;
      } else {
        issues.push({ file: filename, severity: "fail", message: "expected file missing" });
        results.fail++;
      }
      results.docs[filename] = { exists: false };
      continue;
    }

    // Parse + validate
    const content = fs.readFileSync(filepath, "utf-8");
    let parsed;
    try {
      parsed = parse(content);
    } catch (e) {
      issues.push({ file: filename, severity: "fail", message: `parse error: ${e.message}` });
      results.fail++;
      results.docs[filename] = { exists: true, parse_error: e.message };
      continue;
    }

    if (filename === "README.md") {
      // README has no schema requirements
      results.docs[filename] = { exists: true, ok: true };
      results.pass++;
      continue;
    }

    const v = validate(parsed.frontmatter, CORE_SCHEMA);
    if (v.valid) {
      results.pass++;
      results.docs[filename] = {
        exists: true,
        status: parsed.frontmatter.status,
        layer: parsed.frontmatter.layer,
        last_reviewed: parsed.frontmatter.last_reviewed,
        ok: true,
      };
    } else {
      results.fail++;
      results.docs[filename] = {
        exists: true,
        status: parsed.frontmatter.status,
        errors: v.errors,
      };
      for (const err of v.errors) {
        issues.push({ file: filename, severity: "fail", message: `${err.field}: ${err.message}` });
      }
    }
  }

  // Output
  if (args.json) {
    console.log(JSON.stringify({ summary: results, issues }, null, 2));
  } else {
    console.log(`[core-validate] pass=${results.pass} fail=${results.fail} warn=${results.warn}`);
    if (issues.length > 0) {
      console.log("");
      for (const i of issues) {
        const marker = i.severity === "fail" ? "✗" : "⚠";
        console.log(`  ${marker} ${i.file}: ${i.message}`);
      }
    }
  }

  if (args.report) {
    const date = new Date().toISOString().slice(0, 10);
    const reportDir = path.join(REPO_ROOT, ".archives", "core-checks");
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, `${date}.md`);
    const md = `# core-validate report — ${results.timestamp}\n\nPass: ${results.pass}\nFail: ${results.fail}\nWarn: ${results.warn}\n\n## Issues\n\n${issues.map((i) => `- [${i.severity}] **${i.file}**: ${i.message}`).join("\n")}\n`;
    fs.writeFileSync(reportPath, md, "utf-8");
    console.log(`[core-validate] report → ${reportPath}`);
  }

  if (results.fail > 0) process.exit(1);
  if (results.warn > 0) process.exit(2);
  process.exit(0);
}

main();
