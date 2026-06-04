---
type: concept
slug: dupont-analysis
title: DuPont Analysis (ROE Decomposition)
source_collection: consulting-toolkits
toolkit: mergers-acquisitions
domain: corp-dev
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# DuPont Analysis (ROE Decomposition)

*Category: financial · Toolkit: Mergers & Acquisitions*

## What it is
A financial diagnostic technique that decomposes Return on Equity (ROE) into its three constituent drivers — net profit margin, asset turnover, and financial leverage — to diagnose the root cause of a company's profitability relative to peers.

**Origin:** Developed by the financial control team at E.I. du Pont de Nemours and Company in the 1920s to evaluate divisional performance. Popularized in finance textbooks by the 1970s.

## Why it works
ROE = Net Profit Margin × Asset Turnover × Equity Multiplier (financial leverage). Decomposing ROE into these three drivers reveals whether a company earns its returns through superior margins (operational efficiency), capital efficiency (asset turnover), or financial engineering (leverage). In M&A target analysis, DuPont reveals the quality of historical returns and identifies which lever offers the most improvement opportunity post-acquisition.

## When to use
Phase 2 (financial statement analysis), Phase 4 (financial due diligence), as a quick diagnostic for any target where ROE appears surprisingly high or low vs. peers.

## Visual
`tree`

## Step-by-step tutorial
1. 1. Collect 3 years of income statement and balance sheet data for the target company.
2. 2. Calculate the three DuPont components for each year: Net Profit Margin = Net Income / Revenue; Asset Turnover = Revenue / Average Total Assets; Equity Multiplier = Average Total Assets / Average Shareholders' Equity.
3. 3. Verify the decomposition: Net Profit Margin × Asset Turnover × Equity Multiplier = ROE (within rounding).
4. 4. Benchmark all three components against the peer group median. Use the comps peer set from the valuation analysis.
5. 5. Identify which component is the primary driver of any ROE gap vs. peers. A below-peer margin with above-peer leverage signals earnings quality risk (returns are borrowed, not earned). Above-peer margins with below-peer asset turnover signals capital inefficiency.
6. 6. Translate the DuPont findings into acquisition value hypotheses: where can the combined entity improve the target's weakest DuPont driver? This feeds the synergy model.

## Real-life example — Amazon's acquisition of Whole Foods (2017)
Pre-acquisition, Whole Foods had declining net profit margins (price competition from Kroger and Lidl) and adequate but not exceptional asset turnover (physical grocery stores are capital-intensive). A DuPont analysis revealed the ROE deterioration was driven almost entirely by margin compression, not by capital efficiency — a signal that operational improvement (supply chain integration, private label expansion) was the correct integration lever, not financial leverage. Amazon's strategy of using its supply chain to reduce costs validated the DuPont finding.

**So what:** DuPont forces you to identify which financial lever the acquisition is really targeting. It prevents the common mistake of paying a premium for financial leverage (which you could achieve more cheaply yourself through recapitalization) when operational improvement is the real opportunity.

## Template
Build this table for the target and all peers. Use 3-year averages to smooth cyclicality.

- [ ] Company | Year | Net Profit Margin (%) | Asset Turnover (x) | Equity Multiplier (x) | ROE (%) | ROE Decomposed Check
- [ ] Target 3-year average vs. peer median for each component
- [ ] Gap analysis: which component is most below peer median?
- [ ] Value hypothesis: how does the acquisition address this gap?

## Pitfalls
- Using reported net income rather than adjusted net income — one-off charges will distort margins and produce a misleading DuPont picture. Mitigate: always use adjusted net income.
- Ignoring the equity multiplier component — high leverage flatters ROE and signals that the target's returns are financially engineered, creating post-acquisition deleveraging risk. Mitigate: always assess all three components independently.
