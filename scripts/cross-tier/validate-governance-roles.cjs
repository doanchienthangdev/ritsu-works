#!/usr/bin/env node
// L2 validator: every skill claim in governance/ROLES.md should resolve to a
// directory under 06-ai-ops/skills/. Best-effort because ROLES.md is prose-heavy.
//
// Invariant enforced: roles-skills-exist (severity: warn — false positives OK).

'use strict';

const fs = require('fs');
const path = require('path');

const { REPO_ROOT } = require('../lib/load-invariants.cjs');

const ROLES_PATH = path.join(REPO_ROOT, 'governance', 'ROLES.md');
const SKILLS_DIR = path.join(REPO_ROOT, '06-ai-ops', 'skills');

function existingSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return new Set();
  return new Set(
    fs
      .readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name),
  );
}

// Extract skill references from ROLES.md. ROLES.md uses YAML-in-markdown blocks
// where each role has a `skills:` array. We look for bullet entries inside
// those sections.
function extractClaimedSkills() {
  if (!fs.existsSync(ROLES_PATH)) return [];
  const text = fs.readFileSync(ROLES_PATH, 'utf8');
  const lines = text.split('\n');
  const claims = [];
  let inSkillsBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*skills:\s*$/.test(line)) {
      inSkillsBlock = true;
      continue;
    }
    if (inSkillsBlock) {
      const m = line.match(/^\s+-\s+([a-z][a-z0-9-]+)\s*(?:#.*)?$/);
      if (m) {
        // Skip wildcard / star (means "any" — not a literal skill name)
        if (m[1] === '*') continue;
        claims.push({ skill: m[1], line: i + 1 });
        continue;
      }
      // Exit the skills block on any non-indented or non-bullet line
      if (!/^\s+-/.test(line) && line.trim() !== '') {
        inSkillsBlock = false;
      }
    }
  }
  return claims;
}

function main() {
  const claims = extractClaimedSkills();
  const known = existingSkills();
  const errors = [];

  for (const c of claims) {
    if (!known.has(c.skill)) {
      errors.push(`ROLES.md:${c.line} claims skill '${c.skill}' but 06-ai-ops/skills/${c.skill}/ does not exist`);
    }
  }

  if (errors.length === 0) {
    console.log(`✓ governance-roles: clean (${claims.length} skill claims, all exist)`);
    process.exit(0);
  }
  console.error('⚠️  governance-roles drift (warn severity — false positives acceptable in v1.0a):');
  for (const e of errors) console.error(`  - ${e}`);
  console.error(`\n${errors.length} issue(s). If false positive, add the role/skill to ROLES.md or mark with a comment.`);
  process.exit(1);
}

if (require.main === module) main();

module.exports = { main, extractClaimedSkills };
