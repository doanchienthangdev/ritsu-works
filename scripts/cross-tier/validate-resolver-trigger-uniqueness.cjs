#!/usr/bin/env node
// L1 validator: knowledge/resolvers/routes/<kind>.yaml — trigger keyword uniqueness.
//
// Capability: resolver v1.0.
//
// Invariants enforced:
//   1. Within a SINGLE file (e.g. routes/skills.yaml): no trigger keyword
//      appears in 2+ routes. Collision would create ambiguous matching.
//   2. Cross-file collisions (e.g. skill+command both claim "ship") are
//      ALLOWED — the rank/filter step disambiguates by kind.
//   3. Triggers compared after NFC normalization + lowercasing.
//
// Exit codes:
//   0 — clean
//   1 — at least one intra-file trigger collision
//   2 — script error
//
// See:
//   - knowledge/resolvers/routes/*.yaml
//   - knowledge/resolvers/overrides/*.yaml
//   - .archives/cla/resolver/spec.md §11.2

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

if (!fs.existsSync(RESOLVERS_DIR)) {
  console.log('clean (knowledge/resolvers/ absent — pre-capability bootstrap)');
  process.exit(0);
}

function normalize(s) {
  if (typeof s !== 'string') return '';
  return s.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ');
}

function loadFile(fp) {
  try { return yaml.load(fs.readFileSync(fp, 'utf8')); }
  catch (e) {
    console.error('ERROR:', fp, '—', e.message);
    process.exit(2);
  }
}

let totalCollisions = 0;
let totalRoutesScanned = 0;

for (const subdir of ['routes', 'overrides']) {
  const dir = path.join(RESOLVERS_DIR, subdir);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.yaml'));
  for (const f of files) {
    const fp = path.join(dir, f);
    const doc = loadFile(fp);
    if (!doc || !Array.isArray(doc.routes)) continue;

    // Map: normalized_keyword → [route_id, ...]
    const seen = new Map();
    for (const r of doc.routes) {
      totalRoutesScanned += 1;
      if (!r.triggers || !Array.isArray(r.triggers.keywords)) continue;
      for (const kw of r.triggers.keywords) {
        const n = normalize(kw);
        if (!n) continue;
        if (!seen.has(n)) seen.set(n, []);
        seen.get(n).push(r.id || '<no-id>');
      }
    }

    for (const [kw, ids] of seen.entries()) {
      if (ids.length > 1) {
        console.error(`  ✗ ${subdir}/${f}: trigger '${kw}' collides across routes: ${ids.join(', ')}`);
        totalCollisions += 1;
      }
    }
  }
}

if (totalCollisions > 0) {
  console.error(`\nFAIL: ${totalCollisions} trigger collision(s) across ${totalRoutesScanned} routes`);
  console.error('Fix: rename one trigger or merge the routes.');
  process.exit(1);
}

console.log(`clean (${totalRoutesScanned} routes; 0 trigger collisions)`);
process.exit(0);
