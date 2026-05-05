// Tests for supabase/functions/_shared/worker.ts
//
// Phase 1 — Code Analysis:
//   verifyAuthHeader        : 2 params; 2 branches; pure (same logic as dispatcher)
//   claimNextRun            : 1 param; 4 branches (empty/lost-race/select-error/update-error/win); async
//   executeRun              : 3 params; 4 branches (no_skill/deferred_no_api_key/no_handler/handler-call); async
//   finalizeRun             : 4 params; 2 branches; async
//   makeHeartbeatPingHandler: 1 param (sb); returns handler with 2 branches
//   processWorkerTick       : 3 params; 7 branches (method/auth/claim-error/empty/exec-throw/finalize-error/loop)
//
// Classification: handles user input (auth) → security tests.
//                 async + stateful (atomic claim race) → state/timing tests required.
//                 contract: consumes scheduled_runs rows produced by dispatcher → contract tests required.
//                 I/O on every step → dependency degradation tests required.

import { describe, it, expect, vi } from "vitest";
import {
  verifyAuthHeader,
  claimNextRun,
  executeRun,
  finalizeRun,
  makeHeartbeatPingHandler,
  processWorkerTick,
  type ScheduledRun,
  type SkillRegistry,
  type SbClient,
  type SkillResult,
} from "../supabase/functions/_shared/worker.ts";

const FIXED_TIME = "2026-05-05T05:00:00Z";

const SAMPLE_RUN: ScheduledRun = {
  id: "run-uuid-1",
  schedule_id: "morning-brief",
  triggered_skill: "heartbeat-ping",
  fired_at: "2026-05-05T05:00:00Z",
};

// ----- Helpers to build mock Supabase clients with various behaviors -----

interface ClaimMockConfig {
  pickResult?: { data: ScheduledRun[] | null | undefined; error: { message: string } | null };
  updateResult?: { data: ScheduledRun | null; error: { message: string } | null };
}

function makeClaimMock(cfg: ClaimMockConfig = {}): SbClient {
  const pickResult = cfg.pickResult ?? { data: [SAMPLE_RUN], error: null };
  const updateResult = cfg.updateResult ?? { data: SAMPLE_RUN, error: null };
  return {
    from() {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({ limit: () => Promise.resolve(pickResult) }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({ maybeSingle: () => Promise.resolve(updateResult) }),
            }),
          }),
        }),
      };
    },
  };
}

function makeFinalizeMock(error: { message: string } | null = null): { sb: SbClient; calls: { table: string; updatePayload: unknown; runId: string }[] } {
  const calls: { table: string; updatePayload: unknown; runId: string }[] = [];
  const sb: SbClient = {
    from(table: string) {
      return {
        update: (row: unknown) => ({
          eq: (col: string, val: string) => {
            calls.push({ table, updatePayload: row, runId: val });
            return Promise.resolve({ error });
          },
        }),
      };
    },
  };
  return { sb, calls };
}

function makeAuditInsertMock(error: { message: string } | null = null): {
  sb: SbClient;
  inserts: { table: string; row: unknown }[];
} {
  const inserts: { table: string; row: unknown }[] = [];
  const sb: SbClient = {
    from(table: string) {
      return {
        insert: (row: unknown) => {
          inserts.push({ table, row });
          return Promise.resolve({ error });
        },
      };
    },
  };
  return { sb, inserts };
}

// ============================================================================
// verifyAuthHeader — same contract as dispatcher's, sanity-check identity
// ============================================================================

describe("worker verifyAuthHeader", () => {
  it("returns true when secrets match", () => {
    expect(verifyAuthHeader("s", "s")).toBe(true);
  });
  it("returns false when no expected secret (fail closed)", () => {
    expect(verifyAuthHeader("s", "")).toBe(false);
  });
  it("returns false when provided is null", () => {
    expect(verifyAuthHeader(null, "s")).toBe(false);
  });
});

// ============================================================================
// claimNextRun
// ============================================================================

describe("claimNextRun", () => {
  describe("happy path", () => {
    it("returns the claimed row when DB picks one and update succeeds", async () => {
      const sb = makeClaimMock({
        pickResult: { data: [SAMPLE_RUN], error: null },
        updateResult: { data: SAMPLE_RUN, error: null },
      });
      const claimed = await claimNextRun(sb);
      expect(claimed).toEqual(SAMPLE_RUN);
    });
  });

  describe("input boundaries — empty queue", () => {
    it("returns null when SELECT returns empty array", async () => {
      const sb = makeClaimMock({
        pickResult: { data: [], error: null },
      });
      expect(await claimNextRun(sb)).toBeNull();
    });
    it("returns null when SELECT returns undefined data", async () => {
      const sb = makeClaimMock({
        pickResult: { data: undefined, error: null },
      });
      expect(await claimNextRun(sb)).toBeNull();
    });
    it("returns null when SELECT returns null data", async () => {
      const sb = makeClaimMock({
        pickResult: { data: null, error: null },
      });
      expect(await claimNextRun(sb)).toBeNull();
    });
  });

  describe("state and timing — atomic claim race", () => {
    it("returns null when UPDATE finds no matching pending row (lost the race)", async () => {
      const sb = makeClaimMock({
        pickResult: { data: [SAMPLE_RUN], error: null },
        updateResult: { data: null, error: null }, // another worker already flipped state
      });
      expect(await claimNextRun(sb)).toBeNull();
    });
  });

  describe("error handling", () => {
    it("throws with descriptive message on SELECT error", async () => {
      const sb = makeClaimMock({
        pickResult: { data: null, error: { message: "select boom" } },
      });
      await expect(claimNextRun(sb)).rejects.toThrow(/pick failed.*select boom/);
    });

    it("throws with descriptive message on UPDATE error", async () => {
      const sb = makeClaimMock({
        pickResult: { data: [SAMPLE_RUN], error: null },
        updateResult: { data: null, error: { message: "update boom" } },
      });
      await expect(claimNextRun(sb)).rejects.toThrow(/claim failed.*update boom/);
    });
  });
});

// ============================================================================
// executeRun
// ============================================================================

describe("executeRun", () => {
  const okHandler: SkillRegistry = {
    "ok-skill": async () => ({ ok: true, output: { result: 42 } }),
  };
  const failHandler: SkillRegistry = {
    "fail-skill": async () => ({ ok: false, error: "skill said no", retryable: false }),
  };
  const throwHandler: SkillRegistry = {
    "throw-skill": async () => {
      throw new Error("handler exception");
    },
  };

  describe("happy path", () => {
    it("calls registered handler and returns its result on success", async () => {
      const result = await executeRun(
        { ...SAMPLE_RUN, triggered_skill: "ok-skill" },
        okHandler,
        "any-key",
      );
      expect(result).toEqual({ ok: true, output: { result: 42 } });
    });

    it("returns handler's failure result", async () => {
      const result = await executeRun(
        { ...SAMPLE_RUN, triggered_skill: "fail-skill" },
        failHandler,
        "any-key",
      );
      expect(result).toEqual({ ok: false, error: "skill said no", retryable: false });
    });
  });

  describe("input boundaries — triggered_skill", () => {
    it("returns no_skill when triggered_skill is null", async () => {
      const result = await executeRun(
        { ...SAMPLE_RUN, triggered_skill: null },
        okHandler,
        "any-key",
      );
      expect(result).toEqual({ ok: false, error: "no_skill", retryable: false });
    });

    it("returns no_skill when triggered_skill is empty string", async () => {
      const result = await executeRun(
        { ...SAMPLE_RUN, triggered_skill: "" },
        okHandler,
        "any-key",
      );
      expect(result).toEqual({ ok: false, error: "no_skill", retryable: false });
    });
  });

  describe("input boundaries — registry lookup", () => {
    it("returns deferred_no_api_key when skill missing AND no anthropic key", async () => {
      const result = await executeRun(
        { ...SAMPLE_RUN, triggered_skill: "unknown-skill" },
        {},
        "",
      );
      expect(result.ok).toBe(false);
      expect((result as { error: string }).error).toMatch(/deferred_no_api_key/);
      expect((result as { error: string }).error).toMatch(/unknown-skill/);
    });

    it("returns no_handler_registered when skill missing but anthropic key present", async () => {
      const result = await executeRun(
        { ...SAMPLE_RUN, triggered_skill: "unknown-skill" },
        {},
        "sk-ant-...",
      );
      expect(result.ok).toBe(false);
      expect((result as { error: string }).error).toMatch(/no_handler_registered/);
    });
  });

  describe("security — registry prototype pollution", () => {
    it("does not invoke prototype methods (toString, constructor)", async () => {
      // toString is a prototype method on Object; lookup via dict access would resolve to it
      // but executeRun should treat it as unregistered and fall through to no_handler_registered.
      const result = await executeRun(
        { ...SAMPLE_RUN, triggered_skill: "toString" },
        {},
        "key",
      );
      expect(result.ok).toBe(false);
      expect((result as { error: string }).error).toMatch(/no_handler_registered/);
    });
  });

  describe("error propagation", () => {
    // executeRun does NOT catch handler exceptions — the worker loop catches them via try/catch.
    it("propagates handler exceptions to caller", async () => {
      await expect(
        executeRun(
          { ...SAMPLE_RUN, triggered_skill: "throw-skill" },
          throwHandler,
          "any-key",
        ),
      ).rejects.toThrow(/handler exception/);
    });
  });
});

// ============================================================================
// finalizeRun
// ============================================================================

describe("finalizeRun", () => {
  describe("happy path — success result", () => {
    it("writes state=completed + output_payload + clears error", async () => {
      const { sb, calls } = makeFinalizeMock(null);
      await finalizeRun(sb, "run-1", { ok: true, output: { foo: "bar" } }, FIXED_TIME);
      expect(calls).toHaveLength(1);
      expect(calls[0].runId).toBe("run-1");
      expect(calls[0].updatePayload).toEqual({
        state: "completed",
        state_since: FIXED_TIME,
        output_payload: { foo: "bar" },
        error: null,
      });
    });
  });

  describe("happy path — failure result", () => {
    it("writes state=failed + error message", async () => {
      const { sb, calls } = makeFinalizeMock(null);
      await finalizeRun(sb, "run-2", { ok: false, error: "boom" }, FIXED_TIME);
      expect(calls[0].updatePayload).toEqual({
        state: "failed",
        state_since: FIXED_TIME,
        error: "boom",
      });
    });

    it("does NOT write output_payload on failure (separation of success/failure fields)", async () => {
      const { sb, calls } = makeFinalizeMock(null);
      await finalizeRun(sb, "run-3", { ok: false, error: "boom", retryable: true }, FIXED_TIME);
      expect(calls[0].updatePayload).not.toHaveProperty("output_payload");
    });
  });

  describe("regression — column names", () => {
    it("uses `state` and `state_since`, not `status`/`updated_at`", async () => {
      const { sb, calls } = makeFinalizeMock(null);
      await finalizeRun(sb, "run-1", { ok: true, output: {} }, FIXED_TIME);
      const payload = calls[0].updatePayload as Record<string, unknown>;
      expect(payload).toHaveProperty("state");
      expect(payload).toHaveProperty("state_since");
      expect(payload).not.toHaveProperty("status");
      expect(payload).not.toHaveProperty("updated_at");
    });
  });

  describe("error handling", () => {
    it("throws when DB UPDATE returns error", async () => {
      const { sb } = makeFinalizeMock({ message: "row vanished" });
      await expect(
        finalizeRun(sb, "run-1", { ok: true, output: {} }, FIXED_TIME),
      ).rejects.toThrow(/finalize failed.*row vanished/);
    });
  });
});

// ============================================================================
// makeHeartbeatPingHandler
// ============================================================================

describe("makeHeartbeatPingHandler", () => {
  describe("happy path", () => {
    it("inserts an audit_log row and returns ok=true with kind=heartbeat", async () => {
      const { sb, inserts } = makeAuditInsertMock(null);
      const handler = makeHeartbeatPingHandler(sb);
      const result = await handler(SAMPLE_RUN);
      expect(result).toEqual({
        ok: true,
        output: { kind: "heartbeat", schedule_id: "morning-brief" },
      });
      expect(inserts).toHaveLength(1);
      expect(inserts[0].table).toBe("audit_log");
      expect(inserts[0].row).toEqual({
        actor_kind: "system",
        actor_id: "minion-worker",
        action: "heartbeat",
        target_kind: "scheduled_run",
        target_id: SAMPLE_RUN.id,
        payload: {
          schedule_id: SAMPLE_RUN.schedule_id,
          fired_at: SAMPLE_RUN.fired_at,
        },
      });
    });
  });

  describe("regression — uses correct audit_log columns", () => {
    it("writes actor_kind and actor_id, NOT actor (legacy DRAFT field)", async () => {
      const { sb, inserts } = makeAuditInsertMock(null);
      const handler = makeHeartbeatPingHandler(sb);
      await handler(SAMPLE_RUN);
      const row = inserts[0].row as Record<string, unknown>;
      expect(row).toHaveProperty("actor_kind");
      expect(row).toHaveProperty("actor_id");
      expect(row).not.toHaveProperty("actor");
    });
  });

  describe("error handling", () => {
    it("returns ok=false retryable=true on audit_log insert error", async () => {
      const { sb } = makeAuditInsertMock({ message: "constraint violation" });
      const handler = makeHeartbeatPingHandler(sb);
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.error).toMatch(/audit_log insert.*constraint violation/);
      expect(fail.retryable).toBe(true);
    });
  });

  describe("contract boundaries — input from claimNextRun", () => {
    it("survives a run with empty schedule_id (degraded upstream)", async () => {
      const { sb } = makeAuditInsertMock(null);
      const handler = makeHeartbeatPingHandler(sb);
      const result = await handler({ ...SAMPLE_RUN, schedule_id: "" });
      expect(result.ok).toBe(true);
    });
  });
});

// ============================================================================
// processWorkerTick — orchestrator
// ============================================================================

describe("processWorkerTick", () => {
  function makeFullDeps(overrides: Partial<{
    sb: SbClient;
    registry: SkillRegistry;
    workerSecret: string;
    anthropicApiKey: string;
    batchSize: number;
  }> = {}) {
    return {
      sb: overrides.sb ?? makeClaimMock({ pickResult: { data: [], error: null } }),
      registry: overrides.registry ?? {},
      workerSecret: overrides.workerSecret ?? "valid-secret",
      anthropicApiKey: overrides.anthropicApiKey,
      batchSize: overrides.batchSize ?? 5,
      now: () => FIXED_TIME,
    };
  }

  describe("happy path — empty queue", () => {
    it("returns 200 with processed_count=0 when no rows pending", async () => {
      const result = await processWorkerTick(makeFullDeps(), "POST", "valid-secret");
      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        status: "ok",
        processed_count: 0,
        processed: [],
      });
    });
  });

  describe("happy path — single row processed", () => {
    it("claims, executes, finalizes one row", async () => {
      // Combine claim + finalize in one mock
      let claimedOnce = false;
      let finalizedPayload: unknown = null;
      const sb: SbClient = {
        from(table) {
          if (table === "scheduled_runs") {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () =>
                      Promise.resolve(
                        claimedOnce
                          ? { data: [], error: null }
                          : { data: [SAMPLE_RUN], error: null },
                      ),
                  }),
                }),
              }),
              update: (row: unknown) => ({
                eq: (col: string, val: string) => ({
                  eq: () => ({
                    select: () => ({
                      maybeSingle: () => {
                        claimedOnce = true;
                        return Promise.resolve({ data: SAMPLE_RUN, error: null });
                      },
                    }),
                  }),
                  // Also handle the finalize path .eq(id, runId) → returns
                  then: (resolve: (v: unknown) => void) => {
                    finalizedPayload = row;
                    resolve({ error: null });
                  },
                }),
              }),
            };
          }
          if (table === "audit_log") {
            return {
              insert: () => Promise.resolve({ error: null }),
            };
          }
          return {} as never;
        },
      };
      const handler = makeHeartbeatPingHandler(sb);
      const deps = {
        ...makeFullDeps({
          sb,
          registry: { "heartbeat-ping": handler },
          batchSize: 1,
        }),
        anthropicApiKey: "any",
      };
      const result = await processWorkerTick(deps, "POST", "valid-secret");
      expect(result.status).toBe(200);
      const body = result.body as { processed_count: number; processed: unknown[] };
      expect(body.processed_count).toBe(1);
      expect(body.processed[0]).toMatchObject({
        id: SAMPLE_RUN.id,
        schedule_id: SAMPLE_RUN.schedule_id,
        status: "completed",
      });
    });
  });

  describe("input boundaries — method", () => {
    it.each(["GET", "DELETE", "PUT", "PATCH", "HEAD", "OPTIONS", ""])(
      "rejects %s with 405",
      async (method) => {
        const result = await processWorkerTick(makeFullDeps(), method, "valid-secret");
        expect(result.status).toBe(405);
      },
    );
  });

  describe("security — auth", () => {
    it("returns 401 when secret missing", async () => {
      const result = await processWorkerTick(makeFullDeps(), "POST", null);
      expect(result.status).toBe(401);
      expect(result.body).toEqual({ error: "auth" });
    });
    it("returns 401 when worker secret unset (fail closed)", async () => {
      const deps = makeFullDeps({ workerSecret: "" });
      const result = await processWorkerTick(deps, "POST", "anything");
      expect(result.status).toBe(401);
    });
  });

  describe("error handling", () => {
    it("returns 500 with claim error and partial processed list", async () => {
      const sb = makeClaimMock({
        pickResult: { data: null, error: { message: "DB down" } },
      });
      const result = await processWorkerTick(makeFullDeps({ sb }), "POST", "valid-secret");
      expect(result.status).toBe(500);
      expect(result.body).toMatchObject({ error: "claim", processed: [] });
    });

    it("converts handler exceptions into failed result, does not crash loop", async () => {
      // 1 row claimable; handler throws; finalize returns ok.
      let claimed = 0;
      const sb: SbClient = {
        from(table: string) {
          if (table === "scheduled_runs") {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () =>
                      Promise.resolve(
                        claimed === 0
                          ? { data: [SAMPLE_RUN], error: null }
                          : { data: [], error: null },
                      ),
                  }),
                }),
              }),
              update: () => ({
                eq: () => ({
                  eq: () => ({
                    select: () => ({
                      maybeSingle: () => {
                        claimed++;
                        return Promise.resolve({ data: SAMPLE_RUN, error: null });
                      },
                    }),
                  }),
                  then: (resolve: (v: unknown) => void) => resolve({ error: null }),
                }),
              }),
            };
          }
          return {} as never;
        },
      };
      const registry: SkillRegistry = {
        "heartbeat-ping": async () => {
          throw new Error("boom in skill");
        },
      };
      const result = await processWorkerTick(
        makeFullDeps({ sb, registry, batchSize: 1 }),
        "POST",
        "valid-secret",
      );
      expect(result.status).toBe(200);
      const body = result.body as { processed: { status: string }[] };
      expect(body.processed[0].status).toBe("failed");
    });
  });

  describe("business logic — batching", () => {
    it("processes at most batchSize rows per invocation", async () => {
      let count = 0;
      const sb: SbClient = {
        from(table: string) {
          if (table === "scheduled_runs") {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () =>
                      Promise.resolve({ data: [SAMPLE_RUN], error: null }),
                  }),
                }),
              }),
              update: () => ({
                eq: () => ({
                  eq: () => ({
                    select: () => ({
                      maybeSingle: () => {
                        count++;
                        return Promise.resolve({
                          data: { ...SAMPLE_RUN, id: `r-${count}` },
                          error: null,
                        });
                      },
                    }),
                  }),
                  then: (resolve: (v: unknown) => void) => resolve({ error: null }),
                }),
              }),
            };
          }
          return {} as never;
        },
      };
      const registry: SkillRegistry = {
        "heartbeat-ping": async () => ({ ok: true, output: {} }),
      };
      const result = await processWorkerTick(
        makeFullDeps({ sb, registry, batchSize: 3 }),
        "POST",
        "valid-secret",
      );
      const body = result.body as { processed_count: number };
      expect(body.processed_count).toBe(3);
    });

    it("stops early when queue drains mid-batch", async () => {
      let i = 0;
      const sb: SbClient = {
        from(table: string) {
          if (table === "scheduled_runs") {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () =>
                      Promise.resolve(
                        i < 2 ? { data: [SAMPLE_RUN], error: null } : { data: [], error: null },
                      ),
                  }),
                }),
              }),
              update: () => ({
                eq: () => ({
                  eq: () => ({
                    select: () => ({
                      maybeSingle: () => {
                        i++;
                        return Promise.resolve({ data: SAMPLE_RUN, error: null });
                      },
                    }),
                  }),
                  then: (resolve: (v: unknown) => void) => resolve({ error: null }),
                }),
              }),
            };
          }
          return {} as never;
        },
      };
      const registry: SkillRegistry = {
        "heartbeat-ping": async () => ({ ok: true, output: {} }),
      };
      const result = await processWorkerTick(
        makeFullDeps({ sb, registry, batchSize: 5 }),
        "POST",
        "valid-secret",
      );
      const body = result.body as { processed_count: number };
      expect(body.processed_count).toBe(2);
    });
  });
});
