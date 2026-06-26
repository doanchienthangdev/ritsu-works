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

/**
 * Per-human (capability multi-user-auth, Sprint 2) tier gate. In per-human mode
 * the analytics MCP gates by the operator's VERIFIED tier, not the self-asserted
 * agent role. Per knowledge/operator-tiers.yaml: owner + admin have analytics
 * read; user has none. Fail-closed: a null/unknown tier is denied.
 *
 *   owner → allowed   admin → allowed   user → denied   null → denied
 */
export const ANALYTICS_ALLOWED_TIERS: ReadonlySet<string> = new Set(["owner", "admin"]);

export function isTierAllowedAnalytics(tier: string | null | undefined): boolean {
  return tier != null && ANALYTICS_ALLOWED_TIERS.has(tier);
}

/**
 * The denial reason for a caller that may not use analytics — mode-aware so the
 * message + error code reflect WHY (service-key: role not allowlisted; per-human:
 * tier too low). Used by every tool handler's allow gate.
 */
export function analyticsDenialReason(ctx: {
  authMode?: "service-key" | "per-human";
  role: string;
  tier?: "owner" | "admin" | "user" | null;
}): { code: string; detail: string } {
  if (ctx.authMode === "per-human") {
    return {
      code: "tier_not_allowed",
      detail:
        `Operator tier "${ctx.tier ?? "unknown"}" may not use analytics (owner/admin only). ` +
        `See knowledge/operator-tiers.yaml.`,
    };
  }
  return {
    code: "role_not_allowed",
    detail: `Role "${ctx.role}" is not on the analytics consumer allowlist. See governance/ROLES.md.`,
  };
}
