---
type: concept
slug: kpi-dictionary
title: KPI Dictionary
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: metrics
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# KPI Dictionary

*Category: metrics · Toolkit: Executive Dashboard*

## What it is
A reference table that documents every KPI used in an organisation's dashboards: its name, definition, formula, system of record, owner, target, thresholds, and reporting frequency. It is the single source of truth for what each metric means.

**Origin:** The KPI Dictionary concept emerged from data governance practices in enterprise data warehousing (Kimball, Inmon) in the 1990s and was adopted in management reporting by the balanced-scorecard community. It is now standard practice in any FP&A or business intelligence team operating at scale.

## Why it works
Organisations commonly have the same metric calculated differently in different systems: 'revenue' in the CRM includes pipeline; 'revenue' in the ERP includes only invoiced amounts. Without a KPI Dictionary, board discussions degenerate into arguments about whose number is right rather than what the number means for the business. The Dictionary resolves definitional ambiguity once and permanently.

## When to use
Create the KPI Dictionary before building any dashboard, and update it whenever a KPI definition, target, or system of record changes. It is a living governance document, not a one-time deliverable.

## Visual
`table`

## Step-by-step tutorial
1. Create a dedicated 'KPI Dictionary' tab in the master dashboard workbook.
2. For each KPI approved by the SMART-KPI filter, add one row with all required fields.
3. Write the Formula field as an unambiguous single sentence: e.g., 'Revenue = SUM of all invoiced sales to external customers in the calendar month, excluding VAT and inter-company transactions'.
4. In the System of Record field, name the exact database table or CRM object — not just 'ERP' but 'SAP Business One > Invoice table > InvoiceTotal field'.
5. In the Data Owner field, name a specific person (role + name), not a team. The owner is accountable for data quality.
6. Set Green, Amber, and Red thresholds for each KPI, noting whether higher is better or lower is better (this drives the conditional format logic).
7. Review the Dictionary annually during the budget process; flag any KPIs whose target has changed or whose system of record has changed.
8. Distribute the Dictionary to all dashboard users so there is no ambiguity when a board member asks 'how is that calculated?'.

## Real-life example — A global logistics company (€2B revenue, 15,000 employees)
The company's finance function discovered that the Sales team was reporting 'Revenue' as the value of contracts signed, while the ERP team was reporting 'Revenue' as invoiced amounts collected. The discrepancy reached €200M in a single quarter, causing a board-level governance crisis. After implementing a KPI Dictionary that defined Revenue as 'invoiced amounts per the ERP, excluding VAT', both teams moved to a single number. The crisis did not recur.

**So what:** A KPI Dictionary is cheap governance insurance. The cost of building it is 2 days; the cost of not having it can be a board-level incident.

## Template
Add one row per KPI. All fields are mandatory. The Formula field must be specific enough that someone unfamiliar with your systems could reproduce the calculation.

- [ ] # : [sequential number]
- [ ] KPI Name: [short descriptive name]
- [ ] Pillar / Function: [e.g. Finance, Sales, Operations, HR]
- [ ] Formula: [exact calculation in plain English, including exclusions]
- [ ] System of Record: [e.g. SAP ERP > Invoice table > NetAmount field]
- [ ] Data Owner: [full name + role]
- [ ] Monthly Target: [numeric value or formula]
- [ ] Green Threshold: [e.g. >= 100% of Target]
- [ ] Amber Threshold: [e.g. 95-100% of Target]
- [ ] Red Threshold: [e.g. < 95% of Target]
- [ ] Direction: Higher Better / Lower Better
- [ ] Reporting Frequency: Monthly / Weekly / Quarterly
- [ ] Notes: [context, known data quality issues, seasonal adjustments]

## Pitfalls
- Writing vague formulas — 'Total Revenue' is not a formula; 'Sum of invoiced net sales to external customers in the calendar month, per SAP table VBRK, excluding inter-company transactions (partner type IC)' is a formula.
- Assigning ownership to a team rather than a named individual — teams do not get accountable; people do.
- Not reviewing the Dictionary after a system migration or reorganisation — formula definitions become stale when the underlying systems change.
