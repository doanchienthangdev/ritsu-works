// analytics-health — pure verdict logic for the analytics-sync-health Edge Function
// (capability product-db-readonly-access, Door 2, Sprint 4 / Bước 3 Option 2).
//
// Pure + dependency-free so it unit-tests in Node (tests/analytics-health.test.ts),
// mirroring _shared/dispatcher.ts. The Edge wrapper (../analytics-sync-health/index.ts)
// reads ritsu-analytics live._sync_runs AS the read-only analytics_reader role
// (the PII canary already ran + logged during the sync — we read its result, we do
// not need EXECUTE on the function), passes the rows here, then writes
// ops.kpi_snapshots + ops.alerts and delivers to Telegram on breach.

export interface SyncRunLatest {
  table_name: string;
  status: string;            // 'ok' | 'failed'
  detail: string | null;     // sqlerrm on failure (may contain 'PII-canary tripped')
}

export interface HealthInput {
  nowMs: number;             // Date.now() at check time
  lastOkMs: number | null;   // max(finished_at) where status='ok', epoch ms; null = never
  latest: SyncRunLatest[];   // latest run per synced table (excludes _sync_runs)
}

export interface HealthResult {
  level: "healthy" | "warn" | "critical";
  freshnessHours: number;          // KPI analytics_sync_freshness
  canaryTrips: number;             // KPI analytics_pii_canary_trips
  failures: number;                // # tables whose latest run != ok
  kpis: { kpi: string; value: number }[];
  alerts: { id: string; severity: "warning" | "critical"; message: string }[];
  message: string;                 // human one-liner (Telegram body)
}

export const SLO_WARN_HOURS = 26;
export const SLO_CRIT_HOURS = 48;
const STALE_INFINITY = 1e9;        // "never synced" sentinel for the freshness KPI

// Matches knowledge/alert-rules.yaml conditions (kpi.analytics_pii_canary_trips >= 1,
// kpi.analytics_sync_freshness > 26 / > 48).
export function computeHealth(input: HealthInput): HealthResult {
  const freshnessHours =
    input.lastOkMs == null
      ? STALE_INFINITY
      : Math.round(((input.nowMs - input.lastOkMs) / 3_600_000) * 10) / 10;

  const failedRows = input.latest.filter((r) => r.status !== "ok");
  const failures = failedRows.length;
  const canaryTrips = failedRows.filter(
    (r) => (r.detail ?? "").toLowerCase().includes("canary"),
  ).length;

  const alerts: HealthResult["alerts"] = [];
  let level: HealthResult["level"] = "healthy";

  if (canaryTrips > 0) {
    level = "critical";
    alerts.push({
      id: "analytics_pii_canary_trips_critical",
      severity: "critical",
      message: `P0 — PII canary tripped on ${canaryTrips} table(s); the swap was blocked (last-good kept). Investigate the product analytics_export.* views immediately.`,
    });
  }
  if (failures > 0) {
    if (level !== "critical") level = "critical";
    alerts.push({
      id: "analytics_sync_table_failed",
      severity: "critical",
      message: `${failures} table(s) failed their latest sync: ${failedRows.map((r) => r.table_name).join(", ")}.`,
    });
  }
  if (freshnessHours > SLO_CRIT_HOURS) {
    level = "critical";
    alerts.push({
      id: "analytics_sync_freshness_critical",
      severity: "critical",
      message: `Analytics dataset stale ${freshnessHours}h (> ${SLO_CRIT_HOURS}h) — the nightly sync has been failing.`,
    });
  } else if (freshnessHours > SLO_WARN_HOURS) {
    if (level === "healthy") level = "warn";
    alerts.push({
      id: "analytics_sync_freshness_stale",
      severity: "warning",
      message: `Analytics dataset stale ${freshnessHours}h (> ${SLO_WARN_HOURS}h SLO) — last nightly sync may have failed.`,
    });
  }

  const message =
    level === "healthy"
      ? `✅ analytics sync healthy — freshness ${freshnessHours}h, canary 0, ${input.latest.length} tables ok.`
      : `${level === "critical" ? "🔴" : "🟡"} analytics sync ${level.toUpperCase()} — ${alerts.map((a) => a.message).join(" ")}`;

  return {
    level,
    freshnessHours,
    canaryTrips,
    failures,
    kpis: [
      { kpi: "analytics_sync_freshness", value: freshnessHours },
      { kpi: "analytics_pii_canary_trips", value: canaryTrips },
    ],
    alerts,
    message,
  };
}
