// ============================================================================
// scripts/deepask/citation-audit.cjs — deepask citation-discipline guardrail
// ============================================================================
// Capability `deepask` v1.0, Sprint 2. Pure deterministic auditor invoked by the
// `deepask/synthesize` skill on its OWN synthesis IR before emitting — the
// operationalization of the #1 acceptance test ("every claim cites a source;
// zero uncited claims", spec §10/§13) and the `deepask.uncited_claim_rate` KPI
// (target 0).
//
// A claim is CITED iff its `citations` is an array containing ≥1 non-empty
// string ref. Anything else (no citations key, [], non-array, only empty/
// whitespace strings) is an UNCITED violation. The synthesize skill must repair
// every violation before emitting; the completeness-critic refuses to mark a run
// COMPLETE while uncited claims remain.
//
// Single responsibility: PRESENCE of citations only. Ref-shape / path-traversal
// safety is the execute/format stage's concern (separate helper), not here.
// Pure function: no I/O, no side effects.
// ============================================================================

'use strict';

/**
 * Is `c` a usable citation ref? (non-empty, non-whitespace string)
 * @param {*} c
 * @returns {boolean}
 */
function isValidCitation(c) {
  return typeof c === 'string' && c.trim().length > 0;
}

/**
 * Does this claim carry at least one valid citation?
 * @param {*} claim
 * @returns {boolean}
 */
function isClaimCited(claim) {
  if (claim === null || typeof claim !== 'object') return false; // malformed → uncited
  if (!Array.isArray(claim.citations)) return false;             // missing / non-array → uncited
  return claim.citations.some(isValidCitation);
}

/**
 * Audit a deepask synthesis IR for citation discipline.
 *
 * @param {object} ir  the format-agnostic synthesis IR (spec §5.1). Only
 *                      `ir.sections[].claims[].citations` is inspected.
 * @returns {{
 *   ok: boolean,                 // true iff zero uncited claims
 *   totalClaims: number,
 *   citedClaims: number,
 *   uncited: Array<{ section: string, claimIndex: number, text: string }>,
 *   uncitedRate: number          // uncited/total; 0 when total is 0
 * }}
 * @throws {TypeError} if `ir` is not a non-null object.
 */
function auditCitations(ir) {
  if (ir === null || typeof ir !== 'object' || Array.isArray(ir)) {
    throw new TypeError(
      `citation-audit: ir must be a non-null object, got ${ir === null ? 'null' : Array.isArray(ir) ? 'array' : typeof ir}`,
    );
  }

  const sections = Array.isArray(ir.sections) ? ir.sections : [];
  const uncited = [];
  let totalClaims = 0;
  let citedClaims = 0;

  for (const section of sections) {
    const heading =
      section && typeof section === 'object' && typeof section.heading === 'string'
        ? section.heading
        : '<untitled section>';
    const claims = section && typeof section === 'object' && Array.isArray(section.claims)
      ? section.claims
      : [];

    claims.forEach((claim, claimIndex) => {
      totalClaims += 1;
      if (isClaimCited(claim)) {
        citedClaims += 1;
      } else {
        const text =
          claim && typeof claim === 'object' && typeof claim.text === 'string'
            ? claim.text
            : '<no claim text>';
        uncited.push({ section: heading, claimIndex, text });
      }
    });
  }

  return {
    ok: uncited.length === 0,
    totalClaims,
    citedClaims,
    uncited,
    uncitedRate: totalClaims === 0 ? 0 : uncited.length / totalClaims,
  };
}

module.exports = { auditCitations, isClaimCited, isValidCitation };
