---
type: concept
slug: comparable-company-analysis
title: Comparable Company Analysis (CCA / Trading Comps)
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Comparable Company Analysis (CCA / Trading Comps)

*Category: financial · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A market-based valuation method that derives an implied value for a subject company by applying trading multiples (EV/EBITDA, EV/Revenue, P/E) observed in publicly traded peer companies to the subject's own financial metrics.

**Origin:** Developed informally by investment banks in the 1970s–1980s as equity research expanded. Formalized in 'Investment Banking' by Rosenbaum and Pearl (Wiley, 2009), which remains the definitive practitioner reference.

## Why it works
Capital markets are reasonably efficient at pricing similar businesses similarly. If the market values comparable companies at 8× EBITDA, it is reasonable to assume the market would value the subject company at a similar multiple — all else equal. CCA is the 'market pulse check' on the DCF.

## When to use
Use CCA as one of three valuation methods (alongside DCF and PTA) for any M&A, IPO, fairness opinion, or buy/sell decision. CCA is most reliable when there is a large set of truly comparable public companies.

## Visual
`comparison`

## Step-by-step tutorial
1. Define the peer universe: screen for 6–10 publicly traded companies that are comparable in industry, business model, size (within 0.3×–3× of subject revenue), geography, and growth profile. Aim for quality over quantity — 6 good comps beat 15 poor ones.
2. Collect LTM (last twelve months) financials for each peer from a data provider (Bloomberg, CapIQ, or SEC filings). LTM = most recent fiscal year-end + year-to-date quarterly actuals − prior year-to-date. Key metrics: revenue, gross profit, EBITDA, EBIT, net income.
3. Calculate enterprise value for each peer: EV = Market Cap + Total Debt + Minority Interest + Preferred Stock − Cash and Equivalents. Source market cap from current share price × diluted shares outstanding.
4. Calculate the multiples for each peer: EV/LTM Revenue, EV/LTM EBITDA, EV/LTM EBIT, P/LTM EPS. Exclude outliers (EV/EBITDA > 20× is typically an anomaly unless it is a high-growth tech company).
5. Calculate the 25th percentile, median, and 75th percentile for each multiple across the peer set.
6. Apply the multiples to the subject company's financial metrics: Implied EV (EBITDA method) = Subject EBITDA × Peer Median EV/EBITDA. Do this for each multiple (Revenue, EBITDA, EBIT) to produce a range of implied EVs.
7. Bridge from EV to equity value: Implied Equity Value = Implied EV − Net Debt. Divide by diluted shares to get implied price range.
8. Present in a football field chart: a horizontal bar chart showing the implied EV range (25th–75th percentile) for each valuation method (CCA, PTA, DCF). This visually frames the valuation range and the dispersion across methods.

## Real-life example — Salesforce acquisition of Slack (2021)
When Salesforce acquired Slack for ~$27.7B in July 2021, investment banks ran a CCA to evaluate whether the price was fair. Comparable SaaS companies (Zoom, Atlassian, HubSpot) were trading at 25–35× LTM revenue at the time. Slack's LTM revenue was ~$903M, implying a CCA range of $22B–$32B EV — consistent with the $27.7B deal price. The PTA (comparable SaaS transactions) showed median deal EV/Revenue of 28×, implying a similar range. This gave Salesforce's board a defensible 'fairness opinion' grounding.

**So what:** CCA is most valuable as a market reality check on the DCF, not as a standalone valuation. The spread between the 25th and 75th percentile of the peer multiples communicates how much pricing dispersion exists in the market for similar assets.

## Template
Fill in the peer company data from Bloomberg or CapIQ. The multiples and implied subject company values calculate automatically.

- [ ] Subject Company Name: ___
- [ ] Subject LTM Revenue ($M): ___
- [ ] Subject LTM EBITDA ($M): ___
- [ ] Subject LTM EBIT ($M): ___
- [ ] Subject LTM EPS ($): ___
- [ ] Subject Net Debt ($M): ___
- [ ] Peer 1: Name ___ | EV $___M | Rev $___M | EBITDA $___M | EV/Rev ___× | EV/EBITDA ___×
- [ ] Peer 2: Name ___ | EV $___M | Rev $___M | EBITDA $___M | EV/Rev ___× | EV/EBITDA ___×
- [ ] Peer 3–8: [repeat above]
- [ ] 25th Percentile EV/EBITDA: ___× | Median: ___× | 75th: ___×
- [ ] Implied Subject EV (25th–75th): $___M – $___M
- [ ] Implied Subject Equity Value: $___M – $___M

## Pitfalls
- Using peers that are not truly comparable — including a capital-light SaaS company as a peer to an asset-heavy manufacturer produces a misleading multiple; EV/EBITDA differences of 3–5× can be justified by business model, not by valuation error.
- Comparing spot multiples without normalizing for one-time items — always use adjusted/normalized EBITDA (strip out restructuring charges, stock-based comp, one-time gains/losses) for both subject and peers.
- Failing to update the peer multiples at time of use — CCA multiples are highly sensitive to market conditions; multiples from 2021 (expansion) vs. 2022 (contraction) differed by 30–40% in many sectors.
