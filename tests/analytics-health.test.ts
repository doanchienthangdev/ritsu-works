import { describe, it, expect } from "vitest";
import {
  computeHealth,
  SLO_WARN_HOURS,
  SLO_CRIT_HOURS,
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
