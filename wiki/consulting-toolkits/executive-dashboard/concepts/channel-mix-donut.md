---
type: concept
slug: channel-mix-donut
title: Channel Mix Donut Chart
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Channel Mix Donut Chart

*Category: analysis · Toolkit: Executive Dashboard*

## What it is
A donut chart showing the proportional contribution of each marketing or sales channel to a total (leads, revenue, or customers), enabling at-a-glance analysis of channel concentration and mix shift over time.

**Origin:** Channel mix analysis is a standard marketing analytics technique formalised in Philip Kotler's multi-channel marketing frameworks (*Marketing Management*, 1967) and operationalised in digital marketing attribution models from Google Analytics and similar platforms.

## Why it works
Donut charts are the correct visualisation for proportional composition: each segment shows its share of the total. The channel mix donut makes two strategic questions immediately visible: (1) concentration risk — is the business over-reliant on a single channel? (2) mix shift — is the profitable channel share growing or shrinking? These are questions about portfolio strategy, not individual channel performance.

## When to use
Use on the Marketing functional dashboard to monitor channel mix and acquisition efficiency. Also use in investor presentations to demonstrate diversified, sustainable customer acquisition.

## Visual
`chart`

## Step-by-step tutorial
1. Source channel data from the marketing analytics platform (Google Analytics, HubSpot, Marketo) — aggregate leads, revenue, or customer count by acquisition channel.
2. Limit to 6–8 channels: group channels representing <5 % of total into an 'Other' category.
3. Insert a Donut chart with channel names and percentages as data series.
4. Apply consistent colour fills per channel (e.g., Organic always blue, Paid always orange) so they are instantly recognisable across periods.
5. Add a companion donut for the prior period to create a 'current vs. prior' comparison side by side.
6. Add a Cost per Lead / Cost per Acquisition table beneath the donut to contextualise the mix: a channel with 30 % of leads but 60 % of marketing spend is inefficient.

## Real-life example — Shopify — merchant acquisition channel mix analysis, 2022
Shopify's marketing team uses channel mix analysis to monitor its merchant acquisition funnel. In 2022, Organic Search represented 38 % of merchant sign-ups, Paid Search 22 %, Partner/App Store 25 %, Direct 10 %, Other 5 %. The mix donut showed a year-over-year shift: Partner/App Store was growing (+8 pp) while Paid Search was declining (−5 pp), indicating that the partner ecosystem was becoming a more cost-effective acquisition channel. This data drove the 2023 decision to increase investment in the partner programme and reduce paid-search spend.

**So what:** The channel mix donut is most powerful when compared across periods: the direction of mix shift (which channels are gaining/losing share) reveals where investment is paying off.

## Template
Source channel data from your marketing analytics platform. Update monthly. Ensure channel definitions are consistent across periods.

- [ ] Channel Name: [e.g. Organic Search, Paid Search, Social Media, Email, Partner/Referral, Direct, Other]
- [ ] Volume (Leads/Revenue/Customers): [from analytics platform]
- [ ] Share %: [formula: =Channel Volume / Total Volume]
- [ ] Cost per Acquisition ($): [from marketing cost tracking]
- [ ] Prior Period Share %: [from prior month or prior year]
- [ ] Mix Shift (pp): [formula: =Current Share − Prior Period Share]

## Pitfalls
- Using last-click attribution — single-touch attribution models misattribute credit for multi-touch journeys; use data-driven attribution or multi-touch attribution if available.
- Comparing donut charts with different channel definitions across periods — if the channel taxonomy changes, the mix shift data is not comparable.
- Ignoring cost per acquisition alongside volume share — a channel with a large volume share but 10× the CAC of other channels may be destroying value despite its apparent importance.
