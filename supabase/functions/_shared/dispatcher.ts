// Pure logic for scheduled-run-dispatcher (Bài #8).
// Designed to import cleanly in both Deno (Edge Function runtime) and Node (Vitest tests).
// No Deno-specific globals or URL imports — all dependencies injected.
//
// Test target: tests/dispatcher.test.ts

export interface ScheduleEntry {
  id: string;
  cron: string;
  description: string;
  skill: string;
  enabled_when_mode?: string[];
  requires_api?: string;
  fallback?: string;
  cost_estimate?: string;
  hitl_tier?: "A" | "B" | "C" | "D-Std" | "D-MAX";
  skip_when?: string[];
  retry_policy?: { max_retries?: number; backoff?: string; dead_letter_after?: number };
}

export interface DispatchRequest {
  schedule_id: string;
  triggered_at?: string;
}

export type DispatchOutcome =
  | { kind: "queued"; run_id: string; schedule_id: string }
  | { kind: "skipped"; reason: string }
  | { kind: "queued_for_approval" }
  | { kind: "blocked"; reason: string };

// Minimal Supabase-like client interface so this module compiles
// without importing the full SDK. The real client (supabase-js) satisfies it.
export interface SbClient {
  // deno-lint-ignore no-explicit-any
  from(table: string): any;
}

export function verifyAuthHeader(provided: string | null | undefined, expected: string): boolean {
  if (!expected) return false; // fail closed when secret unset
  return (provided ?? "") === expected;
}

export function parseDispatchRequest(raw: unknown): DispatchRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.schedule_id !== "string" || r.schedule_id.length === 0) return null;
  const triggered_at = typeof r.triggered_at === "string" ? r.triggered_at : undefined;
  return { schedule_id: r.schedule_id, triggered_at };
}

export function lookupSchedule(
  schedules: Record<string, ScheduleEntry>,
  scheduleId: string,
): ScheduleEntry | null {
  if (!scheduleId) return null;
  return Object.prototype.hasOwnProperty.call(schedules, scheduleId)
    ? schedules[scheduleId]
    : null;
}

export async function concurrencyLockHeld(sb: SbClient, scheduleId: string): Promise<boolean> {
  const { data, error } = await sb
    .from("scheduled_runs")
    .select("id")
    .eq("schedule_id", scheduleId)
    .in("state", ["pending", "running"])
    .limit(1);
  if (error) throw new Error(`lock check failed: ${error.message}`);
  return Array.isArray(data) && data.length > 0;
}

export async function checkSkipConditions(
  _schedule: ScheduleEntry,
): Promise<{ skip: boolean; reason?: string }> {
  // [WAVE 2 EXT] Read ops.settings for founder_vacation_mode, maintenance_window, etc.
  return { skip: false };
}

export async function checkHitlGate(
  _schedule: ScheduleEntry,
): Promise<{ requires_approval: boolean }> {
  // [WAVE 2 EXT] Tier C+ → enqueue ops.hitl_runs pending_approval.
  return { requires_approval: false };
}

export async function checkBudget(
  _schedule: ScheduleEntry,
): Promise<{ ok: boolean; reason?: string }> {
  // [WAVE 2 EXT] Bài #7 pre-llm-call-budget hook.
  return { ok: true };
}

export async function insertScheduledRun(
  sb: SbClient,
  schedule: ScheduleEntry,
  triggeredAt: string,
): Promise<{ id: string }> {
  // Column names match supabase/migrations/00003_schedules_sops.sql:
  //   scheduled_at | fired_at | schedule_id | cron_expression | state | state_since | triggered_skill
  const { data, error } = await sb
    .from("scheduled_runs")
    .insert({
      schedule_id: schedule.id,
      scheduled_at: triggeredAt,
      fired_at: triggeredAt,
      cron_expression: schedule.cron,
      triggered_skill: schedule.skill,
      state: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert failed: ${error.message}`);
  return { id: data.id as string };
}

export interface DispatchDeps {
  sb: SbClient;
  schedules: Record<string, ScheduleEntry>;
  dispatcherSecret: string;
  now?: () => string; // override in tests for deterministic timestamps
  // Optional pre-flight gate overrides. Default to the module-level stubs
  // (always-pass) when undefined. Tests inject implementations to exercise
  // skip/hitl/budget branches; production wiring will inject the real
  // ops.settings / hitl_runs / budget-hook implementations as they land.
  checkSkipConditions?: typeof checkSkipConditions;
  checkHitlGate?: typeof checkHitlGate;
  checkBudget?: typeof checkBudget;
}

export interface DispatchHttpResponse {
  status: number;
  body: unknown;
}

export async function processDispatchRequest(
  deps: DispatchDeps,
  method: string,
  authHeader: string | null | undefined,
  body: unknown,
): Promise<DispatchHttpResponse> {
  if (method !== "POST") return { status: 405, body: "method" };

  if (!verifyAuthHeader(authHeader, deps.dispatcherSecret)) {
    return { status: 401, body: { error: "auth" } };
  }

  const parsed = parseDispatchRequest(body);
  if (!parsed) return { status: 400, body: { error: "bad_json" } };

  const schedule = lookupSchedule(deps.schedules, parsed.schedule_id);
  if (!schedule) {
    return {
      status: 404,
      body: { error: "unknown_schedule", schedule_id: parsed.schedule_id },
    };
  }

  const triggeredAt = parsed.triggered_at ?? (deps.now ? deps.now() : new Date().toISOString());

  if (await concurrencyLockHeld(deps.sb, schedule.id)) {
    return { status: 200, body: { status: "skipped", reason: "concurrency_lock" } };
  }

  const skip = await (deps.checkSkipConditions ?? checkSkipConditions)(schedule);
  if (skip.skip) {
    return {
      status: 200,
      body: { status: "skipped", reason: skip.reason ?? "skip_condition" },
    };
  }

  const hitl = await (deps.checkHitlGate ?? checkHitlGate)(schedule);
  if (hitl.requires_approval) {
    return { status: 202, body: { status: "queued_for_approval" } };
  }

  const budget = await (deps.checkBudget ?? checkBudget)(schedule);
  if (!budget.ok) {
    return {
      status: 200,
      body: { status: "blocked", reason: budget.reason ?? "budget" },
    };
  }

  try {
    const run = await insertScheduledRun(deps.sb, schedule, triggeredAt);
    return {
      status: 200,
      body: { status: "queued", run_id: run.id, schedule_id: schedule.id },
    };
  } catch (e) {
    return {
      status: 500,
      body: { error: "insert_failed", detail: String(e) },
    };
  }
}
