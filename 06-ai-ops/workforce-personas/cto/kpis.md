# KPIs — CTO

## Primary KPI

**`persona.cto.review_turnaround_minutes`**

- **What it measures:** time from `@cto "review X"` invocation to verdict returned.
- **Source query:** `AVG(ended_at - started_at) WHERE persona_slug='cto' AND task_kind='pr_review'`
- **Refresh cadence:** weekly
- **Target:** < 5 min average for diffs < 500 LOC; < 15 min for 500-2000 LOC.

## Secondary KPIs

1. **`persona.cto.founder_override_rate`** — % of CTO reviews where founder merges despite a must-fix.
   - Target: < 10%
   - Signal if > 20%: CTO is over-flagging or the must-fix bar is wrong.

2. **`persona.cto.missed_bug_rate`** — bugs reported within 14 days after CTO approved.
   - Source: `ops.corrections` linked to a CTO-approved run.
   - Target: < 5%
   - Signal if > 10%: CTO is under-reviewing or the bug class is not in CTO's scope (e.g., UX bugs).

3. **`persona.cto.drift_catch_rate`** — drift validator failures CTO surfaces before founder notices.
   - Source: `ops.consistency_checks` co-occurrence with CTO runs in the same week.
   - Target: > 80%

4. **`persona.cto.tokens_per_review_avg`** — cost discipline per review.
   - Target: < $0.30 per review on average (under `code-reviewer.monthly_token_usd / monthly_tool_calls`).

5. **`persona.cto.dossier_freshness`** — dossier last-update.
   - Target: < 7 days during active review weeks.

## Cost metrics

- `cost.role.code-reviewer.daily_usd` (inherited from `code-reviewer.economic_budget.monthly_cap_usd = $200`).
- `cost.persona.cto.daily_usd` — slice attributed via `persona_slug='cto'`.

## Weekly readout

```
CTO | reviews: N | overrides: M | missed bugs: P | tokens/review: $X | dossier age: D days
```

## Promotion / retirement

- **Promote** to D-Std (e.g., authorize hook disable): NEVER. Hooks are governance; founder authorizes.
- **Retire:** when `code-reviewer` role is split (e.g., separate `frontend-reviewer` + `backend-reviewer`), CTO persona may compose multiple — PR to update binding.
