#!/usr/bin/env node
/**
 * scripts/update/tier1-allowlist.cjs — hardcoded Tier 1 path allowlist for
 * /update tier1-file <path> (capability `update` v1.1.1).
 *
 * Brainstorm: .archives/cla/update/v1.1.1-brainstorming/00-tier1-file.md
 *
 * The /update file path-classifier REFUSES 00-core/, governance/,
 * knowledge/manifest.yaml, knowledge/cross-tier-invariants.yaml because they're
 * Tier 1 identity. The /update tier1-file mode ALLOWS these specifically
 * UNDER D-Std magic-phrase ceremony (per /update hook pattern), but still
 * REFUSES the most-sensitive subset (SECRETS.md, migrations, .mcp.json).
 *
 * Allowlist (hardcoded; PR to change):
 *   00-core/**                         — identity docs
 *   governance/HITL.md                 — HITL policy (refinements OK)
 *   governance/ROLES.md                — role definitions
 *   governance/IDENTITY.md             — identity doc
 *   governance/BUDGET.md               — budget doc
 *   knowledge/manifest.yaml            — cross-tier contract
 *   knowledge/cross-tier-invariants.yaml — invariant tweaks
 *
 * REFUSED (always — even with D-Std ceremony):
 *   governance/SECRETS.md              — D-MAX always per HITL.md
 *   supabase/migrations/**             — schema discipline (use /cla propose)
 *   .mcp.json                          — security-critical D-MAX
 *   anything else                      — not Tier 1; use /update file instead
 *
 * Usage:
 *   node scripts/update/tier1-allowlist.cjs --path=<relative-path>
 *
 * Output (JSON):
 *   { allowed: bool, reason: string, forward_to?: string }
 *
 * Exit codes:
 *   0 — classified (allowed OR refused)
 *   1 — input error
 *   2 — path safety violation
 */

"use strict";

const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

// Hardcoded allowlist. Order matters: most-specific patterns first.
// Each entry: { match: pattern, kind: 'glob' | 'exact', tier1_role: <doc-class>, reason?: <override> }
const ALLOWLIST = [
  // 00-core/ identity docs (any file under 00-core)
  { match: "00-core/**", kind: "glob", tier1_role: "core_identity_doc" },

  // Specific governance files (exclude SECRETS.md by enumeration — not glob)
  { match: "governance/HITL.md", kind: "exact", tier1_role: "governance_hitl" },
  { match: "governance/ROLES.md", kind: "exact", tier1_role: "governance_roles" },
  { match: "governance/IDENTITY.md", kind: "exact", tier1_role: "governance_identity" },
  { match: "governance/BUDGET.md", kind: "exact", tier1_role: "governance_budget" },

  // knowledge yaml (additive content fixes; structural changes go /cla extend per migration 00041+ invariants)
  { match: "knowledge/manifest.yaml", kind: "exact", tier1_role: "manifest_content" },
  { match: "knowledge/cross-tier-invariants.yaml", kind: "exact", tier1_role: "invariants_content" },
];

// REFUSED-with-explicit-forward — caught BEFORE allowlist match.
// These are inside Tier 1 territory but require stricter ceremony than tier1-file's D-Std.
const REFUSED_TIER1_PATHS = [
  {
    match: "governance/SECRETS.md",
    kind: "exact",
    reason: "secrets_d_max_required",
    forward_to: "governance/SECRETS.md is D-MAX per HITL.md. Hand-edit + PR + D-MAX ceremony.",
  },
  {
    match: "supabase/migrations/**",
    kind: "glob",
    reason: "migrations_schema_discipline",
    forward_to: "Schema changes: /cla propose <problem> for a dedicated capability OR PR direct.",
  },
  {
    match: ".mcp.json",
    kind: "exact",
    reason: "mcp_config_d_max_required",
    forward_to: ".mcp.json is security-critical D-MAX. Hand-edit + PR + D-MAX ceremony.",
  },
];

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
  console.error(`[tier1-allowlist] ✗ ${msg}`);
  process.exit(code);
}

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
  return { ok: true };
}

/**
 * Glob → regex. Same semantics as path-classify.cjs (* = no /; ** = with /).
 */
function globToRegex(glob) {
  let r = "";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      r += ".*";
      i += 2;
      if (glob[i] === "/") i++;
    } else if (c === "*") {
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

function matchesEntry(relPath, entry) {
  if (entry.kind === "exact") return relPath === entry.match;
  if (entry.kind === "glob") return globToRegex(entry.match).test(relPath);
  return false;
}

/**
 * Classify whether the path is allowed under /update tier1-file D-Std ceremony.
 * Returns { allowed: bool, reason: string, forward_to?: string, matched_pattern?: string }.
 */
function classifyTier1Path(relPath) {
  const safety = validatePathSafety(relPath);
  if (!safety.ok) {
    return {
      allowed: false,
      reason: `path_safety_${safety.reason}`,
    };
  }

  // 1) Check REFUSED Tier 1 patterns first (more-restrictive ceremony required).
  for (const r of REFUSED_TIER1_PATHS) {
    if (matchesEntry(relPath, r)) {
      return {
        allowed: false,
        reason: r.reason,
        forward_to: r.forward_to,
        matched_pattern: r.match,
      };
    }
  }

  // 2) Check ALLOWLIST.
  for (const a of ALLOWLIST) {
    if (matchesEntry(relPath, a)) {
      return {
        allowed: true,
        reason: `tier1_d_std_allowed_${a.tier1_role}`,
        matched_pattern: a.match,
      };
    }
  }

  // 3) Not in allowlist → not a Tier 1 file → wrong command.
  return {
    allowed: false,
    reason: "not_tier1_path_use_update_file_or_typed_entity_command",
    forward_to: `Path '${relPath}' is not Tier 1. Use /update file ${relPath} (path-tier classified by knowledge/update-file-paths.yaml) or /update <typed-entity> if path matches a known entity.`,
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.path) {
    dieErr("missing --path=<relative-path>");
  }
  const result = classifyTier1Path(args.path);
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
  globToRegex,
  validatePathSafety,
  classifyTier1Path,
  matchesEntry,
  ALLOWLIST,
  REFUSED_TIER1_PATHS,
};
