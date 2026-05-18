#!/usr/bin/env node
// scripts/wiki-sync/rebuild-index.cjs — wiki/_index/ reverse-lookup builder.
//
// v4.0 Sprint 2 — implements `06-ai-ops/skills/wiki-sync/index-rebuild/SKILL.md`.
// Walks wiki/<source-slug>/<type>s/<entity>.md derived entities; groups by
// canonical name (slug); writes wiki/_index/<page_type>/<canonical-name>.md
// markdown link-lists. Idempotent — re-runs produce identical output.
//
// Output: deterministic. No LLM calls in v0.1. Cost: ~$0.02 (file I/O only).
//
// Flags:
//   --dry-run       — list files that would be written; no changes
//   --alias-resolve — when true, also create _index entries for frontmatter
//                     aliases: [...] arrays. Default false.
//
// Exit codes:
//   0 — success
//   1 — wiki/ folder not found
//   2 — file I/O error

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WIKI_DIR = path.join(REPO_ROOT, 'wiki');
const INDEX_DIR = path.join(WIKI_DIR, '_index');

const FLAGS = {
  dryRun: process.argv.includes('--dry-run'),
  aliasResolve: process.argv.includes('--alias-resolve'),
};

const TYPE_PLURAL_MAP = {
  concept: 'concepts',
  observation: 'observations',
  decision: 'decisions',
  idea: 'ideas',
};
const DERIVED_TYPES = ['concept', 'observation', 'decision', 'idea'];
const TYPE_FOLDERS_TO_TYPE = {
  concepts: 'concept',
  observations: 'observation',
  decisions: 'decision',
  ideas: 'idea',
};

function log(msg) {
  console.log((FLAGS.dryRun ? '[DRY-RUN] ' : '') + msg);
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const body = match[1];
  const out = {};
  let inList = null;
  for (const rawLine of body.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (inList && line.startsWith('  - ')) {
      out[inList].push(line.substring(4).trim().replace(/^['"]|['"]$/g, ''));
      continue;
    }
    inList = null;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].trim();
    if (val === '' || val === '[]') {
      out[key] = [];
      inList = key;
    } else if (val.startsWith('[') && val.endsWith(']')) {
      out[key] = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else {
      out[key] = val.replace(/^['"]|['"]$/g, '');
    }
  }
  return out;
}

function safeReadSourceTitle(sourceSlug) {
  const srcPath = path.join(WIKI_DIR, sourceSlug, 'source.md');
  if (!fs.existsSync(srcPath)) return sourceSlug;
  try {
    const fm = parseFrontmatter(fs.readFileSync(srcPath, 'utf8'));
    return (fm && fm.title) || sourceSlug;
  } catch {
    return sourceSlug;
  }
}

function walkPackages() {
  // Returns { entitiesByTypeName: { '<type>::<name>': [ {source_slug, source_title, entity_slug, file_path}, ... ] } }
  const entitiesByTypeName = new Map();

  if (!fs.existsSync(WIKI_DIR)) {
    console.error('ERROR: wiki/ not found at ' + WIKI_DIR);
    process.exit(1);
  }

  const topEntries = fs.readdirSync(WIKI_DIR, { withFileTypes: true });
  for (const top of topEntries) {
    if (!top.isDirectory()) continue;
    if (top.name === '_index') continue;
    if (top.name === 'capabilities') continue;
    if (top.name.startsWith('.') || top.name.startsWith('_')) continue;

    const sourceSlug = top.name;
    const pkgDir = path.join(WIKI_DIR, sourceSlug);
    const pkgEntries = fs.readdirSync(pkgDir, { withFileTypes: true });

    // Verify it looks like a v4 source package: has source.md OR a recognized type subfolder
    const hasSourceMd = pkgEntries.some((e) => e.isFile() && e.name === 'source.md');
    const typeSubdirs = pkgEntries.filter(
      (e) => e.isDirectory() && Object.prototype.hasOwnProperty.call(TYPE_FOLDERS_TO_TYPE, e.name),
    );
    if (!hasSourceMd && typeSubdirs.length === 0) continue;

    const sourceTitle = safeReadSourceTitle(sourceSlug);

    for (const td of typeSubdirs) {
      const pageType = TYPE_FOLDERS_TO_TYPE[td.name];
      const typeDir = path.join(pkgDir, td.name);
      const files = fs.readdirSync(typeDir, { withFileTypes: true });
      for (const f of files) {
        if (!f.isFile()) continue;
        if (!f.name.endsWith('.md')) continue;
        const entitySlug = f.name.replace(/\.md$/, '');
        const filePath = path.relative(
          REPO_ROOT,
          path.join(typeDir, f.name),
        );
        const fm = parseFrontmatter(fs.readFileSync(path.join(typeDir, f.name), 'utf8'));
        const canonicalNames = [entitySlug];
        if (FLAGS.aliasResolve && fm && Array.isArray(fm.aliases)) {
          for (const a of fm.aliases) {
            const aSlug = String(a).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (aSlug && aSlug !== entitySlug) canonicalNames.push(aSlug);
          }
        }
        for (const name of canonicalNames) {
          const key = pageType + '::' + name;
          if (!entitiesByTypeName.has(key)) entitiesByTypeName.set(key, []);
          entitiesByTypeName.get(key).push({
            source_slug: sourceSlug,
            source_title: sourceTitle,
            entity_slug: entitySlug,
            file_path: filePath,
            page_type: pageType,
          });
        }
      }
    }
  }
  return entitiesByTypeName;
}

function renderIndexFile(canonicalName, pageType, entries) {
  const generatedAt = new Date().toISOString();
  // Sort entries by source-slug for determinism
  entries.sort((a, b) => a.source_slug.localeCompare(b.source_slug));
  const lines = [
    '---',
    'type: index',
    'page_type: ' + pageType,
    'canonical_name: ' + canonicalName,
    'generated_by: wiki-sync/index-rebuild',
    'generated_at: ' + generatedAt,
    'package_count: ' + entries.length,
    '---',
    '',
    '# `' + canonicalName + '` — appears in ' + entries.length + ' package(s)',
    '',
    'Reverse-lookup link-list. This page is **derivative** — regenerated by',
    '`/wiki index rebuild`. NEVER hand-edit. Excluded from `/wiki audit` orphan checks.',
    '',
    '## Packages',
    '',
  ];
  for (const e of entries) {
    const linkPath = path.relative(
      path.join(WIKI_DIR, '_index', pageType),
      path.join(REPO_ROOT, e.file_path),
    );
    lines.push(
      '- [' + e.source_title + ' (`' + e.source_slug + '`)](' + linkPath + ')' + (e.entity_slug !== canonicalName ? '   *(aliased from `' + e.entity_slug + '`)*' : ''),
    );
  }
  lines.push('');
  return lines.join('\n');
}

function ensureIndexSkeleton() {
  if (!fs.existsSync(INDEX_DIR)) {
    if (!FLAGS.dryRun) fs.mkdirSync(INDEX_DIR, { recursive: true });
  }
  for (const t of DERIVED_TYPES) {
    const sub = path.join(INDEX_DIR, t);
    if (!fs.existsSync(sub) && !FLAGS.dryRun) fs.mkdirSync(sub, { recursive: true });
  }
}

function main() {
  log('rebuild-index starting (dry-run=' + FLAGS.dryRun + ', alias-resolve=' + FLAGS.aliasResolve + ')');
  ensureIndexSkeleton();

  const entitiesByTypeName = walkPackages();
  log('walked: ' + entitiesByTypeName.size + ' canonical names across packages');

  let written = 0;
  let unchanged = 0;

  const expectedFiles = new Set(); // for orphan cleanup
  for (const [key, entries] of entitiesByTypeName.entries()) {
    const [pageType, canonicalName] = key.split('::');
    const outFile = path.join(INDEX_DIR, pageType, canonicalName + '.md');
    expectedFiles.add(path.relative(REPO_ROOT, outFile));

    const content = renderIndexFile(canonicalName, pageType, entries);
    let existing = null;
    if (fs.existsSync(outFile)) {
      existing = fs.readFileSync(outFile, 'utf8');
    }

    // Compare ignoring generated_at line (it changes every run)
    const stripGenAt = (s) => s ? s.replace(/^generated_at:.*$/m, '') : null;
    if (stripGenAt(existing) === stripGenAt(content)) {
      unchanged += 1;
      continue;
    }
    if (!FLAGS.dryRun) {
      fs.writeFileSync(outFile, content, 'utf8');
    }
    log('  wrote ' + path.relative(REPO_ROOT, outFile));
    written += 1;
  }

  // Orphan cleanup: any file under _index/<type>/ that's not in expectedFiles
  let orphansDeleted = 0;
  if (fs.existsSync(INDEX_DIR)) {
    for (const t of DERIVED_TYPES) {
      const sub = path.join(INDEX_DIR, t);
      if (!fs.existsSync(sub)) continue;
      const files = fs.readdirSync(sub).filter((f) => f.endsWith('.md'));
      for (const f of files) {
        const rel = path.relative(REPO_ROOT, path.join(sub, f));
        if (!expectedFiles.has(rel)) {
          if (!FLAGS.dryRun) fs.unlinkSync(path.join(sub, f));
          log('  rm (orphan) ' + rel);
          orphansDeleted += 1;
        }
      }
    }
  }

  log('');
  log('Summary:');
  log('  canonical names processed: ' + entitiesByTypeName.size);
  log('  index files written:       ' + written);
  log('  index files unchanged:     ' + unchanged);
  log('  index files orphaned:      ' + orphansDeleted);
  if (FLAGS.dryRun) log('  (dry-run; no files modified)');
}

main();
