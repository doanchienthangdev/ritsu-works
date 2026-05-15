---
name: post-persona-log
version: 0.1.0
type: post-tool
tools: [*]               # observes any tool call; only acts when persona_slug present in context
default_decision: allow
fail_mode: closed
---

# Hook: post-persona-log

> Writes the final `persona_slug` attribution to `ops.agent_runs` at the end of an invocation, and appends a one-line entry to `06-ai-ops/workforce-personas/<slug>/dossier.md` for non-trivial actions (Tier B+).

## Why this is a hook, not part of the persona itself

If the persona had to remember to log itself, it would forget. By making the audit write happen at the runtime layer, every invocation is logged regardless of what the persona did or did not do inside the turn.

This is the same pattern as `pre-llm-call-budget.md` writing to `ops.cost_attributions` after the LLM call. Audit lives at the layer that can guarantee execution.

## What it does

On every tool call completion (post-tool), if `context.persona_slug` is set:

1. Append/update the `ops.agent_runs` row for this invocation:
   ```sql
   UPDATE ops.agent_runs
      SET persona_slug = $1,            -- e.g. 'ceo'
          state_payload = state_payload
            || jsonb_build_object('persona_default_hitl_max', $2,
                                  'bound_role', $3)
    WHERE id = $current_run_id;
   ```
   Note: `agent_slug` is left untouched — it's the technical role doing the work (e.g. `gps`). One row carries both planes (per `ops.agent_runs` schema bumped in migration 00024).

2. If the action just completed is Tier B+, append a one-line entry to the persona's dossier:
   ```
   06-ai-ops/workforce-personas/<slug>/dossier.md
   ```
   Format:
   ```
   2026-05-15T14:32:01Z | tier=B | summary=<≤90 chars> | run_id=<uuid>
   ```
   Dossier writes are append-only. If the file does not exist, create it with a one-line header.

3. Emit a `run_summary` to `ops.run_summaries` per `knowledge/memory-architecture.md` (existing pipeline; this hook just sets `persona_slug` on the row).

## What it does NOT do

- Decide tiers (that's `pre-delegate-check`).
- Block anything (it's post-hoc).
- Write `dossier.md` for Tier A actions (too chatty).
- Touch `governance/HITL.md` or any tier ceremony.
- Make new tables. Uses existing `ops.agent_runs` + the new `persona_slug` column (migration 00024).

## Interaction with `pre-persona-resolve`

`pre-persona-resolve` injects `persona_slug` into context. This hook reads it back. If `persona_slug` is unset (direct-role invocation without persona), this hook becomes a no-op — `ops.agent_runs.persona_slug` stays NULL, which is the intentional design (not every run is persona-routed).

## Dossier file convention

- Path: `06-ai-ops/workforce-personas/<slug>/dossier.md`
- Format: one line per Tier B+ action.
- Sort order: chronological append (newest at bottom).
- Trim policy: at 1000 lines, oldest 500 lines move to `dossier-archive-<YYYY-MM>.md`.
- Read by: persona at session start (per command.md "Session memory" section), Friday review aggregation, founder ad-hoc.

## Schema for the dossier line

```
ISO8601-ts | tier=<A|B|C|D-Std|D-MAX> | summary=<text up to 90 chars, no pipes> | run_id=<uuid>
```

Pipes inside `summary` are escaped to `&#124;` to keep the format parseable by simple split.

## Failure modes covered

| Case | Hook behavior |
|---|---|
| `persona_slug` not in context | No-op. agent_runs row keeps `persona_slug = NULL`. |
| `ops.agent_runs` row not yet committed | Hook queues the update; runtime flushes after row commit (avoids race). |
| Dossier file missing | Create with one-line header, then append. |
| Dossier file unwritable (filesystem error) | Log to `ops.audit_log`; do NOT block; surface in next session's `synthesize-morning-brief`. |
| Tier escalated mid-action | Use the FINAL tier (the one that actually executed), not the originally-planned tier. |

## Migration dependency

This hook depends on `ops.agent_runs.persona_slug` column from migration `supabase/migrations/00024_agent_runs_persona_slug.sql` (PR 1). If the migration is not applied yet (founder hasn't run `supabase db push`), this hook becomes a no-op safely: the runtime swallows the `column does not exist` error and continues. Once the migration is applied, the hook starts writing.

## Wired by

- `scripts/cross-tier/validate-personas.cjs` checks that this hook file exists and references the correct column name.
- Runtime: Claude Code hook executor per `.claude/hooks/SPEC.md`.

## Specifies behavior; implementation pending

Same caveat as `pre-persona-resolve.md` — this is the spec/contract. Runtime executor reads and dispatches.
