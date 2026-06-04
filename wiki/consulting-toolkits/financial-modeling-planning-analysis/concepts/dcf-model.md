---
type: concept
slug: dcf-model
title: Discounted Cash Flow (DCF) Model
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Discounted Cash Flow (DCF) Model

*Category: financial · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A valuation model that derives the intrinsic value of a business or investment by projecting its future free cash flows and discounting them to present value at the WACC. The DCF is the theoretically superior valuation method because it is based on the actual cash economics of the business, not market sentiment.

**Origin:** Theoretical foundations in Irving Fisher's 'The Theory of Interest' (1907). Applied to corporate valuation by McKinsey & Company (Copeland, Koller, Murrin — 'Valuation', 1990), which became the definitive practitioner reference. Now standard across investment banking, private equity, and corporate development.

## Why it works
A dollar today is worth more than a dollar tomorrow (time value of money). The DCF captures this by: (1) projecting how much cash the business will generate over a forecast horizon; (2) estimating what the business is worth beyond the horizon (terminal value); and (3) discounting all cash flows at the WACC, which represents the blended cost of the company's capital — the minimum return investors require. Value = PV(explicit FCFs) + PV(terminal value).

## When to use
Anytime you need an intrinsic value for a business, project, or investment: M&A target valuation, IPO preparation, internal capital allocation, buy vs. build analysis, or strategic option valuation. Use alongside CCA and PTA — the DCF provides the anchor, market comparables provide the reality check.

## Visual
`staircase`

## Step-by-step tutorial
1. Project revenues for 5–10 years using the three-statement model's Base case, grounded in market growth, competitive position, and management's strategic plan.
2. Calculate NOPAT (Net Operating Profit After Tax) = EBIT × (1 − tax rate) for each projected year.
3. Build the FCF from NOPAT: FCF = NOPAT + D&A − CapEx − Increase in Net Working Capital. This strips out non-cash charges and adds back real cash investments. Confirm FCF is consistently above zero in a mature business; negative FCF in Years 1–2 of a high-growth company is acceptable if the business case is sound.
4. Calculate WACC (see wacc-model framework). Record the WACC in the Inputs tab. If you are uncertain about WACC, run a WACC range of ±1.5%.
5. Calculate Terminal Value using two methods: (a) Gordon Growth Model: TV = FCF5 × (1+g) / (WACC − g), where g = long-run GDP growth rate (typically 2.0–2.5% for a developed-market company); (b) Exit Multiple Method: TV = EBITDA5 × peer EV/EBITDA multiple. Both methods should converge within 20%. If they diverge by more, revisit the long-run growth rate or the peer multiple.
6. Discount all FCFs and the terminal value to present value at WACC: PV = FCFn / (1+WACC)^n. Sum the PVs to get enterprise value.
7. Bridge from EV to equity value: Equity Value = EV − Net Debt (total debt minus cash and cash equivalents).
8. Build a two-variable sensitivity table: rows = WACC range (WACC −1.5% to +1.5%), columns = terminal growth rate range (1.0% to 3.5%). This produces a range of equity values that frames the valuation uncertainty honestly.

## Real-life example — Berkshire Hathaway's acquisition of BNSF Railway (2009)
When Warren Buffett agreed to buy the remaining 77.4% of BNSF Railway for $34B in November 2009, the acquisition was widely modeled using a DCF. BNSF generated ~$3.5B in operating cash flow annually. At an assumed 8% WACC and 2% terminal growth rate, a 10-year DCF with terminal value implied an enterprise value of $34–38B — consistent with the $44B deal EV (including assumed debt). Buffett's thesis was that the long-run FCF growth rate was understated: BNSF's competitive moat (the only western US rail network) would enable pricing power above inflation indefinitely. This DCF assumption — a 2.5% vs. 2.0% long-run growth rate — shifted the intrinsic value by $4–6B. The 15-year holding period has justified the premium.

**So what:** The DCF is only as good as its assumptions. The most consequential assumption is usually the terminal growth rate, not the near-term revenue forecast. Small changes in g (0.5%) can move the EV by 10–15% — which is why the sensitivity table is not optional.

## Template
Fill in the yellow cells. The model calculates EV and equity value automatically. Review the sensitivity table before presenting results.

- [ ] Revenue Y1–Y5 ($M): ___
- [ ] EBITDA Margin Y1–Y5 (%): ___
- [ ] D&A as % of Revenue: ___
- [ ] Tax Rate (%): ___
- [ ] CapEx as % of Revenue: ___
- [ ] NWC Change as % of Revenue Change (%): ___
- [ ] WACC (%): ___
- [ ] Terminal Growth Rate (%): ___
- [ ] Exit Multiple Method: EV/EBITDA_5 × ___ = TV $___M
- [ ] Gordon Growth Method: FCF5 × (1+g) / (WACC−g) = TV $___M
- [ ] Consistency check: |Gordon TV − Exit TV| / Exit TV < 20%? ___
- [ ] Enterprise Value ($M): ___ (auto)
- [ ] Less: Net Debt ($M): ___
- [ ] Equity Value ($M): ___ (auto)
- [ ] Diluted Shares (M): ___
- [ ] Implied Share Price ($): ___ (auto)

## Pitfalls
- Using a terminal growth rate higher than GDP growth (>3% for a mature company) — this mathematically implies the company grows faster than the economy forever, which is impossible. If you believe in a high long-run growth rate, extend the explicit forecast horizon instead.
- Double-counting: including synergies in the DCF for a standalone business, or using post-synergy multiples in CCA — each method should be applied on a consistent basis (standalone vs. synergized).
- Weighting too heavily toward the terminal value without scrutiny — in a 5-year DCF with 2% terminal growth, the terminal value often represents 60–70% of EV; small changes in WACC or g move the answer more than the entire 5-year explicit forecast. Always present the sensitivity table.
- Discounting cash flows in nominal terms at a real WACC (or vice versa) — ensure consistency: if WACC is nominal (includes inflation), FCFs must be in nominal dollars.
