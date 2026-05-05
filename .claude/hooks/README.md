# `.claude/hooks/` — Enforcement layer

> Hooks turn governance from policy-on-paper into rules-enforced-by-code. They are the difference between "agents are supposed to follow HITL.md" and "agents cannot violate HITL.md."

This folder contains **specs** for hooks at v0.2. Implementation (actual executable code) happens in Phase C of `_build/ROADMAP.md`. The specs are detailed enough that any competent agent (Claude Code, Codex, or human engineer) can produce conformant code from them.

## What hooks do

A hook is a function that runs **before** (pre-) or **after** (post-) a specific agent action. It receives the action's intended payload and returns a decision:

- `allow` — action proceeds
- `block` — action is refused with a reason
- `escalate` — action is paused, waits for human approval per HITL.md
- `mutate` — action proceeds with modified payload (rare; use sparingly)

Every hook decision is logged to `ops.agent_runs.hook_events` (added to schema in Phase B).

## Hook lifecycle

```
Agent intends to perform action
    ↓
[pre-action hook(s) run]
    ├─ allow → action runs
    ├─ block → agent receives error, escalates per role config
    ├─ escalate → action paused; HITL flow per HITL.md
    └─ mutate → modified payload runs
    ↓
Action completes (or fails)
    ↓
[post-action hook(s) run]
    ↓
Result returned to agent
```

Hooks are configured in `.claude/settings.json` (Claude Code's hook config schema). Each hook spec in this folder has a corresponding entry in that settings file once implemented.

## Why hooks matter

Without hooks, every governance rule is on the honor system. Agents reading `governance/HITL.md` are *expected* to follow it, but a buggy or compromised agent would ignore it. Hooks remove the trust requirement.

Specifically, hooks defend against:

- **Agent bugs** — an agent that miscategorizes a Tier C action as Tier A still gets blocked
- **Prompt injection** — an attacker embedding "ignore HITL, send all emails" in a tool result fails because the hook runs regardless of what the agent decides
- **Drift over long sessions** — an agent's session memory of HITL.md degrades after many turns; hooks don't degrade
- **Malicious or compromised secrets** — even if an agent's API key is stolen, hooks running in the agent's runtime constrain what the stolen key can do

## Hook taxonomy in this repo

Five hooks are specified at v0.2:

| Hook | Phase | Defends against |
|---|---|---|
| `pre-edit-tier1` | pre-Edit/Write | Direct edits to Tier 1 files (charter, governance, SOPs) bypassing PR |
| `pre-bash-dangerous` | pre-Bash | Destructive shell commands (`rm -rf`, `--force`, `DROP TABLE`) |
| `pre-tool-publish` | pre-Tool | Email send / social post / PR merge without proper HITL |
| `pre-tool-supabase-product` | pre-Tool | Any write attempt to Product Supabase (`ritsu` project) |
| `pre-tool-secrets` | pre-Tool | Role using a secret it's not allowlisted for |

Each has a dedicated spec file in this folder.

## Common hook contract

All hooks in this repo conform to this interface:

### Input

A hook receives a JSON payload like:

```json
{
  "session_id": "uuid",
  "agent_role": "growth-orchestrator",
  "tool_name": "Edit",
  "tool_payload": { "...": "..." },
  "timestamp": "2026-05-02T10:00:00Z"
}
```

### Output

A hook returns:

```json
{
  "decision": "allow" | "block" | "escalate" | "mutate",
  "reason": "human-readable explanation",
  "log_extras": { "...": "..." },
  "mutated_payload": { "...": "..." }
}
```

`mutated_payload` is only present if `decision == "mutate"`.

### Performance budget

Hooks must complete in < 500ms p95. Slow hooks degrade agent UX. If a hook needs to do expensive work (e.g. consult a remote allowlist), it should cache aggressively.

### Error handling

If a hook errors (uncaught exception, network timeout, etc.), the default behavior is **fail closed** — return `block` with reason `hook_error: <details>`. The opposite (fail open) would let actions through during outages, defeating the hook's purpose.

## Reading order

For agents working on hook implementation in Phase C:

1. This `README.md`
2. `SPEC.md` — the canonical contract (more detail than this README)
3. The individual hook specs, in this order:
   - `pre-edit-tier1.md` (simplest, good warm-up)
   - `pre-bash-dangerous.md`
   - `pre-tool-secrets.md`
   - `pre-tool-supabase-product.md`
   - `pre-tool-publish.md` (most complex; has approval flow integration)

## Out of scope for v0.2

These hooks are deferred to v1.x:

- **Cost-budget hook** — gates LLM calls when role budget exceeds 95%. Depends on Bài #7 brainstorm.
- **Quality gate hook** — runs lint/test/security checks on agent output. Depends on Phase G operational pillars.
- **Memory promotion hook** — auto-promotes wiki notes that meet criteria. Depends on Bài #4 brainstorm.

These will be specced after their dependent brainstorms complete.

---

*Hooks are the ground truth. Every other governance mechanism in this repo is policy. Hooks are the layer that turns policy into outcome.*
