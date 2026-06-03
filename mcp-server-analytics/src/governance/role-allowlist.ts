/**
 * Which ops roles may query the analytics MCP at all.
 *
 * This is the analytics analog of governance/ROLES.md `brain_affinity` — a
 * coarse per-role allow/deny for the whole capability. The DB role
 * (analytics_reader) already guarantees read-only + pseudonymized; this
 * allowlist additionally restricts WHICH workforce roles are permitted to ask
 * questions of product-derived behavioral data at all.
 *
 * Source of truth (Sprint 2 PR): governance/ROLES.md — the analytics_reader
 * MCP consumer set. Mirrored in-code here for a fast, typo-proof boot/per-call
 * check. Drift is caught by the Sprint-2 cross-tier validator.
 *
 * Start set (spec C1): the customer/product/growth orchestrators + feedback +
 * founder/cofounder. Everything else is denied (default-deny).
 */
export const ANALYTICS_ALLOWED_ROLES: ReadonlySet<string> = new Set([
  "founder",
  "cofounder",
  "customer-lead",
  "product-orchestrator",
  "gtm-orchestrator",
  "feedback-aggregator",
]);

export function isRoleAllowedAnalytics(role: string): boolean {
  return ANALYTICS_ALLOWED_ROLES.has(role);
}
