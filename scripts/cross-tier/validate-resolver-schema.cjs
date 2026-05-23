#!/usr/bin/env node
// L1 validator: knowledge/resolvers/{routes,overrides}/<kind>.yaml schema check.
//
// Capability: resolver v1.0 (see wiki/capabilities/resolver/spec.md).
//
// Invariants enforced:
//   1. registry.yaml itself is well-formed YAML and schema-aligned (light check).
//   2. Every route entry in routes/<kind>.yaml passes
//      knowledge/schemas/resolver-route.schema.json (JSON Schema Draft 2020-12).
//   3. Every route entry in overrides/<kind>.yaml passes same schema.
//   4. Bootstrap mode: empty files (only comments/blank) are ALLOWED at v1.0
//      since auto-derived routes populate over time (D-2 warn-only default).
//
// Exit codes:
//   0 — clean
//   1 — at least one critical drift (route entry failed schema)
//   2 — script error (missing deps, registry malformed)
//
// See:
//   - knowledge/resolvers/registry.yaml
//   - knowledge/schemas/resolver-route.schema.json
//   - .archives/cla/resolver/spec.md §11.8

'use strict';

const fs = require('fs');
const path = require('path');

let yaml, Ajv;
try {
  yaml = require('js-yaml');
  Ajv = require('ajv/dist/2020');
} catch (e) {
  console.error('Missing dep:', e.message, '\nRun: pnpm install');
  process.exit(2);
}

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESOLVERS_DIR = path.join(REPO_ROOT, 'knowledge', 'resolvers');
const SCHEMA_PATH = path.join(REPO_ROOT, 'knowledge', 'schemas', 'resolver-route.schema.json');

function fail(msg) { console.error('FAIL:', msg); process.exit(1); }
function bail(msg) { console.error('ERROR:', msg); process.exit(2); }

if (!fs.existsSync(RESOLVERS_DIR)) {
  console.log('clean (knowledge/resolvers/ absent — pre-capability bootstrap)');
  process.exit(0);
}

if (!fs.existsSync(SCHEMA_PATH)) {
  bail('Schema file not found: ' + SCHEMA_PATH);
}

let schema;
try {
  schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
} catch (e) {
  bail('Schema parse failed: ' + e.message);
}

const ajv = new Ajv({ allErrors: true, strict: false });
let validateRoute;
try {
  validateRoute = ajv.compile(schema);
} catch (e) {
  bail('Schema compile failed: ' + e.message);
}

// Registry.yaml light check
const registryPath = path.join(RESOLVERS_DIR, 'registry.yaml');
if (fs.existsSync(registryPath)) {
  let registry;
  try {
    registry = yaml.load(fs.readFileSync(registryPath, 'utf8'));
  } catch (e) {
    fail('registry.yaml malformed YAML: ' + e.message);
  }
  if (!registry || typeof registry !== 'object') {
    fail('registry.yaml empty or non-object');
  }
  if (!registry.schema_version) {
    fail('registry.yaml missing schema_version');
  }
  if (registry.schema_version !== '1.0.0') {
    fail(`registry.yaml schema_version '${registry.schema_version}' not supported by v1.0 validator`);
  }
}

// Routes + overrides files
const KIND_DIRS = ['routes', 'overrides'];
let totalRoutes = 0;
let totalErrors = 0;

for (const kindDir of KIND_DIRS) {
  const dir = path.join(RESOLVERS_DIR, kindDir);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.yaml'));
  for (const f of files) {
    const fp = path.join(dir, f);
    let doc;
    try {
      doc = yaml.load(fs.readFileSync(fp, 'utf8'));
    } catch (e) {
      console.error(`  ✗ ${kindDir}/${f}: YAML parse failed — ${e.message}`);
      totalErrors += 1;
      continue;
    }

    // Bootstrap-mode: empty file allowed
    if (doc === null || doc === undefined) continue;
    if (typeof doc !== 'object') {
      console.error(`  ✗ ${kindDir}/${f}: not an object`);
      totalErrors += 1;
      continue;
    }

    const routes = Array.isArray(doc) ? doc : doc.routes;
    if (!Array.isArray(routes)) {
      // file with no `routes:` array — bootstrap-mode OK
      continue;
    }

    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      totalRoutes += 1;
      const ok = validateRoute(r);
      if (!ok) {
        console.error(`  ✗ ${kindDir}/${f}#routes[${i}] (id=${r.id || '<missing>'}):`);
        for (const err of validateRoute.errors) {
          console.error(`      - ${err.instancePath || '/'} ${err.message}`);
        }
        totalErrors += 1;
      }
    }
  }
}

if (totalErrors > 0) {
  console.error(`\nFAIL: ${totalErrors} schema violation(s) across ${totalRoutes} routes`);
  process.exit(1);
}

console.log(`clean (${totalRoutes} routes; 0 schema violations)`);
process.exit(0);
