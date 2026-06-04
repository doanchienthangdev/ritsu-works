---
type: concept
slug: value-feasibility-matrix
title: Value-Feasibility Matrix (Analytics Use-Case Prioritisation)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: portfolio
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Value-Feasibility Matrix (Analytics Use-Case Prioritisation)

*Category: portfolio · Toolkit: Data Analytics & AI Strategy*

## What it is
A 2×2 matrix that plots analytics and AI use cases by business value (y-axis) against implementation feasibility (x-axis), producing an investment-priority sequence that sequences quick wins to fund strategic bets.

**Origin:** Adapted from the Eisenhower urgency-importance matrix and project portfolio management; applied to data and AI by McKinsey Global Institute ('The Age of Analytics', 2016) and widely adopted in technology strategy engagements.

## Why it works
Without structured prioritisation, analytics investments are driven by whoever shouts loudest or by the technical team's favourite technology — neither of which maximises business value. The matrix forces an explicit trade-off conversation between impact and feasibility, ensures the portfolio is sequenced so early wins build credibility and fund later complexity, and prevents the two most common sequencing errors: building easy things that don't matter (Easy Fills) and funding high-value things that will fail because the data isn't ready (Strategic Bets without feasibility investment).

## When to use
At the end of Phase 3 (use-case identification) to sequence Phase 5 (implementation). Rerun at each wave planning session and annually at the strategy review.

## Visual
`matrix-2x2`

## Step-by-step tutorial
1. List all candidate use cases from the discovery workshops (aim for ≥30 to have a real portfolio to prioritise).
2. Score each use case on Business Value (1–10): weight decision frequency (how often is this decision made?), $ at stake per decision, and strategic alignment to corporate objectives.
3. Score each use case on Implementation Feasibility (1–10): assess data availability and quality (0–4 points), technical complexity (0–3 points), team capability (0–2 points), integration effort (0–1 point).
4. Plot each use case as a point on the 2×2. Use bubble size to encode estimated $ value.
5. Divide the matrix into four quadrants at the median score on each axis (or at a policy threshold, e.g., 6/10 on both axes for the Quick Wins quadrant).
6. Review the matrix with business sponsors to validate the value scoring — do not allow the data team to score value alone; every value score above 7 must be signed off by the business sponsor.

## Real-life example — Amazon
Amazon's early analytics strategy sequenced its investments with precision: started with purchase-history-based recommendations (high value: direct revenue lift; high feasibility: transaction data already existed at scale) and dynamic pricing (high value: real-time margin capture; high feasibility: price signals available), before investing in the harder demand forecasting and supply-chain optimisation use cases that required years of clean data. The Quick Win sequencing built the credibility and infrastructure that funded the Strategic Bets.

**So what:** Sequencing from Quick Wins to Strategic Bets is the fastest path to a funded, credible analytics programme — because early wins pay for the infrastructure that makes the harder use cases feasible.

## Template
Score every candidate use case on the two axes before plotting. Validate value scores with business sponsors. Assign a wave and a business sponsor to every use case in the top half of the value axis.

- [ ] Use case name
- [ ] Business domain / function
- [ ] Business value (1–10) + rationale (decision frequency, $ at stake, strategic alignment)
- [ ] Implementation feasibility (1–10) + rationale (data availability, technical complexity, team capability)
- [ ] Quadrant assignment (Quick Win / Strategic Bet / Easy Fill / Deprioritise)
- [ ] Wave assignment (Wave 1 / 2 / 3 / Defer)
- [ ] Business sponsor (named person accountable for value delivery)
- [ ] Estimated annual value ($)
- [ ] Key feasibility enabler (what would need to be true for this to become a Quick Win?)

## Pitfalls
- Technical team scores value without business input: counter: require a business-sponsor co-signature on every value score above 7; the data team's view of business value is systematically biased toward technical elegance.
- Over-indexing on feasibility (building easy things that don't matter): counter: no use case in the bottom half of the value axis (score <5) should receive significant engineering investment — Easy Fills are fine as filler, not as a strategy.
- Static matrix: counter: rerun the prioritisation at each wave planning session as feasibility improves (data quality work done, platform built) and new use cases emerge.
