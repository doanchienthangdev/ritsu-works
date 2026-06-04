---
type: concept
slug: portfolio-input-table
title: Investment Portfolio Input Table
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Investment Portfolio Input Table

*Category: financial · Toolkit: Executive Dashboard*

## What it is
A spreadsheet table listing every investment holding with: asset name, class, purchase details, current price, and calculated metrics (current value, gain/loss, portfolio weight, annualised return). The single data source for all investment dashboard charts.

**Origin:** Standard portfolio accounting table used by institutional investors (CFA Institute portfolio accounting standards) and retail brokerage platforms. Adapted for individual investor dashboards from the spreadsheet-based tracking templates popularised by personal finance communities.

## Why it works
Investment dashboards have a unique data challenge: prices change daily/monthly, holdings change with trades, and currencies may vary. The portfolio input table separates the stable data (purchase history) from the volatile data (current prices), so only one column needs updating monthly — the Current Price column — to refresh all calculations and charts.

## When to use
Use as the data foundation for every investment dashboard. Also applicable for corporate treasury teams tracking investment portfolios.

## Visual
`table`

## Step-by-step tutorial
1. Create an 'Investments' input tab. Add one row per holding.
2. Enter stable data once: Asset Name, Asset Class, Purchase Date, Purchase Price, Quantity.
3. Update Current Price monthly (or link to a data feed if available).
4. Add formula columns: Current Value (=Quantity × Current Price), Gain/Loss $ (=Current Value − Quantity × Purchase Price), Gain/Loss % (=Gain/Loss $ / Quantity × Purchase Price), % of Portfolio (=Current Value / SUM of all Current Values).
5. Add Years Held (=YEARFRAC(Purchase Date, TODAY())) and Annualised Return (=(Current Price/Purchase Price)^(1/Years Held)−1).
6. Add a Portfolio Summary row: SUM of Current Value, Gain/Loss $; AVERAGE of Gain/Loss % (weighted by Current Value); XIRR formula for portfolio-level time-weighted return.
7. Add a second table (Asset Class Summary) using SUMIF to aggregate by asset class for the allocation donut.

## Real-life example — A family office managing a $10M multi-asset portfolio
The family office previously used a brokerage statement and a separate Excel sheet, requiring manual reconciliation each month-end. After building the portfolio input table, monthly reconciliation was reduced to entering current prices in one column (15 minutes per month). The table drove all portfolio analytics: return attribution by asset class, rebalancing calculations, and performance vs. benchmark — all automatically updated from the single current-price update.

**So what:** The portfolio input table's power is the separation of stable data (purchase history) from volatile data (current prices): this means 98 % of the table never changes, and 100 % of the dashboard updates from a single column entry.

## Template
Enter one row per holding. Only update the 'Current Price' column monthly. All return and weight calculations are formula-driven — do not overwrite them.

- [ ] Asset Name: [ticker symbol or descriptive name]
- [ ] Asset Class: [Equity / Fixed Income / Real Estate / Cash / Alternative]
- [ ] Purchase Date: [DD/MM/YYYY]
- [ ] Purchase Price: [price per unit in local currency]
- [ ] Quantity: [number of units / shares]
- [ ] Current Price: [UPDATE MONTHLY — current market price per unit]
- [ ] Currency: [ISO currency code, e.g. USD, EUR, GBP]
- [ ] Current Value: [formula: =Quantity × Current Price]
- [ ] Gain/Loss $: [formula: =Current Value − (Quantity × Purchase Price)]
- [ ] Gain/Loss %: [formula: =Gain/Loss $ / (Quantity × Purchase Price)]
- [ ] % of Portfolio: [formula: =Current Value / TOTAL_PORTFOLIO_VALUE]
- [ ] Years Held: [formula: =YEARFRAC(Purchase_Date, TODAY())]
- [ ] Annualised Return: [formula: =(Current_Price/Purchase_Price)^(1/Years_Held)−1]

## Pitfalls
- Entering total value instead of price and quantity separately — entering only the current holding value makes it impossible to calculate cost basis and true return.
- Not tracking the purchase date — annualised return calculations require the exact purchase date; without it, only the absolute gain/loss can be computed.
- Using inconsistent currencies without a conversion mechanism — for a multi-currency portfolio, add a separate exchange rate table and a local-currency conversion formula.
