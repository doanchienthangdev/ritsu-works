---
type: concept
slug: sales-funnel-chart
title: Sales Funnel Chart
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Sales Funnel Chart

*Category: analysis · Toolkit: Executive Dashboard*

## What it is
A funnel chart showing the volume (and conversion rate) at each stage of the sales process: Leads → Marketing Qualified Leads (MQLs) → Sales Qualified Leads (SQLs) → Proposals → Negotiations → Closed/Won. Each stage is smaller than the prior, creating the funnel shape.

**Origin:** The sales funnel concept dates to E. St. Elmo Lewis's AIDA model (Awareness → Interest → Desire → Action, 1898). The modern multi-stage sales funnel was operationalised in B2B SaaS by Salesforce and the Predictable Revenue methodology (Aaron Ross, 2011). Funnel charts are a native chart type in Excel (Insert > Chart > Funnel).

## Why it works
Revenue is the product of volume × conversion at each stage. The funnel chart makes it immediately visible where conversion is being lost: a large drop between MQL and SQL suggests a sales qualification problem; a large drop between Proposal and Close suggests a pricing or competitive problem. Each bottleneck requires a different intervention.

## When to use
Use on the Sales functional dashboard. Also use for marketing-attribution analysis and sales-planning scenarios.

## Visual
`funnel`

## Step-by-step tutorial
1. Define the funnel stages with the Sales leader (5–7 stages is optimal; more creates noise).
2. Source the count at each stage from the CRM (Salesforce, HubSpot) for the current month and trailing 3 months.
3. Calculate conversion rates: MQL→SQL = SQL count / MQL count; SQL→Proposal = Proposal count / SQL count; etc.
4. Insert a Funnel chart (Excel 2016+: Insert > Charts > Funnel). Input the count at each stage.
5. Add data labels showing both the count and the conversion rate from the prior stage.
6. Add a 'Target Conversion Rate' line for each transition (from sales plan) to show where actual is vs. plan.
7. Create a 3-month trend version showing whether conversion rates are improving or deteriorating.

## Real-life example — HubSpot — Sales funnel analysis from their State of Marketing 2023 report
HubSpot's research on B2B sales funnels found that the industry average MQL-to-SQL conversion rate is 13 % and the SQL-to-Close rate is 22 %. A company with 1,000 monthly MQLs, a 13 % MQL-to-SQL rate, and a 22 % SQL-to-Close rate closes approximately 28 deals per month. If the funnel shows the company is closing 15 deals (53 % of benchmark), the chart narrows at the SQL-to-Close stage, revealing a closing effectiveness problem — not a lead generation problem. The funnel chart makes this instantly actionable: train closers, not marketers.

**So what:** The funnel chart's analytical value is in identifying the constraint: the stage with the worst conversion rate is the bottleneck, and fixing the bottleneck delivers the largest revenue impact per unit of management effort.

## Template
Update stage counts monthly from the CRM. All conversion rates are formula-driven.

- [ ] Leads (top of funnel): [CRM count of all new leads this period]
- [ ] Marketing Qualified Leads (MQLs): [CRM count of leads scoring above MQL threshold]
- [ ] Sales Qualified Leads (SQLs): [CRM count of leads accepted by sales]
- [ ] Proposals Submitted: [CRM count of opportunities in 'Proposal' stage]
- [ ] Negotiations: [CRM count of opportunities in 'Negotiation' stage]
- [ ] Closed/Won: [CRM count of Won opportunities]
- [ ] MQL Conversion Rate: [formula: =MQLs / Leads]
- [ ] SQL Conversion Rate: [formula: =SQLs / MQLs]
- [ ] Proposal Conversion Rate: [formula: =Proposals / SQLs]
- [ ] Close Rate: [formula: =Closed/Won / Proposals]
- [ ] Overall Conversion Rate: [formula: =Closed/Won / Leads]

## Pitfalls
- Using different time periods for different stages (e.g., leads from this month vs. closes that originated 3 months ago) — a snapshot funnel mixes different cohorts; use either a point-in-time CRM snapshot or a cohort-based funnel (all leads generated in month X and tracked through to close).
- Reporting the funnel without conversion rate benchmarks — an absolute count of 50 SQLs is only meaningful if you know whether 50 is good or bad for your sales team size and target market.
