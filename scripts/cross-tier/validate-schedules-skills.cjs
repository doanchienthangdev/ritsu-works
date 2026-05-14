#!/usr/bin/env node
// L2 validator: every `skill:` referenced in schedules.yaml must be present
// in minion-worker SKILL_REGISTRY (either always or conditionally on env).
//
// Invariant enforced: schedules-skills-registered.

'use strict';

const fs = require('fs');
const path = require('path');

const { REPO_ROOT } = require('../lib/load-invariants.cjs');

let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  console.error('❌ js-yaml not installed. Run: pnpm install');
  process.exit(2);
}

function loadSchedules() {
  const p = path.join(REPO_ROOT, 'knowledge', 'schedules.yaml');
  return yaml.load(fs.readFileSync(p, 'utf8'));
}

function scanRegistrySkills() {
  const p = path.join(REPO_ROOT, 'supabase', 'functions', 'minion-worker', 'index.ts');
  if (!fs.existsSync(p)) return new Set();
  const text = fs.readFileSync(p, 'utf8');
  const skills = new Set();
  // Match either `"skill-name": makeXxxHandler(` or `"skill-name":` as registry key.
  const re = /["']([a-z][a-z0-9-]+)["']\s*:\s*make[A-Z]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    skills.add(m[1]);
  }
  return skills;
}

function main() {
  const data = loadSchedules();
  const schedules = (data && data.schedules) || [];
  const registered = scanRegistrySkills();

  const errors = [];
  for (const s of schedules) {
    if (!s.skill) continue; // schedule without a skill is just a tick, OK
    if (!registered.has(s.skill)) {
      errors.push(`schedule ${s.id} references skill '${s.skill}' not in minion-worker SKILL_REGISTRY`);
    }
  }

  if (errors.length === 0) {
    console.log(`✓ schedules-skills: clean (${schedules.length} schedules, ${registered.size} registered skills)`);
    process.exit(0);
  }
  console.error('❌ schedules-skills drift detected:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

if (require.main === module) main();

module.exports = { main, scanRegistrySkills };
