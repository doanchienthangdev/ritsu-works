---
type: concept
slug: three-statement-financial-model
title: Three-Statement Financial Model
source_collection: consulting-toolkits
toolkit: business-strategy
domain: strategy
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Three-Statement Financial Model

*Category: analysis · Toolkit: Business Strategy & Strategic Planning*

## What it is
An integrated financial model linking the Income Statement, Balance Sheet, and Cash Flow Statement with a shared set of assumptions, enabling scenario analysis and forward projection for strategic planning.

**Origin:** A standard tool in corporate finance and investment banking; widely taught through practitioner training programs and the CFA curriculum. Built on double-entry accounting principles codified in GAAP/IFRS.

## Why it works
A single-statement model (e.g., P&L only) creates a false picture: profitable companies can be cash-flow negative; balance-sheet-rich companies can be operationally inefficient. The three-statement model enforces mechanical consistency (net income → retained earnings; capex → PP&A; debt drawdowns → interest expense → P&L) and reveals the full financial consequences of strategic decisions.

## When to use
Annual strategic plan financial quantification; capital allocation decisions; M&A target valuation; fundraising; board presentation of strategic options.

## Visual
`table`

## Step-by-step tutorial
1. Build the assumptions sheet first: revenue growth drivers (volume × price), margin structure (gross, EBIT, net), working capital ratios (DSO, DIO, DPO), capex plan, depreciation schedule, and debt structure.
2. Build the Income Statement from assumptions: Revenue → Gross Profit → EBIT → EBT → Net Income. Use historical actuals for 3–5 years as the baseline; project forward 3–5 years using the assumption set.
3. Build the Balance Sheet: carry forward retained earnings from the IS; roll the PP&E schedule (opening + capex − depreciation); model working capital from the revenue/COGS assumptions; close the debt and equity to the financing plan.
4. Build the Cash Flow Statement by deriving it from the IS and BS changes: Cash from Operations = Net Income + D&A − changes in working capital; Cash from Investing = CapEx + M&A; Cash from Financing = debt drawdowns − repayments + equity raises.
5. Verify the model balances (BS must balance to the penny; CF must reconcile to opening/closing cash on the BS).
6. Build scenario analysis: define Base, Upside (e.g., +2% revenue growth, +50bps margin), and Downside (e.g., -3% revenue growth, -100bps margin) assumption sets and trace the impact on key outputs (EPS, FCF, leverage).

## Real-life example — Tesla (Strategic Planning Context, 2017–2020)
Tesla's 3-statement model in 2017–2019 revealed the strategic tension: the IS showed rapid revenue growth (Model 3 launch), but the CF statement showed massive cash burn (CapEx for Gigafactory, working capital build). The BS showed increasing leverage (debt funding the cash shortfall). The model quantified the key strategic question: how many quarters of cash runway remained at the current burn rate, and what was the break-even production volume for Model 3? This drove the 2019 capital raise timing and the production efficiency crisis response. A P&L-only analysis would have shown the revenue growth story; the three-statement model showed the survival constraint.

**So what:** The three-statement model is most powerful as a stress-test tool: it reveals whether an ambitious growth strategy is financially survivable under realistic downside scenarios — the question that board members should always ask before approving a strategic plan.

## Template
Build the model in the sequence: Assumptions → IS → BS → CF → Checks. Use the template structure for each statement.

- [ ] KEY ASSUMPTIONS: Revenue growth (%): Year 1: ___ Year 2: ___ Year 3: ___ | Gross margin (%): ___ | EBIT margin (%): ___ | CapEx ($M): ___ | D&A ($M): ___ | DSO (days): ___ | DPO (days): ___
- [ ] INCOME STATEMENT: Revenue: ___ | COGS: ___ | Gross Profit: ___ | SG&A: ___ | EBIT: ___ | Interest: ___ | Tax: ___ | Net Income: ___
- [ ] BALANCE SHEET CHECK: Total Assets = Total Liabilities + Equity: Y/N: ___
- [ ] CASH FLOW: CF from Operations: ___ | CF from Investing: ___ | CF from Financing: ___ | Net Change in Cash: ___ | Closing Cash Balance: ___
- [ ] KEY OUTPUTS: EPS: ___ | FCF: ___ | ROIC: ___ | Net Debt / EBITDA: ___
- [ ] SCENARIO: Base: ___ | Upside: ___ | Downside: ___

## Pitfalls
- Building a model that does not balance: the Balance Sheet must balance to the penny; errors in the model are almost always in the retained earnings roll or the debt/interest linkage.
- Over-engineering assumptions: a model with 200 assumptions and 5-decimal-point precision gives a false sense of accuracy. The most important assumptions (revenue growth, margin, capex) deserve depth; the rest are rounding errors.
- Not running downside scenarios: the most important use of the model is stress-testing survival under adverse conditions, not confirming the bull case.
