---
type: concept
slug: three-statement-model
title: Three Financial Statement Model
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Three Financial Statement Model

*Category: financial · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
An integrated financial model that links the income statement (P&L), balance sheet (BS), and cash flow statement (CFS) so they balance automatically and consistently reflect a single set of input assumptions. The three-statement model is the foundation of virtually all corporate financial modeling.

**Origin:** Derived from double-entry bookkeeping (Luca Pacioli, 1494) and the modern financial reporting framework. Popularized in its current form by investment banks in the 1970s–1980s and codified in Wall Street Prep and Breaking Into Wall Street training curricula.

## Why it works
Every economic event touches all three statements: recording a sale increases revenue (P&L), increases cash or receivables (BS), and is captured in operating cash flow (CFS). Linking all three ensures model consistency — if the BS does not balance, the model contains an error somewhere. The three statements capture the three dimensions of a business: profitability (P&L), financial position (BS), and liquidity (CFS).

## When to use
Any time you need to model a company's full financial picture — annual budgeting, 3–5 year strategic planning, DCF valuation, M&A target modeling. This is the foundation; all other models (DCF, business case, M&A) sit on top of it.

## Visual
`process-flow`

## Step-by-step tutorial
1. Build the Income Statement first: start with revenue (unit volume × price), deduct COGS to get gross profit, deduct operating expenses to get EBITDA, deduct D&A to get EBIT, deduct interest to get EBT, apply tax rate to get net income.
2. Build supporting schedules that feed the income statement: D&A schedule (beginning PP&E + CapEx − D&A = ending PP&E), debt schedule (beginning debt + draws − repayments = ending debt; interest = average debt × interest rate), and working capital schedule (DSO → A/R; DIO → inventory; DPO → A/P).
3. Build the Balance Sheet: Assets side = Cash + A/R + Inventory + Other Current + PP&E (net) + Other Non-current. Liabilities side = A/P + Other Current Liabilities + Short-term Debt + Long-term Debt + Deferred Taxes. Equity side = Common Stock + Retained Earnings (prior year + Net Income − Dividends) + Other. Cash is the 'plug' — leave it blank for now.
4. Build the Cash Flow Statement (indirect method): Start with Net Income. Adjust for non-cash charges: +D&A. Adjust for working capital changes: +(−) change in A/R, +(−) change in inventory, +(−) change in A/P. This gives Cash from Operations. Investing activities: −CapEx +(−) other investing. Financing activities: +/(−) debt changes, +/(−) equity changes, −dividends. Sum all three to get Net Change in Cash.
5. Complete the balance sheet: Ending Cash = Beginning Cash + Net Change in Cash from the CFS. This is your BS Cash plug.
6. Run the integration check: BS Check = Total Assets − Total Liabilities − Total Equity; this must equal zero for every period. CFS Check = CFS Ending Cash − BS Cash must equal zero. If either check is non-zero, find and fix the error before proceeding.

## Real-life example — Microsoft Corporation
Microsoft's annual financial planning process uses a global integrated three-statement model that links all segments (Productivity and Business Processes, Intelligent Cloud, More Personal Computing) into a single group model. The model allows Microsoft's CFO Amy Hood to evaluate how a revenue mix shift (e.g., faster growth in Azure cloud vs. slower Office licensing) flows through gross margin (higher Azure margin but more CapEx), balance sheet (cloud CapEx increases PP&E), and free cash flow (higher near-term CapEx, higher long-term FCF). This three-statement integration is why Microsoft can commit to multi-year shareholder return targets with confidence.

**So what:** The three-statement model is the 'engine room' of financial planning. Without it, revenue and margin discussions happen in isolation from cash — and companies are regularly surprised by cash shortfalls despite reporting profits.

## Template
Fill in the yellow cells (assumptions) and verify that the checks show 0. All formula cells are locked.

- [ ] Revenue Year 1–5: ___
- [ ] COGS as % of Revenue: ___
- [ ] Gross Margin %: ___ (auto-calculated)
- [ ] SG&A as % of Revenue: ___
- [ ] R&D as % of Revenue: ___
- [ ] D&A (from PP&E schedule): ___
- [ ] Interest Rate on Debt: ___
- [ ] Tax Rate: ___
- [ ] CapEx as % of Revenue: ___
- [ ] DSO (accounts receivable days): ___
- [ ] DIO (inventory days): ___
- [ ] DPO (accounts payable days): ___
- [ ] Dividend payout ratio: ___
- [ ] Opening Cash Balance: ___
- [ ] BS Check (must = 0): =Total Assets − Total Liabilities − Equity
- [ ] CFS Check (must = 0): =CFS Ending Cash − BS Cash

## Pitfalls
- Building the P&L and BS separately and then 'manually reconciling' the cash balance — this creates an irreconcilable model that will produce wrong cash balances under any scenario change.
- Forgetting to include the deferred tax liability — a common omission that makes the BS fail to balance; deferred taxes arise when accounting income differs from taxable income.
- Using beginning-of-period rather than average debt balance for interest calculation — understates interest in growth scenarios.
- Not building supporting schedules (PP&E, debt, working capital) separately — without schedules, you cannot run scenarios that change CapEx intensity or working capital efficiency.
