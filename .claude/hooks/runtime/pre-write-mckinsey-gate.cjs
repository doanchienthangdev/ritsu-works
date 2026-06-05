#!/usr/bin/env node
'use strict';
// .claude/hooks/runtime/pre-write-mckinsey-gate.cjs
//
// Runtime implementation of the pre-write-mckinsey-gate hook spec
// (.claude/hooks/pre-write-mckinsey-gate.md). Capability thinking-toolkit v3.1.
//
// WHY: the /think mckinsey run-folder discipline gate (mckinsey-run.cjs) was
// OPT-IN — nothing fired it, so an undisciplined run could narrate a Sell with
// open workplan rows / no dissent / no pre-wire and never be caught. This hook
// AUTO-RUNS that gate at the exact moment a Sell artifact is written
// (.archives/mckinsey/<slug>/communication.md), converting the gate from
// "the agent must remember to run it" into "it runs itself + leaves a record".
//
// PHILOSOPHY: OBSERVATION-ONLY — it NEVER blocks (matching the repo's
// pre-bash-mass-action / pre-edit-significant hooks; only the L0 product
// firewall blocks). A false positive here must not stop the founder's Sell.
// On a gate failure it (1) appends an audit row to
// runtime/mckinsey-gate-events.jsonl (cron → ops.events → alert-router, same
// path as the bypass-events log) and (2) writes a visible stderr advisory.
// "Discipline, not proof": it can't grade the thinking; it makes an UNGATED
// Sell auditable. To HARDEN to blocking, a founder flips BLOCK_ON_FAIL below
// (or returns decision:block) — deliberately left off for unattended safety.
//
// Behavior:
//   - Reads hook payload JSON from stdin.
//   - tool_name not in [Write, Edit] → silent allow.
//   - file_path not a mckinsey Sell artifact (…/.archives/mckinsey/<slug>/
//     communication.md) → silent allow.
//   - else: derive (root, slug) FROM THE PATH (so it works in both the main repo
//     and a worktree), run checkRun(root, slug, {beforeSell:true}); on errors,
//     log + stderr-advise; ALWAYS allow.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const LOG_DIR = path.join(REPO_ROOT, 'runtime');
const LOG_FILE = path.join(LOG_DIR, 'mckinsey-gate-events.jsonl');
const BLOCK_ON_FAIL = false; // unattended-safe default; flip to true to block an ungated Sell.

// …/.archives/mckinsey/<slug>/communication.md — capture (root, slug). Handles
// absolute (main repo OR worktree) and repo-relative paths.
const SELL_RE = /^(.*?)\/?\.archives\/mckinsey\/([a-z0-9][a-z0-9-]*)\/communication\.md$/;

function emit(decision, extra) {
  process.stdout.write(JSON.stringify(Object.assign({ decision }, extra || {})) + '\n');
  process.exit(0);
}
function emitAllow() { emit('allow'); }

function readStdinSync() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}
function parsePayload() {
  try { const raw = readStdinSync(); return raw.trim() ? JSON.parse(raw) : null; } catch { return null; }
}
function tryAppendLog(entry) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', { encoding: 'utf8' });
  } catch { /* ignore */ }
}
function hashSessionId(s) {
  if (!s) return 'anon';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/**
 * Pure decision core (exported for tests). Given a hook payload + the repo root
 * (where mckinsey-run.cjs lives), returns:
 *   { match: false }                         — not a mckinsey Sell write; allow silently
 *   { match: true, slug, root, result }      — a Sell write; result = checkRun(...) | null
 * `result` is null only if the helper couldn't load (partial checkout → fail open).
 */
function evaluate(payload, repoRoot) {
  if (!payload) return { match: false };
  const toolName = payload.tool_name || payload.toolName;
  if (toolName !== 'Write' && toolName !== 'Edit') return { match: false };
  const toolInput = payload.tool_input || payload.toolInput || {};
  const filePath = toolInput.file_path || '';
  if (!filePath) return { match: false };
  const m = filePath.match(SELL_RE);
  if (!m) return { match: false };
  const root = m[1] && m[1].trim() ? m[1] : repoRoot;
  const slug = m[2];
  try {
    const { checkRun } = require(path.join(repoRoot, 'scripts/thinking-toolkit/mckinsey-run.cjs'));
    return { match: true, slug, root, result: checkRun(root, slug, { beforeSell: true }) };
  } catch {
    return { match: true, slug, root, result: null }; // helper unavailable → fail open
  }
}

function main() {
  const payload = parsePayload();
  const ev = evaluate(payload, REPO_ROOT);
  if (!ev.match || !ev.result || ev.result.errors.length === 0) return emitAllow();

  const result = ev.result;
  // Ungated Sell — record it (audit) + advise (stderr). Never block by default.
  tryAppendLog({
    ts: new Date().toISOString(),
    hook: 'pre-write-mckinsey-gate',
    event_type: 'mckinsey.sell_gate_failed',
    tool: payload.tool_name || payload.toolName,
    run_slug: ev.slug,
    file_path: (payload.tool_input || payload.toolInput || {}).file_path,
    error_count: result.errors.length,
    errors: result.errors,
    warning_count: result.warnings.length,
    caller_role: process.env.MCP_CALLER_ROLE || 'unknown',
    caller_session_hash: hashSessionId(payload.session_id || payload.sessionId || ''),
  });
  process.stderr.write(
    `[mckinsey-gate] Sell artifact written for run '${ev.slug}' but the --before-sell gate FAILS ` +
    `(${result.errors.length} issue(s)):\n` +
    result.errors.map((e) => `  - ${e}`).join('\n') +
    `\nFix the run folder (or use --depth=quick for a small problem). ` +
    `Logged to runtime/mckinsey-gate-events.jsonl. [advisory — not blocked]\n`
  );

  if (BLOCK_ON_FAIL) {
    return emit('block', { reason: `mckinsey --before-sell gate fails: ${result.errors.join('; ')}` });
  }
  return emitAllow();
}

if (require.main === module) main();

module.exports = { evaluate, SELL_RE };
