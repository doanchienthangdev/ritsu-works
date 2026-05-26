#!/usr/bin/env node
/**
 * scripts/update/ref-source-allowlist.cjs — gate untrusted refs for the
 * `agent` entity type (T9 acceptance — prompt-injection self-elevation guard).
 *
 * Sprint 3 deliverable of capability `update` v1.0 (per spec §9 + T9 finding).
 *
 * Why: agent type entities (.claude/agents/<name>.md) can grant or revoke
 * tool access at the runtime layer. A malicious ref (e.g., from an
 * uncatalogued URL) feeding into a /update --agent run could attempt
 * prompt-injection self-elevation — instructing the LLM to add powerful
 * mcp servers or remove tier-C constraints. This script enforces a strict
 * ref-source allowlist for agent updates; non-agent types use the looser
 * default behavior.
 *
 * Allowlist (v1.0 — agent type):
 *   - File paths under `00-core/`, `governance/`, `06-ai-ops/`, `wiki/`
 *   - Wiki refs (kind: 'wiki-src' or 'wiki-query', already founder-curated)
 *   - Founder override via `--allow-untrusted-refs` flag (audited Tier C event)
 *
 * REFUSED (agent type, no override):
 *   - Refs under `raw/` (uncatalogued external material)
 *   - Refs under `.archives/` (scratch — could contain unaudited content)
 *   - Refs under `runtime/` (local-only ephemeral)
 *   - http:// or https:// URLs (network-derived — no provenance chain)
 *
 * Non-agent types: this script returns `{ allowed: true }` unconditionally
 * (looser policy; refs are bounded by the entity's own playbook
 * allowed_paths_for_proposer).
 *
 * Usage:
 *   node scripts/update/ref-source-allowlist.cjs \
 *     --entity-type=<skill|command|agent|sop> \
 *     --refs=<ref1>,<ref2>... \
 *     [--allow-untrusted-refs]
 *
 * Output (JSON to stdout):
 *   {
 *     allowed: bool,
 *     entity_type: <type>,
 *     refused_refs: [{ ref, reason }],
 *     overridden: bool,
 *     audit_event_payload: { ... }  // populated when override used (orchestrator INSERTs to ops.audit_log)
 *   }
 *
 * Exit codes:
 *   0 — allowed (with or without override)
 *   1 — input error
 *   2 — refused (no override flag); orchestrator surfaces refused_refs to founder
 */

"use strict";

const path = require("path");

const TRUSTED_PREFIXES = ["00-core/", "governance/", "06-ai-ops/", "wiki/"];
const REFUSED_PREFIXES = ["raw/", ".archives/", "runtime/"];

function parseArgs(argv) {
  const args = { entityType: null, refs: [], allowUntrusted: false };
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (!m) continue;
    const [, k, v] = m;
    if (k === "entity-type") args.entityType = v;
    else if (k === "refs") {
      if (!v) continue;
      v.split(",").forEach((r) => {
        const t = r.trim();
        if (t) args.refs.push(t);
      });
    } else if (k === "allow-untrusted-refs") args.allowUntrusted = true;
  }
  return args;
}

function dieErr(msg, code = 1) {
  console.error(`[ref-source-allowlist] ✗ ${msg}`);
  process.exit(code);
}

function isWikiRef(ref) {
  return ref.startsWith("wiki:");
}

function isHttpUrl(ref) {
  return /^https?:\/\//i.test(ref);
}

function startsWithAny(ref, prefixes) {
  return prefixes.some((p) => ref.startsWith(p));
}

/**
 * Classify a single ref against the allowlist policy for the given entity type.
 * Returns { allowed: bool, reason: string|null }.
 */
function classifyRef(ref, entityType) {
  // Non-agent: looser policy (allowed)
  if (entityType !== "agent") {
    return { allowed: true, reason: null };
  }

  // wiki:* refs are founder-curated (came through /wiki sync gate)
  if (isWikiRef(ref)) {
    return { allowed: true, reason: null };
  }

  // http(s)://: no provenance chain → refused
  if (isHttpUrl(ref)) {
    return { allowed: false, reason: "http_url_no_provenance" };
  }

  // Refused prefixes
  if (startsWithAny(ref, REFUSED_PREFIXES)) {
    return { allowed: false, reason: "refused_prefix" };
  }

  // Trusted prefixes
  if (startsWithAny(ref, TRUSTED_PREFIXES)) {
    return { allowed: true, reason: null };
  }

  // Default deny for agent type — fail closed.
  return { allowed: false, reason: "outside_trusted_prefixes" };
}

function checkAllowlist(refs, entityType, allowUntrusted) {
  const refused = [];
  for (const ref of refs) {
    const { allowed, reason } = classifyRef(ref, entityType);
    if (!allowed) refused.push({ ref, reason });
  }

  if (refused.length === 0) {
    return { allowed: true, entity_type: entityType, refused_refs: [], overridden: false };
  }

  if (allowUntrusted) {
    return {
      allowed: true,
      entity_type: entityType,
      refused_refs: refused,
      overridden: true,
      audit_event_payload: {
        action: "ref_source_allowlist_overridden",
        target_kind: "entity_update_run",
        entity_type: entityType,
        refused_refs: refused,
        override_method: "--allow-untrusted-refs flag",
        tier: "C",
        // Orchestrator must INSERT this into ops.audit_log + ops.events
        // (with capability_run_id / agent_run_id from the parent /update run).
      },
    };
  }

  return {
    allowed: false,
    entity_type: entityType,
    refused_refs: refused,
    overridden: false,
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.entityType) {
    dieErr("missing --entity-type=<skill|command|agent|sop>");
  }
  if (args.refs.length === 0) {
    process.stdout.write(JSON.stringify({
      allowed: true,
      entity_type: args.entityType,
      refused_refs: [],
      overridden: false,
    }, null, 2) + "\n");
    process.exit(0);
  }

  const result = checkAllowlist(args.refs, args.entityType, args.allowUntrusted);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(result.allowed ? 0 : 2);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  classifyRef,
  checkAllowlist,
  isWikiRef,
  isHttpUrl,
  startsWithAny,
  TRUSTED_PREFIXES,
  REFUSED_PREFIXES,
};
