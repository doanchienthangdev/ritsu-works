// Tests for makeConsistencySweepHandler (v1.0b).
//
// Phase 1 — Code Analysis:
//   1 param (deps with sb). 4 branches:
//     (a) invariants list empty → returns ok with inserted=0
//     (b) insert ok → returns ok with inserted=N
//     (c) insert returns error → retryable failure
//     (d) sb.from throws → caught by handler (not currently — verify)
// Classification: I/O-only. Mock SbClient. Verify rows inserted have correct
// shape (invariant_id, check_kind='L3', state='pending', severity, hitl_tier).

import { describe, it, expect } from "vitest";

import {
  makeConsistencySweepHandler,
  type SbClient,
  type ScheduledRun,
} from "../supabase/functions/_shared/worker.ts";

const SAMPLE_RUN: ScheduledRun = {
  id: "run-uuid",
  schedule_id: "consistency-sweep-nightly",
  triggered_skill: "consistency-sweep",
  fired_at: "2026-05-14T03:00:00Z",
};

interface InsertCall {
  table: string;
  rows: unknown[];
}

function makeInsertMock(error: { message: string } | null = null): {
  sb: SbClient;
  inserts: InsertCall[];
} {
  const inserts: InsertCall[] = [];
  const sb: SbClient = {
    from(table: string) {
      return {
        insert: (rows: unknown[]) => {
          inserts.push({ table, rows: Array.isArray(rows) ? rows : [rows] });
          return Promise.resolve({ error });
        },
      };
    },
  };
  return { sb, inserts };
}

describe("makeConsistencySweepHandler", () => {
  describe("happy path", () => {
    it("inserts pending consistency_checks rows for each L3 invariant", async () => {
      const { sb, inserts } = makeInsertMock(null);
      const handler = makeConsistencySweepHandler({ sb });
      const result = await handler(SAMPLE_RUN);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toMatchObject({
        kind: "consistency_sweep",
        schedule_id: "consistency-sweep-nightly",
      });
      const out = result.output as { inserted: number; invariant_ids: string[] };
      expect(out.inserted).toBeGreaterThan(0);
      expect(Array.isArray(out.invariant_ids)).toBe(true);

      expect(inserts).toHaveLength(1);
      expect(inserts[0].table).toBe("consistency_checks");
      const rows = inserts[0].rows as Array<{
        invariant_id: string;
        check_kind: string;
        state: string;
        severity: string;
        hitl_tier: string;
      }>;
      expect(rows.length).toBe(out.inserted);
      for (const r of rows) {
        expect(r.check_kind).toBe("L3");
        expect(r.state).toBe("pending");
        expect(typeof r.invariant_id).toBe("string");
        expect(["info", "warn", "critical"]).toContain(r.severity);
        expect(["A", "B", "C", "D-Std", "D-MAX"]).toContain(r.hitl_tier);
      }
    });

    it("returns invariant_ids matching the rows inserted", async () => {
      const { sb, inserts } = makeInsertMock(null);
      const handler = makeConsistencySweepHandler({ sb });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { invariant_ids: string[] };
      const rows = inserts[0].rows as Array<{ invariant_id: string }>;
      expect(out.invariant_ids).toEqual(rows.map((r) => r.invariant_id));
    });
  });

  describe("error handling", () => {
    it("returns retryable failure when consistency_checks insert errors", async () => {
      const { sb, inserts } = makeInsertMock({ message: "RLS policy violation" });
      const handler = makeConsistencySweepHandler({ sb });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.error).toMatch(/consistency_checks insert: RLS policy violation/);
      expect(fail.retryable).toBe(true);
      // Insert was attempted (the mock recorded it before "returning" error)
      expect(inserts).toHaveLength(1);
    });
  });

  describe("contract — output shape", () => {
    it("output includes schedule_id for traceability", async () => {
      const { sb } = makeInsertMock(null);
      const handler = makeConsistencySweepHandler({ sb });
      const result = await handler({
        ...SAMPLE_RUN,
        schedule_id: "manual-trigger",
      });
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { schedule_id: string };
      expect(out.schedule_id).toBe("manual-trigger");
    });
  });
});

// ============================================================================
// L3 invariants list — guards against accidental empty list
// ============================================================================

import { getL3Invariants, invariantById } from "../supabase/functions/_shared/invariants.ts";

describe("L3 invariants list", () => {
  it("getL3Invariants returns at least 1 invariant", () => {
    const invs = getL3Invariants();
    expect(invs.length).toBeGreaterThan(0);
  });

  it("every L3 invariant has required fields", () => {
    for (const inv of getL3Invariants()) {
      expect(inv).toHaveProperty("id");
      expect(inv).toHaveProperty("kind");
      expect(inv).toHaveProperty("severity");
      expect(inv).toHaveProperty("hitl_tier");
      expect(inv).toHaveProperty("fix_strategy");
      expect(inv.layer).toBe("L3");
    }
  });

  it("invariantById returns invariant when id matches", () => {
    const inv = invariantById("live-db-tables-match-manifest");
    expect(inv).not.toBeNull();
    expect(inv?.kind).toBe("subset");
  });

  it("invariantById returns null for unknown id", () => {
    expect(invariantById("does-not-exist")).toBeNull();
  });
});
