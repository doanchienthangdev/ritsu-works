---
type: concept
slug: donut-needle-chart
title: Donut-Needle Chart
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: metrics
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Donut-Needle Chart

*Category: metrics · Toolkit: Executive Dashboard*

## What it is
An alternative construction of the gauge chart using a donut (for the arc) and a scatter-point or stacked-bar needle. This is a synonym for the gauge chart; the two entries distinguish between the conceptual framework (gauge-chart) and the specific Excel construction technique (donut-needle).

**Origin:** Excel-specific implementation technique popularised by Excel charting experts including Peltier Technical Services (Jon Peltier) and Chandoo.org in the 2010s as a workaround for the absence of a native gauge chart type in Excel prior to Power BI.

## Why it works
The donut-needle technique exploits two standard Excel chart types (donut and stacked bar) on the same chart area, using the secondary axis and chart overlap settings to superimpose the needle on the arc. It is a pragmatic hack that delivers a visually polished result without requiring VBA macros or third-party add-ins.

## When to use
Use the donut-needle technique when building gauge charts in Excel for non-financial KPIs. If using Power BI or Tableau, use their native gauge chart types instead.

## Visual
`chart`

## Step-by-step tutorial
1. Create the donut arc data: Start=0, Low=0.3, Average=0.3, High=0.3, Invisible=0.9 (total of all visible arc sections).
2. Create the needle data: Base = Performance_arc_value − 0.005; Needle = 0.01; Remainder = 1 − Base − Needle.
3. Insert a Donut chart from the arc data; rotate to 270° so the arc opens upward.
4. Right-click the chart > Select Data > Add the needle data as a new series.
5. Change the needle series chart type to Stacked Bar (on the secondary axis).
6. Set the Gap Width to 0% and Series Overlap to 100% for the bar series.
7. Format the Base bar and Remainder bar as No Fill; format the Needle bar in dark grey or black.
8. Delete both axes, gridlines, and the legend; add a centred text box with the KPI name and actual value.
9. Copy and modify for each additional gauge KPI.

## Real-life example — A retail chain (annual revenue ~$200M)
The CFO built a weekly one-pager for the CEO with three donut-needle gauges: Gross Margin % (target 40 %), Inventory Turnover (target 8x annually), and Net Promoter Score (target 45). The three gauges sat at the top of a single A4 sheet alongside a combo revenue chart. The CEO reviewed this page every Monday morning in 3 minutes before the leadership team call, using the three gauges as 'vital signs' before drilling into details.

**So what:** Three donut-needle gauges on a single page serve as a 'vital signs' dashboard — the executive absorbs the health state of the business in seconds before asking which metric needs deeper discussion.

## Template
Duplicate this donut-needle template block for each gauge KPI. Change only the KPI Name and Performance value. All arc proportions remain constant.

- [ ] Arc data — Start: 0 (fixed)
- [ ] Arc data — Low: 0.3 (fixed)
- [ ] Arc data — Average: 0.3 (fixed)
- [ ] Arc data — High: 0.3 (fixed)
- [ ] Arc data — Invisible: 0.9 (fixed)
- [ ] Needle data — Base: [formula: =Performance_arc − 0.005]
- [ ] Needle data — Needle: 0.01 (fixed, creates 1% needle width)
- [ ] Needle data — Remainder: [formula: =1 − Base − 0.01]
- [ ] Performance arc value: [formula: =Actual_KPI_PCT * 0.9]
- [ ] Centre text box: [KPI Name] + [Actual %] formatted as bold large font

## Pitfalls
- Misconfiguring the secondary axis scale — the bar series must use a secondary axis with a max of 1.0 to align correctly with the donut arc.
- Forgetting to set Gap Width to 0 on the needle bar series — any gap will push the needle off-centre.
- Setting the arc rotation to 90° instead of 270° — at 90° the arc opens downward, which is the reverse of a speedometer dial.
