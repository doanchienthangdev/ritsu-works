---
type: concept
slug: budget-vs-actual-chart
title: Budget vs. Actual Chart
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Budget vs. Actual Chart

*Category: financial · Toolkit: Executive Dashboard*

## What it is
A clustered-column chart with two bars per entity (project, business unit, or cost centre): Budget Allocated and Actual Spend. Variance data labels and conditional colouring (red when over budget) make overspend immediately visible across a portfolio.

**Origin:** Standard management accounting visualisation; a direct visual implementation of the budget variance analysis that is the core of any financial control framework. Taught in every corporate finance and management accounting curriculum.

## Why it works
Budget variances are comparative: a $500K overrun on a $1M project is critical (50 %); a $500K overrun on a $50M project is noise (1 %). The clustered-column format makes the relative sizes immediately comparable and the variance data label provides the precise number. Conditional colouring (red when Actual > Budget) exploits pre-attentive processing to direct attention to the projects that need management action.

## When to use
Use on every project portfolio dashboard. Also applicable for departmental cost control dashboards comparing department budgets vs. actuals.

## Visual
`chart`

## Step-by-step tutorial
1. Prepare a data table with three columns: Project Name, Budget, and Actual Spend (from the Project Portfolio Input Table).
2. Add a fourth column: Variance % = (Actual − Budget) / Budget.
3. Insert a Clustered Column chart with two series: Budget and Actual.
4. Apply conditional fill to the Actual series: select the series, then manually colour each bar red if variance > 5 %, amber if 0–5 % over, green if under budget. For a formula-driven approach, add a hidden helper series for each colour category.
5. Add data labels to the Actual series showing the Variance % (not the absolute amount, as absolute amounts are hard to compare across projects of different sizes).
6. Add a summary bar at the right of the chart showing the total portfolio Budget and total Actual, with the overall portfolio variance.
7. Sort bars by budget size (descending) so the highest-investment projects appear first.

## Real-life example — A UK government infrastructure programme (NHS capital works)
An NHS regional construction programme tracked 12 hospital building projects with a combined budget of £480M. The budget vs. actual chart was presented at the programme board monthly. In month 8, the chart showed that 4 projects were within budget (green) but 3 projects were 8–15 % over budget (red), consuming a combined overrun of £11M. The chart directed the board to the 3 red projects immediately; investigation revealed a common cause (supply chain disruption for a specific construction material), enabling a programme-level procurement intervention that contained the overrun.

**So what:** The budget vs. actual chart turns a 40-row spreadsheet into a single visual that reveals which projects need immediate intervention and which do not.

## Template
Link Budget and Actual columns to the Project Portfolio Input Table. Variance % formula is pre-built. Update Actual monthly.

- [ ] Project Name: [from Project Portfolio Input Table]
- [ ] Budget ($K): [link to Project Portfolio Input Table]
- [ ] Actual Spend ($K): [link to Project Portfolio Input Table]
- [ ] Variance ($K): [formula: =Actual − Budget]
- [ ] Variance %: [formula: =Variance/Budget]
- [ ] RAG colour rule: [Green: Variance% <= 0; Amber: 0 < Variance% <= 5%; Red: Variance% > 5%]

## Pitfalls
- Plotting absolute variance ($) instead of percentage variance (%) — absolute variance favours large projects; a $500K overrun looks catastrophic on a small project chart but trivial on a large one.
- Not including a portfolio total bar — without a total, the board cannot assess the overall portfolio health from a single glance.
- Using the same blue colour for both Budget and Actual — the visual distinction between the two series is critical; use contrasting colours.
