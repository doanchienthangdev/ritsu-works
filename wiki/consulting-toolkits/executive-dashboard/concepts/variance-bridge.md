---
type: concept
slug: variance-bridge
title: Variance Bridge (Budget vs. Actuals Analysis)
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Variance Bridge (Budget vs. Actuals Analysis)

*Category: financial · Toolkit: Executive Dashboard*

## What it is
An analytical framework for decomposing the total variance between actual and budget (or actual and prior period) into its component causes: price/rate effects, volume/mix effects, scope changes, and one-off items. The waterfall chart is the visual output of a variance bridge analysis.

**Origin:** Variance analysis is a foundational technique in management accounting (CIMA, ACCA, CMA curricula). The bridge decomposition of variance into volume, price, and mix effects was standardised in cost accounting in the mid-20th century and is a core skill in FP&A practice.

## Why it works
A total variance of '$3M below budget' is not actionable. A decomposed bridge showing '$1.5M volume shortfall (structural — fewer units sold) + $1M price erosion (margin compression) + $0.5M one-off costs (restructuring charge)' is actionable: the first two require strategy changes; the third is isolated and non-recurring. The bridge converts a financial result into a management agenda.

## When to use
Use whenever presenting actual vs. budget or actual vs. prior-period results to a board, executive committee, or investor audience. The variance bridge is the standard analytical frame for financial results presentations.

## Visual
`staircase`

## Step-by-step tutorial
1. Start with the total variance: Actual − Budget = Total Variance.
2. Decompose Volume Effect: = (Actual Units − Budget Units) × Budget Revenue per Unit.
3. Decompose Price Effect: = (Actual Price per Unit − Budget Price per Unit) × Actual Units.
4. Decompose Mix Effect (if applicable): = Sum over all products of (Actual Mix % − Budget Mix %) × Budget Revenue per Unit × Total Actual Units.
5. Identify any one-off items (e.g., restructuring charge, asset disposal) that should be isolated.
6. Verify: Volume Effect + Price Effect + Mix Effect + FX Effect + One-offs = Total Variance (within rounding).
7. Plot using the waterfall chart construction technique.

## Real-life example — A European automotive OEM — 2022 Revenue vs. Budget variance analysis
The OEM's revenue was €2.4B vs. €2.6B budget (€200M adverse variance). The variance bridge decomposed this as: Volume −€350M (semiconductor shortage reduced production), Price +€180M (pricing increases passed to customers), Mix +€90M (higher share of premium models), FX −€120M (USD/EUR movement unfavourable). The bridge revealed that the underlying business (pricing and mix) was outperforming; the deficit was entirely driven by supply-chain volume shortfall (semiconductor) and FX — neither management-controllable in the near term. This changed the board's response from a cost-cutting mandate to a supply-chain investment decision.

**So what:** The variance bridge transforms an adverse financial result from a performance indictment into a diagnostic: are the variances in our control or not? The answer determines the correct management response.

## Template
Calculate each driver using the formulas in the tutorial section. Verify the decomposition sums to total variance before plotting.

- [ ] Budget Revenue/Profit: [enter]
- [ ] Volume Effect: [=(Actual Units − Budget Units) × Budget Price]
- [ ] Price Effect: [=(Actual Price − Budget Price) × Actual Units]
- [ ] Mix Effect: [=per-SKU mix calculation if applicable]
- [ ] FX Effect: [=FX rate movement × foreign currency revenue]
- [ ] One-Off Items: [list and quantify each]
- [ ] Actual Revenue/Profit: [enter]
- [ ] Verification: [=Budget + Volume + Price + Mix + FX + OneOffs − Actual — must equal 0]

## Pitfalls
- Double-counting volume and price effects — the volume effect must be calculated at budget prices, not actual prices; the price effect uses actual units, not budget units. Reversing this creates a residual term that cannot be explained.
- Omitting the reconciliation check — always verify that all effects sum to the total variance. An unreconciled variance bridge is worse than no bridge.
- Treating all variances as equally important — a $5M FX variance in a company with $500M of foreign revenue is noise (1 %); a $5M volume variance in a $20M business is critical (25 %). Always present variances as percentages of their relevant base.
