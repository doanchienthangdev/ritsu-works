---
type: concept
slug: sensitivity-analysis
title: Sensitivity Analysis for Analytics Business Cases
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: financial
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Sensitivity Analysis for Analytics Business Cases

*Category: financial · Toolkit: Data Analytics & AI Strategy*

## What it is
A structured technique for stress-testing analytics and AI business cases by identifying the top 3–5 assumptions driving each NPV, modelling the impact of each assumption being wrong by 20%, and calculating the 'stress-case NPV' where multiple assumptions are simultaneously adverse.

**Origin:** Standard financial modelling technique (CAPM, Modigliani-Miller); applied to technology and analytics ROI by McKinsey and BCG as a standard component of technology investment cases. The ±20% sensitivity test is a consulting convention; the range should be calibrated to the uncertainty of each specific assumption.

## Why it works
The base-case NPV of an analytics use case is almost always wrong — the question is by how much and in which direction. Sensitivity analysis forces the identification of the key assumptions that drive the NPV and quantifies the downside of being wrong. This serves two purposes: it identifies which risks to mitigate (the high-sensitivity assumptions), and it gives the CFO confidence that the investment team has thought rigorously about the downside.

## When to use
In Phase 4 (Step 2: validate business case assumptions) for every use case in the top-15 priority list. Present alongside the base-case NPV to the CFO.

## Visual
`chart`

## Step-by-step tutorial
1. After building the base-case DCF model, identify the 3–5 assumptions that drive the largest share of the NPV. For a personalisation use case, the typical top assumptions are: adoption rate (% of target users who use the recommendation), improvement magnitude (% conversion lift), and annual run cost.
2. For each key assumption, model the impact of a +20% and -20% change: how does the NPV change if adoption is 20% lower than forecast? If the improvement magnitude is 20% lower? If the run cost is 20% higher?
3. Build a tornado chart (sorted by impact size): the assumption with the largest NPV swing is the one that most requires a risk mitigation plan.
4. Define a mitigation action for each high-impact downside assumption: if adoption risk is highest, the mitigation is the change management plan and the analytics translator embedded in the function; if improvement magnitude is highest, the mitigation is an A/B test before full rollout.
5. Calculate the stress-case NPV: set all three top assumptions to their -20% values simultaneously. If the stress-case NPV is still positive, the investment is robust. If not, the investment requires either a strategic override or a scope reduction.
6. Present the tornado chart and the stress-case NPV to the CFO alongside the base case. This is the difference between a financial model and a business case — the latter acknowledges risk and proposes mitigations.

## Real-life example — Capital One
Capital One's credit risk ML model business case included a sensitivity analysis identifying adoption rate (% of underwriters who use the model's recommendations), model accuracy (AUC vs baseline), and regulatory approval timeline as the top three NPV drivers. The tornado chart showed that a 20% reduction in adoption produced a $28M NPV reduction — more than any other assumption. This identified change management as the single most important risk mitigation, leading to a dedicated adoption programme for underwriters (ADKAR-based) that eventually produced a 94% adoption rate, exceeding the business case assumption.

**So what:** Sensitivity analysis turns a financial model into a risk map. The tornado chart tells the team where to invest in risk mitigation before deployment, not after.

## Template
Complete one sensitivity table per business case. Build the tornado chart. Calculate the stress-case NPV. Define a mitigation for every high-impact downside assumption.

- [ ] Use case name
- [ ] Base-case NPV
- [ ] Top assumption 1: name / base-case value / -20% value / NPV impact / +20% value / NPV impact
- [ ] Top assumption 2: name / base-case value / -20% value / NPV impact / +20% value / NPV impact
- [ ] Top assumption 3: name / base-case value / -20% value / NPV impact / +20% value / NPV impact
- [ ] Stress-case NPV (all top assumptions at -20% simultaneously)
- [ ] Stress-case NPV verdict: positive (invest) / negative (descope or strategic override required)
- [ ] Risk mitigation for top downside assumption (what action reduces the probability or impact?)

## Pitfalls
- Using the same ±20% range for all assumptions regardless of actual uncertainty: counter: calibrate the sensitivity range to the actual uncertainty of each assumption. For a conversion rate assumption based on industry benchmarks, ±30% may be more realistic; for a cost assumption based on vendor quotes, ±10% is appropriate.
- Presenting sensitivity analysis to the CFO without mitigation actions: counter: the CFO's response to 'this assumption could be wrong by 20%' is 'what are you going to do about it?' Answer before they ask.
- Running sensitivity analysis on assumptions one-at-a-time without a stress test: counter: the correlation between assumptions (if one is wrong, others often are too) means the stress case (all adverse simultaneously) is more likely than any single adverse scenario. Always calculate it.
