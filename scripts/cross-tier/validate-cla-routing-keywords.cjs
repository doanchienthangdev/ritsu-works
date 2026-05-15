#!/usr/bin/env node
// L1 validator: knowledge/cla-routing-keywords.yaml ↔ workforce-personas.yaml ↔ ROLES.md.
//
// Invariants enforced (critical):
//   1. Every `routes.<domain>.cxo` slug exists in knowledge/workforce-personas.yaml
//      (any status — active OR planned OR deferred is fine; we just require the
//      slug to be a known persona).
//   2. Every `routes.<domain>.fallback_role` exists as a `role: <name>` block in
//      governance/ROLES.md.
//   3. No keyword overlap across routes (case-insensitive). A keyword belongs
//      to exactly one route or the routing scan becomes ambiguous by design.
//
// Schema validation (presence of fields, types, version pattern) is delegated
// to validate-tier1.cjs which compiles the JSON Schema. Here we enforce the
// cross-reference invariants only.
//
// Exit codes:
//   0 — clean
//   1 — at least one critical drift
//   2 — script error
//
// See:
//   - knowledge/cla-routing-keywords.yaml
//   - knowledge/workforce-personas.yaml
//   - governance/ROLES.md
//   - .archives/cla/03-architecture.md §6
//   - .archives/cla/08-next-steps-checklist.md Sprint 1 §2

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
const ROUTING_PATH = path.join(REPO_ROOT, 'knowledge', 'cla-routing-keywords.yaml');
const PERSONAS_PATH = path.join(REPO_ROOT, 'knowledge', 'workforce-personas.yaml');
const ROLES_PATH = path.join(REPO_ROOT, 'governance', 'ROLES.md');

const errors = [];
const warnings = [];

function loadYaml(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`${label} missing at ${filePath}`);
    return null;
  }
  try {
    return yaml.load(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    errors.push(`${label} parse error: ${e.message}`);
    return null;
  }
}

// Parse ROLES.md for role names defined in ```yaml blocks.
// Same approach as validate-personas.cjs — scan ```yaml fences and extract `role:`.
function parseRoleNames() {
  if (!fs.existsSync(ROLES_PATH)) {
    errors.push(`ROLES.md missing at ${ROLES_PATH}`);
    return new Set();
  }
  const text = fs.readFileSync(ROLES_PATH, 'utf8');
  const roles = new Set();
  const blockRegex = /```yaml\s*\n([\s\S]*?)```/g;
  let m;
  while ((m = blockRegex.exec(text)) !== null) {
    const blockText = m[1];
    if (!/^role:\s*/m.test(blockText)) continue;
    try {
      const obj = yaml.load(blockText);
      if (obj && typeof obj === 'object' && obj.role) {
        roles.add(obj.role);
      }
    } catch {
      // Malformed yaml block; ignore (validate-tier1 catches schema issues).
    }
  }
  return roles;
}

function checkCxoExists(domain, cxo, personaSlugs) {
  if (!personaSlugs.has(cxo)) {
    errors.push(
      `route '${domain}': cxo='${cxo}' not found in knowledge/workforce-personas.yaml`
    );
  }
}

function checkFallbackRoleExists(domain, role, roleNames) {
  if (!roleNames.has(role)) {
    errors.push(
      `route '${domain}': fallback_role='${role}' not found in governance/ROLES.md`
    );
  }
}

function checkKeywordOverlap(routes) {
  // Map keyword (lowercase) → first domain that owns it.
  const keywordOwner = new Map();
  for (const [domain, route] of Object.entries(routes)) {
    if (!Array.isArray(route.keywords)) continue;
    for (const kw of route.keywords) {
      const lower = String(kw).toLowerCase();
      if (keywordOwner.has(lower)) {
        const prior = keywordOwner.get(lower);
        if (prior !== domain) {
          errors.push(
            `keyword '${kw}' appears in routes '${prior}' AND '${domain}' — keywords must be unique per route`
          );
        }
      } else {
        keywordOwner.set(lower, domain);
      }
    }
  }
}

function main() {
  const routing = loadYaml(ROUTING_PATH, 'cla-routing-keywords.yaml');
  const personas = loadYaml(PERSONAS_PATH, 'workforce-personas.yaml');
  if (!routing || !personas) {
    finish();
    return;
  }

  const personaSlugs = new Set(Object.keys(personas.personas || {}));
  const roleNames = parseRoleNames();

  if (!routing.routes || typeof routing.routes !== 'object') {
    errors.push('cla-routing-keywords.yaml: missing or invalid `routes` map');
    finish();
    return;
  }

  for (const [domain, route] of Object.entries(routing.routes)) {
    if (route && route.cxo) {
      checkCxoExists(domain, route.cxo, personaSlugs);
    } else {
      errors.push(`route '${domain}': missing required field 'cxo'`);
    }
    if (route && route.fallback_role) {
      checkFallbackRoleExists(domain, route.fallback_role, roleNames);
    } else {
      errors.push(`route '${domain}': missing required field 'fallback_role'`);
    }
  }

  checkKeywordOverlap(routing.routes);

  finish();
}

function finish() {
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✓ cla-routing-keywords: cxo+fallback_role+keyword cross-refs consistent');
    process.exit(0);
  }
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  if (errors.length > 0) {
    console.log(`\n${errors.length} critical drift detected.`);
    process.exit(1);
  }
  console.log(`\n${warnings.length} warnings (non-blocking).`);
  process.exit(0);
}

main();
