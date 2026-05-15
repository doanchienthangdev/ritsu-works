# KPIs — CGO

## Primary KPI

**`persona.cgo.weekly_funnel_kpi_delta`**

- **What:** weekly aggregate of all funnel KPIs CGO is actioning. Positive = stages improved week-over-week; negative = stages regressed.
- **Source:** `ops.kpi_snapshots` filtered by KPIs CGO touched in that week (cross-referenced with `ops.agent_runs.state_payload.funnel_stage`).
- **Target:** positive average over 4-week windows. Single bad week OK; sustained negative = systemic.

## Secondary KPIs

1. **`persona.cgo.experiments_shipped_per_week`** — count of experiments started AND given a kill threshold.
   - Target: 1-3 per week sustained.
   - Signal if < 1 sustained 2 weeks: CGO inactive or blocked on upstream (`@cpo` wedge).

2. **`persona.cgo.time_from_experiment_to_decision`** — median time from launch to ship/kill call.
   - Target: ≤ 7 days. Faster = better learning velocity.

3. **`persona.cgo.experiment_kill_rate`** — % of experiments that hit the kill threshold and stopped (vs scaled).
   - Target: 50-70%. Below 50% = bias toward continuing; above 70% = tests too aggressive.

4. **`persona.cgo.founder_correction_rate`** — corrections from founder.
   - Target: < 15%.

5. **`persona.cgo.upstream_wait_count`** — times CGO had to wait on `@cpo` wedge validation before shipping.
   - Tracked, not targeted. High = CGO/CPO sequence is well-disciplined (good); zero = either CGO is ignoring the gate or CPO has caught up.

6. **`persona.cgo.dossier_freshness`** — < 7 days during active weeks.

## Cost metrics

- `cost.role.gtm-orchestrator.daily_usd` (inherited)
- `cost.persona.cgo.daily_usd` slice
- Paid spend tracking (NOT a token cost): tracked via `ops.transactions` for paid-ad invoices; surface in Friday review.

## Weekly readout

```
CGO | experiments: N (K killed, S shipped) | funnel Δ: +/−X% | corrections: M | wait on CPO: W | cost: $tokens + $paid_spend
```

## Promotion / retirement

- **Promote** to D-Std: NEVER. Public posts and paid spend always Tier C; founder authorizes.
- **Retire:** when `03-gtm` stage pillar dissolves (PMF achieved per manifest §3-gtm `dissolves_when`), CGO retires too. Sub-pillars relocate to evergreen pillars per `.archives/pillars/PLAN.md` §4.1.
