---
type: concept
slug: owner-earnings-model
title: Owner Earnings Model
source_collection: consulting-toolkits
toolkit: personal-finance-buffett-investing
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Owner Earnings Model

*Category: financial · Toolkit: Personal Finance & Warren Buffett Investing*

## What it is
Warren Buffett's preferred refinement of free cash flow that measures the true earning power of a business from the owner's perspective — calculated as net income plus depreciation/amortisation minus capital expenditures and working capital changes — providing a more accurate picture of what a business actually generates for its owners than GAAP earnings alone.

**Origin:** Defined by Warren Buffett in the Berkshire Hathaway Annual Letter to Shareholders, 1986: 'These represent (a) reported earnings plus (b) depreciation, depletion, amortization, and certain other non-cash charges… less (c) the average annual amount of capitalized expenditures for plant and equipment, etc. that the business requires to fully maintain its long-term competitive position and its unit volume. (Our owner earnings formula of this form differs somewhat from standard cash-flow numbers, but we think it is a more realistic measure of economic performance.)' Buffett credits the concept to his deep reading of Ben Graham and his own operating experience running Berkshire's subsidiaries.

## Why it works
GAAP net income includes non-cash charges (depreciation, amortisation) that reduce reported earnings but do not reduce cash — making GAAP earnings conservative for capital-light businesses. Standard free cash flow = operating cash flow − capex, which is correct but does not separate maintenance capex (required to keep the business running) from growth capex (invested to expand). Owner earnings focuses on the former — what must the owner spend simply to maintain the current earning power of the business? The difference between maintenance capex and total capex is growth capex, which is discretionary and produces future returns. Owner earnings = net income + D&A − maintenance capex ± working capital changes.

## When to use
Phase 5, Gate 4. Run alongside DCF Valuation and IRR Calculator. Owner Earnings is the primary model for capital-light, franchise businesses; DCF is the primary model for capital-intensive businesses. Both should produce similar IVs — divergence signals a capex assumption difference to resolve.

## Visual
`process-flow`

## Step-by-step tutorial
1. 1. Gather: net income, depreciation & amortisation, total capital expenditure, and working capital changes from the most recent 10-K cash flow statement and balance sheet.
2. 2. Add D&A to net income: Owner Earnings Step 1 = Net Income + D&A. This is essentially owner cash earnings before capex.
3. 3. Estimate maintenance capex: Buffett does not provide a universal formula, because maintenance capex requires industry judgment. Practical approaches: (a) For asset-light businesses (software, financial services), use total capex directly as an approximation (maintenance ≈ total capex, because little growth capex exists); (b) For capital-intensive industries, review management commentary about 'maintenance vs growth capital'; (c) As a cross-check, compare capex to annual D&A — if capex ≈ D&A, the business is replacing assets but not growing them (maintenance-like). If capex >> D&A, the company is investing for growth.
4. 4. Subtract maintenance capex from Step 1 result. Subtract or add working capital changes (increases in working capital use cash; decreases release cash).
5. 5. Divide Owner Earnings by diluted shares outstanding to get Owner Earnings per share (OEPS).
6. 6. Value the business using the Owner Earnings Model: IV per share = OEPS × (1 + g) / (r − g), where g = long-term sustainable growth rate (typically 4–8%), and r = required return (typically 10%). This is a perpetuity model for a stable business.
7. 7. For a growing business, use a multi-stage model: grow Owner Earnings at rate g1 for years 1–10, then use the perpetuity value. This mirrors the DCF structure but uses Owner Earnings as the cash flow measure.
8. 8. Compare the Owner Earnings-based IV to the DCF-based IV. Significant divergence warrants investigation — usually attributable to different capex assumptions.

## Real-life example — See's Candies (Berkshire Hathaway subsidiary) — Buffett's own example
In his 1986 and 1992 annual letters, Buffett used See's Candies as the canonical illustration of owner earnings. See's required minimal capex beyond what was needed to maintain its existing operations (its 'maintenance capex' was low) because the business operated through leased stores and required little physical infrastructure. The high brand loyalty meant that annual price increases could be implemented without losing volume — allowing owner earnings to grow consistently without requiring significant reinvestment. Buffett contrasts this with a capital-intensive business (like an airline or steel plant) where D&A is real depreciation of productive capacity that must be replaced — making D&A a real cost to the owner, not a fictitious one. For See's, the D&A add-back in the owner earnings formula appropriately increased measured cash generation. When Buffett bought See's for $25M in 1972, the annual owner earnings were approximately $4–5M — an immediate owner earnings yield of 16–20%. Berkshire has since generated over $2B in cumulative owner earnings from See's.

**So what:** Owner earnings is most powerful for businesses with high D&A and low maintenance capex (capital-light brands, software, financial franchises) — precisely the businesses Buffett prefers. For these businesses, GAAP earnings systematically understate true earning power, and owner earnings corrects for this.

## Template
Complete annually using 10-K data. Average across 3–5 years for a normalised estimate. Note your maintenance capex assumption and basis.

- [ ] Company name and fiscal year
- [ ] Net Income ($M) — from income statement
- [ ] Depreciation & Amortisation ($M) — from cash flow statement
- [ ] Total Capital Expenditure ($M) — from cash flow statement
- [ ] Maintenance Capex estimate ($M) — and basis for estimate
- [ ] Growth Capex = Total Capex − Maintenance Capex ($M)
- [ ] Change in Working Capital ($M) — from cash flow statement; negative = cash consumed
- [ ] Owner Earnings = Net Income + D&A − Maintenance Capex ± WC Change ($M)
- [ ] Diluted Shares Outstanding (M)
- [ ] Owner Earnings Per Share (OEPS) ($)
- [ ] Long-term sustainable growth rate (g) (%)
- [ ] Required return / discount rate (r) (%)
- [ ] Intrinsic Value per share (perpetuity model) = OEPS × (1 + g) / (r − g) ($)
- [ ] Notes on maintenance capex estimation approach

## Pitfalls
- Using total capex as maintenance capex for a growth company — a company investing heavily in growth (like Amazon in 2010–2015) has total capex far exceeding maintenance capex; treating total capex as maintenance capex dramatically understates owner earnings and intrinsic value.
- Ignoring working capital changes — for retail, insurance, and banking businesses, working capital movements can be as large as capex; omitting them produces an inaccurate owner earnings figure.
- Using a single year's owner earnings without normalisation — pick a recession year's number and you understate earning power; pick a boom year and you overstate it; always use a 3–5 year average.
- Conflating owner earnings with FCF (operating cash flow − total capex) — they differ in the treatment of growth capex; the distinction matters most for businesses with large growth investment programmes.
