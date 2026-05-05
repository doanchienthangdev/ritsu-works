---
name: cost-report
description: |
  Use when founder asks about cost breakdown, unit economics, budget
  status, or spend trends. Queries `ops.cost_attributions` and
  `ops.budget_alerts` to render structured reports for Telegram or
  programmatic callers.

  Trigger phrases (founder, via Telegram or CLI):
  - "/cost", "/cost <topic>"
  - "what's our spend this month"
  - "cost per support ticket"
  - "show me budget status"
  - "Economic Health Score"
  - Vietnamese: "/chi-phi", "chi phí tháng này", "ROI"

  Trigger (other roles): when generating monthly digest section, when
  cost-optimization-review needs current data.

  Cost: 1-3 SQL queries, ~300-1000 tokens output. Wall-clock ~150ms.
allowed-tools:
  - mcp__supabase-ops__query
  - Read
disable-model-invocation: false
---

# Cost Report

> The skill that turns rows of `ops.cost_attributions` into a Telegram message a founder reads in 15 seconds. The everyday window into AI workforce economics.

## When to use

Three trigger contexts:

1. **Founder asks about cost.** Direct invocation via Telegram bot (`/cost`, `/cost monthly`, `/cost per-ticket`) or CLI.
2. **Monthly digest generation.** `monthly-learning-review` (Bài #4) Economics section pulls from this skill.
3. **Optimization review prep.** `cost-optimization-review` skill uses this in aggregate mode.

Do NOT use when:
- Founder wants raw SQL or CSV — use direct Supabase query, this skill renders for human consumption
- Real-time per-call cost is needed during a session — use `total_cost_usd` from agent SDK directly

## Inputs

| Input | Type | Required | Description |
|---|---|---|---|
| `mode` | string | yes | `summary` / `by_role` / `by_task_kind` / `unit_economics` / `health_score` / `budget_status` / `time_series` |
| `period` | string | conditional | `today` / `this_week` / `this_month` / `last_30d` / `last_n_days:<n>` (default `this_month`) |
| `role` | string | optional | filter by single role |
| `task_kind` | string | optional | filter by single task_kind |
| `output_format` | string | optional | `telegram` (default), `yaml`, `markdown` |
| `compare_to_previous` | bool | optional | include period-over-period comparison |

## Outputs

### `mode: summary` (default for `/cost`)

```yaml
mode: summary
period: this_month
period_start: 2026-05-01
period_end: 2026-05-02
days_elapsed: 2
days_remaining_in_period: 29

total:
  cost_usd: 47.32
  budget_usd: 1400.00
  ratio: 0.034
  projected_eom_cost_usd: 686.14
  projected_eom_ratio: 0.490

by_role:
  - role: growth-orchestrator
    cost_usd: 18.40
    budget_usd: 300.00
    ratio: 0.061
    rank: 1
  - role: support-agent
    cost_usd: 12.10
    budget_usd: 400.00
    ratio: 0.030
  # ... (top 5 by cost)

cache_efficiency:
  hit_ratio: 0.71
  status: healthy

economic_health_score: 87
status: healthy

next_action: none — within target ranges
```

Telegram-formatted version:

```
💰 Cost this month so far

Total: $47.32 / $1400 (3%) — 2 days in
Projected end-of-month: $686 (49%)
Health Score: 87 ✅

Top 3 roles:
🥇 growth-orchestrator: $18.40 / $300 (6%)
🥈 support-agent: $12.10 / $400 (3%)
🥉 content-drafter: $8.20 / $200 (4%)

Cache efficiency: 71% ✅
Status: healthy

/cost by_task_kind for breakdown
```

### `mode: by_task_kind`

```yaml
mode: by_task_kind
period: last_30d

results:
  - task_kind: support-ticket-reply
    invocation_count: 142
    total_cost_usd: 12.36
    avg_cost_usd: 0.087
    median_cost_usd: 0.082
    p95_cost_usd: 0.18
    p99_cost_usd: 0.31
    soft_cap_usd: 0.10
    within_cap_pct: 0.93
    status: healthy

  - task_kind: blog-post-draft
    invocation_count: 8
    total_cost_usd: 14.72
    avg_cost_usd: 1.84
    p95_cost_usd: 4.30
    soft_cap_usd: 2.00
    within_cap_pct: 0.75
    status: warning   # 25% of runs over soft cap

  # ... ordered by total_cost_usd desc
```

### `mode: unit_economics`

```yaml
mode: unit_economics
period: this_month

metrics:
  cost_per_support_ticket:
    value_usd: 0.087
    target_usd: 0.10
    deviation: -0.13   # negative = better than target
    status: healthy

  cost_per_blog_post:
    value_usd: 1.84
    target_usd: 2.00
    status: healthy

  cost_per_signup_attributed:
    value_usd: 0.42
    notes: |
      Attribution: (growth-orchestrator + support-agent costs in
      acquisition funnel) / signups in period.
      Heuristic at v1.0; per-customer attribution defer to v1.x.

  cache_hit_ratio:
    value: 0.71
    target: 0.70
    status: healthy

  output_to_input_ratio:
    value: 0.31
    note: lower is healthier (less verbose); typical 0.2-0.4
```

### `mode: health_score`

```yaml
mode: health_score
period: this_month_to_date

score: 87
status: healthy

breakdown:
  budget_health: 0.97        # weight 0.40 → 38.8 points
  unit_economics_health: 0.85 # weight 0.30 → 25.5 points
  cache_efficiency: 0.71     # weight 0.15 → 10.7 points
  io_ratio_health: 0.80      # weight 0.15 → 12.0 points
  total: 87.0

trend:
  last_week: 84
  delta: +3
```

### `mode: budget_status`

```yaml
mode: budget_status
period: this_month

roles:
  - role: gps
    cost_usd: 4.21
    cap_usd: 200
    ratio: 0.021
    status: ok   # < 80%
  - role: growth-orchestrator
    cost_usd: 18.40
    cap_usd: 300
    ratio: 0.061
    status: ok
  # ...

active_alerts:
  - alert_kind: warning_80
    role: <none>
    ts: <none>
  # if any alerts unresolved, listed here
```

## Procedure

### Step 1 — Validate inputs

If `mode` invalid → return error with valid options.
Resolve period to concrete `(period_start, period_end)` timestamps.

### Step 2 — Run primary query for the requested mode

#### `summary` mode SQL:

```sql
WITH role_costs AS (
  SELECT agent_role,
         SUM(cost_usd) AS cost_usd,
         COUNT(*) AS call_count,
         SUM(cache_read_tokens) AS cache_read,
         SUM(input_tokens) AS total_input
  FROM ops.cost_attributions
  WHERE ts >= $period_start AND ts < $period_end
  GROUP BY agent_role
)
SELECT * FROM role_costs ORDER BY cost_usd DESC;
```

Then for each role, look up `economic_budget.monthly_cap_usd` from cached ROLES.md (loaded at session start; cached per session).

#### `by_task_kind` mode SQL:

```sql
SELECT task_kind,
       COUNT(*) AS invocation_count,
       SUM(cost_usd) AS total_cost_usd,
       AVG(cost_usd) AS avg_cost_usd,
       PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY cost_usd) AS median_cost_usd,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cost_usd) AS p95_cost_usd,
       PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY cost_usd) AS p99_cost_usd
FROM ops.cost_attributions
WHERE ts >= $period_start AND ts < $period_end
  AND ($task_kind IS NULL OR task_kind = $task_kind)
GROUP BY task_kind
ORDER BY total_cost_usd DESC;
```

Cross-reference per-task-kind soft caps from ROLES.md `economic_budget.per_task_kind_caps` to compute `within_cap_pct`.

### Step 3 — Compute health score (if mode requires)

```python
def health_score(period_data, role_budgets):
    # 1. Budget health
    total_cost = sum(r.cost_usd for r in period_data.roles)
    total_budget = sum(role_budgets.values())
    budget_ratio = total_cost / total_budget if total_budget else 0
    budget_health = max(0, min(1, 1 - max(0, budget_ratio - 0.5) * 2))
    # 1.0 if < 50% used, scales linearly to 0 at 100%

    # 2. Unit economics health
    within_cap = sum(tk.within_cap_pct * tk.invocation_count
                     for tk in period_data.task_kinds)
    total_calls = sum(tk.invocation_count for tk in period_data.task_kinds)
    unit_health = within_cap / total_calls if total_calls else 1.0

    # 3. Cache efficiency
    cache_hit = period_data.cache_read_tokens / period_data.total_input_tokens

    # 4. IO ratio health (output / input, capped at 0.4 = healthy ceiling)
    io_ratio = period_data.output_tokens / period_data.input_tokens
    io_health = max(0, 1 - max(0, io_ratio - 0.2) / 0.4)

    score = (40 * budget_health +
             30 * unit_health +
             15 * cache_hit +
             15 * io_health)
    return round(score)
```

### Step 4 — Format output

If `output_format == 'telegram'`:
- Use compact text with emoji status indicators (✅/⚠️/🔴)
- Stay under 1500 chars per message
- Suggest `/cost <subcommand>` for drill-down

If `output_format == 'yaml'`: return raw structured output.

If `output_format == 'markdown'`: structured markdown with tables (used in monthly digest).

### Step 5 — Log invocation

This is a Tier A read-only action. Log to `ops.agent_runs` with `action_name: 'cost-report'` for completeness.

## Examples

### Example 1 — Founder asks `/cost` mid-month

**Input:** `mode: summary, period: this_month, output_format: telegram`

**Output:**

```
💰 May 2026 cost so far (12 days in, 19 to go)

Total: $324 / $1400 (23%)
Projected EOM: $837 (60%)
Health Score: 84 ✅

Top roles:
🥇 growth-orchestrator: $128 / $300 (43%)
🥈 support-agent: $89 / $400 (22%)
🥉 content-drafter: $61 / $200 (31%)

Cache: 73% ✅ · Output/input: 0.28 ✅
Status: healthy

/cost by_task_kind · /cost unit_economics
```

### Example 2 — Founder asks `/cost per-ticket`

**Input:** `mode: unit_economics, output_format: telegram`

**Output:**

```
📊 Unit economics — last 30 days

Cost per support ticket: $0.087
   Target: $0.10 · Status: ✅ healthy
   142 tickets, p95 = $0.18

Cost per blog post: $1.84
   Target: $2.00 · Status: ✅ healthy
   8 posts, p95 = $4.30 ⚠️ 2 outliers

Cost per signup: $0.42
   v1.0 heuristic — per-customer in v1.x

Cache hit: 71% ✅
Status: 1 warning (blog outliers)

/cost task_kind:blog-post-draft for outlier details
```

### Example 3 — Monthly digest call (programmatic)

**Input:** `mode: summary, period: this_month, output_format: markdown, compare_to_previous: true`

**Output:** structured markdown with tables, ready to paste into `monthly-learning-review` Economics section.

## Quality criteria

- Returns within 200ms wall-clock for periods up to 90 days
- Telegram output fits in single message (< 4096 chars)
- Health score reproducible (deterministic given same data)
- Period-over-period comparisons accurate (no double-counting in overlap)

## Failure modes

- **No data for period** — return graceful "no cost data for {period}" with suggestion to check `ops.cost_attributions` table is populated
- **Role budget not found in ROLES.md** — assume monthly_cap_usd = $0 (unlimited tracking, no enforcement). Log warning.
- **Period > 1 year** — refuse with note "use a smaller window or build a custom query for long-term trends"
- **Database unreachable** — return graceful error; don't block calling skill

## Cost estimate

- 1-3 SQL queries, ~50ms each
- ~500 input tokens (period defs + format)
- ~500-1500 output tokens depending on mode
- Per-invocation cost: < $0.01
- Founder uses ~2-5x/day = $0.05/day = $1.50/month. Negligible.

## Required secrets

- `SUPABASE_OPS_ANON_KEY` (read-only access to `ops.cost_attributions` and `ops.budget_alerts`) per `governance/SECRETS.md`

Roles allowed to invoke: any role with `tier2_schemas_read: ops.*`. Mostly used by `gps` (when founder asks via Telegram), `monthly-learning-review` runs.

## Related skills

- `cost-optimization-review` (Bài #7) — uses cost-report aggregate data to propose optimizations
- `monthly-learning-review` (Bài #4) — invokes for Economics section
- `task-status` (Bài #5) — orthogonal; cost-report covers economics, task-status covers orchestration

## Changelog

- 2026-05-02 — initial version (Bài #7 v1.0 spec)

---

*Visibility is the prerequisite for control. This skill is the visibility layer for AI workforce economics.*
