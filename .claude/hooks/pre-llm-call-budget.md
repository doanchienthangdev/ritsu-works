---
name: pre-llm-call-budget
version: 0.1.0
type: pre-tool
tools: [
  *_anthropic_*,
  llm_call,
  generate_text,
  Task,                  # subagent dispatch is also LLM cost
  *_completion_*
]
default_decision: allow
fail_mode: closed
---

# Hook: pre-llm-call-budget

> The runtime enforcement of `knowledge/economic-architecture.md` Axis 2. Every LLM call passes through here. Three-tier escalation (alert 80% / escalate 100% / block 150%) protects against silent cost spirals while not blocking legitimate work.

## What it does

For each LLM call attempted:

1. Compute current month's cost for the calling role
2. Compare to that role's `economic_budget.monthly_cap_usd`
3. Decide: allow / alert / escalate / block based on ratio
4. Also check per-task-kind soft caps (catches single-task overruns)
5. Write a `cost_attribution` row after the call completes
6. Log alerts/escalations/blocks to `ops.budget_alerts`

This is the **runtime** enforcement layer. The **proactive** companion is the `cost-report` skill (founder asks). Defense in depth: visibility + enforcement.

## Why this is critical

Per `knowledge/economic-architecture.md` "failure mode #1 — silent cost spiral": a bug in a skill loops, $200 disappears overnight, founder discovers next billing cycle. This hook is the structural prevention.

Without this hook:
- `cost-report` only shows past damage
- Per-role budgets in ROLES.md are aspirational
- The 3-tier escalation is documented but not enforced

## Decision logic

```
function decide(payload):
  # Identify role + task_kind
  role = payload.agent_role
  task_kind = extract_task_kind(payload)  # from current task's state_payload

  # Skip non-billable
  if role == 'founder':
    return allow(reason="founder calls — manual oversight by definition")

  # Lookup budget
  role_def = load_role_cached(role)
  econ = role_def.get('economic_budget', {})
  monthly_cap = econ.get('monthly_cap_usd', 0)

  if monthly_cap == 0:
    # No budget set → tracking only, no enforcement
    return allow(reason="no monthly_cap_usd set — tracking only")

  # Pull current month's spend (cached 30s)
  current_cost = get_role_monthly_cost(role)
  ratio = current_cost / monthly_cap

  alert_pct = econ.get('alert_at_pct', 0.80)
  escalate_pct = econ.get('escalate_at_pct', 1.00)
  block_pct = econ.get('hard_block_at_pct', 1.50)

  # Check role monthly cap
  if ratio >= block_pct:
    write_alert('hard_block_150', role, current_cost, monthly_cap, ratio)
    return block(
      reason=f"role {role} at {ratio:.0%} of monthly budget — hard ceiling",
      log_extras={
        "current_cost_usd": current_cost,
        "monthly_cap_usd": monthly_cap,
        "ratio": ratio,
        "to_unblock": "PR raising economic_budget.monthly_cap_usd in ROLES.md (Tier C)"
      }
    )

  if ratio >= escalate_pct:
    write_alert_if_first('escalate_100', role, current_cost, monthly_cap, ratio)
    return escalate(
      reason=f"role {role} at {ratio:.0%} of monthly budget — founder approval required",
      log_extras={
        "current_cost_usd": current_cost,
        "monthly_cap_usd": monthly_cap,
        "ratio": ratio,
        "estimated_call_cost": estimate_call_cost(payload),
        "founder_options": ["approve_this_call", "raise_budget", "deny"]
      }
    )

  # Check per-task-kind soft cap (independent of monthly)
  if task_kind:
    tk_caps = econ.get('per_task_kind_caps', {})
    tk_cap = tk_caps.get(task_kind)
    if tk_cap:
      current_task_cost = get_current_task_cost(payload.task_id)
      estimated_call = estimate_call_cost(payload)
      if (current_task_cost + estimated_call) > tk_cap * 2:  # 2x cap = hard escalate
        return escalate(
          reason=f"task instance projected to exceed 2x soft cap for {task_kind}",
          log_extras={
            "task_kind_cap_usd": tk_cap,
            "current_task_cost_usd": current_task_cost,
            "estimated_next_call_usd": estimated_call,
            "projected_total_usd": current_task_cost + estimated_call,
          }
        )

  if ratio >= alert_pct:
    write_alert_if_first('warning_80', role, current_cost, monthly_cap, ratio)
    return allow(
      reason="80% threshold reached — informational",
      log_extras={
        "delegation_signal": "budget-warning-80",  # consistent with Bài #5 hook signals
        "current_cost_usd": current_cost,
        "monthly_cap_usd": monthly_cap,
        "ratio": ratio,
      }
    )

  return allow(reason=f"healthy: {ratio:.0%} of budget")
```

## After the call: write cost attribution

The hook fires `pre-tool`, but also has a `post-tool` companion that writes the actual cost:

```
function post_tool(payload):
  # Extract token counts from response
  usage = payload.response.usage
  cost = calculate_cost(
    model=payload.request.model,
    input_tokens=usage.input_tokens,
    cache_creation=usage.cache_creation_input_tokens,
    cache_read=usage.cache_read_input_tokens,
    output_tokens=usage.output_tokens,
    service_tier=payload.request.service_tier or 'standard',
  )

  insert_cost_attribution(
    run_id=payload.run_id,
    task_id=payload.task_id,
    agent_role=payload.agent_role,
    task_kind=extract_task_kind(payload),
    model=payload.request.model,
    service_tier=payload.request.service_tier or 'standard',
    input_tokens=usage.input_tokens,
    cache_creation_tokens=usage.cache_creation_input_tokens,
    cache_read_tokens=usage.cache_read_input_tokens,
    output_tokens=usage.output_tokens,
    cost_usd=cost,
    ts=now()
  )

  # Invalidate cache for next pre-tool call
  invalidate_role_cost_cache(payload.agent_role)
```

This is conceptually one hook with both `pre` and `post` halves; framework permitting, implement as paired hooks.

## Pricing table

Cached locally; refreshed monthly via PR to `knowledge/pricing/anthropic.yaml`. Table includes:

```yaml
# Per million tokens, in USD. Updated 2026-05-02.
models:
  claude-opus-4-7:
    input: 15.00
    output: 75.00
    cache_creation: 18.75
    cache_read: 1.50
  claude-sonnet-4-6:
    input: 3.00
    output: 15.00
    cache_creation: 3.75
    cache_read: 0.30
  claude-haiku-4-5:
    input: 0.80
    output: 4.00
    cache_creation: 1.00
    cache_read: 0.08
service_tier_multipliers:
  standard: 1.0
  batch: 0.5
  priority: 1.5    # placeholder; Priority pricing varies
```

If model not found in table → log warning, use Opus rates as conservative fallback (better to overestimate than under-track).

## Performance notes

- Role budget lookup: cached per-process per-role with 30-second TTL
- Current cost calculation: cached 30 seconds; invalidated by post-tool writes
- Pricing table: cached for entire session
- Target: p95 < 50ms for the pre-tool half

For high-volume roles (100+ calls/min), the 30-second cache is essential. Cache misses do a single SQL query (`SELECT SUM(cost_usd) FROM ops.cost_attributions WHERE agent_role = X AND ts >= month_start`).

## Test cases

| # | Scenario | Expected pre-tool decision |
|---|---|---|
| 1 | Fresh month, $0 spent, simple call | allow (healthy) |
| 2 | Role at 75% of monthly cap | allow (healthy) |
| 3 | Role at 80% of cap, first time today | allow + warning_80 alert |
| 4 | Role at 85% of cap, second call after warning | allow (warning already fired this month) |
| 5 | Role at 100% of cap | escalate |
| 6 | Role at 100%, founder approved last call, this is next | escalate again (each call is its own approval) |
| 7 | Role at 150% of cap | block |
| 8 | Role at 200% somehow | block (treat as 150%) |
| 9 | Founder calling | allow (no role budget for founder) |
| 10 | Role with no economic_budget set | allow (tracking-only mode) |
| 11 | Task instance estimated to exceed 2x its task_kind cap | escalate |
| 12 | Pricing table missing for new model | allow + warning logged (use fallback rate) |
| 13 | Hook itself fails (DB unreachable) | block (fail-closed) |
| 14 | Calibration period (first 14 days post-launch) | allow with warning even at 100% (deferred enforcement) |

## Calibration mode

For first 14 days after v1.0 launch (per `knowledge/economic-architecture.md` "30-day calibration discipline"), hook runs in calibration mode:

- All decisions return `allow` regardless of ratio
- Alerts still fire (founder gets visibility)
- `ops.budget_alerts` rows still inserted (data for tuning)

Calibration mode is set via global flag in `knowledge/manifest.yaml` `economic_calibration_mode: true`. Founder PR flips to `false` after day 14 to activate full enforcement.

## Composition with other hooks

This hook composes with:

- **`pre-tool-secrets`** (Bài #2) — runs first; if API key not allowed, request never reaches budget check
- **`pre-delegate-check`** (Bài #5) — informational soft signals; doesn't gate
- **`pre-tool-customer-message`** (Bài #6) — for customer-facing sends; this hook composes with it (both must pass)
- **`pre-edit-tier1`** (Bài #2) — orthogonal (file edits, not LLM calls)

If multiple hooks return `escalate`, founder gets one consolidated approval prompt.

## Observability

Every escalate/block writes to `ops.budget_alerts`. Monthly review queries:

```sql
SELECT alert_kind,
       COUNT(*) AS count,
       array_agg(DISTINCT agent_role) AS affected_roles
FROM ops.budget_alerts
WHERE ts >= now() - interval '30 days'
GROUP BY alert_kind
ORDER BY alert_kind;
```

Healthy operation:
- 0-3 `warning_80` alerts/month (some roles approaching budget)
- 0 `escalate_100` ideally (or rare for legitimate spikes)
- 0 `hard_block_150` (anything here = investigation)

If `hard_block_150` fires, this is a SECURITY EVENT — alert founder immediately and don't auto-resolve.

## Compliance audit

Quarterly audit (per `governance/SECRETS.md` cadence):

1. Reconcile `ops.cost_attributions` total vs Anthropic Usage Admin API for past quarter
2. Discrepancy > 5% → investigate (untracked usage, hook bypass, ETL bug)
3. Verify all roles have `economic_budget.monthly_cap_usd` set in ROLES.md
4. Verify pricing table updated within last 60 days

## Implementation reference

```python
import time
from datetime import datetime

# In-process caches
_role_def_cache = {}
_role_cost_cache = {}  # {role: (cost, expiry_ts)}
_pricing_table = None

PRICING_PATH = '/path/to/knowledge/pricing/anthropic.yaml'

def load_pricing():
    global _pricing_table
    if _pricing_table is None:
        _pricing_table = yaml.safe_load(open(PRICING_PATH))
    return _pricing_table

def calculate_cost(model, input_tokens, cache_creation, cache_read,
                   output_tokens, service_tier='standard'):
    pricing = load_pricing()
    rates = pricing['models'].get(model)
    if not rates:
        # Fallback to Opus rates (conservative)
        rates = pricing['models']['claude-opus-4-7']
        log_warning(f"Unknown model {model}, using Opus rates")

    multiplier = pricing['service_tier_multipliers'].get(service_tier, 1.0)
    cost = (
        (input_tokens / 1_000_000 * rates['input'])
      + (cache_creation / 1_000_000 * rates['cache_creation'])
      + (cache_read / 1_000_000 * rates['cache_read'])
      + (output_tokens / 1_000_000 * rates['output'])
    ) * multiplier
    return round(cost, 6)

def get_role_monthly_cost(role):
    now = time.time()
    if role in _role_cost_cache:
        cost, expiry = _role_cost_cache[role]
        if now < expiry:
            return cost

    # Cache miss
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    cost = sql_scalar(
        "SELECT COALESCE(SUM(cost_usd), 0) FROM ops.cost_attributions "
        "WHERE agent_role = $1 AND ts >= $2",
        role, month_start
    )
    _role_cost_cache[role] = (float(cost), now + 30)
    return float(cost)

# ... rest per decision logic above
```

## When this hook changes

Triggers to revisit:

- Anthropic releases new pricing structure → update pricing table (PR)
- New model launches → add to pricing table
- Calibration data shows defaults wrong → adjust thresholds (D-Std PR per HITL)
- New role added → economic_budget set in ROLES.md (covered by add-new-role recipe)
- Currency changes → multi-currency support (post-v1.0)

Hook spec changes are D-Std PR (this is critical safety infrastructure).

---

*Silent cost spirals are the most expensive failure mode of AI workforces. This hook is the structural prevention — every call gates through, every dollar attributed, three thresholds catching three different shapes of overrun.*
