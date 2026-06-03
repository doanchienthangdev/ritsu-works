import { describe, it, expect } from "vitest";
import {
  computeHealth,
  SLO_WARN_HOURS,
  SLO_CRIT_HOURS,
  type HealthInput,
  type SyncRunLatest,
} from "../supabase/functions/_shared/analytics-health.ts";

// 17 healthy tables, all 'ok'
const okTables = (n = 17): SyncRunLatest[] =>
  Array.from({ length: n }, (_, i) => ({ table_name: `t${i}`, status: "ok", detail: null }));

const NOW = 1_750_000_000_000; // fixed epoch ms (Date.now() not used by the pure fn)
const hoursAgo = (h: number) => NOW - h * 3_600_000;

const base = (over: Partial<HealthInput> = {}): HealthInput => ({
  nowMs: NOW,
  lastOkMs: hoursAgo(1),
  latest: okTables(),
  ...over,
});

describe("computeHealth", () => {
  describe("happy path", () => {
    it("fresh + all ok + no canary → healthy, exit-equivalent 0", () => {
      const r = computeHealth(base());
      expect(r.level).toBe("healthy");
      expect(r.canaryTrips).toBe(0);
      expect(r.failures).toBe(0);
      expect(r.alerts).toEqual([]);
      expect(r.message).toContain("healthy");
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

  describe("freshness SLO boundaries", () => {
    it("exactly 26h → still healthy (> is strict)", () => {
      const r = computeHealth(base({ lastOkMs: hoursAgo(SLO_WARN_HOURS) }));
      expect(r.level).toBe("healthy");
    });

    it("26.1h → warn", () => {
      const r = computeHealth(base({ lastOkMs: hoursAgo(26.1) }));
      expect(r.level).toBe("warn");
      expect(r.alerts.map((a) => a.id)).toContain("analytics_sync_freshness_stale");
      expect(r.alerts[0].severity).toBe("warning");
    });

    it("exactly 48h → warn (not yet critical; > is strict)", () => {
      const r = computeHealth(base({ lastOkMs: hoursAgo(SLO_CRIT_HOURS) }));
      expect(r.level).toBe("warn");
    });

    it("48.1h → critical", () => {
      const r = computeHealth(base({ lastOkMs: hoursAgo(48.1) }));
      expect(r.level).toBe("critical");
      expect(r.alerts.map((a) => a.id)).toContain("analytics_sync_freshness_critical");
    });

    it("never synced (lastOkMs null) → critical, freshness sentinel huge", () => {
      const r = computeHealth(base({ lastOkMs: null }));
      expect(r.level).toBe("critical");
      expect(r.freshnessHours).toBeGreaterThan(1e8);
      expect(r.alerts.map((a) => a.id)).toContain("analytics_sync_freshness_critical");
    });
  });

  describe("canary trips (P0)", () => {
    it("a failed row whose detail mentions canary → critical canary alert", () => {
      const latest = okTables(16).concat({
        table_name: "profiles",
        status: "failed",
        detail: "PII-canary tripped (3 suspect cells)",
      });
      const r = computeHealth(base({ latest }));
      expect(r.level).toBe("critical");
      expect(r.canaryTrips).toBe(1);
      expect(r.alerts.some((a) => a.id === "analytics_pii_canary_trips_critical")).toBe(true);
      expect(r.message).toContain("🔴");
    });

    it("canary match is case-insensitive", () => {
      const latest = [{ table_name: "x", status: "failed", detail: "PII-CANARY TRIPPED" }];
      expect(computeHealth(base({ latest })).canaryTrips).toBe(1);
    });

    it("a non-canary failure counts as failure but not a canary trip", () => {
      const latest = [{ table_name: "x", status: "failed", detail: "0 rows but live had 5 — abort (keep last-good)" }];
      const r = computeHealth(base({ latest }));
      expect(r.canaryTrips).toBe(0);
      expect(r.failures).toBe(1);
      expect(r.alerts.some((a) => a.id === "analytics_sync_table_failed")).toBe(true);
      expect(r.level).toBe("critical");
    });

    it("failed row with null detail → failure, not canary", () => {
      const latest = [{ table_name: "x", status: "failed", detail: null }];
      const r = computeHealth(base({ latest }));
      expect(r.canaryTrips).toBe(0);
      expect(r.failures).toBe(1);
    });
  });

  describe("combined conditions", () => {
    it("canary trip + stale → critical, both alerts present", () => {
      const latest = okTables(16).concat({ table_name: "p", status: "failed", detail: "PII-canary tripped (1)" });
      const r = computeHealth(base({ latest, lastOkMs: hoursAgo(50) }));
      expect(r.level).toBe("critical");
      const ids = r.alerts.map((a) => a.id);
      expect(ids).toContain("analytics_pii_canary_trips_critical");
      expect(ids).toContain("analytics_sync_freshness_critical");
    });

    it("warn-level freshness does not downgrade a critical from a failure", () => {
      const latest = [{ table_name: "x", status: "failed", detail: null }];
      const r = computeHealth(base({ latest, lastOkMs: hoursAgo(30) }));
      expect(r.level).toBe("critical");
    });
  });

  describe("edge cases", () => {
    it("empty latest + fresh lastOk → healthy with 0 tables", () => {
      const r = computeHealth(base({ latest: [] }));
      expect(r.level).toBe("healthy");
      expect(r.failures).toBe(0);
      expect(r.message).toContain("0 tables");
    });
  });
});
