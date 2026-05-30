'use strict';
/**
 * scripts/resolver-v2/plan-audit.cjs — plan-mode audit-row builder for resolver-plan.
 *
 * Capability: resolver-plan v1.0 (Sprint 3).
 *
 * The resolver-plan SKILL is session-model (it assembles the ResolverPlan by
 * reading axis-tagged candidates). The ONE deterministic, side-effecting step it
 * performs is writing an audit row to ops.resolver_decisions. This module owns the
 * pure SHAPE of that row so it is unit-testable without a DB and without an LLM.
 *
 * Why this is NOT routed through audit.cjs#buildRecord: that builder validates
 * `mode` against errors.cjs VALID_MODES = ['A','B','C'] and would THROW on the
 * plan-mode value 'A2'. The MCP find tool (resolver-find.ts) likewise writes
 * mode:'A2' directly via the service client. Plan rows reuse mode='A2' (the find
 * call that backs the plan) + plan_payload IS NOT NULL as the discriminator — per
 * migration 00044 + @cto Phase-5 review (no 'PLAN' token).
 *
 * Column contract (ops.resolver_decisions; migrations 00034 base, 00035 mode/arrays,
 * 00044 plan_payload + mode→varchar(8) repair):
 *   NOT NULL : trigger, trigger_normalized, latency_ms, decision
 *   decision : CHECK IN ('dispatch_silently','surface_candidates','no_match','role_denied')
 *   mode     : CHECK IN ('A','B','C','A2')  → plan rows use 'A2'
 *   plan_payload : jsonb  → the assembled ResolverPlan v1 (single OR batch wrapper)
 *
 * Public API:
 *   PLAN_AUDIT_MODE                       → 'A2'
 *   governanceRequiresHitl(capabilityAxis)→ bool: does this axis mandate page/governance-HITL?
 *   planDecision(plan|batch)              → one of the 4 valid `decision` enum values
 *   buildPlanAuditRow({ plan, intent, callerRole, latencyMs, ... }) → row for insert
 */

// The HITL tiers that mark a capability as SIDE-EFFECTING (must surface, never
// auto-run). Tier 'A' is the only auto-runnable tier. Anything B and up (incl. the
// D variants) is gated. Source: governance/HITL.md; refs/03-design-decisions.md Q2.
const SIDE_EFFECTING_HITL_TIERS = Object.freeze(['B', 'C', 'D-Std', 'D-MAX']);

// The governance recipient that MUST appear in governance_constraints whenever any
// capability is side-effecting. A page/ recipient (Tier-1 doc), read before running.
const HITL_GOVERNANCE_RECIPIENT = 'page/governance-HITL';

// The mode plan rows carry (reuses the find call's mode; discriminated by plan_payload).
const PLAN_AUDIT_MODE = 'A2';

// Audit `decision` enum (CHECK in 00034). Plan rows map onto these existing values
// (no 'PLAN' token per @cto): a plan that resolved recipients = a dispatch; a plan
// that resolved nothing (only no_coverage) = no_match.
const DECISION_DISPATCH = 'dispatch_silently';
const DECISION_SURFACE = 'surface_candidates';
const DECISION_NO_MATCH = 'no_match';

const MAX_TRIGGER_LEN = 500;

/**
 * Does a capability axis mandate inclusion of page/governance-HITL in
 * governance_constraints? TRUE iff at least one item is HITL tier B or higher.
 *
 * Pure + total: a null/non-array axis, or an item with a missing/unknown tier,
 * is treated as NOT-forcing here (the unknown→B conservatism happens at catalog
 * enrichment time; by the time an item reaches a plan it carries a concrete tier).
 *
 * @param {Array<{hitl_tier?: string}>} capabilityAxis
 * @returns {boolean}
 */
function governanceRequiresHitl(capabilityAxis) {
  if (!Array.isArray(capabilityAxis)) return false;
  return capabilityAxis.some(
    (item) => item && SIDE_EFFECTING_HITL_TIERS.includes(item.hitl_tier),
  );
}

/**
 * Normalize a single plan OR a { plans: [...] } batch into the array of plans.
 * @param {Object} planOrBatch
 * @returns {Object[]} the contained plans (possibly a single-element array).
 */
function plansOf(planOrBatch) {
  if (planOrBatch && Array.isArray(planOrBatch.plans)) return planOrBatch.plans;
  if (planOrBatch && typeof planOrBatch === 'object') return [planOrBatch];
  return [];
}

/**
 * Map an assembled plan (single or batch) to a valid `decision` enum value:
 *   - any plan resolved ≥1 recipient with a confident, fully-covered sub-need
 *     → 'dispatch_silently'
 *   - any plan resolved ≥1 recipient BUT some plan still has a no_coverage gap
 *     → 'surface_candidates' (consumer should review the partial coverage)
 *   - NO plan resolved any recipient (all axes empty) → 'no_match'
 *
 * @param {Object} planOrBatch — a ResolverPlan or a { plans: [...] } batch.
 * @returns {string} one of the 4 valid decision values.
 */
function planDecision(planOrBatch) {
  const plans = plansOf(planOrBatch);
  if (plans.length === 0) return DECISION_NO_MATCH;

  let anyRecipient = false;
  let anyGap = false;
  for (const p of plans) {
    const content = Array.isArray(p.content_axis) ? p.content_axis.length : 0;
    const capability = Array.isArray(p.capability_axis) ? p.capability_axis.length : 0;
    if (content + capability > 0) anyRecipient = true;
    if (Array.isArray(p.no_coverage) && p.no_coverage.length > 0) anyGap = true;
  }

  if (!anyRecipient) return DECISION_NO_MATCH;
  return anyGap ? DECISION_SURFACE : DECISION_DISPATCH;
}

/** Truncate a string field to the audit max length (keeps payloads bounded). */
function truncate(s, max) {
  const str = (s == null ? '' : String(s));
  return str.length > max ? str.slice(0, max) : str;
}

/**
 * Build the plan-mode audit row for ops.resolver_decisions.
 *
 * @param {Object} args
 * @param {Object}  args.plan          — the assembled ResolverPlan v1 (single OR { plans:[...] }). REQUIRED.
 * @param {string}  args.intent        — the original intent / first sub_need (becomes `trigger`). REQUIRED.
 * @param {string} [args.triggerNormalized] — normalized intent; defaults to a lowercased/collapsed `intent`.
 * @param {string} [args.callerRole]   — caller role at plan time (default: process.env.MCP_CALLER_ROLE || null).
 * @param {number} [args.latencyMs]    — wall-clock ms of the plan assembly (default 0; column is NOT NULL).
 * @param {number} [args.findCalls]    — how many mcp__resolver__find calls the plan consumed (audit metadata).
 * @param {string[]} [args.catalogFilesLoaded] — provenance for the audit (default a single marker entry).
 * @returns {Object} a row ready for mcp__supabase-ops__insert into ops.resolver_decisions.
 */
function buildPlanAuditRow(args) {
  if (!args || typeof args !== 'object') {
    throw new TypeError('buildPlanAuditRow: args object is required');
  }
  const { plan, intent } = args;
  if (plan == null || typeof plan !== 'object') {
    throw new TypeError('buildPlanAuditRow: `plan` (the assembled ResolverPlan) is required');
  }
  if (typeof intent !== 'string' || intent.length === 0) {
    throw new TypeError('buildPlanAuditRow: `intent` (non-empty string) is required');
  }

  const trigger = truncate(intent, MAX_TRIGGER_LEN);
  const triggerNormalized = truncate(
    typeof args.triggerNormalized === 'string' && args.triggerNormalized.length > 0
      ? args.triggerNormalized
      : intent.toLowerCase().replace(/\s+/g, ' ').trim(),
    MAX_TRIGGER_LEN,
  );

  const callerRole =
    typeof args.callerRole === 'string' && args.callerRole.length > 0
      ? args.callerRole
      : (process.env.MCP_CALLER_ROLE || null);

  const latencyMs = Number.isFinite(args.latencyMs) && args.latencyMs >= 0
    ? Math.round(args.latencyMs)
    : 0;

  const plans = plansOf(plan);
  const subNeedCount = plans.length;
  const noCoverageCount = plans.reduce(
    (acc, p) => acc + (Array.isArray(p.no_coverage) ? p.no_coverage.length : 0),
    0,
  );

  return {
    trigger,
    trigger_normalized: triggerNormalized,
    matched_route_id: null,          // a plan is a multi-recipient assembly, not a single route.
    confidence: null,                // not a single-match confidence.
    alternatives: null,
    semantic_used: false,
    caller_role: callerRole,
    latency_ms: latencyMs,
    decision: planDecision(plan),
    mode: PLAN_AUDIT_MODE,           // 'A2' (discriminated as a plan row by plan_payload != null).
    plan_payload: plan,              // the assembled ResolverPlan v1 (single or batch).
    catalog_files_loaded: Array.isArray(args.catalogFilesLoaded)
      ? args.catalogFilesLoaded
      : ['recipients/*.md (via mcp__resolver__find)'],
    metadata: {
      kind: 'resolver-plan',
      sub_need_count: subNeedCount,
      no_coverage_count: noCoverageCount,
      find_calls: Number.isFinite(args.findCalls) ? args.findCalls : null,
    },
  };
}

module.exports = {
  buildPlanAuditRow,
  governanceRequiresHitl,
  planDecision,
  plansOf,
  // Constants (exported for tests + the skill to reference the single source of truth).
  PLAN_AUDIT_MODE,
  SIDE_EFFECTING_HITL_TIERS,
  HITL_GOVERNANCE_RECIPIENT,
  MAX_TRIGGER_LEN,
};
