#!/usr/bin/env node
'use strict';
// ============================================================================
// scripts/write/learn/plan.cjs — /write learn book-staging planner
// ============================================================================
// Enumerates a book FILE or a FOLDER of books, derives a stable kebab slug per
// book, extracts each PDF to text with `pdftotext`, and STAGES the text into the
// worktree at runtime/write/learn-sources/<slug>/text.txt so the distillation
// Workflow's sandboxed agents can read it (raw/ lives only in main-root — same
// staging trick as scripts/write/distill/plan.cjs).
//
// Each book becomes one analyst job in the /write learn Workflow. The manifest
// reports per-book pages + text size + a coverage signal so low-text (scanned)
// PDFs are flagged before the expensive distillation runs.
//
// CLI:  node scripts/write/learn/plan.cjs --src=raw/write/books [--books=slug,slug] [--no-extract] [--dry-run]
// Output: one line of JSON manifest {ok, src, staged_root, books[], warnings}.
// Pure functions (deriveBookSlug, classifyCoverage, buildManifest) are exported
// for tests; the pdftotext side-effect is isolated in extractText().
// ============================================================================

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HERE = __dirname;
const WORKTREE_ROOT = path.resolve(HERE, '..', '..', '..');

// Resolve the MAIN repo root (raw/ + runtime/ live there, not in a worktree).
function mainRepoRoot() {
  const m = WORKTREE_ROOT.indexOf('/.claude/worktrees/');
  return m === -1 ? WORKTREE_ROOT : WORKTREE_ROOT.slice(0, m);
}
const MAIN_ROOT = mainRepoRoot();

const STAGE_REL = path.join('runtime', 'write', 'learn-sources');

// ── pure helpers ────────────────────────────────────────────────────────────

/**
 * Deterministic kebab slug for a book file. Strips a leading order prefix
 * ("1 - ", "12 — ", "3. - "), keeps the TITLE up to the first author/metadata
 * separator (" — " | " -- " | " – "), and appends the author's last name when
 * the filename carries it — so "On Writing Well — William Zinsser.pdf" →
 * "on-writing-well-zinsser". Pure (no fs). Resume-safe (no Date/random).
 */
function deriveBookSlug(filename, maxLen = 52) {
  if (!filename || typeof filename !== 'string') return 'book';
  let base = filename.replace(/\.[A-Za-z0-9]+$/, ''); // drop extension
  // strip leading order prefix: digits + optional dot + optional dash/em-dash + spaces
  base = base.replace(/^\s*\d+\s*[.．]?\s*[-–—]*\s*/u, '');
  // split title from author/metadata on the FIRST strong separator
  const sepMatch = base.match(/\s+(?:—|–|--|::)\s+/u);
  let titlePart = base;
  let lastName = '';
  if (sepMatch) {
    titlePart = base.slice(0, sepMatch.index);
    const rest = base.slice(sepMatch.index + sepMatch[0].length);
    // author = first comma/separator-delimited chunk; last-name = its last alpha token
    const authorChunk = rest.split(/\s*[,;]\s*|\s+(?:—|–|--|::|&)\s+/u)[0] || '';
    const tokens = authorChunk
      .replace(/[^A-Za-z .'À-ɏ-]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((t) => /[A-Za-zÀ-ɏ]/.test(t) && !/^(jr|sr|ii|iii|eb|m|c)$/i.test(t.replace(/[.'-]/g, '')));
    if (tokens.length) lastName = tokens[tokens.length - 1];
  }
  const slugify = (s) =>
    (s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  let titleSlug = slugify(titlePart);
  const lastSlug = slugify(lastName);
  if (!titleSlug) titleSlug = 'book';
  // keep room for "-<lastname>"
  const budget = lastSlug ? maxLen - lastSlug.length - 1 : maxLen;
  if (titleSlug.length > budget) {
    const cut = titleSlug.slice(0, Math.max(8, budget));
    const lastDash = cut.lastIndexOf('-');
    titleSlug = (lastDash > 8 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '');
  }
  const slug = lastSlug && !titleSlug.endsWith(lastSlug) ? `${titleSlug}-${lastSlug}` : titleSlug;
  return slug.replace(/^-+|-+$/g, '') || 'book';
}

/** Coverage signal from extracted text size relative to page count. Pure. */
function classifyCoverage(textBytes, pages) {
  const kb = textBytes / 1024;
  if (kb < 5) return 'low'; // almost certainly a scanned/image PDF — needs OCR
  if (pages && pages > 0 && kb / pages < 0.4) return 'partial'; // < ~0.4KB/page is thin
  return 'full';
}

/** Build the per-book manifest entry (pure — fs facts passed in). */
function buildBookEntry(file, slug, facts) {
  return {
    slug,
    file: path.basename(file),
    title: facts.title || null,
    pages: facts.pages || null,
    text_bytes: facts.textBytes || 0,
    text_kb: Math.round((facts.textBytes || 0) / 1024),
    coverage: classifyCoverage(facts.textBytes || 0, facts.pages || 0),
    staged_path: path.join(STAGE_REL, slug, 'text.txt'),
  };
}

function resolveSrc(p) {
  const cands = [
    path.isAbsolute(p) ? p : null,
    path.join(process.cwd(), p),
    path.join(WORKTREE_ROOT, p),
    path.join(MAIN_ROOT, p),
  ].filter(Boolean);
  return cands.find((c) => fs.existsSync(c)) || null;
}

/** Enumerate book PDFs from a file or directory (non-recursive for a dir). */
function enumerateBooks(absSrc) {
  const st = fs.statSync(absSrc);
  if (st.isFile()) return absSrc.toLowerCase().endsWith('.pdf') ? [absSrc] : [];
  return fs
    .readdirSync(absSrc, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.') && e.name.toLowerCase().endsWith('.pdf'))
    .map((e) => path.join(absSrc, e.name))
    .sort((a, b) => {
      // sort by leading number when present (1,2,…,14), else lexical
      const na = parseInt(path.basename(a), 10);
      const nb = parseInt(path.basename(b), 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
}

// ── side-effecting helpers (not unit-tested; guarded) ────────────────────────

function pdfPages(absPdf) {
  try {
    const out = execFileSync('pdfinfo', [absPdf], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const m = out.match(/^Pages:\s+(\d+)/m);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}

function extractText(absPdf, destTxt) {
  fs.mkdirSync(path.dirname(destTxt), { recursive: true });
  execFileSync('pdftotext', ['-enc', 'UTF-8', absPdf, destTxt], { stdio: ['ignore', 'ignore', 'ignore'] });
  return fs.statSync(destTxt).size;
}

// ── planner ──────────────────────────────────────────────────────────────────

function plan(src, opts = {}) {
  const warnings = [];
  const absSrc = resolveSrc(src);
  if (!absSrc) return { ok: false, src, error: `src not found: ${src}`, warnings };

  let pdfs = enumerateBooks(absSrc);
  if (!pdfs.length) return { ok: false, src, error: 'no PDF books found at src', warnings };

  // map to slugs first (so --books filter can match on slug)
  let entries = pdfs.map((abs) => ({ abs, slug: deriveBookSlug(path.basename(abs)) }));
  // de-collide slugs (append -2, -3 on duplicates — deterministic by enumeration order)
  const seen = new Map();
  for (const e of entries) {
    const n = (seen.get(e.slug) || 0) + 1;
    seen.set(e.slug, n);
    if (n > 1) e.slug = `${e.slug}-${n}`;
  }
  if (opts.books && opts.books.length) {
    const want = new Set(opts.books);
    entries = entries.filter((e) => want.has(e.slug));
    if (!entries.length) return { ok: false, src, error: `--books matched none (have: ${pdfs.map((p) => deriveBookSlug(path.basename(p))).join(', ')})`, warnings };
  }

  const stagedRoot = path.join(WORKTREE_ROOT, STAGE_REL);
  const books = [];
  for (const e of entries) {
    const pages = opts.noExtract || opts.dryRun ? pdfPages(e.abs) : pdfPages(e.abs);
    let textBytes = 0;
    if (!opts.noExtract && !opts.dryRun) {
      try {
        textBytes = extractText(e.abs, path.join(stagedRoot, e.slug, 'text.txt'));
      } catch (err) {
        warnings.push(`pdftotext failed for ${path.basename(e.abs)}: ${err.message}`);
      }
    } else {
      const existing = path.join(stagedRoot, e.slug, 'text.txt');
      if (fs.existsSync(existing)) textBytes = fs.statSync(existing).size;
    }
    const entry = buildBookEntry(e.abs, e.slug, { pages, textBytes, title: null });
    if (entry.coverage === 'low' && !opts.dryRun) warnings.push(`low text coverage (scanned?): ${e.slug} (${entry.text_kb}KB / ${pages}pp)`);
    books.push(entry);
  }

  return {
    ok: true,
    src: path.relative(MAIN_ROOT, absSrc) || absSrc,
    staged_root: path.join(WORKTREE_ROOT, STAGE_REL),
    staged_rel: STAGE_REL,
    count: books.length,
    books,
    warnings,
  };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const get = (k) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
  const src = get('src') || argv.find((a) => !a.startsWith('--'));
  const books = (get('books') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const opts = { books, noExtract: argv.includes('--no-extract'), dryRun: argv.includes('--dry-run') };
  if (!src) { process.stdout.write(JSON.stringify({ ok: false, error: 'need --src=<book.pdf|folder>' }) + '\n'); process.exit(1); }
  process.stdout.write(JSON.stringify(plan(src, opts)) + '\n');
}

module.exports = { plan, deriveBookSlug, classifyCoverage, buildBookEntry, enumerateBooks, resolveSrc, mainRepoRoot, STAGE_REL };
