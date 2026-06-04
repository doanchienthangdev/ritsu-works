---
type: concept
slug: kpi-input-table
title: KPI Raw-Data Input Table
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# KPI Raw-Data Input Table

*Category: financial · Toolkit: Executive Dashboard*

## What it is
A structured spreadsheet table that serves as the single source of truth for all dashboard data. Rows represent metrics; columns represent time periods. Every chart, formula, and scorecard in the workbook references this table exclusively.

**Origin:** Standard management accounting / ERP-reporting convention; systematised as a dashboard-architecture pattern in Excel-based FP&A best practices widely taught by the CFA Institute and AICPA FP&A programmes.

## Why it works
Separating raw data from presentation (the single-source principle) is the fundamental architecture that makes dashboards maintainable and error-resistant. When one Input tab drives all visuals, a monthly data-entry action of 10 minutes refreshes 20 charts simultaneously with no copy-paste errors.

## When to use
Every time you build a dashboard with more than one chart. The single-source Input tab is not optional — it is the architectural foundation of any maintainable dashboard.

## Visual
`table`

## Step-by-step tutorial
1. Create a new Excel tab named 'Input' and protect all other tabs to prevent accidental edits.
2. Define your row structure: group metrics by section (Revenue, P&L, Cash Flow, Non-Financial) with a blank separator row between sections for readability.
3. Enter column headers Jan through Dec plus Total in row 1; enter the current year in cell A1 as a reference cell all months use.
4. For each metric section, enter Actual rows first, then Target rows directly beneath; this adjacency makes variance formulas (=Actual−Target) trivially simple.
5. Add a Variance ($) row: =Actual row − Target row, and a Variance (%) row: =Variance ($) / Target row.
6. For gauge chart sections, create a dedicated sub-table per KPI: rows = {Start, Low (0.3), Average (0.3), High (0.3), Total (0.9), Performance (actual mapped to 0–0.9 arc)}.
7. Name key ranges using Excel Name Manager (e.g., Revenue_Actual = B3:N3) so chart series formulas are human-readable.
8. Lock the Input tab layout (Protect Sheet, allow only unlocked cells to be edited); leave Actual rows unlocked for monthly data entry.
9. Test by entering data for one month and verifying that all dashboard charts update correctly before distributing.

## Real-life example — A mid-market consumer goods company ($80M revenue)
The finance team had 8 separate Excel files updated by 8 different analysts each month-end. Errors were endemic — one analyst updated February revenue but forgot to update the February target row, causing the variance chart to show a false $0 variance. After migrating to a single Input tab architecture, the month-end dashboard update was reduced from 3 hours (across 8 analysts) to 15 minutes (one analyst), with zero errors in the subsequent 6 months.

**So what:** The single-source Input tab is not a cosmetic improvement — it eliminates an entire category of reporting errors and reduces month-end close time by an order of magnitude.

## Template
Copy this table structure into your Input tab. Fill in Actual rows each month-end. Do not edit Target rows once they are set at the start of the year. All formula rows (Variance, Totals) will calculate automatically.

- [ ] Revenue — Actual [Jan through Dec]
- [ ] Revenue — Target [set at budget]
- [ ] Revenue — Variance $ [formula: =Actual−Target]
- [ ] Revenue — Variance % [formula: =Variance/Target]
- [ ] Product A revenue — Actual
- [ ] Product B revenue — Actual
- [ ] Product C revenue — Actual
- [ ] COGS — Actual [enter as negative]
- [ ] Gross Profit — Actual [formula: =Revenue+COGS]
- [ ] SG&A — Actual [enter as negative]
- [ ] D&A — Actual [enter as negative]
- [ ] Interest — Actual [enter as negative]
- [ ] Tax — Actual [enter as negative]
- [ ] Net Profit — Actual [formula: all lines summed]
- [ ] Cash from Operations — Actual
- [ ] Cash from Investing — Actual
- [ ] Cash from Financing — Actual
- [ ] Net Change in Cash — Actual [formula]
- [ ] Cash Balance — Actual [formula: prior month balance + net change]
- [ ] Gauge KPI 1 — Performance [enter as 0–0.9 arc value]
- [ ] Gauge KPI 2 — Performance [enter as 0–0.9 arc value]

## Pitfalls
- Entering data directly into chart series instead of the Input tab — this breaks the single-source principle and causes silent inconsistencies between charts on the same dashboard.
- Using different formatting conventions for negatives (some rows in brackets, some with minus signs) — standardise: all cost and liability rows entered as negative numbers so sum formulas work correctly.
- Forgetting to update the gauge Performance cell — this cell is easy to miss because it is in a separate sub-table; add it to the month-end checklist explicitly.
- Failing to lock formula rows — an analyst who accidentally overwrites a formula row with a hard-coded number will not see an error; the chart will silently show the wrong number.
