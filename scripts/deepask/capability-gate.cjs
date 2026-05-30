// ============================================================================
// scripts/deepask/capability-gate.cjs — deepask capability-RUN gate
// ============================================================================
// Capability `deepask` v1.0, Sprint 3. Pure deterministic gate invoked by the
// `deepask/execute` skill for each entry in a ResolverPlan's `capability_axis`.
// Encodes deepask's read-vs-RUN governance rule (spec §7, design-decisions Q2):
//
//   • deepask AUTO-RUNS Tier-A, no-side-effect capabilities only
//     (compute/analyze/retrieve — cost-report, thinking-toolkit/*, wiki_ask,
//      gbrain reads, experiment-analyst, synthesize-morning-brief).
//   • Any Tier-B+ (side-effecting) capability is SURFACED as a HITL-gated
//     suggestion — never auto-run.
//   • A D-MAX capability is REFUSED outright: it is beyond deepask's
//     read/synthesize remit (deepask is not a create/modify surface).
//
// hitl_tier + side_effect come from the ResolverPlan candidate enrichment
// (resolver-plan derives them from knowledge/mcp-tools.yaml + skill/SOP
// frontmatter + governance/HITL.md Appendix A). Pure function: no I/O.
// ============================================================================

'use strict';

const VALID_TIERS = ['A', 'B', 'C', 'D-Std', 'D-MAX'];
const VALID_SIDE_EFFECTS = ['none', 'write', 'send', 'money', 'publish'];

function assertEnum(value, allowed, name) {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new TypeError(
      `capability-gate: ${name} must be one of [${allowed.join(', ')}], got ${
        typeof value === 'string' ? `"${value}"` : typeof value
      }`,
    );
  }
}

/**
 * Decide what deepask does with one capability_axis recipient.
 *
 * @param {object} leg
 * @param {string} leg.hitl_tier    'A' | 'B' | 'C' | 'D-Std' | 'D-MAX'
 * @param {string} leg.side_effect  'none' | 'write' | 'send' | 'money' | 'publish'
 * @returns {{ action: 'auto_run'|'surface'|'refuse', reason: string }}
 * @throws {TypeError} on a non-object arg or an invalid enum value.
 */
function classifyCapabilityLeg(leg) {
  if (leg === null || typeof leg !== 'object' || Array.isArray(leg)) {
    throw new TypeError(
      `capability-gate: leg must be an object, got ${leg === null ? 'null' : Array.isArray(leg) ? 'array' : typeof leg}`,
    );
  }
  assertEnum(leg.hitl_tier, VALID_TIERS, 'hitl_tier');
  assertEnum(leg.side_effect, VALID_SIDE_EFFECTS, 'side_effect');

  // D-MAX is never actionable by a read/synthesize tool — refuse, don't surface.
  if (leg.hitl_tier === 'D-MAX') {
    return {
      action: 'refuse',
      reason: 'D-MAX capability is beyond deepask\'s read/synthesize remit (not a create/modify surface)',
    };
  }

  // Auto-run ONLY a genuinely side-effect-free Tier-A capability.
  if (leg.hitl_tier === 'A' && leg.side_effect === 'none') {
    return { action: 'auto_run', reason: 'Tier-A read/compute with no side effect' };
  }

  // Tier-A but with a declared side effect (inconsistent/defensive) → surface, don't auto-run.
  if (leg.hitl_tier === 'A') {
    return {
      action: 'surface',
      reason: `Tier-A but declares side_effect="${leg.side_effect}"; surfaced for safety (no auto-run on any side effect)`,
    };
  }

  // Tier B / C / D-Std → surface as a HITL-gated suggestion.
  return {
    action: 'surface',
    reason: `Tier-${leg.hitl_tier} side-effecting capability — surfaced for HITL approval, never auto-run`,
  };
}

module.exports = { classifyCapabilityLeg, VALID_TIERS, VALID_SIDE_EFFECTS };
