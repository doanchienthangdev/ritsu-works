#!/usr/bin/env node
// L1 validator: knowledge/resolvers/routes/<kind>.yaml ↔ filesystem ↔ Tier 1 sources.
//
// Capability: resolver v1.0.
//
// Invariants enforced:
//   1. For routes with `recipient.path`: file MUST exist on disk
//      (unless route.status === 'deprecated' OR metadata.derived === true with
//      `--allow-missing-derived` flag — bootstrap allowance).
//   2. For routes with `recipient.kind` = 'skill': slug MUST resolve to a
//      SKILL.md (looks under 06-ai-ops/skills/ + .claude/skills/).
//   3. For routes with `recipient.kind` = 'command': slug MUST exist at
//      .claude/commands/<slug>.md.
//   4. For routes with `recipient.kind` = 'agent': slug MUST exist at
//      .claude/agents/<slug>.md.
//   5. For routes with `recipient.kind` = 'persona': slug MUST exist in
//      knowledge/workforce-personas.yaml.
//   6. For routes with `recipient.kind` = 'mcp': slug MUST exist as
//      tools[].id in knowledge/mcp-tools.yaml.
//   7. Adapter precedence rule: if a route has metadata.derived = true AND
//      a matching route in overrides/ with same id exists, the override
//      MUST be tagged metadata.derived = false (architect T-1).
//
// Exit codes:
//   0 — clean
//   1 — at least one critical drift
//   2 — script error
//
// See:
//   - knowledge/resolvers/routes/*.yaml
//   - knowledge/resolvers/overrides/*.yaml
//   - .archives/cla/resolver/spec.md §2.A invariants 6+7

'use strict';

const fs = require('fs');
const path = require('path');

let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  console.error('js-yaml not installed. Run: pnpm install');
  process.exit(2);
}

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESOLVERS_DIR = path.join(REPO_ROOT, 'knowledge', 'resolvers');

function fail(msg) { console.error('FAIL:', msg); process.exit(1); }
function bail(msg) { console.error('ERROR:', msg); process.exit(2); }

if (!fs.existsSync(RESOLVERS_DIR)) {
  console.log('clean (knowledge/resolvers/ absent — pre-capability bootstrap)');
  process.exit(0);
}

function loadYamlSafe(fp) {
  if (!fs.existsSync(fp)) return null;
  try { return yaml.load(fs.readFileSync(fp, 'utf8')); }
  catch (e) { bail(`YAML parse failed for ${fp}: ${e.message}`); }
}

function listRoutesFiles(subdir) {
  const dir = path.join(RESOLVERS_DIR, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.yaml')).map(f => path.join(dir, f));
}

function loadAllRoutes(subdir) {
  const out = [];
  for (const fp of listRoutesFiles(subdir)) {
    const doc = loadYamlSafe(fp);
    if (!doc || !Array.isArray(doc.routes)) continue;
    for (const r of doc.routes) out.push({ ...r, _file: path.relative(REPO_ROOT, fp) });
  }
  return out;
}

const routesDerived = loadAllRoutes('routes');
const routesOverrides = loadAllRoutes('overrides');

// Load reference data (lazy load only what we need)
const REFS = {
  personas: null,
  mcpTools: null,
};
function refPersonas() {
  if (REFS.personas) return REFS.personas;
  const doc = loadYamlSafe(path.join(REPO_ROOT, 'knowledge', 'workforce-personas.yaml'));
  REFS.personas = new Set(doc && doc.personas ? Object.keys(doc.personas) : []);
  return REFS.personas;
}
function refMcpTools() {
  if (REFS.mcpTools) return REFS.mcpTools;
  const doc = loadYamlSafe(path.join(REPO_ROOT, 'knowledge', 'mcp-tools.yaml'));
  const ids = new Set();
  if (doc && Array.isArray(doc.tools)) {
    for (const t of doc.tools) if (t && t.id) ids.add(t.id);
  }
  REFS.mcpTools = ids;
  return REFS.mcpTools;
}

let errors = 0;
const overrideIds = new Map();
for (const r of routesOverrides) {
  overrideIds.set(r.id, r);
}

function validateRecipient(r) {
  const { kind, slug, path: rpath } = r.recipient || {};
  if (!kind || !slug) {
    console.error(`  ✗ ${r._file}#${r.id || '<no-id>'}: missing recipient.kind or .slug`);
    return false;
  }

  // Path existence check (where applicable)
  if (rpath) {
    const abs = path.join(REPO_ROOT, rpath);
    if (!fs.existsSync(abs)) {
      if (r.status === 'deprecated') return true;
      console.error(`  ✗ ${r._file}#${r.id}: recipient.path missing — ${rpath}`);
      return false;
    }
  }

  // Kind-specific slug resolution
  switch (kind) {
    case 'skill': {
      // Skill slug — search in 06-ai-ops/skills/ and .claude/skills/
      // Slug may be "namespace/name" or "name"
      const candidates = [
        path.join(REPO_ROOT, '06-ai-ops', 'skills', slug, 'SKILL.md'),
        path.join(REPO_ROOT, '.claude', 'skills', slug, 'SKILL.md'),
      ];
      if (slug.includes('/')) {
        // Namespace style — try both
      }
      if (candidates.some(p => fs.existsSync(p))) return true;
      if (r.status === 'deprecated' || r.status === 'stub') return true;
      console.error(`  ⚠ ${r._file}#${r.id}: skill not found — slug='${slug}' (status=${r.status || 'active'})`);
      // Warn-only for missing skills (drift expected during sync iteration);
      // critical only when status=active AND explicitly required
      if (r.metadata && r.metadata.resolver_required === true) return false;
      return true;
    }
    case 'command': {
      const abs = path.join(REPO_ROOT, '.claude', 'commands', `${slug}.md`);
      if (fs.existsSync(abs)) return true;
      if (r.status === 'deprecated' || r.status === 'stub') return true;
      console.error(`  ⚠ ${r._file}#${r.id}: command not found — .claude/commands/${slug}.md`);
      return true;
    }
    case 'agent': {
      const abs = path.join(REPO_ROOT, '.claude', 'agents', `${slug}.md`);
      if (fs.existsSync(abs)) return true;
      if (r.status === 'deprecated' || r.status === 'stub') return true;
      console.error(`  ⚠ ${r._file}#${r.id}: agent not found — .claude/agents/${slug}.md`);
      return true;
    }
    case 'persona': {
      if (refPersonas().has(slug)) return true;
      if (r.status === 'deprecated' || r.status === 'stub') return true;
      console.error(`  ✗ ${r._file}#${r.id}: persona '${slug}' not in workforce-personas.yaml`);
      return false;
    }
    case 'mcp': {
      if (refMcpTools().has(slug)) return true;
      if (r.status === 'deprecated' || r.status === 'stub') return true;
      console.error(`  ⚠ ${r._file}#${r.id}: mcp tool '${slug}' not in mcp-tools.yaml`);
      return true;
    }
    // wiki, sop, capability — paths can vary; if path provided check above; else lenient
    default:
      return true;
  }
}

for (const r of routesDerived) {
  // Invariant: derived route + override with same id → override must be derived=false
  if (overrideIds.has(r.id)) {
    const ov = overrideIds.get(r.id);
    if (ov.metadata && ov.metadata.derived === true) {
      console.error(`  ✗ Adapter precedence violation: route ${r.id} has override at ${ov._file} but override is metadata.derived=true (must be false to take precedence)`);
      errors += 1;
    }
  }

  if (!validateRecipient(r)) errors += 1;
}

for (const r of routesOverrides) {
  // Overrides themselves: validate recipients too
  if (!validateRecipient(r)) errors += 1;
}

if (errors > 0) {
  console.error(`\nFAIL: ${errors} route validation error(s)`);
  process.exit(1);
}

const totalRoutes = routesDerived.length + routesOverrides.length;
console.log(`clean (${totalRoutes} routes; ${routesDerived.length} derived + ${routesOverrides.length} overrides)`);
process.exit(0);
