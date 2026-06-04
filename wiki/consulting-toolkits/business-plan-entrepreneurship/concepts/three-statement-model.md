---
type: concept
slug: three-statement-model
title: Three-Statement Financial Model
source_collection: consulting-toolkits
toolkit: business-plan-entrepreneurship
domain: strategy
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Three-Statement Financial Model

*Category: financial · Toolkit: Business Plan & Entrepreneurship*

## What it is
An integrated financial model that links the income statement (P&L), balance sheet, and cash flow statement so that changes in any one statement automatically flow through to the others, enabling coherent scenario analysis and financial forecasting.

**Origin:** Standard methodology in investment banking financial modelling, taught in CFA curriculum, CFI financial modelling courses, and Wharton/Harvard MBA finance programmes. The linked three-statement model is the minimum viable financial model for any serious business plan or investor presentation.

## Why it works
Standalone P&L projections are insufficient because they ignore cash timing (accrual vs. cash), balance sheet impacts (debt, equity, capex), and working capital dynamics. An integrated three-statement model ensures internal consistency: every revenue and cost assumption in the P&L flows through to the cash flow statement (via operating cash flow) and the balance sheet (via retained earnings and working capital). This makes the model auditable — if the balance sheet doesn't balance, there is an error.

## When to use
Phase 4 (financial plan section of the business plan) and phase 7 (monthly financial analysis). Every business plan must have a linked three-statement model. Standalone P&Ls are insufficient for institutional investors.

## Visual
`process-flow`

## Step-by-step tutorial
1. Build the Income Statement first: start with a bottom-up revenue model — (units sold per period) × (price per unit) = gross revenue. Deduct COGS (direct labour, materials, hosting, third-party services) to get Gross Profit. Deduct operating expenses by category (salaries, marketing, rent, technology, G&A) to get EBITDA. Deduct depreciation and amortisation to get EBIT. Deduct interest expense to get EBT. Deduct tax to get Net Income.
2. Build the Balance Sheet: Assets = Liabilities + Equity. Assets: Cash (to be linked from cash flow statement), Accounts Receivable (Revenue × DSO/365), Inventory (if applicable), PP&E (opening balance + capex – depreciation). Liabilities: Accounts Payable (COGS × DPO/365), Deferred Revenue (if SaaS), Short-term Debt, Long-term Debt. Equity: Paid-in Capital (founder + investor equity), Retained Earnings (opening retained earnings + net income).
3. Build the Cash Flow Statement using the indirect method: Start with Net Income from the P&L. Add back non-cash charges (D&A, stock compensation). Adjust for changes in working capital (decrease in AR is a source of cash; increase in AR is a use of cash). Sum to get Cash from Operations. List capital expenditures (capex) and investments to get Cash from Investing. List debt issuances and repayments, equity raises, and dividends to get Cash from Financing. Sum all three sections to get Net Change in Cash. Add opening cash balance to get Ending Cash.
4. Link the three statements: (a) Net Income from P&L → first line of Cash Flow Statement and → Retained Earnings on Balance Sheet; (b) Ending Cash from Cash Flow Statement → Cash line on Balance Sheet; (c) Capex from Cash Flow Statement → increase PP&E on Balance Sheet; (d) Debt issuances from Cash Flow Statement → increase Long-term Debt on Balance Sheet.
5. Integrity check: does the balance sheet balance (Assets = Liabilities + Equity)? Does Ending Cash on Cash Flow Statement equal Cash on Balance Sheet? If either check fails, there is a formula error — trace and fix before using the model.
6. Build 3 scenarios: Base (most likely assumptions), Bull (revenue 30–50% above base, execution optimal), Bear (revenue 30–50% below base, key assumptions disconfirmed). The model should produce a breakeven month in all scenarios — the Bear scenario's breakeven month is the key risk indicator for funding needs.

## Real-life example — Athena Learning Technologies (worked example)
Athena's three-statement model (Year 1, Month 6 Base Case): Income Statement — Revenue $165K (11 clients × avg $15K ACV / 12 months × 6 months); COGS $37K (22% COGS = content licensing + hosting); Gross Profit $128K (78% margin); OpEx $265K (salaries $180K + marketing $40K + tech $25K + G&A $20K); EBITDA -$137K; Net Income -$140K (after D&A $3K). Cash Flow — Net Income -$140K + D&A $3K - AR increase $22K = Operating Cash -$159K; Capex -$5K = Investing -$5K; Equity raise $2.5M (seed round, received Month 2) = Financing $2.5M; Net Change +$2.336M; Ending Cash $2.336M. Balance Sheet — Cash $2.336M + AR $22K = Assets $2.358M; AP $8K + Equity $2.5M - Retained Earnings -$150K = Liabilities + Equity $2.358M. Balance sheet balances.

**So what:** The three-statement model reveals that despite a -$140K Net Income loss in month 6, the company has $2.336M in cash — because the seed round was received in month 2. This is a crucial insight that a standalone P&L hides: loss-making startups are viable as long as their cash position covers their runway to the next milestone.

## Template
Build in this order: (1) Revenue model assumptions, (2) Income Statement, (3) Balance Sheet, (4) Cash Flow Statement, (5) Links between the three. Verify integrity checks before using for investor presentations.

- [ ] Revenue Assumptions: Units/month (Year 1 monthly): ___ | Price/unit: $___ | Gross Revenue: $___
- [ ] COGS Assumptions: COGS %: ___% | Main COGS items: ___
- [ ] OpEx Assumptions: Salaries: $___ | Marketing: $___ | Tech: $___ | G&A: $___ | Total OpEx: $___
- [ ] Income Statement: Revenue: ___ | COGS: ___ | Gross Profit: ___ | Gross Margin %: ___ | EBITDA: ___ | D&A: ___ | Interest: ___ | Tax: ___ | Net Income: ___
- [ ] Balance Sheet: Cash (linked): ___ | AR: ___ | PP&E: ___ | Total Assets: ___ | AP: ___ | LT Debt: ___ | Paid-in Capital: ___ | Retained Earnings: ___ | Total L+E: ___
- [ ] Cash Flow: Net Income: ___ + D&A: ___ +/- WC Changes: ___ = Operating CF: ___ | Capex: ___ = Investing CF: ___ | Equity/Debt raised: ___ = Financing CF: ___ | Ending Cash: ___
- [ ] Integrity Checks: Assets = L+E? Y/N | CFS Ending Cash = BS Cash? Y/N
- [ ] Breakeven Month (Base): ___ | Breakeven Month (Bear): ___
- [ ] Funding Need to Breakeven: $___

## Pitfalls
- Building the P&L without linking to the balance sheet and cash flow statement — this produces a model that looks good but hides cash timing problems that will surprise the founder 6 months in.
- Using top-down revenue assumptions ('we will capture 1% of the market') instead of bottom-up (units × price × conversion). Top-down models are not defensible in investor conversations.
- Failing to model the balance sheet — deferred revenue (for SaaS annual prepayments) and accounts receivable (for enterprise net-60 payment terms) significantly affect cash timing and are invisible in a P&L-only model.
