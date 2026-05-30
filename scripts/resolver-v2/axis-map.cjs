'use strict';
/**
 * scripts/resolver-v2/axis-map.cjs — deterministic recipient-kind → axis map.
 *
 * Capability: resolver-plan v1.0 (Sprint 1).
 *
 * The 2-axis split is first-class in resolver: every catalog recipient kind is
 * either a CONTENT recipient (where an answer LIVES — you READ it) or a
 * CAPABILITY recipient (something you RUN to produce an answer — HITL-gated).
 * `capability` (the registry kind) is META — it describes a buildable unit of
 * work, not a thing you read or run directly, so it is its own axis bucket.
 *
 * This map is the single source of truth for the `axis` field emitted on every
 * catalog entry by catalog-generator.cjs, and (Sprint 2) surfaced by
 * mcp__supabase-ops__resolver_find. It is intentionally a static lookup — NO LLM, NO network,
 * NO inference — so the classification is reproducible and a wrong mapping is a
 * one-line fix caught by a unit test.
 *
 * Field provenance: refs/03-design-decisions.md "Field provenance" → `axis`.
 *
 * Public API:
 *   AXES                  → ['content', 'capability', 'meta'] (the closed set)
 *   KIND_TO_AXIS          → frozen { <kind>: <axis> } map over all VALID_KINDS
 *   axisForKind(kind)     → axis string; throws UnknownAxisKind on unknown kind
 */

const E = require('./errors.cjs');

/** The closed set of axes a recipient kind can belong to. */
const AXES = Object.freeze(['content', 'capability', 'meta']);

/**
 * CONTENT axis — recipients you READ to find where the answer lives.
 * (page/view/metric/wiki/runbook/external-source per design decisions.)
 */
const CONTENT_KINDS = Object.freeze([
  'page',
  'view',
  'metric',
  'wiki',
  'runbook',
  'external-source',
]);

/**
 * CAPABILITY axis — recipients you RUN (HITL-gated) to produce an answer.
 * (skill/command/agent/persona/mcp/sop/workflow/schedule/hook.)
 */
const CAPABILITY_KINDS = Object.freeze([
  'skill',
  'command',
  'agent',
  'persona',
  'mcp',
  'sop',
  'workflow',
  'schedule',
  'hook',
]);

/**
 * META axis — the capability-registry kind: a buildable unit of work, neither
 * read-as-content nor run-directly.
 */
const META_KINDS = Object.freeze(['capability']);

/**
 * Build the frozen kind→axis map from the three buckets above, so the buckets
 * stay the single editable source and the map can never silently disagree.
 */
function buildKindToAxis() {
  const map = {};
  for (const kind of CONTENT_KINDS) map[kind] = 'content';
  for (const kind of CAPABILITY_KINDS) map[kind] = 'capability';
  for (const kind of META_KINDS) map[kind] = 'meta';
  return Object.freeze(map);
}

const KIND_TO_AXIS = buildKindToAxis();

/**
 * Resolve a recipient kind to its axis.
 * @param {string} kind — a recipient kind (e.g. 'skill', 'page').
 * @returns {string} one of AXES.
 * @throws {E.UnknownAxisKind} if the kind has no axis mapping.
 */
function axisForKind(kind) {
  const axis = KIND_TO_AXIS[kind];
  if (axis === undefined) {
    throw new E.UnknownAxisKind(kind, Object.keys(KIND_TO_AXIS));
  }
  return axis;
}

module.exports = {
  AXES,
  KIND_TO_AXIS,
  CONTENT_KINDS,
  CAPABILITY_KINDS,
  META_KINDS,
  axisForKind,
};
