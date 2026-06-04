---
type: concept
slug: scenario-analysis
title: Scenario Analysis
source_collection: consulting-toolkits
toolkit: business-case
domain: finance
category: finance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Scenario Analysis

*Category: finance · Toolkit: Business Case*

## What it is
A structured method for stress-testing a financial model by systematically varying the 3–5 most sensitive assumptions to produce base, upside, and downside cases — making explicit the range of outcomes that depend on assumptions outside the project team's control.

**Origin:** Formalised in energy sector planning (Royal Dutch Shell pioneered scenario planning in the 1970s under Pierre Wack), then adopted in corporate finance as a standard financial model discipline. McKinsey's financial modelling practice recommends three scenarios as a minimum for any board investment case.

## Why it works
All financial models are built on assumptions. The assumptions that matter most — those with the largest NPV impact if wrong — are almost always outside the project team's control (market demand, competitor response, regulatory timing, technology adoption rates). Scenario analysis forces the team to identify these key uncertainties explicitly, model the consequences, and present an honest range of outcomes to the board. A board that sees only a base case knows they are being sold to; a board that sees three scenarios knows they are being analysed with.

## When to use
As part of Phase 3 (Step 3.2) financial model construction; for any investment decision with material uncertainty in the key assumptions.

## Visual
`comparison`

## Step-by-step tutorial
1. Identify the 3–5 assumptions in the financial model that have the highest NPV sensitivity — i.e. a 10% change in this assumption changes total NPV by more than $Xm. These are the scenario drivers.
2. For the downside scenario: set each driver to its plausible adverse value — typically 6–12 months' delay on revenue ramp, 15–25% cost overrun, 30–40% reduction in the primary value driver.
3. For the upside scenario: set each driver to its plausible optimistic value — typically 10–20% above base on the primary value driver, 10% cost reduction, 3-month acceleration in timeline.
4. Run the financial model for all three scenarios and compute NPV, IRR, and payback for each.
5. Present the three scenarios on a single dashboard slide: the range of NPV outcomes, the assumptions that drive each, and — crucially — the minimum investment conditions: what must be true for the investment to be worthwhile even in the downside case?
6. Use the downside scenario to set the contingency reserve in the project budget: the gap between base-case costs and downside-case costs is the minimum contingency.

## Real-life example — Royal Dutch Shell (energy transition scenario planning)
Shell introduced three-scenario modelling under Pierre Wack in the early 1970s, explicitly modelling an 'oil shock' downside scenario that most competitors dismissed as implausible. When the 1973 OPEC oil embargo materialised, Shell was the only major oil company that had pre-positioned for the outcome: it had already modelled the financial impact, identified the response actions, and briefed its board. Shell moved from the seventh-largest oil company to the second-largest within a decade of adopting scenario planning — a direct consequence of the board being prepared to act on the downside.

**So what:** Scenario analysis is not pessimism — it is preparation. Boards that understand the downside are able to act decisively when it materialises.

## Template
Identify the 3–5 assumptions with the highest NPV sensitivity. Set downside and upside values for each. Re-run the financial model. Present the three-scenario dashboard on one slide. Always show the minimum conditions for investment viability.

- [ ] Scenario driver 1: [Assumption name] | Downside value: [X] | Base value: [X] | Upside value: [X] | NPV sensitivity: [$Xm per 10% change]
- [ ] Scenario driver 2: [Assumption name] | Downside value: [X] | Base value: [X] | Upside value: [X] | NPV sensitivity: [$Xm per 10% change]
- [ ] Scenario driver 3: [Assumption name] | Downside value: [X] | Base value: [X] | Upside value: [X] | NPV sensitivity: [$Xm per 10% change]
- [ ] Downside NPV: $[X]M | Downside IRR: [X]% | Downside payback: [X] years
- [ ] Base NPV: $[X]M | Base IRR: [X]% | Base payback: [X] years
- [ ] Upside NPV: $[X]M | Upside IRR: [X]% | Upside payback: [X] years
- [ ] Minimum investment conditions (downside must meet): NPV > $[X]M AND IRR > [X]%
- [ ] Contingency reserve: [Downside cost − Base cost = minimum contingency to hold]

## Pitfalls
- Downside scenarios that are unrealistically mild — a downside where NPV is 90% of the base case is not a stress test. A credible downside typically shows NPV 40–60% of base. Challenge the team to make it genuinely uncomfortable.
- Too many scenario variables — changing every assumption simultaneously produces scenarios no one can understand or respond to. Use 3–5 key drivers only.
- Presenting scenarios but not the minimum conditions — the most actionable output is 'what must be true for the downside NPV to still be positive?' That is the investment floor, and it defines the board's risk appetite.
