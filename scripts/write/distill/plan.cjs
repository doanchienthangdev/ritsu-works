#!/usr/bin/env node
'use strict';
// ============================================================================
// scripts/write/distill/plan.cjs — /write distill source-staging planner
// ============================================================================
// Enumerates an author's --ref-src sources, CURATES a bounded high-value bundle,
// and STAGES it into the worktree (runtime/write/distill-sources/<slug>/) so the
// distillation Workflow's sandboxed agents can read it (raw/ lives only in main-root).
//
// Priority: transcripts (verbatim public talks) > articles (freely-published / memos)
// > book reference summaries. PDFs are skipped (the .md summaries + transcripts +
// articles carry the voice; PDFs are heavy + copyright-sensitive). The duplicate
// `ref/` subtree under an author dir is skipped.
//
// CLI:  node scripts/write/distill/plan.cjs --slug=seth-godin --ref-src=raw/write/seth-godin [--ref-src=..] [--max-kb=420]
// Output: one line of JSON manifest {ok, slug, staged_dir, groups, files[], total_bytes, warnings}.
// ============================================================================

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const WORKTREE_ROOT = path.resolve(HERE, '..', '..', '..');

// Resolve the MAIN repo root (raw/ + runtime/ live there, not in a worktree).
function mainRepoRoot() {
  const m = WORKTREE_ROOT.indexOf('/.claude/worktrees/');
  return m === -1 ? WORKTREE_ROOT : WORKTREE_ROOT.slice(0, m);
}
const MAIN_ROOT = mainRepoRoot();

function resolveSrc(p) {
  const cands = [
    path.isAbsolute(p) ? p : null,
    path.join(process.cwd(), p),
    path.join(WORKTREE_ROOT, p),
    path.join(MAIN_ROOT, p),
  ].filter(Boolean);
  return cands.find((c) => fs.existsSync(c)) || null;
}

function classify(rel) {
  const r = rel.toLowerCase();
  if (r.includes('transcript')) return 'transcripts';
  if (r.includes('/books/') || r.includes('book')) return 'books';
  if (r.includes('/articles/') || r.includes('article') || r.includes('memo')) return 'articles';
  return 'articles';
}

function walkMd(absDir, baseAbs, acc) {
  for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const abs = path.join(absDir, ent.name);
    const rel = path.relative(baseAbs, abs);
    // skip the duplicate ref/ subtree (an author dir mirrors its own contents under ref/)
    if (ent.isDirectory()) {
      // Skip ONLY the top-level `<author>/ref/` duplicate mirror — NOT nested `books/ref/`
      // (which holds the curated book SUMMARIES we want).
      if (rel === 'ref') continue;
      walkMd(abs, baseAbs, acc);
    } else if (ent.name.toLowerCase().endsWith('.md') && ent.name.toLowerCase() !== 'readme.md') {
      acc.push({ abs, rel, bytes: fs.statSync(abs).size });
    }
  }
}

const PRIORITY = { transcripts: 0, articles: 1, books: 2 };

function plan(slug, refSrcs, opts = {}) {
  const warnings = [];
  const maxBytes = (opts.maxKb || 420) * 1024;
  const stagedRel = path.join('runtime', 'write', 'distill-sources', slug);
  const stagedAbs = path.join(MAIN_ROOT, stagedRel);     // stage under MAIN root runtime (visible to worktree-rooted agents via the worktree path too)
  const stagedAbsWt = path.join(WORKTREE_ROOT, stagedRel);

  const found = [];
  for (const src of refSrcs) {
    const abs = resolveSrc(src);
    if (!abs) { warnings.push(`ref-src not found: ${src}`); continue; }
    if (fs.statSync(abs).isDirectory()) walkMd(abs, abs, found);
    else if (abs.toLowerCase().endsWith('.md')) found.push({ abs, rel: path.basename(abs), bytes: fs.statSync(abs).size });
    else warnings.push(`ref-src skipped (not a folder or .md): ${src}`);
  }
  if (!found.length) return { ok: false, slug, error: 'no markdown sources found', warnings };

  // sort by group priority, then smaller files first (named single-article files before huge year dumps)
  found.forEach((f) => { f.group = classify(f.rel); });
  found.sort((a, b) => (PRIORITY[a.group] - PRIORITY[b.group]) || (a.bytes - b.bytes));

  // select within budget (always keep all transcripts + book summaries; cap articles)
  const selected = [];
  let total = 0;
  for (const f of found) {
    const keepRegardless = f.group !== 'articles' && f.bytes < 200 * 1024;
    if (keepRegardless || total + f.bytes <= maxBytes) { selected.push(f); total += f.bytes; }
    else warnings.push(`source over budget, skipped from staging: ${f.rel} (${Math.round(f.bytes / 1024)}KB)`);
  }

  // stage (copy into worktree runtime so sandboxed agents can read)
  for (const dest of [stagedAbsWt]) {
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    for (const f of selected) {
      const flat = f.rel.replace(/[\/]+/g, '__');
      fs.copyFileSync(f.abs, path.join(dest, flat));
    }
  }

  const groups = selected.reduce((acc, f) => { acc[f.group] = (acc[f.group] || 0) + 1; return acc; }, {});
  return {
    ok: true,
    slug,
    staged_dir: path.join(WORKTREE_ROOT, stagedRel),
    staged_rel: stagedRel,
    groups,
    files: selected.map((f) => ({ staged: f.rel.replace(/[\/]+/g, '__'), origin: f.rel, group: f.group, bytes: f.bytes })),
    total_bytes: total,
    total_kb: Math.round(total / 1024),
    warnings,
  };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const get = (k) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : null; };
  const slug = get('slug');
  const refSrcs = argv.filter((a) => a.startsWith('--ref-src=')).flatMap((a) => a.split('=').slice(1).join('=').split('+')).filter(Boolean);
  const maxKb = Number(get('max-kb')) || 420;
  if (!slug || !refSrcs.length) { process.stdout.write(JSON.stringify({ ok: false, error: 'need --slug and --ref-src' }) + '\n'); process.exit(1); }
  process.stdout.write(JSON.stringify(plan(slug, refSrcs, { maxKb })) + '\n');
}

module.exports = { plan, resolveSrc, mainRepoRoot };
