---
type: concept
slug: income-statement-waterfall
title: Income Statement Waterfall (Profit Bridge)
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Income Statement Waterfall (Profit Bridge)

*Category: financial · Toolkit: Executive Dashboard*

## What it is
A waterfall chart that disaggregates movement from revenue through each P&L line to net profit, with each bar representing an incremental line item. Positive contributions (revenue, gross profit subtotal) shown in green; deductions (COGS, SG&A, tax) in red; subtotals as floating bars.

**Origin:** Developed as a standard management accounting visualisation in the mid-20th century; popularised in consulting by McKinsey & Company as the core chart for profitability diagnosis. First documented in Excel-modelling practice at investment banks in the 1990s.

## Why it works
The bridge chart works because it imposes a causal story on the P&L: instead of a table of numbers the eye cannot compare, the chart forces the viewer to trace the path from revenue to profit, identifying immediately which cost line is the largest drag. The visual cliff between gross profit and operating profit (SG&A bar) or between operating profit and net profit (interest + tax bars) drives diagnostic attention to the right places.

## When to use
Use when presenting P&L results to a board or executive audience, when diagnosing what drove a profit change period-over-period, or when communicating the relative size of cost drivers at a glance.

## Visual
`staircase`

## Step-by-step tutorial
1. Prepare a helper table with three columns: Label (P&L line), Base (the invisible offset), and Value (the visible bar amount).
2. For the first bar (Revenue), set Base = 0 and Value = Revenue amount.
3. For each subsequent cost line, set Base = prior cumulative total and Value = the cost amount (negative).
4. For subtotal bars (Gross Profit, EBITDA), set Base = 0 and Value = the subtotal — they will float to the correct cumulative position.
5. Insert a Stacked Bar chart in Excel, using both the Base and Value series.
6. Format the Base series with No Fill and No Border to make it invisible — only the Value bars show.
7. Apply conditional formatting-equivalent fill: green for positive Value bars, red for negative Value bars.
8. Add data labels showing the absolute $ amount on each bar; for the subtotal bars add a percentage-of-revenue label in a secondary text box.
9. Add a budget/target version of the same chart side-by-side, or overlay with a thin bar showing the budget amount per line.

## Real-life example — General Electric (GE) — Aviation division earnings bridge, fiscal year 2018
During GE's investor day presentations, the Aviation division used a profit bridge chart to show that revenue of $30B translated to operating profit of $6.5B. The chart revealed that COGS (materials + labour) consumed 65 % of revenue, while SG&A was well-controlled at 12 %. This made it immediately visible to investors that the profit-improvement opportunity lay in supply-chain cost reduction, not overhead cutting. The single waterfall chart replaced pages of P&L narrative.

**So what:** The waterfall chart forces specificity: 'profit declined' becomes 'profit declined because SG&A increased $X while revenue was flat', which immediately points to the correct diagnostic and strategic response.

## Template
Fill in the Value column with your actual P&L numbers. The Base column is calculated automatically by the formula in column C. Do not edit the Base column manually.

- [ ] Revenue — Value: [enter actual revenue amount]
- [ ] COGS — Value: [enter as negative, e.g. −121,000]
- [ ] Gross Profit — Base: [formula: =Revenue+COGS] | Value: 0 [subtotal float]
- [ ] SG&A — Value: [enter as negative]
- [ ] D&A — Value: [enter as negative]
- [ ] EBIT — Base: [formula: =prior cumulative] | Value: 0 [subtotal float]
- [ ] Interest — Value: [enter as negative]
- [ ] Tax — Value: [enter as negative]
- [ ] Net Profit — Base: [formula: =prior cumulative] | Value: 0 [anchor end bar]

## Pitfalls
- Forgetting to make the base series invisible — a common beginner error leaves a coloured base bar that creates a 'floating' appearance with no clear meaning.
- Using a built-in Excel 2016+ waterfall type for a Profit Bridge — the native waterfall type lacks flexibility for colour coding by line-item type; the manual stacked-bar method gives full control.
- Plotting actuals only without a budget overlay — the waterfall is most powerful when a thin 'budget' bar is superimposed on each actual bar, showing at a glance which lines are over and under budget.
