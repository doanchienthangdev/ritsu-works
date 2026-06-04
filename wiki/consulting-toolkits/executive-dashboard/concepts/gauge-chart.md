---
type: concept
slug: gauge-chart
title: Gauge Chart (Donut-Needle)
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: metrics
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Gauge Chart (Donut-Needle)

*Category: metrics · Toolkit: Executive Dashboard*

## What it is
A circular progress indicator built using a donut chart (for the arc representing performance bands) and an overlaid series (for the needle pointing to the actual performance value). Commonly used for KPIs like Website Traffic Growth, Subscriber Growth, Customer Satisfaction, and Net Promoter Score.

**Origin:** Derived from the speedometer / dashboard dial metaphor in automotive instrumentation. Popularised in business dashboards by Stephen Few and Juice Analytics in the mid-2000s. Widely available as a native chart type in Power BI, Tableau, and Google Data Studio; constructed manually in Excel using the donut + bar technique.

## Why it works
The dial metaphor is culturally universal and pre-attentive: everyone knows that a needle pointing right (high) is good and a needle pointing left (low) is a problem. This makes gauge charts effective for KPIs with a clear absolute scale and a natural 'performance band' interpretation. They are less effective for time-series data (use a line chart) or for comparisons between entities (use a bar chart).

## When to use
Use for non-financial KPIs with a clear 0–100 % scale and a natural 'band' interpretation (Low / Average / High). Most effective for 2–4 summary-level KPIs on a C-suite dashboard.

## Visual
`chart`

## Step-by-step tutorial
1. Set up the gauge raw-data block in the Input tab: rows = {Start (0), Low (0.3), Average (0.3), High (0.3), Total (0.9)}.
2. Calculate the Performance value: map the actual KPI percentage to the 0–0.9 arc scale. Formula: =ACTUAL_PCT * 0.9 (if KPI ranges 0–100 %).
3. Insert a Donut chart from the arc data (Start, Low, Average, High sections). The donut will have 4 slices.
4. Rotate the donut 270° (Format Data Series > Angle of first slice = 270) so the arc faces upward.
5. Format the Start slice with No Fill so the bottom half of the donut is invisible.
6. Colour Low = red (#FF0000), Average = amber (#FFC000), High = green (#00B050).
7. Add the needle by inserting a secondary series on the same chart: use a very thin bar or a scatter point that aligns with the Performance arc value.
8. Add a text box over the centre of the donut showing the KPI name and actual performance percentage as a large data label.
9. Repeat for each non-financial KPI requiring a gauge chart.

## Real-life example — A SaaS company (Series B, ~$15M ARR)
The Head of Growth used gauge charts for two KPIs on the weekly leadership dashboard: Website Traffic Growth (target: 20 % month-over-month) and Trial-to-Paid Conversion Rate (target: 15 %). The gauges showed at a glance — without any reading — that traffic growth was in the High band (22 % MoM) but conversion was in the Low band (9 %). In a 5-minute leadership standup, the CEO could immediately redirect the discussion: 'We are bringing in traffic but not converting it. What is happening in the trial experience?'

**So what:** Gauge charts reduce cognitive load for high-frequency reporting: in a daily or weekly standup, leaders need signal not analysis, and the gauge delivers signal in under a second.

## Template
Fill in the Performance value for each gauge. All other values (Start, Low, Average, High, Total) are fixed and should not be changed. The chart needle position will update automatically.

- [ ] KPI Name: [enter the KPI label to display in the gauge centre]
- [ ] Performance actual value: [enter the KPI as a decimal 0–1, e.g. 0.72 for 72%]
- [ ] Performance arc position: [formula: =actual_value * 0.9] — maps 0–100% range onto the 0–0.9 arc
- [ ] Needle data — Start: [formula: =arc_position − 0.005]
- [ ] Needle data — Width: 0.01 (fixed, creates thin needle)
- [ ] Needle data — End: [formula: =1 − arc_position − 0.005]

## Pitfalls
- Using gauge charts for time-series data — gauges show a point-in-time value; they do not show trend. Always pair a gauge chart with a trend line chart for any KPI where trajectory matters.
- Setting the arc scale to match a percentage but forgetting to multiply by 0.9 — the needle will overshoot the end of the arc for values near 100 %.
- Gauge chart proliferation — placing more than 4 gauge charts on a single dashboard page creates a 'cockpit' effect that reduces readability. Use gauges sparingly for 2–4 summary KPIs; use the scorecard for the full KPI list.
