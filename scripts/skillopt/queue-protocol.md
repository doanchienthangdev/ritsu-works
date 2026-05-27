# SkillOpt file-queue protocol

**Capability:** `evolve` v1.1 (SkillOpt integration).
**Producers:** `vendor/skillopt/skillopt/model/ritsu_file_queue.py` (Python subprocess; writes requests, reads responses).
**Consumers:** `scripts/skillopt/session-bridge.cjs` (this session; reads requests, writes responses).

This file documents the on-disk JSON message format that lets the SkillOpt Python subprocess outsource its LLM calls through this session's subscription billing rather than direct HTTP. Either side may evolve independently — adding optional fields is safe; changing required fields is a v2.0 break.

## Directory layout

```
<QUEUE_DIR>/                         # absolute path; env: SKILLOPT_FILE_QUEUE_DIR (Python) / QUEUE_DIR (bridge)
├── llm-requests/
│   ├── req-<uuid>.json              # finalized request, ready to dispatch
│   └── req-<uuid>.json.tmp          # in-flight write (Python tmp before rename)
├── llm-responses/
│   ├── resp-<uuid>.json             # finalized response, ready to read
│   └── resp-<uuid>.json.tmp         # in-flight write (bridge tmp before rename)
└── state.json                       # bridge-managed run state for IPC dedup + --resume
```

**Filenames are content-addressable**: the UUID in `<uuid>` is the same value as the `id` field inside the JSON. Producers MUST NOT reuse a UUID.

**Atomic write is REQUIRED on both sides.** Files MUST be written to `<name>.json.tmp` first and then renamed to `<name>.json`. Direct write to the final path is forbidden — the consumer polls every 500ms with a `read_text() + json.loads()` step that crashes on partial writes. The Python backend has a defensive `try/except json.JSONDecodeError` belt-and-suspenders, but the bridge MUST honor atomic-rename to keep response-write latency predictable. See `scripts/skillopt/UPSTREAM-DEVIATION.md` §"Bridge write contract" for the rationale.

## Request schema (Python → bridge)

```jsonc
{
  // ── envelope (required) ─────────────────────────────────────────────
  "id":      "0a1b2c3d4e5f6789...",  // 32-hex UUID; matches filename
  "ts":      1685347200.123,         // unix timestamp (seconds, float) — when Python wrote the request
  "kind":    "optimizer" | "target" | "custom",
                                     // dispatch hint for the bridge. Values are the ONLY ones the
                                     // Python backend emits (see ritsu_file_queue.py — kw values
                                     // passed to _chat_text/_chat_messages):
                                     //   "optimizer" → skillopt-optimizer-reflect subagent
                                     //   "target"    → skillopt-target-rollout subagent
                                     //   "custom"    → bridge selects via deployment field;
                                     //                  if deployment is null this is an upstream
                                     //                  contract violation, NOT normal operation
                                     //                  (bridge logs warning + defaults to target).
  "stage":   "optimizer" | "target" | "<custom-string>",
                                     // cost-bucket / tracker key; usually matches kind

  // ── routing (optional) ──────────────────────────────────────────────
  "deployment":       "claude-sonnet-4-6" | null,
                                     // only set when caller invoked chat_with_deployment(...).
                                     // bridge may use as a hint to override the default model
                                     // for kind=custom; otherwise ignore.

  // ── content (exactly one of these two shapes per request) ───────────
  // Shape A — single-turn chat:
  "system":           "<string>",
  "user":             "<string>",
  // Shape B — multi-turn chat:
  "messages":         [{"role": "user"|"assistant"|"system", "content": "..."}, ...],

  // ── parameters (optional, with defaults) ────────────────────────────
  "max_completion_tokens": 16384,
  "retries":               5,        // Python-side retry budget; bridge MAY ignore
  "attempt":               0,        // current retry attempt; informational

  // ── tool calling (optional; multi-turn shape only) ──────────────────
  "tools":            [...]   | null,
  "tool_choice":      "auto"  | {...} | null,
  "return_message":   true    | false  // bridge: when true, response.message must contain the full assistant message object
}
```

**Defaults if absent:**
- `stage`: equals `kind`
- `attempt`: 0
- `retries`: 5
- `return_message`: false
- `tools` / `tool_choice` / `deployment`: null

**Validation rules (bridge SHOULD enforce, but graceful on failure):**
- `id` must match the filename's UUID component.
- Exactly one of `(system, user)` pair OR `messages` array is present.
- If `kind == "custom"` and `deployment` is null, bridge logs a warning and treats as `target`.

## Response schema (bridge → Python)

```jsonc
{
  // ── envelope ────────────────────────────────────────────────────────
  "id":      "0a1b2c3d4e5f6789...",  // REQUIRED. Same UUID as the request.

  // ── server-side fields (injected by bridge if absent — caller may omit) ──
  "ts":      1685347205.456,         // unix timestamp when bridge finished writing
  "kind":    "<echo>",               // echo of request.kind, for logging

  // ── success path ────────────────────────────────────────────────────
  "text":    "<assistant response>",
  "usage":   {
    // Bridge MUST include token accounting in ONE of these two schemas;
    // backend defensively reads both (input_tokens|prompt_tokens, output_tokens|completion_tokens).
    "input_tokens":  1234,
    "output_tokens": 567
    // OR
    // "prompt_tokens": 1234,
    // "completion_tokens": 567
  },
  "message": {...},       // OPTIONAL; required only if request.return_message == true

  // ── error path ──────────────────────────────────────────────────────
  "error":   "<one-line description>"
  // Precedence: if `error` is present and non-empty, the Python consumer
  // raises RuntimeError and discards text/usage/message regardless of what
  // else is in the response (see _round_trip in ritsu_file_queue.py). A
  // bridge MAY include both `error` and `text` (e.g., partial output + failure
  // note); the error wins.
}
```

**At least one of `text` or `error` MUST be present.** A response missing both is treated as an error by the Python backend (it returns `text = ""`, which the caller's `chat_*` wrapper detects as a degenerate response on the next layer). The bridge enforces this on write (`session-bridge.cjs` `write-response` verb).

**Bridge-injected fields:** the bridge auto-injects `ts` (write timestamp) and echoes `kind` from the matching request if the caller's response object omits them. Callers MAY pre-populate these for deterministic timestamps; otherwise the bridge writes the current time.

## State.json schema (bridge-local; not part of the request/response stream)

```jsonc
{
  "run_id":              "<uuid>",          // matches runtime/skillopt/<entity>/runs/<rid>/
  "started_at":          "2026-05-27T...",
  "subprocess_pid":      12345,             // last-known SkillOpt train.py PID
  "phase":               "idle" | "dispatching" | "awaiting_responses" | "rate_limit_paused" | "completed" | "aborted",
  "batch_uuids":         ["abc...", "def..."],     // UUIDs in current/last batch — IPC dedup signal
  "completed_uuids":     ["xyz...", ...],          // request UUIDs already responded to
  "rate_limit_resume_after": "2026-05-27T..." | null,  // for --resume
  "totals": {
    "requests_dispatched":  0,
    "responses_written":    0,
    "errors":               0
  }
}
```

The bridge persists `state.json` after every batch boundary so a session restart (e.g. due to rate-limit pause + founder Tier B approval to resume) can pick up at `batch_uuids`. The IPC dedup invariant: a request UUID present in `completed_uuids` must NEVER be re-dispatched, even if a stale `req-<uuid>.json` is observed.

## Lifecycle invariants

- **Request lifecycle:** Python `_enqueue_request` writes `req-<uuid>.json.tmp` then renames. The file lives until the bridge processes it; the bridge may move it to an `llm-requests/.dispatched/` subdir after writing its response, or simply leave it (Python doesn't poll requests).
- **Response lifecycle:** bridge writes `resp-<uuid>.json.tmp` then renames. The Python `_await_response` poller reads it once and returns; the file lives until cleanup at end-of-run.
- **Cleanup:** at end-of-run (or on `--cleanup` flag in a later sprint), both `llm-requests/` and `llm-responses/` are wiped along with `state.json`. Per-run dirs (`runtime/skillopt/<entity>/runs/<rid>/`) are rotated per the `skillopt-runtime-staleness` L1 invariant (no run older than 60d).

## Versioning

This is **protocol version 1** (spec §19, capability evolve v1.1.0). Future changes:
- **Backward-compatible (minor):** new OPTIONAL request/response fields, new state.json fields.
- **Breaking (major):** rename or remove a required field, change a type, alter the atomic-rename contract.

A breaking change requires `/cla revise evolve` (Tier C) and a `protocol_version` envelope field added to both schemas.

## See also

- `vendor/skillopt/skillopt/model/ritsu_file_queue.py` — Python producer/consumer
- `scripts/skillopt/session-bridge.cjs` — Node bridge state helper (sub-PR C)
- `scripts/skillopt/UPSTREAM-DEVIATION.md` §"Bridge write contract" — atomic-rename rationale
- `wiki/capabilities/evolve/spec.md` §19.3 / §19.6 — architecture (after Phase 8 promotion; current draft `.archives/cla/evolve-extend-skillopt/spec.md`)
