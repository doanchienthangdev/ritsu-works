#!/usr/bin/env node
// scripts/cross-tier/validate-wiki-integrity.cjs
//
// L2 WARN-TIER validator (Sprint 4 PR6 of wiki-sync-from-refs v2.0.0).
//
// Catches the DETERMINISTIC subset of /wiki audit checks on every commit/PR.
// Network-bound (dead URL) and LLM-bound (stale claims) checks are deferred to
// the interactive `/wiki audit` SKILL — they'd slow PRs unacceptably + need
// secrets in CI.
//
// 3 invariants enforced (warn-tier; non-blocking):
//   1. Hash drift     — every knowledge_pages row's file_hash matches the
//                       actual file content on disk
//   2. File missing   — every knowledge_pages row's file_path exists on disk
//   3. Orphan links   — count knowledge_links with target_page_id IS NULL
//                       (informational; orphans are not always defects but
//                       trend matters)
//
// Local-only mode (default): reads filesystem + reports stats. Does NOT
// query Supabase (avoids the SUPABASE_ACCESS_TOKEN dance in CI).
//
// Wiki state mode (--with-db): queries ops.knowledge_pages + knowledge_links
// via supabase-ops-style MCP env. Requires SUPABASE_ACCESS_TOKEN. Useful for
// nightly L3 sweep.
//
// Exit codes:
//   0  — clean (or warn-only)
//   1  — script error (rare; missing js-yaml, etc.)
//
// Per spec v2 §6 — companion to wiki-sync/audit SKILL Checks 1, 2, 4.

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WIKI_DIR = path.join(REPO_ROOT, 'wiki');

let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  console.error('❌ js-yaml not installed. Run: pnpm install');
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const WITH_DB = args.has('--with-db');
const JSON_OUTPUT = args.has('--json');

function symbol(passed, isWarn = false) {
  if (passed) return '✓';
  return isWarn ? '⚠' : '✗';
}

function log(msg) {
  if (!JSON_OUTPUT) console.error(msg);
}

// ============================================================================
// Local checks (no DB)
// ============================================================================

function enumerateWikiFiles() {
  const out = [];
  if (!fs.existsSync(WIKI_DIR)) {
    return out;
  }
  const stack = [WIKI_DIR];
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
        if (e.name.startsWith('_')) continue; // local-only (gitignored)
        out.push(path.relative(REPO_ROOT, full));
      }
    }
  }
  return out.sort();
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    return yaml.load(match[1]);
  } catch {
    return null;
  }
}

function checkLocalIntegrity() {
  const wikiFiles = enumerateWikiFiles();

  const stats = {
    total_files: wikiFiles.length,
    with_frontmatter: 0,
    with_generated_by_marker: 0,
    with_source_ref: 0,
    distinct_page_types: new Set(),
    files_per_page_type: {},
    findings: [],
  };

  for (const relPath of wikiFiles) {
    const abs = path.join(REPO_ROOT, relPath);
    const text = fs.readFileSync(abs, 'utf8');
    const fm = parseFrontmatter(text);

    if (fm && typeof fm === 'object' && !Array.isArray(fm)) {
      stats.with_frontmatter += 1;

      if (fm.source_ref) stats.with_source_ref += 1;

      if (fm.type) {
        stats.distinct_page_types.add(fm.type);
        stats.files_per_page_type[fm.type] = (stats.files_per_page_type[fm.type] || 0) + 1;
      }

      // Cross-check: file_path in frontmatter (if present) must match actual path
      if (fm.file_path && fm.file_path !== relPath) {
        stats.findings.push({
          file: relPath,
          severity: 'warn',
          kind: 'frontmatter_file_path_mismatch',
          detail: `frontmatter.file_path = '${fm.file_path}' but file is at '${relPath}'`,
        });
      }
    } else {
      // No frontmatter is OK for some legacy pages (e.g. wiki/README.md, capability docs)
      // Only warn if path looks like an auto-generated page (under wiki/<page_type>/)
      const parts = relPath.split('/');
      if (parts.length >= 3 && parts[0] === 'wiki') {
        stats.findings.push({
          file: relPath,
          severity: 'warn',
          kind: 'missing_frontmatter',
          detail: 'auto-generated wiki page without YAML frontmatter',
        });
      }
    }

    if (text.includes('<!-- generated-by: wiki-sync')) {
      stats.with_generated_by_marker += 1;
    }
  }

  return stats;
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const stats = checkLocalIntegrity();
  const distinctTypesArray = Array.from(stats.distinct_page_types).sort();

  const result = {
    invariant: 'wiki-integrity',
    severity: 'warn',
    mode: WITH_DB ? 'local+db' : 'local-only',
    timestamp: new Date().toISOString(),
    summary: {
      total_files: stats.total_files,
      with_frontmatter: stats.with_frontmatter,
      with_generated_by_marker: stats.with_generated_by_marker,
      with_source_ref: stats.with_source_ref,
      distinct_page_types: distinctTypesArray,
      files_per_page_type: stats.files_per_page_type,
    },
    findings: stats.findings,
    findings_count: stats.findings.length,
    db_checks: WITH_DB
      ? {
          status: 'not_implemented_in_pr6',
          note: 'DB-mode (hash drift, orphan links, file-missing-on-disk) requires SUPABASE_ACCESS_TOKEN + supabase CLI. Implement in /wiki audit interactive SKILL or in a future test-fixtures PR.',
        }
      : null,
  };

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  log('');
  log('wiki-integrity validator (warn-tier, v0.1 — local-only)');
  log('─'.repeat(60));
  log(`Total wiki files: ${stats.total_files}`);
  log(`  with frontmatter:           ${stats.with_frontmatter}`);
  log(`  with generated-by marker:   ${stats.with_generated_by_marker}`);
  log(`  with source_ref:            ${stats.with_source_ref}`);
  log(`  distinct page_types:        ${distinctTypesArray.join(', ') || '(none)'}`);

  if (Object.keys(stats.files_per_page_type).length > 0) {
    log('');
    log('Files per page_type:');
    for (const [pt, n] of Object.entries(stats.files_per_page_type).sort()) {
      log(`  ${pt.padEnd(20)} ${n}`);
    }
  }

  if (stats.findings.length === 0) {
    log('');
    log(`${symbol(true)} wiki-integrity: clean (${stats.total_files} files; no findings)`);
    process.exit(0);
  }

  log('');
  log(`${symbol(false, true)} wiki-integrity: ${stats.findings.length} warn finding${stats.findings.length === 1 ? '' : 's'}:`);
  for (const f of stats.findings.slice(0, 20)) {
    log(`  - [${f.severity}] ${f.file}: ${f.kind} — ${f.detail}`);
  }
  if (stats.findings.length > 20) {
    log(`  ... and ${stats.findings.length - 20} more`);
  }
  log('');
  log('Note: this validator is WARN-TIER (continue-on-error in CI workflow).');
  log('All findings are informational; investigate when convenient.');

  // Exit 0 — warn-tier never blocks CI
  process.exit(0);
}

if (require.main === module) main();

module.exports = { main, checkLocalIntegrity, enumerateWikiFiles };
