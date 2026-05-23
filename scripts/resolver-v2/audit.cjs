'use strict';
/**
 * scripts/resolver-v2/audit.cjs — audit row builder + writer for resolver v2.
 *
 * Per spec.md §8 + migration 00035:
 *   ops.resolver_decisions now has:
 *     - llm_reasoning text       (v2 — Mode B LLM rationale)
 *     - mode char(1)              (v2 — 'A' | 'B' | 'C')
 *     - catalog_files_loaded text[]   (v2 — which catalog files contributed)
 *     - composition_supporting text[] (v2 — supporting recipient IDs)
 *
 * Public API:
 *   buildRecord(queryResult, opts?) → AuditRecord
 *   writeRecord(record, insertFn) → Promise<{run_id, ts}>
 *   buildBatch(records[]) → AuditRecord[]
 *
 * Design notes:
 *   - insertFn injected (defaults to identity) for testability + MCP boundary
 *   - All writes best-effort; never throw to caller
 *   - confidence clamped to [0, 1]
 */

const E = require('./errors.cjs');

const MAX_TRIGGER_AUDIT_LEN = 500;
const MAX_REASONING_LEN = 2000;
const MAX_SUPPORTING_COUNT = 20;

/**
 * Clamp a number to [min, max].
 */
function clamp(n, min, max) {
  if (typeof n !== 'number' || isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * Build audit record from query result.
 *
 * @param {Object} queryResult — output of catalog-loader/keyword-fallback/Mode B skill
 * @param {Object} [opts]
 * @param {string} [opts.mode]               'A' | 'B' | 'C' (defaults from queryResult.mode or 'B')
 * @param {string} [opts.llm_reasoning]      LLM rationale text (Mode B)
 * @param {Array<string>} [opts.composition_supporting]  supporting recipient IDs
 * @param {Array<string>} [opts.catalog_files_loaded]    which files were read
 * @param {string} [opts.invoked_via]        how this query entered ('slash_command' | 'mcp_call' | 'skill_tool' | 'programmatic')
 * @param {string} [opts.invoked_by]         human-readable invoker
 *
 * @returns {Object} audit record ready for insert
 */
function buildRecord(queryResult, opts = {}) {
  if (!queryResult || typeof queryResult !== 'object') {
    throw new E.AuditWriteFailed('queryResult is required');
  }

  const mode = opts.mode || queryResult.mode || 'B';
  if (!E.VALID_MODES.includes(mode)) {
    throw new E.AuditWriteFailed(`Invalid mode: ${mode}. Valid: ${E.VALID_MODES.join(',')}`);
  }

  const decision = queryResult.decision;
  if (decision && !E.VALID_DECISIONS.includes(decision)) {
    throw new E.AuditWriteFailed(`Invalid decision: ${decision}`);
  }

  // Truncate trigger for audit (don't store huge payloads)
  let trigger = (queryResult.trigger || '').toString();
  if (trigger.length > MAX_TRIGGER_AUDIT_LEN) {
    trigger = trigger.slice(0, MAX_TRIGGER_AUDIT_LEN);
  }
  let triggerNorm = (queryResult.trigger_normalized || '').toString();
  if (triggerNorm.length > MAX_TRIGGER_AUDIT_LEN) {
    triggerNorm = triggerNorm.slice(0, MAX_TRIGGER_AUDIT_LEN);
  }

  // Matched recipient ID — must be a non-empty string; else null
  let matchedRouteId = null;
  if (queryResult.matched) {
    const candidates = [
      queryResult.matched.id,
      queryResult.matched.recipient?.id,
      queryResult.matched.route?.id,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.length > 0) {
        matchedRouteId = c;
        break;
      }
    }
  }

  // Confidence — clamp to [0, 1]
  const confidence = queryResult.matched
    ? clamp(queryResult.matched.confidence || 0, 0, 1)
    : null;

  // Alternatives — normalize to {id, confidence, matched_token} shape
  const alternatives = Array.isArray(queryResult.alternatives)
    ? queryResult.alternatives
        .filter(a => a !== null && a !== undefined && typeof a === 'object')
        .slice(0, 10)
        .map(a => ({
          id: (typeof a.id === 'string' ? a.id : null)
              || (a.recipient && typeof a.recipient.id === 'string' ? a.recipient.id : null)
              || (a.route && typeof a.route.id === 'string' ? a.route.id : null)
              || null,
          confidence: clamp(a.confidence || 0, 0, 1),
          matched_token: (typeof a.matchedToken === 'string' ? a.matchedToken : null)
                       || (typeof a.matched_keyword === 'string' ? a.matched_keyword : null)
                       || (typeof a.matchedKeyword === 'string' ? a.matchedKeyword : null)
                       || null,
        }))
        .filter(a => a.id)
    : [];

  // Composition supporting — opt-in, validate IDs present
  let composition = null;
  if (Array.isArray(opts.composition_supporting)) {
    composition = opts.composition_supporting
                    .slice(0, MAX_SUPPORTING_COUNT)
                    .filter(id => typeof id === 'string' && id.length > 0);
  }

  // LLM reasoning — truncate
  let llmReasoning = null;
  if (typeof opts.llm_reasoning === 'string') {
    llmReasoning = opts.llm_reasoning.length > MAX_REASONING_LEN
                 ? opts.llm_reasoning.slice(0, MAX_REASONING_LEN) + '... [truncated]'
                 : opts.llm_reasoning;
  }

  // Caller role
  const callerRole = queryResult.caller_role
                  || queryResult.callerRole
                  || process.env.MCP_CALLER_ROLE
                  || null;

  // Metadata blob
  const metadata = {
    perf: queryResult.perf || {},
    flags: queryResult.flags || {},
    kind_filter: queryResult.kind_filter || null,
    invoked_via: opts.invoked_via || null,
    invoked_by: opts.invoked_by || null,
    config_thresholds: queryResult.config_thresholds || null,
  };

  return {
    trigger,
    trigger_normalized: triggerNorm,
    matched_route_id: matchedRouteId,
    confidence,
    alternatives,
    semantic_used: !!queryResult.semantic_used,
    caller_role: callerRole,
    latency_ms: typeof queryResult.latency_ms === 'number' ? queryResult.latency_ms : null,
    decision: decision || 'no_match',
    mode,
    llm_reasoning: llmReasoning,
    catalog_files_loaded: Array.isArray(opts.catalog_files_loaded) ? opts.catalog_files_loaded : null,
    composition_supporting: composition,
    metadata,
  };
}

/**
 * Write audit record via injected insertFn (typically mcp__supabase-ops__insert).
 *
 * @param {Object} record    audit record from buildRecord
 * @param {Function} insertFn async (table, rows[], options) => {inserted_count, returned_rows}
 *
 * @returns {Promise<{run_id, ts} | null>} returned_rows[0] or null on best-effort failure
 */
async function writeRecord(record, insertFn) {
  if (typeof insertFn !== 'function') {
    throw new E.AuditWriteFailed('insertFn is required (use mcp__supabase-ops__insert wrapper)');
  }
  try {
    const result = await insertFn('ops.resolver_decisions', [record], {
      returning: ['run_id', 'ts'],
    });
    if (!result || !Array.isArray(result.returned_rows) || result.returned_rows.length === 0) {
      return null;
    }
    return result.returned_rows[0];
  } catch (e) {
    // Best-effort — log but don't throw
    if (process.env.RESOLVER_DEBUG) {
      console.error('[resolver-v2 audit] write failed:', e.message);
    }
    return null;
  }
}

/**
 * Build batch of audit records (for backfill or test fixture).
 */
function buildBatch(queryResults, opts = {}) {
  return queryResults.map(r => buildRecord(r, opts));
}

/**
 * Validate audit record before write (used by write API for fast-fail).
 */
function validateRecord(record) {
  if (!record || typeof record !== 'object') return 'record must be object';
  if (!record.trigger || typeof record.trigger !== 'string') return 'trigger required';
  if (!E.VALID_MODES.includes(record.mode)) return `invalid mode: ${record.mode}`;
  if (record.decision && !E.VALID_DECISIONS.includes(record.decision)) return `invalid decision: ${record.decision}`;
  if (record.confidence !== null && (typeof record.confidence !== 'number' || record.confidence < 0 || record.confidence > 1)) {
    return 'confidence must be number in [0,1] or null';
  }
  return null;
}

module.exports = {
  buildRecord,
  writeRecord,
  buildBatch,
  validateRecord,
  clamp,
  MAX_TRIGGER_AUDIT_LEN,
  MAX_REASONING_LEN,
  MAX_SUPPORTING_COUNT,
};
