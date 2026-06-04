---
type: concept
slug: asset-allocation-donut
title: Asset Allocation Donut Chart
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Asset Allocation Donut Chart

*Category: financial · Toolkit: Executive Dashboard*

## What it is
A donut chart (or dual-ring donut) showing the portfolio's current asset allocation by class as a percentage. In the dual-ring version, the inner ring shows actual allocation and the outer ring shows target allocation, making drift immediately visible.

**Origin:** The donut chart is a variant of the pie chart with a hollow centre, popularised in business dashboards in the 2000s as a way to add a secondary data series to a pie chart. The dual-ring variant for comparing actual vs. target allocation is a standard feature in wealth management and robo-advisor platforms.

## Why it works
Allocation is a proportional concept: it answers 'how much of my portfolio is in each category?' as a percentage. Pie/donut charts are the correct chart type for proportional composition (unlike bar charts, which imply comparison of absolutes). The dual-ring format allows simultaneous comparison of actual vs. target — a purely spatial comparison the eye can make without any calculation.

## When to use
Use on the investment dashboard as the allocation summary visual. Pair with the Asset Allocation Tracker table that shows the exact drift and trade required.

## Visual
`chart`

## Step-by-step tutorial
1. Prepare the Asset Class Summary table (from Asset Allocation Tracker).
2. Insert a Donut chart using the Current Weight data. This creates the inner donut.
3. To add the outer target ring: right-click the chart > Select Data > Add Series using the Target Weight data. This creates a second donut series.
4. Format the inner series to a smaller donut hole (50 %) and the outer series to a larger donut hole (70 %) to create a dual-ring effect.
5. Apply consistent colour fills to matching asset classes in both rings.
6. Add a text box in the donut centre showing 'Total Portfolio Value: $X.XM'.
7. Add percentage data labels on both rings.

## Real-life example — Vanguard Personal Investor platform
Vanguard's online portfolio dashboard uses a dual-ring donut as the primary allocation visualisation for all personal investor accounts. The outer ring shows the model portfolio target (e.g., 80/20 growth portfolio); the inner ring shows the actual allocation. When the actual allocation drifts more than 5 pp from any target segment, the inner ring segment changes colour from the standard palette to amber/red. This single chart drives most rebalancing decisions made by Vanguard's 30M+ individual investors.

**So what:** The dual-ring donut makes a quantitative comparison (is my actual close to my target?) a purely visual one — no numbers need to be read; the ring alignment tells the whole story.

## Template
Link both the Current Weight and Target Weight series to the Asset Allocation Tracker. The chart updates automatically when current prices change.

- [ ] Chart data series 1 (inner ring) — Current Weights: [link to Asset Allocation Tracker Current Weight column]
- [ ] Chart data series 2 (outer ring) — Target Weights: [link to Asset Allocation Tracker Target Weight column]
- [ ] Colour per asset class: [define 5 colours: Equity blue, Fixed Income green, Real Estate orange, Cash grey, Alternative purple]
- [ ] Centre label: [=CONCATENATE('Total: $',TEXT(Total_Portfolio_Value,'#,##0'))]

## Pitfalls
- Using a pie chart instead of a donut when a second series (target) is needed — pie charts only support one data series; use donut charts for actual vs. target allocation.
- Using too many asset class segments (>7) — donut charts become unreadable with many small segments; group anything <3 % into 'Other'.
