---
type: concept
slug: bubble-chart
title: Bubble Chart
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Bubble Chart

*Category: analysis · Toolkit: Executive Dashboard*

## What it is
A scatter chart where each data point is represented by a circle (bubble), with the bubble size encoding a third variable. In the executive dashboard context, it is the chart type used for the Initiative ROI Scatter, where x = % complete, y = ROI, and bubble size = investment.

**Origin:** The bubble chart as a data visualisation type was popularised by Hans Rosling in his TED talks on global development data (2006), using the Gapminder visualisation tool. As a chart type it appears in Excel under 'Insert Chart > Bubble'. The BCG Growth-Share Matrix (1968) is a conceptual precursor, using market share and growth rate as axes.

## Why it works
The bubble chart encodes three dimensions in a two-dimensional space, making it efficient for portfolio analysis where three variables interact. The third dimension (bubble size) is most effective when the size variable is directly comparable across entities (e.g., total investment in dollars) and when the primary analytical story is told by the x and y axes.

## When to use
Use when three variables need to be plotted simultaneously for a set of 5–20 entities (projects, products, business units). The initiative ROI scatter is the primary executive dashboard application.

## Visual
`chart`

## Step-by-step tutorial
1. Prepare data: three columns (x value, y value, bubble size) with one row per entity.
2. Insert a Bubble chart in Excel (Insert > Charts > Other Charts > Bubble).
3. In Format Data Series, set 'Size represents' to 'Width of bubbles' or 'Area of bubbles' — 'Area' is more accurate for visual comparison.
4. Add data labels from a fourth column using the 'Value From Cells' option (Excel 2013+).
5. Add reference lines (quadrant dividers) using a separate XY scatter series with two points to draw horizontal and vertical lines.
6. Add a bubble-size legend by creating 3 reference bubbles of known sizes in a chart corner.
7. Apply colour coding using a fifth column (category) if comparing across groups.

## Real-life example — BCG — Growth-Share Matrix applied to Procter & Gamble portfolio analysis, circa 1970
BCG applied an early form of bubble chart analysis to P&G's product portfolio, plotting each brand on market growth rate (y) vs. relative market share (x), with bubble size representing revenue. This revealed that P&G had several 'Cash Cows' (high share, low growth) funding a portfolio of 'Question Marks' (low share, high growth potential). The visual helped P&G's board decide which Question Mark investments to accelerate and which to divest — a multi-billion-dollar resource allocation decision made clearer by a single chart.

**So what:** The bubble chart is most powerful when the three variables encoded (x, y, size) represent three independent and strategically relevant dimensions, so the chart tells a 3-dimensional story in one view.

## Template
Prepare your three data columns. Apply data labels to identify each bubble by entity name.

- [ ] Entity Name: [column for data labels]
- [ ] X axis value: [first quantitative dimension, e.g. % Complete]
- [ ] Y axis value: [second quantitative dimension, e.g. ROI %]
- [ ] Bubble size: [third dimension, e.g. Total Investment $K]
- [ ] Category / Colour: [optional group for colour-coding bubbles]

## Pitfalls
- Using bubble radius rather than bubble area for size comparison — a bubble with 2× the radius looks 4× bigger (area = π r²); always set 'Size represents area' in Excel's Format Data Series.
- Plotting too many bubbles (>20) — the chart becomes unreadable; group smaller entities or use a table for the long tail.
- Not adding bubble labels — an anonymous bubble chart forces the reader to cross-reference a legend to identify each bubble, which defeats the analytical purpose.
