#!/usr/bin/env node
/**
 * scripts/update/refs-resolver.cjs — /update wrapper for cla/resolve-refs +
 * MCP wiki_ask dispatch hook.
 *
 * Sprint 2 deliverable of capability `update` v1.0 (per spec §4 finding T1).
 *
 * Why: /update reuses scripts/cla/resolve-refs.cjs for file-path and
 * `wiki:src=` ref resolution. For `wiki:query=` refs, cla/resolve-refs
 * intentionally bails with `kind: 'wiki-query-pending'` because the script
 * cannot invoke MCP tools (no Claude session). This wrapper records the
 * pending list AS-IS — the /update orchestrator (running in Claude session)
 * is responsible for actually invoking mcp__supabase-ops__wiki_ask, resolving
 * the entity list, and then calling scripts/wiki-sync/get.cjs to fulfil the
 * pending refs into runtime/cla/refs/<slug>/.
 *
 * In other words: this script is a thin pass-through over cla/resolve-refs
 * for the file/wiki-src cases AND a structured contract for the orchestrator
 * to fulfil wiki-query refs.
 *
 * Usage (CLI mode):
 *   node scripts/update/refs-resolver.cjs --run-id=<uuid> --refs=<csv> [--dry-run]
 *
 * Output (JSON to stdout) — adds the /update-specific fields:
 *   {
 *     run_id,
 *     slug,                    // == run_id (used as refs dir suffix for /update)
 *     resolved: [
 *       { kind: 'file', original, resolved_path },
 *       { kind: 'wiki-src', original, resolved_path },
 *       { kind: 'wiki-query-pending', original, intended_path, note }
 *     ],
 *     runtime_refs_dir,
 *     pending_wiki_queries: int,    // count of refs needing orchestrator MCP dispatch
 *     warnings
 *   }
 *
 * Exit codes:
 *   0 — success (including pending wiki-query refs)
 *   1 — input error
 *   2 — write error
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CLA_RESOLVE_REFS = path.join(REPO_ROOT, "scripts", "cla", "resolve-refs.cjs");

function parseArgs(argv) {
  const args = { runId: null, refs: [], dryRun: false };
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
    } else if (k === "run-id") {
      args.runId = v;
    } else if (k === "dry-run") {
      args.dryRun = true;
    }
  }
  return args;
}

function dieErr(msg, code = 1) {
  console.error(`[refs-resolver] ✗ ${msg}`);
  process.exit(code);
}

/**
 * Invoke scripts/cla/resolve-refs.cjs with the same --slug/--refs arguments.
 * /update uses run_id as the slug (refs dir = runtime/cla/refs/<run_id>/).
 */
function delegateToClaResolveRefs(runId, refs, dryRun) {
  const claArgs = ["--slug=" + runId];
  // Preserve multi-flag --refs behavior: pass each ref as its own --refs flag.
  // (Alternative: comma-join into one --refs — equivalent semantics per R8.)
  for (const r of refs) {
    claArgs.push("--refs=" + r);
  }
  if (dryRun) claArgs.push("--dry-run");

  const result = spawnSync("node", [CLA_RESOLVE_REFS, ...claArgs], {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });

  if (result.status !== 0) {
    dieErr(`cla/resolve-refs failed (exit ${result.status}): ${result.stderr || result.stdout}`, 2);
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (e) {
    dieErr(`could not parse cla/resolve-refs output: ${e.message}\nstdout: ${result.stdout}`, 2);
  }

  return parsed;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.runId) {
    dieErr("missing --run-id=<uuid>");
  }
  if (args.refs.length === 0) {
    // No refs at all is allowed for /update (memory-only mode); just emit empty result.
    process.stdout.write(JSON.stringify({
      run_id: args.runId,
      slug: args.runId,
      resolved: [],
      runtime_refs_dir: null,
      pending_wiki_queries: 0,
      warnings: ["no --refs provided"],
    }, null, 2) + "\n");
    process.exit(0);
  }

  const claOutput = delegateToClaResolveRefs(args.runId, args.refs, args.dryRun);

  // Augment the cla output with /update-specific counters.
  const pendingWikiQueries = (claOutput.resolved || []).filter((r) => r.kind === "wiki-query-pending").length;

  const updateOutput = {
    run_id: args.runId,
    slug: args.runId,
    resolved: claOutput.resolved || [],
    runtime_refs_dir: claOutput.runtime_refs_dir || null,
    pending_wiki_queries: pendingWikiQueries,
    warnings: claOutput.warnings || [],
  };

  if (pendingWikiQueries > 0) {
    updateOutput.warnings.push(
      `${pendingWikiQueries} wiki:query= ref(s) need orchestrator dispatch: ` +
      `Claude session MUST invoke mcp__supabase-ops__wiki_ask + scripts/wiki-sync/get.cjs ` +
      `to fulfil pending entries before distill phase.`
    );
  }

  process.stdout.write(JSON.stringify(updateOutput, null, 2) + "\n");
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  delegateToClaResolveRefs,
};
