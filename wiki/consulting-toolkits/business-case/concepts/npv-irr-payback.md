---
type: concept
slug: npv-irr-payback
title: Financial Model — NPV, IRR, and Payback Period
source_collection: consulting-toolkits
toolkit: business-case
domain: finance
category: finance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Financial Model — NPV, IRR, and Payback Period

*Category: finance · Toolkit: Business Case*

## What it is
The three core metrics that define the financial merit of any project investment: Net Present Value (absolute value created in today's dollars), Internal Rate of Return (yield compared to cost of capital), and Payback Period (time to recover the initial investment).

**Origin:** NPV and IRR derive from Irving Fisher's theory of capital investment (1930) and were formalised for corporate finance by Joel Dean and James Hirshleifer in the 1950s. Payback period is a practical cash-management heuristic in use since early industrial capital budgeting. All three are standard in McKinsey valuation practice (Copeland, Koller, Murrin — 'Valuation', 1990/2000).

## Why it works
No single metric tells the complete investment story. NPV shows how much value is created in today's dollars — the absolute case for the investment. IRR shows the yield and enables comparison to the cost of capital (WACC) and to alternative investments. Payback period shows how quickly the organisation recoups its cash — the liquidity and risk proxy. A board needs all three to make a complete, defensible investment decision. An investment with positive NPV but IRR below WACC destroys value; one with high IRR but a 10-year payback may be unacceptable given cash constraints.

## When to use
In Phase 3 (Step 3.2) for any project investment decision presented to a board, executive committee, or investment committee.

## Visual
`table`

## Step-by-step tutorial
1. Lay out a 5–10 year cash flow timeline: Year 0 = initial investment as an outflow; Years 1–N = annual net cash flows (revenues generated + cost savings − ongoing costs).
2. Agree the discount rate with Finance before building the model: typically the company's WACC, or a hurdle rate set by the board (WACC + a risk premium for higher-risk projects).
3. Calculate NPV: discount each year's net cash flow at the agreed rate using the formula CF_t / (1+r)^t; sum all discounted cash flows; subtract the initial investment. Positive NPV = value-creating.
4. Calculate IRR: the discount rate that makes NPV = 0. Use Excel's =IRR() function. Compare IRR to WACC: if IRR > WACC, the investment creates value.
5. Calculate payback period: find the first year when cumulative net cash flows (undiscounted) turn positive. This is the year the initial investment is recovered.
6. Model three scenarios: base (most likely assumptions), upside (best case on 3–5 key drivers), downside (worst case — typically a 6–12 month revenue delay + 15% cost overrun + 30% less value on the top driver). Present all three.
7. Present the financial summary as a one-page dashboard: the three scenarios side by side, with NPV, IRR, payback, and year-by-year free cash flow.

## Real-life example — Amazon (AWS investment case, 2006)
Amazon's internal business case for AWS required justifying $100M+ in infrastructure against highly uncertain cloud demand. The team modelled NPV under multiple demand scenarios, demonstrated an IRR well above their hurdle rate once scale was reached (despite near-zero returns in Years 1–2), and explicitly accepted a long payback period (~5 years) justified by the strategic option value of owning the infrastructure market. The board approved because the downside scenario still showed positive NPV. AWS generated $90B+ in revenue by 2023 — validating the long-horizon financial logic and proving that a disciplined financial model with explicit scenarios can justify even uncertain, long-horizon bets.

**So what:** A rigorous financial model with explicit scenarios convinced Amazon's board to fund a long-horizon bet that became the most profitable division in the company — because the downside was modelled honestly and still positive.

## Template
Complete the cash flow model with estimates for each year. Document the source of every major estimate. Run three scenarios by varying the top 3–5 most sensitive assumptions. Present the summary dashboard on one page.

- [ ] Year 0 — Initial Investment: $[X]M (breakdown: capex $[X]M + setup $[X]M + one-time costs $[X]M)
- [ ] Year 1 — Net Cash Flow: Revenue uplift $[X]M + Cost savings $[X]M − Ongoing costs ($[X]M) = $[X]M
- [ ] Year 2 — Net Cash Flow: $[X]M
- [ ] Year 3 — Net Cash Flow: $[X]M
- [ ] Year 4 — Net Cash Flow: $[X]M
- [ ] Year 5 — Net Cash Flow: $[X]M
- [ ] Discount Rate (WACC or hurdle): [X]%
- [ ] NPV (base case): $[X]M
- [ ] IRR (base case): [X]%
- [ ] Payback Period (base case): [X] years
- [ ] NPV (downside): $[X]M | Key downside assumptions: [List the 3 changes from base]
- [ ] NPV (upside): $[X]M | Key upside assumptions: [List the 3 changes from base]

## Pitfalls
- Optimistic-only projections — a board that sees only a base case (always optimistic) will discount the entire model. Model and present base, upside, and downside explicitly.
- Ignoring the discount rate — undiscounted payback or ROI overstates value significantly for long-horizon projects. Always apply WACC or the board's hurdle rate.
- Not showing year-by-year cash flows — a single NPV number hides the cash flow profile (when does it turn positive? is there a cash trough in Year 2?). Show the year-by-year in the dashboard.
