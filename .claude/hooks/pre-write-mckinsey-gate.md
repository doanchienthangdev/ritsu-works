---
name: pre-write-mckinsey-gate
version: 1.0.0
type: pre-tool
tools: [Write, Edit]
default_decision: allow
fail_mode: open
---

# Hook: pre-write-mckinsey-gate

> **Observation-only — never blocks (by default).** Auto-runs the `/think mckinsey`
> run-folder discipline gate the moment a **Sell artifact**
> (`.archives/mckinsey/<slug>/communication.md`) is written, and records an audit
> row when an UNGATED Sell ships. Capability `thinking-toolkit` v3.1 — the
> 2026-06-05 audit found the gate (`scripts/thinking-toolkit/mckinsey-run.cjs`)
> was OPT-IN: nothing fired it, so an undisciplined run could narrate a Sell with
> open workplan rows / no dissent / no pre-wire and never be caught. This hook
> closes that hole at the harness level.

## What it does

For each Write/Edit invocation:

1. If `tool_name ∉ {Write, Edit}` → `allow` (silent).
2. Extract `tool_input.file_path`. If it does NOT match
   `…/.archives/mckinsey/<slug>/communication.md` → `allow` (silent). (Only the
   final Sell deliverable is gated; every other write is untouched.)
3. Derive `(root, slug)` **from the path itself** (the regex captures the repo
   root prefix), so it works whether the run folder is in the **main repo** or a
   **worktree** `.archives/`.
4. Run `checkRun(root, slug, { beforeSell: true })` (the same deterministic gate
   the SKILL tells the agent to run): 9 artifacts present · 6+status workplan
   columns · valid status · product-firewall · analysis-log provenance+degree ·
   HITL receipts · no `open` rows · `pre-wire` + `dissent` sessions · (v3.1)
   workplan ≥2 rows · filled `**Disconfirmation:**` · ≥1 real data pull.
5. **errors == 0** → `allow` (silent — a disciplined Sell passes invisibly).
6. **errors > 0** → append `mckinsey.sell_gate_failed` to
   `runtime/mckinsey-gate-events.jsonl` (cron → `ops.events` → `alert-router`,
   same path as the resolver bypass-events log) + write a visible **stderr
   advisory** listing the failures → then `allow`.

## Why observation-only

Matches the repo's hook philosophy (`pre-bash-mass-action`, `pre-edit-significant`
are observation-only; only the L0 product firewall blocks). A false positive here
must NEVER stop the founder's Sell write, especially unattended. The value is:
the gate now **runs itself** at Sell time (no opt-in) and an ungated Sell is
**auditable**. This is *discipline, not proof* — a checker cannot grade the
thinking; it makes skipping the gate a recorded event.

To **harden to blocking**: flip `BLOCK_ON_FAIL = true` in the runtime `.cjs`
(returns `decision: block` with the failure list as the reason). Deliberately
left **off** for unattended safety; the founder can enable it once confident in
the false-positive rate.

## Decision logic

```
function decide(payload):
  if payload.tool_name not in ['Write', 'Edit']: return allow
  path = payload.tool_input.file_path
  m = path.match(/^(.*?)\/?\.archives\/mckinsey\/([a-z0-9][a-z0-9-]*)\/communication\.md$/)
  if not m: return allow
  (root, slug) = (m[1] or REPO_ROOT, m[2])
  result = checkRun(root, slug, { beforeSell: true })   # from mckinsey-run.cjs
  if result.errors.length == 0: return allow
  append runtime/mckinsey-gate-events.jsonl { event_type: 'mckinsey.sell_gate_failed', run_slug, errors, … }
  stderr( '[mckinsey-gate] … FAILS … [advisory — not blocked]' )
  return BLOCK_ON_FAIL ? block(reason=errors) : allow
```

## Configuration

Activated via `.claude/settings.json` `PreToolUse` (Write + Edit matchers,
alongside `pre-edit-significant`):

```json
{ "matcher": "Write", "hooks": [
    { "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/runtime/pre-edit-significant.cjs" },
    { "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/runtime/pre-write-mckinsey-gate.cjs" } ] }
```

Implementation: `.claude/hooks/runtime/pre-write-mckinsey-gate.cjs`.

## HITL tier per HITL.md Appendix A

**Tier C** — new hook + `.claude/settings.json` edit. Observation-only (fail-open),
so the blast radius is an advisory log, not a blocked tool.

## Test plan

- Unit: path regex matches the Sell artifact (absolute main-repo + worktree +
  relative); rejects non-Sell paths.
- Unit: non-Write/Edit tool → silent allow.
- Integration: undisciplined run → stderr advisory + jsonl row + allow.
- Integration: disciplined run → silent allow (no stderr, no row).
- Edge: missing helper (partial checkout) → allow (fail-open).

(See `tests/pre-write-mckinsey-gate.test.ts`.)

## Capability lineage

- Proposed: capability `thinking-toolkit` v3.1.0 (the 2026-06-05 rigor + fidelity
  hardening — audit fix #7, the highest-leverage gap: "nothing forces the gate").
- Run record: `.archives/mckinsey-rigor-fix-2026-06-05/`.
