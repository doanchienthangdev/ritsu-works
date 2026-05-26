#!/usr/bin/env node
/**
 * scripts/update/size-estimator.cjs — predict diff_loc + cost from ref bytes.
 *
 * Sprint 2 deliverable of capability `update` v1.0 (per spec §4 finding T2).
 *
 * Why: founder needs an UP-FRONT estimate of (a) how big the diff will be and
 * (b) how much LLM cost the distill phase will burn, BEFORE any model call.
 * The orchestrator prompts the founder if estimated_diff_loc > 100 OR if
 * estimated_cost > per-task-kind cap × 2 (R7 — Big-ref ABORT).
 *
 * Heuristic (calibrated post-Sprint-2 from real /update runs; v1.0 default):
 *   1 KB of ref text ≈ 8 lines of resulting diff (conservative; real ratio
 *   often 4-6 but we over-estimate to avoid surprises)
 *   distill cost per KB:
 *     - skill/agent/sop (Sonnet) → $0.020/KB
 *     - command (Haiku)          → $0.005/KB
 *
 * Usage:
 *   node scripts/update/size-estimator.cjs --refs=<ref1>,<ref2>... [--entity-type=<t>]
 *
 * Output (JSON to stdout):
 *   {
 *     total_ref_bytes,
 *     ref_files: [{path, bytes}],
 *     estimated_diff_loc,
 *     estimated_distill_cost_usd,
 *     entity_type,
 *     llm_model,
 *     warnings: [...]
 *   }
 *
 * Exit codes:
 *   0 — success
 *   1 — input error (refs missing, file not found)
 */

"use strict";

const fs = require("fs");
const path = require("path");

const KB = 1024;

// Calibrated defaults (per spec §4 finding T2)
const DIFF_LOC_PER_KB = 8;             // conservative; over-estimate
const COST_USD_PER_KB_SONNET = 0.020;  // skill/agent/sop default
const COST_USD_PER_KB_HAIKU = 0.005;   // command default

// Per-type model picker. Matches `eval-evo/distill-from-refs/SKILL.md` Phase 2.
const TYPE_MODEL = {
  skill: { model: "claude-sonnet-4-6", costPerKb: COST_USD_PER_KB_SONNET },
  agent: { model: "claude-sonnet-4-6", costPerKb: COST_USD_PER_KB_SONNET },
  sop:   { model: "claude-sonnet-4-6", costPerKb: COST_USD_PER_KB_SONNET },
  command: { model: "claude-haiku-4-5", costPerKb: COST_USD_PER_KB_HAIKU },
};

function parseArgs(argv) {
  const args = { refs: [], entityType: null };
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (!m) continue;
    const [, k, v] = m;
    if (k === "refs") {
      if (!v) continue;
      v.split(",").forEach((r) => {
        const t = r.trim();
        if (t) args.refs.push(t);
      });
    } else if (k === "entity-type") {
      args.entityType = v;
    }
  }
  return args;
}

function dieErr(msg, code = 1) {
  console.error(`[size-estimator] ✗ ${msg}`);
  process.exit(code);
}

function statOrZero(p) {
  try {
    return fs.statSync(p).size;
  } catch {
    return null; // signal: missing
  }
}

function estimate(refs, entityType) {
  const refFiles = [];
  const warnings = [];
  let totalBytes = 0;

  for (const ref of refs) {
    const bytes = statOrZero(ref);
    if (bytes === null) {
      warnings.push(`ref not found: ${ref}`);
      refFiles.push({ path: ref, bytes: 0, missing: true });
      continue;
    }
    refFiles.push({ path: ref, bytes });
    totalBytes += bytes;
  }

  const totalKb = totalBytes / KB;
  const estimatedDiffLoc = Math.round(totalKb * DIFF_LOC_PER_KB);

  // Per-type cost. Default to skill (Sonnet) if entityType not provided.
  const typeInfo = entityType && TYPE_MODEL[entityType]
    ? TYPE_MODEL[entityType]
    : TYPE_MODEL.skill;

  const estimatedDistillCostUsd = Number((totalKb * typeInfo.costPerKb).toFixed(4));

  return {
    total_ref_bytes: totalBytes,
    ref_files: refFiles,
    estimated_diff_loc: estimatedDiffLoc,
    estimated_distill_cost_usd: estimatedDistillCostUsd,
    entity_type: entityType,
    llm_model: typeInfo.model,
    warnings,
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.refs.length === 0) {
    dieErr("missing --refs=<csv> (at least one ref required)");
  }
  const result = estimate(args.refs, args.entityType);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  estimate,
  DIFF_LOC_PER_KB,
  COST_USD_PER_KB_SONNET,
  COST_USD_PER_KB_HAIKU,
  TYPE_MODEL,
};
