---
type: concept
slug: irr-calculator
title: IRR Calculator (Investment Return Adequacy Test)
source_collection: consulting-toolkits
toolkit: personal-finance-buffett-investing
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# IRR Calculator (Investment Return Adequacy Test)

*Category: financial · Toolkit: Personal Finance & Warren Buffett Investing*

## What it is
A tool that calculates the Internal Rate of Return (IRR) implicit in purchasing a stock at the current market price, given projected future cash flows — testing whether the investment offers an adequate return (Buffett's minimum threshold: 10%) before proceeding to execution.

**Origin:** IRR as a financial concept is grounded in classical capital budgeting theory (formalized in corporate finance textbooks by Brealey, Myers, and Allen in 'Principles of Corporate Finance'). Buffett's specific application of IRR as an investment acceptance threshold (≥ 10%) is described in 'The Warren Buffett Way' (Hagstrom) and aligns with his stated view that any investment must return at least as much as the long-run historical US equity market return. Charlie Munger uses IRR thinking explicitly when evaluating Berkshire capital allocation decisions.

## Why it works
The IRR of an investment is the discount rate that makes the net present value of all future cash flows equal to zero — in other words, the compounded annual return the investment will produce if held to the projected horizon. By setting a minimum hurdle rate of 10% (the approximate long-run S&P 500 annual return), Buffett ensures that every individual stock investment must offer a risk-adjusted return at least as good as doing nothing and holding an index fund. This is the opportunity cost principle applied rigorously: the alternative to buying stock X is always available and always priced at the market return.

## When to use
Phase 5, Gate 4 (third and final required valuation method). A particularly useful cross-check because it answers the question 'What return does the MARKET implicitly believe this investment will generate?' by back-solving from the current price.

## Visual
`chart`

## Step-by-step tutorial
1. 1. Set up the IRR calculation in Excel using the IRR() or XIRR() function.
2. 2. Define the cash flow stream: Year 0 = −Current Market Price per share (the investment outlay); Years 1–9 = projected dividends per share (if the company pays dividends); Year 10 = projected sale price (use your estimated intrinsic value 10 years from now as the Year 10 terminal cash flow, grown at the sustainable growth rate).
3. 3. For a non-dividend-paying company: Year 0 = −Current Price; Years 1–9 = 0; Year 10 = IV_in_10_years. IV_in_10_years = Current IV estimate × (1 + sustainable growth rate)^10.
4. 4. For a dividend-paying company: Year 0 = −Current Price; Years 1–10 = projected dividends per share; Year 10 also includes the terminal sale price IV_in_10_years.
5. 5. Apply Excel's IRR() function to the cash flow array. The result is the IRR implicit in buying at the current price.
6. 6. Compare to the 10% hurdle rate: If IRR > 10%: the investment offers adequate return — pass this component of Gate 4. If IRR < 10%: the current price does not offer adequate return — the investment fails Gate 4 and goes to watchlist.
7. 7. Run the IRR calculation at three price points: current price, 20% below current price, and 30% below current price. This produces the price range at which the investment becomes attractive.
8. 8. Combine the IRR threshold with the margin of safety requirement: both must pass. An investment at a 25% margin of safety discount AND IRR > 10% passes Gate 4.

## Real-life example — American Express (AXP), Buffett purchase (1994)
In 1994, following the Salad Oil Scandal aftermath and AmEx's subsequent restructuring, the stock traded at ~$8.50 per share. A Buffett-style IRR analysis would have projected: Year 0 cost = −$8.50; projected EPS growth from $0.75 to ~$2.00 by 2004 (a reasonable estimate given AmEx's brand franchise and expanding card member base); IV in year 10 at ~$30–$35 based on 15× owner earnings. IRR implicit in an $8.50 purchase: approximately 18–22%. Well above the 10% hurdle. Buffett bought approximately 10% of American Express at an average price of ~$8. By 2004 the stock had reached $55, and Berkshire held over $8B in AmEx stock. The 18–22% IRR estimate was realised.

**So what:** The IRR calculator converts the abstract question 'Is this a good investment?' into the concrete question 'At this price, what compounded return am I buying?' A stock that offers 18% IRR at $8.50 but only 8% IRR at $15 is the same business — the return difference is entirely in the price paid.

## Template
Complete in Excel using the IRR() function. Run for three scenarios: current price, 20% below current price, 30% below current price.

- [ ] Company name and analysis date
- [ ] Current market price per share ($)
- [ ] Current annual dividend per share ($ or 0 if non-paying)
- [ ] Projected annual dividend growth rate (%)
- [ ] Projected dividends years 1–10 ($) — one per year
- [ ] Current estimated intrinsic value (IV_today) ($)
- [ ] Sustainable long-term growth rate for IV projection (%)
- [ ] Projected intrinsic value in 10 years (IV_10 = IV_today × (1+g)^10) ($)
- [ ] Cash flow array: Year 0 = −current price; Years 1–9 = dividends (or 0); Year 10 = dividend + IV_10
- [ ] IRR at current price (%) — Excel IRR() of cash flow array
- [ ] IRR at current price − 20% (%) — repeat with Year 0 = −(current × 0.80)
- [ ] IRR at current price − 30% (%) — repeat with Year 0 = −(current × 0.70)
- [ ] Hurdle rate (%): 10%
- [ ] Does current price IRR exceed hurdle? (Y/N)
- [ ] Gate 4 IRR verdict: PASS / FAIL / WATCHLIST-AT-PRICE

## Pitfalls
- Using overly optimistic terminal cash flows — the Year 10 IV drives the IRR result substantially; anchoring it to your current IV estimate grown at a moderate rate (not an aggressive rate) is essential.
- Treating the IRR calculator as the sole valuation method — the IRR is a return-adequacy test, not an intrinsic value calculator; it must be used alongside DCF and Owner Earnings.
- Forgetting that IRR is highly sensitive to purchase price — a 15% reduction in purchase price can easily increase IRR by 2–3 percentage points; this is the mathematical expression of why margin of safety matters.
- Using terminal cash flows from analyst price targets rather than your own IV estimate — analyst targets are consensus estimates that may already be priced in; use your own independent IV estimate.
