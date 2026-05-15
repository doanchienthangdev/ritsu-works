# KPIs — CPO

## Primary KPI

**`persona.cpo.wedge_validity_rate`**

- **What:** % of features that survive N=10 stranger observation (per SOP-PRODUCT-002) → still considered valid wedge a month after launch.
- **Source:** `ops.events` (feature-launched + feature-killed) + manual tagging from CPO's wedge-validation outputs.
- **Refresh:** monthly.
- **Target:** > 60% after 3-month operating period. Below 40% sustained = CPO's wedge-fit rubric needs revision.

## Secondary KPIs

1. **`persona.cpo.features_shipped_per_week`** — count of features that made it from PRD to ship.
   - Target: 1-2 per week sustained (slow + deliberate, not a build factory).
   - Signal if 0 sustained 3 weeks: blocked on observation or CTO; surface.

2. **`persona.cpo.founder_correction_rate_on_prioritization`** — corrections to CPO's "what to build next" recommendations.
   - Target: < 20% (founder weighs in heavily on product calls).
   - Signal > 30%: rubric drift OR founder has shifted priorities — recalibrate.

3. **`persona.cpo.cancel_flow_insights_converted_to_backlog`** — # of cancel-flow themes that translated to a backlog item in the same month.
   - Target: > 70% (we hear the user; we act on it).

4. **`persona.cpo.observe_to_decision_days`** — median time from N=10 observation kickoff to ship/kill decision.
   - Target: ≤ 14 days. Slower = wedge discovery is too long.

5. **`persona.cpo.dossier_freshness`** — < 7 days during active product weeks.

6. **`persona.cpo.cpo_cgo_boundary_conflicts`** — # of times founder corrected which-persona-should-have-handled-this between CPO and CGO.
   - Tracked as a learning signal. Target: ≤ 2 in Phase 1 week 1; ≤ 1/week sustained.

## Cost metrics

- `cost.role.product-orchestrator.daily_usd` (inherited).
- `cost.persona.cpo.daily_usd` slice.
- Recruitment spend (paying strangers): tracked separately in `ops.transactions` under category `product_research`.

## Weekly readout

```
CPO | features: S (P shipped, K killed) | cancel insights→backlog: I% | wedge validity: V% | founder corrections: M | cpo↔cgo conflicts: C
```

## Promotion / retirement

- **Promote** to D-Std: NEVER. Pricing and paying-user-affecting tests always Tier C.
- **Retire:** when `04-product` is fully autonomous (founder no longer manually reviews every PRD) — would mean CPO has earned enough trust to graduate from "review every PRD" cadence. Even then, CPO still routes; just with less founder gate.
