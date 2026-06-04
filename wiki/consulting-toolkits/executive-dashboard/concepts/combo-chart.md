---
type: concept
slug: combo-chart
title: Combo Chart (Column + Line)
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: metrics
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Combo Chart (Column + Line)

*Category: metrics · Toolkit: Executive Dashboard*

## What it is
A single Excel chart that merges two chart types — typically a clustered-column series for monthly actuals and a line series for a trend or target — so the viewer sees both the period snapshot and the trajectory simultaneously.

**Origin:** The combo chart concept follows Edward Tufte's data-ink ratio principle: maximise information per pixel. The Excel combo chart type was formalised in Excel 2013 as a one-click chart type. The underlying principle of overlaying two scales to reduce chart count is a standard practice in financial reporting dating to the 1970s.

## Why it works
Two separate charts require the reader to cross-reference between them to understand relationship. A combo chart plots both dimensions in a single visual field: the column answers 'how did we do this month?' and the line answers 'are we trending in the right direction?'. The target line (third series) converts the chart into a performance-gap visual: the space between the actual column and the target line is the management action zone.

## When to use
Use for any KPI where both the monthly snapshot and the trend trajectory are important — primarily Revenue, Profit, and Margin on the company overview dashboard.

## Visual
`chart`

## Step-by-step tutorial
1. Prepare three data series in the Input tab: Actuals (monthly), Rolling Average (=AVERAGE of last 3 months), and Target Run-Rate (=Annual Target / 12 for each month).
2. Select the three series and insert a chart; initially insert as a clustered column.
3. Right-click on the Rolling Average data series > Change Series Chart Type > Line.
4. Right-click on the Target Run-Rate series > Change Series Chart Type > Line.
5. Format the Actuals columns with the primary brand colour (e.g., dark blue).
6. Format the Rolling Average line as dashed, in a contrasting colour (e.g., orange).
7. Format the Target line as a solid red line so it reads as 'the line not to fall below'.
8. If the chart includes a Margin % series alongside a Revenue $ series, assign the Margin series to the secondary axis.
9. Add a chart title as an insight headline (e.g., 'Revenue on track; margin compression requires action'), not a label (e.g., 'Revenue and Profit Chart').
10. Add data labels to the most recent column showing the actual value and the variance from target.

## Real-life example — Amazon — AWS revenue and operating margin, 2023 quarterly earnings
In Amazon's Q4 2023 earnings presentation, the CFO presented an AWS revenue combo chart: columns showing quarterly revenue growing from $21B (Q1) to $25B (Q4), with a line showing the operating margin improving from 24 % to 30 %. The combo format allowed analysts to see simultaneously that both revenue and margins were expanding — a 'good problem' signal — without needing to toggle between two charts.

**So what:** A combo chart tells a 2-variable story in one visual: 'revenue is growing AND margins are expanding' is a fundamentally different story from 'revenue is growing but margins are compressed', and the combo chart makes that distinction immediately visible.

## Template
Use this three-series structure for each major financial KPI on your dashboard. The Rolling Average formula and Target Run-Rate formula are fixed; only the Actuals row needs monthly updating.

- [ ] Series 1 — Monthly Actuals: [link to Input tab Actual row for this KPI]
- [ ] Series 2 — Rolling Average: [formula: =AVERAGE(B2:D2) moved forward monthly]
- [ ] Series 3 — Target Run-Rate: [formula: =Annual_Target/12 (or monthly target if uneven)]
- [ ] Chart title: [write as an insight, e.g. 'Revenue 6% above budget; margin gap widening in Q4']
- [ ] Data label on most recent column: [show Actual + Variance% from Target]

## Pitfalls
- Putting too many series on one combo chart — beyond 3 series, the chart becomes cluttered. Split into two charts if you need more.
- Using a secondary axis when units are the same — a secondary axis with the same unit confuses readers who expect secondary axes to indicate a different scale.
- Naming the chart with a label instead of an insight — 'Revenue Chart' tells the reader nothing; 'Revenue on track; margin gap widening in Q4' directs attention.
