---
type: concept
slug: net-worth-tracker
title: Net Worth Tracker
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Net Worth Tracker

*Category: financial · Toolkit: Executive Dashboard*

## What it is
A table and chart that calculates and visualises monthly net worth (Total Assets − Total Liabilities) over a 24-month horizon, with a target growth trajectory line and a CAGR display tile.

**Origin:** Net worth tracking is a foundational personal finance concept dating to balance sheet accounting (assets minus liabilities). Popularised for personal use by financial planning software (Quicken, 1983; Mint, 2006) and personal finance literature (Robert Kiyosaki's *Rich Dad, Poor Dad*, 1997).

## Why it works
Net worth is the ultimate financial health indicator for an individual or family: it measures wealth accumulation independently of income level. Tracking it monthly reveals whether the financial trajectory is positive (saving and investing more than spending and borrowing) or negative (debt growing faster than assets). The CAGR display converts the trajectory into a single annualised growth rate that can be compared to financial goals.

## When to use
Use on the investment and net worth dashboard for individual investors and family offices. Also applicable for high-net-worth individuals receiving wealth management services.

## Visual
`chart`

## Step-by-step tutorial
1. Create a Net Worth tab with two sections: Assets and Liabilities.
2. List all assets: Investment Portfolio (link to Portfolio Input Table total), Primary Residence (estimated market value), Other Real Estate, Business Equity, Pension/Retirement Accounts, Cash & Savings.
3. List all liabilities: Mortgage Outstanding, Car Loan, Student Loan, Credit Card Balance, Other Loans.
4. Calculate Net Worth = SUM(All Assets) − SUM(All Liabilities).
5. Create a monthly snapshot table: copy the Net Worth calculation into a dated row each month-end (use a macro or manual copy-paste-as-value).
6. Define target trajectory: Net Worth at start date × (1 + Target Annual Growth Rate)^(months/12). This creates a compound growth curve.
7. Plot the 24-month bar chart with the target trajectory line overlay.
8. Add CAGR tile: =((Current_Net_Worth / Net_Worth_24_Months_Ago)^(1/2)) − 1.

## Real-life example — A technology professional (35 years old, $250K salary)
The professional used a net worth tracker to set a target of $1M net worth by age 40. At age 35, net worth was $180K. The tracker showed that at the current savings rate ($3K/month invested at 7 % average return), net worth would reach only $820K by age 40 — $180K short of the target. The trajectory line on the chart made the gap visible. The professional increased the monthly investment to $4.5K, recalculated the trajectory, and could see the updated line intersecting the $1M target by age 40.

**So what:** The net worth tracker with a target trajectory line transforms financial goal-setting from aspiration ('I want to be a millionaire by 40') into a feedback loop: are my current actions consistent with my goals?

## Template
Update all asset valuations and liability balances monthly. The Net Worth formula, CAGR formula, and chart series are pre-built. Set your Target Annual Growth Rate once in the configuration cell.

- [ ] ASSETS
- [ ] Investment Portfolio: [link to Portfolio Input Table total current value]
- [ ] Primary Residence: [estimated market value — update quarterly]
- [ ] Other Real Estate: [estimated market values]
- [ ] Pension / Retirement Accounts: [statement balance]
- [ ] Business Equity: [estimated value]
- [ ] Cash & Savings: [bank account balances]
- [ ] TOTAL ASSETS: [SUM formula]
- [ ] LIABILITIES
- [ ] Mortgage Outstanding: [current balance from statement]
- [ ] Car Loan: [current balance]
- [ ] Student Loan: [current balance]
- [ ] Credit Card Balance: [current statement balance]
- [ ] Other Liabilities: [any other loans]
- [ ] TOTAL LIABILITIES: [SUM formula]
- [ ] NET WORTH: [formula: =Total Assets − Total Liabilities]
- [ ] Target Annual Growth Rate: [enter, e.g. 0.10 for 10% per year]

## Pitfalls
- Overestimating asset values — using the original purchase price for real estate or business equity inflates net worth; use conservative current market estimates.
- Forgetting to include all liabilities — credit card balances and car loans are often omitted; incomplete liability accounting overstates net worth.
- Tracking net worth weekly rather than monthly — wealth accumulation is a slow process; weekly fluctuations (stock market movements) create anxiety without informing decisions. Monthly is the right frequency for most individuals.
