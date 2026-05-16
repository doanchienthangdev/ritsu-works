/**
 * Resolves caller role (from env) → permissions snapshot needed by the shim.
 *
 * Source of truth: governance/ROLES.md. This file maintains a minimal in-code
 * mirror of role read/write scopes — only the fields the shim's per-call guards
 * consume. Drift from governance/ROLES.md is caught by
 * scripts/cross-tier/validate-governance-roles.cjs (TODO: extend it to also
 * cross-check this table when MCP work lands in main).
 *
 * Why in-code instead of parsing the markdown:
 * - Predictable: TypeScript types catch typos at compile time
 * - Fast: no IO at startup beyond env.ts
 * - Easy to test: just import and assert
 *
 * Cost: every governance/ROLES.md change requires a parallel update here, OR
 * the validator script flags drift. That's acceptable — role definitions
 * change rarely (Tier C PR ceremony anyway).
 */

import type { KnownRole } from "../lib/env.ts";
import type { CallerContext, HitlTier } from "../types.ts";

interface RoleSpec {
  hitlMaxTier: HitlTier;
  tier2SchemasRead: string[];
  /**
   * Fully-qualified table names this role may INSERT to. Use wildcards sparingly.
   * Format: 'schema.table' or 'schema.*' (whole-schema write).
   */
  tier2SchemasWrite: string[];
}

/**
 * Role registry mirroring governance/ROLES.md.
 *
 * Phase 1 includes the permissions of roles ACTUALLY referenced by the 7
 * production skills + founder/cofounder for ad-hoc use. Other roles default
 * to gps-like permissions when first invoked (and the validator script will
 * flag the drift to be filled in explicitly).
 */
const ROLE_REGISTRY: Partial<Record<KnownRole, RoleSpec>> = {
  founder: {
    hitlMaxTier: "D-MAX",
    tier2SchemasRead: ["ops.*", "metrics.*", "public.*"],
    tier2SchemasWrite: ["ops.*", "metrics.*", "public.*"],
  },
  cofounder: {
    hitlMaxTier: "D-MAX",
    tier2SchemasRead: ["ops.*", "metrics.*", "public.*"],
    tier2SchemasWrite: ["ops.*", "metrics.*", "public.*"],
  },
  gps: {
    hitlMaxTier: "C",
    tier2SchemasRead: ["ops.*", "metrics.*"],
    tier2SchemasWrite: ["ops.tasks", "ops.agent_runs", "ops.run_summaries", "ops.mcp_calls"],
  },
  "growth-orchestrator": {
    hitlMaxTier: "C",
    tier2SchemasRead: ["ops.*", "metrics.*"],
    tier2SchemasWrite: [
      "ops.campaigns",
      "ops.tasks",
      "ops.agent_runs",
      "ops.mcp_calls",
    ],
  },
  "support-agent": {
    hitlMaxTier: "C",
    tier2SchemasRead: ["metrics.product_dau_snapshot", "ops.*"],
    tier2SchemasWrite: ["ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "content-drafter": {
    hitlMaxTier: "A",
    tier2SchemasRead: ["metrics.product_dau_snapshot", "ops.agent_runs", "ops.run_summaries"],
    tier2SchemasWrite: ["ops.agent_runs", "ops.run_summaries", "ops.mcp_calls"],
  },
  "code-reviewer": {
    hitlMaxTier: "B",
    tier2SchemasRead: ["ops.agent_runs", "ops.run_summaries"],
    tier2SchemasWrite: ["ops.agent_runs", "ops.mcp_calls"],
  },
  "etl-runner": {
    hitlMaxTier: "B",
    tier2SchemasRead: ["ops.*"],
    tier2SchemasWrite: ["metrics.*", "ops.agent_runs", "ops.tier3_index", "ops.mcp_calls"],
  },
  "trust-safety": {
    hitlMaxTier: "C",
    tier2SchemasRead: ["ops.*", "metrics.*"],
    tier2SchemasWrite: ["ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "backoffice-clerk": {
    hitlMaxTier: "C",
    tier2SchemasRead: ["ops.*"],
    tier2SchemasWrite: ["ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "gtm-orchestrator": {
    hitlMaxTier: "C",
    tier2SchemasRead: ["ops.*", "metrics.*"],
    tier2SchemasWrite: ["ops.campaigns", "ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "product-orchestrator": {
    hitlMaxTier: "C",
    tier2SchemasRead: ["ops.*", "metrics.product_dau_snapshot"],
    tier2SchemasWrite: ["ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "customer-lead": {
    hitlMaxTier: "C",
    tier2SchemasRead: ["ops.*", "metrics.product_dau_snapshot", "public.mv_customer_360", "public.customers"],
    tier2SchemasWrite: ["ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "cs-coach": {
    hitlMaxTier: "B",
    tier2SchemasRead: ["ops.*", "metrics.product_dau_snapshot"],
    tier2SchemasWrite: ["ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "retention-watcher": {
    hitlMaxTier: "B",
    tier2SchemasRead: ["ops.*", "metrics.product_dau_snapshot"],
    tier2SchemasWrite: ["ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "escalation-router": {
    hitlMaxTier: "A",
    tier2SchemasRead: ["ops.*"],
    tier2SchemasWrite: ["ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "feedback-aggregator": {
    hitlMaxTier: "A",
    tier2SchemasRead: ["ops.*"],
    tier2SchemasWrite: ["ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "founder-coach": {
    hitlMaxTier: "A",
    tier2SchemasRead: ["ops.*", "ops.attention_log"],
    tier2SchemasWrite: ["ops.attention_log", "ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "hitl-router": {
    hitlMaxTier: "A",
    tier2SchemasRead: ["ops.*"],
    tier2SchemasWrite: ["ops.hitl_runs", "ops.agent_runs", "ops.mcp_calls"],
  },
  "health-tracker": {
    hitlMaxTier: "A",
    tier2SchemasRead: ["ops.*", "ops.attention_log"],
    tier2SchemasWrite: ["ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "metrics-curator": {
    hitlMaxTier: "B",
    tier2SchemasRead: ["ops.*", "metrics.*"],
    tier2SchemasWrite: ["ops.kpi_snapshots", "ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
  "alert-router": {
    hitlMaxTier: "A",
    tier2SchemasRead: ["ops.alerts", "ops.kpi_snapshots"],
    tier2SchemasWrite: ["ops.alerts", "ops.agent_runs", "ops.mcp_calls"],
  },
  "experiment-analyst": {
    hitlMaxTier: "B",
    tier2SchemasRead: ["ops.*", "metrics.*"],
    tier2SchemasWrite: ["ops.tasks", "ops.agent_runs", "ops.mcp_calls"],
  },
};

export class UnknownRoleError extends Error {
  constructor(role: string) {
    super(
      `UnknownRole: "${role}" has no entry in role-resolver. ` +
        `Add it to ROLE_REGISTRY mirroring governance/ROLES.md.`,
    );
    this.name = "UnknownRoleError";
  }
}

export function resolveRole(role: KnownRole, sessionId: string): CallerContext {
  const spec = ROLE_REGISTRY[role];
  if (!spec) throw new UnknownRoleError(role);
  return {
    role,
    sessionId,
    hitlMaxTier: spec.hitlMaxTier,
    tier2SchemasRead: spec.tier2SchemasRead,
    tier2SchemasWrite: spec.tier2SchemasWrite,
  };
}

/**
 * Does this caller's read scope include `schema` (e.g. 'ops', 'metrics')?
 *
 * "ops.*" matches "ops" + anything. "ops.tasks" matches only schema='ops' + table check elsewhere.
 */
export function canReadSchema(ctx: CallerContext, schema: string): boolean {
  return ctx.tier2SchemasRead.some((s) => s === `${schema}.*` || s.startsWith(`${schema}.`));
}

/**
 * May this caller INSERT into a fully-qualified table like 'ops.tasks'?
 *
 * Matches:
 * - Exact match: 'ops.tasks' in scope
 * - Wildcard schema: 'ops.*' covers all ops.* tables
 */
export function canWriteTable(ctx: CallerContext, fqTable: string): boolean {
  const dotIdx = fqTable.indexOf(".");
  if (dotIdx === -1) return false;
  const schema = fqTable.slice(0, dotIdx);
  return ctx.tier2SchemasWrite.some(
    (s) => s === fqTable || s === `${schema}.*`,
  );
}
