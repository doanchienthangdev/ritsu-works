---
type: concept
slug: waterfall-chart
title: Waterfall Chart (Variance Bridge)
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Waterfall Chart (Variance Bridge)

*Category: financial · Toolkit: Executive Dashboard*

## What it is
A bar chart variant where bars are plotted cumulatively so each bar 'floats' above the baseline, showing the incremental contribution of each component to a total. Used for Revenue Bridge (what drove year-over-year revenue change), Profit Bridge (P&L decomposition), and Budget Variance analysis.

**Origin:** Popularised by McKinsey & Company in client presentations in the 1990s as a standard chart for decomposing financial changes. Formalized in Excel as a built-in chart type in Excel 2016 (version 16). Prior to 2016, built manually using stacked bars with an invisible base series.

## Why it works
The waterfall forces a causal narrative: it answers 'what drove the change?' by visually breaking a total movement into its component parts. The eye reads left-to-right so the natural sequence (start value → drivers → end value) maps to the spatial layout of the chart. This makes the relative size of each driver immediately comparable — something that is impossible in a plain bar chart where bars all start from zero.

## When to use
Use whenever you need to answer 'what drove the change?': revenue year-over-year analysis, P&L decomposition, budget variance explanation, headcount movement analysis.

## Visual
`staircase`

## Step-by-step tutorial
1. Prepare a driver table: Column A = driver label; Column B = base (invisible offset from zero); Column C = value (the visible bar, positive or negative).
2. Set the Base for the first bar (anchor) to 0.
3. For each subsequent driver bar, set Base = sum of all prior driver values (cumulative total before this bar).
4. For subtotals, set Value = 0 and Base = the cumulative total at that point (the bar floats at the correct height).
5. For the final anchor (end total), set Base = 0 and Value = the total (it rests on the baseline).
6. Insert a Stacked Bar chart selecting both Base and Value series.
7. Select the Base series and apply No Fill / No Border so it becomes invisible.
8. Apply colour fills to the Value series: green for positive drivers, red for negative drivers, dark grey for anchors.
9. Add data labels on the Value series (absolute amounts). Optionally add a percentage-of-prior-period label.
10. For a Revenue Bridge specifically, labels are: 'Prior Year', then each named driver, then 'Current Year'.

## Real-life example — Unilever — Annual Revenue Bridge, 2022 Results
In Unilever's 2022 full-year results presentation, the CFO presented a Revenue Bridge showing that overall revenue grew from €52.4B to €60.1B (+14.6 %). The waterfall decomposed this as: Pricing +11.3 pp (green, large bar), Volume −1.3 pp (red, small bar), Acquisitions +2.8 pp (green), Disposals −0.2 pp (red), FX +2.0 pp (green). The chart made it immediately clear that growth was almost entirely pricing-driven (inflation pass-through) and volume was declining — a critical strategic signal for investors.

**So what:** The Revenue Bridge revealed that Unilever's growth was unsustainable (pricing-driven rather than volume-driven), a strategic insight that would not have been apparent from a single revenue percentage.

## Template
Fill in the Driver and Value columns. The Base column is formula-driven — do not edit it. The chart will update automatically.

- [ ] Driver 1: Prior Year Revenue | Base: 0 | Value: [prior year amount]
- [ ] Driver 2: Price Effect | Base: [formula: =prior cumulative] | Value: [+ or − amount]
- [ ] Driver 3: Volume Effect | Base: [formula] | Value: [+ or − amount]
- [ ] Driver 4: New Products/Markets | Base: [formula] | Value: [amount]
- [ ] Driver 5: FX Effect | Base: [formula] | Value: [+ or − amount]
- [ ] Driver 6: Current Year Revenue | Base: 0 | Value: [current year total — this is the end anchor]

## Pitfalls
- Incorrect base calculations causing bars to float at wrong heights — verify by checking that the sum of all driver values equals (End Total − Start Total).
- Using the native Excel 2016+ waterfall type for a P&L bridge — the native type does not support full colour control or custom subtotals; use the manual stacked-bar method for complex bridges.
- Including too many drivers (>8) in a single waterfall — the chart becomes unreadable. Group small drivers into an 'Other' category.
