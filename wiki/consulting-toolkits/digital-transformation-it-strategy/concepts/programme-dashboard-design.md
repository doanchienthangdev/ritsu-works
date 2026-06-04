---
type: concept
slug: programme-dashboard-design
title: Programme Dashboard Design
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: performance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Programme Dashboard Design

*Category: performance · Toolkit: Digital Transformation & IT Strategy*

## What it is
A structured framework for designing multi-tier programme dashboards (Board/ExCo/Operational) that provide real-time visibility into programme health, milestone progress, financial performance, and benefit realisation — enabling timely, evidence-based governance decisions.

**Origin:** Synthesised from OGC MSP programme reporting, Balanced Scorecard dashboard design (Kaplan & Norton), and IBCS visual standards. The RAG (Red/Amber/Green) status convention originated in UK government major programme management in the 1990s.

## Why it works
Programme governance without dashboards relies on verbal reporting, which is subject to optimism bias (project managers overestimate progress) and inconsistency. Standardised dashboards provide: (1) objective status information (data-driven RAG, not manager-assessed); (2) trend visibility (not just current snapshot but trajectory); (3) exception-based management (Board focuses on RED items only, not all 40 workstreams); and (4) benefits accountability (actual vs. planned benefits visible to the Board).

## When to use
Use in Phase III Step 2 (Build Programme Dashboards) and Phase V Steps 1–2 (KPI Architecture and Dashboard Design).

## Visual
`kpi-tiles`

## Step-by-step tutorial
1. 1. Define the audience for each tier: Board (non-executives, 45-minute meeting), ExCo (programme sponsor, 60-minute review), Operational (PMO, 90-minute working session).
2. 2. Select KPIs per tier: Board — 6 headline KPIs from the Benefits Realisation Register; ExCo — 12 KPIs covering all programme dimensions; Operational — workstream-level metrics.
3. 3. Design RAG thresholds: for each KPI, define objective Red, Amber, and Green thresholds using the KPI Dictionary. Thresholds must be agreed and documented before the first dashboard goes live.
4. 4. Build in Power BI, Tableau, or Google Looker: connect data sources (project tool, finance system, HR system). Set up automated refresh. Never use manually-updated spreadsheets as the primary dashboard.
5. 5. Apply IBCS visual standards: waterfall charts for benefit realisation variance, line charts for KPI trends, RAG tiles for status, bar charts for workstream comparison.
6. 6. Design the exception view: the Board dashboard should immediately highlight what is in RED and provide a 1-sentence explanation. Board members should not need to search for problems.
7. 7. Define the reporting cadence: Operational — refreshed weekly; ExCo — refreshed monthly, reviewed in monthly steering committee; Board — refreshed quarterly, reviewed in Board programme update.
8. 8. Govern the dashboard: the PMO owns the dashboards. Any proposed changes to KPI definitions, thresholds, or visualisations require formal approval.

## Real-life example — Crossrail (Elizabeth line, London)
Crossrail's programme used a 3-tier dashboard structure for its £18.6B infrastructure programme: (1) the DfT/TfL Board received a 4-KPI dashboard (cost to complete, schedule variance, risk exposure, benefits profile) in a 2-page summary; (2) the Crossrail ExCo received a 15-KPI monthly programme health dashboard with workstream RAG and milestone tracker; (3) the delivery teams had daily operational dashboards tracking construction progress by station. When the programme encountered significant delays in 2018, the Board dashboard's schedule variance metric turned RED 6 months before the project team formally reported the issue — the dashboard data proved more honest than the verbal reporting.

**So what:** The objective data in a programme dashboard is often more accurate than verbal reporting from project managers under pressure to report good news. Crossrail's experience demonstrates that Board dashboards with objective KPI thresholds provide a governance safety net that prevents decision-makers from being misled.

## Template
Design dashboards for each tier. Define audience, KPIs, refresh frequency, and visual format per tier.

- [ ] BOARD DASHBOARD: Audience | Frequency | KPIs (6): [List] | Primary charts: [List] | Exception view: [How RED items are surfaced]
- [ ] EXCO DASHBOARD: Audience | Frequency | KPIs (12): [List] | Primary charts: [List] | Workstream RAG: [How displayed]
- [ ] OPERATIONAL DASHBOARD: Audience | Frequency | KPIs (20): [List] | Primary charts: [List]
- [ ] DATA SOURCES: [System → Dashboard connection for each KPI]
- [ ] RAG THRESHOLDS: [KPI | Red threshold | Amber threshold | Green threshold — for all KPIs]

## Pitfalls
- Manually-updated dashboards — manual update processes introduce human error and delay; automated data feeds are mandatory.
- Dashboard without action — a RED KPI that generates no corrective action is a reporting exercise, not a governance tool.
