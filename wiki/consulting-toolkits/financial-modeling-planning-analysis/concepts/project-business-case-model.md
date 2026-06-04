---
type: concept
slug: project-business-case-model
title: Project Business Case & Financial Model
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Project Business Case & Financial Model

*Category: financial · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A standalone NPV / IRR model for a specific investment initiative that quantifies the incremental financial impact (benefits vs. costs) on a risk-adjusted, discounted basis. The business case is the 'go/no-go' decision document for capital expenditure requests and strategic initiatives.

**Origin:** Derived from NPV / IRR capital budgeting theory (Fisher, 1907; Hirshleifer, 1958). Codified as a business process in PMI PMBOK and in McKinsey & BCG project evaluation methodologies.

## Why it works
Every investment involves trading a certain present outflow for uncertain future benefits. NPV calculates whether the present value of those future benefits exceeds the present cost, at the risk-adjusted discount rate. A positive NPV means the investment creates value (it earns more than the cost of capital). IRR is the discount rate that makes NPV = 0 — it is the investment's internal return, which can be compared against the hurdle rate without needing to know the exact WACC.

## When to use
Use for every capital investment or strategic initiative above the company's defined CapEx authorization threshold (typically $250K–$1M depending on company size). Mandatory for any initiative in the financial plan's initiative portfolio.

## Visual
`chart`

## Step-by-step tutorial
1. Define the initiative clearly: what specifically will be built or changed? What is the baseline (do-nothing) scenario? The business case measures the INCREMENTAL impact — the difference between the future with the initiative and the future without it.
2. Quantify the benefits: (a) revenue upside — additional revenue generated (units × price × market penetration assumption); (b) cost savings — reduction in specific cost line items (SG&A, COGS, headcount); (c) working capital improvement — reduction in cash tied up in receivables or inventory. Be specific: 'We will reduce DSO from 55 to 45 days on $500M of revenue, releasing $13.7M of cash.' General claims ('we will improve efficiency') are not benefits.
3. Quantify the costs: (a) capital expenditure (CapEx): upfront investment in assets or systems; (b) operating costs: ongoing costs to run the initiative (staffing, licenses, maintenance); (c) implementation one-time costs: change management, training, integration. Build a year-by-year cost schedule.
4. Build the free cash flow profile: FCF_year_n = Benefits_year_n − Operating Costs_year_n. Note: CapEx is Year 0 (or Year 1 if multi-year build). Working capital changes are in the year they occur.
5. Calculate NPV: NPV = −CapEx + Σ(FCF_n / (1+WACC)^n). If NPV > 0, the initiative creates value at the hurdle rate.
6. Calculate IRR: the discount rate at which NPV = 0. In Excel: =IRR(cash flow array). Compare IRR against the hurdle rate. IRR > hurdle rate = go.
7. Calculate payback period: cumulative sum of undiscounted cash flows until the running total turns positive. Report both undiscounted and discounted payback.
8. Build a sensitivity table on the top 3 assumptions: e.g., vary 'revenue uptake' from 50% to 150% of Base, and 'implementation cost' from 80% to 130% of estimate. Show NPV at each combination. If NPV turns negative before 70% of any plausible range, the business case is too fragile.
9. Document the top 3 risks with probability, financial impact, and mitigation plan. Apply a risk-adjusted NPV if risk is quantifiable.

## Real-life example — Procter & Gamble supply chain automation initiative
P&G regularly builds business cases for supply chain automation initiatives. A representative case: a $45M CapEx investment in automated warehouse systems at 3 distribution centers. Benefits: $12M/year in labor cost savings (headcount reduction from 450 to 180 FTEs), $6M/year in error reduction (fewer mis-picks, returns), $3M one-time working capital release from improved inventory accuracy. At P&G's 10% WACC, NPV = −$45M + PV($21M/year for 7 years) + PV($3M year 1) = −$45M + $102M + $2.7M = +$59.7M. IRR = 42%. Payback: 2.1 years. Sensitivity: even at 60% of projected labor savings, NPV = +$18M. P&G approved the project.

**So what:** The business case sensitivity analysis is the most important output — not the headline NPV. A robust business case shows positive NPV even when key assumptions miss by 30–40%. A business case that only breaks even under best-case assumptions is not investable.

## Template
Fill in the initiative description, benefit and cost assumptions, and WACC. The NPV, IRR, and payback calculate automatically.

- [ ] Initiative Name: ___
- [ ] Initiative Description (2 sentences): ___
- [ ] Baseline (do-nothing scenario): ___
- [ ] Year 0 CapEx ($M): ___
- [ ] Implementation One-Time Cost ($M): ___
- [ ] Benefit 1: Description ___ | Year 1 $___M | Year 2 $___M | Year 3+ $___M | Source assumption: ___
- [ ] Benefit 2: Description ___ | Year 1 $___M | Year 2 $___M | Year 3+ $___M | Source assumption: ___
- [ ] Annual Operating Cost: $___M/year
- [ ] Working Capital Release (Year 1): $___M
- [ ] WACC / Hurdle Rate: ___%
- [ ] FCF Year 0: −$___ | Year 1: $___ | Year 2: $___ | Year 3: $___ | Year 4: $___ | Year 5: $___
- [ ] NPV ($M): ___ (auto) | IRR: ___% (auto) | Payback: ___ years (auto)
- [ ] Sensitivity: At 60% of Base benefits, NPV = $___M | At 130% of CapEx, NPV = $___M
- [ ] Top Risk 1: ___ | Probability: ___% | Impact ($M): ___ | Mitigation: ___
- [ ] Go / No-Go recommendation: ___

## Pitfalls
- Inflating benefits to make the business case 'pass' — the benefit realization rate for major corporate initiatives averages 59% (McKinsey 2017 survey). Model benefits conservatively and test the case at 60–70% realization.
- Ignoring the 'do nothing' baseline — every benefit is incremental vs. a specific baseline. Failing to define the baseline allows sponsors to include business-as-usual improvements as initiative benefits.
- Using a hurdle rate lower than the WACC for pet projects — the WACC is the minimum return the company must earn to create value. Every project approved below WACC destroys value, even if it feels strategically important.
