// minion-worker — Bài #5 Minions queue worker
//
// Polls `ops.scheduled_runs` (and later `ops.minion_jobs` for ad-hoc tasks),
// claims one pending row, invokes the resolved skill, marks the row completed/failed.
//
// Triggered by pg_cron every ~1 minute. Each invocation processes at most BATCH_SIZE
// rows so the function stays well under the 60s wall-clock limit.
//
// Responsibilities (Wave 2 MVP):
//   1. Verify caller (X-Worker-Auth: WORKER_SECRET).
//   2. Claim oldest pending run via UPDATE ... WHERE state='pending' RETURNING id.
//      Postgres MVCC + UPDATE prevents two workers grabbing the same row.
//   3. Resolve `triggered_skill` → look up handler in SKILL_REGISTRY.
//   4. Execute handler. For Wave 2 scaffold, two handlers exist:
//        - "heartbeat-ping" — no-LLM; inserts an audit_log row.
//        - default        — stub that records "skipped: no_handler" until LLM skills land.
//   5. Mark row completed / failed and write output_payload.
//
// References:
//   knowledge/feature-flags.yaml — gating per skill (mode + requires_api).
//   supabase/migrations/00003_schedules_sops.sql — ops.scheduled_runs schema.
//   notes/wave-2-implementation-plan.md — overall Wave 2 state machine.
//
// Wave 2 status: SCAFFOLD. Heartbeat handler works end-to-end. LLM-backed skill
// dispatch (`requires_api: anthropic`) returns "deferred_no_api_key" until
// runtime/secrets/.env.local has ANTHROPIC_API_KEY and the harness loads it.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = Deno.env.get("WORKER_SECRET") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const BATCH_SIZE = 5;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: "ops" },
});

interface ScheduledRun {
  id: string;
  schedule_id: string;
  triggered_skill: string | null;
  fired_at: string;
}

type SkillResult =
  | { ok: true; output: Record<string, unknown> }
  | { ok: false; error: string; retryable?: boolean };

// SKILL_REGISTRY maps skill name → handler. Wave 2 has just heartbeat-ping;
// real skills (synthesize-morning-brief, etc.) wired here as they land.
const SKILL_REGISTRY: Record<string, (run: ScheduledRun) => Promise<SkillResult>> = {
  "heartbeat-ping": async (run) => {
    const { error } = await sb.from("audit_log").insert({
      actor_kind: "system",
      actor_id: "minion-worker",
      action: "heartbeat",
      target_kind: "scheduled_run",
      target_id: run.id,
      payload: { schedule_id: run.schedule_id, fired_at: run.fired_at },
    });
    if (error) return { ok: false, error: `audit_log insert: ${error.message}`, retryable: true };
    return { ok: true, output: { kind: "heartbeat", schedule_id: run.schedule_id } };
  },
};

async function verifyAuth(req: Request): Promise<boolean> {
  if (!WORKER_SECRET) return false;
  return (req.headers.get("x-worker-auth") ?? "") === WORKER_SECRET;
}

async function claimNextRun(): Promise<ScheduledRun | null> {
  // Atomic claim: one round-trip UPDATE that picks the oldest pending and flips state to 'running'.
  // Two concurrent workers can race here; the second sees state='running' and the .eq filter rejects.
  // Postgres' SERIALIZABLE-style guarantees on UPDATE keep this safe.
  const { data: candidates, error: pickErr } = await sb
    .from("scheduled_runs")
    .select("id,schedule_id,triggered_skill,fired_at")
    .eq("state", "pending")
    .order("fired_at", { ascending: true })
    .limit(1);
  if (pickErr) throw new Error(`pick failed: ${pickErr.message}`);
  if (!candidates || candidates.length === 0) return null;

  const candidate = candidates[0] as ScheduledRun;
  const { data: claimed, error: claimErr } = await sb
    .from("scheduled_runs")
    .update({ state: "running", state_since: new Date().toISOString() })
    .eq("id", candidate.id)
    .eq("state", "pending")
    .select("id,schedule_id,triggered_skill,fired_at")
    .maybeSingle();
  if (claimErr) throw new Error(`claim failed: ${claimErr.message}`);
  return (claimed as ScheduledRun | null) ?? null;
}

async function executeRun(run: ScheduledRun): Promise<SkillResult> {
  const skillName = run.triggered_skill ?? "";
  if (!skillName) return { ok: false, error: "no_skill", retryable: false };
  const handler = SKILL_REGISTRY[skillName];
  if (!handler) {
    // [WAVE 2 EXT] Look up feature-flags.yaml + dispatch to LLM. For now: defer.
    if (!ANTHROPIC_API_KEY) {
      return {
        ok: false,
        error: `deferred_no_api_key: skill "${skillName}" requires ANTHROPIC_API_KEY (Hybrid mode)`,
        retryable: false,
      };
    }
    return { ok: false, error: `no_handler_registered: ${skillName}`, retryable: false };
  }
  return await handler(run);
}

async function finalizeRun(runId: string, result: SkillResult): Promise<void> {
  const update = result.ok
    ? { state: "completed", state_since: new Date().toISOString(), output_payload: result.output, error: null }
    : { state: "failed", state_since: new Date().toISOString(), error: result.error };
  const { error } = await sb.from("scheduled_runs").update(update).eq("id", runId);
  if (error) throw new Error(`finalize failed: ${error.message}`);
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  if (!(await verifyAuth(req))) return new Response(JSON.stringify({ error: "auth" }), { status: 401 });

  const processed: { id: string; schedule_id: string; status: string }[] = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    let run: ScheduledRun | null;
    try {
      run = await claimNextRun();
    } catch (e) {
      return new Response(JSON.stringify({ error: "claim", detail: String(e), processed }), { status: 500 });
    }
    if (!run) break; // queue empty
    let result: SkillResult;
    try {
      result = await executeRun(run);
    } catch (e) {
      result = { ok: false, error: `exception: ${String(e)}`, retryable: true };
    }
    try {
      await finalizeRun(run.id, result);
    } catch (e) {
      return new Response(JSON.stringify({ error: "finalize", detail: String(e), processed }), { status: 500 });
    }
    processed.push({
      id: run.id,
      schedule_id: run.schedule_id,
      status: result.ok ? "completed" : "failed",
    });
  }

  return new Response(
    JSON.stringify({ status: "ok", processed_count: processed.length, processed }),
    { status: 200 },
  );
});
