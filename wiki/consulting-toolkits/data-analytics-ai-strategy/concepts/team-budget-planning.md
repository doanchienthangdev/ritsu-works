---
type: concept
slug: team-budget-planning
title: Data Team and Budget Planning Model
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Data Team and Budget Planning Model

*Category: financial · Toolkit: Data Analytics & AI Strategy*

## What it is
A zero-based bottom-up model for sizing the data team and data platform budget from the use-case portfolio, producing a 3-year investment plan with a clear return model that the CFO can evaluate against any other capital investment.

**Origin:** Zero-based budgeting methodology (Peter Pyhrr, 1970s); applied to data function budget planning by McKinsey Digital and Gartner CDO research (2019). The ratio benchmarks (e.g., 1 data engineer per 3 data scientists) are derived from industry surveys (Stitch Data, dbt Labs Annual Developer Report).

## Why it works
Data programmes that are funded as 'IT infrastructure' with no return model will always be cut first in a downturn — because they have no defensible business case. A zero-based, use-case-driven budget model treats the data function as a capital investment with an expected return, applying the same rigour as a new product launch or a factory expansion. This is the CDO's most important tool for organisational credibility.

## When to use
In Phase 1 (Step 5: size the team and budget) and in Phase 4 (alongside the business case portfolio as a programme-level investment proposal to the CFO).

## Visual
`table`

## Step-by-step tutorial
1. Start from the use-case portfolio: for each approved use case in the Wave 1–3 roadmap, estimate the engineering effort in person-weeks. Sum across all use cases per year to get the total engineering demand.
2. Apply the ratio benchmarks to size the team: 1 analytics engineer per 5 business analysts (downstream consumers); 1 data engineer per 3 data scientists; 1 data scientist per 10 ML use cases per year; 1 analytics translator per major business function. Add 20% capacity buffer for unplanned work and data quality remediation.
3. Model the cloud infrastructure cost using the data platform vendor's cost calculator: storage ($/TB/month), compute ($/hour for the expected query profile), and transfer costs. Apply a 15% year-on-year growth assumption for data volume.
4. Add tool licensing costs: most modern data stack tools are usage-based and predictable. Key costs: Snowflake/BigQuery (compute-based), dbt Cloud (developer seats), Tableau/Power BI (user seats), MLflow (open-source), data catalogue (Collibra: expensive; dbt docs: free).
5. Build the return model: sum the 3-year NPVs from the top-10 use-case business cases. Present as 'cumulative return on data platform investment': Year 1 (investment-heavy, return begins in H2), Year 2 (payback typically occurs), Year 3 (compound return accelerates as the platform serves more use cases at marginal cost).
6. Present to the CFO as a capital investment proposal: 3-year investment, 3-year return, payback period, and the top-5 use cases that drive the return. Ask for multi-year commitment — data platforms built year-by-year fail because the architecture is designed for the current budget, not the 3-year vision.

## Real-life example — Target
Target's data platform investment (2019–2022) was presented to the board as a capital investment with a 3-year return model: $150M infrastructure and team investment, $400M attributed value from four use cases (personalised offers, inventory optimisation, supply chain forecasting, fraud detection). The phased budget model showed cash-negative in Year 1, break-even in Year 2, and a 2.7× return by Year 3. The CFO approved a 3-year commitment rather than annual budget cycles, which allowed the team to make architectural decisions optimised for the 3-year vision rather than the 12-month budget.

**So what:** A 3-year budget commitment with a return model is the CDO's most important organisational tool. Annual budget cycles produce architectures optimised for short-term cost minimisation, not long-term capability building.

## Template
Build the model bottom-up from the use-case portfolio. Present to the CFO with the use-case return model alongside the cost model.

- [ ] Use-case portfolio summary: # approved use cases per wave, total engineering effort (person-weeks)
- [ ] Team headcount: data engineers / analytics engineers / data scientists / programme managers / analytics translators + Year 1/2/3 hires
- [ ] Fully-loaded cost per FTE (salary + benefits + overhead, by role and location)
- [ ] Cloud infrastructure cost model: storage + compute + transfer per year
- [ ] Tool licensing costs per year (itemised by tool + pricing model)
- [ ] Training and change management budget per year
- [ ] Total investment per year + 3-year total
- [ ] Value model: sum of 3-year NPVs from business cases (base case)
- [ ] Cumulative return by year (value / investment)
- [ ] Payback period (year and month when cumulative value exceeds cumulative investment)

## Pitfalls
- Underestimating the run cost: counter: cloud compute for real-time ML features is typically 3–5× the initial estimate. Budget 20% contingency for infrastructure costs in Year 1.
- Presenting only the investment without the return: counter: every budget request must include the use-case return model. A $5M investment proposal without a value model will not survive CFO scrutiny.
- Annual budget cycles: counter: push for a 3-year commitment with annual checkpoints. The architectural implications of 'what if we have to scale this 5× in Year 3' are invisible on a 12-month budget horizon.
