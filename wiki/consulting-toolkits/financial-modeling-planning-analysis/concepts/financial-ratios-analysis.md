---
type: concept
slug: financial-ratios-analysis
title: Financial Ratios Analysis
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Financial Ratios Analysis

*Category: analysis · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
The systematic calculation and interpretation of 20+ financial ratios across five dimensions — liquidity, leverage, profitability, efficiency, and market valuation — to diagnose a company's financial health, benchmark it against peers, and track performance trends over time.

**Origin:** Financial ratio analysis traces to the development of commercial credit analysis in the early 20th century (Benjamin Graham and David Dodd's 'Security Analysis', 1934; DuPont Corporation's ROE decomposition framework, 1920). The DuPont analysis (ROE = Net Margin × Asset Turnover × Financial Leverage) remains the most elegant financial ratio decomposition.

## Why it works
Raw financial statement numbers are meaningless in isolation — a company with $500M of EBITDA could be excellent or terrible depending on whether it has $100M or $10B of revenue. Ratios normalize for size, enabling: (a) trend analysis (is the company improving over time?); (b) peer comparison (how does it compare to competitors?); and (c) absolute benchmarks (are key metrics above or below minimum acceptable levels?).

## When to use
Use in Phase 2 financial analysis and for monthly management reporting. The KPI dashboard should be presented at every Finance Committee meeting. Use benchmarking ratios in Phase 3 to set realistic financial KPI targets.

## Visual
`kpi-tiles`

## Step-by-step tutorial
1. Calculate all five categories of ratios from the three-statement model.
2. Liquidity ratios: Current Ratio = Current Assets / Current Liabilities; Quick Ratio = (Cash + A/R) / Current Liabilities; Cash Ratio = Cash / Current Liabilities.
3. Leverage ratios: Net Debt/EBITDA = (Total Debt − Cash) / EBITDA; Interest Coverage = EBIT / Interest Expense; D/E = Total Debt / Total Equity (book).
4. Profitability ratios: Gross Margin = Gross Profit / Revenue; EBITDA Margin = EBITDA / Revenue; Net Margin = Net Income / Revenue; ROE = Net Income / Avg. Equity; ROA = Net Income / Avg. Total Assets; ROIC = NOPAT / (Avg. Equity + Avg. Net Debt).
5. Efficiency ratios: DSO = A/R / (Revenue/365); DIO = Inventory / (COGS/365); DPO = A/P / (COGS/365); Asset Turnover = Revenue / Total Assets.
6. Valuation ratios: EV/EBITDA = Enterprise Value / LTM EBITDA; P/E = Share Price / EPS; P/Book = Share Price / Book Value per Share; FCF Yield = FCF / Market Cap.
7. Apply DuPont decomposition to ROIC: ROIC = (Net Income/Revenue) × (Revenue/Assets) × (Assets/Equity). This decomposes ROIC into margin efficiency × asset efficiency × financial leverage, making it immediately actionable.
8. Build a traffic-light dashboard: green = at or above internal target; amber = within 10% of target; red = below minimum threshold. Present this dashboard at the start of every Finance Committee meeting.
9. Track 5-year trends and compare to peer benchmarks for each ratio. Write a one-paragraph narrative: 'Our current ratio of 1.8× is above the 1.5× minimum but has declined from 2.4× three years ago — driven by a $200M increase in current debt maturities. This trend warrants refinancing action in Q2.'

## Real-life example — Apple Inc. (2023 financial health)
Apple's 2023 financial ratio analysis reveals a masterclass in capital efficiency. Gross Margin: 44% (industry-leading for a hardware company). EBITDA Margin: 33%. ROIC: 50%+ — far above any estimated WACC of 8–9%. Asset Turnover: 1.07×. Net Debt: negative (Apple has net cash of ~$50B, meaning it holds more cash than debt). D/E: artificially elevated by share buybacks (Apple has repurchased $600B of shares, reducing equity book value). FCF Yield: 3.5–4.0% (attractive for a mega-cap). The only 'weak' ratio: Current Ratio of 0.94× (below 1.0×) — but for Apple, this is not a concern because its cash generation is so strong that it can meet any short-term obligation instantly.

**So what:** Ratios must be interpreted in context. A current ratio below 1.0 is alarming for a small manufacturer but irrelevant for Apple — which generates $100B+ of FCF annually. Context (industry, business model, growth stage) is required to interpret every ratio correctly.

## Template
Calculate ratios from the financial statements. Fill in targets and peer benchmarks. Color-code the results.

- [ ] Current Ratio: ___ | Target: >1.5× | Peer Median: ___ | Status: [G/A/R]
- [ ] Quick Ratio: ___ | Target: >1.0× | Peer Median: ___ | Status: [G/A/R]
- [ ] Net Debt / EBITDA: ___× | Target: <3.0× | Peer Median: ___ | Status: [G/A/R]
- [ ] Interest Coverage: ___× | Target: >3.0× | Peer Median: ___ | Status: [G/A/R]
- [ ] Gross Margin: ___% | Target: ___% | Peer Median: ___% | Status: [G/A/R]
- [ ] EBITDA Margin: ___% | Target: ___% | Peer Median: ___% | Status: [G/A/R]
- [ ] ROIC: ___% | Target: >WACC (___%) | Peer Median: ___% | Status: [G/A/R]
- [ ] DSO: ___days | Target: <45days | Peer Median: ___ | Status: [G/A/R]
- [ ] DIO: ___days | Target: <60days | Peer Median: ___ | Status: [G/A/R]
- [ ] DPO: ___days | Target: >30days | Peer Median: ___ | Status: [G/A/R]
- [ ] Asset Turnover: ___× | Peer Median: ___ | Status: [G/A/R]
- [ ] EV/EBITDA: ___× | Peer Median: ___ | Status: [Context-dependent]
- [ ] Overall Financial Health Score: ___ / 5 Red indicators | ___/ 5 Amber | ___ / 5 Green

## Pitfalls
- Applying the same ratio benchmarks across different industries — a 1.0× current ratio is fine for a subscription SaaS business (deferred revenue = current liability but not a cash obligation) but dangerous for a manufacturer; always use industry-specific benchmarks.
- Using a single year's ratios without trend context — a 15% EBITDA margin that was 25% two years ago is a crisis; a 15% margin that was 8% two years ago is a success story. Trend is as important as level.
- Treating ROIC without comparing to WACC — ROIC is meaningless without comparing it to the cost of capital. A 10% ROIC is excellent if WACC is 6% and mediocre if WACC is 12%.
