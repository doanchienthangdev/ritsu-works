---
type: concept
slug: aarrr-pirate-metrics
title: AARRR Pirate Metrics Framework
source_collection: consulting-toolkits
toolkit: business-plan-entrepreneurship
domain: strategy
category: growth
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# AARRR Pirate Metrics Framework

*Category: growth · Toolkit: Business Plan & Entrepreneurship*

## What it is
A five-stage growth metrics framework — Acquisition, Activation, Retention, Revenue, and Referral — that maps the full customer lifecycle and identifies the bottleneck stage that most limits growth at any given time.

**Origin:** Created by Dave McClure (founder of 500 Startups) and presented at the Startup2Startup conference in 2007. The 'pirate metrics' nickname derives from the acronym AARRR. Widely adopted by Silicon Valley startups and now taught in virtually every lean startup curriculum.

## Why it works
Most startups optimise for the wrong metric at the wrong stage. A startup with great retention but terrible activation is not a retention problem — it is an activation problem. The AARRR framework prevents this by mapping the entire funnel from first contact to viral growth, identifying the conversion rate at each stage, and revealing the stage with the lowest conversion rate as the highest-leverage optimization target.

## When to use
Phase 5 (KPI dashboard setup) and phase 7 (ongoing financial and growth analysis). Also use as the primary framework for identifying where to invest product and marketing resources each quarter.

## Visual
`funnel`

## Step-by-step tutorial
1. Map your product's customer journey to the five AARRR stages. For each stage, define at least 2 metrics that measure how well users move through that stage.
2. Acquisition: measure how many potential customers discover you (impressions, website sessions) and what % convert to registered users (visit-to-signup rate). Track by channel — different channels have very different quality profiles.
3. Activation: define the 'aha moment' — the specific action that, when completed, strongly predicts long-term retention. For Slack, the aha moment is '2,000 messages sent within a team.' For Dropbox, it is 'saving 1 file into the Dropbox folder.' Measure what % of new users reach the aha moment within 7 days of signup.
4. Retention: measure day-7 and day-30 retention rates (% of users who return within the defined window). Also measure monthly churn rate (% of monthly active users who do not return the next month). Benchmark against your category — SaaS targets day-30 retention ≥25%; consumer apps target day-30 retention ≥15%.
5. Revenue: measure MRR (Monthly Recurring Revenue), ARPU (Average Revenue Per User), free-to-paid conversion rate, and LTV. Calculate LTV as: ARPU × gross margin % / churn rate. Target LTV/CAC ≥3×.
6. Referral: measure NPS (Net Promoter Score) and the viral coefficient (k-factor = invitations sent per user × invitation acceptance rate). A k-factor >1 means the product grows without marketing spend.
7. Identify the bottleneck stage: calculate the conversion rate at each stage. The lowest conversion rate is the highest-leverage optimization target — fix that stage before optimising the others.
8. Update all AARRR metrics in the KPI dashboard monthly. Review in the weekly all-hands.

## Real-life example — Dropbox
Dropbox's AARRR analysis revealed in 2009 that Acquisition was strong (landing page with the demo video generated enormous traffic) but Activation was the bottleneck (users who installed the desktop app but never saved a file never returned). The aha moment analysis showed that 'saving at least 1 file to the Dropbox folder within 7 days' was the strongest predictor of long-term retention. Product changes focused entirely on reducing friction in that first-file experience: installer wizard redesign, empty folder with sample files, onboarding email sequence. Result: activation rate improved from 12% to 33% — a 2.75× improvement that translated directly into 2.75× faster revenue growth without any additional acquisition spend.

**So what:** The AARRR framework's greatest value is revealing where NOT to invest. Dropbox's team could have spent $10M on acquisition — but the actual bottleneck was activation. Fixing activation cost <$100K in engineering time and generated more growth than any marketing spend would have.

## Template
Define at least 2 metrics per AARRR stage. Set a target value for each. Track monthly. Identify the bottleneck stage (lowest conversion rate). Focus optimization on the bottleneck.

- [ ] Acquisition: Metric 1: ___ | Target: ___ | Metric 2: ___ | Target: ___ | Current value: ___
- [ ] Activation: Aha Moment definition: ___ | Metric: ___% reach aha in 7 days | Target: ___% | Current: ___%
- [ ] Retention: Day-7 retention: ___% | Day-30 retention: ___% | Monthly churn: ___% | Target Day-30: ___%
- [ ] Revenue: MRR: $___ | ARPU: $___ | LTV: $___ | LTV/CAC: ___× | Free-to-paid conv: ___%
- [ ] Referral: NPS: ___ | k-factor: ___ | Referral rate: ___
- [ ] Bottleneck Stage: ___ | Conversion rate at bottleneck: ___% | Planned optimization: ___

## Pitfalls
- Optimising acquisition before fixing activation and retention — acquiring users into a leaky bucket is burning money.
- Measuring the wrong activation metric — 'completed onboarding' is a proxy. The real aha moment metric is the behaviour that most predicts 90-day retention. Find this through cohort analysis.
- Measuring NPS as a referral metric without also measuring the actual referral rate. NPS is a leading indicator, not the metric itself.
