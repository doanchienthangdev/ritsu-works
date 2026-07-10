import { describe, it, expect } from "vitest";
import {
  computeHealth,
  SLO_WARN_HOURS,
  SLO_CRIT_HOURS,
  MAX_DETAIL_CHARS,
  MAX_FAILED_LISTED,
  type HealthInput,
  type SyncRunLatest,
} from "../supabase/functions/_shared/analytics-health.ts";

const NOW = 1_750_000_000_000; // fixed epoch ms (the fn never calls Date.now())
const hoursAgo = (h: number) => NOW - h * 3_600_000;

// one synced-table row with sensible defaults (duration 100ms, 100 rows)
const row = (over: Partial<SyncRunLatest> = {}): SyncRunLatest => ({
  table_name: "t",
  status: "ok",
  detail: null,
  rows_synced: 100,
  started_ms: NOW - 500,
  finished_ms: NOW - 400,
  ...over,
});
const okTables = (n = 17): SyncRunLatest[] =>
  Array.from({ length: n }, (_, i) => row({ table_name: `t${i}` }));

const base = (over: Partial<HealthInput> = {}): HealthInput => ({
  nowMs: NOW,
  lastOkMs: hoursAgo(1),
  latest: okTables(),
  ...over,
});

describe("computeHealth", () => {
  describe("happy path", () => {
    it("fresh + all ok + no canary → healthy", () => {
      const r = computeHealth(base());
      expect(r.level).toBe("healthy");
      expect(r.canaryTrips).toBe(0);
      expect(r.failures).toBe(0);
      expect(r.alerts).toEqual([]);
    });

    it("emits both KPIs every time, in order", () => {
      const r = computeHealth(base());
      expect(r.kpis).toEqual([
        { kpi: "analytics_sync_freshness", value: r.freshnessHours },
        { kpi: "analytics_pii_canary_trips", value: r.canaryTrips },
      ]);
    });

    it("freshness is rounded to 0.1h", () => {
      const r = computeHealth(base({ lastOkMs: NOW - 1.23456 * 3_600_000 }));
      expect(r.freshnessHours).toBe(1.2);
    });
  });

  describe("computed report fields", () => {
    it("totalRows = sum of ok rows' rows_synced", () => {
      const r = computeHealth(base({ latest: okTables(17) }));
      expect(r.totalRows).toBe(1700);
      expect(r.tablesOk).toBe(17);
      expect(r.tablesTotal).toBe(17);
    });

    it("failed rows excluded from totalRows; counted in failures", () => {
      const latest = okTables(16).concat(row({ table_name: "x", status: "failed", detail: "boom", rows_synced: null }));
      const r = computeHealth(base({ latest }));
      expect(r.totalRows).toBe(1600);
      expect(r.tablesOk).toBe(16);
      expect(r.failures).toBe(1);
    });

    it("batchDurationMs = max(finished) - min(started); completionMs = max(finished)", () => {
      const latest = [
        row({ table_name: "a", started_ms: NOW - 1000, finished_ms: NOW - 800 }), // dur 200
        row({ table_name: "b", started_ms: NOW - 800, finished_ms: NOW - 300 }),  // dur 500
      ];
      const r = computeHealth(base({ latest }));
      expect(r.batchDurationMs).toBe(700); // (NOW-300) - (NOW-1000)
      expect(r.completionMs).toBe(NOW - 300);
      expect(r.slowest).toEqual({ table: "b", ms: 500 });
    });

    it("null timing → batchDuration/completion/slowest null, no crash", () => {
      const latest = [row({ started_ms: null, finished_ms: null })];
      const r = computeHealth(base({ latest }));
      expect(r.batchDurationMs).toBeNull();
      expect(r.completionMs).toBeNull();
      expect(r.slowest).toBeNull();
    });
  });

  describe("detailed message", () => {
    it("healthy message has ✅ + completion + duration + tables + freshness lines", () => {
      const r = computeHealth(base());
      expect(r.message).toContain("✅");
      expect(r.message).toContain("KHỎE MẠNH");
      expect(r.message).toContain("🕐 Hoàn thành:");
      expect(r.message).toContain("⏱️ Thời lượng:");
      expect(r.message).toContain("📊 17/17 bảng OK");
      expect(r.message).toContain("🔒 Độ tươi:");
      expect(r.message).toContain("1.700 dòng"); // grouped thousands
    });

    it("formats sub-second duration as ms, the slowest table named", () => {
      const latest = [
        row({ table_name: "fast", started_ms: NOW - 510, finished_ms: NOW - 500 }), // 10ms
        row({ table_name: "learning_units", started_ms: NOW - 600, finished_ms: NOW - 475 }), // 125ms
      ];
      const r = computeHealth(base({ latest }));
      expect(r.message).toContain("chậm nhất: learning_units (125ms)");
    });

    it("critical message has 🔴 + the reason line", () => {
      const latest = okTables(16).concat(row({ table_name: "profiles", status: "failed", detail: "PII-canary tripped (3)" }));
      const r = computeHealth(base({ latest }));
      expect(r.message).toContain("🔴");
      expect(r.message).toContain("NGHIÊM TRỌNG");
      expect(r.message).toContain("⚠️");
    });
  });

  describe("freshness SLO boundaries", () => {
    it("exactly 26h → healthy (> strict)", () => {
      expect(computeHealth(base({ lastOkMs: hoursAgo(SLO_WARN_HOURS) })).level).toBe("healthy");
    });
    it("26.1h → warn", () => {
      const r = computeHealth(base({ lastOkMs: hoursAgo(26.1) }));
      expect(r.level).toBe("warn");
      expect(r.alerts.map((a) => a.id)).toContain("analytics_sync_freshness_stale");
    });
    it("exactly 48h → warn (not critical)", () => {
      expect(computeHealth(base({ lastOkMs: hoursAgo(SLO_CRIT_HOURS) })).level).toBe("warn");
    });
    it("48.1h → critical", () => {
      const r = computeHealth(base({ lastOkMs: hoursAgo(48.1) }));
      expect(r.level).toBe("critical");
      expect(r.alerts.map((a) => a.id)).toContain("analytics_sync_freshness_critical");
    });
    it("never synced (lastOkMs null) → critical + 'chưa từng sync'", () => {
      const r = computeHealth(base({ lastOkMs: null }));
      expect(r.level).toBe("critical");
      expect(r.freshnessHours).toBeGreaterThan(1e8);
      expect(r.message).toContain("chưa từng sync");
    });
  });

  describe("canary trips (P0)", () => {
    it("failed row mentioning canary → critical canary alert", () => {
      const latest = okTables(16).concat(row({ table_name: "profiles", status: "failed", detail: "PII-canary tripped (3 suspect cells)" }));
      const r = computeHealth(base({ latest }));
      expect(r.level).toBe("critical");
      expect(r.canaryTrips).toBe(1);
      expect(r.alerts.some((a) => a.id === "analytics_pii_canary_trips_critical")).toBe(true);
    });
    it("canary match is case-insensitive", () => {
      expect(computeHealth(base({ latest: [row({ status: "failed", detail: "PII-CANARY TRIPPED" })] })).canaryTrips).toBe(1);
    });
    it("non-canary failure → failure, not canary trip", () => {
      const r = computeHealth(base({ latest: [row({ status: "failed", detail: "0 rows but live had 5 — abort" })] }));
      expect(r.canaryTrips).toBe(0);
      expect(r.failures).toBe(1);
      expect(r.level).toBe("critical");
    });
    it("failed row with null detail → failure, not canary", () => {
      const r = computeHealth(base({ latest: [row({ status: "failed", detail: null })] }));
      expect(r.canaryTrips).toBe(0);
      expect(r.failures).toBe(1);
    });
  });

  // The alert must carry sync_one's sqlerrm, not just the table name. Regression:
  // 2026-07-07..09 the nightly sync failed on user_pok_analytics three nights running
  // and every Telegram alert read only "1 table(s) failed: user_pok_analytics." — the
  // actual cause ("permission denied for table pok_progress", a product-side privilege
  // regression) was sitting unread in live._sync_runs.detail the whole time.
  describe("failure reason surfaced in the alert (regression: user_pok_analytics 2026-07-07)", () => {
    const failed = (over: Partial<SyncRunLatest> = {}) =>
      row({ table_name: "user_pok_analytics", status: "failed", rows_synced: null, ...over });

    it("names the failing table AND its sqlerrm in the alert message", () => {
      const latest = okTables(29).concat(failed({ detail: "permission denied for table pok_progress" }));
      const r = computeHealth(base({ latest }));
      const alert = r.alerts.find((a) => a.id === "analytics_sync_table_failed")!;
      expect(alert.message).toBe(
        "1 table(s) failed: user_pok_analytics (permission denied for table pok_progress).",
      );
    });

    it("the reason reaches the Telegram body, not just the alert record", () => {
      const latest = okTables(29).concat(failed({ detail: "permission denied for table pok_progress" }));
      const r = computeHealth(base({ latest }));
      expect(r.message).toContain("permission denied for table pok_progress");
      expect(r.message).toContain("29/30 bảng OK");
    });

    it("null detail → bare table name, no empty parentheses", () => {
      const r = computeHealth(base({ latest: [failed({ detail: null })] }));
      const alert = r.alerts.find((a) => a.id === "analytics_sync_table_failed")!;
      expect(alert.message).toBe("1 table(s) failed: user_pok_analytics.");
      expect(alert.message).not.toContain("()");
    });

    it("whitespace-only detail is treated as no detail", () => {
      const r = computeHealth(base({ latest: [failed({ detail: " \t\n " })] }));
      expect(r.alerts[0].message).toBe("1 table(s) failed: user_pok_analytics.");
    });

    it("multi-line sqlerrm → only the first line is used", () => {
      const r = computeHealth(base({ latest: [failed({ detail: "permission denied\nCONTEXT: SQL statement" })] }));
      expect(r.alerts[0].message).toBe("1 table(s) failed: user_pok_analytics (permission denied).");
      expect(r.alerts[0].message).not.toContain("CONTEXT");
    });

    it("internal whitespace is collapsed to single spaces", () => {
      const r = computeHealth(base({ latest: [failed({ detail: "permission   denied \t for table" })] }));
      expect(r.alerts[0].message).toContain("(permission denied for table)");
    });

    it(`detail of exactly ${MAX_DETAIL_CHARS} chars is kept whole`, () => {
      const d = "x".repeat(MAX_DETAIL_CHARS);
      const r = computeHealth(base({ latest: [failed({ detail: d })] }));
      expect(r.alerts[0].message).toContain(`(${d})`);
      expect(r.alerts[0].message).not.toContain("…");
    });

    it(`detail longer than ${MAX_DETAIL_CHARS} chars is truncated with an ellipsis`, () => {
      const r = computeHealth(base({ latest: [failed({ detail: "y".repeat(MAX_DETAIL_CHARS + 50) })] }));
      const msg = r.alerts[0].message;
      expect(msg).toContain("…");
      expect(msg).toContain(`(${"y".repeat(MAX_DETAIL_CHARS - 1)}…)`);
    });

    it("unicode / emoji in detail does not crash and is preserved", () => {
      const r = computeHealth(base({ latest: [failed({ detail: "lỗi đồng bộ 🔴" })] }));
      expect(r.alerts[0].message).toContain("(lỗi đồng bộ 🔴)");
    });

    it("multiple failures are separated by '; ' with per-table reasons", () => {
      const latest = [
        failed({ table_name: "a", detail: "boom a" }),
        failed({ table_name: "b", detail: "boom b" }),
      ];
      const r = computeHealth(base({ latest }));
      expect(r.alerts[0].message).toBe("2 table(s) failed: a (boom a); b (boom b).");
    });

    it(`exactly ${MAX_FAILED_LISTED} failures → all listed, no "+N more"`, () => {
      const latest = Array.from({ length: MAX_FAILED_LISTED }, (_, i) =>
        failed({ table_name: `t${i}`, detail: `e${i}` }));
      const r = computeHealth(base({ latest }));
      expect(r.failures).toBe(MAX_FAILED_LISTED);
      expect(r.alerts[0].message).not.toContain("more");
      expect(r.alerts[0].message).toContain(`t${MAX_FAILED_LISTED - 1} (e${MAX_FAILED_LISTED - 1})`);
    });

    it(`more than ${MAX_FAILED_LISTED} failures → overflow reported explicitly, never dropped silently`, () => {
      const latest = Array.from({ length: MAX_FAILED_LISTED + 3 }, (_, i) =>
        failed({ table_name: `t${i}`, detail: `e${i}` }));
      const r = computeHealth(base({ latest }));
      expect(r.failures).toBe(MAX_FAILED_LISTED + 3); // count is never capped
      expect(r.alerts[0].message).toContain("+3 more");
      expect(r.alerts[0].message).toContain("t0 (e0)");
      expect(r.alerts[0].message).not.toContain(`t${MAX_FAILED_LISTED} (`); // beyond the cap
    });

    it("a canary trip is still counted as a canary AND named with its reason", () => {
      const latest = okTables(29).concat(
        failed({ table_name: "profiles", detail: "PII-canary tripped (3 suspect cells)" }));
      const r = computeHealth(base({ latest }));
      expect(r.canaryTrips).toBe(1);
      expect(r.message).toContain("profiles (PII-canary tripped (3 suspect cells))");
    });

    it("surfacing detail does not change totalRows / tablesOk accounting", () => {
      const latest = okTables(29).concat(failed({ detail: "permission denied for table pok_progress" }));
      const r = computeHealth(base({ latest }));
      expect(r.totalRows).toBe(2900);
      expect(r.tablesOk).toBe(29);
      expect(r.tablesTotal).toBe(30);
    });
  });

  describe("combined + edge", () => {
    it("canary + stale → critical, both alerts", () => {
      const latest = okTables(16).concat(row({ table_name: "p", status: "failed", detail: "PII-canary tripped (1)" }));
      const r = computeHealth(base({ latest, lastOkMs: hoursAgo(50) }));
      const ids = r.alerts.map((a) => a.id);
      expect(r.level).toBe("critical");
      expect(ids).toContain("analytics_pii_canary_trips_critical");
      expect(ids).toContain("analytics_sync_freshness_critical");
    });
    it("warn freshness does not downgrade a failure-critical", () => {
      const r = computeHealth(base({ latest: [row({ status: "failed", detail: null })], lastOkMs: hoursAgo(30) }));
      expect(r.level).toBe("critical");
    });
    it("empty latest → healthy, 0 tables, no crash", () => {
      const r = computeHealth(base({ latest: [] }));
      expect(r.level).toBe("healthy");
      expect(r.tablesTotal).toBe(0);
      expect(r.totalRows).toBe(0);
      expect(r.batchDurationMs).toBeNull();
    });
  });
});
