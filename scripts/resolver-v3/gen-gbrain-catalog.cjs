#!/usr/bin/env node
'use strict';
/**
 * scripts/resolver-v3/gen-gbrain-catalog.cjs
 *
 * Generates the `gbrain` section of knowledge/mcp-tools.yaml DETERMINISTICALLY
 * from the LIVE gbrain MCP tool surface (names + descriptions straight from the
 * `gbrain serve` binary) × an explicit, reviewable tier-classification policy.
 *
 * Why a generator instead of 74 hand-typed YAML blocks:
 *   - Names + descriptions come from the binary → zero transcription error,
 *     and `mcp-runtime-reconcile.cjs` verifies they still match after edits.
 *   - The tier/role policy is ONE small, auditable table (below) instead of
 *     being smeared across 74 entries — the governance decision is legible.
 *   - Regenerable when gbrain upgrades (new tools auto-classified; destructive
 *     ones must be added to OVERRIDES or they default conservative).
 *
 * Source of truth precedence (highest first):
 *   1. OVERRIDES[name]            — explicit per-tool tier (destructive elevations)
 *   2. READ_PREFIX rule           — read-only introspection ⇒ Tier A
 *   3. default                    — everything else is a write ⇒ Tier B
 *
 * Role templates mirror governance/ROLES.md brain_affinity matrix + the
 * existing hand-authored gbrain entries (READ=23 roles, WRITE=9 roles,
 * ADMIN=3 roles). etl-runner is intentionally excluded (brain_affinity: none).
 *
 * Usage:
 *   node scripts/resolver-v3/gen-gbrain-catalog.cjs                       # introspect live, print YAML
 *   node scripts/resolver-v3/gen-gbrain-catalog.cjs --from=<dump.json>    # use a saved --dump snapshot
 *
 * Output: the YAML for the gbrain `tools:` entries on stdout. Splice it into
 * knowledge/mcp-tools.yaml between the gbrain section markers.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// POLICY (the reviewable governance artifact)
// ---------------------------------------------------------------------------

// Read-only / introspection tools ⇒ Tier A (side_effect: none). A tool whose
// name starts with any of these (or matches exactly) is a read. Everything not
// matched is treated as a WRITE (Tier B) unless OVERRIDES says otherwise.
const READ_PATTERNS = [
  /^get_/, /^list_/, /^find_/, /^search$/, /^search_by_image$/, /^query$/,
  /^recall$/, /^resolve_slugs$/, /^traverse_graph$/, /^whoami$/, /^run_doctor$/,
  /^file_url$/, /^file_list$/, /^think$/,
  /^code_callees$/, /^code_callers$/, /^code_def$/, /^code_refs$/, /^code_blast$/, /^code_flow$/,
  /^takes_search$/, /^takes_list$/, /^takes_scorecard$/, /^takes_calibration$/,
  /^sources_list$/, /^sources_status$/,
];

// Explicit tier overrides — ONLY destructive elevations beyond the read/write
// default. Both are HARD deletes (irreversible), so they require approve-before
// (Tier C). The orthogonal HITL rule still applies: any operation touching >100
// pages auto-escalates to D-Std (governance/HITL.md Appendix A "Orthogonal rules").
// FOUNDER REVIEW: confirm C vs D-Std for these two in HITL.md Appendix A.
const OVERRIDES = {
  sources_remove: 'C',        // Hard-remove a source, cascades pages/chunks/embeddings.
  purge_deleted_pages: 'C',   // admin-only hard-delete of aged soft-deleted pages.
};

// Tools that stay at their rule-derived tier but are JUDGMENT CALLS worth a
// founder glance (documented in the PR; no behavior change here):
//   delete_page (B — soft delete, recoverable via restore_page)
//   forget_fact (B — reversible strike-through)
//   submit_agent (B — enqueues an autonomous LLM job; cost gated by $100/mo cap)
//   code_traversal_cache_clear (B — cache invalidation, harmless)

const READ_ROLES = [
  'founder', 'cofounder', 'gps', 'growth-orchestrator', 'support-agent',
  'content-drafter', 'code-reviewer', 'trust-safety', 'backoffice-clerk',
  'gtm-orchestrator', 'product-orchestrator', 'customer-lead', 'cs-coach',
  'retention-watcher', 'escalation-router', 'feedback-aggregator', 'founder-coach',
  'hitl-router', 'health-tracker', 'metrics-curator', 'alert-router',
  'experiment-analyst', 'gbrain-maintainer',
];
const WRITE_ROLES = [
  'founder', 'cofounder', 'gbrain-maintainer', 'customer-lead',
  'feedback-aggregator', 'gtm-orchestrator', 'cs-coach', 'product-orchestrator',
  'eval-evo-orchestrator',
];
const ADMIN_ROLES = ['founder', 'cofounder', 'gbrain-maintainer'];

function classify(name) {
  if (OVERRIDES[name]) {
    const tier = OVERRIDES[name];
    return { tier, side: 'write', roles: ADMIN_ROLES };
  }
  if (READ_PATTERNS.some((re) => re.test(name))) {
    return { tier: 'A', side: 'none', roles: READ_ROLES };
  }
  return { tier: 'B', side: 'write', roles: WRITE_ROLES };
}

// ---------------------------------------------------------------------------
// Description shaping — keep the binary's wording, trim to 2 sentences / 240 chars
// ---------------------------------------------------------------------------

function shapeDescription(raw) {
  let s = (raw || '').replace(/\s+/g, ' ').trim();
  if (!s) return '(no description from binary)';
  // Strip a leading version marker — "v0.26.5 — ", "v0.31: ", or bare "v0.36 " —
  // so the summary leads with the tool's actual purpose. Without this the
  // sentence-splitter treats the dotted version as the first sentence and the
  // INDEX 1-liner truncates to a useless "v0.".
  s = s.replace(/^v\d+(?:\.\d+)+\s*[—:–-]*\s*/i, '').trim();
  if (!s) return '(no description from binary)';
  // Keep first two sentence-ish segments.
  const parts = s.match(/^(.+?[.!?])(\s+(.+?[.!?]))?/);
  if (parts) {
    s = (parts[1] + (parts[3] ? ' ' + parts[3] : '')).trim();
  }
  if (s.length > 240) {
    s = s.slice(0, 240);
    const lastSpace = s.lastIndexOf(' ');
    if (lastSpace > 200) s = s.slice(0, lastSpace);
    s = s.trimEnd() + ' …';
  }
  return s;
}

// ---------------------------------------------------------------------------
// YAML emission (hand-formatted to match the file's existing style)
// ---------------------------------------------------------------------------

function emitEntry(name, def) {
  const { tier, roles } = classify(name);
  const desc = shapeDescription(def.description);
  const lines = [];
  lines.push(`  - id: ${name}`);
  lines.push(`    server: gbrain`);
  lines.push(`    status: live`);
  lines.push(`    description: |`);
  lines.push(`      ${desc}`);
  lines.push(`    tier_default: ${tier}`);
  lines.push(`    cost_bucket: gbrain.shared.${name}`);
  // Flow-style role_scope: all read tools share one 23-role list, all writes one
  // 9-role list — inline keeps the registry compact + the diff legible (DRY).
  lines.push(`    role_scope: [${roles.join(', ')}]`);
  return lines.join('\n');
}

async function getLiveGbrainTools(fromFile) {
  if (fromFile) {
    const dump = JSON.parse(fs.readFileSync(path.resolve(REPO_ROOT, fromFile), 'utf-8'));
    return dump.liveDefs.gbrain || [];
  }
  const { loadServers, listTools } = require('./mcp-runtime-reconcile.cjs');
  const server = loadServers().find((s) => s.name === 'gbrain');
  if (!server) throw new Error('gbrain not in .mcp.json');
  const res = await listTools(server, 90000);
  if (!res.ok) throw new Error(`gbrain introspection failed: ${res.error}`);
  return res.tools;
}

async function main() {
  const fromArg = (process.argv.find((a) => a.startsWith('--from=')) || '').split('=')[1] || null;
  const tools = await getLiveGbrainTools(fromArg);
  tools.sort((a, b) => a.name.localeCompare(b.name));

  const tierCounts = { A: 0, B: 0, C: 0, 'D-Std': 0 };
  const blocks = [];
  for (const t of tools) {
    const { tier } = classify(t.name);
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    blocks.push(emitEntry(t.name, t));
  }

  console.log(`  # ===========================================================================`);
  console.log(`  # gbrain — Type 4 Semantic Memory engine (separate MCP server; .mcp.json key 'gbrain')`);
  console.log(`  # AUTO-GENERATED by scripts/resolver-v3/gen-gbrain-catalog.cjs from the LIVE binary.`);
  console.log(`  # ${tools.length} tools: A=${tierCounts.A} B=${tierCounts.B} C=${tierCounts.C}.`);
  console.log(`  # To refresh after a gbrain upgrade: node scripts/resolver-v3/gen-gbrain-catalog.cjs`);
  console.log(`  # Verify names still match the binary: node scripts/resolver-v3/mcp-runtime-reconcile.cjs`);
  console.log(`  # ===========================================================================`);
  console.log(blocks.join('\n'));
  console.error(`[gen] emitted ${tools.length} gbrain tools (A=${tierCounts.A} B=${tierCounts.B} C=${tierCounts.C})`);
}

module.exports = { classify, shapeDescription, READ_ROLES, WRITE_ROLES, ADMIN_ROLES, OVERRIDES };

if (require.main === module) {
  main().catch((e) => { console.error(`[FATAL] ${e.stack || e.message}`); process.exit(1); });
}
