// ============================================================================
// scripts/deepask/breaker-budget.cjs — deepask resolver-budget accountant
// ============================================================================
// Capability `deepask` v1.0, Sprint 1. Pure deterministic helper invoked by
// the `deepask/orchestrator` skill BEFORE any execute work (the @cto Phase-2
// Sprint-1 gate).
//
// WHY: the resolver per-session circuit breaker (mcp-server/src/tools/resolver-find.ts)
// is `SESSION_HARD_CAP = 20` keyed on sessionId, window resetting ONLY after 4h
// idle (never mid-burst). `resolver-plan` spends exactly one resolver_find per
// sub-need, and the completeness-critic may trigger ONE follow-up resolve round.
// The counter is SHARED session-wide, so deepask's ≤6/≤12 decomposition bound is
// necessary-but-NOT-sufficient: 12 + follow-up + sibling resolver calls can trip
// call 21 → a fabricated-looking `no_coverage`. This function decides, up front,
// whether the planned decomposition fits the remaining budget and — if not —
// whether to CAP the decomposition or degrade to an honest PARTIAL.
//
// Breaker semantics (resolver-find.ts): `allow: state.count <= SESSION_HARD_CAP`,
// count incremented BEFORE the check ⇒ calls 1..20 allowed, call 21 rejected ⇒
// finds still allowed = hardCap - sessionFindsCount.
//
// Pure function: no I/O, no side effects. The orchestrator reads
// `session_finds_count` from the latest resolver_find response and passes it here.
// ============================================================================

'use strict';

const DEFAULT_HARD_CAP = 20;       // mirrors resolver-find.ts SESSION_HARD_CAP
const DEFAULT_FOLLOW_UP_RESERVE = 2; // reserve finds for the critic's ≤1 follow-up round
const DEFAULT_MIN_VIABLE = 1;      // fewest sub-needs worth proceeding with

/**
 * Validate that a value is a finite, non-negative integer; throw TypeError otherwise.
 * Contract violations (wrong type) are bugs in the caller → throw. Domain conditions
 * (exhausted budget, zero sub-needs) are returned, not thrown.
 * @param {*} value
 * @param {string} name
 */
function assertNonNegativeInteger(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`breaker-budget: ${name} must be a finite number, got ${stringify(value)}`);
  }
  if (!Number.isInteger(value)) {
    throw new TypeError(`breaker-budget: ${name} must be an integer, got ${value}`);
  }
  if (value < 0) {
    throw new TypeError(`breaker-budget: ${name} must be >= 0, got ${value}`);
  }
}

function stringify(value) {
  if (typeof value === 'number') return String(value); // NaN/Infinity print readably
  return JSON.stringify(value);
}

/**
 * Compute the deepask resolver-budget decision for a planned decomposition.
 *
 * @param {object} args
 * @param {number} args.sessionFindsCount  resolver_find calls already used this session
 *                                         (from the latest resolver_find response).
 * @param {number} args.subNeedCount        planned sub-needs (1 resolver_find each).
 * @param {number} [args.hardCap=20]         resolver SESSION_HARD_CAP.
 * @param {number} [args.followUpReserve=2]  finds reserved for the critic's follow-up round.
 * @param {number} [args.minViable=1]        fewest initial sub-needs worth proceeding with.
 * @returns {{
 *   viable: boolean,            // can deepask proceed at all?
 *   degrade: boolean,           // did the budget force a cap or exhaustion?
 *   allowedSubNeeds: number,    // how many sub-needs to actually resolve now
 *   reservedForFollowUp: number,// finds held back for the follow-up round
 *   remaining: number,          // resolver finds still allowed this session
 *   reason: (null|'capped_to_budget'|'breaker_budget'|'no_sub_needs')
 * }}
 */
function computeBreakerBudget(args) {
  if (args === null || typeof args !== 'object') {
    throw new TypeError(`breaker-budget: args must be an object, got ${stringify(args)}`);
  }

  const {
    sessionFindsCount,
    subNeedCount,
    hardCap = DEFAULT_HARD_CAP,
    followUpReserve = DEFAULT_FOLLOW_UP_RESERVE,
    minViable = DEFAULT_MIN_VIABLE,
  } = args;

  // Guard clauses — contract violations throw (bugs), domain conditions return below.
  assertNonNegativeInteger(sessionFindsCount, 'sessionFindsCount');
  assertNonNegativeInteger(subNeedCount, 'subNeedCount');
  assertNonNegativeInteger(hardCap, 'hardCap');
  assertNonNegativeInteger(followUpReserve, 'followUpReserve');
  assertNonNegativeInteger(minViable, 'minViable');

  // Finds still allowed this session (clamped at 0 — sessionFindsCount may exceed
  // hardCap defensively if a sibling already overshot).
  const remaining = Math.max(0, hardCap - sessionFindsCount);

  // Degenerate: nothing to resolve.
  if (subNeedCount === 0) {
    return {
      viable: true,
      degrade: false,
      allowedSubNeeds: 0,
      reservedForFollowUp: 0,
      remaining,
      reason: 'no_sub_needs',
    };
  }

  const needed = subNeedCount + followUpReserve;

  // Happy path: the full decomposition + follow-up reserve fits.
  if (needed <= remaining) {
    return {
      viable: true,
      degrade: false,
      allowedSubNeeds: subNeedCount,
      reservedForFollowUp: followUpReserve,
      remaining,
      reason: null,
    };
  }

  // Over budget — try to cap the initial decomposition, still reserving the follow-up.
  const allowedForInitial = remaining - followUpReserve;

  if (allowedForInitial >= minViable) {
    return {
      viable: true,
      degrade: true,
      allowedSubNeeds: allowedForInitial,
      reservedForFollowUp: followUpReserve,
      remaining,
      reason: 'capped_to_budget',
    };
  }

  // Budget too small even for a minimal run + follow-up → honest PARTIAL up front.
  // NEVER a fabricated no_coverage; the orchestrator emits PARTIAL with
  // gap_reason='breaker_budget' and tells the operator to restart / wait for the 4h reset.
  return {
    viable: false,
    degrade: true,
    allowedSubNeeds: 0,
    reservedForFollowUp: 0,
    remaining,
    reason: 'breaker_budget',
  };
}

module.exports = {
  computeBreakerBudget,
  DEFAULT_HARD_CAP,
  DEFAULT_FOLLOW_UP_RESERVE,
  DEFAULT_MIN_VIABLE,
};
