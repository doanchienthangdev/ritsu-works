---
name: task-status
description: |
  Use when founder asks about progress of an in-flight orchestration,
  or when GPS needs to check sub-task status before advancing parent.
  Queries ops.tasks + ops.task_state_transitions to render a structured
  status report for a single task tree (parent + descendants) or a
  filtered list of in-progress orchestrations.

  Trigger phrases (founder, via Telegram or CLI):
  - "what's the status of <task description>"
  - "show me current orchestrations"
  - "/tasks", "/status <task-id>"

  Trigger (GPS): before advancing parent task to done, check all children
  are complete via this skill.

  Cost: 1-3 SQL queries, ~200-500 tokens output. Wall-clock ~100ms.
allowed-tools:
  - mcp__supabase-ops__query
  - Read
disable-model-invocation: false
---

# Task Status

> Render orchestration progress as a tree. The skill that turns ops.tasks rows into something a founder reads in 10 seconds.

## When to use

Three trigger contexts:

1. **Founder asks about progress.** Direct invocation via Telegram bot (`/tasks`, `/status <id>`) or CLI.
2. **GPS checks before advancing parent.** Before marking parent task `done`, GPS verifies all children are in terminal state.
3. **Monthly review prep.** `monthly-learning-review` skill uses this to gather completion stats for the past month.

Do NOT use when:
- The caller wants raw SQL — use direct Supabase query, this skill renders for human consumption
- Real-time pub/sub is needed — this is poll-based; pub/sub is post-v1.0

## Inputs

| Input | Type | Required | Description |
|---|---|---|---|
| `mode` | string | yes | `tree` (single parent + descendants) OR `list` (open orchestrations) |
| `task_id` | uuid | conditional | Required for `tree` mode |
| `assignee_role` | string | no | Filter list mode by role |
| `since` | timestamptz | no | Filter list mode to tasks created after timestamp |
| `include_done` | bool | no | Default false; whether to include terminal tasks |

## Outputs

### Tree mode

```yaml
mode: tree
parent:
  id: <uuid>
  description: "..."
  status: in_progress
  assignee_role: gps
  tier: C
  created_at: 2026-05-02T10:00:00Z
  updated_at: 2026-05-02T11:30:00Z
  estimated_done_at: 2026-05-09T18:00:00Z
  acceptance_criteria: "..."

children:
  - id: <uuid>
    description: "..."
    assignee_role: growth-orchestrator
    status: done
    completed_at: 2026-05-02T10:45:00Z
    summary: "..."  # from state_payload.checkpoints last entry
    cost_so_far_usd: 0.04
  - id: <uuid>
    ...
  - id: <uuid>
    description: "..."
    assignee_role: content-drafter
    status: blocked
    blocked_on: [<uuid>, <uuid>]
    blocked_reason: "waiting on competitor research children"

aggregate:
  total_children: 4
  done: 1
  in_progress: 1
  ready: 0
  pending: 0
  blocked: 2
  failed: 0
  total_cost_usd: 0.13
  estimated_remaining: 2 hours
  next_action: "growth-orchestrator on c2 should complete Anki research"
```

### List mode

```yaml
mode: list
filter:
  assignee_role: null
  since: null
  include_done: false

open_orchestrations:
  - parent_id: <uuid>
    description: "..."
    status: in_progress
    children_summary: "1 done, 1 in_progress, 2 blocked, 0 failed"
    started: 2026-05-02T10:00:00Z
    estimated_done: 2026-05-09T18:00:00Z
  - parent_id: <uuid>
    ...

count: 3
```

When rendered to founder via Telegram, this is converted to a compact text:

```
📋 Open orchestrations: 3

🟡 Q4 campaign launch (4 children: 1 done, 1 active, 2 blocked) — ETA May 9
🟢 Newsletter May W2 (3 children: 2 done, 1 active) — ETA today 4pm
🟢 Pricing study brief (2 children: 0 done, 2 active) — ETA tomorrow

/status <id> for details
```

## Procedure

### Step 1 — Validate input

If `mode == 'tree'`: `task_id` required; verify it exists in ops.tasks. If not found, return error.
If `mode == 'list'`: filters optional.

### Step 2 — For tree mode, query parent + children

```sql
-- Parent
SELECT id, status, assignee_role, tier, created_at, updated_at,
       estimated_done_at, acceptance_criteria,
       state_payload->'description' AS description
FROM ops.tasks
WHERE id = $1;

-- Children (recursive descent if needed; v1.0 1-level only)
SELECT t.id, t.status, t.assignee_role, t.created_at, t.updated_at,
       t.blocked_on, t.tier,
       t.state_payload->'description' AS description,
       t.state_payload->'checkpoints'->-1->'summary' AS last_checkpoint,
       (SELECT SUM(cost_usd) FROM ops.agent_runs ar
        WHERE ar.id = ANY (
          SELECT (jsonb_array_elements_text(t.state_payload->'run_ids'))::uuid
        )) AS cost_so_far_usd
FROM ops.tasks t
WHERE t.parent_task_id = $1
ORDER BY t.created_at;
```

### Step 3 — For list mode, query open orchestrations

```sql
SELECT
  t.id AS parent_id,
  t.state_payload->'description' AS description,
  t.status, t.created_at, t.estimated_done_at,
  COUNT(c.id) AS total_children,
  COUNT(c.id) FILTER (WHERE c.status = 'done') AS done,
  COUNT(c.id) FILTER (WHERE c.status = 'in_progress') AS in_progress,
  COUNT(c.id) FILTER (WHERE c.status = 'ready') AS ready,
  COUNT(c.id) FILTER (WHERE c.status = 'pending') AS pending,
  COUNT(c.id) FILTER (WHERE c.status = 'blocked') AS blocked,
  COUNT(c.id) FILTER (WHERE c.status = 'failed') AS failed
FROM ops.tasks t
LEFT JOIN ops.tasks c ON c.parent_task_id = t.id
WHERE t.parent_task_id IS NULL
  AND t.status IN ('in_progress', 'pending', 'ready')
  AND ($assignee_role IS NULL OR t.assignee_role = $assignee_role)
  AND ($since IS NULL OR t.created_at >= $since)
GROUP BY t.id, t.state_payload, t.status, t.created_at, t.estimated_done_at
ORDER BY t.created_at DESC;
```

### Step 4 — Compute aggregates and next_action

For tree mode, derive:

- `aggregate` counts (FILTER aggregations above)
- `total_cost_usd` (sum of children + parent's own ops.agent_runs costs)
- `estimated_remaining` (subtract elapsed, project remaining based on incomplete children)
- `next_action` — heuristic:
  - If any children `blocked` → `"resolve blocker on <child id>"`
  - If any `ready` not yet dispatched → `"dispatch <child id>"`
  - If all children `done` → `"GPS synthesizes and closes parent"`
  - If any `in_progress` → `"<assignee_role> working on <child id>"`

### Step 5 — Render output

Format YAML for programmatic callers (GPS), or compact text for Telegram callers (founder). Caller specifies via `output_format` (default YAML).

For founder/Telegram: text is < 500 chars, uses emoji status indicators (🟢/🟡/🔴), inline `/status <id>` link for drill-down.

### Step 6 — Log

This skill's invocation logs to ops.agent_runs as a Tier A action (read-only, no side effects). No special audit needed beyond standard.

## Examples

### Example 1 — founder asks "/tasks" via Telegram

**Output (compact text):**

```
📋 3 open orchestrations:

🟡 Q4 campaign launch
   4 children: 1 done · 1 active · 2 blocked
   ETA May 9 · cost so far $0.13

🟢 Newsletter May W2
   3 children: 2 done · 1 active
   ETA today 4pm · cost so far $0.08

🟢 Pricing study brief
   2 children: 0 done · 2 active
   ETA tomorrow · cost so far $0.02

Reply /status <id> for details
```

### Example 2 — founder asks "/status 8a3f..." for Q4 campaign

**Output (compact tree):**

```
🟡 Q4 campaign launch (parent 8a3f...)
   Tier C · started May 2 10:00 · ETA May 9 18:00
   Acceptance: brief in 2K words, 3 competitors covered, founder review

Children (4):

✅ research Quizlet (c1...)
   growth-orchestrator · done May 2 10:45 · $0.04

🟡 research Anki (c2...)
   growth-orchestrator · in progress (started 11:00)

⏸ research Khanmigo (c3...)
   growth-orchestrator · ready, awaiting dispatch

🚧 synthesize brief (c4...)
   content-drafter · blocked on c1, c2, c3

Next: GPS to dispatch c3, then wait for synthesis
Cost: $0.13 so far · est. $0.30 total
```

### Example 3 — GPS internal check before advancing parent

GPS invokes with `mode: tree, task_id: <parent>, output_format: yaml`. Receives full structure, checks `aggregate.failed == 0 AND aggregate.in_progress == 0 AND aggregate.pending == 0 AND aggregate.blocked == 0`. If true, proceeds with synthesis. If not, takes corrective action per orchestration-architecture.md.

## Quality criteria

- Returns within 200ms wall-clock for trees up to 20 children
- Output for founder mode fits in 1 Telegram message (< 4096 chars)
- Cost calculations include all subagent costs accurately
- `next_action` field always non-empty for in-progress orchestrations

## Failure modes

- **Task ID not found** — return clear "task does not exist" error; do not return empty silently
- **Schema not yet provisioned** — return "ops.tasks not yet created" with pointer to provision recipe
- **Telegram message too long** — truncate child list, suggest "/status <id> --full" for verbose
- **Database unreachable** — return graceful error; don't block calling skill, just say "status unavailable, retry"

## Cost estimate

- 2-3 SQL queries, ~50ms each
- ~200-800 output tokens
- Per-invocation cost: < $0.005
- Founder uses ~5x/day = $0.025/day = $0.75/month. Negligible.

## Required secrets

- `SUPABASE_OPS_ANON_KEY` (read-only access to ops.*) per `governance/SECRETS.md`

Roles allowed to invoke: all roles with `tier2_schemas_read: ops.*` per ROLES.md. In v1.0, that's: `gps`, `growth-orchestrator`, `support-agent`, `trust-safety`, `code-reviewer`, `etl-runner`, `backoffice-clerk`, plus the founder via Telegram bot.

## Related skills

- `task-decompose` — creates the tasks this skill reports on
- (Phase F) `task-dispatch` — uses this skill's "ready" list to spawn subagents
- `monthly-learning-review` (Bài #4) — uses this skill in aggregate mode to gather monthly stats

## Changelog

- 2026-05-02 — initial version (Bài #5 v1.0 spec)

---

*Observability is what turns "GPS spawned 5 subagents and disappeared" into "Q4 campaign is on track, ETA May 9, here's what's blocking." Database-backed orchestration only works when status queries are fast and clear.*
