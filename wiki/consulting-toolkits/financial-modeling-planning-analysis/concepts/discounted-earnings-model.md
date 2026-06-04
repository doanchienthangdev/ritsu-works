---
type: concept
slug: discounted-earnings-model
title: Discounted Earnings Model (DDM / Residual Income)
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Discounted Earnings Model (DDM / Residual Income)

*Category: financial · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
An alternative valuation approach that values a company based on the present value of its future earnings (or dividends / residual income) rather than free cash flows. Primarily used for financial institutions (banks, insurance companies) where FCF is not a meaningful measure because capital flows through the business differently.

**Origin:** Dividend Discount Model (DDM): Myron Gordon, 1962 ('The Investment, Financing, and Valuation of the Corporation'). Residual Income (RI) / Economic Value Added (EVA): Stern Stewart & Co., 1991. Used extensively by bank equity research analysts (Goldman Sachs, JPMorgan financial institutions groups).

## Why it works
For financial companies (banks, insurers), capital is an input to the business (regulatory capital requirements define how much equity must be held), and 'free cash flow' has no clear definition because changes in loan balances and deposits are not analogous to working capital or CapEx. The DDM values dividends actually paid (sustainable earnings distributed to shareholders). Residual income values the excess of earnings over the cost of equity capital — representing economic profit created above the minimum required return.

## When to use
Use for commercial banks, investment banks, insurance companies, REITs, or any company where: (a) FCF is not a meaningful measure; or (b) the company has a stable, predictable dividend policy and the primary value driver is earnings yield. Use alongside a Price/Book analysis for banks.

## Visual
`table`

## Step-by-step tutorial
1. Determine whether the Discounted Earnings Model is appropriate: use it for banks, insurance companies, or mature dividend-paying companies. For most non-financial companies, use DCF instead.
2. Forecast earnings per share (EPS) or dividends per share (DPS) for 5–10 years using the three-statement model: revenue growth → net interest income (for banks) or net income → payout ratio → DPS.
3. For DDM: calculate terminal value using the Gordon Growth Model: TV = DPS_n × (1+g) / (Ke − g), where Ke is the cost of equity (CAPM) and g is the sustainable long-run earnings growth rate.
4. For Residual Income: project ROE for each year. Calculate residual income = (ROE − Ke) × Book Value per Share. Terminal residual income converges to zero as the company reaches competitive equilibrium (ROE = Ke).
5. Discount the EPS/DPS/RI stream at the cost of equity (not WACC — equity holders are the residual claimants for earnings/dividends; use Ke, not WACC).
6. Sum the PVs to get equity value per share. Add the current book value per share if using the RI model.
7. Benchmark the implied P/E and P/Book multiples against comparable financial institution peers. A DDM-derived P/Book ratio that significantly diverges from peers warrants investigation of the ROE and Ke assumptions.

## Real-life example — JPMorgan Chase Bank valuation
Bank equity analysts at Goldman Sachs routinely value JPMorgan Chase using a two-stage DDM. Stage 1 (5 years): project JPM's dividends per share using their payout ratio (~30–35%) applied to EPS forecasts. At $4.50 DPS growing at 8% per year, Stage 1 present value is ~$20–22 per share (at 11% Ke). Stage 2 (terminal): at 3% long-run DPS growth rate: TV = $6.60 DPS / (11% − 3%) = $82.50, discounted back = ~$49 per share. Total DDM implied price ~$70–72, consistent with mid-2023 trading range. The sensitivity of this DDM to the terminal growth rate is extreme: changing g from 3% to 3.5% increases the implied price by ~$8 per share (11% premium). This is why bank analysts focus so much on sustainable dividend growth, not just EPS.

**So what:** The Discounted Earnings Model is highly sensitive to the long-run growth rate and cost of equity. For banks, the key question is not 'what is this year's EPS?' but 'what ROE can management sustainably earn above their cost of equity, and for how long?' That is the residual income test.

## Template
Fill in the EPS/DPS forecasts and cost of equity. The model calculates equity value automatically.

- [ ] Company: ___ | Industry: ___ (must be financial institution or dividend-paying)
- [ ] Cost of Equity (Ke, CAPM): ___%
- [ ] EPS Y1–Y5 ($): ___
- [ ] Payout Ratio (DPS / EPS): ___%
- [ ] DPS Y1–Y5 ($): ___
- [ ] Stage 1 PV of Dividends: $___
- [ ] Terminal DPS (Y5 × (1+g)): $___
- [ ] Terminal Growth Rate (g): ___% (must be < Ke and < long-run GDP growth)
- [ ] Gordon Growth TV: DPS_terminal / (Ke − g) = $___
- [ ] PV of TV: $___
- [ ] DDM Equity Value per Share: $___
- [ ] Implied P/E: ___× | Implied P/Book: ___× | Peer median P/Book: ___× | Justified? [Yes / Investigate]

## Pitfalls
- Using DDM for a non-financial company that does not pay dividends — the DDM only works if the company distributes earnings. For growth companies retaining all earnings, use DCF.
- Setting g > Ke in the terminal stage — this produces a negative denominator and a meaningless result; terminal growth rate must always be less than the cost of equity and less than the long-run GDP growth rate.
- Ignoring regulatory capital constraints for banks — a bank cannot pay out 100% of earnings if regulatory capital requirements (Tier 1 ratio) constrain the payout. Always back-test the DPS against the bank's capital adequacy ratios.
