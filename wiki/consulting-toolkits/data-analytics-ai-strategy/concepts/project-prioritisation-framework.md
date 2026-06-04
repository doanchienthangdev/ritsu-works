---
type: concept
slug: project-prioritisation-framework
title: Data Project Prioritisation Framework (Weighted Scoring)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: portfolio
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Data Project Prioritisation Framework (Weighted Scoring)

*Category: portfolio · Toolkit: Data Analytics & AI Strategy*

## What it is
A weighted scoring model for sequencing the approved use-case portfolio into a delivery roadmap — balancing strategic alignment, financial return, resource feasibility, and cross-project dependencies to produce a defensible, consensus-based priority list.

**Origin:** Standard project portfolio management methodology (PMI's Project Portfolio Management, 2013; Gartner IT Portfolio Management). Applied to data and AI project sequencing by McKinsey Digital and Accenture's data transformation practice.

## Why it works
Without a structured prioritisation model, the project sequence is determined by the loudest stakeholder, the easiest project, or the data team's personal interests — none of which optimise for the strategy's objectives. A weighted scoring model makes the sequencing logic visible, facilitates a structured conversation with the Steering Committee, and creates a defensible record of why projects were sequenced the way they were.

## When to use
In Phase 5 (Step 1: prioritise the project portfolio) after Phase 4 business cases are complete. Rerun at each wave planning session.

## Visual
`table`

## Step-by-step tutorial
1. List all approved use cases (those with CFO-approved business cases from Phase 4). Do not include use cases that have not been through the business case process — prioritisation without a business case produces a list of ideas, not a portfolio.
2. Score each project on the four criteria using the 1–5 scale. The strategic alignment weight should be highest (40%) — if a project does not move a corporate KPI, it should not be high priority regardless of how easy it is to build.
3. Validate the scores with the Steering Committee: strategic alignment scores require validation by the CEO or business sponsor; financial return scores are taken from the approved business cases; resource feasibility scores require input from the data engineering lead.
4. Calculate the weighted total for each project. Sort the portfolio from highest to lowest weighted score. The top-N projects (where N = resource capacity) form the Wave 1 delivery plan.
5. For any project where the scoring produces a sequence that stakeholders challenge, use the scoring model to have the conversation explicitly: 'The model puts Project B ahead of Project A because it scores higher on strategic alignment. To put A ahead of B, we would need to argue that A is more strategically aligned. Can we make that case?'
6. Rerun the prioritisation at each wave planning session (every 6 months) as use-case NPVs are revised by actual results and new use cases enter the pipeline.

## Real-life example — Nestlé
Nestlé's data analytics programme used a weighted scoring model to sequence 35 approved use cases into 3 waves. The model revealed that 12 of the 35 use cases had no direct link to a corporate KPI (score <2 on strategic alignment) and were moved to Wave 3 or deferred — despite being championed by individual business units. The prioritisation conversation with the Steering Committee took 2 hours; without the model, the same conversation would have been 2 days of political negotiation.

**So what:** A weighted scoring model transforms the prioritisation conversation from political negotiation to evidence-based discussion. The model does not make the decision — the Steering Committee does — but it structures the conversation around the right criteria.

## Template
Complete one row per approved use case. Calculate weighted totals and sort. Present the sorted list to the Steering Committee for Wave assignment approval.

- [ ] Use case name + business sponsor
- [ ] Strategic alignment score (1–5) + which corporate KPI it moves
- [ ] Financial return score (1–5) + 3-year NPV from business case ($)
- [ ] Resource feasibility score (1–5) + key constraint (if any)
- [ ] Dependencies score (1–5) + which projects this enables or is blocked by
- [ ] Weighted total
- [ ] Recommended wave assignment (Wave 1 / 2 / 3 / Defer)
- [ ] Steering Committee-approved wave assignment

## Pitfalls
- Scoring strategic alignment without CEO input: counter: strategic alignment is a business judgment, not a data team judgment. CEO or CFO must validate the top-5 alignment scores.
- Allowing resource feasibility to dominate the sequence: counter: if resource feasibility consistently outweighs strategic alignment in the sequence, the team is optimising for ease rather than impact. Invest to improve resource feasibility for high-strategic-alignment projects rather than deprioritising them.
- Static prioritisation: counter: rerun at each wave planning session. Business priorities change; use-case NPVs are revised by actual results; the portfolio evolves.
