# Hook contract — formal spec

> The canonical contract every hook in this repo must conform to. Implementation language and runtime are flexible; the contract is not.

**Version:** 0.2
**Last updated:** 2026-05-02
**Implements:** `governance/HITL.md`, `governance/ROLES.md`, `governance/SECRETS.md`

---

## Runtime

Hooks run in the **agent's runtime** (Claude Code, Codex, or future agent host). They are configured via the host's hooks mechanism (for Claude Code: `.claude/settings.json` with hook entries pointing to scripts in this folder).

Each hook is a script that:

1. Reads input from stdin (or env vars, depending on host)
2. Optionally consults files (e.g. `governance/ROLES.md`)
3. Optionally consults the secret manager (for runtime info, never values)
4. Optionally calls Supabase (for live state — but very sparingly, performance-sensitive)
5. Writes output to stdout (or returns exit code, depending on host)

Implementation language for v1.0: **Python or TypeScript**. Whichever the team picks first; don't mix per-hook.

## Input

A hook receives:

```json
{
  "session_id": "string (uuid)",
  "session_started_at": "ISO 8601 timestamp",
  "agent_role": "string (must match a role in governance/ROLES.md)",
  "tool_name": "string (e.g. 'Edit', 'Bash', 'Read', or MCP tool name)",
  "tool_payload": {
    "...": "...tool-specific structure..."
  },
  "context": {
    "current_working_directory": "string",
    "is_dry_run": "boolean",
    "parent_run_id": "string (uuid, if this is a sub-action)"
  },
  "timestamp": "ISO 8601 timestamp"
}
```

If a hook needs information not in this payload, it must fetch from local files (cheap) or `ops.*` schema (expensive). Avoid the latter.

## Output

A hook returns:

```json
{
  "decision": "allow" | "block" | "escalate" | "mutate",
  "reason": "string (human-readable, no PII, no secrets)",
  "log_extras": {
    "hook_version": "string (e.g. '0.2.1')",
    "match_rule": "string (which rule fired)",
    "...": "any additional structured data"
  },
  "mutated_payload": null | { /* same shape as tool_payload */ }
}
```

### Decision semantics

- **`allow`** — action proceeds with original payload
- **`block`** — action is refused. Agent receives the `reason` as an error. Agent must NOT retry without escalation per its role config
- **`escalate`** — action is paused. Hook (or hook system) initiates HITL flow per the action's tier classification in `governance/HITL.md`. After approval, action proceeds with original payload. After rejection, behaves as `block`.
- **`mutate`** — action proceeds with `mutated_payload` instead of original. Use sparingly; prefer `block` + ask agent to retry with corrected payload

### Reason field

The `reason` field is shown to the agent and logged. Rules:

- No PII (no email addresses, no user names beyond agent_role)
- No secret values
- No verbose error stack traces
- Reference to the policy doc that the action violates: e.g. "Tier 1 file edit requires PR per governance/HITL.md#tier-c"
- Concrete enough that the agent can adjust: not "blocked" but "blocked: file 'governance/HITL.md' is D-MAX, requires founder ceremony"

## Audit trail

Every hook invocation produces an audit record. The host wires these into `ops.agent_runs.hook_events` (after Phase B):

```sql
hook_events (
  id uuid PK,
  run_id uuid REFERENCES agent_runs(id),
  hook_name text,
  hook_version text,
  decision text,
  reason text,
  match_rule text,
  duration_ms int,
  ts timestamptz
);
```

Hooks themselves don't write to the DB — that's the host's job. Hooks return the data; host persists.

## Performance contract

| Metric | Target | Hard limit |
|---|---|---|
| p50 latency | < 50ms | 200ms |
| p95 latency | < 200ms | 500ms |
| Memory | < 100 MB | 500 MB |
| File reads per call | < 5 | 20 |
| Network calls per call | 0 | 1 (only for fail-open exceptions) |

Hooks that exceed hard limits are auto-disabled with an alert. The host treats a disabled hook as `fail-closed = block`.

## Caching

Reading `governance/ROLES.md` on every call is wasteful. Each hook should cache:

- File contents with mtime check (re-read only if file changed)
- Parsed structures (parse once per process)
- Negative results (a denied role lookup stays denied for the process lifetime)

Cache key includes the hook version. After a hook update, cache is invalidated.

## Versioning

Each hook has a semver in its frontmatter:

```yaml
---
name: pre-edit-tier1
version: 0.2.1
---
```

Versions:
- `0.x` — pre-1.0, breaking changes allowed in any release
- `1.x` and beyond — semantic versioning, breaking changes only in major bumps

Hook version is included in every audit record so historical decisions can be replayed against the version that made them.

## Failure modes

### Hook script errors

Default: **fail-closed.** Return `block` with reason `hook_error: <type>: <message>`. Log full stack trace to a separate error log (not to user-visible reason).

Override: certain hooks can be marked `fail_open: true` in settings — only for hooks where blocking on error would be worse than allowing. This is rare and requires founder approval per HITL.md.

### Hook timeout

If a hook exceeds 500ms wall-clock, the host SIGTERMs it and treats as `block` with reason `hook_timeout`.

### Multiple hooks on same action

Some actions trigger multiple hooks (e.g. editing `governance/HITL.md` triggers `pre-edit-tier1` AND `pre-tool-secrets` if a secret is in the diff). All matching hooks run in parallel. The action is **blocked if ANY returns `block`** and **escalates if ANY returns `escalate` and none returns `block`.** This is fail-closed at the multi-hook level.

## Testing

Each hook spec includes a "test cases" section listing concrete scenarios. Implementations must pass all listed test cases. Tests live in:

```
.claude/hooks/tests/
├── pre-edit-tier1.test.{ts|py}
├── pre-bash-dangerous.test.{ts|py}
├── ...
└── fixtures/                # sample payloads
```

Tests run on every PR via GitHub Actions (configured in Phase B).

## Extension

To add a new hook in the future:

1. Open a PR (Tier C action) creating `.claude/hooks/<hook-name>.md` (the spec)
2. Reference this `SPEC.md` for contract details
3. Add to `.claude/hooks/README.md` taxonomy table
4. Update `_build/ROADMAP.md` if hook implementation is part of an upcoming phase
5. Implement under same/next PR
6. Add test cases
7. Wire into `.claude/settings.json`

Adding a hook is a Tier C operation. Removing or weakening a hook is D-Std (because it changes safety properties).

---

*A spec is a promise. The runtime keeps the promise. Together they make safety mechanical, not voluntary.*
