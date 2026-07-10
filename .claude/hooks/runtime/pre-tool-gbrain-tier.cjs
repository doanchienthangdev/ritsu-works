#!/usr/bin/env node
'use strict';
/**
 * .claude/hooks/runtime/pre-tool-gbrain-tier.cjs
 *
 * Runtime PreToolUse hook for the per-human gbrain tier gate.
 * Implements `.claude/hooks/pre-tool-gbrain-tier.md` (capability multi-user-auth,
 * Sprint 2 — ITEM B). Thin wrapper: read the PreToolUse payload → self-configure
 * from .env.local (the hook process does NOT inherit the shell env in Claude
 * Desktop; the MCP wrappers source .env.local, so this hook reads it too) → read
 * the operator tier from the access token supabase-ops persists → delegate to the
 * pure engine (lib/gbrain-tier-gate.cjs) → emit a Claude Code decision.
 *
 * Block contract (Claude Code PreToolUse): exit code 2 with the reason on stderr
 * blocks the tool. Allow: exit 0. We also write a structured decision to stdout.
 *
 * Posture:
 *   - service-key mode / non-gbrain tool / no .env.local anywhere (a fresh clone or
 *     CI — i.e. no per-human install at all) → fast ALLOW (no-op; default behavior
 *     byte-identical).
 *   - per-human + gbrain tool → committed to FAIL-CLOSED: a bad/expired/absent
 *     token, a disallowed tier, OR an internal error (e.g. a locally-corrupted
 *     operator-tiers.yaml) all BLOCK. Only an explicit engine 'allow' (owner/admin)
 *     passes. (Genuine cold-start before supabase-ops persists self-resolves on
 *     retry; gbrain calls are interactive, well after boot.)
 *
 * WORKTREES (fixed 2026-07-10): `runtime/` is local-only and absent from git
 * worktrees, so resolving .env.local relative to this file put it at
 * <worktree>/runtime/secrets/.env.local — which never exists. readEnvLocal() then
 * returned {}, authMode defaulted to 'service-key', and the gate SILENTLY NO-OPPED
 * for every gbrain call made from a worktree session: a fail-OPEN on the one
 * per-human surface that has no server-side backstop. We now walk out of
 * `.claude/worktrees/<name>/` to the main root to find .env.local — the same marker
 * scripts/cross-tier/check-analytics-sync-health.cjs uses. A machine with no
 * per-human install still no-ops, exactly as before.
 *
 * Only .env.local is main-root-resolved: operator-tiers.yaml is committed (so the
 * worktree checkout has it) and the event log stays worktree-local.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * The main repo root — `dir` unless it sits inside `.claude/worktrees/<name>/`, in
 * which case it's the path above that marker. Pure; `dir` injected for tests.
 */
function resolveMainRoot(dir = REPO_ROOT) {
  const marker = `${path.sep}.claude${path.sep}worktrees${path.sep}`;
  const i = dir.indexOf(marker);
  return i === -1 ? dir : dir.slice(0, i);
}

/**
 * Where .env.local lives: the tree's own copy if it has one, else the main root's.
 * Returns null when neither exists — the caller treats that as "no per-human
 * install" and no-ops. Never invents a path.
 */
function resolveEnvFile(repoRoot = REPO_ROOT) {
  const local = path.join(repoRoot, 'runtime', 'secrets', '.env.local');
  if (fs.existsSync(local)) return local;
  const main = path.join(resolveMainRoot(repoRoot), 'runtime', 'secrets', '.env.local');
  return fs.existsSync(main) ? main : null;
}

const TIERS_YAML = path.join(REPO_ROOT, 'knowledge', 'operator-tiers.yaml');
const LOG_DIR = path.join(REPO_ROOT, 'runtime');
const LOG_FILE = path.join(LOG_DIR, 'gbrain-tier-gate-events.jsonl');

const { decideGbrainTier, GBRAIN_TOOL_RE, GBRAIN_TIER_GATE_VERSION } = require('./lib/gbrain-tier-gate.cjs');

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

/**
 * Minimal .env.local reader (regex; tolerant). The hook can't assume shell env.
 * With no argument it resolves the file itself (worktree-aware). An explicitly
 * passed path is used verbatim — no fallback — so tests stay hermetic.
 */
function readEnvLocal(filePath = resolveEnvFile()) {
  const out = {};
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return out; // no per-human install anywhere → caller treats as service-key (no-op)
  }
  const get = (key) => {
    // Value chars stop at quote/newline/hash; the post-`=` whitespace is HORIZONTAL
    // only ([ \t], not \s) so an empty-valued key (`KEY=\n`) does NOT greedily
    // swallow the next line's content as its value.
    // An optional `export ` prefix is honored: the .mcp.json wrappers source
    // .env.local via `set -a; . .env.local`, which exports BOTH `KEY=v` and
    // `export KEY=v`. Without this, an honest operator using the common
    // `export RITSU_AUTH_MODE=per-human` style would have RITSU_AUTH_MODE read as
    // null here → the gate would silently no-op to service-key while the ops +
    // analytics MCPs DID enforce (audit 2026-06-30 finding C2-keystone-3 fail-open).
    const m = raw.match(new RegExp('^[ \\t]*(?:export[ \\t]+)?' + key + "[ \\t]*=[ \\t]*[\"']?([^\"'\\n#]+)", 'm'));
    return m ? m[1].trim() : null;
  };
  for (const k of ['RITSU_AUTH_MODE', 'RITSU_OPERATOR_REFRESH_TOKEN_FILE', 'RITSU_OPERATOR_ACCESS_TOKEN']) {
    const v = get(k);
    if (v) out[k] = v;
  }
  return out;
}

/** Read the access token: inline env first, else the credential file's access_token. */
function readAccessToken(env) {
  if (env.RITSU_OPERATOR_ACCESS_TOKEN) return env.RITSU_OPERATOR_ACCESS_TOKEN;
  const file = env.RITSU_OPERATOR_REFRESH_TOKEN_FILE;
  if (!file) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (typeof parsed.access_token === 'string' && parsed.access_token) return parsed.access_token;
  } catch {
    /* missing/corrupt → no token (fail-closed downstream) */
  }
  return null;
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

function emitAllow(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' },
      decision: 'allow',
      reason,
    }) + '\n',
  );
  process.exit(0);
}

function emitBlock(decision, payload) {
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
  process.stderr.write(`[pre-tool-gbrain-tier] BLOCKED (${decision.matchRule}): ${decision.reason}\n`);
  tryAppendLog({
    ts: new Date().toISOString(),
    hook: 'pre-tool-gbrain-tier',
    hook_version: GBRAIN_TIER_GATE_VERSION,
    event_type: 'security.gbrain_tier_block',
    severity: 'medium',
    tool: payload && (payload.tool_name || payload.toolName),
    match_rule: decision.matchRule,
    tier: decision.tier,
    caller_session_hash: hashSessionId(payload && (payload.session_id || payload.sessionId)),
  });
  process.exit(2);
}

function main() {
  const payload = parsePayload();
  const toolName = (payload && (payload.tool_name || payload.toolName)) || '';

  const env = readEnvLocal();
  const authMode = env.RITSU_AUTH_MODE || 'service-key';

  // Fast, safe exits (allow) — service-key, non-gbrain, or no per-human config.
  if (authMode !== 'per-human') return emitAllow('service-key mode — gbrain tier gate is a no-op');
  if (!GBRAIN_TOOL_RE.test(toolName)) return emitAllow('not a gbrain tool');

  // Committed to enforcing: per-human + gbrain tool → FAIL-CLOSED on any error.
  try {
    const yaml = require('js-yaml');
    const tiersDoc = yaml.load(fs.readFileSync(TIERS_YAML, 'utf8'));
    const accessToken = readAccessToken(env);
    const decision = decideGbrainTier({
      toolName,
      authMode,
      accessToken,
      tiersDoc,
      nowMs: Date.now(),
    });
    if (decision.decision === 'block') return emitBlock(decision, payload);
    return emitAllow(decision.reason);
  } catch (err) {
    // A user-corrupted operator-tiers.yaml (or any internal error) must NOT become
    // a bypass: fail-closed for a per-human gbrain call.
    const hint =
      err && err.code === 'MODULE_NOT_FOUND'
        ? ' (dependencies missing — run `pnpm install` at the repo root)'
        : '';
    return emitBlock(
      {
        reason: `gbrain tier gate internal error on a per-human gbrain call — failing closed: ${err && err.message}${hint}`,
        matchRule: 'hook-error-fail-closed',
        tier: null,
      },
      payload,
    );
  }
}

// Exported for unit tests (the pure-ish I/O helpers). main() runs only when the
// hook is invoked directly by Claude Code (not when required by a test).
module.exports = { readEnvLocal, readAccessToken, resolveMainRoot, resolveEnvFile };

if (require.main === module) main();
