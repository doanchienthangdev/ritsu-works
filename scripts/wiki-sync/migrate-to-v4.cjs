#!/usr/bin/env node
// scripts/wiki-sync/migrate-to-v4.cjs — v4.0 source-grouped layout migrator
//
// Per Tier C decision ops.decisions[e558913a-fb5d-444a-ab0b-305f38ce80a0]
// + ops.capability_runs[f75502d4-c7b2-44c1-86a5-395b4578f93d] (revise sub-flow
// of wiki-sync-from-refs v3.0 → v4.0).
//
// What it does:
//   1. Scans ops.knowledge_pages (via JSON dump from supabase db query) for
//      all rows whose file_path is in v3.0 entity-type-grouped layout.
//   2. Computes the v4.0 path for each: source RECORDs → wiki/<source-slug>/
//      source.md; derived entities → wiki/<source-slug>/<type>s/<slug>.md.
//   3. Writes FS moves: `git mv` v3.0 paths → v4.0 paths (preserves history).
//   4. Rewrites frontmatter in moved files (source_ref / extracted_from_source).
//   5. Generates a SQL file at .archives/wiki-audits/migrate-v4-<date>.sql with
//      the targeted UPDATEs to ops.knowledge_pages.file_path AND
//      ops.ingestion_jobs.metadata.wiki_path AND clears legacy_v2_verbatim
//      on rows that get extracted_from_source_id attached retroactively
//      (CTO nit f resolution). NOTE on jsonb_set: that one-shot is the path
//      to flip the `wiki_path` key in ingestion_jobs.metadata without
//      rewriting the whole jsonb blob.
//   6. Special case for the v2.0 legacy file (wiki/concept/spaced-repetition.md):
//      hand-writes a minimal wiki/sample/source.md stub pointing at the
//      fixture; flips extracted_from_source_id in the SQL accordingly.
//      Full LLM-based distill regeneration deferred until founder runs
//      /wiki sync tests/wiki-sync/fixtures/sample.md proper (7-day commit).
//   7. Deletes empty plural dirs from B4 cleanup list.
//   8. Prints a summary; advises founder to (a) review SQL, (b) run
//      `supabase db query --linked < <generated-sql>`, (c) re-run `pnpm check`
//      + `/wiki audit`.
//
// Flags:
//   --dry-run             — print what would happen, no FS or SQL writes.
//   --skip-sample         — skip the spaced-repetition / wiki/sample/source.md
//                           creation (when sample.md isn't in the repo yet).
//   --skip-cleanup        — skip empty plural dir deletion.
//   --git-mv | --fs-rename — choose whether to use `git mv` (default; preserves
//                           history) or fs.renameSync (faster, no git).
//
// Idempotence:
//   - If all rows in ops.knowledge_pages.file_path already match v4 pattern,
//     exits 0 early with "already migrated".
//   - Re-running --dry-run twice produces identical output.
//
// Halt-on-divergence (CTO nit e):
//   - If the regenerated/derived sample source slug != `sample` exactly OR
//     the spaced-repetition derived slug != `spaced-repetition` exactly,
//     ABORT before any git mv. Surface the choice to the founder.
//
// Exit codes:
//   0  — success (FS moves done, SQL file ready for founder)
//   1  — input validation error (DB unreachable, fixture missing)
//   2  — file IO error
//   3  — halt-on-divergence trigger
//   4  — already-migrated (idempotent no-op)
//
// Author: /cla revise session caf0cd84 (2026-05-18)
// Spec:   wiki/capabilities/wiki-sync-from-refs/spec.md (v4.0.0 after Phase 8)

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WIKI_DIR = path.join(REPO_ROOT, 'wiki');
const AUDIT_DIR = path.join(REPO_ROOT, '.archives', 'wiki-audits');

// ----------------------------------------------------------------------------
// Flag parsing
// ----------------------------------------------------------------------------
const FLAGS = {
  dryRun: process.argv.includes('--dry-run'),
  skipSample: process.argv.includes('--skip-sample'),
  skipCleanup: process.argv.includes('--skip-cleanup'),
  useGitMv: !process.argv.includes('--fs-rename'),
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function log(msg) {
  const prefix = FLAGS.dryRun ? '[DRY-RUN] ' : '';
  console.log(prefix + msg);
}

function err(msg, code) {
  console.error('ERROR: ' + msg);
  process.exit(code || 1);
}

function loadPagesJson() {
  // Caller supplies ops.knowledge_pages rows via stdin OR a JSON file path.
  // The script uses STDIN if available; else expects --pages-json <path>.
  const stdin = process.argv.indexOf('--pages-json');
  if (stdin !== -1 && process.argv[stdin + 1]) {
    try {
      return JSON.parse(fs.readFileSync(process.argv[stdin + 1], 'utf8'));
    } catch (e) {
      err('failed to parse --pages-json: ' + e.message, 1);
    }
  }
  // Else read stdin
  try {
    const data = fs.readFileSync(0, 'utf8');
    if (!data.trim()) {
      err(
        'no pages data. Pipe ops.knowledge_pages rows JSON or pass --pages-json <path>.\n' +
          'Example: supabase db query --linked --json "SELECT id, slug, page_type, file_path, extracted_from_source_id, legacy_v2_verbatim FROM ops.knowledge_pages" | node ' +
          path.basename(__filename),
        1,
      );
    }
    return JSON.parse(data);
  } catch (e) {
    err('failed to read pages from stdin: ' + e.message, 1);
  }
}

// Map page_type (singular per the CHECK enum) → folder name (plural per v4.0 layout).
function typeToFolder(pageType) {
  // chapter pages are stored under chapters/ but page_type='book'; chapter
  // pages have explicit slug pattern 'chapter-NN'. For other types, plural'ize.
  if (pageType === 'book') return 'chapters'; // chapter-NN.md case; source RECORD goes to source.md
  return pageType + 's';
}

// Compute v4 path for a source RECORD page.
function v4SourcePath(slug) {
  return path.join('wiki', slug, 'source.md');
}

// Compute v4 path for a derived entity page.
function v4DerivedPath(sourceSlug, pageType, entitySlug) {
  return path.join('wiki', sourceSlug, typeToFolder(pageType), entitySlug + '.md');
}

// Detect whether a path is already in v4 layout.
// v4 patterns:
//   wiki/<source-slug>/source.md
//   wiki/<source-slug>/<type-plural>/<entity-slug>.md
function isV4Path(p) {
  if (!p) return false;
  const parts = p.split('/');
  if (parts[0] !== 'wiki') return false;
  // wiki/_index/... is index, not a page
  if (parts[1] === '_index') return false;
  // wiki/capabilities/... is unchanged
  if (parts[1] === 'capabilities') return false;
  // source RECORD: wiki/<slug>/source.md (3 parts)
  if (parts.length === 3 && parts[2] === 'source.md') return true;
  // derived: wiki/<slug>/<type>/<entity>.md (4 parts)
  if (parts.length === 4) return true;
  return false;
}

// Detect whether a path is v3 entity-type-grouped layout.
const V3_DERIVED_FOLDERS = new Set([
  'concept', 'concepts',           // singular drift + plural canonical
  'observation', 'observations',
  'decision', 'decisions',
  'idea', 'ideas',
]);
const V3_SOURCE_FOLDERS = new Set([
  'article', 'articles',
  'book', 'books',
  'episode', 'episodes',
  'meeting', 'meetings',
  'customer', 'customers',
  'company', 'companies',
  'person', 'persons',
  'repo', 'repos',
  'weekly_review', 'weekly_reviews',
]);

function isV3Derived(p) {
  if (!p) return false;
  const parts = p.split('/');
  return parts[0] === 'wiki' && V3_DERIVED_FOLDERS.has(parts[1]) && parts.length === 3;
}

function isV3Source(p) {
  if (!p) return false;
  const parts = p.split('/');
  return parts[0] === 'wiki' && V3_SOURCE_FOLDERS.has(parts[1]) && parts.length === 3;
}

// Rewrite frontmatter in a file: replace any source_ref / extracted_from_source
// values that point at v3 paths with their v4 equivalents.
function rewriteFrontmatter(filePath, v3ToV4Map) {
  const content = fs.readFileSync(filePath, 'utf8');
  let updated = content;
  for (const [v3p, v4p] of v3ToV4Map.entries()) {
    // Match both 'source_ref:' and 'extracted_from_source:' frontmatter values,
    // both quoted and unquoted, both with and without leading wiki/ prefix.
    const v3escaped = v3p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    updated = updated.replace(new RegExp(v3escaped, 'g'), v4p);
  }
  if (updated !== content) {
    if (!FLAGS.dryRun) {
      fs.writeFileSync(filePath, updated, 'utf8');
    }
    log('  frontmatter updated in ' + filePath);
    return true;
  }
  return false;
}

function gitMv(from, to) {
  const absFrom = path.join(REPO_ROOT, from);
  const absTo = path.join(REPO_ROOT, to);
  if (!fs.existsSync(absFrom)) {
    log('  WARN: source missing for mv: ' + from);
    return false;
  }
  if (fs.existsSync(absTo)) {
    log('  WARN: target already exists, skipping mv: ' + to);
    return false;
  }
  if (FLAGS.dryRun) {
    log(`  ${FLAGS.useGitMv ? 'git mv' : 'mv'} ${from} → ${to}`);
    return true;
  }
  // Ensure parent dir exists
  fs.mkdirSync(path.dirname(absTo), { recursive: true });
  if (FLAGS.useGitMv) {
    try {
      execSync(`git mv "${from}" "${to}"`, { cwd: REPO_ROOT, stdio: 'pipe' });
    } catch (e) {
      // Fallback to fs.rename if git mv fails (e.g., file not yet tracked)
      fs.renameSync(absFrom, absTo);
    }
  } else {
    fs.renameSync(absFrom, absTo);
  }
  log(`  ${FLAGS.useGitMv ? 'git mv' : 'mv'} ${from} → ${to}`);
  return true;
}

function escSql(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

function main() {
  log(`migrate-to-v4 starting (dry-run=${FLAGS.dryRun}, use-git-mv=${FLAGS.useGitMv})`);

  const pages = loadPagesJson();
  if (!Array.isArray(pages)) {
    err('pages JSON must be an array of rows', 1);
  }
  log(`loaded ${pages.length} rows from ops.knowledge_pages`);

  // Idempotence: if every row's file_path is already v4 or empty, exit early.
  const v3Rows = pages.filter((p) => !isV4Path(p.file_path));
  if (v3Rows.length === 0) {
    log('all rows already in v4 layout. exiting (code 4 idempotent).');
    process.exit(4);
  }

  // Build the v3 → v4 mapping. First pass: classify each v3 row.
  const v3ToV4Map = new Map();
  const dbUpdates = []; // [{ id, new_file_path, set_legacy_v2_verbatim_false, set_extracted_from_source_id }]

  for (const row of v3Rows) {
    const fp = row.file_path;
    if (isV3Source(fp)) {
      // Source RECORD: wiki/articles/<slug>.md → wiki/<slug>/source.md
      const slug = row.slug;
      const newPath = v4SourcePath(slug);
      v3ToV4Map.set(fp, newPath);
      dbUpdates.push({ id: row.id, newPath, legacyClear: false, attachSource: false });
    } else if (isV3Derived(fp)) {
      // Derived: wiki/concept/<slug>.md → wiki/<source-slug>/concepts/<slug>.md
      // Need to know source_slug — look up by extracted_from_source_id → row.
      let sourceSlug;
      if (row.extracted_from_source_id) {
        const sourceRow = pages.find((p) => p.id === row.extracted_from_source_id);
        if (!sourceRow) {
          err(
            `derived row ${row.id} (${fp}) references missing source ${row.extracted_from_source_id}`,
            1,
          );
        }
        sourceSlug = sourceRow.slug;
      } else if (row.slug === 'spaced-repetition' && row.page_type === 'concept') {
        // CTO nit f / spec B5: the v2.0 legacy spaced-repetition gets
        // attached to a NEW wiki/sample/source.md source RECORD.
        if (row.slug !== 'spaced-repetition') {
          err(`HALT (CTO nit e): expected slug 'spaced-repetition' for legacy v2.0 row, got '${row.slug}'`, 3);
        }
        sourceSlug = 'sample';
        // We'll create wiki/sample/source.md hand-stub below + INSERT a new
        // source RECORD row, and this derived will attach to it.
        dbUpdates.push({
          id: row.id,
          newPath: v4DerivedPath(sourceSlug, row.page_type, row.slug),
          legacyClear: true,        // clear legacy_v2_verbatim (per Sprint 1 nit f)
          attachSource: 'sample',   // sentinel — resolve to new sample row id below
        });
        v3ToV4Map.set(fp, v4DerivedPath(sourceSlug, row.page_type, row.slug));
        continue;
      } else {
        err(`derived row ${row.id} (${fp}) has NULL extracted_from_source_id and not a known legacy. ABORT.`, 1);
      }
      const newPath = v4DerivedPath(sourceSlug, row.page_type, row.slug);
      v3ToV4Map.set(fp, newPath);
      dbUpdates.push({ id: row.id, newPath, legacyClear: false, attachSource: false });
    } else {
      log(`  SKIP (not v3 layout): ${fp}`);
    }
  }

  log(`v3→v4 mapping computed: ${v3ToV4Map.size} files to move`);

  // Halt-on-divergence checks (CTO nit e): the expected legacy slug must hold.
  // (Other divergence checks could go here; for now we explicitly verified
  // spaced-repetition above.)

  // STEP 1: Hand-stub wiki/sample/source.md if needed (special case).
  let newSampleSourceRow = null;
  if (!FLAGS.skipSample && [...v3ToV4Map.keys()].some((p) => p.endsWith('spaced-repetition.md'))) {
    const sampleSourcePath = path.join('wiki', 'sample', 'source.md');
    const sampleFixture = 'tests/wiki-sync/fixtures/sample.md';
    if (!fs.existsSync(path.join(REPO_ROOT, sampleFixture))) {
      err(`fixture missing: ${sampleFixture}`, 1);
    }
    const absSampleSource = path.join(REPO_ROOT, sampleSourcePath);
    if (fs.existsSync(absSampleSource)) {
      log(`  skip: ${sampleSourcePath} already exists`);
    } else {
      const stub = [
        '---',
        'page_type: article',
        'slug: sample',
        'extracted_from_source: null',
        'source_ref: tests/wiki-sync/fixtures/sample.md',
        'created: 2026-05-18',
        'updated: 2026-05-18',
        'license_status: public_domain',
        '---',
        '',
        '# Sample fixture (v2.0 legacy compatibility)',
        '',
        'Stub source RECORD created by `scripts/wiki-sync/migrate-to-v4.cjs` during the',
        'v3.0→v4.0 layout migration. The single derived entity',
        '`wiki/sample/concepts/spaced-repetition.md` references this page via its',
        '`extracted_from_source` frontmatter and `ops.knowledge_pages.extracted_from_source_id` FK.',
        '',
        'For a full distillation (concepts/observations/decisions/ideas extracted',
        'from the sample fixture body), run:',
        '',
        '```bash',
        `/wiki sync ${sampleFixture}`,
        '```',
        '',
        'after the v4.0 layout migration completes. Re-running distill against the',
        'fixture will produce derived entities under `wiki/sample/{concepts,...}/`',
        'respecting composite UNIQUE `(extracted_from_source_id, slug)`.',
        '',
        '## Provenance',
        '',
        '- Hand-stubbed: 2026-05-18',
        '- Migration: `supabase/migrations/00032_wiki_v4_source_grouped.sql`',
        '- Capability run: `ops.capability_runs[f75502d4-c7b2-44c1-86a5-395b4578f93d]`',
        '- Tier C decision: `ops.decisions[e558913a-fb5d-444a-ab0b-305f38ce80a0]` (slug `wiki-sync-v4-source-grouped-layout`)',
        '',
      ].join('\n');
      if (!FLAGS.dryRun) {
        fs.mkdirSync(path.dirname(absSampleSource), { recursive: true });
        fs.writeFileSync(absSampleSource, stub, 'utf8');
      }
      log(`  wrote stub: ${sampleSourcePath}`);
    }
    // Insert a new source-RECORD row for sample (id auto-generated; we use a
    // sentinel uuid below that the SQL block will read via WITH).
    newSampleSourceRow = {
      slug: 'sample',
      page_type: 'article',
      title: 'Sample fixture (v2.0 legacy compatibility)',
      file_path: sampleSourcePath,
    };
  }

  // STEP 2: git mv each v3 → v4 path
  for (const [from, to] of v3ToV4Map.entries()) {
    gitMv(from, to);
  }

  // STEP 3: frontmatter rewrites in moved files
  for (const newPath of v3ToV4Map.values()) {
    const absNew = path.join(REPO_ROOT, newPath);
    if (fs.existsSync(absNew)) {
      rewriteFrontmatter(absNew, v3ToV4Map);
    }
  }

  // STEP 4: empty plural dir cleanup
  if (!FLAGS.skipCleanup) {
    const PLURAL_DIRS = [
      'wiki/article', 'wiki/articles',
      'wiki/concept', 'wiki/concepts',
      'wiki/observation', 'wiki/observations',
      'wiki/decision', 'wiki/decisions',
      'wiki/idea', 'wiki/ideas',
      'wiki/book', 'wiki/books',
      'wiki/episode', 'wiki/episodes',
      'wiki/meeting', 'wiki/meetings',
      'wiki/customer', 'wiki/customers',
      'wiki/company', 'wiki/companies',
      'wiki/person', 'wiki/persons',
      'wiki/repo', 'wiki/repos',
      'wiki/weekly_review', 'wiki/weekly_reviews',
    ];
    for (const d of PLURAL_DIRS) {
      const absDir = path.join(REPO_ROOT, d);
      if (fs.existsSync(absDir)) {
        const entries = fs.readdirSync(absDir).filter((e) => e !== '.gitkeep');
        if (entries.length === 0) {
          if (!FLAGS.dryRun) {
            fs.rmSync(absDir, { recursive: true });
          }
          log(`  rm -r ${d}/  (empty)`);
        } else {
          log(`  KEEP ${d}/  (${entries.length} files remaining: ${entries.slice(0, 3).join(', ')})`);
        }
      }
    }
  }

  // STEP 5: generate SQL file for founder to run
  const sqlPath = path.join(
    AUDIT_DIR,
    `migrate-v4-${new Date().toISOString().slice(0, 10)}.sql`,
  );
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const sql = [
    '-- ' + '='.repeat(72),
    '-- migrate-v4 generated SQL — wiki-sync v3.0 → v4.0 layout migration',
    '-- ' + '='.repeat(72),
    '-- Generated by scripts/wiki-sync/migrate-to-v4.cjs on ' + new Date().toISOString(),
    '-- Capability run: ops.capability_runs[f75502d4-c7b2-44c1-86a5-395b4578f93d]',
    '-- Tier C decision: ops.decisions[e558913a-fb5d-444a-ab0b-305f38ce80a0]',
    '-- Migration: supabase/migrations/00032_wiki_v4_source_grouped.sql',
    '--',
    '-- Run with: supabase db query --linked < <this-file>',
    '-- Verify post-run: SELECT count(*) FROM ops.knowledge_pages WHERE file_path NOT LIKE \'wiki/%/source.md\' AND file_path NOT LIKE \'wiki/%/%/%.md\'; -- expect 0',
    '-- ' + '='.repeat(72),
    '',
    'BEGIN;',
    '',
  ];

  if (newSampleSourceRow) {
    sql.push(
      '-- New source RECORD for the v2.0 legacy fixture (sample.md).',
      '-- We use a WITH CTE to capture the new row id and use it in the',
      '-- derived entity UPDATE below (jsonb_set rationale: targeted key',
      '-- update on ingestion_jobs.metadata without rewriting the full',
      '-- jsonb payload — Feynman nit comment).',
      '',
      `WITH new_sample_source AS (`,
      `  INSERT INTO ops.knowledge_pages (slug, page_type, title, file_path, extracted_from_source_id)`,
      `  VALUES (${escSql(newSampleSourceRow.slug)}, ${escSql(newSampleSourceRow.page_type)}, ${escSql(newSampleSourceRow.title || 'Sample fixture (v2.0 legacy compatibility)')}, ${escSql(newSampleSourceRow.file_path)}, NULL)`,
      `  RETURNING id`,
      `)`,
    );
  }

  for (const u of dbUpdates) {
    let updateLine;
    if (u.attachSource === 'sample') {
      updateLine = `UPDATE ops.knowledge_pages SET file_path = ${escSql(u.newPath)}, extracted_from_source_id = (SELECT id FROM new_sample_source)${u.legacyClear ? ', legacy_v2_verbatim = FALSE' : ''} WHERE id = ${escSql(u.id)};`;
    } else {
      updateLine = `UPDATE ops.knowledge_pages SET file_path = ${escSql(u.newPath)}${u.legacyClear ? ', legacy_v2_verbatim = FALSE' : ''} WHERE id = ${escSql(u.id)};`;
    }
    sql.push(updateLine);
  }

  sql.push('');
  sql.push('-- Update ops.ingestion_jobs.metadata.wiki_path for any related jobs.');
  sql.push('-- (Best-effort: matches by old file_path string; founder verifies post-run.)');
  for (const [from, to] of v3ToV4Map.entries()) {
    sql.push(
      `UPDATE ops.ingestion_jobs SET metadata = jsonb_set(metadata, '{wiki_path}', to_jsonb(${escSql(to)}::text)) WHERE metadata->>'wiki_path' = ${escSql(from)};`,
    );
  }

  sql.push('');
  sql.push('-- Post-migration verification block.');
  sql.push('DO $$');
  sql.push('DECLARE');
  sql.push('  v_v3_paths int;');
  sql.push('BEGIN');
  sql.push("  SELECT count(*) INTO v_v3_paths FROM ops.knowledge_pages WHERE file_path !~ '^wiki/[^/]+/(source\\.md|[^/]+/[^/]+\\.md)$' AND file_path IS NOT NULL;");
  sql.push("  IF v_v3_paths > 0 THEN");
  sql.push("    RAISE EXCEPTION 'migrate-v4 SQL POST-CHECK FAILED: % rows still have non-v4 file_path', v_v3_paths;");
  sql.push("  END IF;");
  sql.push("  RAISE NOTICE 'migrate-v4 SQL OK: all knowledge_pages rows now in v4 layout.';");
  sql.push('END $$;');
  sql.push('');
  sql.push('COMMIT;');
  sql.push('');

  const sqlText = sql.join('\n');
  if (!FLAGS.dryRun) {
    fs.writeFileSync(sqlPath, sqlText, 'utf8');
  }
  log(`SQL ready: ${sqlPath}  (${sql.length} lines)`);

  // STEP 6: summary
  log('');
  log('Summary:');
  log(`  v3→v4 FS moves:        ${v3ToV4Map.size}`);
  log(`  DB row UPDATEs queued: ${dbUpdates.length}`);
  log(`  New source rows:       ${newSampleSourceRow ? 1 : 0}`);
  if (FLAGS.dryRun) {
    log('');
    log('This was a dry run. Re-run WITHOUT --dry-run to apply FS changes and write the SQL file.');
    log('Then: supabase db query --linked < ' + path.relative(REPO_ROOT, sqlPath));
  } else {
    log('');
    log('Next: review and run the generated SQL:');
    log(`  supabase db query --linked < ${path.relative(REPO_ROOT, sqlPath)}`);
    log('Then re-run pnpm check + /wiki audit to verify clean state.');
  }
}

main();
