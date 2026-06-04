---
type: concept
slug: ibcs-data-visualisation
title: IBCS Data Visualisation Standards
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: performance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# IBCS Data Visualisation Standards

*Category: performance · Toolkit: Digital Transformation & IT Strategy*

## What it is
The International Business Communication Standards (IBCS) define a set of visual rules for business charts and tables that ensure dashboards and reports are immediately readable, comparable, and unambiguous — replacing inconsistent, decorative charts with standardised, information-dense visuals.

**Origin:** Developed by Rolf Hichert and the IBCS Association, published as a standard from 2013. Based on Hichert's work at McKinsey and subsequent consulting practice. The standards codify principles from Edward Tufte's data visualisation theory ('The Visual Display of Quantitative Information', 1983) into actionable chart design rules.

## Why it works
Business charts are communication tools, not art. Most business charts break basic communication rules: 3D effects obscure magnitude, inconsistent colour palettes prevent comparison, pie charts are universally harder to read than bar charts, and decorative elements ('chartjunk') reduce the data-to-ink ratio. IBCS standards eliminate these problems through 7 rules (SUCCESS: Say, Unify, Condense, Check, Enable, Simplify, Structure) applied to chart design, table design, and report layout.

## When to use
Use in Phase V Step 2 (Build Annual, Quarterly, and Monthly Dashboards) when designing the dashboard suite. Enforce as a quality standard for all programme reporting.

## Visual
`comparison`

## Step-by-step tutorial
1. 1. Standardise chart types: use bar charts (not pie charts) for comparisons; line charts for trends; waterfall charts for variances (actual vs. plan, period-over-period); small multiples for multiple series comparison.
2. 2. Use the IBCS notation for actuals vs. plan: solid filled bars for actuals, outlined bars for plan/target. This removes the need for a legend.
3. 3. Standardise colour: use grey for background/reference data, dark blue or black for actual values, light blue for forecast, red/orange for negative variances. Limit to 3 colours maximum per chart.
4. 4. Always show variances explicitly: for any actual vs. plan comparison, include a variance bar or line below the main chart showing the delta. Do not make the reader calculate it.
5. 5. Maximise data density: remove gridlines, background shading, chart borders, and 3D effects. Every pixel that does not communicate data should be removed.
6. 6. Align scales: in a report with multiple charts of the same type (e.g., monthly revenue by region), use the same y-axis scale for all. Different scales make comparison impossible.
7. 7. Add data labels: all bar chart bars should have a value label. The reader should not need to read the y-axis to understand a bar's value.
8. 8. Build a report template: create a standard template for the Board Dashboard, ExCo Dashboard, and Operational Dashboard with pre-defined chart types, colour palette, and layout. Enforce the template through the PMO.

## Real-life example — Deutsche Telekom
Deutsche Telekom adopted IBCS standards for all management reporting in 2014. The standardisation project replaced 47 different chart formats (each business unit used different conventions) with 6 standardised chart types. Readers reported that the time required to interpret a management report fell from an average of 12 minutes to 4 minutes. CFO reports to the Board were shortened from 40 slides to 12 slides with the same information density. The IBCS adoption was estimated to save approximately €2M annually in time spent creating and interpreting reports.

**So what:** Standardisation of visual language is the highest-leverage, lowest-cost improvement in business reporting. Deutsche Telekom's experience shows that the benefit is primarily in reading time (not creation time) — the 200 people who read a Board report save more time than the 2 people who create it.

## Template
Apply IBCS standards to all dashboard charts. Check against the 7 SUCCESS principles. Use the standard chart type for each use case.

- [ ] CHART TYPE SELECTION: Comparison across categories → horizontal bar chart
- [ ] Trend over time → line chart
- [ ] Actual vs. Plan → waterfall chart (variance chart)
- [ ] Multiple series comparison → small multiples
- [ ] COLOUR STANDARDS: Actuals → dark blue/black | Plan/Target → outlined (unfilled) | Positive variance → green | Negative variance → red | Background/reference → grey
- [ ] QUALITY CHECK: 3D effects removed (Y/N) | Y-axis scales aligned across like charts (Y/N) | Data labels on all bars (Y/N) | Variance explicitly shown (Y/N) | Colours ≤3 per chart (Y/N)

## Pitfalls
- Enforcing IBCS on charts built by business units — the PMO must provide templates, not just standards; it is impossible to enforce rules without tools.
- Prioritising aesthetics over information density — beautiful dashboards with low data density fail the IBCS test.
