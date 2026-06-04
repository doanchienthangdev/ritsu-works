---
type: concept
slug: dcf-valuation
title: Discounted Cash Flow (DCF) Valuation
source_collection: consulting-toolkits
toolkit: mergers-acquisitions
domain: corp-dev
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Discounted Cash Flow (DCF) Valuation

*Category: financial · Toolkit: Mergers & Acquisitions*

## What it is
An intrinsic valuation method that estimates the present value of a business by projecting its future free cash flows and discounting them at the weighted average cost of capital (WACC), adding a terminal value to capture value beyond the explicit forecast period.

**Origin:** DCF principles trace to John Burr Williams' 'The Theory of Investment Value' (1938); formalized in corporate finance practice by Modigliani and Miller (1958) and widely adopted in investment banking from the 1970s onward.

## Why it works
A dollar of cash flow tomorrow is worth less than a dollar today because of the time value of money and the risk of not receiving it. DCF operationalizes this by converting all future cash flows to a common present-day basis. In M&A, DCF is the only valuation method that forces an explicit discussion of the strategic assumptions underlying value — synergy projections, growth rate, and margin improvement are all embedded in the cash flow forecast.

## When to use
Phase 2 (preliminary valuation), Phase 3 (business case financial model), Phase 4 (updated valuation post-DD). DCF is the primary intrinsic valuation method; always triangulate with comps and precedents.

## Visual
`process-flow`

## Step-by-step tutorial
1. 1. Build the REVENUE FORECAST for years 1–5: use management projections as the base, then apply an independent top-down sanity check (market growth rate × market share assumption). Document key assumptions.
2. 2. Project EBITDA MARGINS: model the path from current margins to a normalized level, incorporating synergies (for merger models) or operational improvements.
3. 3. Convert EBITDA to FREE CASH FLOW TO FIRM (FCFF): EBIT × (1 – tax rate) + D&A – Capex – Change in Working Capital. Build this for each of the 5 forecast years.
4. 4. Calculate WACC: Cost of Equity (using CAPM: Rf + Beta × Market Risk Premium) + Cost of Debt × (1 – Tax Rate), weighted by target capital structure. Use industry beta, not company-specific beta for cyclically distorted situations.
5. 5. Calculate TERMINAL VALUE: either (a) Gordon Growth Model: FCFF Year 5 × (1 + g) / (WACC – g), where g = long-run GDP growth (2–3%), or (b) Exit Multiple: EBITDA Year 5 × peer EV/EBITDA multiple. Use both and check consistency.
6. 6. DISCOUNT all FCFFs and Terminal Value to present at WACC. Sum to get Enterprise Value. Subtract net debt, add cash to derive Equity Value.
7. 7. BUILD A SENSITIVITY TABLE: create a 5×5 matrix sensitizing Enterprise Value across WACC (±1%) and Terminal Growth Rate or Exit Multiple (±0.5x EBITDA). This defines the valuation range.
8. 8. TRIANGULATE with comps and precedents to validate. If DCF is materially higher than market comps, articulate the specific synergies or growth assumptions that justify the premium.

## Real-life example — Disney's acquisition of Pixar (2006)
Disney's DCF for Pixar incorporated a 5-year cash flow forecast based on projected box-office revenue from the Toy Story, Finding Nemo, and The Incredibles franchises, plus new film slate assumptions. The terminal value reflected Pixar's brand moat and the annuity-like nature of animation IP licensing. Disney's model also incorporated synergies: Pixar technology improving Disney Animation's output, and Disney's theme park and consumer products infrastructure amplifying Pixar IP. The deal closed at $7.4B — the DCF with synergies justified the premium over comps-only valuation.

**So what:** In M&A, DCF is the only method that makes synergies explicit in the valuation math. Build the DCF twice: standalone (what the business is worth to any buyer) and with synergies (what it is worth specifically to you). The difference is the maximum synergy premium you should pay.

## Template
Build this model in Excel with a separate tab for assumptions, income statement, cash flow bridge, WACC calculation, DCF, and sensitivity table.

- [ ] Revenue Year 1-5 (with growth rate assumption)
- [ ] EBITDA margin Year 1-5
- [ ] D&A Year 1-5
- [ ] Capex Year 1-5 (as % of revenue)
- [ ] Working capital change Year 1-5
- [ ] FCFF Year 1-5
- [ ] WACC (with Cost of Equity and Cost of Debt breakdown)
- [ ] Terminal Growth Rate
- [ ] Terminal Value
- [ ] Enterprise Value (PV of FCFFs + PV of Terminal Value)
- [ ] Net Debt
- [ ] Equity Value
- [ ] Implied EV/EBITDA and P/E multiples (for sanity check against comps)

## Pitfalls
- Terminal value represents 60–80% of total DCF value in most models, making the model extremely sensitive to terminal growth rate and WACC assumptions. A 0.5% change in WACC can move enterprise value by 15–20%. Mitigate: always present a sensitivity table, never a point estimate.
- Building synergies into the standalone DCF without separately quantifying them — this hides the true premium being paid for synergies. Mitigate: always build a 'standalone' DCF and a 'with synergies' DCF as separate scenarios.
- Using a single WACC for a diversified conglomerate target. Mitigate: use segment-specific WACCs based on each division's industry beta.
