// Tests for makeConsistencySweepHandler (v1.0c — inline executor).
//
// Phase 1 — Code Analysis:
//   makeConsistencySweepHandler(deps): 1 param. Branches per invariant:
//     - insert running row OK → execute → update final state
//     - insert error → count as error, continue
//     - executor returns passed=true → state=passed, no event
//     - executor returns passed=false → state=failed, emit drift event (warn+critical only)
//     - executor throws → state=failed with "executor_threw" description
//     - update error after execute → count as error
//   Empty invariants list → returns SweepSummary with all zeros.
//
// Classification: I/O-heavy. Mock SbClient + inject executor for determinism.

import { describe, it, expect } from "vitest";

import {
  makeConsistencySweepHandler,
  makeDefaultExecutor,
  type SbClient,
  type ScheduledRun,
  type CheckResult,
} from "../supabase/functions/_shared/worker.ts";
import type { Invariant } from "../supabase/functions/_shared/invariants.ts";

const SAMPLE_RUN: ScheduledRun = {
  id: "sweep-uuid",
  schedule_id: "consistency-sweep-nightly",
  triggered_skill: "consistency-sweep",
  fired_at: "2026-05-14T03:00:00Z",
};

const INV_CRITICAL: Invariant = {
  id: "test-critical-inv",
  description: "test",
  kind: "subset",
  source: { tier: 1, ref: "a" },
  target: { tier: 1, ref: "b" },
  severity: "critical",
  hitl_tier: "C",
  fix_strategy: "patch_yaml",
  layer: "L3",
  status: "live",
};

const INV_WARN: Invariant = {
  ...INV_CRITICAL,
  id: "test-warn-inv",
  severity: "warn",
  hitl_tier: "B",
};

const INV_INFO: Invariant = {
  ...INV_CRITICAL,
  id: "test-info-inv",
  severity: "info",
  hitl_tier: "A",
};

interface SbCall {
  table: string;
  op: "insert" | "select" | "update";
  args: unknown;
}

interface FakeSbOpts {
  insertResult?: { error: { message: string } | null };
  insertedIds?: string[];                  // ids returned by .select('id').single() chain
  updateResult?: { error: { message: string } | null };
  eventInsertResult?: { error: { message: string } | null };
}

function makeFakeSb(opts: FakeSbOpts = {}): {
  sb: SbClient;
  calls: SbCall[];
} {
  const calls: SbCall[] = [];
  let insertIndex = 0;
  const sb: SbClient = {
    from(table: string) {
      const chain = {
        insert(args: unknown) {
          calls.push({ table, op: "insert", args });
          if (table === "events") {
            return Promise.resolve(opts.eventInsertResult ?? { error: null });
          }
          // consistency_checks insert chain — supports .select('id').single()
          return {
            select(_cols: string) {
              return {
                single() {
                  const ids = opts.insertedIds ?? [`row-${insertIndex}`];
                  const id = ids[insertIndex % ids.length] ?? `row-${insertIndex}`;
                  insertIndex += 1;
                  const data = opts.insertResult?.error ? null : { id };
                  return Promise.resolve({
                    data,
                    error: opts.insertResult?.error ?? null,
                  });
                },
              };
            },
          };
        },
        update(args: unknown) {
          calls.push({ table, op: "update", args });
          return {
            eq(_col: string, _val: unknown) {
              return Promise.resolve(opts.updateResult ?? { error: null });
            },
          };
        },
      };
      return chain;
    },
  };
  return { sb, calls };
}

describe("makeConsistencySweepHandler — v1.0c executor", () => {
  describe("happy path", () => {
    it("returns zeros when no invariants", async () => {
      const { sb } = makeFakeSb();
      const handler = makeConsistencySweepHandler({
        sb,
        executor: async () => ({ passed: true }),
        invariants: [],
      });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toMatchObject({
        invariants_processed: 0,
        passed: 0,
        failed: 0,
        errors: 0,
        drift_events_emitted: 0,
      });
    });

    it("processes 1 passing invariant — no drift event", async () => {
      const { sb, calls } = makeFakeSb();
      const handler = makeConsistencySweepHandler({
        sb,
        executor: async () => ({ passed: true }),
        invariants: [INV_CRITICAL],
      });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const out = result.output as { passed: number; failed: number; drift_events_emitted: number };
      expect(out.passed).toBe(1);
      expect(out.failed).toBe(0);
      expect(out.drift_events_emitted).toBe(0);

      // Verify SQL ops: insert running row → update to passed. No events.
      const inserts = calls.filter((c) => c.op === "insert");
      const updates = calls.filter((c) => c.op === "update");
      expect(inserts).toHaveLength(1); // only the check row, no event
      expect(inserts[0].table).toBe("consistency_checks");
      expect((inserts[0].args as { state: string }).state).toBe("running");
      expect(updates).toHaveLength(1);
      expect((updates[0].args as { state: string }).state).toBe("passed");
    });

    it("processes 1 failing critical invariant — emits drift event", async () => {
      const { sb, calls } = makeFakeSb();
      const handler = makeConsistencySweepHandler({
        sb,
        executor: async () => ({
          passed: false,
          drift_description: "test drift",
          target_path: "test/path",
        }),
        invariants: [INV_CRITICAL],
      });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const out = result.output as { passed: number; failed: number; drift_events_emitted: number };
      expect(out.failed).toBe(1);
      expect(out.drift_events_emitted).toBe(1);

      // The events.insert should have happened.
      const eventInserts = calls.filter((c) => c.table === "events" && c.op === "insert");
      expect(eventInserts).toHaveLength(1);
      const evt = eventInserts[0].args as { event_type: string; payload: { invariant_id: string; severity: string } };
      expect(evt.event_type).toBe("consistency.drift_detected");
      expect(evt.payload.invariant_id).toBe(INV_CRITICAL.id);
      expect(evt.payload.severity).toBe("critical");
    });

    it("processes 1 failing warn invariant — emits drift event", async () => {
      const { sb, calls } = makeFakeSb();
      const handler = makeConsistencySweepHandler({
        sb,
        executor: async () => ({ passed: false, drift_description: "warn drift" }),
        invariants: [INV_WARN],
      });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { drift_events_emitted: number };
      expect(out.drift_events_emitted).toBe(1);
      const eventInserts = calls.filter((c) => c.table === "events" && c.op === "insert");
      expect(eventInserts).toHaveLength(1);
    });

    it("processes 1 failing info invariant — does NOT emit drift event (too noisy)", async () => {
      const { sb, calls } = makeFakeSb();
      const handler = makeConsistencySweepHandler({
        sb,
        executor: async () => ({ passed: false, drift_description: "info drift" }),
        invariants: [INV_INFO],
      });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { failed: number; drift_events_emitted: number };
      expect(out.failed).toBe(1);
      expect(out.drift_events_emitted).toBe(0);
      expect(calls.filter((c) => c.table === "events")).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    it("counts insert error and skips that invariant, continues to next", async () => {
      // Inject: first insert fails, second succeeds.
      let attempt = 0;
      const sb: SbClient = {
        from(table: string) {
          return {
            insert(_args: unknown) {
              if (table === "consistency_checks") {
                attempt += 1;
                const err = attempt === 1 ? { message: "RLS denied" } : null;
                const dataId = attempt === 1 ? null : "row-2";
                return {
                  select() {
                    return {
                      single() {
                        return Promise.resolve({ data: dataId ? { id: dataId } : null, error: err });
                      },
                    };
                  },
                };
              }
              return Promise.resolve({ error: null });
            },
            update() {
              return { eq() { return Promise.resolve({ error: null }); } };
            },
          };
        },
      };
      const handler = makeConsistencySweepHandler({
        sb,
        executor: async () => ({ passed: true }),
        invariants: [INV_CRITICAL, INV_WARN],
      });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { errors: number; passed: number; failed: number };
      expect(out.errors).toBe(1);
      expect(out.passed).toBe(1);
      expect(out.failed).toBe(0);
    });

    it("treats executor throw as failed with executor_threw description", async () => {
      const { sb, calls } = makeFakeSb();
      const handler = makeConsistencySweepHandler({
        sb,
        executor: async () => {
          throw new Error("boom");
        },
        invariants: [INV_CRITICAL],
      });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { failed: number };
      expect(out.failed).toBe(1);
      const updates = calls.filter((c) => c.op === "update");
      expect(updates).toHaveLength(1);
      const updateArgs = updates[0].args as { state: string; drift_description: string };
      expect(updateArgs.state).toBe("failed");
      expect(updateArgs.drift_description).toMatch(/^executor_threw: boom/);
    });
  });

  describe("contract — output shape", () => {
    it("output is a SweepSummary with all expected fields", async () => {
      const { sb } = makeFakeSb();
      const handler = makeConsistencySweepHandler({
        sb,
        executor: async () => ({ passed: true }),
        invariants: [INV_CRITICAL, INV_WARN],
      });
      const result = await handler({ ...SAMPLE_RUN, schedule_id: "manual-trigger" });
      if (!result.ok) throw new Error("expected ok");
      expect(result.output).toMatchObject({
        kind: "consistency_sweep",
        schedule_id: "manual-trigger",
        invariants_processed: 2,
        passed: 2,
        failed: 0,
        errors: 0,
        drift_events_emitted: 0,
      });
    });
  });
});

// ============================================================================
// makeDefaultExecutor + executeInvariant (integration with fake RPC)
// ============================================================================

import {
  executeInvariant,
  ALL_INVARIANTS,
  L3_INVARIANTS_LIVE,
} from "../supabase/functions/_shared/invariants.ts";

describe("executeInvariant — live-DB executors", () => {
  it("live-db-tables-match-manifest: passes when subset holds", async () => {
    const inv = ALL_INVARIANTS.find((i) => i.id === "live-db-tables-match-manifest")!;
    expect(inv).toBeDefined();
    const result = await executeInvariant(inv, {
      callRpc: async () => [{ table_name: "agent_runs" }, { table_name: "tasks" }],
      getManifestOpsTables: async () => ["agent_runs", "tasks", "events"],
    });
    expect(result.passed).toBe(true);
  });

  it("live-db-tables-match-manifest: fails with names when drift", async () => {
    const inv = ALL_INVARIANTS.find((i) => i.id === "live-db-tables-match-manifest")!;
    const result = await executeInvariant(inv, {
      callRpc: async () => [
        { table_name: "agent_runs" },
        { table_name: "secret_new_table" },
      ],
      getManifestOpsTables: async () => ["agent_runs"],
    });
    expect(result.passed).toBe(false);
    expect(result.drift_description).toMatch(/secret_new_table/);
    expect(result.target_path).toBe("knowledge/manifest.yaml");
  });

  it("live-db-tables-have-rls: passes when all enabled", async () => {
    const inv = ALL_INVARIANTS.find((i) => i.id === "live-db-tables-have-rls")!;
    const result = await executeInvariant(inv, {
      callRpc: async () => [
        { table_name: "agent_runs", rls_enabled: true },
        { table_name: "tasks", rls_enabled: true },
      ],
      getManifestOpsTables: async () => [],
    });
    expect(result.passed).toBe(true);
  });

  it("live-db-tables-have-rls: fails listing tables without RLS", async () => {
    const inv = ALL_INVARIANTS.find((i) => i.id === "live-db-tables-have-rls")!;
    const result = await executeInvariant(inv, {
      callRpc: async () => [
        { table_name: "agent_runs", rls_enabled: true },
        { table_name: "loose_table", rls_enabled: false },
      ],
      getManifestOpsTables: async () => [],
    });
    expect(result.passed).toBe(false);
    expect(result.drift_description).toMatch(/loose_table/);
  });

  it("unknown invariant id: returns executor_not_implemented", async () => {
    const inv: Invariant = {
      ...INV_CRITICAL,
      id: "fake-invariant-id",
    };
    const result = await executeInvariant(inv, {
      callRpc: async () => [],
      getManifestOpsTables: async () => [],
    });
    expect(result.passed).toBe(false);
    expect(result.drift_description).toMatch(/^executor_not_implemented/);
  });
});

// ============================================================================
// L3_INVARIANTS_LIVE: invariants module integrity
// ============================================================================

describe("L3_INVARIANTS_LIVE (bundled from yaml)", () => {
  it("contains only invariants with layer=L3 and status=live", () => {
    expect(L3_INVARIANTS_LIVE.length).toBeGreaterThan(0);
    for (const inv of L3_INVARIANTS_LIVE) {
      expect(inv.layer).toBe("L3");
      expect((inv.status ?? "live")).toBe("live");
    }
  });

  it("ALL_INVARIANTS includes deferred entries too", () => {
    const deferred = ALL_INVARIANTS.filter((i) => i.status === "deferred");
    expect(deferred.length).toBeGreaterThan(0);
  });

  it("makeDefaultExecutor wires callRpc through sb.rpc", async () => {
    // Smoke: function returns a callable.
    const fakeSb: SbClient = {
      from: () => ({}),
      // deno-lint-ignore no-explicit-any
      rpc: ((name: string) => {
        if (name === "get_ops_tables") {
          return Promise.resolve({ data: [{ table_name: "t1" }], error: null });
        }
        return Promise.resolve({ data: [], error: null });
      }) as any,
    } as unknown as SbClient;
    const exec = makeDefaultExecutor(fakeSb);
    const inv = L3_INVARIANTS_LIVE.find((i) => i.id === "live-db-tables-match-manifest")!;
    const result = await exec(inv);
    // We don't assert pass/fail (depends on MANIFEST_OPS_TABLES_V1_0C content);
    // just verify execution completes without throwing.
    expect(typeof result.passed).toBe("boolean");
  });
});
