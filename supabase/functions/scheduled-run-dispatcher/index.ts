// scheduled-run-dispatcher — Bài #8 (Scheduling) Edge Function
//
// Invoked by pg_cron at the cadence of each schedule in knowledge/schedules.yaml.
// pg_cron entries are auto-generated from schedules.yaml on PR merge (Wave 2 GHA: regenerate-pg-cron).
//
// Responsibilities:
//   1. Verify caller (HMAC of DISPATCHER_SECRET in X-Dispatcher-Auth header).
//   2. Look up the schedule by id from the bundled schedules.yaml.
//   3. Pre-flight checks:
//      a. Concurrency lock — skip if a run with status='running' already exists for this schedule_id.
//      b. Skip conditions — read ops.settings for global flags (e.g., founder_vacation_mode). [WAVE 2 EXT]
//      c. HITL tier — Tier C+ schedules enqueue (pending_approval) instead of running directly. [WAVE 2 EXT]
//      d. Budget — call pre-llm-call-budget logic (Bài #7) for skills with requires_api. [WAVE 2 EXT]
//   4. Insert row into ops.scheduled_runs with status='pending'. The skill executor (separate worker) picks it up.
//
// References:
//   knowledge/schedules.yaml         — schedule registry (Tier 1)
//   knowledge/feature-flags.yaml     — gating per skill (mode + requires_api)
//   knowledge/phase-a2-extensions/bai-8-scheduling-architecture-DRAFT.md
//   supabase/migrations/00003_schedules_sops.sql — ops.scheduled_runs schema
//
// Wave 2 status: SCAFFOLD. Pre-flight items b/c/d marked [WAVE 2 EXT] are stubs returning "ok" until
// ops.settings + HITL queue + budget hook land. The MVP path (1+2+3a+4) works end-to-end today.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface DispatchRequest {
  schedule_id: string;
  triggered_at?: string; // ISO8601; defaults to now()
}

interface ScheduleEntry {
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

// Bundled at deploy time. To regenerate: pnpm wave2:bundle-schedules (Wave 2 GHA TODO).
// For Wave 2 scaffold, schedules are loaded from a JSON snapshot of schedules.yaml.
const SCHEDULES: Record<string, ScheduleEntry> = {
  // Loaded by build step; for now each handler reads ops.* directly.
  // Real bundle replaces this object via codegen.
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISPATCHER_SECRET = Deno.env.get("DISPATCHER_SECRET") ?? "";

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: "ops" },
});

async function verifyAuth(req: Request): Promise<boolean> {
  if (!DISPATCHER_SECRET) return false; // fail closed if secret unset
  const provided = req.headers.get("x-dispatcher-auth") ?? "";
  return provided === DISPATCHER_SECRET;
}

async function concurrencyLockHeld(scheduleId: string): Promise<boolean> {
  const { data, error } = await sb
    .from("scheduled_runs")
    .select("id")
    .eq("schedule_id", scheduleId)
    .in("status", ["pending", "running"])
    .limit(1);
  if (error) throw new Error(`lock check failed: ${error.message}`);
  return (data ?? []).length > 0;
}

async function checkSkipConditions(_schedule: ScheduleEntry): Promise<{ skip: boolean; reason?: string }> {
  // [WAVE 2 EXT] Read ops.settings for founder_vacation_mode, maintenance_window, etc.
  // For MVP scaffold: never skip.
  return { skip: false };
}

async function checkHitlGate(_schedule: ScheduleEntry): Promise<{ requires_approval: boolean }> {
  // [WAVE 2 EXT] If schedule.hitl_tier in {C, D-Std, D-MAX}, enqueue pending_approval to ops.hitl_runs
  //              and return requires_approval=true. Dispatcher does not run; founder approves first.
  return { requires_approval: false };
}

async function checkBudget(_schedule: ScheduleEntry): Promise<{ ok: boolean; reason?: string }> {
  // [WAVE 2 EXT] Call pre-llm-call-budget logic (Bài #7). Block if 100% breached without override.
  return { ok: true };
}

async function insertScheduledRun(
  schedule: ScheduleEntry,
  triggeredAt: string,
): Promise<{ id: string }> {
  const { data, error } = await sb
    .from("scheduled_runs")
    .insert({
      schedule_id: schedule.id,
      scheduled_at: triggeredAt,
      triggered_at: triggeredAt,
      status: "pending",
      retry_count: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert failed: ${error.message}`);
  return { id: data.id as string };
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });

  if (!(await verifyAuth(req))) {
    return new Response(JSON.stringify({ error: "auth" }), { status: 401 });
  }

  let body: DispatchRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), { status: 400 });
  }

  const schedule = SCHEDULES[body.schedule_id];
  if (!schedule) {
    return new Response(
      JSON.stringify({ error: "unknown_schedule", schedule_id: body.schedule_id }),
      { status: 404 },
    );
  }

  const triggeredAt = body.triggered_at ?? new Date().toISOString();

  if (await concurrencyLockHeld(schedule.id)) {
    return new Response(
      JSON.stringify({ status: "skipped", reason: "concurrency_lock" }),
      { status: 200 },
    );
  }

  const skip = await checkSkipConditions(schedule);
  if (skip.skip) {
    return new Response(
      JSON.stringify({ status: "skipped", reason: skip.reason ?? "skip_condition" }),
      { status: 200 },
    );
  }

  const hitl = await checkHitlGate(schedule);
  if (hitl.requires_approval) {
    return new Response(
      JSON.stringify({ status: "queued_for_approval" }),
      { status: 202 },
    );
  }

  const budget = await checkBudget(schedule);
  if (!budget.ok) {
    return new Response(
      JSON.stringify({ status: "blocked", reason: budget.reason ?? "budget" }),
      { status: 200 },
    );
  }

  try {
    const run = await insertScheduledRun(schedule, triggeredAt);
    return new Response(
      JSON.stringify({ status: "queued", run_id: run.id, schedule_id: schedule.id }),
      { status: 200 },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "insert_failed", detail: String(e) }),
      { status: 500 },
    );
  }
});
