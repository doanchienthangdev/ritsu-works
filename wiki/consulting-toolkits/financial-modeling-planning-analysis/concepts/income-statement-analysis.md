---
type: concept
slug: income-statement-analysis
title: Income Statement (P&L) Analysis
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Income Statement (P&L) Analysis

*Category: analysis · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A structured decomposition of the income statement into its key components — revenue, gross profit, operating expenses, EBITDA, and net income — using common-size analysis, trend analysis, and bridge analysis to identify the drivers of margin expansion or compression.

**Origin:** Derived from financial statement analysis principles codified by Benjamin Graham and David Dodd in 'Security Analysis' (1934). Modern P&L analytics formalized by Kaplan and Atkinson in 'Advanced Management Accounting' and McKinsey's financial diagnostics practice.

## Why it works
The income statement is the primary scorecard of a business's financial performance. But a single P&L number tells you nothing — you need to understand: (a) what drove it (volume, price, mix); (b) how it compares to prior periods (trend); (c) what proportion of revenue each cost item consumes (common-size); and (d) what changed and why (bridge analysis). Only then can management make decisions to improve performance.

## When to use
Use at the start of every financial analysis engagement (Phase 2, Step 1). Also use for monthly management reporting, quarterly performance reviews, and M&A due diligence.

## Visual
`staircase`

## Step-by-step tutorial
1. Pull 5 years of P&L data. Build a common-size P&L: express every line item as % of total revenue. This immediately reveals structural changes in margin structure (e.g., 'COGS has grown from 58% to 64% of revenue over 5 years — gross margin has eroded 6pp').
2. Build a year-over-year (YoY) growth analysis: calculate the absolute and % change for every line item. Focus on the 3–5 items with the largest absolute or % change.
3. Decompose revenue into volume × price × mix: if revenue grew 10%, was it volume growth (more units sold), price growth (same units, higher price), or mix shift (selling more of the higher-priced product)? This decomposition tells you whether growth is sustainable (volume + price = sustainable) vs. one-time (mix shift = not necessarily repeatable).
4. Normalize for one-time items: exclude restructuring charges, impairments, legal settlements, M&A costs, and gains on asset sales. Calculate 'adjusted EBITDA' and compare both reported and adjusted.
5. Build an EBITDA bridge comparing the current period to the prior period (or plan): volume effect + price effect + cost efficiency + one-time items = EBITDA bridge. This is the most actionable analysis because it quantifies management's contribution to the result.
6. Identify the 3 most important trends: which lines are expanding as % of revenue? Which are compressing? What are the implications for future margins?
7. Write a 1-page narrative summarizing: (a) overall performance summary; (b) key drivers of EBITDA change; (c) the 3 most significant trends; (d) the 2–3 questions management needs to answer.

## Real-life example — Meta Platforms (2022 profitability analysis)
In 2022, Meta's revenue fell 1% YoY (first decline as a public company) while operating expenses grew 22% (due to Reality Labs investment and aggressive headcount growth). A common-size P&L analysis revealed: operating expenses as % of revenue jumped from 57% in 2021 to 71% in 2022, compressing operating margin from 43% to 25%. The bridge analysis showed: −$11B from revenue shortfall (advertising slowdown + ATT privacy changes), −$13B from operating cost increases (hiring + metaverse R&D). This analysis directly informed Mark Zuckerberg's 'Year of Efficiency' (2023): 21,000 headcount reduction, Reality Labs spending discipline, resulting in operating margin recovering to 35% by Q3 2023.

**So what:** Common-size analysis is more revealing than absolute numbers. Meta's 2022 problem was not that revenue fell $2B — it was that costs grew to consume 71% of revenue. The common-size trend made the severity of the operating leverage problem impossible to ignore.

## Template
Enter P&L data for 5 years. The common-size analysis and YoY growth calculate automatically. Write the narrative interpretation manually.

- [ ] Company: ___ | Currency: ___
- [ ] Revenue (Year −4 to Year 0): $___
- [ ] COGS: ___ | Gross Profit: ___ | Gross Margin %: ___
- [ ] SG&A: ___ | R&D: ___ | Other OpEx: ___
- [ ] EBITDA: ___ | EBITDA Margin %: ___
- [ ] D&A: ___ | EBIT: ___ | Interest: ___ | Tax: ___ | Net Income: ___
- [ ] Common-size: COGS % Rev: ___ | SG&A % Rev: ___ | EBITDA % Rev: ___
- [ ] YoY Revenue Growth: ___ | YoY EBITDA Growth: ___
- [ ] Normalized EBITDA (excluding one-time items): ___
- [ ] Revenue decomposition: Volume effect ___% | Price effect ___% | Mix effect ___%
- [ ] EBITDA Bridge (vs. prior year): Volume $___M | Price $___M | Cost efficiency $___M | One-time items $___M | Net EBITDA change $___M

## Pitfalls
- Analyzing the P&L in isolation without the balance sheet — a high P&L margin generated by consuming working capital or deferring CapEx is not sustainable; always pair P&L analysis with balance sheet and cash flow analysis.
- Accepting management's 'adjusted EBITDA' without scrutiny — some companies add back so many items that 'adjusted EBITDA' has no resemblance to actual cash generation. Always understand what is being adjusted and why.
- Focusing only on the bottom line — net income includes non-cash charges, interest, and tax that can fluctuate significantly; EBITDA margin and gross margin are more stable and comparable metrics for operating performance analysis.
