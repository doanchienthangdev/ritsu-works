#!/usr/bin/env node
/**
 * scripts/cross-tier/validate-mcp-json-tools-consistency.cjs
 *
 * L2 validator — capability gbrain-operational-brain v1.0 (Sprint 6).
 *
 * Catches drift between `.mcp.json` registered MCP servers and
 * `knowledge/mcp-tools.yaml` tool entries.
 *
 * Invariant: every MCP server name in .mcp.json.mcpServers MUST have at least
 * 1 tool entry in mcp-tools.yaml with matching `server:` field. Conversely,
 * every distinct `server:` value in mcp-tools.yaml MUST exist as a key in
 * .mcp.json.mcpServers.
 *
 * Motivated by the install-record / .mcp.json drift caught during gbrain
 * Phase 0 system inventory: install record D6 claimed gbrain MCP was added
 * to .mcp.json on 2026-05-23, but the actual file had no gbrain entry until
 * Sprint 5 PR #104 added it. This validator prevents that class of drift.
 *
 * Run as L2 check via scripts/check-consistency.cjs.
 *
 * Exit codes:
 *   0 — invariant holds
 *   1 — drift detected
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MCP_JSON_PATH = path.join(REPO_ROOT, '.mcp.json');
const MCP_TOOLS_PATH = path.join(REPO_ROOT, 'knowledge', 'mcp-tools.yaml');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function loadYamlStub(p) {
  // Minimal YAML reader — extracts top-level `tools:` array entries' `server:`
  // field via regex. Avoids js-yaml dependency for L2 validator scripts.
  const raw = fs.readFileSync(p, 'utf-8');
  const servers = new Set();
  // Match server: <value> at indentation level 4 spaces (under tools: array item)
  const re = /^\s{4}server:\s*([a-z][a-z0-9_-]*)\s*$/gm;
  let m;
  while ((m = re.exec(raw)) !== null) {
    servers.add(m[1]);
  }
  return servers;
}

function main() {
  if (!fs.existsSync(MCP_JSON_PATH)) {
    console.log('  ⚠ .mcp.json missing — skipping');
    return 0;
  }
  if (!fs.existsSync(MCP_TOOLS_PATH)) {
    console.log('  ⚠ knowledge/mcp-tools.yaml missing — skipping');
    return 0;
  }

  const mcpJson = loadJson(MCP_JSON_PATH);
  const mcpServersInJson = new Set(Object.keys(mcpJson.mcpServers || {}));
  const serversInYaml = loadYamlStub(MCP_TOOLS_PATH);

  const errors = [];

  // Every .mcp.json server should have tool entries
  for (const s of mcpServersInJson) {
    if (!serversInYaml.has(s)) {
      errors.push(`MCP server '${s}' registered in .mcp.json but no tool entries in knowledge/mcp-tools.yaml`);
    }
  }

  // Every mcp-tools.yaml server should be registered
  for (const s of serversInYaml) {
    if (!mcpServersInJson.has(s)) {
      errors.push(`MCP server '${s}' has tool entries in knowledge/mcp-tools.yaml but not registered in .mcp.json.mcpServers`);
    }
  }

  if (errors.length > 0) {
    console.log('  ✗ .mcp.json ↔ mcp-tools.yaml drift detected:');
    for (const e of errors) console.log(`      - ${e}`);
    console.log('');
    console.log('  Fix: either add the missing tool entries OR add/remove the .mcp.json server entry');
    return 1;
  }

  console.log(`  ✓ .mcp.json ↔ mcp-tools.yaml consistent (${mcpServersInJson.size} servers)`);
  return 0;
}

process.exit(main());
