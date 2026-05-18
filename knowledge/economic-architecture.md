# Economic Architecture

> Canonical reference for how Ritsu instruments, monitors, and optimizes the economics of its AI workforce. The infrastructure that turns "we spent $X this month" into "support-agent on Vietnamese tickets is 3x average cost — investigate."

**Status:** v1.0 spec
**Last updated:** 2026-05-02
**Related:** `governance/ROLES.md`, `knowledge/manifest.yaml`, `_build/notes/problem-7-economic-unit.md`

---

## Why this document exists

A workforce that fails economic instrumentation suffers six failure modes:

1. **Silent cost spiral** — bug in a skill loops, $200 vanishes overnight, founder discovers next billing cycle
2. **Aggregate visibility trap** — "we spent $300" without breakdown by role/task/customer is unactionable
3. **Wrong unit economics** — pricing decisions made without knowing actual cost-per-active-user
4. **No optimization signal** — "cost is high" without knowing where to optimize
5. **Soft budgets, no enforcement** — caps in ROLES.md are aspirational without runtime gates
6. **LTV unknown** — customer value not tracked relative to AI cost

Bài #1-#6 covered quality and governance. **Bài #7 covers solvency.** Without the structures here, Ritsu may operate in economic darkness — possibly losing money without knowing.

This document defines the four axes of economic instrumentation, the v1.0 chosen answer for each, and the 30-day calibration discipline that makes thresholds data-driven rather than guessed.

## The four axes

| Axis | Question | v1.0 Decision |
|---|---|---|
| 1 | Where does cost get attributed? | Per-role + per-task-kind (1B) |
| 2 | What happens when budget is exceeded? | Hybrid: alert 80%, escalate 100%, block 150% (2C) |
| 3 | How does founder see unit economics? | Skill (`cost-report`) + monthly digest extension (3D) |
| 4 | When/how to trigger optimization? | Recommendation skill, weekly PR (4C) |

The combination is **1B + 2C + 3D + 4C** as decided in `_build/notes/problem-7-economic-unit.md`.

---

## Axis 1 — Cost Attribution Granularity

### The decision: per-role + per-task-kind

Every Anthropic API call is attributed to:

1. **Role** — via per-role API key (`ANTHROPIC_{ROLE}_KEY` per Bài #6 IDENTITY.md)
2. **Task kind** — via `ops.tasks.state_payload.task_kind` (Bài #5)

Combined attribution: `(role, task_kind, ts)` is the granularity unit.

### Why not finer (per-customer)

Per-customer attribution requires:
- Linking every call to a `customer_id` (when applicable)
- Schema overhead in `ops.tasks` and `ops.cost_attributions`
- Privacy considerations (cost data is sensitive at customer level)
- Hard for non-customer-facing tasks (internal research, code review, etc.)

Defer to v1.x when concrete need emerges. v1.0 LTV calculations use coarse heuristics (cost / signups, cost / active users at aggregate).

### Why not coarser (per-role only)

Per-role only cannot answer:
- "What's our cost per support ticket reply?"
- "Did the new blog-drafting skill increase or decrease per-post cost?"
- "Which task_kind eats the most growth-orchestrator budget?"

These are unit economics questions. Without them, optimization is guesswork.

### Schema additions

New table `ops.cost_attributions`:

```sql
CREATE TABLE ops.cost_attributions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                uuid REFERENCES ops.agent_runs(id),
  task_id               uuid REFERENCES ops.tasks(id),
  agent_role            text NOT NULL,
  task_kind             text NOT NULL,  -- from state_payload.task_kind, or 'ad_hoc'
  model                 text NOT NULL,  -- 'claude-opus-4-7', 'sonnet-4-6', etc.
  service_tier          text NOT NULL DEFAULT 'standard',  -- 'standard'|'batch'|'priority'
  input_tokens          int NOT NULL,
  cache_creation_tokens int NOT NULL DEFAULT 0,
  cache_read_tokens     int NOT NULL DEFAULT 0,
  output_tokens         int NOT NULL,
  cost_usd              numeric(10,6) NOT NULL,  -- precise to micro-dollar
  ts                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cost_role_ts ON ops.cost_attributions (agent_role, ts DESC);
CREATE INDEX idx_cost_role_taskkind_ts ON ops.cost_attributions (agent_role, task_kind, ts DESC);
CREATE INDEX idx_cost_task ON ops.cost_attributions (task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_cost_ts ON ops.cost_attributions (ts DESC);
```

Population: hook `pre-llm-call-budget` writes a row on each LLM call (or batch every N calls if perf concern). Cost calculation uses Anthropic pricing (cached locally, refreshed monthly via PR to manifest).

### Reconciliation with Anthropic billing

Daily job (post-Phase D, or earlier if needed):

1. Query Anthropic Usage and Cost Admin API for previous day
2. Compare aggregate `ops.cost_attributions.cost_usd` for that day vs Anthropic's reported cost
3. If discrepancy > 5%, alert founder — likely indicates ops.cost_attributions miscounting OR untracked external usage

This catches ETL bugs and "shadow Claude usage" (e.g., founder's personal CLI on a workspace key).

### task_kind taxonomy

Initial task_kinds (v1.0):

- `support-ticket-reply` — single customer email/chat reply
- `support-ticket-thread` — multi-message thread resolution
- `blog-post-draft` — long-form content creation
- `blog-post-revision` — editing existing draft
- `weekly-newsletter` — newsletter compilation
- `social-post-draft` — Twitter/LinkedIn post draft
- `competitive-research-single` — research on one competitor
- `competitive-research-brief` — synthesis across multiple
- `code-review` — PR review
- `etl-sync` — data extraction job
- `monthly-learning-review` — Bài #4 monthly job
- `cost-report-query` — Bài #7 query
- `ad-hoc` — uncategorized (alert if > 10% of volume)

New kinds are added by PR to this file (Tier B). Reclassification is fine in retrospect (UPDATE allowed); founders or analysts may relabel for cleaner cohorts.

---

## Axis 2 — Budget Enforcement

### The decision: 3-tier hybrid (80% / 100% / 150%)

Soft alert at 80%, escalate at 100%, hard block at 150%. Per role per month.

### Levels

#### Level 1 — Soft alert at 80% of monthly budget

Hook `pre-llm-call-budget` returns `allow` but logs `delegation_signal: 'budget-warning-80'`. The agent runtime injects an ambient note:

```
[budget hint] Your role's monthly budget is 80% consumed. 6 days remain in month. Consider:
- Switch to Sonnet/Haiku for remaining tasks where appropriate
- Defer non-urgent work to next month
- Check cost-report skill for top consumers
```

No founder notification at 80% (would be noisy). Telegram notify at first 80% breach per role per month, then quiet.

#### Level 2 — Escalate at 100% of monthly budget

Hook returns `escalate`. Tool call held; founder approval required via Telegram.

```
⚠️ growth-orchestrator hit 100% monthly budget ($300)
   Run #abc123 wants to use Opus on competitive-research-brief (~$2)
   Approve override? (Y/N) - or set budget to $400 for this month
```

Founder approves → call proceeds. Founder denies → call blocked, agent must adapt (use cheaper model, defer task, etc.).

#### Level 3 — Hard block at 150%

Hook returns `block`. No founder approval option from this hook (security ceiling). To exceed 150%, founder must explicitly raise the role's monthly budget via PR to ROLES.md (Tier C ceremony per HITL.md).

This protects against:
- Founder approving overages reflexively without realizing total impact
- Compromised role attempting to drain budget
- Programming bug that founder can't immediately diagnose (force investigation)

### Per-task-kind sub-budgets

Beyond the per-role monthly cap, each task_kind has a per-instance soft cap. Initial defaults (CALIBRATE after 30 days):

| task_kind | Soft cap per instance | Notes |
|---|---|---|
| support-ticket-reply | $0.10 | If a single reply costs >$0.20, alert |
| blog-post-draft | $2.00 | If >$4, escalate |
| weekly-newsletter | $5.00 | If >$10, escalate |
| competitive-research-single | $1.00 per competitor | |
| monthly-learning-review | $3.00 | |
| code-review | $0.30 | |
| etl-sync | $0.05 | |
| **wiki-distill-pdf** | $2.00 | v3.0; per-PDF chunk-split + extract |
| **wiki-distill-folder** | $15.00 (Tier B confirm above $5) | v3.0; raised per Muse M6 — 20-paper growth corpus ≈ $10 expected |
| **wiki-distill-other** | $0.50 | v3.0; URL/Markdown/YouTube/meeting distill |
| **wiki-ingest-verbatim** | $0.30 | v3.0; `--verbatim` flag (v2.0 fallback path) |
| **wiki-review-batch** | $0.20 | v3.0; one `/wiki review` session |
| **wiki-dedup-batch** | $0.30 | v3.0; per-source dedup pass (OpenAI embedding cost) |
| **wiki-merge** | $0.05 | v3.0; mostly DB rewires |
| **wiki-ask** | $0.10 | v3.0; question embedding + retrieval; synthesis done by caller LLM |
| **wiki-audit** | $0.50 | v3.0 (unchanged from v2.0); 9 checks including 4 v3.0 distill-aware |

DEPRECATED wiki task_kinds (kept for transition window through v3.1; auto-mapped at hook level):
- `wiki-ingest-pdf` ($1.00) → `wiki-distill-pdf` (default) OR `wiki-ingest-verbatim` (`--verbatim`)
- `wiki-ingest-other` ($0.30) → `wiki-distill-other` OR `wiki-ingest-verbatim`
- `wiki-ingest-folder` ($2.00) → `wiki-distill-folder` (raised to $15)

Per-instance soft cap = task itself triggers escalation if estimated cost exceeds threshold mid-run (not just total monthly). This catches the "single bug looped task" scenario.

Caps are calibrated, not guessed. v1.0 ships with these defaults; first 30 days observe actual distributions; founder PR sets data-driven thresholds at p95 of healthy runs.

### Why 3-tier and not just hard-block-at-100%

Hard-block-at-100% (Option 2B) over-protects:
- Legitimate spikes (week 1 of launch, content campaign push) get blocked
- Frustrating UX during normal volatility
- Founder ends up always raising caps reactively

Soft-alert-only (Option 2A) under-protects:
- Silent spirals not caught until billing
- Founder must remember to check alerts
- The #1 failure mode persists

3-tier (2C) balances:
- 80% gives ambient awareness (ambient = doesn't break flow)
- 100% gives founder a decision point (explicit, not surprise)
- 150% gives a structural stop (forces investigation, not approval-fatigue)

### What the hook actually checks

Per LLM call attempt:

1. Calculate `current_role_month_cost` from `ops.cost_attributions WHERE role = X AND ts >= month_start`
2. Lookup `monthly_budget_usd` from ROLES.md `economic_budget.monthly_cap_usd`
3. Calculate ratio `current / budget`
4. Decision:
   - ratio < 0.8 → allow
   - 0.8 ≤ ratio < 1.0 → allow with `budget-warning-80`
   - 1.0 ≤ ratio < 1.5 → escalate (founder approval)
   - ratio ≥ 1.5 → block (hard)
5. Also check per-task-kind soft cap: if ESTIMATED call cost would push current task instance above its per-instance cap, escalate

Estimation uses recent historical cost for that task_kind (avg of last 10 runs). For first runs, estimation is conservative (use upper bound).

---

## Axis 3 — Unit Economics Surfacing

### The decision: skill + monthly digest

Two complementary mechanisms:

1. **Skill `cost-report`** — query-on-demand for ad-hoc questions
2. **Monthly digest** — extension of `monthly-learning-review` (Bài #4) with an Economics section

No web dashboard at v1.0 (consistent with Bài #6 sub-domain B).

### `cost-report` skill — what it answers

The skill takes a query intent and returns structured output. Example queries:

- "Cost this month so far" → role breakdown + total + projected EOM
- "Cost per support ticket last 30 days" → avg + median + p95 + count
- "Top 5 most expensive task_kinds last week" → ranked list with deltas
- "growth-orchestrator costs since launch" → time series + trend
- "Cache efficiency this week" → cache_read / total_input ratio

Founder invokes via Telegram: `/cost`, `/cost <topic>`. Per Bài #5 task-status pattern, output is text-formatted for Telegram, structured for programmatic callers.

### Monthly digest — what it adds

Extending `monthly-learning-review` (Bài #4) with new section "Economics":

```
## Economics — May 2026

### Total spend
- Anthropic API: $923 (vs $1,400 budget = 66%)
- Other AI services: $32
- Grand total: $955

### Top 3 cost drivers
1. growth-orchestrator: $290 (97% of role budget) — heavy launch month
2. support-agent: $215 (54% of role budget)
3. content-drafter: $145 (73% of role budget)

### Unit economics highlights
- Avg cost per support ticket: $0.083 (target $0.10 — healthy)
- Avg cost per blog post: $1.84 (target $2.00 — healthy)
- Cost per signup conversion: $0.42 (calculated from growth + support attribution)
- Cache hit ratio: 73% (healthy, target >70%)

### Anomalies
- "Blog-post-draft" had 3 outlier runs >$5 (typical is $2). Investigation: see PR #234.
- "ad-hoc" task_kind = 14% of volume (target <10%) — taxonomy gap

### Recommendations (auto-generated)
[Pre-rendered output of cost-optimization-review skill]
```

Founder reads monthly. Anomalies become PRs.

### Economic Health Score

Single number 0-100, computed weekly. Founder's at-a-glance metric.

```
score = (
    40 * budget_health        # 1.0 if total < 80% budget, scales down
  + 30 * unit_economics_health # 1.0 if all task_kinds within their soft caps
  + 15 * cache_efficiency      # cache_read_tokens / total_input_tokens
  + 15 * io_ratio_health       # output / input ratio (lower = healthier; we cap)
)
```

- ≥ 80: healthy
- 60-79: warning (review recommendations)
- < 60: action needed (founder triages this week)

Stored as `ops.budget_alerts` row when score < 80, persisted week over week. Surfaced in Telegram weekly summary (Sunday morning).

---

## Axis 4 — Optimization Triggers

### The decision: recommendation skill, weekly PR

Skill `cost-optimization-review` runs weekly (cron in v1.x; manual invocation in v1.0). Generates a PR proposing specific changes. Founder reviews + approves.

### What the skill produces

Each weekly invocation produces a PR with:

1. **Findings** — observations about cost patterns from past 7-30 days
2. **Specific recommendations** — concrete changes with expected savings
3. **Risk assessment** — what could regress (quality, latency, capability)
4. **Implementation diffs** — actual file changes (governance/ROLES.md budget adjustments, skill model overrides, prompt-caching enable, etc.)

Example recommendations:

- **Model downgrade:** "support-ticket-reply uses Opus 4.7 (avg $0.18). Sonnet 4.6 would be ~$0.06 with comparable quality on 95% of tickets per past A/B. Estimated monthly savings: $80."
- **Prompt caching:** "blog-post-draft skill loads CLAUDE.md + brand_voice.md + transparency.md (~3K tokens) every call. Adding cache_control on these saves ~$0.04/call × 50 calls/month = $2/month. Diff attached."
- **Batch tier migration:** "etl-sync runs hourly but is not time-sensitive. Moving to Batch tier saves 50% on those costs ($25/month)."
- **Context trimming:** "monthly-learning-review session preamble is ~12K tokens. Sub-skills don't need full HITL.md context. Loading lazily would save ~$1/run."

### Why recommendation, not auto-optimize

Auto-optimization (4B) has hidden risks:
- Quality regression silent (e.g., Haiku gives wrong answer on edge cases that humans would have caught)
- Capability boundaries shift (Opus may be needed for some specific task_kinds in ways data won't show)
- Founder loses understanding of WHY costs decreased

Manual-only (4A) misses opportunities:
- Founder is busy
- Optimization opportunities accumulate; one-time review insufficient

Recommendation pattern:
- Skill surfaces opportunities (the "find" is the hard part)
- Founder approves with full context (low cognitive load — diff already prepared)
- Knowledge stays with founder (each PR is a small lesson)

### Composition with monthly review

`cost-optimization-review` (weekly) feeds into `monthly-learning-review` (Bài #4 monthly):
- Weekly skill outputs go to `.archives/cost-reviews/YYYY-WW.md`
- Monthly review reads these and surfaces themes ("4 of 4 weeks recommended caching for X — let's just do it")

This way, weekly review can stay narrow (specific) while monthly review zooms out (strategic).

---

## How economic architecture interacts with other bài-toán

### With Bài #1 (manifest)

`ops.cost_attributions`, `ops.budget_alerts`, `ops.optimization_recommendations` are Tier 2 schemas. Manifest tracks them. Schema changes via PR.

### With Bài #2 (governance)

- Per-role budget caps live in ROLES.md `economic_budget` field (extended in this bài)
- `pre-llm-call-budget` hook is Tier-A always-on safety hook
- Budget cap changes are Tier C (founder approval to raise budget)
- Budget reduction is Tier B (auto-allowed, conservative direction)

### With Bài #3 (context economics)

Cost reduction via context trimming is one axis of optimization. `cost-optimization-review` checks for context bloat and recommends Bài #3 patterns (lazy load, compaction, subagent fork).

### With Bài #4 (memory & learning)

- Monthly digest is part of `monthly-learning-review`
- `ops.corrections` from Bài #4 is correlated with cost: are corrections expensive in tokens? Budget for them?
- Episodic recall (Bài #4) is itself a cost — track its overhead vs benefit

### With Bài #5 (multi-agent orchestration)

- `ops.tasks.state_payload.task_kind` is the attribution key
- Multi-agent orchestrations sum sub-task costs to parent task
- `task-status` skill (Bài #5) shows cost per subagent, integrated with cost-report

### With Bài #6 (identity & per-role keys)

- Per-role API keys (Bài #6 IDENTITY.md) are the per-role attribution mechanism — already in place
- Anthropic Usage Admin API queries by API key (per role) for daily reconciliation
- Customer-facing cost (support, marketing) feeds into customer LTV calculations

---

## 30-day calibration discipline

The numerical thresholds in this document are STARTING POINTS. The first 30 days post-v1.0 launch are observation period. Process:

1. **Week 1-2:** Hook is active but only at "alert" level (no escalations yet). Observe.
2. **Week 3:** Founder reviews `ops.cost_attributions` distributions. Adjust per-task-kind caps to p95 of observed healthy runs.
3. **Week 4:** Activate full 3-tier enforcement (alert + escalate + block). Per-role budget caps adjusted based on observed monthly trajectory.
4. **Day 30:** First `monthly-learning-review` with full Economics section. Decide if defaults need further tuning.
5. **Quarterly:** Re-calibration. Healthy patterns over time should let thresholds stay stable; volatility = signal of underlying changes worth investigating.

This discipline is encoded in `_build/notes/problem-7-economic-unit.md` as the "Calibration Plan" appendix.

---

## Anti-patterns to refuse

- **"Skip cost tracking now, add it after v1.0 launch."** No — calibration takes 30 days and requires data. Tracking ON from day 0; enforcement starts day 14.
- **"Auto-downgrade all roles to Haiku to save money."** No — auto-optimization (Option 4B) was explicitly rejected. Quality regression > cost saved.
- **"Don't show me cost data unless something is wrong."** No — economic discipline requires regular review even when healthy. Monthly digest mandatory.
- **"Block aggressively at 100% budget always."** No — over-protection causes false positives, founder learns to dismiss alerts. 3-tier escalation matters.
- **"Calculate cost per call dynamically using LLM."** No — pricing table cached locally, refreshed monthly via PR. Don't pay LLM to calculate cost (recursive economics).
- **"Skip per-task-kind tracking, just use per-role."** No — unit economics requires task-kind. The whole point.
- **"Defer the recommendation skill, founder can review monthly digest."** No — monthly is too coarse for cost spirals. Weekly recommendation catches trends earlier.

## When this architecture changes

Triggers to revisit:

- 30-day calibration shows defaults wildly off (re-anchor)
- Anthropic releases new pricing structure (e.g., new tier, new model class)
- Volume scales 10x (current caps designed for ~$1-2K/month workforce; at $10K, finer granularity worthwhile)
- Per-customer attribution becomes valuable (signal: founder asking "cost per customer X" > 3x/month)
- Multi-currency support needed (international expansion)
- Compliance/audit requires SOC 2 cost attribution (FinOps maturity)

Each change is PR to this file plus relevant satellite files.

---

*Economic instrumentation is not optional — it is the difference between operating in light and operating in darkness. This architecture lights the path: every dollar attributed to a role and a task_kind, every overage caught at three thresholds, every optimization opportunity surfaced as a reviewable PR. The numbers are calibrated, not guessed; the discipline is structural, not heroic.*
