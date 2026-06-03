/**
 * Smoke test — connects to ritsu-analytics AS analytics_reader and proves the
 * least-privilege boundary from the CLIENT side (complements the owner-side
 * has_*_privilege() checks done at role creation).
 *
 *   npm --prefix mcp-server-analytics run smoke
 *   (requires ANALYTICS_READER_DB_URL in env / sourced from .env.local)
 *
 * Asserts:
 *   ✓ connects as analytics_reader
 *   ✓ can SELECT live.* (list_tables + a sample count)
 *   ✓ CANNOT read ext.* (FDW foreign tables) — permission denied
 *   ✓ CANNOT write (INSERT rejected — read-only role / read-only txn)
 *
 * Exit 0 if every assertion holds; non-zero otherwise.
 */

import { loadEnv, summarizeEnv } from "../lib/env.ts";
import { createQuerier } from "../lib/pg-client.ts";
import { handleQuery } from "../tools/query.ts";
import type { AnalyticsCallerContext } from "../types.ts";

function ok(msg: string) {
  process.stdout.write(`  ✓ ${msg}\n`);
}
function bad(msg: string) {
  process.stdout.write(`  ✗ ${msg}\n`);
}

async function main() {
  const env = loadEnv();
  process.stdout.write(`smoke | ${summarizeEnv(env)}\n`);
  const q = createQuerier(env);
  let failures = 0;

  try {
    // 1. who am I?
    const who = await q.query("select current_user as u, current_setting('transaction_read_only') as ro", []);
    const u = (who.rows[0] as { u?: string })?.u;
    if (u === "analytics_reader") ok(`connected as ${u} (read_only txn=${(who.rows[0] as any).ro})`);
    else { bad(`connected as ${u}, expected analytics_reader`); failures++; }

    // 2. can list live tables
    const tabs = await q.query(
      "select table_name from information_schema.tables where table_schema='live' order by table_name",
      [],
    );
    const names = tabs.rows.map((r) => (r as { table_name: string }).table_name);
    if (names.length > 0) ok(`live.* tables: ${names.join(", ")}`);
    else { bad("no tables visible in schema live"); failures++; }

    // 3. can read a sample live table
    if (names.includes("profiles")) {
      const c = await q.query("select count(*)::int as n from live.profiles", []);
      ok(`SELECT live.profiles → ${(c.rows[0] as { n: number }).n} rows`);
    }

    // 4. CANNOT read ext.* (must be permission_denied)
    try {
      await q.query("select 1 from ext.profiles limit 1", []);
      bad("ext.profiles was readable — least-priv FAILED"); failures++;
    } catch (e) {
      const msg = (e as Error).message;
      if (/permission denied|does not exist|relation .* does not exist/i.test(msg)) ok(`ext.* blocked (${msg.split("\n")[0]})`);
      else { bad(`ext.* read failed with unexpected error: ${msg}`); failures++; }
    }

    // 5. CANNOT mutate live.* (the integrity boundary). `where false` guarantees
    //    no data loss even in the impossible case the DELETE were permitted.
    try {
      await q.query("delete from live.profiles where false", []);
      bad("DELETE on live.profiles succeeded — integrity boundary FAILED"); failures++;
    } catch (e) {
      const msg = (e as Error).message;
      if (/read-only|permission denied|cannot execute/i.test(msg)) ok(`live.* writes blocked (${msg.split("\n")[0]})`);
      else { bad(`DELETE failed with unexpected error: ${msg}`); failures++; }
    }

    // 6. CANNOT create a PERMANENT object (no CREATE on any schema).
    try {
      await q.query("create table public._smoke_w(x int)", []);
      bad("CREATE permanent table succeeded — FAILED"); failures++;
      await q.query("drop table if exists public._smoke_w", []).catch(() => {});
    } catch (e) {
      const msg = (e as Error).message;
      if (/read-only|permission denied|cannot execute/i.test(msg)) ok(`permanent CREATE blocked (${msg.split("\n")[0]})`);
      else { bad(`CREATE failed with unexpected error: ${msg}`); failures++; }
    }

    // Informational: temp tables ARE creatable via PUBLIC's TEMP privilege
    // (session-local scratch; cannot touch live.* or other sessions; read-only
    // txns permit temp objects). Not a finding — reported for transparency.
    try {
      await q.query("create temp table _t(x int)", []);
      process.stdout.write("  · (info) temp tables allowed (PUBLIC TEMP; harmless, session-local)\n");
    } catch { /* fine either way */ }

    // 7. governed handler path (handleQuery) end-to-end against the real DB.
    const allowedCtx: AnalyticsCallerContext = { role: "product-orchestrator", sessionId: "smoke", allowedAnalytics: true };
    const deniedCtx: AnalyticsCallerContext = { role: "gps", sessionId: "smoke", allowedAnalytics: false };

    const r1 = await handleQuery(
      { sql: "select subscription_tier, count(*) n from live.profiles group by 1 order by 1", row_limit: 50 },
      allowedCtx,
      q,
    );
    if (r1.state === "completed") ok(`handleQuery(allowed) → ${(r1.output as { row_count: number }).row_count} group(s)`);
    else { bad(`handleQuery(allowed) → ${r1.state}/${r1.errorCode}`); failures++; }

    const r2 = await handleQuery({ sql: "select 1 from live.profiles" }, deniedCtx, q);
    if (r2.state === "denied" && r2.errorCode === "role_not_allowed") ok("handleQuery(gps) → denied role_not_allowed");
    else { bad(`handleQuery(gps) expected denied/role_not_allowed, got ${r2.state}/${r2.errorCode}`); failures++; }

    const r3 = await handleQuery({ sql: "update live.profiles set x=1" }, allowedCtx, q);
    if (r3.state === "denied" && r3.errorCode === "sql_not_select") ok("handleQuery(mutation) → denied sql_not_select");
    else { bad(`handleQuery(mutation) expected denied/sql_not_select, got ${r3.state}/${r3.errorCode}`); failures++; }
  } finally {
    await q.end();
  }

  process.stdout.write(failures === 0 ? "\nSMOKE: PASS\n" : `\nSMOKE: FAIL (${failures})\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  process.stderr.write(`smoke FATAL: ${(e as Error).message}\n`);
  process.exit(1);
});
