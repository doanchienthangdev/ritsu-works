#!/usr/bin/env node
/*
 * scripts/wiki-sync/check-content-traceability.cjs
 *
 * Muse M7 — content_traceability check (kill criterion day-60 gate measurement).
 *
 * Per spec.md v3.0 §0 hard kill criterion:
 *   "If by day 30 post-promotion there are < 5 growth-domain /wiki sync
 *    invocations AND by day 60 zero content pieces citing a v3.0-extracted
 *    entity, freeze further v3.x investment."
 *
 * This script measures the day-30 + day-60 gates by:
 *   1. Counting /wiki sync distill invocations in last 30 days
 *      (queries ops.agent_runs WHERE agent_slug LIKE 'wiki-sync/distill%')
 *   2. Counting /wiki ask invocations in last 60 days that were followed
 *      within ±10 min by an edit to 01-marketing/ or 02-sales/ file
 *      (correlates ops.agent_runs with git log)
 *
 * Usage:
 *   node scripts/wiki-sync/check-content-traceability.cjs [--days=60] [--json]
 *
 * Exit codes:
 *   0 — gates passed (>= 5 distill in 30d AND >= 1 content cite in 60d)
 *   1 — kill criterion FIRED (script error OR gate failed at day 60)
 *   2 — script error (subprocess failure, parsing error)
 *
 * Note: this is INFORMATIONAL only. It does NOT auto-freeze the capability;
 * founder reviews output + manually decides per spec §0.
 */

'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const args = new Set(process.argv.slice(2));
const JSON_OUTPUT = args.has('--json');
const DAYS = (() => {
  const arg = process.argv.find((a) => a.startsWith('--days='));
  if (!arg) return 60;
  return parseInt(arg.slice('--days='.length), 10) || 60;
})();

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function log(msg) {
  if (!JSON_OUTPUT) console.error(msg);
}

function runDbQuery(sql) {
  try {
    const compact = sql.replace(/\s+/g, ' ').trim();
    const out = execFileSync('supabase', ['db', 'query', '--linked', compact], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000,
    });
    const jsonStart = out.indexOf('{');
    const jsonEnd = out.lastIndexOf('}');
    if (jsonStart === -1) return { rows: [], error: 'no_json' };
    const parsed = JSON.parse(out.slice(jsonStart, jsonEnd + 1));
    return { rows: parsed.rows ?? [] };
  } catch (e) {
    return { rows: [], error: String(e.message ?? e).slice(0, 200) };
  }
}

// --- Day-30 gate: count distill invocations ---------------------------------

const DAY30_SQL = `
  SELECT COUNT(*) AS distill_count,
         MIN(started_at) AS first_run,
         MAX(started_at) AS last_run
    FROM ops.agent_runs
   WHERE agent_slug LIKE 'wiki-sync/distill%'
     AND started_at > now() - interval '30 days';
`;

// --- Day-60 gate: count content-cite candidates -----------------------------
// Cross-reference: ops.agent_runs for wiki_ask invocations + git log of
// 01-marketing/ + 02-sales/ file edits within ±10 min.
//
// SQL part: get wiki_ask invocations from last 60 days.
// Git part: enumerate file edits via git log.
// Correlation: timestamp overlap.

const WIKI_ASK_RUNS_SQL = `
  SELECT id, started_at, input_payload->>'question' AS question
    FROM ops.agent_runs
   WHERE (agent_slug LIKE '%wiki_ask%' OR agent_slug LIKE 'wiki-sync/ask%')
     AND started_at > now() - interval '60 days'
   ORDER BY started_at DESC
   LIMIT 200;
`;

function getMarketingSalesEdits(daysBack) {
  try {
    const sinceArg = `--since=${daysBack}.days.ago`;
    const out = execFileSync(
      'git',
      ['log', sinceArg, '--name-only', '--pretty=format:__COMMIT__%H %ad', '--date=iso-strict', '--', '01-marketing/', '02-sales/'],
      { cwd: REPO_ROOT, encoding: 'utf8', timeout: 30000 },
    );
    // Parse: blocks of "__COMMIT__<sha> <iso-date>\nfile1\nfile2\n\n"
    const blocks = out.split('__COMMIT__').filter((b) => b.trim());
    const edits = [];
    for (const block of blocks) {
      const lines = block.split('\n').filter((l) => l.trim());
      if (lines.length === 0) continue;
      const [shaDate, ...files] = lines;
      const spaceIdx = shaDate.indexOf(' ');
      const sha = shaDate.slice(0, spaceIdx);
      const date = shaDate.slice(spaceIdx + 1);
      for (const f of files) {
        if (f.startsWith('01-marketing/') || f.startsWith('02-sales/')) {
          edits.push({ sha, date, file: f });
        }
      }
    }
    return edits;
  } catch (e) {
    return [];
  }
}

function correlateAskWithEdits(asks, edits, windowMinutes = 10) {
  const matches = [];
  const windowMs = windowMinutes * 60 * 1000;
  for (const ask of asks) {
    const askTime = new Date(ask.started_at).getTime();
    for (const edit of edits) {
      const editTime = new Date(edit.date).getTime();
      const diff = Math.abs(editTime - askTime);
      if (diff <= windowMs) {
        matches.push({
          ask_run_id: ask.id,
          ask_started_at: ask.started_at,
          ask_question: (ask.question ?? '').slice(0, 100),
          edit_file: edit.file,
          edit_commit_sha: edit.sha,
          edit_date: edit.date,
          delta_minutes: Math.round(diff / 60000),
        });
      }
    }
  }
  return matches;
}

// --- Main -------------------------------------------------------------------

function main() {
  log('');
  log(`content-traceability check (Muse M7 — day-${DAYS} kill criterion gate)`);
  log('─'.repeat(70));

  // Day-30 gate
  log('Checking Day-30 gate: distill invocations in last 30 days...');
  const day30 = runDbQuery(DAY30_SQL);
  const distillCount = day30.rows[0]?.distill_count ?? 0;

  log(`  distill_count: ${distillCount}`);
  if (distillCount < 5) {
    log(`  ⚠️  Day-30 gate: FAILING (< 5; threshold = 5)`);
  } else {
    log(`  ✓ Day-30 gate: PASSING (≥ 5)`);
  }

  // Day-60 gate
  log('');
  log('Checking Day-60 gate: content cite count (wiki_ask × marketing/sales edit correlation)...');
  const asksResult = runDbQuery(WIKI_ASK_RUNS_SQL);
  const asks = asksResult.rows ?? [];
  log(`  wiki_ask invocations in last 60d: ${asks.length}`);

  const edits = getMarketingSalesEdits(60);
  log(`  01-marketing/ + 02-sales/ file edits in last 60d: ${edits.length}`);

  const matches = correlateAskWithEdits(asks, edits, 10);
  log(`  correlated within ±10 min: ${matches.length}`);

  let day60Passing = matches.length > 0;
  if (!day60Passing) {
    log(`  ⚠️  Day-60 gate: FAILING (0 correlations; threshold = 1)`);
    log(`     Per spec §0 kill criterion: if day-60 evaluation shows 0 content cites,`);
    log(`     FREEZE further v3.x investment; reopen /cla revise only with paying-`);
    log(`     user-tied evidence.`);
  } else {
    log(`  ✓ Day-60 gate: PASSING (${matches.length} correlations)`);
  }

  const result = {
    check: 'content-traceability',
    timestamp: new Date().toISOString(),
    spec_ref: 'wiki/capabilities/wiki-sync-from-refs/spec.md §0 hard kill criterion',
    day_30: {
      distill_count: Number(distillCount),
      threshold: 5,
      passing: Number(distillCount) >= 5,
      first_run: day30.rows[0]?.first_run ?? null,
      last_run: day30.rows[0]?.last_run ?? null,
    },
    day_60: {
      wiki_ask_count: asks.length,
      marketing_sales_edits: edits.length,
      correlated_count: matches.length,
      correlation_window_minutes: 10,
      threshold: 1,
      passing: day60Passing,
      sample_correlations: matches.slice(0, 5),
    },
    overall_status: distillCount >= 5 && day60Passing ? 'PASSING' : 'FAILING',
  };

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    log('');
    log(`Overall: ${result.overall_status}`);
    if (result.overall_status === 'FAILING') {
      log('');
      log('Per spec §0 — if Day-60 still failing, FREEZE further v3.x investment.');
      log('Document evidence + reopen /cla revise wiki-sync-from-refs with new');
      log('paying-user-tied rationale.');
    }
  }
  process.exit(result.overall_status === 'PASSING' ? 0 : 1);
}

if (require.main === module) main();

module.exports = { main, runDbQuery, getMarketingSalesEdits, correlateAskWithEdits };
