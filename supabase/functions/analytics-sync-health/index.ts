// analytics-sync-health — Edge Function (Deno) for capability product-db-readonly-access
// (Door 2, Sprint 4 / Bước 3 Option 2). Unattended monitoring of the nightly
// ritsu-analytics sync: reads live._sync_runs AS the least-priv read-only
// analytics_reader role, computes freshness + canary/failure verdict (pure logic in
// ../_shared/analytics-health.ts), upserts the 2 KPIs to ops.kpi_snapshots, raises
// ops.alerts on breach, and delivers DIRECTLY to Telegram (the alert-router backbone
// is not built yet; the bot token exists → direct delivery is the pragmatic path).
//
// SECURITY: connects to ritsu-analytics as analytics_reader (SELECT on live.* only —
// the canary already ran + logged during the sync, so no EXECUTE / Management token
// is needed here). Writes ONLY to ops.* (its own project). Never touches Product.
//
// DEPLOY (founder — ops infra + secrets, see the PR / spec §7):
//   supabase functions deploy analytics-sync-health --project-ref <ritsu-ops>
//   supabase secrets set ANALYTICS_READER_DB_URL=... ANALYTICS_HEALTH_SECRET=... \
//       TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=...   (SUPABASE_URL/SERVICE key already set)
//   then schedule a daily POST (12:00 UTC — after the 11:00 UTC sync) via Supabase
//   cron or pg_cron + pg_net, with header  x-analytics-health-auth: <ANALYTICS_HEALTH_SECRET>

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Client as PgClient } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { computeHealth, type SyncRunLatest } from "../_shared/analytics-health.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANALYTICS_READER_DB_URL = Deno.env.get("ANALYTICS_READER_DB_URL") ?? "";
const HEALTH_SECRET = Deno.env.get("ANALYTICS_HEALTH_SECRET") ?? "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";

// ops writer (service role, schema ops)
const ops = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: "ops" },
});

async function readAnalyticsHealth(): Promise<{ lastOkMs: number | null; latest: SyncRunLatest[] }> {
  // analytics_reader (read-only). Pooler cert → don't enforce verification (Sprint-1 gotcha).
  const pg = new PgClient(ANALYTICS_READER_DB_URL + (ANALYTICS_READER_DB_URL.includes("?") ? "&" : "?") + "sslmode=require");
  await pg.connect();
  try {
    const fr = await pg.queryObject<{ last_ok: Date | null }>(
      `select max(finished_at) as last_ok from live._sync_runs where status = 'ok'`,
    );
    const latest = await pg.queryObject<SyncRunLatest>(
      `select table_name, status, detail
       from (select distinct on (table_name) table_name, status, detail
             from live._sync_runs order by table_name, id desc) s`,
    );
    const lastOk = fr.rows[0]?.last_ok ?? null;
    return { lastOkMs: lastOk ? new Date(lastOk).getTime() : null, latest: latest.rows };
  } finally {
    await pg.end();
  }
}

async function telegram(text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return; // delivery not configured → skip (alert still in ops.alerts)
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
  }).catch(() => {});
}

serve(async (req) => {
  if (HEALTH_SECRET && req.headers.get("x-analytics-health-auth") !== HEALTH_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  try {
    const { lastOkMs, latest } = await readAnalyticsHealth();
    const h = computeHealth({ nowMs: Date.now(), lastOkMs, latest });

    // 1. KPIs → ops.kpi_snapshots (time-series; one row per measurement)
    await ops.from("kpi_snapshots").insert(
      h.kpis.map((k) => ({
        kpi_id: k.kpi,
        value: k.value,
        unit: k.kpi === "analytics_sync_freshness" ? "hours" : "count",
        source: "computed",
        dimensions: { capability: "product-db-readonly-access", surface: "ritsu-analytics" },
      })),
    );

    // 2. Alerts → ops.alerts (only on breach)
    if (h.alerts.length) {
      await ops.from("alerts").insert(
        h.alerts.map((a) => ({
          rule_id: a.id,
          severity: a.severity,
          triggering_kpi: a.id.includes("canary") ? "analytics_pii_canary_trips" : "analytics_sync_freshness",
          triggering_value: a.id.includes("canary") ? h.canaryTrips : h.freshnessHours,
          payload: { message: a.message, level: h.level, failures: h.failures },
          state: "firing",
        })),
      );
    }

    // 3. Direct Telegram — deliver the sync RESULT every run (daily heartbeat:
    //    ✅ healthy / 🟡 warn / 🔴 critical). Interim until the alert-router backbone lands.
    await telegram(h.message);

    return new Response(JSON.stringify({ ok: true, ...h }), {
      status: h.level === "critical" ? 503 : 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    // a check that cannot run is itself an alertable condition
    await ops.from("alerts").insert({
      rule_id: "analytics_sync_health_check_error",
      severity: "warning",
      payload: { message: String((e as Error).message ?? e) },
      state: "firing",
    }).catch(() => {});
    await telegram(`🟡 analytics-sync-health check ERROR: ${(e as Error).message ?? e}`);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), { status: 500 });
  }
});
