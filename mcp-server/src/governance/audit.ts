/**
 * Audit writer — fire-and-forget INSERT into ops.mcp_calls.
 *
 * Phase 1 audit-fail-open: if the audit insert fails (DB down, network blip),
 * the tool call still succeeds. The failure is logged to stderr but never
 * propagates to the caller. This is a deliberate trade — we'd rather keep
 * MCP up than make every tool call dependent on a healthy ops.mcp_calls write.
 *
 * Phase 2 may add a fallback file log so audit is recoverable across DB outages.
 *
 * Schema reference: supabase/migrations/00004_visibility_mcp.sql
 * Columns: id, called_at, completed_at, tool_id, caller_kind, caller_id,
 *          caller_role, input_payload, output_payload, role_check_passed,
 *          hitl_required, hitl_run_id, state, state_since, error
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallerContext, HitlTier, ToolResult } from "../types.ts";
import type { ProjectRefViolationError } from "./project-ref-guard.ts";

interface AuditEntry {
  toolId: string;
  callerCtx: CallerContext;
  input: unknown;
  result: ToolResult;
  startedAt: Date;
  completedAt: Date;
  requiredTier: string;
}

/**
 * Patterns that should NEVER appear in audit input_payload. If matched, the value
 * is replaced with "[REDACTED]" before insert.
 *
 * Defense vs. agent accidentally passing a secret as a query parameter.
 */
const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{20,}/, // OpenAI-style
  /sk_(live|test)_[A-Za-z0-9]{20,}/, // Stripe
  /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, // JWT
  /service_role[:=]\s*[A-Za-z0-9_.-]+/i,
  /SUPABASE_(SERVICE|ANON)_KEY[:=]\s*[A-Za-z0-9_.-]+/i,
  /Bearer [A-Za-z0-9._-]{20,}/i,
];

export function redactSecrets(value: unknown): unknown {
  if (typeof value === "string") {
    let s = value;
    for (const pat of SECRET_PATTERNS) {
      s = s.replace(pat, "[REDACTED]");
    }
    return s;
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactSecrets(v);
    }
    return out;
  }
  return value;
}

function tierToHitlRequired(tier: HitlTier | string): boolean {
  // Phase 1: B+ triggers `hitl_required=true` in audit, even though we don't
  // yet escalate via Telegram. This makes the audit row useful for retroactive
  // analysis.
  return tier === "B" || tier === "C" || tier === "D-Std" || tier === "D-MAX";
}

/**
 * Write a single audit row.
 *
 * Always returns. Throws ONLY if the supabase-js call itself blows up
 * synchronously (very rare); async failures are reflected in `error.message`
 * and the caller (server.ts) catches with `.catch()` to log stderr.
 */
export async function writeAudit(client: SupabaseClient, entry: AuditEntry): Promise<void> {
  const row = {
    called_at: entry.startedAt.toISOString(),
    completed_at: entry.completedAt.toISOString(),
    tool_id: entry.toolId,
    caller_kind: "claude_code",
    caller_id: entry.callerCtx.sessionId,
    caller_role: entry.callerCtx.role,
    input_payload: redactSecrets(entry.input),
    output_payload: entry.result.resultSummary
      ? (redactSecrets(entry.result.resultSummary) as Record<string, unknown>)
      : null,
    role_check_passed: entry.result.state !== "denied",
    hitl_required: tierToHitlRequired(entry.requiredTier),
    state: entry.result.state, // 'completed' | 'failed' | 'denied'
    error: entry.result.errorDetail ?? null,
  };

  // supabase-js v2: .schema('ops').from('mcp_calls') is the correct pattern.
  // Passing 'ops.mcp_calls' as a single string makes PostgREST search for a
  // table literally named "ops.mcp_calls" in the public schema, which fails.
  const { error } = await client.schema("ops").from("mcp_calls" as never).insert(row);
  if (error) {
    // Throw so the caller (.catch in server.ts) can log to stderr.
    // We do NOT throw from inside the tool call path — server.ts wraps this
    // call in .catch() to enforce fail-open semantics.
    throw new Error(`mcp_calls insert failed: ${error.message}`);
  }
}

/**
 * Write a P0/critical alert to ops.alerts when a project-ref violation occurs.
 *
 * Severity is 'critical' (per ops.alerts CHECK constraint: info|warning|critical).
 * Best-effort like audit — failures logged but not propagated.
 */
export async function writeProjectRefAlert(
  client: SupabaseClient,
  ctx: CallerContext,
  toolId: string,
  err: ProjectRefViolationError,
): Promise<void> {
  const { error } = await client.schema("ops").from("alerts" as never).insert({
    rule_id: "mcp_project_ref_violation",
    severity: "critical",
    payload: {
      tool_id: toolId,
      caller_role: ctx.role,
      session_id: ctx.sessionId,
      observed_url: err.observedUrl,
      observed_ref: err.observedRef,
      message: err.message,
    },
  });
  if (error) {
    throw new Error(`ops.alerts insert failed: ${error.message}`);
  }
}
