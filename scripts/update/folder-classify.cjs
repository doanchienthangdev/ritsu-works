#!/usr/bin/env node
/**
 * scripts/update/folder-classify.cjs — classify-dispatch for /update folder.
 *
 * Sprint 3 of capability `update` v1.1 (per
 * .archives/cla/update/v1.1-brainstorming/03-folder.md).
 *
 * /update folder <path> is a CLASSIFIER + DISPATCHER, not a primary actor.
 * Given a folder path, decides which /update <type> handler to dispatch to,
 * or REFUSES with a forward message.
 *
 * Output (JSON):
 *   {
 *     classification: 'pillar' | 'sub-pillar' | 'wiki-collection' | 'skill' |
 *                     'sop' | 'single-readme' | 'multi-file' | 'refuse',
 *     dispatch_to: '/update <type> <name>' | null,
 *     reason: string,
 *     forward_to: string | null
 *   }
 *
 * Usage:
 *   node scripts/update/folder-classify.cjs --path=<relative-folder-path>
 *
 * Exit codes:
 *   0 — classified (any outcome including refuse)
 *   1 — input error
 *   2 — path safety violation
 */

"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

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
  console.error(`[folder-classify] ✗ ${msg}`);
  process.exit(code);
}

/**
 * Path safety pre-check (same semantics as path-classify.cjs).
 */
function validatePathSafety(relPath) {
  if (typeof relPath !== "string" || relPath.length === 0) {
    return { ok: false, reason: "empty_path" };
  }
  if (relPath.startsWith("/")) {
    return { ok: false, reason: "absolute_path_refused" };
  }
  const parts = relPath.split("/").filter((p) => p.length > 0);
  if (parts.some((p) => p === "..")) {
    return { ok: false, reason: "path_traversal_dotdot" };
  }
  const resolved = path.resolve(REPO_ROOT, relPath);
  if (!resolved.startsWith(REPO_ROOT + path.sep) && resolved !== REPO_ROOT) {
    return { ok: false, reason: "path_escapes_repo_root" };
  }
  return { ok: true, parts, resolved };
}

/**
 * Classify a folder path → dispatch outcome.
 *
 * Per .archives/cla/update/v1.1-brainstorming/03-folder.md §"Classification rules":
 *   1. Refused prefixes (raw/, runtime/, .archives/, node_modules/, .git/)
 *   2. Pillar (depth 1, ^[0-9]{2}-[a-z][a-z-]*$)
 *   3. Sub-pillar (depth 2; NOT under /sops or /skills sub-dirs)
 *   4. Wiki collection (^wiki/[a-z][a-z-]*$)
 *   5. Skill folder (^06-ai-ops/skills/.+$)
 *   6. SOP folder (^.+/sops/SOP-...)
 *   7. Single-README folder (folder contains exactly README.md)
 *   8. Multi-file generic — REFUSE
 */
function classifyFolder(relPath, fsStatFn) {
  const safety = validatePathSafety(relPath);
  if (!safety.ok) {
    return {
      classification: "refuse",
      dispatch_to: null,
      reason: `path_safety_${safety.reason}`,
      forward_to: null,
    };
  }

  // Normalize: trim trailing /
  const p = relPath.replace(/\/+$/, "");
  const parts = p.split("/").filter((s) => s.length > 0);
  const depth = parts.length;

  // Rule 1: Refused prefixes
  for (const prefix of ["raw", "runtime", ".archives", "node_modules", ".git"]) {
    if (parts[0] === prefix) {
      return {
        classification: "refuse",
        dispatch_to: null,
        reason: `refused_prefix_${prefix}`,
        forward_to: prefix === "raw" ? "Hand-edit local (raw/ has no provenance chain)" :
                    prefix === "runtime" ? "Hand-edit local (runtime/ is gitignored)" :
                    prefix === ".archives" ? "Hand-edit local (.archives/ is scratch)" :
                    "(none — managed by tooling)",
      };
    }
  }

  // .claude/hooks/ as a folder
  if (parts.length >= 2 && parts[0] === ".claude" && parts[1] === "hooks") {
    return {
      classification: "refuse",
      dispatch_to: null,
      reason: "hooks_folder_use_update_hook_per_file",
      forward_to: "/update hook <name> --refs=<csv>  (with D-Std magic-phrase ceremony)",
    };
  }

  // Rule 5: Skill folder (under 06-ai-ops/skills/)
  if (depth >= 3 && parts[0] === "06-ai-ops" && parts[1] === "skills") {
    const skillName = parts.slice(2).join("/");
    return {
      classification: "skill",
      dispatch_to: `/update skill ${skillName}`,
      reason: "skill_folder_dispatches_to_update_skill",
      forward_to: null,
    };
  }

  // Rule 6: SOP folder (matches */sops/SOP-...)
  // e.g. 06-ai-ops/sops/SOP-AIOPS-001-capability-lifecycle
  if (depth >= 3 && parts[1] === "sops" && /^SOP-[A-Z]+-[0-9]+-.+$/.test(parts[2])) {
    return {
      classification: "sop",
      dispatch_to: `/update sop ${parts[2]}`,
      reason: "sop_folder_dispatches_to_update_sop",
      forward_to: null,
    };
  }

  // Rule 4: Wiki collection (^wiki/<slug>$)
  if (depth === 2 && parts[0] === "wiki") {
    return {
      classification: "wiki-collection",
      dispatch_to: null,
      reason: "wiki_collection_use_wiki_sync_not_update_folder",
      forward_to: `/wiki sync wiki/${parts[1]}/`,
    };
  }

  // Rule 2: Pillar (depth 1, numeric prefix)
  if (depth === 1 && /^[0-9]{2}-[a-z][a-z-]*$/.test(parts[0])) {
    return {
      classification: "pillar",
      dispatch_to: `/update pillar ${parts[0]}`,
      reason: "pillar_dispatches_to_update_pillar",
      forward_to: null,
    };
  }

  // Rule 3: Sub-pillar (depth 2 under numeric-prefix pillar, not sops/skills)
  if (depth === 2 && /^[0-9]{2}-[a-z][a-z-]*$/.test(parts[0])
      && parts[1] !== "sops" && parts[1] !== "skills") {
    return {
      classification: "sub-pillar",
      dispatch_to: null,
      reason: "sub_pillar_deferred_to_v1_2_use_update_file_for_readme",
      forward_to: `/update file ${p}/README.md  (if README.md is target)`,
    };
  }

  // Rule 7: Single-README folder — check filesystem (if accessible)
  const statFn = fsStatFn || ((pp) => {
    try { return fs.statSync(pp); } catch { return null; }
  });
  const readdir = (pp) => {
    try { return fs.readdirSync(pp); } catch { return null; }
  };

  const fullPath = path.join(REPO_ROOT, p);
  const stat = statFn(fullPath);
  if (stat && stat.isDirectory()) {
    const files = readdir(fullPath);
    if (files) {
      const mdFiles = files.filter((f) => f.endsWith(".md"));
      if (mdFiles.length === 1 && mdFiles[0] === "README.md") {
        return {
          classification: "single-readme",
          dispatch_to: `/update file ${p}/README.md`,
          reason: "single_readme_folder_dispatches_to_file_mode",
          forward_to: null,
        };
      }
    }
  }

  // Rule 8: Multi-file generic
  return {
    classification: "refuse",
    dispatch_to: null,
    reason: "generic_multi_file_folder_not_in_v1_1_scope",
    forward_to: "Use /update file <specific-path> per file (v1.2 may add multi-file iteration)",
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.path) {
    dieErr("missing --path=<folder-path>");
  }
  const result = classifyFolder(args.path);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
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
  validatePathSafety,
  classifyFolder,
};
