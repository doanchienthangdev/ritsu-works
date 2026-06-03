#!/usr/bin/env node
/**
 * Sprint 4 — analytics sync HEALTH CHECK (capability product-db-readonly-access, C4).
 *
 * Reads ritsu-analytics `live._sync_runs` + actively re-runs `live.pii_canary()`
 * across every synced table, and emits a verdict + exit code that the daily
 * schedule handler turns into ops.alerts → Telegram (per knowledge/alert-rules.yaml
 * rules analytics_pii_canary_trips_critical / analytics_sync_freshness_*).
 *
 * Two operational KPIs (knowledge/kpi-registry.yaml):
 *   - analytics_sync_freshness     = hours since the last successful nightly sync
 *                                    (warn > 26h, critical > 48h).
 *   - analytics_pii_canary_trips   = # of canary trips (MUST be 0; any >0 is P0).
 *
 * SAFETY: targets the ANALYTICS ref ONLY (hardcoded expected + asserted ≠ product
 *   ref); read-only Management-API SELECTs; no product contact; no DB tokens in any
 *   shell command (node FILE). Mirrors scripts/sync helpers' self-guard pattern.
 *
 * Exit code: 0 = healthy · 1 = warn (stale 26–48h) · 2 = critical (stale >48h OR
 *   any canary trip OR any non-ok latest sync) · 3 = could not check (infra error).
 *
 * Output: human summary on stdout, plus a machine line `HEALTH {json}` the schedule
 *   handler parses to upsert ops.kpi_snapshots + raise ops.alerts.
 *
 * Run:  node scripts/cross-tier/check-analytics-sync-health.cjs [--json]
 */

const fs = require('node:fs');
const ENV = '/Users/doanchienthang/ritsu-works/runtime/secrets/.env.local';
const EXPECTED_ANALYTICS_REF = 'ddgbabvbfjrsznvzhizf';
const SLO_WARN_HOURS = 26;
const SLO_CRIT_HOURS = 48;

function loadEnv() {
  const e = {};
  // worktrees lack runtime/secrets → resolve the main repo root via the marker.
  let path = ENV;
  if (!fs.existsSync(path)) {
    const m = __dirname.split('/.claude/worktrees/')[0];
    if (m) path = `${m}/runtime/secrets/.env.local`;
  }
  for (const l of fs.readFileSync(path, 'utf8').split('\n')) {
    const mm = l.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (mm) { let v = mm[2].trim(); if (/^["'].*["']$/.test(v)) v = v.slice(1, -1); e[mm[1]] = v; }
  }
  return e;
}

async function main() {
  const e = loadEnv();
  const TOKEN = e.SUPABASE_ACCESS_TOKEN, REF = e.ANALYTICS_PROJECT_REF, PROD = e.PRODUCT_PROJECT_REF;
  if (!TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN missing');
  if (REF !== EXPECTED_ANALYTICS_REF) throw new Error(`ANALYTICS_PROJECT_REF=${REF} ≠ expected ${EXPECTED_ANALYTICS_REF}`);
  if (!PROD || REF === PROD) throw new Error('refusing — analytics ref collides with/equals product ref');

  const API = `https://api.supabase.com/v1/projects/${REF}/database/query`;
  const q = async (sql) => {
    const r = await fetch(API, { method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }) });
    const t = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${t}`);
    return JSON.parse(t);
  };

  // 1. freshness — hours since the most recent SUCCESSFUL sync of any table.
  const fr = await q(`select coalesce(extract(epoch from (now() - max(finished_at)))/3600, 1e9) as hours,
                             to_char(max(finished_at),'YYYY-MM-DD HH24:MI') as last_ok_utc
                      from live._sync_runs where status = 'ok'`);
  const freshnessHours = Math.round(Number(fr[0].hours) * 10) / 10;
  const lastOkUtc = fr[0].last_ok_utc;

  // 2. latest run per table — every one must be 'ok'.
  const latest = await q(`select distinct on (table_name) table_name, status, rows_synced, detail
                          from live._sync_runs order by table_name, id desc`);
  const notOk = latest.filter((r) => r.status !== 'ok');

  // 3. ACTIVE canary — re-scan every live table now (array-aware). Sum MUST be 0.
  const tables = latest.map((r) => r.table_name); // the synced set (excludes _sync_runs)
  let canaryTrips = 0;
  const canaryDetail = [];
  if (tables.length) {
    const row = (await q('select ' + tables.map((t, i) =>
      `live.pii_canary('live','${t}') as t${i}`).join(', ')))[0];
    tables.forEach((t, i) => { const n = Number(row[`t${i}`]); if (n) { canaryTrips += n; canaryDetail.push(`${t}=${n}`); } });
  }

  // verdict
  let level = 'healthy', exit = 0;
  const reasons = [];
  if (canaryTrips > 0) { level = 'critical'; exit = 2; reasons.push(`PII canary tripped (${canaryDetail.join(', ')})`); }
  if (notOk.length)    { level = 'critical'; exit = 2; reasons.push(`${notOk.length} table(s) not ok: ${notOk.map((r) => r.table_name).join(', ')}`); }
  if (freshnessHours > SLO_CRIT_HOURS) { level = 'critical'; exit = 2; reasons.push(`stale ${freshnessHours}h > ${SLO_CRIT_HOURS}h`); }
  else if (freshnessHours > SLO_WARN_HOURS && exit < 2) { level = 'warn'; exit = 1; reasons.push(`stale ${freshnessHours}h > ${SLO_WARN_HOURS}h`); }

  const health = {
    level, exit,
    analytics_sync_freshness: freshnessHours,   // KPI 1
    analytics_pii_canary_trips: canaryTrips,     // KPI 2
    tables_synced: tables.length,
    last_ok_utc: lastOkUtc,
    reasons,
  };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(health));
  } else {
    console.log(`analytics sync health: ${level.toUpperCase()}`);
    console.log(`  freshness        : ${freshnessHours}h (last ok ${lastOkUtc} UTC; SLO warn ${SLO_WARN_HOURS}h / crit ${SLO_CRIT_HOURS}h)`);
    console.log(`  PII canary trips : ${canaryTrips}  (MUST be 0)`);
    console.log(`  tables synced    : ${tables.length}`);
    if (reasons.length) console.log(`  reasons          : ${reasons.join(' | ')}`);
    // machine line for the schedule handler (ops.kpi_snapshots upsert + ops.alerts raise)
    console.log(`HEALTH ${JSON.stringify(health)}`);
  }
  process.exit(exit);
}

main().catch((x) => { console.error(`HEALTH-CHECK ERROR: ${x.message}`); process.exit(3); });
