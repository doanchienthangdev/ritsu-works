// Tests for supabase/functions/_shared/dispatcher.ts
//
// Methodology: Phase 1+2+3+4+5 of /all-edge-cases-test from ~/.claude/CLAUDE.md
//
// Phase 1 — Code Analysis:
//   verifyAuthHeader      : 2 params (provided, expected); 2 branches; pure
//   parseDispatchRequest  : 1 param (raw unknown); 4 branches; pure
//   lookupSchedule        : 2 params; 3 branches; pure (uses hasOwnProperty for prototype safety)
//   concurrencyLockHeld   : 2 params; 2 branches; async, throws on DB error
//   checkSkipConditions   : stub returns {skip:false}
//   checkHitlGate         : stub returns {requires_approval:false}
//   checkBudget           : stub returns {ok:true}
//   insertScheduledRun    : 3 params; 2 branches; async, throws on DB error
//   processDispatchRequest: orchestrator; 10 branches; async
//
// Classification: handles user input (auth + JSON) → security tests enabled.
//                 async + stateful + I/O → state/timing + dependency degradation enabled.
//                 consumes from external caller (HTTP) → contract boundary tests enabled.
//                 prior regression: column names (commit 23f1e6e) → regression tests required.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  verifyAuthHeader,
  parseDispatchRequest,
  lookupSchedule,
  concurrencyLockHeld,
  checkSkipConditions,
  checkHitlGate,
  checkBudget,
  insertScheduledRun,
  processDispatchRequest,
  type ScheduleEntry,
  type SbClient,
} from "../supabase/functions/_shared/dispatcher.ts";

// ----- Mock Supabase client builder -----

type MockResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

interface MockSbConfig {
  selectResult?: MockResult<unknown>;
  insertResult?: MockResult<{ id: string }>;
}

function makeMockSb(cfg: MockSbConfig = {}): { sb: SbClient; calls: { table: string; op: string; payload?: unknown }[] } {
  const calls: { table: string; op: string; payload?: unknown }[] = [];

  const builder = {
    eq: vi.fn(function (this: any) { return this; }),
    in: vi.fn(function (this: any) { return this; }),
    limit: vi.fn(function (this: any) { return Promise.resolve(cfg.selectResult ?? { data: [], error: null }); }),
    select: vi.fn(function (this: any) { return this; }),
    single: vi.fn(function (this: any) { return Promise.resolve(cfg.insertResult ?? { data: { id: "stub-id" }, error: null }); }),
  };

  const sb: SbClient = {
    from(table: string) {
      return {
        select: vi.fn((cols: string) => {
          calls.push({ table, op: "select", payload: cols });
          return builder;
        }),
        insert: vi.fn((row: unknown) => {
          calls.push({ table, op: "insert", payload: row });
          return {
            select: () => builder,
          };
        }),
      };
    },
  };
  return { sb, calls };
}

// ----- Common fixtures -----

const FIXED_TIME = "2026-05-05T05:00:00Z";

const DEFAULT_SCHEDULE: ScheduleEntry = {
  id: "morning-brief",
  cron: "45 5 * * *",
  description: "Test schedule",
  skill: "synthesize-morning-brief",
};

const DEFAULT_SCHEDULES: Record<string, ScheduleEntry> = {
  "morning-brief": DEFAULT_SCHEDULE,
  "weekly-report": {
    id: "weekly-report",
    cron: "0 9 * * MON",
    description: "Weekly",
    skill: "weekly-report",
  },
};

// ============================================================================
// verifyAuthHeader
// ============================================================================

describe("verifyAuthHeader", () => {
  describe("happy path", () => {
    it("returns true when provided matches expected exactly", () => {
      expect(verifyAuthHeader("secret123", "secret123")).toBe(true);
    });
  });

  describe("input boundaries — provided", () => {
    it("returns false when provided is null", () => {
      expect(verifyAuthHeader(null, "secret")).toBe(false);
    });
    it("returns false when provided is undefined", () => {
      expect(verifyAuthHeader(undefined, "secret")).toBe(false);
    });
    it("returns false when provided is empty string", () => {
      expect(verifyAuthHeader("", "secret")).toBe(false);
    });
    it("returns false when provided is whitespace", () => {
      expect(verifyAuthHeader("   ", "secret")).toBe(false);
    });
    it("returns false when provided differs by case", () => {
      expect(verifyAuthHeader("SECRET", "secret")).toBe(false);
    });
    it("returns false when provided has trailing whitespace", () => {
      expect(verifyAuthHeader("secret ", "secret")).toBe(false);
    });
  });

  describe("input boundaries — expected (fail closed)", () => {
    it("returns false when expected is empty (fail closed)", () => {
      expect(verifyAuthHeader("anything", "")).toBe(false);
    });
    it("returns false when both empty", () => {
      expect(verifyAuthHeader("", "")).toBe(false);
    });
  });

  describe("security", () => {
    it("does not match prototype-pollution shapes", () => {
      expect(verifyAuthHeader("__proto__", "secret")).toBe(false);
    });
    it("matches very long secrets correctly", () => {
      const longSecret = "a".repeat(10_000);
      expect(verifyAuthHeader(longSecret, longSecret)).toBe(true);
    });
    it("rejects partial prefix match", () => {
      expect(verifyAuthHeader("sec", "secret")).toBe(false);
    });
    it("rejects partial suffix match", () => {
      expect(verifyAuthHeader("secret-extra", "secret")).toBe(false);
    });
  });
});

// ============================================================================
// parseDispatchRequest
// ============================================================================

describe("parseDispatchRequest", () => {
  describe("happy path", () => {
    it("parses a valid request with schedule_id only", () => {
      expect(parseDispatchRequest({ schedule_id: "x" })).toEqual({
        schedule_id: "x",
        triggered_at: undefined,
      });
    });
    it("parses a valid request with both fields", () => {
      expect(
        parseDispatchRequest({ schedule_id: "x", triggered_at: "2026-01-01T00:00:00Z" }),
      ).toEqual({
        schedule_id: "x",
        triggered_at: "2026-01-01T00:00:00Z",
      });
    });
  });

  describe("input boundaries — raw", () => {
    it("returns null for null input", () => {
      expect(parseDispatchRequest(null)).toBeNull();
    });
    it("returns null for undefined", () => {
      expect(parseDispatchRequest(undefined)).toBeNull();
    });
    it("returns null for empty string", () => {
      expect(parseDispatchRequest("")).toBeNull();
    });
    it("returns null for number", () => {
      expect(parseDispatchRequest(42)).toBeNull();
    });
    it("returns null for boolean", () => {
      expect(parseDispatchRequest(true)).toBeNull();
    });
    it("returns null for array", () => {
      // Arrays are objects but lack schedule_id string property.
      expect(parseDispatchRequest(["x"])).toBeNull();
    });
  });

  describe("input boundaries — schedule_id", () => {
    it("returns null when schedule_id missing", () => {
      expect(parseDispatchRequest({})).toBeNull();
    });
    it("returns null when schedule_id is null", () => {
      expect(parseDispatchRequest({ schedule_id: null })).toBeNull();
    });
    it("returns null when schedule_id is empty string", () => {
      expect(parseDispatchRequest({ schedule_id: "" })).toBeNull();
    });
    it("returns null when schedule_id is a number", () => {
      expect(parseDispatchRequest({ schedule_id: 5 })).toBeNull();
    });
    it("accepts schedule_id with single char", () => {
      expect(parseDispatchRequest({ schedule_id: "a" })?.schedule_id).toBe("a");
    });
    it("accepts very long schedule_id", () => {
      const long = "a".repeat(10_000);
      expect(parseDispatchRequest({ schedule_id: long })?.schedule_id).toBe(long);
    });
    it("accepts schedule_id with unicode", () => {
      expect(parseDispatchRequest({ schedule_id: "嗨🔮" })?.schedule_id).toBe("嗨🔮");
    });
  });

  describe("input boundaries — triggered_at", () => {
    it("strips non-string triggered_at", () => {
      expect(parseDispatchRequest({ schedule_id: "x", triggered_at: 123 })?.triggered_at).toBeUndefined();
    });
    it("preserves string triggered_at even if invalid date", () => {
      // Validation of date format is a concern of the caller; parser only checks type.
      expect(
        parseDispatchRequest({ schedule_id: "x", triggered_at: "not-a-date" })?.triggered_at,
      ).toBe("not-a-date");
    });
  });

  describe("security", () => {
    it("does not throw on prototype-polluted object", () => {
      const malicious = { schedule_id: "ok", __proto__: { polluted: true } };
      expect(() => parseDispatchRequest(malicious)).not.toThrow();
      expect(parseDispatchRequest(malicious)?.schedule_id).toBe("ok");
    });
    it("ignores extra unexpected fields", () => {
      const result = parseDispatchRequest({ schedule_id: "x", evil: "<script>" });
      expect(result).toEqual({ schedule_id: "x", triggered_at: undefined });
    });
  });
});

// ============================================================================
// lookupSchedule
// ============================================================================

describe("lookupSchedule", () => {
  describe("happy path", () => {
    it("returns the schedule when id exists", () => {
      expect(lookupSchedule(DEFAULT_SCHEDULES, "morning-brief")).toEqual(DEFAULT_SCHEDULE);
    });
  });

  describe("input boundaries", () => {
    it("returns null for unknown id", () => {
      expect(lookupSchedule(DEFAULT_SCHEDULES, "no-such-id")).toBeNull();
    });
    it("returns null for empty id", () => {
      expect(lookupSchedule(DEFAULT_SCHEDULES, "")).toBeNull();
    });
    it("returns null when registry is empty", () => {
      expect(lookupSchedule({}, "anything")).toBeNull();
    });
  });

  describe("security — prototype pollution", () => {
    it("does not return inherited properties (toString, hasOwnProperty)", () => {
      // Prototype methods are NOT real schedules; lookup must reject them.
      expect(lookupSchedule(DEFAULT_SCHEDULES, "toString")).toBeNull();
      expect(lookupSchedule(DEFAULT_SCHEDULES, "hasOwnProperty")).toBeNull();
      expect(lookupSchedule(DEFAULT_SCHEDULES, "__proto__")).toBeNull();
      expect(lookupSchedule(DEFAULT_SCHEDULES, "constructor")).toBeNull();
    });
  });
});

// ============================================================================
// concurrencyLockHeld
// ============================================================================

describe("concurrencyLockHeld", () => {
  describe("happy path", () => {
    it("returns false when no pending or running rows exist", async () => {
      const { sb } = makeMockSb({ selectResult: { data: [], error: null } });
      expect(await concurrencyLockHeld(sb, "morning-brief")).toBe(false);
    });
    it("returns true when at least one row exists", async () => {
      const { sb } = makeMockSb({
        selectResult: { data: [{ id: "uuid-1" }], error: null },
      });
      expect(await concurrencyLockHeld(sb, "morning-brief")).toBe(true);
    });
  });

  describe("regression — column names (commit 23f1e6e)", () => {
    it("queries `state` column, NOT `status` (drift fixed)", async () => {
      let capturedCol: string | null = null;
      const sb: SbClient = {
        from() {
          return {
            select: () => ({
              eq: () => ({
                in: (col: string, _vals: unknown) => {
                  capturedCol = col;
                  return { limit: () => Promise.resolve({ data: [], error: null }) };
                },
              }),
            }),
          };
        },
      };
      await concurrencyLockHeld(sb, "x");
      expect(capturedCol).toBe("state");
      expect(capturedCol).not.toBe("status");
    });
  });

  describe("dependency degradation", () => {
    it("treats undefined data as no lock (no crash on null data)", async () => {
      const sb: SbClient = {
        from() {
          return {
            select: () => ({
              eq: () => ({ in: () => ({ limit: () => Promise.resolve({ data: undefined, error: null }) }) }),
            }),
          };
        },
      };
      expect(await concurrencyLockHeld(sb, "x")).toBe(false);
    });
    it("treats non-array data as no lock", async () => {
      const sb: SbClient = {
        from() {
          return {
            select: () => ({
              eq: () => ({ in: () => ({ limit: () => Promise.resolve({ data: "weird", error: null }) }) }),
            }),
          };
        },
      };
      expect(await concurrencyLockHeld(sb, "x")).toBe(false);
    });
  });

  describe("error handling", () => {
    it("throws when DB returns an error", async () => {
      const { sb } = makeMockSb({
        selectResult: { data: null, error: { message: "connection refused" } },
      });
      await expect(concurrencyLockHeld(sb, "x")).rejects.toThrow(/lock check failed/);
      await expect(concurrencyLockHeld(sb, "x")).rejects.toThrow(/connection refused/);
    });
  });
});

// ============================================================================
// stub pre-flight checks
// ============================================================================

describe("stub pre-flight checks (Wave 2 EXT)", () => {
  it("checkSkipConditions always returns skip=false until ops.settings is wired", async () => {
    expect(await checkSkipConditions(DEFAULT_SCHEDULE)).toEqual({ skip: false });
  });
  it("checkHitlGate always returns requires_approval=false until HITL queue lands", async () => {
    expect(await checkHitlGate(DEFAULT_SCHEDULE)).toEqual({ requires_approval: false });
  });
  it("checkBudget always returns ok=true until pre-llm-call-budget hook lands", async () => {
    expect(await checkBudget(DEFAULT_SCHEDULE)).toEqual({ ok: true });
  });
});

// ============================================================================
// insertScheduledRun
// ============================================================================

describe("insertScheduledRun", () => {
  describe("happy path", () => {
    it("returns the new id from the DB response", async () => {
      const { sb } = makeMockSb({
        insertResult: { data: { id: "new-uuid-42" }, error: null },
      });
      const result = await insertScheduledRun(sb, DEFAULT_SCHEDULE, FIXED_TIME);
      expect(result.id).toBe("new-uuid-42");
    });
  });

  describe("regression — column names (commit 23f1e6e)", () => {
    it("inserts `fired_at` and `state`, NOT `triggered_at` or `status`", async () => {
      let captured: Record<string, unknown> | null = null;
      const sb: SbClient = {
        from() {
          return {
            insert: (row: Record<string, unknown>) => {
              captured = row;
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: { id: "x" }, error: null }),
                }),
              };
            },
          };
        },
      };
      await insertScheduledRun(sb, DEFAULT_SCHEDULE, FIXED_TIME);
      expect(captured).toBeDefined();
      expect(captured).toHaveProperty("fired_at", FIXED_TIME);
      expect(captured).toHaveProperty("state", "pending");
      expect(captured).toHaveProperty("cron_expression", DEFAULT_SCHEDULE.cron);
      expect(captured).toHaveProperty("triggered_skill", DEFAULT_SCHEDULE.skill);
      expect(captured).not.toHaveProperty("triggered_at"); // legacy DRAFT field — must not appear
      expect(captured).not.toHaveProperty("status");
      expect(captured).not.toHaveProperty("retry_count");
    });
  });

  describe("error handling", () => {
    it("throws with descriptive message on DB error", async () => {
      const { sb } = makeMockSb({
        insertResult: { data: null, error: { message: "duplicate key" } },
      });
      await expect(insertScheduledRun(sb, DEFAULT_SCHEDULE, FIXED_TIME)).rejects.toThrow(
        /insert failed.*duplicate key/,
      );
    });
  });
});

// ============================================================================
// processDispatchRequest — orchestrator
// ============================================================================

describe("processDispatchRequest", () => {
  const baseDeps = (overrides: Partial<Parameters<typeof processDispatchRequest>[0]> = {}) => ({
    sb: makeMockSb().sb,
    schedules: DEFAULT_SCHEDULES,
    dispatcherSecret: "valid-secret",
    now: () => FIXED_TIME,
    ...overrides,
  });

  describe("happy path", () => {
    it("returns 200 queued with run_id when all checks pass", async () => {
      const { sb } = makeMockSb({
        selectResult: { data: [], error: null },
        insertResult: { data: { id: "run-123" }, error: null },
      });
      const result = await processDispatchRequest(
        baseDeps({ sb }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        status: "queued",
        run_id: "run-123",
        schedule_id: "morning-brief",
      });
    });
  });

  describe("input boundaries — method (HTTP method enforcement)", () => {
    it.each(["GET", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", ""])(
      "rejects %s with 405",
      async (method) => {
        const result = await processDispatchRequest(
          baseDeps(),
          method,
          "valid-secret",
          { schedule_id: "morning-brief" },
        );
        expect(result.status).toBe(405);
        expect(result.body).toBe("method");
      },
    );
  });

  describe("security — auth header", () => {
    it("returns 401 with no auth header", async () => {
      const result = await processDispatchRequest(
        baseDeps(),
        "POST",
        null,
        { schedule_id: "morning-brief" },
      );
      expect(result.status).toBe(401);
      expect(result.body).toEqual({ error: "auth" });
    });
    it("returns 401 with wrong auth header", async () => {
      const result = await processDispatchRequest(
        baseDeps(),
        "POST",
        "wrong-secret",
        { schedule_id: "morning-brief" },
      );
      expect(result.status).toBe(401);
    });
    it("returns 401 when dispatcherSecret unset (fail closed)", async () => {
      const result = await processDispatchRequest(
        baseDeps({ dispatcherSecret: "" }),
        "POST",
        "anything",
        { schedule_id: "morning-brief" },
      );
      expect(result.status).toBe(401);
    });
    it.each([
      "'; DROP TABLE scheduled_runs; --",
      "<script>alert('xss')</script>",
      "../../../etc/passwd",
      "${jndi:ldap://evil/}",
    ])("returns 401 for malicious auth value: %s", async (auth) => {
      const result = await processDispatchRequest(
        baseDeps(),
        "POST",
        auth,
        { schedule_id: "morning-brief" },
      );
      expect(result.status).toBe(401);
    });
  });

  describe("input boundaries — body", () => {
    it("returns 400 on null body", async () => {
      const result = await processDispatchRequest(baseDeps(), "POST", "valid-secret", null);
      expect(result.status).toBe(400);
      expect(result.body).toEqual({ error: "bad_json" });
    });
    it("returns 400 on missing schedule_id", async () => {
      const result = await processDispatchRequest(baseDeps(), "POST", "valid-secret", {});
      expect(result.status).toBe(400);
    });
    it("returns 404 on unknown schedule", async () => {
      const result = await processDispatchRequest(
        baseDeps(),
        "POST",
        "valid-secret",
        { schedule_id: "no-such-id" },
      );
      expect(result.status).toBe(404);
      expect(result.body).toEqual({
        error: "unknown_schedule",
        schedule_id: "no-such-id",
      });
    });
    it("does not leak unknown schedule_id from prototype chain", async () => {
      const result = await processDispatchRequest(
        baseDeps(),
        "POST",
        "valid-secret",
        { schedule_id: "toString" },
      );
      expect(result.status).toBe(404);
    });
  });

  describe("state and timing", () => {
    it("returns 200 skipped when concurrency lock held", async () => {
      const { sb } = makeMockSb({
        selectResult: { data: [{ id: "running-row" }], error: null },
      });
      const result = await processDispatchRequest(
        baseDeps({ sb }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ status: "skipped", reason: "concurrency_lock" });
    });

    it("uses provided triggered_at over current time", async () => {
      let capturedFiredAt: string | undefined;
      const sb: SbClient = {
        from() {
          return {
            select: () => ({
              eq: () => ({ in: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
            }),
            insert: (row: Record<string, unknown>) => {
              capturedFiredAt = row.fired_at as string;
              return {
                select: () => ({ single: () => Promise.resolve({ data: { id: "x" }, error: null }) }),
              };
            },
          };
        },
      };
      await processDispatchRequest(
        baseDeps({ sb }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief", triggered_at: "2030-12-31T23:59:59Z" },
      );
      expect(capturedFiredAt).toBe("2030-12-31T23:59:59Z");
    });
  });

  describe("error handling", () => {
    it("returns 500 with detail when insert fails", async () => {
      const { sb } = makeMockSb({
        selectResult: { data: [], error: null },
        insertResult: { data: null, error: { message: "PG error" } },
      });
      const result = await processDispatchRequest(
        baseDeps({ sb }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(result.status).toBe(500);
      expect(result.body).toMatchObject({ error: "insert_failed" });
    });
  });

  describe("contract boundaries", () => {
    it("processes upstream output where triggered_at is omitted (uses now())", async () => {
      const { sb } = makeMockSb({
        selectResult: { data: [], error: null },
        insertResult: { data: { id: "x" }, error: null },
      });
      const result = await processDispatchRequest(
        baseDeps({ sb }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" }, // realistic shape from pg_cron
      );
      expect(result.status).toBe(200);
    });

    it("falls back to new Date().toISOString() when both triggered_at and deps.now are unset", async () => {
      // Covers dispatcher.ts line 159 branch:
      //   triggered_at ?? (deps.now ? deps.now() : new Date().toISOString())
      // when deps.now is undefined.
      let capturedFiredAt: string | undefined;
      const sb: SbClient = {
        from() {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
              }),
            }),
            insert: (row: Record<string, unknown>) => {
              capturedFiredAt = row.fired_at as string;
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: { id: "x" }, error: null }),
                }),
              };
            },
          };
        },
      };
      const before = new Date().toISOString();
      const result = await processDispatchRequest(
        {
          sb,
          schedules: DEFAULT_SCHEDULES,
          dispatcherSecret: "valid-secret",
          // intentionally NO `now` override
        },
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      const after = new Date().toISOString();
      expect(result.status).toBe(200);
      expect(typeof capturedFiredAt).toBe("string");
      expect(capturedFiredAt!).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      // Sanity: the captured timestamp falls between before and after.
      expect(capturedFiredAt!.localeCompare(before)).toBeGreaterThanOrEqual(0);
      expect(capturedFiredAt!.localeCompare(after)).toBeLessThanOrEqual(0);
    });
    it("ignores extra fields in body without erroring", async () => {
      const { sb } = makeMockSb({
        selectResult: { data: [], error: null },
        insertResult: { data: { id: "x" }, error: null },
      });
      const result = await processDispatchRequest(
        baseDeps({ sb }),
        "POST",
        "valid-secret",
        {
          schedule_id: "morning-brief",
          extra_field: "ignored",
          nested: { whatever: true },
        },
      );
      expect(result.status).toBe(200);
    });
  });

  describe("specification conformance — README contract", () => {
    // README documents: 401 no-auth, 404 unknown, 405 GET. These are explicit promises.
    it("README: GET returns 405", async () => {
      expect((await processDispatchRequest(baseDeps(), "GET", "valid-secret", null)).status).toBe(405);
    });
    it("README: POST without secret returns 401", async () => {
      expect((await processDispatchRequest(baseDeps(), "POST", null, { schedule_id: "morning-brief" })).status).toBe(401);
    });
    it("README: POST with valid secret + unknown schedule returns 404", async () => {
      expect((await processDispatchRequest(baseDeps(), "POST", "valid-secret", { schedule_id: "no-such" })).status).toBe(404);
    });
  });

  // ==========================================================================
  // Pre-flight gate branches — exercise via injected gate overrides
  // (defaults are always-pass stubs; tests inject implementations to cover
  //  skip / hitl / budget paths in processDispatchRequest)
  // ==========================================================================

  describe("pre-flight gates — checkSkipConditions", () => {
    it("returns 200 skipped with reason when skip=true and reason provided", async () => {
      const { sb } = makeMockSb({ selectResult: { data: [], error: null } });
      const result = await processDispatchRequest(
        baseDeps({
          sb,
          checkSkipConditions: async () => ({ skip: true, reason: "founder_vacation" }),
        }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ status: "skipped", reason: "founder_vacation" });
    });

    it("falls back to 'skip_condition' when skip=true but reason is undefined", async () => {
      const { sb } = makeMockSb({ selectResult: { data: [], error: null } });
      const result = await processDispatchRequest(
        baseDeps({
          sb,
          checkSkipConditions: async () => ({ skip: true }),
        }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(result.body).toEqual({ status: "skipped", reason: "skip_condition" });
    });

    it("does NOT call the gate when concurrency lock is already held", async () => {
      // Concurrency lock check fires first; downstream gates should not run.
      let skipCalled = false;
      const { sb } = makeMockSb({
        selectResult: { data: [{ id: "running" }], error: null },
      });
      await processDispatchRequest(
        baseDeps({
          sb,
          checkSkipConditions: async () => {
            skipCalled = true;
            return { skip: false };
          },
        }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(skipCalled).toBe(false);
    });

    it("does NOT proceed to checkHitlGate when skip=true", async () => {
      let hitlCalled = false;
      const { sb } = makeMockSb({ selectResult: { data: [], error: null } });
      await processDispatchRequest(
        baseDeps({
          sb,
          checkSkipConditions: async () => ({ skip: true, reason: "x" }),
          checkHitlGate: async () => {
            hitlCalled = true;
            return { requires_approval: false };
          },
        }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(hitlCalled).toBe(false);
    });
  });

  describe("pre-flight gates — checkHitlGate", () => {
    it("returns 202 queued_for_approval when requires_approval=true", async () => {
      const { sb } = makeMockSb({ selectResult: { data: [], error: null } });
      const result = await processDispatchRequest(
        baseDeps({
          sb,
          checkHitlGate: async () => ({ requires_approval: true }),
        }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(result.status).toBe(202);
      expect(result.body).toEqual({ status: "queued_for_approval" });
    });

    it("does NOT proceed to checkBudget when hitl gates the run", async () => {
      let budgetCalled = false;
      const { sb } = makeMockSb({ selectResult: { data: [], error: null } });
      await processDispatchRequest(
        baseDeps({
          sb,
          checkHitlGate: async () => ({ requires_approval: true }),
          checkBudget: async () => {
            budgetCalled = true;
            return { ok: true };
          },
        }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(budgetCalled).toBe(false);
    });
  });

  describe("pre-flight gates — checkBudget", () => {
    it("returns 200 blocked with reason when ok=false and reason provided", async () => {
      const { sb } = makeMockSb({ selectResult: { data: [], error: null } });
      const result = await processDispatchRequest(
        baseDeps({
          sb,
          checkBudget: async () => ({ ok: false, reason: "daily_cap" }),
        }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ status: "blocked", reason: "daily_cap" });
    });

    it("falls back to 'budget' when ok=false but reason is undefined", async () => {
      const { sb } = makeMockSb({ selectResult: { data: [], error: null } });
      const result = await processDispatchRequest(
        baseDeps({
          sb,
          checkBudget: async () => ({ ok: false }),
        }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(result.body).toEqual({ status: "blocked", reason: "budget" });
    });

    it("does NOT proceed to insertScheduledRun when budget blocks", async () => {
      let insertCalled = false;
      const sb: SbClient = {
        from() {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
              }),
            }),
            insert: () => {
              insertCalled = true;
              return {
                select: () => ({ single: () => Promise.resolve({ data: { id: "x" }, error: null }) }),
              };
            },
          };
        },
      };
      await processDispatchRequest(
        baseDeps({
          sb,
          checkBudget: async () => ({ ok: false, reason: "x" }),
        }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(insertCalled).toBe(false);
    });
  });

  describe("pre-flight gates — gate ordering invariant", () => {
    // Phase 2I: state & timing — verify the gate sequence is deterministic.
    it("calls gates strictly in order: skip → hitl → budget when each passes", async () => {
      const calls: string[] = [];
      const { sb } = makeMockSb({
        selectResult: { data: [], error: null },
        insertResult: { data: { id: "x" }, error: null },
      });
      await processDispatchRequest(
        baseDeps({
          sb,
          checkSkipConditions: async () => {
            calls.push("skip");
            return { skip: false };
          },
          checkHitlGate: async () => {
            calls.push("hitl");
            return { requires_approval: false };
          },
          checkBudget: async () => {
            calls.push("budget");
            return { ok: true };
          },
        }),
        "POST",
        "valid-secret",
        { schedule_id: "morning-brief" },
      );
      expect(calls).toEqual(["skip", "hitl", "budget"]);
    });
  });
});
