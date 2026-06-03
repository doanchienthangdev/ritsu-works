/**
 * Shared types for the supabase-analytics MCP.
 *
 * This server is intentionally NARROW: read-only SELECT over the pseudonymized
 * `live.*` surface of ritsu-analytics, as the least-priv `analytics_reader`
 * Postgres role. It never writes, never reaches Product, never touches raw PII.
 */

/** HITL tiers from governance/HITL.md (kept for audit parity with supabase-ops). */
export type HitlTier = "A" | "B" | "C" | "D-Std" | "D-MAX";

/**
 * Caller resolved from env (MCP_CALLER_ROLE / MCP_CALLER_SESSION_ID), plus the
 * analytics-allowlist decision. The analytics MCP does NOT carry per-schema read
 * scopes (the DB role does that) — it only needs "may this role use analytics?".
 */
export interface AnalyticsCallerContext {
  role: string;
  sessionId: string;
  /** Whether `role` is on the analytics consumer allowlist (governance/ROLES.md brain_affinity analog). */
  allowedAnalytics: boolean;
}

/**
 * The DB abstraction handlers depend on — NOT the pg Pool directly. This is what
 * makes the handlers unit-testable at the repo root without `pg` installed:
 * tests inject a fake querier; the real one (lib/pg-client.ts) wraps a pg Pool
 * connected as analytics_reader.
 */
export interface AnalyticsQuerier {
  /** Run a read-only SELECT. Returns rows + the server-reported rowCount. */
  query(sql: string, params: unknown[]): Promise<{ rows: unknown[]; rowCount: number }>;
}

/** Uniform handler result — drives the MCP response + (future) audit. */
export interface ToolResult {
  state: "completed" | "failed" | "denied";
  output: unknown;
  errorCode?: string;
  errorDetail?: string;
  resultSummary?: Record<string, unknown>;
}

/** Errors thrown by handlers; the dispatcher converts them to ToolResult. */
export class MCPToolError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly state: "failed" | "denied" = "failed",
  ) {
    super(message);
    this.name = "MCPToolError";
  }
}
