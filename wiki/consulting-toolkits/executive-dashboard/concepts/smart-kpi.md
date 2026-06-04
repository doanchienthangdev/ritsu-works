---
type: concept
slug: smart-kpi
title: SMART-KPI Framework
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: metrics
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# SMART-KPI Framework

*Category: metrics · Toolkit: Executive Dashboard*

## What it is
A five-criteria filter for validating that each KPI is actionable: Specific (unambiguous single formula), Measurable (from an identified data source), Aligned (linked to a strategic objective), Relevant (actionable by the team), and Time-bound (a defined reporting cadence).

**Origin:** Adapted from George Doran's SMART objectives framework, first published in *Management Review* (1981): 'There's a S.M.A.R.T. Way to Write Management's Goals and Objectives'. The SMART acronym was subsequently extended by various authors; the KPI-specific application became standard practice in balanced-scorecard consulting by the early 2000s.

## Why it works
Without the SMART filter, organisations default to measuring what is easy to measure, not what is important to manage. The five criteria act as a quality gate: a metric that fails any criterion is either a vanity metric (fails Aligned or Relevant), unmeasurable in practice (fails Measurable or Specific), or creates no accountability (fails Time-bound). The filter also forces the KPI designer to name the data source upfront — the most common reason dashboard projects fail is discovering mid-build that the required data is not available.

## When to use
Use at the start of every functional or project dashboard build, before creating any Input tab or chart. Also use annually during the budget/planning cycle to review and refresh the KPI set.

## Visual
`table`

## Step-by-step tutorial
1. List all candidate KPIs nominated by the functional head and FP&A team (typically 15–25 initial candidates).
2. For each candidate, apply the five SMART tests in a structured table: row per KPI, column per criterion, cell = Pass/Fail/Needs Revision.
3. Specific test: write the exact formula for this metric in one sentence. If you cannot, it fails Specific.
4. Measurable test: name the specific system (ERP table, CRM field, database query) that produces this metric. If it requires manual estimation, it fails or needs a clear proxy.
5. Aligned test: trace this KPI to a named company OKR or strategic pillar. If no direct link exists, deprioritise or drop it.
6. Relevant test: ask the functional head: 'If this metric moves unfavourably next month, would you take a different action?' If no, it fails Relevant.
7. Time-bound test: define the reporting cadence (weekly, monthly, quarterly) and the deadline for data availability after period close. If no cadence is defined, it fails Time-bound.
8. Eliminate KPIs failing 2+ criteria; revise those failing 1 criterion with the functional head before finalising.
9. Document approved KPIs in the KPI Dictionary tab.

## Real-life example — A UK National Health Service (NHS) Trust
During a performance-improvement programme, an NHS Trust's management team proposed 30+ KPIs for their monthly board dashboard. A SMART-KPI workshop reduced this to 12 validated KPIs. 'Staff satisfaction' failed Measurable (no regular survey mechanism); 'operational efficiency' failed Specific (no formula); 'quality improvement initiatives completed' failed Aligned (no link to the Trust's strategic plan). The 12 approved KPIs — including A&E 4-hour compliance, cancer referral-to-treatment time, and employee sickness rate — all passed all five criteria and became the foundation of a board dashboard that drove two years of sustained performance improvement.

**So what:** The SMART filter is not bureaucracy — it is the process that saves you from spending 3 months building a dashboard for metrics that either cannot be measured or don't drive decisions.

## Template
Complete one column per candidate KPI. Mark each criterion as Pass, Fail, or Needs Revision. Only metrics with 5 Pass marks proceed to the KPI Dictionary.

- [ ] KPI Candidate Name: [enter metric name]
- [ ] S — Specific: Write the exact formula in one sentence. Pass / Fail / Needs Revision
- [ ] M — Measurable: Name the system of record and the specific data field. Pass / Fail / Needs Revision
- [ ] A — Aligned: Name the strategic objective or OKR this metric supports. Pass / Fail / Needs Revision
- [ ] R — Relevant: Would a change in this metric cause the team to take a different action? Yes / No
- [ ] T — Time-bound: Reporting cadence and data-availability deadline. Pass / Fail / Needs Revision
- [ ] Overall verdict: All 5 Pass = Include | 1 Needs Revision = Revise | 2+ Fail = Drop

## Pitfalls
- Applying the SMART filter after the dashboard is built — at that point, the data infrastructure may already be committed for non-SMART metrics. The filter must be run before any dashboard construction begins.
- Accepting 'we can estimate this from another metric' as a substitute for Measurable — estimation introduces subjectivity and creates disputes about the number rather than the performance.
- Confusing Aligned with Important — a metric can feel strategically important (e.g., 'team morale') but fail Aligned if there is no formal strategic objective it connects to. Importance is necessary but not sufficient.
