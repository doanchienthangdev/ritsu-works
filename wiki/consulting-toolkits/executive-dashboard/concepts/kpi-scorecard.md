---
type: concept
slug: kpi-scorecard
title: KPI Scorecard
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: metrics
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# KPI Scorecard

*Category: metrics · Toolkit: Executive Dashboard*

## What it is
A tabular summary of the organisation's headline KPIs showing, for each metric: the current period actual, the target, the variance in absolute and percentage terms, and a colour-coded RAG (Red-Amber-Green) status indicator. The scorecard is formula-driven and self-updates as actuals change.

**Origin:** Derived from the Management by Objectives (MBO) framework introduced by Peter Drucker in 1954 (*The Practice of Management*) and operationalised in reporting by the Balanced Scorecard movement (Kaplan & Norton, 1992). The RAG status convention was adopted from manufacturing quality management in the 1980s.

## Why it works
Humans cannot compare 15 numbers in a table quickly. The RAG indicator converts each metric's relative performance to a pre-attentive visual signal (colour) that the eye registers in under 200 milliseconds, before conscious reading begins. The scorecard concentrates executive attention on the red and amber cells — the metrics that need a decision — and allows green metrics to be acknowledged and skipped.

## When to use
Every executive dashboard. The scorecard is always the top element of the dashboard page — it is the 'headline' from which the charts provide the 'evidence'.

## Visual
`kpi-tiles`

## Step-by-step tutorial
1. Define your KPI list using the SMART-KPI filter (Specific, Measurable, Aligned, Relevant, Time-bound) — do not exceed 12 KPIs on a single scorecard.
2. Create a scorecard data table with columns: KPI Name, Actual, Target, Variance $, Variance %, RAG, Prior Period, YTD Actual, YTD Target.
3. Link the Actual and Target cells to the KPI Input Table (do not hard-code values).
4. Add variance formulas: Variance $ = Actual − Target; Variance % = Variance $ / ABS(Target).
5. Define RAG thresholds for each KPI in a separate Thresholds tab (some KPIs improve going up, others going down — e.g., Defect Rate should be red if high, not if low).
6. Apply Excel conditional formatting rules to the RAG column: IF(Actual >= Target, 'Green', IF(Actual >= Target*0.95, 'Amber', 'Red')).
7. For KPIs where lower is better (costs, defect rate), reverse the logic: IF(Actual <= Target, 'Green', IF(Actual <= Target*1.05, 'Amber', 'Red')).
8. Add a mini sparkline chart (Insert > Sparklines > Line) in the final column showing the 12-month trend for each KPI.
9. Freeze the top row and first column so the scorecard is readable when the workbook has many KPIs.

## Real-life example — Vodafone Group — Group Performance Scorecard, 2020 Annual Report
Vodafone publishes a Group Performance Scorecard in its annual report showing ~12 KPIs across four categories (Financial, Commercial, Customer, Social/ESG). Each KPI shows the actual result, the target, and a status indicator. The scorecard is used by the board to assess management's delivery against the annual operating plan. The concise format — one row per KPI, one column per dimension — lets board members scan the entire corporate performance picture in under 2 minutes.

**So what:** A well-designed KPI scorecard allows a board to allocate discussion time precisely: spend 2 minutes scanning, then spend the remaining 58 minutes on the 3–4 red/amber metrics that need decisions.

## Template
Add one row per KPI. Link Actual and Target cells to your Input tab. Set the RAG direction (Higher Better or Lower Better) for each KPI — the conditional formatting formula flips accordingly.

- [ ] KPI Name: [enter metric name]
- [ ] Actual: [link to Input tab]
- [ ] Target: [link to Input tab]
- [ ] Variance $: =Actual−Target
- [ ] Variance %: =Variance$/ABS(Target)
- [ ] RAG: [conditional format formula per KPI direction]
- [ ] Prior Period Actual: [link to prior month in Input tab]
- [ ] YTD Actual: [SUM of Actual Jan through current month]
- [ ] YTD Target: [SUM of Target Jan through current month]
- [ ] Trend (sparkline): [Insert sparkline from 12-month Actual row in Input tab]

## Pitfalls
- Applying the same RAG thresholds to all KPIs — costs and quality metrics should trigger red when high, not low; always define direction (higher-better vs. lower-better) per KPI.
- Hard-coding Actual values instead of linking to the Input tab — the scorecard becomes a separate manual-update burden and will inevitably drift out of sync.
- Including too many KPIs — a scorecard with 20+ rows is not a scorecard; it is a report. If you cannot reduce to 12, create a two-level hierarchy: a Summary scorecard with roll-up metrics drilling to Functional scorecards.
