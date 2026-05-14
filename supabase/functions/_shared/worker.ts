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

// === Anthropic-backed skills (Wave 2 Task 3) ================================
// Skills that call Anthropic Messages API. Designed with dependency injection
// so unit tests mock the AnthropicLike contract instead of the real SDK.

export interface AnthropicMessagesCreateParams {
  model: string;
  max_tokens: number;
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export interface AnthropicMessagesResponse {
  id?: string;
  content: Array<{ type: string; text?: string }>;
  model?: string;
  stop_reason?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export interface AnthropicLike {
  messages: {
    create(params: AnthropicMessagesCreateParams): Promise<AnthropicMessagesResponse>;
  };
}

export interface MorningBriefDeps {
  anthropic: AnthropicLike;
  model?: string;
  maxTokens?: number;
}

export const DEFAULT_MORNING_BRIEF_MODEL = "claude-haiku-4-5";
export const DEFAULT_MORNING_BRIEF_MAX_TOKENS = 1024;

export const DEFAULT_MORNING_BRIEF_SYSTEM =
  "You are Ritsu's morning brief assembler. Output exactly 4 plain-text bullets: " +
  "(1) yesterday's headline metric movement, " +
  "(2) today's most important task, " +
  "(3) one risk or blocker, " +
  "(4) one decision needing founder input. " +
  "Keep total under 250 words. No preamble, no closing remarks.";

export function isRetryableAnthropicError(message: string): boolean {
  return /\b5\d\d\b|rate.?limit|timeout|ECONN|EAI_AGAIN/i.test(message);
}

export function extractTextFromContent(
  content: AnthropicMessagesResponse["content"] | undefined,
): string {
  if (!Array.isArray(content)) return "";
  return content
    .filter((c) => c && c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("\n");
}

export function makeSynthesizeMorningBriefHandler(deps: MorningBriefDeps): SkillHandler {
  return async (run) => {
    const model = deps.model ?? DEFAULT_MORNING_BRIEF_MODEL;
    const maxTokens = deps.maxTokens ?? DEFAULT_MORNING_BRIEF_MAX_TOKENS;

    let response: AnthropicMessagesResponse;
    try {
      response = await deps.anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: DEFAULT_MORNING_BRIEF_SYSTEM,
        messages: [
          {
            role: "user",
            content:
              `Generate Ritsu's morning brief for ${run.fired_at}. ` +
              `This is a Wave 2 smoke-test invocation — no real ETL data is ` +
              `wired yet. Produce a placeholder skeleton brief the founder ` +
              `will replace once data sources land in Wave 3.`,
          },
        ],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        error: `anthropic: ${msg}`,
        retryable: isRetryableAnthropicError(msg),
      };
    }

    const text = extractTextFromContent(response.content);

    return {
      ok: true,
      output: {
        kind: "morning_brief",
        model: response.model ?? model,
        message_id: response.id ?? null,
        stop_reason: response.stop_reason ?? null,
        input_tokens: response.usage?.input_tokens ?? 0,
        output_tokens: response.usage?.output_tokens ?? 0,
        text,
      },
    };
  };
}

// Deferred stub handler — registers a placeholder for skills referenced by
// schedules.yaml but not yet implemented. Returns a clear error and a
// not-retryable signal so the audit log records intent but doesn't spam.
// Tracked by the consistency engine (knowledge/cross-tier-invariants.yaml
// invariant: schedules-skills-registered).
export function makeDeferredStubHandler(reason: string): SkillHandler {
  return async (_run) => ({
    ok: false,
    error: `deferred_stub: ${reason}`,
    retryable: false,
  });
}

// ============================================================================
// Cross-Tier Consistency Engine — L3 nightly sweep + executor (v1.0c)
// ============================================================================
//
// The sweep skill fires on schedule (knowledge/schedules.yaml id:
// consistency-sweep-nightly). For each LIVE L3 invariant, it inserts a
// `running` consistency_checks row, executes the invariant via the injected
// executor, transitions the row to `passed` | `failed`, and emits a drift
// event on failure.
//
// v1.0c handles ≤10 invariants inline (well within Edge Function timeout).
// If L3 grows past that, refactor to a minion_jobs queue (per CEO plan).
//
// Dependency injection:
//   - sb           : ops-schema client (writes consistency_checks, ops.events)
//   - executor     : (inv) => Promise<CheckResult> — pluggable, defaults to
//                    live-DB executor that calls ops.get_ops_* RPCs.
//   - invariants   : injectable for tests; defaults to L3_INVARIANTS_LIVE.
// ============================================================================

import {
  executeInvariant,
  getL3Invariants,
  MANIFEST_OPS_TABLES_V1_0C,
  type CheckResult,
  type ExecutorDeps,
  type Invariant,
} from "./invariants.ts";

export type { CheckResult } from "./invariants.ts";

export interface ConsistencySweepDeps {
  sb: SbClient;                                                   // ops client
  executor?: (inv: Invariant) => Promise<CheckResult>;            // override for tests
  invariants?: Invariant[];                                       // override for tests
}

// Default executor — wires Supabase RPC + the v1.0c manifest table list.
export function makeDefaultExecutor(sb: SbClient): (inv: Invariant) => Promise<CheckResult> {
  const deps: ExecutorDeps = {
    callRpc: async (name) => {
      // supabase-js: sb.rpc('get_ops_tables') returns a thenable.
      // deno-lint-ignore no-explicit-any
      const r: any = await (sb as any).rpc(name);
      if (r.error) throw new Error(`rpc ${name} error: ${r.error.message}`);
      return Array.isArray(r.data) ? r.data : [];
    },
    getManifestOpsTables: async () => MANIFEST_OPS_TABLES_V1_0C,
  };
  return (inv) => executeInvariant(inv, deps);
}

export interface SweepSummary {
  kind: "consistency_sweep";
  schedule_id: string;
  invariants_processed: number;
  passed: number;
  failed: number;
  errors: number;
  drift_events_emitted: number;
}

export function makeConsistencySweepHandler(
  deps: ConsistencySweepDeps,
): SkillHandler {
  const executor = deps.executor ?? makeDefaultExecutor(deps.sb);
  return async (run) => {
    const invariants = deps.invariants ?? getL3Invariants();
    if (invariants.length === 0) {
      return {
        ok: true,
        output: {
          kind: "consistency_sweep",
          schedule_id: run.schedule_id,
          invariants_processed: 0,
          passed: 0,
          failed: 0,
          errors: 0,
          drift_events_emitted: 0,
        } satisfies SweepSummary,
      };
    }

    let passed = 0;
    let failed = 0;
    let errors = 0;
    let driftEvents = 0;

    for (const inv of invariants) {
      // 1. Insert running row.
      const { data: inserted, error: insErr } = await deps.sb
        .from("consistency_checks")
        .insert({
          invariant_id: inv.id,
          check_kind: "L3",
          state: "running",
          severity: inv.severity,
          hitl_tier: inv.hitl_tier,
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        errors += 1;
        continue;
      }
      const rowId = (inserted as { id: string }).id;

      // 2. Execute check.
      let result: CheckResult;
      try {
        result = await executor(inv);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result = {
          passed: false,
          drift_description: `executor_threw: ${msg}`,
        };
      }

      // 3. Transition row state.
      const finalState = result.passed ? "passed" : "failed";
      const { error: updErr } = await deps.sb
        .from("consistency_checks")
        .update({
          state: finalState,
          drift_description: result.drift_description ?? null,
          target_path: result.target_path ?? null,
        })
        .eq("id", rowId);
      if (updErr) {
        errors += 1;
        continue;
      }

      if (result.passed) {
        passed += 1;
      } else {
        failed += 1;
        // 4. Emit drift event for warn+critical (info too noisy).
        if (inv.severity !== "info") {
          const { error: evtErr } = await deps.sb.from("events").insert({
            event_type: "consistency.drift_detected",
            source: "internal",
            payload: {
              invariant_id: inv.id,
              severity: inv.severity,
              hitl_tier: inv.hitl_tier,
              check_id: rowId,
              drift_description: result.drift_description,
              target_path: result.target_path,
              evidence: result.evidence,
            },
          });
          if (!evtErr) driftEvents += 1;
        }
      }
    }

    return {
      ok: true,
      output: {
        kind: "consistency_sweep",
        schedule_id: run.schedule_id,
        invariants_processed: invariants.length,
        passed,
        failed,
        errors,
        drift_events_emitted: driftEvents,
      } satisfies SweepSummary,
    };
  };
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

// Shape of one DAU snapshot row returned by Product Supabase's
// `v_ops_dau_export` view (read-only). Product team owns the view definition;
// schema below is the agreed contract for ETL consumption.
export interface ProductDauRow {
  snapshot_at: string;          // ISO timestamp (hour-rounded)
  dau: number;
  wau?: number | null;
  mau?: number | null;
  new_signups_24h?: number | null;
  paid_users?: number | null;
  free_users?: number | null;
  churned_users_24h?: number | null;
  extra?: Record<string, unknown> | null;
}

export interface EtlProductDauDeps {
  // Ops Supabase client (writes to metrics.product_dau_snapshot).
  // The Edge Function passes a client scoped to schema='metrics' for inserts,
  // and a separate `opsSb` scoped to 'ops' for audit/state.
  metricsSb: SbClient;
  opsSb: SbClient;
  // Optional Product Supabase client. When null the handler returns a
  // deferred result — the function ships disabled until the founder
  // provisions SUPABASE_PRODUCT_READONLY_ETL_KEY (D-MAX per HITL.md).
  productSb: SbClient | null;
  // Override for tests; defaults to () => new Date().toISOString().
  now?: () => string;
}

// etl-product-dau-snapshot — pulls one hourly DAU snapshot from Product
// Supabase (view `v_ops_dau_export`) and writes it to
// metrics.product_dau_snapshot. Idempotent on snapshot_at (UNIQUE).
//
// References:
//   knowledge/manifest.yaml etl_flows.product_metrics_to_ops
//   governance/HITL.md (Tier D-MAX for Product Supabase access)
//   knowledge/economic-architecture.md (this is a "minion" task — cheap)
export function makeEtlProductDauSnapshotHandler(
  deps: EtlProductDauDeps,
): SkillHandler {
  return async (run) => {
    // Gate 1: Product Supabase read key not provisioned yet.
    if (deps.productSb === null) {
      return {
        ok: false,
        error: "deferred_no_product_supabase_key",
        retryable: false,
      };
    }

    // Gate 2: pull latest hourly row from product.
    let row: ProductDauRow | null = null;
    try {
      const { data, error } = await deps.productSb
        .from("v_ops_dau_export")
        .select(
          "snapshot_at,dau,wau,mau,new_signups_24h,paid_users,free_users,churned_users_24h,extra",
        )
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        return {
          ok: false,
          error: `product_read: ${error.message}`,
          retryable: true,
        };
      }
      row = (data ?? null) as ProductDauRow | null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: `product_read_throw: ${msg}`, retryable: true };
    }

    if (!row) {
      return {
        ok: false,
        error: "product_view_empty",
        retryable: false,
      };
    }

    // Gate 3: insert into metrics.product_dau_snapshot (idempotent on UNIQUE).
    const insertPayload = {
      snapshot_at: row.snapshot_at,
      dau: row.dau,
      wau: row.wau ?? null,
      mau: row.mau ?? null,
      new_signups_24h: row.new_signups_24h ?? null,
      paid_users: row.paid_users ?? null,
      free_users: row.free_users ?? null,
      churned_users_24h: row.churned_users_24h ?? null,
      extra: row.extra ?? {},
      etl_run_id: run.id,
    };

    const { error: insertErr } = await deps.metricsSb
      .from("product_dau_snapshot")
      .insert(insertPayload);

    if (insertErr) {
      // Postgres unique violation code is "23505" — treat as already-seen
      // snapshot (idempotent success).
      const code = (insertErr as { code?: string }).code;
      if (code === "23505") {
        return {
          ok: true,
          output: {
            kind: "etl_dau_snapshot",
            snapshot_at: row.snapshot_at,
            inserted: false,
            reason: "duplicate_snapshot_at",
          },
        };
      }
      return {
        ok: false,
        error: `metrics_insert: ${insertErr.message}`,
        retryable: true,
      };
    }

    return {
      ok: true,
      output: {
        kind: "etl_dau_snapshot",
        snapshot_at: row.snapshot_at,
        dau: row.dau,
        inserted: true,
      },
    };
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
