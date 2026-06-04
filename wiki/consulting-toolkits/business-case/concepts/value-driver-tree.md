---
type: concept
slug: value-driver-tree
title: Value Driver Tree
source_collection: consulting-toolkits
toolkit: business-case
domain: finance
category: finance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Value Driver Tree

*Category: finance · Toolkit: Business Case*

## What it is
A hierarchical decomposition of total project value into its causal drivers — making every revenue, cost, or risk assumption visible, attributable, and auditable.

**Origin:** Developed within McKinsey Valuation practice (Copeland, Koller, Murrin — 'Valuation', 1990; 2000 3rd edition), where it was used to decompose enterprise value into the operational drivers of ROIC and growth. Adapted for project investment cases as a value-decomposition tool.

## Why it works
A financial model that shows a single headline NPV figure invites the board to challenge the number as a whole. A Value Driver Tree decomposes the number into its causes — each with its own assumption and source — so the board can engage with the logic rather than simply accepting or rejecting the total. It also identifies the 3–5 assumptions that drive the most value and deserve the most scrutiny (sensitivity analysis).

## When to use
In Phase 2 (Step 2.2) to quantify and structure the project's value creation; the output feeds directly into the financial model.

## Visual
`tree`

## Step-by-step tutorial
1. Start at the root: the total project value in NPV terms. This is the number you will put in the financial summary.
2. Decompose into 3–4 Level-1 drivers: typically Additional Revenue, Cost Savings, Risk Avoided, and Strategic Option Value.
3. For each Level-1 driver, decompose into Level-2 drivers — the specific mechanisms through which value is created (e.g. 'Additional Revenue' decomposes into new customer acquisition, upsell, and price premium).
4. For each Level-2 driver, state the key assumption explicitly: the volume, rate, or probability that drives the value. This is where the benchmarking input (next framework) enters.
5. Quantify each leaf-level driver with a bottom-up estimate: e.g. 'New customers: 200 per year × $25K ACV = $5M per year.' Show your working.
6. Run sensitivity analysis on the 3–5 leaf-level drivers with the highest NPV contribution. These are the assumptions the board will challenge.
7. Sum the leaf-level drivers to produce the NPV figure for each Level-1 driver and then the total.

## Real-life example — Starbucks (My Starbucks Rewards programme investment, 2009)
When Starbucks built the business case for its loyalty programme investment, the Value Driver Tree decomposed the $400M+ technology and marketing investment into three Level-1 drivers: incremental visit frequency (loyalty members visit 2× more than non-members → revenue uplift), reduced discount cost (targeted offers vs blanket promotions → cost saving), and churn reduction (loyalty members churn 4× less → lifetime value uplift). Each driver had explicit assumptions benchmarked against competitor loyalty programmes (Dunkin', Panera). By 2016, the programme had 11M active members and drove 40% of US revenues — validating the value decomposition.

**So what:** A value driver tree makes every assumption explicit and auditable — turning a contested headline NPV into a structured, debatable argument about individual drivers.

## Template
Decompose total project value from root to leaf level. At each leaf, state the assumption, its source, and the dollar contribution. Flag the top 3 drivers by NPV contribution for sensitivity analysis.

- [ ] Root — Total Project Value: $[X]M NPV
- [ ] Level-1 Driver A — [Additional Revenue]: $[X]M
- [ ]   Level-2 Driver A1 — [New customer acquisition]: [Volume: X] × [ACV: $X] × [Duration: X years] = $[X]M | Assumption source: [Benchmark / market research]
- [ ]   Level-2 Driver A2 — [Upsell]: [X customers] × [Uplift: $X] × [Uptake rate: X%] = $[X]M | Assumption source: [Internal data]
- [ ] Level-1 Driver B — [Cost Savings]: $[X]M
- [ ]   Level-2 Driver B1 — [Labour efficiency]: [X FTEs] × [Loaded cost: $X] × [Efficiency gain: X%] = $[X]M | Assumption source: [Industry benchmark]
- [ ] Level-1 Driver C — [Risk Avoided]: $[X]M
- [ ]   Level-2 Driver C1 — [Regulatory fine avoided]: [Probability: X%] × [Penalty: $X] = $[X]M | Assumption source: [Legal / regulatory analysis]
- [ ] Sensitivity flag: [Top 3 drivers that drive the most NPV — these get scenario analysis]

## Pitfalls
- Lump-sum assumptions at the top level ('total revenue uplift = $50M') without decomposition — a board cannot evaluate what it cannot interrogate. Decompose to the level where each assumption has an explicit source.
- Double-counting drivers — e.g. counting 'customer retention' in both revenue and cost savings. Map each mechanism to exactly one Level-1 driver.
- Failing to flag the high-sensitivity drivers for scenario analysis — the 3 drivers that most affect total NPV must be stress-tested in the downside scenario.
