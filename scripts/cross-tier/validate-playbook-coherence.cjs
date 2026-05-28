#!/usr/bin/env node
/**
 * L1 validator — playbook-builder coherence
 *
 * Checks 5 invariants of the AI-Native Company Playbook bundle at
 * .archives/ritsu-handoff-bundle/playbook/. Skip-if-absent for CI/clean
 * clones (the bundle is gitignored — local-only artifact).
 *
 * Invariants:
 *   1. Every chapter file in CHAPTER_ORDER (build_pdf.py)
 *   2. Every CHAPTER_ORDER entry has a matching file
 *   3. TOC version (`**Phiên bản:** vX.Y`) == build_pdf.py pdf_path version
 *   4. TOC version == build_pdf.py cover-meta version
 *   5. TOC date (`cập nhật cuối: YYYY-MM-DD`) >= youngest chapter file mtime
 *
 * Exit codes:
 *   0 — clean OR bundle absent (skip)
 *   1 — any FAIL invariant (rare — most are warn)
 *
 * Output format (matches pnpm check convention):
 *   ✓ playbook bundle present  N chapters  vX.Y current
 *   ⚠ <warn>...
 *   ✗ <fail>...
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const PLAYBOOK = path.join(ROOT, '.archives/ritsu-handoff-bundle/playbook');
const TOC = path.join(PLAYBOOK, '00-toc.md');
const BUILD_PDF = path.join(PLAYBOOK, 'build_pdf.py');
const CHAPTERS_DIR = path.join(PLAYBOOK, 'chapters');

// Skip if bundle not present (CI / clean clones)
if (!fs.existsSync(PLAYBOOK)) {
  console.log('  (skip — .archives/ritsu-handoff-bundle/playbook/ not present; gitignored, local-only)');
  process.exit(0);
}

let warn = 0;
let fail = 0;

// Helper — read file, return null if missing
const readOrNull = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);

const toc = readOrNull(TOC);
const buildPdf = readOrNull(BUILD_PDF);

if (!toc) {
  console.log(`  ✗ 00-toc.md missing at ${TOC}`);
  fail++;
}
if (!buildPdf) {
  console.log(`  ✗ build_pdf.py missing at ${BUILD_PDF}`);
  fail++;
}
if (fail > 0) process.exit(1);

// Parse TOC version
const tocVersionMatch = toc.match(/^\*\*Phiên bản:\*\*\s+v(\d+\.\d+(?:\.\d+)?)/m);
const tocVersion = tocVersionMatch ? tocVersionMatch[1] : null;

// Parse TOC last-updated date (cập nhật cuối: YYYY-MM-DD)
const tocDateMatch = toc.match(/cập nhật cuối:\s*(\d{4}-\d{2}-\d{2})/);
const tocDate = tocDateMatch ? tocDateMatch[1] : null;

// Parse build_pdf.py pdf_path version
const pdfPathMatch = buildPdf.match(/pdf_path\s*=\s*BUILD_DIR\s*\/\s*"ai-native-company-playbook-v(\d+\.\d+(?:\.\d+)?)\.pdf"/);
const pdfPathVersion = pdfPathMatch ? pdfPathMatch[1] : null;

// Parse build_pdf.py cover-meta version
const coverMetaMatch = buildPdf.match(/<div>v(\d+\.\d+(?:\.\d+)?)\s+·\s+(\d{4}-\d{2}-\d{2})<\/div>/);
const coverMetaVersion = coverMetaMatch ? coverMetaMatch[1] : null;
const coverMetaDate = coverMetaMatch ? coverMetaMatch[2] : null;

// Parse CHAPTER_ORDER
const chapterOrderMatch = buildPdf.match(/CHAPTER_ORDER\s*=\s*\[([\s\S]*?)\]/);
const chapterOrderRaw = chapterOrderMatch ? chapterOrderMatch[1] : '';
const chapterOrderEntries = [...chapterOrderRaw.matchAll(/"([^"]+\.md)"/g)].map(m => m[1]);

// Scan actual chapter files
function* walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full, base);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      yield path.relative(base, full);
    }
  }
}

const actualChapters = [...walk(CHAPTERS_DIR)].sort();

// Invariant 1 — every chapter file in CHAPTER_ORDER
for (const ch of actualChapters) {
  if (!chapterOrderEntries.includes(ch)) {
    console.log(`  ⚠ chapter file not in CHAPTER_ORDER: ${ch}`);
    warn++;
  }
}

// Invariant 2 — every CHAPTER_ORDER entry has a file
for (const entry of chapterOrderEntries) {
  if (!actualChapters.includes(entry)) {
    console.log(`  ⚠ CHAPTER_ORDER entry has no file: ${entry}`);
    warn++;
  }
}

// Invariant 3 — TOC version == build_pdf.py pdf_path version
if (tocVersion && pdfPathVersion && tocVersion !== pdfPathVersion) {
  console.log(`  ⚠ version mismatch: TOC=v${tocVersion}, build_pdf.py pdf_path=v${pdfPathVersion}`);
  warn++;
}

// Invariant 4 — TOC version == build_pdf.py cover-meta version
if (tocVersion && coverMetaVersion && tocVersion !== coverMetaVersion) {
  console.log(`  ⚠ version mismatch: TOC=v${tocVersion}, build_pdf.py cover-meta=v${coverMetaVersion}`);
  warn++;
}

// Invariant 5 — TOC date >= youngest chapter file mtime
if (tocDate) {
  const tocDateMs = Date.parse(tocDate);
  let youngestChapterMs = 0;
  let youngestChapterName = '';
  for (const ch of actualChapters) {
    const stat = fs.statSync(path.join(CHAPTERS_DIR, ch));
    if (stat.mtimeMs > youngestChapterMs) {
      youngestChapterMs = stat.mtimeMs;
      youngestChapterName = ch;
    }
  }
  if (youngestChapterMs > 0 && youngestChapterMs > tocDateMs + 24 * 3600 * 1000) {
    // Allow 1-day grace period for timezone fuzz
    const youngestDate = new Date(youngestChapterMs).toISOString().slice(0, 10);
    console.log(`  ⚠ TOC date (cập nhật cuối: ${tocDate}) older than youngest chapter ${youngestChapterName} (mtime ${youngestDate})`);
    warn++;
  }
}

// Summary
const totalChapters = actualChapters.length;
const summary = `  ✓ playbook bundle present  ${totalChapters} chapters  v${tocVersion || '?'} current`;
console.log(summary);
if (warn > 0) console.log(`  ⚠ ${warn} warning(s) — playbook coherence drift detected (warn-tier; doesn't block CI)`);
if (fail > 0) console.log(`  ✗ ${fail} failure(s) — playbook structurally broken`);

process.exit(fail > 0 ? 1 : 0);
