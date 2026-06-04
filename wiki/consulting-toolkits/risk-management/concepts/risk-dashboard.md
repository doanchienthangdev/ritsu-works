---
type: concept
slug: risk-dashboard
title: Risk and Issue Dashboard
source_collection: consulting-toolkits
toolkit: risk-management
domain: governance
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Risk and Issue Dashboard

*Category: analysis · Toolkit: Risk Management*

## What it is
An executive-ready, auto-calculated dashboard that aggregates the risk register and issue log into a one-page summary for management and Board reporting, showing: counts of High/Medium/Low risks and issues by category, trend vs. prior period, top-5 risk narratives, mitigation status (RAG), and issue escalation status.

**Origin:** Evolved from balanced scorecard practice (Kaplan & Norton, 1992) applied to risk reporting. The specific risk dashboard format used in consulting engagements at McKinsey and Deloitte typically mirrors the structure of the corporate performance dashboard, enabling risk data to be presented alongside financial and operational performance metrics on the same Board reporting template.

## Why it works
A risk register without a dashboard is a database that produces no decisions. The dashboard translates the operational detail of the register into the decision-relevant summary that the Board and Executive Committee actually need: How many High risks do we have? Is the number going up or down? Are we completing our mitigation actions on time? Are there any issues that need Board-level attention right now? The auto-calculation from the register (using Excel COUNTIF or a BI tool) ensures the dashboard is always current — a manually compiled dashboard inevitably lags the register.

## When to use
Phase 4 (Risk Prioritization) for initial build; Phase 5 (Mitigation) for mitigation tracking RAG; ongoing for all subsequent reporting cycles. The dashboard is produced every reporting period for the life of the risk management program.

## Visual
`kpi-tiles`

## Step-by-step tutorial
1. Design the dashboard layout: allocate the top row to KPI tiles (High/Medium/Low risk counts + trend arrows), the middle row to mitigation RAG status, and the bottom section to the Top-5 Risks narrative and issue summary.
2. In Excel, build the risk register with a designated 'Priority Tier' column (values: High/Medium/Low). Use COUNTIF formulae to count each tier in the dashboard cells: =COUNTIF(PriorityTier,'High'). Repeat for each category using nested COUNTIFS.
3. Add a 'prior period' row below each count tile. Calculate the change (current – prior) and use conditional formatting to show green (improvement), amber (stable), or red (deterioration).
4. Build the Mitigation RAG column in the register: =IF(ActionTargetDate<TODAY(), 'Red', IF(ActionStatus='Complete','Green','Amber')). Count each RAG status in the dashboard using COUNTIF.
5. For the Top-5 Risks narrative, sort the register by residual score descending. Write a 3–5 sentence narrative for each of the top 5 risks in the dashboard — this is the only element that cannot be auto-calculated and requires the Risk Manager's judgment each cycle.
6. Build the PowerPoint dashboard template by linking data cells from the Excel register to the PowerPoint using 'Paste Special → Link.' When the register updates, refresh the PowerPoint links to auto-update the dashboard.
7. Lock the dashboard format — presentational consistency across reporting periods enables the Board to spot changes at a glance without re-learning the layout each quarter.

## Real-life example — Prudential plc
Prudential's Group Risk function produces a monthly Group Risk Dashboard for the Group Executive Committee and a quarterly version for the Board Risk Committee. The dashboard shows: risk count by category with period-on-period trend, the top-10 risks with narrative and mitigation RAG status, issue count and escalation status, and a 'risk appetite consumption' gauge (how close is the current risk profile to the appetite thresholds). The auto-calculation from the Group risk register (maintained in a GRC platform) ensures the dashboard is produced in 2 hours each month rather than the 2 days required before the system was implemented.

**So what:** The 'risk appetite consumption' gauge — showing how much of the approved appetite threshold the current risk profile represents — is the most decision-relevant element of Prudential's dashboard. It answers the Board's real question: are we within our risk appetite? A risk count does not answer this; an appetite consumption measure does.

## Template
Build this dashboard in Excel (operational) and PowerPoint (Board version). Update monthly for the Executive Committee; update quarterly for the Board. The Top-5 Risks narrative is the only non-automated element.

- [ ] Reporting period and date
- [ ] Total open risks: current count, prior period count, change, trend indicator
- [ ] High priority risks: count, change, trend
- [ ] Medium priority risks: count, change, trend
- [ ] Low priority risks: count, change, trend
- [ ] Risk counts by category (Strategic / Financial / Operational / Compliance / Reputational / Emerging): High/Medium/Low per category
- [ ] Mitigation action RAG: count of On Track (Green) / In Progress (Amber) / Overdue (Red) actions
- [ ] Average days overdue for Red mitigation actions
- [ ] Total open issues: count by escalation level (Managed / Escalated)
- [ ] Issues resolved this period: count and summary
- [ ] Top-5 Risks narratives (Risk name | Residual score | Driver | Mitigation status | Trend)
- [ ] Risks entering/exiting Red zone since last period
- [ ] CRO commentary (3–5 sentences: overall risk environment assessment, key changes, recommended Board actions)

## Pitfalls
- Dashboard not linked to the live register — if the dashboard is populated manually by copy-pasting from the register, it will always lag and introduce errors. Counter: use Excel-to-PowerPoint live links or a GRC platform with a built-in reporting module.
- Too many metrics obscuring the key messages — a dashboard with 30 tiles tells the Board nothing. Counter: follow the 'fewer, bigger' principle: 4–6 KPI tiles maximum; one heat map; one narrative section. Every metric on the dashboard must answer a specific Board-level question.
- Presenting the dashboard without context — a count of 12 High risks means nothing without knowing whether 12 is more or fewer than last quarter, and whether 12 is within the appetite threshold. Counter: always include period-on-period trend and an explicit 'within appetite / at appetite / exceeding appetite' status.
