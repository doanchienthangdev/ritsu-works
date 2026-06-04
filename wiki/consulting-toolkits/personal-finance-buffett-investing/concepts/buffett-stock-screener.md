---
type: concept
slug: buffett-stock-screener
title: Buffett Stock Screener
source_collection: consulting-toolkits
toolkit: personal-finance-buffett-investing
domain: finance
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Buffett Stock Screener

*Category: analysis · Toolkit: Personal Finance & Warren Buffett Investing*

## What it is
A two-stage filter combining quantitative financial criteria (derived from Buffett's and Graham's requirements for business quality) and qualitative scoring (circle of competence, MOAT identifiability, management quality) to reduce the investable universe from thousands of stocks to a watchlist of 10–20 genuinely qualifying candidates.

**Origin:** The quantitative criteria are derived from Buffett's stated investment criteria in his annual letters (specifically the 1977, 1987, and 1992 letters to shareholders), the financial metrics Buffett describes in 'The Warren Buffett Way' (Hagstrom), and Phil Fisher's 15-point qualitative screening approach in 'Common Stocks and Uncommon Profits'. Modern implementations use financial data APIs (Finviz, Stock Analysis, Financial Modeling Prep) to apply these criteria systematically.

## Why it works
The screener's function is negative selection — eliminating companies that definitively do not qualify so that deep research (Phase 5) is applied only to genuinely promising candidates. A 10-year financial track record filters for businesses that have demonstrated durable economics through at least one full business cycle. Qualitative filters then eliminate companies that pass quantitative criteria but are outside the investor's circle of competence or lack identifiable competitive advantages — the two most common reasons individual investors overpay.

## When to use
Phase 4 (initial build); quarterly refresh thereafter; immediately after any company in your circle of competence reports earnings.

## Visual
`funnel`

## Step-by-step tutorial
1. 1. Access a financial data platform (Finviz.com, Stock Analysis, or Financial Modeling Prep API). Set the following quantitative filters: (a) Return on Equity (10-year average) > 15%; (b) Net profit margin (most recent year) > 10%; (c) Debt-to-Equity ratio < 0.5 (or negative net debt); (d) EPS growth consecutive positive for 10 years; (e) Free cash flow positive for 5 consecutive years; (f) Market cap > $500M.
2. 2. Export or record the resulting list of companies. This is your quantitative-screen passing list — typically 150–300 companies from the US universe.
3. 3. Apply the first qualitative filter: circle of competence. Go through the list and retain only companies in your 3–5 defined industries. Remove all others without further analysis.
4. 4. Apply the second qualitative filter: 2-sentence business model test. For each remaining company, write 2 sentences describing the business model, primary revenue driver, and main cost. If you cannot write these sentences confidently, remove the company.
5. 5. Apply the third qualitative filter: identifiable MOAT. For each remaining company, can you name the MOAT source (brand, network effect, switching cost, cost advantage, efficient scale) and cite evidence? Score 1–5. Retain companies scoring ≥ 3.
6. 6. Apply the fourth qualitative filter: management quality. Research the CEO and CFO tenure, capital allocation history (buybacks vs. acquisitions vs. dividends), and alignment (insider ownership). Score 1–5. Retain ≥ 3.
7. 7. For each company passing all filters, write a 2–3 sentence investment thesis: why this company, why it has a durable competitive advantage, and what would make you wrong.
8. 8. Run each company through your valuation models (Phase 3) to estimate intrinsic value. Record the estimated intrinsic value and current price. Calculate the margin of safety gap.
9. 9. Set price alert triggers at 20% and 30% below intrinsic value. Review the watchlist quarterly.

## Real-life example — LVMH Moët Hennessy Louis Vuitton (MC.PA), circa 2015
A Buffett-style investor running the screener on European luxury goods in 2015 would have found LVMH passing all quantitative criteria: ROE averaged 18% for 10 years, net margin ~12%, Debt/Equity ~0.3, EPS grew consistently for a decade, FCF strongly positive every year. The qualitative filters would have revealed: circle of competence for anyone who understood luxury consumer goods (clear and comprehensible business model); 2-sentence description easily written; identifiable MOAT (brand portfolio — the world's most recognised luxury brands including Louis Vuitton, Moët, Hennessy, Christian Dior — creating pricing power and aspirational demand unrelated to production cost); management aligned (Arnault family ~47% ownership). Intrinsic value estimate circa 2015: €130–€160 per share. Price at the time: ~€150. Margin of safety at €150: borderline (0–10%). A disciplined screener would put LVMH on the watchlist and wait for a price dip to €110–€120 before acting.

**So what:** The screener surfaces genuine candidates quickly; the valuation discipline (not buying unless the margin of safety is adequate) is what converts a good screener into a good investment outcome.

## Template
Complete all quantitative fields from financial data sources. Complete qualitative fields from company research. Only companies passing all criteria advance to the Watchlist.

- [ ] Company name and ticker
- [ ] Market cap ($M)
- [ ] ROE 10-year average (%)
- [ ] Net margin most recent year (%)
- [ ] Debt/Equity ratio
- [ ] EPS consecutive positive growth years (#)
- [ ] FCF positive consecutive years (#)
- [ ] Quantitative screen result: PASS / FAIL
- [ ] Circle of competence (Y/N + industry)
- [ ] 2-sentence business model (write it out)
- [ ] MOAT identifiable and evidence (score 1–5)
- [ ] Management quality (score 1–5)
- [ ] Qualitative screen result: PASS / FAIL
- [ ] Investment thesis (2–3 sentences)
- [ ] Estimated intrinsic value (range $)
- [ ] Current price ($)
- [ ] Margin of safety (%)
- [ ] Price alert set at 20% below IV ($)
- [ ] Price alert set at 30% below IV ($)
- [ ] Date added to watchlist

## Pitfalls
- Adjusting the quantitative criteria to include a company you want to own — the criteria exist to prevent motivated reasoning; never lower the ROE threshold for a company you 'like'.
- Skipping the circle of competence filter — every company that passes quantitative screens looks interesting; the COC filter is what prevents you from researching companies you cannot evaluate.
- Using TTM (trailing twelve months) instead of 10-year averages for financial metrics — a single exceptional year can pass short-term screens while hiding a structurally weak underlying business.
- Forgetting to refresh the watchlist quarterly — companies' fundamentals change; a company that passed screens two years ago may no longer qualify.
