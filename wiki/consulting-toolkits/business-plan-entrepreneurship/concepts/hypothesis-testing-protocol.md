---
type: concept
slug: hypothesis-testing-protocol
title: Falsifiable Hypothesis Testing Protocol
source_collection: consulting-toolkits
toolkit: business-plan-entrepreneurship
domain: strategy
category: validation
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Falsifiable Hypothesis Testing Protocol

*Category: validation · Toolkit: Business Plan & Entrepreneurship*

## What it is
A structured method for converting business assumptions into testable, falsifiable hypotheses with pre-defined success and failure thresholds, preventing post-hoc rationalisation of inconvenient data.

**Origin:** Adapted from Karl Popper's philosophy of falsificationism (1959) and applied to business validation by Eric Ries ('The Lean Startup', 2011) and Ash Maurya ('Running Lean', 2012).

## Why it works
Post-hoc rationalisation is the entrepreneur's most dangerous cognitive bias: the tendency to reinterpret disconfirming evidence as 'the wrong sample' or 'too early to judge.' The protocol combats this by requiring the founder to write down, before running any experiment, exactly what data would constitute confirmation and exactly what data would constitute disconfirmation — making it impossible to move the goalposts retroactively.

## When to use
For every critical assumption identified in phase 2 before running any experiment in phase 3. Also use in phase 5 whenever a significant business model change is being considered.

## Visual
`process-flow`

## Step-by-step tutorial
1. State the assumption in plain language: 'We believe that compliance training managers at mid-market companies will pay $300 per employee per year for AI-personalised learning.'
2. Convert to a falsifiable hypothesis: 'We believe [X]. We will know this is TRUE when we observe [specific metric] ≥ [threshold] from [N] participants within [T] days. We will know this is FALSE when [metric] < [fail threshold].'
3. Set the pass and fail thresholds based on the business model requirements — not on what seems achievable. If you need a 20% conversion rate for the model to work, the pass threshold is 20%.
4. Select the minimum experiment type that can generate credible evidence: interviews (≥8 for qualitative saturation), smoke tests (≥100 visitors), pre-sales, concierge MVP, or technical spike.
5. Run the experiment exactly as designed. Do not modify it mid-run in response to early results.
6. Record all raw data immediately — record first, interpret second.
7. Evaluate the result against pre-defined thresholds only. If ambiguous, record exactly why and design a better follow-up experiment.
8. Update the business model: confirmed = reduce priority score; disconfirmed = identify what must change.

## Real-life example — Dropbox
Before writing any code, Drew Houston tested 'will developers and early adopters want a simple file-sync solution?' by posting a 3-minute demo video to Hacker News in 2007. Pre-defined threshold: 75,000 signups overnight = demand is real. Result: 75,000 signups in 24 hours. Unambiguous confirmation. He began building with confidence. This compressed 6 months of customer development into 24 hours and $0 of engineering spend.

**So what:** The pre-defined threshold is the key feature. Without it, Houston could have rationalised 10,000 signups as 'encouraging.' The threshold made the decision binary and unchallengeable.

## Template
Complete one card per critical assumption. Write hypothesis and both thresholds BEFORE running the experiment. Do not modify thresholds after seeing any data.

- [ ] Assumption ID: ___ | Date: ___ | Owner: ___
- [ ] Assumption (plain language): ___
- [ ] Falsifiable Hypothesis: 'We believe [X]. TRUE when [metric] ≥ [threshold] from [N] [participants] within [T] days.'
- [ ] Pass Threshold (pre-defined): [metric] ≥ ___
- [ ] Fail Threshold (pre-defined): [metric] < ___
- [ ] Experiment Method: ___
- [ ] Sample Size: N = ___
- [ ] Timeline: ___ days
- [ ] Raw Data: ___
- [ ] Result: [ ] CONFIRMED | [ ] DISCONFIRMED | [ ] AMBIGUOUS
- [ ] Evidence: ___
- [ ] Business Model Implication: If confirmed: ___ | If disconfirmed: ___

## Pitfalls
- Setting thresholds after seeing early results. The threshold must be set before the experiment starts — no exceptions.
- Using a sample size too small for reliability. For quantitative, use a minimum detectable effect calculation. For qualitative, 8–12 interviews typically reach saturation on one theme.
- Treating 'ambiguous' as 'partially confirmed.' Ambiguous means the experiment was not decisive — run a better experiment.
