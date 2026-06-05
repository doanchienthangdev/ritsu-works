#!/usr/bin/env node
/**
 * build-briefs.cjs — capability `consulting-toolkit`
 *
 * Reads the pdftotext extractions of the Domont toolkit overview decks and
 * emits `briefs.json` — the structured, boilerplate-trimmed "process clue"
 * for each toolkit. This file is the `args` payload handed to the
 * reconstruction Workflow (workflow subagents are worktree-sandboxed and
 * cannot read the main-root `raw/` extractions, so the text is embedded in
 * each agent's prompt via args — see wiki/capabilities/consulting-toolkit/spec.md §D4).
 *
 * Pure Node, zero deps, idempotent. Runs in the MAIN loop (not a workflow
 * agent) because it reads absolute main-root `raw/` paths.
 *
 * Usage: node scripts/consulting-toolkit/build-briefs.cjs [--raw <dir>] [--out <file>]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAW_DIR = argVal('--raw') || '/Users/doanchienthang/ritsu-works/raw/consultant/tookits/_extractions';
const OUT = argVal('--out') || path.join(RAW_DIR, 'briefs.json');

// Authoritative toolkit registry (titles/slugs from filenames, not OCR'd cover slides).
const TOOLKITS = [
  { num: 0,  pages: 30, title: 'Master Index & Onboarding',                              slug: '00-index',                              domain: 'meta',        kind: 'index' },
  { num: 1,  pages: 28, title: 'Business Strategy & Strategic Planning',                  slug: 'business-strategy',                     domain: 'strategy' },
  { num: 2,  pages: 24, title: 'Operating Model & Organization Design',                   slug: 'operating-model-org-design',            domain: 'organization' },
  { num: 3,  pages: 24, title: 'Digital Transformation & IT Strategy',                    slug: 'digital-transformation-it-strategy',    domain: 'technology' },
  { num: 4,  pages: 23, title: 'Program, Project & Change Management',                    slug: 'program-project-change-management',     domain: 'execution' },
  { num: 5,  pages: 32, title: 'Management Consulting',                                   slug: 'management-consulting',                 domain: 'consulting' },
  { num: 6,  pages: 23, title: 'HR & Talent Management',                                  slug: 'hr-talent-management',                  domain: 'people' },
  { num: 7,  pages: 23, title: 'Mergers & Acquisitions',                                  slug: 'mergers-acquisitions',                  domain: 'corp-dev' },
  { num: 8,  pages: 20, title: 'Post Merger Integration',                                 slug: 'post-merger-integration',               domain: 'corp-dev' },
  { num: 9,  pages: 23, title: 'Sales, Marketing, Pricing & Communication',               slug: 'sales-marketing-pricing-communication', domain: 'commercial' },
  { num: 10, pages: 20, title: 'Business Plan & Entrepreneurship',                        slug: 'business-plan-entrepreneurship',        domain: 'strategy' },
  { num: 11, pages: 20, title: 'Supply Chain Strategy',                                   slug: 'supply-chain-strategy',                 domain: 'operations' },
  { num: 12, pages: 44, title: 'Lean Six Sigma',                                          slug: 'lean-six-sigma',                        domain: 'operations' },
  { num: 13, pages: 20, title: 'Risk Management',                                         slug: 'risk-management',                       domain: 'governance' },
  { num: 14, pages: 19, title: 'Business Case',                                           slug: 'business-case',                         domain: 'finance' },
  { num: 15, pages: 16, title: 'Executive Dashboard',                                     slug: 'executive-dashboard',                   domain: 'metrics' },
  { num: 16, pages: 20, title: 'Leadership Development',                                  slug: 'leadership-development',                domain: 'people' },
  { num: 17, pages: 19, title: 'Financial Modeling, Planning & Analysis',                 slug: 'financial-modeling-planning-analysis',  domain: 'finance' },
  { num: 18, pages: 22, title: 'Customer Experience Strategy & Design Thinking',          slug: 'customer-experience-design-thinking',   domain: 'experience' },
  { num: 19, pages: 25, title: 'Data Analytics & AI Strategy',                            slug: 'data-analytics-ai-strategy',            domain: 'technology' },
  { num: 20, pages: 21, title: 'Personal Finance & Warren Buffett Investing',             slug: 'personal-finance-buffett-investing',    domain: 'finance' },
];

// Marketing-tail markers: everything from the EARLIEST match onward is Domont
// sales boilerplate, not process content. Conservative — only trims the tail.
const TAIL_MARKERS = [
  /The Toolkit includes multiple PowerPoint/i,
  /\d+\s+editable PowerPoint slides/i,
  /include[s]? \d+ key benefits/i,
  /What our clients say about/i,
  /Join 200,000\+/i,
  /Interested in more than 1 Toolkit/i,
  /Need additional help\?/i,
  /This was just a small preview/i,
  /www\.domontconsulting\.com/i,
];
// Leading intro boilerplate end-marker: keep from the first real structural slide.
const HEAD_MARKERS = [
  /will help you fulfill multiple objectives/i,
  /Our firm created/i,
];

function argVal(flag) { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : null; }

function trim(raw) {
  let text = raw.replace(/\r/g, '');
  // cut tail
  let cut = text.length;
  for (const m of TAIL_MARKERS) { const idx = text.search(m); if (idx > 200 && idx < cut) cut = idx; }
  text = text.slice(0, cut);
  // light cleanup: collapse 3+ blank lines, drop page-footer "Domont Consulting N" lines
  text = text
    .split('\n')
    .filter((l) => !/^\s*(Domont Consulting|Company Name)\s+\d+\s*$/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

const briefs = [];
for (const tk of TOOLKITS) {
  const idp = String(tk.num).padStart(2, '0');
  const file = path.join(RAW_DIR, `${idp}-raw.txt`);
  if (!fs.existsSync(file)) { console.error(`MISSING: ${file}`); continue; }
  const raw = fs.readFileSync(file, 'utf8');
  const core = trim(raw);
  briefs.push({ ...tk, idp, words: core.split(/\s+/).length, core });
}

fs.writeFileSync(OUT, JSON.stringify(briefs, null, 2));
const totalWords = briefs.reduce((a, b) => a + b.words, 0);
console.log(`Wrote ${briefs.length} briefs -> ${OUT}`);
console.log(`Total core words: ${totalWords} (~${Math.round(totalWords * 1.35 / 1000)}K tokens for workflow args)`);
for (const b of briefs) console.log(`  #${b.num} ${b.slug.padEnd(42)} ${b.words}w`);
