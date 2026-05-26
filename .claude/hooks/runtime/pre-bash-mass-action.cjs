#!/usr/bin/env node
'use strict';
/**
 * .claude/hooks/runtime/pre-bash-mass-action.cjs
 *
 * Runtime implementation of pre-bash-mass-action hook spec
 * (.claude/hooks/pre-bash-mass-action.md). Cherry-pick #13 of
 * capability resolver-v3-jit-loading.
 *
 * Behavior:
 *   - Reads hook payload JSON from stdin (Claude Code PreToolUse contract)
 *   - If tool_name !== 'Bash' OR command < 20 chars → silent pass (default allow)
 *   - Else: runs lightweight keyword pre-filter against recipient catalog
 *     via Node interop call to scripts/resolver-v2/keyword-fallback.cjs
 *   - If a recipient match exists → append 1 line to local JSONL log
 *     (runtime/resolver-v3-bypass-events.jsonl — gitignored)
 *   - Hook ALWAYS returns allow (observation-only; never blocks)
 *
 * Latency budget: <50ms warm path; cold first call ~150ms (catalog load).
 *
 * NOT a DB write — local log only. Separate cron will batch-sync to
 * ops.events.resolver.bypass_detected. Keeps hook fast.
 *
 * Logs are gitignored via existing runtime/ pattern; .gitignore
 * already covers runtime/* except runtime/README.md.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const LOG_DIR = path.join(REPO_ROOT, 'runtime');
const LOG_FILE = path.join(LOG_DIR, 'resolver-v3-bypass-events.jsonl');
const MIN_CMD_LEN = 20;

function emitAllow() {
  // Claude Code hook contract: stdout JSON with decision.
  // 'allow' / 'undefined' = pass through. Hook MUST exit 0.
  process.stdout.write(JSON.stringify({ decision: 'allow' }) + '\n');
  process.exit(0);
}

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

function tryAppendLog(entry) {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', { encoding: 'utf8' });
  } catch {
    // Silent — observation-only; never block on log failure
  }
}

function hashSessionId(s) {
  if (!s) return 'anon';
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function main() {
  const payload = parsePayload();
  if (!payload) return emitAllow();

  // Claude Code passes { tool_name, tool_input, session_id, ... } per PreToolUse spec
  const toolName = payload.tool_name || payload.toolName;
  if (toolName !== 'Bash') return emitAllow();

  const cmd = (payload.tool_input?.command || payload.toolInput?.command || '').toString();
  if (cmd.length < MIN_CMD_LEN) return emitAllow();

  // Lightweight intent extraction — first 200 chars of command as proxy.
  // (Smarter regex-based intent extraction TODO future iteration.)
  const intent = cmd.slice(0, 200).trim();

  // Try keyword-fallback match (require triggers catalog load; cached after first call).
  let matchedRecipients = [];
  try {
    const { match } = require(path.join(
      REPO_ROOT,
      'scripts/resolver-v2/keyword-fallback.cjs',
    ));
    const result = match({
      trigger: intent,
      callerRole: process.env.MCP_CALLER_ROLE || null,
    });
    if (result.matched) {
      matchedRecipients.push({
        id: result.matched.recipient.id,
        confidence: result.matched.confidence,
      });
    }
    for (const alt of (result.alternatives || []).slice(0, 2)) {
      matchedRecipients.push({
        id: alt.recipient.id,
        confidence: alt.confidence,
      });
    }
  } catch {
    // catalog load failure → no bypass detection this call; pass through
    return emitAllow();
  }

  if (matchedRecipients.length === 0) {
    return emitAllow();
  }

  // Bypass detected — log + pass through
  tryAppendLog({
    ts: new Date().toISOString(),
    hook: 'pre-bash-mass-action',
    event_type: 'resolver.bypass_detected',
    tool: 'Bash',
    cmd_truncated: intent,
    would_have_matched: matchedRecipients,
    caller_role: process.env.MCP_CALLER_ROLE || 'unknown',
    caller_session_hash: hashSessionId(payload.session_id || payload.sessionId || ''),
  });

  return emitAllow();
}

main();
