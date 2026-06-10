#!/usr/bin/env node
'use strict';
// ============================================================================
// scripts/write/longform/continuity.cjs — deterministic continuity FLOOR
// ============================================================================
// A cheap, deterministic check over a long-form draft against its bible:
//   - bible terms (backtick-quoted `terms` + Capitalized Proper Nouns) that NEVER
//     appear in the draft  → possibly dropped / renamed (drift).
//   - draft proper-nouns NOT in the bible that are edit-distance ≤ 2 from a bible
//     proper-noun  → likely a misspelled name / terminology drift.
// This is a FLOOR, not a substitute for the LLM continuity read (timeline, thesis
// delivery, evidence contradictions need judgment). Pure-ish (file reads only).
//
// CLI: node scripts/write/longform/continuity.cjs <draft.md> --bible=<bible.md>
// Output: one line of JSON {ok, checked_terms, missing_from_draft[], possible_drift[], note}.
// ============================================================================

const fs = require('fs');

function lev(a, b) {
  const m = a.length; const n = b.length;
  if (Math.abs(m - n) > 2) return 3;            // early out (we only care about ≤2)
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return dp[m][n];
}

const STOP = new Set(['The', 'A', 'An', 'In', 'On', 'At', 'And', 'But', 'Or', 'So', 'If', 'When', 'It', 'This', 'That', 'Chapter', 'Part', 'Section', 'I', 'He', 'She', 'They', 'We', 'You']);

/** Backtick-quoted terms + multi-word Capitalized proper nouns. */
function extractTerms(text) {
  const terms = new Set();
  for (const m of text.matchAll(/`([^`]{2,40})`/g)) terms.add(m[1].trim());
  // Capitalized proper nouns (1-3 capitalized words), excluding sentence-start single stopwords.
  for (const m of text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g)) {
    const t = m[1].trim();
    if (!STOP.has(t.split(/\s+/)[0]) || t.includes(' ')) terms.add(t);
  }
  return terms;
}

function check(draftPath, biblePath) {
  if (!fs.existsSync(draftPath)) return { ok: false, error: `draft not found: ${draftPath}` };
  const draft = fs.readFileSync(draftPath, 'utf8');
  const bibleText = biblePath && fs.existsSync(biblePath) ? fs.readFileSync(biblePath, 'utf8') : '';
  const bibleTerms = bibleText ? extractTerms(bibleText) : new Set();
  const draftTerms = extractTerms(draft);

  const missing = [];
  for (const t of bibleTerms) {
    if (t.length < 3) continue;
    if (!draft.includes(t)) missing.push(t);
  }
  const drift = [];
  const bibleArr = [...bibleTerms].filter((t) => t.length >= 4);
  for (const dt of draftTerms) {
    if (dt.length < 4 || bibleTerms.has(dt)) continue;
    for (const bt of bibleArr) {
      if (dt !== bt && lev(dt, bt) <= 2) { drift.push({ in_draft: dt, bible: bt }); break; }
    }
  }
  return {
    ok: true,
    checked_terms: bibleTerms.size,
    missing_from_draft: missing.slice(0, 40),
    possible_drift: drift.slice(0, 40),
    note: 'FLOOR only — also run the LLM continuity read for timeline / thesis-delivery / evidence contradictions (judgment).',
  };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const draft = argv.find((a) => a && !a.startsWith('--'));
  const bible = (argv.find((a) => a.startsWith('--bible=')) || '').split('=').slice(1).join('=') || null;
  process.stdout.write(JSON.stringify(check(draft, bible)) + '\n');
}

module.exports = { check, extractTerms, lev };
