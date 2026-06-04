---
type: concept
slug: npv-irr-payback-model
title: NPV / IRR / Payback Period Financial Model
source_collection: consulting-toolkits
toolkit: sales-marketing-pricing-communication
domain: commercial
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# NPV / IRR / Payback Period Financial Model

*Category: financial · Toolkit: Sales, Marketing, Pricing & Communication*

## What it is
The three primary metrics used to evaluate the financial attractiveness of an investment: Net Present Value (NPV — value created in today's dollars), Internal Rate of Return (IRR — the annualised return rate), and Payback Period (time to recover the initial investment).

**Origin:** NPV rooted in Irving Fisher's time-value-of-money theory (1907); IRR formalised in finance textbooks through the 1950s–70s; all three are standard in corporate finance and consulting project evaluation

## Why it works
Each metric answers a different question. NPV answers 'how much value is created?' (use for absolute decisions). IRR answers 'what is the return rate?' (use for comparison). Payback answers 'when do we get our money back?' (use for liquidity and risk). Using all three together prevents single-metric distortions.

## When to use
Evaluating any capital investment, initiative, or programme where a financial case is required before approval.

## Visual
`chart`

## Step-by-step tutorial
1. Build the revenue model: project incremental revenue (or cost savings) from the initiative for each year of the analysis horizon (typically 3–5 years), using conservative, base, and optimistic cases.
2. Build the cost model: upfront capital expenditure (Year 0) plus ongoing operating costs (Years 1–N).
3. Compute incremental free cash flow: revenue uplift (or cost savings) minus operating costs minus capex, with tax adjustments.
4. Calculate NPV: discount all future cash flows at the company's WACC (Weighted Average Cost of Capital). NPV > 0 means value is created at the required return rate.
5. Calculate IRR: find the discount rate at which NPV = 0 using Excel's IRR function. Compare to the company's hurdle rate (typically WACC + risk premium).
6. Calculate Payback: sum cumulative undiscounted cash flows to find the year when total exceeds initial investment.
7. Run sensitivity analysis: vary the top 2–3 key assumptions (e.g., revenue growth rate, price, volume) by ±20% to show the range of NPV and payback outcomes.

## Real-life example — Amazon AWS (initial investment decision, ~2003–2006)
Amazon's internal analysis for building AWS infrastructure (declassified through interviews with Jeff Bezos and Andy Jassy) applied standard NPV logic: the initial capex was ~$2bn in server infrastructure. The NPV model required assumptions about cloud adoption rates, pricing, and competitive dynamics that were highly uncertain. Amazon ran scenarios: even in a conservative scenario (cloud adoption at 30% of internal projections), NPV was positive at a 10-year horizon at a 12% discount rate — driven by the near-zero marginal cost of adding capacity. The IRR in the base case exceeded 40%, well above Amazon's hurdle rate. This NPV-positive decision under uncertainty, combined with a willingness to accept a 5-year payback, was the financial foundation for a $100bn+ annual revenue business.

**So what:** NPV analysis enabled Amazon to invest in AWS despite near-term cash outflows — the model showed that even conservative scenarios justified the investment.

## Template
Build the three-statement model for your initiative. Calculate NPV, IRR, and payback. Run at least two scenarios.

- [ ] Initiative name: [FILL]
- [ ] Analysis horizon (years): [FILL]
- [ ] WACC / Hurdle rate (%): [FILL]
- [ ] Year 0 capital expenditure ($): [FILL]
- [ ] Year 1–N incremental revenue or cost savings ($): [FILL per year]
- [ ] Year 1–N incremental operating costs ($): [FILL per year]
- [ ] Tax rate (%): [FILL]
- [ ] Incremental free cash flow per year: [FILL]
- [ ] NPV (base case, $): [FILL]
- [ ] IRR (%): [FILL]
- [ ] Payback period (years): [FILL]
- [ ] Conservative scenario NPV: [FILL]
- [ ] Optimistic scenario NPV: [FILL]
- [ ] Key assumptions and sensitivities: [FILL]
- [ ] Recommendation (invest / conditional / do not invest): [FILL]

## Pitfalls
- Using a single-scenario model without sensitivity analysis: decision-makers need to understand the range of outcomes, not just the base case.
- Forgetting working capital changes and terminal value in longer-horizon models.
- Using a too-low discount rate (e.g., risk-free rate) for risky initiatives: strategic investments should use WACC + a risk premium appropriate to the project's uncertainty.
