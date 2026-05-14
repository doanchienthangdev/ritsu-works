# Orchestration Architecture

> Canonical reference for how Ritsu's AI workforce decomposes work, coordinates between agents, and persists state across multi-agent operations.

**Status:** v1.0 spec — Custom layer on subagents + ops.tasks
**Last updated:** 2026-05-02
**Related:** `governance/ROLES.md`, `knowledge/manifest.yaml`, `knowledge/memory-architecture.md`, `_build/notes/problem-5-multi-agent-orchestration.md`

---

## Why this document exists

A workforce that fails to decompose work correctly suffers two opposite failure modes:

- **Under-delegation** — main agent context fills up handling everything inline; quality degrades; cost compounds
- **Over-delegation** — coordination overhead exceeds the value of parallelism; debugging becomes intractable; failures cascade silently

Anthropic's own engineering blog warns: "Multi-agent systems are a trap" — many teams build them prematurely. Ritsu must avoid both errors. This document defines the rules.

## The three axes

Every orchestration decision sits on three independent axes:

1. **Delegation depth** — when does main agent delegate vs handle inline?
2. **Coordination topology** — subagents (parent-child) or Agent Teams (peer)?
3. **Task state persistence** — where does shared state live across sessions?

Each axis has a chosen v1.0 answer. Subsequent sections document each.

---

## Axis 1 — Delegation depth

### The decision matrix

Three categories of rule, applied in order:

#### Hard rules — deterministic, always apply

| Condition | Decision |
|---|---|
| Subtask requires permissions/tools the current role lacks | **Delegate (mandatory)** |
| Two or more independent work branches identifiable | **Delegate parallel (recommended)** |
| Subtask is a single SELECT, single file read, or trivial compute | **Never delegate (handle inline)** |
| Subtask output feeds immediately into the next step | **Never delegate (handle inline)** |
| Total tool calls expected < 4 AND single role | **Never delegate (overhead exceeds benefit)** |

These are encoded into each pillar's `orchestrator.md` as deterministic checks before any delegation.

#### Soft signals — observed at runtime, hook-flagged

These are **observed** facts about the current session, not estimates:

| Observation | Hook signal |
|---|---|
| Current session tool call count ≥ 8 | Flag: "consider checkpoint + delegate continuation" |
| Current context tokens ≥ 50% of role's `working_tokens` cap | Flag: "consider checkpoint + delegate" |
| Single role accumulating > 3K tokens of intermediate analysis | Flag: "delegate to subagent for verbose work" |

Hook `pre-delegate-check` watches these counters and emits warnings to the agent. Agent decides whether to act on the signal — hook does not block.

#### Never delegate — explicit anti-patterns

- Single-shot reads ("what's the current count?")
- Pure compute with no domain context
- Operations whose output is consumed in the next sentence of reasoning
- Tasks that fit under the role's `hitl_max_tier` and don't cross pillar boundaries

### Why this approach over agent estimation

An agent estimating "this will take 5 tool calls" before starting is unreliable. The agent often underestimates. The decision rule used here is:
- **Hard rules** are facts the agent CAN know upfront (role permissions, parallelism)
- **Soft signals** are observed, not estimated — current session metrics are ground truth
- **Never rules** prevent overhead trap

This is more conservative than Anthropic's "Code Kit" recommendation (delegate at 8+ tool calls) — Ritsu's scale (1 founder, smaller task scope per role) makes overhead more expensive proportionally.

### Implementation locations

- Hard rules: `<pillar>/orchestrator.md` decomposition table
- Soft signals: `.claude/hooks/pre-delegate-check.md`
- Never rules: this document + `CLAUDE.md` operating principles

---

## Axis 2 — Coordination topology

### The chosen pattern: Custom layer on subagents + ops.tasks

```
                 ┌──────────────────┐
                 │     FOUNDER      │
                 │  (Telegram bot)  │
                 └────────┬─────────┘
                          │  /tasks status, /task <id>
                          ▼
                 ┌──────────────────┐
                 │       GPS        │  ← main session
                 │  (orchestrator)  │     no parent
                 └────────┬─────────┘
                          │  spawn via Task tool
                          │  state via ops.tasks
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │ subagent │      │ subagent │      │ subagent │   ← fresh
  │ growth-  │      │ content- │      │ growth-  │     context
  │ orch     │      │ drafter  │      │ orch     │     each
  └────┬─────┘      └────┬─────┘      └────┬─────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
       ┌────────────────────────────────────┐
       │         ops.tasks (Tier 2)          │
       │  parent_task_id, state, state_     │
       │  payload, assignee_kind/id,        │
       │  priority, context_id              │
       └────────────────────────────────────┘
```

### Roles in this topology

- **GPS** is the only canonical orchestrator. It does NOT do specialist work; it decomposes, dispatches, monitors, synthesizes.
- **Pillar orchestrators** (growth-orchestrator, support-agent's classifier, etc.) are mid-level coordinators — they orchestrate within their pillar when GPS hands them a coarse-grained pillar task.
- **Specialist subagents** (content-drafter, etc.) do narrow work. They never spawn further subagents (Claude Code does not support nested subagents anyway).
- **Founder** observes through Telegram (skill `task-status`) or Supabase dashboard. Founder may directly manipulate ops.tasks via approved channels (rare; mostly read).

### Why not Agent Teams (v2.1.32+)

Agent Teams is documented by Anthropic as having "known limitations around session resumption, task coordination, and shutdown behavior." Three concerns:

1. **Maturity.** Experimental flag (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`) means breaking changes likely.
2. **Cost.** N persistent teammates × full context window each. Subagents fan-out only loads context when actively working.
3. **Workflow fit.** Tmux orchestration suits developer pair-programming. Ritsu's founder vận hành business; SQL queries via dashboard fit better than tmux panes.

**Defer to v1.x**, revisit when:
- Agent Teams exits experimental
- Cost model improves (e.g., warm-but-idle teammates)
- Concrete multi-day workflow demonstrates need for direct teammate-to-teammate communication that ops.tasks can't serve

### Spawn-and-monitor pattern (the canonical sequence)

```
1. GPS receives coarse task from founder
2. GPS reads governance/HITL.md to classify task tier
3. GPS invokes `task-decompose` skill:
   - SQL INSERT into ops.tasks for parent task (assignee_kind='agent',
     assignee_id='gps', task_type='orchestrate', state='running',
     state_payload.hitl_tier='C', state_payload.acceptance_criteria='…')
   - SQL INSERT for each child task with parent_task_id, assignee_kind,
     assignee_id (role slug), state='pending', state_payload carrying
     acceptance_criteria + blocked_on (uuid[] of prerequisite task ids)
4. GPS dispatches subagents:
   For each child task in state='pending' with state_payload.blocked_on
   empty (or all referenced tasks completed):
     - UPDATE ops.tasks SET state='assigned', state_since=now() ...
     - GPS uses Task tool to spawn subagent matching assignee_id (role slug)
     - GPS passes child task_id to subagent (single uuid, not full state)
     - Subagent reads its task from ops.tasks, transitions state to 'running',
       executes, updates state_payload, writes terminal state ('completed'|
       'failed'|'cancelled')
5. GPS polls (or waits-for-callback if implemented) ops.tasks
6. As tasks complete:
   - GPS computes which siblings' state_payload.blocked_on now empties out
   - GPS dispatches the now-unblocked tasks
7. When all children of parent task in terminal state:
   - GPS synthesizes results (reading state_payload from each child)
   - Updates parent task state to 'completed'
   - Notifies founder via Telegram
```

This is the **orchestrator-workers pattern** from Anthropic's "Building Effective Agents" — adapted with database-backed state instead of in-memory state.

### Failure handling

Retry budget is tracked as `state_payload.retries_left` (default 3) — not a
dedicated column, to keep ops.tasks narrow. If a subagent reports failure or
times out:

- GPS decrements `state_payload.retries_left`
- If > 0: UPDATE state back to 'pending' and re-dispatch
- If = 0: leave state='failed', propagate up to parent (parent's
  `state_payload.children_failed[]` appended)
- Founder notified via Telegram for any Tier B+ failure

If GPS itself crashes mid-orchestration:
- Next GPS session reads ops.tasks WHERE state IN ('pending','assigned','running')
  AND parent_task_id IN (open parents)
- Resumes from observed state — no separate "checkpoint" needed
- ops.task_state_transitions provides the full event log for forensics
- This is why ops.tasks is canonical state, not memory tool API

---

## Axis 3 — Task state persistence

### The decision: ops.tasks is canonical

Memory tool API stays disabled per Bài #4 Strategy E. ops.tasks (extended schema) covers all v1.0 multi-agent state needs.

### Schema (as implemented in `supabase/migrations/`)

The original v1.0 proposal in this document called for dedicated columns
`blocked_on`, `retries_left`, `acceptance_criteria`, and `assignee_role`.
Migration `00002_ops_core_tables.sql` instead kept ops.tasks narrow and
pushed task-kind-specific metadata into `state_payload` jsonb. Below is the
schema that actually ships:

```sql
-- ops.tasks (from supabase/migrations/00002_ops_core_tables.sql)
CREATE TABLE ops.tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  task_type       text NOT NULL,                       -- skill name or SOP id
  input_payload   jsonb NOT NULL DEFAULT '{}'::jsonb,
  assignee_kind   text,                                -- 'agent'|'human'|'minion'
  assignee_id     text,                                -- role slug / founder id
  state           text NOT NULL DEFAULT 'pending',
  state_since     timestamptz NOT NULL DEFAULT now(),
  state_payload   jsonb,                               -- orchestration metadata
  state_version   text NOT NULL DEFAULT '1.0.0',
  output_payload  jsonb,
  error           text,
  priority        integer NOT NULL DEFAULT 5,          -- 1 high → 10 low
  parent_task_id  uuid REFERENCES ops.tasks(id),
  context_id      text,                                -- correlation ID
  CONSTRAINT tasks_state_valid CHECK (state IN
    ('pending', 'assigned', 'running', 'completed', 'failed', 'cancelled'))
);

-- ops.task_state_transitions (from migration 00018)
CREATE TABLE ops.task_state_transitions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES ops.tasks(id) ON DELETE CASCADE,
  from_state text,
  to_state   text NOT NULL,
  by_run_id  uuid REFERENCES ops.agent_runs(id) ON DELETE SET NULL,
  reason     text,
  ts         timestamptz NOT NULL DEFAULT now()
);
```

**Note on column naming.** Migration 00018 uses `from_state` / `to_state` to
match `ops.tasks.state`. The v1.0 proposal in this doc said `from_status` /
`to_status`; DB is authoritative.

**Note on missing columns.** What the v1.0 proposal called dedicated columns
now live inside `state_payload`:

| Proposed column | Actual location |
|---|---|
| `blocked_on uuid[]` | `state_payload.blocked_on` |
| `retries_left int` | `state_payload.retries_left` |
| `acceptance_criteria text` | `state_payload.acceptance_criteria` |
| `estimated_done_at timestamptz` | `state_payload.estimated_done_at` |
| `assignee_role text` | split into `assignee_kind` + `assignee_id` |
| `spawned_by_run uuid` | tracked via `ops.task_state_transitions.by_run_id` (parent run is the row inserting the child task) |

### What goes where

| Kind of state | Storage | Notes |
|---|---|---|
| Task identity, parent/child | `ops.tasks` columns (`id`, `parent_task_id`) | One row per task; updates only via state machine |
| Task dependencies | `state_payload.blocked_on uuid[]` | GPS scans on dispatch loop |
| State transitions (audit) | `ops.task_state_transitions` | Append-only log; uses `from_state`/`to_state` |
| Structured task state (waypoints, decisions) | `ops.tasks.state_payload` jsonb | Subagent updates atomically per cycle |
| Retry budget | `state_payload.retries_left` | Decremented by GPS on failure |
| Free-form scratch content per task | `.archives/tasks/<task-id>/` | Local-only, transient, NOT canonical |
| Assets produced (images, reports) | Tier 3 storage (Supabase Storage) | Referenced from state_payload by URL/key |
| Communication transcript with founder | Telegram + ops.agent_runs | Already covered by Bài #2 |

### State payload structure (convention)

`state_payload` is jsonb. The agent runtime should follow a convention:

```json
{
  "version": 1,
  "task_kind": "blog-post-draft",
  "inputs": {
    "topic": "...",
    "wiki_refs": ["wiki/competitors/anki.md"],
    "deadline": "2026-05-15"
  },
  "checkpoints": [
    {"step": "research", "completed_at": "2026-05-02T10:00", "summary": "..."},
    {"step": "outline", "completed_at": "2026-05-02T10:30", "summary": "..."},
    {"step": "draft_v1", "completed_at": "2026-05-02T11:15", "artifact": "tier3://..."}
  ],
  "decisions": [
    {"q": "Include competitor mention?", "a": "yes — per past correction in run abc123", "ts": "..."}
  ],
  "open_questions": [],
  "next_action": "founder_review"
}
```

This is convention, not enforced schema (jsonb is flexible by design). Each pillar may extend the structure for its task kinds.

### Why JSONB over separate columns

- Schema flexibility per task kind
- Single atomic UPDATE per cycle
- Indexable when needed (`->>` operators)
- Avoids 50-column tasks table

Trade-off: less type safety. Mitigation: per-task-kind JSON Schema documents in `knowledge/schemas/task_payloads/<task-kind>.json` (created Phase F as task kinds emerge).

### State machine (`ops.tasks.state`)

```
                  ┌──────────┐
                  │ pending  │  ← task row created; deps in
                  └────┬─────┘     state_payload.blocked_on
                       │  GPS sees deps cleared
                       │  UPDATE state='assigned', spawn subagent
                       ▼
                  ┌──────────┐
                  │ assigned │  ← subagent picked up but not started
                  └────┬─────┘
                       │  subagent begins work
                       │  UPDATE state='running'
                       ▼
                  ┌──────────┐
                  │ running  │  ← subagent working
                  └────┬─────┘
                       │
        ┌──────────────┼──────────────┬─────────────┐
        ▼              ▼              ▼             ▼
   ┌─────────┐   ┌──────────┐   ┌──────────┐  ┌──────────┐
   │completed│   │ failed   │   │cancelled │  │ pending  │  ← retry path:
   └─────────┘   └────┬─────┘   └──────────┘  └──────────┘     GPS resets when
                      │                                          retries_left > 0
                      │ retries_left == 0:
                      │ state stays 'failed', propagate to parent
                      ▼
                 (terminal)
```

**Note on missing states.** v1.0 proposal had explicit `ready` and `blocked`
states. They are NOT in the implemented CHECK constraint:

- `ready` collapsed into `pending`: a task with empty `state_payload.blocked_on`
  IS effectively ready — GPS detects this and transitions straight to
  `assigned`.
- `blocked` (HITL-waiting) collapsed into `pending` with
  `state_payload.hitl_state='waiting'` + an open row in `ops.hitl_runs`.

`task_state_transitions` records every move with `by_run_id` for accountability.

---

## How orchestration interacts with other architecture decisions

### With Bài #2 governance (HITL)

GPS classifies parent task tier. If parent is Tier C, sub-tasks may be lower tier (e.g., a Tier C campaign decomposes to Tier A research + Tier B drafting + Tier C send). HITL approval needed only at the highest-tier sub-task. This is the **HITL ceiling propagation** rule — encoded in `task-decompose` skill.

### With Bài #3 context window

Each subagent has its own `context_budget` per role. Parent (GPS) does NOT pass full context — passes task_id (uuid) only. Subagent reads its task from ops.tasks. This is the lean sub-agent prompt pattern from Bài #3.

### With Bài #4 memory & learning

When a subagent starts, it invokes `episodic-recall` (Bài #4) for its specific action_name. The recall is per-role and per-action. Cross-role pattern (e.g., "growth-orchestrator usually fails this kind of task") is surfaced through `monthly-learning-review` (Bài #4), not through orchestration runtime.

### With Bài #1 manifest

ops.tasks is Tier 2. Schema changes via PR. Subagents have `tier2_schemas_write: ops.tasks` in their permissions per `governance/ROLES.md`.

---

## Anti-patterns to refuse

- **"Spawn 10 subagents to research 10 competitors in parallel."** No — that's 10 × full subagent overhead. Better: 1 subagent with a list of 10 competitors and a fan-out skill, OR 3 subagents each handling 3-4 competitors.
- **"GPS orchestrates AND drafts content directly."** No — GPS orchestrates only. If drafting needed, dispatch to content-drafter subagent.
- **"Skip ops.tasks for simple subagent calls."** No — every spawn writes to ops.tasks for audit, even single-task dispatches.
- **"Use memory tool API for task working notes because it's convenient."** No — see Bài #4 Strategy E. `state_payload` jsonb covers this.
- **"Let subagents write directly to other subagents via shared file."** No — communication is via ops.tasks updates only. Coordination through DB, not shared filesystem.
- **"Run GPS without reading ops.tasks at session start."** No — GPS first action is `SELECT FROM ops.tasks WHERE state IN ('pending','assigned','running')` (plus rows with `state_payload.hitl_state='waiting'` for HITL-blocked work) to recover state.

## When this architecture changes

Triggers to revisit:
- Concrete need for direct teammate-to-teammate communication (Agent Teams becomes worth it)
- ops.tasks query latency becomes a bottleneck (move parts to in-memory cache)
- Anthropic ships matured Agent Teams with predictable cost model
- Multi-day workflow accumulates state too complex for jsonb (separate state store)

Any change is PR to this file + manifest.yaml + relevant skill specs.

---

*Multi-agent orchestration is the most common place AI workforces fail prematurely. Ritsu's answer is conservative: subagents for parallelism, database for state, founder oversight via Telegram. Simple-by-default, observable-via-DB, scale-via-row-not-process.*
