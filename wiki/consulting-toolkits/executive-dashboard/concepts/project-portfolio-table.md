---
type: concept
slug: project-portfolio-table
title: Project Portfolio Input Table
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: project
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Project Portfolio Input Table

*Category: project · Toolkit: Executive Dashboard*

## What it is
A structured table listing every active project with its key status dimensions: name, owner, dates (planned vs. actual), completion (planned vs. actual), budget (allocated vs. spent vs. forecast at completion), and overall RAG status. It is the single data source for all project dashboard charts.

**Origin:** Derived from PMI's PMBOK project status-reporting standards (Project Management Body of Knowledge) and the UK Government's PRINCE2 highlight-report template. Standardised in corporate project management offices (PMOs) worldwide.

## Why it works
A portfolio of projects is a complex system: individual project statuses interact through shared resources, dependencies, and strategic prioritisation. A structured input table enforces consistent status definitions across all projects, enabling portfolio-level aggregation (total budget, total overrun, count by RAG status) that is impossible with ad-hoc project reports.

## When to use
Use as the data foundation for every project dashboard. Also use for milestone-based reporting to boards and steering committees.

## Visual
`table`

## Step-by-step tutorial
1. Create a 'Project Input' tab in the dashboard workbook. Add one row per active project.
2. Define all column headers; lock all formula columns (Budget Variance, RAG) and leave data-entry columns unlocked.
3. Enter Budget Variance formula: =Budget − Spend to Date (shows remaining budget; negative = overrun).
4. Enter RAG formula: =IF(OR(ActualComplete < PlanComplete − 0.1, Spend > Budget × 1.05), 'Red', IF(OR(ActualComplete < PlanComplete, Spend > Budget), 'Amber', 'Green')).
5. Add a Portfolio Summary row at the bottom: SUM for Budget, Spend to Date, FAC; COUNTIF for Red/Amber/Green; AVERAGE for % Complete.
6. Sort the table: Red projects first (need immediate attention), then Amber, then Green within each RAG group.
7. Add a slicer for Strategic Pillar so the table can be filtered by pillar in the dashboard.

## Real-life example — A European telecoms company undergoing digital transformation
The company's PMO maintained 45 active projects across 6 strategic pillars with a combined budget of €180M. Before the portfolio input table, each project reported status in a different format. After standardisation, the PMO could see in one view that 8 projects (18 %) were Red, collectively representing €32M of at-risk spend, and that 6 of the 8 Red projects were in the same strategic pillar (Network Modernisation). This allowed the CTO to prioritise a programme-level intervention rather than project-by-project firefighting.

**So what:** The portfolio view reveals systemic patterns (multiple red projects in one pillar) that are invisible in individual project reports.

## Template
Fill in one row per project. Update % Complete Actual and Spend to Date monthly. All RAG and Variance formulas are pre-built. The Portfolio Summary row at the bottom aggregates automatically.

- [ ] Project Name: [enter]
- [ ] Strategic Pillar: [select from dropdown]
- [ ] Owner: [name]
- [ ] Start Date: [DD/MM/YYYY]
- [ ] Planned End Date: [DD/MM/YYYY]
- [ ] Revised End Date: [DD/MM/YYYY — enter if date has slipped]
- [ ] % Complete — Plan: [calculate from project plan: elapsed days / total days]
- [ ] % Complete — Actual: [PM assessment 0–100%]
- [ ] Budget ($K): [approved budget]
- [ ] Spend to Date ($K): [actual expenditure]
- [ ] Forecast at Completion ($K): [PM best estimate of total cost]
- [ ] Budget Variance ($K): [formula: =Budget − FAC]
- [ ] RAG: [formula-driven]
- [ ] Top Risk: [one sentence describing the biggest risk this month]

## Pitfalls
- Allowing project managers to self-report % complete without a defined methodology — use milestone-based completion (e.g., 20 % at end of design, 60 % at end of build) rather than subjective estimates.
- Using a separate spreadsheet per project and manually aggregating into the portfolio table — this approach is error-prone and defeats the purpose of a portfolio view; enforce one centrally-maintained table.
- Not updating the Revised End Date when schedules slip — the date field is the most important indicator of schedule health; a project that never updates Revised End Date is hiding its real status.
