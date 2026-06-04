---
type: concept
slug: financial-dashboards
title: Financial Dashboards (3-Tier System)
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Financial Dashboards (3-Tier System)

*Category: governance · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A layered visualization system with three tiers — Executive Dashboard (5–8 top-level KPIs), Business Unit Dashboard (10–15 operational and financial KPIs per BU), and Initiative Tracking Dashboard (RAG status for each initiative with financial impact realized vs. planned) — providing real-time financial performance visibility.

**Origin:** Management dashboard concept popularized by Kaplan & Norton's Balanced Scorecard (1992). Modern FP&A dashboards evolved with BI tools: Cognos (1990s), Hyperion Financial Management (2000s), and SAP Analytics Cloud / Power BI / Tableau / Workday Adaptive Planning (2010s–present).

## Why it works
What gets measured gets managed. Financial dashboards are the operating cockpit of the organization — they translate the KPI cascade into a visual, actionable, always-available real-time view. The 3-tier structure ensures: (a) the executive team focuses on the 5–8 metrics that matter most; (b) BU heads have the operational detail to act; and (c) initiative owners can see whether their programs are delivering.

## When to use
Use in Phase 4, Step 2 to operationalize the KPI cascade. Design and test dashboards before the financial plan goes live, so they are ready on Day 1 of the new planning period.

## Visual
`kpi-tiles`

## Step-by-step tutorial
1. Define the 5–8 Executive Dashboard KPIs before opening any BI tool. The KPIs must come from the KPI cascade (Step 3.3), not from what is easy to extract from the ERP. Common set: Revenue ($M, % vs. plan), EBITDA Margin (%, vs. plan, vs. prior year), FCF ($M), ROIC (%), Forecast Accuracy (%).
2. Map each KPI to its data source: which table in which ERP system contains this data, at what grain (daily, monthly), and with what latency after close? Build a data architecture map before building dashboards.
3. Design the Executive Dashboard layout for decisions, not for information. One executive dashboard page with 5–8 large, clear KPI tiles. Each tile: current actual, plan, prior year, trend sparkline. Traffic-light colors: Green (at or above plan), Amber (within 5% of plan), Red (>5% below plan). No tables with 50 rows.
4. Build the BU Dashboard for each BU: include P&L summary (Revenue, Gross Margin, EBITDA), key operational KPIs (DSO, DIO, DPO, headcount), and YoY trend charts. BU heads should be able to answer 'how is my BU performing?' in under 60 seconds from the dashboard.
5. Build the Initiative Tracking Dashboard: one row per initiative, columns showing milestone status (RAG), benefits realized to date ($M), cumulative benefit vs. plan ($M), and a risk flag column. This dashboard should be the primary tool for the monthly Finance Committee initiative review.
6. Connect dashboards to live ERP data via direct connectors (Tableau / Power BI / Workday connectors to SAP/Oracle/NetSuite). Automate refresh on close completion — dashboards should update without manual intervention.
7. Conduct a dashboard usability test: send the dashboard to 5 executives without explanation and measure whether they can find the answers to 5 key questions in under 5 minutes. If they cannot, redesign before launch.

## Real-life example — Walmart's financial dashboard system
Walmart's finance organization manages a global P&L of $650B+ revenue through a hierarchical dashboard system that mirrors its corporate structure. The Executive Dashboard gives Doug McMillon's CFO team the top-line picture: US Comps, Sam's Club Comps, International Revenue, Operating Income, and FCF vs. plan — all in one view, updated weekly (daily for US in-store comps). BU dashboards for Walmart US, Walmart International, and Sam's Club include segment-level gross margin, inventory turns, and e-commerce penetration rate. The dashboard system was built on Snowflake data infrastructure with Tableau front-end, with automatic refresh every Sunday morning for Monday leadership reviews.

**So what:** At scale, a well-designed dashboard system is worth more than a team of additional analysts. Walmart's weekly dashboard prevents 'death by PowerPoint' — executives get the answer before they need to ask the question.

## Template
Design your 3-tier dashboard before building. Fill in the KPIs, data sources, and refresh cadence for each tier.

- [ ] Executive Dashboard KPIs (max 8): 1.___ | 2.___ | 3.___ | 4.___ | 5.___ | 6.___ | 7.___ | 8.___
- [ ] Data Source for each KPI: 1.___ (ERP table/field) | 2.___ | 3.___ | ...
- [ ] Refresh Cadence: Real-time / Daily / Monthly on close: ___
- [ ] BU Dashboard KPIs per BU (max 15): Revenue, Gross Margin, EBITDA, DSO, DIO, DPO, Headcount + [BU-specific metrics]
- [ ] Initiative Tracking Columns: Initiative Name | RAG Status | Benefits YTD ($M) | Benefits Plan YTD ($M) | Variance ($M) | Milestone Status | Risk Flag
- [ ] BI Tool: ___ | ERP Connector: ___ | Refresh: Auto on close / Manual
- [ ] Dashboard Owner (responsible for data quality and refresh): ___
- [ ] Usability Test Completed? [Yes/No] | Issues Found: ___

## Pitfalls
- Building a dashboard with 50+ metrics — a dashboard with 50 KPIs is not a dashboard; it is a database. Enforce a maximum of 8 KPIs at Executive level and 15 at BU level.
- Disconnecting dashboards from the close process — if dashboards are manually updated by the FP&A team, they will always be late and sometimes wrong. Automate the data feed from ERP to dashboard.
- Building dashboards nobody uses — always start with the question 'What decision will this dashboard enable?' If you cannot name a specific decision or a specific executive who will use it, do not build it.
