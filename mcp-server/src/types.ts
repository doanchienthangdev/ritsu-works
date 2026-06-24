/**
 * Shared types for supabase-ops MCP shim.
 */

import type { AuthMode, KnownRole } from "./lib/env.ts";

/**
 * HITL tiers from governance/HITL.md.
 * Ordered by escalation: A (autonomous) < B (notify-after) < C (approve-before) < D-Std < D-MAX.
 */
export type HitlTier = "A" | "B" | "C" | "D-Std" | "D-MAX";

/**
 * Per-human authority tiers (capability multi-user-auth). The authority in
 * per-human mode comes from the server-issued Supabase Auth JWT claim
 * app_metadata.tier — never from MCP_CALLER_ROLE. Hierarchical: owner ⊇ admin ⊇ user.
 */
export type OperatorTier = "owner" | "admin" | "user";

export const TIER_RANK: Record<HitlTier, number> = {
  A: 0,
  B: 1,
  C: 2,
  "D-Std": 3,
  "D-MAX": 4,
};

/**
 * Result of resolving a caller from env → role permissions.
 * Subset of governance/ROLES.md fields the shim needs at runtime.
 */
export interface CallerContext {
  /**
   * The authority principal. In service-key mode this is the (self-asserted)
   * MCP_CALLER_ROLE; in per-human mode it is the verified JWT tier
   * (owner|admin|user) — the DB RLS is the real backstop either way.
   */
  role: KnownRole | OperatorTier;
  sessionId: string;
  /** Maximum tier this role is allowed to attempt. */
  hitlMaxTier: HitlTier;
  /** Schemas this role may SELECT from (Tier 2 read scope). */
  tier2SchemasRead: string[];
  /** Tables (fully-qualified) this role may INSERT into. */
  tier2SchemasWrite: string[];
  /**
   * Which authority model produced this context. Default 'service-key' (current
   * behavior). When 'per-human', reads route through the SECURITY INVOKER RPC so
   * per-tier RLS enforces, and audit attributes the human principal below.
   */
  authMode: AuthMode;
  /** Verified human email (per-human mode only) — for server-side audit attribution. */
  humanEmail?: string | null;
  /** Verified Supabase Auth sub/uuid (per-human mode only). */
  humanSub?: string | null;
}

/**
 * Result returned by tool handlers — uniform shape so audit + dispatch work the same.
 */
export interface ToolResult {
  /** Final state — drives ops.mcp_calls.state */
  state: "completed" | "failed" | "denied";
  /** Output to return to MCP client */
  output: unknown;
  /** Error code if failed/denied */
  errorCode?: string;
  /** Free-text error detail */
  errorDetail?: string;
  /** Result summary for audit log (small, jsonable) */
  resultSummary?: Record<string, unknown>;
}

/**
 * Errors thrown by tool handlers. Caught by dispatcher and converted to ToolResult.
 * Defining named classes lets tests assert exact failure modes.
 */
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
