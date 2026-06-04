---
type: concept
slug: dcf-valuation
title: Discounted Cash Flow (DCF) Valuation
source_collection: consulting-toolkits
toolkit: personal-finance-buffett-investing
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Discounted Cash Flow (DCF) Valuation

*Category: financial · Toolkit: Personal Finance & Warren Buffett Investing*

## What it is
A fundamental intrinsic value model that estimates a company's current worth by projecting its future free cash flows over a forecast period (typically 10 years), adding a terminal value that captures value beyond the forecast period, and discounting all cash flows to present value using a risk-adjusted discount rate (WACC or required return).

**Origin:** The theoretical foundation of DCF valuation is rooted in John Burr Williams' 'The Theory of Investment Value' (1938), which first articulated the proposition that a stock is worth the present value of all future dividends (cash distributions). Benjamin Graham and David Dodd applied discounted value concepts in 'Security Analysis' (1934). The modern corporate finance formulation using WACC was formalised in the academic literature in the 1960s (Modigliani-Miller) and practically elaborated by Aswath Damodaran in 'Damodaran on Valuation' (1994, 2006).

## Why it works
A dollar received today is worth more than a dollar received in 10 years because: (a) inflation erodes purchasing power, (b) capital could be deployed productively in the interim, and (c) future cash is uncertain. Discounting future cash flows by the required rate of return (the opportunity cost of capital) converts them to comparable present-day values. The intrinsic value = present value of all future free cash flows + present value of terminal value. A stock trading below this intrinsic value offers a positive expected return; above it, a negative expected return.

## When to use
Phase 5, Gate 4 (one of three required valuation methods). Must be run alongside the Owner Earnings Model and IRR Calculator — never as the sole valuation method.

## Visual
`table`

## Step-by-step tutorial
1. 1. Gather base year data: latest 12 months operating cash flow (from cash flow statement) and capital expenditure. Calculate free cash flow: FCF = Operating Cash Flow − Capex.
2. 2. Choose a near-term growth rate (years 1–5). Use the company's 10-year historical FCF CAGR as a starting point, then apply a 'haircut' of 20–30% to be conservative. Never use analyst consensus estimates directly — they are systematically optimistic.
3. 3. Choose a long-term growth rate (years 6–10). This should be below the near-term rate, converging toward nominal GDP growth (3–5%). A Wide MOAT business decelerates more slowly than a Narrow MOAT business.
4. 4. Choose a terminal growth rate (beyond year 10). Use 3–4% for US-listed companies (nominal GDP). Never use a terminal growth rate above the long-term economic growth rate.
5. 5. Build the 10-year FCF projection table: FCF(t) = FCF(t−1) × (1 + growth rate). Separate the two growth phases.
6. 6. Set the discount rate. Buffett simplifies: use 10% (the long-run US equity market return) as the opportunity cost. If you want more precision: WACC = cost of equity (CAPM: risk-free rate + beta × equity risk premium) + cost of debt × (1 − tax rate), weighted by capital structure.
7. 7. Calculate present value of each year's FCF: PV(FCF_t) = FCF_t / (1.10)^t. Sum all 10 years.
8. 8. Calculate terminal value using the Gordon Growth Model: TV = FCF(year 10) × (1 + g_terminal) / (discount rate − g_terminal). Discount TV to present: PV(TV) = TV / (1.10)^10.
9. 9. Add PV of FCFs + PV of TV = Enterprise Value. Add cash, subtract debt (from most recent balance sheet) = Equity Value. Divide by diluted shares outstanding = Intrinsic Value per share.
10. 10. Run three scenarios: Base (your central estimate), Bull (25% higher growth rates), and Bear (25% lower growth rates). Record the IV range. Compare to current market price.

## Real-life example — Microsoft Corporation (MSFT), DCF snapshot (2020 base year)
Using fiscal year 2020 data: Microsoft FCF = $45B. Near-term growth rate (2021–2025) = 12% (conservative vs historical 18% CAGR, reflecting cloud saturation uncertainty). Long-term growth rate (2026–2030) = 8%. Terminal growth rate = 3.5%. Discount rate = 10%. Year 1–5 FCFs: $50B, $56B, $63B, $71B, $79B. Year 6–10 FCFs: $85B, $92B, $99B, $107B, $116B. PV of 10-year FCFs = ~$430B. Terminal value = $116B × 1.035 / (0.10 − 0.035) = $1,847B; PV of TV = $1,847B / 1.10^10 = $712B. Enterprise Value = $430B + $712B = $1,142B. Add net cash ~$60B = Equity Value $1,202B. Diluted shares 7.6B → Intrinsic Value per share ≈ $158. MSFT traded at ~$210 in mid-2020 — above the base-case IV but within range of the bull scenario. Margin of safety at $210 vs $158 = negative 33%: stock was at a premium to conservative IV, warranting watchlist-only status unless the investor had higher conviction in growth rates.

**So what:** DCF forces disciplined thinking about growth expectations. A stock trading above the conservative DCF IV is not necessarily overvalued — it may be correctly pricing higher growth. The investor's job is to assess whether the implied growth rate embedded in the market price is achievable.

## Template
Build in Excel. Use three scenarios (base, bull, bear). Always calculate per-share IV. Compare to current price to determine margin of safety.

- [ ] Company name and base year
- [ ] Base year free cash flow ($M): Operating Cash Flow − Capex
- [ ] Near-term growth rate assumption (Years 1–5) (%)
- [ ] Long-term growth rate assumption (Years 6–10) (%)
- [ ] Terminal growth rate (%)
- [ ] Discount rate / required return (%)
- [ ] Year 1–10 FCF projections ($M) — one row per year
- [ ] PV of each year's FCF ($M) — one row per year
- [ ] Sum of PV(FCFs) ($M)
- [ ] Terminal Value ($M)
- [ ] PV of Terminal Value ($M)
- [ ] Enterprise Value ($M)
- [ ] Net cash (cash − debt, from balance sheet) ($M)
- [ ] Equity Value ($M)
- [ ] Diluted shares outstanding (M)
- [ ] Intrinsic Value per share ($)
- [ ] Current stock price ($)
- [ ] Margin of safety (%) — repeat for base/bull/bear scenarios

## Pitfalls
- Over-precision in growth rate assumptions — the difference between 12% and 13% growth for 10 years produces enormous IV differences; acknowledge uncertainty by running three scenarios and using ranges, not points.
- Terminal value dominates the total value (often 60–80% of total IV in a DCF) — this means your terminal growth rate assumption is the most consequential input; be conservative and never use a terminal growth above long-run GDP.
- Forgetting to adjust for cash and debt — the DCF produces enterprise value; converting to equity value per share requires subtracting net debt (or adding net cash).
- Using analyst consensus FCF forecasts as inputs — analysts systematically overestimate growth; always build your own conservative estimate anchored to historical performance.
