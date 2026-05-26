#!/usr/bin/env node
/**
 * scripts/update/three-way-diff.cjs — detect prior-/update conflicts via
 * marker-based 3-way diff.
 *
 * Sprint 2 deliverable of capability `update` v1.0 (per spec §4 + R5
 * acceptance criterion).
 *
 * Why: when /update modifies an entity, the install phase writes a marker
 * comment `<!-- updated-by: /update v1.0 <run-id> -->` (or analogous SQL/
 * YAML marker depending on file extension). On the NEXT /update invocation
 * targeting the same entity, the prior marker must be detected — otherwise
 * we'd blindly overwrite without acknowledging the prior author.
 *
 * 3-way diff inputs:
 *   - BASE: the entity content at the prior known marker commit (git blob)
 *   - YOURS: the current working-tree content (may include hand-edits made
 *     since the prior /update)
 *   - THEIRS: the new proposed content from /update install
 *
 * Conflict detection:
 *   - If YOURS deviates from BASE in places THEIRS also modifies → CONFLICT
 *   - If YOURS deviates in places THEIRS does NOT touch → merge (preserve YOURS)
 *   - If YOURS == BASE → fast-forward apply THEIRS
 *
 * Output (JSON to stdout):
 *   {
 *     status: 'fast_forward' | 'merge_ok' | 'conflict',
 *     prior_marker: { run_id, timestamp } | null,
 *     conflict_regions: [{ line_range, base_snippet, yours_snippet, theirs_snippet }]
 *   }
 *
 * Usage:
 *   node scripts/update/three-way-diff.cjs \
 *     --base=<path-to-base> --yours=<path-to-yours> --theirs=<path-to-theirs>
 *
 * Marker patterns (per file extension):
 *   .md       → `<!-- updated-by: /update v1.0 <run-id> @ <timestamp> -->`
 *   .yaml     → `# updated-by: /update v1.0 <run-id> @ <timestamp>`
 *   .sql      → `-- updated-by: /update v1.0 <run-id> @ <timestamp>`
 *   .js/.cjs/.ts → `// updated-by: /update v1.0 <run-id> @ <timestamp>`
 *
 * Exit codes:
 *   0 — success (any status)
 *   1 — input error
 *   2 — conflict detected (orchestrator inspects status field)
 */

"use strict";

const fs = require("fs");
const path = require("path");

const MARKER_PATTERNS = [
  { regex: /<!--\s*updated-by:\s*\/update\s+v(\d+\.\d+(?:\.\d+)?)\s+([0-9a-f-]{36})(?:\s*@\s*([^\s>]+))?\s*-->/i, label: "html" },
  { regex: /^#\s*updated-by:\s*\/update\s+v(\d+\.\d+(?:\.\d+)?)\s+([0-9a-f-]{36})(?:\s*@\s*(\S+))?/im, label: "yaml" },
  { regex: /^--\s*updated-by:\s*\/update\s+v(\d+\.\d+(?:\.\d+)?)\s+([0-9a-f-]{36})(?:\s*@\s*(\S+))?/im, label: "sql" },
  { regex: /^\/\/\s*updated-by:\s*\/update\s+v(\d+\.\d+(?:\.\d+)?)\s+([0-9a-f-]{36})(?:\s*@\s*(\S+))?/im, label: "js" },
];

function parseArgs(argv) {
  const args = { base: null, yours: null, theirs: null };
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (!m) continue;
    const [, k, v] = m;
    if (k === "base") args.base = v;
    else if (k === "yours") args.yours = v;
    else if (k === "theirs") args.theirs = v;
  }
  return args;
}

function dieErr(msg, code = 1) {
  console.error(`[three-way-diff] ✗ ${msg}`);
  process.exit(code);
}

/**
 * Extract `<!-- updated-by: /update ... -->` marker from text. Returns
 * { version, run_id, timestamp } or null.
 */
function extractMarker(text) {
  for (const { regex } of MARKER_PATTERNS) {
    const m = text.match(regex);
    if (m) {
      return { version: m[1], run_id: m[2], timestamp: m[3] || null };
    }
  }
  return null;
}

/**
 * Compute line-by-line diff between two strings. Returns {
 *   modified_lines: Set<number>,  // line indices (0-based) where content differs
 *   total_lines: int,
 * }
 *
 * Simple Myers-O(ND)-ish approach via LCS. For ritsu-works file sizes
 * (typical < 500 lines), naive O(N*M) is acceptable. We use a token-set
 * difference per-line, which is enough for marker-based merging.
 */
function lineDiff(a, b) {
  const aLines = a.split(/\r?\n/);
  const bLines = b.split(/\r?\n/);
  const modified = new Set();
  const max = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < max; i++) {
    if (aLines[i] !== bLines[i]) modified.add(i);
  }
  return { modified_lines: modified, total_lines: max };
}

/**
 * Detect conflict regions where BOTH yours and theirs deviate from base.
 * A "region" here = a single line. Future v1.1 could group contiguous lines
 * into multi-line regions for prettier output.
 */
function detectConflicts(baseText, yoursText, theirsText) {
  const baseLines = baseText.split(/\r?\n/);
  const yoursLines = yoursText.split(/\r?\n/);
  const theirsLines = theirsText.split(/\r?\n/);

  const yoursDelta = lineDiff(baseText, yoursText).modified_lines;
  const theirsDelta = lineDiff(baseText, theirsText).modified_lines;

  // Intersection = both sides modified the same line → conflict.
  const conflicts = [];
  for (const i of yoursDelta) {
    if (theirsDelta.has(i)) {
      conflicts.push({
        line: i,
        base_snippet: baseLines[i] || "",
        yours_snippet: yoursLines[i] || "",
        theirs_snippet: theirsLines[i] || "",
      });
    }
  }
  return { conflicts, yoursDelta, theirsDelta };
}

/**
 * Top-level 3-way diff.
 */
function threeWayDiff(baseText, yoursText, theirsText) {
  const priorMarker = extractMarker(yoursText) || extractMarker(baseText);

  // Fast path: yours == base → just apply theirs (no conflict possible).
  if (yoursText === baseText) {
    return {
      status: "fast_forward",
      prior_marker: priorMarker,
      conflict_regions: [],
    };
  }

  // Slow path: detect overlapping deltas.
  const { conflicts, yoursDelta, theirsDelta } = detectConflicts(baseText, yoursText, theirsText);

  if (conflicts.length === 0) {
    return {
      status: "merge_ok",
      prior_marker: priorMarker,
      conflict_regions: [],
      yours_modified_lines: Array.from(yoursDelta).sort((a, b) => a - b),
      theirs_modified_lines: Array.from(theirsDelta).sort((a, b) => a - b),
    };
  }

  return {
    status: "conflict",
    prior_marker: priorMarker,
    conflict_regions: conflicts,
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.base || !args.yours || !args.theirs) {
    dieErr("missing --base / --yours / --theirs paths");
  }

  let baseText, yoursText, theirsText;
  try {
    baseText = fs.readFileSync(args.base, "utf8");
  } catch (e) {
    dieErr(`cannot read base: ${e.message}`);
  }
  try {
    yoursText = fs.readFileSync(args.yours, "utf8");
  } catch (e) {
    dieErr(`cannot read yours: ${e.message}`);
  }
  try {
    theirsText = fs.readFileSync(args.theirs, "utf8");
  } catch (e) {
    dieErr(`cannot read theirs: ${e.message}`);
  }

  const result = threeWayDiff(baseText, yoursText, theirsText);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(result.status === "conflict" ? 2 : 0);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  extractMarker,
  lineDiff,
  detectConflicts,
  threeWayDiff,
  MARKER_PATTERNS,
};
