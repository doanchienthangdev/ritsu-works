---
type: concept
slug: asset-allocation-tracker
title: Asset Allocation Tracker
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Asset Allocation Tracker

*Category: financial · Toolkit: Executive Dashboard*

## What it is
A summary table and rebalancing calculator that aggregates the portfolio by asset class, shows current vs. target allocation, and calculates the $ amount to buy or sell per class to return to the target.

**Origin:** Asset allocation as the primary driver of portfolio returns was established by Gary Brinson, L. Randolph Hood, and Gilbert Beebower in their landmark study 'Determinants of Portfolio Performance' (Financial Analysts Journal, 1986), which found that asset allocation explains ~90 % of portfolio return variability. The rebalancing calculator is a standard tool in wealth management.

## Why it works
Over time, well-performing assets grow to represent a larger portion of the portfolio than intended (allocation drift). Without rebalancing, a portfolio set up as 60 % equities / 40 % bonds can drift to 75 % equities / 25 % bonds after a bull market — a materially different risk profile. The tracker makes this drift visible and quantifies the precise rebalancing trades needed.

## When to use
Use monthly or quarterly alongside the investment portfolio dashboard. Also use before making any new investment to ensure it moves allocation toward, not away from, the target.

## Visual
`table`

## Step-by-step tutorial
1. Create an Asset Class Summary table using SUMIF from the Portfolio Input Table: one row per asset class.
2. Calculate Current Weight (%) for each class: =Current Value / Total Portfolio Value.
3. Enter the Target Weight (%) for each class based on the investment policy statement (IPS) or desired allocation.
4. Calculate Drift (pp): =Current Weight − Target Weight.
5. Calculate Trade Required ($): =(Target Weight × Total Portfolio Value) − Current Value. Positive = buy; negative = sell.
6. Apply conditional formatting: cells with |Drift| > 5 pp in amber; |Drift| > 10 pp in red (rebalancing trigger thresholds).
7. Add a dual-ring donut chart: inner donut = current allocation, outer donut = target allocation.

## Real-life example — A university endowment fund ($500M assets under management)
The endowment's investment policy required 50 % Equity / 25 % Fixed Income / 15 % Real Assets / 10 % Alternatives. After a strong equity market in 2023, the actual allocation drifted to 62 % Equity / 19 % Fixed Income / 11 % Real Assets / 8 % Alternatives. The tracker calculated that the fund needed to sell $60M of equity and purchase $30M of fixed income and $20M of real assets to restore the target allocation. The investment committee approved the rebalancing in one meeting, using the tracker as the evidence base.

**So what:** The asset allocation tracker converts a risk-management policy (the IPS target allocation) into a precise, executable trade list — it is the bridge between strategy and action.

## Template
The Current Value and Current Weight columns link to the Portfolio Input Table. Enter your Target Weight for each asset class. The Drift and Trade Required columns are formula-driven.

- [ ] Asset Class: [Equity, Fixed Income, Real Estate, Cash, Alternative]
- [ ] Current Value ($): [formula: =SUMIF(Portfolio_Input, AssetClass, CurrentValue)]
- [ ] Current Weight (%): [formula: =Current Value / Total Portfolio Value]
- [ ] Target Weight (%): [ENTER — your investment policy target]
- [ ] Drift (pp): [formula: =Current Weight − Target Weight]
- [ ] Trade Required ($): [formula: =(Target Weight × Total Portfolio Value) − Current Value]
- [ ] Action: [formula: =IF(Trade>0, 'Buy', IF(Trade<0, 'Sell', 'Hold'))]

## Pitfalls
- Setting target weights that sum to more or less than 100 % — always validate that sum(Target Weights) = 100 %.
- Rebalancing too frequently on small drifts — transaction costs erode returns if you rebalance on every 1 pp drift; set a rebalancing trigger threshold (typically 5 pp) to reduce unnecessary trading.
- Not accounting for cash needs when calculating trade sizes — if the investor needs $50K in cash next month, the rebalancing trades should not liquidate the entire cash position.
