// ============================================================================
// scripts/forge/route-classify.cjs — /forge extend-vs-net-new route classifier
// ============================================================================
// Capability `book-to-capability` (/forge) v0.1, Sprint 1. Pure deterministic
// decision invoked by the `forge/route-classifier` skill AFTER the 5-gate
// selection funnel passes. It is the single highest-risk surface in /forge:
// a mis-route sends a cheap EXTEND (~$0.70 via /update, Tier B) down the
// expensive NET-NEW path (~$3-5 via /cla, Tier C), or vice-versa — a silent
// 5x cost / wrong-tier error (@cto Phase-5). So the logic is deterministic +
// fully unit-tested; the skill does the impure resolver_find call and hands
// the RESULTS (candidate skills + similarity scores) to this function.
//
//   • No candidate, or the best candidate scores below `threshold`  → net-new.
//   • A clear winner at/above `threshold` (alone, or beating #2 by at least
//     `ambiguityMargin`)                                            → extend:<entity>.
//   • A winner above threshold but in a near-tie with #2            → surface
//     (the founder picks the target; /forge NEVER auto-picks an ambiguous
//      extend target — @cto: ambiguity must surface).
//
// Pure function: no I/O, no resolver call, no clock.
// ============================================================================

'use strict';

const VALID_ROUTES = ['extend', 'net-new', 'surface'];
const DEFAULT_THRESHOLD = 0.6;       // min similarity to treat as an extend target
const DEFAULT_AMBIGUITY_MARGIN = 0.1; // min (top - second) gap to auto-pick the winner

function assertUnitInterval(value, name) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 1) {
    throw new TypeError(
      `route-classify: ${name} must be a number in [0, 1], got ${
        typeof value === 'number' ? value : typeof value
      }`,
    );
  }
}

/**
 * Classify the build route for a funnel-passed /forge candidate.
 *
 * @param {object} input
 * @param {Array<{entity: string, score: number}>} input.candidates
 *        resolver_find results — existing skills this need might belong to,
 *        each with a 0..1 similarity score. May be empty (no existing target).
 *        Order-independent: sorted internally by score desc.
 * @param {number} [input.threshold=0.6]        min score to consider an extend.
 * @param {number} [input.ambiguityMargin=0.1]  min (top - second) gap to auto-pick.
 * @returns {{route: 'extend'|'net-new'|'surface', entity?: string,
 *            candidates?: Array<{entity: string, score: number}>, reason: string}}
 * @throws {TypeError} on a non-object arg, malformed candidates, or out-of-range tuning.
 */
function classifyRoute(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(
      `route-classify: input must be an object, got ${
        input === null ? 'null' : Array.isArray(input) ? 'array' : typeof input
      }`,
    );
  }
  const {
    candidates,
    threshold = DEFAULT_THRESHOLD,
    ambiguityMargin = DEFAULT_AMBIGUITY_MARGIN,
  } = input;

  if (!Array.isArray(candidates)) {
    throw new TypeError(
      `route-classify: candidates must be an array, got ${typeof candidates}`,
    );
  }
  assertUnitInterval(threshold, 'threshold');
  assertUnitInterval(ambiguityMargin, 'ambiguityMargin');

  // Validate + copy each candidate (no mutation of caller input).
  const ranked = candidates.map((c, i) => {
    if (c === null || typeof c !== 'object' || Array.isArray(c)) {
      throw new TypeError(`route-classify: candidates[${i}] must be an object`);
    }
    if (typeof c.entity !== 'string' || c.entity.length === 0) {
      throw new TypeError(`route-classify: candidates[${i}].entity must be a non-empty string`);
    }
    assertUnitInterval(c.score, `candidates[${i}].score`);
    return { entity: c.entity, score: c.score };
  });

  // Sort by score desc; tie-break by entity name for determinism.
  ranked.sort((a, b) => (b.score - a.score) || a.entity.localeCompare(b.entity));

  const top = ranked[0];

  // No candidate, or the best is too weak to extend → birth a new skill.
  if (!top || top.score < threshold) {
    return {
      route: 'net-new',
      reason: top
        ? `best candidate "${top.entity}" scored ${top.score} < threshold ${threshold} → no strong extend target`
        : `no existing skill candidates → net-new`,
    };
  }

  const second = ranked[1];

  // A lone strong candidate, or a STRICT winner over #2 by at least the margin → auto-pick.
  // The `top.score > second.score` guard means a true score tie NEVER auto-picks (even at
  // margin 0) — an identical-score pair is maximally ambiguous and must surface, not be
  // resolved by the arbitrary lexicographic tie-break (@cto: ambiguity must surface).
  if (!second || (top.score > second.score && top.score - second.score >= ambiguityMargin)) {
    return {
      route: 'extend',
      entity: top.entity,
      reason: second
        ? `"${top.entity}" (${top.score}) beats "${second.entity}" (${second.score}) by ≥ ${ambiguityMargin}`
        : `lone candidate "${top.entity}" (${top.score}) ≥ threshold ${threshold}`,
    };
  }

  // Near-tie among strong candidates → never auto-pick; surface for founder choice.
  // Include equal-score peers explicitly so a tie at margin 0 still lists the whole tied set.
  const tied = ranked.filter((c) => c.score === top.score || top.score - c.score < ambiguityMargin);
  return {
    route: 'surface',
    candidates: tied,
    reason: `${tied.length} candidates within ${ambiguityMargin} of the top score (${top.score}) — ambiguous extend target, founder picks`,
  };
}

module.exports = {
  classifyRoute,
  VALID_ROUTES,
  DEFAULT_THRESHOLD,
  DEFAULT_AMBIGUITY_MARGIN,
};
