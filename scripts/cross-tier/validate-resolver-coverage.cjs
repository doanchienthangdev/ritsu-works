#!/usr/bin/env node
// L2 validator (warn-tier per D-2): resolver recipient coverage.
//
// Capability: resolver v1.0.
//
// Invariants enforced:
//   1. Every recipient on disk (skill, command, agent) MUST have at least
//      one route entry pointing at it — UNLESS recipient frontmatter sets
//      `resolver_required: false` (opt-out).
//   2. Strict mode (exit 1) when recipient frontmatter sets
//      `resolver_required: true` AND no route exists.
//   3. Default mode: warn-only (exit 3) for orphan recipients.
//
// D-2 founder decision: default behavior is WARN-ONLY. Founder runs
// `/resolver sync --apply` to generate stubs when ready.
//
// Exit codes:
//   0 — clean (no orphans, or all opt-out)
//   1 — required-but-missing route (recipient has resolver_required: true)
//   2 — script error
//   3 — warn (orphans found; informational)
//
// See:
//   - knowledge/resolvers/routes/*.yaml
//   - 06-ai-ops/skills/*/SKILL.md (frontmatter)
//   - .claude/commands/*.md (frontmatter)
//   - .archives/cla/resolver/spec.md §4.7

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

function loadRoutes(subdir) {
  const dir = path.join(RESOLVERS_DIR, subdir);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.yaml'))) {
    try {
      const doc = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (doc && Array.isArray(doc.routes)) out.push(...doc.routes);
    } catch (e) {
      console.error('ERROR parsing', f, e.message);
      process.exit(2);
    }
  }
  return out;
}

function parseFrontmatter(fp) {
  try {
    const txt = fs.readFileSync(fp, 'utf8');
    const m = txt.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return {};
    return yaml.load(m[1]) || {};
  } catch (e) {
    return {};
  }
}

function walkSkills() {
  const out = [];
  const dirs = [
    path.join(REPO_ROOT, '06-ai-ops', 'skills'),
    path.join(REPO_ROOT, '.claude', 'skills'),
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    function walk(dir, prefix = '') {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) walk(path.join(dir, e.name), prefix ? `${prefix}/${e.name}` : e.name);
        else if (e.name === 'SKILL.md') {
          const fp = path.join(dir, e.name);
          const fm = parseFrontmatter(fp);
          const slug = fm.name || prefix;
          out.push({ kind: 'skill', slug, path: path.relative(REPO_ROOT, fp), frontmatter: fm });
        }
      }
    }
    walk(d);
  }
  return out;
}

function walkSimple(kind, dir, extension = '.md') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(extension) && f !== 'README.md')
    .map(f => {
      const fp = path.join(dir, f);
      return {
        kind,
        slug: f.replace(extension, ''),
        path: path.relative(REPO_ROOT, fp),
        frontmatter: parseFrontmatter(fp),
      };
    });
}

const allRoutes = [...loadRoutes('routes'), ...loadRoutes('overrides')];
const routedSlugs = {
  skill: new Set(),
  command: new Set(),
  agent: new Set(),
};
for (const r of allRoutes) {
  if (!r.recipient) continue;
  const k = r.recipient.kind;
  const s = r.recipient.slug;
  if (routedSlugs[k]) routedSlugs[k].add(s);
}

const skills = walkSkills();
const commands = walkSimple('command', path.join(REPO_ROOT, '.claude', 'commands'));
const agents = walkSimple('agent', path.join(REPO_ROOT, '.claude', 'agents'));

let orphans = [];
let requiredMissing = [];

function checkKind(items) {
  for (const item of items) {
    if (item.frontmatter && item.frontmatter.resolver_required === false) continue;
    if (routedSlugs[item.kind].has(item.slug)) continue;
    const required = item.frontmatter && item.frontmatter.resolver_required === true;
    if (required) requiredMissing.push(item);
    else orphans.push(item);
  }
}

checkKind(skills);
checkKind(commands);
checkKind(agents);

if (requiredMissing.length > 0) {
  console.error(`\nFAIL: ${requiredMissing.length} recipient(s) with resolver_required:true missing routes:`);
  for (const o of requiredMissing) console.error(`  ✗ [${o.kind}] ${o.slug} (${o.path})`);
  process.exit(1);
}

if (orphans.length > 0) {
  console.log(`warn: ${orphans.length} recipient(s) without routes (informational; D-2 warn-only default):`);
  for (const o of orphans.slice(0, 20)) console.log(`  ⚠ [${o.kind}] ${o.slug} (${o.path})`);
  if (orphans.length > 20) console.log(`  ... and ${orphans.length - 20} more`);
  console.log(`\nRun: node scripts/resolver/sync.cjs --dry-run     # preview stubs`);
  console.log(`     node scripts/resolver/sync.cjs --apply        # write stubs locally`);
  console.log(`     node scripts/resolver/sync.cjs --auto-pr      # open PR (Tier C)`);
  process.exit(3);
}

console.log(`clean (${skills.length + commands.length + agents.length} recipients; 0 orphans)`);
process.exit(0);
