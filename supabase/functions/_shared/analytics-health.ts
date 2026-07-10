// analytics-health — pure verdict + report logic for the analytics-sync-health
// Edge Function (capability product-db-readonly-access, Door 2, Sprint 4 / Bước 3).
//
// Pure + dependency-free so it unit-tests in Node (tests/analytics-health.test.ts),
// mirroring _shared/dispatcher.ts. The Edge wrapper reads ritsu-analytics
// live._sync_runs AS the read-only analytics_reader (the PII canary already ran +
// logged during the sync), passes the rows here, then writes ops.kpi_snapshots +
// ops.alerts and delivers the detailed `message` to Telegram.

export interface SyncRunLatest {
  table_name: string;
  status: string;                 // 'ok' | 'failed'
  detail: string | null;          // sqlerrm on failure (may contain 'PII-canary tripped')
  rows_synced: number | null;
  started_ms: number | null;      // epoch ms — extract(epoch from started_at)*1000
  finished_ms: number | null;     // epoch ms
}

export interface HealthInput {
  nowMs: number;
  lastOkMs: number | null;        // max(finished_at) where status='ok' across all history, epoch ms
  latest: SyncRunLatest[];        // latest run per synced table (excludes _sync_runs)
}

export interface HealthResult {
  level: "healthy" | "warn" | "critical";
  freshnessHours: number;          // KPI analytics_sync_freshness
  canaryTrips: number;             // KPI analytics_pii_canary_trips
  failures: number;
  tablesOk: number;
  tablesTotal: number;
  totalRows: number;
  batchDurationMs: number | null;
  completionMs: number | null;     // max(finished_at) of the latest run
  slowest: { table: string; ms: number } | null;
  kpis: { kpi: string; value: number }[];
  alerts: { id: string; severity: "warning" | "critical"; message: string }[];
  message: string;                 // detailed multi-line Telegram body
}

export const SLO_WARN_HOURS = 26;
export const SLO_CRIT_HOURS = 48;
const STALE_INFINITY = 1e9;
/** Per-table sqlerrm carried into the alert — long enough to diagnose, short enough for Telegram. */
export const MAX_DETAIL_CHARS = 120;
/** Failed tables enumerated with their reason; any remainder is reported as "+N more", never dropped silently. */
export const MAX_FAILED_LISTED = 5;

const round1 = (n: number) => Math.round(n * 10) / 10;
const grp = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const fmtDur = (ms: number) => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`);
// fixed UTC+7 (Vietnam, no DST). fmtUtc("…11:02:34.000Z") → "04/06 11:02:34"
const fmtUtc = (ms: number) => {
  const i = new Date(ms).toISOString();
  return `${i.slice(8, 10)}/${i.slice(5, 7)} ${i.slice(11, 19)}`;
};
const fmtVn = (ms: number) => fmtUtc(ms + 7 * 3_600_000);

// ── failure reasons. sync_one logs sqlerrm to _sync_runs.detail on every abort path
//    (canary trip / 0-row guard / a remote FDW error such as "permission denied for
//    table pok_progress"). Without it the alert names a table but not a cause, and the
//    reader has to go query the analytics DB by hand to learn anything. Carry it. ──
/** First line of sqlerrm, whitespace-collapsed + truncated. "" when there is no usable detail. */
const fmtDetail = (detail: string | null): string => {
  const first = (detail ?? "").split("\n")[0].replace(/\s+/g, " ").trim();
  if (!first) return "";
  return first.length > MAX_DETAIL_CHARS ? `${first.slice(0, MAX_DETAIL_CHARS - 1)}…` : first;
};

/** "table (reason)", or a bare table name when the row carried no detail. */
const describeFailure = (r: SyncRunLatest): string => {
  const d = fmtDetail(r.detail);
  return d ? `${r.table_name} (${d})` : r.table_name;
};

/** Enumerate failed tables with reasons, capping the list EXPLICITLY (no silent truncation). */
const listFailures = (rows: SyncRunLatest[]): string => {
  const shown = rows.slice(0, MAX_FAILED_LISTED).map(describeFailure).join("; ");
  const rest = rows.length - MAX_FAILED_LISTED;
  return rest > 0 ? `${shown}; +${rest} more` : shown;
};

export function computeHealth(input: HealthInput): HealthResult {
  const freshnessHours =
    input.lastOkMs == null ? STALE_INFINITY : round1((input.nowMs - input.lastOkMs) / 3_600_000);

  const failedRows = input.latest.filter((r) => r.status !== "ok");
  const okRows = input.latest.filter((r) => r.status === "ok");
  const failures = failedRows.length;
  const canaryTrips = failedRows.filter((r) => (r.detail ?? "").toLowerCase().includes("canary")).length;
  const tablesTotal = input.latest.length;
  const tablesOk = okRows.length;
  const totalRows = okRows.reduce((s, r) => s + (r.rows_synced ?? 0), 0);

  const starts = input.latest.map((r) => r.started_ms).filter((x): x is number => x != null);
  const finishes = input.latest.map((r) => r.finished_ms).filter((x): x is number => x != null);
  const batchStartMs = starts.length ? Math.min(...starts) : null;
  const completionMs = finishes.length ? Math.max(...finishes) : null;
  const batchDurationMs = batchStartMs != null && completionMs != null ? completionMs - batchStartMs : null;

  let slowest: { table: string; ms: number } | null = null;
  for (const r of input.latest) {
    if (r.started_ms != null && r.finished_ms != null) {
      const ms = r.finished_ms - r.started_ms;
      if (!slowest || ms > slowest.ms) slowest = { table: r.table_name, ms: Math.round(ms) };
    }
  }

  // ── verdict + alerts (conditions match knowledge/alert-rules.yaml) ──
  const alerts: HealthResult["alerts"] = [];
  let level: HealthResult["level"] = "healthy";
  if (canaryTrips > 0) {
    level = "critical";
    alerts.push({ id: "analytics_pii_canary_trips_critical", severity: "critical",
      message: `PII canary tripped on ${canaryTrips} table(s); swap blocked (last-good kept).` });
  }
  if (failures > 0) {
    level = "critical";
    alerts.push({ id: "analytics_sync_table_failed", severity: "critical",
      message: `${failures} table(s) failed: ${listFailures(failedRows)}.` });
  }
  if (freshnessHours > SLO_CRIT_HOURS) {
    level = "critical";
    alerts.push({ id: "analytics_sync_freshness_critical", severity: "critical",
      message: `Stale ${freshnessHours}h (> ${SLO_CRIT_HOURS}h) — nightly sync failing.` });
  } else if (freshnessHours > SLO_WARN_HOURS) {
    if (level === "healthy") level = "warn";
    alerts.push({ id: "analytics_sync_freshness_stale", severity: "warning",
      message: `Stale ${freshnessHours}h (> ${SLO_WARN_HOURS}h SLO).` });
  }

  // ── detailed Telegram report ──
  const head = level === "healthy" ? "✅" : level === "warn" ? "🟡" : "🔴";
  const lvlVi = level === "healthy" ? "KHỎE MẠNH" : level === "warn" ? "CẢNH BÁO" : "NGHIÊM TRỌNG";
  const freshTxt = freshnessHours >= STALE_INFINITY ? "chưa từng sync" : `${freshnessHours}h`;
  const lines = [`${head} Ritsu · Đồng bộ analytics — ${lvlVi}`];
  if (completionMs != null) lines.push(`🕐 Hoàn thành: ${fmtVn(completionMs)} (VN) · ${fmtUtc(completionMs)} UTC`);
  if (batchDurationMs != null) {
    lines.push(`⏱️ Thời lượng: ${fmtDur(batchDurationMs)}${slowest ? ` · chậm nhất: ${slowest.table} (${slowest.ms}ms)` : ""}`);
  }
  lines.push(`📊 ${tablesOk}/${tablesTotal} bảng OK · ${grp(totalRows)} dòng · PII canary: ${canaryTrips}`);
  lines.push(`🔒 Độ tươi: ${freshTxt} (SLO ≤${SLO_WARN_HOURS}h)`);
  if (alerts.length) lines.push(`⚠️ ${alerts.map((a) => a.message).join(" ")}`);

  return {
    level, freshnessHours, canaryTrips, failures,
    tablesOk, tablesTotal, totalRows, batchDurationMs, completionMs, slowest,
    kpis: [
      { kpi: "analytics_sync_freshness", value: freshnessHours },
      { kpi: "analytics_pii_canary_trips", value: canaryTrips },
    ],
    alerts,
    message: lines.join("\n"),
  };
}
