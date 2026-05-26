#!/usr/bin/env node
/**
 * scripts/update/path-classify.cjs — path-tier classifier for /update file mode.
 *
 * Sprint 2 of capability `update` v1.1 (per
 * .archives/cla/update/v1.1-brainstorming/05-file-arbitrary.md §"Path-tier
 * classification table").
 *
 * Reads knowledge/update-file-paths.yaml + matches a candidate <path> against
 * the declared globs IN ORDER. First match wins. Returns:
 *   { tier: 'refuse' | 'B' | 'C', reason: string, forward_to?: string }
 *
 * Path safety pre-checks (run BEFORE glob matching):
 *   - Reject absolute paths starting with /
 *   - Reject paths containing .. (path traversal)
 *   - Reject paths that resolve outside the repo root via realpath
 *
 * Glob semantics:
 *   - * matches any chars except /
 *   - ** matches any chars INCLUDING /
 *   - ? matches one char
 *   - Trailing /** matches the directory + anything under it
 *   - All other chars are literal
 *
 * Usage:
 *   node scripts/update/path-classify.cjs --path=<relative-path>
 *
 * Output (JSON to stdout):
 *   { tier, reason, forward_to?, matched_glob, rule_index }
 *
 * Exit codes:
 *   0 — classified (any tier including refuse)
 *   1 — input error
 *   2 — path safety violation (refused before glob match)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PATHS_YAML = path.join(REPO_ROOT, "knowledge", "update-file-paths.yaml");

function parseArgs(argv) {
  const args = { path: null };
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (!m) continue;
    const [, k, v] = m;
    if (k === "path") args.path = v;
  }
  return args;
}

function dieErr(msg, code = 1) {
  console.error(`[path-classify] ✗ ${msg}`);
  process.exit(code);
}

/**
 * Glob → RegExp. Supports * (no /), ** (with /), ?.
 * Escapes other regex special chars.
 */
function globToRegex(glob) {
  // Escape regex specials except *, ?, /
  let r = "";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      // ** = any chars including /
      r += ".*";
      i += 2;
      // Consume optional trailing /
      if (glob[i] === "/") {
        // ** followed by / — already match any depth incl /; the / is consumed by .*
        i++;
      }
    } else if (c === "*") {
      // * = any chars except /
      r += "[^/]*";
      i++;
    } else if (c === "?") {
      r += "[^/]";
      i++;
    } else if (/[\\.+^$()[\]{}|]/.test(c)) {
      r += "\\" + c;
      i++;
    } else {
      r += c;
      i++;
    }
  }
  return new RegExp("^" + r + "$");
}

/**
 * Validate path is safe (no traversal, no absolute, stays in repo).
 * Returns { ok: bool, reason?: string }.
 */
function validatePathSafety(relPath) {
  if (typeof relPath !== "string" || relPath.length === 0) {
    return { ok: false, reason: "empty_path" };
  }
  if (relPath.startsWith("/")) {
    return { ok: false, reason: "absolute_path_refused" };
  }
  // Reject literal .. component
  const parts = relPath.split("/");
  if (parts.some((p) => p === "..")) {
    return { ok: false, reason: "path_traversal_dotdot" };
  }
  // Reject if resolve escapes repo
  const resolved = path.resolve(REPO_ROOT, relPath);
  if (!resolved.startsWith(REPO_ROOT + path.sep) && resolved !== REPO_ROOT) {
    return { ok: false, reason: "path_escapes_repo_root" };
  }
  return { ok: true };
}

/**
 * Load the update-file-paths.yaml table.
 */
function loadTable() {
  if (!fs.existsSync(PATHS_YAML)) {
    throw new Error(`update-file-paths.yaml not found at ${PATHS_YAML}`);
  }
  const text = fs.readFileSync(PATHS_YAML, "utf8");
  const doc = yaml.load(text);
  if (!doc || !Array.isArray(doc.rules)) {
    throw new Error("update-file-paths.yaml malformed: missing rules array");
  }
  return doc;
}

/**
 * Classify a single path.
 * Returns: { tier, reason, forward_to?, matched_glob, rule_index } or refuse_unclassified.
 */
function classifyPath(relPath, table) {
  const safety = validatePathSafety(relPath);
  if (!safety.ok) {
    return {
      tier: "refuse",
      reason: `path_safety_${safety.reason}`,
      matched_glob: null,
      rule_index: -1,
    };
  }

  if (!table || !Array.isArray(table.rules)) {
    throw new Error("invalid table");
  }

  for (let i = 0; i < table.rules.length; i++) {
    const rule = table.rules[i];
    const re = globToRegex(rule.path_glob);
    if (re.test(relPath)) {
      return {
        tier: rule.tier,
        reason: rule.reason,
        forward_to: rule.forward_to || null,
        matched_glob: rule.path_glob,
        rule_index: i,
      };
    }
  }

  // Catch-all
  return {
    tier: "refuse",
    reason: "unmatched_path_explicit_refuse_per_catch_all_rule",
    forward_to: "Add a rule to knowledge/update-file-paths.yaml via PR if /update should handle this path",
    matched_glob: null,
    rule_index: -1,
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.path) {
    dieErr("missing --path=<relative-path>");
  }
  let table;
  try {
    table = loadTable();
  } catch (e) {
    dieErr(`could not load update-file-paths.yaml: ${e.message}`, 1);
  }
  const result = classifyPath(args.path, table);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  // Exit 0 for classified; 2 for safety violation
  if (result.reason && result.reason.startsWith("path_safety_")) {
    process.exit(2);
  }
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  globToRegex,
  validatePathSafety,
  loadTable,
  classifyPath,
};
