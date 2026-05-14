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
  makeEtlProductDauSnapshotHandler,
  makeHeartbeatPingHandler,
  makeSynthesizeMorningBriefHandler,
  isRetryableAnthropicError,
  extractTextFromContent,
  DEFAULT_MORNING_BRIEF_MODEL,
  DEFAULT_MORNING_BRIEF_MAX_TOKENS,
  DEFAULT_MORNING_BRIEF_SYSTEM,
  processWorkerTick,
  type ProductDauRow,
  type ScheduledRun,
  type SkillRegistry,
  type SbClient,
  type SkillResult,
  type AnthropicLike,
  type AnthropicMessagesCreateParams,
  type AnthropicMessagesResponse,
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

    it("uses default batchSize=5 and default now=Date.now when both omitted", async () => {
      // Covers worker.ts lines 253-254 default fallbacks:
      //   const batchSize = deps.batchSize ?? 5;
      //   const now = deps.now ?? (() => new Date().toISOString());
      const sb = makeClaimMock({ pickResult: { data: [], error: null } });
      const result = await processWorkerTick(
        // intentionally omit batchSize and now from deps
        { sb, registry: {}, workerSecret: "valid-secret" },
        "POST",
        "valid-secret",
      );
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ status: "ok", processed_count: 0, processed: [] });
    });

    it("invokes the default now() fallback when a row is processed without deps.now", async () => {
      // The previous test only enters processWorkerTick with an empty queue,
      // so the default `now` arrow function is created but never called. This
      // test forces the default function body to execute.
      let capturedNow: string | undefined;
      const sb: SbClient = {
        from(table) {
          if (table !== "scheduled_runs") return {} as never;
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: [SAMPLE_RUN], error: null }),
                }),
              }),
            }),
            update: (row: Record<string, unknown>) => ({
              eq: () => ({
                eq: () => ({
                  select: () => ({
                    maybeSingle: () => Promise.resolve({ data: SAMPLE_RUN, error: null }),
                  }),
                }),
                then: (resolve: (v: unknown) => void) => {
                  // finalize path — capture the state_since written by `now()`
                  if (row.state === "completed" || row.state === "failed") {
                    capturedNow = row.state_since as string;
                  }
                  resolve({ error: null });
                },
              }),
            }),
          };
        },
      };
      const before = new Date().toISOString();
      const result = await processWorkerTick(
        // intentionally omit `now`
        {
          sb,
          registry: {
            "heartbeat-ping": async () => ({ ok: true, output: { kind: "test" } }),
          },
          workerSecret: "valid-secret",
          batchSize: 1,
        },
        "POST",
        "valid-secret",
      );
      const after = new Date().toISOString();
      expect(result.status).toBe(200);
      expect(typeof capturedNow).toBe("string");
      expect(capturedNow!).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(capturedNow!.localeCompare(before)).toBeGreaterThanOrEqual(0);
      expect(capturedNow!.localeCompare(after)).toBeLessThanOrEqual(0);
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

    it("returns 500 with finalize error when finalize step fails post-execute", async () => {
      // Claim + execute succeed; finalize returns { error } → finalizeRun
      // throws → orchestrator wraps into 500 with body.error = 'finalize'.
      // This covers worker.ts line 277-280 (finalize-fail catch arm).
      const sb: SbClient = {
        from(table) {
          if (table !== "scheduled_runs") return {} as never;
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: [SAMPLE_RUN], error: null }),
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                // Claim path: chain another .eq() then .select().maybeSingle().
                eq: () => ({
                  select: () => ({
                    maybeSingle: () => Promise.resolve({ data: SAMPLE_RUN, error: null }),
                  }),
                }),
                // Finalize path: awaited directly after first .eq() →
                // Thenable resolves with an error so finalizeRun throws.
                then: (resolve: (v: unknown) => void) => {
                  resolve({ error: { message: "PG vanished mid-finalize" } });
                },
              }),
            }),
          };
        },
      };
      const registry: SkillRegistry = {
        "heartbeat-ping": async () => ({ ok: true, output: { kind: "test" } }),
      };
      const result = await processWorkerTick(
        makeFullDeps({ sb, registry, batchSize: 1 }),
        "POST",
        "valid-secret",
      );
      expect(result.status).toBe(500);
      const body = result.body as { error: string; detail: string; processed: unknown[] };
      expect(body.error).toBe("finalize");
      expect(body.detail).toContain("PG vanished mid-finalize");
      // 'processed' carries any prior successes; in this single-row scenario
      // the in-flight row is NOT pushed because finalize aborted the loop.
      expect(body.processed).toEqual([]);
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

// ============================================================================
// isRetryableAnthropicError — pure classifier
// ============================================================================
//
// Phase 1: 1 param (message string), returns boolean.
// Phase 2: cover each regex alternation + non-matching strings.

describe("isRetryableAnthropicError", () => {
  it("matches 5xx codes (500, 502, 503, 504)", () => {
    expect(isRetryableAnthropicError("HTTP 500 internal error")).toBe(true);
    expect(isRetryableAnthropicError("502 bad gateway")).toBe(true);
    expect(isRetryableAnthropicError("status 503")).toBe(true);
    expect(isRetryableAnthropicError("got 504 timeout from upstream")).toBe(true);
  });
  it("matches rate limit phrasing variants", () => {
    expect(isRetryableAnthropicError("rate_limit_exceeded")).toBe(true);
    expect(isRetryableAnthropicError("Rate Limit hit")).toBe(true);
    expect(isRetryableAnthropicError("rate limited by anthropic")).toBe(true);
  });
  it("matches timeout / network errors", () => {
    expect(isRetryableAnthropicError("ECONNRESET")).toBe(true);
    expect(isRetryableAnthropicError("EAI_AGAIN dns lookup failed")).toBe(true);
    expect(isRetryableAnthropicError("request timeout after 30s")).toBe(true);
  });
  it("does NOT match 4xx client errors", () => {
    expect(isRetryableAnthropicError("400 bad_request invalid payload")).toBe(false);
    expect(isRetryableAnthropicError("401 unauthorized")).toBe(false);
    expect(isRetryableAnthropicError("403 forbidden")).toBe(false);
    expect(isRetryableAnthropicError("404 model_not_found")).toBe(false);
  });
  it("does NOT match generic non-retryable text", () => {
    expect(isRetryableAnthropicError("invalid api key")).toBe(false);
    expect(isRetryableAnthropicError("validation_error")).toBe(false);
    expect(isRetryableAnthropicError("")).toBe(false);
  });
  it("does NOT match 3-digit numbers that are not 5xx (e.g. 200, 201, 422)", () => {
    expect(isRetryableAnthropicError("HTTP 200 OK")).toBe(false);
    expect(isRetryableAnthropicError("HTTP 201 created")).toBe(false);
    expect(isRetryableAnthropicError("HTTP 422 unprocessable")).toBe(false);
  });
});

// ============================================================================
// extractTextFromContent
// ============================================================================
//
// Phase 1: 1 param (content array | undefined), returns string.
// Phase 2: arrays of mixed/empty/missing text blocks.

describe("extractTextFromContent", () => {
  it("returns empty string when content is undefined", () => {
    expect(extractTextFromContent(undefined)).toBe("");
  });
  it("returns empty string when content is null (cast)", () => {
    expect(extractTextFromContent(null as unknown as undefined)).toBe("");
  });
  it("returns empty string when content is not an array", () => {
    expect(extractTextFromContent({} as unknown as undefined)).toBe("");
  });
  it("returns empty string when content array is empty", () => {
    expect(extractTextFromContent([])).toBe("");
  });
  it("joins multiple text blocks with newline", () => {
    expect(
      extractTextFromContent([
        { type: "text", text: "first" },
        { type: "text", text: "second" },
      ]),
    ).toBe("first\nsecond");
  });
  it("filters out non-text blocks (e.g. tool_use)", () => {
    expect(
      extractTextFromContent([
        { type: "text", text: "kept" },
        { type: "tool_use" },
        { type: "text", text: "also kept" },
      ]),
    ).toBe("kept\nalso kept");
  });
  it("filters out blocks where text is missing or non-string", () => {
    expect(
      extractTextFromContent([
        { type: "text" }, // no text
        { type: "text", text: undefined as unknown as string },
        { type: "text", text: 42 as unknown as string },
        { type: "text", text: "real" },
      ]),
    ).toBe("real");
  });
  it("preserves empty-string text entries (joined as blank line)", () => {
    expect(
      extractTextFromContent([
        { type: "text", text: "" },
        { type: "text", text: "x" },
      ]),
    ).toBe("\nx");
  });
});

// ============================================================================
// makeSynthesizeMorningBriefHandler
// ============================================================================
//
// Phase 1: deps (anthropic, model?, maxTokens?) → SkillHandler.
// Async handler branches:
//   - anthropic.messages.create throws (Error / string / network) → ok:false
//     • retryable if 5xx/rate_limit/timeout/ECONN/EAI_AGAIN
//     • else retryable:false
//   - happy: returns ok:true with full output payload
//   - default model + maxTokens used when deps omits them
//   - response missing fields (id/model/usage/stop_reason) → null/0 fallbacks
// Classification: handles I/O via injected anthropic → dependency degradation
//                 + error propagation tests required.

interface MockAnthropicConfig {
  response?: AnthropicMessagesResponse;
  throwError?: unknown;
}

function makeMockAnthropic(cfg: MockAnthropicConfig = {}): {
  anthropic: AnthropicLike;
  calls: AnthropicMessagesCreateParams[];
} {
  const calls: AnthropicMessagesCreateParams[] = [];
  const anthropic: AnthropicLike = {
    messages: {
      create: async (params) => {
        calls.push(params);
        if (cfg.throwError !== undefined) throw cfg.throwError;
        return (
          cfg.response ?? {
            id: "msg_default",
            content: [{ type: "text", text: "default" }],
            model: "claude-haiku-4-5",
            stop_reason: "end_turn",
            usage: { input_tokens: 10, output_tokens: 5 },
          }
        );
      },
    },
  };
  return { anthropic, calls };
}

const MORNING_RUN: ScheduledRun = {
  id: "run-mb-1",
  schedule_id: "morning-brief-assembly",
  triggered_skill: "synthesize-morning-brief",
  fired_at: "2026-05-05T05:45:00Z",
};

describe("makeSynthesizeMorningBriefHandler — happy path", () => {
  it("returns ok:true with full output payload from anthropic response", async () => {
    const { anthropic } = makeMockAnthropic({
      response: {
        id: "msg_abc123",
        content: [
          { type: "text", text: "(1) yesterday metric ↑3%" },
          { type: "text", text: "(2) ship Wave 2 task 3" },
        ],
        model: "claude-haiku-4-5",
        stop_reason: "end_turn",
        usage: { input_tokens: 250, output_tokens: 180 },
      },
    });
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    const result = await handler(MORNING_RUN);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.kind).toBe("morning_brief");
    expect(result.output.message_id).toBe("msg_abc123");
    expect(result.output.model).toBe("claude-haiku-4-5");
    expect(result.output.stop_reason).toBe("end_turn");
    expect(result.output.input_tokens).toBe(250);
    expect(result.output.output_tokens).toBe(180);
    expect(result.output.text).toBe(
      "(1) yesterday metric ↑3%\n(2) ship Wave 2 task 3",
    );
  });

  it("uses DEFAULT_MORNING_BRIEF_MODEL when no model provided", async () => {
    const { anthropic, calls } = makeMockAnthropic();
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    await handler(MORNING_RUN);
    expect(calls[0].model).toBe(DEFAULT_MORNING_BRIEF_MODEL);
  });

  it("uses DEFAULT_MORNING_BRIEF_MAX_TOKENS when not provided", async () => {
    const { anthropic, calls } = makeMockAnthropic();
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    await handler(MORNING_RUN);
    expect(calls[0].max_tokens).toBe(DEFAULT_MORNING_BRIEF_MAX_TOKENS);
  });

  it("respects custom model and maxTokens", async () => {
    const { anthropic, calls } = makeMockAnthropic();
    const handler = makeSynthesizeMorningBriefHandler({
      anthropic,
      model: "claude-sonnet-4-6",
      maxTokens: 2048,
    });
    await handler(MORNING_RUN);
    expect(calls[0].model).toBe("claude-sonnet-4-6");
    expect(calls[0].max_tokens).toBe(2048);
  });

  it("includes the system prompt and the run.fired_at in the user message", async () => {
    const { anthropic, calls } = makeMockAnthropic();
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    await handler(MORNING_RUN);
    expect(calls[0].system).toBe(DEFAULT_MORNING_BRIEF_SYSTEM);
    expect(calls[0].messages).toHaveLength(1);
    expect(calls[0].messages[0].role).toBe("user");
    expect(calls[0].messages[0].content).toContain(MORNING_RUN.fired_at);
  });
});

describe("makeSynthesizeMorningBriefHandler — degraded responses", () => {
  it("falls back model to deps.model when response.model is missing", async () => {
    const { anthropic } = makeMockAnthropic({
      response: { content: [{ type: "text", text: "x" }] },
    });
    const handler = makeSynthesizeMorningBriefHandler({
      anthropic,
      model: "claude-opus-4-7",
    });
    const result = await handler(MORNING_RUN);
    if (!result.ok) throw new Error("expected ok");
    expect(result.output.model).toBe("claude-opus-4-7");
  });

  it("falls back model to default when both response.model and deps.model are missing", async () => {
    const { anthropic } = makeMockAnthropic({
      response: { content: [{ type: "text", text: "x" }] },
    });
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    const result = await handler(MORNING_RUN);
    if (!result.ok) throw new Error("expected ok");
    expect(result.output.model).toBe(DEFAULT_MORNING_BRIEF_MODEL);
  });

  it("returns null for missing message_id and stop_reason", async () => {
    const { anthropic } = makeMockAnthropic({
      response: { content: [{ type: "text", text: "x" }] },
    });
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    const result = await handler(MORNING_RUN);
    if (!result.ok) throw new Error("expected ok");
    expect(result.output.message_id).toBeNull();
    expect(result.output.stop_reason).toBeNull();
  });

  it("returns 0 for missing usage tokens", async () => {
    const { anthropic } = makeMockAnthropic({
      response: { content: [{ type: "text", text: "x" }] },
    });
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    const result = await handler(MORNING_RUN);
    if (!result.ok) throw new Error("expected ok");
    expect(result.output.input_tokens).toBe(0);
    expect(result.output.output_tokens).toBe(0);
  });

  it("returns empty text when content array is empty", async () => {
    const { anthropic } = makeMockAnthropic({
      response: { content: [], usage: { input_tokens: 5, output_tokens: 0 } },
    });
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    const result = await handler(MORNING_RUN);
    if (!result.ok) throw new Error("expected ok");
    expect(result.output.text).toBe("");
    // ok:true is intentional — empty text is a valid (if degenerate) response.
    // Caller decides whether to act on it; the handler does not editorialize.
  });
});

describe("makeSynthesizeMorningBriefHandler — error paths", () => {
  it("returns ok:false retryable when SDK throws 5xx", async () => {
    const { anthropic } = makeMockAnthropic({
      throwError: new Error("500 internal_server_error"),
    });
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    const result = await handler(MORNING_RUN);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("anthropic:");
    expect(result.error).toContain("500");
    expect(result.retryable).toBe(true);
  });

  it("returns ok:false retryable on rate_limit_error", async () => {
    const { anthropic } = makeMockAnthropic({
      throwError: new Error("rate_limit_exceeded: please retry"),
    });
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    const result = await handler(MORNING_RUN);
    if (result.ok) throw new Error("expected failure");
    expect(result.retryable).toBe(true);
  });

  it("returns ok:false NOT retryable on 4xx invalid_request", async () => {
    const { anthropic } = makeMockAnthropic({
      throwError: new Error("400 invalid_request_error: bad input"),
    });
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    const result = await handler(MORNING_RUN);
    if (result.ok) throw new Error("expected failure");
    expect(result.retryable).toBe(false);
  });

  it("returns ok:false NOT retryable on auth error (no API key)", async () => {
    const { anthropic } = makeMockAnthropic({
      throwError: new Error("401 authentication_error: invalid x-api-key"),
    });
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    const result = await handler(MORNING_RUN);
    if (result.ok) throw new Error("expected failure");
    expect(result.retryable).toBe(false);
  });

  it("handles non-Error thrown value (string)", async () => {
    const { anthropic } = makeMockAnthropic({ throwError: "weird string error" });
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    const result = await handler(MORNING_RUN);
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toContain("weird string error");
  });

  it("handles non-Error thrown value (object without message)", async () => {
    const { anthropic } = makeMockAnthropic({ throwError: { code: "X" } });
    const handler = makeSynthesizeMorningBriefHandler({ anthropic });
    const result = await handler(MORNING_RUN);
    if (result.ok) throw new Error("expected failure");
    expect(typeof result.error).toBe("string");
    expect(result.error.length).toBeGreaterThan(0);
  });
});

describe("makeSynthesizeMorningBriefHandler — registered as SKILL", () => {
  it("integrates with executeRun like any other handler", async () => {
    const { anthropic } = makeMockAnthropic();
    const registry: SkillRegistry = {
      "synthesize-morning-brief": makeSynthesizeMorningBriefHandler({ anthropic }),
    };
    const result = await executeRun(
      { ...MORNING_RUN, triggered_skill: "synthesize-morning-brief" },
      registry,
      "fake-key",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.output as { kind: string }).kind).toBe("morning_brief");
  });
});

// ============================================================================
// makeEtlProductDauSnapshotHandler — Product Supabase → metrics.product_dau_snapshot
// ============================================================================
//
// Phase 1 — Code Analysis:
//   1 param (deps with metricsSb, opsSb, productSb|null). 3 main branches:
//     (a) productSb === null → deferred_no_product_supabase_key (no retry)
//     (b) product read returns row → insert into metrics
//         (b1) insert ok → return {ok:true, inserted:true}
//         (b2) insert returns 23505 → idempotent {ok:true, inserted:false}
//         (b3) insert returns other error → retryable {ok:false}
//     (c) product read returns null/empty → product_view_empty (no retry)
//   Plus error sub-branches: product_read error, product_read throw.
// Classification: I/O-heavy → dependency-degradation tests required.
//                 Idempotency claim → must verify 23505 path explicitly.

const SAMPLE_DAU_ROW: ProductDauRow = {
  snapshot_at: "2026-05-14T03:00:00Z",
  dau: 1234,
  wau: 7890,
  mau: 23456,
  new_signups_24h: 45,
  paid_users: 678,
  free_users: 12345,
  churned_users_24h: 12,
  extra: { source: "v_ops_dau_export" },
};

interface ProductReadOutcome {
  data?: ProductDauRow | null;
  error?: { message: string } | null;
  throws?: Error;
}

interface MetricsInsertOutcome {
  error?: { message: string; code?: string } | null;
  throws?: Error;
}

function makeEtlMocks(opts: {
  productResult?: ProductReadOutcome | null;     // null → productSb is null
  metricsResult?: MetricsInsertOutcome;
}): {
  metricsSb: SbClient;
  opsSb: SbClient;
  productSb: SbClient | null;
  productCalls: { table: string }[];
  metricsInserts: { table: string; row: unknown }[];
} {
  const productCalls: { table: string }[] = [];
  const metricsInserts: { table: string; row: unknown }[] = [];

  const productSb: SbClient | null =
    opts.productResult === null
      ? null
      : {
          from(table: string) {
            productCalls.push({ table });
            const chain: Record<string, unknown> = {
              select: () => chain,
              order: () => chain,
              limit: () => chain,
              maybeSingle: () => {
                const r = opts.productResult!;
                if (r.throws) throw r.throws;
                return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
              },
            };
            return chain;
          },
        };

  const metricsSb: SbClient = {
    from(table: string) {
      return {
        insert: (row: unknown) => {
          metricsInserts.push({ table, row });
          const r = opts.metricsResult;
          if (r?.throws) throw r.throws;
          return Promise.resolve({ error: r?.error ?? null });
        },
      };
    },
  };

  // opsSb is unused by the handler today but the dep shape requires it.
  const opsSb: SbClient = { from: () => ({}) };

  return { metricsSb, opsSb, productSb, productCalls, metricsInserts };
}

describe("makeEtlProductDauSnapshotHandler", () => {
  describe("happy path", () => {
    it("reads from product, inserts into metrics, returns ok with inserted=true", async () => {
      const m = makeEtlMocks({
        productResult: { data: SAMPLE_DAU_ROW, error: null },
        metricsResult: { error: null },
      });
      const handler = makeEtlProductDauSnapshotHandler({
        metricsSb: m.metricsSb,
        opsSb: m.opsSb,
        productSb: m.productSb,
      });

      const result = await handler(SAMPLE_RUN);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toMatchObject({
        kind: "etl_dau_snapshot",
        snapshot_at: SAMPLE_DAU_ROW.snapshot_at,
        dau: SAMPLE_DAU_ROW.dau,
        inserted: true,
      });
      expect(m.productCalls).toEqual([{ table: "v_ops_dau_export" }]);
      expect(m.metricsInserts).toHaveLength(1);
      expect(m.metricsInserts[0].table).toBe("product_dau_snapshot");
      expect(m.metricsInserts[0].row).toMatchObject({
        snapshot_at: SAMPLE_DAU_ROW.snapshot_at,
        dau: SAMPLE_DAU_ROW.dau,
        etl_run_id: SAMPLE_RUN.id,
      });
    });
  });

  describe("gate: productSb missing", () => {
    it("returns deferred_no_product_supabase_key when productSb is null", async () => {
      const m = makeEtlMocks({ productResult: null });
      const handler = makeEtlProductDauSnapshotHandler({
        metricsSb: m.metricsSb,
        opsSb: m.opsSb,
        productSb: m.productSb,
      });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.error).toBe("deferred_no_product_supabase_key");
      expect(fail.retryable).toBe(false);
      expect(m.metricsInserts).toHaveLength(0);
    });
  });

  describe("idempotency — duplicate snapshot_at returns ok with inserted=false", () => {
    it("treats Postgres 23505 unique-violation as success (already-seen snapshot)", async () => {
      const m = makeEtlMocks({
        productResult: { data: SAMPLE_DAU_ROW, error: null },
        metricsResult: { error: { message: "duplicate key", code: "23505" } },
      });
      const handler = makeEtlProductDauSnapshotHandler({
        metricsSb: m.metricsSb,
        opsSb: m.opsSb,
        productSb: m.productSb,
      });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toMatchObject({
        kind: "etl_dau_snapshot",
        inserted: false,
        reason: "duplicate_snapshot_at",
      });
    });
  });

  describe("error handling", () => {
    it("returns retryable failure when product read errors", async () => {
      const m = makeEtlMocks({
        productResult: { error: { message: "connection reset" } },
      });
      const handler = makeEtlProductDauSnapshotHandler({
        metricsSb: m.metricsSb,
        opsSb: m.opsSb,
        productSb: m.productSb,
      });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.error).toMatch(/^product_read: connection reset/);
      expect(fail.retryable).toBe(true);
      expect(m.metricsInserts).toHaveLength(0);
    });

    it("returns retryable failure when product read throws", async () => {
      const m = makeEtlMocks({
        productResult: { throws: new Error("DNS lookup failed") },
      });
      const handler = makeEtlProductDauSnapshotHandler({
        metricsSb: m.metricsSb,
        opsSb: m.opsSb,
        productSb: m.productSb,
      });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.error).toMatch(/^product_read_throw: DNS lookup failed/);
      expect(fail.retryable).toBe(true);
    });

    it("returns retryable failure when metrics insert errors with non-23505 code", async () => {
      const m = makeEtlMocks({
        productResult: { data: SAMPLE_DAU_ROW, error: null },
        metricsResult: { error: { message: "permission denied", code: "42501" } },
      });
      const handler = makeEtlProductDauSnapshotHandler({
        metricsSb: m.metricsSb,
        opsSb: m.opsSb,
        productSb: m.productSb,
      });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.error).toMatch(/^metrics_insert: permission denied/);
      expect(fail.retryable).toBe(true);
    });
  });

  describe("dependency degradation", () => {
    it("returns product_view_empty (no retry) when product returns null data", async () => {
      const m = makeEtlMocks({
        productResult: { data: null, error: null },
      });
      const handler = makeEtlProductDauSnapshotHandler({
        metricsSb: m.metricsSb,
        opsSb: m.opsSb,
        productSb: m.productSb,
      });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.error).toBe("product_view_empty");
      expect(fail.retryable).toBe(false);
      expect(m.metricsInserts).toHaveLength(0);
    });

    it("normalises nullable upstream fields to safe defaults on insert", async () => {
      // Row with only required fields filled — wau/mau/etc are null/undefined.
      const sparseRow: ProductDauRow = {
        snapshot_at: "2026-05-14T04:00:00Z",
        dau: 100,
      };
      const m = makeEtlMocks({
        productResult: { data: sparseRow, error: null },
        metricsResult: { error: null },
      });
      const handler = makeEtlProductDauSnapshotHandler({
        metricsSb: m.metricsSb,
        opsSb: m.opsSb,
        productSb: m.productSb,
      });
      await handler(SAMPLE_RUN);
      const row = m.metricsInserts[0].row as Record<string, unknown>;
      expect(row.dau).toBe(100);
      expect(row.wau).toBeNull();
      expect(row.mau).toBeNull();
      expect(row.extra).toEqual({});
    });
  });

  describe("contract boundaries — input from claimNextRun", () => {
    it("uses run.id as etl_run_id for traceability", async () => {
      const m = makeEtlMocks({
        productResult: { data: SAMPLE_DAU_ROW, error: null },
        metricsResult: { error: null },
      });
      const handler = makeEtlProductDauSnapshotHandler({
        metricsSb: m.metricsSb,
        opsSb: m.opsSb,
        productSb: m.productSb,
      });
      await handler({ ...SAMPLE_RUN, id: "specific-run-uuid" });
      const row = m.metricsInserts[0].row as Record<string, unknown>;
      expect(row.etl_run_id).toBe("specific-run-uuid");
    });
  });
});
