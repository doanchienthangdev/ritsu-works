---
name: pre-edit-significant
version: 0.1.0
type: pre-tool
tools: [Edit, Write]
default_decision: allow
fail_mode: open
---

# Hook: pre-edit-significant

> **Observability-only — never blocks.** Companion to `pre-bash-mass-action`
> for Edit/Write tools. Detects when model edits files that have a registered
> workforce recipient (skill, SOP, capability spec) and logs
> `ops.events.resolver.bypass_detected` if a recipient would match.

## What it does

Per **resolver-v3-jit-loading** cherry-pick #13: same A1 efficacy measurement
as `pre-bash-mass-action`, but for Edit/Write tool calls instead of Bash.

For each Edit/Write invocation:

1. Extract path being edited from `payload.tool_args.file_path`.
2. If path matches a known workforce-related pattern
   (e.g. `06-ai-ops/skills/<skill>/SKILL.md`, `wiki/capabilities/<id>/spec.md`,
   `**/sops/<id>/flow.yaml`, `.claude/commands/<cmd>.md`):
   - Synthesize candidate intent from path + edit content snippet
   - Run `keyword-fallback.match({ trigger: intent, callerRole: payload.role })`
   - If a recipient matches: log `ops.events.resolver.bypass_detected`
3. Hook returns `allow` always — never blocks the actual Edit/Write.

## Significance threshold

Not every Edit/Write is "significant" enough to check. Triggers ONLY when:

- File path matches one of the workforce-substrate patterns above, OR
- Edit replaces > 100 chars (likely a substantive change, not a typo fix), OR
- Write creates a new file > 500 chars (likely a new artifact)

Trivial edits (small typo fixes, comment additions) skip the bypass check
to avoid noise.

## Decision logic

```
function decide(payload):
  if payload.tool_name not in ['Edit', 'Write']:
    return allow

  path = payload.tool_args.file_path
  if not path:
    return allow

  is_workforce_path = match_pattern(path, [
    r'06-ai-ops/skills/.+/SKILL\.md',
    r'wiki/capabilities/.+/spec\.md',
    r'.+/sops/.+/flow\.yaml',
    r'\.claude/commands/.+\.md',
    r'\.claude/hooks/.+\.md',
    r'knowledge/recipients/.+\.md',
  ])

  if payload.tool_name == 'Write':
    is_significant = len(payload.tool_args.content) > 500
  else:  # Edit
    is_significant = len(payload.tool_args.new_string) > 100

  if not (is_workforce_path or is_significant):
    return allow

  intent = path_to_intent(path)  # e.g. 'skills/customer-onboarding/SKILL.md' → 'customer onboarding'
  candidates = keyword_fallback.match({ trigger: intent, callerRole: payload.role })
  if candidates.matched or len(candidates.alternatives) > 0:
    insert into ops.events {
      event_type: 'resolver.bypass_detected',
      ts: now(),
      metadata: {
        hook: 'pre-edit-significant',
        tool_invoked: payload.tool_name,
        file_path: path,
        extracted_intent: intent,
        would_have_matched: [c.recipient.id for c in candidates.alternatives[:3]],
        caller_role: payload.role,
        caller_session: payload.session_id_hash
      }
    }

  return allow  # always
```

## Configuration

Activated via `.claude/settings.json` (when founder approves Tier C cutover):

```json
{
  "hooks": {
    "PreToolUse": [
      {"matcher": "Edit", "hooks": [{"type": "command", "command": "node .claude/hooks/runtime/pre-edit-significant.cjs"}]},
      {"matcher": "Write", "hooks": [{"type": "command", "command": "node .claude/hooks/runtime/pre-edit-significant.cjs"}]}
    ]
  }
}
```

The hook script implementation lives at `.claude/hooks/runtime/pre-edit-significant.cjs`
— TBD in Sprint 4 follow-up once founder approves activation.

## HITL tier per HITL.md Appendix A

**Tier C** — new hook addition. Same gate as `pre-bash-mass-action`.

## Test plan

- Unit: path-to-intent extraction
- Unit: pattern matcher for workforce-substrate paths
- Unit: significance threshold (size-based)
- Integration: Edit/Write call → ops.events row appears when bypass detected
- Edge: tiny edits (< 100 chars) skip silently

## Capability lineage

- Proposed: capability `resolver-v3-jit-loading` v3.0.0 (cherry-pick #13)
- ops.capability_runs id: 1fa9208d-2fda-45de-ac72-728998b1d33f
- Sprint: 4 (hooks + cutover, observation-only baseline phase)
