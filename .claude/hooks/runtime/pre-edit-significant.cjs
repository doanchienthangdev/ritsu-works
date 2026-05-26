#!/usr/bin/env node
'use strict';
// .claude/hooks/runtime/pre-edit-significant.cjs
//
// Runtime implementation of pre-edit-significant hook spec
// (.claude/hooks/pre-edit-significant.md). Cherry-pick #13 of
// capability resolver-v3-jit-loading. Companion to pre-bash-mass-action.cjs
// for Edit/Write tools.
//
// Behavior:
//   - Reads hook payload JSON from stdin
//   - If tool_name not in [Edit, Write]: silent pass
//   - Checks significance threshold: workforce-substrate path match
//     (skills, capabilities specs, SOP flow.yaml, commands, hooks,
//     agents, recipients, knowledge yaml) OR content size threshold
//     (>100 chars Edit / >500 chars Write)
//   - If significant: extract path-based intent, run keyword-fallback,
//     log bypass to runtime/resolver-v3-bypass-events.jsonl if match found
//   - Hook ALWAYS returns allow (observation-only; never blocks)
//
// Note: uses line comments (//) instead of block comments (/* */)
// throughout — block comments break on the regex literal patterns below
// that contain // /. * sequences.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const LOG_DIR = path.join(REPO_ROOT, 'runtime');
const LOG_FILE = path.join(LOG_DIR, 'resolver-v3-bypass-events.jsonl');

const EDIT_SIGNIFICANT_CHARS = 100;
const WRITE_SIGNIFICANT_CHARS = 500;

const WORKFORCE_PATH_PATTERNS = [
  /06-ai-ops\/skills\/.+\/SKILL\.md$/,
  /wiki\/capabilities\/.+\/spec\.md$/,
  /.+\/sops\/.+\/flow\.yaml$/,
  /\.claude\/commands\/.+\.md$/,
  /\.claude\/hooks\/.+\.md$/,
  /\.claude\/agents\/.+\.md$/,
  /knowledge\/recipients\/.+\.md$/,
  /knowledge\/.+\.yaml$/,
];

function emitAllow() {
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
    // ignore
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

function isWorkforcePath(filePath) {
  if (!filePath) return false;
  return WORKFORCE_PATH_PATTERNS.some((re) => re.test(filePath));
}

// Convert file path to natural-language intent for keyword match.
// Example: 06-ai-ops/skills/customer-onboarding/SKILL.md
//   --> "customer onboarding skill"
function pathToIntent(filePath) {
  if (!filePath) return '';
  const basename = path.basename(filePath, path.extname(filePath));
  const dir = path.dirname(filePath);
  // Last 2 dir parts as context
  const dirParts = dir.split(path.sep).filter(Boolean).slice(-2);
  const tokens = [...dirParts, basename]
    .join(' ')
    .replace(/[_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return tokens.slice(0, 200);
}

function main() {
  const payload = parsePayload();
  if (!payload) return emitAllow();

  const toolName = payload.tool_name || payload.toolName;
  if (toolName !== 'Edit' && toolName !== 'Write') return emitAllow();

  const toolInput = payload.tool_input || payload.toolInput || {};
  const filePath = toolInput.file_path || '';
  if (!filePath) return emitAllow();

  // Significance check
  let significantBySize = false;
  if (toolName === 'Edit') {
    const newStr = (toolInput.new_string || '').toString();
    if (newStr.length >= EDIT_SIGNIFICANT_CHARS) significantBySize = true;
  } else if (toolName === 'Write') {
    const content = (toolInput.content || '').toString();
    if (content.length >= WRITE_SIGNIFICANT_CHARS) significantBySize = true;
  }

  const significantByPath = isWorkforcePath(filePath);

  if (!significantByPath && !significantBySize) return emitAllow();

  // Extract intent + check keyword-fallback for recipient match
  const intent = pathToIntent(filePath);
  if (!intent) return emitAllow();

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
    return emitAllow();
  }

  if (matchedRecipients.length === 0) return emitAllow();

  tryAppendLog({
    ts: new Date().toISOString(),
    hook: 'pre-edit-significant',
    event_type: 'resolver.bypass_detected',
    tool: toolName,
    file_path: filePath,
    intent_extracted: intent,
    significance: { by_path: significantByPath, by_size: significantBySize },
    would_have_matched: matchedRecipients,
    caller_role: process.env.MCP_CALLER_ROLE || 'unknown',
    caller_session_hash: hashSessionId(payload.session_id || payload.sessionId || ''),
  });

  return emitAllow();
}

main();
