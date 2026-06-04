---
type: concept
slug: marketing-roi-analysis
title: Marketing ROI Analysis
source_collection: consulting-toolkits
toolkit: sales-marketing-pricing-communication
domain: commercial
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Marketing ROI Analysis

*Category: analysis · Toolkit: Sales, Marketing, Pricing & Communication*

## What it is
A structured analysis that measures the return on marketing investment by calculating Customer Acquisition Cost (CAC), Customer Lifetime Value (LTV), and ROI per channel, enabling data-driven marketing budget allocation.

**Origin:** Direct marketing practice since the 1960s; CAC and LTV formalised in SaaS metrics by David Skok (Matrix Partners) and Andreessen Horowitz in the 2010s

## Why it works
Marketing spend is only rational when the LTV of acquired customers exceeds the cost of acquiring them. The LTV:CAC ratio (target: >3×) and Payback Period (target: <18 months) are the two primary health metrics for a sustainable marketing programme.

## When to use
Quarterly marketing budget reviews, when building or redesigning the marketing channel mix, or when defending/challenging marketing spend to the CFO.

## Visual
`comparison`

## Step-by-step tutorial
1. Calculate CAC per channel: total channel spend in period / number of new customers acquired via that channel in the same period. Attribute customers to channels using last-touch or multi-touch attribution.
2. Calculate LTV per customer segment: LTV = (Average Revenue Per User per month × Gross Margin %) / Monthly Churn Rate. For early-stage businesses, use a truncated 12–24 month LTV until you have retention data.
3. Calculate LTV:CAC ratio per channel. Channels with ratio <1 are destroying value; <3 are marginal; >3 are healthy; >5 are exceptional.
4. Calculate Payback Period: CAC / (ARPU × Gross Margin %). This tells you how many months of customer revenue it takes to recover the acquisition cost.
5. Build a channel comparison matrix showing all four metrics side by side. Rank channels by LTV:CAC ratio.
6. Reallocate budget: increase spend on channels with LTV:CAC >3 until returns diminish; reduce or cut channels with LTV:CAC <2.

## Real-life example — Dropbox (2008–2012 growth)
Dropbox's original marketing channel was paid search/display advertising. CAC from these channels was approximately $233–$388 per new user (2009 data). LTV at that time was estimated at $64–$99 per average user (mostly free tier). LTV:CAC ratio was <1 — the paid acquisition programme was structurally loss-making. Dropbox's response: pivot to a referral programme (give and get free storage). CAC from referral dropped to approximately $0.55–$1.10 per new user (server and bandwidth cost of free storage). At an LTV:CAC of >50:1, the referral programme funded 35% of Dropbox's growth from 2009–2012, growing the user base from 100k to 4m in 15 months.

**So what:** Marketing ROI analysis exposed that Dropbox's paid acquisition was economically impossible — the referral pivot was not a creative idea, it was the only strategy that made the unit economics work.

## Template
Calculate CAC, LTV, and LTV:CAC per channel. Rank channels and reallocate budget.

- [ ] Analysis period: [FILL]
- [ ] Channel list: [FILL]
- [ ] Spend per channel ($): [FILL]
- [ ] New customers acquired per channel: [FILL]
- [ ] CAC per channel ($): [FILL]
- [ ] ARPU per segment ($/month): [FILL]
- [ ] Gross margin (%): [FILL]
- [ ] Monthly churn rate (%): [FILL]
- [ ] LTV per segment ($): [FILL]
- [ ] LTV:CAC ratio per channel: [FILL]
- [ ] Payback period per channel (months): [FILL]
- [ ] Budget reallocation recommendation: [FILL]

## Pitfalls
- Using last-touch attribution exclusively: in multi-touch journeys, last-touch undervalues top-of-funnel channels (SEO, social awareness).
- Calculating LTV on too-short a time horizon: a 3-month LTV will always look lower than the true value; use the longer of 12 months or average customer lifetime.
- Not segmenting LTV by customer type: enterprise customers may have 10× the LTV of SMB, completely changing the channel economics.
