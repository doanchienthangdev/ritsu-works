---
name: monthly-learning-review
description: |
  Monthly cron-triggered skill that reviews the past month of agent
  activity and identifies patterns worth promoting to canonical Tier 1
  (skills, charter, SOPs). Produces a candidate list for founder review.

  Trigger: scheduled by workflow on day 1 of each month at 09:00 ICT.
  Manual trigger: `/run-monthly-review` slash command.

  Output: a Markdown report at .archives/learning-reviews/<YYYY-MM>-
  patterns.md with structured candidates for founder approval. Sends
  Telegram message with link.

  This skill does NOT make Tier 1 changes itself. It only proposes.
  Founder approval converts a candidate into a PR.
allowed-tools:
  - mcp__supabase-ops__query
  - Read
  - Write
  - mcp__telegram__send_message
disable-model-invocation: false
---

# Monthly Learning Review

> Quarterly cadence is too slow; weekly is too frequent for a 1-founder company. Monthly is the sweet spot.

This skill closes the loop in Strategy E. Throughout the month, agents emit run summaries and the founder records corrections. At month-end, this skill aggregates and surfaces what's worth becoming canonical.

## When to use

**Scheduled:** day 1 of each month at 09:00 ICT (Vietnam time), via the workflow runner. Configure in `workflows/monthly-learning-review.yaml` (created in Phase F).

**Manual:** founder may invoke via `/run-monthly-review` for ad-hoc review (e.g., after a big incident).

Do NOT use:
- More frequently than monthly (signal is too noisy)
- For < 4 weeks of accumulated data (too few samples)
- During an ongoing incident (defer until after — stable conditions matter)

## Inputs

| Input | Type | Required | Description |
|---|---|---|---|
| `month` | string | no | YYYY-MM to review; defaults to previous calendar month |
| `roles` | string[] | no | Roles to include; defaults to all non-founder roles |
| `min_pattern_count` | int | no | Minimum recurrences to surface a pattern; default 3 |

## Outputs

| Output | Format | Destination |
|---|---|---|
| Patterns report | Markdown | `.archives/learning-reviews/<YYYY-MM>-patterns.md` |
| Telegram notification | Inline message | Founder's Telegram |
| (optional) Per-pattern PR drafts | Branch + PR | GitHub, only when founder selects "promote" |

## Procedure

### Step 1 — Define the time window

If `month` not provided: set to previous calendar month (e.g., on 2026-05-01, defaults to 2026-04). Compute `start_ts` and `end_ts` boundaries.

### Step 2 — Run pattern queries

Six queries against `ops.*`. Each surfaces a different kind of pattern.

#### Query A — Recurring failures

```sql
SELECT
  agent_role,
  action_name,
  COUNT(*) AS failure_count,
  AVG(cost_usd) AS avg_cost,
  array_agg(DISTINCT id ORDER BY id) AS run_ids
FROM ops.agent_runs
WHERE completed_at BETWEEN $start AND $end
  AND outcome IN ('failed', 'rejected', 'aborted')
GROUP BY agent_role, action_name
HAVING COUNT(*) >= $min_pattern_count
ORDER BY failure_count DESC, avg_cost DESC
LIMIT 20;
```

Action items: each row is a candidate "this fails too often, time for a skill/SOP refinement."

#### Query B — Recurring corrections

```sql
SELECT
  ar.agent_role,
  ar.action_name,
  COUNT(c.id) AS correction_count,
  array_agg(DISTINCT c.correction_note ORDER BY c.correction_note) AS unique_notes
FROM ops.corrections c
JOIN ops.agent_runs ar ON ar.id = c.run_id
WHERE c.ts BETWEEN $start AND $end
GROUP BY ar.agent_role, ar.action_name
HAVING COUNT(c.id) >= $min_pattern_count
ORDER BY correction_count DESC
LIMIT 20;
```

Action items: each row says "founder kept correcting the same thing — codify it."

#### Query C — High-cost outliers

```sql
WITH per_action_stats AS (
  SELECT
    agent_role, action_name,
    AVG(cost_usd) AS mean_cost,
    STDDEV(cost_usd) AS stddev_cost,
    COUNT(*) AS n
  FROM ops.agent_runs
  WHERE completed_at BETWEEN $start AND $end
  GROUP BY agent_role, action_name
  HAVING COUNT(*) >= 5
)
SELECT
  ar.id, ar.agent_role, ar.action_name, ar.cost_usd,
  pas.mean_cost, ((ar.cost_usd - pas.mean_cost) / NULLIF(pas.stddev_cost, 0)) AS z_score
FROM ops.agent_runs ar
JOIN per_action_stats pas USING (agent_role, action_name)
WHERE ar.completed_at BETWEEN $start AND $end
  AND ar.cost_usd > pas.mean_cost + 2 * pas.stddev_cost
ORDER BY z_score DESC
LIMIT 10;
```

Action items: outliers may indicate inefficiency in skill design (too many tool calls, retry loops).

#### Query D — Skills with declining outcomes

```sql
WITH skill_outcomes AS (
  SELECT
    action_name,
    DATE_TRUNC('week', completed_at) AS week,
    SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END)::float / COUNT(*) AS success_rate,
    COUNT(*) AS n
  FROM ops.agent_runs
  WHERE completed_at BETWEEN $start AND $end
  GROUP BY action_name, DATE_TRUNC('week', completed_at)
  HAVING COUNT(*) >= 3
)
SELECT action_name,
       jsonb_agg(jsonb_build_object('week', week, 'success_rate', success_rate, 'n', n)
                 ORDER BY week) AS weekly_trend
FROM skill_outcomes
GROUP BY action_name
HAVING COUNT(*) >= 3 -- at least 3 weeks of data
ORDER BY action_name;
```

In post-processing, flag actions where success_rate dropped > 15% over the month — possible skill regression.

#### Query E — Roles approaching budget caps

```sql
SELECT
  agent_role,
  SUM(cost_usd) AS month_spend,
  COUNT(*) AS run_count,
  AVG(tokens_used) AS avg_tokens
FROM ops.agent_runs
WHERE completed_at BETWEEN $start AND $end
GROUP BY agent_role
ORDER BY month_spend DESC;
```

Compare to each role's `budget.monthly_token_usd` from `governance/ROLES.md`. Flag any role > 80% of cap — needs budget review or skill optimization.

#### Query F — New action_names that emerged

```sql
SELECT
  action_name,
  array_agg(DISTINCT agent_role) AS roles_using,
  COUNT(*) AS first_month_runs,
  AVG(cost_usd) AS avg_cost
FROM ops.agent_runs
WHERE completed_at BETWEEN $start AND $end
  AND action_name NOT IN (
    SELECT DISTINCT action_name FROM ops.agent_runs
    WHERE completed_at < $start
  )
GROUP BY action_name;
```

Action items: new actions may need skill scaffolding. Check whether each new action has a matching SKILL.md; if not, scaffold one.

### Step 3 — Synthesize candidates

For each non-empty result, create a candidate entry:

```yaml
candidate_id: 2026-04-001
type: <recurring_failure | recurring_correction | cost_outlier | skill_regression | budget_pressure | new_action>
priority: <high | medium | low>  # high = appears in multiple queries
agent_role: ...
action_name: ...
evidence:
  run_count: 7
  unique_correction_notes:
    - "..."
    - "..."
  trend: "+/- N% week-over-week"
  example_run_ids: [...]
proposed_change:
  type: <skill_update | charter_update | sop_creation | budget_adjustment | skill_scaffold>
  target_file: skills/blog-post-drafting/SKILL.md
  rationale: |
    Evidence-based reasoning ~3-5 sentences.
  draft_diff: |
    ## Step 2 — Style verification
    + - Always include 1-2 internal links to relevant Ritsu pages
    + - Reject the draft and re-prompt if no internal link slots are available
recommended_action: <promote | watch | discard>
```

Priority rules:
- High: appears in ≥ 2 query types AND has founder corrections
- Medium: single query type but ≥ 5 occurrences
- Low: edge case worth surfacing but minimal evidence

### Step 4 — Write the report

Output Markdown to `.archives/learning-reviews/<YYYY-MM>-patterns.md`:

```markdown
# Learning Review — 2026-04

**Generated:** 2026-05-01 09:03 ICT
**Window:** 2026-04-01 to 2026-04-30
**Total runs analyzed:** 1,847
**Total candidates:** 12 (3 high, 6 medium, 3 low)

## High priority

### Candidate 2026-04-001 — recurring correction in `blog-post-drafting`

**Evidence:**
- 7 runs in April had founder corrections
- 6 of those mentioned "internal links" — same correction repeating
- 1 mentioned "tone too formal"

**Proposed change:** Update `skills/blog-post-drafting/SKILL.md` to require 1-2 internal links per post, mark as quality criterion.

**Draft diff:** [...]

**Founder decision:**
- [ ] Promote (open PR)
- [ ] Watch another month
- [ ] Discard

---

### Candidate 2026-04-002 ...

(...rest of candidates...)

## Statistics summary

[role × spend, action × success_rate, trend charts]

## Open questions for founder

- The `support-agent` `support_reply_drafted` action shows declining success rate (89% → 72% over the month). Worth investigating manually before next review.
```

### Step 5 — Send Telegram notification

```
📊 Monthly Learning Review — 2026-04 ready

Total runs: 1,847
Candidates: 12 (3 high priority)

Top candidate: blog-post-drafting needs internal link rule

[View full report] → link to .archives/learning-reviews/2026-04-patterns.md
```

If founder confirms `[Promote candidate 2026-04-001]` via Telegram, the skill (or a chained workflow) opens a PR with the proposed diff. Founder reviews PR normally.

### Step 6 — Audit

Log this skill's run to `ops.agent_runs` with `action_name: 'monthly-learning-review'`, including:
- candidate_count
- output_path
- founder_actions (filled in later as founder responds)

## Quality criteria

A successful run:
- Completes in < 5 minutes wall-clock
- Produces between 5 and 30 candidates (too few = noise; too many = no signal)
- Each candidate cites concrete run_ids as evidence
- High-priority candidates have a complete `draft_diff`

## Failure modes

- **Insufficient data** — if total runs in the month < 100, skip generation and report "insufficient data, deferring." Do not produce noise.
- **No new patterns** — if 0 candidates surface, generate a brief "no significant patterns" report. Founder still gets confirmation that review ran.
- **Telegram delivery fails** — write report file regardless; founder will see report on next /run-monthly-review.

## Cost estimate

- ~5 SQL queries against ops.* — ~$0.001
- ~10K tokens for synthesis — ~$0.05 at Sonnet rates
- Wall-clock: 1-3 minutes typical
- Once per month, so total annual cost ~$0.60. Negligible.

## Required secrets

- `SUPABASE_OPS_ANON_KEY` (read of ops.*)
- `TELEGRAM_BOT_FOUNDER` (notification)
- `GITHUB_FOUNDER_TOKEN` — only when founder confirms promotion (PR creation)

Roles allowed to invoke: `gps`, `founder`. Per `governance/ROLES.md`.

## Related skills

- `episodic-recall` — the day-to-day learning mechanism this complements
- (planned) `pattern-promote-to-pr` — handles the promotion-to-PR step when founder confirms

## Changelog

- 2026-05-02 — initial version (Strategy E v1.0 spec)

---

*Episodic recall closes the loop within a session. This skill closes the loop across the month. Together they make Ritsu's workforce compound.*

## Brain context

> Per capability `gbrain-operational-brain` v1.0 Sprint 2. Template at `06-ai-ops/skills/brain-write-discipline/SKILL.md`.

**READ (cross-system pattern detection):** Alongside ops.corrections + ops.agent_runs scan, invoke `mcp__gbrain__search "monthly themes"` + `mcp__gbrain__find_anomalies` + `mcp__gbrain__find_contradictions` to surface brain-side patterns that correlate with the month's correction signals. Cost: ~$0.05/month.

**WRITE (after candidate list draft):** `mcp__gbrain__put_page concepts/monthly-review-<YYYY-MM>` with the consolidated cross-system review (correction themes, brain patterns, promotion candidates, recommendations for founder). Tier B notify (will be batched into founder's monthly review digest anyway). Cost: ~$0.05/month.

**Skip** when `--no-brain` OR cost-cap graceful-degrade (monthly review can still produce the .archives/learning-reviews/<month>.md report without brain write).
