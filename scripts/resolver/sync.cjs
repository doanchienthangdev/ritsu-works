#!/usr/bin/env node
'use strict';
// Resolver engine — sync module.
// Per .archives/cla/resolver/spec.md §11.6.
//
// Scans filesystem for skill/command/agent recipients without resolver routes,
// generates stub entries derived from recipient frontmatter, writes to
// knowledge/resolvers/routes/<kind>.yaml.
//
// Default mode: --dry-run (D-2 founder decision). --apply writes locally.
// --auto-pr commits + pushes + opens PR (Tier C).

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { spawnSync } = require('child_process');
const E = require('./errors.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RESOLVERS_DIR = path.join(REPO_ROOT, 'knowledge', 'resolvers');
const ROUTES_DIR = path.join(RESOLVERS_DIR, 'routes');
const ADAPTERS_DIR = path.join(RESOLVERS_DIR, 'adapters');
const LOCK_FILE = path.join(REPO_ROOT, '.archives', 'resolver-sync.lock');

// === CLI parsing ===
function parseArgs(argv) {
  const args = { dryRun: true, apply: false, autoPr: false, kind: null };
  for (const a of argv) {
    if (a === '--apply') { args.apply = true; args.dryRun = false; }
    else if (a === '--auto-pr') { args.autoPr = true; args.apply = true; args.dryRun = false; }
    else if (a === '--dry-run') { args.dryRun = true; args.apply = false; }
    else if (a.startsWith('--kind=')) args.kind = a.slice(7);
  }
  return args;
}

// === Frontmatter parser ===
function parseFrontmatter(filePath) {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    const m = txt.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return { _body: txt };
    const fm = yaml.load(m[1]) || {};
    fm._body = txt.slice(m[0].length);
    return fm;
  } catch (e) {
    return null;
  }
}

// === Recipient walker ===
function walkSkills() {
  const out = [];
  const roots = [
    { dir: path.join(REPO_ROOT, '06-ai-ops', 'skills'), pillar: '06-ai-ops' },
    { dir: path.join(REPO_ROOT, '.claude', 'skills'), pillar: '.claude' },
  ];
  for (const { dir, pillar } of roots) {
    if (!fs.existsSync(dir)) continue;
    function walk(d, prefix = '') {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        const slug = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.isDirectory()) walk(full, slug);
        else if (e.name === 'SKILL.md') {
          const fm = parseFrontmatter(full) || {};
          out.push({
            kind: 'skill',
            slug: fm.name || prefix || e.name.replace(/\.md$/, ''),
            path: path.relative(REPO_ROOT, full),
            frontmatter: fm,
            pillar,
          });
        }
      }
    }
    walk(dir);
  }
  return out;
}

function walkCommands() {
  const dir = path.join(REPO_ROOT, '.claude', 'commands');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => {
      const full = path.join(dir, f);
      const fm = parseFrontmatter(full) || {};
      return {
        kind: 'command',
        slug: f.replace(/\.md$/, ''),
        path: path.relative(REPO_ROOT, full),
        frontmatter: fm,
      };
    });
}

function walkAgents() {
  const dir = path.join(REPO_ROOT, '.claude', 'agents');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => {
      const full = path.join(dir, f);
      const fm = parseFrontmatter(full) || {};
      return {
        kind: 'agent',
        slug: f.replace(/\.md$/, ''),
        path: path.relative(REPO_ROOT, full),
        frontmatter: fm,
      };
    });
}

// === Trigger keyword derivation ===
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'or', 'the', 'of', 'to', 'in', 'on', 'at', 'for', 'with',
  'is', 'are', 'be', 'was', 'were', 'as', 'by', 'this', 'that', 'it', 'its',
  'use', 'uses', 'using', 'used', 'when', 'where', 'how', 'what', 'which',
  'skill', 'agent', 'command', 'workflow', 'task', 'work',
]);

function deriveKeywords(slug, frontmatter) {
  const keywords = new Set();

  // 1. Explicit override in frontmatter
  if (frontmatter.resolver_keywords && Array.isArray(frontmatter.resolver_keywords)) {
    frontmatter.resolver_keywords.forEach(k => keywords.add(String(k).toLowerCase().trim()));
    return Array.from(keywords);
  }

  // 2. Name + slug tokens
  if (frontmatter.name) {
    String(frontmatter.name).split(/[\/\-_:\s]+/).forEach(w => {
      const lw = w.toLowerCase().trim();
      if (lw.length >= 3 && !STOP_WORDS.has(lw)) keywords.add(lw);
    });
  }
  String(slug).split(/[\/\-_:]+/).forEach(w => {
    const lw = w.toLowerCase().trim();
    if (lw.length >= 3 && !STOP_WORDS.has(lw)) keywords.add(lw);
  });

  // 3. First-sentence description significant words
  if (frontmatter.description) {
    const desc = String(frontmatter.description).split(/[.!?\n]/)[0];
    desc.toLowerCase().split(/\W+/).forEach(w => {
      if (w.length >= 5 && !STOP_WORDS.has(w)) keywords.add(w);
    });
  }

  return Array.from(keywords).slice(0, 8); // cap at 8 derived keywords
}

// === Route stub generator ===
function buildRouteStub(recipient) {
  const slug = recipient.slug;
  const keywords = deriveKeywords(slug, recipient.frontmatter);
  if (keywords.length === 0) keywords.push(slug.toLowerCase());

  const stub = {
    id: `${recipient.kind}/${slug}`,
    status: 'stub',
    triggers: { keywords },
    recipient: {
      kind: recipient.kind,
      slug,
    },
    invocation: invocationFor(recipient.kind, slug),
    role_scope: ['*'],
    metadata: {
      derived: true,
      introduced_in: 'auto-sync',
      last_validated_at: new Date().toISOString().slice(0, 10),
    },
  };
  if (recipient.path) stub.recipient.path = recipient.path;
  if (recipient.pillar) stub.metadata.pillar = recipient.pillar;
  return stub;
}

function invocationFor(kind, slug) {
  switch (kind) {
    case 'skill':   return { mechanism: 'skill_tool', args: { skill: slug } };
    case 'command': return { mechanism: 'slash', args: { command: `/${slug}` } };
    case 'agent':   return { mechanism: 'subagent', args: { subagent_type: slug } };
    case 'persona': return { mechanism: 'subagent', args: { subagent_type: slug } };
    case 'mcp':     return { mechanism: 'mcp_call', args: { tool: slug } };
    case 'wiki':    return { mechanism: 'wiki_query', args: { slug } };
    default:        return { mechanism: 'shell', args: {} };
  }
}

// === Load existing routes (to skip duplicates) ===
function loadExistingRouteIds() {
  const ids = new Set();
  for (const subdir of ['routes', 'overrides']) {
    const dir = path.join(RESOLVERS_DIR, subdir);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.yaml'))) {
      try {
        const doc = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8'));
        if (doc && Array.isArray(doc.routes)) {
          for (const r of doc.routes) if (r.id) ids.add(r.id);
        }
      } catch (e) { /* ignore parse errors here; validator catches */ }
    }
  }
  return ids;
}

// === Write routes file ===
function writeRoutesFile(kind, routes) {
  const fp = path.join(ROUTES_DIR, `${kind}s.yaml`);
  const header = `# Auto-derived resolver routes for kind=${kind}\n`
    + `# Generated by scripts/resolver/sync.cjs on ${new Date().toISOString()}\n`
    + `# DO NOT EDIT BY HAND — edit knowledge/resolvers/overrides/${kind}s.yaml instead.\n`
    + `# Per .archives/cla/resolver/spec.md §11.6 + D-2 sync policy.\n\n`;
  const doc = { _generated: true, kind, routes };
  fs.writeFileSync(fp, header + yaml.dump(doc, { lineWidth: 100, noRefs: true }));
}

// === Lock management ===
function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const data = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    const ageS = (Date.now() - data.ts) / 1000;
    if (ageS < 600) throw new E.SyncLocked(data.pid, Math.floor(ageS));
  }
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, ts: Date.now() }));
}
function releaseLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch (e) { /* ignore */ }
}

// === Git ops for --auto-pr ===
function gitOp(args, opts = {}) {
  const r = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8', ...opts });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}

function checkWorkingTreeClean() {
  const status = gitOp(['status', '--porcelain']);
  // Allow knowledge/resolvers/ changes (those are ours)
  const dirty = status.split('\n').filter(l => l && !l.includes('knowledge/resolvers/'));
  if (dirty.length > 0) throw new E.WorkingTreeDirty(dirty.length);
}

function openAutoPr(addedCount) {
  const date = new Date().toISOString().slice(0, 10);
  const branch = `resolver-sync-${date}-${process.pid.toString(36)}`;
  gitOp(['checkout', '-b', branch]);
  gitOp(['add', 'knowledge/resolvers/']);
  gitOp(['commit', '-m', `chore(resolver): sync auto-derived routes (+${addedCount} stubs)\n\nGenerated by scripts/resolver/sync.cjs at ${new Date().toISOString()}.\nReview stubs in knowledge/resolvers/routes/. Hand-curate via overrides/.`]);
  gitOp(['push', '-u', 'origin', branch]);
  const ghCheck = spawnSync('which', ['gh'], { encoding: 'utf-8' });
  if (ghCheck.status !== 0) throw new E.GHCLIMissing();
  const ghResult = spawnSync('gh', ['pr', 'create', '--title', `resolver: sync ${addedCount} route stubs`, '--body', `Auto-generated by /resolver sync --auto-pr.\n\nReview stubs in knowledge/resolvers/routes/. Hand-curate via knowledge/resolvers/overrides/.`], {
    cwd: REPO_ROOT, encoding: 'utf-8',
  });
  if (ghResult.status !== 0) throw new Error('gh pr create failed: ' + ghResult.stderr);
  return ghResult.stdout.trim();
}

// === Main sync ===
function main() {
  const args = parseArgs(process.argv.slice(2));
  const allowedKinds = ['skill', 'command', 'agent'];
  const targetKinds = args.kind ? [args.kind] : allowedKinds;
  if (args.kind && !allowedKinds.includes(args.kind)) {
    console.error(`Invalid --kind=${args.kind}. Valid: ${allowedKinds.join(', ')}`);
    process.exit(1);
  }

  console.log(`[resolver sync] mode: ${args.autoPr ? '--auto-pr' : args.apply ? '--apply' : '--dry-run (default)'}`);
  console.log(`[resolver sync] kinds: ${targetKinds.join(', ')}`);

  const existingIds = loadExistingRouteIds();
  console.log(`[resolver sync] existing routes: ${existingIds.size}`);

  const allNew = {};
  let totalNew = 0;
  for (const kind of targetKinds) {
    const recipients = kind === 'skill' ? walkSkills()
      : kind === 'command' ? walkCommands()
      : walkAgents();

    const newStubs = [];
    for (const r of recipients) {
      const id = `${r.kind}/${r.slug}`;
      if (existingIds.has(id)) continue;
      // Skip if frontmatter says opt-out
      if (r.frontmatter && r.frontmatter.resolver_required === false) continue;
      newStubs.push(buildRouteStub(r));
    }
    allNew[kind] = newStubs;
    totalNew += newStubs.length;
    console.log(`[resolver sync] ${kind}s: ${recipients.length} on disk, ${newStubs.length} new stubs`);
  }

  if (totalNew === 0) {
    console.log('[resolver sync] no orphans; nothing to do');
    process.exit(0);
  }

  if (args.dryRun) {
    console.log(`\n[dry-run] would add ${totalNew} stub routes:`);
    for (const [kind, stubs] of Object.entries(allNew)) {
      for (const s of stubs.slice(0, 5)) {
        console.log(`  + ${s.id}  (keywords: ${s.triggers.keywords.slice(0, 5).join(', ')})`);
      }
      if (stubs.length > 5) console.log(`  ... and ${stubs.length - 5} more ${kind}s`);
    }
    console.log('\nRun with --apply to write locally, or --auto-pr to write + push + open PR.');
    process.exit(0);
  }

  // Apply
  try {
    acquireLock();
    fs.mkdirSync(ROUTES_DIR, { recursive: true });
    for (const [kind, stubs] of Object.entries(allNew)) {
      if (stubs.length === 0) continue;
      // Merge with existing routes in the file (if any)
      const fp = path.join(ROUTES_DIR, `${kind}s.yaml`);
      let existing = [];
      if (fs.existsSync(fp)) {
        try {
          const doc = yaml.load(fs.readFileSync(fp, 'utf8'));
          if (doc && Array.isArray(doc.routes)) existing = doc.routes;
        } catch (e) { /* ignore */ }
      }
      const combined = [...existing, ...stubs];
      writeRoutesFile(kind, combined);
      console.log(`[resolver sync] wrote ${stubs.length} new stubs to routes/${kind}s.yaml (total: ${combined.length})`);
    }

    if (args.autoPr) {
      console.log('[resolver sync] checking working tree...');
      checkWorkingTreeClean();
      console.log('[resolver sync] opening PR...');
      const prUrl = openAutoPr(totalNew);
      console.log(`[resolver sync] PR opened: ${prUrl}`);
    }
  } finally {
    releaseLock();
  }
}

if (require.main === module) main();

module.exports = { parseArgs, deriveKeywords, buildRouteStub, walkSkills, walkCommands, walkAgents, loadExistingRouteIds };
