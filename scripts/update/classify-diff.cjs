#!/usr/bin/env node
/**
 * scripts/update/classify-diff.cjs — classify a proposed diff into one of
 * 'trivial' | 'medium' | 'structural'.
 *
 * Sprint 2 deliverable of capability `update` v1.0 (per spec §4 finding 1D
 * + R4 acceptance criterion).
 *
 * Categories (spec §4 §"Severity classification"):
 *   trivial    — typos, doc-comment-only, single-line code edits.
 *                /update applies in-place (Tier B-light, no PR).
 *   medium     — multi-line, single-section, may touch tests.
 *                /update opens draft PR (Tier C-full, founder reviews on GitHub).
 *   structural — schema change, hook addition/removal, SOP step removal or
 *                reorder, HITL tier change, drift-check toggle.
 *                /update REFUSES with "Run /cla extend instead" forward message.
 *
 * SOP YAML structural matrix (R4 acceptance):
 *   - steps[] item removal           → structural
 *   - steps[] reorder                → structural
 *   - HITL tier tightening (B → C, C → D-Std, …) → structural
 *   - drift_check toggle (true ↔ false)          → structural
 *   - input/output schema changes                → structural
 *   - prose/comment edits only                   → trivial
 *
 * Usage:
 *   node scripts/update/classify-diff.cjs --diff=<path-to-unified-diff>
 *     [--entity-type=<skill|command|agent|sop>] [--entity-path=<entity-file>]
 *
 * Output (JSON to stdout):
 *   {
 *     classification: 'trivial' | 'medium' | 'structural',
 *     reasons: ['...', ...],
 *     touched_files: [...],
 *     touched_loc: <int>,
 *     structural_rules_hit: ['...']  // populated for SOP/yaml diffs
 *   }
 *
 * Exit codes:
 *   0 — success
 *   1 — input error / parse failure
 */

"use strict";

const fs = require("fs");
const path = require("path");

let yaml;
try {
  yaml = require("js-yaml");
} catch {
  yaml = null;
}

// Tiers for HITL ordering (looser → stricter)
const HITL_ORDER = ["A", "B", "C", "D-Std", "D-MAX"];

function parseArgs(argv) {
  const args = { diff: null, entityType: null, entityPath: null };
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (!m) continue;
    const [, k, v] = m;
    if (k === "diff") args.diff = v;
    else if (k === "entity-type") args.entityType = v;
    else if (k === "entity-path") args.entityPath = v;
  }
  return args;
}

function dieErr(msg, code = 1) {
  console.error(`[classify-diff] ✗ ${msg}`);
  process.exit(code);
}

/**
 * Parse a unified diff into per-file hunks. Lightweight; no external dep.
 * Returns: [{ path, additions: [str], deletions: [str], context_lines: [str] }]
 */
function parseUnifiedDiff(text) {
  const files = [];
  let cur = null;
  const lines = text.split(/\r?\n/);
  for (const ln of lines) {
    if (ln.startsWith("+++ b/")) {
      if (cur) files.push(cur);
      cur = { path: ln.slice(6).trim(), additions: [], deletions: [], context_lines: [] };
    } else if (ln.startsWith("+++ ")) {
      if (cur) files.push(cur);
      cur = { path: ln.slice(4).trim(), additions: [], deletions: [], context_lines: [] };
    } else if (cur) {
      if (ln.startsWith("+++") || ln.startsWith("---") || ln.startsWith("@@") || ln.startsWith("diff ") || ln.startsWith("index ")) {
        // headers — ignore
      } else if (ln.startsWith("+") && !ln.startsWith("+++")) {
        cur.additions.push(ln.slice(1));
      } else if (ln.startsWith("-") && !ln.startsWith("---")) {
        cur.deletions.push(ln.slice(1));
      } else if (ln.startsWith(" ")) {
        cur.context_lines.push(ln.slice(1));
      }
    }
  }
  if (cur) files.push(cur);
  return files;
}

function hitlOrderIndex(tier) {
  if (!tier) return -1;
  const idx = HITL_ORDER.indexOf(tier);
  return idx === -1 ? -1 : idx;
}

function isHitlTightening(beforeYaml, afterYaml) {
  // Look for any field named hitl, hitl_tier, hitl_max_tier, max_hitl
  const fieldNames = ["hitl", "hitl_tier", "hitl_max_tier", "max_hitl"];
  for (const f of fieldNames) {
    const before = (beforeYaml && beforeYaml[f]) || null;
    const after = (afterYaml && afterYaml[f]) || null;
    if (before && after && before !== after) {
      if (hitlOrderIndex(after) > hitlOrderIndex(before)) {
        return { tightened: true, field: f, before, after };
      }
    }
  }
  return { tightened: false };
}

/**
 * SOP-specific structural rules (R4 acceptance).
 * Operates on FULL before/after flow.yaml content (not just diff lines)
 * because we need shape-level comparison (steps[] removal vs reorder).
 *
 * If beforeContent/afterContent unavailable, falls back to diff-line
 * heuristics (less precise but still catches obvious cases).
 */
function classifySopChange(beforeContent, afterContent, fileDiff) {
  const rulesHit = [];

  if (!yaml || !beforeContent || !afterContent) {
    // Fallback heuristics on the diff alone.
    const additions = fileDiff.additions.join("\n");
    const deletions = fileDiff.deletions.join("\n");
    // Step removal heuristic: deletion contains lines starting with "- step:"
    if (/^\s*-\s+step:/m.test(deletions) && !/^\s*-\s+step:/m.test(additions)) {
      rulesHit.push("sop_step_removed (diff-heuristic)");
    }
    // HITL tightening: changing 'hitl: B' to 'hitl: C' etc.
    const hitlBefore = deletions.match(/hitl(_tier)?\s*:\s*([A-D][A-Z-]*)/i);
    const hitlAfter = additions.match(/hitl(_tier)?\s*:\s*([A-D][A-Z-]*)/i);
    if (hitlBefore && hitlAfter) {
      const b = hitlBefore[2];
      const a = hitlAfter[2];
      if (hitlOrderIndex(a) > hitlOrderIndex(b)) {
        rulesHit.push(`hitl_tightening_${b}_to_${a} (diff-heuristic)`);
      }
    }
    // drift_check toggle: drift_check: true → false (or vice versa)
    if (/drift_check\s*:\s*(true|false)/.test(deletions) && /drift_check\s*:\s*(true|false)/.test(additions)) {
      rulesHit.push("drift_check_toggle (diff-heuristic)");
    }
    return rulesHit;
  }

  // Shape-level comparison (full yaml available).
  let before, after;
  try {
    before = yaml.load(beforeContent);
    after = yaml.load(afterContent);
  } catch (e) {
    return [`yaml_parse_error: ${e.message}`];
  }

  // Step removal / reorder.
  const beforeSteps = Array.isArray(before && before.steps) ? before.steps : null;
  const afterSteps = Array.isArray(after && after.steps) ? after.steps : null;
  if (beforeSteps && afterSteps) {
    const beforeIds = beforeSteps.map((s) => (s && (s.step || s.id || s.name)) || JSON.stringify(s));
    const afterIds = afterSteps.map((s) => (s && (s.step || s.id || s.name)) || JSON.stringify(s));
    const removed = beforeIds.filter((id) => !afterIds.includes(id));
    if (removed.length > 0) {
      rulesHit.push(`sop_step_removed: ${removed.join(", ")}`);
    }
    // Reorder check: same set but different order.
    if (removed.length === 0 && beforeIds.length === afterIds.length) {
      const sameOrder = beforeIds.every((id, i) => afterIds[i] === id);
      if (!sameOrder) rulesHit.push("sop_step_reordered");
    }
  }

  // HITL tightening.
  const hitl = isHitlTightening(before, after);
  if (hitl.tightened) {
    rulesHit.push(`hitl_tightening_${hitl.field}_${hitl.before}_to_${hitl.after}`);
  }
  // Per-step HITL tightening.
  if (beforeSteps && afterSteps && beforeSteps.length === afterSteps.length) {
    for (let i = 0; i < beforeSteps.length; i++) {
      const stepHitl = isHitlTightening(beforeSteps[i], afterSteps[i]);
      if (stepHitl.tightened) {
        rulesHit.push(`step_${i}_hitl_tightening_${stepHitl.before}_to_${stepHitl.after}`);
      }
    }
  }

  // drift_check toggle.
  const driftBefore = before && before.drift_check;
  const driftAfter = after && after.drift_check;
  if (typeof driftBefore === "boolean" && typeof driftAfter === "boolean" && driftBefore !== driftAfter) {
    rulesHit.push(`drift_check_toggle_${driftBefore}_to_${driftAfter}`);
  }

  return rulesHit;
}

/**
 * Classify a parsed diff. Top-level dispatcher.
 *
 * @param {object[]} files - output of parseUnifiedDiff
 * @param {string|null} entityType
 * @param {{ beforeContent?: string, afterContent?: string }} extra
 */
function classifyDiff(files, entityType, extra = {}) {
  const reasons = [];
  const touchedFiles = files.map((f) => f.path);
  const touchedLoc = files.reduce((acc, f) => acc + f.additions.length + f.deletions.length, 0);
  const structuralRulesHit = [];

  // Rule 1: any new file or deleted file → structural
  // (cannot detect FROM diff alone reliably; signal via touched files count + file-side knowledge)
  // We do detect file rename/add/delete via diff headers if present (not in our minimal parser),
  // so leave this to the orchestrator for now.

  // Rule 2: SOP-specific structural matrix (R4)
  if (entityType === "sop") {
    // The SOP folder may have multiple files; concentrate on flow.yaml.
    const flowYamlDiff = files.find((f) => f.path.endsWith("flow.yaml"));
    if (flowYamlDiff) {
      const sopRules = classifySopChange(extra.beforeContent || null, extra.afterContent || null, flowYamlDiff);
      structuralRulesHit.push(...sopRules);
      if (sopRules.length > 0) {
        reasons.push(`sop structural: ${sopRules.join("; ")}`);
      }
    }
  }

  // Rule 3: schema-bearing files always structural
  // (knowledge/*.yaml when 'version' or top-level structure changes, migration .sql additions/removals)
  for (const f of files) {
    if (f.path.startsWith("supabase/migrations/")) {
      reasons.push(`migration_file_modified: ${f.path}`);
      structuralRulesHit.push("migration_added_or_modified");
    }
    if (/^knowledge\/.+\.yaml$/.test(f.path)) {
      // Heuristic: changes to knowledge/manifest.yaml or cross-tier-invariants.yaml are structural.
      if (/^knowledge\/(manifest|cross-tier-invariants|schedules)\.yaml$/.test(f.path)) {
        reasons.push(`structural_tier1_yaml: ${f.path}`);
        structuralRulesHit.push("structural_tier1_yaml");
      }
    }
  }

  // Rule 4: HITL / governance changes always structural
  for (const f of files) {
    if (f.path === "governance/HITL.md" || f.path === "governance/ROLES.md") {
      reasons.push(`governance_file_modified: ${f.path}`);
      structuralRulesHit.push("governance_modified");
    }
  }

  // Final classification
  let classification;
  if (structuralRulesHit.length > 0) {
    classification = "structural";
  } else if (touchedLoc <= 5 && touchedFiles.length === 1) {
    classification = "trivial";
    reasons.push(`trivial: ${touchedLoc} lines in ${touchedFiles.length} file`);
  } else {
    classification = "medium";
    reasons.push(`medium: ${touchedLoc} lines across ${touchedFiles.length} file(s)`);
  }

  return {
    classification,
    reasons,
    touched_files: touchedFiles,
    touched_loc: touchedLoc,
    structural_rules_hit: structuralRulesHit,
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.diff) {
    dieErr("missing --diff=<path-to-unified-diff>");
  }
  let diffText;
  try {
    diffText = fs.readFileSync(args.diff, "utf8");
  } catch (e) {
    dieErr(`cannot read diff file: ${e.message}`);
  }
  const files = parseUnifiedDiff(diffText);
  const result = classifyDiff(files, args.entityType);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  parseUnifiedDiff,
  classifyDiff,
  classifySopChange,
  isHitlTightening,
  hitlOrderIndex,
  HITL_ORDER,
};
