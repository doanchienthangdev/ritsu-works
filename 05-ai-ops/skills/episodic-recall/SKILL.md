---
name: episodic-recall
description: |
  Use AT THE START of any non-trivial task to surface the role's recent
  comparable past runs from ops.agent_runs. Returns up to 5 prior runs
  with their summaries, outcomes, costs, and any founder corrections.
  This is the primary learning mechanism for Ritsu agents — invoke
  before reasoning about how to approach a recurring action type.

  Trigger conditions: any task that takes more than one tool call, any
  task that has been performed by this role before, any task where
  founder feedback would have been likely on past runs.

  Skip when: pure read-only one-shot operations (e.g. fetching a single
  metric value), tasks with no historical comparable (action_name has
  never been used), or when role's `episodic_recall_enabled` is false.

  Returns ~1K tokens of structured context. Cost ~50ms wall-clock for
  the SQL query.
allowed-tools:
  - mcp__supabase-ops__query
  - Read
disable-model-invocation: false
---

# Episodic Recall

> Surface relevant past runs before tackling a new task. Strategy E's primary learning loop.

This skill is the heart of how Ritsu agents learn across sessions without file-based memory. Before reasoning about a task, the agent queries `ops.agent_runs` for comparable past runs and reads their summaries. The agent then incorporates those insights — what worked, what failed, what the founder corrected — into the current approach.

## When to use

Use at the **start** of a task, before any other tool calls (except reading task input). Specifically:

- Any task that takes more than one tool call
- Any task whose `action_name` has been performed before by this role
- Any task where founder feedback would likely have happened previously
- Any task where understanding "how this went last time" changes the approach

Do NOT use when:

- Single-shot read operations (e.g., "what's the current count of users?")
- Pure compute operations with no domain context
- The role's `memory_config.episodic_recall_enabled` is `false`
- This is a brand-new `action_name` (no history exists)

## Inputs

| Input | Type | Required | Description |
|---|---|---|---|
| `action_name` | string | yes | The canonical name of the action being performed (e.g. "blog-post-draft", "billing-ticket-reply") |
| `agent_role` | string | yes | The role of the calling agent; defaults to current session's role |
| `match_fields` | string[] | no | Additional fields to match for similarity (default: from role's `recall_match_fields`) |
| `window_days` | int | no | Override role default; how far back to look |
| `max_runs` | int | no | Override role default; cap on rows returned |

## Outputs

A structured summary containing:

```yaml
recall_count: 3                    # how many past runs were found
recall_run_ids: [uuid, uuid, uuid] # exact run IDs (logged into current run for lineage)
recall_tokens_loaded: 612          # cost accounting

past_runs:
  - run_id: <uuid>
    completed_at: 2026-04-28T14:32:00Z
    outcome: success
    cost_usd: 0.04
    tokens_used: 8400
    summary: |
      {{run_summaries.summary content, ~150 tokens}}
    corrections:
      - kind: edit
        note: "Founder shortened the third paragraph; preferred more concrete examples"
        ts: 2026-04-28T15:01:00Z
  - run_id: <uuid>
    ...
```

The agent receives this and incorporates lessons:
- Recurring failure modes → adjust approach
- Past corrections → respect on this run
- Cost trajectory → set realistic budget expectation

## Procedure

### Step 1 — Determine query parameters

Read the role's `memory_config` from `governance/ROLES.md` (cached at session start; re-read if config has been hot-reloaded). Extract `recall_window_days`, `recall_max_runs`, `recall_match_fields`. Override with explicit inputs if provided.

### Step 2 — Build the SQL query

```sql
WITH candidate_runs AS (
  SELECT
    ar.id, ar.completed_at, ar.outcome, ar.cost_usd, ar.tokens_used,
    rs.summary,
    ar.action_name, ar.tool_calls_count
  FROM ops.agent_runs ar
  LEFT JOIN ops.run_summaries rs ON rs.run_id = ar.id
  WHERE ar.agent_role = $1
    AND ar.action_name = $2
    AND ar.completed_at > NOW() - ($3 || ' days')::interval
    AND ar.outcome IN ('success', 'failed', 'rejected')  -- exclude blocked/aborted
  ORDER BY ar.completed_at DESC
  LIMIT $4
),
with_corrections AS (
  SELECT
    cr.*,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'kind', c.correction_kind,
          'note', c.correction_note,
          'ts', c.ts
        )
      ) FILTER (WHERE c.id IS NOT NULL),
      '[]'::jsonb
    ) AS corrections
  FROM candidate_runs cr
  LEFT JOIN ops.corrections c ON c.run_id = cr.id
  GROUP BY cr.id, cr.completed_at, cr.outcome, cr.cost_usd,
           cr.tokens_used, cr.summary, cr.action_name, cr.tool_calls_count
)
SELECT * FROM with_corrections ORDER BY completed_at DESC;
```

Parameters:
- `$1` = `agent_role`
- `$2` = `action_name`
- `$3` = `window_days` as text
- `$4` = `max_runs`

### Step 3 — Execute via MCP supabase-ops

Use the `etl-runner`-scoped readonly query path. Note: this skill must be in the role's `skills:` list AND the calling role must have `tier2_schemas_read: ops.*` permission per `governance/ROLES.md`.

### Step 4 — Format the result

Convert SQL result rows into the YAML output format above. Include:
- The `recall_run_ids` list (record into current `agent_runs.recall_run_ids[]` for lineage)
- The `recall_tokens_loaded` count (sum of summary lengths × token estimate)

If 0 runs found: return `recall_count: 0` and a brief note "no comparable past runs in last N days" — do not error.

### Step 5 — Return to caller

Return the formatted YAML. Caller agent reads it as part of its preamble and proceeds to the actual task.

## Example output (good)

```yaml
recall_count: 3
recall_run_ids:
  - 8b2a4c1f-...
  - 3e9d6f2a-...
  - 1c4b7d8e-...
recall_tokens_loaded: 612

past_runs:
  - run_id: 8b2a4c1f-...
    completed_at: 2026-04-28T14:32:00Z
    outcome: success
    cost_usd: 0.04
    tokens_used: 8400
    summary: |
      Drafted blog post about "AI tutoring for STEM students". Used
      brand voice (active, concrete). Included 2 internal links.
      Founder approved unedited. Took 6 tool calls including 1 wiki
      fetch for competitor pricing context.
    corrections: []

  - run_id: 3e9d6f2a-...
    completed_at: 2026-04-21T10:14:00Z
    outcome: success
    cost_usd: 0.05
    tokens_used: 9100
    summary: |
      Drafted blog post about "Why flashcards still beat AI chat".
      Used brand voice. Included no internal links (mistake — see
      correction).
    corrections:
      - kind: edit
        note: "Add 1-2 internal links per blog post — improves SEO
               and bounces. Standard going forward."
        ts: 2026-04-21T11:30:00Z

  - run_id: 1c4b7d8e-...
    completed_at: 2026-04-15T09:00:00Z
    outcome: rejected
    cost_usd: 0.03
    tokens_used: 6200
    summary: |
      Attempted draft about competitor's funding round. Founder
      rejected — "not our voice; we don't comment on competitors'
      business news, only on product/learning-science angles".
    corrections:
      - kind: reject
        note: "Don't draft posts about competitor funding/business
               news. Stay in the product + learning-science lane."
        ts: 2026-04-15T09:45:00Z
```

The agent reading this learns:
- Active-voice brand voice is consistent
- Add 1-2 internal links (corrected once already)
- Stay away from competitor business news
- Cost expectation: $0.03-0.05 per draft

## Quality criteria

A successful invocation:
- Returns within 200ms wall-clock
- Loads ≤ `recall_max_runs × 250` tokens into context
- Includes corrections data when present (most valuable signal)
- Records `recall_run_ids` into current `agent_runs.recall_run_ids` for lineage

## Failure modes

- **Schema not yet provisioned** — if `ops.run_summaries` or `ops.corrections` don't exist (pre-Phase B), return empty result with a note. Do not error the calling task.
- **Query timeout** — if SQL takes > 1s, return empty with note. Recall is helpful but not required; never block the actual task.
- **Permission denied** — if calling role lacks `tier2_schemas_read: ops.*`, return empty with a clear note that the role's `memory_config` says recall is enabled but role permissions don't grant access. Open a governance issue.

## Cost estimate

- Tokens loaded into context: ~150 × `max_runs` (summaries dominate) + ~50 overhead
- SQL query cost: ~free (<$0.0001 per call assuming Supabase free tier query overhead)
- Wall-clock: ~50-150ms typical

For a role doing 1000 tasks/month with `max_runs=5`, recall adds ~750K tokens/month to context. At Sonnet rates, that's roughly $2-3/month per high-volume role. Strategy E's compounding learning is worth this.

## Required secrets

- `SUPABASE_OPS_ANON_KEY` (read-only) per `governance/SECRETS.md`

Roles allowed to invoke: any role with `episodic_recall_enabled: true` per `governance/ROLES.md`. Currently: all 8 non-founder roles.

## Related skills

- `monthly-learning-review` — uses ops.corrections + ops.agent_runs to identify patterns worth promoting to Tier 1
- (planned post-v1.0) `cross-role-recall` — for cases where pattern from one role informs another

## Changelog

- 2026-05-02 — initial version (Strategy E v1.0 spec)

---

*The session ends, but the database persists. This skill is how that persistence becomes useful — by giving the next session a structured glimpse of what came before.*
