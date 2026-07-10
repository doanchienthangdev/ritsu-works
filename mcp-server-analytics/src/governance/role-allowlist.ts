import {
  CREDENTIAL_REMEDIATION,
  describeCredential,
  type CredentialReason,
  type OperatorCredential,
} from "./operator-credential.ts";

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
 * tier too low, or the tier could not be established at all). Used by every tool
 * handler's allow gate.
 *
 * `code` is the coarse, stable wire category (`role_not_allowed` /
 * `tier_not_allowed`); `reason` is the fine, machine-readable discriminator.
 * A per-human denial has exactly one of two shapes:
 *
 *   - a tier WAS decoded but isn't owner/admin  → reason `tier_not_permitted`
 *   - no tier could be established               → reason = the credential fault
 *     (`token_expired`, `credential_file_missing`, `token_no_tier_claim`, …)
 *
 * Before this split, all of the latter collapsed to tier "unknown", which told an
 * operator nothing about whether their token was stale, their file was missing, or
 * their account simply had no tier. Fail-closed posture is unchanged: every branch
 * here is still a denial.
 */
/**
 * Every `reason` a denial can carry. `ok` is deliberately excluded: analyticsDenialReason()
 * guards on `cred.reason !== "ok"` before it ever reaches a denial, so the type now states
 * what the code already guarantees.
 */
export type AnalyticsDenialReason =
  | Exclude<CredentialReason, "ok">
  | "tier_not_permitted"
  | "role_not_allowlisted";

/**
 * Runtime mirror of AnalyticsDenialReason. `knowledge/analytics-sync-contract.yaml`
 * (per_human_tier_gate.denial_reasons) documents this exact set for operators and
 * auditors; test/denial-reasons-contract.test.ts pins the two together, so the yaml's
 * claim to be authoritative is enforced rather than asserted. The AssertEqual below
 * makes TypeScript reject a union member missing here — or an extra one added here.
 */
export const ANALYTICS_DENIAL_REASONS = [
  "no_credential_source",
  "credential_file_missing",
  "credential_file_unreadable",
  "credential_file_no_access_token",
  "token_undecodable",
  "token_no_exp",
  "token_expired",
  "token_no_tier_claim",
  "tier_not_permitted",
  "role_not_allowlisted",
] as const;

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _denialReasonsAreExhaustive: AssertEqual<
  AnalyticsDenialReason,
  (typeof ANALYTICS_DENIAL_REASONS)[number]
> = true;
void _denialReasonsAreExhaustive;

export interface AnalyticsDenial {
  code: "role_not_allowed" | "tier_not_allowed";
  reason: AnalyticsDenialReason;
  detail: string;
  remediation: string;
}

export function analyticsDenialReason(ctx: {
  authMode?: "service-key" | "per-human";
  role: string;
  tier?: "owner" | "admin" | "user" | null;
  credential?: OperatorCredential;
}): AnalyticsDenial {
  if (ctx.authMode !== "per-human") {
    return {
      code: "role_not_allowed",
      reason: "role_not_allowlisted",
      detail: `Role "${ctx.role}" is not on the analytics consumer allowlist. See governance/ROLES.md.`,
      remediation:
        "Set MCP_CALLER_ROLE to one of the analytics consumer roles, or add the role to the " +
        "allowlist in governance/ROLES.md (Tier C) and role-allowlist.ts.",
    };
  }

  // per-human. A decoded-but-unpermitted tier is a different fault from an
  // unresolvable credential — say which.
  const cred = ctx.credential;
  if (cred && cred.reason !== "ok") {
    return {
      code: "tier_not_allowed",
      reason: cred.reason,
      detail:
        `Operator tier could not be established, so analytics is denied (owner/admin only). ` +
        `${describeCredential(cred)} Fail-closed. See knowledge/analytics-sync-contract.yaml ` +
        `per_human_tier_gate.`,
      remediation: CREDENTIAL_REMEDIATION[cred.reason],
    };
  }

  const tier = cred?.tier ?? ctx.tier ?? null;
  if (tier) {
    return {
      code: "tier_not_allowed",
      reason: "tier_not_permitted",
      detail:
        `Operator tier "${tier}" may not use analytics (owner/admin only). ` +
        `See knowledge/operator-tiers.yaml.`,
      remediation: "Ask an owner to raise your tier: `/users retier <email> --tier=admin`.",
    };
  }

  // No credential was threaded through (e.g. a hand-built context). Stay generic
  // rather than guess — still a denial.
  return {
    code: "tier_not_allowed",
    reason: "no_credential_source",
    detail:
      `Operator tier "unknown" may not use analytics (owner/admin only). ` +
      `See knowledge/operator-tiers.yaml.`,
    remediation: CREDENTIAL_REMEDIATION.no_credential_source,
  };
}
