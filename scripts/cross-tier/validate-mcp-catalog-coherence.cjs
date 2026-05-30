#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-mcp-catalog-coherence.cjs
 *
 * L2 CRITICAL validator — deterministic (git-artifact-only, no live servers).
 * Catches the THREE classes of MCP naming/status drift that hid 33 live gbrain
 * tools, mis-tiered 13 phantom tools, and produced phantom invoke strings
 * (`mcp__gbrain__gbrain__search`, `mcp__supabase_ops__query`,
 * `mcp__resolver__find`). Companion to:
 *   - validate-mcp-json-tools-consistency.cjs (server-LEVEL: .mcp.json ↔ yaml)
 *   - mcp-runtime-reconcile.cjs (L3: catalog ↔ LIVE runtime tool surface)
 *
 * Source of truth: knowledge/mcp-tools.yaml (the registry) × .mcp.json (the
 * set of servers that are actually registered/live). Both are committed git
 * artifacts, so this runs in CI with no secrets and no spawned servers.
 *
 * Three invariants (per tool entry in mcp-tools.yaml):
 *
 *   I1  BARE-ID / NO-DOUBLE-PREFIX
 *       A tool `id` must NOT start with `<server>__`. The catalog generator
 *       builds slug = `<server>__<id>`; if the id already carries the server
 *       prefix the result double-prefixes (gbrain__gbrain__search). ids are bare.
 *
 *   I2  SERVER-FIDELITY (live tools only)
 *       A live tool (status live/active/omitted) must declare a `server` that is
 *       a key in `.mcp.json.mcpServers`. Catches a server that is mis-spelled,
 *       hyphen-mangled, or never registered. (planned/deprecated are exempt —
 *       a planned tool may name a future server.)
 *
 *   I3  STATUS-COHERENCE
 *       (a) A tool whose `server` IS registered in `.mcp.json` must NOT be
 *           `status: planned` — the server is live, so the tool is live. This is
 *           exactly the bug that left 41 gbrain tools `planned` after the gbrain
 *           server went live, hiding them from the resolver INDEX.
 *       (b) A live (non-planned/deprecated) tool whose `server` is NOT registered
 *           is incoherent (covered by I2; reported there).
 *
 * Exit codes: 0 = all coherent, 1 = drift, 2 = fatal (cannot read inputs).
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MCP_JSON_PATH = path.join(REPO_ROOT, '.mcp.json');
const MCP_TOOLS_PATH = path.join(REPO_ROOT, 'knowledge', 'mcp-tools.yaml');

const LIFECYCLE_NONLIVE = new Set(['planned', 'deprecated']);

/**
 * Pure core — exported for unit tests. Returns an array of error strings
 * (empty = coherent). `mcpJson` is the parsed .mcp.json; `toolsDoc` is the
 * parsed mcp-tools.yaml.
 */
function checkCoherence(mcpJson, toolsDoc) {
  const errors = [];
  const liveServers = new Set(Object.keys((mcpJson && mcpJson.mcpServers) || {}));
  const tools = (toolsDoc && Array.isArray(toolsDoc.tools)) ? toolsDoc.tools : [];

  for (const t of tools) {
    if (!t || !t.id) continue;
    const { id, server, status } = t;
    const isNonLive = LIFECYCLE_NONLIVE.has(status);   // planned | deprecated
    const isPlanned = status === 'planned';
    const serverRegistered = !!server && liveServers.has(server);

    // I1 — bare id (applies regardless of status)
    if (server && id.startsWith(`${server}__`)) {
      errors.push(
        `[I1 double-prefix] tool id '${id}' starts with its server '${server}__'. ` +
        `ids must be BARE — rename to '${id.slice(server.length + 2)}'. ` +
        `(catalog builds slug = server__id; prefixed ids double up → mcp__${server}__${server}__…)`
      );
    }

    if (!isNonLive) {
      // I2 — live tool must reference a registered server
      if (!server) {
        errors.push(`[I2 server-fidelity] live tool '${id}' declares no 'server'. Add server: <key-in-.mcp.json> or mark status: planned.`);
      } else if (!serverRegistered) {
        errors.push(
          `[I2 server-fidelity] live tool '${id}' references server '${server}' which is NOT a key in .mcp.json.mcpServers ` +
          `(registered: ${[...liveServers].join(', ') || 'none'}). Fix the server name or mark status: planned.`
        );
      }
    } else if (isPlanned && serverRegistered) {
      // I3(a) — planned tool on a LIVE server (the gbrain-stale class)
      errors.push(
        `[I3 status-coherence] tool '${id}' is status: planned but its server '${server}' is LIVE in .mcp.json. ` +
        `A live server's tools must not be planned — flip to 'status: live' (or remove if the binary does not expose it; ` +
        `verify with scripts/resolver-v3/mcp-runtime-reconcile.cjs).`
      );
    }
  }
  return errors;
}

function main() {
  if (!fs.existsSync(MCP_JSON_PATH)) { console.log('  ⚠ .mcp.json missing — skipping'); return 0; }
  if (!fs.existsSync(MCP_TOOLS_PATH)) { console.log('  ⚠ knowledge/mcp-tools.yaml missing — skipping'); return 0; }

  let mcpJson, toolsDoc;
  try { mcpJson = JSON.parse(fs.readFileSync(MCP_JSON_PATH, 'utf-8')); }
  catch (e) { console.error(`  ✗ cannot parse .mcp.json: ${e.message}`); return 2; }
  try { toolsDoc = yaml.load(fs.readFileSync(MCP_TOOLS_PATH, 'utf-8')); }
  catch (e) { console.error(`  ✗ cannot parse mcp-tools.yaml: ${e.message}`); return 2; }

  const errors = checkCoherence(mcpJson, toolsDoc);
  if (errors.length === 0) {
    const n = (toolsDoc.tools || []).length;
    console.log(`  ✓ mcp-tools.yaml ↔ .mcp.json coherent (${n} tools; bare ids, server-fidelity, status-coherence)`);
    return 0;
  }
  console.log(`  ✗ ${errors.length} MCP catalog coherence violation(s):`);
  for (const e of errors) console.log(`      - ${e}`);
  return 1;
}

module.exports = { checkCoherence };

if (require.main === module) {
  process.exit(main());
}
