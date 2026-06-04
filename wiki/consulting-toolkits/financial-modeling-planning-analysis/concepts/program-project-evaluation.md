---
type: concept
slug: program-project-evaluation
title: Post-Implementation Review / Program Evaluation
source_collection: consulting-toolkits
toolkit: financial-modeling-planning-analysis
domain: finance
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Post-Implementation Review / Program Evaluation

*Category: governance · Toolkit: Financial Modeling, Planning & Analysis*

## What it is
A structured review conducted 12 months after a major initiative goes live that compares actual financial benefits realized against the original business case projections, identifies root causes of any gaps, and feeds learnings back into the business case template and approval process.

**Origin:** Post-implementation review (PIR) is a standard practice in project management (PMI PMBOK) and organizational learning (Deming Cycle: Plan-Do-Check-Act). McKinsey's Strategic Impact Assessment and BCG's BCG Value Science practice formalized the quantitative benefit realization methodology.

## Why it works
Without post-implementation reviews, business case inflation is rational: initiative sponsors face no accountability for the benefits they promised, so they systematically overstate them to win approval. Tracking the 'benefit realization rate' (actual NPV / promised NPV) creates retrospective accountability that improves the quality of future business cases over time. Organizations that run rigorous PIRs improve their benefit realization rate from industry average 59% to >80% over 3–5 years (McKinsey research).

## When to use
Use for every initiative approved in the financial plan's initiative portfolio with a budget >$500K or a promised NPV >$5M. Schedule at business case approval (12 months post go-live).

## Visual
`table`

## Step-by-step tutorial
1. Schedule the PIR before the initiative launches: put a 12-month post-implementation review on the calendar at the point of business case approval. This signals that accountability does not end at go-live.
2. Define the benefit tracking methodology at business case approval: for each benefit in the business case, define exactly how it will be measured in the actuals (which ERP report, which line item, which KPI). Ambiguous benefit definitions become contentious at PIR time.
3. At Month 12 post-go-live: extract actual financial data from the ERP for the metrics defined at business case approval. Do not accept the initiative sponsor's self-reported numbers — use independent ERP data.
4. Calculate the benefit realization rate (BRR) for each benefit: BRR = Actual Annual Benefit / Original Annual Benefit in Business Case × 100%. Calculate the portfolio-level BRR: sum of actual benefits / sum of promised benefits.
5. Root-cause gaps: for any initiative with BRR < 90%, conduct a structured root-cause analysis. Common causes: (a) assumption inflation in the original business case (fix: tighten the assumption validation in the approval process); (b) implementation shortfall (fix: strengthen project management governance); (c) market conditions changed (acceptable if documented).
6. Feed learnings back into the business case template: if the PIR shows that 'headcount reduction' benefits are systematically 80% realized (vs. 100% in business cases), add a 20% realization haircut to all future business cases with headcount reduction benefits.
7. Present the portfolio BRR at the annual finance planning cycle: 'Our portfolio of 12 initiatives approved in 2023 delivered 73% average benefit realization — below our 80% target. The root causes are: assumptions on volume recovery (3 initiatives) and procurement savings (2 initiatives) were too optimistic. We are tightening assumption validation in these categories.'

## Real-life example — General Electric Capital (GECC) investment portfolio reviews
GE historically ran one of the most rigorous PIR programs in corporate America, requiring every major capital investment to have a formal benefits tracking process embedded from approval. GE's CFO team tracked 'actual ROIC vs. projected ROIC' for every investment above $50M. The PIR data revealed a systematic pattern: investments in new technology (IoT, automation) consistently delivered 90%+ of promised benefits; investments in customer acquisition consistently delivered only 60–65% of promised revenue benefits. This data directly influenced GE's capital allocation rules: technology investments received a $50M threshold (same as base rate), while customer acquisition investments required a $15M threshold with a 35% haircut on revenue projections. Systematic PIR data improved GE's capital allocation quality over a decade.

**So what:** Post-implementation reviews are the most powerful tool for improving organizational learning about capital allocation. The PIR data reveals where your organization systematically over- or underestimates benefits — and allows you to build those biases into the approval process.

## Template
Complete 12 months after each major initiative go-live. Compare actuals to business case and document root causes and learnings.

- [ ] Initiative Name: ___ | Go-Live Date: ___ | Review Date (Month 12): ___
- [ ] Original Business Case Summary: NPV $___M | IRR ___% | Payback ___years | Primary Benefit Driver: ___
- [ ] Benefit 1 (from BC): Type ___ | Promised Annual Benefit $___M | Actual Annual Benefit $___M | BRR: ___%
- [ ] Benefit 2: Type ___ | Promised $___M | Actual $___M | BRR: ___%
- [ ] Total Initiative BRR: Actual NPV $___M / Promised NPV $___M = ___% | Status: [Green: >90% / Amber: 70–90% / Red: <70%]
- [ ] Root Cause of Gap (if BRR <90%): 1. ___ | 2. ___ | 3.___
- [ ] Recovery Actions (if BRR <70%): 1.___ Owner ___ By ___ | 2.___ Owner ___ By ___
- [ ] Lessons Learned for Future Business Cases: 1.___ (adjust assumption by ___%) | 2.___
- [ ] Recommendation: Continue / Adjust / Stop the initiative based on PIR findings: ___

## Pitfalls
- Accepting sponsor-reported benefits without independent ERP verification — sponsors are motivated to report favorable outcomes; always cross-validate against independent ERP data.
- Conducting the PIR too early — benefits from major transformations often take 18–24 months to fully materialize (change management, ramp-up, system stabilization). Month 12 is the right default; for complex programs, add a Month 24 review.
- Treating the PIR as a blame exercise rather than a learning exercise — if PIRs are used to punish teams for below-target benefits, sponsors will fight the PIR process or inflate the actuals. Frame PIR as organizational learning and assumption calibration.
