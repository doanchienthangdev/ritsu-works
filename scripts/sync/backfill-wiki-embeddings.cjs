#!/usr/bin/env node
// scripts/sync/backfill-wiki-embeddings.cjs — Sprint 2 PR3 v0.1 backfill cron
//
// Per Tier C decision ops.decisions[fff2bf7c-efeb-4169-b430-8139ad4d4de3]
// G3 disposition (soft-defer): when /wiki sync runs without OPENAI_API_KEY,
// pages get knowledge_pages rows but no embeddings. This script (invoked
// hourly by pg_cron entry `wiki-embeddings-backfill` in knowledge/schedules.yaml)
// scans for deferred pages and backfills via OpenAI text-embedding-3-small.
//
// v0.1 scope (intentionally minimal):
//   - Self-throttle check (per CTO NIT 4): skip if last 6h had 0 affected rows
//   - Discover deferred pages (count + first 10 ids)
//   - DRY-RUN ONLY — does NOT call OpenAI API yet
//   - Logs to stdout; caller (pg_cron handler) writes ops.scheduled_runs row
//
// v0.2 will:
//   - Add @supabase/supabase-js + openai npm deps (D-Std per HITL.md — founder approves)
//   - Actual OpenAI text-embedding-3-small call
//   - Actual INSERT into ops.knowledge_embeddings
//   - Actual UPDATE clearing embeddings_deferred flag
//   - Cost attribution write to ops.cost_attributions (model=text-embedding-3-small)
//
// Until v0.2 ships, this script's value is:
//   - Proves the cron wiring (schedules.yaml → handler invocation)
//   - Reports deferred-page count so founder can manually backfill via Claude session
//   - Establishes the contract for future real impl
//
// Invocation:
//   node scripts/sync/backfill-wiki-embeddings.cjs                # default
//   node scripts/sync/backfill-wiki-embeddings.cjs --max-pages=50 # bigger batch (v0.2)
//   node scripts/sync/backfill-wiki-embeddings.cjs --dry-run      # force dry-run (default in v0.1)
//   node scripts/sync/backfill-wiki-embeddings.cjs --json         # JSON-only output for cron consumer
//
// Exit codes:
//   0 — success (including "no work to do")
//   1 — input/config error
//   2 — runtime error (DB query failed, etc. — when real impl lands)

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// ----------------------------------------------------------------------------
// Args
// ----------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { maxPages: 10, dryRun: true, json: false };
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--json') args.json = true;
    else if (a.startsWith('--max-pages=')) args.maxPages = parseInt(a.split('=')[1], 10);
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('--')) {
      console.error(`unknown flag: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

function showHelp() {
  console.error(`scripts/sync/backfill-wiki-embeddings.cjs — Sprint 2 PR3 v0.1`);
  console.error(`Backfill wiki embeddings for pages with embeddings_deferred=true.`);
  console.error(`v0.1 = DRY-RUN ONLY. v0.2 will add real OpenAI integration.`);
  console.error(``);
  console.error(`Usage: node scripts/sync/backfill-wiki-embeddings.cjs [flags]`);
  console.error(`Flags:`);
  console.error(`  --max-pages=N    Cap batch size (default 10)`);
  console.error(`  --dry-run        Force dry-run (default in v0.1)`);
  console.error(`  --json           JSON-only output (for cron consumer)`);
  console.error(``);
  console.error(`Capability: wiki-sync-from-refs v2.0.0`);
  console.error(`Tier C decision: ops.decisions[fff2bf7c-…] G3 soft-defer`);
  console.error(`SKILL: 06-ai-ops/skills/wiki-sync/embeddings-backfill/SKILL.md`);
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { showHelp(); process.exit(0); }

  if (!args.dryRun) {
    // v0.1 always dry-run regardless of flag (no real impl yet)
    if (!args.json) {
      console.error('NOTE: v0.1 is dry-run-only. Pass --dry-run explicitly or wait for v0.2 with --no-dry-run support.');
    }
    args.dryRun = true;
  }

  const result = {
    script: 'backfill-wiki-embeddings',
    version: '0.1',
    invoked_at: new Date().toISOString(),
    mode: args.dryRun ? 'dry-run' : 'execute',
    self_throttle: {
      checked: false,
      reason: 'v0.1 does not call DB; cron handler should perform self-throttle check before invoking this script',
      contract: 'SKIP this invocation if ops.scheduled_runs[wiki-embeddings-backfill].latest.affected_rows == 0 AND fired_at > now() - interval 6h',
    },
    discovered_deferred: {
      queried: false,
      reason: 'v0.1 stub — no DB query implemented',
      target_query: `SELECT kp.id, kp.slug, kp.file_path, ij.id AS ingestion_job_id
                       FROM ops.knowledge_pages kp
                       JOIN ops.ingestion_jobs ij ON ij.resulting_page_id = kp.id
                      WHERE ij.metadata->>'embeddings_deferred' = 'true'
                        AND NOT EXISTS (SELECT 1 FROM ops.knowledge_embeddings ke WHERE ke.page_id = kp.id)
                      ORDER BY kp.created_at ASC
                      LIMIT ${args.maxPages};`,
    },
    embeddings_called: false,
    rows_inserted: 0,
    cost_usd: 0,
    deferred_until_v0_2: [
      'OpenAI text-embedding-3-small API call',
      'INSERT INTO ops.knowledge_embeddings',
      'UPDATE clearing embeddings_deferred flag',
      'INSERT INTO ops.cost_attributions (model=text-embedding-3-small)',
      'Telegram heartbeat (only if rows_inserted > 0)',
    ],
    next_steps: {
      founder_action_to_unblock_v0_2: [
        'Add @supabase/supabase-js to devDependencies',
        'Add openai npm package to devDependencies',
        'Ensure OPENAI_API_KEY + SUPABASE_OPS_SERVICE_KEY available in cron handler env',
        'Open PR to remove the dry-run-only guard at scripts/sync/backfill-wiki-embeddings.cjs:main()',
      ],
    },
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error('=== wiki-embeddings-backfill v0.1 (dry-run) ===');
    console.error(`Invoked at: ${result.invoked_at}`);
    console.error(`Mode: ${result.mode}`);
    console.error(``);
    console.error('Status: v0.1 STUB — no DB query, no OpenAI call.');
    console.error('  Reason: avoiding new npm deps + secret handling in CLI');
    console.error('  See SKILL: 06-ai-ops/skills/wiki-sync/embeddings-backfill/SKILL.md');
    console.error(``);
    console.error('Self-throttle:');
    console.error('  ' + result.self_throttle.reason);
    console.error(``);
    console.error('Deferred until v0.2:');
    result.deferred_until_v0_2.forEach((d) => console.error(`  - ${d}`));
    console.error(``);
    console.error('To unblock v0.2:');
    result.next_steps.founder_action_to_unblock_v0_2.forEach((s) => console.error(`  - ${s}`));
  }

  process.exit(0);
}

main();
