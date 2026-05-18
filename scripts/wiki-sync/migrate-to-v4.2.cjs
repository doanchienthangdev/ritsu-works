#!/usr/bin/env node
// scripts/wiki-sync/migrate-to-v4.2.cjs — Move legacy top-level wiki/ packages
// into a namespace folder.
//
// Per wiki-sync-from-refs v4.2 extension. Top-level packages (created before
// v4.2 namespace output landed) need to be retrofitted into a namespace
// folder to avoid future name conflicts and to preserve provenance ("these
// 11 folders all came from raw/5-star/").
//
// What it does:
//   1. Validates target namespace doesn't exist OR is empty.
//   2. git mv each named top-level folder into wiki/<namespace>/<folder>/.
//   3. Rewrites frontmatter inside moved files (source_ref, extracted_from_source)
//      to point at new paths.
//   4. Generates a SQL file at .archives/wiki-audits/migrate-v42-<date>.sql
//      with UPDATE statements for ops.knowledge_pages.file_path.
//   5. Prints a summary + next steps.
//
// Flags:
//   --namespace=<name>     (required) target namespace folder under wiki/
//   --folders=<f1,f2,...>  (required) comma-separated top-level wiki/ folders
//                          to move. Each must exist + must be a directory.
//   --dry-run              show what would happen, no FS/SQL writes
//   --fs-rename            use fs.renameSync instead of git mv (no history)
//
// Exit codes:
//   0  — success
//   1  — input validation error
//   2  — FS error
//   3  — target namespace conflict (already exists with content)

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WIKI_DIR = path.join(REPO_ROOT, 'wiki');
const AUDIT_DIR = path.join(REPO_ROOT, '.archives', 'wiki-audits');

const FLAGS = {
  dryRun: process.argv.includes('--dry-run'),
  useGitMv: !process.argv.includes('--fs-rename'),
};

function log(msg) {
  console.log((FLAGS.dryRun ? '[DRY-RUN] ' : '') + msg);
}
function err(msg, code) {
  console.error('ERROR: ' + msg);
  process.exit(code || 1);
}

function escSql(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function gitMv(fromRel, toRel) {
  const absFrom = path.join(REPO_ROOT, fromRel);
  const absTo = path.join(REPO_ROOT, toRel);
  if (!fs.existsSync(absFrom)) {
    log('  WARN: source missing: ' + fromRel);
    return false;
  }
  if (fs.existsSync(absTo)) {
    log('  WARN: target exists, skipping: ' + toRel);
    return false;
  }
  if (FLAGS.dryRun) {
    log(`  ${FLAGS.useGitMv ? 'git mv' : 'mv'} ${fromRel} → ${toRel}`);
    return true;
  }
  fs.mkdirSync(path.dirname(absTo), { recursive: true });
  if (FLAGS.useGitMv) {
    try {
      execSync(`git mv "${fromRel}" "${toRel}"`, { cwd: REPO_ROOT, stdio: 'pipe' });
    } catch (e) {
      fs.renameSync(absFrom, absTo);
    }
  } else {
    fs.renameSync(absFrom, absTo);
  }
  log(`  ${FLAGS.useGitMv ? 'git mv' : 'mv'} ${fromRel} → ${toRel}`);
  return true;
}

function rewriteFrontmatter(absFile, pathReplacements) {
  if (!fs.existsSync(absFile)) return false;
  const content = fs.readFileSync(absFile, 'utf8');
  let updated = content;
  for (const [from, to] of pathReplacements.entries()) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    updated = updated.replace(new RegExp(escaped, 'g'), to);
  }
  if (updated !== content) {
    if (!FLAGS.dryRun) {
      fs.writeFileSync(absFile, updated, 'utf8');
    }
    return true;
  }
  return false;
}

function walkMdFiles(rootAbs) {
  const out = [];
  const stack = [rootAbs];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.markdown'))) {
        out.push(full);
      }
    }
  }
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const nsMatch = argv.find((a) => a.startsWith('--namespace='));
  const foldersMatch = argv.find((a) => a.startsWith('--folders='));

  if (!nsMatch || !foldersMatch || argv.includes('--help') || argv.includes('-h')) {
    console.error('Usage: node scripts/wiki-sync/migrate-to-v4.2.cjs --namespace=<name> --folders=<f1,f2,...> [--dry-run] [--fs-rename]');
    console.error('');
    console.error('Moves legacy top-level wiki/<folder>/ packages into a v4.2 namespace');
    console.error('wiki/<namespace>/<folder>/. Rewrites frontmatter paths in moved files.');
    console.error('Generates SQL file for ops.knowledge_pages.file_path UPDATEs.');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/wiki-sync/migrate-to-v4.2.cjs \\');
    console.error('    --namespace=5-star \\');
    console.error('    --folders=01-positioning-bravo,02-presence-website-blueprint,03-copywriting-persuasion,04-process-customer-closer,05-competitor-audience-research,06-seo-content-ranking,07-link-building-digital-pr,08-paid-advertising,09-content-strategy-full-funnel,10-email-marketing-automation,11-customer-lifetime-value');
    process.exit(1);
  }

  const namespace = nsMatch.split('=')[1];
  const folders = foldersMatch.split('=')[1].split(',').filter(Boolean);

  if (!namespace) err('--namespace value is required', 1);
  if (folders.length === 0) err('--folders must contain at least one entry', 1);

  log(`migrate-to-v4.2 starting (namespace=${namespace}, folders=${folders.length})`);

  // Validate target namespace
  const nsAbs = path.join(WIKI_DIR, namespace);
  if (fs.existsSync(nsAbs)) {
    const nsEntries = fs.readdirSync(nsAbs).filter((e) => e !== '.gitkeep');
    if (nsEntries.length > 0) {
      err(`Target namespace wiki/${namespace}/ already exists with content (${nsEntries.length} entries). Choose a different --namespace or merge manually.`, 3);
    }
  }

  // Validate each folder exists + collect file lists
  const moves = [];      // [{ from: 'wiki/01-..', to: 'wiki/5-star/01-..', mdFiles: [...] }]
  for (const f of folders) {
    const fromAbs = path.join(WIKI_DIR, f);
    if (!fs.existsSync(fromAbs)) {
      err(`Folder wiki/${f}/ does not exist`, 1);
    }
    const stat = fs.statSync(fromAbs);
    if (!stat.isDirectory()) {
      err(`wiki/${f} is not a directory`, 1);
    }
    const mdFiles = walkMdFiles(fromAbs).map((p) => path.relative(REPO_ROOT, p));
    moves.push({
      from: path.join('wiki', f),
      to: path.join('wiki', namespace, f),
      md_files: mdFiles,
    });
  }

  // Path replacement map for frontmatter rewrites
  const pathReplacements = new Map();
  for (const m of moves) {
    pathReplacements.set(m.from + '/', m.to + '/');
  }

  // Step 1: git mv each folder
  log('');
  log('STEP 1: FS moves');
  for (const m of moves) {
    gitMv(m.from, m.to);
  }

  // Step 2: frontmatter rewrites in moved files
  log('');
  log('STEP 2: frontmatter rewrites');
  let rewriteCount = 0;
  for (const m of moves) {
    // After move, files are now at the new path
    for (const oldRel of m.md_files) {
      // Translate to new path
      const newRel = oldRel.replace(new RegExp('^' + m.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/'), m.to + '/');
      const newAbs = path.join(REPO_ROOT, newRel);
      if (rewriteFrontmatter(newAbs, pathReplacements)) {
        rewriteCount++;
      }
    }
  }
  log(`  ${rewriteCount} files updated`);

  // Step 3: generate SQL
  log('');
  log('STEP 3: generate SQL');
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const sqlPath = path.join(
    AUDIT_DIR,
    `migrate-v42-${new Date().toISOString().slice(0, 10)}.sql`,
  );

  const sql = [
    '-- ' + '='.repeat(72),
    '-- migrate-v4.2 generated SQL — wiki-sync v4.1 → v4.2 namespace retrofit',
    '-- ' + '='.repeat(72),
    `-- Generated by scripts/wiki-sync/migrate-to-v4.2.cjs on ${new Date().toISOString()}`,
    `-- Namespace: ${namespace}`,
    `-- Folders moved (${folders.length}): ${folders.join(', ')}`,
    '--',
    '-- Run with: supabase db query --linked < <this-file>',
    '-- Verify: SELECT count(*) FROM ops.knowledge_pages',
    '--           WHERE file_path !~ \'^wiki/[^/]+(/[^/]+)?/(source\\.md|(concepts|observations|decisions|ideas|chapters)/[^/]+\\.md)$\';',
    '--         -- expect 0',
    '-- ' + '='.repeat(72),
    '',
    'BEGIN;',
    '',
  ];

  for (const m of moves) {
    sql.push(
      `UPDATE ops.knowledge_pages SET file_path = ${escSql(m.to + '/')} || substring(file_path FROM ${m.from.length + 2}) WHERE file_path LIKE ${escSql(m.from + '/%')};`,
    );
  }

  sql.push('');
  sql.push('-- Update ops.ingestion_jobs.metadata.wiki_path values that reference moved paths');
  for (const m of moves) {
    sql.push(
      `UPDATE ops.ingestion_jobs SET metadata = jsonb_set(metadata, '{wiki_path}', to_jsonb(${escSql(m.to + '/')} || substring(metadata->>'wiki_path' FROM ${m.from.length + 2}))) WHERE metadata->>'wiki_path' LIKE ${escSql(m.from + '/%')};`,
    );
  }

  sql.push('');
  sql.push('-- Post-migration verification');
  sql.push('DO $$');
  sql.push('DECLARE');
  sql.push('  v_bad_paths int;');
  sql.push('BEGIN');
  sql.push("  SELECT count(*) INTO v_bad_paths FROM ops.knowledge_pages");
  sql.push("    WHERE file_path !~ '^wiki/[^/]+(/[^/]+)?/(source\\.md|(concepts|observations|decisions|ideas|chapters)/[^/]+\\.md)$'");
  sql.push("      AND file_path IS NOT NULL;");
  sql.push("  IF v_bad_paths > 0 THEN");
  sql.push("    RAISE EXCEPTION 'migrate-v4.2 SQL POST-CHECK FAILED: % rows still have non-v4.2 file_path', v_bad_paths;");
  sql.push("  END IF;");
  sql.push("  RAISE NOTICE 'migrate-v4.2 SQL OK: all knowledge_pages rows now in v4.x layout (single or multi-package).';");
  sql.push('END $$;');
  sql.push('');
  sql.push('COMMIT;');
  sql.push('');

  if (!FLAGS.dryRun) {
    fs.writeFileSync(sqlPath, sql.join('\n'), 'utf8');
  }
  log(`  SQL ready: ${path.relative(REPO_ROOT, sqlPath)} (${sql.length} lines)`);

  log('');
  log('Summary:');
  log(`  Namespace: wiki/${namespace}/`);
  log(`  Folders moved: ${folders.length}`);
  log(`  Frontmatter files rewritten: ${rewriteCount}`);
  if (FLAGS.dryRun) {
    log('');
    log('This was a dry run. Re-run WITHOUT --dry-run to apply FS changes.');
  } else {
    log('');
    log('Next: review and run the generated SQL:');
    log(`  supabase db query --linked < ${path.relative(REPO_ROOT, sqlPath)}`);
  }
}

main();
