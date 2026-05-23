'use strict';
// Resolver engine — audit module.
// Per .archives/cla/resolver/spec.md §11.7.
//
// Writes one row to ops.resolver_decisions per query.
// Best-effort: if DB unreachable, defers write to local fallback (.archives/resolver-runs/).

const fs = require('fs');
const path = require('path');
const E = require('./errors.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const LOCAL_FALLBACK_DIR = path.join(REPO_ROOT, '.archives', 'resolver-runs');

/**
 * Build the audit record from a query result.
 */
function buildRecord(queryResult) {
  const matched = queryResult.matched;
  return {
    trigger: queryResult.trigger,
    trigger_normalized: queryResult.trigger_normalized,
    matched_route_id: matched ? matched.route.id : null,
    confidence: matched ? matched.confidence : null,
    alternatives: (queryResult.alternatives || []).slice(0, 5).map(c => ({
      id: c.route.id,
      confidence: c.confidence,
      matched_keyword: c.matchedKeyword,
    })),
    semantic_used: !!queryResult.semantic_used,
    caller_role: queryResult.caller_role,
    latency_ms: queryResult.latency_ms,
    decision: queryResult.decision,
    metadata: {
      perf: queryResult.perf,
      flags: queryResult.flags,
    },
  };
}

/**
 * Write to ops.resolver_decisions via supabase-ops MCP insert helper.
 * Returns { written: true } on success; otherwise defers and returns { written: false, deferred: <path> }.
 *
 * For v1.0 we use a simple node-postgres or direct HTTP-shim approach. To
 * avoid hard-coupling to MCP, this module exposes a writeRecord() function
 * that callers may override by injecting an `insertFn` parameter.
 */
async function writeRecord(record, opts = {}) {
  const insertFn = opts.insertFn || _defaultDbInsert;
  try {
    await insertFn(record);
    return { written: true };
  } catch (e) {
    // Defer to local fallback
    try {
      if (!fs.existsSync(LOCAL_FALLBACK_DIR)) {
        fs.mkdirSync(LOCAL_FALLBACK_DIR, { recursive: true });
      }
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
      const fp = path.join(LOCAL_FALLBACK_DIR, fileName);
      fs.writeFileSync(fp, JSON.stringify({ record, error: e.message, ts: new Date().toISOString() }, null, 2));
      return { written: false, deferred: fp, error: e.message };
    } catch (writeErr) {
      // Last-resort: log + drop
      console.error('[resolver] audit defer failed:', writeErr.message);
      return { written: false, deferred: null, error: e.message + '; defer also failed: ' + writeErr.message };
    }
  }
}

/**
 * Default DB insert — uses fetch against Supabase REST endpoint.
 * Requires SUPABASE_URL + SUPABASE_ACCESS_TOKEN env vars (loaded from runtime/secrets/.env.local).
 * For v1.0 mock-friendly: caller can inject `insertFn`.
 */
async function _defaultDbInsert(record) {
  const url = process.env.SUPABASE_URL;
  const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !token) {
    throw new E.OpsAuditWriteFailed('SUPABASE_URL or SUPABASE_ACCESS_TOKEN env not set');
  }
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/resolver_decisions`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'apikey': token,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new E.OpsAuditWriteFailed(`HTTP ${res.status}: ${body}`);
  }
}

/**
 * Bulk replay deferred writes. Called by cron / daily job.
 */
async function replayDeferred(opts = {}) {
  if (!fs.existsSync(LOCAL_FALLBACK_DIR)) return { replayed: 0 };
  const files = fs.readdirSync(LOCAL_FALLBACK_DIR).filter(f => f.endsWith('.json'));
  let ok = 0;
  let fail = 0;
  for (const f of files) {
    const fp = path.join(LOCAL_FALLBACK_DIR, f);
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const r = await writeRecord(data.record, opts);
      if (r.written) {
        fs.unlinkSync(fp);
        ok += 1;
      } else {
        fail += 1;
      }
    } catch (e) {
      fail += 1;
    }
  }
  return { replayed: ok, failed: fail };
}

module.exports = { buildRecord, writeRecord, replayDeferred };
