// Pure logic for minion-worker (Bài #5 Minions queue).
// Designed to import cleanly in both Deno and Node — all dependencies injected.
//
// Test target: tests/worker.test.ts

export interface ScheduledRun {
  id: string;
  schedule_id: string;
  triggered_skill: string | null;
  fired_at: string;
}

export type SkillResult =
  | { ok: true; output: Record<string, unknown> }
  | { ok: false; error: string; retryable?: boolean };

export type SkillHandler = (run: ScheduledRun) => Promise<SkillResult>;
export type SkillRegistry = Record<string, SkillHandler>;

export interface SbClient {
  // deno-lint-ignore no-explicit-any
  from(table: string): any;
}

export interface WorkerDeps {
  sb: SbClient;
  registry: SkillRegistry;
  workerSecret: string;
  anthropicApiKey?: string;
  batchSize?: number;
  now?: () => string;
}

export function verifyAuthHeader(
  provided: string | null | undefined,
  expected: string,
): boolean {
  if (!expected) return false;
  return (provided ?? "") === expected;
}

export async function claimNextRun(sb: SbClient): Promise<ScheduledRun | null> {
  // Two-step atomic claim. Two parallel workers may both SELECT the same id;
  // the second's UPDATE filters by `state='pending'` so only one wins.
  const { data: candidates, error: pickErr } = await sb
    .from("scheduled_runs")
    .select("id,schedule_id,triggered_skill,fired_at")
    .eq("state", "pending")
    .order("fired_at", { ascending: true })
    .limit(1);
  if (pickErr) throw new Error(`pick failed: ${pickErr.message}`);
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

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

export async function executeRun(
  run: ScheduledRun,
  registry: SkillRegistry,
  anthropicApiKey: string,
): Promise<SkillResult> {
  const skillName = run.triggered_skill ?? "";
  if (!skillName) return { ok: false, error: "no_skill", retryable: false };
  // Prototype-safe lookup — direct dict access would resolve `toString`, `constructor`,
  // etc. via Object.prototype and call them as if they were skills.
  const handler = Object.prototype.hasOwnProperty.call(registry, skillName)
    ? registry[skillName]
    : undefined;
  if (!handler) {
    if (!anthropicApiKey) {
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

export async function finalizeRun(
  sb: SbClient,
  runId: string,
  result: SkillResult,
  now: string,
): Promise<void> {
  const update = result.ok
    ? {
        state: "completed",
        state_since: now,
        output_payload: result.output,
        error: null,
      }
    : { state: "failed", state_since: now, error: result.error };
  const { error } = await sb.from("scheduled_runs").update(update).eq("id", runId);
  if (error) throw new Error(`finalize failed: ${error.message}`);
}

// Built-in heartbeat-ping skill — no LLM dependency. Registered in default registry.
export function makeHeartbeatPingHandler(sb: SbClient): SkillHandler {
  return async (run) => {
    const { error } = await sb.from("audit_log").insert({
      actor_kind: "system",
      actor_id: "minion-worker",
      action: "heartbeat",
      target_kind: "scheduled_run",
      target_id: run.id,
      payload: { schedule_id: run.schedule_id, fired_at: run.fired_at },
    });
    if (error) {
      return { ok: false, error: `audit_log insert: ${error.message}`, retryable: true };
    }
    return { ok: true, output: { kind: "heartbeat", schedule_id: run.schedule_id } };
  };
}

export interface WorkerHttpResponse {
  status: number;
  body: unknown;
}

export interface ProcessedRun {
  id: string;
  schedule_id: string;
  status: "completed" | "failed";
}

export async function processWorkerTick(
  deps: WorkerDeps,
  method: string,
  authHeader: string | null | undefined,
): Promise<WorkerHttpResponse> {
  if (method !== "POST") return { status: 405, body: "method" };

  if (!verifyAuthHeader(authHeader, deps.workerSecret)) {
    return { status: 401, body: { error: "auth" } };
  }

  const batchSize = deps.batchSize ?? 5;
  const now = deps.now ?? (() => new Date().toISOString());
  const processed: ProcessedRun[] = [];

  for (let i = 0; i < batchSize; i++) {
    let run: ScheduledRun | null;
    try {
      run = await claimNextRun(deps.sb);
    } catch (e) {
      return {
        status: 500,
        body: { error: "claim", detail: String(e), processed },
      };
    }
    if (!run) break;
    let result: SkillResult;
    try {
      result = await executeRun(run, deps.registry, deps.anthropicApiKey ?? "");
    } catch (e) {
      result = { ok: false, error: `exception: ${String(e)}`, retryable: true };
    }
    try {
      await finalizeRun(deps.sb, run.id, result, now());
    } catch (e) {
      return {
        status: 500,
        body: { error: "finalize", detail: String(e), processed },
      };
    }
    processed.push({
      id: run.id,
      schedule_id: run.schedule_id,
      status: result.ok ? "completed" : "failed",
    });
  }

  return {
    status: 200,
    body: { status: "ok", processed_count: processed.length, processed },
  };
}
