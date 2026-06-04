---
type: concept
slug: kpi-dashboard-layout
title: Executive Dashboard Layout (Grid Design)
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: metrics
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Executive Dashboard Layout (Grid Design)

*Category: metrics · Toolkit: Executive Dashboard*

## What it is
The spatial arrangement of KPI elements on a single dashboard page — scorecard tiles at the top, hero charts in the centre, secondary charts in the flanks — following the F-pattern reading convention and the data-ink ratio principle.

**Origin:** Dashboard layout principles were formalised by Stephen Few in *Information Dashboard Design* (2006), drawing on cognitive psychology research on pre-attentive processing and the F-pattern reading convention established by eye-tracking studies at the Nielsen Norman Group (2006).

## Why it works
Human eyes scan a page in an F-pattern: top-left first, across the top, then down the left side. A dashboard layout that places the most important KPIs (scorecard) at the top-left and the primary analytical chart (combo or waterfall) in the centre-left captures the eye's first movements for the highest-value information. Secondary charts (gauge, donut) in the right column are found on the second scan pass.

## When to use
Apply this layout framework to every dashboard page — company overview, functional, project, strategic, and investment. The specific elements change; the grid structure and hierarchy principle do not.

## Visual
`comparison`

## Step-by-step tutorial
1. Sketch the dashboard layout on paper before building it in Excel — define the grid (e.g., 3 rows × 3 columns) and assign one element per cell.
2. In Excel, merge cells to create the zones, using the Merge & Center button. Use thin borders between zones for visual separation.
3. Place the KPI scorecard in the top row (merged across all columns) as the first element a reader sees.
4. Place the highest-priority chart (waterfall or combo revenue) in the top-left chart zone — this is the eye's first analytical destination after the scorecard.
5. Place gauge charts in the right column — they are secondary KPI context that supplements but does not replace the primary financial charts.
6. Remove all chart gridlines, axis titles, and legends where the data labels provide sufficient context. Apply Tufte's data-ink ratio: every pixel of ink must carry information.
7. Use a consistent font family throughout (e.g., Calibri or Arial); use bold only for the KPI scorecard values and chart titles; use normal weight for all other text.
8. Set print area to the dashboard page and verify the layout fits A4 landscape at 100 % zoom before distributing.
9. Test on a screen smaller than your design screen (e.g., a 13-inch laptop) to ensure readability.

## Real-life example — Tesco PLC — Group Performance Dashboard presented at Investor Day 2023
Tesco's investor relations team presents a one-page Group Performance Summary at each investor day. The layout follows the grid pattern: headline financial KPIs (Revenue, Adjusted Operating Profit, Free Cash Flow, ROC) in a scorecard row at the top; a revenue bridge chart in the centre-left; a free cash flow waterfall in the centre-right; a market share donut chart bottom-left; and an adjusted operating profit margin trend line bottom-right. The one-page format allows institutional investors to assess Tesco's full financial position in under 5 minutes.

**So what:** A disciplined grid layout is not an aesthetic choice — it is a communication strategy. The placement of each element signals its relative importance and the sequence in which the reader should process the information.

## Template
Use this grid layout template as the spatial specification for your dashboard page. Assign one content element per cell. Do not place more than 6 elements on a single dashboard page.

- [ ] Zone A (Row 1, full width): KPI Scorecard — [list your 8–12 KPIs]
- [ ] Zone B (Row 2, left 2/3): Primary chart — [specify: Waterfall, Combo Revenue, or Combo Profit]
- [ ] Zone C (Row 2, right 1/3): Gauge Charts — [specify: 2 gauges for non-financial KPIs]
- [ ] Zone D (Row 3, left 2/3): Secondary chart — [specify: Revenue by Product combo, Cash Flow bar, or Bridge]
- [ ] Zone E (Row 3, right 1/3): Tertiary element — [specify: Cash Balance trend, Margin trend, or additional KPI tile]
- [ ] Page format: [A4 landscape / 16:9 widescreen]
- [ ] Colour palette: [list your 3–5 colours: brand primary + RAG + neutral background]

## Pitfalls
- Placing too many elements on a single page — a dashboard with 10 charts on one page is a collage, not a dashboard. Maximum 6 distinct visual elements per page.
- Using colour decoratively rather than semantically — colour must carry meaning (green = good, red = bad, brand blue = actuals, orange = trend). Never use colour just to make the dashboard 'look professional'.
- Inconsistent font sizes across charts — each chart's title, axis labels, and data labels are formatted independently in Excel; they must all be standardised manually. Use a macro or template to enforce font consistency.
