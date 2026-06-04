---
type: concept
slug: analytics-business-case-model
title: Analytics & AI Business Case Model (DCF with Value Drivers)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Analytics & AI Business Case Model (DCF with Value Drivers)

*Category: financial · Toolkit: Data Analytics & AI Strategy*

## What it is
A discounted cash flow model structure specifically designed for analytics and AI investments, quantifying value across four driver types (revenue uplift, cost reduction, risk reduction, speed-to-decision) in three scenarios, with an explicit sensitivity analysis on the top three assumptions.

**Origin:** Adapted from standard DCF methodology (Modigliani and Miller, 1958) and McKinsey Global Institute 'The Age of Analytics' (2016) value sizing approach. The four-driver taxonomy is widely used in technology ROI modelling and adapted for the specific value patterns of data and AI investments.

## Why it works
Data and AI investments fail to get funded for two reasons: the value is articulated vaguely ('we will use data to improve decisions') or the financial model is not credible (the assumptions are not stress-tested). A structured DCF model with explicit driver types, three scenarios, and sensitivity analysis transforms the conversation from 'trust us' to 'here is what we are betting on, here is the downside scenario, and here is the assumption that most endangers the return'. This is the language the CFO and board respond to.

## When to use
In Phase 4 (build business cases) for every use case in the top-15 priority list. Reuse the model at the 30/90/180-day post-implementation reviews to compare actual vs forecast.

## Visual
`table`

## Step-by-step tutorial
1. Identify the single primary value driver for this use case: revenue uplift (the model changes a commercial decision), cost reduction (the model automates or optimises an operational process), risk reduction (the model identifies and avoids a loss), or speed-to-decision (the model reduces cycle time). A use case that claims all four drivers simultaneously is probably not well-defined enough for a business case.
2. Quantify the value driver with a calculation chain: Revenue uplift = [decision variable impacted] × [current baseline] × [estimated improvement %] × [conversion rate] × [contribution margin]. Write the chain explicitly so the CFO can challenge any step.
3. Define three scenarios: base (management expectation, typically the median of comparable industry benchmarks), downside (the 20th percentile — what if the improvement is only 50% of the base estimate?), upside (80th percentile — what if adoption exceeds expectations?). The downside NPV must remain positive for the investment to be fundable.
4. Model the investment explicitly: build cost (engineering weeks × day rate + infrastructure), run cost (cloud compute per year, API costs per year, maintenance engineering), and change management cost (training, communications, process redesign). Most analytics business cases underestimate the run cost by 3–5×.
5. Run sensitivity analysis on the top 3 assumptions: identify which assumptions most affect the NPV, and model the impact of each being wrong by 20% in the negative direction. Present the 'stress-case NPV' to the CFO — if it is still positive, the investment is robust.
6. Present to the CFO with the value chain, the three-scenario table, and the sensitivity analysis. The ask: approve the base-case investment; confirm the downside is acceptable; agree on the KPIs that will be tracked to verify the return.

## Real-life example — Capital One
Capital One's credit risk ML model business case followed this structure: primary driver = risk reduction (fraud loss reduction); base-case value = 8% reduction in fraud losses on a $400M fraud pool = $32M/year; investment = $2.1M build + $0.4M/year run + $0.3M change management = $4.9M over 3 years; 3-year NPV = $72M (base case). Downside scenario (4% reduction): NPV still $36M. Sensitivity: if model accuracy is 10% worse than expected, NPV falls to $48M. The board approved. Actual outcome: 11% fraud reduction, NPV exceeded the base case.

**So what:** A structured business case with a calculation chain and sensitivity analysis is the CDO's most important tool for securing the investment that makes the data strategy real. The CFO approves investments, not strategy decks.

## Template
Complete the full model before presenting to the CFO. The downside NPV must be positive for the investment to be fundable without a strategic override.

- [ ] Use case name and primary value driver type
- [ ] Value calculation chain (write every step explicitly)
- [ ] Base case annual value ($) with assumptions
- [ ] Downside annual value ($ at 50% of base case improvement)
- [ ] Upside annual value ($ at 150% of base case improvement)
- [ ] Build cost ($): engineering + infrastructure + data quality work
- [ ] Annual run cost ($): cloud compute + API + maintenance
- [ ] Change management cost ($): training + process redesign
- [ ] 3-year NPV: downside / base / upside (at 12% discount rate)
- [ ] Payback period: downside / base / upside (months)
- [ ] Top 3 assumptions + impact if each wrong by -20%
- [ ] Stress-case NPV (all three assumptions wrong simultaneously)

## Pitfalls
- Claiming all four value drivers simultaneously: counter: a use case with four value drivers is usually three use cases. Separate them, quantify each, and build a portfolio — the CFO will have higher confidence in three focused business cases than one vague omnibus claim.
- Underestimating the run cost: counter: cloud compute for a real-time ML model is typically 3–10× the estimated cost in the business case. Get a cloud architect's estimate before committing.
- Omitting the control group from the value measurement plan: counter: if there is no control group at deployment, you will never be able to prove causation — you will only have correlation. A/B test every use case where possible.
