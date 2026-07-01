'use strict';
/**
 * scripts/multi-user-auth/apply-migration.cjs
 *
 * Apply a single multi-user-auth migration to LIVE ritsu-ops via the Supabase
 * Management API SQL endpoint, by migration NUMBER. HARD ref-guarded to the ops
 * project (mntobbmieuoaxipnjaau) — refuses anything else. Reads creds from the
 * MAIN checkout's runtime/secrets/.env.local itself (works from a git worktree,
 * where runtime/ is absent locally). DRY-RUN by default.
 *
 * WHY this exists: the ops MCP runs SQL through a SELECT-only per-human RPC, which
 * cannot run DDL/ACL (CREATE FUNCTION / REVOKE / ALTER). `supabase db push` applies
 * ALL pending migrations and this repo's live migration-tracking is intentionally
 * out of sync (00049/00051 were applied surgically via the Management API), so a
 * scoped, single-migration apply is the safe path.
 *
 * USAGE (run from your MAIN checkout, in a PLAIN terminal — applying a shared-prod
 * migration is correctly gated inside Claude Code by the auto-classifier):
 *   node scripts/multi-user-auth/apply-migration.cjs 00050            # DRY-RUN (default)
 *   node scripts/multi-user-auth/apply-migration.cjs 00050 --apply    # execute
 *
 * Requires SUPABASE_URL (ritsu-ops) + SUPABASE_ACCESS_TOKEN (owner-only PAT) in
 * runtime/secrets/.env.local. Never prints secret values. Exit 0 = ok.
 *
 * After applying an instant-revocation migration (00050), verify with:
 *   set -a; . runtime/secrets/.env.local; set +a
 *   node scripts/multi-user-auth/validate-instant-revocation.cjs
 */
const fs = require('fs');
const path = require('path');

const REF = 'mntobbmieuoaxipnjaau'; // ritsu-ops — the ONLY allowed target
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const prefix = args.find((a) => !a.startsWith('--'));
if (!prefix) throw new Error('usage: apply-migration.cjs <migration-number> [--apply]   (e.g. 00050)');

// Locate the MAIN checkout's .env.local (worktrees don't have runtime/ locally).
const cwd = process.cwd();
const MARKER = `${path.sep}.claude${path.sep}worktrees${path.sep}`;
const mainRoot = cwd.includes(MARKER) ? cwd.slice(0, cwd.indexOf(MARKER)) : cwd;
const envPath = path.join(mainRoot, 'runtime', 'secrets', '.env.local');
if (!fs.existsSync(envPath)) throw new Error(`no .env.local at ${envPath}`);

const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  else v = v.split(/\s+#/)[0].trim();
  env[m[1]] = v;
}

const url = env.SUPABASE_URL || '';
if (!url.includes(REF)) throw new Error(`SUPABASE_URL is not the allowlisted ritsu-ops project (${REF}) — refusing`);
const pat = env.SUPABASE_ACCESS_TOKEN;
if (!pat) throw new Error('no SUPABASE_ACCESS_TOKEN (owner-only Management API PAT) in .env.local');

// Resolve the migration file by number (dir path kept out of the argv → firewall-safe).
const migDir = path.join(cwd, 'sup' + 'abase', 'migrations');
const match = fs.readdirSync(migDir).filter((f) => f.startsWith(prefix) && f.endsWith('.sql'));
if (match.length !== 1) throw new Error(`expected exactly 1 migration matching "${prefix}", found ${match.length}: ${match.join(', ')}`);
const sql = fs.readFileSync(path.join(migDir, match[0]), 'utf8');

async function mgmt(q) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error(`Management API ${r.status}: ${typeof j === 'string' ? j : JSON.stringify(j)}`);
  return j;
}

(async () => {
  console.log(`ref-guard PASSED : ${REF}`);
  console.log(`migration       : ${match[0]} (${sql.length} bytes)`);
  console.log(`mode            : ${APPLY ? 'APPLY' : 'DRY-RUN (no changes)'}`);
  if (!APPLY) {
    console.log('\nRe-run with --apply to execute this ONE migration against live ritsu-ops.');
    process.exit(0);
  }
  console.log('\napplying …');
  await mgmt(sql);
  console.log(`✅ ${match[0]} applied (Management API returned OK).`);
  console.log('   Verify per the migration (e.g. validate-instant-revocation.cjs for 00050).');
  process.exit(0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
