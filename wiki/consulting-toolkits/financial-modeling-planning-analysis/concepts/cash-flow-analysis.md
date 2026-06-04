---
type: concept
slug: cash-flow-analysis
title: Cash Flow Statement Analysis
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Cash Flow Statement Analysis

*Category: analysis · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A structured analysis of the statement of cash flows that separates operating cash generation from investing and financing activities, calculates free cash flow (FCF), and diagnoses the health of the company's cash engine — identifying sustainable cash generation vs. structural cash leakage.

**Origin:** SFAS 95 (1987) mandated cash flow statements in US GAAP. IAS 7 (1994) did the same under IFRS. Warren Buffett's emphasis on FCF as the primary value metric (his 'owner earnings' concept) popularized FCF analysis in corporate finance through the 1990s.

## Why it works
Profit is an opinion; cash is a fact. A company reports accounting profit but is actually running out of cash when: revenue is booked but not collected (rising DSO), earnings are reported but consumed by CapEx-heavy growth, or the company is surviving on financing cash flows (selling assets, drawing on credit lines). FCF = the cash the business generates that is available to distribute to debt and equity holders — the ultimate measure of financial health.

## When to use
Use in every financial analysis engagement (Phase 2, Step 3). Especially critical for companies under cash pressure, highly leveraged businesses, high-growth companies burning cash, and any credit or distressed analysis.

## Visual
`staircase`

## Step-by-step tutorial
1. Separate the cash flow statement into its three sections: Operating (OCF), Investing (ICF), and Financing (FCF). Understand the sign convention: positive OCF = cash inflow from operations; negative ICF = cash spent on investments; negative FCF = cash returned to investors or debt repaid.
2. Calculate Operating FCF: OCF = Net Income + D&A + other non-cash charges ± Change in Working Capital (indirect method). A growing company with high OCF is self-funding — an ideal profile.
3. Calculate Free Cash Flow: FCF = OCF − CapEx. This is the most important metric: the cash the business generates after maintaining and growing its asset base. Separate maintenance CapEx (required to sustain current production) from growth CapEx (investment in future growth) if the company discloses them.
4. Calculate the FCF conversion rate: FCF / EBITDA. Best-in-class companies convert 50–70% of EBITDA to FCF. If FCF conversion is consistently below 30%, investigate what is consuming the EBITDA (high CapEx? working capital build-up? high cash taxes vs. book taxes?).
5. Analyze the Cash Conversion Cycle (CCC = DSO + DIO − DPO): a longer CCC means the company requires more working capital to support the same revenue, consuming FCF as revenue grows. A company that can reduce DIO by 10 days on $1B of COGS releases $27.4M of cash.
6. Look for red flags: (a) consistently negative OCF despite positive net income = earnings quality problem (revenue is booked but not collected, or margins are fake); (b) consistently negative total FCF = the business is consuming more capital than it generates — only acceptable in high-growth investment phases with a credible path to FCF positive; (c) financing cash flows > ICF + OCF = the company is borrowing to fund operations.
7. Write a FCF health narrative: is the FCF trend improving or deteriorating? What are the 2 main FCF drivers? What actions would release the most cash in the next 12 months?

## Real-life example — Amazon (2019–2023 FCF trajectory)
Amazon's FCF analysis illustrates the investment-phase pattern. From 2018–2022, Amazon invested heavily in AWS infrastructure and fulfillment centers. FCF turned negative in 2021–2022 (−$9B and −$3B respectively) as CapEx peaked at $57B/year. FCF conversion was negative despite positive EBITDA of $55–65B — a sign that capital investment was consuming all operating cash generation. But the FCF bridge showed: negative FCF was driven by growth CapEx, not operational deterioration. By 2023, as AWS growth justified the data center build-out, AWS EBIT margin recovered to 30%+, and Amazon's FCF recovered to +$35B. The ability to decompose FCF into maintenance vs. growth CapEx is what distinguishes a value-destroying cash consumer from an investment-phase leader.

**So what:** Negative FCF is not inherently bad — it depends on what is consuming the cash. CapEx-heavy growth companies (Amazon, Netflix 2012–2018, Tesla 2018–2021) can be deeply FCF negative during investment phases while fundamentally healthy. The key diagnostic: is the invested capital generating adequate future returns?

## Template
Enter 3–5 years of cash flow data. The FCF bridge and key metrics calculate automatically.

- [ ] Net Income: ___
- [ ] + D&A: ___
- [ ] + Other Non-Cash: ___
- [ ] ± Change in Working Capital: ___ (A/R change: ___ | Inventory change: ___ | A/P change: ___)
- [ ] = Operating Cash Flow: ___
- [ ] − Total CapEx: ___ (Maintenance: ___ | Growth: ___)
- [ ] = Free Cash Flow: ___
- [ ] FCF Conversion Rate (FCF / EBITDA): ___% (target >50%)
- [ ] Cash Conversion Cycle: DSO ___ + DIO ___ − DPO ___ = ___ days
- [ ] 10-day reduction in DIO releases: ___(COGS/365 × 10) = $___M cash
- [ ] Financing activities: Debt raised: ___ | Debt repaid: ___ | Dividends: ___ | Buybacks: ___
- [ ] FCF Red Flags: Negative OCF despite positive NI? [Yes/No] | Consistent negative FCF? [Yes/No] | Financing > ICF+OCF? [Yes/No]
- [ ] FCF Health Narrative: ___

## Pitfalls
- Confusing EBITDA with cash — EBITDA excludes taxes, working capital changes, and CapEx; a company with 20% EBITDA margins but high CapEx intensity and working capital build can generate minimal or negative FCF.
- Ignoring the difference between maintenance and growth CapEx — companies that report 'total CapEx' without splitting maintenance vs. growth are hiding whether they are investing for the future or just sustaining the present.
- Using FCF before interest to assess equity value — levered FCF (after interest) is what is available to equity holders; unlevered FCF (before interest) is the enterprise-level metric used in DCF. Use the right FCF for the right purpose.
