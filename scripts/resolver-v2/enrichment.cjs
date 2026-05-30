'use strict';
/**
 * scripts/resolver-v2/enrichment.cjs — deterministic per-entry catalog enrichment.
 *
 * Capability: resolver-plan v1.0 (Sprint 1).
 *
 * Computes the ADDITIVE enrichment fields that catalog-generator.cjs emits on
 * top of the v2 base fields, so the 2-axis split + grounding are first-class in
 * the catalog. ALL derivation is deterministic (static maps + string rules) —
 * NO LLM, NO network — so a wrong derivation is a one-line fix caught by a test.
 *
 * Fields emitted (all OPTIONAL on the entry; generators supply the raw signals):
 *   axis        — EVERY entry (content | capability | meta), via axis-map.cjs.
 *   hitl_tier   — capability entries: A | B | C | D-Std | D-MAX.
 *   side_effect — capability entries: none | write | send | money | publish.
 *   authority   — content entries: SoR | SoR-external | derived-memory | scratch.
 *   freshness   — content entries: static | hourly | daily | live | unknown.
 *   grounding   — view/metric/page: schema/contract pointer to READ before authoring.
 *   columns     — view entries only: the parsed column list (list/inline-comma).
 *
 * Field provenance: refs/03-design-decisions.md "Field provenance".
 *
 * Design (Kent Beck): the generators already parse the raw source signals they
 * need (a tool's tier_default, a metric's source, a view's DDL path). They pass
 * those signals in; this module owns the CLASSIFICATION rules in one place.
 *
 * Public API:
 *   enrichEntry(signals) → { axis, ...kind-appropriate enrichment fields }
 *   Plus the small pure derivation helpers (exported for unit tests).
 */

const { axisForKind } = require('./axis-map.cjs');

// ===========================================================================
// HITL tier — capability axis
// ===========================================================================

/** Tiers we recognize, ordered by blast radius (governance/HITL.md). */
const VALID_HITL_TIERS = Object.freeze(['A', 'B', 'C', 'D-Std', 'D-MAX']);

/**
 * Conservative default tier when no metadata declares one.
 * Per spec §6 watch-item + Muse adversarial review: UNKNOWN → 'B', NEVER 'A'.
 * (A = auto-runnable downstream; defaulting unknown to A would let an
 * unclassified side-effecting capability auto-run. B is surfaced, never auto-run.)
 */
const CONSERVATIVE_HITL_TIER = 'B';

/**
 * Default tier for the read/advisory capability kinds (command/agent/persona):
 * these are interactive surfaces a human drives, so 'A' is the safe default
 * UNLESS the source declares a higher tier. (skill/sop default conservative 'B'
 * because they can encode side-effecting steps; mcp reads its per-tool tier.)
 */
const ADVISORY_CAPABILITY_KINDS = Object.freeze(['command', 'agent', 'persona']);

/**
 * Normalize a raw tier string (from frontmatter / mcp-tools.yaml / flow.yaml)
 * to a recognized HITL tier, or null if unrecognized/absent.
 * Accepts the common spellings: 'A', 'D-Std', 'D-MAX', 'd-std', 'D-STD'.
 */
function normalizeHitlTier(rawTier) {
  if (typeof rawTier !== 'string') return null;
  const t = rawTier.trim();
  if (!t) return null;
  // Exact match fast-path.
  if (VALID_HITL_TIERS.includes(t)) return t;
  // Case-insensitive match against the canonical spellings.
  const upper = t.toUpperCase();
  for (const valid of VALID_HITL_TIERS) {
    if (valid.toUpperCase() === upper) return valid;
  }
  return null;
}

/**
 * Derive the HITL tier for a capability entry.
 * @param {string} kind          — capability kind.
 * @param {string|null} rawTier  — declared tier (mcp tier_default / frontmatter), if any.
 * @returns {string} a valid HITL tier (never undefined).
 */
function deriveHitlTier(kind, rawTier) {
  const declared = normalizeHitlTier(rawTier);
  if (declared) return declared;
  // No declared tier: advisory surfaces default A; everything else conservative B.
  if (ADVISORY_CAPABILITY_KINDS.includes(kind)) return 'A';
  return CONSERVATIVE_HITL_TIER;
}

// ===========================================================================
// Side effect — capability axis
// ===========================================================================

/** Valid side-effect classes (refs/03-design-decisions.md). */
const VALID_SIDE_EFFECTS = Object.freeze(['none', 'write', 'send', 'money', 'publish']);

/**
 * Derive side_effect from tier + optional hint signal.
 * Per spec: tier A → 'none'; tier B+ → 'write' (default) unless the source
 * clearly implies send/money/publish (passed as sideEffectHint).
 * @param {string} hitlTier         — already-derived HITL tier.
 * @param {string|null} hint        — explicit override (send|money|publish|write|none) if known.
 * @returns {string} a valid side_effect.
 */
function deriveSideEffect(hitlTier, hint) {
  if (typeof hint === 'string' && VALID_SIDE_EFFECTS.includes(hint.trim())) {
    return hint.trim();
  }
  if (hitlTier === 'A') return 'none';
  // Tier B+ with no clearer signal: a write of some kind.
  return 'write';
}

// ===========================================================================
// Authority — content axis
// ===========================================================================

/** Valid authority classes. */
const VALID_AUTHORITIES = Object.freeze(['SoR', 'SoR-external', 'derived-memory', 'scratch']);

/**
 * Static authority by content kind (refs/03-design-decisions.md):
 *   page/view/metric → SoR (Tier-1 / live operating system of record)
 *   external-source  → SoR-external (an external system of record / API)
 *   wiki/runbook     → derived-memory (extracted notes / operational memory)
 */
const AUTHORITY_BY_KIND = Object.freeze({
  page: 'SoR',
  view: 'SoR',
  metric: 'SoR',
  'external-source': 'SoR-external',
  wiki: 'derived-memory',
  runbook: 'derived-memory',
});

function deriveAuthority(kind) {
  return AUTHORITY_BY_KIND[kind] || null;
}

// ===========================================================================
// Freshness — content axis
// ===========================================================================

/** Valid freshness classes. */
const VALID_FRESHNESS = Object.freeze(['static', 'hourly', 'daily', 'live', 'unknown']);

/**
 * Classify a SQL-source string by the schema it reads from.
 *   metrics.*  → 'hourly' (ETL'd snapshot, refreshed hourly)
 *   ops.* / public.* / any other live table → 'live'
 *   no recognizable schema → null (caller falls back to kind default)
 */
function freshnessFromSqlSource(sourceText) {
  if (typeof sourceText !== 'string' || !sourceText.trim()) return null;
  const s = sourceText.toLowerCase();
  if (s.includes('metrics.')) return 'hourly';
  if (s.includes('ops.') || s.includes('public.')) return 'live';
  return null;
}

/**
 * Derive freshness for a content entry.
 * Per spec: page → static; view/metric on metrics.* → hourly, on ops.* → live;
 * wiki → unknown; runbook → static; external-source → live.
 * @param {string} kind         — content kind.
 * @param {string|null} source  — for view/metric, the SQL source text (qualified name / source field).
 */
function deriveFreshness(kind, source) {
  switch (kind) {
    case 'page':
    case 'runbook':
      return 'static';
    case 'wiki':
      return 'unknown';
    case 'external-source':
      return 'live';
    case 'view':
    case 'metric': {
      const bySource = freshnessFromSqlSource(source);
      // A metric/view with no recognizable schema source is honestly unknown.
      return bySource || 'unknown';
    }
    default:
      return null;
  }
}

// ===========================================================================
// Top-level entry enrichment
// ===========================================================================

const CAPABILITY_AXIS = 'capability';
const CONTENT_AXIS = 'content';

/**
 * Compute the additive enrichment fields for one catalog entry.
 *
 * @param {Object} signals
 * @param {string} signals.kind            — recipient kind (REQUIRED).
 * @param {string} [signals.rawTier]       — declared HITL tier (capability kinds).
 * @param {string} [signals.sideEffectHint]— explicit side_effect override (capability kinds).
 * @param {string} [signals.source]        — SQL/source text (view/metric freshness).
 * @param {string} [signals.grounding]     — grounding pointer (view/metric/page).
 * @param {string[]} [signals.columns]     — parsed column list (view).
 * @returns {Object} enrichment fields to merge onto the entry. `axis` always set.
 * @throws {UnknownAxisKind} if kind has no axis mapping.
 */
function enrichEntry(signals) {
  const { kind } = signals;
  const axis = axisForKind(kind); // throws on unknown kind — fail fast.
  const out = { axis };

  if (axis === CAPABILITY_AXIS) {
    const hitlTier = deriveHitlTier(kind, signals.rawTier);
    out.hitl_tier = hitlTier;
    out.side_effect = deriveSideEffect(hitlTier, signals.sideEffectHint);
  } else if (axis === CONTENT_AXIS) {
    const authority = deriveAuthority(kind);
    if (authority) out.authority = authority;
    const freshness = deriveFreshness(kind, signals.source);
    if (freshness) out.freshness = freshness;
    // Grounding pointer (view/metric/page) — supplied by the generator.
    if (typeof signals.grounding === 'string' && signals.grounding.trim()) {
      out.grounding = signals.grounding.trim();
    }
    // Columns (view) — list/inline-comma convention; only when non-empty.
    if (Array.isArray(signals.columns) && signals.columns.length > 0) {
      out.columns = signals.columns;
    }
  }
  // meta axis: axis only (no further enrichment — a capability is buildable work,
  // not a thing to read or run).

  return out;
}

module.exports = {
  enrichEntry,
  // Derivation helpers (exported for unit tests).
  normalizeHitlTier,
  deriveHitlTier,
  deriveSideEffect,
  deriveAuthority,
  deriveFreshness,
  freshnessFromSqlSource,
  // Constants.
  VALID_HITL_TIERS,
  VALID_SIDE_EFFECTS,
  VALID_AUTHORITIES,
  VALID_FRESHNESS,
  CONSERVATIVE_HITL_TIER,
  AUTHORITY_BY_KIND,
  ADVISORY_CAPABILITY_KINDS,
};
