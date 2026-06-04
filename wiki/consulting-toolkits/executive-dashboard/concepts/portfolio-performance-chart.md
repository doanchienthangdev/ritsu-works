---
type: concept
slug: portfolio-performance-chart
title: Portfolio vs. Benchmark Performance Chart
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Portfolio vs. Benchmark Performance Chart

*Category: financial · Toolkit: Executive Dashboard*

## What it is
A line chart with three series: cumulative portfolio return, cumulative benchmark return (e.g., S&P 500 or MSCI World), and the risk-free rate (e.g., 10-year Treasury yield). The gap between the portfolio line and the benchmark line is alpha.

**Origin:** Performance attribution against benchmarks is the standard for investment performance measurement, formalised by the CFA Institute's Global Investment Performance Standards (GIPS, first edition 1999). The three-line chart format (portfolio / benchmark / risk-free rate) is the standard presentation in institutional asset management.

## Why it works
Investment returns are only meaningful in context: a 12 % annual return is excellent if the benchmark returned 8 % (alpha = +4 pp) and disappointing if the benchmark returned 18 % (alpha = −6 pp). The benchmark comparison converts the raw return number into a measure of skill. The risk-free rate as a third series establishes the minimum acceptable return — any portfolio that underperforms the risk-free rate for more than 12 months has a risk-management problem regardless of benchmark comparison.

## When to use
Use on the investment dashboard as the primary performance visual. Also applicable for corporate pension funds and endowments reporting to trustees.

## Visual
`chart`

## Step-by-step tutorial
1. Establish a measurement start date (e.g., 1 January of the prior year or portfolio inception date).
2. Calculate monthly portfolio return: =( Portfolio_Value_End − Portfolio_Value_Start − Net_Cash_Flows ) / Portfolio_Value_Start. Adjust for cash flows using the modified Dietz method if contributions/withdrawals occurred.
3. Source monthly benchmark data (S&P 500 monthly total return, Yahoo Finance or MSCI): enter in Input tab.
4. Calculate cumulative return for all three series: Month 1 = (1 + Monthly Return) − 1; Month 2 = (1 + Month 1 cumulative) × (1 + Month 2 return) − 1; etc.
5. Insert a Line chart with three series.
6. Add a horizontal reference line at y = 0 % (break-even from start of period).
7. Format portfolio line heavier than benchmark (2.5pt vs. 1.5pt) so it reads as the primary series.
8. Add an annotation text box showing the most recent alpha (=Portfolio Return − Benchmark Return, annualised).

## Real-life example — Yale University Endowment — David Swensen's portfolio, 1985–2020
David Swensen's Yale Endowment used the three-line performance chart (Yale portfolio vs. S&P 500 vs. T-bill rate) as the primary accountability tool in its annual reports. Over 35 years, the Yale portfolio compounded at 12.6 % annually vs. the S&P 500 at 10.8 % and T-bills at 4.7 % — consistent outperformance that was only visible as a sustained gap between the three lines on a long-horizon cumulative-return chart. The chart was the empirical foundation for Swensen's endowment model of alternative-heavy diversification.

**So what:** The performance vs. benchmark chart is the ultimate accountability tool for any investment portfolio: it shows whether the investment approach is generating alpha over time, adjusted for what the market itself produced.

## Template
Enter monthly portfolio values in column A. Enter benchmark monthly returns in column B (sourced from Yahoo Finance or MSCI). Risk-free rate is sourced from the 10-year Treasury yield (Federal Reserve FRED database). All cumulative return calculations are formula-driven.

- [ ] Month: [date, e.g. Jan-2023 through current month]
- [ ] Portfolio Value (end of month): [UPDATE MONTHLY]
- [ ] Benchmark Monthly Return (%): [source from Yahoo Finance / MSCI; UPDATE MONTHLY]
- [ ] Risk-Free Monthly Rate (%): [= 10-year Treasury yield / 12; UPDATE MONTHLY]
- [ ] Portfolio Monthly Return: [formula: =(Current Value − Prior Value) / Prior Value]
- [ ] Portfolio Cumulative Return: [formula: =(1+Cumul_Prior) × (1+Monthly_Return) − 1]
- [ ] Benchmark Cumulative Return: [formula: same calculation applied to benchmark monthly returns]
- [ ] Risk-Free Cumulative: [formula: same calculation applied to risk-free monthly rates]

## Pitfalls
- Ignoring cash inflows/outflows when calculating portfolio return — a $50K deposit creates a false 'return' if the portfolio value is simply used as a gain/loss calculation. Use Modified Dietz or time-weighted return methodology.
- Using a price return index for the benchmark instead of a total return index — dividends typically contribute 2–4 % to annual returns; comparing portfolio total return against a price-only benchmark overstates alpha.
- Starting the measurement period at a market peak — selective measurement periods are misleading; use a full market cycle (start at a neutral point) or since-inception.
