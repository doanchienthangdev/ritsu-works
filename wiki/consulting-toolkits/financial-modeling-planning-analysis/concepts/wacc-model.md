---
type: concept
slug: wacc-model
title: Weighted Average Cost of Capital (WACC) Model
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Weighted Average Cost of Capital (WACC) Model

*Category: financial · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
WACC is the blended rate of return required by a company's debt and equity investors, weighted by their proportions in the capital structure. It is the discount rate used in DCF analysis and the hurdle rate for capital investment decisions.

**Origin:** Theoretical foundation in Modigliani-Miller capital structure theory (1958). Cost of equity via CAPM developed by Sharpe (1964) and Lintner (1965). Practical WACC calculation methodology codified by McKinsey (Copeland et al., 1990) and Damodaran (Investment Valuation, 2012).

## Why it works
Every dollar of capital — whether from a bank (debt) or a shareholder (equity) — has an opportunity cost. Debt holders demand an interest rate; equity holders demand a return commensurate with the business risk they bear. WACC blends these two costs proportionally to produce the minimum return the firm must earn on its invested capital to create value. If ROIC > WACC, the business creates value; if ROIC < WACC, it destroys value.

## When to use
Whenever you need a discount rate for a DCF analysis, a capital project NPV calculation, or an economic profit / EVA calculation. Also use WACC as the hurdle rate for capital allocation decisions: any project with IRR < WACC should be rejected (all else equal).

## Visual
`table`

## Step-by-step tutorial
1. Get the risk-free rate: use the current 10-year US Treasury yield for USD-denominated analysis. Source from the Federal Reserve website or Bloomberg.
2. Get the equity risk premium (ERP): use Damodaran's current year implied ERP estimate from his NYU website (pages.stern.nyu.edu/~adamodar/). Do not use historical average ERP — it is stale.
3. Get beta: use Bloomberg's 5-year weekly beta vs. the S&P 500 for your subject company (or a peer set if the subject is private). Beta is the levered (observed) beta.
4. Unlever the beta using the Hamada equation: βu = βL / [1 + (1−t) × D/E], where D/E is the current capital structure. This removes the financial leverage effect from the beta.
5. Re-lever the beta to the target capital structure: βL_target = βu × [1 + (1−t) × D/E_target]. Use the industry-average or management's target D/E ratio.
6. Calculate cost of equity: Ke = Rf + βL_target × ERP.
7. Calculate post-tax cost of debt: source the YTM of the company's publicly traded bonds (Bloomberg) or the weighted average interest rate from the 10-K. Apply the effective tax rate: Kd_post-tax = Kd_pre-tax × (1 − tax rate).
8. Calculate capital structure weights: E/V = Market Cap / (Market Cap + Net Debt), D/V = Net Debt / (Market Cap + Net Debt). Use market values, not book values.
9. Calculate WACC: WACC = Ke × E/V + Kd_post-tax × D/V.
10. Benchmark: compare your WACC to Damodaran's sector WACC table for your industry. If your WACC differs by more than 2%, investigate the difference before using it in a DCF.

## Real-life example — Tesla Inc. (2023)
In 2023, Tesla's WACC was estimated by the market at approximately 9–10%. Inputs: Risk-free rate 4.3% (10-yr Treasury), ERP 5.0% (Damodaran implied ERP), Tesla's 5-yr beta ~1.7 (levered). After unlevering (Tesla is ~85% equity-financed) and re-levering to target structure: beta ~1.7, Ke = 4.3% + 1.7 × 5.0% = 12.8%. Cost of debt ~4.5% post-tax. WACC = 12.8% × 85% + 4.5% × 15% = 11.6%. At this WACC, a Tesla DCF with high long-run FCF growth assumptions (8% terminal growth) would produce an implied EV roughly consistent with its ~$600B market cap in late 2023 — but only with aggressive growth assumptions. A more conservative 3% terminal growth produces an EV of ~$200B, illustrating why Tesla's valuation is so sensitive to the long-run growth assumption.

**So what:** WACC is not a plug — it is a disciplined process. Even a 1% WACC error (using 9% vs. 10%) changes DCF value by 8–12%. Always benchmark your WACC against Damodaran's sector table.

## Template
Fill in the yellow cells. The WACC is calculated automatically. Reconcile against Damodaran's sector benchmark before using in a DCF.

- [ ] Risk-Free Rate (10-yr Treasury yield, current): ___% | Source: ___
- [ ] Equity Risk Premium (Damodaran implied ERP, current year): ___% | Source: ___
- [ ] Beta (5-yr weekly vs. S&P 500, levered): ___ | Source: ___
- [ ] Tax Rate (effective, from 10-K): ___%
- [ ] Current D/E ratio (market value): ___
- [ ] Target D/E ratio: ___
- [ ] Unlevered Beta (Hamada): βu = ___ / [1 + (1−___) × ___] = ___
- [ ] Re-levered Beta (to target): βL = ___ × [1 + (1−___) × ___] = ___
- [ ] Cost of Equity: Ke = ___% + ___ × ___% = ___%
- [ ] Pre-tax Cost of Debt (YTM or loan rate): ___%
- [ ] Post-tax Cost of Debt: ___% × (1 − ___%) = ___%
- [ ] Equity Weight (E/V): ___%
- [ ] Debt Weight (D/V): ___%
- [ ] WACC = ___% × ___% + ___% × ___% = ___%
- [ ] Damodaran Sector WACC Benchmark: ___% | Difference: ___% | Explanation: ___

## Pitfalls
- Using book value instead of market value weights — book value capital structure can be wildly distorted by retained earnings and goodwill; market values reflect the actual cost of capital.
- Using historical average ERP instead of the current implied ERP — historical ERP averages are backward-looking and can be 1.5–2% off in either direction; use Damodaran's implied ERP.
- Forgetting to unlever and re-lever beta — if your company is 40% debt-financed and your peer is 10%, using the peer's levered beta directly overstates your equity risk.
- Ignoring the tax shield on debt — debt is cheaper than equity partly because interest is tax-deductible; the post-tax cost of debt can be 1.5–2% lower than the pre-tax rate.
