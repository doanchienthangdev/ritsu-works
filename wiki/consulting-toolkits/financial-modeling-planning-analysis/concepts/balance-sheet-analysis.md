---
type: concept
slug: balance-sheet-analysis
title: Balance Sheet Analysis
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Balance Sheet Analysis

*Category: analysis · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A structured review of a company's asset composition, liability structure, liquidity ratios, leverage ratios, and capital efficiency metrics to assess financial strength, flexibility, and risk — the 'financial health check' that complements the income statement's performance view.

**Origin:** Balance sheet analysis rooted in fundamental accounting (Pacioli, 1494) and financial statement analysis (Graham & Dodd, 1934). Formalized in commercial banking credit analysis (credit risk) and equity research (financial health screening).

## Why it works
The balance sheet tells you what a business owns and owes at a point in time — and whether those assets are financed sustainably. A highly profitable company can still fail if it runs out of cash (Enron, Lehman Brothers). Balance sheet analysis exposes the financial sustainability of the business model: Can it meet its short-term obligations? Is it over-leveraged? How efficiently is it converting assets into revenue?

## When to use
Use in every financial analysis engagement (Phase 2, Step 2). Especially critical for credit analysis, debt refinancing decisions, acquisition due diligence, and any situation where the company's financial resilience is in question.

## Visual
`comparison`

## Step-by-step tutorial
1. Start with asset quality: review the composition of assets (current vs. non-current, tangible vs. intangible). Flag any large goodwill or intangible assets that may be at risk of impairment (goodwill > 30% of total assets is a warning sign).
2. Assess liquidity: calculate current ratio (Current Assets / Current Liabilities) and quick ratio ((Cash + A/R) / Current Liabilities). A current ratio below 1.0 means current liabilities exceed current assets — a potential liquidity risk. A quick ratio below 0.7 is a red flag.
3. Assess leverage: calculate net debt (total debt − cash) and net debt / EBITDA. Investment-grade companies typically carry < 3.0× net debt/EBITDA. Check interest coverage: EBIT / Interest Expense > 3.0× is the minimum comfort level for most sectors.
4. Calculate capital efficiency: ROIC = NOPAT / (Total Equity + Net Debt). Compare against WACC. ROIC > WACC = value creation; ROIC < WACC = value destruction.
5. Analyze working capital efficiency: DSO (receivables days), DIO (inventory days), DPO (payables days). Calculate the Cash Conversion Cycle (CCC = DSO + DIO − DPO). A shorter CCC means the business requires less working capital to support the same revenue.
6. Review debt maturity profile: are there any large debt maturities in the next 12–24 months? Does the company have a revolving credit facility with sufficient headroom? A company with $500M of debt maturing in 9 months and no refinancing plan is a liquidity risk even if the P&L looks healthy.
7. Write a one-paragraph 'financial health' conclusion: what is the overall financial strength, what are the 2 main balance sheet risks, and what specific actions should management take?

## Real-life example — Bed Bath & Beyond (2022–2023 bankruptcy)
Bed Bath & Beyond's balance sheet analysis in 2022 would have revealed the impending crisis clearly. Net debt/EBITDA had deteriorated from 1.5× (2019) to >7× (2022) as EBITDA collapsed and debt remained. The current ratio fell below 0.8×, meaning current liabilities exceeded current assets. DSO was fine, but inventory turns slowed significantly (high DIO) as sales declined, trapping cash in slow-moving merchandise. Interest coverage fell below 1.0× — the company could not even cover its interest expense from operating income. A rigorous balance sheet analysis in early 2022 would have predicted that without a major refinancing or liquidity injection, bankruptcy was likely within 18 months. The company filed in April 2023.

**So what:** A healthy P&L can hide a deteriorating balance sheet for 2–3 years. Net debt/EBITDA above 4× and interest coverage below 2× are the two most reliable early-warning indicators of financial distress.

## Template
Enter 3–5 years of balance sheet data. The ratios calculate automatically. Write the financial health narrative manually.

- [ ] Cash and Equivalents: ___
- [ ] Accounts Receivable: ___ | DSO: ___days
- [ ] Inventory: ___ | DIO: ___days
- [ ] Total Current Assets: ___ | Total Current Liabilities: ___
- [ ] Current Ratio: ___ | Quick Ratio: ___
- [ ] PP&E (net): ___ | Goodwill and Intangibles: ___ (% of Total Assets: ___%)
- [ ] Total Assets: ___
- [ ] Accounts Payable: ___ | DPO: ___days
- [ ] Total Debt (Short + Long Term): ___
- [ ] Net Debt: ___ | Net Debt / EBITDA: ___×
- [ ] Interest Expense: ___ | Interest Coverage: ___×
- [ ] Total Equity: ___ | D/E Ratio: ___×
- [ ] ROIC: ___% vs. WACC ___% = Value [Creating / Destroying]
- [ ] Cash Conversion Cycle: DSO + DIO − DPO = ___days
- [ ] Debt Maturity Profile: next 12 months $___M | 13–24 months $___M | Revolver availability $___M
- [ ] Financial Health Summary: ___

## Pitfalls
- Using book value equity in leverage ratios — book equity is distorted by retained earnings, share buybacks, and impairments; use market value of equity for leverage ratios when available.
- Treating all debt as equal — a revolving credit facility (flexible, no fixed maturity) is very different from a term loan due in 12 months; review the debt structure, not just the total amount.
- Ignoring off-balance-sheet liabilities — operating leases (pre-IFRS 16), pension obligations, contingent liabilities, and take-or-pay contracts are real financial obligations that do not appear in the simple debt line.
