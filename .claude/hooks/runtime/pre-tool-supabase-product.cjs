#!/usr/bin/env node
'use strict';
/**
 * .claude/hooks/runtime/pre-tool-supabase-product.cjs
 *
 * Runtime session hook for the L0 Product-Supabase firewall.
 * Implements `.claude/hooks/pre-tool-supabase-product.md` (spec v1.0.0).
 *
 * Thin wrapper: read PreToolUse payload (stdin JSON) → delegate to the pure
 * decision engine (lib/product-firewall.cjs) → emit a Claude Code decision.
 *
 * Block contract (Claude Code PreToolUse): exit code 2 with the reason on
 * stderr blocks the tool and feeds the reason back to the model. We ALSO write
 * the structured decision to stdout (audit + tests + transcript). On allow:
 * exit 0.
 *
 * Caller role comes from MCP_CALLER_ROLE (same convention as the other runtime
 * hooks + the MCP servers). Target identification + fail-closed live in the lib.
 *
 * EVERY block emits a security log line (severity high) → runtime jsonl now;
 * a separate cron batches to ops.events / Telegram alert-router (spec §Observability).
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const LOG_DIR = path.join(REPO_ROOT, 'runtime');
const LOG_FILE = path.join(LOG_DIR, 'product-firewall-events.jsonl');

const { decide, PRODUCT_FIREWALL_VERSION, loadEnvFileRefs } = require('./lib/product-firewall.cjs');

// Self-configure from .env.local (the hook process doesn't inherit the shell
// env in Claude Desktop; the MCP wrappers source it, so the hook reads it too).
// PRODUCT_PROJECT_REF / ANALYTICS_PROJECT_REF here make the firewall PRECISE
// (explicit block + alert on Product; recognize analytics as safe) instead of
// relying on fail-closed alone. Absent file (worktree/CI) → fail-closed holds.
const ENV_FILE = path.join(REPO_ROOT, 'runtime', 'secrets', '.env.local');
const FILE_REFS = loadEnvFileRefs(ENV_FILE);

function readStdinSync() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function parsePayload() {
  try {
    const raw = readStdinSync();
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hashSessionId(s) {
  if (!s) return 'anon';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function tryAppendLog(entry) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', { encoding: 'utf8' });
  } catch {
    /* never fail the hook on a log error */
  }
}

function emitAllow(decision) {
  // Modern + legacy allow forms (exit 0). Both are read by Claude Code on allow.
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' },
      decision: 'allow',
      reason: decision && decision.reason,
    }) + '\n',
  );
  process.exit(0);
}

function emitBlock(decision, payload) {
  // Structured decision to stdout (audit/tests), human reason to stderr, exit 2.
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: decision.reason,
      },
      decision: 'block',
      reason: decision.reason,
      match_rule: decision.matchRule,
    }) + '\n',
  );
  process.stderr.write(`[pre-tool-supabase-product] BLOCKED (${decision.matchRule}): ${decision.reason}\n`);

  tryAppendLog({
    ts: new Date().toISOString(),
    hook: 'pre-tool-supabase-product',
    hook_version: PRODUCT_FIREWALL_VERSION,
    event_type: 'security.product_firewall_block',
    severity: 'high',
    tool: payload && (payload.tool_name || payload.toolName),
    match_rule: decision.matchRule,
    reason: decision.reason,
    caller_role: process.env.MCP_CALLER_ROLE || 'unknown',
    caller_session_hash: hashSessionId(payload && (payload.session_id || payload.sessionId)),
  });

  process.exit(2);
}

function main() {
  const payload = parsePayload();

  // No payload → cannot identify a target. Non-DB-shaped uncertainty allows
  // (the firewall fails closed for DB targets it CAN see, not for an empty
  // payload that would brick every tool). decide() with an empty input
  // returns allow('not-db-tool').
  const toolName = (payload && (payload.tool_name || payload.toolName)) || '';
  const toolInput = (payload && (payload.tool_input || payload.toolInput)) || {};

  let decision;
  try {
    decision = decide({
      toolName,
      toolInput,
      callerRole: process.env.MCP_CALLER_ROLE || null,
      env: { ...FILE_REFS, ...process.env }, // process.env wins; .env.local fills the gaps
    });
  } catch (err) {
    // Internal error while deciding. Fail closed ONLY if the call looks like it
    // could reach a DB; otherwise allow so a bug here can't brick the session.
    const looksDb =
      toolName === 'Bash' || /^mcp__(?:postgres|supabase)/i.test(toolName);
    if (looksDb) {
      return emitBlock(
        {
          decision: 'block',
          reason: `firewall internal error on a DB-shaped call — failing closed: ${err && err.message}`,
          matchRule: 'hook-error-fail-closed',
        },
        payload,
      );
    }
    return emitAllow({ reason: 'firewall internal error on non-DB call — allowed' });
  }

  if (decision.decision === 'block') return emitBlock(decision, payload);
  return emitAllow(decision);
}

main();
