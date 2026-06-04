---
type: concept
slug: balanced-scorecard
title: Balanced Scorecard (PMI Application)
source_collection: consulting-toolkits
toolkit: post-merger-integration
domain: corp-dev
category: measurement
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Balanced Scorecard (PMI Application)

*Category: measurement · Toolkit: Post Merger Integration*

## What it is
A multi-perspective KPI framework applied to integration tracking: Financial (synergy realization, cost of integration), Operational (process integration, system uptime), Customer (retention, NPS delta), and People/Learning (key-talent retention, engagement, manager readiness).

**Origin:** Developed by Robert Kaplan and David Norton (Harvard Business School, 1992) in 'The Balanced Scorecard — Measures that Drive Performance', Harvard Business Review. Kaplan & Norton (1996) published the full framework.

## Why it works
Purely financial integration metrics miss the leading indicators that predict whether financial results will materialize. Customer defection and talent attrition are visible in Month 1; their financial consequences appear in Months 6–18. The Balanced Scorecard forces concurrent measurement of the leading indicators (people, operations) alongside the lagging ones (financial synergy).

## When to use
Phase I Step 3 (KPI definition) and Phase IV Step 2 (integration dashboards). The scorecard framework is built in Phase I and populated/tracked throughout Phase IV.

## Visual
`kpi-tiles`

## Step-by-step tutorial
1. Map each strategic integration objective to one of the four scorecard perspectives — most objectives will land in Financial or Operational; ensure at least 2 KPIs in each of Customer and People.
2. For each KPI, define: metric name, calculation method, data source, baseline, target, reporting owner, and reporting frequency.
3. Set 3–5 KPIs per perspective — more than 20 total integration KPIs is too many to manage.
4. Build the dashboard in the integration management tool of choice (Smartsheet, MS Project, or a dedicated integration platform). Automate data feeds from finance, HR, and operations systems.
5. Review the full scorecard at every Steering Committee meeting. Require workstream leads to update their metrics before the meeting, not during it.
6. Archive monthly snapshots — year-one accountability depends on a record of what was reported when.

## Real-life example — FIS acquisition of Worldpay (2019, $43B)
FIS integrated the Worldpay payments processing business — a highly operational deal. The integration balanced scorecard tracked financial synergy realization ($500M Year 3 target), operational metrics (payment processing uptime through system migration), customer metrics (merchant retention rate), and people metrics (Worldpay talent retention through the transition). The explicit Customer perspective KPI — merchant retention — focused the integration team on an outcome that financial metrics alone would have revealed only 12 months too late.

**So what:** In customer-facing businesses, the Customer perspective is the most predictive scorecard perspective — prioritize merchant/customer retention metrics as leading indicators of financial synergy health.

## Template
Define 3–5 KPIs per perspective. Assign each a data owner and reporting frequency. Enter current baseline and target. Review monthly.

- [ ] KPI name
- [ ] Perspective (Financial / Operational / Customer / People)
- [ ] Calculation method
- [ ] Data source
- [ ] Current baseline
- [ ] Target
- [ ] Reporting owner
- [ ] Reporting frequency
- [ ] Current status (RAG)
- [ ] Trend (↑ / → / ↓)

## Pitfalls
- Building the scorecard but not connecting it to governance — the scorecard only drives behavior if it is reviewed at the Steering Committee and deviations are actively managed.
- All KPIs in the Financial perspective — by the time a financial KPI goes red, the underlying cause (talent attrition, customer defection) is months old and hard to remediate.
- Setting targets without baselines — a KPI without a baseline is unmeasurable; establish baselines for all KPIs before Day 1.
