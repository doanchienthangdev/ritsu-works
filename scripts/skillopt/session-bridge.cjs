#!/usr/bin/env node
'use strict';
/**
 * scripts/skillopt/session-bridge.cjs — SkillOpt file-queue session bridge.
 *
 * Capability: evolve v1.1 (SkillOpt integration).
 * Spec: wiki/capabilities/evolve/spec.md §19.6 (after Phase 8 promotion;
 *       current draft .archives/cla/evolve-extend-skillopt/spec.md).
 * Protocol: scripts/skillopt/queue-protocol.md.
 *
 * This is a STATELESS CLI HELPER, not a long-running daemon. The
 * skillopt-runner skill (Sprint 2 deliverable) drives the polling loop
 * from the session and uses this script to:
 *   - persist state.json across session message boundaries
 *   - atomically write response files (tmp + rename per UPSTREAM-DEVIATION.md
 *     bridge contract)
 *   - track IPC dedup (which UUIDs are batched vs completed) so a --resume
 *     after a rate-limit pause doesn't re-dispatch in-flight requests
 *   - check subprocess liveness (SkillOpt train.py PID)
 *
 * The actual `Task({subagent_type: ...})` fan-out is issued by the session
 * model (skillopt-runner skill), NOT by this script. This script never
 * makes LLM calls — that would violate the subscription invariant.
 *
 * Verbs (all read QUEUE_DIR from --queue-dir or env QUEUE_DIR):
 *   init --pid=<n>              create state.json for a new run
 *   scan                        list pending request UUIDs (one per line)
 *   request <uuid>              print the request file JSON to stdout
 *   batch-start <uuid> [uuid…]  record batch_uuids in state.json
 *   write-response <uuid>       read response JSON from stdin, atomic write
 *   batch-complete <uuid> [uuid…]  append to completed_uuids
 *   state                       print state.json
 *   subprocess-alive            exit 0 if state.subprocess_pid alive
 *   pause-rate-limit --until=<iso>   set phase=rate_limit_paused
 *   resume-check                print current phase; exit 0 unless aborted
 *   cleanup                     wipe llm-requests/, llm-responses/, state.json
 *
 * Exit codes:
 *   0 = success
 *   1 = generic error (message to stderr)
 *   2 = bad usage (unknown verb / missing arg)
 *   3 = state inconsistency (e.g. dedup violation, missing state.json)
 */

const fs = require('fs');
const path = require('path');
const process = require('process');

// ── arg parsing ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const verb = argv.shift();

function getFlag(name) {
  const prefix = `--${name}=`;
  const found = argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function positionalArgs() {
  return argv.filter((a) => !a.startsWith('--'));
}

const QUEUE_DIR = getFlag('queue-dir') || process.env.QUEUE_DIR;
if (!QUEUE_DIR && verb !== 'help' && verb !== undefined) {
  die(2, `session-bridge: --queue-dir or env QUEUE_DIR is required`);
}

const REQ_DIR = QUEUE_DIR && path.join(QUEUE_DIR, 'llm-requests');
const RESP_DIR = QUEUE_DIR && path.join(QUEUE_DIR, 'llm-responses');
const STATE_PATH = QUEUE_DIR && path.join(QUEUE_DIR, 'state.json');

// ── helpers ──────────────────────────────────────────────────────────────────

function die(code, msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

function ensureDirs() {
  if (!QUEUE_DIR) die(2, 'session-bridge: QUEUE_DIR unset');
  if (!path.isAbsolute(QUEUE_DIR)) {
    die(2, `session-bridge: QUEUE_DIR must be absolute (got: ${QUEUE_DIR})`);
  }
  fs.mkdirSync(REQ_DIR, { recursive: true });
  fs.mkdirSync(RESP_DIR, { recursive: true });
}

function readState() {
  if (!fs.existsSync(STATE_PATH)) {
    die(3, `session-bridge: state.json missing at ${STATE_PATH}; run 'init' first`);
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function writeStateAtomic(state) {
  const tmp = `${STATE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_PATH);
}

function atomicWrite(filePath, contents) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, contents);
  fs.renameSync(tmp, filePath);
}

function nowIso() {
  return new Date().toISOString();
}

// R18 — orphaned .tmp file sweep. Used by `init` to handle leftovers from
// crashed prior runs. Returns count of files unlinked. Idempotent + safe to
// call on empty dirs.
function sweepOrphanedTmpFiles() {
  const cutoffMs = Date.now() - 5 * 60 * 1000;   // 5 minutes ago
  let swept = 0;
  for (const dir of [REQ_DIR, RESP_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const fname of fs.readdirSync(dir)) {
      if (!fname.endsWith('.json.tmp')) continue;
      const full = path.join(dir, fname);
      try {
        const stat = fs.statSync(full);
        if (stat.mtimeMs < cutoffMs) {
          fs.unlinkSync(full);
          swept += 1;
        }
      } catch {
        // file vanished between readdir and stat — fine
      }
    }
  }
  return swept;
}

function isProcessAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const UUID_RE = /^[0-9a-f]{32}$/;

function validateUuid(u) {
  if (!UUID_RE.test(u)) {
    die(2, `session-bridge: invalid UUID format: ${JSON.stringify(u)}`);
  }
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { buf += chunk; });
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', reject);
  });
}

// ── verbs ────────────────────────────────────────────────────────────────────

async function verbInit() {
  const pid = parseInt(getFlag('pid') || '0', 10);
  if (!pid) die(2, 'session-bridge init: --pid=<n> required (SkillOpt train.py subprocess PID)');
  ensureDirs();
  if (fs.existsSync(STATE_PATH)) {
    die(3, `session-bridge init: state.json already exists; cleanup first if reinitializing`);
  }
  // R18 — orphaned .tmp sweep (Sprint 3 addition). Any req-*.json.tmp or
  // resp-*.json.tmp older than 5 minutes is leftover from a prior crashed
  // run where a write started but never rename'd. The 5-minute threshold is
  // conservative — a healthy bridge write completes in milliseconds. Per
  // spec §19.6 R18, the runner-spec/sprint-plan §3.5.
  const orphans = sweepOrphanedTmpFiles();
  const state = {
    run_id: path.basename(QUEUE_DIR),
    started_at: nowIso(),
    subprocess_pid: pid,
    phase: 'idle',
    batch_uuids: [],
    completed_uuids: [],
    rate_limit_resume_after: null,
    totals: { requests_dispatched: 0, responses_written: 0, errors: 0 },
    orphans_swept_at_init: orphans,
  };
  writeStateAtomic(state);
  process.stdout.write(`${STATE_PATH}\n`);
  if (orphans > 0) {
    process.stderr.write(`[session-bridge] init swept ${orphans} orphaned .tmp file(s) >5min old\n`);
  }
}

function verbScan() {
  if (!fs.existsSync(REQ_DIR)) return;
  const state = fs.existsSync(STATE_PATH) ? readState() : null;
  const completed = new Set(state ? state.completed_uuids : []);
  const batched = new Set(state ? state.batch_uuids : []);
  const entries = fs.readdirSync(REQ_DIR);
  const pending = [];
  for (const fname of entries) {
    const m = fname.match(/^req-([0-9a-f]{32})\.json$/);
    if (!m) continue;
    const uuid = m[1];
    if (completed.has(uuid) || batched.has(uuid)) continue;
    pending.push(uuid);
  }
  pending.sort();
  if (pending.length > 0) process.stdout.write(pending.join('\n') + '\n');
}

function verbRequest() {
  const [uuid] = positionalArgs();
  if (!uuid) die(2, 'session-bridge request: <uuid> argument required');
  validateUuid(uuid);
  const p = path.join(REQ_DIR, `req-${uuid}.json`);
  if (!fs.existsSync(p)) die(3, `session-bridge request: not found ${p}`);
  process.stdout.write(fs.readFileSync(p, 'utf8'));
}

function verbBatchStart() {
  const uuids = positionalArgs();
  if (uuids.length === 0) die(2, 'session-bridge batch-start: at least one <uuid> required');
  uuids.forEach(validateUuid);
  const state = readState();
  // IPC dedup: refuse to add a UUID already in completed_uuids
  for (const u of uuids) {
    if (state.completed_uuids.includes(u)) {
      die(3, `session-bridge batch-start: dedup violation — ${u} is already in completed_uuids`);
    }
  }
  state.phase = 'dispatching';
  state.batch_uuids = uuids.slice();
  state.totals.requests_dispatched += uuids.length;
  writeStateAtomic(state);
  process.stdout.write(`batch ${uuids.length} | totals ${JSON.stringify(state.totals)}\n`);
}

async function verbWriteResponse() {
  const [uuid] = positionalArgs();
  if (!uuid) die(2, 'session-bridge write-response: <uuid> argument required');
  validateUuid(uuid);
  const respJson = await readStdin();
  // Parse + validate the response is well-formed JSON before writing.
  // A malformed response would crash the Python poll; better to fail loudly here.
  let parsed;
  try {
    parsed = JSON.parse(respJson);
  } catch (e) {
    die(2, `session-bridge write-response: stdin is not valid JSON (${e.message})`);
  }
  if (parsed.id !== uuid) {
    die(3, `session-bridge write-response: response.id (${parsed.id}) does not match arg (${uuid})`);
  }
  if (parsed.text === undefined && parsed.error === undefined) {
    die(3, `session-bridge write-response: response must have either 'text' or 'error'`);
  }
  // Inject server-side fields (ts always; kind echoed from request if missing).
  // Per queue-protocol.md §"Response schema" — bridge owns these.
  if (parsed.ts === undefined) parsed.ts = Date.now() / 1000;
  if (parsed.kind === undefined) {
    const reqPath = path.join(REQ_DIR, `req-${uuid}.json`);
    if (fs.existsSync(reqPath)) {
      try {
        const req = JSON.parse(fs.readFileSync(reqPath, 'utf8'));
        if (typeof req.kind === 'string') parsed.kind = req.kind;
      } catch { /* leave kind absent if request unreadable */ }
    }
  }
  ensureDirs();
  atomicWrite(path.join(RESP_DIR, `resp-${uuid}.json`), JSON.stringify(parsed));
  const state = readState();
  state.totals.responses_written += 1;
  if (parsed.error) state.totals.errors += 1;
  writeStateAtomic(state);
}

function verbBatchComplete() {
  const uuids = positionalArgs();
  if (uuids.length === 0) die(2, 'session-bridge batch-complete: at least one <uuid> required');
  uuids.forEach(validateUuid);
  const state = readState();
  // Append (dedup'd) to completed_uuids; clear batch_uuids if all members completed.
  const completedSet = new Set(state.completed_uuids);
  for (const u of uuids) completedSet.add(u);
  state.completed_uuids = [...completedSet];
  state.batch_uuids = state.batch_uuids.filter((u) => !completedSet.has(u));
  state.phase = state.batch_uuids.length === 0 ? 'idle' : 'awaiting_responses';
  writeStateAtomic(state);
  process.stdout.write(`completed ${uuids.length} | remaining_in_batch ${state.batch_uuids.length}\n`);
}

function verbState() {
  const state = readState();
  process.stdout.write(JSON.stringify(state, null, 2) + '\n');
}

function verbSubprocessAlive() {
  const state = readState();
  process.exit(isProcessAlive(state.subprocess_pid) ? 0 : 1);
}

function verbPauseRateLimit() {
  const until = getFlag('until');
  if (!until) die(2, 'session-bridge pause-rate-limit: --until=<iso8601> required');
  const state = readState();
  state.phase = 'rate_limit_paused';
  state.rate_limit_resume_after = until;
  writeStateAtomic(state);
  process.stdout.write(`paused; resume after ${until}\n`);
}

function verbResumeCheck() {
  // `aborted` is set by the Sprint 2 skillopt-runner skill when founder picks
  // "Abort" on the rate-limit AskUserQuestion prompt (see spec §19.6 R12).
  // It's a terminal phase; resume-check exits 3 so callers (the runner skill
  // re-entering on /evolve --resume=<run-id>) treat it as a hard stop.
  const state = readState();
  process.stdout.write(`${state.phase}\n`);
  if (state.phase === 'aborted') process.exit(3);
}

function verbCleanup() {
  // Idempotent. Removes all queue files but leaves the directory shell.
  for (const dir of [REQ_DIR, RESP_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const fname of fs.readdirSync(dir)) {
      try { fs.unlinkSync(path.join(dir, fname)); } catch {}
    }
  }
  if (fs.existsSync(STATE_PATH)) {
    try { fs.unlinkSync(STATE_PATH); } catch {}
  }
  process.stdout.write('cleaned\n');
}

function verbHelp() {
  process.stdout.write(`Usage: session-bridge.cjs <verb> [--queue-dir=<path>] [args]

Verbs:
  init --pid=<n>                  Create state.json for a new SkillOpt run
  scan                            List pending request UUIDs (one per line)
  request <uuid>                  Print req-<uuid>.json to stdout
  batch-start <uuid> [uuid…]      Record batch_uuids in state.json
  write-response <uuid>           Read response JSON from stdin; atomic-rename write
  batch-complete <uuid> [uuid…]   Append to completed_uuids; clear from batch_uuids
  state                           Print state.json
  subprocess-alive                Exit 0 if state.subprocess_pid is running
  pause-rate-limit --until=<iso>  Set phase=rate_limit_paused
  resume-check                    Print current phase; exit 3 if aborted
  cleanup                         Wipe queue files + state.json

QUEUE_DIR env var is honored if --queue-dir flag is absent. Path must be absolute.
`);
}

// ── dispatch ─────────────────────────────────────────────────────────────────

const VERBS = {
  init: verbInit,
  scan: verbScan,
  request: verbRequest,
  'batch-start': verbBatchStart,
  'write-response': verbWriteResponse,
  'batch-complete': verbBatchComplete,
  state: verbState,
  'subprocess-alive': verbSubprocessAlive,
  'pause-rate-limit': verbPauseRateLimit,
  'resume-check': verbResumeCheck,
  cleanup: verbCleanup,
  help: verbHelp,
};

if (!verb || verb === '--help' || verb === '-h') {
  verbHelp();
  process.exit(0);
}

const fn = VERBS[verb];
if (!fn) die(2, `session-bridge: unknown verb '${verb}'. Try 'help'.`);

Promise.resolve(fn()).catch((e) => {
  process.stderr.write(`session-bridge ${verb}: ${e.stack || e.message}\n`);
  process.exit(1);
});
